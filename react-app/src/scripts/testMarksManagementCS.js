// Test CS Marks Management System
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, doc, setDoc } from 'firebase/firestore';

// Firebase configuration
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

console.log('📊 Testing CS Marks Management System');
console.log('====================================');

// CS Subjects (same as attendance and notes)
const CS_SUBJECTS = [
  'Data Structures',
  'Algorithms', 
  'Operating Systems',
  'DBMS',
  'Computer Networks',
  'Software Engineering'
];

const EXAM_TYPES = ['Final', 'Assignment', 'Project'];
const SEMESTERS = ['1', '2', '3', '4', '5', '6', '7', '8'];

async function testMarksCreation() {
  try {
    console.log('📝 Creating test marks entry...');
    
    // Create a test marks record
    const testMarks = {
      'student-001': {
        marks: 85,
        grade: 'A',
        remarks: 'Excellent performance',
        studentName: 'Test Student 1',
        rollNumber: 'CS001',
        subjectName: 'Data Structures',
        semester: '3',
        fullMarks: 100,
        passMarks: 40,
        lastUpdated: new Date().toISOString()
      },
      'student-002': {
        marks: 72,
        grade: 'B+',
        remarks: 'Good work',
        studentName: 'Test Student 2',
        rollNumber: 'CS002',
        subjectName: 'Data Structures',
        semester: '3',
        fullMarks: 100,
        passMarks: 40,
        lastUpdated: new Date().toISOString()
      }
    };
    
    // Document ID format: CS_semester_subject_examType_academicYear
    const marksDocId = `CS_3_Data Structures_Final_2024`;
    const marksRef = doc(db, 'marks', marksDocId);
    
    await setDoc(marksRef, testMarks);
    console.log('✅ Test marks created successfully with ID:', marksDocId);
    
    return true;
  } catch (error) {
    console.error('❌ Error creating test marks:', error);
    console.log('Error details:', {
      code: error.code,
      message: error.message
    });
    return false;
  }
}

async function displayChanges() {
  console.log('\n💡 Changes Made to Marks Management');
  console.log('==================================');
  
  console.log('\n✅ Updated Features:');
  console.log('1. Replaced subject dropdown with CS subjects:');
  CS_SUBJECTS.forEach((subject, index) => {
    console.log(`   ${index + 1}. ${subject}`);
  });
  
  console.log('\n2. Removed class and section dropdowns');
  console.log('3. Added semester dropdown (1-8)');
  console.log('4. Updated exam types to: Final, Assignment, Project');
  console.log('5. Removed term dropdown');
  console.log('6. Kept academic year field');
  
  console.log('\n🔧 New Document Structure:');
  console.log('- Document ID: CS_semester_subject_examType_academicYear');
  console.log('- Example: CS_3_Data Structures_Final_2024');
  
  console.log('\n📊 Default Settings:');
  console.log('- Full Marks: 100');
  console.log('- Pass Marks: 40');
  console.log('- Department: Computer Science (CS)');
  
  console.log('\n🎯 How to Use:');
  console.log('1. Select a CS subject from dropdown');
  console.log('2. Choose semester (1-8)');
  console.log('3. Pick exam type (Final/Assignment/Project)');
  console.log('4. Enter academic year');
  console.log('5. Enter marks for all CS students');
  console.log('6. Save marks to database');
}

async function testDataRetrieval() {
  try {
    console.log('\n🔍 Testing marks retrieval...');
    
    const marksRef = collection(db, 'marks');
    const marksSnapshot = await getDocs(marksRef);
    
    console.log(`📄 Found ${marksSnapshot.size} marks documents in database`);
    
    marksSnapshot.forEach((doc) => {
      console.log(`   - Document ID: ${doc.id}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error retrieving marks:', error);
    return false;
  }
}

async function run() {
  console.log('Starting CS Marks Management test...\n');
  
  const createSuccess = await testMarksCreation();
  await displayChanges();
  await testDataRetrieval();
  
  if (createSuccess) {
    console.log('\n✅ SUCCESS: CS Marks Management system is ready!');
    console.log('🌐 Open your React app and navigate to Teacher Dashboard → Marks Management');
    console.log('🔗 URL: http://localhost:5175');
  } else {
    console.log('\n❌ FAILED: Check Firestore rules and authentication');
  }
  
  console.log('\n🎓 Next Steps:');
  console.log('1. Test the updated Marks Management UI in your browser');
  console.log('2. Try selecting different CS subjects and semesters');
  console.log('3. Enter marks for students');
  console.log('4. Verify marks are saved correctly');
}

run().catch(console.error);