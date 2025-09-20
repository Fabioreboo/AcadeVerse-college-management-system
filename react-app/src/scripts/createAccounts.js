// This is a script you can run to create student and parent accounts
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

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

// Default password for new accounts
const DEFAULT_PASSWORD = 'Password123!';

// List of student names (30 unique names)
const studentNames = [
  "Aarav Sharma", "Aditi Patel", "Arjun Singh", "Ananya Gupta", "Aryan Kumar",
  "Diya Verma", "Ishaan Malhotra", "Kavya Reddy", "Vihaan Joshi", "Riya Mehta",
  "Rohan Agarwal", "Sanya Kapoor", "Vivaan Choudhury", "Zara Khan", "Advait Mishra",
  "Anvi Desai", "Dhruv Saxena", "Ishita Banerjee", "Kabir Mehra", "Myra Iyer",
  "Neil Chauhan", "Pari Sharma", "Reyansh Patel", "Saanvi Singh", "Shaurya Gupta",
  "Tara Kumar", "Ved Verma", "Aisha Malhotra", "Arnav Reddy", "Avni Joshi"
];

async function createStudentAccounts(count) {
  for (let i = 1; i <= count; i++) {
    // Create student ID in format CS20230012 (CS + year + 4-digit number)
    const paddedNumber = i.toString().padStart(4, '0');
    const studentId = `CS2023${paddedNumber}`;
    const email = `${studentId}@studenthub.edu`;
    const name = studentNames[i-1]; // Use unique name from the list
    
    try {
      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, email, DEFAULT_PASSWORD);
      const user = userCredential.user;
      
      // Create Firestore document
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: email,
        name: name,
        role: 'student',
        studentId: studentId,
        passwordChanged: false,
        createdAt: new Date()
      });
      
      console.log(`Created student account: ${studentId} - ${name}`);
    } catch (error) {
      console.error(`Error creating student ${studentId}:`, error);
    }
  }
}

async function createParentAccounts(count) {
  for (let i = 1; i <= count; i++) {
    // Create parent ID linked to student ID but different format
    // Format: P-CS2023XXXX (P- prefix + student ID)
    const paddedNumber = i.toString().padStart(4, '0');
    const studentId = `CS2023${paddedNumber}`;
    const parentId = `P-${studentId}`;
    const email = `${parentId}@studenthub.edu`;
    const studentName = studentNames[i-1];
    const parentName = `Parent of ${studentName}`;
    
    try {
      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, email, DEFAULT_PASSWORD);
      const user = userCredential.user;
      
      // Create Firestore document
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: email,
        name: parentName,
        role: 'parent',
        parentId: parentId,
        linkedStudentId: studentId,
        linkedStudentName: studentName,
        passwordChanged: false,
        createdAt: new Date()
      });
      
      console.log(`Created parent account: ${parentId} - ${parentName}`);
    } catch (error) {
      console.error(`Error creating parent ${parentId}:`, error);
    }
  }
}

function saveIdsToFile(studentIds, parentIds) {
  let content = "STUDENT IDs:\n";
  studentIds.forEach(id => {
    content += `${id}\n`;
  });
  
  content += "\nPARENT IDs:\n";
  parentIds.forEach(id => {
    content += `${id}\n`;
  });
  
  fs.writeFileSync('user_ids.txt', content);
  console.log("All IDs saved to user_ids.txt");
}

// Modify your run function to collect and save IDs
async function run() {
  try {
    const studentIds = [];
    const parentIds = [];
    
    // Collect student IDs
    for (let i = 1; i <= 30; i++) {
      const paddedNumber = i.toString().padStart(4, '0');
      const studentId = `CS2023${paddedNumber}`;
      studentIds.push(studentId);
      
      // Collect parent IDs
      const parentId = `P-${studentId}`;
      parentIds.push(parentId);
    }
    
    console.log("Creating student accounts...");
    await createStudentAccounts(30);
    console.log("Creating parent accounts...");
    await createParentAccounts(30);
    console.log("All accounts created successfully!");
    
    // Save IDs to file
    saveIdsToFile(studentIds, parentIds);
  } catch (error) {
    console.error("Error running script:", error);
  }
}

run();