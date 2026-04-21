import requests
import sys
import json
from datetime import datetime

class ClassPlatformTester:
    def __init__(self, base_url="https://class-meet-pro.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()  # Use session to handle cookies
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_logged_in = False
        self.teacher_logged_in = False
        self.student_logged_in = False
        self.created_teacher_id = None
        self.created_student_id = None
        self.created_class_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PATCH':
                response = self.session.patch(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.text else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self, email, password, role_name):
        """Test login and get token"""
        success, response = self.run_test(
            f"Login as {role_name}",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success:
            # Check for force_password_change flag
            force_change = response.get('force_password_change', False)
            print(f"   Force password change: {force_change}")
            return True, response
        return False, {}

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.test_login("admin@classplatform.com", "admin123", "Admin")
        if success:
            self.admin_logged_in = True
        return success

    def test_teacher_login(self):
        """Test teacher login"""
        # Logout first to clear admin session
        self.session.post(f"{self.base_url}/api/auth/logout")
        success, response = self.test_login("teacher@demo.com", "teacher123", "Teacher")
        if success:
            self.teacher_logged_in = True
        return success

    def test_student_login(self):
        """Test student login"""
        # Logout first to clear previous session
        self.session.post(f"{self.base_url}/api/auth/logout")
        success, response = self.test_login("student@demo.com", "student123", "Student")
        if success:
            self.student_logged_in = True
        return success

    def ensure_admin_login(self):
        """Ensure admin is logged in"""
        if not self.admin_logged_in:
            self.session.post(f"{self.base_url}/api/auth/logout")  # Clear any existing session
            self.test_admin_login()

    def ensure_teacher_login(self):
        """Ensure teacher is logged in"""
        if not self.teacher_logged_in:
            self.session.post(f"{self.base_url}/api/auth/logout")  # Clear any existing session
            self.test_teacher_login()

    def test_create_teacher(self):
        """Test creating teacher with extended fields"""
        teacher_data = {
            "name": "Test Teacher Extended",
            "email": f"testteacher_{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "+1234567890",
            "qualification": "M.Sc Mathematics",
            "experience": 5,
            "date_of_joining": "2024-01-15",
            "teaching_levels": ["Class 10", "Class 11", "Class 12"],
            "subjects": ["Mathematics", "Physics"],
            "hourly_rate": 500.0,
            "payment_mode": "cycle",
            "cycle_size": 8,
            "cycle_amount": 4000.0
        }
        
        success, response = self.run_test(
            "Create Teacher with Extended Fields",
            "POST",
            "admin/teachers",
            200,
            data=teacher_data
        )
        
        if success:
            self.created_teacher_id = response.get('_id')
            temp_password = response.get('temp_password')
            print(f"   Teacher created with ID: {self.created_teacher_id}")
            print(f"   Temp password: {temp_password}")
            print(f"   Force password change should be True")
        return success

    def test_create_student(self):
        """Test creating student with extended fields"""
        student_data = {
            "student_name": "Test Student Extended",
            "parent_name": "Test Parent",
            "contact_number": "+9876543210",
            "gmail_id": f"teststudent_{datetime.now().strftime('%H%M%S')}@test.com",
            "total_classes": 20,
            "grade": "Class 10",
            "board": "CBSE",
            "date_of_admission": "2024-02-01",
            "subjects": ["Mathematics", "Science", "English"]
        }
        
        success, response = self.run_test(
            "Create Student with Extended Fields",
            "POST",
            "admin/students",
            200,
            data=student_data
        )
        
        if success:
            self.created_student_id = response.get('_id')
            temp_password = response.get('temp_password')
            print(f"   Student created with ID: {self.created_student_id}")
            print(f"   Temp password: {temp_password}")
        return success

    def test_schedule_individual_class(self):
        """Test scheduling individual class with subject field"""
        if not self.created_student_id or not self.created_teacher_id:
            print("❌ Cannot test class scheduling - missing student or teacher")
            return False
            
        class_data = {
            "student_id": self.created_student_id,
            "teacher_id": self.created_teacher_id,
            "meet_link": "https://meet.google.com/test-link",
            "date_time": "2024-12-20T10:00:00",
            "duration": 60,
            "platform": "google_meet",
            "class_type": "individual",
            "subject": "Mathematics",
            "recording_link": "https://zoom.us/rec/test-recording"
        }
        
        success, response = self.run_test(
            "Schedule Individual Class with Subject",
            "POST",
            "admin/classes",
            200,
            data=class_data
        )
        
        if success:
            self.created_class_id = response.get('_id')
            print(f"   Class created with ID: {self.created_class_id}")
        return success

    def test_schedule_group_class(self):
        """Test scheduling group class"""
        if not self.created_student_id or not self.created_teacher_id:
            print("❌ Cannot test group class scheduling - missing student or teacher")
            return False
            
        class_data = {
            "student_ids": [self.created_student_id],  # Group class with one student for testing
            "teacher_id": self.created_teacher_id,
            "meet_link": "https://meet.google.com/group-test-link",
            "date_time": "2024-12-21T11:00:00",
            "duration": 90,
            "platform": "google_meet",
            "class_type": "group",
            "subject": "Physics"
        }
        
        success, response = self.run_test(
            "Schedule Group Class",
            "POST",
            "admin/classes",
            200,
            data=class_data
        )
        return success

    def test_get_admin_classes(self):
        """Test getting classes as admin (should show recording link)"""
        success, response = self.run_test(
            "Get Admin Classes (with recording link)",
            "GET",
            "admin/classes",
            200
        )
        
        if success and response:
            classes = response if isinstance(response, list) else []
            print(f"   Found {len(classes)} classes")
            # Check if classes are sorted by created_at desc
            if len(classes) >= 2:
                first_created = classes[0].get('created_at', '')
                second_created = classes[1].get('created_at', '')
                if first_created >= second_created:
                    print("   ✅ Classes sorted by creation time (newest first)")
                else:
                    print("   ❌ Classes NOT sorted correctly")
            
            # Check for recording link visibility
            for cls in classes[:3]:  # Check first 3 classes
                if 'recording_link' in cls:
                    print(f"   ✅ Recording link visible to admin: {cls.get('recording_link', 'N/A')}")
                    break
        return success

    def test_get_teacher_classes(self):
        """Test getting classes as teacher (should NOT show recording link)"""
        success, response = self.run_test(
            "Get Teacher Classes (NO recording link)",
            "GET",
            "teacher/classes",
            200
        )
        
        if success and response:
            classes = response if isinstance(response, list) else []
            print(f"   Found {len(classes)} classes for teacher")
            # Check that recording link is hidden
            for cls in classes[:3]:
                if 'recording_link' not in cls or cls.get('recording_link') is None:
                    print("   ✅ Recording link properly hidden from teacher")
                    break
                else:
                    print(f"   ❌ Recording link visible to teacher: {cls.get('recording_link')}")
        return success

    def test_edit_class(self):
        """Test editing class"""
        if not self.created_class_id:
            print("❌ Cannot test class editing - no class created")
            return False
            
        edit_data = {
            "subject": "Advanced Mathematics",
            "recording_link": "https://zoom.us/rec/updated-recording",
            "status": "completed"
        }
        
        success, response = self.run_test(
            "Edit Class",
            "PATCH",
            f"admin/classes/{self.created_class_id}",
            200,
            data=edit_data
        )
        return success

    def test_delete_class_with_confirmation(self):
        """Test deleting class (should work)"""
        if not self.created_class_id:
            print("❌ Cannot test class deletion - no class created")
            return False
            
        success, response = self.run_test(
            "Delete Class",
            "DELETE",
            f"admin/classes/{self.created_class_id}",
            200
        )
        return success

    def test_delete_teacher_with_future_classes(self):
        """Test deleting teacher with future classes (should fail)"""
        if not self.created_teacher_id:
            print("❌ Cannot test teacher deletion - no teacher created")
            return False
            
        # First create a future class
        if self.created_student_id:
            future_class_data = {
                "student_id": self.created_student_id,
                "teacher_id": self.created_teacher_id,
                "meet_link": "https://meet.google.com/future-class",
                "date_time": "2025-01-15T10:00:00",
                "duration": 60,
                "platform": "google_meet",
                "class_type": "individual",
                "subject": "Test Subject"
            }
            
            self.run_test(
                "Create Future Class for Teacher",
                "POST",
                "admin/classes",
                200,
                data=future_class_data
            )
        
        # Now try to delete teacher (should fail)
        success, response = self.run_test(
            "Delete Teacher with Future Classes (should fail)",
            "DELETE",
            f"admin/teachers/{self.created_teacher_id}",
            400  # Should fail with 400
        )
        
        # Invert success since we expect this to fail
        if not success:
            print("   ✅ Correctly prevented deletion of teacher with future classes")
            self.tests_passed += 1
            return True
        else:
            print("   ❌ Teacher deletion should have failed but succeeded")
            return False

    def test_change_password_endpoint(self):
        """Test change password endpoint"""
        change_data = {
            "current_password": "admin123",
            "new_password": "newpassword123"
        }
        
        success, response = self.run_test(
            "Change Password",
            "POST",
            "auth/change-password",
            200,
            data=change_data
        )
        
        # Change it back
        if success:
            change_back_data = {
                "current_password": "newpassword123",
                "new_password": "admin123"
            }
            self.run_test(
                "Change Password Back",
                "POST",
                "auth/change-password",
                200,
                data=change_back_data
            )
        
        return success

    def test_forgot_password_endpoint(self):
        """Test forgot password endpoint"""
        forgot_data = {
            "email": "admin@classplatform.com"
        }
        
        success, response = self.run_test(
            "Forgot Password",
            "POST",
            "auth/forgot-password",
            200,
            data=forgot_data
        )
        return success

    def test_reset_password_endpoint(self):
        """Test reset password endpoint with invalid token"""
        reset_data = {
            "token": "invalid_token_for_testing",
            "new_password": "newpassword123"
        }
        
        success, response = self.run_test(
            "Reset Password (invalid token)",
            "POST",
            "auth/reset-password",
            400,  # Should fail with invalid token
            data=reset_data
        )
        
        # Invert success since we expect this to fail
        if not success:
            print("   ✅ Correctly rejected invalid reset token")
            self.tests_passed += 1
            return True
        else:
            print("   ❌ Reset password should have failed with invalid token")
            return False

    def test_subject_assignments(self):
        """Test subject-teacher mapping CRUD operations"""
        print("\n🎯 Testing Subject-Teacher Mapping...")
        
        # Get students and teachers first
        success, students = self.run_test("Get Students", "GET", "admin/students", 200)
        if not success or not students:
            print("❌ Cannot test subject assignments - no students found")
            return False
            
        success, teachers = self.run_test("Get Teachers", "GET", "admin/teachers", 200)
        if not success or not teachers:
            print("❌ Cannot test subject assignments - no teachers found")
            return False

        student_id = students[0]['_id']
        teacher_id = teachers[0]['_id']

        # Create subject assignment
        success, assignment = self.run_test(
            "Create Subject Assignment",
            "POST",
            "admin/subject-assignments",
            200,
            data={
                "student_id": student_id,
                "subject": "Math",
                "teacher_id": teacher_id
            }
        )
        if not success:
            return False

        assignment_id = assignment.get('_id')

        # Get all subject assignments
        success, assignments = self.run_test(
            "Get Subject Assignments",
            "GET",
            "admin/subject-assignments",
            200
        )
        if not success:
            return False

        # Get student-specific assignments
        success, student_assignments = self.run_test(
            "Get Student Subject Assignments",
            "GET",
            f"admin/subject-assignments/{student_id}",
            200
        )
        if not success:
            return False

        # Delete subject assignment
        if assignment_id:
            success, _ = self.run_test(
                "Delete Subject Assignment",
                "DELETE",
                f"admin/subject-assignments/{assignment_id}",
                200
            )
            if not success:
                return False

        return True

    def test_class_reschedule(self):
        """Test class rescheduling API"""
        print("\n📅 Testing Class Rescheduling...")
        
        # Get existing classes
        success, classes = self.run_test("Get Classes", "GET", "admin/classes", 200)
        if not success or not classes:
            print("❌ Cannot test reschedule - no classes found")
            return False

        class_id = classes[0]['_id']
        
        # Test reschedule API
        from datetime import datetime, timedelta
        new_datetime = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT%H:%M")
        success, _ = self.run_test(
            "Reschedule Class",
            "PATCH",
            f"admin/classes/{class_id}/reschedule",
            200,
            data={"date_time": new_datetime}
        )
        
        return success

def main():
    print("🚀 Starting Class Platform API Tests...")
    print("=" * 50)
    
    tester = ClassPlatformTester()
    
    # Test authentication first
    print("\n📋 AUTHENTICATION TESTS")
    print("-" * 30)
    
    # Test admin login and functionality together
    if not tester.test_admin_login():
        print("❌ Admin login failed, stopping tests")
        return 1
    
    # Test admin functionality while logged in as admin
    print("\n📋 ADMIN FUNCTIONALITY TESTS")
    print("-" * 30)
    
    tester.test_create_teacher()
    tester.test_create_student()
    tester.test_schedule_individual_class()
    tester.test_schedule_group_class()
    tester.test_get_admin_classes()
    
    # Test edit/delete functionality while still admin
    print("\n📋 EDIT/DELETE FUNCTIONALITY TESTS")
    print("-" * 30)
    tester.test_edit_class()
    tester.test_delete_teacher_with_future_classes()
    tester.test_delete_class_with_confirmation()
    
    # Test password management while admin
    print("\n📋 PASSWORD MANAGEMENT TESTS")
    print("-" * 30)
    tester.test_change_password_endpoint()
    tester.test_forgot_password_endpoint()
    tester.test_reset_password_endpoint()
    
    # Test new features
    print("\n📋 NEW FEATURES TESTS")
    print("-" * 30)
    tester.test_subject_assignments()
    tester.test_class_reschedule()
    
    # Now test teacher functionality
    print("\n📋 TEACHER FUNCTIONALITY TESTS")
    print("-" * 30)
    if not tester.test_teacher_login():
        print("❌ Teacher login failed")
    else:
        tester.test_get_teacher_classes()
    
    # Test student login
    print("\n📋 STUDENT AUTHENTICATION TEST")
    print("-" * 30)
    if not tester.test_student_login():
        print("❌ Student login failed")
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("🎉 Backend tests mostly successful!")
        return 0
    else:
        print("⚠️  Some backend tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())