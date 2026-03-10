// Global type declarations for the Student Hub application

export interface User {
  uid: string;
  role: 'student' | 'teacher' | 'parent';
  name: string;
  email: string;
  studentId?: string;
  parentId?: string;
  teacherId?: string;
  linkedStudentId?: string;
  profileData?: any;
  passwordChanged?: boolean;
  passwordResetRequired?: boolean;
  tempPassword?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StudentRecord {
  id: string;
  name: string;
  studentId: string;
  rollNumber: string;
  department?: string;
  class?: string;
  section?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MarkRecord {
  id?: string;
  studentId: string;
  subjectId: string;
  assignment?: number;
  exam?: number;
  marks?: number;
  total?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AttendanceRecord {
  id?: string;
  studentId: string;
  subject: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  createdAt?: Date;
  updatedAt?: Date;
}