// Migrate Marks Database Structure
// From: Individual documents per student per subject
// To: Grouped documents with multiple students per subject/semester/exam

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc 
} from 'firebase/firestore';

// Firebase configuration (replace with your config)
const firebaseConfig = {
  apiKey: "AIzaSyCpPe_yBvHWx9Dx3XNP4QeaqpnGUkyoTcQ",
  authDomain: "student-hub-4c936.firebaseapp.com",
  projectId: "student-hub-4c936",
  storageBucket: "student-hub-4c936.firebasestorage.app",
  messagingSenderId: "138164720264",
  appId: "1:138164720264:web:e26167a340dcaaa658c53d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// CS Subjects mapping (index-based)
const CS_SUBJECTS = [
  'Data Structures',      // subjectId: 1
  'Algorithms',           // subjectId: 2
  'Operating Systems',    // subjectId: 3
  'DBMS',                // subjectId: 4
  'Computer Networks',    // subjectId: 5
  'Software Engineering'  // subjectId: 6
];

async function migrateMarksStructure() {
  console.log('🚀 Starting Marks Database Migration...');
  console.log('================================================');
  
  try {
    // Step 1: Get all existing marks documents
    console.log('📊 Step 1: Fetching existing marks documents...');
    const marksRef = collection(db, 'marks');
    const marksSnapshot = await getDocs(marksRef);
    
    console.log(`Found ${marksSnapshot.docs.length} existing marks documents`);
    
    if (marksSnapshot.docs.length === 0) {
      console.log('❌ No marks documents found. Nothing to migrate.');
      return;
    }
    
    // Step 2: Group marks by subject, semester, exam type, and year
    console.log('📝 Step 2: Grouping marks for migration...');
    const groupedMarks = {};
    const studentsToConvert = new Set();
    
    // First, let's get all students to map studentId to auth UID
    console.log('👥 Getting student mappings...');
    const studentsRef = collection(db, 'students');
    const studentsSnapshot = await getDocs(studentsRef);
    const studentMapping = {}; // studentId -> authUID
    
    studentsSnapshot.forEach((studentDoc) => {
      const studentData = studentDoc.data();
      if (studentData.userId) {
        // Map the document ID (studentId) to the auth UID (userId)
        studentMapping[studentDoc.id] = studentData.userId;
      }
    });
    
    console.log(`Found ${Object.keys(studentMapping).length} student mappings`);
    
    // Process each marks document
    marksSnapshot.forEach((markDoc) => {
      const markData = markDoc.data();
      console.log(`Processing mark document: ${markDoc.id}`, markData);
      
      // Extract info from the mark
      const studentId = markData.studentId; // This is the studentId from students collection
      const authUID = studentMapping[studentId]; // Map to auth UID
      
      if (!authUID) {
        console.log(`⚠️ No auth UID found for studentId: ${studentId}`);
        return;
      }
      
      studentsToConvert.add(authUID);
      
      // Map subjectId to subject name
      const subjectIndex = markData.subjectId - 1; // Convert 1-based to 0-based
      const subjectName = CS_SUBJECTS[subjectIndex] || 'Unknown Subject';
      
      if (subjectName === 'Unknown Subject') {
        console.log(`⚠️ Unknown subject ID: ${markData.subjectId}`);
        return;
      }
      
      // For now, let's assume semester 1 and year 2025 (you can adjust this)
      const semester = '1';
      const year = '2025';
      
      // Process different exam types
      if (markData.assignment) {
        const groupKey = `CS_${semester}_${subjectName}_Assignment_${year}`;
        if (!groupedMarks[groupKey]) {
          groupedMarks[groupKey] = {};
        }
        
        groupedMarks[groupKey][authUID] = {
          marks: markData.assignment,
          grade: calculateGrade(markData.assignment),
          remarks: '',
          studentName: 'Student',
          studentId: studentId,
          subjectName: subjectName,
          semester: semester,
          fullMarks: 100,
          passMarks: 40,
          lastUpdated: markData.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        };
      }
      
      if (markData.exam) {
        const groupKey = `CS_${semester}_${subjectName}_Final_${year}`;
        if (!groupedMarks[groupKey]) {
          groupedMarks[groupKey] = {};
        }
        
        groupedMarks[groupKey][authUID] = {
          marks: markData.exam,
          grade: calculateGrade(markData.exam),
          remarks: '',
          studentName: 'Student',
          studentId: studentId,
          subjectName: subjectName,
          semester: semester,
          fullMarks: 100,
          passMarks: 40,
          lastUpdated: markData.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        };
      }
    });
    
    console.log(`📊 Grouped marks into ${Object.keys(groupedMarks).length} new documents`);
    console.log(`👥 Converting marks for ${studentsToConvert.size} students`);
    
    // Step 3: Create new grouped documents
    console.log('💾 Step 3: Creating new grouped marks documents...');
    let createdCount = 0;
    
    for (const [docId, studentsData] of Object.entries(groupedMarks)) {
      console.log(`Creating document: ${docId} with ${Object.keys(studentsData).length} students`);
      
      const newMarksRef = doc(db, 'marks', docId);
      await setDoc(newMarksRef, studentsData);
      createdCount++;
      
      console.log(`✅ Created: ${docId}`);
    }
    
    console.log(`📝 Created ${createdCount} new grouped marks documents`);
    
    // Step 4: Backup old documents (rename them instead of deleting)
    console.log('🗄️ Step 4: Backing up old documents...');
    let backupCount = 0;
    
    for (const markDoc of marksSnapshot.docs) {
      const oldData = markDoc.data();
      const backupDocId = `BACKUP_${markDoc.id}_${Date.now()}`;
      
      const backupRef = doc(db, 'marks_backup', backupDocId);
      await setDoc(backupRef, {
        ...oldData,
        originalDocId: markDoc.id,
        backupDate: new Date(),
        migrationNote: 'Backed up during structure migration'
      });
      
      // Delete original document
      await deleteDoc(markDoc.ref);
      backupCount++;
    }
    
    console.log(`🗄️ Backed up ${backupCount} old documents to marks_backup collection`);
    
    // Step 5: Summary
    console.log('');
    console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('=====================================');
    console.log(`✅ Created ${createdCount} new grouped marks documents`);
    console.log(`🗄️ Backed up ${backupCount} old documents to marks_backup collection`);
    console.log(`👥 Converted marks for ${studentsToConvert.size} students`);
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Update Firebase security rules');
    console.log('2. Test student marks dashboard');
    console.log('3. Verify teacher marks management still works');
    console.log('');
    console.log('📂 New document structure example:');
    console.log('Document ID: CS_1_Data Structures_Final_2025');
    console.log('Structure: { "studentAuthUID": { marks: 85, grade: "A", ... }, ... }');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

function calculateGrade(marks) {
  const percentage = marks;
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C+';
  if (percentage >= 40) return 'C';
  if (percentage >= 33) return 'D';
  return 'F';
}

// Test function to verify the migration
async function testMigration() {
  console.log('🧪 Testing migration...');
  
  // Test reading a sample document
  const testDocId = 'CS_1_Data Structures_Final_2025';
  const testRef = doc(db, 'marks', testDocId);
  const testDoc = await getDoc(testRef);
  
  if (testDoc.exists()) {
    console.log('✅ Test document found:', testDocId);
    console.log('📊 Document data sample:', Object.keys(testDoc.data()));
  } else {
    console.log('❌ Test document not found:', testDocId);
  }
}

// Run migration
migrateMarksStructure()
  .then(() => testMigration())
  .then(() => {
    console.log('🏁 Migration and testing completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });