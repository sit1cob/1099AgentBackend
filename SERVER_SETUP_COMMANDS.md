# Server Setup Commands for AWS EC2

## You are here: `/home/sjena/1099AgentBackend`

## Step 1: Install Node.js (if not installed)

```bash
# Check if Node.js is installed
node --version

# If not installed, install Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Verify installation
node --version
npm --version
```

## Step 2: Install Dependencies

```bash
# Install all npm packages
npm install
```

## Step 3: Configure Environment Variables

Your `.env` file should contain (edit with `sudo vi .env`):

```env
# MongoDB Configuration
MONGODB_URI=mongodb://root:root123@connectivity-rs0.scheduler2.searskairos.ai:27017/api

# JWT Configuration
JWT_SECRET=your_jwt_secret_min_32_characters_long_change_this_in_production
JWT_REFRESH_SECRET=your_refresh_secret_min_32_characters_long_change_this_in_production
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=production

# CORS (add your frontend domain)
CORS_ORIGIN=*
```

**Quick copy-paste for .env:**
```bash
cat > .env << 'EOF'
MONGODB_URI=mongodb://root:root123@connectivity-rs0.scheduler2.searskairos.ai:27017/api
JWT_SECRET=change_this_to_a_very_long_random_string_min_32_chars
JWT_REFRESH_SECRET=change_this_to_another_very_long_random_string_min_32_chars
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d
PORT=3000
NODE_ENV=production
CORS_ORIGIN=*
EOF
```

## Step 4: Seed the Database (First Time Only)

```bash
# Seed database with test data
npm run seed
```

## Step 5: Start the Server

### Option A: Run Directly (for testing)
```bash
# Start server
npm start

# Server will run on port 3000
# Press Ctrl+C to stop
```

### Option B: Run with PM2 (Recommended for Production)
```bash
# Install PM2 globally
sudo npm install -g pm2

# Start application with PM2
pm2 start server.js --name "1099-vendor-api"

# View logs
pm2 logs 1099-vendor-api

# View status
pm2 status

# Stop application
pm2 stop 1099-vendor-api

# Restart application
pm2 restart 1099-vendor-api

# Make PM2 start on system boot
pm2 startup
pm2 save
```

### Option C: Run in Background with nohup
```bash
# Start in background
nohup npm start > server.log 2>&1 &

# View logs
tail -f server.log

# Find process ID
ps aux | grep node

# Stop server (replace PID with actual process ID)
kill -9 PID
```

## Step 6: Configure Firewall

```bash
# Allow port 3000 through firewall
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

# Or if using iptables
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo service iptables save
```

## Step 7: Test the API

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test from another machine (replace with your EC2 public IP)
curl http://YOUR_EC2_PUBLIC_IP:3000/health

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","role":"admin"}'
```

## Step 8: Setup Nginx Reverse Proxy (Optional but Recommended)

```bash
# Install Nginx
sudo yum install -y nginx

# Create Nginx configuration
sudo vi /etc/nginx/conf.d/1099-api.conf
```

**Nginx configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Test Nginx configuration
sudo nginx -t

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Restart Nginx
sudo systemctl restart nginx
```

## Step 9: Setup SSL with Let's Encrypt (Optional)

```bash
# Install certbot
sudo yum install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
# Test renewal
sudo certbot renew --dry-run
```

## Monitoring Commands

```bash
# Check if server is running
ps aux | grep node

# Check port 3000 is listening
sudo netstat -tulpn | grep 3000
# or
sudo lsof -i :3000

# View server logs (if using PM2)
pm2 logs 1099-vendor-api

# View server logs (if using nohup)
tail -f server.log

# Monitor system resources
htop
# or
top

# Check disk space
df -h

# Check memory usage
free -h
```

## Troubleshooting

### Issue: Port 3000 already in use
```bash
# Find process using port 3000
sudo lsof -ti:3000

# Kill the process
sudo kill -9 $(sudo lsof -ti:3000)
```

### Issue: MongoDB connection failed
```bash
# Check if MongoDB URI is correct in .env
cat .env | grep MONGODB_URI

# Test MongoDB connection
mongo "mongodb://root:root123@connectivity-rs0.scheduler2.searskairos.ai:27017/api" --eval "db.adminCommand('ping')"
```

### Issue: Permission denied
```bash
# Fix file permissions
sudo chown -R sjena:sjena /home/sjena/1099AgentBackend
chmod -R 755 /home/sjena/1099AgentBackend
```

### Issue: npm install fails
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Update Application

```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Restart server (if using PM2)
pm2 restart 1099-vendor-api

# Or restart manually
# Kill old process and start new one
```

## Security Checklist

- [ ] Change default JWT secrets in .env
- [ ] Set NODE_ENV=production
- [ ] Configure proper CORS_ORIGIN (not *)
- [ ] Enable firewall rules
- [ ] Setup SSL certificate
- [ ] Use PM2 for process management
- [ ] Setup Nginx reverse proxy
- [ ] Regular backups of MongoDB
- [ ] Monitor logs regularly
- [ ] Keep dependencies updated

## Quick Start Script

Save this as `start.sh`:

```bash
#!/bin/bash

# Quick start script for 1099 Vendor API

echo "Starting 1099 Vendor Management API..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start with PM2
if command -v pm2 &> /dev/null; then
    echo "Starting with PM2..."
    pm2 start server.js --name "1099-vendor-api"
    pm2 logs 1099-vendor-api
else
    echo "PM2 not found. Starting with npm..."
    npm start
fi
```

Make it executable:
```bash
chmod +x start.sh
./start.sh
```

---

## Your Current Status

You are at: `/home/sjena/1099AgentBackend`

**Next steps:**
1. ✅ Repository cloned
2. ✅ .env file created
3. ⏳ Edit .env with proper values
4. ⏳ Run `npm install`
5. ⏳ Run `npm run seed`
6. ⏳ Run `npm start` or use PM2

**Run these commands now:**

```bash
# 1. Install dependencies
npm install

# 2. Seed database
npm run seed

# 3. Start server
npm start
```

Or use PM2 (recommended):

```bash
# Install PM2
sudo npm install -g pm2

# Start server
pm2 start server.js --name "1099-vendor-api"

# View logs
pm2 logs
```

Your API will be available at:
- Local: http://localhost:3000
- Public: http://YOUR_EC2_PUBLIC_IP:3000

Test it:
```bash
curl http://localhost:3000/health
```
