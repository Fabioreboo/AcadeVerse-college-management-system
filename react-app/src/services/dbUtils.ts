import { 
  db,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs
} from './firebase';

// Database collection names
const COLLECTIONS = {
  USERS: 'users',
  STUDENTS: 'students',
  SUBJECTS: 'subjects',
  MARKS: 'marks',
  ATTENDANCE: 'attendance',
  NOTES: 'notes'
};

// User management functions
export const createUser = async (userId: string, userData: any) => {
  try {
    await setDoc(doc(db, COLLECTIONS.USERS, userId), {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error };
  }
};

export const getUser = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    if (userDoc.exists()) {
      return { success: true, data: userDoc.data() };
    } else {
      return { success: false, error: 'User not found' };
    }
  } catch (error) {
    console.error('Error getting user:', error);
    return { success: false, error };
  }
};

export const updateUser = async (userId: string, userData: any) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
      ...userData,
      updatedAt: new Date()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user:', error);
    return { success: false, error };
  }
};

// Student management functions
export const createStudent = async (studentData: any) => {
  try {
    const studentRef = doc(collection(db, COLLECTIONS.STUDENTS));
    await setDoc(studentRef, {
      ...studentData,
      id: studentRef.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { success: true, id: studentRef.id };
  } catch (error) {
    console.error('Error creating student:', error);
    return { success: false, error };
  }
};

export const getStudents = async () => {
  try {
    const studentsSnapshot = await getDocs(collection(db, COLLECTIONS.STUDENTS));
    const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, data: students };
  } catch (error) {
    console.error('Error getting students:', error);
    return { success: false, error };
  }
};

export const getStudent = async (studentId: string) => {
  try {
    const studentDoc = await getDoc(doc(db, COLLECTIONS.STUDENTS, studentId));
    if (studentDoc.exists()) {
      return { success: true, data: { id: studentDoc.id, ...studentDoc.data() } };
    } else {
      return { success: false, error: 'Student not found' };
    }
  } catch (error) {
    console.error('Error getting student:', error);
    return { success: false, error };
  }
};

export const updateStudent = async (studentId: string, studentData: any) => {
  try {
    await updateDoc(doc(db, COLLECTIONS.STUDENTS, studentId), {
      ...studentData,
      updatedAt: new Date()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating student:', error);
    return { success: false, error };
  }
};

// Subject management functions
export const createSubject = async (subjectData: any) => {
  try {
    const subjectRef = doc(collection(db, COLLECTIONS.SUBJECTS));
    await setDoc(subjectRef, {
      ...subjectData,
      id: subjectRef.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { success: true, id: subjectRef.id };
  } catch (error) {
    console.error('Error creating subject:', error);
    return { success: false, error };
  }
};

export const getSubjects = async () => {
  try {
    const subjectsSnapshot = await getDocs(collection(db, COLLECTIONS.SUBJECTS));
    const subjects = subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, data: subjects };
  } catch (error) {
    console.error('Error getting subjects:', error);
    return { success: false, error };
  }
};

// Marks management functions
export const createMarks = async (marksData: any) => {
  try {
    const marksRef = doc(collection(db, COLLECTIONS.MARKS));
    await setDoc(marksRef, {
      ...marksData,
      id: marksRef.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { success: true, id: marksRef.id };
  } catch (error) {
    console.error('Error creating marks:', error);
    return { success: false, error };
  }
};

export const getStudentMarks = async (studentId: string) => {
  try {
    const q = query(collection(db, COLLECTIONS.MARKS), where("studentId", "==", studentId));
    const marksSnapshot = await getDocs(q);
    const marks = marksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, data: marks };
  } catch (error) {
    console.error('Error getting student marks:', error);
    return { success: false, error };
  }
};

// Attendance management functions
export const createAttendance = async (attendanceData: any) => {
  try {
    const { studentId, subject, date, status } = attendanceData;
    const attendanceId = `${studentId}_${subject}_${date}`;
    
    await setDoc(doc(db, COLLECTIONS.ATTENDANCE, attendanceId), {
      studentId,
      subject,
      date,
      status,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating attendance:', error);
    return { success: false, error };
  }
};

export const updateAttendance = async (studentId: string, subject: string, date: string, status: string) => {
  try {
    const attendanceId = `${studentId}_${subject}_${date}`;
    await updateDoc(doc(db, COLLECTIONS.ATTENDANCE, attendanceId), {
      status,
      updatedAt: new Date()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating attendance:', error);
    return { success: false, error };
  }
};

export const getAttendanceByDate = async (subject: string, date: string) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.ATTENDANCE), 
      where("subject", "==", subject),
      where("date", "==", date)
    );
    const attendanceSnapshot = await getDocs(q);
    const attendance = attendanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, data: attendance };
  } catch (error) {
    console.error('Error getting attendance:', error);
    return { success: false, error };
  }
};

export const saveAttendanceBatch = async (attendanceRecords: any[]) => {
  try {
    const promises = attendanceRecords.map(record => {
      const attendanceId = `${record.studentId}_${record.subject}_${record.date}`;
      return setDoc(doc(db, COLLECTIONS.ATTENDANCE, attendanceId), {
        ...record,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    
    await Promise.all(promises);
    return { success: true };
  } catch (error) {
    console.error('Error saving attendance batch:', error);
    return { success: false, error };
  }
};

export const getComputerScienceStudents = async () => {
  try {
    const q = query(collection(db, COLLECTIONS.STUDENTS), where("department", "==", "Computer Science"));
    const studentsSnapshot = await getDocs(q);
    const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, data: students };
  } catch (error) {
    console.error('Error getting CS students:', error);
    return { success: false, error };
  }
};

// Initialize database with mock data
export const initializeDatabase = async () => {
  try {
    // Import mock data
    const { generateStudents, subjects, generateMarks } = await import('./mockData');
    
    // Create students
    const students = generateStudents();
    const createdStudents = [];
    
    for (const student of students) {
      const result = await createStudent(student);
      if (result.success) {
        createdStudents.push({ ...student, id: result.id });
      }
    }
    
    // Create subjects
    for (const subject of subjects) {
      await createSubject(subject);
    }
    
    // Create marks
    const marks = generateMarks(createdStudents, subjects);
    for (const mark of marks) {
      await createMarks(mark);
    }
    
    return { success: true, message: 'Database initialized successfully' };
  } catch (error) {
    console.error('Error initializing database:', error);
    return { success: false, error };
  }
};