const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'registered_user', 'dispatcher'],
    default: 'registered_user'
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    default: null
  },
  permissions: [{
    type: String,
    enum: [
      'view_assigned_jobs',
      'update_job_status',
      'upload_parts',
      'view_vendor_portal',
      'manage_all_jobs',
      'manage_vendors',
      'view_reports'
    ]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  refreshToken: {
    type: String
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Set default permissions based on role
userSchema.pre('save', function(next) {
  if (this.isModified('role') && this.permissions.length === 0) {
    if (this.role === 'registered_user') {
      this.permissions = [
        'view_assigned_jobs',
        'update_job_status',
        'upload_parts',
        'view_vendor_portal'
      ];
    } else if (this.role === 'admin') {
      this.permissions = [
        'manage_all_jobs',
        'manage_vendors',
        'view_reports',
        'view_assigned_jobs',
        'update_job_status',
        'upload_parts',
        'view_vendor_portal'
      ];
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
