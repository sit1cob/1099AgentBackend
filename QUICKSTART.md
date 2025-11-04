# Quick Start Guide

Get the 1099 Vendor Management API up and running in minutes.

## Prerequisites

- Node.js v14+ installed
- MongoDB running (local or remote)
- AWS S3 bucket configured (optional, for photo uploads)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

The `.env` file is already configured. Update these values if needed:

```env
# Server
PORT=3000
NODE_ENV=development

# Database - Update if using different MongoDB
MONGODB_URI=mongodb://root:root123@connectivity-rs0.scheduler2.searskairos.ai:27017/api

# JWT Secrets - CHANGE THESE IN PRODUCTION!
JWT_SECRET=your-secret-key-change-in-production-make-it-long-and-secure
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production-make-it-long-and-secure

# AWS S3 - Already configured
AWS_REGION=us-east-2
S3_BUCKET=lc-sywrelay-sears-1099
USE_S3=true
```

### 3. Seed the Database

Populate the database with test data:

```bash
npm run seed
```

This creates:
- **3 vendors** with different specialties
- **4 users** (1 admin + 3 vendor users)
- **5 sample jobs** ready to be claimed

### 4. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# OR Production mode
npm start
```

You should see:

```
╔════════════════════════════════════════════════════════╗
║   1099 Vendor Management API Server                   ║
╚════════════════════════════════════════════════════════╝

✓ Server running on port 3000
✓ Environment: development
✓ API Base URL: http://localhost:3000/api
✓ Health Check: http://localhost:3000/health
✓ API Documentation: http://localhost:3000/api
```

## Test the API

### Option 1: Using cURL

**Login as a vendor:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_vendor",
    "password": "vendor123",
    "role": "registered_user"
  }'
```

**Get available jobs:**
```bash
curl -X GET http://localhost:3000/api/jobs/available \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Option 2: Using Postman

1. Import `postman_collection.json` into Postman
2. Update the `baseUrl` variable if needed (default: `http://localhost:3000/api`)
3. Run the "Login" request first - it will automatically save the access token
4. All other requests will use the saved token automatically

### Option 3: Using Browser

Visit these URLs in your browser:

- **Health Check**: http://localhost:3000/health
- **API Documentation**: http://localhost:3000/api

## Test Credentials

After running `npm run seed`, use these credentials:

### Admin Account
```
Username: admin
Password: admin123
Role: admin
```

### Vendor Accounts

**Vendor 1 - John's Appliance Repair**
```
Username: john_vendor
Email: john@appliancerepair.com
Password: vendor123
Specialties: Refrigerator, Dishwasher, Washer, Dryer
Location: Chicago, IL
```

**Vendor 2 - Mike's Home Services**
```
Username: mike_vendor
Email: mike@homeservices.com
Password: vendor123
Specialties: Refrigerator, Oven, Microwave
Location: New York, NY
```

**Vendor 3 - Sarah's Repair Solutions**
```
Username: sarah_vendor
Email: sarah@repairsolutions.com
Password: vendor123
Specialties: Washer, Dryer, Dishwasher
Location: Los Angeles, CA
```

## Common Workflows

### Vendor Workflow: Claim and Complete a Job

1. **Login**
   ```bash
   POST /api/auth/login
   ```

2. **View Available Jobs**
   ```bash
   GET /api/jobs/available
   ```

3. **Claim a Job**
   ```bash
   POST /api/jobs/{jobId}/claims
   ```

4. **Update Status to "Arrived"**
   ```bash
   PATCH /api/assignments/{assignmentId}
   Body: { "status": "arrived" }
   ```

5. **Update Status to "In Progress"**
   ```bash
   PATCH /api/assignments/{assignmentId}
   Body: { "status": "in_progress" }
   ```

6. **Add Parts Used**
   ```bash
   POST /api/assignments/{assignmentId}/parts
   Body: {
     "partNumber": "WP2198202",
     "partName": "Water Filter",
     "quantity": 1,
     "unitCost": 45.99
   }
   ```

7. **Upload Photos**
   ```bash
   POST /api/vendors/me/photos
   FormData: photos[], assignmentId, description
   ```

8. **Complete the Job**
   ```bash
   PATCH /api/assignments/{assignmentId}
   Body: {
     "status": "completed",
     "completionNotes": "Job completed successfully",
     "laborHours": 1.5,
     "totalLaborCost": 150.00
   }
   ```

## API Endpoints Overview

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/status` - Check auth status
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Vendor Profile
- `GET /api/vendors/me` - Get vendor profile
- `GET /api/vendors/me/jobs` - Get available jobs
- `GET /api/vendors/me/assignments` - Get vendor assignments

### Jobs
- `GET /api/jobs/available` - List available jobs
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs/:id/claims` - Claim a job
- `POST /api/jobs` - Create job (admin)

### Assignments
- `GET /api/assignments` - List assignments
- `GET /api/assignments/:id` - Get assignment details
- `PATCH /api/assignments/:id` - Update assignment status
- `PUT /api/assignments/:id/schedule` - Reschedule assignment

### Parts
- `POST /api/assignments/:id/parts` - Add part
- `GET /api/assignments/:id/parts` - List parts
- `DELETE /api/parts/:id` - Delete part

### Photos
- `POST /api/vendors/me/photos` - Upload photos
- `POST /api/vendor/parts/:id/photos` - Upload part photos

## Troubleshooting

### MongoDB Connection Error
```
Error: MongoDB connection error
```
**Solution**: Check your `MONGODB_URI` in `.env` and ensure MongoDB is running.

### Port Already in Use
```
Error: Port 3000 is already in use
```
**Solution**: Change the `PORT` in `.env` or stop the process using port 3000.

### JWT Token Expired
```
Error: Token expired
```
**Solution**: Use the refresh token endpoint or login again.

### Photo Upload Fails
```
Error: Failed to upload to S3
```
**Solution**: 
- Check AWS credentials in `.env`
- Verify S3 bucket exists and has correct permissions
- Set `USE_S3=false` to use local storage instead

## Next Steps

1. **Explore the API**: Import the Postman collection and try all endpoints
2. **Read Full Documentation**: Check `README.md` for detailed API documentation
3. **Customize**: Modify models and routes to fit your specific needs
4. **Deploy**: Follow the deployment checklist in `README.md`

## Support

For issues or questions:
- Check the full `README.md` documentation
- Review error messages in the console
- Ensure all environment variables are set correctly

## Quick Reference

**Server URL**: http://localhost:3000
**API Base**: http://localhost:3000/api
**Health Check**: http://localhost:3000/health

**Default Port**: 3000
**Token Expiry**: 8 hours (access), 7 days (refresh)
**Max Photo Size**: 10MB
**Max Photos per Upload**: 10

---

Happy coding! 🚀
