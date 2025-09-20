// Global type declarations for the Student Hub application

interface User {
  uid: string;
  role: 'student' | 'teacher' | 'parent';
  name: string;
  email: string;
  profileData?: any;
  passwordChanged?: boolean;
}

interface Student {
  id: number;
  name: string;
  rollNumber: string;
  class?: string;
  section?: string;
}

interface Subject {
  id: number;
  name: string;
  code?: string;
}

interface Marks {
  studentId: number;
  subjectId: number;
  assignment: number;
  exam: number;
}