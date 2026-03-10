import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
import './ParentMarks.css';

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
      <div className="parent-marks-management">
        <div className="parent-marks-background-gradient"></div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p style={{ color: 'white', fontSize: '1.2rem' }}>Loading marks...</p>
        </div>
      </div>
    );
  }

  const currentMarks = getCurrentMarks();
  const stats = calculateTotalAndPercentage();
  const overallGrade = getOverallGrade(stats.percentage);

  return (
    <div className="parent-marks-management">
      {/* Background gradient */}
      <div className="parent-marks-background-gradient"></div>
      
      <div className="parent-marks-container">
        {/* Header section */}
        <div className="parent-marks-header">
          <div className="parent-marks-title-section">
            <h1>
              <GradeIcon style={{ verticalAlign: 'middle', marginRight: '8px' }} />
              {childInfo?.name}'s Academic Performance
            </h1>
            <p>View your child's academic performance and results</p>
          </div>
          
          <div className="breadcrumb-navigation">
            <span 
              className="breadcrumb-link" 
              onClick={() => navigate('/parent')}
            >
              <ArrowBackIcon style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Dashboard
            </span>
            <span className="breadcrumb-current">Marks</span>
          </div>
        </div>
        
        {childInfo ? (
          <>
            {/* Performance section */}
            <div className="performance-section">
              <h2 className="performance-title">Academic Performance</h2>
              <div className="performance-grid">
                <div className="performance-card">
                  <label className="performance-label">Department</label>
                  <div style={{ color: 'white', fontSize: '1.2rem', fontWeight: '600' }}>
                    {childInfo.class}
                  </div>
                </div>
                
                <div className="performance-card">
                  <label className="performance-label">Roll Number</label>
                  <div style={{ color: 'white', fontSize: '1.2rem', fontWeight: '600' }}>
                    {childInfo.rollNumber}
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
                <div style={{ 
                  display: 'flex', 
                  overflowX: 'auto', 
                  marginBottom: '20px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  {examTypes.map((type, index) => (
                    <button
                      key={type}
                      onClick={() => handleTabChange(null as any, index)}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: tabValue === index ? 'rgba(52, 152, 219, 0.3)' : 'transparent',
                        color: 'white',
                        border: 'none',
                        borderBottom: tabValue === index ? '2px solid #3498db' : 'none',
                        cursor: 'pointer',
                        fontWeight: tabValue === index ? 'bold' : 'normal',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
                
                {examTypes.map((type, index) => (
                  <div
                    key={type}
                    role="tabpanel"
                    style={{ display: tabValue !== index ? 'none' : 'block' }}
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
                              <div className="loading-spinner" style={{ width: '24px', height: '24px', marginRight: '10px' }}></div>
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
                                          <span title={`Compared to Semester ${semesters[semesters.indexOf(selectedSemester) - 1]}`}>
                                            {trend.trend === 'up' && <TrendingUpIcon className="trend-up" style={{ fontSize: '1rem' }} />}
                                            {trend.trend === 'down' && <TrendingDownIcon className="trend-down" style={{ fontSize: '1rem' }} />}
                                            {trend.trend === 'flat' && <TrendingFlatIcon className="trend-flat" style={{ fontSize: '1rem' }} />}
                                          </span>
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
                              <GradeIcon style={{ fontSize: '4rem' }} />
                            </div>
                            <h3 className="empty-state-title">No Subjects Found</h3>
                            <p className="empty-state-message">
                              No subjects found for your child's class.
                            </p>
                          </div>
                        )}
                        
                        {subjects.length > 0 && Object.keys(currentMarks).length === 0 && (
                          <div className="empty-state-card">
                            <div className="empty-state-icon">
                              <GradeIcon style={{ fontSize: '4rem' }} />
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
          </>
        ) : (
          <div className="empty-state-card">
            <div className="empty-state-icon">
              <InfoIcon style={{ fontSize: '4rem' }} />
            </div>
            <h3 className="empty-state-title">No Child Associated</h3>
            <p className="empty-state-message">
              No child associated with this account. Please contact the school administrator.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ParentMarks;