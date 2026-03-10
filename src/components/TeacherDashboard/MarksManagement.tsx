import {
  Info as InfoIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  Snackbar,
  Tooltip
} from '@mui/material';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import './MarksManagement.css';

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
      <div className="marks-management">
        <div className="marks-background-gradient"></div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p style={{ color: 'white', fontSize: '1.2rem', fontWeight: '500' }}>Loading marks data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="marks-management">
      <div className="marks-background-gradient"></div>
      
      <div className="marks-container">
        <div className="marks-header">
          <div className="marks-title-section">
            <h1>Marks Management</h1>
            <p>Manage and record student marks</p>
          </div>
          
          <div className="breadcrumb-navigation">
            <Link 
              className="breadcrumb-link" 
              onClick={() => navigate('/teacher')}
              sx={{ cursor: 'pointer' }}
            >
              Dashboard
            </Link>
            <span className="breadcrumb-current"> / Marks Management</span>
          </div>
        </div>

        <div className="filters-section">
          <div className="filters-title">
            Select Criteria
          </div>
          
          <div className="filters-grid">
            <div className="filter-card">
              <label className="filter-label">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="filter-control"
              >
                <option value="">Select Subject</option>
                {CS_SUBJECTS.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="filter-card">
              <label className="filter-label">Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="filter-control"
              >
                <option value="">Select Semester</option>
                {semesters.map((semester) => (
                  <option key={semester} value={semester}>
                    Semester {semester}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="filter-card">
              <label className="filter-label">Exam Type</label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="filter-control"
              >
                {examTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="filter-card">
              <label className="filter-label">Academic Year</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="filter-control"
                placeholder="e.g., 2023"
              />
            </div>
          </div>
        </div>

        {selectedSemester && selectedSubject ? (
          <>
            <div className="marks-info-section">
              <div className="marks-info-text">
                Subject: {selectedSubject} - Semester {selectedSemester}
              </div>
              <Tooltip title="Full Marks: 100, Pass Marks: 40">
                <InfoIcon className="info-icon" />
              </Tooltip>
            </div>
            
            {filteredStudents.length > 0 ? (
              <div className="marks-table-container">
                <div className="table-header">
                  Student Marks
                </div>
                
                <table className="marks-table">
                  <thead className="table-head">
                    <tr>
                      <th className="table-header-cell">Student ID</th>
                      <th className="table-header-cell">Name</th>
                      <th className="table-header-cell">Marks (out of 100)</th>
                      <th className="table-header-cell">Grade</th>
                      <th className="table-header-cell">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => {
                      const studentMark = marks[student.id] || 0;
                      const grade = calculateGrade(studentMark, 100);
                      const isPassing = studentMark >= 40;
                      
                      return (
                        <tr key={student.id} className="table-row">
                          <td className="table-cell">{student.studentId}</td>
                          <td className="table-cell">{student.name}</td>
                          <td className="table-cell">
                            <input
                              type="number"
                              value={studentMark === 0 ? '' : studentMark}
                              onChange={(e) => handleMarkChange(student.id, e.target.value)}
                              className="marks-input"
                              min="0"
                              max="100"
                            />
                          </td>
                          <td className="table-cell">
                            <span className={isPassing ? 'grade-pass' : 'grade-fail'}>
                              {grade}
                            </span>
                          </td>
                          <td className="table-cell">
                            <input
                              type="text"
                              placeholder="Add remarks"
                              value={remarks[student.id] || ''}
                              onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                              className="remarks-input"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                <div className="save-section">
                  <button
                    className="save-button"
                    onClick={handleSaveMarks}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <CircularProgress size={20} style={{ color: 'white' }} />
                        Saving...
                      </>
                    ) : (
                      <>
                        <SaveIcon />
                        Save Marks
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state-card">
                <InfoIcon className="empty-state-icon" />
                <div className="empty-state-title">No Students Found</div>
                <div className="empty-state-message">No students found for the selected criteria.</div>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state-card">
            <InfoIcon className="empty-state-icon" />
            <div className="empty-state-title">Select Criteria</div>
            <div className="empty-state-message">Please select subject and semester to manage marks.</div>
          </div>
        )}
      </div>

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
    </div>
  );
}

export default MarksManagement;