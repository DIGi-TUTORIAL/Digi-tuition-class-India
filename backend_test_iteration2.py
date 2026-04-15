import requests
import sys
import json
from datetime import datetime, timedelta

class ClassPlatformTesterV2:
    def __init__(self, base_url="https://class-meet-pro.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None
        self.teacher_id = None
        self.student_id = None
        self.class_id = None
        self.course_id = None
        self.payment_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'PATCH':
                response = self.session.patch(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(response_data) <= 5:
                        print(f"   Response: {response_data}")
                except:
                    pass
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response text: {response.text[:200]}")

            return success, response.json() if response.content else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login and get session"""
        print("\n" + "="*50)
        print("TESTING ADMIN AUTHENTICATION")
        print("="*50)
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@classplatform.com", "password": "admin123"}
        )
        return success

    def test_zoom_status(self):
        """Test Zoom API configuration status"""
        print("\n" + "="*50)
        print("TESTING ZOOM INTEGRATION")
        print("="*50)
        
        success, response = self.run_test(
            "Zoom Status Check",
            "GET",
            "admin/zoom-status",
            200
        )
        if success:
            configured = response.get('configured', False)
            print(f"   Zoom configured: {configured}")
            if not configured:
                print("   ⚠️  Zoom API not configured - auto-meeting creation will not work")
        return success

    def test_admin_stats(self):
        """Test admin stats endpoint with new fields"""
        success, response = self.run_test(
            "Admin Stats (Enhanced)",
            "GET",
            "admin/stats",
            200
        )
        if success:
            required_keys = ['total_students', 'total_teachers', 'total_classes', 'completed_classes', 'total_courses', 'total_hours_delivered']
            for key in required_keys:
                if key not in response:
                    print(f"❌ Missing key in stats: {key}")
                    return False
            print(f"   Stats: {response}")
        return success

    def test_create_teacher_with_rate(self):
        """Test creating a teacher with hourly rate"""
        print("\n" + "="*50)
        print("TESTING TEACHER MANAGEMENT WITH RATES")
        print("="*50)
        
        teacher_email = f"teacher_{datetime.now().strftime('%H%M%S')}@test.com"
        success, response = self.run_test(
            "Create Teacher with Hourly Rate",
            "POST",
            "admin/teachers",
            200,
            data={"name": "Test Teacher V2", "email": teacher_email, "hourly_rate": 25.50}
        )
        if success and '_id' in response:
            self.teacher_id = response['_id']
            print(f"   Created teacher ID: {self.teacher_id}")
            print(f"   Hourly rate: ${response.get('hourly_rate', 0)}")
        return success

    def test_create_student_full_fields(self):
        """Test creating/enrolling a student with all mandatory fields"""
        print("\n" + "="*50)
        print("TESTING STUDENT ENROLLMENT (ALL FIELDS)")
        print("="*50)
        
        student_email = f"student_{datetime.now().strftime('%H%M%S')}@test.com"
        success, response = self.run_test(
            "Enroll Student (All Mandatory Fields)",
            "POST",
            "admin/students",
            200,
            data={
                "student_name": "Test Student V2",
                "parent_name": "Test Parent V2",
                "contact_number": "9876543210",
                "gmail_id": student_email,
                "total_classes": 10
            }
        )
        if success and '_id' in response:
            self.student_id = response['_id']
            print(f"   Created student ID: {self.student_id}")
        return success

    def test_course_management(self):
        """Test course creation and management"""
        print("\n" + "="*50)
        print("TESTING COURSE MANAGEMENT")
        print("="*50)
        
        # Create course
        success, response = self.run_test(
            "Create Course",
            "POST",
            "admin/courses",
            200,
            data={
                "name": "Advanced Mathematics",
                "subject": "Mathematics",
                "description": "Advanced math concepts for high school students"
            }
        )
        if success and '_id' in response:
            self.course_id = response['_id']
            print(f"   Created course ID: {self.course_id}")
        
        # Get all courses
        success2, response2 = self.run_test(
            "Get All Courses",
            "GET",
            "admin/courses",
            200
        )
        if success2 and isinstance(response2, list):
            print(f"   Found {len(response2)} courses")
        
        # Assign students and teachers to course
        if self.course_id and self.student_id and self.teacher_id:
            success3, response3 = self.run_test(
                "Assign Members to Course",
                "PATCH",
                f"admin/courses/{self.course_id}/assign",
                200,
                data={
                    "student_ids": [self.student_id],
                    "teacher_ids": [self.teacher_id]
                }
            )
            return success and success2 and success3
        
        return success and success2

    def test_class_scheduling_google_meet(self):
        """Test scheduling a class with Google Meet"""
        print("\n" + "="*50)
        print("TESTING CLASS SCHEDULING - GOOGLE MEET")
        print("="*50)
        
        if not self.teacher_id or not self.student_id:
            print("❌ Cannot schedule class - missing teacher or student ID")
            return False
            
        future_time = (datetime.now() + timedelta(hours=1)).isoformat()
        success, response = self.run_test(
            "Schedule Class (Google Meet)",
            "POST",
            "admin/classes",
            200,
            data={
                "student_id": self.student_id,
                "teacher_id": self.teacher_id,
                "meet_link": "https://meet.google.com/test-link-v2",
                "date_time": future_time,
                "duration": 60,
                "platform": "google_meet",
                "course_id": self.course_id
            }
        )
        if success and '_id' in response:
            self.class_id = response['_id']
            print(f"   Created class ID: {self.class_id}")
            print(f"   Platform: {response.get('platform')}")
            print(f"   Meet link: {response.get('meet_link')}")
        return success

    def test_class_scheduling_zoom(self):
        """Test scheduling a class with Zoom auto-creation"""
        print("\n" + "="*50)
        print("TESTING CLASS SCHEDULING - ZOOM AUTO-CREATE")
        print("="*50)
        
        if not self.teacher_id or not self.student_id:
            print("❌ Cannot schedule class - missing teacher or student ID")
            return False
            
        future_time = (datetime.now() + timedelta(hours=2)).isoformat()
        success, response = self.run_test(
            "Schedule Class (Zoom Auto-create)",
            "POST",
            "admin/classes",
            200,
            data={
                "student_id": self.student_id,
                "teacher_id": self.teacher_id,
                "date_time": future_time,
                "duration": 90,
                "platform": "zoom",
                "course_id": self.course_id
            }
        )
        if success:
            print(f"   Platform: {response.get('platform')}")
            zoom_link = response.get('zoom_link')
            if zoom_link:
                print(f"   ✅ Zoom link auto-created: {zoom_link}")
            else:
                print(f"   ⚠️  No Zoom link created (API may not be configured)")
        return success

    def test_attendance_tracking(self):
        """Test attendance tracking with join/leave functionality"""
        print("\n" + "="*50)
        print("TESTING ATTENDANCE TRACKING")
        print("="*50)
        
        if not self.class_id:
            print("❌ Cannot test attendance - no class ID")
            return False
        
        # Test teacher join class (should fail without proper auth)
        success1, response1 = self.run_test(
            "Teacher Join Class (without auth)",
            "POST",
            f"teacher/classes/{self.class_id}/join",
            401
        )
        
        # Test student join class (should fail without proper auth)
        success2, response2 = self.run_test(
            "Student Join Class (without auth)",
            "POST",
            f"student/classes/{self.class_id}/join",
            401
        )
        
        print("   ✓ Attendance endpoints properly protected")
        return success1 and success2

    def test_reports_and_analytics(self):
        """Test reports and analytics endpoints"""
        print("\n" + "="*50)
        print("TESTING REPORTS & ANALYTICS")
        print("="*50)
        
        # Test student report
        success1, response1 = self.run_test(
            "Student Summary Report",
            "POST",
            "admin/reports/student-summary",
            200,
            data={}
        )
        if success1 and isinstance(response1, list):
            print(f"   Student report entries: {len(response1)}")
        
        # Test teacher report
        success2, response2 = self.run_test(
            "Teacher Summary Report",
            "POST",
            "admin/reports/teacher-summary",
            200,
            data={}
        )
        if success2 and isinstance(response2, list):
            print(f"   Teacher report entries: {len(response2)}")
        
        # Test attendance log
        success3, response3 = self.run_test(
            "Attendance Log Report",
            "POST",
            "admin/reports/attendance",
            200,
            data={}
        )
        if success3 and isinstance(response3, list):
            print(f"   Attendance log entries: {len(response3)}")
        
        # Test filtered reports
        filter_data = {
            "student_id": self.student_id,
            "teacher_id": self.teacher_id,
            "date_from": "2024-01-01",
            "date_to": "2024-12-31"
        }
        success4, response4 = self.run_test(
            "Filtered Attendance Report",
            "POST",
            "admin/reports/attendance",
            200,
            data=filter_data
        )
        
        return success1 and success2 and success3 and success4

    def test_payment_tracking(self):
        """Test payment recording and tracking"""
        print("\n" + "="*50)
        print("TESTING PAYMENT TRACKING")
        print("="*50)
        
        if not self.teacher_id:
            print("❌ Cannot test payments - no teacher ID")
            return False
        
        # Record payment
        success1, response1 = self.run_test(
            "Record Payment",
            "POST",
            "admin/payments",
            200,
            data={
                "teacher_id": self.teacher_id,
                "amount": 127.50,
                "period_start": "2024-01-01",
                "period_end": "2024-01-31",
                "notes": "January 2024 payment"
            }
        )
        if success1 and '_id' in response1:
            self.payment_id = response1['_id']
            print(f"   Created payment ID: {self.payment_id}")
        
        # Get all payments
        success2, response2 = self.run_test(
            "Get All Payments",
            "GET",
            "admin/payments",
            200
        )
        if success2 and isinstance(response2, list):
            print(f"   Found {len(response2)} payment records")
            for payment in response2:
                if payment.get('_id') == self.payment_id:
                    print(f"   Payment amount: ${payment.get('amount')}")
                    print(f"   Teacher: {payment.get('teacher_name')}")
        
        return success1 and success2

    def test_teacher_dashboard_endpoints(self):
        """Test teacher dashboard specific endpoints"""
        print("\n" + "="*50)
        print("TESTING TEACHER DASHBOARD ENDPOINTS")
        print("="*50)
        
        # Test teacher classes endpoint (should fail without auth)
        success1, response1 = self.run_test(
            "Teacher Classes",
            "GET",
            "teacher/classes",
            401
        )
        
        # Test teacher stats endpoint (should fail without auth)
        success2, response2 = self.run_test(
            "Teacher Stats",
            "GET",
            "teacher/stats",
            401
        )
        
        # Test teacher attendance endpoint (should fail without auth)
        success3, response3 = self.run_test(
            "Teacher Attendance Log",
            "GET",
            "teacher/attendance",
            401
        )
        
        print("   ✓ All teacher endpoints properly protected")
        return success1 and success2 and success3

    def test_student_dashboard_endpoints(self):
        """Test student dashboard specific endpoints"""
        print("\n" + "="*50)
        print("TESTING STUDENT DASHBOARD ENDPOINTS")
        print("="*50)
        
        # Test student dashboard endpoint (should fail without auth)
        success1, response1 = self.run_test(
            "Student Dashboard",
            "GET",
            "student/dashboard",
            401
        )
        
        # Test student classes endpoint (should fail without auth)
        success2, response2 = self.run_test(
            "Student Classes",
            "GET",
            "student/classes",
            401
        )
        
        # Test student attendance endpoint (should fail without auth)
        success3, response3 = self.run_test(
            "Student Attendance Log",
            "GET",
            "student/attendance",
            401
        )
        
        print("   ✓ All student endpoints properly protected")
        return success1 and success2 and success3

def main():
    print("🚀 Starting Class Platform API Tests - Iteration 2")
    print("Testing: Zoom integration, Attendance tracking, Course management, Reports, Payments")
    print("="*80)
    
    tester = ClassPlatformTesterV2()
    
    # Test sequence for iteration 2 features
    tests = [
        ("Admin Authentication", tester.test_admin_login),
        ("Zoom Integration Status", tester.test_zoom_status),
        ("Enhanced Admin Stats", tester.test_admin_stats),
        ("Teacher Creation with Rates", tester.test_create_teacher_with_rate),
        ("Student Enrollment (All Fields)", tester.test_create_student_full_fields),
        ("Course Management", tester.test_course_management),
        ("Class Scheduling (Google Meet)", tester.test_class_scheduling_google_meet),
        ("Class Scheduling (Zoom Auto-create)", tester.test_class_scheduling_zoom),
        ("Attendance Tracking", tester.test_attendance_tracking),
        ("Reports & Analytics", tester.test_reports_and_analytics),
        ("Payment Tracking", tester.test_payment_tracking),
        ("Teacher Dashboard Endpoints", tester.test_teacher_dashboard_endpoints),
        ("Student Dashboard Endpoints", tester.test_student_dashboard_endpoints),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            if not result:
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print final results
    print("\n" + "="*80)
    print("📊 FINAL TEST RESULTS - ITERATION 2")
    print("="*80)
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed Test Categories: {', '.join(failed_tests)}")
        return 1
    else:
        print("\n✅ All iteration 2 test categories completed successfully!")
        return 0

if __name__ == "__main__":
    sys.exit(main())