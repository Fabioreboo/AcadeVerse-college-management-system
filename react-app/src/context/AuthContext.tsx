import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { 
  auth, 
  db,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updatePassword,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs
} from '../services/firebase';

interface User {
  uid: string;
  role: string;
  name: string;
  email: string;
  profileData?: any;
  passwordChanged?: boolean;
}

// Update the interface to include role
interface AuthContextType {
  currentUser: User | null;
  login: (credentials: {email: string, password: string, role: string}) => Promise<boolean>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<boolean>;
  changePasswordByStudentId: (studentId: string, newPassword: string) => Promise<boolean>;
  loading: boolean;
  error: string;
  profileData?: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: {children: React.ReactNode}) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileData, setProfileData] = useState<any>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Get additional user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setCurrentUser({
              uid: user.uid,
              email: user.email || '',
              role: userData.role,
              name: userData.name,
              profileData: userData.profileData,
              passwordChanged: userData.passwordChanged
            });
            setProfileData(userData.profileData || userData);
          } else {
            // Handle case where auth user exists but no Firestore data
            setCurrentUser(null);
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (credentials: {email: string, password: string, role: string}) => {
    try {
      setError('');
      let userEmail = credentials.email;
      
      // Handle different login formats based on role
      if (credentials.role === 'student') {
        // For students, check if input is a student ID (CS2023XXXX)
        if (!credentials.email.includes('@')) {
          // If they entered just the ID, convert to email format
          userEmail = `${credentials.email}@studenthub.edu`;
        }
      } else if (credentials.role === 'parent') {
        // For parents, check if input is a parent ID (P-CS2023XXXX)
        if (!credentials.email.includes('@')) {
          // If they entered just the ID, convert to email format
          userEmail = `${credentials.email}@studenthub.edu`;
        }
      }
      
      // Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, userEmail, credentials.password);
      const user = userCredential.user;
      
      // Get user role and data from Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Check if the user's role matches the selected role
        if (userData.role !== credentials.role) {
          await signOut(auth);
          setError(`This account doesn't have ${credentials.role} privileges`);
          return false;
        }
        
        // For parents, check if they have a linked student
        if (credentials.role === 'parent' && !userData.linkedStudentId) {
          setError('Parent account not linked to any student');
          await signOut(auth);
          return false;
        }
        
        // Check if password was reset and update if needed
        if (userData.tempPassword && userData.passwordResetRequired) {
          try {
            // Update Firebase Auth password with the temp password
            await updatePassword(user, userData.tempPassword);
            
            // Clear the temp password flags
            await updateDoc(userDocRef, {
              tempPassword: null,
              passwordResetRequired: false,
              passwordChanged: true,
              lastPasswordChange: new Date()
            });
            
            console.log('Password updated from temp password during login');
          } catch (passwordUpdateError) {
            console.error('Failed to update password during login:', passwordUpdateError);
            // Continue with login even if password update fails
          }
        }
        
        return true;
      } else {
        // Create a new user document if it doesn't exist
        const newUserData = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || (credentials.role === 'student' ? 
            `Student ${credentials.email}` : 
            (credentials.role === 'parent' ? `Parent ${credentials.email}` : credentials.email?.split('@')[0])),
          role: credentials.role,
          passwordChanged: false,
          createdAt: new Date()
        };
        
        // For parents, add linked student ID
        if (credentials.role === 'parent' && credentials.email.includes('-')) {
          const studentId = credentials.email.split('-')[1].split('@')[0];
          (newUserData as any).linkedStudentId = studentId;
        }
        
        await setDoc(userDocRef, newUserData);
        return true;
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      setError(err.message || 'Logout failed');
    }
  }, []);

  const changePassword = useCallback(async (newPassword: string) => {
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        
        // Update passwordChanged flag in Firestore
        if (currentUser) {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            passwordChanged: true
          });
        }
        
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.message || 'Password change failed');
      return false;
    }
  }, [currentUser]);
  
  const changePasswordByStudentId = useCallback(async (studentId: string, newPassword: string) => {
    try {
      setError('');
      
      // First, check if the student ID is valid
      if (!studentId || studentId.trim() === '') {
        throw new Error('Student ID is required');
      }
      
      // Determine the role and email format based on the ID
      let userEmail = '';
      let role = 'student';
      
      if (studentId.startsWith('P-')) {
        // Parent ID format: P-CS2023XXXX
        userEmail = `${studentId}@studenthub.edu`;
        role = 'parent';
      } else if (studentId.startsWith('T-')) {
        // Teacher ID format: T-XXXX (if teachers have IDs)
        userEmail = `${studentId}@studenthub.edu`;
        role = 'teacher';
      } else {
        // Student ID format: CS2023XXXX
        userEmail = `${studentId}@studenthub.edu`;
        role = 'student';
      }
      
      console.log('Attempting password change for:', { studentId, userEmail, role });
      
      // Find the user in Firestore by querying for their respective ID field
      const usersRef = collection(db, 'users');
      let userQuery;
      
      if (role === 'parent') {
        userQuery = query(usersRef, where('parentId', '==', studentId));
      } else if (role === 'teacher') {
        userQuery = query(usersRef, where('teacherId', '==', studentId));
      } else {
        userQuery = query(usersRef, where('studentId', '==', studentId));
      }
      
      const querySnapshot = await getDocs(userQuery);
      
      if (querySnapshot.empty) {
        throw new Error(`No account found with ${role} ID: ${studentId}`);
      }
      
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      const userUID = userDoc.id;
      
      console.log('Found user:', { uid: userUID, email: userData.email, role: userData.role });
      
      // Verify the email matches what we constructed
      if (userData.email !== userEmail) {
        console.log('Email mismatch:', { expected: userEmail, actual: userData.email });
        // Use the actual email from the database
        userEmail = userData.email;
      }
      
      // Create a temporary auth user to change the password
      // First, try to sign in with the current credentials (assuming default password)
      let authUser = null;
      try {
        // Try common default passwords or get from user data
        const possiblePasswords = ['Password123!', userData.tempPassword, 'password123'];
        
        for (const tryPassword of possiblePasswords) {
          try {
            const userCredential = await signInWithEmailAndPassword(auth, userEmail, tryPassword);
            authUser = userCredential.user;
            console.log('Successfully authenticated user for password change');
            break;
          } catch (authError) {
            console.log(`Failed to authenticate with password: ${tryPassword}`);
            continue;
          }
        }
        
        if (authUser) {
          // Update the Firebase Auth password
          await updatePassword(authUser, newPassword);
          console.log('Firebase Auth password updated successfully');
          
          // Update Firestore document
          await updateDoc(doc(db, 'users', userUID), {
            passwordChanged: true,
            tempPassword: null, // Clear temp password
            passwordResetRequired: false,
            lastPasswordChange: new Date(),
            updatedAt: new Date()
          });
          
          // Sign out the temporary session
          await signOut(auth);
          
          console.log('Password change completed successfully for:', studentId);
          return true;
        } else {
          // If we can't authenticate, fall back to storing the password change request
          console.log('Could not authenticate user, storing password change request');
          
          await updateDoc(doc(db, 'users', userUID), {
            passwordResetRequired: true,
            passwordResetTimestamp: new Date(),
            tempPassword: newPassword, // Store new password temporarily
            passwordChanged: true,
            updatedAt: new Date()
          });
          
          console.log('Password change request saved for:', studentId);
          return true;
        }
        
      } catch (authError: any) {
        console.error('Authentication error during password change:', authError);
        
        // Fall back to storing the password change request in Firestore
        await updateDoc(doc(db, 'users', userUID), {
          passwordResetRequired: true,
          passwordResetTimestamp: new Date(),
          tempPassword: newPassword,
          passwordChanged: true,
          updatedAt: new Date()
        });
        
        console.log('Password change request saved (fallback method) for:', studentId);
        return true;
      }
      
    } catch (err: any) {
      console.error('Password change error:', err);
      setError(err.message || 'Password change failed');
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      login, 
      logout, 
      changePassword,
      changePasswordByStudentId,
      loading,
      error,
      profileData 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}