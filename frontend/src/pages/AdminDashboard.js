import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({});
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [showTeacherDialog, setShowTeacherDialog] = useState(false);
  const [showStudentDialog, setShowStudentDialog] = useState(false);
  const [showClassDialog, setShowClassDialog] = useState(false);

  // Teacher form
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');

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

  useEffect(() => {
    fetchStats();
    fetchTeachers();
    fetchStudents();
    fetchClasses();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/admin/stats`, {
        withCredentials: true,
      });
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/admin/teachers`, {
        withCredentials: true,
      });
      setTeachers(data);
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/admin/students`, {
        withCredentials: true,
      });
      setStudents(data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/admin/classes`, {
        withCredentials: true,
      });
      setClasses(data);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/admin/teachers`,
        { name: teacherName, email: teacherEmail },
        { withCredentials: true }
      );
      toast.success(`Teacher created! Temp password: ${data.temp_password}`);
      setShowTeacherDialog(false);
      setTeacherName('');
      setTeacherEmail('');
      fetchTeachers();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create teacher');
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (!studentName || !parentName || !contactNumber || !gmailId || !totalClasses) {
      toast.error('All fields are mandatory');
      return;
    }
    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/admin/students`,
        {
          student_name: studentName,
          parent_name: parentName,
          contact_number: contactNumber,
          gmail_id: gmailId,
          total_classes: parseInt(totalClasses),
        },
        { withCredentials: true }
      );
      toast.success(`Student enrolled! Temp password: ${data.temp_password}`);
      setShowStudentDialog(false);
      setStudentName('');
      setParentName('');
      setContactNumber('');
      setGmailId('');
      setTotalClasses('');
      fetchStudents();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to enroll student');
    }
  };

  const handleScheduleClass = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${BACKEND_URL}/api/admin/classes`,
        {
          student_id: selectedStudent,
          teacher_id: selectedTeacher,
          meet_link: meetLink,
          date_time: dateTime,
        },
        { withCredentials: true }
      );
      toast.success('Class scheduled successfully');
      setShowClassDialog(false);
      setSelectedStudent('');
      setSelectedTeacher('');
      setMeetLink('');
      setDateTime('');
      fetchClasses();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to schedule class');
    }
  };

  return (
    <div className="min-h-screen bg-white" data-testid="admin-dashboard">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
              Admin Control Panel
            </h1>
            <p className="text-sm text-gray-500 mt-1">Welcome, {user?.name}</p>
          </div>
          <Button
            onClick={logout}
            variant="outline"
            className="border-gray-200"
            data-testid="admin-logout-button"
          >
            Logout
          </Button>
        </div>
      </header>

      <div className="p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 border border-gray-200 rounded-md bg-white" data-testid="stat-total-students">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">
              Total Students
            </p>
            <p className="text-4xl font-bold text-[#5B21B6]">{stats.total_students || 0}</p>
          </Card>
          <Card className="p-6 border border-gray-200 rounded-md bg-white" data-testid="stat-total-teachers">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">
              Total Teachers
            </p>
            <p className="text-4xl font-bold text-[#5B21B6]">{stats.total_teachers || 0}</p>
          </Card>
          <Card className="p-6 border border-gray-200 rounded-md bg-white" data-testid="stat-total-classes">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">
              Total Classes
            </p>
            <p className="text-4xl font-bold text-[#5B21B6]">{stats.total_classes || 0}</p>
          </Card>
          <Card className="p-6 border border-gray-200 rounded-md bg-white" data-testid="stat-completed-classes">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">
              Completed
            </p>
            <p className="text-4xl font-bold text-[#16A34A]">{stats.completed_classes || 0}</p>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <Dialog open={showTeacherDialog} onOpenChange={setShowTeacherDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[#5B21B6] hover:bg-[#4C1D95] text-white" data-testid="create-teacher-button">
                + Create Teacher
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Teacher</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTeacher} className="space-y-4">
                <div>
                  <Label htmlFor="teacher-name">Name</Label>
                  <Input
                    id="teacher-name"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    required
                    data-testid="teacher-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="teacher-email">Email</Label>
                  <Input
                    id="teacher-email"
                    type="email"
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                    required
                    data-testid="teacher-email-input"
                  />
                </div>
                <Button type="submit" className="w-full bg-[#5B21B6] hover:bg-[#4C1D95]" data-testid="teacher-submit-button">
                  Create Teacher
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showStudentDialog} onOpenChange={setShowStudentDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[#5B21B6] hover:bg-[#4C1D95] text-white" data-testid="enroll-student-button">
                + Enroll Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enroll New Student</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateStudent} className="space-y-4">
                <div>
                  <Label htmlFor="student-name">Student Name *</Label>
                  <Input
                    id="student-name"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    required
                    data-testid="student-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="parent-name">Parent's Name *</Label>
                  <Input
                    id="parent-name"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    required
                    data-testid="parent-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="contact-number">Contact Number *</Label>
                  <Input
                    id="contact-number"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    required
                    data-testid="contact-number-input"
                  />
                </div>
                <div>
                  <Label htmlFor="gmail-id">Gmail ID *</Label>
                  <Input
                    id="gmail-id"
                    type="email"
                    value={gmailId}
                    onChange={(e) => setGmailId(e.target.value)}
                    required
                    data-testid="gmail-id-input"
                  />
                </div>
                <div>
                  <Label htmlFor="total-classes">Total Classes *</Label>
                  <Input
                    id="total-classes"
                    type="number"
                    value={totalClasses}
                    onChange={(e) => setTotalClasses(e.target.value)}
                    required
                    data-testid="total-classes-input"
                  />
                </div>
                <Button type="submit" className="w-full bg-[#5B21B6] hover:bg-[#4C1D95]" data-testid="student-submit-button">
                  Enroll Student
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showClassDialog} onOpenChange={setShowClassDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[#5B21B6] hover:bg-[#4C1D95] text-white" data-testid="schedule-class-button">
                + Schedule Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule New Class</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleScheduleClass} className="space-y-4">
                <div>
                  <Label htmlFor="student-select">Select Student</Label>
                  <select
                    id="student-select"
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    required
                    className="w-full border border-gray-200 rounded-md p-2"
                    data-testid="student-select"
                  >
                    <option value="">Choose student...</option>
                    {students.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.student_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="teacher-select">Select Teacher</Label>
                  <select
                    id="teacher-select"
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                    required
                    className="w-full border border-gray-200 rounded-md p-2"
                    data-testid="teacher-select"
                  >
                    <option value="">Choose teacher...</option>
                    {teachers.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="meet-link">Google Meet Link</Label>
                  <Input
                    id="meet-link"
                    type="url"
                    value={meetLink}
                    onChange={(e) => setMeetLink(e.target.value)}
                    required
                    data-testid="meet-link-input"
                  />
                </div>
                <div>
                  <Label htmlFor="date-time">Date & Time</Label>
                  <Input
                    id="date-time"
                    type="datetime-local"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    required
                    data-testid="date-time-input"
                  />
                </div>
                <Button type="submit" className="w-full bg-[#5B21B6] hover:bg-[#4C1D95]" data-testid="class-submit-button">
                  Schedule Class
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tables */}
        <div className="space-y-8">
          {/* Students Table */}
          <div>
            <h2 className="text-xl font-medium text-gray-900 mb-4">Students</h2>
            <div className="border border-gray-200 rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Parent Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Used</TableHead>
                    <TableHead>Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student._id} data-testid={`student-row-${student._id}`}>
                      <TableCell>{student.student_name}</TableCell>
                      <TableCell>{student.parent_name}</TableCell>
                      <TableCell>{student.contact_number}</TableCell>
                      <TableCell>{student.gmail_id}</TableCell>
                      <TableCell>{student.total_classes || 0}</TableCell>
                      <TableCell>{student.used_classes || 0}</TableCell>
                      <TableCell>{student.remaining_classes || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Classes Table */}
          <div>
            <h2 className="text-xl font-medium text-gray-900 mb-4">Scheduled Classes</h2>
            <div className="border border-gray-200 rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Meet Link</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((cls) => (
                    <TableRow key={cls._id} data-testid={`class-row-${cls._id}`}>
                      <TableCell>{cls.student_name}</TableCell>
                      <TableCell>{cls.teacher_name}</TableCell>
                      <TableCell>{new Date(cls.date_time).toLocaleString()}</TableCell>
                      <TableCell>
                        <a
                          href={cls.meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#5B21B6] hover:underline"
                        >
                          Join
                        </a>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-sm text-xs ${
                            cls.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {cls.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;