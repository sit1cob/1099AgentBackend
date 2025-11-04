const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Assignment = require('../models/Assignment');
const Job = require('../models/Job');
const Part = require('../models/Part');
const Photo = require('../models/Photo');
const Vendor = require('../models/Vendor');
const { authenticate, checkPermission } = require('../middleware/auth');

/**
 * @route   GET /api/assignments
 * @desc    Get all assignments (filtered by vendor for registered_user role)
 * @access  Private
 */
router.get('/', authenticate, checkPermission('view_assigned_jobs'), async (req, res, next) => {
  try {
    const query = {};

    // If user is a vendor, only show their assignments
    if (req.user.role === 'registered_user' && req.user.vendorId) {
      query.vendorId = req.user.vendorId;
    }

    const { status, dateFrom, dateTo } = req.query;

    if (status) {
      query.status = status;
    }

    if (dateFrom || dateTo) {
      query.scheduledArrival = {};
      if (dateFrom) {
        query.scheduledArrival.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.scheduledArrival.$lte = new Date(dateTo);
      }
    }

    const assignments = await Assignment.find(query)
      .populate('jobId')
      .populate('vendorId')
      .sort({ scheduledArrival: 1 });

    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/assignments/:id
 * @desc    Get single assignment details
 * @access  Private
 */
router.get('/:id', authenticate, checkPermission('view_assigned_jobs'), async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('jobId')
      .populate('vendorId');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
        error: `Assignment with ID ${req.params.id} not found`
      });
    }

    // Check if vendor can access this assignment
    if (req.user.role === 'registered_user' && req.user.vendorId) {
      if (assignment.vendorId._id.toString() !== req.user.vendorId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          error: 'You do not have access to this assignment'
        });
      }
    }

    // Get parts and photos
    const parts = await Part.find({ assignmentId: assignment._id });
    const photos = await Photo.find({ assignmentId: assignment._id });

    const response = {
      id: assignment._id,
      jobId: assignment.jobId._id,
      vendorId: assignment.vendorId._id,
      status: assignment.status,
      assignedAt: assignment.assignedAt,
      scheduledArrival: assignment.scheduledArrival,
      actualArrival: assignment.actualArrival,
      workStarted: assignment.workStarted,
      completedAt: assignment.completedAt,
      notes: assignment.notes,
      vendorNotes: assignment.vendorNotes,
      completionNotes: assignment.completionNotes,
      laborHours: assignment.laborHours,
      totalPartsCost: assignment.totalPartsCost,
      totalLaborCost: assignment.totalLaborCost,
      totalCost: assignment.totalCost,
      job: {
        soNumber: assignment.jobId.soNumber,
        customerName: `${assignment.jobId.customerName} ${assignment.jobId.customerLastName}`,
        customerAddress: assignment.jobId.customerAddress,
        customerCity: assignment.jobId.customerCity,
        customerState: assignment.jobId.customerState,
        customerZip: assignment.jobId.customerZip,
        customerPhone: assignment.jobId.customerPhone,
        applianceType: assignment.jobId.applianceType,
        applianceBrand: assignment.jobId.applianceBrand,
        modelNumber: assignment.jobId.modelNumber,
        serialNumber: assignment.jobId.serialNumber,
        serviceDescription: assignment.jobId.serviceDescription,
        scheduledDate: assignment.jobId.scheduledDate,
        scheduledTimeWindow: assignment.jobId.scheduledTimeWindow
      },
      parts,
      photos
    };

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/assignments/:id
 * @desc    Update assignment status
 * @access  Private
 */
