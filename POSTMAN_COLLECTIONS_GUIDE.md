# Postman Collections Guide

## Available Collections

You have **3 Postman collections** available:

### 1. **1099_Vendor_API.postman_collection.json** ⭐ RECOMMENDED
**Complete vendor-focused collection**
- ✅ Authentication (Register, Login, Refresh, Logout)
- ✅ Vendor Profile Operations
- ✅ Job Discovery & Claiming
- ✅ Assignment Management
- ✅ Parts Management
- ✅ Photo Uploads
- ✅ User Management
- **Total: 30+ endpoints**

### 2. **Admin_CRUD_Endpoints.postman_collection.json**
**Admin-specific operations**
- ✅ Vendor CRUD (Create, Read, Update, Delete)
- ✅ User CRUD
- ✅ Job Management (Admin view)
- ✅ Dashboard Statistics
- **Total: 15+ endpoints**

### 3. **Complete_1099_API.postman_collection.json** 🎯 USE THIS
**Combined collection with everything**
- All endpoints from both collections above
- Organized by functionality
- Auto-saving tokens
- Pre-configured test data

## Quick Start

### Option 1: Import Main Collection (Recommended)
```
File: 1099_Vendor_API.postman_collection.json
```

1. Open Postman
2. Click "Import"
3. Select `1099_Vendor_API.postman_collection.json`
4. Done! All endpoints ready to use

### Option 2: Import Both Collections
Import both files for separate vendor and admin workflows:
- `1099_Vendor_API.postman_collection.json` - For vendor operations
- `Admin_CRUD_Endpoints.postman_collection.json` - For admin operations

## Collection Structure

### Authentication (6 endpoints)
```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login (vendor/admin)
GET    /api/auth/status            - Check auth status
POST   /api/auth/refresh           - Refresh token
POST   /api/auth/logout            - Logout
```

### Vendor Profile (3 endpoints)
```
GET    /api/vendors/me             - Get my profile
GET    /api/vendors/me/jobs        - Get available jobs
GET    /api/vendors/me/assignments - Get my assignments
```

### Jobs (7 endpoints)
```
GET    /api/jobs/available         - List available jobs
GET    /api/jobs/:id               - Get job details
POST   /api/jobs/:id/claims        - Claim a job
POST   /api/jobs                   - Create job (admin)
PUT    /api/jobs/:id               - Update job
DELETE /api/jobs/:id               - Delete job
POST   /api/jobs/confirm           - Bulk confirm jobs
```

### Assignments (6 endpoints)
```
GET    /api/assignments            - List all assignments
GET    /api/assignments/:id        - Get assignment details
PATCH  /api/assignments/:id        - Update status
PUT    /api/assignments/:id/schedule - Reschedule
```

### Parts (4 endpoints)
```
POST   /api/assignments/:id/parts  - Add part
POST   /api/vendors/me/parts       - Add multiple parts
GET    /api/assignments/:id/parts  - List parts
DELETE /api/parts/:id              - Delete part
```

### Photos (2 endpoints)
```
POST   /api/vendors/me/photos      - Upload assignment photos
POST   /api/vendor/parts/:id/photos - Upload part photos
```

### Users (2 endpoints)
```
GET    /api/users/me               - Get my profile
POST   /api/users/change-password  - Change password
```

### Admin - Vendor Management (5 endpoints)
```
GET    /api/admin/vendors          - List all vendors
GET    /api/admin/vendors/:id      - Get vendor details
POST   /api/admin/vendors          - Create vendor
PUT    /api/admin/vendors/:id      - Update vendor
DELETE /api/admin/vendors/:id      - Delete vendor
```

### Admin - User Management (6 endpoints)
```
GET    /api/admin/users            - List all users
GET    /api/admin/users/:id        - Get user details
POST   /api/admin/users            - Create user
PUT    /api/admin/users/:id        - Update user
DELETE /api/admin/users/:id        - Delete user
POST   /api/admin/users/:id/reset-password - Reset password
```

### Admin - Dashboard (2 endpoints)
```
GET    /api/admin/jobs             - List all jobs (admin view)
GET    /api/admin/stats            - Get dashboard statistics
```

## Test Credentials

### After running `npm run seed`:

