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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const filteredRecords = getFilteredRecords();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate('/student')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
          <Link color="inherit" onClick={() => navigate('/student')} sx={{ cursor: 'pointer' }}>
            Dashboard
          </Link>
          <Typography color="text.primary">Attendance</Typography>
        </Breadcrumbs>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Attendance Summary
              </Typography>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {format(selectedMonth, 'MMMM yyyy')}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 2 }}>
                <Box
                  sx={{
                    position: 'relative',
                    display: 'inline-flex',
                    width: 120,
                    height: 120
                  }}
                >
                  <CircularProgress
                    variant="determinate"
                    value={monthlyStats.percentage}
                    size={120}
                    thickness={5}
                    sx={{ color: monthlyStats.percentage >= 75 ? 'success.main' : monthlyStats.percentage >= 50 ? 'warning.main' : 'error.main' }}
                  />
                  <Box
                    sx={{
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="h5" component="div" color="text.secondary">
                      {monthlyStats.percentage}%
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="success.main">
                      {monthlyStats.present}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Present
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="error.main">
                      {monthlyStats.absent}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Absent
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="warning.main">
                      {monthlyStats.late}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Late
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ mt: 2 }}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Select Month"
                    views={['year', 'month']}
                    value={selectedMonth}
                    onChange={(date) => date && setSelectedMonth(date)}
                    slotProps={{ 
                      textField: { 
                        fullWidth: true,
                        variant: 'outlined'
                      } 
                    }}
                  />
                </LocalizationProvider>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Filter by Subject</InputLabel>
                  <Select
                    value={selectedSubject}
                    label="Filter by Subject"
                    onChange={(e) => setSelectedSubject(e.target.value)}
                  >
                    <MenuItem value="all">All Subjects</MenuItem>
                    {CS_SUBJECTS.map(subject => (
                      <MenuItem key={subject} value={subject}>
                        {subject}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Attendance Records
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {format(selectedMonth, 'MMMM yyyy')}
            </Typography>
            
            {filteredRecords.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Subject</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Remarks</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRecords.map(record => {
                      const recordDate = parseISO(record.date);
                      return (
                        <TableRow key={record.id}>
                          <TableCell>{format(recordDate, 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{record.subjectName || 'N/A'}</TableCell>
                          <TableCell>
                            <Chip
                              icon={getStatusIcon(record.status)}
                              label={record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                              color={getStatusColor(record.status) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{record.remarks || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="subtitle1" sx={{ textAlign: 'center', py: 4 }}>
                No attendance records found for the selected month and subject.
              </Typography>
            )}
            
            <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
              Monthly Calendar View
            </Typography>
            
            <Grid container spacing={1}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Grid item xs={12/7} key={day}>
                  <Box sx={{ textAlign: 'center', fontWeight: 'bold', p: 1 }}>
                    {day}
                  </Box>
                </Grid>
              ))}
              
              {/* Empty cells for days before the first day of month */}
              {Array.from({ length: new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).getDay() }).map((_, index) => (
                <Grid item xs={12/7} key={`empty-start-${index}`}>
                  <Box sx={{ height: 40 }}></Box>
                </Grid>
              ))}
              
              {/* Calendar days */}
              {getDaysInMonth().map(day => {
                const attendance = getAttendanceForDate(day);
                const isWeekendDay = isWeekend(day);
                
                return (
                  <Grid item xs={12/7} key={day.toISOString()}>
                    <Box
                      sx={{
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        backgroundColor: isWeekendDay ? 'grey.100' : 
                                        attendance?.status === 'present' ? 'success.50' :
                                        attendance?.status === 'absent' ? 'error.50' :
                                        attendance?.status === 'late' ? 'warning.50' : 'background.paper',
                        position: 'relative'
                      }}
                    >
                      <Typography variant="body2">
                        {format(day, 'd')}
                      </Typography>
                      {attendance && (
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 2,
                            right: 2,
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: attendance.status === 'present' ? 'success.main' :
                                            attendance.status === 'absent' ? 'error.main' : 'warning.main'
                          }}
                        />
                      )}
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default StudentAttendance;