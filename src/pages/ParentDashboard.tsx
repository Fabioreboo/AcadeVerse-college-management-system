import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Button as MuiButton,
  CircularProgress,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  ExitToApp as LogoutIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './ParentDashboard.css';

function ParentDashboard() {
  const navigate = useNavigate();
  const { currentUser, profileData, loading, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [childName, setChildName] = useState<string>("Student");

  // Show loading spinner while authentication state is being determined
  if (loading) {
    console.log('ParentDashboard: Still loading authentication state');
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </div>
    );
  }

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigateTo = (path: string) => {
    navigate(path);
  };

  // Fetch child's name when component mounts
  useEffect(() => {
    const fetchChildInfo = async () => {
      if (!profileData) return;

      try {
        // Try multiple approaches to find the linked student ID
        const possibleStudentIds = [
          profileData.linkedStudentId,
          profileData.studentId,
          profileData.childId,
          profileData.children?.[0]?.id,
          profileData.children?.[0]?.studentId,
          currentUser?.profileData?.linkedStudentId,
          currentUser?.profileData?.studentId,
          currentUser?.profileData?.childId,
          currentUser?.profileData?.children?.[0]?.id,
          currentUser?.profileData?.children?.[0]?.studentId
        ];
        
        let linkedStudentId = null;
        for (const id of possibleStudentIds) {
          if (id) {
            linkedStudentId = id;
            break;
          }
        }
        
        if (!linkedStudentId) {
          return;
        }
        
        // First, try to find the student in the users collection by studentId
        const usersRef = collection(db, 'users');
        const userQuery = query(usersRef, where('role', '==', 'student'), where('studentId', '==', linkedStudentId));
        const userSnapshot = await getDocs(userQuery);
        
        let studentData = null;
        
        if (!userSnapshot.empty) {
          const studentDoc = userSnapshot.docs[0];
          studentData = studentDoc.data();
        } else {
          // If not found in users, try the students collection
          const studentsRef = collection(db, 'students');
          const studentQuery = query(studentsRef, where('studentId', '==', linkedStudentId));
          const studentSnapshot = await getDocs(studentQuery);
          
          if (!studentSnapshot.empty) {
            const studentDoc = studentSnapshot.docs[0];
            studentData = studentDoc.data();
          }
        }
        
        if (!studentData) {
          // Try a more general search
          const generalQuery = query(collection(db, 'users'), where('studentId', '==', linkedStudentId));
          const generalSnapshot = await getDocs(generalQuery);
          
          if (!generalSnapshot.empty) {
            const studentDoc = generalSnapshot.docs[0];
            studentData = studentDoc.data();
          }
        }
        
        if (!studentData) {
          return;
        }
        
        const name = studentData.name || studentData.linkedStudentName || 'Unknown Student';
        setChildName(name);
        
      } catch (error) {
        console.error('Error fetching child info:', error);
      }
    };

    if (currentUser && currentUser.role === 'parent') {
      fetchChildInfo();
    }
  }, [currentUser, profileData]);

  if (!currentUser || currentUser.role !== 'parent') {
    console.log('ParentDashboard: User not authenticated or role mismatch', { 
      currentUser: currentUser, 
      expectedRole: 'parent' 
    });
    return (
      <div className="parent-dashboard">
        <div className="dashboard-background-gradient"></div>
        <div className="unauthorized">
          <div className="unauthorized-card">
            <h2>Unauthorized Access</h2>
            <p>Please login as a parent.</p>
            <MuiButton 
              variant="contained" 
              className="login-btn"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </MuiButton>
          </div>
        </div>
      </div>
    );
  }

  console.log('ParentDashboard: User authenticated', { user: currentUser });

  return (
    <div className="parent-dashboard">
      {/* Background gradient */}
      <div className="dashboard-background-gradient"></div>
      
      <div className="dashboard-container">
        {/* Header section */}
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1>Welcome</h1>
            <p>Parent of {childName}</p>
          </div>
          
          <div className="user-profile">
            <div 
              className="user-avatar"
              onClick={handleProfileMenuOpen}
            >
              {currentUser.name.charAt(0)}
            </div>
            <button 
              onClick={handleLogout}
              className="logout-btn"
            >
              Logout
            </button>
            
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={() => { handleProfileMenuClose(); }}>
                <PersonIcon fontSize="small" sx={{ mr: 1 }} />
                Profile
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </div>
        </div>
        
        {/* Content area */}
        <div className="content-area">
          <h2 className="overview-title">Academic Overview</h2>
          
          <div className="cards-grid">
            <div className="dashboard-card" onClick={() => navigateTo('/parent/attendance')}>
              <div className="card-header">
                <h3 className="card-title">Attendance</h3>
                <AssignmentIcon className="card-icon" />
              </div>
              <p className="card-description">
                View {childName}'s attendance records and statistics
              </p>
              <button className="manage-btn">
                View Attendance
              </button>
            </div>
            
            <div className="dashboard-card" onClick={() => navigateTo('/parent/marks')}>
              <div className="card-header">
                <h3 className="card-title">Academic Performance</h3>
                <DashboardIcon className="card-icon" />
              </div>
              <p className="card-description">
                Check {childName}'s marks, grades and academic progress
              </p>
              <button className="manage-btn">
                View Marks
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ParentDashboard;