router.patch('/:id', authenticate, checkPermission('update_job_status'), async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
        error: `Assignment with ID ${req.params.id} not found`
      });
    }

    // Check if vendor can update this assignment
    if (req.user.role === 'registered_user' && req.user.vendorId) {
      if (assignment.vendorId.toString() !== req.user.vendorId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          error: 'You do not have access to this assignment'
        });
      }
    }

    const {
      status,
      actualArrival,
      workStarted,
      completedAt,
      notes,
      completionNotes,
      customerSignature,
      laborHours,
      totalLaborCost
    } = req.body;

    // Update fields
    if (status) {
      assignment.status = status;

      // Auto-set timestamps based on status
      if (status === 'arrived' && !assignment.actualArrival) {
        assignment.actualArrival = actualArrival || new Date();
      }
      if (status === 'in_progress' && !assignment.workStarted) {
        assignment.workStarted = workStarted || new Date();
      }
      if (status === 'completed') {
        assignment.completedAt = completedAt || new Date();
        
        // Update vendor stats
        await Vendor.findByIdAndUpdate(assignment.vendorId, {
          $inc: { 'stats.completedJobs': 1 }
        });

        // Generate invoice number
        if (!assignment.invoice.invoiceNumber) {
          assignment.invoice.invoiceNumber = `INV-${new Date().getFullYear()}-${assignment._id.toString().slice(-6)}`;
          assignment.invoice.generatedAt = new Date();
        }
      }
    }

    if (actualArrival) assignment.actualArrival = actualArrival;
    if (workStarted) assignment.workStarted = workStarted;
    if (completedAt) assignment.completedAt = completedAt;
    if (notes) assignment.notes = notes;
    if (completionNotes) assignment.completionNotes = completionNotes;
    if (customerSignature) assignment.customerSignature = customerSignature;
    if (laborHours !== undefined) assignment.laborHours = laborHours;
    if (totalLaborCost !== undefined) {
      assignment.totalLaborCost = totalLaborCost;
      assignment.totalCost = assignment.totalPartsCost + totalLaborCost;
    }

    await assignment.save();

    const response = {
      id: assignment._id,
      status: assignment.status,
      assignedAt: assignment.assignedAt,
      scheduledArrival: assignment.scheduledArrival,
      actualArrival: assignment.actualArrival,
      workStarted: assignment.workStarted,
      completedAt: assignment.completedAt,
      laborHours: assignment.laborHours,
      totalPartsCost: assignment.totalPartsCost,
      totalLaborCost: assignment.totalLaborCost,
      totalCost: assignment.totalCost
    };

    if (assignment.status === 'completed' && assignment.invoice.invoiceNumber) {
      response.invoice = {
        invoiceNumber: assignment.invoice.invoiceNumber,
        totalCost: assignment.totalCost,
        pdfUrl: assignment.invoice.pdfUrl || `/invoices/${assignment.invoice.invoiceNumber}.pdf`
      };
    }

    res.json({
      success: true,
      message: assignment.status === 'completed' ? 'Assignment completed successfully' : 'Assignment updated successfully',
      data: response
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/assignments/:id/schedule
 * @desc    Reschedule assignment
 * @access  Private
 */
router.put('/:id/schedule', authenticate, checkPermission('update_job_status'), async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
        error: `Assignment with ID ${req.params.id} not found`
      });
    }

    // Check if vendor can update this assignment
    if (req.user.role === 'registered_user' && req.user.vendorId) {
      if (assignment.vendorId.toString() !== req.user.vendorId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          error: 'You do not have access to this assignment'
        });
      }
    }

    const { newScheduledDate, newTimeWindow, rescheduleReason, vendorNotes } = req.body;

    if (!newScheduledDate) {
      return res.status(422).json({
        success: false,
        message: 'New scheduled date is required'
      });
    }

    // Save reschedule info
    assignment.rescheduleInfo = {
      originalDate: assignment.scheduledArrival,
      newDate: new Date(newScheduledDate),
      reason: rescheduleReason,
      requestedAt: new Date()
    };

    assignment.scheduledArrival = new Date(newScheduledDate);
    assignment.status = 'rescheduled';
    
    if (vendorNotes) {
      assignment.vendorNotes = vendorNotes;
    }

    await assignment.save();

    // Update job
    const job = await Job.findById(assignment.jobId);
    if (job) {
      job.scheduledDate = new Date(newScheduledDate);
      if (newTimeWindow) {
        job.scheduledTimeWindow = newTimeWindow;
      }
      await job.save();
    }

    res.json({
      success: true,
      message: 'Assignment rescheduled successfully',
      data: {
        id: assignment._id,
        status: assignment.status,
        scheduledArrival: assignment.scheduledArrival,
        rescheduleInfo: assignment.rescheduleInfo
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/assignments/:id/schedule
 * @desc    Reschedule assignment (alternative endpoint)
 * @access  Private
 */
router.post('/:id/schedule', authenticate, checkPermission('update_job_status'), async (req, res, next) => {
  // Reuse the PUT handler
  req.method = 'PUT';
  router.handle(req, res, next);
});

module.exports = router;
