# 1099 Vendor Management Backend API

A comprehensive RESTful API for managing vendor assignments, jobs, parts, and photos for the 1099 contractor management system.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control (RBAC)
- **Vendor Management**: Complete vendor profile and assignment management
- **Job Discovery**: Browse and claim available service jobs
- **Assignment Tracking**: Track job status from assignment to completion
- **Parts Management**: Record parts used with photo documentation
- **Photo Upload**: S3-based photo storage for job documentation
- **Real-time Status Updates**: Update job status throughout the service lifecycle

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: AWS S3
- **Security**: Helmet, CORS, Rate Limiting

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- AWS Account with S3 access (for photo uploads)

## Installation

1. **Clone the repository**
   ```bash
   cd 1099BackendApi
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Update the `.env` file with your configuration:
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   JWT_REFRESH_SECRET=your_refresh_secret_key
   AWS_REGION=us-east-2
   S3_BUCKET=your_s3_bucket_name
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   USE_S3=true
   ```

4. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication

All endpoints (except login) require JWT Bearer token authentication:
```
Authorization: Bearer <your_access_token>
```

### Token Expiration
- **Access Token**: 8 hours
- **Refresh Token**: 7 days

## API Endpoints

### 1. Authentication & Session Management

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "vendor@example.com",
  "password": "password123",
  "role": "registered_user"
}
```

#### Check Authentication Status
```http
GET /api/auth/status
Authorization: Bearer <token>
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "<refresh_token>"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### 2. User Management

#### Change Password
```http
POST /api/users/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

#### Get Current User Profile
```http
GET /api/users/me
Authorization: Bearer <token>
```

### 3. Vendor Profile Management

#### Get Current Vendor Profile
```http
GET /api/vendors/me
Authorization: Bearer <token>
```

#### Get Vendor's Available Jobs
```http
GET /api/vendors/me/jobs?page=1&pageSize=20&city=Chicago&applianceType=Refrigerator
Authorization: Bearer <token>
```

#### Get Vendor's Assignments
```http
GET /api/vendors/me/assignments?status=assigned&dateFrom=2024-01-01&dateTo=2024-12-31
Authorization: Bearer <token>
```

### 4. Job Discovery & Claiming

#### Get Available Jobs
```http
GET /api/jobs/available?page=1&pageSize=20
Authorization: Bearer <token>
```

#### Get Job Details
```http
GET /api/jobs/:id
Authorization: Bearer <token>
```

#### Claim a Job
```http
POST /api/jobs/:id/claims
Authorization: Bearer <token>
Content-Type: application/json

{
  "vendorNotes": "I can handle this repair"
}
```

#### Bulk Confirm Jobs
```http
POST /api/jobs/confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "jobIds": [789, 790, 791],
  "confirmationType": "accept"
}
```

#### Create Job (Admin/Dispatcher)
```http
POST /api/jobs
Authorization: Bearer <token>
Content-Type: application/json

{
  "soNumber": "SO-2024-001",
  "customerName": "Jane",
  "customerLastName": "Doe",
  "customerAddress": "123 Main St",
  "customerCity": "Chicago",
  "customerState": "IL",
  "customerZip": "60601",
  "customerPhone": "555-1234",
  "applianceType": "Refrigerator",
  "serviceDescription": "Not cooling properly",
  "scheduledDate": "2024-03-20",
  "scheduledTimeWindow": "8AM-12PM",
  "priority": "high"
}
```

### 5. Assignment Management

#### Get All Assignments
```http
GET /api/assignments?status=assigned&dateFrom=2024-01-01
Authorization: Bearer <token>
```

#### Get Assignment Details
```http
GET /api/assignments/:id
Authorization: Bearer <token>
```

#### Update Assignment Status
```http
PATCH /api/assignments/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "arrived",
  "actualArrival": "2024-03-20T08:15:00Z",
  "notes": "Arrived at customer location"
}
```

**Status Progression:**
1. `assigned` - Initial status after claiming
2. `arrived` - Vendor has arrived at location
3. `in_progress` - Work has started
4. `waiting_on_parts` - Parts need to be ordered
5. `completed` - Job is complete
6. `rescheduled` - Job needs to be rescheduled

#### Complete Assignment
```http
PATCH /api/assignments/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed",
  "completedAt": "2024-03-20T11:00:00Z",
  "completionNotes": "Replaced water filter and cleaned coils",
  "customerSignature": "base64_encoded_signature",
  "laborHours": 1.5,
  "totalLaborCost": 150.00
}
```

#### Reschedule Assignment
```http
PUT /api/assignments/:id/schedule
Authorization: Bearer <token>
Content-Type: application/json

