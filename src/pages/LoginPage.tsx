import  { useState, useEffect, useRef } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Box,
  CircularProgress,
  Grow,
  Fade,
  Slide,
  
  Avatar
} from '@mui/material';
import { 
  School as SchoolIcon, 
  SupervisorAccount as TeacherIcon,
  Person as PersonIcon,
  FamilyRestroom as ParentIcon,
  ErrorOutline as ErrorIcon
} from '@mui/icons-material';
import './LoginPage.css';

interface Credentials {
  email: string;
  password: string;
}

function LoginPage() {
  const navigate = useNavigate();
  const { currentUser, login, loading, error: authError } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showElements, setShowElements] = useState(false);
  const [clickedTab, setClickedTab] = useState<number | null>(null);
  
  // Refs for floating labels
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setShowElements(true);
    // Auto-focus email field on load
    if (emailRef.current) {
      setTimeout(() => emailRef.current?.focus(), 600);
    }
    
    // Check URL parameters for role
    const urlParams = new URLSearchParams(window.location.search);
    const role = urlParams.get('role');
    if (role) {
      switch (role) {
        case 'teacher':
          setActiveTab(0);
          break;
        case 'student':
          setActiveTab(1);
          break;
        case 'parent':
          setActiveTab(2);
          break;
      }
    }
    
    // Clear any potential localStorage items that might be causing persistence issues
    console.log('LoginPage mounted, clearing potential localStorage items');
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('firebase:')) {
        console.log('Removing firebase localStorage item:', key);
        localStorage.removeItem(key);
      }
    });
  }, []);

  useEffect(() => {
    // If user is already logged in, redirect them to their dashboard
    if (currentUser) {
      console.log('LoginPage: User already authenticated, redirecting to dashboard', { user: currentUser });
      const role = currentUser.role;
      navigate(`/${role}`);
    }
  }, [currentUser, navigate]);

  const handleTabChange = (newValue: number) => {
    // Add ripple effect
    setClickedTab(newValue);
    setTimeout(() => setClickedTab(null), 600);
    
    setActiveTab(newValue);
    setError('');
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
    
    // Update URL with the selected role
    const role = getRoleFromTabIndex(newValue);
    navigate(`/login?role=${role}`, { replace: true });
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
  
    if (!credentials.email || !credentials.password) {
      setError('Please fill in all fields');
      setIsSubmitting(false);
      return;
    }
  
    try {
      // Pass the selected role from the tab
      const selectedRole = getRoleFromTabIndex(activeTab);
      const success = await login({...credentials, role: selectedRole});
      if (!success) {
        setError('Invalid credentials or role mismatch. Please check your email and password.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleFromTabIndex = (roleIndex: number) => {
    switch (roleIndex) {
      case 0: return 'teacher';
      case 1: return 'student';
      case 2: return 'parent';
      default: return 'teacher';
    }
  };

  const getRoleIcon = (index: number) => {
    switch (index) {
      case 0: return <TeacherIcon />;
      case 1: return <PersonIcon />;
      case 2: return <ParentIcon />;
      default: return <SchoolIcon />;
    }
  };

  const getRoleName = (index: number): string => {
    switch (index) {
      case 0: return 'Teacher';
      case 1: return 'Student';
      case 2: return 'Parent';
      default: return 'User';
    }
  };

  // Update the input label based on the active tab
  const getEmailLabel = () => {
    switch (activeTab) {
      case 0: return 'Email';
      case 1: return 'Student ID';
      case 2: return 'Parent ID';
      default: return 'Email';
    }
  };

  if (loading) {
    console.log('LoginPage: Still loading authentication state');
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress size={64} sx={{ color: 'var(--primary-color)' }} />
      </Box>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <Grow in={showElements} timeout={800}>
            <div className="avatar-container">
              <Avatar className="avatar">
                {getRoleIcon(activeTab)}
              </Avatar>
            </div>
          </Grow>
          
          <Slide direction="up" in={showElements} timeout={1000}>
            <div>
              <h1>AcadeVerse</h1>
              <p>Welcome back! Please sign in to continue</p>
            </div>
          </Slide>
        </div>

        <Fade in={showElements} timeout={1200}>
          <div className="login-tabs">
            {[0, 1, 2].map((index) => (
              <button
                key={index}
                className={`tab ${activeTab === index ? 'active' : ''} ${clickedTab === index ? 'ripple-active' : ''}`}
                onClick={() => handleTabChange(index)}
                aria-label={`Sign in as ${getRoleName(index)}`}
              >
                {getRoleIcon(index)}
                {getRoleName(index)}
              </button>
            ))}
          </div>
        </Fade>

        <form className="login-form" onSubmit={handleSubmit}>
          {(error || authError) && (
            <Slide direction="right" in={!!(error || authError)} timeout={500}>
              <div className="error-message">
                <ErrorIcon fontSize="small" />
                {error || authError}
              </div>
            </Slide>
          )}

          <div className="form-group">
            <div className="form-input-container">
              <input
                ref={emailRef}
                type={activeTab === 0 ? "email" : "text"}
                id="email"
                name="email"
                value={credentials.email}
                onChange={handleInputChange}
                placeholder=" "
                required
                autoComplete="email"
              />
              <label htmlFor="email">{getEmailLabel()}</label>
            </div>
          </div>

          <div className="form-group">
            <div className="form-input-container">
              <input
                ref={passwordRef}
                type="password"
                id="password"
                name="password"
                value={credentials.password}
                onChange={handleInputChange}
                placeholder=" "
                required
                autoComplete="current-password"
              />
              <label htmlFor="password">Password</label>
            </div>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner"></span>
                Signing in...
              </>
            ) : (
              `Sign in as ${getRoleName(activeTab)}`
            )}
          </button>
          
          <div className="forgot-password-container">
            <button 
              type="button" 
              className="forgot-password-button"
              onClick={() => navigate(`/change-password?role=${getRoleFromTabIndex(activeTab)}`)}
            >
              Forgot Password?
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;