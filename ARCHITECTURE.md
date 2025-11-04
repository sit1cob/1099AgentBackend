# System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Mobile/Web Client                        │
│                    (Vendor Mobile App / Admin Portal)            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS/REST API
                             │ JWT Bearer Token
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      Express.js Server                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Middleware Layer                       │   │
│  │  • Helmet (Security Headers)                             │   │
│  │  • CORS (Cross-Origin)                                   │   │
│  │  • Rate Limiting                                         │   │
│  │  • Body Parser                                           │   │
│  │  • Morgan (Logging)                                      │   │
│  │  • Authentication (JWT Verification)                     │   │
│  │  • Authorization (RBAC)                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────▼────────────────────────────────┐  │
│  │                    Route Handlers                         │  │
│  │  • /api/auth      - Authentication                       │  │
│  │  • /api/users     - User Management                      │  │
│  │  • /api/vendors   - Vendor Operations                    │  │
│  │  • /api/jobs      - Job Management                       │  │
│  │  • /api/assignments - Assignment Tracking                │  │
│  │  • /api/parts     - Parts & Photos                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│  ┌──────────────────────────▼────────────────────────────────┐  │
│  │                  Business Logic Layer                     │  │
│  │  • Validation (express-validator)                        │  │
│  │  • Permission Checks                                     │  │
│  │  • Data Transformation                                   │  │
│  │  • Cost Calculations                                     │  │
│  │  • Status Management                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
┌───────────────▼──────────┐  ┌──────────▼─────────────┐
│   MongoDB Database       │  │    AWS S3 Storage      │
│  ┌────────────────────┐  │  │  ┌──────────────────┐  │
│  │ Users Collection   │  │  │  │ Photo Files      │  │
│  │ Vendors Collection │  │  │  │ (JPEG, PNG, etc) │  │
│  │ Jobs Collection    │  │  │  └──────────────────┘  │
│  │ Assignments Coll.  │  │  │                        │
│  │ Parts Collection   │  │  │  Bucket:               │
│  │ Photos Collection  │  │  │  lc-sywrelay-sears-1099│
│  └────────────────────┘  │  └────────────────────────┘
└──────────────────────────┘
```

## Request Flow

### 1. Authentication Flow

```
Client                    Server                    Database
  │                         │                          │
  │  POST /api/auth/login   │                          │
  ├────────────────────────>│                          │
  │                         │  Find user by username   │
  │                         ├─────────────────────────>│
  │                         │                          │
  │                         │<─────────────────────────┤
  │                         │  User document           │
  │                         │                          │
  │                         │  Verify password (bcrypt)│
  │                         │                          │
  │                         │  Generate JWT tokens     │
  │                         │                          │
  │                         │  Save refresh token      │
  │                         ├─────────────────────────>│
  │                         │                          │
  │  Access + Refresh Token │                          │
  │<────────────────────────┤                          │
  │                         │                          │
```

### 2. Job Claiming Flow

```
Client                    Server                    Database
  │                         │                          │
  │  POST /jobs/:id/claims  │                          │
  │  + Bearer Token         │                          │
  ├────────────────────────>│                          │
  │                         │  Verify JWT              │
  │                         │                          │
  │                         │  Check permissions       │
  │                         │                          │
  │                         │  Find job                │
  │                         ├─────────────────────────>│
  │                         │<─────────────────────────┤
  │                         │                          │
  │                         │  Create assignment       │
  │                         ├─────────────────────────>│
  │                         │                          │
  │                         │  Update job status       │
  │                         ├─────────────────────────>│
  │                         │                          │
  │                         │  Update vendor stats     │
  │                         ├─────────────────────────>│
  │                         │                          │
  │  Assignment created     │                          │
  │<────────────────────────┤                          │
  │                         │                          │