{
  "newScheduledDate": "2024-03-22",
  "newTimeWindow": "1PM-5PM",
  "rescheduleReason": "Parts not available",
  "vendorNotes": "Need to order specific part"
}
```

### 6. Parts Management

#### Add Parts to Assignment
```http
POST /api/assignments/:assignmentId/parts
Authorization: Bearer <token>
Content-Type: application/json

{
  "partNumber": "WP2198202",
  "partName": "Refrigerator Water Filter",
  "quantity": 1,
  "unitCost": 45.99,
  "notes": "Replaced water filter"
}
```

#### Add Multiple Parts (Vendor Endpoint)
```http
POST /api/vendors/me/parts
Authorization: Bearer <token>
Content-Type: application/json

{
  "assignmentId": "999",
  "parts": [
    {
      "partNumber": "WP2198202",
      "partName": "Refrigerator Water Filter",
      "quantity": 1,
      "unitCost": 45.99
    }
  ]
}
```

#### Get Parts for Assignment
```http
GET /api/assignments/:assignmentId/parts
Authorization: Bearer <token>
```

#### Delete Part
```http
DELETE /api/parts/:id
Authorization: Bearer <token>
```

#### Upload Part Photos
```http
POST /api/vendor/parts/:partId/photos
Authorization: Bearer <token>
Content-Type: multipart/form-data

FormData:
- photos[]: (file) photo1.jpg
- photos[]: (file) photo2.jpg
- description: "Defective part removed"
```

#### Delete Part Photos
```http
DELETE /api/vendor/parts/:partId/photos
Authorization: Bearer <token>
Content-Type: application/json

{
  "photoIds": [777, 778]
}
```

### 7. Photo Upload

#### Upload Photos for Assignment
```http
POST /api/vendors/me/photos
Authorization: Bearer <token>
Content-Type: multipart/form-data

FormData:
- photos[]: (file) photo1.jpg
- photos[]: (file) photo2.jpg
- assignmentId: 999
- description: "Before and after repair photos"
```

**Limits:**
- Maximum 10 photos per upload
- Maximum 10MB per file
- Supported formats: JPEG, JPG, PNG, GIF, BMP, WEBP

## Error Handling

All endpoints return consistent error responses:

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required",
  "error": "No valid token provided"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions",
  "error": "User does not have required role or permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found",
  "error": "Job with ID 789 not found"
}
```

