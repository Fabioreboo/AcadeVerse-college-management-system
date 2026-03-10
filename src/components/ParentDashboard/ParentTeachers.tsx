import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Button,
  CircularProgress,
  Breadcrumbs,
  Link,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tooltip,
  Rating
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  School as SchoolIcon,
  Subject as SubjectIcon,
  Message as MessageIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface Teacher {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  subjects: string[];
  classes: string[];
  sections: string[];
  photoURL?: string;
  bio?: string;
  experience?: string;
  qualifications?: string[];
  rating?: number;
}

interface ChildInfo {
  id: string;
  name: string;
  class: string;
  section: string;
}

function ParentTeachers() {
  const navigate = useNavigate();
  const { currentUser, profileData } = useAuth();
  
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [childInfo, setChildInfo] = useState<ChildInfo | null>(null);
  const [openContactDialog, setOpenContactDialog] = useState(false);
  
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'parent') {
      navigate('/login');
      return;
    }

    fetchChildInfo();
  }, [currentUser, navigate]);

  useEffect(() => {
    if (childInfo) {
      fetchTeachers();
    }
  }, [childInfo]);

  const fetchChildInfo = async () => {
    if (!profileData) return;

    try {
      // In a real application, you would fetch the child's information from Firestore
      // For now, we'll assume the parent has a childId field in their profile
      const childId = profileData.childId;
      
      if (!childId) {
        console.error('No child associated with this parent account');
        setLoading(false);
        return;
      }
      
      // Fetch child's information
      const studentsRef = collection(db, 'users');
      const q = query(studentsRef, where('uid', '==', childId));
      const studentSnapshot = await getDocs(q);
      
      if (studentSnapshot.empty) {
        console.error('Child not found');
        setLoading(false);
        return;
      }
      
      const studentDoc = studentSnapshot.docs[0];
      const studentData = studentDoc.data();
      
      setChildInfo({
        id: studentDoc.id,
        name: studentData.displayName,
        class: studentData.class,
        section: studentData.section
      });
      
    } catch (error) {
      console.error('Error fetching child info:', error);
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    if (!childInfo) return;

    try {
      setLoading(true);
      
      // Fetch teachers who teach the child's class and section
      const teachersRef = collection(db, 'users');
      const q = query(
        teachersRef,
        where('role', '==', 'teacher'),
        where('classes', 'array-contains', childInfo.class),
        orderBy('displayName')
      );
      
      const teachersSnapshot = await getDocs(q);
      const teachersList: Teacher[] = [];
      
      teachersSnapshot.forEach((doc) => {
        const teacherData = doc.data() as Teacher;
        // Only include teachers who teach the child's section
        if (teacherData.sections && teacherData.sections.includes(childInfo.section)) {
          teachersList.push({ id: doc.id, ...teacherData });
        }
      });
      
      setTeachers(teachersList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setLoading(false);
    }
  };

  const handleTeacherClick = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleContactTeacher = () => {
    setOpenContactDialog(true);
  };

  const handleCloseContactDialog = () => {
    setOpenContactDialog(false);
    setMessageText('');
  };

  const handleSendMessage = () => {
    // In a real application, you would send the message to the teacher
    // For now, we'll just log it to the console
    if (selectedTeacher && messageText.trim()) {
      console.log(`Sending message to ${selectedTeacher.displayName}: ${messageText}`);
      // Here you would typically save the message to Firestore
      
      // Close the dialog and reset the message text
      setOpenContactDialog(false);
      setMessageText('');
      
      // Show a success message (in a real app, you'd use a snackbar or toast)
      alert('Message sent successfully!');
    }
  };

  const getFilteredTeachers = () => {
    if (!searchQuery) return teachers;
    
    const query = searchQuery.toLowerCase();
    return teachers.filter(teacher => 
      teacher.displayName.toLowerCase().includes(query) || 
      (teacher.subjects && teacher.subjects.some(subject => subject.toLowerCase().includes(query)))
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const filteredTeachers = getFilteredTeachers();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate('/parent')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
          <Link color="inherit" onClick={() => navigate('/parent')} sx={{ cursor: 'pointer' }}>
            Dashboard
          </Link>
          <Typography color="text.primary">Teachers</Typography>
        </Breadcrumbs>
      </Box>

      {childInfo ? (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SchoolIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Child's Teachers</Typography>
                </Box>
                
                <TextField
                  fullWidth
                  placeholder="Search teachers or subjects..."
                  variant="outlined"
                  size="small"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
                
                <Divider sx={{ mb: 2 }} />
                
                <Typography variant="subtitle2" gutterBottom>
                  Child Information
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Name:</strong> {childInfo.name}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Class:</strong> {childInfo.class} - {childInfo.section}
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary">
                  You can view your child's teachers and contact them regarding academic progress or any concerns.
                </Typography>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Contact Guidelines
                </Typography>
                
                <Typography variant="body2" paragraph>
                  When contacting teachers, please:
                </Typography>
                
                <Box component="ul" sx={{ pl: 2, mb: 2 }}>
                  <Typography component="li" variant="body2">
                    Be specific about your concerns or questions
                  </Typography>
                  <Typography component="li" variant="body2">
                    Mention your child's name and class
                  </Typography>
                  <Typography component="li" variant="body2">
                    Be respectful and professional
                  </Typography>
                  <Typography component="li" variant="body2">
                    Allow 24-48 hours for a response
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary">
                  For urgent matters, please contact the school administration directly.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Paper>
              <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                {filteredTeachers.length > 0 ? (
                  filteredTeachers.map((teacher, idx) => (
                    <React.Fragment key={teacher.id}>
                      <ListItem 
                        alignItems="flex-start"
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                        onClick={() => handleTeacherClick(teacher)}
                      >
                        <ListItemAvatar>
                          <Avatar 
                            src={teacher.photoURL} 
                            alt={teacher.displayName}
                            sx={{ width: 56, height: 56, mr: 2 }}
                          >
                            {!teacher.photoURL && teacher.displayName.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="h6">
                                {teacher.displayName}
                              </Typography>
                              {teacher.rating && (
                                <Rating 
                                  value={teacher.rating} 
                                  readOnly 
                                  size="small"
                                  icon={<StarIcon fontSize="inherit" />}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <React.Fragment>
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="body2" color="text.primary" gutterBottom>
                                  <SubjectIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                  <strong>Subjects:</strong> {teacher.subjects.join(', ')}
                                </Typography>
                                
                                <Typography variant="body2" color="text.primary" gutterBottom>
                                  <SchoolIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                  <strong>Classes:</strong> {teacher.classes.join(', ')}
                                </Typography>
                                
                                {teacher.experience && (
                                  <Typography variant="body2" color="text.primary">
                                    <strong>Experience:</strong> {teacher.experience}
                                  </Typography>
                                )}
                              </Box>
                              
                              <Box sx={{ display: 'flex', mt: 1, gap: 1 }}>
                                <Tooltip title="View Profile">
                                  <Button 
                                    size="small" 
                                    variant="outlined" 
                                    startIcon={<PersonIcon />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTeacherClick(teacher);
                                    }}
                                  >
                                    Profile
                                  </Button>
                                </Tooltip>
                                
                                <Tooltip title="Contact Teacher">
                                  <Button 
                                    size="small" 
                                    variant="contained" 
                                    color="primary"
                                    startIcon={<MessageIcon />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTeacher(teacher);
                                      handleContactTeacher();
                                    }}
                                  >
                                    Contact
                                  </Button>
                                </Tooltip>
                              </Box>
                            </React.Fragment>
                          }
                        />
                      </ListItem>
                      {idx < filteredTeachers.length - 1 && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                  ))
                ) : (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <SchoolIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      No teachers found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchQuery 
                        ? 'Try adjusting your search criteria.'
                        : 'There are no teachers assigned to your child\'s class and section yet.'}
                    </Typography>
                  </Box>
                )}
              </List>
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No child associated with this account
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please contact the school administrator to link your child to your account.
          </Typography>
        </Paper>
      )}

      {/* Teacher Detail Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        {selectedTeacher && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar 
                  src={selectedTeacher.photoURL} 
                  alt={selectedTeacher.displayName}
                  sx={{ width: 64, height: 64 }}
                >
                  {!selectedTeacher.photoURL && selectedTeacher.displayName.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6">{selectedTeacher.displayName}</Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    Teacher
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Contact Information
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <EmailIcon fontSize="small" sx={{ mr: 1 }} />
                      {selectedTeacher.email}
                    </Typography>
                    
                    {selectedTeacher.phone && (
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                        <PhoneIcon fontSize="small" sx={{ mr: 1 }} />
                        {selectedTeacher.phone}
                      </Typography>
                    )}
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Academic Information
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      <strong>Subjects:</strong> 
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {selectedTeacher.subjects.map(subject => (
                          <Chip 
                            key={subject} 
                            label={subject} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Typography>
                    
                    <Typography variant="body2" gutterBottom>
                      <strong>Classes:</strong> {selectedTeacher.classes.join(', ')}
                    </Typography>
                    
                    <Typography variant="body2">
                      <strong>Sections:</strong> {selectedTeacher.sections.join(', ')}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  
                  {selectedTeacher.bio && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Biography
                      </Typography>
                      <Typography variant="body2">
                        {selectedTeacher.bio}
                      </Typography>
                    </Box>
                  )}
                  
                  {selectedTeacher.experience && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Experience
                      </Typography>
                      <Typography variant="body2">
                        {selectedTeacher.experience}
                      </Typography>
                    </Box>
                  )}
                  
                  {selectedTeacher.qualifications && selectedTeacher.qualifications.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Qualifications
                      </Typography>
                      <Box component="ul" sx={{ pl: 2 }}>
                        {selectedTeacher.qualifications.map((qualification, index) => (
                          <Typography component="li" variant="body2" key={index}>
                            {qualification}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Close</Button>
              <Button 
                startIcon={<MessageIcon />} 
                variant="contained" 
                color="primary" 
                onClick={handleContactTeacher}
              >
                Contact Teacher
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Contact Teacher Dialog */}
      <Dialog
        open={openContactDialog}
        onClose={handleCloseContactDialog}
        maxWidth="sm"
        fullWidth
      >
        {selectedTeacher && (
          <>
            <DialogTitle>
              Contact {selectedTeacher.displayName}
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" paragraph>
                Send a message to {selectedTeacher.displayName} regarding your child, {childInfo?.name}.
              </Typography>
              
              <TextField
                autoFocus
                margin="dense"
                id="message"
                label="Message"
                type="text"
                fullWidth
                multiline
                rows={6}
                variant="outlined"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message here..."
                helperText={`Please be specific about your concerns or questions regarding ${childInfo?.name}'s academic progress.`}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseContactDialog}>Cancel</Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleSendMessage}
                disabled={!messageText.trim()}
              >
                Send Message
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
}

export default ParentTeachers;