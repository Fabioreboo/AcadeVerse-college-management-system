import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

// Component imports with proper typing
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const ChangePasswordPage = React.lazy(() => import('./pages/ChangePasswordPage'));

// Teacher components
const TeacherDashboard = React.lazy(() => import('./pages/TeacherDashboard'));
const AttendanceManagement = React.lazy(() => import('./components/TeacherDashboard/AttendanceManagement'));
const NotesManagement = React.lazy(() => import('./components/TeacherDashboard/NotesManagement'));
const MarksManagement = React.lazy(() => import('./components/TeacherDashboard/MarksManagement'));
const EventsManagement = React.lazy(() => import('./components/TeacherDashboard/EventsManagement'));
const DatabaseFixUtility = React.lazy(() => import('./components/TeacherDashboard/DatabaseFixUtility'));

// Student components
const StudentDashboard = React.lazy(() => import('./pages/StudentDashboard'));
const StudentAttendance = React.lazy(() => import('./components/StudentDashboard/StudentAttendance'));
const StudentNotes = React.lazy(() => import('./components/StudentDashboard/StudentNotes'));
const StudentMarks = React.lazy(() => import('./components/StudentDashboard/StudentMarks'));

// Parent components
const ParentDashboard = React.lazy(() => import('./pages/ParentDashboard'));
const ParentAttendance = React.lazy(() => import('./components/ParentDashboard/ParentAttendance'));
const ParentMarks = React.lazy(() => import('./components/ParentDashboard/ParentMarks'));
const ParentTeachers = React.lazy(() => import('./components/ParentDashboard/ParentTeachers'));

// Database test component
const DbInitializer = React.lazy(() => import('./components/DbInitializer'));

interface ProtectedRouteProps {
  role: string;
  children: React.ReactNode;
}

function ProtectedRoute({ role, children }: ProtectedRouteProps) {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // If no user is logged in, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  // If user role doesn't match the required role, redirect appropriately
  if (currentUser.role !== role) {
    switch (currentUser.role) {
      case 'teacher':
        return <Navigate to="/teacher" replace />;
      case 'student':
        return <Navigate to="/student" replace />;
      case 'parent':
        return <Navigate to="/parent" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }
  
  // User is authenticated and has the correct role
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
          </Box>
        }>
          <Routes>
            {/* Root route should go to login, not directly to any dashboard */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            
            {/* Database Test Route - Public access for testing */}
            <Route path="/test-db" element={<DbInitializer />} />
            
            {/* Teacher Routes */}
            <Route path="/teacher" element={
              <ProtectedRoute role="teacher">
                <TeacherDashboard />
              </ProtectedRoute>
            } />
            <Route path="/teacher/attendance" element={
              <ProtectedRoute role="teacher">
                <AttendanceManagement />
              </ProtectedRoute>
            } />
            <Route path="/teacher/notes" element={
              <ProtectedRoute role="teacher">
                <NotesManagement />
              </ProtectedRoute>
            } />
            <Route path="/teacher/marks" element={
              <ProtectedRoute role="teacher">
                <MarksManagement />
              </ProtectedRoute>
            } />
            <Route path="/teacher/events" element={
              <ProtectedRoute role="teacher">
                <EventsManagement />
              </ProtectedRoute>
            } />
            <Route path="/teacher/database-fix" element={
              <ProtectedRoute role="teacher">
                <DatabaseFixUtility />
              </ProtectedRoute>
            } />
            
            {/* Student Routes */}
            <Route path="/student" element={
              <ProtectedRoute role="student">
                <StudentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/student/attendance" element={
              <ProtectedRoute role="student">
                <StudentAttendance />
              </ProtectedRoute>
            } />
            <Route path="/student/notes" element={
              <ProtectedRoute role="student">
                <StudentNotes />
              </ProtectedRoute>
            } />
            <Route path="/student/marks" element={
              <ProtectedRoute role="student">
                <StudentMarks />
              </ProtectedRoute>
            } />
            
            {/* Parent Routes */}
            <Route path="/parent" element={
              <ProtectedRoute role="parent">
                <ParentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/parent/attendance" element={
              <ProtectedRoute role="parent">
                <ParentAttendance />
              </ProtectedRoute>
            } />
            <Route path="/parent/marks" element={
              <ProtectedRoute role="parent">
                <ParentMarks />
              </ProtectedRoute>
            } />
            <Route path="/parent/teachers" element={
              <ProtectedRoute role="parent">
                <ParentTeachers />
              </ProtectedRoute>
            } />
            
            {/* Catch all other routes and redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;