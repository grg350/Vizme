# Troubleshooting Guide: Connection Refused Error

## Problem
Frontend shows `ERR_CONNECTION_REFUSED` when trying to connect to `http://localhost:3000/api/v1/auth/signup`

## Root Cause
The backend server wasn't starting because database initialization was failing, preventing the server from listening on port 3000.

## Solution Applied

### 1. Added Retry Logic
- Database connection now retries 5 times with 5-second delays
- Server starts immediately even if database isn't ready
- Database initialization happens in background

### 2. Improved Error Messages
- Clear logging of connection attempts
- Shows database connection details on startup
- Validates required environment variables

### 3. Better Diagnostics
- Health endpoint shows database status
- Startup logs show configuration

## Steps to Fix

### Step 1: Verify .env File
```bash
cd docker/
./check-env.sh
```

This will verify:
- `.env` file exists
- All required variables are present
- Configuration values are set

### Step 2: Check Required Variables
Your `.env` file must contain:
```env
DB_HOST=dpg-d5f0f3emcj7s73asn8pg-a
DB_PORT=5432
DB_NAME=unified_9fwl
DB_USER=unified_9fwl_user
DB_PASSWORD=6LwmeC65OZx4UxPcKIbptQeHUtPWaf64
DB_SSL=true
JWT_SECRET=your-secret-key
```

### Step 3: Restart Backend
```bash
cd docker/
docker compose down
docker compose up -d backend
```

### Step 4: Check Backend Logs
```bash
docker logs -f metrics_backend
```

Look for:
- ✅ "Server running on port 3000" - Server started
- ✅ "Database initialized successfully" - DB connected
- ❌ Any error messages about database connection

### Step 5: Test Health Endpoint
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "...",
  "uptime": ...
}
```

### Step 6: Test from Frontend
- Open browser to `http://localhost:5173/signup`
- Try to sign up
- Check browser console for errors

## Common Issues

### Issue 0: DNS Resolution Error (ENOTFOUND)
**Symptom:** `getaddrinfo ENOTFOUND dpg-xxxxx-xxxxx-a`

**Root Cause:** Database hostname is incomplete (missing domain suffix)

**Fix:** See detailed guide in `FIX_DNS_ERROR.md`

**Quick Fix:**
1. Get complete hostname from your database provider (e.g., Render.com dashboard)
2. Update `DB_HOST` in `.env` with full hostname including domain
3. Example: `dpg-xxxxx-xxxxx-a.oregon-postgres.render.com` (not just `dpg-xxxxx-xxxxx-a`)
4. Restart backend: `docker compose restart backend`

### Issue 1: .env File Missing
**Symptom:** Backend logs show "Missing required environment variables"

**Fix:**
```bash
cd docker/
# Create .env file with your database credentials
nano .env
```

### Issue 2: Database Not Accessible
**Symptom:** "Database initialization failed" after all retries

**Fix:**
- Verify database host is reachable from container
- Check firewall rules
- Verify credentials are correct
- For external databases, ensure SSL is configured correctly

### Issue 3: Port Already in Use
**Symptom:** "EADDRINUSE: address already in use"

**Fix:**
```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process or change port in docker-compose.yml
```

### Issue 4: Container Not Starting
**Symptom:** Container exits immediately

**Fix:**
```bash
# Check container status
docker ps -a | grep metrics_backend

# Check logs
docker logs metrics_backend

# Restart
docker compose restart backend
```

## Verification Checklist

- [ ] `.env` file exists in `docker/` directory
- [ ] All required environment variables are set
- [ ] Backend container is running: `docker ps | grep metrics_backend`
- [ ] Backend logs show "Server running on port 3000"
- [ ] Health endpoint responds: `curl http://localhost:3000/health`
- [ ] Frontend can connect: No `ERR_CONNECTION_REFUSED` in browser console

## Getting Help

If issues persist:
1. Run diagnostic script: `./check-env.sh`
2. Check backend logs: `docker logs metrics_backend`
3. Check container status: `docker ps -a`
4. Verify network: `docker network ls` and `docker network inspect docker_metrics_network`
