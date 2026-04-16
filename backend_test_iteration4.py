import requests
import sys
import json
from datetime import datetime, timedelta

class Phase3ClassPlatformTester:
    def __init__(self, base_url="https://class-meet-pro.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None
        self.teacher_id = None
        self.student_id = None
        self.class_id = None
        self.notification_id = None

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

    def test_create_cycle_teacher(self):
        """Test creating teacher with cycle-based payment"""
        success, response = self.run_test(
            "Create Cycle-Based Teacher",
            "POST",
            "admin/teachers",
            200,
            data={
                "name": "Test Cycle Teacher",
                "email": "cycle.teacher@test.com",
                "payment_mode": "cycle",
                "cycle_size": 12,
                "cycle_amount": 6000.0,
                "hourly_rate": 0.0
            }
        )
        if success and response.get('_id'):
            self.teacher_id = response['_id']
            print(f"   Created teacher ID: {self.teacher_id}")
            # Verify cycle payment fields
            if response.get('payment_mode') == 'cycle' and response.get('cycle_size') == 12:
                print(f"   ✅ Cycle payment configured: {response.get('cycle_size')} classes / INR {response.get('cycle_amount')}")
            else:
                print(f"   ⚠️ Cycle payment fields not properly set")
        return success

    def test_create_per_class_teacher(self):
        """Test creating teacher with per-class payment"""
        success, response = self.run_test(
            "Create Per-Class Teacher",
            "POST",
            "admin/teachers",
            200,
            data={
                "name": "Test Per-Class Teacher",
                "email": "perclass.teacher@test.com",
                "payment_mode": "per_class",
                "cycle_size": 8,
                "cycle_amount": 0.0,
                "hourly_rate": 500.0
            }
        )
        if success and response.get('payment_mode') == 'per_class':
            print(f"   ✅ Per-class payment configured: INR {response.get('hourly_rate')}/hr")
        return success

    def test_get_teachers_with_payment_info(self):
        """Test getting teachers list with payment mode info"""
        success, response = self.run_test(
            "Get Teachers with Payment Info",
            "GET",
            "admin/teachers",
            200
        )
        if success and isinstance(response, list):
            cycle_teachers = [t for t in response if t.get('payment_mode') == 'cycle']
            per_class_teachers = [t for t in response if t.get('payment_mode') == 'per_class']
            print(f"   Found {len(cycle_teachers)} cycle-based teachers, {len(per_class_teachers)} per-class teachers")
            
            # Check if our test teacher is in the list
            test_teacher = next((t for t in response if t.get('email') == 'cycle.teacher@test.com'), None)
            if test_teacher:
                print(f"   ✅ Test cycle teacher found with cycle_size: {test_teacher.get('cycle_size')}")
        return success

    def test_create_student(self):
        """Test creating a student"""
        success, response = self.run_test(
            "Create Student",
            "POST",
            "admin/students",
            200,
            data={
                "student_name": "Test Student Phase3",
                "parent_name": "Test Parent",
                "contact_number": "9876543210",
                "gmail_id": "teststudent.phase3@test.com",
                "total_classes": 20
            }
        )
        if success and response.get('_id'):
            self.student_id = response['_id']
            print(f"   Created student ID: {self.student_id}")
        return success

    def test_bulk_schedule_classes(self):
        """Test bulk scheduling with date range validation"""
        if not self.teacher_id or not self.student_id:
            print("❌ Skipping bulk schedule - missing teacher or student ID")
            return False

        # Test with valid date range (3 months)
        start_date = datetime.now().strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
        
        success, response = self.run_test(
            "Bulk Schedule Classes (3 months)",
            "POST",
            "admin/classes/bulk",
            200,
            data={
                "student_id": self.student_id,
                "teacher_id": self.teacher_id,
                "start_date": start_date,
                "end_date": end_date,
                "days_of_week": [0, 2, 4],  # Mon, Wed, Fri
                "time_slot": "10:00",
                "duration": 60,
                "platform": "google_meet",
                "meet_link": "https://meet.google.com/test-bulk-link"
            }
        )
        if success:
            count = response.get('count', 0)
            print(f"   ✅ Created {count} recurring classes")
            series_id = response.get('series_id')
            if series_id:
                print(f"   Series ID: {series_id}")
        return success

    def test_bulk_schedule_max_limit(self):
        """Test bulk scheduling with 1 year + 1 day (should fail)"""
        if not self.teacher_id or not self.student_id:
            print("❌ Skipping bulk schedule limit test - missing teacher or student ID")
            return False

        start_date = datetime.now().strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=367)).strftime("%Y-%m-%d")  # Over 1 year
        
        success, response = self.run_test(
            "Bulk Schedule Classes (Over 1 Year - Should Fail)",
            "POST",
            "admin/classes/bulk",
            400,  # Expecting failure
            data={
                "student_id": self.student_id,
                "teacher_id": self.teacher_id,
                "start_date": start_date,
                "end_date": end_date,
                "days_of_week": [1],  # Tuesday
                "time_slot": "14:00",
                "duration": 60,
                "platform": "google_meet"
            }
        )
        if success:
            print(f"   ✅ Correctly rejected bulk schedule over 1 year limit")
        return success

    def test_get_notifications(self):
        """Test getting admin notifications"""
        success, response = self.run_test(
            "Get Admin Notifications",
            "GET",
            "admin/notifications",
            200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} notifications")
            if len(response) > 0:
                self.notification_id = response[0].get('_id')
                print(f"   Sample notification: {response[0].get('message', 'No message')}")
        return success

    def test_mark_notification_read(self):
        """Test marking notification as read"""
        if not self.notification_id:
            print("❌ Skipping notification read test - no notification ID")
            return True  # Skip but don't fail

        success, response = self.run_test(
            "Mark Notification Read",
            "PATCH",
            f"admin/notifications/{self.notification_id}/read",
            200
        )
        return success

    def test_mark_all_notifications_read(self):
        """Test marking all notifications as read"""
        success, response = self.run_test(
            "Mark All Notifications Read",
            "POST",
            "admin/notifications/read-all",
            200
        )
        return success

    def test_admin_stats_with_notifications(self):
        """Test admin stats including unread notifications count"""
        success, response = self.run_test(
            "Admin Stats with Notifications",
            "GET",
            "admin/stats",
            200
        )
        if success:
            unread_count = response.get('unread_notifications', 0)
            print(f"   Unread notifications: {unread_count}")
            print(f"   Total students: {response.get('total_students', 0)}")
            print(f"   Total teachers: {response.get('total_teachers', 0)}")
            print(f"   Total classes: {response.get('total_classes', 0)}")
        return success

    def test_teacher_payment_cycles(self):
        """Test teacher payment cycles endpoint"""
        if not self.teacher_id:
            print("❌ Skipping teacher payment cycles test - no teacher ID")
            return True

        # We need to login as teacher first, but we don't have the temp password
        # So we'll test the endpoint structure by checking if it requires auth
        success, response = self.run_test(
            "Teacher Payment Cycles (Auth Required)",
            "GET",
            "teacher/payment-cycles",
            401  # Expecting unauthorized since we're logged in as admin
        )
        if success:
            print(f"   ✅ Endpoint correctly requires teacher authentication")
        return success

    def test_record_cycle_payment(self):
        """Test recording a cycle-based payment"""
        if not self.teacher_id:
            print("❌ Skipping payment recording - no teacher ID")
            return True

        success, response = self.run_test(
            "Record Cycle Payment",
            "POST",
            "admin/payments",
            200,
            data={
                "teacher_id": self.teacher_id,
                "amount": 6000.0,
                "period_start": "2024-01-01",
                "period_end": "2024-01-31",
                "notes": "Cycle 1 payment - 12 classes",
                "cycle_number": 1
            }
        )
        if success:
            print(f"   ✅ Recorded cycle payment: INR 6000")
        return success

    def test_get_payments_with_cycle_info(self):
        """Test getting payments list with cycle information"""
        success, response = self.run_test(
            "Get Payments with Cycle Info",
            "GET",
            "admin/payments",
            200
        )
        if success and isinstance(response, list):
            cycle_payments = [p for p in response if p.get('cycle_number')]
            print(f"   Found {len(cycle_payments)} cycle-based payments")
            if len(response) > 0:
                sample = response[0]
                print(f"   Sample payment: INR {sample.get('amount', 0)} for {sample.get('teacher_name', 'Unknown')}")
        return success

    def test_single_class_schedule(self):
        """Test that single class scheduling still works"""
        if not self.teacher_id or not self.student_id:
            print("❌ Skipping single class schedule - missing teacher or student ID")
            return True

        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT10:00:00")
        
        success, response = self.run_test(
            "Schedule Single Class (Google Meet)",
            "POST",
            "admin/classes",
            200,
            data={
                "student_id": self.student_id,
                "teacher_id": self.teacher_id,
                "date_time": tomorrow,
                "duration": 60,
                "platform": "google_meet",
                "meet_link": "https://meet.google.com/test-single-class"
            }
        )
        if success and response.get('_id'):
            self.class_id = response['_id']
            print(f"   ✅ Single class scheduled with ID: {self.class_id}")
        return success

    def test_get_classes_with_platform_info(self):
        """Test getting classes list with platform information"""
        success, response = self.run_test(
            "Get Classes with Platform Info",
            "GET",
            "admin/classes",
            200
        )
        if success and isinstance(response, list):
            google_meet_classes = [c for c in response if c.get('platform') == 'google_meet']
            zoom_classes = [c for c in response if c.get('platform') == 'zoom']
            print(f"   Found {len(google_meet_classes)} Google Meet classes, {len(zoom_classes)} Zoom classes")
        return success

def main():
    print("🚀 Starting Phase 3 Class Platform Backend Testing")
    print("=" * 60)
    
    tester = Phase3ClassPlatformTester()
    
    # Test sequence
    tests = [
        tester.test_admin_login,
        tester.test_create_cycle_teacher,
        tester.test_create_per_class_teacher,
        tester.test_get_teachers_with_payment_info,
        tester.test_create_student,
        tester.test_bulk_schedule_classes,
        tester.test_bulk_schedule_max_limit,
        tester.test_get_notifications,
        tester.test_mark_notification_read,
        tester.test_mark_all_notifications_read,
        tester.test_admin_stats_with_notifications,
        tester.test_teacher_payment_cycles,
        tester.test_record_cycle_payment,
        tester.test_get_payments_with_cycle_info,
        tester.test_single_class_schedule,
        tester.test_get_classes_with_platform_info
    ]
    
    print(f"\n📋 Running {len(tests)} Phase 3 feature tests...")
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {str(e)}")
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Phase 3 Backend Test Results:")
    print(f"   Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"   Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All Phase 3 backend tests passed!")
        return 0
    else:
        print("⚠️ Some Phase 3 backend tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())