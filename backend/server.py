from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
import secrets
from typing import List, Optional
from zoom_service import zoom_manager

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"

# =================== HELPERS ===================
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id, "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_role(user: dict, allowed_roles: List[str]):
    if user.get("role") not in allowed_roles:
        raise HTTPException(status_code=403, detail="Access forbidden")

def set_auth_cookies(response: Response, user_id: str, email: str):
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")

# =================== REQUEST MODELS ===================
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "student"

class CreateTeacherRequest(BaseModel):
    name: str
    email: EmailStr
    hourly_rate: float = 0.0
    payment_mode: str = "cycle"  # "cycle" or "per_class"
    cycle_size: int = 8
    cycle_amount: float = 0.0

class CreateStudentRequest(BaseModel):
    student_name: str
    parent_name: str
    contact_number: str
    gmail_id: EmailStr
    total_classes: int

class ScheduleClassRequest(BaseModel):
    student_id: str
    teacher_id: str
    meet_link: Optional[str] = None
    date_time: str
    duration: int = 60
    course_id: Optional[str] = None
    platform: str = "google_meet"  # "google_meet" or "zoom"

class UpdateClassRequest(BaseModel):
    meet_link: Optional[str] = None
    date_time: Optional[str] = None
    status: Optional[str] = None

class CreateCourseRequest(BaseModel):
    name: str
    subject: str
    description: Optional[str] = ""

class AssignCourseRequest(BaseModel):
    student_ids: List[str] = []
    teacher_ids: List[str] = []

class SetTeacherRateRequest(BaseModel):
    hourly_rate: float

class RecordPaymentRequest(BaseModel):
    teacher_id: str
    amount: float
    period_start: str
    period_end: str
    notes: Optional[str] = ""
    cycle_number: Optional[int] = None

class ReportFilterRequest(BaseModel):
    student_id: Optional[str] = None
    teacher_id: Optional[str] = None
    course_id: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None

class BulkScheduleRequest(BaseModel):
    student_id: str
    teacher_id: str
    start_date: str
    end_date: str
    days_of_week: List[int]  # 0=Mon, 1=Tue, ... 6=Sun
    time_slot: str  # "HH:MM"
    duration: int = 60
    platform: str = "google_meet"
    meet_link: Optional[str] = None
    course_id: Optional[str] = None

# =================== AUTH ENDPOINTS ===================
@api_router.post("/auth/register")
async def register(req: RegisterRequest, response: Response):
    email = req.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    password_hash = hash_password(req.password)
    user_doc = {"name": req.name, "email": email, "password_hash": password_hash, "role": req.role, "created_at": datetime.now(timezone.utc)}
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    set_auth_cookies(response, user_id, email)
    return {"_id": user_id, "name": req.name, "email": email, "role": req.role}

@api_router.post("/auth/login")
async def login(req: LoginRequest, response: Response):
    email = req.email.lower()
    identifier = f"{email}"
    attempt_doc = await db.login_attempts.find_one({"identifier": identifier})
    if attempt_doc and attempt_doc.get("attempts", 0) >= 5:
        locked_until = attempt_doc.get("locked_until")
        if locked_until and datetime.now(timezone.utc) < locked_until:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        if attempt_doc:
            new_attempts = attempt_doc.get("attempts", 0) + 1
            update_doc = {"attempts": new_attempts}
            if new_attempts >= 5:
                update_doc["locked_until"] = datetime.now(timezone.utc) + timedelta(minutes=15)
            await db.login_attempts.update_one({"identifier": identifier}, {"$set": update_doc})
        else:
            await db.login_attempts.insert_one({"identifier": identifier, "attempts": 1, "created_at": datetime.now(timezone.utc)})
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_many({"identifier": identifier})
    user_id = str(user["_id"])
    set_auth_cookies(response, user_id, email)
    return {"_id": user_id, "name": user["name"], "email": user["email"], "role": user["role"]}

