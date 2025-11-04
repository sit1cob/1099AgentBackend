# API Endpoints Reference

Complete reference of all available API endpoints in the 1099 Vendor Management System.

## Base URL
```
http://localhost:3000/api
```

## Authentication
All endpoints require `Authorization: Bearer <token>` header except where noted.

---

## 1. Authentication & Session Management

### 1.1 Login
**Endpoint**: `POST /api/auth/login`  
**Auth Required**: No  
**Description**: Authenticate vendor and receive JWT tokens

**Request Body**:
```json
{
  "username": "vendor_email@example.com",
  "password": "vendor_password",
  "role": "registered_user"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 123,
      "username": "vendor_email@example.com",
      "role": "registered_user",
      "vendorId": 456,
      "vendorName": "John's Appliance Repair",
      "permissions": ["view_assigned_jobs", "update_job_status", "upload_parts", "view_vendor_portal"]
    }
  }
}
```

---

### 1.2 Check Authentication Status
**Endpoint**: `GET /api/auth/status`  
**Auth Required**: Yes  
**Description**: Verify token validity and get current session info

**Response** (200):
```json
{
  "success": true,
  "authenticated": true,
  "user": {
    "id": 123,
    "role": "registered_user",
    "vendorId": 456,
    "permissions": ["view_assigned_jobs", "update_job_status", "upload_parts", "view_vendor_portal"]
  }
}
```

---

### 1.3 Refresh Token
**Endpoint**: `POST /api/auth/refresh`  
**Auth Required**: No  
**Description**: Refresh access token using refresh token

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### 1.4 Logout
**Endpoint**: `POST /api/auth/logout`  
**Auth Required**: Yes  
**Description**: Logout user and invalidate refresh token

---

## 2. User Management

### 2.1 Change Password
**Endpoint**: `POST /api/users/change-password`  
**Auth Required**: Yes  
**Description**: Change user password

**Request Body**:
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_secure_password"
}
```

---

### 2.2 Get User Profile
**Endpoint**: `GET /api/users/me`  
**Auth Required**: Yes  
**Description**: Get current user profile

---

## 3. Vendor Profile Management

### 3.1 Get Current Vendor Profile
**Endpoint**: `GET /api/vendors/me`  
**Auth Required**: Yes  
**Permission**: `view_vendor_portal`  
**Description**: Get the authenticated vendor's profile information

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 456,
    "name": "John's Appliance Repair",
    "phoneNumber": "555-0123",
    "email": "vendor@example.com",
    "isActive": true,
    "createdAt": "2024-01-15T10:00:00Z",
    "stats": {
      "totalJobs": 150,
      "completedJobs": 145,
      "averageRating": 4.8
    }
  }
}
```

---

### 3.2 Get Vendor's Available Jobs
**Endpoint**: `GET /api/vendors/me/jobs`  
**Auth Required**: Yes  
**Permission**: `view_assigned_jobs`  
**Description**: Get jobs specifically available for the current vendor

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20)
- `city` (optional): Filter by city
- `applianceType` (optional): Filter by appliance type

---

### 3.3 Get Vendor's Assignments
**Endpoint**: `GET /api/vendors/me/assignments`  
**Auth Required**: Yes  
**Permission**: `view_assigned_jobs`  
**Description**: Get all assignments for current vendor

**Query Parameters**:
- `status` (optional): Filter by status
- `dateFrom` (optional): Start date filter (ISO format)
- `dateTo` (optional): End date filter (ISO format)

---

### 3.4 Add Parts (Vendor Endpoint)
**Endpoint**: `POST /api/vendors/me/parts`  
**Auth Required**: Yes  
**Permission**: `upload_parts`  
**Description**: Add multiple parts to assignment

