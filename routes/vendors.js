const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');
const Assignment = require('../models/Assignment');
const Job = require('../models/Job');
const Part = require('../models/Part');
const Photo = require('../models/Photo');
const { authenticate, checkPermission } = require('../middleware/auth');
const { upload } = require('../config/upload');

/**
 * @route   GET /api/vendors/me
 * @desc    Get current vendor profile
 * @access  Private
 */
router.get('/me', authenticate, checkPermission('view_vendor_portal'), async (req, res, next) => {
  try {
    if (!req.user.vendorId) {
      return res.status(404).json({
        success: false,
        message: 'No vendor profile associated with this user'
      });
    }

    const vendor = await Vendor.findById(req.user.vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: vendor._id,
        name: vendor.name,
        phoneNumber: vendor.phoneNumber,
        email: vendor.email,
        address: vendor.address,
        isActive: vendor.isActive,
        specialties: vendor.specialties,
        serviceAreas: vendor.serviceAreas,
        createdAt: vendor.createdAt,
        stats: vendor.stats
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/vendors/me/jobs
 * @desc    Get jobs available for current vendor
 * @access  Private
 */
router.get('/me/jobs', authenticate, checkPermission('view_assigned_jobs'), async (req, res, next) => {
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
 * @route   GET /api/vendors/me/assignments
 * @desc    Get all assignments for current vendor
 * @access  Private
 */
router.get('/me/assignments', authenticate, checkPermission('view_assigned_jobs'), async (req, res, next) => {
  try {
    if (!req.user.vendorId) {
      return res.status(404).json({
        success: false,
        message: 'No vendor profile associated with this user'
      });
    }

    const { status, dateFrom, dateTo } = req.query;

    const query = { vendorId: req.user.vendorId };

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
      .populate({
        path: 'jobId',
        select: 'soNumber customerName customerLastName customerAddress customerCity customerState customerZip customerPhone applianceType applianceBrand modelNumber serviceDescription scheduledDate scheduledTimeWindow priority'
      })
      .sort({ scheduledArrival: 1 });

    const formattedAssignments = assignments.map(assignment => ({
      id: assignment._id,
      jobId: assignment.jobId._id,
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
        serviceDescription: assignment.jobId.serviceDescription,
        scheduledDate: assignment.jobId.scheduledDate,
        scheduledTimeWindow: assignment.jobId.scheduledTimeWindow,
        priority: assignment.jobId.priority
      },
      status: assignment.status,
      assignedAt: assignment.assignedAt,
      scheduledArrival: assignment.scheduledArrival,
      actualArrival: assignment.actualArrival,
      completedAt: assignment.completedAt,
      notes: assignment.notes,
      vendorNotes: assignment.vendorNotes
    }));

    res.json({
      success: true,
      data: formattedAssignments
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/vendors/me/parts
 * @desc    Add parts to assignment
 * @access  Private
 */
router.post('/me/parts', authenticate, checkPermission('upload_parts'), async (req, res, next) => {
  try {
    const { assignmentId, parts } = req.body;

    if (!assignmentId || !parts || !Array.isArray(parts)) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: {
          assignmentId: 'Assignment ID is required',
          parts: 'Parts array is required'
        }
      });
    }

    // Verify assignment belongs to vendor
    const assignment = await Assignment.findOne({
      _id: assignmentId,
      vendorId: req.user.vendorId
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found or does not belong to this vendor'
      });
    }

    // Create parts
    const createdParts = [];
    for (const partData of parts) {
      const part = new Part({
        assignmentId,
        partNumber: partData.partNumber,
        partName: partData.partName,
        quantity: partData.quantity,
        unitCost: partData.unitCost,
        notes: partData.notes,
        addedBy: req.user._id
      });
      await part.save();
      createdParts.push(part);
    }

    res.json({
      success: true,
      data: createdParts
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/vendors/me/photos
 * @desc    Upload photos for assignment
 * @access  Private
 */
router.post('/me/photos', authenticate, checkPermission('upload_parts'), upload.array('photos', 10), async (req, res, next) => {
  try {
    const { assignmentId, description } = req.body;

    if (!assignmentId) {
      return res.status(422).json({
        success: false,
        message: 'Assignment ID is required'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(422).json({
        success: false,
        message: 'No photos uploaded'
      });
    }

    // Verify assignment belongs to vendor
    const assignment = await Assignment.findOne({
      _id: assignmentId,
      vendorId: req.user.vendorId
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found or does not belong to this vendor'
      });
    }

    // Create photo records
    const uploadedPhotos = [];
    for (const file of req.files) {
      const photo = new Photo({
        assignmentId,
        filename: file.filename || file.key,
        originalName: file.originalname,
        url: file.location || `/uploads/photos/${file.filename}`,
        s3Key: file.key,
        mimeType: file.mimetype,
        size: file.size,
        description,
        uploadedBy: req.user._id
      });
      await photo.save();
      uploadedPhotos.push({
        id: photo._id,
        filename: photo.filename,
        url: photo.url,
        uploadedAt: photo.createdAt
      });
    }

    res.json({
      success: true,
      data: {
        uploaded: uploadedPhotos.length,
        files: uploadedPhotos
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
