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

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"

# Helper Functions
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
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
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

# Models
class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "student"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class CreateTeacherRequest(BaseModel):
    name: str
    email: EmailStr

class CreateStudentRequest(BaseModel):
    student_name: str
    parent_name: str
    contact_number: str
    gmail_id: EmailStr
    total_classes: int

class ScheduleClassRequest(BaseModel):
    student_id: str
    teacher_id: str
    meet_link: str
    date_time: str

class UpdateClassRequest(BaseModel):
    meet_link: Optional[str] = None
    date_time: Optional[str] = None
    status: Optional[str] = None

# Auth Endpoints
@api_router.post("/auth/register")
async def register(req: RegisterRequest, response: Response):
    email = req.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    password_hash = hash_password(req.password)
    user_doc = {
        "name": req.name,
        "email": email,
        "password_hash": password_hash,
        "role": req.role,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=900,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=604800,
        path="/"
    )
    
    return {
        "_id": user_id,
        "name": req.name,
        "email": email,
        "role": req.role
    }

@api_router.post("/auth/login")
async def login(req: LoginRequest, response: Response):
    email = req.email.lower()
    
    # Check brute force
    identifier = f"{email}"
    attempt_doc = await db.login_attempts.find_one({"identifier": identifier})
    if attempt_doc and attempt_doc.get("attempts", 0) >= 5:
        locked_until = attempt_doc.get("locked_until")
        if locked_until and datetime.now(timezone.utc) < locked_until:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")
    
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        # Increment failed attempts
        if attempt_doc:
            new_attempts = attempt_doc.get("attempts", 0) + 1
            update_doc = {"attempts": new_attempts}
            if new_attempts >= 5:
                update_doc["locked_until"] = datetime.now(timezone.utc) + timedelta(minutes=15)
            await db.login_attempts.update_one(
                {"identifier": identifier},
                {"$set": update_doc}
            )
        else:
            await db.login_attempts.insert_one({
                "identifier": identifier,
                "attempts": 1,
                "created_at": datetime.now(timezone.utc)
            })
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Clear failed attempts
    await db.login_attempts.delete_many({"identifier": identifier})
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=900,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=604800,
        path="/"
    )
    
    return {
        "_id": user_id,
        "name": user["name"],
        "email": user["email"],
        "role": user["role"]
    }

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
        
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=900,
            path="/"
        )
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# Admin Endpoints
@api_router.post("/admin/teachers")
async def create_teacher(req: CreateTeacherRequest, user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    
    email = req.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Auto-generate password
    temp_password = secrets.token_urlsafe(12)
    password_hash = hash_password(temp_password)
    
    user_doc = {
        "name": req.name,
        "email": email,
        "password_hash": password_hash,
        "role": "teacher",
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    
    return {
        "_id": str(result.inserted_id),
        "name": req.name,
        "email": email,
        "role": "teacher",
        "temp_password": temp_password
    }

@api_router.get("/admin/teachers")
async def get_teachers(user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    teachers = await db.users.find({"role": "teacher"}, {"password_hash": 0}).to_list(1000)
    for t in teachers:
        t["_id"] = str(t["_id"])
    return teachers

@api_router.post("/admin/students")
async def create_student(req: CreateStudentRequest, user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    
    email = req.gmail_id.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Gmail ID already registered")
    
    # Auto-generate password
    temp_password = secrets.token_urlsafe(12)
    password_hash = hash_password(temp_password)
    
    user_doc = {
        "name": req.student_name,
        "email": email,
        "password_hash": password_hash,
        "role": "student",
        "created_at": datetime.now(timezone.utc)
    }
    user_result = await db.users.insert_one(user_doc)
    user_id = str(user_result.inserted_id)
    
    # Create student profile
    student_doc = {
        "user_id": user_id,
        "student_name": req.student_name,
        "parent_name": req.parent_name,
        "contact_number": req.contact_number,
        "gmail_id": email,
        "created_at": datetime.now(timezone.utc)
    }
    student_result = await db.students.insert_one(student_doc)
    
    # Create enrollment
    enrollment_doc = {
        "student_id": str(student_result.inserted_id),
        "total_classes": req.total_classes,
        "used_classes": 0,
        "remaining_classes": req.total_classes
    }
    await db.enrollments.insert_one(enrollment_doc)
    
    return {
        "_id": str(student_result.inserted_id),
        "user_id": user_id,
        "student_name": req.student_name,
        "parent_name": req.parent_name,
        "contact_number": req.contact_number,
        "gmail_id": email,
        "total_classes": req.total_classes,
        "temp_password": temp_password
    }

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

@api_router.post("/admin/classes")
async def schedule_class(req: ScheduleClassRequest, user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    
    class_doc = {
        "student_id": req.student_id,
        "teacher_id": req.teacher_id,
        "meet_link": req.meet_link,
        "date_time": req.date_time,
        "status": "scheduled",
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.classes.insert_one(class_doc)
    
    return {
        "_id": str(result.inserted_id),
        "student_id": req.student_id,
        "teacher_id": req.teacher_id,
        "meet_link": req.meet_link,
        "date_time": req.date_time,
        "status": "scheduled"
    }

@api_router.get("/admin/classes")
async def get_all_classes(user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    classes = await db.classes.find({}).to_list(1000)
    result = []
    for c in classes:
        c["_id"] = str(c["_id"])
        # Get student and teacher names
        student = await db.students.find_one({"_id": ObjectId(c["student_id"])})
        teacher = await db.users.find_one({"_id": ObjectId(c["teacher_id"])})
        if student:
            c["student_name"] = student.get("student_name")
        if teacher:
            c["teacher_name"] = teacher.get("name")
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
    
    await db.classes.update_one(
        {"_id": ObjectId(class_id)},
        {"$set": update_fields}
    )
    
    return {"message": "Class updated successfully"}

@api_router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(get_current_user)):
    await require_role(user, ["admin"])
    
    total_students = await db.students.count_documents({})
    total_teachers = await db.users.count_documents({"role": "teacher"})
    total_classes = await db.classes.count_documents({})
    completed_classes = await db.classes.count_documents({"status": "completed"})
    
    return {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_classes": total_classes,
        "completed_classes": completed_classes
    }

# Teacher Endpoints
@api_router.get("/teacher/classes")
async def get_teacher_classes(user: dict = Depends(get_current_user)):
    await require_role(user, ["teacher"])
    
    classes = await db.classes.find({"teacher_id": user["_id"]}).to_list(1000)
    result = []
    for c in classes:
        c["_id"] = str(c["_id"])
        student = await db.students.find_one({"_id": ObjectId(c["student_id"])})
        if student:
            c["student_name"] = student.get("student_name")
        result.append(c)
    return result

# Student Endpoints
@api_router.get("/student/dashboard")
async def get_student_dashboard(user: dict = Depends(get_current_user)):
    await require_role(user, ["student"])
    
    student = await db.students.find_one({"user_id": user["_id"]})
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    student["_id"] = str(student["_id"])
    enrollment = await db.enrollments.find_one({"student_id": student["_id"]})
    
    return {
        "student_name": student.get("student_name"),
        "parent_name": student.get("parent_name"),
        "contact_number": student.get("contact_number"),
        "gmail_id": student.get("gmail_id"),
        "total_classes": enrollment.get("total_classes", 0) if enrollment else 0,
        "used_classes": enrollment.get("used_classes", 0) if enrollment else 0,
        "remaining_classes": enrollment.get("remaining_classes", 0) if enrollment else 0
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
        teacher = await db.users.find_one({"_id": ObjectId(c["teacher_id"])})
        if teacher:
            c["teacher_name"] = teacher.get("name")
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
    
    # Update enrollment
    await db.enrollments.update_one(
        {"student_id": student_id},
        {
            "$inc": {"used_classes": 1, "remaining_classes": -1}
        }
    )
    
    # Update class status
    await db.classes.update_one(
        {"_id": ObjectId(class_id)},
        {"$set": {"status": "completed"}}
    )
    
    return {"message": "Class joined successfully", "meet_link": class_doc.get("meet_link")}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get('FRONTEND_URL', 'http://localhost:3000')],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@classplatform.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc)
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
    
    # Write test credentials
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write("## Admin Account\n")
        f.write(f"Email: {admin_email}\n")
        f.write(f"Password: {admin_password}\n")
        f.write(f"Role: admin\n\n")
        f.write("## Auth Endpoints\n")
        f.write("- POST /api/auth/login\n")
        f.write("- POST /api/auth/register\n")
        f.write("- GET /api/auth/me\n")
        f.write("- POST /api/auth/logout\n")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()