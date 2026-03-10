import {
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  Edit as EditIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  Snackbar
} from '@mui/material';
import { format } from 'date-fns';
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import './NotesManagement.css';

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
      <div className="notes-management">
        <div className="notes-background-gradient"></div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p style={{ color: 'white', fontSize: '1.2rem', fontWeight: '500' }}>Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notes-management">
      <div className="notes-background-gradient"></div>
      
      <div className="notes-container">
        <div className="notes-header">
          <div className="notes-title-section">
            <h1>Notes Management</h1>
            <p>Manage and organize your course notes</p>
          </div>
          
          <div className="breadcrumb-navigation">
            <Link 
              className="breadcrumb-link" 
              onClick={() => navigate('/teacher')}
              sx={{ cursor: 'pointer' }}
            >
              Dashboard
            </Link>
            <span className="breadcrumb-current"> / Notes Management</span>
          </div>
        </div>

        <div className="notes-form-section">
          <div className="notes-form-title">
            {editMode ? 'Edit Note' : 'Create New Note'}
          </div>
          
          <div className="notes-form-grid">
            <div className="form-card">
              <form onSubmit={handleSubmit}>
                <div style={{ width: '100%', marginBottom: '20px' }}>
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="form-control"
                    placeholder="Enter note title"
                    required
                  />
                </div>
                
                <div style={{ width: '100%', marginBottom: '20px' }}>
                  <label className="form-label">Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="form-control"
                    required
                  >
                    <option value="">Select Subject</option>
                    {CS_SUBJECTS.map((subj) => (
                      <option key={subj} value={subj}>{subj}</option>
                    ))}
                  </select>
                </div>
                
                <div style={{ width: '100%', marginBottom: '20px' }}>
                  <label className="form-label">Google Drive Link (Optional)</label>
                  <input
                    type="url"
                    value={googleDriveUrl}
                    onChange={(e) => setGoogleDriveUrl(e.target.value)}
                    className="form-control"
                    placeholder="https://drive.google.com/..."
                  />
                  <div style={{ 
                    color: 'rgba(255, 255, 255, 0.7)', 
                    fontSize: '0.85rem', 
                    marginTop: '5px',
                    textAlign: 'center'
                  }}>
                    Share a Google Drive link for file attachments
                  </div>
                </div>
                
                <div className="notes-actions-section">
                  <button
                    type="submit"
                    className="action-button"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <CircularProgress size={20} style={{ marginRight: '8px' }} />
                        Saving...
                      </>
                    ) : editMode ? (
                      <>
                        <SaveIcon />
                        Update Note
                      </>
                    ) : (
                      <>
                        <SaveIcon />
                        Save Note
                      </>
                    )}
                  </button>
                  
                  {editMode && (
                    <button
                      type="button"
                      className="action-button"
                      onClick={resetForm}
                      disabled={uploading}
                      style={{ 
                        background: 'rgba(231, 76, 60, 0.2)',
                        borderColor: 'rgba(231, 76, 60, 0.5)'
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
                
                {uploadStatus && (
                  <div style={{ 
                    marginTop: '20px', 
                    textAlign: 'center',
                    color: 'white',
                    fontWeight: '500'
                  }}>
                    {uploadStatus}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
        
        <div className="notes-list-section">
          <div className="notes-list-header">
            My Notes
          </div>
          
          {notes.length > 0 ? (
            <div className="notes-grid">
              {notes.map((note) => (
                <div className="note-card" key={note.id}>
                  <div className="note-title">
                    {note.title}
                  </div>
                  
                  <div className="note-subject">
                    {note.subject}
                  </div>
                  
                  <div className="note-date">
                    Uploaded: {note.uploadDate}
                  </div>
                  
                  <div className="note-actions">
                    {note.googleDriveUrl && (
                      <a 
                        href={note.googleDriveUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="note-action-button drive-link-button"
                      >
                        Open Drive Link
                      </a>
                    )}
                    
                    <button 
                      className="note-action-button edit-button"
                      onClick={() => handleEdit(note)}
                    >
                      <EditIcon />
                      Edit
                    </button>
                    
                    <button 
                      className="note-action-button delete-button"
                      onClick={() => handleDelete(note)}
                    >
                      <DeleteIcon />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state-card">
              <DescriptionIcon className="empty-state-icon" />
              <div className="empty-state-title">No Notes Found</div>
              <div className="empty-state-message">Create your first note to get started!</div>
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
}

export default NotesManagement;