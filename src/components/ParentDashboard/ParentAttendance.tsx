import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
import './ParentAttendance.css';

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
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <CheckCircleIcon fontSize="small" style={{ color: '#2ecc71' }} />
            <span>Present</span>
          </span>
        );
      case 'absent':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <CancelIcon fontSize="small" style={{ color: '#e74c3c' }} />
            <span>Absent</span>
          </span>
        );
      case 'late':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <WarningIcon fontSize="small" style={{ color: '#f39c12' }} />
            <span>Late</span>
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <InfoIcon fontSize="small" />
            <span>{status || 'Unknown'}</span>
          </span>
        );
    }
  };

  const getMonthYearString = () => {
    const [year, month] = selectedMonth.split('-');
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  if (loading && !childInfo) {
    return (
      <div className="parent-attendance-management">
        <div className="parent-attendance-background-gradient"></div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p style={{ color: 'white', fontSize: '1.2rem', fontWeight: '500' }}>Loading attendance data...</p>
        </div>
      </div>
    );
  }

  const stats = getAttendanceStats();
  const filteredRecords = getFilteredRecords();

  return (
    <div className="parent-attendance-management">
      <div className="parent-attendance-background-gradient"></div>
      
      <div className="parent-attendance-container">
        <div className="parent-attendance-header">
          <div className="parent-attendance-title-section">
            <h1>{childInfo?.name}'s Attendance</h1>
            <p>Track your child's attendance records and statistics</p>
          </div>
          
          <div className="breadcrumb-navigation">
            <span 
              className="breadcrumb-link" 
              onClick={() => navigate('/parent')}
            >
              Dashboard
            </span>
            <span className="breadcrumb-current"> / Attendance</span>
          </div>
        </div>

        {childInfo ? (
          <>
            <div className="summary-section">
              <div className="summary-title">
                Attendance Summary
              </div>
              
              <div className="summary-grid">
                <div className="summary-card">
                  <div className="summary-label">Department</div>
                  <div style={{ color: 'white', fontSize: '1.2rem', fontWeight: '600' }}>
                    {childInfo.class}
                  </div>
                </div>
                
                <div className="summary-card">
                  <div className="summary-label">Roll Number</div>
                  <div style={{ color: 'white', fontSize: '1.2rem', fontWeight: '600' }}>
                    {childInfo.rollNumber}
                  </div>
                </div>
                
                <div className="summary-card">
                  <div className="summary-label">Select Month</div>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="summary-control"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const date = new Date();
                      date.setMonth(date.getMonth() - i);
                      const value = date.toISOString().slice(0, 7);
                      const [year, month] = value.split('-');
                      return (
                        <option key={value} value={value}>
                          {months[parseInt(month) - 1]} {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
                
                <div className="summary-card">
                  <div className="summary-label">Filter by Subject</div>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="summary-control"
                  >
                    <option value="all">All Subjects</option>
                    {Array.from(subjects).map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="statistics-section">
              <div className="statistic-card">
                <CheckCircleIcon className="statistic-icon statistic-present" />
                <div className="statistic-number">{stats.present}</div>
                <div className="statistic-label">Present</div>
              </div>
              
              <div className="statistic-card">
                <CancelIcon className="statistic-icon statistic-absent" />
                <div className="statistic-number">{stats.absent}</div>
                <div className="statistic-label">Absent</div>
              </div>
              
              <div className="statistic-card">
                <WarningIcon className="statistic-icon statistic-late" />
                <div className="statistic-number">{stats.late}</div>
                <div className="statistic-label">Late</div>
              </div>
              
              <div className="statistic-card">
                <CalendarMonthIcon className="statistic-icon statistic-total" />
                <div className="statistic-number">{stats.total}</div>
                <div className="statistic-label">Total</div>
              </div>
            </div>

            <div className="attendance-table-container">
              <div className="table-header">
                Attendance Records
              </div>
              
              {filteredRecords.length > 0 ? (
                <table className="attendance-table">
                  <thead className="table-head">
                    <tr>
                      <th className="table-header-cell">Date</th>
                      <th className="table-header-cell">Subject</th>
                      <th className="table-header-cell">Status</th>
                      <th className="table-header-cell">Teacher</th>
                      <th className="table-header-cell">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="table-row">
                        <td className="table-cell">{formatDate(record.date)}</td>
                        <td className="table-cell">
                          <div>{record.subject}</div>
                          <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                            {record.subjectCode}
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className={`status-chip status-${(record.status || '').toLowerCase()}`}>
                            {getStatusChip(record.status)}
                          </span>
                        </td>
                        <td className="table-cell">{record.teacher}</td>
                        <td className="table-cell">{record.remarks || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state-card">
                  <CalendarMonthIcon className="empty-state-icon" />
                  <div className="empty-state-title">No Records Found</div>
                  <div className="empty-state-message">
                    No attendance records found for {getMonthYearString()}
                    {selectedSubject !== 'all' ? ` in ${selectedSubject}` : ''}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state-card">
            <InfoIcon className="empty-state-icon" />
            <div className="empty-state-title">No Child Associated</div>
            <div className="empty-state-message">
              No child associated with this account. Please contact the school administrator.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ParentAttendance;