const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Job = require('../models/Job');
const Assignment = require('../models/Assignment');
const { authenticate, checkRole } = require('../middleware/auth');

// ============================================
// VENDOR MANAGEMENT (CRUD)
// ============================================

/**
 * @route   GET /api/admin/vendors
 * @desc    Get all vendors
 * @access  Admin
 */
router.get('/vendors', authenticate, checkRole('admin'), async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, search, isActive } = req.query;

    const query = {};
    
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const total = await Vendor.countDocuments(query);

    const vendors = await Vendor.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(pageSize));

    res.json({
      success: true,
      data: {
        vendors,
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
 * @route   GET /api/admin/vendors/:id
 * @desc    Get single vendor
 * @access  Admin
 */
router.get('/vendors/:id', authenticate, checkRole('admin'), async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Get associated user
    const user = await User.findOne({ vendorId: vendor._id }).select('-password');

    // Get vendor's assignments
    const assignments = await Assignment.find({ vendorId: vendor._id })
      .populate('jobId')
      .sort({ assignedAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        vendor,
        user,
        recentAssignments: assignments
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/admin/vendors
 * @desc    Create new vendor
 * @access  Admin
 */
router.post('/vendors', [
  authenticate,
  checkRole('admin'),
  body('name').notEmpty().withMessage('Vendor name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phoneNumber').notEmpty().withMessage('Phone number is required')
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

    const { name, email, phoneNumber, address, specialties, serviceAreas } = req.body;

    // Check if vendor with email already exists
    const existingVendor = await Vendor.findOne({ email });
    if (existingVendor) {
      return res.status(422).json({
        success: false,
        message: 'Vendor with this email already exists'
      });
    }

    const vendor = new Vendor({
      name,
      email,
      phoneNumber,
      address,
      specialties,
      serviceAreas,
      isActive: true
    });

    await vendor.save();

    res.status(201).json({
      success: true,
      message: 'Vendor created successfully',
      data: vendor
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/admin/vendors/:id
 * @desc    Update vendor
 * @access  Admin
 */
router.put('/vendors/:id', authenticate, checkRole('admin'), async (req, res, next) => {
  try {
    const { name, email, phoneNumber, address, specialties, serviceAreas, isActive } = req.body;

    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Update fields
    if (name) vendor.name = name;
    if (email) vendor.email = email;
    if (phoneNumber) vendor.phoneNumber = phoneNumber;
    if (address) vendor.address = address;
    if (specialties) vendor.specialties = specialties;
    if (serviceAreas) vendor.serviceAreas = serviceAreas;
    if (isActive !== undefined) vendor.isActive = isActive;

    await vendor.save();

    res.json({
      success: true,
      message: 'Vendor updated successfully',
      data: vendor
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/admin/vendors/:id
 * @desc    Delete vendor (soft delete - set isActive to false)
 * @access  Admin
 */
router.delete('/vendors/:id', authenticate, checkRole('admin'), async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Soft delete - set isActive to false
    vendor.isActive = false;
    await vendor.save();

    // Also deactivate associated user
    await User.updateMany({ vendorId: vendor._id }, { isActive: false });

    res.json({
      success: true,
      message: 'Vendor deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// USER MANAGEMENT (CRUD)
// ============================================

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Admin
 */
router.get('/users', authenticate, checkRole('admin'), async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, role, isActive } = req.query;

    const query = {};
    
    if (role) {
      query.role = role;
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const total = await User.countDocuments(query);

    const users = await User.find(query)
      .select('-password -refreshToken')
      .populate('vendorId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(pageSize));

    res.json({
      success: true,
      data: {
        users,
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
 * @route   GET /api/admin/users/:id
 * @desc    Get single user
 * @access  Admin
 */
router.get('/users/:id', authenticate, checkRole('admin'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshToken')
      .populate('vendorId');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/admin/users
 * @desc    Create new user
 * @access  Admin
 */
router.post('/users', [
  authenticate,
  checkRole('admin'),
  body('username').notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['admin', 'registered_user', 'dispatcher']).withMessage('Invalid role')
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

    const { username, email, password, role, vendorId, permissions } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(422).json({
        success: false,
        message: 'User with this username or email already exists'
      });
    }

    const user = new User({
      username,
      email,
      password,
      role,
      vendorId,
      permissions,
      isActive: true
    });

    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user
 * @access  Admin
 */
router.put('/users/:id', authenticate, checkRole('admin'), async (req, res, next) => {
  try {
    const { username, email, role, vendorId, permissions, isActive } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (username) user.username = username;
    if (email) user.email = email;
    if (role) user.role = role;
    if (vendorId !== undefined) user.vendorId = vendorId;
    if (permissions) user.permissions = permissions;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    // Remove sensitive data
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;

    res.json({
      success: true,
      message: 'User updated successfully',
      data: userResponse
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user (soft delete)
 * @access  Admin
 */
router.delete('/users/:id', authenticate, checkRole('admin'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Soft delete
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/admin/users/:id/reset-password
 * @desc    Reset user password
 * @access  Admin
 */
router.post('/users/:id/reset-password', [
  authenticate,
  checkRole('admin'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
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

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// JOB MANAGEMENT (CRUD)
// ============================================

/**
 * @route   GET /api/admin/jobs
 * @desc    Get all jobs (admin view)
 * @access  Admin
 */
router.get('/jobs', authenticate, checkRole('admin'), async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, status, priority, city } = req.query;

    const query = {};
    
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (city) query.customerCity = new RegExp(city, 'i');

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const total = await Job.countDocuments(query);

    const jobs = await Job.find(query)
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 })
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
 * @route   GET /api/admin/stats
 * @desc    Get dashboard statistics
 * @access  Admin
 */
router.get('/stats', authenticate, checkRole('admin'), async (req, res, next) => {
  try {
    const [
      totalVendors,
      activeVendors,
      totalJobs,
      availableJobs,
      assignedJobs,
      completedJobs,
      totalUsers
    ] = await Promise.all([
      Vendor.countDocuments(),
      Vendor.countDocuments({ isActive: true }),
      Job.countDocuments(),
      Job.countDocuments({ status: 'available' }),
      Job.countDocuments({ status: 'assigned' }),
      Job.countDocuments({ status: 'completed' }),
      User.countDocuments()
    ]);

    res.json({
      success: true,
      data: {
        vendors: {
          total: totalVendors,
          active: activeVendors,
          inactive: totalVendors - activeVendors
        },
        jobs: {
          total: totalJobs,
          available: availableJobs,
          assigned: assignedJobs,
          completed: completedJobs
        },
        users: {
          total: totalUsers
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
