import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Users, GraduationCap, Calendar, BookOpen, Clock, CreditCard, BarChart3, Video, LogOut, Bell, CalendarPlus } from 'lucide-react';

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
  const [notifications, setNotifications] = useState([]);
  const [zoomConfigured, setZoomConfigured] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Dialogs
  const [showTeacherDialog, setShowTeacherDialog] = useState(false);
  const [showStudentDialog, setShowStudentDialog] = useState(false);
  const [showClassDialog, setShowClassDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // Teacher form
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherRate, setTeacherRate] = useState('0');
  const [paymentMode, setPaymentMode] = useState('cycle');
  const [cycleSize, setCycleSize] = useState('8');
  const [cycleAmount, setCycleAmount] = useState('0');

  // Student form
  const [studentName, setStudentName] = useState('');
  const [parentName, setParentName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [gmailId, setGmailId] = useState('');
  const [totalClasses, setTotalClasses] = useState('');

  // Single class form
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [classDuration, setClassDuration] = useState('60');
  const [classPlatform, setClassPlatform] = useState('google_meet');
  const [classCourse, setClassCourse] = useState('');

  // Bulk schedule form
  const [bulkStudent, setBulkStudent] = useState('');
  const [bulkTeacher, setBulkTeacher] = useState('');
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [bulkDays, setBulkDays] = useState([]);
  const [bulkTime, setBulkTime] = useState('10:00');
  const [bulkDuration, setBulkDuration] = useState('60');
  const [bulkPlatform, setBulkPlatform] = useState('google_meet');
  const [bulkMeetLink, setBulkMeetLink] = useState('');
  const [bulkCourse, setBulkCourse] = useState('');

  // Course, Assign, Payment form states
  const [courseName, setCourseName] = useState('');
  const [courseSubject, setCourseSubject] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [assignCourseId, setAssignCourseId] = useState('');
  const [assignStudentIds, setAssignStudentIds] = useState([]);
  const [assignTeacherIds, setAssignTeacherIds] = useState([]);
  const [payTeacher, setPayTeacher] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payStart, setPayStart] = useState('');
  const [payEnd, setPayEnd] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payCycleNum, setPayCycleNum] = useState('');

  // Reports
  const [studentReport, setStudentReport] = useState([]);
  const [teacherReport, setTeacherReport] = useState([]);
  const [attendanceReport, setAttendanceReport] = useState([]);
  const [reportFilter, setReportFilter] = useState({});

  const fetchAll = useCallback(() => {
    fetchStats(); fetchTeachers(); fetchStudents(); fetchClasses(); fetchCourses(); fetchPayments(); fetchNotifications(); checkZoom();
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchStats = async () => { try { const { data } = await ax('/api/admin/stats'); setStats(data); } catch (e) {} };
  const fetchTeachers = async () => { try { const { data } = await ax('/api/admin/teachers'); setTeachers(data); } catch (e) {} };
  const fetchStudents = async () => { try { const { data } = await ax('/api/admin/students'); setStudents(data); } catch (e) {} };
  const fetchClasses = async () => { try { const { data } = await ax('/api/admin/classes'); setClasses(data); } catch (e) {} };
  const fetchCourses = async () => { try { const { data } = await ax('/api/admin/courses'); setCourses(data); } catch (e) {} };
  const fetchPayments = async () => { try { const { data } = await ax('/api/admin/payments'); setPayments(data); } catch (e) {} };
  const fetchNotifications = async () => { try { const { data } = await ax('/api/admin/notifications'); setNotifications(data); } catch (e) {} };
  const checkZoom = async () => { try { const { data } = await ax('/api/admin/zoom-status'); setZoomConfigured(data.connected); } catch (e) {} };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    try {
      const { data } = await ax('/api/admin/teachers', { method: 'POST', data: { name: teacherName, email: teacherEmail, hourly_rate: parseFloat(teacherRate) || 0, payment_mode: paymentMode, cycle_size: parseInt(cycleSize) || 8, cycle_amount: parseFloat(cycleAmount) || 0 } });
      toast.success(`Teacher created! Temp password: ${data.temp_password}`);
      setShowTeacherDialog(false); setTeacherName(''); setTeacherEmail(''); setTeacherRate('0'); setPaymentMode('cycle'); setCycleSize('8'); setCycleAmount('0');
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
      await ax('/api/admin/classes', { method: 'POST', data: payload });
      toast.success('Class scheduled'); setShowClassDialog(false); setSelectedStudent(''); setSelectedTeacher(''); setMeetLink(''); setDateTime(''); setClassDuration('60'); setClassPlatform('google_meet'); setClassCourse('');
      fetchClasses(); fetchStats();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const [bulkLoading, setBulkLoading] = useState(false);

  const handleBulkSchedule = async (e) => {
    e.preventDefault();
    if (bulkDays.length === 0) { toast.error('Select at least one day'); return; }
    if (bulkPlatform === 'zoom' && !zoomConfigured) { toast.error('Zoom account not connected. Please connect before scheduling.'); return; }
    setBulkLoading(true);
    try {
      const { data } = await ax('/api/admin/classes/bulk', { method: 'POST', data: { student_id: bulkStudent, teacher_id: bulkTeacher, start_date: bulkStartDate, end_date: bulkEndDate, days_of_week: bulkDays.map(Number), time_slot: bulkTime, duration: parseInt(bulkDuration), platform: bulkPlatform, meet_link: bulkPlatform === 'google_meet' ? (bulkMeetLink || undefined) : undefined, course_id: bulkCourse || undefined } });
      let msg = `${data.count} classes scheduled!`;
      if (data.platform === 'zoom') {
        msg += ` Zoom meetings created: ${data.zoom_meetings_created}`;
        if (data.zoom_meetings_failed > 0) msg += ` (${data.zoom_meetings_failed} failed)`;
      }
      toast.success(msg);
      setShowBulkDialog(false); setBulkStudent(''); setBulkTeacher(''); setBulkStartDate(''); setBulkEndDate(''); setBulkDays([]); setBulkTime('10:00'); setBulkDuration('60'); setBulkPlatform('google_meet'); setBulkMeetLink(''); setBulkCourse('');
      fetchClasses(); fetchStats();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    setBulkLoading(false);
  };

  const handleCreateCourse = async (e) => { e.preventDefault(); try { await ax('/api/admin/courses', { method: 'POST', data: { name: courseName, subject: courseSubject, description: courseDesc } }); toast.success('Course created'); setShowCourseDialog(false); setCourseName(''); setCourseSubject(''); setCourseDesc(''); fetchCourses(); } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); } };
  const handleAssignCourse = async (e) => { e.preventDefault(); try { await ax(`/api/admin/courses/${assignCourseId}/assign`, { method: 'PATCH', data: { student_ids: assignStudentIds, teacher_ids: assignTeacherIds } }); toast.success('Assigned'); setShowAssignDialog(false); fetchCourses(); } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); } };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      await ax('/api/admin/payments', { method: 'POST', data: { teacher_id: payTeacher, amount: parseFloat(payAmount), period_start: payStart, period_end: payEnd, notes: payNotes, cycle_number: payCycleNum ? parseInt(payCycleNum) : null } });
      toast.success('Payment recorded'); setShowPaymentDialog(false); setPayTeacher(''); setPayAmount(''); setPayStart(''); setPayEnd(''); setPayNotes(''); setPayCycleNum('');
      fetchPayments();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const markAllRead = async () => { try { await ax('/api/admin/notifications/read-all', { method: 'POST' }); fetchNotifications(); fetchStats(); } catch (e) {} };

  const fetchReports = async () => { try { const [sr, tr, ar] = await Promise.all([ax('/api/admin/reports/student-summary', { method: 'POST', data: reportFilter }), ax('/api/admin/reports/teacher-summary', { method: 'POST', data: reportFilter }), ax('/api/admin/reports/attendance', { method: 'POST', data: reportFilter })]); setStudentReport(sr.data); setTeacherReport(tr.data); setAttendanceReport(ar.data); } catch (e) {} };
  useEffect(() => { if (activeTab === 'reports') fetchReports(); }, [activeTab]);

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const toggleDay = (d) => setBulkDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  const unreadCount = stats.unread_notifications || 0;

  const NavItem = ({ icon: Icon, label, value }) => (
    <button onClick={() => setActiveTab(value)} className={`flex items-center gap-3 px-4 py-3 w-full text-left rounded-md text-sm transition-colors duration-200 ${activeTab === value ? 'bg-[#5B21B6] text-white' : 'text-gray-600 hover:bg-gray-100'}`} data-testid={`nav-${value}`}>
      <Icon size={18} /><span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-white flex" data-testid="admin-dashboard">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 bg-white p-6 flex flex-col min-h-screen">
        <div className="mb-8 flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-full object-cover" />
          <div>
            <h2 className="text-base font-semibold tracking-tight text-gray-900" style={{ fontFamily: 'Outfit' }}>DIGI TUTORIAL</h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Admin Panel</p>
          </div>
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
        <Button onClick={logout} variant="outline" className="border-gray-200 mt-4 w-full flex items-center gap-2" data-testid="admin-logout-button"><LogOut size={16} /> Logout</Button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Top bar with notifications */}
        <header className="border-b border-gray-200 bg-white px-8 py-4 flex justify-between items-center">
          <p className="text-sm text-gray-500">Welcome back, {user?.name}</p>
          <div className="relative">
            <button onClick={() => setShowNotifPanel(!showNotifPanel)} className="relative p-2 rounded-md hover:bg-gray-100" data-testid="notif-bell">
              <Bell size={20} className="text-gray-600" />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{unreadCount}</span>}
            </button>
            {showNotifPanel && (
              <div className="absolute right-0 top-12 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-80 overflow-auto" data-testid="notif-panel">
                <div className="p-3 border-b border-gray-200 flex justify-between items-center">
                  <span className="text-sm font-medium">Notifications</span>
                  {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-[#5B21B6] hover:underline">Mark all read</button>}
                </div>
                {notifications.length === 0 ? <p className="p-4 text-sm text-gray-500 text-center">No notifications</p> : notifications.map(n => (
                  <div key={n._id} className={`p-3 border-b border-gray-100 text-sm ${n.read ? 'text-gray-500' : 'text-gray-900 bg-purple-50'}`}>
                    <p>{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 p-8 overflow-auto">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 mb-6" style={{ fontFamily: 'Outfit' }}>Dashboard Overview</h1>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                {[{ l: 'Students', v: stats.total_students, c: '#5B21B6' }, { l: 'Teachers', v: stats.total_teachers, c: '#5B21B6' }, { l: 'Classes', v: stats.total_classes, c: '#5B21B6' }, { l: 'Completed', v: stats.completed_classes, c: '#16A34A' }, { l: 'Courses', v: stats.total_courses, c: '#7C3AED' }, { l: 'Hours', v: stats.total_hours_delivered, c: '#5B21B6' }].map(s => (
                  <Card key={s.l} className="p-5 border border-gray-200 rounded-md"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">{s.l}</p><p className="text-3xl font-bold" style={{ color: s.c }}>{s.v || 0}</p></Card>
                ))}
              </div>
              {zoomConfigured && <Card className="p-4 border border-green-200 rounded-md bg-green-50 mb-4 flex items-center gap-3"><Video size={20} className="text-green-700" /><span className="text-sm text-green-700 font-medium">Zoom API Connected</span></Card>}
            </div>
          )}

          {/* TEACHERS TAB */}
          {activeTab === 'teachers' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'Outfit' }}>Teachers</h1>
                <Dialog open={showTeacherDialog} onOpenChange={setShowTeacherDialog}>
                  <DialogTrigger asChild><Button className="bg-[#5B21B6] hover:bg-[#4C1D95] text-white" data-testid="create-teacher-button">+ Create Teacher</Button></DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Create New Teacher</DialogTitle><DialogDescription>Set payment mode and cycle configuration.</DialogDescription></DialogHeader>
                    <form onSubmit={handleCreateTeacher} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>Name</Label><Input value={teacherName} onChange={e => setTeacherName(e.target.value)} required data-testid="teacher-name-input" /></div>
                        <div><Label>Email</Label><Input type="email" value={teacherEmail} onChange={e => setTeacherEmail(e.target.value)} required data-testid="teacher-email-input" /></div>
                      </div>
                      <div>
                        <Label>Payment Mode</Label>
                        <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className="w-full border border-gray-200 rounded-md p-2" data-testid="payment-mode-select">
                          <option value="cycle">Cycle-Based (Default)</option>
                          <option value="per_class">Per Class</option>
                        </select>
                      </div>
                      {paymentMode === 'cycle' ? (
                        <div className="grid grid-cols-2 gap-4">
                          <div><Label>Cycle Size (classes)</Label>
                            <select value={cycleSize} onChange={e => setCycleSize(e.target.value)} className="w-full border border-gray-200 rounded-md p-2" data-testid="cycle-size-select">
                              {[4,8,12,16,20,24].map(n => <option key={n} value={n}>{n} Classes</option>)}
                            </select>
                          </div>
                          <div><Label>Cycle Amount (INR)</Label><Input type="number" step="0.01" value={cycleAmount} onChange={e => setCycleAmount(e.target.value)} placeholder="e.g. 4000" data-testid="cycle-amount-input" /></div>
                        </div>
                      ) : (
                        <div><Label>Hourly Rate (INR)</Label><Input type="number" step="0.01" value={teacherRate} onChange={e => setTeacherRate(e.target.value)} data-testid="teacher-rate-input" /></div>
                      )}
                      <Button type="submit" className="w-full bg-[#5B21B6] hover:bg-[#4C1D95]" data-testid="teacher-submit-button">Create Teacher</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="border border-gray-200 rounded-md">
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Payment Mode</TableHead><TableHead>Cycle</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader>
                  <TableBody>{teachers.map(t => (
                    <TableRow key={t._id}><TableCell>{t.name}</TableCell><TableCell>{t.email}</TableCell>
                      <TableCell><span className={`px-2 py-1 rounded-sm text-xs ${t.payment_mode === 'cycle' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>{t.payment_mode === 'cycle' ? 'Cycle' : 'Per Class'}</span></TableCell>
                      <TableCell>{t.payment_mode === 'cycle' ? `${t.cycle_size || 8} classes` : '-'}</TableCell>
                      <TableCell>{t.payment_mode === 'cycle' ? `INR ${t.cycle_amount || 0}` : `INR ${t.hourly_rate || 0}/hr`}</TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* STUDENTS TAB */}
          {activeTab === 'students' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'Outfit' }}>Students</h1>
                <Dialog open={showStudentDialog} onOpenChange={setShowStudentDialog}>
                  <DialogTrigger asChild><Button className="bg-[#5B21B6] hover:bg-[#4C1D95] text-white" data-testid="enroll-student-button">+ Enroll Student</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Enroll New Student</DialogTitle><DialogDescription>All fields are mandatory.</DialogDescription></DialogHeader>
                    <form onSubmit={handleCreateStudent} className="space-y-4">
                      <div><Label>Student Name *</Label><Input value={studentName} onChange={e => setStudentName(e.target.value)} required data-testid="student-name-input" /></div>
                      <div><Label>Parent's Name *</Label><Input value={parentName} onChange={e => setParentName(e.target.value)} required data-testid="parent-name-input" /></div>
                      <div><Label>Contact Number *</Label><Input value={contactNumber} onChange={e => setContactNumber(e.target.value)} required data-testid="contact-number-input" /></div>
                      <div><Label>Gmail ID *</Label><Input type="email" value={gmailId} onChange={e => setGmailId(e.target.value)} required data-testid="gmail-id-input" /></div>
                      <div><Label>Total Classes *</Label><Input type="number" value={totalClasses} onChange={e => setTotalClasses(e.target.value)} required data-testid="total-classes-input" /></div>
                      <Button type="submit" className="w-full bg-[#5B21B6] hover:bg-[#4C1D95]" data-testid="student-submit-button">Enroll Student</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="border border-gray-200 rounded-md">
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Parent</TableHead><TableHead>Contact</TableHead><TableHead>Email</TableHead><TableHead>Total</TableHead><TableHead>Used</TableHead><TableHead>Remaining</TableHead></TableRow></TableHeader>
                  <TableBody>{students.map(s => (
                    <TableRow key={s._id}><TableCell>{s.student_name}</TableCell><TableCell>{s.parent_name}</TableCell><TableCell>{s.contact_number}</TableCell><TableCell>{s.gmail_id}</TableCell><TableCell>{s.total_classes || 0}</TableCell><TableCell>{s.used_classes || 0}</TableCell><TableCell>{s.remaining_classes || 0}</TableCell></TableRow>
                  ))}</TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* CLASSES TAB */}
          {activeTab === 'classes' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'Outfit' }}>Classes</h1>
                <div className="flex gap-3">
                  <Dialog open={showClassDialog} onOpenChange={setShowClassDialog}>
                    <DialogTrigger asChild><Button className="bg-[#5B21B6] hover:bg-[#4C1D95] text-white" data-testid="schedule-class-button">+ Single Class</Button></DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader><DialogTitle>Schedule Single Class</DialogTitle><DialogDescription>Choose Google Meet or Zoom.</DialogDescription></DialogHeader>
                      <form onSubmit={handleScheduleClass} className="space-y-4">
                        <div><Label>Platform</Label><select value={classPlatform} onChange={e => setClassPlatform(e.target.value)} className="w-full border border-gray-200 rounded-md p-2" data-testid="platform-select"><option value="google_meet">Google Meet</option>{zoomConfigured && <option value="zoom">Zoom (auto)</option>}</select></div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><Label>Student</Label><select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} required className="w-full border border-gray-200 rounded-md p-2" data-testid="student-select"><option value="">Choose...</option>{students.map(s => <option key={s._id} value={s._id}>{s.student_name}</option>)}</select></div>
                          <div><Label>Teacher</Label><select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)} required className="w-full border border-gray-200 rounded-md p-2" data-testid="teacher-select"><option value="">Choose...</option>{teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}</select></div>
                        </div>
                        {classPlatform === 'google_meet' && <div><Label>Meet Link</Label><Input type="url" value={meetLink} onChange={e => setMeetLink(e.target.value)} required data-testid="meet-link-input" /></div>}
                        <div className="grid grid-cols-2 gap-4">
                          <div><Label>Date & Time</Label><Input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} required data-testid="date-time-input" /></div>
                          <div><Label>Duration (min)</Label><Input type="number" value={classDuration} onChange={e => setClassDuration(e.target.value)} /></div>
                        </div>
                        <Button type="submit" className="w-full bg-[#5B21B6] hover:bg-[#4C1D95]" data-testid="class-submit-button">Schedule</Button>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
                    <DialogTrigger asChild><Button variant="outline" className="border-[#5B21B6] text-[#5B21B6] flex items-center gap-2" data-testid="bulk-schedule-button"><CalendarPlus size={16} /> Bulk Schedule</Button></DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader><DialogTitle>Bulk Recurring Schedule</DialogTitle><DialogDescription>Auto-create classes for selected days. Max 1 year. Each Zoom class gets a unique meeting link.</DialogDescription></DialogHeader>
                      <form onSubmit={handleBulkSchedule} className="space-y-4">
                        <div>
                          <Label>Platform</Label>
                          <select value={bulkPlatform} onChange={e => setBulkPlatform(e.target.value)} className="w-full border border-gray-200 rounded-md p-2" data-testid="bulk-platform-select">
                            <option value="google_meet">Google Meet (paste link)</option>
                            <option value="zoom" disabled={!zoomConfigured}>Zoom (auto-create per class) {!zoomConfigured ? '- Not Connected' : ''}</option>
                          </select>
                          {bulkPlatform === 'zoom' && zoomConfigured && (
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><Video size={12} /> Each class will get a unique Zoom meeting link</p>
                          )}
                          {bulkPlatform === 'zoom' && !zoomConfigured && (
                            <p className="text-xs text-red-600 mt-1">Zoom account not connected. Please connect before scheduling.</p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><Label>Student</Label><select value={bulkStudent} onChange={e => setBulkStudent(e.target.value)} required className="w-full border border-gray-200 rounded-md p-2" data-testid="bulk-student-select"><option value="">Choose...</option>{students.map(s => <option key={s._id} value={s._id}>{s.student_name}</option>)}</select></div>
                          <div><Label>Teacher</Label><select value={bulkTeacher} onChange={e => setBulkTeacher(e.target.value)} required className="w-full border border-gray-200 rounded-md p-2" data-testid="bulk-teacher-select"><option value="">Choose...</option>{teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}</select></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><Label>Start Date</Label><Input type="date" value={bulkStartDate} onChange={e => setBulkStartDate(e.target.value)} required data-testid="bulk-start-date" /></div>
                          <div><Label>End Date (max 1yr)</Label><Input type="date" value={bulkEndDate} onChange={e => setBulkEndDate(e.target.value)} required data-testid="bulk-end-date" /></div>
                        </div>
                        <div>
                          <Label>Days of Week</Label>
                          <div className="flex gap-2 mt-2">{dayNames.map((d, i) => (
                            <button key={i} type="button" onClick={() => toggleDay(i)} className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${bulkDays.includes(i) ? 'bg-[#5B21B6] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} data-testid={`bulk-day-${i}`}>{d}</button>
                          ))}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><Label>Time Slot</Label><Input type="time" value={bulkTime} onChange={e => setBulkTime(e.target.value)} required data-testid="bulk-time" /></div>
                          <div><Label>Duration (min)</Label><Input type="number" value={bulkDuration} onChange={e => setBulkDuration(e.target.value)} /></div>
                        </div>
                        {bulkPlatform === 'google_meet' && (
                          <div><Label>Google Meet Link (shared for all)</Label><Input type="url" value={bulkMeetLink} onChange={e => setBulkMeetLink(e.target.value)} placeholder="Paste Google Meet link" data-testid="bulk-meet-link" /></div>
                        )}
                        <Button type="submit" disabled={bulkLoading} className="w-full bg-[#5B21B6] hover:bg-[#4C1D95]" data-testid="bulk-submit-button">
                          {bulkLoading ? (bulkPlatform === 'zoom' ? 'Creating Zoom meetings...' : 'Scheduling...') : 'Create Recurring Classes'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="border border-gray-200 rounded-md">
                <Table>
                  <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Teacher</TableHead><TableHead>Date & Time</TableHead><TableHead>Platform</TableHead><TableHead>Link</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>{classes.map(cls => (
                    <TableRow key={cls._id}><TableCell>{cls.student_name}</TableCell><TableCell>{cls.teacher_name}</TableCell><TableCell>{new Date(cls.date_time).toLocaleString()}</TableCell>
                      <TableCell><span className={`px-2 py-1 rounded-sm text-xs ${cls.platform === 'zoom' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{cls.platform === 'zoom' ? 'Zoom' : 'Meet'}</span></TableCell>
                      <TableCell><a href={cls.zoom_link || cls.meet_link} target="_blank" rel="noopener noreferrer" className="text-[#5B21B6] hover:underline text-sm">Join</a></TableCell>
                      <TableCell><span className={`px-2 py-1 rounded-sm text-xs ${cls.status === 'completed' ? 'bg-green-100 text-green-700' : cls.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-purple-100 text-purple-700'}`}>{cls.status}</span></TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* COURSES TAB */}
          {activeTab === 'courses' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'Outfit' }}>Courses</h1>
                <div className="flex gap-3">
                  <Dialog open={showCourseDialog} onOpenChange={setShowCourseDialog}><DialogTrigger asChild><Button className="bg-[#5B21B6] hover:bg-[#4C1D95] text-white" data-testid="create-course-button">+ Create Course</Button></DialogTrigger>
                    <DialogContent><DialogHeader><DialogTitle>Create Course</DialogTitle><DialogDescription>Define a new course.</DialogDescription></DialogHeader><form onSubmit={handleCreateCourse} className="space-y-4"><div><Label>Name</Label><Input value={courseName} onChange={e => setCourseName(e.target.value)} required data-testid="course-name-input" /></div><div><Label>Subject</Label><Input value={courseSubject} onChange={e => setCourseSubject(e.target.value)} required /></div><div><Label>Description</Label><Input value={courseDesc} onChange={e => setCourseDesc(e.target.value)} /></div><Button type="submit" className="w-full bg-[#5B21B6] hover:bg-[#4C1D95]">Create</Button></form></DialogContent>
                  </Dialog>
                  <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}><DialogTrigger asChild><Button variant="outline" className="border-gray-200" data-testid="assign-course-button">Assign Members</Button></DialogTrigger>
                    <DialogContent><DialogHeader><DialogTitle>Assign to Course</DialogTitle><DialogDescription>Select course and members.</DialogDescription></DialogHeader><form onSubmit={handleAssignCourse} className="space-y-4"><div><Label>Course</Label><select value={assignCourseId} onChange={e => setAssignCourseId(e.target.value)} required className="w-full border border-gray-200 rounded-md p-2"><option value="">Select...</option>{courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></div><div><Label>Students</Label><select multiple value={assignStudentIds} onChange={e => setAssignStudentIds([...e.target.selectedOptions].map(o => o.value))} className="w-full border border-gray-200 rounded-md p-2 h-24">{students.map(s => <option key={s._id} value={s._id}>{s.student_name}</option>)}</select></div><div><Label>Teachers</Label><select multiple value={assignTeacherIds} onChange={e => setAssignTeacherIds([...e.target.selectedOptions].map(o => o.value))} className="w-full border border-gray-200 rounded-md p-2 h-24">{teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}</select></div><Button type="submit" className="w-full bg-[#5B21B6] hover:bg-[#4C1D95]">Assign</Button></form></DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{courses.map(c => (
                <Card key={c._id} className="p-6 border border-gray-200 rounded-md"><h3 className="text-lg font-medium text-gray-900 mb-1">{c.name}</h3><p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-3">{c.subject}</p>{c.description && <p className="text-sm text-gray-600 mb-4">{c.description}</p>}<div className="flex gap-4 text-sm"><span className="text-gray-500">{c.student_names?.length || 0} Students</span><span className="text-gray-500">{c.teacher_names?.length || 0} Teachers</span><span className="text-gray-500">{c.class_count || 0} Classes</span></div></Card>
              ))}</div>
            </div>
          )}

          {/* REPORTS TAB */}
          {activeTab === 'reports' && (
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-6" style={{ fontFamily: 'Outfit' }}>Reports & Analytics</h1>
              <Card className="p-4 border border-gray-200 rounded-md bg-white mb-6">
                <div className="flex flex-wrap gap-4 items-end">
                  <div><Label className="text-xs">Student</Label><select value={reportFilter.student_id || ''} onChange={e => setReportFilter(p => ({ ...p, student_id: e.target.value || undefined }))} className="border border-gray-200 rounded-md p-2 text-sm"><option value="">All</option>{students.map(s => <option key={s.user_id} value={s.user_id}>{s.student_name}</option>)}</select></div>
                  <div><Label className="text-xs">Teacher</Label><select value={reportFilter.teacher_id || ''} onChange={e => setReportFilter(p => ({ ...p, teacher_id: e.target.value || undefined }))} className="border border-gray-200 rounded-md p-2 text-sm"><option value="">All</option>{teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}</select></div>
                  <div><Label className="text-xs">From</Label><Input type="date" value={reportFilter.date_from || ''} onChange={e => setReportFilter(p => ({ ...p, date_from: e.target.value || undefined }))} className="text-sm" /></div>
                  <div><Label className="text-xs">To</Label><Input type="date" value={reportFilter.date_to || ''} onChange={e => setReportFilter(p => ({ ...p, date_to: e.target.value || undefined }))} className="text-sm" /></div>
                  <Button onClick={fetchReports} className="bg-[#5B21B6] hover:bg-[#4C1D95] text-white" data-testid="apply-filters-button">Apply</Button>
                </div>
              </Card>
              <Tabs defaultValue="student-report" className="space-y-4">
                <TabsList><TabsTrigger value="student-report">Student Report</TabsTrigger><TabsTrigger value="teacher-report">Teacher Report</TabsTrigger><TabsTrigger value="attendance-log">Attendance Log</TabsTrigger></TabsList>
                <TabsContent value="student-report"><div className="border border-gray-200 rounded-md"><Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Assigned</TableHead><TableHead>Attended</TableHead><TableHead>Hrs Scheduled</TableHead><TableHead>Hrs Attended</TableHead><TableHead>%</TableHead></TableRow></TableHeader><TableBody>{studentReport.map(r => (<TableRow key={r.student_id}><TableCell>{r.student_name}</TableCell><TableCell>{r.total_classes_assigned}</TableCell><TableCell>{r.classes_attended}</TableCell><TableCell>{r.total_hours_scheduled}h</TableCell><TableCell>{r.total_hours_attended}h</TableCell><TableCell><span className={`font-medium ${r.attendance_percentage >= 75 ? 'text-green-600' : r.attendance_percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{r.attendance_percentage}%</span></TableCell></TableRow>))}</TableBody></Table></div></TabsContent>
                <TabsContent value="teacher-report"><div className="border border-gray-200 rounded-md"><Table><TableHeader><TableRow><TableHead>Teacher</TableHead><TableHead>Mode</TableHead><TableHead>Assigned</TableHead><TableHead>Conducted</TableHead><TableHead>Hours</TableHead><TableHead>Payment Due</TableHead></TableRow></TableHeader><TableBody>{teacherReport.map(r => (<TableRow key={r.teacher_id}><TableCell>{r.teacher_name}</TableCell><TableCell>{r.payment_mode || 'cycle'}</TableCell><TableCell>{r.total_classes_assigned}</TableCell><TableCell>{r.classes_conducted}</TableCell><TableCell>{r.total_hours_taught}h</TableCell><TableCell className="font-medium text-[#5B21B6]">INR {r.calculated_payment}</TableCell></TableRow>))}</TableBody></Table></div></TabsContent>
                <TabsContent value="attendance-log"><div className="border border-gray-200 rounded-md"><Table><TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Student</TableHead><TableHead>Teacher</TableHead><TableHead>Date</TableHead><TableHead>Join</TableHead><TableHead>Leave</TableHead><TableHead>Duration</TableHead></TableRow></TableHeader><TableBody>{attendanceReport.map(r => (<TableRow key={r._id}><TableCell><span className={`px-2 py-1 rounded-sm text-xs ${r.role === 'teacher' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{r.role}</span></TableCell><TableCell>{r.student_name}</TableCell><TableCell>{r.teacher_name}</TableCell><TableCell>{r.class_date_time ? new Date(r.class_date_time).toLocaleString() : ''}</TableCell><TableCell>{r.join_time ? new Date(r.join_time).toLocaleTimeString() : '-'}</TableCell><TableCell>{r.leave_time ? new Date(r.leave_time).toLocaleTimeString() : 'Active'}</TableCell><TableCell>{r.total_duration ? `${r.total_duration} min` : '-'}</TableCell></TableRow>))}</TableBody></Table></div></TabsContent>
              </Tabs>
            </div>
          )}

          {/* PAYMENTS TAB */}
          {activeTab === 'payments' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'Outfit' }}>Payments (INR)</h1>
                <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                  <DialogTrigger asChild><Button className="bg-[#5B21B6] hover:bg-[#4C1D95] text-white" data-testid="record-payment-button">+ Record Payment</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Record Payment</DialogTitle><DialogDescription>Log a cycle or per-class payment.</DialogDescription></DialogHeader>
                    <form onSubmit={handleRecordPayment} className="space-y-4">
                      <div><Label>Teacher</Label><select value={payTeacher} onChange={e => setPayTeacher(e.target.value)} required className="w-full border border-gray-200 rounded-md p-2"><option value="">Select...</option>{teachers.map(t => <option key={t._id} value={t._id}>{t.name} ({t.payment_mode === 'cycle' ? `Cycle: ${t.cycle_size} cls / INR ${t.cycle_amount}` : `INR ${t.hourly_rate}/hr`})</option>)}</select></div>
                      <div><Label>Amount (INR)</Label><Input type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} required data-testid="pay-amount-input" /></div>
                      <div><Label>Cycle Number (optional)</Label><Input type="number" value={payCycleNum} onChange={e => setPayCycleNum(e.target.value)} placeholder="e.g. 1, 2, 3..." /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>Period Start</Label><Input type="date" value={payStart} onChange={e => setPayStart(e.target.value)} required /></div>
                        <div><Label>Period End</Label><Input type="date" value={payEnd} onChange={e => setPayEnd(e.target.value)} required /></div>
                      </div>
                      <div><Label>Notes</Label><Input value={payNotes} onChange={e => setPayNotes(e.target.value)} /></div>
                      <Button type="submit" className="w-full bg-[#5B21B6] hover:bg-[#4C1D95]" data-testid="pay-submit-button">Record Payment</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="border border-gray-200 rounded-md">
                <Table>
                  <TableHeader><TableRow><TableHead>Teacher</TableHead><TableHead>Amount</TableHead><TableHead>Cycle #</TableHead><TableHead>Period</TableHead><TableHead>Notes</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>{payments.map(p => (
                    <TableRow key={p._id}><TableCell>{p.teacher_name}</TableCell><TableCell className="font-medium">INR {p.amount}</TableCell><TableCell>{p.cycle_number || '-'}</TableCell><TableCell>{p.period_start} - {p.period_end}</TableCell><TableCell>{p.notes}</TableCell><TableCell><span className="px-2 py-1 rounded-sm text-xs bg-green-100 text-green-700">{p.status}</span></TableCell></TableRow>
                  ))}</TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white py-3 px-8 text-center">
          <p className="text-xs text-gray-400">DIGI TUTORIAL CLASSES - Online Learning Platform</p>
        </footer>
      </main>
    </div>
  );
};

export default AdminDashboard;
