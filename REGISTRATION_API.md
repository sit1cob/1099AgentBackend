# User Registration API

## Endpoint
```
POST /api/auth/register
```

## Description
Register a new user in the system. This endpoint creates a new user account and automatically logs them in by returning access and refresh tokens.

## Access
Public (no authentication required)

## Request Body

### Required Fields
```json
{
  "username": "string (min 3 characters)",
  "email": "string (valid email format)",
  "password": "string (min 8 characters)"
}
```

### Optional Fields
```json
{
  "role": "string (registered_user | admin | dispatcher)",
  "vendorId": "string (MongoDB ObjectId)"
}
```

## Complete Example

### Basic User Registration
```json
{
  "username": "johndoe",
  "email": "john.doe@example.com",
  "password": "securepass123"
}
```

### Vendor User Registration (with vendorId)
```json
{
  "username": "vendor_tech",
  "email": "tech@vendorcompany.com",
  "password": "securepass123",
  "role": "registered_user",
  "vendorId": "507f1f77bcf86cd799439011"
}
```

### Admin User Registration
```json
{
  "username": "newadmin",
  "email": "admin@company.com",
  "password": "securepass123",
  "role": "admin"
}
```

## Response

### Success Response (201 Created)
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john.doe@example.com",
      "role": "registered_user",
      "vendorId": null,
      "vendorName": null,
      "permissions": [
        "view_assigned_jobs",
        "update_job_status",
        "upload_parts",
        "view_vendor_portal"
      ]
    }
  }
}
```

### Error Responses

#### Validation Error (422 Unprocessable Entity)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "username": {
      "msg": "Username must be at least 3 characters",
      "param": "username",
      "location": "body"
    },
    "email": {
      "msg": "Valid email is required",
      "param": "email",
      "location": "body"
    },
    "password": {
      "msg": "Password must be at least 8 characters",
      "param": "password",
      "location": "body"
    }
  }
}
```

#### User Already Exists (422 Unprocessable Entity)
```json
{
  "success": false,
  "message": "User already exists",
  "error": "Username or email is already taken"
}
```

#### Invalid Vendor ID (404 Not Found)
```json
{
  "success": false,
  "message": "Vendor not found",
  "error": "Invalid vendor ID"
}
```

## Validation Rules

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| username | string | Yes | Min 3 characters, unique, converted to lowercase |
| email | string | Yes | Valid email format, unique, converted to lowercase |
| password | string | Yes | Min 8 characters, automatically hashed |
| role | string | No | Must be one of: `registered_user`, `admin`, `dispatcher` (default: `registered_user`) |
| vendorId | string | No | Must be valid MongoDB ObjectId, vendor must exist |

## Default Permissions

### Registered User (registered_user)
- `view_assigned_jobs`
- `update_job_status`
- `upload_parts`
- `view_vendor_portal`

### Admin (admin)
- `manage_all_jobs`
- `manage_vendors`
- `view_reports`
- `view_assigned_jobs`
- `update_job_status`
- `upload_parts`
- `view_vendor_portal`

### Dispatcher (dispatcher)
- No default permissions (must be assigned manually)

## Usage Examples

### cURL Example
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john.doe@example.com",
    "password": "securepass123"
  }'
```

### JavaScript/Fetch Example
```javascript
const response = await fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'johndoe',
    email: 'john.doe@example.com',
    password: 'securepass123'
  })
});

const data = await response.json();

if (data.success) {
  // Save tokens
  localStorage.setItem('accessToken', data.data.accessToken);
  localStorage.setItem('refreshToken', data.data.refreshToken);
  
  // User is now logged in
  console.log('User registered:', data.data.user);
}
```

### Axios Example
```javascript
const axios = require('axios');

try {
  const response = await axios.post('http://localhost:3000/api/auth/register', {
    username: 'johndoe',
    email: 'john.doe@example.com',
    password: 'securepass123'
  });
  
  const { accessToken, refreshToken, user } = response.data.data;
  
  // Save tokens and user info
  console.log('Registration successful!');
  console.log('User:', user);
} catch (error) {
  if (error.response) {
    console.error('Registration failed:', error.response.data);
  }
}
```

## Security Notes

1. **Password Hashing**: Passwords are automatically hashed using bcrypt with salt rounds of 10
2. **Lowercase Conversion**: Usernames and emails are converted to lowercase for consistency
3. **Unique Validation**: System checks for existing usernames and emails before registration
4. **Automatic Login**: Upon successful registration, user receives tokens and is logged in
5. **Token Expiry**: Access tokens expire after 8 hours, refresh tokens after 7 days

## Integration with Mobile Apps

After successful registration:
1. Store both `accessToken` and `refreshToken` securely (e.g., secure storage/keychain)
2. Use `accessToken` in Authorization header for all API requests
3. When `accessToken` expires, use `refreshToken` to get new tokens via `/api/auth/refresh`
4. If `refreshToken` expires, user must login again

## Testing in Postman

1. Import the Postman collection: `1099_Vendor_API.postman_collection.json`
2. Find "Register New User" under "1. Authentication"
3. Modify the request body with your test data
4. Send the request
5. Tokens will be automatically saved to collection variables
6. You can immediately use other endpoints without manual token setup

## Related Endpoints

- **Login**: `POST /api/auth/login` - Login existing user
- **Refresh Token**: `POST /api/auth/refresh` - Get new access token
- **Check Status**: `GET /api/auth/status` - Verify authentication
- **Logout**: `POST /api/auth/logout` - Logout user

---

**API Version**: 1.0.0  
**Last Updated**: November 2024
