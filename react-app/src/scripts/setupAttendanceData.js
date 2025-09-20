// Script to setup attendance data using existing users
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';

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

// Login as an admin (you'll need to replace with actual teacher credentials)
async function loginAsTeacher() {
  try {
    // You can replace these with actual teacher credentials from your system
    const email = "teacher@studenthub.edu"; // Replace with actual teacher email
    const password = "Password123!"; // Replace with actual teacher password
    
    await signInWithEmailAndPassword(auth, email, password);
    console.log('Logged in as teacher successfully');
    return true;
  } catch (error) {
    console.log('Teacher login failed, continuing without authentication...');
    return false;
  }
}

// Get all student users and create student records
async function createStudentsFromUsers() {
  console.log('Creating student records from existing users...');
  
  try {
    const usersRef = collection(db, 'users');
    const studentUsersQuery = query(usersRef, where("role", "==", "student"));
    const usersSnapshot = await getDocs(studentUsersQuery);
    
    console.log(`Found ${usersSnapshot.docs.length} student users`);
    
    const createPromises = [];
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      const studentData = {
        name: userData.name || 'Unknown Student',
        studentId: userData.studentId || userData.email?.split('@')[0] || doc.id,
        email: userData.email || '',
        department: 'Computer Science',
        rollNumber: userData.studentId || userData.email?.split('@')[0] || doc.id,
        year: '2023',
        semester: 'Fall',
        status: 'Active',
        userId: doc.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Use the user ID as the student document ID for consistency
      createPromises.push(
        setDoc(doc(db, 'students', doc.id), studentData)
      );
    });
    
    await Promise.all(createPromises);
    console.log(`Created ${createPromises.length} student records successfully`);
    
    return createPromises.length;
  } catch (error) {
    console.error('Error creating students from users:', error);
    return 0;
  }
}

// Initialize CS subjects
async function initializeCSSubjects() {
  console.log('Initializing Computer Science subjects...');
  
  const subjects = [
    { name: 'Data Structures', code: 'CS101', department: 'Computer Science', credits: 3 },
    { name: 'Algorithms', code: 'CS102', department: 'Computer Science', credits: 3 },
    { name: 'Operating Systems', code: 'CS201', department: 'Computer Science', credits: 4 },
    { name: 'DBMS', code: 'CS202', department: 'Computer Science', credits: 4 },
    { name: 'Computer Networks', code: 'CS301', department: 'Computer Science', credits: 3 },
    { name: 'Software Engineering', code: 'CS302', department: 'Computer Science', credits: 3 }
  ];
  
  const promises = [];
  subjects.forEach(subject => {
    const subjectId = subject.name.toLowerCase().replace(/\s+/g, '_');
    promises.push(
      setDoc(doc(db, 'subjects', subjectId), {
        ...subject,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    );
  });
  
  try {
    await Promise.all(promises);
    console.log(`Created ${subjects.length} subjects successfully`);
  } catch (error) {
    console.error('Error creating subjects:', error);
  }
}

// Check existing data
async function checkExistingData() {
  console.log('Checking existing data...');
  
  try {
    // Check users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    console.log(`Found ${usersSnapshot.docs.length} users`);
    
    // Check students
    const studentsRef = collection(db, 'students');
    const studentsSnapshot = await getDocs(studentsRef);
    console.log(`Found ${studentsSnapshot.docs.length} students`);
    
    // Check subjects
    const subjectsRef = collection(db, 'subjects');
    const subjectsSnapshot = await getDocs(subjectsRef);
    console.log(`Found ${subjectsSnapshot.docs.length} subjects`);
    
    return {
      users: usersSnapshot.docs.length,
      students: studentsSnapshot.docs.length,
      subjects: subjectsSnapshot.docs.length
    };
  } catch (error) {
    console.error('Error checking existing data:', error);
    return { users: 0, students: 0, subjects: 0 };
  }
}

async function run() {
  try {
    console.log('Setting up attendance data...');
    
    // Try to login (optional)
    await loginAsTeacher();
    
    // Check what data exists
    const counts = await checkExistingData();
    
    // Initialize subjects
    await initializeCSSubjects();
    
    // Create students from existing users if needed
    if (counts.students === 0 && counts.users > 0) {
      const created = await createStudentsFromUsers();
      console.log(`Setup completed! Created ${created} student records.`);
    } else if (counts.students > 0) {
      console.log(`Setup completed! Found ${counts.students} existing students.`);
    } else {
      console.log('No users found. Please ensure user accounts are created first.');
    }
    
    console.log('Attendance system is ready for use!');
    
  } catch (error) {
    console.error('Error during setup:', error);
  }
}

run();