```

### 3. Photo Upload Flow

```
Client                    Server                    AWS S3
  │                         │                          │
  │  POST /vendors/me/photos│                          │
  │  + multipart/form-data  │                          │
  ├────────────────────────>│                          │
  │                         │  Verify JWT              │
  │                         │                          │
  │                         │  Validate file type/size │
  │                         │                          │
  │                         │  Upload to S3            │
  │                         ├─────────────────────────>│
  │                         │                          │
  │                         │<─────────────────────────┤
  │                         │  S3 URL                  │
  │                         │                          │
  │                         │  Save photo metadata     │
  │                         │  to MongoDB              │
  │                         │                          │
  │  Upload success + URLs  │                          │
  │<────────────────────────┤                          │
  │                         │                          │
```

## Data Model Relationships

```
┌──────────────┐
│     User     │
│──────────────│
│ _id          │◄─────────┐
│ username     │          │
│ password     │          │
│ role         │          │
│ vendorId     │──────┐   │
│ permissions  │      │   │
└──────────────┘      │   │
                      │   │
                      │   │
┌──────────────┐      │   │
│    Vendor    │      │   │
│──────────────│      │   │
│ _id          │◄─────┘   │
│ name         │          │
│ email        │          │
│ stats        │          │
└──────────────┘          │
       │                  │
       │                  │
       │                  │
┌──────▼───────┐          │
│  Assignment  │          │
│──────────────│          │
│ _id          │          │
│ jobId        │──────┐   │
│ vendorId     │      │   │
│ status       │      │   │
│ costs        │      │   │
└──────────────┘      │   │
       │              │   │
       │              │   │
   ┌───┴───┐          │   │
   │       │          │   │
   │       │          │   │
┌──▼───┐ ┌▼─────┐ ┌──▼───▼──┐
│ Part │ │Photo │ │   Job   │
│──────│ │──────│ │─────────│
│ _id  │ │ _id  │ │ _id     │
│ part │ │ url  │ │ soNumber│
│ cost │ │ s3Key│ │ customer│
└──────┘ └──────┘ │ applianc│
                  │ schedule│
                  └─────────┘
```

## Authentication & Authorization Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Incoming Request                          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ Extract Bearer Token │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   Verify JWT Token   │
                  │  (jwt.verify)        │
                  └──────────┬───────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                 Valid?            Invalid
                    │                 │
                    ▼                 ▼
         ┌──────────────────┐   ┌─────────────┐
         │ Decode Token     │   │ Return 401  │
         │ Get User ID      │   │ Unauthorized│
         └────────┬─────────┘   └─────────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Fetch User from  │
         │ Database         │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Check if Active  │
         └────────┬─────────┘
                  │
         ┌────────┴────────┐
         │                 │
      Active?           Inactive
         │                 │
         ▼                 ▼
┌──────────────────┐  ┌─────────────┐
│ Check Permission │  │ Return 401  │
│ for Endpoint     │  │ Inactive    │
└────────┬─────────┘  └─────────────┘
         │
    ┌────┴────┐
    │         │
 Has Perm? No Perm
    │         │
    ▼         ▼
┌────────┐ ┌─────────────┐
│ Allow  │ │ Return 403  │
│ Access │ │ Forbidden   │
└────────┘ └─────────────┘
```

## Status Progression

### Assignment Status Lifecycle

```
┌──────────────┐
│  available   │  (Job created, not claimed)
└──────┬───────┘
       │
       │ Vendor claims job
       │
       ▼
┌──────────────┐
│   assigned   │  (Job claimed by vendor)
└──────┬───────┘
       │
       │ Vendor arrives
       │
       ▼
┌──────────────┐
│   arrived    │  (Vendor on-site)
└──────┬───────┘
       │
       │ Work begins
       │
       ▼
┌──────────────┐
│ in_progress  │  (Actively working)
└──────┬───────┘
       │
       ├──────────────────┐
       │                  │
       │ Parts needed     │ Work complete
       │                  │
       ▼                  ▼
┌──────────────┐   ┌──────────────┐
│waiting_on_   │   │  completed   │
│   parts      │   └──────────────┘
└──────┬───────┘
       │
       │ Parts arrive
       │
       └──────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Network Security                               │
│  • HTTPS (in production)                                │
│  • CORS configuration                                   │
│  • Rate limiting (100 req/15min)                        │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ Layer 2: Application Security                           │
│  • Helmet security headers                              │
│  • Input validation (express-validator)                 │
│  • File upload restrictions                             │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ Layer 3: Authentication                                  │
│  • JWT token verification                               │
│  • Token expiration (8h access, 7d refresh)             │
│  • Refresh token rotation                               │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ Layer 4: Authorization                                   │
│  • Role-based access control (RBAC)                     │
│  • Permission-based endpoint protection                 │
│  • Resource ownership validation                        │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ Layer 5: Data Security                                   │
│  • Password hashing (bcrypt)                            │
│  • Sensitive data filtering                             │
│  • MongoDB injection prevention                         │
└─────────────────────────────────────────────────────────┘
```