**Request Body**:
```json
{
  "assignmentId": 999,
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

---

### 3.5 Upload Photos (Vendor Endpoint)
**Endpoint**: `POST /api/vendors/me/photos`  
**Auth Required**: Yes  
**Permission**: `upload_parts`  
**Content-Type**: `multipart/form-data`  
**Description**: Upload photos for assignment

**Form Data**:
- `photos[]`: (files) Multiple image files
- `assignmentId`: Assignment ID
- `description`: Photo description

**Limits**:
- Max 10 photos per upload
- Max 10MB per file
- Formats: JPEG, JPG, PNG, GIF, BMP, WEBP

---

## 4. Job Discovery & Claiming

### 4.1 Get Available Jobs
**Endpoint**: `GET /api/jobs/available`  
**Auth Required**: Yes  
**Permission**: `view_assigned_jobs`  
**Description**: List all jobs available for claiming

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20)
- `city` (optional): Filter by city
- `applianceType` (optional): Filter by appliance type

---

### 4.2 Get Single Job Details
**Endpoint**: `GET /api/jobs/:id`  
**Auth Required**: Yes  
**Permission**: `view_assigned_jobs`  
**Description**: Get detailed information about a specific job

---

### 4.3 Claim a Job
**Endpoint**: `POST /api/jobs/:id/claims`  
**Auth Required**: Yes  
**Permission**: `view_assigned_jobs`  
**Description**: Vendor claims an available job

**Request Body**:
```json
{
  "vendorNotes": "I can handle this repair"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Job successfully claimed",
  "data": {
    "assignmentId": 999,
    "jobId": 789,
    "vendorId": 456,
    "status": "assigned",
    "claimedAt": "2024-03-18T14:30:00Z"
  }
}
```

---

### 4.4 Bulk Confirm Jobs
**Endpoint**: `POST /api/jobs/confirm`  
**Auth Required**: Yes  
**Permission**: `view_assigned_jobs`  
**Description**: Confirm multiple jobs at once

**Request Body**:
```json
{
  "jobIds": [789, 790, 791],
  "confirmationType": "accept"
}
```

---

### 4.5 Create Job
**Endpoint**: `POST /api/jobs`  
**Auth Required**: Yes  
**Description**: Create a new job (Admin/Dispatcher)

**Request Body**:
```json
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

---

### 4.6 Update Job
**Endpoint**: `PUT /api/jobs/:id`  
**Auth Required**: Yes  
**Description**: Update job details (Admin/Dispatcher)

---

### 4.7 Delete Job
**Endpoint**: `DELETE /api/jobs/:id`  
**Auth Required**: Yes  
**Description**: Delete job (Admin)

---

## 5. Assignment Management

### 5.1 Get All Assignments
**Endpoint**: `GET /api/assignments`  
**Auth Required**: Yes  
**Permission**: `view_assigned_jobs`  
**Description**: Get all assignments (filtered by vendor for registered_user role)

**Query Parameters**:
- `status` (optional): Filter by status
- `dateFrom` (optional): Start date filter
- `dateTo` (optional): End date filter

---

### 5.2 Get Single Assignment Details
**Endpoint**: `GET /api/assignments/:id`  
**Auth Required**: Yes  
**Permission**: `view_assigned_jobs`  
**Description**: Get detailed information about a specific assignment

**Response** includes:
- Assignment details
- Job information
- Parts used
- Photos uploaded

---

### 5.3 Update Assignment Status
**Endpoint**: `PATCH /api/assignments/:id`  
**Auth Required**: Yes  
**Permission**: `update_job_status`  
**Description**: Update the status of an assignment

**Status Progression**:
1. `assigned` → Initial status after claiming
2. `arrived` → Vendor has arrived at location
3. `in_progress` → Work has started
4. `waiting_on_parts` → Parts need to be ordered
5. `completed` → Job is complete
6. `rescheduled` → Job needs to be rescheduled

**Request Body (Arrived)**:
```json
{
  "status": "arrived",
  "actualArrival": "2024-03-20T08:15:00Z",
  "notes": "Arrived at customer location"
}
```