@api_router.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token not found")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user_id = str(user["_id"])
        access_token = create_access_token(user_id, user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# =================== ADMIN - TEACHERS ===================
@api_router.post("/admin/teachers")
async def create_teacher(req: CreateTeacherRequest, user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    email = req.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    temp_password = secrets.token_urlsafe(12)
    password_hash = hash_password(temp_password)
    user_doc = {"name": req.name, "email": email, "password_hash": password_hash, "role": "teacher", "hourly_rate": req.hourly_rate, "payment_mode": req.payment_mode, "cycle_size": req.cycle_size, "cycle_amount": req.cycle_amount, "created_at": datetime.now(timezone.utc)}
    result = await db.users.insert_one(user_doc)
    return {"_id": str(result.inserted_id), "name": req.name, "email": email, "role": "teacher", "hourly_rate": req.hourly_rate, "payment_mode": req.payment_mode, "cycle_size": req.cycle_size, "cycle_amount": req.cycle_amount, "temp_password": temp_password}

@api_router.get("/admin/teachers")
async def get_teachers(user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    teachers = await db.users.find({"role": "teacher"}, {"password_hash": 0}).to_list(1000)
    for t in teachers:
        t["_id"] = str(t["_id"])
    return teachers

@api_router.patch("/admin/teachers/{teacher_id}/rate")
async def set_teacher_rate(teacher_id: str, req: SetTeacherRateRequest, user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    await db.users.update_one({"_id": ObjectId(teacher_id)}, {"$set": {"hourly_rate": req.hourly_rate}})
    return {"message": "Rate updated"}

# =================== ADMIN - STUDENTS ===================
@api_router.post("/admin/students")
async def create_student(req: CreateStudentRequest, user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    email = req.gmail_id.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Gmail ID already registered")
    temp_password = secrets.token_urlsafe(12)
    password_hash = hash_password(temp_password)
    user_doc = {"name": req.student_name, "email": email, "password_hash": password_hash, "role": "student", "created_at": datetime.now(timezone.utc)}
    user_result = await db.users.insert_one(user_doc)
    user_id = str(user_result.inserted_id)
    student_doc = {"user_id": user_id, "student_name": req.student_name, "parent_name": req.parent_name, "contact_number": req.contact_number, "gmail_id": email, "created_at": datetime.now(timezone.utc)}
    student_result = await db.students.insert_one(student_doc)
    enrollment_doc = {"student_id": str(student_result.inserted_id), "total_classes": req.total_classes, "used_classes": 0, "remaining_classes": req.total_classes}
    await db.enrollments.insert_one(enrollment_doc)
    return {"_id": str(student_result.inserted_id), "user_id": user_id, "student_name": req.student_name, "parent_name": req.parent_name, "contact_number": req.contact_number, "gmail_id": email, "total_classes": req.total_classes, "temp_password": temp_password}

@api_router.get("/admin/students")
async def get_students(user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    students = await db.students.find({}).to_list(1000)
    result = []
    for s in students:
        s["_id"] = str(s["_id"])
        enrollment = await db.enrollments.find_one({"student_id": s["_id"]})
        if enrollment:
            s["total_classes"] = enrollment.get("total_classes", 0)
            s["used_classes"] = enrollment.get("used_classes", 0)
            s["remaining_classes"] = enrollment.get("remaining_classes", 0)
        result.append(s)
    return result

# =================== ADMIN - COURSES ===================
@api_router.post("/admin/courses")
async def create_course(req: CreateCourseRequest, user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    course_doc = {"name": req.name, "subject": req.subject, "description": req.description, "student_ids": [], "teacher_ids": [], "created_at": datetime.now(timezone.utc)}
    result = await db.courses.insert_one(course_doc)
    return {"_id": str(result.inserted_id), "name": req.name, "subject": req.subject, "description": req.description}

@api_router.get("/admin/courses")
async def get_courses(user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    courses = await db.courses.find({}).to_list(1000)
    result = []
    for c in courses:
        c["_id"] = str(c["_id"])
        # Resolve student and teacher names
        student_names = []
        for sid in c.get("student_ids", []):
            try:
                s = await db.students.find_one({"_id": ObjectId(sid)})
                if s:
                    student_names.append(s.get("student_name", ""))
            except Exception:
                pass
        teacher_names = []
        for tid in c.get("teacher_ids", []):
            try:
                t = await db.users.find_one({"_id": ObjectId(tid)})
                if t:
                    teacher_names.append(t.get("name", ""))
            except Exception:
                pass
        c["student_names"] = student_names
        c["teacher_names"] = teacher_names
        # Count classes for this course
        class_count = await db.classes.count_documents({"course_id": c["_id"]})
        c["class_count"] = class_count
        result.append(c)
    return result

@api_router.patch("/admin/courses/{course_id}/assign")
async def assign_to_course(course_id: str, req: AssignCourseRequest, user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    update = {}
    if req.student_ids:
        update["$addToSet"] = {"student_ids": {"$each": req.student_ids}}
    if req.teacher_ids:
        if "$addToSet" in update:
            update["$addToSet"]["teacher_ids"] = {"$each": req.teacher_ids}
        else:
            update["$addToSet"] = {"teacher_ids": {"$each": req.teacher_ids}}
    if update:
        await db.courses.update_one({"_id": ObjectId(course_id)}, update)
    return {"message": "Assigned successfully"}

# =================== ADMIN - CLASSES ===================
@api_router.post("/admin/classes")
async def schedule_class(req: ScheduleClassRequest, user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])

    meet_link = req.meet_link or ""
    zoom_link = ""
    zoom_meeting_id = None

    # Auto-create Zoom meeting if platform is zoom
    if req.platform == "zoom" and zoom_manager.is_configured():
        try:
            student = await db.students.find_one({"_id": ObjectId(req.student_id)})
            teacher = await db.users.find_one({"_id": ObjectId(req.teacher_id)})
            topic = f"Class: {student.get('student_name', 'Student')} with {teacher.get('name', 'Teacher')}"
            zoom_data = await zoom_manager.create_meeting(topic=topic, start_time=req.date_time, duration=req.duration)
            zoom_link = zoom_data.get("join_url", "")
            zoom_meeting_id = zoom_data.get("meeting_id")
        except Exception as e:
            logger.error(f"Zoom meeting creation failed: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create Zoom meeting: {str(e)}")

    class_doc = {
        "student_id": req.student_id,
        "teacher_id": req.teacher_id,
        "meet_link": meet_link,
        "zoom_link": zoom_link,
        "zoom_meeting_id": zoom_meeting_id,
        "platform": req.platform,
        "date_time": req.date_time,
        "duration": req.duration,
        "course_id": req.course_id or "",
        "status": "scheduled",
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.classes.insert_one(class_doc)

    return {
        "_id": str(result.inserted_id),
        "student_id": req.student_id,
        "teacher_id": req.teacher_id,
        "meet_link": meet_link,
        "zoom_link": zoom_link,
        "platform": req.platform,
        "date_time": req.date_time,
        "duration": req.duration,
        "status": "scheduled"
    }

@api_router.get("/admin/classes")
async def get_all_classes(user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    classes = await db.classes.find({}).to_list(1000)
    result = []
    for c in classes:
        c["_id"] = str(c["_id"])
        try:
            student = await db.students.find_one({"_id": ObjectId(c["student_id"])})
            if student:
                c["student_name"] = student.get("student_name")
        except Exception:
            pass
        try:
            teacher = await db.users.find_one({"_id": ObjectId(c["teacher_id"])})
            if teacher:
                c["teacher_name"] = teacher.get("name")
        except Exception:
            pass
        # Get attendance info
        att_logs = await db.attendance_logs.find({"class_id": c["_id"]}).to_list(10)
        c["attendance"] = []
        for a in att_logs:
            a["_id"] = str(a["_id"])
            c["attendance"].append(a)
        result.append(c)
    return result

@api_router.patch("/admin/classes/{class_id}")
async def update_class(class_id: str, req: UpdateClassRequest, user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    update_fields = {}
    if req.meet_link is not None:
        update_fields["meet_link"] = req.meet_link
    if req.date_time is not None:
        update_fields["date_time"] = req.date_time
    if req.status is not None:
        update_fields["status"] = req.status
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.classes.update_one({"_id": ObjectId(class_id)}, {"$set": update_fields})
    return {"message": "Class updated successfully"}

# =================== ADMIN - REGENERATE ZOOM LINK ===================
@api_router.post("/admin/classes/{class_id}/regenerate-zoom")
async def regenerate_zoom_link(class_id: str, user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])

    class_doc = await db.classes.find_one({"_id": ObjectId(class_id)})
    if not class_doc:
        raise HTTPException(status_code=404, detail="Class not found")

    if not zoom_manager.is_configured():
        raise HTTPException(status_code=400, detail="Zoom not configured")

    conn = await zoom_manager.check_connection()
    if not conn["connected"]:
        raise HTTPException(status_code=400, detail=f"Zoom not connected: {conn['error']}")

    # Get names for topic
    student_name = "Student"
    teacher_name = "Teacher"
    try:
        student = await db.students.find_one({"_id": ObjectId(class_doc["student_id"])})
        if student:
            student_name = student.get("student_name", "Student")
        teacher = await db.users.find_one({"_id": ObjectId(class_doc["teacher_id"])})
        if teacher:
            teacher_name = teacher.get("name", "Teacher")
    except Exception:
        pass

    zoom_data = await zoom_manager.create_meeting(
        topic=f"Class: {student_name} with {teacher_name}",
        start_time=class_doc.get("date_time", ""),
        duration=class_doc.get("duration", 60)
    )

    await db.classes.update_one(
        {"_id": ObjectId(class_id)},
        {"$set": {
            "zoom_link": zoom_data.get("join_url", ""),
            "zoom_meeting_id": zoom_data.get("meeting_id"),
            "zoom_passcode": zoom_data.get("password", ""),
            "platform": "zoom"
        }}
    )

    return {
        "message": "Zoom link regenerated",
        "zoom_link": zoom_data.get("join_url", ""),
        "zoom_meeting_id": zoom_data.get("meeting_id")
    }

# =================== ADMIN - BULK SCHEDULING ===================
@api_router.post("/admin/classes/bulk")
async def bulk_schedule_classes(req: BulkScheduleRequest, user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])

    start = datetime.strptime(req.start_date, "%Y-%m-%d").date()
    end = datetime.strptime(req.end_date, "%Y-%m-%d").date()

    # Max 1 year limit
    if (end - start).days > 366:
        raise HTTPException(status_code=400, detail="Maximum 1 year per bulk operation")

    # If Zoom selected, verify connection first
    if req.platform == "zoom":
        if not zoom_manager.is_configured():
            raise HTTPException(status_code=400, detail="Zoom account not connected. Please connect before scheduling.")
        conn = await zoom_manager.check_connection()
        if not conn["connected"]:
            raise HTTPException(status_code=400, detail=f"Zoom account not connected: {conn['error']}")

    # Get student and teacher names for Zoom meeting topics
    student_name = "Student"
    teacher_name = "Teacher"
    try:
        student = await db.students.find_one({"_id": ObjectId(req.student_id)})
        if student:
            student_name = student.get("student_name", "Student")
        teacher = await db.users.find_one({"_id": ObjectId(req.teacher_id)})
        if teacher:
            teacher_name = teacher.get("name", "Teacher")
    except Exception:
        pass

    series_id = secrets.token_urlsafe(16)
    class_entries = []
    current = start

    while current <= end:
        if current.weekday() in req.days_of_week:
            dt_str = f"{current.isoformat()}T{req.time_slot}:00"
            class_entries.append({
                "date_time": dt_str,
                "index": len(class_entries)
            })
        current += timedelta(days=1)

    if not class_entries:
        raise HTTPException(status_code=400, detail="No classes to schedule with given parameters")

    # For Zoom: batch create unique meetings per class
    zoom_results = {}
    if req.platform == "zoom":
        meetings_to_create = []
        for entry in class_entries:
            meetings_to_create.append({
                "topic": f"Class: {student_name} with {teacher_name}",
                "start_time": entry["date_time"],
                "duration": req.duration,
                "index": entry["index"]
            })

        logger.info(f"Creating {len(meetings_to_create)} Zoom meetings for bulk schedule...")
        results = await zoom_manager.create_meetings_batch(meetings_to_create, batch_size=8)

        failed_count = 0
        for r in results:
            idx = r.get("index", 0)
            if r.get("success"):
                zoom_results[idx] = {
                    "zoom_link": r.get("join_url", ""),
                    "zoom_meeting_id": r.get("meeting_id"),
                    "zoom_passcode": r.get("password", "")
                }
            else:
                failed_count += 1
                logger.error(f"Failed to create Zoom meeting for class {idx}: {r.get('error')}")

        if failed_count > 0:
            logger.warning(f"{failed_count}/{len(meetings_to_create)} Zoom meetings failed to create")

    # Build class documents
    created_classes = []
    for entry in class_entries:
        idx = entry["index"]
        zoom_data = zoom_results.get(idx, {})
        class_doc = {
            "student_id": req.student_id,
            "teacher_id": req.teacher_id,
            "meet_link": req.meet_link or "",
            "zoom_link": zoom_data.get("zoom_link", ""),
            "zoom_meeting_id": zoom_data.get("zoom_meeting_id"),
            "zoom_passcode": zoom_data.get("zoom_passcode", ""),
            "platform": req.platform,
            "date_time": entry["date_time"],
            "duration": req.duration,
            "course_id": req.course_id or "",
            "status": "scheduled",
            "series_id": series_id,
            "created_at": datetime.now(timezone.utc)
        }
        created_classes.append(class_doc)

    await db.classes.insert_many(created_classes)

    zoom_success = len(zoom_results) if req.platform == "zoom" else 0
    zoom_failed = len(class_entries) - zoom_success if req.platform == "zoom" else 0

    return {
        "message": f"{len(created_classes)} classes scheduled",
        "count": len(created_classes),
        "series_id": series_id,
        "platform": req.platform,
        "zoom_meetings_created": zoom_success,
        "zoom_meetings_failed": zoom_failed
    }

# =================== ADMIN - NOTIFICATIONS ===================
@api_router.get("/admin/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    notifs = await db.notifications.find({}).sort("created_at", -1).to_list(50)
    for n in notifs:
        n["_id"] = str(n["_id"])
    return notifs

@api_router.patch("/admin/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    await db.notifications.update_one({"_id": ObjectId(notif_id)}, {"$set": {"read": True}})
    return {"message": "Marked as read"}

@api_router.post("/admin/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    await db.notifications.update_many({"read": False}, {"$set": {"read": True}})
    return {"message": "All marked as read"}

# =================== ADMIN - STATS ===================
@api_router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    total_students = await db.students.count_documents({})
    total_teachers = await db.users.count_documents({"role": "teacher"})
    total_classes = await db.classes.count_documents({})
    completed_classes = await db.classes.count_documents({"status": "completed"})
    total_courses = await db.courses.count_documents({})

    # Calculate total hours from attendance
    pipeline = [{"$match": {"total_duration": {"$gt": 0}}}, {"$group": {"_id": None, "total_hours": {"$sum": "$total_duration"}}}]
    hours_result = await db.attendance_logs.aggregate(pipeline).to_list(1)
    total_hours = round(hours_result[0]["total_hours"] / 60, 1) if hours_result else 0

    return {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_classes": total_classes,
        "completed_classes": completed_classes,
        "total_courses": total_courses,
        "total_hours_delivered": total_hours,
        "unread_notifications": await db.notifications.count_documents({"read": False})
    }

# =================== ADMIN - REPORTS ===================
@api_router.post("/admin/reports/attendance")
async def get_attendance_report(req: ReportFilterRequest, user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    query = {}
    if req.student_id:
        query["user_id"] = req.student_id
        query["role"] = "student"
    if req.teacher_id:
        query["user_id"] = req.teacher_id
        query["role"] = "teacher"

    # Filter by class date range via class lookup
    class_query = {}
    if req.course_id:
        class_query["course_id"] = req.course_id
    if req.date_from:
        class_query["date_time"] = {"$gte": req.date_from}
    if req.date_to:
        if "date_time" in class_query:
            class_query["date_time"]["$lte"] = req.date_to
        else:
            class_query["date_time"] = {"$lte": req.date_to}

    # Get matching class IDs
    if class_query:
        matching_classes = await db.classes.find(class_query, {"_id": 1}).to_list(10000)
        class_ids = [str(c["_id"]) for c in matching_classes]
        if class_ids:
            query["class_id"] = {"$in": class_ids}
        else:
            return []

    logs = await db.attendance_logs.find(query).to_list(10000)
    result = []
    for log in logs:
        log["_id"] = str(log["_id"])
        # Enrich with class info
        try:
            cls = await db.classes.find_one({"_id": ObjectId(log["class_id"])})
            if cls:
                log["class_date_time"] = cls.get("date_time", "")
                log["class_duration"] = cls.get("duration", 0)
                # Get student/teacher names
                try:
                    student = await db.students.find_one({"_id": ObjectId(cls["student_id"])})
                    log["student_name"] = student.get("student_name", "") if student else ""
                except Exception:
                    log["student_name"] = ""
                try:
                    teacher = await db.users.find_one({"_id": ObjectId(cls["teacher_id"])})
                    log["teacher_name"] = teacher.get("name", "") if teacher else ""
                except Exception:
                    log["teacher_name"] = ""
        except Exception:
            pass
        result.append(log)
    return result

@api_router.post("/admin/reports/student-summary")
async def get_student_report(req: ReportFilterRequest, user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    students = await db.students.find({}).to_list(1000)
    result = []
    for s in students:
        sid = str(s["_id"])
        if req.student_id and sid != req.student_id:
            continue

        enrollment = await db.enrollments.find_one({"student_id": sid})
        # Get user_id for attendance lookup
        user_id = s.get("user_id", "")

        # Count attended classes
        attended = await db.attendance_logs.count_documents({"user_id": user_id, "role": "student", "leave_time": {"$ne": None}})

        # Total hours
        pipeline = [
            {"$match": {"user_id": user_id, "role": "student", "total_duration": {"$gt": 0}}},
            {"$group": {"_id": None, "total_mins": {"$sum": "$total_duration"}}}
        ]
        hours_result = await db.attendance_logs.aggregate(pipeline).to_list(1)
        total_hours = round(hours_result[0]["total_mins"] / 60, 2) if hours_result else 0

        total_classes = enrollment.get("total_classes", 0) if enrollment else 0
        scheduled_hours = round(total_classes * 1, 2)  # Assume 1hr per class by default

        result.append({
            "student_id": sid,
            "student_name": s.get("student_name", ""),
            "total_classes_assigned": total_classes,
            "classes_attended": attended,
            "total_hours_scheduled": scheduled_hours,
            "total_hours_attended": total_hours,
            "attendance_percentage": round((attended / total_classes * 100), 1) if total_classes > 0 else 0
        })
    return result

@api_router.post("/admin/reports/teacher-summary")
async def get_teacher_report(req: ReportFilterRequest, user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    teachers = await db.users.find({"role": "teacher"}, {"password_hash": 0}).to_list(1000)
    result = []
    for t in teachers:
        tid = str(t["_id"])
        if req.teacher_id and tid != req.teacher_id:
            continue

        total_assigned = await db.classes.count_documents({"teacher_id": tid})
        completed = await db.classes.count_documents({"teacher_id": tid, "status": "completed"})

        # Total hours taught
        pipeline = [
            {"$match": {"user_id": tid, "role": "teacher", "total_duration": {"$gt": 0}}},
            {"$group": {"_id": None, "total_mins": {"$sum": "$total_duration"}}}
        ]
        hours_result = await db.attendance_logs.aggregate(pipeline).to_list(1)
        total_hours = round(hours_result[0]["total_mins"] / 60, 2) if hours_result else 0

        result.append({
            "teacher_id": tid,
            "teacher_name": t.get("name", ""),
            "email": t.get("email", ""),
            "hourly_rate": t.get("hourly_rate", 0),
            "total_classes_assigned": total_assigned,
            "classes_conducted": completed,
            "total_hours_taught": total_hours,
            "calculated_payment": round(total_hours * t.get("hourly_rate", 0), 2)
        })
    return result

# =================== ADMIN - PAYMENTS ===================
@api_router.post("/admin/payments")
async def record_payment(req: RecordPaymentRequest, user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    payment_doc = {
        "teacher_id": req.teacher_id,
        "amount": req.amount,
        "period_start": req.period_start,
        "period_end": req.period_end,
        "notes": req.notes,
        "status": "paid",
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.payments.insert_one(payment_doc)
    return {"_id": str(result.inserted_id), "message": "Payment recorded"}

@api_router.get("/admin/payments")
async def get_payments(user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    payments = await db.payments.find({}).to_list(1000)
    result = []
    for p in payments:
        p["_id"] = str(p["_id"])
        try:
            teacher = await db.users.find_one({"_id": ObjectId(p["teacher_id"])})
            p["teacher_name"] = teacher.get("name", "") if teacher else ""
        except Exception:
            p["teacher_name"] = ""
        result.append(p)
    return result

# =================== ZOOM STATUS ===================
@api_router.get("/admin/zoom-status")
async def get_zoom_status(user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    if not zoom_manager.is_configured():
        return {"configured": False, "connected": False, "error": "Not configured"}
    result = await zoom_manager.check_connection()
    return {"configured": True, "connected": result["connected"], "error": result["error"]}

# =================== TEACHER ENDPOINTS ===================
@api_router.get("/teacher/classes")
async def get_teacher_classes(user: dict = Depends(get_current_user)):
    await require_role(user, ["teacher"])
    classes = await db.classes.find({"teacher_id": user["_id"]}).to_list(1000)
    result = []
    for c in classes:
        c["_id"] = str(c["_id"])
        try:
            student = await db.students.find_one({"_id": ObjectId(c["student_id"])})
            if student:
                c["student_name"] = student.get("student_name")
        except Exception:
            pass
        # Check if teacher has active attendance
        att = await db.attendance_logs.find_one({"class_id": c["_id"], "user_id": user["_id"], "role": "teacher", "leave_time": None})
        c["is_joined"] = att is not None
        result.append(c)
    return result

@api_router.get("/teacher/stats")
async def get_teacher_stats(user: dict = Depends(get_current_user)):
    await require_role(user, ["teacher"])
    total = await db.classes.count_documents({"teacher_id": user["_id"]})
    completed = await db.classes.count_documents({"teacher_id": user["_id"], "status": "completed"})
    pipeline = [
        {"$match": {"user_id": user["_id"], "role": "teacher", "total_duration": {"$gt": 0}}},
        {"$group": {"_id": None, "total_mins": {"$sum": "$total_duration"}}}
    ]
    hours_result = await db.attendance_logs.aggregate(pipeline).to_list(1)
    total_hours = round(hours_result[0]["total_mins"] / 60, 2) if hours_result else 0
    return {"total_classes": total, "completed_classes": completed, "total_hours_taught": total_hours}

@api_router.post("/teacher/classes/{class_id}/join")
async def teacher_join_class(class_id: str, user: dict = Depends(get_current_user)):
    await require_role(user, ["teacher"])
    class_doc = await db.classes.find_one({"_id": ObjectId(class_id)})
    if not class_doc:
        raise HTTPException(status_code=404, detail="Class not found")
    if class_doc.get("teacher_id") != user["_id"]:
        raise HTTPException(status_code=403, detail="Not your class")

    # Check if already joined
    existing = await db.attendance_logs.find_one({"class_id": class_id, "user_id": user["_id"], "role": "teacher", "leave_time": None})
    if existing:
        raise HTTPException(status_code=400, detail="Already joined this class")

    # Record join
    att_doc = {
        "class_id": class_id,
        "user_id": user["_id"],
        "role": "teacher",
        "join_time": datetime.now(timezone.utc).isoformat(),
        "leave_time": None,
        "total_duration": 0
    }
    await db.attendance_logs.insert_one(att_doc)

    # Get the right link
    link = class_doc.get("zoom_link") or class_doc.get("meet_link", "")
    return {"message": "Joined class", "meet_link": link, "zoom_link": class_doc.get("zoom_link", "")}

@api_router.post("/teacher/classes/{class_id}/leave")
async def teacher_leave_class(class_id: str, user: dict = Depends(get_current_user)):
    await require_role(user, ["teacher"])
    att = await db.attendance_logs.find_one({"class_id": class_id, "user_id": user["_id"], "role": "teacher", "leave_time": None})
    if not att:
        raise HTTPException(status_code=400, detail="Not currently in this class")

    leave_time = datetime.now(timezone.utc)
    join_time = datetime.fromisoformat(att["join_time"])
    duration_mins = round((leave_time - join_time).total_seconds() / 60, 2)

    await db.attendance_logs.update_one(
        {"_id": att["_id"]},
        {"$set": {"leave_time": leave_time.isoformat(), "total_duration": duration_mins}}
    )
    return {"message": "Left class", "duration_minutes": duration_mins}

@api_router.get("/teacher/attendance")
async def get_teacher_attendance(user: dict = Depends(get_current_user)):
    await require_role(user, ["teacher"])
    logs = await db.attendance_logs.find({"user_id": user["_id"], "role": "teacher"}).to_list(1000)
    result = []
    for log in logs:
        log["_id"] = str(log["_id"])
        try:
            cls = await db.classes.find_one({"_id": ObjectId(log["class_id"])})
            if cls:
                log["class_date_time"] = cls.get("date_time", "")
                student = await db.students.find_one({"_id": ObjectId(cls["student_id"])})
                log["student_name"] = student.get("student_name", "") if student else ""
        except Exception:
            pass
        result.append(log)
    return result

# =================== TEACHER - CYCLE PAYMENTS ===================
@api_router.get("/teacher/payment-cycles")
async def get_teacher_payment_cycles(user: dict = Depends(get_current_user)):
    await require_role(user, ["teacher"])
    teacher = await db.users.find_one({"_id": ObjectId(user["_id"])}, {"password_hash": 0})
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    payment_mode = teacher.get("payment_mode", "cycle")
    cycle_size = teacher.get("cycle_size", 8)
    cycle_amount = teacher.get("cycle_amount", 0)

    completed = await db.classes.count_documents({"teacher_id": user["_id"], "status": "completed"})

    # Build cycle info
    cycles = []
    if payment_mode == "cycle" and cycle_size > 0:
        num_full_cycles = completed // cycle_size
        remainder = completed % cycle_size
        for i in range(num_full_cycles + 1):
            start_cls = i * cycle_size
            end_cls = min((i + 1) * cycle_size, completed if i == num_full_cycles else (i + 1) * cycle_size)
            # Check if payment recorded for this cycle
            paid = await db.payments.find_one({"teacher_id": user["_id"], "cycle_number": i + 1})
            cycles.append({
                "cycle_number": i + 1,
                "start_class": start_cls,
                "end_class": end_cls,
                "cycle_size": cycle_size,
                "amount": cycle_amount,
                "completed": end_cls - start_cls >= cycle_size,
                "status": "paid" if paid else ("payable" if end_cls - start_cls >= cycle_size else "in_progress"),
                "classes_done": end_cls - start_cls,
            })

    # Get payment history
    payments = await db.payments.find({"teacher_id": user["_id"]}).to_list(100)
    for p in payments:
        p["_id"] = str(p["_id"])

    return {
        "payment_mode": payment_mode,
        "cycle_size": cycle_size,
        "cycle_amount": cycle_amount,
        "total_completed": completed,
        "cycles": cycles,
        "payments": payments
    }

# =================== STUDENT ENDPOINTS ===================
@api_router.get("/student/dashboard")
async def get_student_dashboard(user: dict = Depends(get_current_user)):
    await require_role(user, ["student"])
    student = await db.students.find_one({"user_id": user["_id"]})
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    student_id = str(student["_id"])
    enrollment = await db.enrollments.find_one({"student_id": student_id})

    # Attendance stats
    attended = await db.attendance_logs.count_documents({"user_id": user["_id"], "role": "student", "leave_time": {"$ne": None}})
    pipeline = [
        {"$match": {"user_id": user["_id"], "role": "student", "total_duration": {"$gt": 0}}},
        {"$group": {"_id": None, "total_mins": {"$sum": "$total_duration"}}}
    ]
    hours_result = await db.attendance_logs.aggregate(pipeline).to_list(1)
    total_hours = round(hours_result[0]["total_mins"] / 60, 2) if hours_result else 0
    total_classes = enrollment.get("total_classes", 0) if enrollment else 0

    return {
        "student_name": student.get("student_name"),
        "parent_name": student.get("parent_name"),
        "contact_number": student.get("contact_number"),
        "gmail_id": student.get("gmail_id"),
        "total_classes": total_classes,
        "used_classes": enrollment.get("used_classes", 0) if enrollment else 0,
        "remaining_classes": enrollment.get("remaining_classes", 0) if enrollment else 0,
        "classes_attended": attended,
        "total_hours_attended": total_hours,
        "attendance_percentage": round((attended / total_classes * 100), 1) if total_classes > 0 else 0
    }

@api_router.get("/student/classes")
async def get_student_classes(user: dict = Depends(get_current_user)):
    await require_role(user, ["student"])
    student = await db.students.find_one({"user_id": user["_id"]})
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    student_id = str(student["_id"])
    classes = await db.classes.find({"student_id": student_id}).to_list(1000)
    result = []
    for c in classes:
        c["_id"] = str(c["_id"])
        try:
            teacher = await db.users.find_one({"_id": ObjectId(c["teacher_id"])})
            if teacher:
                c["teacher_name"] = teacher.get("name")
        except Exception:
            pass
        # Check if student has active attendance
        att = await db.attendance_logs.find_one({"class_id": c["_id"], "user_id": user["_id"], "role": "student", "leave_time": None})
        c["is_joined"] = att is not None
        result.append(c)
    return result

@api_router.post("/student/classes/{class_id}/join")
async def join_class(class_id: str, user: dict = Depends(get_current_user)):
    await require_role(user, ["student"])
    student = await db.students.find_one({"user_id": user["_id"]})
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    student_id = str(student["_id"])
    enrollment = await db.enrollments.find_one({"student_id": student_id})
    if not enrollment or enrollment.get("remaining_classes", 0) <= 0:
        raise HTTPException(status_code=403, detail="No classes remaining")
    class_doc = await db.classes.find_one({"_id": ObjectId(class_id)})
    if not class_doc:
        raise HTTPException(status_code=404, detail="Class not found")
    if class_doc.get("student_id") != student_id:
        raise HTTPException(status_code=403, detail="Not your class")
    if class_doc.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Class already completed")

    # Check if already joined (active session)
    existing = await db.attendance_logs.find_one({"class_id": class_id, "user_id": user["_id"], "role": "student", "leave_time": None})
    if existing:
        # Already joined, just return the link
        link = class_doc.get("zoom_link") or class_doc.get("meet_link", "")
        return {"message": "Already in class", "meet_link": link, "zoom_link": class_doc.get("zoom_link", "")}

    # Record attendance
    att_doc = {
        "class_id": class_id,
        "user_id": user["_id"],
        "role": "student",
        "join_time": datetime.now(timezone.utc).isoformat(),
        "leave_time": None,
        "total_duration": 0
    }
    await db.attendance_logs.insert_one(att_doc)

    # Update enrollment
    await db.enrollments.update_one({"student_id": student_id}, {"$inc": {"used_classes": 1, "remaining_classes": -1}})
    # Update class status to in_progress
    await db.classes.update_one({"_id": ObjectId(class_id)}, {"$set": {"status": "in_progress"}})

    link = class_doc.get("zoom_link") or class_doc.get("meet_link", "")
    return {"message": "Class joined successfully", "meet_link": link, "zoom_link": class_doc.get("zoom_link", "")}

@api_router.post("/student/classes/{class_id}/leave")
async def student_leave_class(class_id: str, user: dict = Depends(get_current_user)):
    await require_role(user, ["student"])
    att = await db.attendance_logs.find_one({"class_id": class_id, "user_id": user["_id"], "role": "student", "leave_time": None})
    if not att:
        raise HTTPException(status_code=400, detail="Not currently in this class")

    leave_time = datetime.now(timezone.utc)
    join_time = datetime.fromisoformat(att["join_time"])
    duration_mins = round((leave_time - join_time).total_seconds() / 60, 2)

    await db.attendance_logs.update_one(
        {"_id": att["_id"]},
        {"$set": {"leave_time": leave_time.isoformat(), "total_duration": duration_mins}}
    )

    # Mark class as completed
    await db.classes.update_one({"_id": ObjectId(class_id)}, {"$set": {"status": "completed"}})

    # Check if student completed their assigned cycle and notify admin
    enrollment_updated = await db.enrollments.find_one({"student_id": att.get("class_id", "")})
    # Get student's enrollment via class
    class_doc = await db.classes.find_one({"_id": ObjectId(class_id)})
    if class_doc:
        s_id = class_doc.get("student_id", "")
        enrollment_check = await db.enrollments.find_one({"student_id": s_id})
        if enrollment_check and enrollment_check.get("remaining_classes", 1) <= 0:
            student_doc = await db.students.find_one({"_id": ObjectId(s_id)})
            sname = student_doc.get("student_name", "Student") if student_doc else "Student"
            total = enrollment_check.get("total_classes", 0)
            await db.notifications.insert_one({
                "type": "cycle_complete",
                "message": f"{sname} has completed assigned cycle ({total} classes)",
                "student_id": s_id,
                "read": False,
                "created_at": datetime.now(timezone.utc)
            })

    return {"message": "Left class", "duration_minutes": duration_mins}

@api_router.get("/student/attendance")
async def get_student_attendance(user: dict = Depends(get_current_user)):
    await require_role(user, ["student"])
    logs = await db.attendance_logs.find({"user_id": user["_id"], "role": "student"}).to_list(1000)
    result = []
    for log in logs:
        log["_id"] = str(log["_id"])
        try:
            cls = await db.classes.find_one({"_id": ObjectId(log["class_id"])})
            if cls:
                log["class_date_time"] = cls.get("date_time", "")
                teacher = await db.users.find_one({"_id": ObjectId(cls["teacher_id"])})
                log["teacher_name"] = teacher.get("name", "") if teacher else ""
        except Exception:
            pass
        result.append(log)
    return result

# =================== APP SETUP ===================
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get('FRONTEND_URL', 'http://localhost:3000')],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.attendance_logs.create_index([("class_id", 1), ("user_id", 1)])

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@classplatform.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({"email": admin_email, "password_hash": hashed, "name": "Admin", "role": "admin", "created_at": datetime.now(timezone.utc)})
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    os.makedirs("/app/memory", exist_ok=True)

    # Seed demo teacher
    demo_teacher_email = "teacher@demo.com"
    existing_teacher = await db.users.find_one({"email": demo_teacher_email})
    if not existing_teacher:
        await db.users.insert_one({"email": demo_teacher_email, "password_hash": hash_password("teacher123"), "name": "Demo Teacher", "role": "teacher", "hourly_rate": 25.0, "created_at": datetime.now(timezone.utc)})

    # Seed demo student
    demo_student_email = "student@demo.com"
    existing_student = await db.users.find_one({"email": demo_student_email})
    if not existing_student:
        student_user = await db.users.insert_one({"email": demo_student_email, "password_hash": hash_password("student123"), "name": "Demo Student", "role": "student", "created_at": datetime.now(timezone.utc)})
        student_uid = str(student_user.inserted_id)
        student_result = await db.students.insert_one({"user_id": student_uid, "student_name": "Demo Student", "parent_name": "Demo Parent", "contact_number": "1234567890", "gmail_id": demo_student_email, "created_at": datetime.now(timezone.utc)})
        await db.enrollments.insert_one({"student_id": str(student_result.inserted_id), "total_classes": 10, "used_classes": 0, "remaining_classes": 10})

    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write("## Admin Account\n")
        f.write(f"Email: {admin_email}\n")
        f.write(f"Password: {admin_password}\n")
        f.write("Role: admin\n\n")
        f.write("## Demo Teacher Account\n")
        f.write("Email: teacher@demo.com\n")
        f.write("Password: teacher123\n")
        f.write("Role: teacher\n\n")
        f.write("## Demo Student Account\n")
        f.write("Email: student@demo.com\n")
        f.write("Password: student123\n")
        f.write("Role: student\n\n")
        f.write("## Auth Endpoints\n")
        f.write("- POST /api/auth/login\n")
        f.write("- POST /api/auth/register\n")
        f.write("- GET /api/auth/me\n")
        f.write("- POST /api/auth/logout\n")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
