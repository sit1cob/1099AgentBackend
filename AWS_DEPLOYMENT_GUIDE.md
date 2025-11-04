# AWS Production Deployment Guide

## Overview
This guide covers deploying the 1099 Vendor Management API to AWS using various services.

## Deployment Options

### Option 1: AWS Elastic Beanstalk (Recommended for Quick Start)
### Option 2: AWS ECS with Fargate (Recommended for Production)
### Option 3: AWS EC2 with PM2
### Option 4: AWS Lambda with API Gateway (Serverless)

---

## Option 1: AWS Elastic Beanstalk Deployment

### Prerequisites
- AWS Account
- AWS CLI installed and configured
- EB CLI installed: `pip install awsebcli`

### Step 1: Prepare Application

1. **Create `.ebextensions` directory:**
```bash
mkdir .ebextensions
```

2. **Create `.ebextensions/nodecommand.config`:**
```yaml
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm start"
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
```

3. **Update `package.json` scripts:**
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "seed": "node scripts/seed.js"
  }
}
```

### Step 2: Initialize Elastic Beanstalk

```bash
# Initialize EB application
eb init -p node.js-18 1099-vendor-api --region us-east-1

# Create environment
eb create production-env \
  --instance-type t3.small \
  --envvars NODE_ENV=production
```

### Step 3: Set Environment Variables

```bash
# Set all environment variables
eb setenv \
  NODE_ENV=production \
  PORT=8080 \
  MONGODB_URI="your_mongodb_uri" \
  JWT_SECRET="your_jwt_secret" \
  JWT_REFRESH_SECRET="your_refresh_secret" \
  AWS_REGION=us-east-1 \
  AWS_S3_BUCKET=your-bucket-name
```

### Step 4: Deploy

```bash
# Deploy application
eb deploy

# Open application
eb open

# Check status
eb status

# View logs
eb logs
```

### Step 5: Configure Auto Scaling

```bash
# Edit configuration
eb config

# Or use console to set:
# - Min instances: 2
# - Max instances: 10
# - Scaling triggers: CPU > 70%
```

---

## Option 2: AWS ECS with Fargate (Production-Grade)

### Step 1: Create Dockerfile

```dockerfile
# Create Dockerfile in project root
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "server.js"]
```

### Step 2: Build and Push to ECR

```bash
# Create ECR repository
aws ecr create-repository --repository-name 1099-vendor-api --region us-east-1

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t 1099-vendor-api .

# Tag image
docker tag 1099-vendor-api:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/1099-vendor-api:latest