## Scalability Considerations

### Horizontal Scaling

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼─────┐     ┌─────▼─────┐     ┌─────▼─────┐
    │  Server 1 │     │  Server 2 │     │  Server 3 │
    │  (Node.js)│     │  (Node.js)│     │  (Node.js)│
    └─────┬─────┘     └─────┬─────┘     └─────┬─────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                    ┌────────▼────────┐
                    │  MongoDB        │
                    │  Replica Set    │
                    │  (Primary +     │
                    │   Secondaries)  │
                    └─────────────────┘
```

### Caching Strategy (Future Enhancement)

```
Client Request
      │
      ▼
┌──────────┐
│  Redis   │  ← Cache frequently accessed data
│  Cache   │    (vendor profiles, job lists)
└────┬─────┘
     │
     │ Cache miss
     │
     ▼
┌──────────┐
│ MongoDB  │  ← Fetch from database
└──────────┘
```

## Monitoring & Logging

```
┌─────────────────────────────────────────────────────────┐
│                    Application                           │
│  ┌────────────────────────────────────────────────┐     │
│  │  Morgan Logger                                 │     │
│  │  • HTTP request logging                        │     │
│  │  • Response times                              │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │  Error Handler                                 │     │
│  │  • Unhandled rejections                        │     │
│  │  • Mongoose errors                             │     │
│  │  • JWT errors                                  │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │  Health Check Endpoint                         │     │
│  │  • Server status                               │     │
│  │  • Database connectivity                       │     │
│  └────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## Deployment Architecture (Recommended)

```
┌─────────────────────────────────────────────────────────┐
│                    Cloud Provider                        │
│  ┌────────────────────────────────────────────────┐     │
│  │  Application Servers (EC2/App Engine)          │     │
│  │  • Node.js instances                           │     │
│  │  • PM2 process manager                         │     │
│  │  • Auto-scaling group                          │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │  Database (MongoDB Atlas)                      │     │
│  │  • Replica set                                 │     │
│  │  • Automated backups                           │     │
│  │  • Point-in-time recovery                      │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │  File Storage (AWS S3)                         │     │
│  │  • Photo storage                               │     │
│  │  • CDN integration                             │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │  Monitoring (CloudWatch/DataDog)               │     │
│  │  • Application metrics                         │     │
│  │  • Error tracking                              │     │
│  │  • Performance monitoring                      │     │
│  └────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## Technology Decisions

### Why Express.js?
- Mature, well-documented framework
- Large ecosystem of middleware
- Excellent performance
- Easy to scale

### Why MongoDB?
- Flexible schema for evolving requirements
- Excellent performance for read-heavy operations
- Native JSON support
- Easy horizontal scaling with sharding

### Why JWT?
- Stateless authentication
- Mobile-friendly
- Scalable (no server-side session storage)
- Industry standard

### Why AWS S3?
- Reliable, scalable object storage
- Cost-effective for large files
- CDN integration available
- Industry standard for file storage

## Performance Optimizations

1. **Database Indexing**: Indexes on frequently queried fields
2. **Pagination**: All list endpoints support pagination
3. **Selective Field Projection**: Only return needed fields
4. **Connection Pooling**: MongoDB connection pooling
5. **Async/Await**: Non-blocking I/O operations
6. **Rate Limiting**: Prevent API abuse
7. **Compression**: Response compression (can be added)
8. **Caching**: Ready for Redis integration

---

This architecture provides a solid foundation for a production-ready vendor management system with room for growth and optimization.
