// Script to deploy Firebase rules
const { exec } = require('child_process');

console.log('Deploying Firebase rules...');

// Deploy only the Firestore rules
exec('firebase deploy --only firestore:rules', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error deploying rules: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
  console.log(`Rules deployed successfully:\n${stdout}`);
});