# Push to ECR
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/1099-vendor-api:latest
```

### Step 3: Create ECS Task Definition

Create `task-definition.json`:

```json
{
  "family": "1099-vendor-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "1099-vendor-api",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/1099-vendor-api:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "secrets": [
        {
          "name": "MONGODB_URI",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:prod/mongodb-uri"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:prod/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/1099-vendor-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### Step 4: Create ECS Service

```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create ECS cluster
aws ecs create-cluster --cluster-name 1099-vendor-cluster

# Create service
aws ecs create-service \
  --cluster 1099-vendor-cluster \
  --service-name 1099-vendor-service \
  --task-definition 1099-vendor-api \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=1099-vendor-api,containerPort=3000"
```

---

## AWS Services Setup

### 1. MongoDB Setup (Choose One)

#### Option A: MongoDB Atlas (Recommended)
1. Create cluster at https://cloud.mongodb.com
2. Whitelist AWS IP ranges
3. Get connection string
4. Add to AWS Secrets Manager

#### Option B: AWS DocumentDB
```bash
# Create DocumentDB cluster
aws docdb create-db-cluster \
  --db-cluster-identifier vendor-management-cluster \
  --engine docdb \
  --master-username admin \
  --master-user-password YourPassword123! \
  --vpc-security-group-ids sg-xxxxx

# Create instance
aws docdb create-db-instance \
  --db-instance-identifier vendor-management-instance \
  --db-instance-class db.r5.large \
  --engine docdb \
  --db-cluster-identifier vendor-management-cluster
```

### 2. S3 Bucket for File Uploads

```bash
# Create S3 bucket
aws s3 mb s3://1099-vendor-management-uploads --region us-east-1

# Set bucket policy
aws s3api put-bucket-policy --bucket 1099-vendor-management-uploads --policy file://bucket-policy.json

# Enable versioning
aws s3api put-bucket-versioning --bucket 1099-vendor-management-uploads --versioning-configuration Status=Enabled

# Set CORS
aws s3api put-bucket-cors --bucket 1099-vendor-management-uploads --cors-configuration file://cors-config.json
```

**bucket-policy.json:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowECSAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::1099-vendor-management-uploads/*"
    }
  ]
}
```

### 3. AWS Secrets Manager

```bash
# Store MongoDB URI
aws secretsmanager create-secret \
  --name prod/mongodb-uri \
  --secret-string "mongodb+srv://username:password@cluster.mongodb.net/vendor_management"

# Store JWT secrets
aws secretsmanager create-secret \
  --name prod/jwt-secret \
  --secret-string "$(openssl rand -base64 64)"

aws secretsmanager create-secret \
  --name prod/jwt-refresh-secret \
  --secret-string "$(openssl rand -base64 64)"
```

### 4. Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name 1099-vendor-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx \
  --scheme internet-facing \
  --type application

# Create target group
aws elbv2 create-target-group \
  --name 1099-vendor-targets \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxx \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:... \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...
```

### 5. CloudWatch Logs

```bash
# Create log group
aws logs create-log-group --log-group-name /aws/ecs/1099-vendor-api

# Set retention
aws logs put-retention-policy \
  --log-group-name /aws/ecs/1099-vendor-api \
  --retention-in-days 30
```

### 6. CloudWatch Alarms

```bash
# CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name 1099-vendor-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# Memory alarm
aws cloudwatch put-metric-alarm \
  --alarm-name 1099-vendor-high-memory \
  --alarm-description "Alert when memory exceeds 80%" \
  --metric-name MemoryUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

---

## Environment Variables Configuration

### Using AWS Systems Manager Parameter Store

```bash
# Store parameters
aws ssm put-parameter --name /prod/1099-api/NODE_ENV --value production --type String
aws ssm put-parameter --name /prod/1099-api/PORT --value 3000 --type String
aws ssm put-parameter --name /prod/1099-api/MONGODB_URI --value "your_uri" --type SecureString
aws ssm put-parameter --name /prod/1099-api/JWT_SECRET --value "your_secret" --type SecureString
```

---

## Security Best Practices

### 1. IAM Roles

Create IAM role for ECS tasks:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::1099-vendor-management-uploads/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:prod/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

### 2. Security Groups

```bash
# Application security group
aws ec2 create-security-group \
  --group-name 1099-vendor-api-sg \
  --description "Security group for 1099 Vendor API" \
  --vpc-id vpc-xxx

# Allow HTTPS from ALB
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxx \
  --protocol tcp \
  --port 3000 \
  --source-group sg-alb-xxx

# Allow MongoDB access
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxx \
  --protocol tcp \
  --port 27017 \
  --source-group sg-docdb-xxx
```

### 3. SSL/TLS Certificate

```bash
# Request certificate from ACM
aws acm request-certificate \
  --domain-name api.yourdomain.com \
  --subject-alternative-names *.yourdomain.com \
  --validation-method DNS
```

---

## CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy-production.yml`:

```yaml
name: Deploy to AWS Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build, tag, and push image to Amazon ECR
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: 1099-vendor-api
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
      
      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster 1099-vendor-cluster \
            --service 1099-vendor-service \
            --force-new-deployment
```

---

## Monitoring & Logging

### CloudWatch Dashboard

Create custom dashboard for monitoring:
- API response times
- Error rates
- Request counts
- Database connections
- Memory/CPU usage

### Log Aggregation

Use CloudWatch Logs Insights queries:

```sql
# Find errors
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100

# API response times
fields @timestamp, duration
| filter @message like /API Request/
| stats avg(duration), max(duration), min(duration) by bin(5m)
```

---

## Backup Strategy

### Automated MongoDB Backups

```bash
# Create backup Lambda function
# Schedule with EventBridge (CloudWatch Events)
# Store in S3 with lifecycle policies
```

---

## Cost Optimization

### Estimated Monthly Costs (us-east-1)

| Service | Configuration | Est. Cost |
|---------|--------------|-----------|
| ECS Fargate | 2 tasks (0.5 vCPU, 1GB) | ~$30 |
| Application Load Balancer | Standard | ~$20 |
| MongoDB Atlas | M10 cluster | ~$60 |
| S3 Storage | 100GB | ~$2.30 |
| CloudWatch Logs | 10GB | ~$5 |
| Data Transfer | 100GB out | ~$9 |
| **Total** | | **~$126/month** |

### Savings Tips:
- Use Reserved Instances for predictable workloads
- Enable S3 Intelligent-Tiering
- Set CloudWatch log retention policies
- Use Spot Instances for non-critical tasks

---

## Troubleshooting

### Common Issues

1. **Container fails to start**
   - Check CloudWatch logs
   - Verify environment variables
   - Test Docker image locally

2. **Database connection fails**
   - Check security groups
   - Verify connection string
   - Check VPC configuration

3. **High latency**
   - Enable CloudFront CDN
   - Optimize database queries
   - Add Redis caching

---

## Support & Maintenance

### Regular Tasks:
- [ ] Weekly: Review CloudWatch metrics
- [ ] Monthly: Update dependencies
- [ ] Quarterly: Review and optimize costs
- [ ] Annually: Rotate secrets and certificates

---

**Deployment Status**: Ready for Production ✅
