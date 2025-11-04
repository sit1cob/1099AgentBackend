const mongoose = require('mongoose');

const partSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true
  },
  partNumber: {
    type: String,
    required: true
  },
  partName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitCost: {
    type: Number,
    required: true,
    min: 0
  },
  totalCost: {
    type: Number
  },
  notes: {
    type: String
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  photos: [{
    filename: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Calculate total cost before saving
partSchema.pre('save', function(next) {
  this.totalCost = this.quantity * this.unitCost;
  next();
});

// Update assignment total parts cost after save
partSchema.post('save', async function() {
  const Assignment = mongoose.model('Assignment');
  const parts = await mongoose.model('Part').find({ assignmentId: this.assignmentId });
  
  const totalPartsCost = parts.reduce((sum, part) => sum + part.totalCost, 0);
  
  await Assignment.findByIdAndUpdate(this.assignmentId, {
    totalPartsCost,
    totalCost: totalPartsCost + (await Assignment.findById(this.assignmentId)).totalLaborCost
  });
});

// Update assignment total parts cost after delete
partSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    const Assignment = mongoose.model('Assignment');
    const parts = await mongoose.model('Part').find({ assignmentId: doc.assignmentId });
    
    const totalPartsCost = parts.reduce((sum, part) => sum + part.totalCost, 0);
    const assignment = await Assignment.findById(doc.assignmentId);
    
    if (assignment) {
      await Assignment.findByIdAndUpdate(doc.assignmentId, {
        totalPartsCost,
        totalCost: totalPartsCost + assignment.totalLaborCost
      });
    }
  }
});

module.exports = mongoose.model('Part', partSchema);
