import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './TeacherDashboard.css';

function TeacherDashboard() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  // Check if user is authenticated and has teacher role
  if (!currentUser) {
    navigate('/login');
    return null; // Return null to prevent rendering the rest of the component
  }

  if (currentUser.role !== 'teacher') {
    navigate('/login');
    return null; // Return null to prevent rendering the rest of the component
  }

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login');
    }
  };

  const dashboardCards = [
    { 
      title: 'Attendance Management', 
      description: 'View and update student attendance records', 
      icon: '📋',
      action: () => navigate('/teacher/attendance')
    },
    { 
      title: 'Notes Management', 
      description: 'Upload and manage subject notes for students', 
      icon: '📝',
      action: () => navigate('/teacher/notes')
    },
    { 
      title: 'Marks Management', 
      description: 'Record and update student marks and grades', 
      icon: '💯',
      action: () => navigate('/teacher/marks')
    },
    { 
      title: 'Database Fix Utility', 
      description: 'Fix student database inconsistency issues', 
      icon: '🔧',
      action: () => navigate('/teacher/database-fix')
    }
  ];

  return (
    <div className="teacher-dashboard">
      {/* Background gradient */}
      <div className="dashboard-background-gradient"></div>
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1>Welcome back, {currentUser.name}!</h1>
            <p>Here's an overview of your teaching activities</p>
          </div>
          <div className="user-profile">
            <div className="user-info">
              <div className="name">{currentUser.name}</div>
              <div className="role">Teacher</div>
            </div>
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

        {/* Main Content */}
        <div className="content-area">
          <h2 className="overview-title">Dashboard Overview</h2>
          <div className="date-display">
            Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>

          {/* Dashboard Cards */}
          <div className="cards-grid">
            {dashboardCards.map((card, index) => (
              <div 
                key={index} 
                className="dashboard-card"
                onClick={card.action}
              >
                <div className="card-header">
                  <h3 className="card-title">{card.title}</h3>
                  <span className="card-icon">{card.icon}</span>
                </div>
                <p className="card-description">{card.description}</p>
                <button className="manage-btn">
                  Manage
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeacherDashboard;