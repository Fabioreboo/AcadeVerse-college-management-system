import { useState, useEffect } from 'react';
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
  Card,
  CardContent,
  Divider,
  Chip
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  ArrowBack as ArrowBackIcon,
  CalendarMonth as CalendarMonthIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface AttendanceRecord {
  id: string;
  date: string;
  status: string; // 'present', 'absent', 'late'
  subject: string;
  subjectCode: string;
  remarks?: string;
  teacher: string;
  teacherId: string;
  class: string;
  section: string;
  studentId: string;
  timestamp: any; // Firestore timestamp
}

interface ChildInfo {
  id: string;
  name: string;
  class: string;
  section: string;
  rollNumber: string;
}

function ParentAttendance() {
  const navigate = useNavigate();
  const { currentUser, profileData } = useAuth();
  
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [childInfo, setChildInfo] = useState<ChildInfo | null>(null);
  
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // Format: YYYY-MM
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const subjects = new Set<string>(['Data Structures', 'Algorithms', 'Operating Systems', 'DBMS', 'Computer Networks', 'Software Engineering']);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'parent') {
      navigate('/login');
      return;
    }

    fetchChildInfo();
  }, [currentUser, navigate]);

  useEffect(() => {
    if (childInfo) {
      fetchAttendanceRecords();
    }
  }, [childInfo, selectedMonth]);

  const fetchChildInfo = async () => {
    if (!profileData) return;

    try {
      console.log('🔍 Debug: Profile data:', profileData);
      
      // Get the linked student ID from parent's profile
      const linkedStudentId = profileData.linkedStudentId;
      
      if (!linkedStudentId) {
        console.error('No child associated with this parent account - linkedStudentId missing');
        setLoading(false);
        return;
      }
      
      console.log('🔍 Debug: Looking for student with ID:', linkedStudentId);
      
      // First, try to find the student in the users collection by studentId
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('role', '==', 'student'), where('studentId', '==', linkedStudentId));
      const userSnapshot = await getDocs(userQuery);
      
      let studentData = null;
      let studentUserId = null;
      
      if (!userSnapshot.empty) {
        const studentDoc = userSnapshot.docs[0];
        studentData = studentDoc.data();
        studentUserId = studentDoc.id;
        console.log('🔍 Debug: Found student in users collection:', studentData);
      } else {
        console.log('🔍 Debug: Student not found in users collection, checking students collection...');
        
        // If not found in users, try the students collection
        const studentsRef = collection(db, 'students');
        const studentQuery = query(studentsRef, where('studentId', '==', linkedStudentId));
        const studentSnapshot = await getDocs(studentQuery);
        
        if (!studentSnapshot.empty) {
          const studentDoc = studentSnapshot.docs[0];
          studentData = studentDoc.data();
          studentUserId = studentData.userId || studentDoc.id;
          console.log('🔍 Debug: Found student in students collection:', studentData);
        }
      }
      
      if (!studentData) {
        console.error('Child not found with ID:', linkedStudentId);
        setLoading(false);
        return;
      }
      
      setChildInfo({
        id: studentUserId,
        name: studentData.name || studentData.linkedStudentName || 'Unknown Student',
        class: 'Computer Science',
        section: studentData.section || '1',
        rollNumber: studentData.rollNumber || studentData.studentId || linkedStudentId
      });
      
      console.log('✅ Debug: Child info set successfully');
      
    } catch (error) {
      console.error('Error fetching child info:', error);
      setLoading(false);
    }
  };

  const fetchAttendanceRecords = async () => {
    if (!childInfo) return;

    try {
      setLoading(true);
      
      // Parse the selected month
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      
      // Calculate end date (last day of the month)
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${lastDay}`;
      
      console.log('🔍 Debug: Fetching attendance for student:', childInfo.id, 'rollNumber:', childInfo.rollNumber);
      console.log('🔍 Debug: Date range:', startDate, 'to', endDate);
      
      // Try fetching attendance records using different possible student identifiers
      const attendanceRef = collection(db, 'attendance');
      
      // First try with rollNumber (linkedStudentId like CS20230008) - this should match Firebase rules
      let q = query(
        attendanceRef,
        where('studentId', '==', childInfo.rollNumber),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
      );
      
      let attendanceSnapshot = await getDocs(q);
      
      // If no records found, try with the student user ID as fallback
      if (attendanceSnapshot.empty) {
        console.log('🔍 Debug: No records with rollNumber, trying with userId:', childInfo.id);
        q = query(
          attendanceRef,
          where('studentId', '==', childInfo.id),
          where('date', '>=', startDate),
          where('date', '<=', endDate),
          orderBy('date', 'asc')
        );
        attendanceSnapshot = await getDocs(q);
      }
      
      const records: AttendanceRecord[] = [];
      
      attendanceSnapshot.forEach((doc) => {
        const record = { id: doc.id, ...doc.data() } as AttendanceRecord;
        records.push(record);
        
        // Add any additional subjects found in attendance records
        if (record.subject) {
          subjects.add(record.subject);
        }
      });
      
      setAttendanceRecords(records);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      setLoading(false);
    }
  };

  const getFilteredRecords = () => {
    if (selectedSubject === 'all') {
      return attendanceRecords;
    }
    
    return attendanceRecords.filter(record => record.subject === selectedSubject);
  };

  const getAttendanceStats = () => {
    // Use filtered records (respects subject selection) for summary statistics
    const filteredRecords = getFilteredRecords();
    
    const total = filteredRecords.length;
    // Make status comparison case-insensitive and handle missing status
    const present = filteredRecords.filter(record => {
      const status = (record.status || '').toLowerCase();
      return status === 'present';
    }).length;
    const absent = filteredRecords.filter(record => {
      const status = (record.status || '').toLowerCase();
      return status === 'absent';
    }).length;
    const late = filteredRecords.filter(record => {
      const status = (record.status || '').toLowerCase();
      return status === 'late';
    }).length;
    
    const presentPercentage = total > 0 ? (present / total) * 100 : 0;
    const absentPercentage = total > 0 ? (absent / total) * 100 : 0;
    const latePercentage = total > 0 ? (late / total) * 100 : 0;
    
    return {
      total,
      present,
      absent,
      late,
      presentPercentage: Math.round(presentPercentage),
      absentPercentage: Math.round(absentPercentage),
      latePercentage: Math.round(latePercentage)
    };
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return `${day} ${months[parseInt(month) - 1]}, ${year}`;
  };

  const getStatusChip = (status: string) => {
    const normalizedStatus = (status || '').toLowerCase();
    switch (normalizedStatus) {
      case 'present':
        return (
          <Chip 
            icon={<CheckCircleIcon />} 
            label="Present" 
            color="success" 
            size="small" 
            variant="outlined"
          />
        );
      case 'absent':
        return (
          <Chip 
            icon={<CancelIcon />} 
            label="Absent" 
            color="error" 
            size="small" 
            variant="outlined"
          />
        );
      case 'late':
        return (
          <Chip 
            icon={<WarningIcon />} 
            label="Late" 
            color="warning" 
            size="small" 
            variant="outlined"
          />
        );
      default:
        return (
          <Chip 
            icon={<InfoIcon />} 
            label={status || 'Unknown'} 
            color="default" 
            size="small" 
            variant="outlined"
          />
        );
    }
  };

  const getMonthYearString = () => {
    const [year, month] = selectedMonth.split('-');
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  if (loading && !childInfo) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const stats = getAttendanceStats();
  const filteredRecords = getFilteredRecords();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate('/parent')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
          <Link color="inherit" onClick={() => navigate('/parent')} sx={{ cursor: 'pointer' }}>
            Dashboard
          </Link>
          <Typography color="text.primary">Child's Attendance</Typography>
        </Breadcrumbs>
      </Box>

      {childInfo ? (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <CalendarMonthIcon sx={{ mr: 1 }} />
              <Typography variant="h5" component="h1">
                {childInfo.name}'s Attendance
              </Typography>
            </Box>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Department
                </Typography>
                <Typography variant="body1">
                  {childInfo.class}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Roll Number
                </Typography>
                <Typography variant="body1">
                  {childInfo.rollNumber}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Month
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    displayEmpty
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const date = new Date();
                      date.setMonth(date.getMonth() - i);
                      const value = date.toISOString().slice(0, 7);
                      const [year, month] = value.split('-');
                      return (
                        <MenuItem key={value} value={value}>
                          {months[parseInt(month) - 1]} {year}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Subject
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    displayEmpty
                  >
                    <MenuItem value="all">All Subjects</MenuItem>
                    {Array.from(subjects).map((subject) => (
                      <MenuItem key={subject} value={subject}>
                        {subject}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
            <Divider sx={{ mb: 3 }} />
            
            <Typography variant="h6" gutterBottom>
              Attendance Summary for {getMonthYearString()}
              {selectedSubject !== 'all' ? ` - ${selectedSubject}` : ''}
            </Typography>
            
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'success.light' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Present
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="h4" component="div" sx={{ mr: 1 }}>
                        {stats.present}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ({stats.presentPercentage}%)
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'error.light' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Absent
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="h4" component="div" sx={{ mr: 1 }}>
                        {stats.absent}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ({stats.absentPercentage}%)
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'warning.light' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Late
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="h4" component="div" sx={{ mr: 1 }}>
                        {stats.late}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ({stats.latePercentage}%)
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Total
                    </Typography>
                    <Typography variant="h4" component="div">
                      {stats.total}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            {filteredRecords.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Subject</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Teacher</TableCell>
                      <TableCell>Remarks</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatDate(record.date)}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{record.subject}</Typography>
                          <Typography variant="caption" color="text.secondary">{record.subjectCode}</Typography>
                        </TableCell>
                        <TableCell>{getStatusChip(record.status)}</TableCell>
                        <TableCell>{record.teacher}</TableCell>
                        <TableCell>{record.remarks || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="subtitle1" color="text.secondary">
                  No attendance records found for {getMonthYearString()}
                  {selectedSubject !== 'all' ? ` in ${selectedSubject}` : ''}
                </Typography>
              </Box>
            )}
          </Paper>

        </>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No child associated with this account
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please contact the school administrator to link your child to your account.
          </Typography>
        </Paper>
      )}
    </Container>
  );
}

export default ParentAttendance;