const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  status: {
    type: String,
    enum: ['assigned', 'arrived', 'in_progress', 'waiting_on_parts', 'completed', 'rescheduled', 'cancelled'],
    default: 'assigned'
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  scheduledArrival: {
    type: Date
  },
  actualArrival: {
    type: Date
  },
  workStarted: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  notes: {
    type: String
  },
  vendorNotes: {
    type: String
  },
  completionNotes: {
    type: String
  },
  customerSignature: {
    type: String // Base64 encoded signature
  },
  laborHours: {
    type: Number,
    default: 0
  },
  totalPartsCost: {
    type: Number,
    default: 0
  },
  totalLaborCost: {
    type: Number,
    default: 0
  },
  totalCost: {
    type: Number,
    default: 0
  },
  rescheduleInfo: {
    originalDate: Date,
    newDate: Date,
    reason: String,
    requestedAt: Date
  },
  invoice: {
    invoiceNumber: String,
    generatedAt: Date,
    pdfUrl: String
  }
}, {
  timestamps: true
});

// Index for efficient querying
assignmentSchema.index({ vendorId: 1, status: 1 });
assignmentSchema.index({ jobId: 1 });
assignmentSchema.index({ assignedAt: 1 });

// Update job status when assignment status changes
assignmentSchema.pre('save', async function(next) {
  if (this.isModified('status')) {
    const Job = mongoose.model('Job');
    let jobStatus = 'assigned';
    
    if (this.status === 'completed') {
      jobStatus = 'completed';
    } else if (this.status === 'in_progress' || this.status === 'arrived') {
      jobStatus = 'in_progress';
    } else if (this.status === 'cancelled') {
      jobStatus = 'available';
    }
    
    await Job.findByIdAndUpdate(this.jobId, { status: jobStatus });
  }
  next();
});

module.exports = mongoose.model('Assignment', assignmentSchema);
