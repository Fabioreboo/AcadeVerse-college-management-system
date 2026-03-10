import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  CircularProgress,
  Breadcrumbs,
  Link,
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
import './StudentMarks.css';

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
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p style={{ color: 'white', fontSize: '1.2rem' }}>Loading marks...</p>
      </div>
    );
  }

  const currentMarks = getCurrentMarks();
  const stats = calculateTotalAndPercentage();
  const overallGrade = getOverallGrade(stats.percentage);

  return (
    <div className="student-marks-management">
      {/* Background gradient */}
      <div className="student-marks-background-gradient"></div>
      
      <div className="student-marks-container">
        {/* Header section */}
        <div className="student-marks-header">
          <div className="student-marks-title-section">
            <h1>
              <GradeIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              My Marks
            </h1>
            <p>View your academic performance and results</p>
          </div>
          
          <div className="breadcrumb-navigation">
            <span className="breadcrumb-link" onClick={() => navigate('/student')}>
              <ArrowBackIcon sx={{ verticalAlign: 'middle', mr: 0.5 }} />
              Dashboard
            </span>
            <span className="breadcrumb-current">Marks</span>
          </div>
        </div>
        
        {/* Performance section */}
        <div className="performance-section">
          <h2 className="performance-title">Academic Performance</h2>
          <div className="performance-grid">
            <div className="performance-card">
              <label className="performance-label">Overall Grade</label>
              <div style={{ 
                fontSize: '3rem', 
                fontWeight: 'bold', 
                color: overallGrade.color,
                margin: '10px 0'
              }}>
                {overallGrade.grade}
              </div>
              <div style={{ color: 'white' }}>
                {stats.percentage}% ({stats.totalMarks}/{stats.totalFullMarks})
              </div>
            </div>
            
            <div className="performance-card">
              <label className="performance-label">Semester</label>
              <select
                className="performance-control"
                value={selectedSemester}
                onChange={handleSemesterChange}
              >
                {semesters.map(semester => (
                  <option key={semester} value={semester}>
                    Semester {semester}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="performance-card">
              <label className="performance-label">Academic Year</label>
              <select
                className="performance-control"
                value={selectedYear}
                onChange={handleYearChange}
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Marks table section */}
        <div className="marks-table-container">
          <div className="marks-info-section">
            <span className="marks-info-text">Select exam type to view marks:</span>
          </div>
          
          <div style={{ width: '100%', maxWidth: '1200px' }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              style={{ marginBottom: '20px' }}
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
                    <h3 className="table-header">
                      {type.charAt(0).toUpperCase() + type.slice(1)} Marks - Semester {selectedSemester} ({selectedYear})
                    </h3>
                    
                    {subjects.length > 0 ? (
                      loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                          <CircularProgress size={24} style={{ marginRight: '10px' }} />
                          <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                            Loading {type.toLowerCase()} marks...
                          </span>
                        </div>
                      ) : (
                        <table className="marks-table">
                          <thead className="table-head">
                            <tr>
                              <th className="table-header-cell">Subject</th>
                              <th className="table-header-cell">Code</th>
                              <th className="table-header-cell">Marks</th>
                              <th className="table-header-cell">Grade</th>
                              <th className="table-header-cell">Status</th>
                              <th className="table-header-cell">Trend</th>
                              <th className="table-header-cell">Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subjects.map(subject => {
                              const mark = currentMarks[subject.id];
                              const isPassing = mark?.marks >= mark?.passMarks;
                              const trend = getPerformanceTrend(subject.id);
                              
                              return (
                                <tr key={subject.id} className="table-row">
                                  <td className="table-cell">{subject.name}</td>
                                  <td className="table-cell">{subject.code}</td>
                                  <td className="table-cell">
                                    {mark ? (
                                      <span>
                                        {mark.marks}/{mark.fullMarks}
                                      </span>
                                    ) : 'N/A'}
                                  </td>
                                  <td className="table-cell">
                                    {mark ? (
                                      <span
                                        className={isPassing ? 'grade-pass' : 'grade-fail'}
                                      >
                                        {mark.grade}
                                      </span>
                                    ) : 'N/A'}
                                  </td>
                                  <td className="table-cell">
                                    {mark ? (
                                      <span
                                        className={isPassing ? 'grade-pass' : 'grade-fail'}
                                      >
                                        {isPassing ? 'Pass' : 'Fail'}
                                      </span>
                                    ) : 'N/A'}
                                  </td>
                                  <td className="table-cell">
                                    {trend ? (
                                      <Tooltip title={`Compared to Semester ${semesters[semesters.indexOf(selectedSemester) - 1]}`}>
                                        <span>
                                          {trend.trend === 'up' && <TrendingUpIcon className="trend-up" fontSize="small" />}
                                          {trend.trend === 'down' && <TrendingDownIcon className="trend-down" fontSize="small" />}
                                          {trend.trend === 'flat' && <TrendingFlatIcon className="trend-flat" fontSize="small" />}
                                        </span>
                                      </Tooltip>
                                    ) : 'N/A'}
                                  </td>
                                  <td className="table-cell">{mark?.remarks || '-'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )
                    ) : (
                      <div className="empty-state-card">
                        <div className="empty-state-icon">
                          <GradeIcon sx={{ fontSize: '4rem' }} />
                        </div>
                        <h3 className="empty-state-title">No Subjects Found</h3>
                        <p className="empty-state-message">
                          No subjects found for your class.
                        </p>
                      </div>
                    )}
                    
                    {subjects.length > 0 && Object.keys(currentMarks).length === 0 && (
                      <div className="empty-state-card">
                        <div className="empty-state-icon">
                          <GradeIcon sx={{ fontSize: '4rem' }} />
                        </div>
                        <h3 className="empty-state-title">No Marks Available</h3>
                        <p className="empty-state-message">
                          No marks available for {type} in Semester {selectedSemester}, {selectedYear}.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentMarks;