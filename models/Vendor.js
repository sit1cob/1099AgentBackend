const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zip: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  specialties: [{
    type: String
  }],
  serviceAreas: [{
    city: String,
    state: String,
    zip: String
  }],
  stats: {
    totalJobs: {
      type: Number,
      default: 0
    },
    completedJobs: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    }
  },
  certifications: [{
    name: String,
    issuedDate: Date,
    expiryDate: Date
  }],
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Virtual for completion rate
vendorSchema.virtual('completionRate').get(function() {
  if (this.stats.totalJobs === 0) return 0;
  return (this.stats.completedJobs / this.stats.totalJobs * 100).toFixed(2);
});

module.exports = mongoose.model('Vendor', vendorSchema);