**Admin Account:**
```
Username: admin
Password: admin123
Role: admin
```

**Vendor Accounts:**
```
Username: john_vendor
Password: vendor123
Role: registered_user

Username: mike_vendor
Password: vendor123
Role: registered_user

Username: sarah_vendor
Password: vendor123
Role: registered_user
```

## How to Use

### 1. First Time Setup
1. Import collection into Postman
2. Collection variables are pre-configured:
   - `baseUrl`: http://localhost:3000/api
   - `accessToken`: (auto-filled after login)
   - `refreshToken`: (auto-filled after login)
   - Other IDs: (auto-filled from responses)

### 2. Authentication Flow
```
Step 1: Run "Register New User" OR "Login (Vendor/Admin)"
        → Tokens automatically saved

Step 2: Use any other endpoint
        → Token automatically used in Authorization header
```

### 3. Complete Workflow Example

**Vendor Workflow:**
```
1. Login (Vendor)                    → Get tokens
2. Get My Available Jobs             → See available work
3. Claim Job                         → Accept a job
4. Update Status - Arrived           → Mark arrival
5. Update Status - In Progress       → Start work
6. Add Part to Assignment            → Record parts used
7. Upload Photos for Assignment      → Document work
8. Complete Assignment               → Finish job
```

**Admin Workflow:**
```
1. Login (Admin)                     → Get admin tokens
2. Get Dashboard Statistics          → View overview
3. Get All Vendors                   → See all vendors
4. Create Vendor                     → Add new vendor
5. Create User                       → Add vendor user
6. Get All Jobs (Admin)              → Monitor all jobs
```

## Auto-Saved Variables

The collection automatically saves these values:

| Variable | Saved From | Used In |
|----------|------------|---------|
| `accessToken` | Login/Register | All authenticated requests |
| `refreshToken` | Login/Register | Token refresh |
| `jobId` | Get Available Jobs | Job operations |
| `assignmentId` | Claim Job | Assignment operations |
| `vendorId` | Get All Vendors | Vendor operations |
| `userId` | Get All Users | User operations |
| `partId` | Add Part | Part operations |

## Tips & Tricks

### 1. Quick Testing
- Run "Login" first
- All subsequent requests work automatically
- No need to copy/paste tokens

### 2. Switching Users
- Run different login request (Vendor/Admin)
- Token automatically updates
- All requests use new token

### 3. Testing Workflows
- Requests are organized in logical order
- Run them top-to-bottom for complete workflow
- Check "Tests" tab to see auto-save scripts

### 4. Debugging
- Check "Console" (bottom left) for logs
- View "Tests" results for auto-save confirmations
- Use "Code" button to see cURL/code examples

## Common Issues & Solutions

### Issue: 401 Unauthorized
**Solution**: Run Login request first to get fresh token

### Issue: Token Expired
**Solution**: Run "Refresh Token" or login again

### Issue: 404 Not Found
**Solution**: Check if ID variables are set (run list endpoints first)

### Issue: 422 Validation Error
**Solution**: Check request body format and required fields

## Environment Setup

### Local Development
```
baseUrl: http://localhost:3000/api
```

### QA/Staging
```
baseUrl: https://qa-api.yourdomain.com/api
```

### Production
```
baseUrl: https://api.yourdomain.com/api
```

To switch environments:
1. Click environment dropdown (top right)
2. Create new environment
3. Set `baseUrl` variable
4. Select environment

## Export & Share

### Export Collection
1. Click "..." next to collection name
2. Select "Export"
3. Choose "Collection v2.1"
4. Share JSON file with team

### Import Collection
1. Click "Import" button
2. Select JSON file
3. Collection ready to use

## Documentation

For detailed API documentation, see:
- `README.md` - Complete API documentation
- `API_ENDPOINTS.md` - Endpoint reference
- `REGISTRATION_API.md` - Registration endpoint details
- `ARCHITECTURE.md` - System architecture

## Support

If you encounter issues:
1. Check server is running (`npm run dev`)
2. Verify MongoDB is connected
3. Check console for errors
4. Review request/response in Postman

---

**Total Endpoints**: 40+  
**Collections**: 3  
**Auto-Saved Variables**: 8  
**Test Credentials**: 4 accounts  

**Status**: ✅ Ready to Use
