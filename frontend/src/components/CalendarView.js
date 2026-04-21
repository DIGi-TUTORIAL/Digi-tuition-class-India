import React, { useState, useMemo } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, LayoutGrid, Video, RefreshCw, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const CalendarView = ({ classes = [], role = 'admin', onRegenerateZoom, onRefresh }) => {
  const [viewMode, setViewMode] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedClass, setSelectedClass] = useState(null);
  const [draggedClass, setDraggedClass] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const goBack = () => { if (viewMode === 'month') setCurrentDate(new Date(year, month - 1, 1)); else setCurrentDate(new Date(currentDate.getTime() - 7 * 86400000)); };
  const goForward = () => { if (viewMode === 'month') setCurrentDate(new Date(year, month + 1, 1)); else setCurrentDate(new Date(currentDate.getTime() + 7 * 86400000)); };
  const goToday = () => setCurrentDate(new Date());

  const classMap = useMemo(() => {
    const map = {};
    classes.forEach(cls => {
      if (!cls.date_time) return;
      const d = new Date(cls.date_time);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push({ ...cls, _date: d });
    });
    return map;
  }, [classes]);

  const monthGrid = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeks = [];
    let week = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) { week.push(d); if (week.length === 7) { weeks.push(week); week = []; } }
    if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }
    return weeks;
  }, [year, month]);

  const weekDates = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => { const wd = new Date(startOfWeek); wd.setDate(startOfWeek.getDate() + i); return wd; });
  }, [currentDate]);

  const formatMonthYear = () => currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const formatWeekRange = () => { const s = weekDates[0]; const e = weekDates[6]; return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`; };
  const getDateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const statusColor = (s) => s === 'completed' ? 'bg-green-500' : s === 'in_progress' ? 'bg-yellow-500' : 'bg-[#5B21B6]';
  const statusBadge = (s) => s === 'completed' ? 'bg-green-100 text-green-700' : s === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-purple-100 text-purple-700';

  // ===== DRAG & DROP (Admin only) =====
  const handleDragStart = (e, cls) => {
    if (role !== 'admin') return;
    setDraggedClass(cls);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', cls._id);
  };

  const handleDragOver = (e) => { if (role === 'admin' && draggedClass) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } };

  const handleDropOnDay = async (e, targetDate) => {
    e.preventDefault();
    if (role !== 'admin' || !draggedClass) return;
    const origDate = draggedClass._date;
    const newDateTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), origDate.getHours(), origDate.getMinutes());
    const newDateStr = newDateTime.toISOString().slice(0, 16);
    try {
      await axios.patch(`${BACKEND_URL}/api/admin/classes/${draggedClass._id}/reschedule`, { date_time: newDateStr }, { withCredentials: true });
      toast.success(`Rescheduled to ${newDateTime.toLocaleDateString()}`);
      if (onRefresh) onRefresh();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to reschedule'); }
    setDraggedClass(null);
  };

  const handleDropOnHour = async (e, targetDate, hour) => {
    e.preventDefault();
    if (role !== 'admin' || !draggedClass) return;
    const newDateTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), hour, 0);
    const newDateStr = newDateTime.toISOString().slice(0, 16);
    try {
      await axios.patch(`${BACKEND_URL}/api/admin/classes/${draggedClass._id}/reschedule`, { date_time: newDateStr }, { withCredentials: true });
      toast.success(`Rescheduled to ${newDateTime.toLocaleString()}`);
      if (onRefresh) onRefresh();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to reschedule'); }
    setDraggedClass(null);
  };

  const handleDragEnd = () => setDraggedClass(null);

  const isDraggable = role === 'admin';

  return (
    <div data-testid="calendar-view">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button onClick={goBack} variant="outline" size="sm" className="border-gray-200" data-testid="cal-prev"><ChevronLeft size={16} /></Button>
          <h2 className="text-lg font-semibold text-gray-900 min-w-[220px] text-center" style={{ fontFamily: 'Outfit' }}>{viewMode === 'month' ? formatMonthYear() : formatWeekRange()}</h2>
          <Button onClick={goForward} variant="outline" size="sm" className="border-gray-200" data-testid="cal-next"><ChevronRight size={16} /></Button>
          <Button onClick={goToday} variant="outline" size="sm" className="border-gray-200 text-xs" data-testid="cal-today">Today</Button>
        </div>
        <div className="flex items-center gap-4">
          {isDraggable && <span className="text-xs text-gray-400 flex items-center gap-1"><GripVertical size={12} /> Drag classes to reschedule</span>}
          <div className="flex gap-1 border border-gray-200 rounded-md p-1">
            <button onClick={() => setViewMode('month')} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === 'month' ? 'bg-[#5B21B6] text-white' : 'text-gray-600 hover:bg-gray-100'}`} data-testid="cal-month-toggle"><LayoutGrid size={14} className="inline mr-1" />Month</button>
            <button onClick={() => setViewMode('week')} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === 'week' ? 'bg-[#5B21B6] text-white' : 'text-gray-600 hover:bg-gray-100'}`} data-testid="cal-week-toggle"><CalIcon size={14} className="inline mr-1" />Week</button>
          </div>
        </div>
      </div>

      {/* MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="border border-gray-200 rounded-md overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {DAYS.map(d => <div key={d} className="px-2 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-gray-500 text-center">{d}</div>)}
          </div>
          {monthGrid.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-gray-100 last:border-b-0">
              {week.map((day, di) => {
                if (!day) return <div key={di} className="min-h-[90px] bg-gray-50/50 border-r border-gray-100 last:border-r-0" />;
                const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayClasses = classMap[dateKey] || [];
                const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                const targetDate = new Date(year, month, day);
                return (
                  <div key={di} className={`min-h-[90px] p-1.5 border-r border-gray-100 last:border-r-0 transition-colors ${isToday ? 'bg-purple-50/50' : ''} ${draggedClass ? 'hover:bg-purple-100/40' : ''}`}
                    onDragOver={handleDragOver} onDrop={(e) => handleDropOnDay(e, targetDate)} data-testid={`cal-day-${dateKey}`}>
                    <div className={`text-xs font-medium mb-1 ${isToday ? 'text-[#5B21B6] font-bold' : 'text-gray-600'}`}>{day}</div>
                    <div className="space-y-0.5">
                      {dayClasses.slice(0, 3).map(cls => (
                        <div key={cls._id} draggable={isDraggable} onDragStart={(e) => handleDragStart(e, cls)} onDragEnd={handleDragEnd}
                          onClick={() => setSelectedClass(cls)}
                          className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] text-white truncate ${statusColor(cls.status)} hover:opacity-80 transition-opacity ${isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                          data-testid={`cal-event-${cls._id}`}>
                          {cls._date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} {cls.subject ? `[${cls.subject}] ` : ''}{cls.student_name || cls.teacher_name || ''}
                        </div>
                      ))}
                      {dayClasses.length > 3 && <div className="text-[10px] text-gray-500 px-1.5">+{dayClasses.length - 3} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="border border-gray-200 rounded-md overflow-hidden">
          <div className="grid grid-cols-8 bg-gray-50 border-b border-gray-200">
            <div className="px-2 py-3 text-xs text-gray-400 border-r border-gray-200"></div>
            {weekDates.map((wd, i) => {
              const isToday = wd.toDateString() === new Date().toDateString();
              return (<div key={i} className={`px-2 py-3 text-center border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-purple-50' : ''}`}><div className="text-xs text-gray-500">{DAYS[wd.getDay()]}</div><div className={`text-sm font-medium ${isToday ? 'text-[#5B21B6] font-bold' : 'text-gray-900'}`}>{wd.getDate()}</div></div>);
            })}
          </div>
          <div className="max-h-[480px] overflow-auto">
            {HOURS.map(hour => (
              <div key={hour} className="grid grid-cols-8 border-b border-gray-100 last:border-b-0 min-h-[52px]">
                <div className="px-2 py-1 text-xs text-gray-400 border-r border-gray-200 flex items-start pt-1">{hour}:00</div>
                {weekDates.map((wd, di) => {
                  const dateKey = getDateKey(wd);
                  const dayClasses = (classMap[dateKey] || []).filter(c => c._date.getHours() === hour);
                  return (
                    <div key={di} className={`px-1 py-0.5 border-r border-gray-100 last:border-r-0 relative transition-colors ${draggedClass ? 'hover:bg-purple-100/40' : ''}`}
                      onDragOver={handleDragOver} onDrop={(e) => handleDropOnHour(e, wd, hour)}>
                      {dayClasses.map(cls => (
                        <div key={cls._id} draggable={isDraggable} onDragStart={(e) => handleDragStart(e, cls)} onDragEnd={handleDragEnd}
                          onClick={() => setSelectedClass(cls)}
                          className={`w-full text-left px-2 py-1 rounded text-[11px] text-white mb-0.5 ${statusColor(cls.status)} hover:opacity-80 transition-opacity ${isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                          data-testid={`cal-week-event-${cls._id}`}>
                          <div className="font-medium truncate">{cls.subject ? `[${cls.subject}] ` : ''}{cls.student_name || cls.teacher_name || ''}</div>
                          <div className="opacity-80">{cls._date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Class Detail Panel */}
      {selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setSelectedClass(null)}>
          <Card className="w-full max-w-md p-6 bg-white border border-gray-200 rounded-md shadow-lg" onClick={e => e.stopPropagation()} data-testid="class-detail-panel">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Outfit' }}>Class Details</h3>
              <button onClick={() => setSelectedClass(null)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Date & Time</span><span className="text-sm text-gray-900">{selectedClass._date?.toLocaleString()}</span></div>
              {selectedClass.subject && <div className="flex justify-between"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Subject</span><span className="text-sm text-gray-900 font-medium">{selectedClass.subject}</span></div>}
              {selectedClass.student_name && <div className="flex justify-between"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Student</span><span className="text-sm text-gray-900">{selectedClass.student_name}</span></div>}
              {selectedClass.teacher_name && <div className="flex justify-between"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Teacher</span><span className="text-sm text-gray-900">{selectedClass.teacher_name}</span></div>}
              <div className="flex justify-between"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Platform</span><span className={`px-2 py-1 rounded-sm text-xs ${selectedClass.platform === 'zoom' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{selectedClass.platform === 'zoom' ? 'Zoom' : 'Google Meet'}</span></div>
              <div className="flex justify-between"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Status</span><span className={`px-2 py-1 rounded-sm text-xs ${statusBadge(selectedClass.status)}`}>{selectedClass.status}</span></div>
              <div className="flex justify-between"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Type</span><span className="text-sm">{selectedClass.class_type === 'group' ? 'Group' : 'Individual'}</span></div>
              {(selectedClass.zoom_link || selectedClass.meet_link) && (
                <div className="pt-3 border-t border-gray-200">
                  <a href={selectedClass.zoom_link || selectedClass.meet_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#5B21B6] hover:underline text-sm" data-testid="class-detail-join-link"><Video size={16} />Join {selectedClass.platform === 'zoom' ? 'Zoom' : 'Meet'}</a>
                </div>
              )}
              {role === 'admin' && onRegenerateZoom && (
                <div className="pt-2"><Button onClick={() => onRegenerateZoom(selectedClass._id)} variant="outline" size="sm" className="w-full border-gray-200 text-sm flex items-center justify-center gap-2" data-testid="regenerate-zoom-button"><RefreshCw size={14} /> Regenerate Zoom Link</Button></div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
