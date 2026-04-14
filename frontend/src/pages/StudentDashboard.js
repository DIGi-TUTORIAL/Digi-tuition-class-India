import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    fetchDashboard();
    fetchClasses();
  }, []);

  const fetchDashboard = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/student/dashboard`, {
        withCredentials: true,
      });
      setDashboard(data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/student/classes`, {
        withCredentials: true,
      });
      setClasses(data);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const handleJoinClass = async (classId) => {
    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/student/classes/${classId}/join`,
        {},
        { withCredentials: true }
      );
      toast.success('Class joined successfully!');
      window.open(data.meet_link, '_blank');
      fetchDashboard();
      fetchClasses();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to join class');
    }
  };

  const scheduledClasses = classes.filter((c) => c.status === 'scheduled');
  const completedClasses = classes.filter((c) => c.status === 'completed');

  return (
    <div className="min-h-screen bg-white" data-testid="student-dashboard">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
              Student Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">Welcome, {dashboard?.student_name}</p>
          </div>
          <Button
            onClick={logout}
            variant="outline"
            className="border-gray-200"
            data-testid="student-logout-button"
          >
            Logout
          </Button>
        </div>
      </header>

      <div className="p-8">
        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-8 lg:grid-cols-12 gap-8 mb-8">
          {/* Enrollment Details - Larger card */}
          <Card className="md:col-span-8 lg:col-span-8 p-8 border border-gray-200 rounded-md bg-white" data-testid="enrollment-details">
            <h2 className="text-xl font-medium text-gray-900 mb-6">Enrollment Details</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-1">
                  Student Name
                </p>
                <p className="text-base text-gray-900">{dashboard?.student_name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-1">
                  Parent Name
                </p>
                <p className="text-base text-gray-900">{dashboard?.parent_name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-1">
                  Contact Number
                </p>
                <p className="text-base text-gray-900">{dashboard?.contact_number}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-1">
                  Email
                </p>
                <p className="text-base text-gray-900">{dashboard?.gmail_id}</p>
              </div>
            </div>
          </Card>

          {/* Class Stats - Smaller cards */}
          <Card className="md:col-span-8 lg:col-span-4 p-6 border border-gray-200 rounded-md bg-[#FDFCFE]">
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">
                  Total Classes
                </p>
                <p className="text-5xl font-bold text-[#5B21B6]" data-testid="total-classes">
                  {dashboard?.total_classes || 0}
                </p>
              </div>
              <div className="border-b border-gray-200 pb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">
                  Used Classes
                </p>
                <p className="text-3xl font-semibold text-gray-700" data-testid="used-classes">
                  {dashboard?.used_classes || 0}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">
                  Remaining Classes
                </p>
                <p className="text-3xl font-semibold text-[#16A34A]" data-testid="remaining-classes">
                  {dashboard?.remaining_classes || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Scheduled Classes */}
        <div className="mb-8">
          <h2 className="text-xl font-medium text-gray-900 mb-4">Upcoming Classes</h2>
          {scheduledClasses.length === 0 ? (
            <Card className="p-8 border border-gray-200 rounded-md bg-white text-center">
              <p className="text-gray-500">No upcoming classes scheduled</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scheduledClasses.map((cls) => (
                <Card
                  key={cls._id}
                  className="p-6 border border-gray-200 rounded-md bg-white transition-colors duration-200 hover:border-[#5B21B6]"
                  data-testid={`class-card-${cls._id}`}
                >
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-1">
                      Teacher
                    </p>
                    <p className="text-base text-gray-900">{cls.teacher_name}</p>
                  </div>
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-1">
                      Date & Time
                    </p>
                    <p className="text-base text-gray-900">
                      {new Date(cls.date_time).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleJoinClass(cls._id)}
                    disabled={!dashboard || dashboard.remaining_classes <= 0}
                    className="w-full bg-[#5B21B6] hover:bg-[#4C1D95] text-white disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
                    data-testid={`join-class-button-${cls._id}`}
                  >
                    {dashboard && dashboard.remaining_classes <= 0
                      ? 'No Classes Remaining'
                      : 'Join Now'}
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Completed Classes */}
        <div>
          <h2 className="text-xl font-medium text-gray-900 mb-4">Completed Classes</h2>
          {completedClasses.length === 0 ? (
            <Card className="p-8 border border-gray-200 rounded-md bg-white text-center">
              <p className="text-gray-500">No completed classes yet</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {completedClasses.map((cls) => (
                <Card
                  key={cls._id}
                  className="p-4 border border-gray-200 rounded-md bg-white flex justify-between items-center"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{cls.teacher_name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(cls.date_time).toLocaleString()}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-sm text-xs bg-green-100 text-green-700">
                    Completed
                  </span>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;