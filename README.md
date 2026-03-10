# AcadeVerse - Educational Management System

AcadeVerse is a comprehensive web-based educational management system designed to streamline academic operations for educational institutions. The platform provides a unified ecosystem for teachers, students, and parents to manage and track academic activities including attendance, marks, study materials, and event coordination.

## 🚀 Features

- **Role-Based Access Control**: Tailored interfaces and permissions for Teachers, Students, and Parents.
- **Attendance Management**: Effortless subject-wise attendance tracking with real-time reporting.
- **Academic Performance**: Comprehensive marks recording and analysis for various subjects.
- **Digital Notes Distribution**: Secure sharing and access of study materials and digital notes.
- **Parent-Student Monitoring**: Linked accounts allow parents to monitor their child's progress in real-time.
- **Modern UI/UX**: Built with Material UI for a professional, responsive, and intuitive experience.

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Material UI (MUI) 5
- **Routing**: React Router DOM 7
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **State Management**: React Context API
- **Build Tool**: Vite
- **Form Handling**: React Hook Form

## 📁 Project Structure

```
AcadeVerse/
├── docs/               # Project documentation (SRS, etc.)
├── react-app/          # Main React frontend application
│   ├── src/            # Source code
│   │   ├── components/ # Reusable UI components
│   │   ├── context/    # Global state management
│   │   ├── pages/      # Route-level page components
│   │   ├── services/   # Firebase and API utilities
│   │   └── types/      # TypeScript type definitions
│   └── public/         # Static assets
├── firebase.json       # Firebase configuration
├── firestore.rules     # Firestore security rules
└── .gitignore          # Root ignore file
```

## ⚙️ Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A Firebase project

### Steps
1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/AcadeVerse.git
   cd AcadeVerse
   ```

2. **Setup Frontend**:
   ```bash
   cd react-app
   npm install
   ```

3. **Configure Firebase**:
   Create a `.env` file in the `react-app/` directory and add your Firebase credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```

## 📖 Usage

### Teachers
- Log in using your teacher credentials.
- Navigate to the dashboard to mark attendance for specific subjects.
- Upload digital notes and record marks for assignments and exams.

### Students
- Access your dashboard to view your subject-wise attendance percentage.
- Download study materials and check your latest academic performance.

### Parents
- Monitor your linked child's attendance and marks in real-time.
- View teacher information for better communication.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Built as a professional portfolio piece for educational management.*
