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
import { LogOut, Clock, Video, PhoneOff } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const [classes, setClasses] = useState([]);
  const [stats, setStats] = useState({});
  const [attendance, setAttendance] = useState([]);

  useEffect(() => { fetchClasses(); fetchStats(); fetchAttendance(); }, []);

  const fetchClasses = async () => {
    try { const { data } = await axios.get(`${BACKEND_URL}/api/teacher/classes`, { withCredentials: true }); setClasses(data); } catch (e) { console.error(e); }
  };
  const fetchStats = async () => {
    try { const { data } = await axios.get(`${BACKEND_URL}/api/teacher/stats`, { withCredentials: true }); setStats(data); } catch (e) { console.error(e); }
  };
  const fetchAttendance = async () => {
    try { const { data } = await axios.get(`${BACKEND_URL}/api/teacher/attendance`, { withCredentials: true }); setAttendance(data); } catch (e) { console.error(e); }
  };

  const handleJoinClass = async (classId) => {
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/teacher/classes/${classId}/join`, {}, { withCredentials: true });
      toast.success('Joined class! Opening meeting link...');
      const link = data.zoom_link || data.meet_link;
      if (link) window.open(link, '_blank');
      fetchClasses(); fetchStats(); fetchAttendance();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to join'); }
  };

  const handleLeaveClass = async (classId) => {
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/teacher/classes/${classId}/leave`, {}, { withCredentials: true });
      toast.success(`Left class. Duration: ${data.duration_minutes} minutes`);
      fetchClasses(); fetchStats(); fetchAttendance();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to leave'); }
  };

  const upcomingClasses = classes.filter((c) => c.status === 'scheduled' || c.status === 'in_progress');
  const completedClasses = classes.filter((c) => c.status === 'completed');

  return (
    <div className="min-h-screen bg-white" data-testid="teacher-dashboard">
      <header className="border-b border-gray-200 bg-white">
        <div className="px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900" style={{ fontFamily: 'Outfit' }}>Teacher Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Welcome, {user?.name}</p>
          </div>
          <Button onClick={logout} variant="outline" className="border-gray-200 flex items-center gap-2" data-testid="teacher-logout-button"><LogOut size={16} /> Logout</Button>
        </div>
      </header>

      <div className="p-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 border border-gray-200 rounded-md bg-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">Total Classes</p>
            <p className="text-4xl font-bold text-[#5B21B6]">{stats.total_classes || 0}</p>
          </Card>
          <Card className="p-6 border border-gray-200 rounded-md bg-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">Upcoming</p>
            <p className="text-4xl font-bold text-[#7C3AED]">{upcomingClasses.length}</p>
          </Card>
          <Card className="p-6 border border-gray-200 rounded-md bg-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">Completed</p>
            <p className="text-4xl font-bold text-[#16A34A]">{stats.completed_classes || 0}</p>
          </Card>
          <Card className="p-6 border border-gray-200 rounded-md bg-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">Hours Taught</p>
            <p className="text-4xl font-bold text-[#5B21B6]" data-testid="teacher-hours-taught">{stats.total_hours_taught || 0}h</p>
          </Card>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming Classes</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="attendance">Attendance Log</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            <div className="border border-gray-200 rounded-md">
              <Table>
                <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Date & Time</TableHead><TableHead>Platform</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {upcomingClasses.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-gray-500">No upcoming classes</TableCell></TableRow>
                  ) : (
                    upcomingClasses.map((cls) => (
                      <TableRow key={cls._id} data-testid={`teacher-class-${cls._id}`}>
                        <TableCell>{cls.student_name}</TableCell>
                        <TableCell>{new Date(cls.date_time).toLocaleString()}</TableCell>
                        <TableCell><span className={`px-2 py-1 rounded-sm text-xs ${cls.platform === 'zoom' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{cls.platform === 'zoom' ? 'Zoom' : 'Meet'}</span></TableCell>
                        <TableCell><span className={`px-2 py-1 rounded-sm text-xs ${cls.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-purple-100 text-purple-700'}`}>{cls.status}</span></TableCell>
                        <TableCell>
                          {cls.is_joined ? (
                            <Button onClick={() => handleLeaveClass(cls._id)} size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-1" data-testid={`teacher-leave-${cls._id}`}>
                              <PhoneOff size={14} /> Leave
                            </Button>
                          ) : (
                            <Button onClick={() => handleJoinClass(cls._id)} size="sm" className="bg-[#5B21B6] hover:bg-[#4C1D95] text-white flex items-center gap-1" data-testid={`teacher-join-${cls._id}`}>
                              <Video size={14} /> Join
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="completed">
            <div className="border border-gray-200 rounded-md">
              <Table>
                <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Date & Time</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {completedClasses.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-gray-500">No completed classes yet</TableCell></TableRow>
                  ) : (
                    completedClasses.map((cls) => (
                      <TableRow key={cls._id}><TableCell>{cls.student_name}</TableCell><TableCell>{new Date(cls.date_time).toLocaleString()}</TableCell><TableCell><span className="px-2 py-1 rounded-sm text-xs bg-green-100 text-green-700">completed</span></TableCell></TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="attendance">
            <div className="border border-gray-200 rounded-md">
              <Table>
                <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Class Date</TableHead><TableHead>Join Time</TableHead><TableHead>Leave Time</TableHead><TableHead>Duration</TableHead></TableRow></TableHeader>
                <TableBody>
                  {attendance.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-gray-500">No attendance records yet</TableCell></TableRow>
                  ) : (
                    attendance.map((a) => (
                      <TableRow key={a._id}>
                        <TableCell>{a.student_name || '-'}</TableCell>
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

export default TeacherDashboard;
