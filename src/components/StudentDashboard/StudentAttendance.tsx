import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Breadcrumbs,
  Link,
  Chip,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  CalendarMonth as CalendarMonthIcon
} from '@mui/icons-material';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, parseISO } from 'date-fns';
import './StudentAttendance.css';

const CS_SUBJECTS = [
  'Data Structures',
  'Algorithms',
  'Operating Systems',
  'DBMS',
  'Computer Networks',
  'Software Engineering'
];

interface AttendanceRecord {
  id: string;
  date: string; // ISO string
  status: 'present' | 'absent' | 'late' | 'Present' | 'Absent' | 'Late';
  remarks?: string;
  subjectId?: string;
  subjectName?: string;
  subject?: string;
  teacherId?: string;
  teacherName?: string;
}

function StudentAttendance() {
  const navigate = useNavigate();
  const { currentUser, profileData } = useAuth();
  
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedSubject, setSelectedSubject] = useState('all');
  
  const [monthlyStats, setMonthlyStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    total: 0,
    percentage: 0
  });

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'student') {
      navigate('/login');
      return;
    }

    fetchAttendanceRecords();
  }, [currentUser, navigate, profileData]);

  useEffect(() => {
    fetchAttendanceRecords();
  }, [selectedMonth]);

  useEffect(() => {
    calculateMonthlyStats();
  }, [attendanceRecords, selectedSubject]);

  const fetchAttendanceRecords = async () => {
    if (!currentUser || !profileData) return;

    try {
      setLoading(true);
      
      const start = startOfMonth(selectedMonth);
      const end = endOfMonth(selectedMonth);
      const startDate = format(start, 'yyyy-MM-dd');
      const endDate = format(end, 'yyyy-MM-dd');
      
      console.log('Fetching attendance for:', {
        studentId: currentUser.uid,
        startDate,
        endDate,
        currentUser,
        profileData
      });
      
      // Query attendance records for this student
      const attendanceRef = collection(db, 'attendance');
      
      // Simple query without date range to avoid index requirement
      console.log('Querying attendance for student:', currentUser.uid);
      
      const q = query(
        attendanceRef,
        where('studentId', '==', currentUser.uid)
      );
      
      try {
        const snapshot = await getDocs(q);
        console.log(`Found ${snapshot.docs.length} total attendance records for student`);
        
        const allResults: AttendanceRecord[] = [];
        
        snapshot.forEach((doc) => {
          const record = doc.data();
          
          // Filter by date on the client side
          if (record.date >= startDate && record.date <= endDate) {
            console.log('Found attendance record in date range:', record);
            allResults.push({ 
              id: doc.id,
              date: record.date,
              status: record.status?.toLowerCase() || 'absent',
              remarks: record.remarks,
              subjectId: record.subjectId,
              subjectName: record.subjectName || record.subject,
              subject: record.subject,
              teacherId: record.teacherId,
              teacherName: record.teacherName
            });
          }
        });
        
        console.log('Final attendance records set:', allResults);
        setAttendanceRecords(allResults);
        setLoading(false);
        
      } catch (queryError) {
        console.error('Query failed:', queryError);
        console.log('No attendance records found for this student');
        setAttendanceRecords([]);
        setLoading(false);
      }
      
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      setLoading(false);
    }
  };

  const calculateMonthlyStats = () => {
    let filteredRecords = [...attendanceRecords];
    
    if (selectedSubject !== 'all') {
      filteredRecords = filteredRecords.filter(record => 
        record.subjectName === selectedSubject || record.subject === selectedSubject
      );
    }
    
    const present = filteredRecords.filter(record => record.status === 'present').length;
    const absent = filteredRecords.filter(record => record.status === 'absent').length;
    const late = filteredRecords.filter(record => record.status === 'late').length;
    const total = present + absent + late;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    
    console.log('Monthly stats calculation:', {
      filteredRecords: filteredRecords.length,
      present,
      absent,
      late,
      total,
      percentage
    }); // Debug log
    
    setMonthlyStats({ present, absent, late, total, percentage });
  };

  const getFilteredRecords = () => {
    if (selectedSubject === 'all') {
      return attendanceRecords;
    }
    return attendanceRecords.filter(record => 
      record.subjectName === selectedSubject || record.subject === selectedSubject
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'success';
      case 'absent': return 'error';
      case 'late': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircleIcon fontSize="small" color="success" />;
      case 'absent': return <CancelIcon fontSize="small" color="error" />;
      case 'late': return <ScheduleIcon fontSize="small" color="warning" />;
      default: return <CheckCircleIcon fontSize="small" />;
    }
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    return eachDayOfInterval({ start, end });
  };

  const getAttendanceForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return attendanceRecords.find(record => record.date === dateStr);
  };

  if (loading && attendanceRecords.length === 0) {
    return (
      <div className="student-attendance-management">
        <div className="student-attendance-background-gradient"></div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p style={{ color: 'white', fontSize: '1.2rem', fontWeight: '500' }}>Loading attendance data...</p>
        </div>
      </div>
    );
  }

  const filteredRecords = getFilteredRecords();

  return (
    <div className="student-attendance-management">
      <div className="student-attendance-background-gradient"></div>
      
      <div className="student-attendance-container">
        <div className="student-attendance-header">
          <div className="student-attendance-title-section">
            <h1>My Attendance</h1>
            <p>Track your attendance records and statistics</p>
          </div>
          
          <div className="breadcrumb-navigation">
            <Link 
              className="breadcrumb-link" 
              onClick={() => navigate('/student')}
              sx={{ cursor: 'pointer' }}
            >
              Dashboard
            </Link>
            <span className="breadcrumb-current"> / Attendance</span>
          </div>
        </div>

        <div className="summary-section">
          <div className="summary-title">
            Attendance Summary
          </div>
          
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-label">Select Month</div>
              <div style={{ width: '100%' }}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    views={['year', 'month']}
                    value={selectedMonth}
                    onChange={(date) => date && setSelectedMonth(date)}
                    slotProps={{ 
                      textField: { 
                        fullWidth: true,
                        variant: 'outlined',
                        className: 'summary-control'
                      } 
                    }}
                  />
                </LocalizationProvider>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="summary-label">Filter by Subject</div>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="summary-control"
              >
                <option value="all">All Subjects</option>
                {CS_SUBJECTS.map(subject => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="summary-card">
              <div className="summary-label">Attendance Percentage</div>
              <div style={{ 
                width: '100px', 
                height: '100px', 
                borderRadius: '50%', 
                border: '5px solid rgba(255, 255, 255, 0.2)', 
                borderTop: `5px solid ${monthlyStats.percentage >= 75 ? '#2ecc71' : monthlyStats.percentage >= 50 ? '#f39c12' : '#e74c3c'}`,
                animation: 'spin 2s linear infinite'
              }}></div>
              <div style={{ 
                color: 'white', 
                fontSize: '1.5rem', 
                fontWeight: 'bold',
                marginTop: '10px'
              }}>
                {monthlyStats.percentage}%
              </div>
            </div>
          </div>
        </div>

        <div className="statistics-section">
          <div className="statistic-card">
            <CheckCircleIcon className="statistic-icon statistic-present" />
            <div className="statistic-number">{monthlyStats.present}</div>
            <div className="statistic-label">Present</div>
          </div>
          
          <div className="statistic-card">
            <CancelIcon className="statistic-icon statistic-absent" />
            <div className="statistic-number">{monthlyStats.absent}</div>
            <div className="statistic-label">Absent</div>
          </div>
          
          <div className="statistic-card">
            <ScheduleIcon className="statistic-icon statistic-late" />
            <div className="statistic-number">{monthlyStats.late}</div>
            <div className="statistic-label">Late</div>
          </div>
          
          <div className="statistic-card">
            <CalendarMonthIcon className="statistic-icon statistic-total" />
            <div className="statistic-number">{monthlyStats.total}</div>
            <div className="statistic-label">Total</div>
          </div>
        </div>

        <div className="attendance-table-container">
          <div className="table-header">
            Attendance Records
          </div>
          
          {filteredRecords.length > 0 ? (
            <table className="attendance-table">
              <thead className="table-head">
                <tr>
                  <th className="table-header-cell">Date</th>
                  <th className="table-header-cell">Subject</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(record => {
                  const recordDate = parseISO(record.date);
                  return (
                    <tr key={record.id} className="table-row">
                      <td className="table-cell">{format(recordDate, 'MMM dd, yyyy')}</td>
                      <td className="table-cell">{record.subjectName || 'N/A'}</td>
                      <td className="table-cell">
                        <span className={`status-chip status-${record.status}`}>
                          {getStatusIcon(record.status)}
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                      </td>
                      <td className="table-cell">{record.remarks || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty-state-card">
              <CalendarMonthIcon className="empty-state-icon" />
              <div className="empty-state-title">No Records Found</div>
              <div className="empty-state-message">No attendance records found for the selected month and subject.</div>
            </div>
          )}
        </div>

        <div className="calendar-section">
          <div className="calendar-header">
            Monthly Calendar View
          </div>
          
          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="calendar-day-header">
                {day}
              </div>
            ))}
            
            {/* Empty cells for days before the first day of month */}
            {Array.from({ length: new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).getDay() }).map((_, index) => (
              <div key={`empty-start-${index}`} className="calendar-day"></div>
            ))}
            
            {/* Calendar days */}
            {getDaysInMonth().map(day => {
              const attendance = getAttendanceForDate(day);
              const isWeekendDay = isWeekend(day);
              const dayClass = `calendar-day ${isWeekendDay ? 'calendar-day-weekend' : ''} ${attendance ? `calendar-day-${attendance.status}` : ''}`;
              
              return (
                <div key={day.toISOString()} className={dayClass}>
                  <div className="calendar-day-number">{format(day, 'd')}</div>
                  {attendance && (
                    <div className={`calendar-day-indicator indicator-${attendance.status}`}></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentAttendance;