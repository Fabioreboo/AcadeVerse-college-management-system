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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Breadcrumbs,
  Link,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Book as BookIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../services/firebase';
import { format, parseISO } from 'date-fns';

// Computer Science subjects (same as attendance and teacher components)
const CS_SUBJECTS = [
  'Data Structures',
  'Algorithms', 
  'Operating Systems',
  'DBMS',
  'Computer Networks',
  'Software Engineering'
];

interface Note {
  id: string;
  title: string;
  subject: string;  // This is the subject name (e.g., "Algorithms")
  googleDriveUrl?: string;
  teacherId: string;
  teacherName: string;
  uploadDate: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

function StudentNotes() {
  const navigate = useNavigate();
  const { currentUser, profileData } = useAuth();
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [viewNoteDialogOpen, setViewNoteDialogOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  
  const [downloadingFile, setDownloadingFile] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'student') {
      navigate('/login');
      return;
    }

    fetchNotes();
  }, [currentUser, navigate, profileData]);

  const fetchNotes = async () => {
    if (!currentUser || !profileData) return;

    try {
      setLoading(true);
      
      console.log('Student profile data:', {
        class: profileData.class,
        section: profileData.section,
        profileData
      });
      
      // Fetch all notes (since teachers don't save class/section in notes)
      const notesRef = collection(db, 'notes');
      const q = query(
        notesRef,
        orderBy('createdAt', 'desc')
      );
      const notesSnapshot = await getDocs(q);
      const notesList: Note[] = [];
      
      console.log(`Found ${notesSnapshot.docs.length} total notes`);
      
      notesSnapshot.forEach((doc) => {
        const noteData = doc.data();
        console.log('Found note:', { id: doc.id, ...noteData });
        notesList.push({ id: doc.id, ...noteData } as Note);
      });
      
      setNotes(notesList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching notes:', error);
      setLoading(false);
    }
  };

  const handleViewNote = (note: Note) => {
    setCurrentNote(note);
    setViewNoteDialogOpen(true);
  };

  const handleCloseViewDialog = () => {
    setViewNoteDialogOpen(false);
  };

  const handleDownloadFile = async (note: Note) => {
    if (!note.googleDriveUrl) {
      console.log('No Google Drive URL for this note');
      return;
    }

    try {
      // Open Google Drive URL in new tab
      window.open(note.googleDriveUrl, '_blank');
    } catch (error) {
      console.error('Error opening Google Drive link:', error);
      setDownloadError('Failed to open file. Please try again later.');
    }
  };

  const getFilteredNotes = () => {
    let filtered = [...notes];
    
    // Filter by subject
    if (selectedSubject !== 'all') {
      filtered = filtered.filter(note => note.subject === selectedSubject);
    }
    
    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(query) ||
        note.subject.toLowerCase().includes(query) ||
        note.teacherName.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  if (loading && notes.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const filteredNotes = getFilteredNotes();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate('/student')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
          <Link color="inherit" onClick={() => navigate('/student')} sx={{ cursor: 'pointer' }}>
            Dashboard
          </Link>
          <Typography color="text.primary">Notes</Typography>
        </Breadcrumbs>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          <BookIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Class Notes
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search Notes"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, content, subject, or teacher"
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Filter by Subject</InputLabel>
              <Select
                value={selectedSubject}
                label="Filter by Subject"
                onChange={(e) => setSelectedSubject(e.target.value)}
                startAdornment={<FilterListIcon color="action" sx={{ mr: 1 }} />}
              >
                <MenuItem value="all">All Subjects</MenuItem>
                {CS_SUBJECTS.map(subject => (
                  <MenuItem key={subject} value={subject}>
                    {subject}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {filteredNotes.length > 0 ? (
          <Grid container spacing={3}>
            {filteredNotes.map(note => {
              const createdDate = parseISO(note.createdAt);
              const formattedDate = format(createdDate, 'MMM dd, yyyy');
              
              return (
                <Grid item xs={12} md={6} lg={4} key={note.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="div" gutterBottom>
                        {note.title}
                      </Typography>
                      
                      <Chip 
                        label={note.subject}
                        color="primary"
                        size="small"
                        sx={{ mb: 1 }}
                      />
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Teacher: {note.teacherName}
                      </Typography>
                      
                      <Typography variant="caption" color="text.secondary">
                        Posted on: {formattedDate}
                      </Typography>
                      
                      <Divider sx={{ my: 1.5 }} />
                      
                      {note.googleDriveUrl && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <DescriptionIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                          <Typography variant="caption" color="text.secondary">
                            Google Drive File Available
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                    <CardActions>
                      <Button size="small" onClick={() => handleViewNote(note)}>
                        View Details
                      </Button>
                      {note.googleDriveUrl && (
                        <Button 
                          size="small" 
                          startIcon={<DownloadIcon />}
                          onClick={() => handleDownloadFile(note)}
                        >
                          Open File
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Typography variant="subtitle1" sx={{ textAlign: 'center', py: 4 }}>
            No notes found. {searchQuery || selectedSubject !== 'all' ? 'Try changing your filters.' : ''}
          </Typography>
        )}
      </Paper>

      {/* View Note Dialog */}
      <Dialog open={viewNoteDialogOpen} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
        {currentNote && (
          <>
            <DialogTitle>
              {currentNote.title}
              <Typography variant="subtitle2" color="text.secondary">
                {currentNote.subject} | Teacher: {currentNote.teacherName}
              </Typography>
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="body1" paragraph>
                This note is available for {currentNote.subject}.
              </Typography>
              
              {currentNote.googleDriveUrl && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Attached File:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <DescriptionIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="body2">
                      Google Drive File
                    </Typography>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownloadFile(currentNote)}
                      sx={{ ml: 2 }}
                    >
                      Open File
                    </Button>
                  </Box>
                </Box>
              )}
              
              {downloadError && (
                <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                  {downloadError}
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseViewDialog}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
}

export default StudentNotes;