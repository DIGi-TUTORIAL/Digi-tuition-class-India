import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { LogOut, Video, PhoneOff, Clock, Percent } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [classes, setClasses] = useState([]);
  const [attendance, setAttendance] = useState([]);

  useEffect(() => { fetchDashboard(); fetchClasses(); fetchAttendance(); }, []);

  const fetchDashboard = async () => {
    try { const { data } = await axios.get(`${BACKEND_URL}/api/student/dashboard`, { withCredentials: true }); setDashboard(data); } catch (e) { console.error(e); }
  };
  const fetchClasses = async () => {
    try { const { data } = await axios.get(`${BACKEND_URL}/api/student/classes`, { withCredentials: true }); setClasses(data); } catch (e) { console.error(e); }
  };
  const fetchAttendance = async () => {
    try { const { data } = await axios.get(`${BACKEND_URL}/api/student/attendance`, { withCredentials: true }); setAttendance(data); } catch (e) { console.error(e); }
  };

  const handleJoinClass = async (classId) => {
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/student/classes/${classId}/join`, {}, { withCredentials: true });
      toast.success('Joined class! Opening meeting link...');
      const link = data.zoom_link || data.meet_link;
      if (link) window.open(link, '_blank');
      fetchDashboard(); fetchClasses(); fetchAttendance();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to join class'); }
  };

  const handleLeaveClass = async (classId) => {
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/student/classes/${classId}/leave`, {}, { withCredentials: true });
      toast.success(`Left class. Duration: ${data.duration_minutes} minutes`);
      fetchDashboard(); fetchClasses(); fetchAttendance();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to leave'); }
  };

  const scheduledClasses = classes.filter((c) => c.status === 'scheduled' || c.status === 'in_progress');
  const completedClasses = classes.filter((c) => c.status === 'completed');

  return (
    <div className="min-h-screen bg-white" data-testid="student-dashboard">
      <header className="border-b border-gray-200 bg-white">
        <div className="px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900" style={{ fontFamily: 'Outfit' }}>Student Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Welcome, {dashboard?.student_name}</p>
          </div>
          <Button onClick={logout} variant="outline" className="border-gray-200 flex items-center gap-2" data-testid="student-logout-button"><LogOut size={16} /> Logout</Button>
        </div>
      </header>

      <div className="p-8">
        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-8 lg:grid-cols-12 gap-8 mb-8">
          {/* Enrollment Details */}
          <Card className="md:col-span-8 lg:col-span-5 p-8 border border-gray-200 rounded-md bg-white" data-testid="enrollment-details">
            <h2 className="text-xl font-medium text-gray-900 mb-6" style={{ fontFamily: 'Outfit' }}>Enrollment Details</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-1">Student Name</p>
                <p className="text-base text-gray-900">{dashboard?.student_name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-1">Parent Name</p>
                <p className="text-base text-gray-900">{dashboard?.parent_name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-1">Contact</p>
                <p className="text-base text-gray-900">{dashboard?.contact_number}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-1">Email</p>
                <p className="text-base text-gray-900">{dashboard?.gmail_id}</p>
              </div>
            </div>
          </Card>

          {/* Class Stats */}
          <Card className="md:col-span-4 lg:col-span-3 p-6 border border-gray-200 rounded-md bg-[#FDFCFE]">
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">Total</p>
                <p className="text-5xl font-bold text-[#5B21B6]" data-testid="total-classes">{dashboard?.total_classes || 0}</p>
              </div>
              <div className="border-b border-gray-200 pb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">Used</p>
                <p className="text-3xl font-semibold text-gray-700" data-testid="used-classes">{dashboard?.used_classes || 0}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">Remaining</p>
                <p className="text-3xl font-semibold text-[#16A34A]" data-testid="remaining-classes">{dashboard?.remaining_classes || 0}</p>
              </div>
            </div>
          </Card>

          {/* Attendance Stats */}
          <Card className="md:col-span-4 lg:col-span-4 p-6 border border-gray-200 rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4" style={{ fontFamily: 'Outfit' }}>Attendance Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-[#F3E8FF] flex items-center justify-center"><Percent size={18} className="text-[#5B21B6]" /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Attendance %</p>
                  <p className="text-2xl font-bold text-[#5B21B6]" data-testid="attendance-percentage">{dashboard?.attendance_percentage || 0}%</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-[#F3E8FF] flex items-center justify-center"><Clock size={18} className="text-[#5B21B6]" /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Hours Attended</p>
                  <p className="text-2xl font-bold text-[#5B21B6]" data-testid="hours-attended">{dashboard?.total_hours_attended || 0}h</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-green-50 flex items-center justify-center"><Video size={18} className="text-green-600" /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Classes Attended</p>
                  <p className="text-2xl font-bold text-green-600">{dashboard?.classes_attended || 0}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming Classes</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="attendance">Attendance Log</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {scheduledClasses.length === 0 ? (
              <Card className="p-8 border border-gray-200 rounded-md bg-white text-center"><p className="text-gray-500">No upcoming classes scheduled</p></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scheduledClasses.map((cls) => (
                  <Card key={cls._id} className="p-6 border border-gray-200 rounded-md bg-white transition-colors duration-200 hover:border-[#5B21B6]" data-testid={`class-card-${cls._id}`}>
                    <div className="mb-3 flex items-center justify-between">
                      <span className={`px-2 py-1 rounded-sm text-xs ${cls.platform === 'zoom' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{cls.platform === 'zoom' ? 'Zoom' : 'Meet'}</span>
                      {cls.status === 'in_progress' && <span className="px-2 py-1 rounded-sm text-xs bg-yellow-100 text-yellow-700">In Progress</span>}
                    </div>
                    <div className="mb-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-1">Teacher</p>
                      <p className="text-base text-gray-900">{cls.teacher_name}</p>
                    </div>
                    <div className="mb-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-1">Date & Time</p>
                      <p className="text-base text-gray-900">{new Date(cls.date_time).toLocaleString()}</p>
                    </div>
                    {cls.is_joined ? (
                      <Button onClick={() => handleLeaveClass(cls._id)} className="w-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-2 transition-colors duration-200" data-testid={`leave-class-button-${cls._id}`}>
                        <PhoneOff size={16} /> Leave Class
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleJoinClass(cls._id)}
                        disabled={!dashboard || dashboard.remaining_classes <= 0}
                        className="w-full bg-[#5B21B6] hover:bg-[#4C1D95] text-white disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors duration-200"
                        data-testid={`join-class-button-${cls._id}`}
                      >
                        <Video size={16} />
                        {dashboard && dashboard.remaining_classes <= 0 ? 'No Classes Remaining' : 'Join Now'}
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {completedClasses.length === 0 ? (
              <Card className="p-8 border border-gray-200 rounded-md bg-white text-center"><p className="text-gray-500">No completed classes yet</p></Card>
            ) : (
              <div className="space-y-3">
                {completedClasses.map((cls) => (
                  <Card key={cls._id} className="p-4 border border-gray-200 rounded-md bg-white flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cls.teacher_name}</p>
                      <p className="text-xs text-gray-500">{new Date(cls.date_time).toLocaleString()}</p>
                    </div>
                    <span className="px-3 py-1 rounded-sm text-xs bg-green-100 text-green-700">Completed</span>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="attendance">
            <div className="border border-gray-200 rounded-md">
              <Table>
                <TableHeader><TableRow><TableHead>Teacher</TableHead><TableHead>Class Date</TableHead><TableHead>Join Time</TableHead><TableHead>Leave Time</TableHead><TableHead>Duration</TableHead></TableRow></TableHeader>
                <TableBody>
                  {attendance.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-gray-500">No attendance records yet</TableCell></TableRow>
                  ) : (
                    attendance.map((a) => (
                      <TableRow key={a._id}>
                        <TableCell>{a.teacher_name || '-'}</TableCell>
                        <TableCell>{a.class_date_time ? new Date(a.class_date_time).toLocaleString() : '-'}</TableCell>
                        <TableCell>{a.join_time ? new Date(a.join_time).toLocaleTimeString() : '-'}</TableCell>
                        <TableCell>{a.leave_time ? new Date(a.leave_time).toLocaleTimeString() : <span className="text-yellow-600">Active</span>}</TableCell>
                        <TableCell>{a.total_duration ? `${a.total_duration} min` : '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentDashboard;
