require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const vendorRoutes = require('./routes/vendors');
const jobRoutes = require('./routes/jobs');
const assignmentRoutes = require('./routes/assignments');
const partRoutes = require('./routes/parts');
const adminRoutes = require('./routes/admin');
const jobBoardRoutes = require('./routes/jobboard');

// Import middleware
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests',
    error: 'Rate limit exceeded',
    retryAfter: 60
  }
});

// Apply rate limiting to all routes
app.use('/api/', limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts',
    error: 'Please try again later',
    retryAfter: 900
  }
});

app.use('/api/auth/login', authLimiter);

// Static files (for local uploads)
app.use('/uploads', express.static('uploads'));

// Test page for Sears Parts API
app.get('/test-sears-parts', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-sears-parts.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api', partRoutes); // Parts routes include /api/assignments/:id/parts
app.use('/api/admin', adminRoutes); // Admin CRUD routes
app.use('/api/jobboard', jobBoardRoutes); // Job board proxy routes (no auth required)

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: '1099 Vendor Management API',
    version: '1.0.2',
    endpoints: {
      authentication: {
        login: 'POST /api/auth/login',
        status: 'GET /api/auth/status',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout'
      },
      users: {
        changePassword: 'POST /api/users/change-password',
        getProfile: 'GET /api/users/me'
      },
      vendors: {
        getProfile: 'GET /api/vendors/me',
        getJobs: 'GET /api/vendors/me/jobs',
        getAssignments: 'GET /api/vendors/me/assignments',
        addParts: 'POST /api/vendors/me/parts',
        uploadPhotos: 'POST /api/vendors/me/photos'
      },
      jobs: {
        create: 'POST /api/jobs',
        getAvailable: 'GET /api/jobs/available',
        getById: 'GET /api/jobs/:id',
        claim: 'POST /api/jobs/:id/claims',
        bulkConfirm: 'POST /api/jobs/confirm',
        update: 'PUT /api/jobs/:id',
        delete: 'DELETE /api/jobs/:id'
      },
      assignments: {
        getAll: 'GET /api/assignments',
        getById: 'GET /api/assignments/:id',
        updateStatus: 'PATCH /api/assignments/:id',
        reschedule: 'PUT /api/assignments/:id/schedule'
      },
      parts: {
        add: 'POST /api/assignments/:assignmentId/parts',
        getAll: 'GET /api/assignments/:assignmentId/parts',
        delete: 'DELETE /api/parts/:id',
        uploadPhotos: 'POST /api/vendor/parts/:partId/photos',
        deletePhotos: 'DELETE /api/vendor/parts/:partId/photos'
      }
    }
  });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Database connection
const connectDB = async () => {
  try {
    let mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vendor_management';
    
    // Add authSource if not present and using authentication
    if (mongoURI.includes('@') && !mongoURI.includes('authSource')) {
      mongoURI += (mongoURI.includes('?') ? '&' : '?') + 'authSource=admin';
    }
    
    console.log('Attempting to connect to MongoDB...');
    console.log('URI:', mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')); // Hide password in logs
    
    await mongoose.connect(mongoURI);

    console.log('✓ MongoDB connected successfully');
    console.log(`  Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('✗ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Start listening
    app.listen(PORT, () => {
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║   1099 Vendor Management API Server                   ║');
      console.log('╚════════════════════════════════════════════════════════╝');
      console.log(`\n✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ API Base URL: http://localhost:${PORT}/api`);
      console.log(`✓ Health Check: http://localhost:${PORT}/health`);
      console.log(`✓ API Documentation: http://localhost:${PORT}/api\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

// Start the server
startServer();

module.exports = app;
