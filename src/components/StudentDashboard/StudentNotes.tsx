import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button as MuiButton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Book as BookIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { format, parseISO } from 'date-fns';
import './StudentNotes.css';

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
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p style={{ color: 'white', fontSize: '1.2rem' }}>Loading notes...</p>
      </div>
    );
  }

  const filteredNotes = getFilteredNotes();

  return (
    <div className="student-notes-management">
      {/* Background gradient */}
      <div className="student-notes-background-gradient"></div>
      
      <div className="student-notes-container">
        {/* Header section */}
        <div className="student-notes-header">
          <div className="student-notes-title-section">
            <h1>
              <BookIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Class Notes
            </h1>
            <p>Browse and download your class notes</p>
          </div>
          
          <div className="breadcrumb-navigation">
            <span className="breadcrumb-link" onClick={() => navigate('/student')}>
              <ArrowBackIcon sx={{ verticalAlign: 'middle', mr: 0.5 }} />
              Dashboard
            </span>
            <span className="breadcrumb-current">Notes</span>
          </div>
        </div>
        
        {/* Filter section */}
        <div className="notes-filter-section">
          <h2 className="notes-filter-title">Filter Notes</h2>
          <div className="notes-filter-grid">
            <div className="filter-card">
              <label className="filter-label">Search Notes</label>
              <input
                type="text"
                className="filter-control"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, subject, or teacher"
              />
            </div>
            
            <div className="filter-card">
              <label className="filter-label">Filter by Subject</label>
              <select
                className="filter-control"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="all">All Subjects</option>
                {CS_SUBJECTS.map(subject => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Notes list section */}
        <div className="notes-list-section">
          <h2 className="notes-list-header">Available Notes</h2>
          
          {filteredNotes.length > 0 ? (
            <div className="notes-grid">
              {filteredNotes.map(note => {
                const createdDate = parseISO(note.createdAt);
                const formattedDate = format(createdDate, 'MMM dd, yyyy');
                
                return (
                  <div className="note-card" key={note.id}>
                    <h3 className="note-title">{note.title}</h3>
                    
                    <div className="note-subject">{note.subject}</div>
                    
                    <div className="note-teacher">Teacher: {note.teacherName}</div>
                    
                    <div className="note-date">Posted on: {formattedDate}</div>
                    
                    <div className="note-actions">
                      <button 
                        className="note-action-button view-button"
                        onClick={() => handleViewNote(note)}
                      >
                        View Details
                      </button>
                      
                      {note.googleDriveUrl && (
                        <button 
                          className="note-action-button download-button"
                          onClick={() => handleDownloadFile(note)}
                        >
                          <DownloadIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
                          Open File
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state-card">
              <div className="empty-state-icon">
                <BookIcon sx={{ fontSize: '4rem' }} />
              </div>
              <h3 className="empty-state-title">No Notes Found</h3>
              <p className="empty-state-message">
                {searchQuery || selectedSubject !== 'all' 
                  ? 'Try changing your filters.' 
                  : 'No notes have been uploaded yet.'}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* View Note Dialog */}
      <Dialog open={viewNoteDialogOpen} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
        {currentNote && (
          <>
            <DialogTitle>
              {currentNote.title}
              <DialogContentText>
                {currentNote.subject} | Teacher: {currentNote.teacherName}
              </DialogContentText>
            </DialogTitle>
            <DialogContent dividers>
              <DialogContentText paragraph>
                This note is available for {currentNote.subject}.
              </DialogContentText>
              
              {currentNote.googleDriveUrl && (
                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  <DialogContentText gutterBottom>
                    Attached File:
                  </DialogContentText>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <DescriptionIcon color="primary" style={{ marginRight: '8px' }} />
                    <DialogContentText>
                      Google Drive File
                    </DialogContentText>
                    <MuiButton 
                      variant="outlined" 
                      size="small" 
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownloadFile(currentNote)}
                      style={{ marginLeft: '16px' }}
                    >
                      Open File
                    </MuiButton>
                  </div>
                </div>
              )}
              
              {downloadError && (
                <DialogContentText color="error" style={{ marginTop: '16px' }}>
                  {downloadError}
                </DialogContentText>
              )}
            </DialogContent>
            <DialogActions>
              <MuiButton onClick={handleCloseViewDialog}>Close</MuiButton>
            </DialogActions>
          </>
        )}
      </Dialog>
    </div>
  );
}

export default StudentNotes;