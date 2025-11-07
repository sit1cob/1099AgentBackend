const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/**
 * Job Board API Routes
 * These routes provide MongoDB access for the TechMate job board
 * without requiring the Next.js app to connect directly to MongoDB
 */

// Job schema (matches the JobBoardJob interface in Next.js)
const JobSchema = new mongoose.Schema({
  id: Number,
  soNumber: String,
  customerAddress: String,
  customerCity: String,
  customerState: String,
  customerZip: String,
  scheduledDate: String,
  scheduledTime: String,
  applianceType: String,
  manufacturerBrand: String,
  serviceDescription: String,
  status: {
    type: String,
    enum: ['available', 'claimed', 'in-progress', 'arrived', 'completed']
  },
  claimedBy: String,
  claimedAt: String,
  technicianName: String,
  arrivedAt: String,
  startedAt: String,
  completedAt: String,
  lastUpdatedAt: String,
  rescheduledDate: String,
  rescheduledTime: String,
  rescheduleReason: String,
  rescheduledAt: String,
  partOrdered: {
    partDescription: String,
    partNumber: String,
    orderDate: String,
    expectedDelivery: String,
    recordedAt: String
  }
}, { collection: process.env.MONGODB_JOBS_COLLECTION || 'TechMate1099' });

// Get or create the Job model
const Job = mongoose.models.Job || mongoose.model('Job', JobSchema);

/**
 * GET /api/jobboard/available
 * Get all available jobs
 */
router.get('/available', async (req, res) => {
  try {
    console.log('[JobBoard API] Fetching available jobs...');
    const startTime = Date.now();
    
    const jobs = await Job.find({ status: 'available' }).lean();
    
    const queryTime = Date.now() - startTime;
    console.log(`[JobBoard API] ✓ Query completed in ${queryTime}ms`);
    console.log(`[JobBoard API] Found ${jobs.length} available jobs`);
    
    res.json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    console.error('[JobBoard API] ✗ Error fetching available jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available jobs',
      error: error.message
    });
  }
});

/**
 * GET /api/jobboard/jobs/:soNumber
 * Get job by SO number
 */
router.get('/jobs/:soNumber', async (req, res) => {
  try {
    const { soNumber } = req.params;
    console.log(`[JobBoard API] Fetching job: ${soNumber}`);
    
    const job = await Job.findOne({ soNumber }).lean();
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('[JobBoard API] ✗ Error fetching job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job',
      error: error.message
    });
  }
});

/**
 * GET /api/jobboard/jobs/id/:id
 * Get job by ID
 */
router.get('/jobs/id/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[JobBoard API] Fetching job by ID: ${id}`);
    
    const job = await Job.findOne({ id: parseInt(id) }).lean();
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('[JobBoard API] ✗ Error fetching job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job',
      error: error.message
    });
  }
});

/**
 * POST /api/jobboard/jobs/:soNumber/claim
 * Claim a job for a technician
 */
router.post('/jobs/:soNumber/claim', async (req, res) => {
  try {
    const { soNumber } = req.params;
    const { technicianId, technicianName } = req.body;
    
    console.log(`[JobBoard API] Claiming job ${soNumber} for ${technicianName}`);
    
    // Check if job exists and is available
    const job = await Job.findOne({ soNumber });
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    if (job.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: `Job already ${job.status}`
      });
    }
    
    // Claim the job
    const updatedJob = await Job.findOneAndUpdate(
      { soNumber, status: 'available' },
      { 
        $set: { 
          status: 'claimed',
          claimedBy: technicianId,
          claimedAt: new Date().toISOString(),
          technicianName: technicianName,
          lastUpdatedAt: new Date().toISOString()
        } 
      },
      { new: true }
    ).lean();
    
    if (!updatedJob) {
      return res.status(409).json({
        success: false,
        message: 'Failed to claim job (may have been claimed by someone else)'
      });
    }
    
    console.log(`[JobBoard API] ✓ Job ${soNumber} claimed successfully`);
    
    res.json({
      success: true,
      message: 'Job claimed successfully',
      data: updatedJob
    });
  } catch (error) {
    console.error('[JobBoard API] ✗ Error claiming job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to claim job',
      error: error.message
    });
  }
});

/**
 * PATCH /api/jobboard/jobs/:soNumber/status
 * Update job status
 */
router.patch('/jobs/:soNumber/status', async (req, res) => {
  try {
    const { soNumber } = req.params;
    const { status, ...additionalData } = req.body;
    
    console.log(`[JobBoard API] Updating job ${soNumber} status to ${status}`);
    
    const updateData = {
      status,
      lastUpdatedAt: new Date().toISOString(),
      ...additionalData
    };
    
    // Add specific timestamp fields based on status
    if (status === 'arrived' && !updateData.arrivedAt) {
      updateData.arrivedAt = new Date().toISOString();
    } else if (status === 'in-progress' && !updateData.startedAt) {
      updateData.startedAt = new Date().toISOString();
    } else if (status === 'completed' && !updateData.completedAt) {
      updateData.completedAt = new Date().toISOString();
    }
    
    const updatedJob = await Job.findOneAndUpdate(
      { soNumber },
      { $set: updateData },
      { new: true }
    ).lean();
    
    if (!updatedJob) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    console.log(`[JobBoard API] ✓ Job ${soNumber} status updated to ${status}`);
    
    res.json({
      success: true,
      message: `Job status updated to ${status}`,
      data: updatedJob
    });
  } catch (error) {
    console.error('[JobBoard API] ✗ Error updating job status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update job status',
      error: error.message
    });
  }
});