### 422 Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "partNumber": "Part number is required",
    "quantity": "Quantity must be greater than 0"
  }
}
```

### 429 Rate Limited
```json
{
  "success": false,
  "message": "Too many requests",
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "An unexpected error occurred"
}
```

## User Roles & Permissions

### Registered User (Vendor)
- `view_assigned_jobs` - View jobs assigned to their vendor account
- `update_job_status` - Update status of claimed jobs
- `upload_parts` - Add parts used to jobs
- `view_vendor_portal` - Access vendor-specific features

### Admin
- All vendor permissions plus:
- `manage_all_jobs` - Create, update, delete all jobs
- `manage_vendors` - Manage vendor accounts
- `view_reports` - Access reporting features

## Database Models

### User
- username, email, password
- role (admin, registered_user, dispatcher)
- vendorId (reference to Vendor)
- permissions array
- isActive, lastLogin, refreshToken

### Vendor
- name, phoneNumber, email, address
- specialties, serviceAreas
- stats (totalJobs, completedJobs, averageRating)
- certifications, isActive

### Job
- soNumber, customer details (name, address, phone)
- appliance details (type, brand, model, serial)
- serviceDescription, scheduledDate, scheduledTimeWindow
- priority, status, notes, warrantyInfo

### Assignment
- jobId, vendorId, status
- timestamps (assignedAt, actualArrival, workStarted, completedAt)
- notes, completionNotes, customerSignature
- costs (laborHours, totalPartsCost, totalLaborCost, totalCost)
- rescheduleInfo, invoice

### Part
- assignmentId, partNumber, partName
- quantity, unitCost, totalCost
- notes, photos array

### Photo
- assignmentId, partId (optional)
- filename, url, s3Key
- mimeType, size, description
- photoType (before, during, after, part, general)

## Typical Vendor Workflow

1. **Login** → `POST /api/auth/login`
2. **Get Profile** → `GET /api/vendors/me`
3. **View Available Jobs** → `GET /api/jobs/available`
4. **Claim Job** → `POST /api/jobs/:id/claims`
5. **View Assignments** → `GET /api/vendors/me/assignments`
6. **Arrive at Location** → `PATCH /api/assignments/:id` (status: arrived)
7. **Start Work** → `PATCH /api/assignments/:id` (status: in_progress)
8. **Add Parts Used** → `POST /api/assignments/:assignmentId/parts`
9. **Upload Photos** → `POST /api/vendors/me/photos`
10. **Complete Job** → `PATCH /api/assignments/:id` (status: completed)

## Development

### Project Structure
```
1099BackendApi/
├── config/
│   └── upload.js          # S3 upload configuration
├── middleware/
│   ├── auth.js            # Authentication middleware
│   └── errorHandler.js    # Error handling middleware
├── models/
│   ├── User.js            # User model
│   ├── Vendor.js          # Vendor model
│   ├── Job.js             # Job model
│   ├── Assignment.js      # Assignment model
│   ├── Part.js            # Part model
│   └── Photo.js           # Photo model
├── routes/
│   ├── auth.js            # Authentication routes
│   ├── users.js           # User routes
│   ├── vendors.js         # Vendor routes
│   ├── jobs.js            # Job routes
│   ├── assignments.js     # Assignment routes
│   └── parts.js           # Parts routes
├── utils/
│   └── jwt.js             # JWT utilities
├── .env                   # Environment variables
├── package.json           # Dependencies
├── server.js              # Main server file
└── README.md              # This file
```

### Running Tests
```bash
npm test
```

### Code Style
- Use ES6+ features
- Follow RESTful conventions
- Implement proper error handling
- Add JSDoc comments for complex functions

## Security Considerations

1. **JWT Secrets**: Change default JWT secrets in production
2. **CORS**: Configure appropriate CORS origins
3. **Rate Limiting**: Adjust rate limits based on your needs
4. **Environment Variables**: Never commit `.env` file
5. **Password Hashing**: Uses bcrypt with salt rounds
6. **Input Validation**: All inputs are validated using express-validator
7. **File Upload**: File size and type restrictions enforced

## Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=your_production_mongodb_uri
JWT_SECRET=strong_random_secret_key
JWT_REFRESH_SECRET=strong_random_refresh_secret_key
CORS_ORIGIN=https://yourdomain.com
AWS_REGION=us-east-2
S3_BUCKET=your_production_bucket
AWS_ACCESS_KEY_ID=your_production_key
AWS_SECRET_ACCESS_KEY=your_production_secret
USE_S3=true
```

### Production Checklist
- [ ] Update JWT secrets
- [ ] Configure CORS origins
- [ ] Set up MongoDB replica set
- [ ] Configure AWS S3 bucket policies
- [ ] Enable HTTPS
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline

## Support

For issues and questions, please contact the development team.

## License

ISC
