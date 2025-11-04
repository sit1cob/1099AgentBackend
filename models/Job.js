const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  soNumber: {
    type: String,
    required: true,
    unique: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerLastName: {
    type: String,
    required: true
  },
  customerAddress: {
    type: String,
    required: true
  },
  customerCity: {
    type: String,
    required: true
  },
  customerState: {
    type: String,
    required: true
  },
  customerZip: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String
  },
  applianceType: {
    type: String,
    required: true
  },
  applianceBrand: {
    type: String
  },
  modelNumber: {
    type: String
  },
  serialNumber: {
    type: String
  },
  serviceDescription: {
    type: String,
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  scheduledTimeWindow: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['available', 'assigned', 'in_progress', 'completed', 'cancelled', 'on_hold'],
    default: 'available'
  },
  notes: {
    type: String
  },
  internalNotes: {
    type: String
  },
  warrantyInfo: {
    isUnderWarranty: {
      type: Boolean,
      default: false
    },
    warrantyNumber: String,
    warrantyExpiry: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient querying
jobSchema.index({ status: 1, scheduledDate: 1 });
jobSchema.index({ customerCity: 1, customerState: 1 });
jobSchema.index({ applianceType: 1 });
jobSchema.index({ soNumber: 1 });

module.exports = mongoose.model('Job', jobSchema);