**Request Body (In Progress)**:
```json
{
  "status": "in_progress",
  "notes": "Started working on the repair"
}
```

**Request Body (Completed)**:
```json
{
  "status": "completed",
  "completedAt": "2024-03-20T11:00:00Z",
  "completionNotes": "Replaced water filter and cleaned coils. Refrigerator cooling normally.",
  "customerSignature": "base64_encoded_signature_image",
  "laborHours": 1.5,
  "totalLaborCost": 150.00
}
```

---

### 5.4 Reschedule Assignment
**Endpoint**: `PUT /api/assignments/:id/schedule`  
**Auth Required**: Yes  
**Permission**: `update_job_status`  
**Description**: Request to reschedule an assignment

**Request Body**:
```json
{
  "newScheduledDate": "2024-03-22",
  "newTimeWindow": "1PM-5PM",
  "rescheduleReason": "Parts not available",
  "vendorNotes": "Need to order specific part"
}
```

**Alternative Endpoint**: `POST /api/assignments/:id/schedule` (same functionality)

---

## 6. Parts Management

### 6.1 Add Parts to Assignment
**Endpoint**: `POST /api/assignments/:assignmentId/parts`  
**Auth Required**: Yes  
**Permission**: `upload_parts`  
**Description**: Record parts used for a specific assignment

**Request Body**:
```json
{
  "partNumber": "WP2198202",
  "partName": "Refrigerator Water Filter",
  "quantity": 1,
  "unitCost": 45.99,
  "notes": "Replaced water filter"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 555,
    "assignmentId": 999,
    "partNumber": "WP2198202",
    "partName": "Refrigerator Water Filter",
    "quantity": 1,
    "unitCost": 45.99,
    "totalCost": 45.99,
    "addedAt": "2024-03-20T09:30:00Z"
  }
}
```

---

### 6.2 Get Parts for Assignment
**Endpoint**: `GET /api/assignments/:assignmentId/parts`  
**Auth Required**: Yes  
**Permission**: `view_assigned_jobs`  
**Description**: List all parts used for an assignment

---

### 6.3 Delete Part
**Endpoint**: `DELETE /api/parts/:id`  
**Auth Required**: Yes  
**Permission**: `upload_parts`  
**Description**: Remove a part from the list

---

### 6.4 Upload Photos for Part
**Endpoint**: `POST /api/vendor/parts/:partId/photos`  
**Auth Required**: Yes  
**Permission**: `upload_parts`  
**Content-Type**: `multipart/form-data`  
**Description**: Upload photos specifically for parts documentation

**Form Data**:
- `photos[]`: (files) Multiple image files
- `description`: Photo description

---

### 6.5 Delete Part Photos
**Endpoint**: `DELETE /api/vendor/parts/:partId/photos`  
**Auth Required**: Yes  
**Permission**: `upload_parts`  
**Description**: Remove uploaded photos for a part

**Request Body**:
```json
{
  "photoIds": [777, 778]
}
```

---

## Error Responses

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

---

## Rate Limits

- **General API**: 100 requests per 15 minutes per IP
- **Login Endpoint**: 5 requests per 15 minutes per IP

---

## Permissions

### Registered User (Vendor)
- `view_assigned_jobs` - View jobs assigned to their vendor account
- `update_job_status` - Update status of claimed jobs
- `upload_parts` - Add parts used to jobs
- `view_vendor_portal` - Access vendor-specific features

### Admin
All vendor permissions plus:
- `manage_all_jobs` - Create, update, delete all jobs
- `manage_vendors` - Manage vendor accounts
- `view_reports` - Access reporting features

---

## Notes

- All timestamps are in ISO 8601 format
- All monetary values are in USD
- File uploads support JPEG, JPG, PNG, GIF, BMP, WEBP formats
- Maximum file size: 10MB per file
- Maximum files per upload: 10
- Tokens expire after 8 hours (access) and 7 days (refresh)
