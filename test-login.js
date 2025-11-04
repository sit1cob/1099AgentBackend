require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const testLogin = async () => {
  try {
    let mongoURI = process.env.MONGODB_URI;
    if (mongoURI.includes('@') && !mongoURI.includes('authSource')) {
      mongoURI += (mongoURI.includes('?') ? '&' : '?') + 'authSource=admin';
    }
    
    await mongoose.connect(mongoURI);
    console.log('✓ Connected to MongoDB\n');

    const username = 'admin';
    const password = 'admin123';

    // Find user exactly as the login route does
    const user = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: username.toLowerCase() }
      ]
    });

    console.log('Searching for username:', username.toLowerCase());
    console.log('User found:', user ? 'YES' : 'NO');
    
    if (user) {
      console.log('\nUser details:');
      console.log('  Username in DB:', user.username);
      console.log('  Email:', user.email);
      console.log('  Role:', user.role);
      console.log('  Active:', user.isActive);
      
      // Test password
      const isPasswordValid = await user.comparePassword(password);
      console.log('\nPassword test:');
      console.log('  Testing password:', password);
      console.log('  Password valid:', isPasswordValid ? 'YES ✓' : 'NO ✗');
      
      if (isPasswordValid) {
        console.log('\n✓ Login should work!');
        console.log('\nUse these exact credentials in Postman:');
        console.log(JSON.stringify({
          username: 'admin',
          password: 'admin123',
          role: 'admin'
        }, null, 2));
      } else {
        console.log('\n✗ Password is incorrect!');
        console.log('Resetting password to admin123...');
        user.password = 'admin123';
        await user.save();
        console.log('✓ Password reset complete!');
      }
    } else {
      console.log('\n✗ User not found!');
      console.log('\nAll users in database:');
      const allUsers = await User.find({}).select('username email role');
      console.log(allUsers);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testLogin();
