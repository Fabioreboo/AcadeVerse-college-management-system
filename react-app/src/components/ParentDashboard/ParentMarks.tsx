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
  Card,
  CardContent,
  Divider,
  Tabs,
  Tab,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  ArrowBack as ArrowBackIcon,
  Grade as GradeIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Info as InfoIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface Subject {
  id: string;
  name: string;
  code: string;
  fullMarks: number;
  passMarks: number;
}

interface Mark {
  marks: number;
  grade: string;
  remarks?: string;
  subjectName: string;
  subjectCode: string;
  fullMarks: number;
  passMarks: number;
  lastUpdated: string;
}

interface MarksData {
  [subjectId: string]: Mark;
}

interface ChildInfo {
  id: string;
  name: string;
  class: string;
  section: string;
  rollNumber: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  subject: string;
}

function ParentMarks() {
  const navigate = useNavigate();
  const { currentUser, profileData } = useAuth();
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [marksData, setMarksData] = useState<Record<string, MarksData>>({});
  const [loading, setLoading] = useState(true);
  const [childInfo, setChildInfo] = useState<ChildInfo | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  
  const [selectedExamType, setSelectedExamType] = useState('Final');
  const [selectedSemester, setSelectedSemester] = useState('1');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [tabValue, setTabValue] = useState(0);
  
  const [openContactDialog, setOpenContactDialog] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  
  const examTypes = ['Final', 'Assignment', 'Project'];
  const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];
  const years = [new Date().getFullYear().toString(), (new Date().getFullYear() - 1).toString()];

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'parent') {
      navigate('/login');
      return;
    }

    fetchChildInfo();
  }, [currentUser, navigate]);

  useEffect(() => {
    if (childInfo) {
      fetchSubjects();
      fetchTeachers();
    }
  }, [childInfo]);

  useEffect(() => {
    if (subjects.length > 0 && childInfo) {
      fetchMarks();
    }
  }, [subjects, childInfo, selectedExamType, selectedSemester, selectedYear]);

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

  const fetchSubjects = async () => {
    if (!childInfo) return;

    try {
      setLoading(true);
      
      // Use the same CS subjects as StudentMarks component
      const CS_SUBJECTS = [
        'Data Structures',
        'Algorithms', 
        'Operating Systems',
        'DBMS',
        'Computer Networks',
        'Software Engineering'
      ];
      
      const subjectsList: Subject[] = CS_SUBJECTS.map((subjectName, index) => ({
        id: subjectName.replace(/\s+/g, ''), // Remove spaces for ID
        name: subjectName,
        code: `CS${(index + 1).toString().padStart(2, '0')}`, // Generate codes like CS01, CS02, etc.
        fullMarks: 100,
        passMarks: 40
      }));
      
      console.log('🔍 Debug: Setting CS subjects:', subjectsList);
      setSubjects(subjectsList);
    } catch (error) {
      console.error('Error setting subjects:', error);
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    if (!childInfo) return;

    try {
      // For simplicity, we'll skip teacher fetching for parents
      // This feature can be implemented later with proper permissions
      console.log('Skipping teacher fetch for parent dashboard');
      setTeachers([]);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setTeachers([]);
    }
  };

  const fetchMarks = async () => {
    if (!childInfo) return;

    try {
      console.log('🔍 Debug: Starting fetchMarks for child:', childInfo.id);
      console.log('🔍 Debug: Currently viewing - Exam type:', selectedExamType, 'Semester:', selectedSemester);
      
      // Only fetch marks for currently selected exam type and semester
      // This matches the optimized approach used in StudentMarks
      const currentKey = `${selectedExamType}_${selectedSemester}_${selectedYear}`;
      
      // If we already have data for this combination, don't refetch
      if (marksData[currentKey] && Object.keys(marksData[currentKey]).length > 0) {
        console.log('🔍 Debug: Using cached data for', currentKey);
        setLoading(false);
        return;
      }
      
      console.log('🔍 Debug: Fetching new data for', currentKey);
      
      const currentMarksData: MarksData = {};
      
      // Use Promise.all to fetch all subjects in parallel instead of sequentially
      const fetchPromises = subjects.map(async (subject) => {
        // Use the EXACT same document ID format as StudentMarks
        const marksDocId = `CS_${selectedSemester}_${subject.name}_${selectedExamType}_${selectedYear}`;
        
        try {
          const marksRef = doc(db, 'marks', marksDocId);
          const marksDoc = await getDoc(marksRef);
          
          if (marksDoc.exists()) {
            const docData = marksDoc.data();
            
            // Check if the child's marks exist in this document
            if (docData[childInfo.id]) {
              console.log(`🔍 Debug: Found marks for ${subject.name}:`, docData[childInfo.id]);
              currentMarksData[subject.id] = docData[childInfo.id] as Mark;
            }
          }
        } catch (docError: any) {
          if (docError.code !== 'permission-denied') {
            console.warn(`⚠️  Error accessing ${marksDocId}:`, docError.message);
          }
        }
      });
      
      // Wait for all subjects to be fetched in parallel
      await Promise.all(fetchPromises);
      
      // Update state with the new data
      setMarksData(prev => ({
        ...prev,
        [currentKey]: currentMarksData
      }));
      
      console.log('🔍 Debug: Fetched marks for', Object.keys(currentMarksData).length, 'subjects');
      setLoading(false);
      
    } catch (error: any) {
      console.error('❌ Error fetching marks:', error);
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setSelectedExamType(examTypes[newValue]);
    // Show loading immediately when changing tabs
    setLoading(true);
  };

  const handleSemesterChange = (event: any) => {
    setSelectedSemester(event.target.value);
    // Show loading immediately when changing semester
    setLoading(true);
  };

  const handleYearChange = (event: any) => {
    setSelectedYear(event.target.value);
    // Show loading immediately when changing year
    setLoading(true);
  };

  const getCurrentMarks = () => {
    const key = `${selectedExamType}_${selectedSemester}_${selectedYear}`;
    return marksData[key] || {};
  };

  const calculateTotalAndPercentage = () => {
    const currentMarks = getCurrentMarks();
    let totalMarks = 0;
    let totalFullMarks = 0;
    let totalSubjects = 0;
    
    subjects.forEach(subject => {
      if (currentMarks[subject.id]) {
        totalMarks += currentMarks[subject.id].marks;
        totalFullMarks += currentMarks[subject.id].fullMarks;
        totalSubjects++;
      }
    });
    
    const percentage = totalFullMarks > 0 ? (totalMarks / totalFullMarks) * 100 : 0;
    const averagePercentage = totalSubjects > 0 ? percentage : 0;
    
    return {
      totalMarks,
      totalFullMarks,
      percentage: Math.round(percentage * 10) / 10,
      averagePercentage: Math.round(averagePercentage * 10) / 10,
      totalSubjects
    };
  };

  const getOverallGrade = (percentage: number) => {
    if (percentage >= 90) return { grade: 'A+', color: '#4caf50' };
    if (percentage >= 80) return { grade: 'A', color: '#4caf50' };
    if (percentage >= 70) return { grade: 'B+', color: '#8bc34a' };
    if (percentage >= 60) return { grade: 'B', color: '#8bc34a' };
    if (percentage >= 50) return { grade: 'C+', color: '#ffeb3b' };
    if (percentage >= 40) return { grade: 'C', color: '#ffeb3b' };
    if (percentage >= 33) return { grade: 'D', color: '#ff9800' };
    return { grade: 'F', color: '#f44336' };
  };

  const getPerformanceTrend = (subjectId: string) => {
    // Compare current semester with previous semester
    const currentKey = `${selectedExamType}_${selectedSemester}_${selectedYear}`;
    const currentSemesterIndex = semesters.indexOf(selectedSemester);
    
    if (currentSemesterIndex <= 0) return null; // No previous semester to compare
    
    const previousSemester = semesters[currentSemesterIndex - 1];
    const previousKey = `${selectedExamType}_${previousSemester}_${selectedYear}`;
    
    const currentMarks = marksData[currentKey]?.[subjectId]?.marks;
    const previousMarks = marksData[previousKey]?.[subjectId]?.marks;
    
    if (currentMarks === undefined || previousMarks === undefined) return null;
    
    if (currentMarks > previousMarks) return { trend: 'up', color: 'success.main' };
    if (currentMarks < previousMarks) return { trend: 'down', color: 'error.main' };
    return { trend: 'flat', color: 'warning.main' };
  };

  const getTrendIcon = (trend: string | null) => {
    if (!trend) return null;
    
    switch (trend) {
      case 'up': return <TrendingUpIcon color="success" fontSize="small" />;
      case 'down': return <TrendingDownIcon color="error" fontSize="small" />;
      case 'flat': return <TrendingFlatIcon color="warning" fontSize="small" />;
      default: return null;
    }
  };

  const handleContactTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setOpenContactDialog(true);
  };

  const handleCloseContactDialog = () => {
    setOpenContactDialog(false);
    setSelectedTeacher(null);
  };

  if (loading && (!childInfo || subjects.length === 0)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const currentMarks = getCurrentMarks();
  const stats = calculateTotalAndPercentage();
  const overallGrade = getOverallGrade(stats.percentage);

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
          <Typography color="text.primary">Child's Marks</Typography>
        </Breadcrumbs>
      </Box>

      {childInfo ? (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <GradeIcon sx={{ mr: 1 }} />
              <Typography variant="h5" component="h1">
                {childInfo.name}'s Academic Performance
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
                  Semester
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={selectedSemester}
                    onChange={handleSemesterChange}
                    displayEmpty
                  >
                    {semesters.map(semester => (
                      <MenuItem key={semester} value={semester}>
                        Semester {semester}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Academic Year
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={selectedYear}
                    onChange={handleYearChange}
                    displayEmpty
                  >
                    {years.map(year => (
                      <MenuItem key={year} value={year}>{year}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <GradeIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Overall Performance
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 3 }}>
                    <Box
                      sx={{
                        position: 'relative',
                        display: 'inline-flex',
                        width: 150,
                        height: 150
                      }}
                    >
                      <CircularProgress
                        variant="determinate"
                        value={Math.min(stats.percentage, 100)}
                        size={150}
                        thickness={5}
                        sx={{ color: overallGrade.color }}
                      />
                      <Box
                        sx={{
                          top: 0,
                          left: 0,
                          bottom: 0,
                          right: 0,
                          position: 'absolute',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="h4" component="div" sx={{ color: overallGrade.color }}>
                          {overallGrade.grade}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {stats.percentage}%
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Total Marks:
                      </Typography>
                      <Typography variant="h6">
                        {stats.totalMarks}/{stats.totalFullMarks}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Subjects:
                      </Typography>
                      <Typography variant="h6">
                        {stats.totalSubjects}/{subjects.length}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Contact Teachers
                  </Typography>
                  
                  {teachers.length > 0 ? (
                    <Box sx={{ mt: 1 }}>
                      {teachers.map((teacher) => (
                        <Button
                          key={teacher.id}
                          variant="outlined"
                          size="small"
                          startIcon={<EmailIcon />}
                          onClick={() => handleContactTeacher(teacher)}
                          sx={{ mr: 1, mb: 1 }}
                        >
                          {teacher.name}
                        </Button>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No teachers available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 0 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs 
                    value={tabValue} 
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                  >
                    {examTypes.map((type, index) => (
                      <Tab 
                        key={type} 
                        label={type.charAt(0).toUpperCase() + type.slice(1)} 
                        id={`marks-tab-${index}`}
                        aria-controls={`marks-tabpanel-${index}`}
                      />
                    ))}
                  </Tabs>
                </Box>
                
                {examTypes.map((type, index) => (
                  <div
                    key={type}
                    role="tabpanel"
                    hidden={tabValue !== index}
                    id={`marks-tabpanel-${index}`}
                    aria-labelledby={`marks-tab-${index}`}
                  >
                    {tabValue === index && (
                      <Box sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                          {type.charAt(0).toUpperCase() + type.slice(1)} Marks - Semester {selectedSemester} ({selectedYear})
                        </Typography>
                        
                        {subjects.length > 0 ? (
                          loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                              <CircularProgress size={24} sx={{ mr: 1 }} />
                              <Typography variant="body2" color="text.secondary">
                                Loading {type.toLowerCase()} marks...
                              </Typography>
                            </Box>
                          ) : (
                            <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                              <Table>
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Subject</TableCell>
                                    <TableCell>Code</TableCell>
                                    <TableCell>Marks</TableCell>
                                    <TableCell>Grade</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Trend</TableCell>
                                    <TableCell>Remarks</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {subjects.map(subject => {
                                    const mark = currentMarks[subject.id];
                                    const isPassing = mark?.marks >= mark?.passMarks;
                                    const trend = getPerformanceTrend(subject.id);
                                    
                                    return (
                                      <TableRow key={subject.id}>
                                        <TableCell>{subject.name}</TableCell>
                                        <TableCell>{subject.code}</TableCell>
                                        <TableCell>
                                          {mark ? (
                                            <Typography>
                                              {mark.marks}/{mark.fullMarks}
                                            </Typography>
                                          ) : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                          {mark ? (
                                            <Typography
                                              sx={{
                                                fontWeight: 'bold',
                                                color: isPassing ? 'success.main' : 'error.main'
                                              }}
                                            >
                                              {mark.grade}
                                            </Typography>
                                          ) : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                          {mark ? (
                                            <Typography
                                              sx={{
                                                color: isPassing ? 'success.main' : 'error.main',
                                                fontWeight: 'medium'
                                              }}
                                            >
                                              {isPassing ? 'Pass' : 'Fail'}
                                            </Typography>
                                          ) : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                          {trend ? (
                                            <Tooltip title={`Compared to semester ${semesters[semesters.indexOf(selectedSemester) - 1]}`}>
                                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                {getTrendIcon(trend.trend)}
                                              </Box>
                                            </Tooltip>
                                          ) : 'N/A'}
                                        </TableCell>
                                        <TableCell>{mark?.remarks || '-'}</TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          )
                        ) : (
                          <Typography variant="subtitle1" sx={{ textAlign: 'center', py: 4 }}>
                            No subjects found for your child's class.
                          </Typography>
                        )}
                        
                        {subjects.length > 0 && Object.keys(currentMarks).length === 0 && (
                          <Typography variant="subtitle1" sx={{ textAlign: 'center', py: 4 }}>
                            No marks available for {type} in semester {selectedSemester}, {selectedYear}.
                          </Typography>
                        )}
                      </Box>
                    )}
                  </div>
                ))}
              </Paper>
            </Grid>
          </Grid>
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

      {/* Contact Teacher Dialog */}
      <Dialog
        open={openContactDialog}
        onClose={handleCloseContactDialog}
        maxWidth="sm"
        fullWidth
      >
        {selectedTeacher && (
          <>
            <DialogTitle>
              Contact {selectedTeacher.name}
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="subtitle1" gutterBottom>
                Subject: {selectedTeacher.subject}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Email: {selectedTeacher.email}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                You can contact the teacher directly via email regarding your child's performance.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseContactDialog}>Close</Button>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<EmailIcon />}
                onClick={() => {
                  window.location.href = `mailto:${selectedTeacher.email}?subject=Regarding ${childInfo?.name}'s Performance`;
                }}
              >
                Send Email
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
}

export default ParentMarks;