import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  Card,
  CardContent,
  CardActions,
  Chip
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { format } from 'date-fns';

interface Note {
  id: string;
  title: string;
  subject: string;
  googleDriveUrl?: string;
  uploadDate: string;
  teacherId: string;
  teacherName: string;
  createdAt?: string;
  updatedAt?: string;
}

// Computer Science subjects (same as attendance management)
const CS_SUBJECTS = [
  'Data Structures',
  'Algorithms', 
  'Operating Systems',
  'DBMS',
  'Computer Networks',
  'Software Engineering'
];

function NotesManagement() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [googleDriveUrl, setGoogleDriveUrl] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState('');
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'teacher') {
      navigate('/login');
      return;
    }

    fetchNotes();
  }, [currentUser, navigate]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      console.log('Fetching notes for teacher:', currentUser?.uid);
      
      if (!currentUser?.uid) {
        console.log('No current user found');
        setNotes([]);
        setLoading(false);
        return;
      }
      
      const notesRef = collection(db, 'notes');
      
      try {
        // Try with orderBy first
        const q = query(
          notesRef, 
          where('teacherId', '==', currentUser.uid), 
          orderBy('uploadDate', 'desc')
        );
        
        const notesSnapshot = await getDocs(q);
        console.log('Notes query with orderBy result:', notesSnapshot.size, 'documents found');
        
        const notesList: Note[] = [];
        notesSnapshot.forEach((doc) => {
          const noteData = { id: doc.id, ...doc.data() } as Note;
          console.log('Found note:', noteData);
          notesList.push(noteData);
        });
        
        setNotes(notesList);
        console.log('Total notes loaded:', notesList.length);
        
      } catch (indexError: any) {
        console.log('OrderBy query failed, trying simple query:', indexError?.message || indexError);
        
        // Fallback: simple query without orderBy
        const simpleQuery = query(notesRef, where('teacherId', '==', currentUser.uid));
        const notesSnapshot = await getDocs(simpleQuery);
        console.log('Simple query result:', notesSnapshot.size, 'documents found');
        
        const notesList: Note[] = [];
        notesSnapshot.forEach((doc) => {
          const noteData = { id: doc.id, ...doc.data() } as Note;
          notesList.push(noteData);
        });
        
        // Sort manually by date
        notesList.sort((a, b) => {
          const dateA = new Date(a.uploadDate || a.createdAt || '1970-01-01');
          const dateB = new Date(b.uploadDate || b.createdAt || '1970-01-01');
          return dateB.getTime() - dateA.getTime();
        });
        
        setNotes(notesList);
        console.log('Total notes loaded (fallback):', notesList.length);
      }
      
      setLoading(false);
    } catch (error: any) {
      console.error('Detailed error fetching notes:', {
        error,
        code: error?.code,
        message: error?.message
      });
      
      showSnackbar('Failed to load notes: ' + (error?.message || 'Unknown error'), 'error');
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setSubject('');
    setGoogleDriveUrl('');
    setEditMode(false);
    setCurrentNoteId('');
  };

  const validateForm = () => {
    if (!title.trim()) {
      showSnackbar('Please enter a title', 'error');
      return false;
    }
    if (!subject) {
      showSnackbar('Please select a subject', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) return;
    
    // Check if user is authenticated
    if (!currentUser) {
      showSnackbar('You must be logged in to save notes', 'error');
      return;
    }
    
    try {
      setUploading(true);
      setUploadStatus('Saving note...');
      console.log('Starting note save process...');
      
      const noteData = {
        title: title.trim(),
        subject,
        googleDriveUrl: googleDriveUrl.trim(),
        teacherId: currentUser.uid,
        teacherName: currentUser.name || currentUser.email || 'Teacher',
        uploadDate: format(new Date(), 'yyyy-MM-dd'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('Note data to save:', noteData);
      
      if (editMode) {
        // Update existing note
        setUploadStatus('Updating note...');
        console.log('Updating existing note...');
        const noteRef = doc(db, 'notes', currentNoteId);
        const updateData: any = { 
          ...noteData,
          updatedAt: new Date().toISOString()
        };
        
        await updateDoc(noteRef, updateData);
        console.log('Note updated successfully');
        setUploadStatus('Note updated!');
        showSnackbar('Note updated successfully', 'success');
      } else {
        // Add new note
        setUploadStatus('Creating new note...');
        console.log('Adding new note to database...');
        const docRef = await addDoc(collection(db, 'notes'), noteData);
        console.log('Note added successfully with ID:', docRef.id);
        setUploadStatus('Note created!');
        showSnackbar('Note saved successfully', 'success');
      }
      
      setUploadStatus('Refreshing notes list...');
      resetForm();
      await fetchNotes(); // Wait for notes to be fetched
      setUploadStatus('');
      
    } catch (error: any) {
      console.error('Detailed error saving note:', {
        error,
        code: error?.code,
        message: error?.message,
        details: error
      });
      
      let errorMessage = 'Failed to save note';
      
      if (error?.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your authentication.';
      } else if (error?.code === 'unauthenticated') {
        errorMessage = 'You are not authenticated. Please log in again.';
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      showSnackbar(errorMessage, 'error');
    } finally {
      setUploading(false);
      setUploadStatus('');
    }
  };

  const handleEdit = (note: Note) => {
    setTitle(note.title);
    setSubject(note.subject);
    setGoogleDriveUrl(note.googleDriveUrl || '');
    setEditMode(true);
    setCurrentNoteId(note.id);
  };

  const handleDelete = (note: Note) => {
    setNoteToDelete(note);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!noteToDelete) return;
    
    try {
      setLoading(true);
      
      // Delete document from Firestore
      await deleteDoc(doc(db, 'notes', noteToDelete.id));
      
      showSnackbar('Note deleted successfully', 'success');
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      showSnackbar('Failed to delete note', 'error');
    } finally {
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
      setLoading(false);
    }
  };

  const handleFilterChange = () => {
    fetchNotes();
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  if (loading && notes.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate('/teacher')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
          <Link color="inherit" onClick={() => navigate('/teacher')} sx={{ cursor: 'pointer' }}>
            Dashboard
          </Link>
          <Typography color="text.primary">Notes Management</Typography>
        </Breadcrumbs>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              {editMode ? 'Edit Note' : 'Create New Note'}
            </Typography>
            <form onSubmit={handleSubmit}>
              <TextField
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
                margin="normal"
                required
              />
              
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Subject</InputLabel>
                <Select
                  value={subject}
                  label="Subject"
                  onChange={(e) => setSubject(e.target.value)}
                >
                  {CS_SUBJECTS.map((subj) => (
                    <MenuItem key={subj} value={subj}>{subj}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                label="Google Drive Link (Optional)"
                value={googleDriveUrl}
                onChange={(e) => setGoogleDriveUrl(e.target.value)}
                fullWidth
                margin="normal"
                placeholder="https://drive.google.com/..."
                helperText="Share a Google Drive link for file attachments"
              />
              
              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={uploading}
                  startIcon={uploading ? <CircularProgress size={20} /> : <SaveIcon />}
                >
                  {uploading ? 'Saving...' : editMode ? 'Update Note' : 'Save Note'}
                </Button>
                
                {editMode && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={resetForm}
                    fullWidth
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                )}
              </Box>
              
              {uploadStatus && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="primary">
                    {uploadStatus}
                  </Typography>
                </Box>
              )}
            </form>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              My Notes
            </Typography>
            
            {notes.length > 0 ? (
              <Grid container spacing={2}>
                {notes.map((note) => (
                  <Grid item xs={12} sm={6} key={note.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <DescriptionIcon sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="h6" component="div">
                            {note.title}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                          <Chip label={`Subject: ${note.subject}`} size="small" />
                          <Chip label={`Date: ${note.uploadDate}`} size="small" />
                        </Box>
                        
                        {note.googleDriveUrl && (
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            📁 Google Drive attachment available
                          </Typography>
                        )}
                      </CardContent>
                      <CardActions>
                        {note.googleDriveUrl && (
                          <Button size="small" href={note.googleDriveUrl} target="_blank" rel="noopener noreferrer">
                            Open Drive Link
                          </Button>
                        )}
                        <Button size="small" startIcon={<EditIcon />} onClick={() => handleEdit(note)}>
                          Edit
                        </Button>
                        <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => handleDelete(note)}>
                          Delete
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="subtitle1" sx={{ mt: 2, textAlign: 'center' }}>
                No notes found. Create your first note!
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the note "{noteToDelete?.title}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default NotesManagement;