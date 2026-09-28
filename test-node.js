console.log('Node.js test script started');
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('Current directory:', process.cwd());

try {
  const fs = require('fs');
  const files = fs.readdirSync('.');
  console.log('Files in directory:', files.slice(0, 10));
  
  // Test package.json
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log('Package name:', pkg.name);
  console.log('Dependencies:', Object.keys(pkg.dependencies || {}));
  
  console.log('Test completed successfully');
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
