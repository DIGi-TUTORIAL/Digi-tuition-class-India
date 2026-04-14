import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/teacher/classes`, {
        withCredentials: true,
      });
      setClasses(data);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const upcomingClasses = classes.filter((c) => c.status === 'scheduled');
  const completedClasses = classes.filter((c) => c.status === 'completed');

  return (
    <div className="min-h-screen bg-white" data-testid="teacher-dashboard">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
              Teacher Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">Welcome, {user?.name}</p>
          </div>
          <Button
            onClick={logout}
            variant="outline"
            className="border-gray-200"
            data-testid="teacher-logout-button"
          >
            Logout
          </Button>
        </div>
      </header>

      <div className="p-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 border border-gray-200 rounded-md bg-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">
              Total Classes
            </p>
            <p className="text-4xl font-bold text-[#5B21B6]">{classes.length}</p>
          </Card>
          <Card className="p-6 border border-gray-200 rounded-md bg-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">
              Upcoming
            </p>
            <p className="text-4xl font-bold text-[#7C3AED]">{upcomingClasses.length}</p>
          </Card>
          <Card className="p-6 border border-gray-200 rounded-md bg-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">
              Completed
            </p>
            <p className="text-4xl font-bold text-[#16A34A]">{completedClasses.length}</p>
          </Card>
        </div>

        {/* Upcoming Classes */}
        <div className="mb-8">
          <h2 className="text-xl font-medium text-gray-900 mb-4">Upcoming Classes</h2>
          <div className="border border-gray-200 rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Meet Link</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingClasses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      No upcoming classes
                    </TableCell>
                  </TableRow>
                ) : (
                  upcomingClasses.map((cls) => (
                    <TableRow key={cls._id} data-testid={`teacher-class-${cls._id}`}>
                      <TableCell>{cls.student_name}</TableCell>
                      <TableCell>{new Date(cls.date_time).toLocaleString()}</TableCell>
                      <TableCell>
                        <a
                          href={cls.meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#5B21B6] hover:underline"
                          data-testid={`teacher-join-link-${cls._id}`}
                        >
                          Join Class
                        </a>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-sm text-xs bg-purple-100 text-purple-700">
                          {cls.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Completed Classes */}
        <div>
          <h2 className="text-xl font-medium text-gray-900 mb-4">Completed Classes</h2>
          <div className="border border-gray-200 rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedClasses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">
                      No completed classes yet
                    </TableCell>
                  </TableRow>
                ) : (
                  completedClasses.map((cls) => (
                    <TableRow key={cls._id}>
                      <TableCell>{cls.student_name}</TableCell>
                      <TableCell>{new Date(cls.date_time).toLocaleString()}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-sm text-xs bg-green-100 text-green-700">
                          {cls.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;