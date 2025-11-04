const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Job = require('../models/Job');
const Assignment = require('../models/Assignment');
const Vendor = require('../models/Vendor');
const { authenticate, checkPermission } = require('../middleware/auth');

/**
 * @route   POST /api/jobs
 * @desc    Create a new job
 * @access  Private (Admin/Dispatcher)
 */
router.post('/', [
  authenticate,
  body('soNumber').notEmpty().withMessage('SO Number is required'),
  body('customerName').notEmpty().withMessage('Customer name is required'),
  body('customerLastName').notEmpty().withMessage('Customer last name is required'),
  body('customerAddress').notEmpty().withMessage('Customer address is required'),
  body('customerCity').notEmpty().withMessage('Customer city is required'),
  body('customerState').notEmpty().withMessage('Customer state is required'),
  body('customerZip').notEmpty().withMessage('Customer zip is required'),
  body('customerPhone').notEmpty().withMessage('Customer phone is required'),
  body('applianceType').notEmpty().withMessage('Appliance type is required'),
  body('serviceDescription').notEmpty().withMessage('Service description is required'),
  body('scheduledDate').notEmpty().withMessage('Scheduled date is required'),
  body('scheduledTimeWindow').notEmpty().withMessage('Scheduled time window is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: errors.mapped()
      });
    }

    const job = new Job({
      ...req.body,
      createdBy: req.user._id
    });

    await job.save();

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: job
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/jobs/available
 * @desc    Get all available jobs
 * @access  Private
 */
router.get('/available', authenticate, checkPermission('view_assigned_jobs'), async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, city, applianceType } = req.query;

    const query = { status: 'available' };

    if (city) {
      query.customerCity = new RegExp(city, 'i');
    }

    if (applianceType) {
      query.applianceType = new RegExp(applianceType, 'i');
    }

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const total = await Job.countDocuments(query);

    const jobs = await Job.find(query)
      .select('-internalNotes -createdBy')
      .sort({ scheduledDate: 1, priority: -1 })
      .skip(skip)
      .limit(parseInt(pageSize));

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / parseInt(pageSize))
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/jobs/:id
 * @desc    Get single job details
 * @access  Private
 */
router.get('/:id', authenticate, checkPermission('view_assigned_jobs'), async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).select('-internalNotes -createdBy');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
        error: `Job with ID ${req.params.id} not found`
      });
    }

    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/jobs/:id/claims
 * @desc    Claim a job
 * @access  Private
 */
router.post('/:id/claims', authenticate, checkPermission('view_assigned_jobs'), async (req, res, next) => {
  try {
    const { vendorNotes } = req.body;

    if (!req.user.vendorId) {
      return res.status(403).json({
        success: false,
        message: 'No vendor profile associated with this user'
      });
    }

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
        error: `Job with ID ${req.params.id} not found`
      });
    }

    if (job.status !== 'available') {
      return res.status(422).json({
        success: false,
        message: 'Job is not available for claiming',
        error: `Job status is ${job.status}`
      });
    }

    // Check if vendor already has an assignment for this job
    const existingAssignment = await Assignment.findOne({
      jobId: job._id,
      vendorId: req.user.vendorId
    });

    if (existingAssignment) {
      return res.status(422).json({
        success: false,
        message: 'Job already claimed by this vendor'
      });
    }

    // Create assignment
    const assignment = new Assignment({
      jobId: job._id,
      vendorId: req.user.vendorId,
      status: 'assigned',
      scheduledArrival: job.scheduledDate,
      vendorNotes
    });

    await assignment.save();

    // Update job status
    job.status = 'assigned';
    await job.save();

    // Update vendor stats
    await Vendor.findByIdAndUpdate(req.user.vendorId, {
      $inc: { 'stats.totalJobs': 1 }
    });

    res.json({
      success: true,
      message: 'Job successfully claimed',
      data: {
        assignmentId: assignment._id,
        jobId: job._id,
        vendorId: req.user.vendorId,
        status: assignment.status,
        claimedAt: assignment.assignedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/jobs/confirm
 * @desc    Bulk confirm jobs
 * @access  Private
 */
router.post('/confirm', authenticate, checkPermission('view_assigned_jobs'), async (req, res, next) => {
  try {
    const { jobIds, confirmationType } = req.body;

    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      return res.status(422).json({
        success: false,
        message: 'Job IDs array is required'
      });
    }

    if (!req.user.vendorId) {
      return res.status(403).json({
        success: false,
        message: 'No vendor profile associated with this user'
      });
    }

    const results = {
      confirmed: [],
      failed: []
    };

    for (const jobId of jobIds) {
      try {
        const job = await Job.findById(jobId);

        if (!job || job.status !== 'available') {
          results.failed.push({
            jobId,
            reason: 'Job not available'
          });
          continue;
        }

        // Create assignment
        const assignment = new Assignment({
          jobId: job._id,
          vendorId: req.user.vendorId,
          status: 'assigned',
          scheduledArrival: job.scheduledDate
        });

        await assignment.save();

        // Update job status
        job.status = 'assigned';
        await job.save();

        results.confirmed.push({
          jobId,
          assignmentId: assignment._id
        });
      } catch (error) {
        results.failed.push({
          jobId,
          reason: error.message
        });
      }
    }

    // Update vendor stats
    if (results.confirmed.length > 0) {
      await Vendor.findByIdAndUpdate(req.user.vendorId, {
        $inc: { 'stats.totalJobs': results.confirmed.length }
      });
    }

    res.json({
      success: true,
      message: `Confirmed ${results.confirmed.length} jobs`,
      data: results
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/jobs/:id
 * @desc    Update job details
 * @access  Private (Admin/Dispatcher)
 */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      message: 'Job updated successfully',
      data: job
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/jobs/:id
 * @desc    Delete job
 * @access  Private (Admin)
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Delete associated assignments
    await Assignment.deleteMany({ jobId: job._id });

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
