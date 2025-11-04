require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const checkAdmin = async () => {
  try {
    let mongoURI = process.env.MONGODB_URI;
    if (mongoURI.includes('@') && !mongoURI.includes('authSource')) {
      mongoURI += (mongoURI.includes('?') ? '&' : '?') + 'authSource=admin';
    }
    
    await mongoose.connect(mongoURI);
    console.log('✓ Connected to MongoDB\n');

    const adminUser = await User.findOne({ username: 'admin' });
    
    if (adminUser) {
      console.log('✓ Admin user found!');
      console.log('Username:', adminUser.username);
      console.log('Email:', adminUser.email);
      console.log('Role:', adminUser.role);
      console.log('Active:', adminUser.isActive);
      console.log('Permissions:', adminUser.permissions);
      console.log('\nTest login with:');
      console.log('  Username: admin');
      console.log('  Password: admin123');
      console.log('  Role: admin');
    } else {
      console.log('✗ Admin user NOT found!');
      console.log('\nCreating admin user...');
      
      const newAdmin = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin',
        permissions: [
          'manage_all_jobs',
          'manage_vendors',
          'view_reports',
          'view_assigned_jobs',
          'update_job_status',
          'upload_parts',
          'view_vendor_portal'
        ],
        isActive: true
      });
      
      await newAdmin.save();
      console.log('✓ Admin user created successfully!');
      console.log('\nLogin credentials:');
      console.log('  Username: admin');
      console.log('  Password: admin123');
      console.log('  Role: admin');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkAdmin();
