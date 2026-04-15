#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta

class ClassPlatformAPITester:
    def __init__(self, base_url="https://class-meet-pro.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None
        self.teacher_id = None
        self.student_id = None
        self.course_id = None
        self.class_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        return success

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make API request with error handling"""
        url = f"{self.base_url}/api{endpoint}"
        try:
            if method == 'GET':
                response = self.session.get(url)
            elif method == 'POST':
                response = self.session.post(url, json=data)
            elif method == 'PATCH':
                response = self.session.patch(url, json=data)
            elif method == 'DELETE':
                response = self.session.delete(url)
            
            success = response.status_code == expected_status
            return success, response.json() if response.headers.get('content-type', '').startswith('application/json') else {}, response.status_code
        except Exception as e:
            return False, {}, f"Exception: {str(e)}"

    def test_admin_login(self):
        """Test admin login"""
        success, data, status = self.make_request('POST', '/auth/login', {
            'email': 'admin@classplatform.com',
            'password': 'admin123'
        })
        if success and data.get('role') == 'admin':
            return self.log_test("Admin Login", True)
        return self.log_test("Admin Login", False, f"Status: {status}, Data: {data}")

    def test_admin_stats(self):
        """Test admin stats endpoint"""
        success, data, status = self.make_request('GET', '/admin/stats')
        if success and 'total_students' in data:
            return self.log_test("Admin Stats", True, f"Students: {data.get('total_students', 0)}")
        return self.log_test("Admin Stats", False, f"Status: {status}")

    def test_create_teacher(self):
        """Test teacher creation"""
        teacher_data = {
            'name': f'Test Teacher {datetime.now().strftime("%H%M%S")}',
            'email': f'teacher{datetime.now().strftime("%H%M%S")}@test.com',
            'hourly_rate': 25.50
        }
        success, data, status = self.make_request('POST', '/admin/teachers', teacher_data, 200)
        if success and data.get('_id'):
            self.teacher_id = data['_id']
            return self.log_test("Create Teacher", True, f"ID: {self.teacher_id}")
        return self.log_test("Create Teacher", False, f"Status: {status}, Data: {data}")

    def test_get_teachers(self):
        """Test get teachers"""
        success, data, status = self.make_request('GET', '/admin/teachers')
        if success and isinstance(data, list):
            return self.log_test("Get Teachers", True, f"Count: {len(data)}")
        return self.log_test("Get Teachers", False, f"Status: {status}")

    def test_create_student(self):
        """Test student creation"""
        student_data = {
            'student_name': f'Test Student {datetime.now().strftime("%H%M%S")}',
            'parent_name': 'Test Parent',
            'contact_number': '+1234567890',
            'gmail_id': f'student{datetime.now().strftime("%H%M%S")}@test.com',
            'total_classes': 10
        }
        success, data, status = self.make_request('POST', '/admin/students', student_data, 200)
        if success and data.get('_id'):
            self.student_id = data['_id']
            return self.log_test("Create Student", True, f"ID: {self.student_id}")
        return self.log_test("Create Student", False, f"Status: {status}, Data: {data}")

    def test_get_students(self):
        """Test get students"""
        success, data, status = self.make_request('GET', '/admin/students')
        if success and isinstance(data, list):
            return self.log_test("Get Students", True, f"Count: {len(data)}")
        return self.log_test("Get Students", False, f"Status: {status}")

    def test_create_course(self):
        """Test course creation"""
        course_data = {
            'name': f'Test Course {datetime.now().strftime("%H%M%S")}',
            'subject': 'Mathematics',
            'description': 'Test course description'
        }
        success, data, status = self.make_request('POST', '/admin/courses', course_data, 200)
        if success and data.get('_id'):
            self.course_id = data['_id']
            return self.log_test("Create Course", True, f"ID: {self.course_id}")
        return self.log_test("Create Course", False, f"Status: {status}, Data: {data}")

    def test_get_courses(self):
        """Test get courses"""
        success, data, status = self.make_request('GET', '/admin/courses')
        if success and isinstance(data, list):
            return self.log_test("Get Courses", True, f"Count: {len(data)}")
        return self.log_test("Get Courses", False, f"Status: {status}")

    def test_assign_course(self):
        """Test course assignment"""
        if not self.course_id or not self.student_id or not self.teacher_id:
            return self.log_test("Assign Course", False, "Missing course, student, or teacher ID")
        
        assign_data = {
            'student_ids': [self.student_id],
            'teacher_ids': [self.teacher_id]
        }
        success, data, status = self.make_request('PATCH', f'/admin/courses/{self.course_id}/assign', assign_data)
        if success:
            return self.log_test("Assign Course", True)
        return self.log_test("Assign Course", False, f"Status: {status}, Data: {data}")

    def test_schedule_google_meet_class(self):
        """Test Google Meet class scheduling"""
        if not self.student_id or not self.teacher_id:
            return self.log_test("Schedule Google Meet Class", False, "Missing student or teacher ID")
        
        future_time = (datetime.now() + timedelta(hours=1)).isoformat()
        class_data = {
            'student_id': self.student_id,
            'teacher_id': self.teacher_id,
            'meet_link': 'https://meet.google.com/test-link',
            'date_time': future_time,
            'duration': 60,
            'platform': 'google_meet',
            'course_id': self.course_id
        }
        success, data, status = self.make_request('POST', '/admin/classes', class_data, 200)
        if success and data.get('_id'):
            self.class_id = data['_id']
            return self.log_test("Schedule Google Meet Class", True, f"ID: {self.class_id}")
        return self.log_test("Schedule Google Meet Class", False, f"Status: {status}, Data: {data}")

    def test_schedule_zoom_class(self):
        """Test Zoom class scheduling (should fail gracefully)"""
        if not self.student_id or not self.teacher_id:
            return self.log_test("Schedule Zoom Class", False, "Missing student or teacher ID")
        
        future_time = (datetime.now() + timedelta(hours=2)).isoformat()
        class_data = {
            'student_id': self.student_id,
            'teacher_id': self.teacher_id,
            'date_time': future_time,
            'duration': 60,
            'platform': 'zoom'
        }
        success, data, status = self.make_request('POST', '/admin/classes', class_data, 500)
        # Expecting 500 because Zoom credentials are disabled
        if status == 500:
            return self.log_test("Schedule Zoom Class (Expected Failure)", True, "Zoom credentials disabled as expected")
        return self.log_test("Schedule Zoom Class", False, f"Unexpected status: {status}")

    def test_get_classes(self):
        """Test get classes"""
        success, data, status = self.make_request('GET', '/admin/classes')
        if success and isinstance(data, list):
            return self.log_test("Get Classes", True, f"Count: {len(data)}")
        return self.log_test("Get Classes", False, f"Status: {status}")

    def test_zoom_status(self):
        """Test Zoom status endpoint"""
        success, data, status = self.make_request('GET', '/admin/zoom-status')
        if success and 'configured' in data:
            configured = data.get('configured', False)
            connected = data.get('connected', False)
            error = data.get('error', '')
            if configured and not connected and error:
                return self.log_test("Zoom Status", True, f"Configured but not connected (expected): {error}")
            return self.log_test("Zoom Status", True, f"Configured: {configured}, Connected: {connected}")
        return self.log_test("Zoom Status", False, f"Status: {status}")

    def test_record_payment(self):
        """Test payment recording"""
        if not self.teacher_id:
            return self.log_test("Record Payment", False, "Missing teacher ID")
        
        payment_data = {
            'teacher_id': self.teacher_id,
            'amount': 127.50,
            'period_start': '2024-01-01',
            'period_end': '2024-01-31',
            'notes': 'Test payment'
        }
        success, data, status = self.make_request('POST', '/admin/payments', payment_data, 200)
        if success and data.get('_id'):
            return self.log_test("Record Payment", True, f"ID: {data['_id']}")
        return self.log_test("Record Payment", False, f"Status: {status}, Data: {data}")

    def test_get_payments(self):
        """Test get payments"""
        success, data, status = self.make_request('GET', '/admin/payments')
        if success and isinstance(data, list):
            return self.log_test("Get Payments", True, f"Count: {len(data)}")
        return self.log_test("Get Payments", False, f"Status: {status}")

    def test_reports(self):
        """Test reports endpoints"""
        # Student summary report
        success, data, status = self.make_request('POST', '/admin/reports/student-summary', {})
        if not (success and isinstance(data, list)):
            return self.log_test("Student Summary Report", False, f"Status: {status}")
        
        # Teacher summary report
        success, data, status = self.make_request('POST', '/admin/reports/teacher-summary', {})
        if not (success and isinstance(data, list)):
            return self.log_test("Teacher Summary Report", False, f"Status: {status}")
        
        # Attendance report
        success, data, status = self.make_request('POST', '/admin/reports/attendance', {})
        if success and isinstance(data, list):
            return self.log_test("Reports (Student/Teacher/Attendance)", True, "All report endpoints working")
        return self.log_test("Attendance Report", False, f"Status: {status}")

    def test_teacher_endpoints(self):
        """Test teacher-specific endpoints (should fail without teacher auth)"""
        success, data, status = self.make_request('GET', '/teacher/classes', expected_status=401)
        if status == 401:
            return self.log_test("Teacher Endpoints Protection", True, "Properly protected")
        return self.log_test("Teacher Endpoints Protection", False, f"Unexpected status: {status}")

    def test_student_endpoints(self):
        """Test student-specific endpoints (should fail without student auth)"""
        success, data, status = self.make_request('GET', '/student/dashboard', expected_status=401)
        if status == 401:
            return self.log_test("Student Endpoints Protection", True, "Properly protected")
        return self.log_test("Student Endpoints Protection", False, f"Unexpected status: {status}")

    def run_all_tests(self):
        """Run comprehensive API test suite"""
        print("🚀 Starting Class Platform API Tests")
        print("=" * 50)
        
        # Authentication & Admin
        self.test_admin_login()
        self.test_admin_stats()
        
        # Teacher Management
        self.test_create_teacher()
        self.test_get_teachers()
        
        # Student Management
        self.test_create_student()
        self.test_get_students()
        
        # Course Management
        self.test_create_course()
        self.test_get_courses()
        self.test_assign_course()
        
        # Class Scheduling
        self.test_schedule_google_meet_class()
        self.test_schedule_zoom_class()
        self.test_get_classes()
        
        # Zoom Integration
        self.test_zoom_status()
        
        # Payment Management
        self.test_record_payment()
        self.test_get_payments()
        
        # Reports & Analytics
        self.test_reports()
        
        # Security
        self.test_teacher_endpoints()
        self.test_student_endpoints()
        
        print("=" * 50)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = ClassPlatformAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())