import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '../components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Users, GraduationCap, Calendar, BookOpen, Clock, CreditCard, BarChart3, Video, LogOut } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const ax = (url, opts = {}) => axios({ url: `${BACKEND_URL}${url}`, withCredentials: true, ...opts });

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({});
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [zoomConfigured, setZoomConfigured] = useState(false);

  // Dialogs
  const [showTeacherDialog, setShowTeacherDialog] = useState(false);
  const [showStudentDialog, setShowStudentDialog] = useState(false);
  const [showClassDialog, setShowClassDialog] = useState(false);
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // Teacher form
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherRate, setTeacherRate] = useState('0');

  // Student form
  const [studentName, setStudentName] = useState('');
  const [parentName, setParentName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [gmailId, setGmailId] = useState('');
  const [totalClasses, setTotalClasses] = useState('');

  // Class form
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [classDuration, setClassDuration] = useState('60');
  const [classPlatform, setClassPlatform] = useState('google_meet');
  const [classCourse, setClassCourse] = useState('');

  // Course form
  const [courseName, setCourseName] = useState('');
  const [courseSubject, setCourseSubject] = useState('');
  const [courseDesc, setCourseDesc] = useState('');

  // Assign form
  const [assignCourseId, setAssignCourseId] = useState('');
  const [assignStudentIds, setAssignStudentIds] = useState([]);
  const [assignTeacherIds, setAssignTeacherIds] = useState([]);

  // Payment form
  const [payTeacher, setPayTeacher] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payStart, setPayStart] = useState('');
  const [payEnd, setPayEnd] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Reports
  const [studentReport, setStudentReport] = useState([]);
  const [teacherReport, setTeacherReport] = useState([]);
  const [attendanceReport, setAttendanceReport] = useState([]);
  const [reportFilter, setReportFilter] = useState({});

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = () => {
    fetchStats(); fetchTeachers(); fetchStudents(); fetchClasses(); fetchCourses(); fetchPayments(); checkZoom();
  };

  const fetchStats = async () => { try { const { data } = await ax('/api/admin/stats'); setStats(data); } catch (e) { console.error(e); } };
  const fetchTeachers = async () => { try { const { data } = await ax('/api/admin/teachers'); setTeachers(data); } catch (e) { console.error(e); } };
  const fetchStudents = async () => { try { const { data } = await ax('/api/admin/students'); setStudents(data); } catch (e) { console.error(e); } };
  const fetchClasses = async () => { try { const { data } = await ax('/api/admin/classes'); setClasses(data); } catch (e) { console.error(e); } };
  const fetchCourses = async () => { try { const { data } = await ax('/api/admin/courses'); setCourses(data); } catch (e) { console.error(e); } };
  const fetchPayments = async () => { try { const { data } = await ax('/api/admin/payments'); setPayments(data); } catch (e) { console.error(e); } };
  const checkZoom = async () => { try { const { data } = await ax('/api/admin/zoom-status'); setZoomConfigured(data.connected); } catch (e) {} };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    try {
      const { data } = await ax('/api/admin/teachers', { method: 'POST', data: { name: teacherName, email: teacherEmail, hourly_rate: parseFloat(teacherRate) || 0 } });
      toast.success(`Teacher created! Temp password: ${data.temp_password}`);
      setShowTeacherDialog(false); setTeacherName(''); setTeacherEmail(''); setTeacherRate('0');
      fetchTeachers(); fetchStats();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (!studentName || !parentName || !contactNumber || !gmailId || !totalClasses) { toast.error('All fields mandatory'); return; }
    try {
      const { data } = await ax('/api/admin/students', { method: 'POST', data: { student_name: studentName, parent_name: parentName, contact_number: contactNumber, gmail_id: gmailId, total_classes: parseInt(totalClasses) } });
      toast.success(`Student enrolled! Temp password: ${data.temp_password}`);
      setShowStudentDialog(false); setStudentName(''); setParentName(''); setContactNumber(''); setGmailId(''); setTotalClasses('');
      fetchStudents(); fetchStats();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const handleScheduleClass = async (e) => {
    e.preventDefault();
    try {
      const payload = { student_id: selectedStudent, teacher_id: selectedTeacher, date_time: dateTime, duration: parseInt(classDuration), platform: classPlatform, course_id: classCourse || undefined };
      if (classPlatform === 'google_meet') payload.meet_link = meetLink;
      const { data } = await ax('/api/admin/classes', { method: 'POST', data: payload });
      if (data.zoom_link) toast.success(`Class scheduled! Zoom link created automatically`);
      else toast.success('Class scheduled successfully');
      setShowClassDialog(false); setSelectedStudent(''); setSelectedTeacher(''); setMeetLink(''); setDateTime(''); setClassDuration('60'); setClassPlatform('google_meet'); setClassCourse('');
      fetchClasses(); fetchStats();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to schedule class'); }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      await ax('/api/admin/courses', { method: 'POST', data: { name: courseName, subject: courseSubject, description: courseDesc } });
      toast.success('Course created'); setShowCourseDialog(false); setCourseName(''); setCourseSubject(''); setCourseDesc('');
      fetchCourses();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const handleAssignCourse = async (e) => {
    e.preventDefault();
    try {
      await ax(`/api/admin/courses/${assignCourseId}/assign`, { method: 'PATCH', data: { student_ids: assignStudentIds, teacher_ids: assignTeacherIds } });
      toast.success('Assigned successfully'); setShowAssignDialog(false); setAssignCourseId(''); setAssignStudentIds([]); setAssignTeacherIds([]);
      fetchCourses();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      await ax('/api/admin/payments', { method: 'POST', data: { teacher_id: payTeacher, amount: parseFloat(payAmount), period_start: payStart, period_end: payEnd, notes: payNotes } });
      toast.success('Payment recorded'); setShowPaymentDialog(false); setPayTeacher(''); setPayAmount(''); setPayStart(''); setPayEnd(''); setPayNotes('');
      fetchPayments();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const fetchReports = async () => {
    try {
      const [sr, tr, ar] = await Promise.all([
        ax('/api/admin/reports/student-summary', { method: 'POST', data: reportFilter }),
        ax('/api/admin/reports/teacher-summary', { method: 'POST', data: reportFilter }),
        ax('/api/admin/reports/attendance', { method: 'POST', data: reportFilter }),
      ]);
      setStudentReport(sr.data); setTeacherReport(tr.data); setAttendanceReport(ar.data);
    } catch (e) { toast.error('Failed to fetch reports'); }
  };

  useEffect(() => { if (activeTab === 'reports') fetchReports(); }, [activeTab]);

  const NavItem = ({ icon: Icon, label, value }) => (
    <button
      onClick={() => setActiveTab(value)}
      className={`flex items-center gap-3 px-4 py-3 w-full text-left rounded-md text-sm transition-colors duration-200 ${activeTab === value ? 'bg-[#5B21B6] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
      data-testid={`nav-${value}`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-white flex" data-testid="admin-dashboard">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 bg-white p-6 flex flex-col">
        <div className="mb-8">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900" style={{ fontFamily: 'Outfit' }}>ClassMeet Pro</h2>
          <p className="text-xs text-gray-500 mt-1">Admin Panel</p>
        </div>
        <nav className="space-y-1 flex-1">
          <NavItem icon={BarChart3} label="Overview" value="overview" />
          <NavItem icon={Users} label="Teachers" value="teachers" />
          <NavItem icon={GraduationCap} label="Students" value="students" />
          <NavItem icon={Calendar} label="Classes" value="classes" />
          <NavItem icon={BookOpen} label="Courses" value="courses" />
          <NavItem icon={Clock} label="Reports" value="reports" />
          <NavItem icon={CreditCard} label="Payments" value="payments" />
        </nav>
        <Button onClick={logout} variant="outline" className="border-gray-200 mt-4 w-full flex items-center gap-2" data-testid="admin-logout-button">
          <LogOut size={16} /> Logout
        </Button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 mb-2" style={{ fontFamily: 'Outfit' }}>Dashboard Overview</h1>
            <p className="text-sm text-gray-500 mb-8">Welcome back, {user?.name}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {[
                { label: 'Students', val: stats.total_students, color: '#5B21B6' },
                { label: 'Teachers', val: stats.total_teachers, color: '#5B21B6' },
                { label: 'Classes', val: stats.total_classes, color: '#5B21B6' },
                { label: 'Completed', val: stats.completed_classes, color: '#16A34A' },
                { label: 'Courses', val: stats.total_courses, color: '#7C3AED' },
                { label: 'Hours', val: stats.total_hours_delivered, color: '#5B21B6' },
              ].map((s) => (
                <Card key={s.label} className="p-5 border border-gray-200 rounded-md bg-white" data-testid={`stat-${s.label.toLowerCase()}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">{s.label}</p>
                  <p className="text-3xl font-bold" style={{ color: s.color }}>{s.val || 0}</p>
                </Card>
              ))}
            </div>
            {zoomConfigured && (
              <Card className="p-4 border border-green-200 rounded-md bg-green-50 mb-6 flex items-center gap-3" data-testid="zoom-status-card">
                <Video size={20} className="text-green-700" />
                <span className="text-sm text-green-700 font-medium">Zoom API Connected - Auto meeting creation enabled</span>
              </Card>
            )}
          </div>
        )}

        {/* TEACHERS TAB */}
        {activeTab === 'teachers' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900" style={{ fontFamily: 'Outfit' }}>Teachers</h1>
              <Dialog open={showTeacherDialog} onOpenChange={setShowTeacherDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-[#5B21B6] hover:bg-[#4C1D95] text-white" data-testid="create-teacher-button">+ Create Teacher</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create New Teacher</DialogTitle><DialogDescription>Add a teacher with hourly rate for payment tracking.</DialogDescription></DialogHeader>
                  <form onSubmit={handleCreateTeacher} className="space-y-4">
                    <div><Label>Name</Label><Input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} required data-testid="teacher-name-input" /></div>
                    <div><Label>Email</Label><Input type="email" value={teacherEmail} onChange={(e) => setTeacherEmail(e.target.value)} required data-testid="teacher-email-input" /></div>
                    <div><Label>Hourly Rate ($)</Label><Input type="number" step="0.01" value={teacherRate} onChange={(e) => setTeacherRate(e.target.value)} data-testid="teacher-rate-input" /></div>
                    <Button type="submit" className="w-full bg-[#5B21B6] hover:bg-[#4C1D95]" data-testid="teacher-submit-button">Create Teacher</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="border border-gray-200 rounded-md">
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Rate/hr</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
                <TableBody>
                  {teachers.map((t) => (
                    <TableRow key={t._id}><TableCell>{t.name}</TableCell><TableCell>{t.email}</TableCell><TableCell>${t.hourly_rate || 0}</TableCell><TableCell>{t.created_at ? new Date(t.created_at).toLocaleDateString() : ''}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* STUDENTS TAB */}
        {activeTab === 'students' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900" style={{ fontFamily: 'Outfit' }}>Students</h1>
              <Dialog open={showStudentDialog} onOpenChange={setShowStudentDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-[#5B21B6] hover:bg-[#4C1D95] text-white" data-testid="enroll-student-button">+ Enroll Student</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Enroll New Student</DialogTitle><DialogDescription>All fields are mandatory.</DialogDescription></DialogHeader>
                  <form onSubmit={handleCreateStudent} className="space-y-4">
                    <div><Label>Student Name *</Label><Input value={studentName} onChange={(e) => setStudentName(e.target.value)} required data-testid="student-name-input" /></div>
                    <div><Label>Parent's Name *</Label><Input value={parentName} onChange={(e) => setParentName(e.target.value)} required data-testid="parent-name-input" /></div>
                    <div><Label>Contact Number *</Label><Input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} required data-testid="contact-number-input" /></div>
                    <div><Label>Gmail ID *</Label><Input type="email" value={gmailId} onChange={(e) => setGmailId(e.target.value)} required data-testid="gmail-id-input" /></div>
                    <div><Label>Total Classes *</Label><Input type="number" value={totalClasses} onChange={(e) => setTotalClasses(e.target.value)} required data-testid="total-classes-input" /></div>
                    <Button type="submit" className="w-full bg-[#5B21B6] hover:bg-[#4C1D95]" data-testid="student-submit-button">Enroll Student</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="border border-gray-200 rounded-md">
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Parent</TableHead><TableHead>Contact</TableHead><TableHead>Email</TableHead><TableHead>Total</TableHead><TableHead>Used</TableHead><TableHead>Remaining</TableHead></TableRow></TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s._id} data-testid={`student-row-${s._id}`}>
                      <TableCell>{s.student_name}</TableCell><TableCell>{s.parent_name}</TableCell><TableCell>{s.contact_number}</TableCell><TableCell>{s.gmail_id}</TableCell>
                      <TableCell>{s.total_classes || 0}</TableCell><TableCell>{s.used_classes || 0}</TableCell><TableCell>{s.remaining_classes || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* CLASSES TAB */}
        {activeTab === 'classes' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900" style={{ fontFamily: 'Outfit' }}>Classes</h1>
              <Dialog open={showClassDialog} onOpenChange={setShowClassDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-[#5B21B6] hover:bg-[#4C1D95] text-white" data-testid="schedule-class-button">+ Schedule Class</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Schedule New Class</DialogTitle><DialogDescription>Choose platform: Google Meet (paste link) or Zoom (auto-create).</DialogDescription></DialogHeader>
                  <form onSubmit={handleScheduleClass} className="space-y-4">
                    <div>
                      <Label>Platform</Label>
                      <select value={classPlatform} onChange={(e) => setClassPlatform(e.target.value)} className="w-full border border-gray-200 rounded-md p-2" data-testid="platform-select">
                        <option value="google_meet">Google Meet (paste link)</option>
                        {zoomConfigured && <option value="zoom">Zoom (auto-create)</option>}
                      </select>
                    </div>
                    <div><Label>Student</Label>
                      <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} required className="w-full border border-gray-200 rounded-md p-2" data-testid="student-select">
                        <option value="">Choose student...</option>
                        {students.map((s) => <option key={s._id} value={s._id}>{s.student_name}</option>)}
                      </select>
                    </div>
                    <div><Label>Teacher</Label>
                      <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} required className="w-full border border-gray-200 rounded-md p-2" data-testid="teacher-select">
                        <option value="">Choose teacher...</option>
                        {teachers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                      </select>
                    </div>
                    {classPlatform === 'google_meet' && (
                      <div><Label>Google Meet Link</Label><Input type="url" value={meetLink} onChange={(e) => setMeetLink(e.target.value)} required data-testid="meet-link-input" /></div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Date & Time</Label><Input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} required data-testid="date-time-input" /></div>
                      <div><Label>Duration (min)</Label><Input type="number" value={classDuration} onChange={(e) => setClassDuration(e.target.value)} data-testid="duration-input" /></div>
                    </div>
                    <div><Label>Course (optional)</Label>
                      <select value={classCourse} onChange={(e) => setClassCourse(e.target.value)} className="w-full border border-gray-200 rounded-md p-2" data-testid="course-select">
                        <option value="">No course</option>
                        {courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>
                    <Button type="submit" className="w-full bg-[#5B21B6] hover:bg-[#4C1D95]" data-testid="class-submit-button">Schedule Class</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="border border-gray-200 rounded-md">
              <Table>
                <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Teacher</TableHead><TableHead>Date & Time</TableHead><TableHead>Platform</TableHead><TableHead>Link</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {classes.map((cls) => (
                    <TableRow key={cls._id} data-testid={`class-row-${cls._id}`}>
                      <TableCell>{cls.student_name}</TableCell>
                      <TableCell>{cls.teacher_name}</TableCell>
                      <TableCell>{new Date(cls.date_time).toLocaleString()}</TableCell>
                      <TableCell><span className={`px-2 py-1 rounded-sm text-xs ${cls.platform === 'zoom' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{cls.platform === 'zoom' ? 'Zoom' : 'Meet'}</span></TableCell>
                      <TableCell>
                        <a href={cls.zoom_link || cls.meet_link} target="_blank" rel="noopener noreferrer" className="text-[#5B21B6] hover:underline text-sm">Join</a>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-sm text-xs ${cls.status === 'completed' ? 'bg-green-100 text-green-700' : cls.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-purple-100 text-purple-700'}`}>{cls.status}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* COURSES TAB */}
        {activeTab === 'courses' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900" style={{ fontFamily: 'Outfit' }}>Courses</h1>
              <div className="flex gap-3">
                <Dialog open={showCourseDialog} onOpenChange={setShowCourseDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#5B21B6] hover:bg-[#4C1D95] text-white" data-testid="create-course-button">+ Create Course</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create Course</DialogTitle><DialogDescription>Define a new course.</DialogDescription></DialogHeader>
                    <form onSubmit={handleCreateCourse} className="space-y-4">
                      <div><Label>Course Name</Label><Input value={courseName} onChange={(e) => setCourseName(e.target.value)} required data-testid="course-name-input" /></div>
                      <div><Label>Subject</Label><Input value={courseSubject} onChange={(e) => setCourseSubject(e.target.value)} required data-testid="course-subject-input" /></div>
                      <div><Label>Description</Label><Input value={courseDesc} onChange={(e) => setCourseDesc(e.target.value)} data-testid="course-desc-input" /></div>
                      <Button type="submit" className="w-full bg-[#5B21B6] hover:bg-[#4C1D95]" data-testid="course-submit-button">Create</Button>
                    </form>
                  </DialogContent>
                </Dialog>
                <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-gray-200" data-testid="assign-course-button">Assign Members</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Assign to Course</DialogTitle><DialogDescription>Select course and assign members.</DialogDescription></DialogHeader>
                    <form onSubmit={handleAssignCourse} className="space-y-4">
                      <div><Label>Course</Label>
                        <select value={assignCourseId} onChange={(e) => setAssignCourseId(e.target.value)} required className="w-full border border-gray-200 rounded-md p-2" data-testid="assign-course-select">
                          <option value="">Select...</option>
                          {courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div><Label>Students (hold Ctrl for multi-select)</Label>
                        <select multiple value={assignStudentIds} onChange={(e) => setAssignStudentIds([...e.target.selectedOptions].map(o => o.value))} className="w-full border border-gray-200 rounded-md p-2 h-24" data-testid="assign-students-select">
                          {students.map((s) => <option key={s._id} value={s._id}>{s.student_name}</option>)}
                        </select>
                      </div>
                      <div><Label>Teachers (hold Ctrl for multi-select)</Label>
                        <select multiple value={assignTeacherIds} onChange={(e) => setAssignTeacherIds([...e.target.selectedOptions].map(o => o.value))} className="w-full border border-gray-200 rounded-md p-2 h-24" data-testid="assign-teachers-select">
                          {teachers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                        </select>
                      </div>
                      <Button type="submit" className="w-full bg-[#5B21B6] hover:bg-[#4C1D95]" data-testid="assign-submit-button">Assign</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((c) => (
                <Card key={c._id} className="p-6 border border-gray-200 rounded-md bg-white" data-testid={`course-card-${c._id}`}>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">{c.name}</h3>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-3">{c.subject}</p>
                  {c.description && <p className="text-sm text-gray-600 mb-4">{c.description}</p>}
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-500">{c.student_names?.length || 0} Students</span>
                    <span className="text-gray-500">{c.teacher_names?.length || 0} Teachers</span>
                    <span className="text-gray-500">{c.class_count || 0} Classes</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mb-6" style={{ fontFamily: 'Outfit' }}>Reports & Analytics</h1>

            {/* Filter bar */}
            <Card className="p-4 border border-gray-200 rounded-md bg-white mb-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <Label className="text-xs">Student</Label>
                  <select value={reportFilter.student_id || ''} onChange={(e) => setReportFilter(p => ({ ...p, student_id: e.target.value || undefined }))} className="border border-gray-200 rounded-md p-2 text-sm" data-testid="report-student-filter">
                    <option value="">All</option>
                    {students.map(s => <option key={s.user_id} value={s.user_id}>{s.student_name}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Teacher</Label>
                  <select value={reportFilter.teacher_id || ''} onChange={(e) => setReportFilter(p => ({ ...p, teacher_id: e.target.value || undefined }))} className="border border-gray-200 rounded-md p-2 text-sm" data-testid="report-teacher-filter">
                    <option value="">All</option>
                    {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">From</Label>
                  <Input type="date" value={reportFilter.date_from || ''} onChange={(e) => setReportFilter(p => ({ ...p, date_from: e.target.value || undefined }))} className="text-sm" data-testid="report-date-from" />
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Input type="date" value={reportFilter.date_to || ''} onChange={(e) => setReportFilter(p => ({ ...p, date_to: e.target.value || undefined }))} className="text-sm" data-testid="report-date-to" />
                </div>
                <Button onClick={fetchReports} className="bg-[#5B21B6] hover:bg-[#4C1D95] text-white" data-testid="apply-filters-button">Apply Filters</Button>
              </div>
            </Card>

            <Tabs defaultValue="student-report" className="space-y-4">
              <TabsList><TabsTrigger value="student-report">Student Report</TabsTrigger><TabsTrigger value="teacher-report">Teacher Report</TabsTrigger><TabsTrigger value="attendance-log">Attendance Log</TabsTrigger></TabsList>

              <TabsContent value="student-report">
                <div className="border border-gray-200 rounded-md">
                  <Table>
                    <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Assigned</TableHead><TableHead>Attended</TableHead><TableHead>Hrs Scheduled</TableHead><TableHead>Hrs Attended</TableHead><TableHead>Attendance %</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {studentReport.map((r) => (
                        <TableRow key={r.student_id}>
                          <TableCell>{r.student_name}</TableCell><TableCell>{r.total_classes_assigned}</TableCell><TableCell>{r.classes_attended}</TableCell>
                          <TableCell>{r.total_hours_scheduled}h</TableCell><TableCell>{r.total_hours_attended}h</TableCell>
                          <TableCell><span className={`font-medium ${r.attendance_percentage >= 75 ? 'text-green-600' : r.attendance_percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{r.attendance_percentage}%</span></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="teacher-report">
                <div className="border border-gray-200 rounded-md">
                  <Table>
                    <TableHeader><TableRow><TableHead>Teacher</TableHead><TableHead>Email</TableHead><TableHead>Assigned</TableHead><TableHead>Conducted</TableHead><TableHead>Hours Taught</TableHead><TableHead>Rate/hr</TableHead><TableHead>Payment Due</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {teacherReport.map((r) => (
                        <TableRow key={r.teacher_id}>
                          <TableCell>{r.teacher_name}</TableCell><TableCell>{r.email}</TableCell><TableCell>{r.total_classes_assigned}</TableCell>
                          <TableCell>{r.classes_conducted}</TableCell><TableCell>{r.total_hours_taught}h</TableCell>
                          <TableCell>${r.hourly_rate}</TableCell><TableCell className="font-medium text-[#5B21B6]">${r.calculated_payment}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="attendance-log">
                <div className="border border-gray-200 rounded-md">
                  <Table>
                    <TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Student</TableHead><TableHead>Teacher</TableHead><TableHead>Class Date</TableHead><TableHead>Join Time</TableHead><TableHead>Leave Time</TableHead><TableHead>Duration</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {attendanceReport.map((r) => (
                        <TableRow key={r._id}>
                          <TableCell><span className={`px-2 py-1 rounded-sm text-xs ${r.role === 'teacher' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{r.role}</span></TableCell>
                          <TableCell>{r.student_name}</TableCell><TableCell>{r.teacher_name}</TableCell>
                          <TableCell>{r.class_date_time ? new Date(r.class_date_time).toLocaleString() : ''}</TableCell>
                          <TableCell>{r.join_time ? new Date(r.join_time).toLocaleTimeString() : '-'}</TableCell>
                          <TableCell>{r.leave_time ? new Date(r.leave_time).toLocaleTimeString() : 'Active'}</TableCell>
                          <TableCell>{r.total_duration ? `${r.total_duration} min` : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900" style={{ fontFamily: 'Outfit' }}>Payments</h1>
              <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-[#5B21B6] hover:bg-[#4C1D95] text-white" data-testid="record-payment-button">+ Record Payment</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Record Payment</DialogTitle><DialogDescription>Log a payment to a teacher.</DialogDescription></DialogHeader>
                  <form onSubmit={handleRecordPayment} className="space-y-4">
                    <div><Label>Teacher</Label>
                      <select value={payTeacher} onChange={(e) => setPayTeacher(e.target.value)} required className="w-full border border-gray-200 rounded-md p-2" data-testid="pay-teacher-select">
                        <option value="">Select teacher...</option>
                        {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div><Label>Amount ($)</Label><Input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required data-testid="pay-amount-input" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Period Start</Label><Input type="date" value={payStart} onChange={(e) => setPayStart(e.target.value)} required data-testid="pay-start-input" /></div>
                      <div><Label>Period End</Label><Input type="date" value={payEnd} onChange={(e) => setPayEnd(e.target.value)} required data-testid="pay-end-input" /></div>
                    </div>
                    <div><Label>Notes</Label><Input value={payNotes} onChange={(e) => setPayNotes(e.target.value)} data-testid="pay-notes-input" /></div>
                    <Button type="submit" className="w-full bg-[#5B21B6] hover:bg-[#4C1D95]" data-testid="pay-submit-button">Record Payment</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="border border-gray-200 rounded-md">
              <Table>
                <TableHeader><TableRow><TableHead>Teacher</TableHead><TableHead>Amount</TableHead><TableHead>Period</TableHead><TableHead>Notes</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell>{p.teacher_name}</TableCell><TableCell className="font-medium">${p.amount}</TableCell>
                      <TableCell>{p.period_start} - {p.period_end}</TableCell><TableCell>{p.notes}</TableCell>
                      <TableCell><span className="px-2 py-1 rounded-sm text-xs bg-green-100 text-green-700">{p.status}</span></TableCell>
                      <TableCell>{p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
