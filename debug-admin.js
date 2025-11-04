require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const debugAdmin = async () => {
  try {
    let mongoURI = process.env.MONGODB_URI;
    if (mongoURI.includes('@') && !mongoURI.includes('authSource')) {
      mongoURI += (mongoURI.includes('?') ? '&' : '?') + 'authSource=admin';
    }
    
    await mongoose.connect(mongoURI);
    console.log('✓ Connected to MongoDB\n');

    // Get admin user directly from MongoDB
    const User = mongoose.connection.collection('users');
    const adminUser = await User.findOne({ username: 'admin' });
    
    if (adminUser) {
      console.log('Admin user found in database:');
      console.log('Username:', adminUser.username);
      console.log('Email:', adminUser.email);
      console.log('Role:', adminUser.role);
      console.log('Password hash:', adminUser.password);
      console.log('Password hash length:', adminUser.password.length);
      console.log('Starts with $2a$ or $2b$?', adminUser.password.startsWith('$2'));
      
      // Test password comparison directly
      console.log('\nTesting password comparison:');
      const testPassword = 'admin123';
      const isMatch = await bcrypt.compare(testPassword, adminUser.password);
      console.log(`bcrypt.compare('${testPassword}', hash):`, isMatch ? 'MATCH ✓' : 'NO MATCH ✗');
      
      if (!isMatch) {
        console.log('\n⚠️  Password does not match! Updating...');
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(testPassword, salt);
        
        await User.updateOne(
          { username: 'admin' },
          { $set: { password: newHash } }
        );
        
        console.log('✓ Password updated successfully!');
        console.log('New hash:', newHash);
        
        // Verify the update
        const verifyMatch = await bcrypt.compare(testPassword, newHash);
        console.log('Verification:', verifyMatch ? 'SUCCESS ✓' : 'FAILED ✗');
      }
    } else {
      console.log('✗ Admin user not found!');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

debugAdmin();
