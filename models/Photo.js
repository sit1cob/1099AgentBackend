const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true
  },
  partId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Part'
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String
  },
  url: {
    type: String,
    required: true
  },
  s3Key: {
    type: String
  },
  mimeType: {
    type: String
  },
  size: {
    type: Number
  },
  description: {
    type: String
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  photoType: {
    type: String,
    enum: ['before', 'during', 'after', 'part', 'general'],
    default: 'general'
  }
}, {
  timestamps: true
});

// Index for efficient querying
photoSchema.index({ assignmentId: 1 });
photoSchema.index({ partId: 1 });

module.exports = mongoose.model('Photo', photoSchema);