/**
 * GET /api/jobboard/technician/:technicianId/jobs
 * Get all jobs for a technician
 */
router.get('/technician/:technicianId/jobs', async (req, res) => {
  try {
    const { technicianId } = req.params;
    console.log(`[JobBoard API] Fetching jobs for technician: ${technicianId}`);
    
    const jobs = await Job.find({ 
      claimedBy: technicianId,
      status: { $in: ['claimed', 'in-progress', 'arrived', 'completed'] }
    }).lean();
    
    res.json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    console.error('[JobBoard API] ✗ Error fetching technician jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch technician jobs',
      error: error.message
    });
  }
});

/**
 * GET /api/jobboard/technician/:technicianId/jobs/today
 * Get today's jobs for a technician
 */
router.get('/technician/:technicianId/jobs/today', async (req, res) => {
  try {
    const { technicianId } = req.params;
    console.log(`[JobBoard API] Fetching today's jobs for technician: ${technicianId}`);
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    
    const jobs = await Job.find({
      claimedBy: technicianId,
      status: { $in: ['claimed', 'in-progress', 'arrived'] },
      $or: [
        {
          rescheduledDate: {
            $gte: startOfDay.toISOString(),
            $lt: endOfDay.toISOString()
          }
        },
        {
          rescheduledDate: { $exists: false },
          scheduledDate: {
            $gte: startOfDay.toISOString(),
            $lt: endOfDay.toISOString()
          }
        }
      ]
    }).sort({ soNumber: 1 }).lean();
    
    res.json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    console.error('[JobBoard API] ✗ Error fetching today\'s jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s jobs',
      error: error.message
    });
  }
});

/**
 * PUT /api/jobboard/jobs/:soNumber/reschedule
 * Reschedule a job
 */
router.put('/jobs/:soNumber/reschedule', async (req, res) => {
  try {
    const { soNumber } = req.params;
    const { newDate, newTime, reason } = req.body;
    
    console.log(`[JobBoard API] Rescheduling job ${soNumber}`);
    
    const updatedJob = await Job.findOneAndUpdate(
      { soNumber },
      { 
        $set: { 
          rescheduledDate: newDate,
          rescheduledTime: newTime,
          rescheduleReason: reason,
          rescheduledAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString()
        } 
      },
      { new: true }
    ).lean();
    
    if (!updatedJob) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    console.log(`[JobBoard API] ✓ Job ${soNumber} rescheduled successfully`);
    
    res.json({
      success: true,
      message: 'Job rescheduled successfully',
      data: updatedJob
    });
  } catch (error) {
    console.error('[JobBoard API] ✗ Error rescheduling job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reschedule job',
      error: error.message
    });
  }
});

/**
 * GET /api/jobboard/search
 * Search jobs with filters
 */
router.get('/search', async (req, res) => {
  try {
    const { applianceType, location, state, dateFrom, dateTo, status } = req.query;
    
    console.log('[JobBoard API] Searching jobs with filters:', req.query);
    
    const query = {};
    
    if (status) query.status = status;
    if (applianceType) query.applianceType = new RegExp(applianceType, 'i');
    if (location) query.customerCity = new RegExp(location, 'i');
    if (state) query.customerState = state;
    
    if (dateFrom || dateTo) {
      query.scheduledDate = {};
      if (dateFrom) query.scheduledDate.$gte = new Date(dateFrom).toISOString();
      if (dateTo) query.scheduledDate.$lte = new Date(dateTo).toISOString();
    }
    
    const jobs = await Job.find(query).lean();
    
    res.json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    console.error('[JobBoard API] ✗ Error searching jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search jobs',
      error: error.message
    });
  }
});

/**
 * GET /api/jobboard/test
 * Test MongoDB connection
 */
router.get('/test', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test connection
    const totalJobs = await Job.countDocuments({});
    const availableJobs = await Job.countDocuments({ status: 'available' });
    
    const duration = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'MongoDB connection successful',
      data: {
        totalJobs,
        availableJobs,
        collection: process.env.MONGODB_JOBS_COLLECTION || 'TechMate1099',
        database: mongoose.connection.name,
        duration: `${duration}ms`
      }
    });
  } catch (error) {
    console.error('[JobBoard API] ✗ Connection test failed:', error);
    res.status(500).json({
      success: false,
      message: 'MongoDB connection failed',
      error: error.message
    });
  }
});

module.exports = router;
