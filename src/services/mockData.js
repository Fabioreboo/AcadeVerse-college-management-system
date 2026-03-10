// Generate mock data for students and subjects
export const generateStudents = () => {
  const firstNames = ['John', 'Emma', 'Michael', 'Sophia', 'William', 'Olivia', 'James', 'Ava', 'Benjamin', 'Isabella'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  
  const students = [];
  for (let i = 1; i <= 30; i++) {
    students.push({
      id: i,
      name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
      rollNumber: `CS${i.toString().padStart(3, '0')}`,
      department: 'Computer Science'
    });
  }
  return students;
};

export const subjects = [
  { id: 1, name: 'Data Structures', department: 'Computer Science', code: 'CS101' },
  { id: 2, name: 'Algorithms', department: 'Computer Science', code: 'CS102' },
  { id: 3, name: 'Operating Systems', department: 'Computer Science', code: 'CS201' },
  { id: 4, name: 'DBMS', department: 'Computer Science', code: 'CS202' },
  { id: 5, name: 'Computer Networks', department: 'Computer Science', code: 'CS301' },
  { id: 6, name: 'Software Engineering', department: 'Computer Science', code: 'CS302' }
];

export const generateMarks = (students, subjects) => {
  const marks = [];
  
  students.forEach(student => {
    subjects.forEach(subject => {
      marks.push({
        studentId: student.id,
        subjectId: subject.id,
        assignment: Math.floor(Math.random() * 20) + 80, // 80-100
        exam: Math.floor(Math.random() * 30) + 70, // 70-100
      });
    });
  });
  
  return marks;
};