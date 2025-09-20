// Test script for notes upload functionality
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

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
const auth = getAuth(app);
const db = getFirestore(app);

// Test credentials - replace with actual teacher account
const TEST_EMAIL = "teacher@example.com"; // Replace with actual teacher email
const TEST_PASSWORD = "password123"; // Replace with actual password

async function testAuthentication() {
  try {
    console.log('Testing authentication...');
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
    console.log('✅ Authentication successful:', userCredential.user.email);
    return userCredential.user;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    console.log('Please update TEST_EMAIL and TEST_PASSWORD with valid teacher credentials');
    return null;
  }
}

async function testNotesCollection(user) {
  try {
    console.log('Testing notes collection access...');
    
    // Test reading notes
    const notesRef = collection(db, 'notes');
    const q = query(notesRef, where('teacherId', '==', user.uid));
    const snapshot = await getDocs(q);
    
    console.log('✅ Can read notes collection');
    console.log(`Found ${snapshot.size} existing notes for this teacher`);
    
    // Test creating a note
    const testNote = {
      title: 'Test Note ' + Date.now(),
      subject: 'Data Structures',
      teacherId: user.uid,
      teacherName: user.displayName || user.email,
      uploadDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fileName: 'test-document.pdf',
      fileUrl: 'https://example.com/test.pdf' // Mock URL for testing
    };
    
    const docRef = await addDoc(notesRef, testNote);
    console.log('✅ Successfully created test note with ID:', docRef.id);
    
    return true;
  } catch (error) {
    console.error('❌ Notes collection test failed:', error);
    console.log('Error details:', {
      code: error.code,
      message: error.message
    });
    return false;
  }
}

async function checkFirebaseRules() {
  console.log('📋 Firebase Security Rules Recommendations:');
  console.log('');
  console.log('For your Firestore database, you should have rules like:');
  console.log('');
  console.log('rules_version = "2";');
  console.log('service cloud.firestore {');
  console.log('  match /databases/{database}/documents {');
  console.log('    // Users can read/write their own user document');
  console.log('    match /users/{userId} {');
  console.log('      allow read, write: if request.auth != null && request.auth.uid == userId;');
  console.log('    }');
  console.log('    ');
  console.log('    // Teachers can read/write their own notes');
  console.log('    match /notes/{noteId} {');
  console.log('      allow read, write: if request.auth != null && request.auth.uid == resource.data.teacherId;');
  console.log('      allow create: if request.auth != null && request.auth.uid == request.resource.data.teacherId;');
  console.log('    }');
  console.log('    ');
  console.log('    // Students collection - teachers can read, system can write');
  console.log('    match /students/{studentId} {');
  console.log('      allow read: if request.auth != null;');
  console.log('      allow write: if request.auth != null;');
  console.log('    }');
  console.log('    ');
  console.log('    // Attendance - teachers can read/write');
  console.log('    match /attendance/{attendanceId} {');
  console.log('      allow read, write: if request.auth != null;');
  console.log('    }');
  console.log('  }');
  console.log('}');
  console.log('');
}

async function run() {
  console.log('🔧 Testing Notes Upload Functionality');
  console.log('=====================================');
  
  // Test authentication
  const user = await testAuthentication();
  if (!user) {
    console.log('');
    console.log('💡 To test with real credentials:');
    console.log('1. Update TEST_EMAIL and TEST_PASSWORD in this script');
    console.log('2. Use a teacher account that exists in your system');
    console.log('3. Run the script again');
    console.log('');
    checkFirebaseRules();
    return;
  }
  
  // Test notes collection
  const notesSuccess = await testNotesCollection(user);
  
  if (notesSuccess) {
    console.log('');
    console.log('✅ All tests passed! Notes upload should work in the UI.');
    console.log('');
    console.log('💡 Troubleshooting tips:');
    console.log('- Make sure you are logged in as a teacher in the web app');
    console.log('- Check browser console for detailed error messages');
    console.log('- Verify file size is not too large (< 10MB)');
    console.log('- Ensure stable internet connection');
  } else {
    console.log('');
    console.log('❌ Tests failed. Possible issues:');
    console.log('- Firebase security rules need to be updated');
    console.log('- Database permissions are too restrictive');
    console.log('- Network connectivity issues');
    console.log('');
    checkFirebaseRules();
  }
}

run().catch(console.error);