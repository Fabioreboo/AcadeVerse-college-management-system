// Script to initialize students for attendance management
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';

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

// Sample CS students data
const csStudents = [
  { name: "John Smith", studentId: "CS2023001", email: "john.smith@studenthub.edu" },
  { name: "Emma Johnson", studentId: "CS2023002", email: "emma.johnson@studenthub.edu" },
  { name: "Michael Williams", studentId: "CS2023003", email: "michael.williams@studenthub.edu" },
  { name: "Sophia Brown", studentId: "CS2023004", email: "sophia.brown@studenthub.edu" },
  { name: "William Jones", studentId: "CS2023005", email: "william.jones@studenthub.edu" },
  { name: "Olivia Garcia", studentId: "CS2023006", email: "olivia.garcia@studenthub.edu" },
  { name: "James Miller", studentId: "CS2023007", email: "james.miller@studenthub.edu" },
  { name: "Ava Davis", studentId: "CS2023008", email: "ava.davis@studenthub.edu" },
  { name: "Benjamin Rodriguez", studentId: "CS2023009", email: "benjamin.rodriguez@studenthub.edu" },
  { name: "Isabella Martinez", studentId: "CS2023010", email: "isabella.martinez@studenthub.edu" },
  { name: "Lucas Anderson", studentId: "CS2023011", email: "lucas.anderson@studenthub.edu" },
  { name: "Mia Taylor", studentId: "CS2023012", email: "mia.taylor@studenthub.edu" },
  { name: "Alexander Thomas", studentId: "CS2023013", email: "alexander.thomas@studenthub.edu" },
  { name: "Charlotte Jackson", studentId: "CS2023014", email: "charlotte.jackson@studenthub.edu" },
  { name: "Ethan White", studentId: "CS2023015", email: "ethan.white@studenthub.edu" },
  { name: "Amelia Harris", studentId: "CS2023016", email: "amelia.harris@studenthub.edu" },
  { name: "Daniel Martin", studentId: "CS2023017", email: "daniel.martin@studenthub.edu" },
  { name: "Harper Thompson", studentId: "CS2023018", email: "harper.thompson@studenthub.edu" },
  { name: "Matthew Garcia", studentId: "CS2023019", email: "matthew.garcia@studenthub.edu" },
  { name: "Evelyn Martinez", studentId: "CS2023020", email: "evelyn.martinez@studenthub.edu" },
  { name: "Henry Robinson", studentId: "CS2023021", email: "henry.robinson@studenthub.edu" },
  { name: "Abigail Clark", studentId: "CS2023022", email: "abigail.clark@studenthub.edu" },
  { name: "Joseph Rodriguez", studentId: "CS2023023", email: "joseph.rodriguez@studenthub.edu" },
  { name: "Emily Lewis", studentId: "CS2023024", email: "emily.lewis@studenthub.edu" },
  { name: "Samuel Lee", studentId: "CS2023025", email: "samuel.lee@studenthub.edu" },
  { name: "Elizabeth Walker", studentId: "CS2023026", email: "elizabeth.walker@studenthub.edu" },
  { name: "David Hall", studentId: "CS2023027", email: "david.hall@studenthub.edu" },
  { name: "Sofia Allen", studentId: "CS2023028", email: "sofia.allen@studenthub.edu" },
  { name: "Christopher Young", studentId: "CS2023029", email: "christopher.young@studenthub.edu" },
  { name: "Grace King", studentId: "CS2023030", email: "grace.king@studenthub.edu" }
];

async function initializeStudents() {
  console.log('Initializing Computer Science students...');
  
  for (let i = 0; i < csStudents.length; i++) {
    const student = csStudents[i];
    try {
      await setDoc(doc(db, 'students', student.studentId), {
        name: student.name,
        studentId: student.studentId,
        email: student.email,
        department: 'Computer Science',
        rollNumber: student.studentId,
        year: '2023',
        semester: 'Fall',
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`Created student: ${student.name} (${student.studentId})`);
    } catch (error) {
      console.error(`Error creating student ${student.studentId}:`, error);
    }
  }
}

async function checkExistingStudents() {
  console.log('Checking existing students...');
  
  try {
    const studentsRef = collection(db, 'students');
    const studentsSnapshot = await getDocs(studentsRef);
    
    console.log(`Found ${studentsSnapshot.docs.length} existing students:`);
    studentsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`- ${data.name || 'Unknown'} (ID: ${doc.id})`);
    });
    
    return studentsSnapshot.docs.length;
  } catch (error) {
    console.error('Error checking existing students:', error);
    return 0;
  }
}

async function updateExistingStudents() {
  console.log('Updating existing students to Computer Science department...');
  
  try {
    const studentsRef = collection(db, 'students');
    const studentsSnapshot = await getDocs(studentsRef);
    
    const updatePromises = [];
    studentsSnapshot.forEach((doc) => {
      const data = doc.data();
      updatePromises.push(
        updateDoc(doc.ref, {
          department: 'Computer Science',
          rollNumber: data.studentId || data.rollNumber || doc.id,
          year: data.year || '2023',
          semester: data.semester || 'Fall',
          status: data.status || 'Active',
          updatedAt: new Date()
        })
      );
    });
    
    await Promise.all(updatePromises);
    console.log(`Updated ${updatePromises.length} existing students`);
  } catch (error) {
    console.error('Error updating existing students:', error);
  }
}

async function run() {
  try {
    console.log('Starting student initialization for attendance management...');
    
    const existingCount = await checkExistingStudents();
    
    if (existingCount === 0) {
      console.log('No existing students found. Creating new student records...');
      await initializeStudents();
    } else {
      console.log('Existing students found. Updating their data...');
      await updateExistingStudents();
    }
    
    console.log('Student initialization completed successfully!');
    console.log('Students are now ready for attendance management.');
  } catch (error) {
    console.error('Error during student initialization:', error);
  }
}

run();