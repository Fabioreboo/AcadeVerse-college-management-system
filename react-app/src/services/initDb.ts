import { initializeDatabase } from './dbUtils';

// Function to initialize the database
export const setupDatabase = async () => {
  console.log('Starting database initialization...');
  
  try {
    const result = await initializeDatabase();
    
    if (result.success) {
      console.log('Database initialized successfully!');
      return { success: true };
    } else {
      console.error('Failed to initialize database:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error during database initialization:', error);
    return { success: false, error };
  }
};

// You can call this function from your app to initialize the database
// Example usage:
// import { setupDatabase } from './services/initDb';
// 
// // In your component or initialization code:
// setupDatabase().then(result => {
//   if (result.success) {
//     console.log('Database is ready to use!');
//   } else {
//     console.error('Database setup failed:', result.error);
//   }
// });