const bcrypt = require('bcryptjs');

const testBcrypt = async () => {
  const password = 'admin123';
  
  console.log('Testing bcrypt...\n');
  
  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  console.log('Original password:', password);
  console.log('Hashed password:', hashedPassword);
  
  // Compare
  const isMatch = await bcrypt.compare(password, hashedPassword);
  console.log('Comparison result:', isMatch ? 'MATCH ✓' : 'NO MATCH ✗');
  
  // Test with wrong password
  const wrongMatch = await bcrypt.compare('wrongpassword', hashedPassword);
  console.log('Wrong password test:', wrongMatch ? 'MATCH (ERROR!)' : 'NO MATCH ✓');
};

testBcrypt();
