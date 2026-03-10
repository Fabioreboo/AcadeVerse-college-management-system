import{ useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AttendanceManagement.css';
import { format } from 'date-fns';
import { 
  getComputerScienceStudents, 
  getAttendanceByDate, 
  saveAttendanceBatch 
} from '../../services/dbUtils';

interface Student {
  id: string;
  name: string;
  rollNumber?: string;
  studentId?: string;
  email?: string;
  department?: string;
}

interface AttendanceRecord {
  studentId: string;
  subject: string;
  date: string;
  status: 'Present' | 'Absent';
}

const CS_SUBJECTS = [
  'Data Structures',
  'Algorithms', 
  'Operating Systems',
  'DBMS',
  'Computer Networks',
  'Software Engineering'
];

function AttendanceManagement() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'teacher') {
      navigate('/login');
      return;
    }

    const fetchStudents = async () => {
      try {
        setLoading(true);
        console.log('Fetching Computer Science students...');
        
        // First try to get CS students specifically
        const result = await getComputerScienceStudents();
        
        if (result.success && result.data) {
          const studentsData = result.data as Student[];
          if (studentsData.length > 0) {
            console.log(`Found ${studentsData.length} CS students:`, studentsData);
            setStudents(studentsData);
          } else {
            console.log('No CS students found, trying to get all students...');
            // Fallback: get all students if CS filter doesn't work
            const { getStudents } = await import('../../services/dbUtils');
            const allStudentsResult = await getStudents();
            if (allStudentsResult.success && allStudentsResult.data) {
              const allStudentsData = allStudentsResult.data as Student[];
              if (allStudentsData.length > 0) {
                console.log(`Found ${allStudentsData.length} total students:`, allStudentsData);
                setStudents(allStudentsData);
              } else {
                console.log('No students found in database');
                setStudents([]);
                setMessage({text: 'No students found in database. Please ensure students are enrolled.', type: 'error'});
              }
            } else {
              setStudents([]);
              setMessage({text: 'No students found in database. Please ensure students are enrolled.', type: 'error'});
            }
          }
        } else {
          setStudents([]);
          setMessage({text: 'Failed to load students. Please check your connection.', type: 'error'});
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching students:', error);
        setMessage({text: 'Failed to load students data. Please check your connection.', type: 'error'});
        setLoading(false);
      }
    };

    fetchStudents();
  }, [currentUser, navigate]);

  useEffect(() => {
    const fetchAttendanceRecords = async () => {
      if (!selectedDate || !selectedSubject) return;

      try {
        setLoading(true);
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        const result = await getAttendanceByDate(selectedSubject, dateString);

        if (result.success && result.data) {
          // Convert array to record format
          const recordsMap: Record<string, AttendanceRecord> = {};
          const attendanceData = result.data;
          attendanceData.forEach((record: any) => {
            if (record.studentId && record.subject && record.date && record.status) {
              recordsMap[record.studentId] = {
                studentId: record.studentId,
                subject: record.subject,
                date: record.date,
                status: record.status
              };
            }
          });

          // Initialize records for students without attendance data
          students.forEach(student => {
            if (!recordsMap[student.id]) {
              recordsMap[student.id] = {
                studentId: student.id,
                subject: selectedSubject,
                date: dateString,
                status: 'Present'
              };
            }
          });

          setAttendanceRecords(recordsMap);
        } else {
          // Initialize empty records for all students
          const newRecords: Record<string, AttendanceRecord> = {};
          students.forEach(student => {
            newRecords[student.id] = {
              studentId: student.id,
              subject: selectedSubject,
              date: dateString,
              status: 'Present'
            };
          });
          setAttendanceRecords(newRecords);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching attendance records:', error);
        setMessage({text: 'Failed to load attendance records', type: 'error'});
        setLoading(false);
      }
    };

    fetchAttendanceRecords();
  }, [selectedDate, selectedSubject, students]);

  const handleAttendanceToggle = (studentId: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status: prev[studentId]?.status === 'Present' ? 'Absent' : 'Present'
      }
    }));
  };

  const markAllPresent = () => {
    const updatedRecords = { ...attendanceRecords };
    students.forEach(student => {
      if (updatedRecords[student.id]) {
        updatedRecords[student.id].status = 'Present';
      }
    });
    setAttendanceRecords(updatedRecords);
  };

  const markAllAbsent = () => {
    const updatedRecords = { ...attendanceRecords };
    students.forEach(student => {
      if (updatedRecords[student.id]) {
        updatedRecords[student.id].status = 'Absent';
      }
    });
    setAttendanceRecords(updatedRecords);
  };

  const handleSaveAttendance = async () => {
    if (!selectedDate || !selectedSubject) {
      setMessage({text: 'Please select subject and date', type: 'error'});
      return;
    }

    try {
      setSaving(true);
      const attendanceData = Object.values(attendanceRecords);
      const result = await saveAttendanceBatch(attendanceData);
      
      if (result.success) {
        setMessage({text: 'Attendance saved successfully', type: 'success'});
      } else {
        setMessage({text: 'Failed to save attendance', type: 'error'});
      }
      setSaving(false);
    } catch (error) {
      console.error('Error saving attendance:', error);
      setMessage({text: 'Failed to save attendance', type: 'error'});
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendanceRecords).filter(record => record.status === 'Present').length;
  const absentCount = Object.values(attendanceRecords).filter(record => record.status === 'Absent').length;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading student data...</p>
      </div>
    );
  }

  return (
    <div className="attendance-management">
      {/* Background gradient */}
      <div className="attendance-background-gradient"></div>
      
      {/* Full-width container with padding */}
      <div className="attendance-container">
        {/* Breadcrumb Navigation */}
        <div className="breadcrumb-navigation">
          <button className="breadcrumb-link" onClick={() => navigate('/teacher')}>
            ← Dashboard
          </button>
          <span className="breadcrumb-current">Attendance Management</span>
        </div>

        {/* Header Section */}
        <div className="attendance-header">
          <div className="attendance-title-section">
            <h1>Computer Science Department</h1>
            <p>Attendance Management System</p>
          </div>
        </div>
        
        {/* Controls */}
        <div className="filters-section">
          <h2 className="filters-title">Attendance Controls</h2>
          <div className="filters-grid">
            <div className="filter-card">
              <label className="filter-label">Subject</label>
              <select
                className="filter-control"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="">Select Subject</option>
                {CS_SUBJECTS.map((subject) => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-card">
              <label className="filter-label">Date</label>
              <input
                type="date"
                className="filter-control"
                value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setSelectedDate(e.target.valueAsDate)}
              />
            </div>
          </div>
        </div>

        {selectedSubject && selectedDate ? (
          <>
            {/* Attendance Statistics */}
            <div className="statistics-section">
              <div className="statistic-card">
                <div className="statistic-icon statistic-present">✓</div>
                <div className="statistic-number">{presentCount}</div>
                <div className="statistic-label">Present</div>
              </div>
              <div className="statistic-card">
                <div className="statistic-icon statistic-absent">✗</div>
                <div className="statistic-number">{absentCount}</div>
                <div className="statistic-label">Absent</div>
              </div>
              <div className="statistic-card">
                <div className="statistic-icon statistic-total">👥</div>
                <div className="statistic-number">{students.length}</div>
                <div className="statistic-label">Total Students</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="actions-section">
              <button
                className="action-button action-button-present"
                onClick={markAllPresent}
              >
                ✓ Mark All Present
              </button>
              <button
                className="action-button action-button-absent"
                onClick={markAllAbsent}
              >
                ✗ Mark All Absent
              </button>
            </div>

            {students.length > 0 ? (
              <>
                {/* Students Table */}
                <div className="attendance-table-container">
                  <h3 className="table-header">Student Attendance</h3>
                  <div className="table-responsive">
                    <table className="attendance-table">
                      <thead className="table-head">
                        <tr>
                          <th className="table-header-cell">Student ID</th>
                          <th className="table-header-cell">Name</th>
                          <th className="table-header-cell">Email</th>
                          <th className="table-header-cell table-header-cell-center">Status</th>
                          <th className="table-header-cell table-header-cell-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => {
                          const isPresent = attendanceRecords[student.id]?.status === 'Present';
                          return (
                            <tr className="table-row" key={student.id}>
                              <td className="table-cell">
                                <div className="student-info">
                                  <div className="student-avatar">
                                    {getInitials(student.name || 'S')}
                                  </div>
                                  <span>{student.studentId || student.rollNumber || student.id}</span>
                                </div>
                              </td>
                              <td className="table-cell">
                                {student.name}
                              </td>
                              <td className="table-cell">
                                {student.email || 'N/A'}
                              </td>
                              <td className="table-cell table-cell-center">
                                <span className={`status-chip ${isPresent ? 'status-present' : 'status-absent'}`}>
                                  {isPresent ? '✓ Present' : '✗ Absent'}
                                </span>
                              </td>
                              <td className="table-cell table-cell-center">
                                <div className="switch-container">
                                  <label className="switch">
                                    <input
                                      type="checkbox"
                                      checked={isPresent}
                                      onChange={() => handleAttendanceToggle(student.id)}
                                    />
                                    <span className="slider"></span>
                                  </label>
                                  <span className="switch-label">
                                    {isPresent ? 'Present' : 'Absent'}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Save Button */}
                <div className="save-section">
                  <div className="date-display">
                    {selectedSubject} - {selectedDate ? format(selectedDate, 'MMMM dd, yyyy') : ''}
                  </div>
                  <button
                    className="save-button"
                    onClick={handleSaveAttendance}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : '💾 Save Attendance'}
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state-card">
                <div className="empty-state-icon">📚</div>
                <h3 className="empty-state-title">No Computer Science students found</h3>
                <p className="empty-state-message">
                  Please ensure students are properly enrolled in the system.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state-card">
            <div className="empty-state-icon">📅</div>
            <h3 className="empty-state-title">Ready to Take Attendance</h3>
            <p className="empty-state-message">
              Please select a subject and date to view and manage attendance for Computer Science students.
            </p>
          </div>
        )}
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

export default AttendanceManagement;