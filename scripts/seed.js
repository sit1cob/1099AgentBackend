require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Job = require('../models/Job');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seed...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ Connected to MongoDB\n');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Vendor.deleteMany({});
    await Job.deleteMany({});
    console.log('✓ Existing data cleared\n');

    // Create vendors
    console.log('Creating vendors...');
    const vendors = await Vendor.insertMany([
      {
        name: "John's Appliance Repair",
        phoneNumber: '555-0123',
        email: 'john@appliancerepair.com',
        address: {
          street: '123 Main St',
          city: 'Chicago',
          state: 'IL',
          zip: '60601'
        },
        specialties: ['Refrigerator', 'Dishwasher', 'Washer', 'Dryer'],
        serviceAreas: [
          { city: 'Chicago', state: 'IL', zip: '60601' },
          { city: 'Chicago', state: 'IL', zip: '60602' }
        ],
        isActive: true,
        stats: {
          totalJobs: 150,
          completedJobs: 145,
          averageRating: 4.8
        }
      },
      {
        name: "Mike's Home Services",
        phoneNumber: '555-0456',
        email: 'mike@homeservices.com',
        address: {
          street: '456 Oak Ave',
          city: 'New York',
          state: 'NY',
          zip: '10001'
        },
        specialties: ['Refrigerator', 'Oven', 'Microwave'],
        serviceAreas: [
          { city: 'New York', state: 'NY', zip: '10001' },
          { city: 'New York', state: 'NY', zip: '10002' }
        ],
        isActive: true,
        stats: {
          totalJobs: 200,
          completedJobs: 195,
          averageRating: 4.9
        }
      },
      {
        name: "Sarah's Repair Solutions",
        phoneNumber: '555-0789',
        email: 'sarah@repairsolutions.com',
        address: {
          street: '789 Elm St',
          city: 'Los Angeles',
          state: 'CA',
          zip: '90001'
        },
        specialties: ['Washer', 'Dryer', 'Dishwasher'],
        serviceAreas: [
          { city: 'Los Angeles', state: 'CA', zip: '90001' },
          { city: 'Los Angeles', state: 'CA', zip: '90002' }
        ],
        isActive: true,
        stats: {
          totalJobs: 100,
          completedJobs: 98,
          averageRating: 4.7
        }
      }
    ]);
    console.log(`✓ Created ${vendors.length} vendors\n`);

    // Create users
    console.log('Creating users...');
    const users = await User.insertMany([
      {
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
      },
      {
        username: 'john_vendor',
        email: 'john@appliancerepair.com',
        password: 'vendor123',
        role: 'registered_user',
        vendorId: vendors[0]._id,
        permissions: [
          'view_assigned_jobs',
          'update_job_status',
          'upload_parts',
          'view_vendor_portal'
        ],
        isActive: true
      },
      {
        username: 'mike_vendor',
        email: 'mike@homeservices.com',
        password: 'vendor123',
        role: 'registered_user',
        vendorId: vendors[1]._id,
        permissions: [
          'view_assigned_jobs',
          'update_job_status',
          'upload_parts',
          'view_vendor_portal'
        ],
        isActive: true
      },
      {
        username: 'sarah_vendor',
        email: 'sarah@repairsolutions.com',
        password: 'vendor123',
        role: 'registered_user',
        vendorId: vendors[2]._id,
        permissions: [
          'view_assigned_jobs',
          'update_job_status',
          'upload_parts',
          'view_vendor_portal'
        ],
        isActive: true
      }
    ]);
    console.log(`✓ Created ${users.length} users\n`);

    // Create sample jobs
    console.log('Creating sample jobs...');
    const jobs = await Job.insertMany([
      {
        soNumber: 'SO-2024-001',
        customerName: 'Jane',
        customerLastName: 'Doe',
        customerAddress: '123 Main St',
        customerCity: 'Chicago',
        customerState: 'IL',
        customerZip: '60601',
        customerPhone: '555-1234',
        customerEmail: 'jane.doe@email.com',
        applianceType: 'Refrigerator',
        applianceBrand: 'Whirlpool',
        modelNumber: 'WRT318FZDW',
        serialNumber: 'ABC123456',
        serviceDescription: 'Not cooling properly',
        scheduledDate: new Date('2024-12-15'),
        scheduledTimeWindow: '8AM-12PM',
        priority: 'high',
        status: 'available',
        notes: 'Customer prefers morning appointments',
        createdBy: users[0]._id
      },
      {
        soNumber: 'SO-2024-002',
        customerName: 'Bob',
        customerLastName: 'Smith',
        customerAddress: '456 Oak Ave',
        customerCity: 'Chicago',
        customerState: 'IL',
        customerZip: '60602',
        customerPhone: '555-5678',
        customerEmail: 'bob.smith@email.com',
        applianceType: 'Dishwasher',
        applianceBrand: 'Bosch',
        modelNumber: 'SHE3AR75UC',
        serialNumber: 'DEF789012',
        serviceDescription: 'Not draining water',
        scheduledDate: new Date('2024-12-16'),
        scheduledTimeWindow: '1PM-5PM',
        priority: 'medium',
        status: 'available',
        notes: 'Call before arrival',
        createdBy: users[0]._id
      },
      {
        soNumber: 'SO-2024-003',
        customerName: 'Alice',
        customerLastName: 'Johnson',
        customerAddress: '789 Elm St',
        customerCity: 'New York',
        customerState: 'NY',
        customerZip: '10001',
        customerPhone: '555-9012',
        customerEmail: 'alice.johnson@email.com',
        applianceType: 'Washer',
        applianceBrand: 'LG',
        modelNumber: 'WM3900HWA',
        serialNumber: 'GHI345678',
        serviceDescription: 'Making loud noise during spin cycle',
        scheduledDate: new Date('2024-12-17'),
        scheduledTimeWindow: '8AM-12PM',
        priority: 'medium',
        status: 'available',
        notes: 'Apartment building - use service entrance',
        createdBy: users[0]._id
      },
      {
        soNumber: 'SO-2024-004',
        customerName: 'Charlie',
        customerLastName: 'Brown',
        customerAddress: '321 Pine St',
        customerCity: 'Los Angeles',
        customerState: 'CA',
        customerZip: '90001',
        customerPhone: '555-3456',
        customerEmail: 'charlie.brown@email.com',
        applianceType: 'Dryer',
        applianceBrand: 'Samsung',
        modelNumber: 'DVE45R6100C',
        serialNumber: 'JKL901234',
        serviceDescription: 'Not heating',
        scheduledDate: new Date('2024-12-18'),
        scheduledTimeWindow: '1PM-5PM',
        priority: 'high',
        status: 'available',
        notes: 'Customer works from home',
        createdBy: users[0]._id
      },
      {
        soNumber: 'SO-2024-005',
        customerName: 'Diana',
        customerLastName: 'Prince',
        customerAddress: '654 Maple Dr',
        customerCity: 'Chicago',
        customerState: 'IL',
        customerZip: '60601',
        customerPhone: '555-7890',
        customerEmail: 'diana.prince@email.com',
        applianceType: 'Oven',
        applianceBrand: 'GE',
        modelNumber: 'JB645RKSS',
        serialNumber: 'MNO567890',
        serviceDescription: 'Temperature not accurate',
        scheduledDate: new Date('2024-12-19'),
        scheduledTimeWindow: '8AM-12PM',
        priority: 'low',
        status: 'available',
        notes: 'Gate code: 1234',
        createdBy: users[0]._id
      }
    ]);
    console.log(`✓ Created ${jobs.length} sample jobs\n`);

    // Print summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✓ Database seeded successfully!\n');
    console.log('Test Credentials:');
    console.log('─────────────────────────────────────────────────────');
    console.log('Admin:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('  Role: admin\n');
    console.log('Vendor 1 (John):');
    console.log('  Username: john_vendor');
    console.log('  Email: john@appliancerepair.com');
    console.log('  Password: vendor123');
    console.log('  Role: registered_user\n');
    console.log('Vendor 2 (Mike):');
    console.log('  Username: mike_vendor');
    console.log('  Email: mike@homeservices.com');
    console.log('  Password: vendor123');
    console.log('  Role: registered_user\n');
    console.log('Vendor 3 (Sarah):');
    console.log('  Username: sarah_vendor');
    console.log('  Email: sarah@repairsolutions.com');
    console.log('  Password: vendor123');
    console.log('  Role: registered_user\n');
    console.log('─────────────────────────────────────────────────────');
    console.log(`Total Vendors: ${vendors.length}`);
    console.log(`Total Users: ${users.length}`);
    console.log(`Total Jobs: ${jobs.length}`);
    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('✗ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
