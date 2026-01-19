# Fix: DNS Resolution Error (ENOTFOUND)

## Problem
```
error: 'getaddrinfo ENOTFOUND dpg-d5f0f3emcj7s73asn8pg-a'
```

## Root Cause
The database hostname in your `.env` file is **incomplete**. It's missing the domain suffix.

**Current (Incorrect):**
```
DB_HOST=dpg-d5f0f3emcj7s73asn8pg-a
```

**Should be (Complete):**
```
DB_HOST=dpg-d5f0f3emcj7s73asn8pg-a.oregon-postgres.render.com
```

## Solution Steps

### Step 1: Find Your Complete Database Hostname

#### For Render.com Databases:
1. Go to your Render.com dashboard
2. Navigate to your PostgreSQL database
3. Look for **"Internal Database URL"** or **"Connection String"**
4. The hostname format is usually:
   - `dpg-xxxxx-xxxxx-a.oregon-postgres.render.com` (Oregon)
   - `dpg-xxxxx-xxxxx-a.singapore-postgres.render.com` (Singapore)
   - `dpg-xxxxx-xxxxx-a.frankfurt-postgres.render.com` (Frankfurt)
   - Or similar based on your region

#### For Other Providers:
- **Supabase**: `xxxxx.supabase.co`
- **AWS RDS**: `xxxxx.xxxxx.region.rds.amazonaws.com`
- **Google Cloud SQL**: `xxxxx.region.sql.goog`
- **Azure**: `xxxxx.database.azure.com`

### Step 2: Update .env File

Edit `docker/.env` and update the `DB_HOST` with the **complete hostname**:

```env
DB_HOST=dpg-d5f0f3emcj7s73asn8pg-a.oregon-postgres.render.com
DB_PORT=5432
DB_NAME=unified_9fwl
DB_USER=unified_9fwl_user
DB_PASSWORD=6LwmeC65OZx4UxPcKIbptQeHUtPWaf64
DB_SSL=true
JWT_SECRET=your-secret-key
```

### Step 3: Test DNS Resolution

Run the diagnostic script:
```bash
cd docker/
./test-db-connection.sh
```

This will:
- Test DNS resolution
- Check port connectivity
- Provide specific guidance

### Step 4: Verify from Container

Test DNS resolution from inside the container:
```bash
docker exec -it metrics_backend nslookup dpg-d5f0f3emcj7s73asn8pg-a.oregon-postgres.render.com
```

If DNS works, you should see the IP address.

### Step 5: Restart Backend

```bash
docker compose restart backend
docker logs -f metrics_backend
```

Look for:
- ✅ "Database connection successful"
- ✅ "Database initialized successfully"

## Quick Fix Commands

### Option 1: If you have the complete connection string
```bash
cd docker/
# Extract hostname from connection string
# Format: postgresql://user:pass@hostname:port/dbname
# Update DB_HOST in .env with the hostname part
nano .env
```

### Option 2: Test with local database first
If you want to test locally while fixing the external DB:

1. Start local postgres:
```bash
docker compose --profile local-db up -d postgres
```

2. Update `.env` temporarily:
```env
DB_HOST=postgres  # Docker service name
DB_PORT=5432
DB_NAME=metrics_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false
```

3. Restart backend:
```bash
docker compose restart backend
```

## Common Hostname Patterns

| Provider | Hostname Pattern | Example |
|----------|-----------------|---------|
| Render.com | `dpg-xxxxx-xxxxx-a.region-postgres.render.com` | `dpg-abc123-def456-a.oregon-postgres.render.com` |
| Supabase | `xxxxx.supabase.co` | `abcdefghijklmnop.supabase.co` |
| AWS RDS | `xxxxx.xxxxx.region.rds.amazonaws.com` | `mydb.abc123.us-east-1.rds.amazonaws.com` |
| Railway | `xxxxx.railway.app` | `postgres.railway.app` |
| Neon | `xxxxx.neon.tech` | `ep-xxx-xxx.neon.tech` |

## Verification Checklist

- [ ] Complete hostname includes domain suffix (e.g., `.render.com`)
- [ ] DNS resolution works: `nslookup <hostname>` returns IP
- [ ] Port is accessible (usually 5432)
- [ ] SSL is enabled if required (`DB_SSL=true`)
- [ ] Credentials are correct
- [ ] Backend logs show "Database connection successful"

## Still Having Issues?

1. **Check your database provider's documentation** for the exact connection string format
2. **Verify network access** - some databases only allow connections from whitelisted IPs
3. **Check firewall rules** - ensure port 5432 is open
4. **Test from your local machine first**:
   ```bash
   psql -h <complete-hostname> -U <user> -d <database>
   ```

## Example: Render.com Connection String

If Render gives you:
```
postgresql://user:pass@dpg-d5f0f3emcj7s73asn8pg-a.oregon-postgres.render.com:5432/unified_9fwl
```

Extract the hostname part:
```
dpg-d5f0f3emcj7s73asn8pg-a.oregon-postgres.render.com
```

Use this in your `.env`:
```env
DB_HOST=dpg-d5f0f3emcj7s73asn8pg-a.oregon-postgres.render.com
DB_PORT=5432
DB_NAME=unified_9fwl
DB_USER=user
DB_PASSWORD=pass
DB_SSL=true
```
