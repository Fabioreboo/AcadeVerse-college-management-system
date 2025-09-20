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
  Card,
  CardContent,
  CardActions,
  Snackbar,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import {
  NavigateNext as NavigateNextIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Event as EventIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { collection, getDocs, query, where, doc, setDoc, getDoc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { format } from 'date-fns';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string; // ISO string
  startTime: string;
  endTime: string;
  location: string;
  type: string; // 'academic', 'cultural', 'sports', 'holiday', 'other'
  createdBy: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  targetAudience: string[]; // 'all', 'teachers', 'students', 'parents', specific classes
}

function EventsManagement() {
  const navigate = useNavigate();
  const { currentUser, profileData } = useAuth();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Partial<Event>>({});
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  
  const eventTypes = ['academic', 'cultural', 'sports', 'holiday', 'other'];
  const audienceOptions = ['all', 'teachers', 'students', 'parents', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5'];
  
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'teacher') {
      navigate('/login');
      return;
    }

    fetchEvents();
  }, [currentUser, navigate]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const eventsRef = collection(db, 'events');
      const q = query(eventsRef, orderBy('date', 'desc'));
      const eventsSnapshot = await getDocs(q);
      const eventsList: Event[] = [];
      
      eventsSnapshot.forEach((doc) => {
        eventsList.push({ id: doc.id, ...doc.data() } as Event);
      });
      
      setEvents(eventsList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching events:', error);
      showSnackbar('Failed to load events', 'error');
      setLoading(false);
    }
  };

  const handleAddEvent = () => {
    const today = new Date();
    setCurrentEvent({
      title: '',
      description: '',
      date: today.toISOString(),
      startTime: '09:00',
      endTime: '10:00',
      location: '',
      type: 'academic',
      createdBy: currentUser?.uid || '',
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
      targetAudience: ['all']
    });
    setEditMode(false);
    setDialogOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setCurrentEvent({
      ...event,
      updatedAt: new Date().toISOString()
    });
    setEditMode(true);
    setDialogOpen(true);
  };

  const handleDeleteEvent = (eventId: string) => {
    setEventToDelete(eventId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;

    try {
      setSaving(true);
      await deleteDoc(doc(db, 'events', eventToDelete));
      
      setEvents(prev => prev.filter(event => event.id !== eventToDelete));
      showSnackbar('Event deleted successfully', 'success');
      setDeleteDialogOpen(false);
      setEventToDelete(null);
      setSaving(false);
    } catch (error) {
      console.error('Error deleting event:', error);
      showSnackbar('Failed to delete event', 'error');
      setSaving(false);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleInputChange = (field: keyof Event, value: any) => {
    setCurrentEvent(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setCurrentEvent(prev => ({
        ...prev,
        date: date.toISOString()
      }));
    }
  };

  const handleAudienceChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setCurrentEvent(prev => ({
      ...prev,
      targetAudience: event.target.value as string[]
    }));
  };

  const validateEventForm = () => {
    if (!currentEvent.title || currentEvent.title.trim() === '') {
      showSnackbar('Please enter a title', 'error');
      return false;
    }
    if (!currentEvent.date) {
      showSnackbar('Please select a date', 'error');
      return false;
    }
    if (!currentEvent.startTime) {
      showSnackbar('Please enter start time', 'error');
      return false;
    }
    if (!currentEvent.endTime) {
      showSnackbar('Please enter end time', 'error');
      return false;
    }
    if (!currentEvent.type) {
      showSnackbar('Please select an event type', 'error');
      return false;
    }
    if (!currentEvent.targetAudience || currentEvent.targetAudience.length === 0) {
      showSnackbar('Please select target audience', 'error');
      return false;
    }
    return true;
  };

  const handleSaveEvent = async () => {
    if (!validateEventForm()) return;

    try {
      setSaving(true);
      
      const eventData = {
        title: currentEvent.title,
        description: currentEvent.description || '',
        date: currentEvent.date,
        startTime: currentEvent.startTime,
        endTime: currentEvent.endTime,
        location: currentEvent.location || '',
        type: currentEvent.type,
        createdBy: currentUser?.uid,
        creatorName: profileData?.name || 'Unknown Teacher',
        createdAt: currentEvent.createdAt,
        updatedAt: new Date().toISOString(),
        targetAudience: currentEvent.targetAudience
      };
      
      if (editMode && currentEvent.id) {
        // Update existing event
        await updateDoc(doc(db, 'events', currentEvent.id), eventData);
        
        setEvents(prev => 
          prev.map(event => 
            event.id === currentEvent.id ? { ...event, ...eventData, id: currentEvent.id! } : event
          )
        );
        
        showSnackbar('Event updated successfully', 'success');
      } else {
        // Create new event
        const newEventRef = doc(collection(db, 'events'));
        await setDoc(newEventRef, eventData);
        
        const newEvent = { id: newEventRef.id, ...eventData } as Event;
        setEvents(prev => [newEvent, ...prev]);
        
        showSnackbar('Event added successfully', 'success');
      }
      
      setDialogOpen(false);
      setSaving(false);
    } catch (error) {
      console.error('Error saving event:', error);
      showSnackbar('Failed to save event', 'error');
      setSaving(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const getFilteredEvents = () => {
    let filtered = [...events];
    
    if (filterType !== 'all') {
      filtered = filtered.filter(event => event.type === filterType);
    }
    
    if (filterDate) {
      const filterDateStr = format(filterDate, 'yyyy-MM-dd');
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.date);
        return format(eventDate, 'yyyy-MM-dd') === filterDateStr;
      });
    }
    
    return filtered;
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'academic': return 'primary';
      case 'cultural': return 'secondary';
      case 'sports': return 'success';
      case 'holiday': return 'error';
      default: return 'default';
    }
  };

  if (loading && events.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const filteredEvents = getFilteredEvents();

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
          <Typography color="text.primary">Events Management</Typography>
        </Breadcrumbs>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">
            Events Management
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddEvent}
          >
            Add New Event
          </Button>
        </Box>
        
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Filter by Type</InputLabel>
              <Select
                value={filterType}
                label="Filter by Type"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                {eventTypes.map(type => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Filter by Date"
                value={filterDate}
                onChange={(date) => setFilterDate(date)}
                slotProps={{ 
                  textField: { 
                    fullWidth: true,
                    variant: 'outlined'
                  } 
                }}
              />
            </LocalizationProvider>
          </Grid>
        </Grid>

        {filteredEvents.length > 0 ? (
          <Grid container spacing={3}>
            {filteredEvents.map(event => {
              const eventDate = new Date(event.date);
              const formattedDate = format(eventDate, 'MMMM dd, yyyy');
              
              return (
                <Grid item xs={12} md={6} lg={4} key={event.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="h6" component="div" gutterBottom>
                          {event.title}
                        </Typography>
                        <Chip 
                          label={event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                          color={getEventTypeColor(event.type) as any}
                          size="small"
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <EventIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                        {formattedDate} | {event.startTime} - {event.endTime}
                      </Typography>
                      
                      {event.location && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Location: {event.location}
                        </Typography>
                      )}
                      
                      <Divider sx={{ my: 1.5 }} />
                      
                      <Typography variant="body2" paragraph>
                        {event.description || 'No description provided.'}
                      </Typography>
                      
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Target Audience:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                          {event.targetAudience.map(audience => (
                            <Chip 
                              key={audience} 
                              label={audience} 
                              size="small" 
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        startIcon={<EditIcon />}
                        onClick={() => handleEditEvent(event)}
                      >
                        Edit
                      </Button>
                      <Button 
                        size="small" 
                        color="error" 
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteEvent(event.id)}
                      >
                        Delete
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Typography variant="subtitle1" sx={{ textAlign: 'center', py: 4 }}>
            No events found. {filterType !== 'all' || filterDate ? 'Try changing your filters or ' : ''}
            <Button color="primary" onClick={handleAddEvent}>Add a new event</Button>
          </Typography>
        )}
      </Paper>

      {/* Add/Edit Event Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? 'Edit Event' : 'Add New Event'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Event Title"
                value={currentEvent.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
                fullWidth
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Event Date"
                  value={currentEvent.date ? new Date(currentEvent.date) : null}
                  onChange={handleDateChange}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      required: true
                    } 
                  }}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <TextField
                label="Start Time"
                type="time"
                value={currentEvent.startTime || ''}
                onChange={(e) => handleInputChange('startTime', e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
                fullWidth
                required
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <TextField
                label="End Time"
                type="time"
                value={currentEvent.endTime || ''}
                onChange={(e) => handleInputChange('endTime', e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
                fullWidth
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Location"
                value={currentEvent.location || ''}
                onChange={(e) => handleInputChange('location', e.target.value)}
                fullWidth
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Event Type</InputLabel>
                <Select
                  value={currentEvent.type || ''}
                  label="Event Type"
                  onChange={(e) => handleInputChange('type', e.target.value)}
                >
                  {eventTypes.map(type => (
                    <MenuItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Target Audience</InputLabel>
                <Select
                  multiple
                  value={currentEvent.targetAudience || []}
                  label="Target Audience"
                  onChange={handleAudienceChange as any}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {audienceOptions.map(option => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Description"
                value={currentEvent.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                multiline
                rows={4}
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button 
            onClick={handleSaveEvent} 
            color="primary" 
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this event?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={confirmDeleteEvent} 
            color="error" 
            disabled={saving}
          >
            {saving ? 'Deleting...' : 'Delete'}
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

export default EventsManagement;