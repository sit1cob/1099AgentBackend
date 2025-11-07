const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Part = require('../models/Part');
const Assignment = require('../models/Assignment');
const Photo = require('../models/Photo');
const { authenticate, checkPermission } = require('../middleware/auth');
const { upload } = require('../config/upload');
const fetch = require('node-fetch');

/**
 * @route   POST /api/assignments/:assignmentId/parts
 * @desc    Add parts to assignment
 * @access  Private
 */
router.post('/assignments/:assignmentId/parts', [
  authenticate,
  checkPermission('upload_parts'),
  body('partNumber').notEmpty().withMessage('Part number is required'),
  body('partName').notEmpty().withMessage('Part name is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be greater than 0'),
  body('unitCost').isFloat({ min: 0 }).withMessage('Unit cost must be a positive number')
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

    const { assignmentId } = req.params;
    const { partNumber, partName, quantity, unitCost, notes } = req.body;

    // Verify assignment exists and belongs to vendor
    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check if vendor can add parts to this assignment
    if (req.user.role === 'registered_user' && req.user.vendorId) {
      if (assignment.vendorId.toString() !== req.user.vendorId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          error: 'You do not have access to this assignment'
        });
      }
    }

    const part = new Part({
      assignmentId,
      partNumber,
      partName,
      quantity,
      unitCost,
      notes,
      addedBy: req.user._id
    });

    await part.save();

    res.json({
      success: true,
      data: {
        id: part._id,
        assignmentId: part.assignmentId,
        partNumber: part.partNumber,
        partName: part.partName,
        quantity: part.quantity,
        unitCost: part.unitCost,
        totalCost: part.totalCost,
        addedAt: part.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/assignments/:assignmentId/parts
 * @desc    Get all parts for an assignment
 * @access  Private
 */
router.get('/assignments/:assignmentId/parts', authenticate, checkPermission('view_assigned_jobs'), async (req, res, next) => {
  try {
    const { assignmentId } = req.params;

    // Verify assignment exists
    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check if vendor can view parts for this assignment
    if (req.user.role === 'registered_user' && req.user.vendorId) {
      if (assignment.vendorId.toString() !== req.user.vendorId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          error: 'You do not have access to this assignment'
        });
      }
    }

    const parts = await Part.find({ assignmentId });

    res.json({
      success: true,
      data: parts
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/parts/:id
 * @desc    Delete a part
 * @access  Private
 */
router.delete('/:id', authenticate, checkPermission('upload_parts'), async (req, res, next) => {
  try {
    const part = await Part.findById(req.params.id);

    if (!part) {
      return res.status(404).json({
        success: false,
        message: 'Part not found'
      });
    }

    // Verify assignment belongs to vendor
    const assignment = await Assignment.findById(part.assignmentId);

    if (req.user.role === 'registered_user' && req.user.vendorId) {
      if (assignment.vendorId.toString() !== req.user.vendorId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          error: 'You do not have access to this part'
        });
      }
    }

    await Part.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Part deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/vendor/parts/:partId/photos
 * @desc    Upload photos for a part
 * @access  Private
 */
router.post('/vendor/parts/:partId/photos', authenticate, checkPermission('upload_parts'), upload.array('photos', 10), async (req, res, next) => {
  try {
    const { partId } = req.params;
    const { description } = req.body;

    const part = await Part.findById(partId);

    if (!part) {
      return res.status(404).json({
        success: false,
        message: 'Part not found'
      });
    }

    // Verify assignment belongs to vendor
    const assignment = await Assignment.findById(part.assignmentId);

    if (req.user.role === 'registered_user' && req.user.vendorId) {
      if (assignment.vendorId.toString() !== req.user.vendorId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }
    }

    if (!req.files || req.files.length === 0) {
      return res.status(422).json({
        success: false,
        message: 'No photos uploaded'
      });
    }

    // Create photo records
    const uploadedPhotos = [];
    for (const file of req.files) {
      const photo = new Photo({
        assignmentId: part.assignmentId,
        partId: part._id,
        filename: file.filename || file.key,
        originalName: file.originalname,
        url: file.location || `/uploads/photos/${file.filename}`,
        s3Key: file.key,
        mimeType: file.mimetype,
        size: file.size,
        description,
        uploadedBy: req.user._id,
        photoType: 'part'
      });
      await photo.save();

      // Add to part's photos array
      part.photos.push({
        filename: photo.filename,
        url: photo.url,
        uploadedAt: photo.createdAt
      });

      uploadedPhotos.push({
        id: photo._id,
        filename: photo.filename,
        url: photo.url,
        uploadedAt: photo.createdAt
      });
    }

    await part.save();

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

/**
 * @route   DELETE /api/vendor/parts/:partId/photos
 * @desc    Delete photos for a part
 * @access  Private
 */
router.delete('/vendor/parts/:partId/photos', authenticate, checkPermission('upload_parts'), async (req, res, next) => {
  try {
    const { partId } = req.params;
    const { photoIds } = req.body;

    if (!photoIds || !Array.isArray(photoIds)) {
      return res.status(422).json({
        success: false,
        message: 'Photo IDs array is required'
      });
    }

    const part = await Part.findById(partId);

    if (!part) {
      return res.status(404).json({
        success: false,
        message: 'Part not found'
      });
    }

    // Verify assignment belongs to vendor
    const assignment = await Assignment.findById(part.assignmentId);

    if (req.user.role === 'registered_user' && req.user.vendorId) {
      if (assignment.vendorId.toString() !== req.user.vendorId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }
    }

    // Delete photos
    await Photo.deleteMany({
      _id: { $in: photoIds },
      partId: part._id
    });

    // Update part's photos array
    part.photos = part.photos.filter(photo => 
      !photoIds.includes(photo._id?.toString())
    );
    await part.save();

    res.json({
      success: true,
      message: 'Photos deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/parts/search-sears
 * @desc    Search Sears Parts Direct GraphQL catalog
 * @access  Public (for testing)
 */
router.post('/parts/search-sears', async (req, res, next) => {
  try {
    const { partNumber, modelNumber } = req.body;

    if (!partNumber) {
      return res.status(422).json({
        success: false,
        message: 'Part number is required'
      });
    }

    const GRAPHQL_ENDPOINT = 'https://catalog-staging.searspartsdirect.com/graphql';
    const GRAPHQL_API_KEY = 'a3kbNXnE0P81WOl04J7xd5o82pm2f3LB5vscNPUA';

    console.log(`[Sears Parts API] Searching for part: ${partNumber}${modelNumber ? ` (model: ${modelNumber})` : ''}`);

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'x-api-key': GRAPHQL_API_KEY 
      },
      body: JSON.stringify({
        query: `
          query PartSearch($q: String!) {
            partSearch(q: $q) {
              parts {
                id
                number
                title
                description
                pricing { sell }
                models { models { number title } }
              }
            }
          }
        `,
        variables: { q: partNumber },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Sears Parts API] GraphQL request failed: ${response.status} - ${errorText}`);
      return res.status(response.status).json({
        success: false,
        message: `Sears API returned ${response.status}`,
        error: errorText
      });
    }

    const data = await response.json();
    let parts = data?.data?.partSearch?.parts ?? [];

    console.log(`[Sears Parts API] Found ${parts.length} results before filtering`);

    // Filter to exact part number matches
    parts = parts.filter((p) => p.number === partNumber);

    console.log(`[Sears Parts API] Found ${parts.length} exact matches for ${partNumber}`);

    // If model number provided, sort by compatibility
    if (modelNumber) {
      parts.sort((a, b) => {
        const aHit = (a.models?.models ?? []).some((m) => m.number === modelNumber);
        const bHit = (b.models?.models ?? []).some((m) => m.number === modelNumber);
        return Number(bHit) - Number(aHit);
      });
    }

    // Take top 3 results
    const topParts = parts.slice(0, 3);

    // Format results
    const formattedParts = topParts.map((part) => ({
      id: part.id ?? null,
      number: part.number ?? null,
      title: part.title ?? null,
      price: typeof part.pricing?.sell === 'number' 
        ? part.pricing.sell 
        : Number(part.pricing?.sell ?? NaN) || null,
      models: (part.models?.models ?? []).map((model) =>
        [model.number ?? '', model.title ?? ''].filter(Boolean).join(' — ')
      ),
      description: part.description ?? null,
    }));

    const fallbackUrl = `https://www.searspartsdirect.com/search?q=${encodeURIComponent(partNumber)}`;

    res.json({
      success: true,
      partNumber,
      modelNumber: modelNumber || null,
      count: formattedParts.length,
      parts: formattedParts,
      fallbackUrl,
      message: formattedParts.length > 0 
        ? `Found ${formattedParts.length} matching part(s)` 
        : `No exact matches found for ${partNumber}. Try the fallback URL.`
    });

  } catch (error) {
    console.error('[Sears Parts API] Error:', error);
    next(error);
  }
});

module.exports = router;
