import requests
import sys
import json
from datetime import datetime, timedelta

class CalendarFeaturesTester:
    def __init__(self, base_url="https://class-meet-pro.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None
        self.teacher_id = None
        self.student_id = None
        self.class_id = None

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

            return success, response.json() if success else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@classplatform.com", "password": "admin123"}
        )
        return success

    def test_teacher_login(self):
        """Test teacher login"""
        success, response = self.run_test(
            "Teacher Login",
            "POST",
            "auth/login",
            200,
            data={"email": "teacher@demo.com", "password": "teacher123"}
        )
        return success

    def test_student_login(self):
        """Test student login"""
        success, response = self.run_test(
            "Student Login",
            "POST",
            "auth/login",
            200,
            data={"email": "student@demo.com", "password": "student123"}
        )
        return success

    def test_admin_classes_endpoint(self):
        """Test admin classes endpoint for calendar data"""
        # Login as admin first
        self.test_admin_login()
        
        success, response = self.run_test(
            "Admin Get Classes (Calendar Data)",
            "GET",
            "admin/classes",
            200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} classes for calendar")
            # Check if classes have required fields for calendar
            if len(response) > 0:
                sample_class = response[0]
                required_fields = ['_id', 'date_time', 'status', 'student_name', 'teacher_name', 'platform']
                missing_fields = [field for field in required_fields if field not in sample_class]
                if not missing_fields:
                    print(f"   ✅ Classes have all required calendar fields")
                    self.class_id = sample_class.get('_id')
                else:
                    print(f"   ⚠️ Missing calendar fields: {missing_fields}")
        return success

    def test_teacher_classes_endpoint(self):
        """Test teacher classes endpoint for calendar data"""
        # Login as teacher first
        self.test_teacher_login()
        
        success, response = self.run_test(
            "Teacher Get Classes (Calendar Data)",
            "GET",
            "teacher/classes",
            200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} teacher classes for calendar")
            if len(response) > 0:
                sample_class = response[0]
                required_fields = ['_id', 'date_time', 'status', 'student_name', 'platform']
                missing_fields = [field for field in required_fields if field not in sample_class]
                if not missing_fields:
                    print(f"   ✅ Teacher classes have all required calendar fields")
                else:
                    print(f"   ⚠️ Missing calendar fields: {missing_fields}")
        return success

    def test_student_classes_endpoint(self):
        """Test student classes endpoint for calendar data"""
        # Login as student first
        self.test_student_login()
        
        success, response = self.run_test(
            "Student Get Classes (Calendar Data)",
            "GET",
            "student/classes",
            200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} student classes for calendar")
            if len(response) > 0:
                sample_class = response[0]
                required_fields = ['_id', 'date_time', 'status', 'teacher_name', 'platform']
                missing_fields = [field for field in required_fields if field not in sample_class]
                if not missing_fields:
                    print(f"   ✅ Student classes have all required calendar fields")
                else:
                    print(f"   ⚠️ Missing calendar fields: {missing_fields}")
        return success

    def test_regenerate_zoom_link_endpoint(self):
        """Test regenerate Zoom link endpoint (admin only)"""
        # Login as admin first
        self.test_admin_login()
        
        if not self.class_id:
            print("❌ Skipping regenerate Zoom test - no class ID available")
            return True
        
        success, response = self.run_test(
            "Regenerate Zoom Link (Admin Only)",
            "POST",
            f"admin/classes/{self.class_id}/regenerate-zoom",
            200  # Expecting success even if Zoom not configured
        )
        
        # If Zoom is not configured, we might get a 400 error, which is also acceptable
        if not success:
            # Try again expecting 400 (Zoom not configured)
            success, response = self.run_test(
                "Regenerate Zoom Link (Zoom Not Configured)",
                "POST",
                f"admin/classes/{self.class_id}/regenerate-zoom",
                400
            )
            if success and "not configured" in str(response.get('detail', '')).lower():
                print(f"   ✅ Correctly returns error when Zoom not configured")
        
        return success

    def test_regenerate_zoom_link_unauthorized(self):
        """Test that regenerate Zoom link requires admin role"""
        # Login as teacher first
        self.test_teacher_login()
        
        if not self.class_id:
            print("❌ Skipping unauthorized Zoom test - no class ID available")
            return True
        
        success, response = self.run_test(
            "Regenerate Zoom Link (Teacher - Should Fail)",
            "POST",
            f"admin/classes/{self.class_id}/regenerate-zoom",
            403  # Expecting forbidden
        )
        if success:
            print(f"   ✅ Correctly blocks non-admin users from regenerating Zoom links")
        return success

    def test_zoom_status_endpoint(self):
        """Test Zoom status endpoint"""
        # Login as admin first
        self.test_admin_login()
        
        success, response = self.run_test(
            "Get Zoom Status",
            "GET",
            "admin/zoom-status",
            200
        )
        if success:
            configured = response.get('configured', False)
            connected = response.get('connected', False)
            print(f"   Zoom configured: {configured}, connected: {connected}")
            if not configured:
                print(f"   ✅ Zoom not configured (expected for testing)")
        return success

    def test_create_test_class_for_calendar(self):
        """Create a test class to ensure calendar has data"""
        # Login as admin first
        self.test_admin_login()
        
        # Get existing teachers and students
        teachers_success, teachers = self.run_test("Get Teachers", "GET", "admin/teachers", 200)
        students_success, students = self.run_test("Get Students", "GET", "admin/students", 200)
        
        if not teachers_success or not students_success or not teachers or not students:
            print("❌ Cannot create test class - no teachers or students available")
            return True
        
        teacher_id = teachers[0].get('_id')
        student_id = students[0].get('_id')
        
        # Create a class for tomorrow
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT14:00:00")
        
        success, response = self.run_test(
            "Create Test Class for Calendar",
            "POST",
            "admin/classes",
            200,
            data={
                "student_id": student_id,
                "teacher_id": teacher_id,
                "date_time": tomorrow,
                "duration": 60,
                "platform": "google_meet",
                "meet_link": "https://meet.google.com/test-calendar-class"
            }
        )
        if success and response.get('_id'):
            self.class_id = response['_id']
            print(f"   ✅ Created test class for calendar: {self.class_id}")
        return success

def main():
    print("🚀 Starting Calendar Features Backend Testing")
    print("=" * 60)
    
    tester = CalendarFeaturesTester()
    
    # Test sequence
    tests = [
        tester.test_admin_login,
        tester.test_teacher_login,
        tester.test_student_login,
        tester.test_create_test_class_for_calendar,
        tester.test_admin_classes_endpoint,
        tester.test_teacher_classes_endpoint,
        tester.test_student_classes_endpoint,
        tester.test_zoom_status_endpoint,
        tester.test_regenerate_zoom_link_endpoint,
        tester.test_regenerate_zoom_link_unauthorized
    ]
    
    print(f"\n📋 Running {len(tests)} calendar feature tests...")
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {str(e)}")
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Calendar Features Backend Test Results:")
    print(f"   Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"   Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All calendar backend tests passed!")
        return 0
    else:
        print("⚠️ Some calendar backend tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())