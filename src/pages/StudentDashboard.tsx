import {
  Assignment as AssignmentIcon,
  Book as BookIcon,
  CalendarMonth as CalendarIcon,
  Dashboard as DashboardIcon,
  ExitToApp as LogoutIcon
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './StudentDashboard.css';

function StudentDashboard() {
  const navigate = useNavigate();
  const { currentUser, loading, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Show loading spinner while authentication state is being determined
  if (loading) {
    console.log('StudentDashboard: Still loading authentication state');
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </div>
    );
  }

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigateTo = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  if (!currentUser || currentUser.role !== 'student') {
    console.log('StudentDashboard: User not authenticated or role mismatch', { 
      currentUser: currentUser, 
      expectedRole: 'student' 
    });
    return (
      <div className="student-dashboard">
        <div className="dashboard-background-gradient"></div>
        <div className="unauthorized">
          <div className="unauthorized-card">
            <Typography variant="h2">Unauthorized Access</Typography>
            <Typography variant="body1">Please login as a student.</Typography>
            <Button 
              variant="contained" 
              className="login-btn"
              onClick={() => navigate('/login')}
              sx={{ mt: 2 }}
            >
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  console.log('StudentDashboard: User authenticated', { user: currentUser });

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/student' },
    { text: 'Attendance', icon: <CalendarIcon />, path: '/student/attendance' },
    { text: 'Notes', icon: <BookIcon />, path: '/student/notes' },
    { text: 'Marks', icon: <AssignmentIcon />, path: '/student/marks' },
  ];

  const drawer = (
    <Box sx={{ width: 250 }} role="presentation">
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Avatar sx={{ width: 64, height: 64, mb: 1, bgcolor: 'secondary.main' }}>
          {currentUser.name.charAt(0)}
        </Avatar>
        <Typography variant="subtitle1">{currentUser.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          Student
        </Typography>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} onClick={() => navigateTo(item.path)} disablePadding>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem onClick={handleLogout} disablePadding>
          <ListItemIcon><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <div className="student-dashboard">
      <div className="dashboard-background-gradient"></div>
      
      <div className="dashboard-container">
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
        >
          {drawer}
        </Drawer>
        
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1>Welcome, {currentUser.name}</h1>
            <p>Here's an overview of your academic information</p>
          </div>
          <div className="user-profile">
            <div className="user-avatar">
              {currentUser.name.charAt(0)}
            </div>
            <button 
              onClick={handleLogout}
              className="logout-btn"
            >
              Logout
            </button>
          </div>
        </div>
        
        <div className="content-area">
          <h2 className="overview-title">Academic Overview</h2>
          
          <div className="cards-grid">
            <div className="dashboard-card" onClick={() => navigate('/student/attendance')}>
              <div className="card-header">
                <h3 className="card-title">Attendance</h3>
                <CalendarIcon className="card-icon" />
              </div>
              <p className="card-description">View your attendance records and track your class participation</p>
              <button className="manage-btn">View Attendance</button>
            </div>
            
            <div className="dashboard-card" onClick={() => navigate('/student/notes')}>
              <div className="card-header">
                <h3 className="card-title">Subject Notes</h3>
                <BookIcon className="card-icon" />
              </div>
              <p className="card-description">Access notes and study materials for your subjects</p>
              <button className="manage-btn">View Notes</button>
            </div>
            
            <div className="dashboard-card" onClick={() => navigate('/student/marks')}>
              <div className="card-header">
                <h3 className="card-title">Marks & Grades</h3>
                <AssignmentIcon className="card-icon" />
              </div>
              <p className="card-description">Check your academic performance and grades</p>
              <button className="manage-btn">View Marks</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;