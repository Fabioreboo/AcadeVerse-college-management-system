import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  IconButton,
  TextField,
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
  Snackbar,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { collection, getDocs, query, where, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface Student {
  id: string;
  name: string;
  studentId: string;
  class: string;
  section: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  fullMarks: number;
  passMarks: number;
}

// Computer Science subjects (same as attendance and notes management)
const CS_SUBJECTS = [
  'Data Structures',
  'Algorithms', 
  'Operating Systems',
  'DBMS',
  'Computer Networks',
  'Software Engineering'
];

interface Mark {
  studentId: string;
  subjectName: string;
  marks: number;
  grade: string;
  examType: string;
  semester: string;
  academicYear: string;
  remarks?: string;
}

function MarksManagement() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [examType, setExamType] = useState('Final');
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());
  
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const examTypes = ['Final', 'Assignment', 'Project'];
  const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];
  
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'teacher') {
      navigate('/login');
      return;
    }

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Fetch all CS students (assuming all students are CS)
        const studentsRef = collection(db, 'students');
        const studentsSnapshot = await getDocs(studentsRef);
        const studentsList: Student[] = [];
        
        studentsSnapshot.forEach((doc) => {
          const student = { id: doc.id, ...doc.data() } as Student;
          studentsList.push(student);
        });
        
        setStudents(studentsList);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching initial data:', error);
        showSnackbar('Failed to load data', 'error');
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [currentUser, navigate]);

  useEffect(() => {
    // Filter students by semester if selected
    let filtered = [...students];
    
    if (selectedSemester) {
      // Assuming students have a semester field, or filter by some other logic
      // For now, show all CS students regardless of semester
      filtered = students;
    } else {
      filtered = students;
    }
    
    setFilteredStudents(filtered);
  }, [students, selectedSemester]);

  useEffect(() => {
    const fetchMarks = async () => {
      if (!selectedSubject || !selectedSemester || !examType || !academicYear) return;

      try {
        setLoading(true);
        const marksDocId = `CS_${selectedSemester}_${selectedSubject}_${examType}_${academicYear}`;
        const marksRef = doc(db, 'marks', marksDocId);
        const marksDoc = await getDoc(marksRef);

        const newMarks: Record<string, number> = {};
        const newRemarks: Record<string, string> = {};

        if (marksDoc.exists()) {
          const marksData = marksDoc.data();
          filteredStudents.forEach(student => {
            if (marksData[student.id]) {
              newMarks[student.id] = marksData[student.id].marks || 0;
              newRemarks[student.id] = marksData[student.id].remarks || '';
            } else {
              newMarks[student.id] = 0;
              newRemarks[student.id] = '';
            }
          });
        } else {
          filteredStudents.forEach(student => {
            newMarks[student.id] = 0;
            newRemarks[student.id] = '';
          });
        }

        setMarks(newMarks);
        setRemarks(newRemarks);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching marks:', error);
        showSnackbar('Failed to load marks', 'error');
        setLoading(false);
      }
    };

    fetchMarks();
  }, [selectedSubject, selectedSemester, examType, academicYear, filteredStudents]);

  const handleMarkChange = (studentId: string, value: string) => {
    const numValue = value === '' ? 0 : Number(value);
    setMarks(prev => ({
      ...prev,
      [studentId]: numValue
    }));
  };

  const handleRemarkChange = (studentId: string, value: string) => {
    setRemarks(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  const calculateGrade = (mark: number, fullMarks: number): string => {
    const percentage = (mark / fullMarks) * 100;
    
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    if (percentage >= 33) return 'D';
    return 'F';
  };

  const validateForm = () => {
    if (!selectedSubject) {
      showSnackbar('Please select a subject', 'error');
      return false;
    }
    if (!selectedSemester) {
      showSnackbar('Please select a semester', 'error');
      return false;
    }
    if (!examType) {
      showSnackbar('Please select an exam type', 'error');
      return false;
    }
    if (!academicYear) {
      showSnackbar('Please enter an academic year', 'error');
      return false;
    }
    return true;
  };

  const handleSaveMarks = async () => {
    if (!validateForm()) return;
    
    setConfirmDialogOpen(true);
  };

  const confirmSaveMarks = async () => {
    setConfirmDialogOpen(false);
    
    try {
      setSaving(true);
      const fullMarks = 100; // Default full marks for CS subjects
      const passMarks = 40;  // Default pass marks for CS subjects
      
      const marksDocId = `CS_${selectedSemester}_${selectedSubject}_${examType}_${academicYear}`;
      const marksRef = doc(db, 'marks', marksDocId);
      
      const marksData: Record<string, any> = {};
      
      filteredStudents.forEach(student => {
        const studentMark = marks[student.id] || 0;
        const grade = calculateGrade(studentMark, fullMarks);
        
        marksData[student.id] = {
          marks: studentMark,
          grade,
          remarks: remarks[student.id] || '',
          studentName: student.name,
          studentId: student.studentId,
          subjectName: selectedSubject,
          semester: selectedSemester,
          fullMarks: fullMarks,
          passMarks: passMarks,
          lastUpdated: new Date().toISOString()
        };
      });
      
      await setDoc(marksRef, marksData);
      
      showSnackbar('Marks saved successfully', 'success');
      setSaving(false);
    } catch (error) {
      console.error('Error saving marks:', error);
      showSnackbar('Failed to save marks', 'error');
      setSaving(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  if (loading && filteredStudents.length === 0) {
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
          <Typography color="text.primary">Marks Management</Typography>
        </Breadcrumbs>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Marks Management
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Subject</InputLabel>
              <Select
                value={selectedSubject}
                label="Subject"
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <MenuItem value=""><em>Select Subject</em></MenuItem>
                {CS_SUBJECTS.map((subject) => (
                  <MenuItem key={subject} value={subject}>
                    {subject}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Semester</InputLabel>
              <Select
                value={selectedSemester}
                label="Semester"
                onChange={(e) => setSelectedSemester(e.target.value)}
              >
                <MenuItem value=""><em>Select Semester</em></MenuItem>
                {semesters.map((semester) => (
                  <MenuItem key={semester} value={semester}>
                    Semester {semester}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Exam Type</InputLabel>
              <Select
                value={examType}
                label="Exam Type"
                onChange={(e) => setExamType(e.target.value)}
              >
                {examTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <TextField
              label="Academic Year"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              fullWidth
            />
          </Grid>
        </Grid>

        {selectedSemester && selectedSubject ? (
          <>
            {filteredStudents.length > 0 ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1">
                    Subject: {selectedSubject} - Semester {selectedSemester}
                  </Typography>
                  <Tooltip title="Full Marks: 100, Pass Marks: 40">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Student ID</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Marks (out of 100)</TableCell>
                        <TableCell>Grade</TableCell>
                        <TableCell>Remarks</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredStudents.map((student) => {
                        const studentMark = marks[student.id] || 0;
                        const grade = calculateGrade(studentMark, 100);
                        const isPassing = studentMark >= 40;
                        
                        return (
                          <TableRow key={student.id}>
                            <TableCell>{student.studentId}</TableCell>
                            <TableCell>{student.name}</TableCell>
                            <TableCell>
                              <TextField
                                type="number"
                                size="small"
                                value={studentMark === 0 ? '' : studentMark}
                                onChange={(e) => handleMarkChange(student.id, e.target.value)}
                                inputProps={{ min: 0, max: 100 }}
                                sx={{ width: '100px' }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography
                                sx={{
                                  color: isPassing ? 'success.main' : 'error.main',
                                  fontWeight: 'bold'
                                }}
                              >
                                {grade}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                placeholder="Add remarks"
                                value={remarks[student.id] || ''}
                                onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                                fullWidth
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveMarks}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Marks'}
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
            Please select subject and semester to manage marks.
          </Typography>
        )}
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Confirm Save Marks</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to save marks for {selectedSubject} ({examType}, Semester {selectedSemester})?
            This will overwrite any existing marks for this combination.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmSaveMarks} color="primary" autoFocus>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default MarksManagement;