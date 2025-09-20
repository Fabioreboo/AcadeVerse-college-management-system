import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  TextField,
  Grid,
  Chip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  NavigateNext as NavigateNextIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { collection, getDocs, query, where, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { format } from 'date-fns';

interface Student {
  id: string;
  name: string;
  rollNumber: string;
  class: string;
  section: string;
}

interface AttendanceRecord {
  date: string;
  studentId: string;
  status: 'present' | 'absent' | 'late';
  remarks?: string;
}

function AttendanceManagement() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [classes, setClasses] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'teacher') {
      navigate('/login');
      return;
    }

    const fetchStudents = async () => {
      try {
        setLoading(true);
        const studentsRef = collection(db, 'students');
        const studentsSnapshot = await getDocs(studentsRef);
        const studentsList: Student[] = [];
        const classesSet = new Set<string>();
        
        studentsSnapshot.forEach((doc) => {
          const student = { id: doc.id, ...doc.data() } as Student;
          studentsList.push(student);
          classesSet.add(student.class);
        });
        
        setStudents(studentsList);
        setClasses(Array.from(classesSet));
        setLoading(false);
      } catch (error) {
        console.error('Error fetching students:', error);
        setSnackbarMessage('Failed to load students data');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setLoading(false);
      }
    };

    fetchStudents();
  }, [currentUser, navigate]);

  useEffect(() => {
    if (selectedClass) {
      const sectionsSet = new Set<string>();
      students
        .filter(student => student.class === selectedClass)
        .forEach(student => sectionsSet.add(student.section));
      setSections(Array.from(sectionsSet));
    } else {
      setSections([]);
    }
  }, [selectedClass, students]);

  useEffect(() => {
    let filtered = [...students];
    
    if (selectedClass) {
      filtered = filtered.filter(student => student.class === selectedClass);
    }
    
    if (selectedSection) {
      filtered = filtered.filter(student => student.section === selectedSection);
    }
    
    setFilteredStudents(filtered);
  }, [students, selectedClass, selectedSection]);

  useEffect(() => {
    const fetchAttendanceRecords = async () => {
      if (!selectedDate || !selectedClass || !selectedSection) return;

      try {
        setLoading(true);
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        const attendanceRef = doc(db, 'attendance', `${selectedClass}_${selectedSection}_${dateString}`);
        const attendanceDoc = await getDoc(attendanceRef);

        if (attendanceDoc.exists()) {
          setAttendanceRecords(attendanceDoc.data() as Record<string, AttendanceRecord>);
        } else {
          // Initialize empty records for all students
          const newRecords: Record<string, AttendanceRecord> = {};
          filteredStudents.forEach(student => {
            newRecords[student.id] = {
              date: dateString,
              studentId: student.id,
              status: 'present',
              remarks: ''
            };
          });
          setAttendanceRecords(newRecords);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching attendance records:', error);
        setSnackbarMessage('Failed to load attendance records');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setLoading(false);
      }
    };

    fetchAttendanceRecords();
  }, [selectedDate, selectedClass, selectedSection, filteredStudents]);

  const handleAttendanceChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks
      }
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedDate || !selectedClass || !selectedSection) {
      setSnackbarMessage('Please select class, section, and date');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    try {
      setSaving(true);
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const attendanceRef = doc(db, 'attendance', `${selectedClass}_${selectedSection}_${dateString}`);
      await setDoc(attendanceRef, attendanceRecords);
      
      setSnackbarMessage('Attendance saved successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setSaving(false);
    } catch (error) {
      console.error('Error saving attendance:', error);
      setSnackbarMessage('Failed to save attendance');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setSaving(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate('/teacher')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
          <Link color="inherit" onClick={() => navigate('/teacher')} sx={{ cursor: 'pointer' }}>
            Dashboard
          </Link>
          <Typography color="text.primary">Attendance Management</Typography>
        </Breadcrumbs>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Attendance Management
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Class</InputLabel>
              <Select
                value={selectedClass}
                label="Class"
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSection('');
                }}
              >
                <MenuItem value=""><em>Select Class</em></MenuItem>
                {classes.map((cls) => (
                  <MenuItem key={cls} value={cls}>{cls}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth disabled={!selectedClass}>
              <InputLabel>Section</InputLabel>
              <Select
                value={selectedSection}
                label="Section"
                onChange={(e) => setSelectedSection(e.target.value)}
              >
                <MenuItem value=""><em>Select Section</em></MenuItem>
                {sections.map((section) => (
                  <MenuItem key={section} value={section}>{section}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Date"
                value={selectedDate}
                onChange={(newDate) => setSelectedDate(newDate)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>
        </Grid>

        {selectedClass && selectedSection && selectedDate ? (
          <>
            {filteredStudents.length > 0 ? (
              <>
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Roll No.</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Remarks</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>{student.rollNumber}</TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Chip
                                label="Present"
                                color={attendanceRecords[student.id]?.status === 'present' ? 'success' : 'default'}
                                onClick={() => handleAttendanceChange(student.id, 'present')}
                                variant={attendanceRecords[student.id]?.status === 'present' ? 'filled' : 'outlined'}
                              />
                              <Chip
                                label="Absent"
                                color={attendanceRecords[student.id]?.status === 'absent' ? 'error' : 'default'}
                                onClick={() => handleAttendanceChange(student.id, 'absent')}
                                variant={attendanceRecords[student.id]?.status === 'absent' ? 'filled' : 'outlined'}
                              />
                              <Chip
                                label="Late"
                                color={attendanceRecords[student.id]?.status === 'late' ? 'warning' : 'default'}
                                onClick={() => handleAttendanceChange(student.id, 'late')}
                                variant={attendanceRecords[student.id]?.status === 'late' ? 'filled' : 'outlined'}
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              placeholder="Add remarks"
                              value={attendanceRecords[student.id]?.remarks || ''}
                              onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                              fullWidth
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveAttendance}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Attendance'}
                  </Button>
                </Box>
              </>
            ) : (
              <Typography variant="subtitle1" sx={{ mt: 2 }}>
                No students found for the selected class and section.
              </Typography>
            )}
          </>
        ) : (
          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            Please select class, section, and date to view and manage attendance.
          </Typography>
        )}
      </Paper>

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default AttendanceManagement;