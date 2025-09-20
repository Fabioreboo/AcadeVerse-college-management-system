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
  Tooltip
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  ArrowBack as ArrowBackIcon,
  Grade as GradeIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

// Computer Science subjects (same as teacher marks management)
const CS_SUBJECTS = [
  'Data Structures',
  'Algorithms', 
  'Operating Systems',
  'DBMS',
  'Computer Networks',
  'Software Engineering'
];

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
  [studentId: string]: Mark;
}

function StudentMarks() {
  const navigate = useNavigate();
  const { currentUser, profileData } = useAuth();
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [marksData, setMarksData] = useState<Record<string, MarksData>>({});
  const [loading, setLoading] = useState(true);
  
  const [selectedExamType, setSelectedExamType] = useState('Final');
  const [selectedSemester, setSelectedSemester] = useState('1');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [tabValue, setTabValue] = useState(0);
  
  const examTypes = ['Final', 'Assignment', 'Project'];
  const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];
  const years = [new Date().getFullYear().toString(), (new Date().getFullYear() - 1).toString()];

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'student') {
      navigate('/login');
      return;
    }

    fetchSubjects();
  }, [currentUser, navigate]);

  useEffect(() => {
    if (subjects.length > 0) {
      fetchMarks();
    }
  }, [subjects, selectedExamType, selectedSemester, selectedYear]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      
      // Use the same CS subjects as teacher marks management
      const subjectsList: Subject[] = CS_SUBJECTS.map((subjectName, index) => ({
        id: subjectName.replace(/\s+/g, ''), // Remove spaces for ID
        name: subjectName,
        code: `CS${(index + 1).toString().padStart(2, '0')}`, // Generate codes like CS01, CS02, etc.
        fullMarks: 100,
        passMarks: 40
      }));
      
      setSubjects(subjectsList);
      setLoading(false);
    } catch (error) {
      console.error('Error setting up subjects:', error);
      setLoading(false);
    }
  };

  const fetchMarks = async () => {
    if (!currentUser || !subjects.length) return;

    try {
      setLoading(true);
      
      console.log('🔍 Debug: Starting optimized fetchMarks for student:', currentUser.uid);
      console.log('🔍 Debug: Currently viewing - Exam type:', selectedExamType, 'Semester:', selectedSemester);
      
      // Only fetch marks for currently selected exam type and semester
      // This dramatically reduces the number of requests from 144 to 6 (one per subject)
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
        const marksDocId = `CS_${selectedSemester}_${subject.name}_${selectedExamType}_${selectedYear}`;
        
        try {
          const marksRef = doc(db, 'marks', marksDocId);
          const marksDoc = await getDoc(marksRef);
          
          if (marksDoc.exists()) {
            const docData = marksDoc.data();
            
            if (docData[currentUser.uid]) {
              console.log(`🔍 Debug: Found marks for ${subject.name}:`, docData[currentUser.uid]);
              currentMarksData[subject.id] = docData[currentUser.uid] as Mark;
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

  if (loading && subjects.length === 0) {
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
        <IconButton onClick={() => navigate('/student')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
          <Link color="inherit" onClick={() => navigate('/student')} sx={{ cursor: 'pointer' }}>
            Dashboard
          </Link>
          <Typography color="text.primary">Marks</Typography>
        </Breadcrumbs>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <GradeIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Academic Performance
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
              
              <Box sx={{ mb: 2 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Semester</InputLabel>
                  <Select
                    value={selectedSemester}
                    label="Semester"
                    onChange={handleSemesterChange}
                  >
                    {semesters.map(semester => (
                      <MenuItem key={semester} value={semester}>
                        Semester {semester}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl fullWidth>
                  <InputLabel>Academic Year</InputLabel>
                  <Select
                    value={selectedYear}
                    label="Academic Year"
                    onChange={handleYearChange}
                  >
                    {years.map(year => (
                      <MenuItem key={year} value={year}>{year}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
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
                  <>
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
                                        <Tooltip title={`Compared to Semester ${semesters[semesters.indexOf(selectedSemester) - 1]}`}>
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
                        No subjects found for your class.
                      </Typography>
                    )}
                    
                    {subjects.length > 0 && Object.keys(currentMarks).length === 0 && (
                      <Typography variant="subtitle1" sx={{ textAlign: 'center', py: 4 }}>
                        No marks available for {type} in Semester {selectedSemester}, {selectedYear}.
                      </Typography>
                    )}
                  </>
                )}
              </div>
            ))}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default StudentMarks;