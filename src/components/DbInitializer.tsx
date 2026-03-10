import React, { useState } from 'react';
import { Button, Typography, Box, CircularProgress, Alert, TextField, Grid, Divider } from '@mui/material';
import { db, doc, setDoc, collection, getDocs } from '../services/firebase';
import { setupDatabase } from '../services/initDb';
import { getStudents } from '../services/dbUtils';

const DbInitializer: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{success?: boolean; message?: string; error?: any}>({});
  const [students, setStudents] = useState<any[]>([]);
  const [testData, setTestData] = useState<any[]>([]);
  const [testName, setTestName] = useState('Test Item');

  const handleInitialize = async () => {
    setLoading(true);
    try {
      const initResult = await setupDatabase();
      setResult(initResult);
      
      // If successful, fetch some data to verify
      if (initResult.success) {
        const studentsResult = await getStudents();
        if (studentsResult.success) {
          setStudents(studentsResult.data);
        }
      }
    } catch (error) {
      setResult({ success: false, error });
    } finally {
      setLoading(false);
    }
  };

  // Direct write to Firebase
  const handleDirectWrite = async () => {
    setLoading(true);
    try {
      // Create a test document with timestamp to ensure it's unique
      const timestamp = new Date().getTime();
      const testDocRef = doc(collection(db, 'test_collection'));
      
      await setDoc(testDocRef, {
        name: testName,
        timestamp: timestamp,
        createdAt: new Date()
      });
      
      setResult({ 
        success: true, 
        message: `Successfully wrote to Firebase! Document ID: ${testDocRef.id}` 
      });
      
      // Read back the test collection
      await fetchTestData();
    } catch (error: any) {
      console.error('Error writing to Firebase:', error);
      setResult({ 
        success: false, 
        error: error.message || 'Unknown error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch test data
  const fetchTestData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'test_collection'));
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTestData(data);
    } catch (error) {
      console.error('Error fetching test data:', error);
    }
  };

  // Create users collection with mock data
  const createUsersCollection = async () => {
    setLoading(true);
    try {
      // Create mock users (teachers, students, parents)
      const users = [
        // Teachers
        {
          uid: 'teacher1',
          role: 'teacher',
          name: 'John Smith',
          email: 'john.smith@school.com',
          profileData: {
            subjects: ['Mathematics', 'Computer Science'],
            phone: '555-1234',
            joinDate: new Date('2020-01-15')
          },
          passwordChanged: true
        },
        {
          uid: 'teacher2',
          role: 'teacher',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@school.com',
          profileData: {
            subjects: ['English', 'History'],
            phone: '555-5678',
            joinDate: new Date('2019-08-10')
          },
          passwordChanged: true
        },
        // Students
        {
          uid: 'student1',
          role: 'student',
          name: 'Michael Brown',
          email: 'michael.brown@school.com',
          profileData: {
            rollNumber: 'S001',
            class: '10',
            section: 'A',
            parentId: 'parent1'
          },
          passwordChanged: false
        },
        {
          uid: 'student2',
          role: 'student',
          name: 'Emma Davis',
          email: 'emma.davis@school.com',
          profileData: {
            rollNumber: 'S002',
            class: '10',
            section: 'A',
            parentId: 'parent2'
          },
          passwordChanged: false
        },
        // Parents
        {
          uid: 'parent1',
          role: 'parent',
          name: 'Robert Brown',
          email: 'robert.brown@example.com',
          profileData: {
            phone: '555-9012',
            studentIds: ['student1']
          },
          passwordChanged: true
        },
        {
          uid: 'parent2',
          role: 'parent',
          name: 'Jennifer Davis',
          email: 'jennifer.davis@example.com',
          profileData: {
            phone: '555-3456',
            studentIds: ['student2']
          },
          passwordChanged: true
        }
      ];

      // Add users to the collection
      for (const user of users) {
        await setDoc(doc(db, 'users', user.uid), user);
      }

      return { success: true, message: 'Users collection created successfully!' };
    } catch (error: any) {
      console.error('Error creating users collection:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to create users collection'
      };
    } finally {
      setLoading(false);
    }
  };

  // Create attendance collection with mock data
  const createAttendanceCollection = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      // Create mock attendance records
      const attendanceRecords = [
        {
          id: 'att1',
          date: format(today, 'yyyy-MM-dd'),
          class: '10',
          section: 'A',
          records: [
            { studentId: 'student1', status: 'present', remarks: '' },
            { studentId: 'student2', status: 'present', remarks: '' }
          ],
          createdBy: 'teacher1',
          createdAt: today
        },
        {
          id: 'att2',
          date: format(yesterday, 'yyyy-MM-dd'),
          class: '10',
          section: 'A',
          records: [
            { studentId: 'student1', status: 'present', remarks: '' },
            { studentId: 'student2', status: 'absent', remarks: 'Sick leave' }
          ],
          createdBy: 'teacher1',
          createdAt: yesterday
        },
        {
          id: 'att3',
          date: format(twoDaysAgo, 'yyyy-MM-dd'),
          class: '10',
          section: 'A',
          records: [
            { studentId: 'student1', status: 'present', remarks: '' },
            { studentId: 'student2', status: 'present', remarks: '' }
          ],
          createdBy: 'teacher2',
          createdAt: twoDaysAgo
        }
      ];

      // Add attendance records to the collection
      for (const record of attendanceRecords) {
        await setDoc(doc(db, 'attendance', record.id), record);
      }

      return { success: true, message: 'Attendance collection created successfully!' };
    } catch (error: any) {
      console.error('Error creating attendance collection:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to create attendance collection'
      };
    } finally {
      setLoading(false);
    }
  };

  // Create notes collection with mock data
  const createNotesCollection = async () => {
    setLoading(true);
    try {
      // Create mock notes
      const notes = [
        {
          id: 'note1',
          title: 'Mathematics Chapter 1 Notes',
          description: 'Comprehensive notes covering algebra fundamentals',
          subjectId: 1,
          subjectName: 'Mathematics',
          class: '10',
          section: 'A',
          fileUrl: '',
          uploadedBy: 'teacher1',
          uploadedByName: 'John Smith',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'note2',
          title: 'English Grammar Guide',
          description: 'Complete guide to English grammar rules and examples',
          subjectId: 3,
          subjectName: 'English',
          class: '10',
          section: 'A',
          fileUrl: '',
          uploadedBy: 'teacher2',
          uploadedByName: 'Sarah Johnson',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'note3',
          title: 'Computer Science - Introduction to Programming',
          description: 'Basic programming concepts and algorithms',
          subjectId: 6,
          subjectName: 'Computer Science',
          class: '10',
          section: 'A',
          fileUrl: '',
          uploadedBy: 'teacher1',
          uploadedByName: 'John Smith',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Add notes to the collection
      for (const note of notes) {
        await setDoc(doc(db, 'notes', note.id), note);
      }

      return { success: true, message: 'Notes collection created successfully!' };
    } catch (error: any) {
      console.error('Error creating notes collection:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to create notes collection'
      };
    } finally {
      setLoading(false);
    }
  };

  // Create all collections
  const createAllCollections = async () => {
    setLoading(true);
    try {
      const usersResult = await createUsersCollection();
      const attendanceResult = await createAttendanceCollection();
      const notesResult = await createNotesCollection();

      if (usersResult.success && attendanceResult.success && notesResult.success) {
        setResult({ 
          success: true, 
          message: 'All collections created successfully!' 
        });
      } else {
        setResult({ 
          success: false, 
          error: 'Some collections failed to create. Check console for details.' 
        });
      }
    } catch (error: any) {
      console.error('Error creating collections:', error);
      setResult({ 
        success: false, 
        error: error.message || 'Failed to create collections'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Database Initializer
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleInitialize}
            disabled={loading}
            fullWidth
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Initialize Basic Database'}
          </Button>
        </Grid>
        <Grid item xs={12} md={6}>
          <Button 
            variant="contained" 
            color="secondary" 
            onClick={createAllCollections}
            disabled={loading}
            fullWidth
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Create All Collections'}
          </Button>
        </Grid>
      </Grid>
      
      {result.success === true && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {result.message || 'Operation completed successfully!'}
        </Alert>
      )}
      
      {result.success === false && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error: {result.error?.toString() || 'Unknown error'}
        </Alert>
      )}
      
      <Divider sx={{ my: 3 }} />
      
      <Typography variant="h5" gutterBottom>
        Collection Creation Details
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Button 
            variant="outlined" 
            onClick={createUsersCollection}
            disabled={loading}
            fullWidth
            sx={{ mb: 1 }}
          >
            Create Users Collection
          </Button>
        </Grid>
        <Grid item xs={12} md={6}>
          <Button 
            variant="outlined" 
            onClick={createAttendanceCollection}
            disabled={loading}
            fullWidth
            sx={{ mb: 1 }}
          >
            Create Attendance Collection
          </Button>
        </Grid>
        <Grid item xs={12} md={6}>
          <Button 
            variant="outlined" 
            onClick={createNotesCollection}
            disabled={loading}
            fullWidth
            sx={{ mb: 1 }}
          >
            Create Notes Collection
          </Button>
        </Grid>
      </Grid>
      
      {students.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Sample Data (Students)
          </Typography>
          <Box sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid #ddd', p: 2 }}>
            {students.map((student) => (
              <Box key={student.id} sx={{ mb: 1, p: 1, borderBottom: '1px solid #eee' }}>
                <Typography><strong>Name:</strong> {student.name}</Typography>
                <Typography><strong>Roll Number:</strong> {student.rollNumber}</Typography>
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
};

export default DbInitializer;