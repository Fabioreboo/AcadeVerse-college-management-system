import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, Container, Typography, TextField, Button, Paper, Alert } from '@mui/material';
import { auth } from '../services/firebase';

const ChangePasswordPage: React.FC = () => {
  const { currentUser, changePassword, changePasswordByStudentId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [studentId, setStudentId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Get role from URL parameters or current user
  const urlParams = new URLSearchParams(location.search);
  const roleFromUrl = urlParams.get('role');
  const userRole = currentUser?.role || roleFromUrl || 'student';
  
  // Set the appropriate title based on user role
  const getPageTitle = () => {
    switch(userRole) {
      case 'parent':
        return 'Change Parent Password';
      case 'teacher':
        return 'Change Teacher Password';
      default:
        return 'Change Student Password';
    }
  };
  
  const getIdLabel = () => {
    switch(userRole) {
      case 'parent':
        return 'Parent ID';
      case 'teacher':
        return 'Teacher ID';
      default:
        return 'Student ID';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate ID
    if (!studentId) {
      setError(`Please enter a ${getIdLabel()}`);
      return;
    }

    // Validate password
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      // Use the appropriate function based on user role
      let success;
      if (currentUser) {
        // If user is logged in, use direct password change
        success = await changePassword(newPassword);
      } else {
        // Otherwise use ID-based password change
        success = await changePasswordByStudentId(studentId, newPassword);
      }
      
      if (success) {
        setSuccess(true);
        setTimeout(() => {
          // Redirect to login page
          navigate('/login');
        }, 2000);
      } else {
        setError(`Failed to change password. Please check the ${getIdLabel()} and try again.`);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            {getPageTitle()}
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>
            Password changed successfully! Redirecting to login page...
          </Alert>}

          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
            {!currentUser && (
              <TextField
                margin="normal"
                required
                fullWidth
                id="studentId"
                label={getIdLabel()}
                name="studentId"
                autoComplete="off"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                autoFocus
              />
            )}
            <TextField
              margin="normal"
              required
              fullWidth
              name="newPassword"
              label="New Password"
              type="password"
              id="newPassword"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={success}
            >
              Change Password
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => navigate(`/login?role=${userRole}`)}
              sx={{ mt: 1 }}
            >
              Back to Login
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ChangePasswordPage;