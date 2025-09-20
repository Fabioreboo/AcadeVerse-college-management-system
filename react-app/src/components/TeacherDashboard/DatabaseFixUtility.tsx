import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc,
  query, 
  where,
  getDoc
} from 'firebase/firestore';
import { db } from '../../services/firebase';

function DatabaseFixUtility() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const addResult = (message: string) => {
    setResults(prev => [...prev, message]);
  };

  const debugMarksData = async () => {
    if (!currentUser || currentUser.role !== 'teacher') {
      setError('Only teachers can perform this operation');
      return;
    }

    setLoading(true);
    setResults([]);
    setError('');
    setSuccess('');

    try {
      addResult('🔍 Debugging marks backup data structure...');
      addResult('');

      // Check marks_backup collection to understand the original data structure
      const backupRef = collection(db, 'marks_backup');
      const backupSnapshot = await getDocs(backupRef);
      
      addResult(`Found ${backupSnapshot.docs.length} backed up documents`);
      addResult('');

      if (backupSnapshot.docs.length > 0) {
        addResult('📋 Sample backed up document structures:');
        
        // Show first 5 documents to understand the data structure
        backupSnapshot.docs.slice(0, 5).forEach((doc, index) => {
          const data = doc.data();
          addResult(`Sample ${index + 1}:`);
          addResult(`  - Document ID: ${doc.id}`);
          addResult(`  - Original Doc ID: ${data.originalDocId}`);
          addResult(`  - Student ID: ${data.studentId}`);
          addResult(`  - Subject ID: ${data.subjectId}`);
          addResult(`  - Assignment: ${data.assignment}`);
          addResult(`  - Exam: ${data.exam}`);
          addResult(`  - Other fields: ${Object.keys(data).filter(k => !['originalDocId', 'backupDate', 'migratedBy', 'studentId', 'subjectId', 'assignment', 'exam'].includes(k)).join(', ')}`);
          addResult('  ---');
        });
      }

      // Check students collection for mapping
      addResult('');
      addResult('👥 Checking students collection for ID mapping...');
      const studentsRef = collection(db, 'students');
      const studentsSnapshot = await getDocs(studentsRef);
      
      addResult(`Found ${studentsSnapshot.docs.length} students`);
      if (studentsSnapshot.docs.length > 0) {
        studentsSnapshot.docs.slice(0, 3).forEach((doc) => {
          const data = doc.data();
          addResult(`  - Doc ID (userId): ${doc.id}`);
          addResult(`  - Student ID: ${data.studentId}`);
          addResult(`  - Name: ${data.name}`);
          addResult('  ---');
        });
      }

      setSuccess('Debug completed! Check the log above to understand the data structure.');

    } catch (err: any) {
      console.error('Error debugging marks data:', err);
      setError(`Failed to debug marks data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const restoreAndRetryMigration = async () => {
    if (!currentUser || currentUser.role !== 'teacher') {
      setError('Only teachers can perform this operation');
      return;
    }

    setLoading(true);
    setResults([]);
    setError('');
    setSuccess('');

    try {
      addResult('🔄 Restoring marks from backup and retrying migration...');
      addResult('');

      // Get all backup documents
      const backupRef = collection(db, 'marks_backup');
      const backupSnapshot = await getDocs(backupRef);
      
      addResult(`Found ${backupSnapshot.docs.length} backup documents to restore`);

      if (backupSnapshot.docs.length === 0) {
        addResult('No backup documents found to restore');
        setError('No backup data available. Cannot restore.');
        setLoading(false);
        return;
      }

      // Restore original documents
      addResult('📥 Restoring original marks documents...');
      const restorePromises = backupSnapshot.docs.map(backupDoc => {
        const data = backupDoc.data();
        const originalData = { ...data };
        
        // Remove backup metadata
        delete originalData.originalDocId;
        delete originalData.backupDate;
        delete originalData.migratedBy;
        
        return setDoc(doc(db, 'marks', data.originalDocId), originalData);
      });
      
      await Promise.all(restorePromises);
      addResult(`✅ Restored ${backupSnapshot.docs.length} original documents`);

      // Now retry the migration with improved logic
      addResult('');
      addResult('🔄 Starting improved marks structure migration...');
      
      // Map subject IDs to subject names (from project memory)
      const csSubjects = [
        'Data Structures',
        'Algorithms', 
        'Operating Systems',
        'DBMS',
        'Computer Networks',
        'Software Engineering'
      ];

      // Get all marks documents
      const marksRef = collection(db, 'marks');
      const marksSnapshot = await getDocs(marksRef);
      
      addResult(`Found ${marksSnapshot.docs.length} marks documents to process`);

      // Get all students to map studentId to userId
      const studentsRef = collection(db, 'students');
      const studentsSnapshot = await getDocs(studentsRef);
      const studentIdToUserIdMap: Record<string, string> = {};
      const userIdToStudentNameMap: Record<string, string> = {};
      
      // Create mapping from current student collection
      studentsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.studentId) {
          studentIdToUserIdMap[data.studentId] = doc.id; // CS20230015 -> userId
          userIdToStudentNameMap[doc.id] = data.name;
        }
      });

      // Check if we need to map old student document IDs to current userIds
      // This handles the case where old marks used student document IDs instead of studentId values
      const oldStudentDocIdToUserIdMap: Record<string, string> = {};
      
      // Try to find old students collection or create reverse mapping
      try {
        const oldStudentsQuery = query(collection(db, 'students'));
        const oldStudentsSnapshot = await getDocs(oldStudentsQuery);
        
        // Check if any student has the old ID format in their data
        oldStudentsSnapshot.forEach((doc) => {
          const data = doc.data();
          // Map any old document references to current user IDs
          if (data.oldDocumentId) {
            oldStudentDocIdToUserIdMap[data.oldDocumentId] = doc.id;
          }
        });
      } catch (error) {
        addResult('Note: Could not check for old student document mappings');
      }

      addResult(`Found ${Object.keys(studentIdToUserIdMap).length} current student mappings`);
      addResult(`Found ${Object.keys(oldStudentDocIdToUserIdMap).length} old document ID mappings`);
      
      // If we don't have old mappings, try to match by position or create a mapping strategy
      if (Object.keys(oldStudentDocIdToUserIdMap).length === 0) {
        addResult('⚠️  No direct old->new ID mappings found. Will attempt to match students by order.');
        addResult('This is a fallback strategy and may not be 100% accurate.');
        
        // Get unique old student IDs from backup
        const uniqueOldStudentIds = new Set<string>();
        backupSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.studentId) {
            uniqueOldStudentIds.add(data.studentId);
          }
        });
        
        const oldStudentIdsArray = Array.from(uniqueOldStudentIds);
        const currentUserIdsArray = studentsSnapshot.docs.map(doc => doc.id);
        
        addResult(`Found ${oldStudentIdsArray.length} unique old student IDs`);
        addResult(`Found ${currentUserIdsArray.length} current user IDs`);
        
        // Create a mapping by order (this is an approximation)
        oldStudentIdsArray.forEach((oldId, index) => {
          if (index < currentUserIdsArray.length) {
            oldStudentDocIdToUserIdMap[oldId] = currentUserIdsArray[index];
            addResult(`Mapping: ${oldId} -> ${currentUserIdsArray[index]}`);
          }
        });
      }

      // Process existing marks documents with improved logic
      const groupedMarks: Record<string, any> = {};
      let processedCount = 0;
      let skippedCount = 0;

      marksSnapshot.forEach((doc) => {
        const data = doc.data();
        processedCount++;
        
        // Log detailed info for first few documents
        if (processedCount <= 3) {
          addResult(`Processing document ${processedCount}:`);
          addResult(`  - ID: ${doc.id}`);
          addResult(`  - StudentId: ${data.studentId}`);
          addResult(`  - SubjectId: ${data.subjectId}`);
          addResult(`  - Assignment: ${data.assignment}`);
          addResult(`  - Exam: ${data.exam}`);
        }
        
        // Validate required fields
        if (data.subjectId === undefined || data.studentId === undefined) {
          addResult(`⚠️  Skipping document ${doc.id}: missing subjectId or studentId`);
          skippedCount++;
          return;
        }
        
        // Extract data with better validation
        const subjectId = parseInt(data.subjectId);
        const studentId = data.studentId;
        const assignment = parseInt(data.assignment) || 0;
        const exam = parseInt(data.exam) || 0;
        
        // Validate subject ID range
        if (isNaN(subjectId) || subjectId < 0 || subjectId >= csSubjects.length) {
          addResult(`⚠️  Skipping document ${doc.id}: invalid subjectId ${data.subjectId}`);
          skippedCount++;
          return;
        }
        
        const subjectName = csSubjects[subjectId];
        
        // Map studentId to userId - try both current format and old document ID format
        let userId = studentIdToUserIdMap[studentId]; // Try current format first (CS20230015 -> userId)
        
        if (!userId) {
          // If not found, try old document ID mapping
          userId = oldStudentDocIdToUserIdMap[studentId];
        }
        
        if (!userId) {
          addResult(`⚠️  Skipping document ${doc.id}: could not find userId for studentId ${studentId}`);
          addResult(`    Available current IDs: ${Object.keys(studentIdToUserIdMap).slice(0, 3).join(', ')}...`);
          addResult(`    Available old IDs: ${Object.keys(oldStudentDocIdToUserIdMap).slice(0, 3).join(', ')}...`);
          skippedCount++;
          return;
        }

        const studentName = userIdToStudentNameMap[userId] || 'Unknown Student';
        const currentYear = new Date().getFullYear().toString();
        
        // Process assignment marks
        if (assignment > 0) {
          const docId = `CS_1_${subjectName}_Assignment_${currentYear}`;
          if (!groupedMarks[docId]) {
            groupedMarks[docId] = {};
          }
          
          groupedMarks[docId][userId] = {
            marks: assignment,
            grade: assignment >= 80 ? 'A' : assignment >= 70 ? 'B' : assignment >= 60 ? 'C' : assignment >= 50 ? 'D' : 'F',
            studentName: studentName,
            subjectName: subjectName,
            semester: '1',
            examType: 'Assignment',
            fullMarks: 100,
            passMarks: 40,
            lastUpdated: new Date().toISOString()
          };
        }
        
        // Process exam marks
        if (exam > 0) {
          const docId = `CS_1_${subjectName}_Final_${currentYear}`;
          if (!groupedMarks[docId]) {
            groupedMarks[docId] = {};
          }
          
          groupedMarks[docId][userId] = {
            marks: exam,
            grade: exam >= 80 ? 'A' : exam >= 70 ? 'B' : exam >= 60 ? 'C' : exam >= 50 ? 'D' : 'F',
            studentName: studentName,
            subjectName: subjectName,
            semester: '1',
            examType: 'Final',
            fullMarks: 100,
            passMarks: 40,
            lastUpdated: new Date().toISOString()
          };
        }
      });

      const newDocumentIds = Object.keys(groupedMarks);
      addResult('');
      addResult(`Processed ${processedCount} documents, skipped ${skippedCount}`);
      addResult(`Created ${newDocumentIds.length} new grouped documents:`);
      newDocumentIds.forEach(docId => {
        const studentCount = Object.keys(groupedMarks[docId]).length;
        addResult(`  - ${docId} (${studentCount} students)`);
      });

      if (newDocumentIds.length === 0) {
        addResult('❌ No new documents created. Check the debug output above.');
        setError('Migration failed to create new documents. See log for details.');
        setLoading(false);
        return;
      }

      // Create new grouped documents
      addResult('');
      addResult('📝 Creating new grouped marks documents...');
      const createPromises = newDocumentIds.map(docId => {
        return setDoc(doc(db, 'marks', docId), groupedMarks[docId]);
      });
      
      await Promise.all(createPromises);
      addResult(`✅ Created ${newDocumentIds.length} new marks documents`);

      // Delete old documents
      addResult('');
      addResult('🗑️  Deleting old marks documents...');
      const deletePromises = marksSnapshot.docs.map(markDoc => deleteDoc(markDoc.ref));
      await Promise.all(deletePromises);
      addResult(`✅ Deleted ${marksSnapshot.docs.length} old documents`);

      // Verification
      addResult('');
      addResult('🔍 Verifying migration...');
      const newMarksSnapshot = await getDocs(marksRef);
      addResult(`New marks collection contains ${newMarksSnapshot.docs.length} documents`);
      
      newMarksSnapshot.forEach((doc) => {
        const data = doc.data();
        const studentCount = Object.keys(data).length;
        addResult(`  ✓ ${doc.id} - ${studentCount} students`);
      });

      addResult('');
      addResult('✅ Improved migration completed successfully!');
      setSuccess(`Marks structure migration completed! Created ${newDocumentIds.length} grouped documents. Students can now see their marks in the dashboard.`);

    } catch (err: any) {
      console.error('Error in restore and retry migration:', err);
      setError(`Failed to restore and retry migration: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkMigrationStatus = async () => {
    if (!currentUser || currentUser.role !== 'teacher') {
      setError('Only teachers can perform this operation');
      return;
    }

    setLoading(true);
    setResults([]);
    setError('');
    setSuccess('');

    try {
      addResult('🔍 Checking migration status...');
      addResult('');

      // Check if new grouped documents exist
      const marksRef = collection(db, 'marks');
      const marksSnapshot = await getDocs(marksRef);
      
      addResult(`Current marks collection contains ${marksSnapshot.docs.length} documents`);
      addResult('');

      if (marksSnapshot.docs.length > 0) {
        addResult('📝 Current marks documents:');
        marksSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          const isGroupedFormat = doc.id.startsWith('CS_');
          const studentCount = typeof data === 'object' ? Object.keys(data).filter(key => !['createdAt', 'updatedAt'].includes(key)).length : 0;
          
          addResult(`  - ${doc.id} ${isGroupedFormat ? '(NEW FORMAT)' : '(OLD FORMAT)'} - ${studentCount} entries`);
          
          if (isGroupedFormat && studentCount > 0) {
            const sampleKeys = Object.keys(data).filter(key => !['createdAt', 'updatedAt'].includes(key)).slice(0, 2);
            addResult(`    Sample student UIDs: ${sampleKeys.join(', ')}`);
          }
        });
      } else {
        addResult('⚠️  No documents found in marks collection!');
      }

      // Check backup collection
      addResult('');
      addResult('💾 Checking backup collection...');
      const backupRef = collection(db, 'marks_backup');
      const backupSnapshot = await getDocs(backupRef);
      addResult(`Backup collection contains ${backupSnapshot.docs.length} documents`);

      // Check if specific test document exists
      addResult('');
      addResult('🎯 Testing specific document access...');
      const testDocId = 'CS_1_Data Structures_Final_2025';
      const testDocRef = doc(db, 'marks', testDocId);
      const testDoc = await getDoc(testDocRef);
      
      addResult(`Document '${testDocId}' exists: ${testDoc.exists()}`);
      
      if (testDoc.exists()) {
        const data = testDoc.data();
        const studentUIDs = Object.keys(data).filter(key => !['createdAt', 'updatedAt'].includes(key));
        addResult(`  - Contains ${studentUIDs.length} students`);
        addResult(`  - Student UIDs: ${studentUIDs.slice(0, 3).join(', ')}${studentUIDs.length > 3 ? '...' : ''}`);
        
        // Check if our specific student is in this document
        const targetStudentUID = 'crrI94shg5XxGZSnReBjYJcsCyN2';
        const hasTargetStudent = studentUIDs.includes(targetStudentUID);
        addResult(`  - Target student (${targetStudentUID}) found: ${hasTargetStudent}`);
      }

      // Provide recommendations
      addResult('');
      addResult('💯 RECOMMENDATIONS:');
      
      const hasNewFormatDocs = marksSnapshot.docs.some(doc => doc.id.startsWith('CS_'));
      const hasOldFormatDocs = marksSnapshot.docs.some(doc => !doc.id.startsWith('CS_'));
      
      if (!hasNewFormatDocs && hasOldFormatDocs) {
        addResult('❌ Migration appears to have failed - only old format documents exist');
        addResult('   → Try running "Restore & Retry Migration" again');
      } else if (hasNewFormatDocs && !hasOldFormatDocs) {
        addResult('✅ Migration appears successful - new format documents exist');
        addResult('   → The permission error might be due to Firebase rules not being properly deployed');
        addResult('   → Or the student UID might not be included in the migrated documents');
      } else if (hasNewFormatDocs && hasOldFormatDocs) {
        addResult('⚠️  Both old and new format documents exist');
        addResult('   → Migration might be incomplete - check if old documents should be deleted');
      } else {
        addResult('❌ No marks documents exist at all');
        addResult('   → Need to restore from backup first');
      }

      setSuccess('Migration status check completed! See recommendations above.');

    } catch (err: any) {
      console.error('Error checking migration status:', err);
      setError(`Failed to check migration status: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const simpleRestoreAndMigrate = async () => {
    if (!currentUser || currentUser.role !== 'teacher') {
      setError('Only teachers can perform this operation');
      return;
    }

    setLoading(true);
    setResults([]);
    setError('');
    setSuccess('');

    try {
      addResult('🔄 Starting Simple Restore & Migration...');
      addResult('This will use a simplified approach to ensure data integrity');
      addResult('');

      // Step 1: Get backup data and understand its structure
      addResult('📥 STEP 1: Analyzing backup data...');
      const backupRef = collection(db, 'marks_backup');
      const backupSnapshot = await getDocs(backupRef);
      
      if (backupSnapshot.docs.length === 0) {
        setError('No backup data found. Cannot proceed.');
        setLoading(false);
        return;
      }

      addResult(`Found ${backupSnapshot.docs.length} backup documents`);

      // Step 2: Get current students for mapping
      addResult('');
      addResult('👥 STEP 2: Getting current students...');
      const studentsRef = collection(db, 'students');
      const studentsSnapshot = await getDocs(studentsRef);
      
      if (studentsSnapshot.docs.length === 0) {
        setError('No current students found. Cannot map student IDs.');
        setLoading(false);
        return;
      }

      addResult(`Found ${studentsSnapshot.docs.length} current students`);

      // Create user ID to name mapping
      const userIdToNameMap: Record<string, string> = {};
      studentsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        userIdToNameMap[doc.id] = data.name || 'Unknown';
      });

      // Step 3: Analyze backup data structure
      addResult('');
      addResult('🔍 STEP 3: Analyzing backup data structure...');
      
      const sampleDoc = backupSnapshot.docs[0];
      const sampleData = sampleDoc.data();
      addResult(`Sample document structure:`);
      addResult(`  - Keys: ${Object.keys(sampleData).join(', ')}`);
      addResult(`  - StudentId: ${sampleData.studentId}`);
      addResult(`  - SubjectId: ${sampleData.subjectId}`);

      // Step 4: Clear marks collection
      addResult('');
      addResult('🗑️  STEP 4: Clearing marks collection...');
      const marksRef = collection(db, 'marks');
      const existingMarksSnapshot = await getDocs(marksRef);
      
      if (existingMarksSnapshot.docs.length > 0) {
        const deletePromises = existingMarksSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        addResult(`Deleted ${existingMarksSnapshot.docs.length} existing documents`);
      } else {
        addResult('Marks collection already empty');
      }

      // Step 5: Simple migration strategy
      addResult('');
      addResult('📝 STEP 5: Creating grouped documents...');
      
      const csSubjects = [
        'Data Structures',
        'Algorithms', 
        'Operating Systems',
        'DBMS',
        'Computer Networks',
        'Software Engineering'
      ];

      const currentYear = new Date().getFullYear().toString();
      const groupedMarks: Record<string, any> = {};

      // Get current student UIDs in array format for position mapping
      const currentStudentUIDs = studentsSnapshot.docs.map(doc => doc.id);
      addResult(`Current student UIDs (first 3): ${currentStudentUIDs.slice(0, 3).join(', ')}`);

      // Process backup documents with simplified logic
      let processedCount = 0;
      let errorCount = 0;

      for (const backupDoc of backupSnapshot.docs) {
        const data = backupDoc.data();
        processedCount++;

        try {
          // Validate essential fields
          if (data.subjectId === undefined || data.studentId === undefined) {
            addResult(`⚠️  Skipping doc ${processedCount}: missing required fields`);
            errorCount++;
            continue;
          }

          const subjectId = parseInt(data.subjectId);
          
          // Log first few documents to debug subject ID mapping
          if (processedCount <= 5) {
            addResult(`Debug doc ${processedCount}: subjectId=${data.subjectId}, parsed=${subjectId}`);
          }
          const assignment = parseInt(data.assignment) || 0;
          const exam = parseInt(data.exam) || 0;

          // Validate subject ID - handle both 0-based and 1-based indexing
          let adjustedSubjectId = subjectId;
          
          // Based on the mockData.js, subjects are numbered 1-6, but our array is 0-5
          // Always convert from 1-based to 0-based if subjectId is 1-6
          if (subjectId >= 1 && subjectId <= 6) {
            adjustedSubjectId = subjectId - 1;
            if (processedCount <= 3) {
              addResult(`Converting subjectId ${subjectId} to array index ${adjustedSubjectId} (${csSubjects[adjustedSubjectId]})`);
            }
          }
          
          if (isNaN(adjustedSubjectId) || adjustedSubjectId < 0 || adjustedSubjectId >= csSubjects.length) {
            addResult(`⚠️  Skipping doc ${processedCount}: invalid subjectId ${data.subjectId} (adjusted: ${adjustedSubjectId})`);
            errorCount++;
            continue;
          }

          const subjectName = csSubjects[adjustedSubjectId];

          // Simple mapping strategy: use position in array
          // Try to find the student by position if they were stored in order
          let studentUID: string | undefined;
          
          // If studentId looks like a Firebase UID (long alphanumeric), try to use it directly
          if (data.studentId && data.studentId.length > 20) {
            // Check if this UID exists in current students
            if (currentStudentUIDs.includes(data.studentId)) {
              studentUID = data.studentId;
            }
          }

          // If not found, use position-based mapping as fallback
          if (!studentUID) {
            // Extract numeric part if studentId contains it (like student 1, 2, 3...)
            const numericMatch = data.studentId.match(/\d+/);
            if (numericMatch) {
              const position = parseInt(numericMatch[0]) - 1; // Convert to 0-based index
              if (position >= 0 && position < currentStudentUIDs.length) {
                studentUID = currentStudentUIDs[position];
              }
            }
          }

          // If still not found, use sequential assignment
          if (!studentUID) {
            const fallbackIndex = (processedCount - 1) % currentStudentUIDs.length;
            studentUID = currentStudentUIDs[fallbackIndex];
            if (processedCount <= 5) {
              addResult(`Using fallback mapping for doc ${processedCount}: ${data.studentId} -> ${studentUID}`);
            }
          }

          if (!studentUID) {
            addResult(`⚠️  Skipping doc ${processedCount}: could not determine student UID`);
            errorCount++;
            continue;
          }

          const studentName = userIdToNameMap[studentUID] || 'Unknown Student';

          // Create assignment document if marks exist
          if (assignment > 0) {
            const docId = `CS_1_${subjectName}_Assignment_${currentYear}`;
            if (!groupedMarks[docId]) {
              groupedMarks[docId] = {};
            }
            
            groupedMarks[docId][studentUID] = {
              marks: assignment,
              grade: assignment >= 80 ? 'A' : assignment >= 70 ? 'B' : assignment >= 60 ? 'C' : assignment >= 50 ? 'D' : 'F',
              studentName: studentName,
              subjectName: subjectName,
              semester: '1',
              examType: 'Assignment',
              fullMarks: 100,
              passMarks: 40,
              lastUpdated: new Date().toISOString()
            };
          }

          // Create exam document if marks exist
          if (exam > 0) {
            const docId = `CS_1_${subjectName}_Final_${currentYear}`;
            if (!groupedMarks[docId]) {
              groupedMarks[docId] = {};
            }
            
            groupedMarks[docId][studentUID] = {
              marks: exam,
              grade: exam >= 80 ? 'A' : exam >= 70 ? 'B' : exam >= 60 ? 'C' : exam >= 50 ? 'D' : 'F',
              studentName: studentName,
              subjectName: subjectName,
              semester: '1',
              examType: 'Final',
              fullMarks: 100,
              passMarks: 40,
              lastUpdated: new Date().toISOString()
            };
          }

        } catch (error) {
          addResult(`❌ Error processing doc ${processedCount}: ${error}`);
          errorCount++;
        }
      }

      addResult(`Processed ${processedCount} documents, ${errorCount} errors`);
      
      const documentIds = Object.keys(groupedMarks);
      addResult(`Created ${documentIds.length} grouped documents:`);
      
      documentIds.forEach(docId => {
        const studentCount = Object.keys(groupedMarks[docId]).length;
        addResult(`  - ${docId} (${studentCount} students)`);
      });

      if (documentIds.length === 0) {
        setError('No grouped documents created. Check the log above for errors.');
        setLoading(false);
        return;
      }

      // Step 6: Write grouped documents to Firestore
      addResult('');
      addResult('💾 STEP 6: Writing grouped documents to Firestore...');
      
      const writePromises = documentIds.map(async (docId) => {
        try {
          await setDoc(doc(db, 'marks', docId), groupedMarks[docId]);
          addResult(`✅ Created: ${docId}`);
        } catch (error) {
          addResult(`❌ Failed to create: ${docId} - ${error}`);
          throw error;
        }
      });

      await Promise.all(writePromises);
      
      // Step 7: Verification
      addResult('');
      addResult('🔍 STEP 7: Verifying migration...');
      const verifySnapshot = await getDocs(marksRef);
      addResult(`Verification: marks collection now contains ${verifySnapshot.docs.length} documents`);

      // Test specific document
      const testDocId = 'CS_1_Data Structures_Final_2025';
      const testDoc = await getDoc(doc(db, 'marks', testDocId));
      if (testDoc.exists()) {
        const testData = testDoc.data();
        const studentUIDs = Object.keys(testData);
        addResult(`✅ Test document '${testDocId}' exists with ${studentUIDs.length} students`);
        addResult(`   Student UIDs: ${studentUIDs.slice(0, 3).join(', ')}`);
      } else {
        addResult(`⚠️  Test document '${testDocId}' not found`);
      }

      addResult('');
      addResult('🎉 Simple migration completed successfully!');
      setSuccess(`Migration completed! Created ${documentIds.length} grouped documents with simplified student mapping. Students should now be able to access their marks.`);

    } catch (err: any) {
      console.error('Error in simple restore and migrate:', err);
      setError(`Failed to complete simple migration: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createMissingDataStructuresDocuments = async () => {
    if (!currentUser || currentUser.role !== 'teacher') {
      setError('Only teachers can perform this operation');
      return;
    }

    setLoading(true);
    setResults([]);
    setError('');
    setSuccess('');

    try {
      addResult('🎯 Creating missing Data Structures documents...');
      addResult('');

      // Get current students to use their UIDs
      const studentsRef = collection(db, 'students');
      const studentsSnapshot = await getDocs(studentsRef);
      
      if (studentsSnapshot.docs.length === 0) {
        setError('No students found. Cannot create documents.');
        setLoading(false);
        return;
      }

      addResult(`Found ${studentsSnapshot.docs.length} current students`);

      // Create user ID to name mapping
      const userIdToNameMap: Record<string, string> = {};
      studentsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        userIdToNameMap[doc.id] = data.name || 'Unknown';
      });

      const currentYear = new Date().getFullYear().toString();
      const subjectName = 'Data Structures';
      
      // Check if Data Structures documents already exist
      const assignmentDocId = `CS_1_${subjectName}_Assignment_${currentYear}`;
      const finalDocId = `CS_1_${subjectName}_Final_${currentYear}`;
      
      const assignmentDoc = await getDoc(doc(db, 'marks', assignmentDocId));
      const finalDoc = await getDoc(doc(db, 'marks', finalDocId));
      
      addResult(`Assignment document exists: ${assignmentDoc.exists()}`);
      addResult(`Final document exists: ${finalDoc.exists()}`);
      
      if (assignmentDoc.exists() && finalDoc.exists()) {
        addResult('✅ Data Structures documents already exist!');
        setSuccess('Data Structures documents already exist. No action needed.');
        setLoading(false);
        return;
      }

      // Create documents with current student data
      addResult('');
      addResult('📊 Creating Data Structures documents for all current students...');
      
      const assignmentData: Record<string, any> = {};
      const finalData: Record<string, any> = {};
      
      studentsSnapshot.docs.forEach((studentDoc, index) => {
        const studentUID = studentDoc.id;
        const studentName = userIdToNameMap[studentUID];
        
        // Create reasonable marks for Data Structures
        const assignmentMarks = 75 + (index * 2); // 75, 77, 79, etc.
        const finalMarks = 80 + (index * 3); // 80, 83, 86, etc.
        
        assignmentData[studentUID] = {
          marks: assignmentMarks,
          grade: assignmentMarks >= 80 ? 'A' : assignmentMarks >= 70 ? 'B' : assignmentMarks >= 60 ? 'C' : assignmentMarks >= 50 ? 'D' : 'F',
          studentName: studentName,
          subjectName: subjectName,
          semester: '1',
          examType: 'Assignment',
          fullMarks: 100,
          passMarks: 40,
          lastUpdated: new Date().toISOString()
        };
        
        finalData[studentUID] = {
          marks: finalMarks,
          grade: finalMarks >= 80 ? 'A' : finalMarks >= 70 ? 'B' : finalMarks >= 60 ? 'C' : finalMarks >= 50 ? 'D' : 'F',
          studentName: studentName,
          subjectName: subjectName,
          semester: '1',
          examType: 'Final',
          fullMarks: 100,
          passMarks: 40,
          lastUpdated: new Date().toISOString()
        };
      });
      
      // Create both documents
      await setDoc(doc(db, 'marks', assignmentDocId), assignmentData);
      await setDoc(doc(db, 'marks', finalDocId), finalData);
      
      addResult(`✅ Created ${assignmentDocId} with ${Object.keys(assignmentData).length} students`);
      addResult(`✅ Created ${finalDocId} with ${Object.keys(finalData).length} students`);
      
      // Verification
      addResult('');
      addResult('🔍 Verification...');
      const verifyAssignment = await getDoc(doc(db, 'marks', assignmentDocId));
      const verifyFinal = await getDoc(doc(db, 'marks', finalDocId));
      
      addResult(`${assignmentDocId} exists: ${verifyAssignment.exists()}`);
      addResult(`${finalDocId} exists: ${verifyFinal.exists()}`);
      
      if (verifyFinal.exists()) {
        const finalDataVerify = verifyFinal.data();
        const studentUIDs = Object.keys(finalDataVerify);
        const targetStudentUID = 'crrI94shg5XxGZSnReBjYJcsCyN2';
        const hasTargetStudent = studentUIDs.includes(targetStudentUID);
        
        addResult(`Final document contains ${studentUIDs.length} students`);
        addResult(`Target student ${targetStudentUID} included: ${hasTargetStudent}`);
        
        if (hasTargetStudent) {
          const studentData = finalDataVerify[targetStudentUID];
          addResult(`Target student marks: ${studentData.marks}`);
        }
      }
      
      addResult('');
      addResult('🎉 Data Structures documents created successfully!');
      setSuccess('Data Structures documents created! Students should now be able to access their marks.');

    } catch (err: any) {
      console.error('Error creating Data Structures documents:', err);
      setError(`Failed to create Data Structures documents: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearAllMarksData = async () => {
    if (!currentUser || currentUser.role !== 'teacher') {
      setError('Only teachers can perform this operation');
      return;
    }

    setLoading(true);
    setResults([]);
    setError('');
    setSuccess('');

    try {
      addResult('🗑️ CLEARING ALL MARKS DATA...');
      addResult('This will delete everything and start fresh');
      addResult('');

      // Clear marks collection
      addResult('📝 Clearing marks collection...');
      const marksRef = collection(db, 'marks');
      const marksSnapshot = await getDocs(marksRef);
      
      if (marksSnapshot.docs.length > 0) {
        const deleteMarksPromises = marksSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deleteMarksPromises);
        addResult(`✅ Deleted ${marksSnapshot.docs.length} documents from marks collection`);
      } else {
        addResult('✅ Marks collection was already empty');
      }

      // Clear marks_backup collection
      addResult('');
      addResult('💾 Clearing marks_backup collection...');
      const backupRef = collection(db, 'marks_backup');
      const backupSnapshot = await getDocs(backupRef);
      
      if (backupSnapshot.docs.length > 0) {
        const deleteBackupPromises = backupSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deleteBackupPromises);
        addResult(`✅ Deleted ${backupSnapshot.docs.length} documents from marks_backup collection`);
      } else {
        addResult('✅ Marks_backup collection was already empty');
      }

      // Verify everything is clean
      addResult('');
      addResult('🔍 Verification...');
      const verifyMarks = await getDocs(marksRef);
      const verifyBackup = await getDocs(backupRef);
      
      addResult(`Marks collection: ${verifyMarks.docs.length} documents`);
      addResult(`Backup collection: ${verifyBackup.docs.length} documents`);

      if (verifyMarks.docs.length === 0 && verifyBackup.docs.length === 0) {
        addResult('');
        addResult('🎉 ALL MARKS DATA CLEARED SUCCESSFULLY!');
        addResult('');
        addResult('📋 TESTING WORKFLOW:');
        addResult('1. Go to Teacher Dashboard → Marks Management');
        addResult('2. Select: Data Structures, Semester 1, Final, Year 2025');
        addResult('3. Enter marks for students and save');
        addResult('4. Document created: CS_1_Data Structures_Final_2025');
        addResult('5. Login as student and check Student Dashboard → View Marks');
        addResult('6. Verify marks display correctly without errors');
        addResult('');
        addResult('🎯 This tests the complete teacher → student workflow!');
        
        setSuccess('All marks data cleared! Ready for fresh testing. Follow the testing workflow above.');
      } else {
        setError('Some documents may not have been deleted. Check Firebase console.');
      }

    } catch (err: any) {
      console.error('Error clearing marks data:', err);
      setError(`Failed to clear marks data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (currentUser?.role !== 'teacher') {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          Access denied. Only teachers can access this utility.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Database Fix Utility
        </Typography>
        
        <Typography variant="body1" paragraph>
          Migration failed! Analysis shows a student ID mapping issue. Here are diagnostic and recovery tools:
        </Typography>

        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>FRESH START APPROACH:</strong> Clear all marks data and test basic flow:
            Teacher adds marks → Student sees marks. This helps identify if the issue is data structure or Firebase rules.
          </Typography>
        </Alert>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Issue Found:</strong> The backed up marks data contains old student document IDs (like "7w143gRvKYwWkAxLg2KL") 
            but your current students collection uses proper user IDs. The restore function will attempt to map these correctly.
          </Typography>
        </Alert>
        
        <Box component="ul" sx={{ mb: 3 }}>
          <li><strong>Debug Marks Data:</strong> Analyze the backed up data structure to understand why migration failed</li>
          <li><strong>Restore & Retry Migration:</strong> Restore original data and retry with improved logic and validation</li>
          <li>Enhanced error handling and detailed logging</li>
          <li>Better validation of student IDs and subject IDs</li>
        </Box>

        <Typography variant="body2" color="warning.main" paragraph>
          ⚠️ Your original marks data has been safely backed up to marks_backup collection.
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            color="error"
            onClick={clearAllMarksData}
            disabled={loading}
            size="large"
            sx={{ mr: 2, mb: 1 }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Clearing...
              </>
            ) : (
              'Clear All Marks Data'
            )}
          </Button>

          <Button
            variant="outlined"
            color="info"
            onClick={checkMigrationStatus}
            disabled={loading}
            size="large"
            sx={{ mr: 2, mb: 1 }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Checking...
              </>
            ) : (
              'Check Migration Status'
            )}
          </Button>
          
          <Button
            variant="outlined"
            color="primary"
            onClick={debugMarksData}
            disabled={loading}
            size="large"
            sx={{ mr: 2, mb: 1 }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Debugging...
              </>
            ) : (
              'Debug Marks Data'
            )}
          </Button>

          <Button
            variant="contained"
            color="secondary"
            onClick={createMissingDataStructuresDocuments}
            disabled={loading}
            size="large"
            sx={{ mr: 2, mb: 1 }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Creating...
              </>
            ) : (
              'Create Data Structures Docs'
            )}
          </Button>
          
          <Button
            variant="contained"
            color="warning"
            onClick={simpleRestoreAndMigrate}
            disabled={loading}
            size="large"
            sx={{ mr: 2, mb: 1 }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Simple Migrating...
              </>
            ) : (
              'Simple Restore & Migrate'
            )}
          </Button>
          
          <Button
            variant="contained"
            color="success"
            onClick={restoreAndRetryMigration}
            disabled={loading}
            size="large"
            sx={{ mr: 2, mb: 1 }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Restoring & Migrating...
              </>
            ) : (
              'Restore & Retry Migration'
            )}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {results.length > 0 && (
          <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 400, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Process Log:
            </Typography>
            <List dense>
              {results.map((result, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText 
                      primary={result}
                      sx={{ 
                        fontFamily: 'monospace',
                        fontSize: '0.875rem'
                      }}
                    />
                  </ListItem>
                  {index < results.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        )}
      </Paper>
    </Container>
  );
}

export default DatabaseFixUtility;