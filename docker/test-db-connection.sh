#!/bin/bash

# Script to test database connection and DNS resolution

echo "🔍 Testing Database Connection Configuration..."
echo ""

ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env file not found"
    exit 1
fi

# Source the .env file
export $(grep -v '^#' "$ENV_FILE" | xargs)

echo "📋 Database Configuration:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo "   SSL: ${DB_SSL:-false}"
echo ""

# Test DNS resolution
echo "🔍 Testing DNS Resolution..."
if command -v nslookup &> /dev/null; then
    echo "Running: nslookup $DB_HOST"
    if nslookup "$DB_HOST" &> /dev/null; then
        echo "✅ DNS resolution successful"
        nslookup "$DB_HOST" | head -5
    else
        echo "❌ DNS resolution failed"
        echo "💡 The hostname '$DB_HOST' cannot be resolved"
        echo "💡 Common fixes:"
        echo "   1. Check if hostname is complete (includes full domain)"
        echo "   2. For Render.com: Use format like dpg-xxxxx-xxxxx-a.oregon-postgres.render.com"
        echo "   3. For other providers: Check connection string in database dashboard"
    fi
else
    echo "⚠️  nslookup not available, skipping DNS test"
fi

echo ""

# Test port connectivity (if DNS works)
if nslookup "$DB_HOST" &> /dev/null; then
    echo "🔍 Testing Port Connectivity..."
    if command -v nc &> /dev/null || command -v telnet &> /dev/null; then
        if timeout 5 bash -c "echo > /dev/tcp/$DB_HOST/$DB_PORT" 2>/dev/null; then
            echo "✅ Port $DB_PORT is reachable on $DB_HOST"
        else
            echo "❌ Cannot connect to $DB_HOST:$DB_PORT"
            echo "💡 Check firewall rules and network access"
        fi
    else
        echo "⚠️  netcat/telnet not available, skipping port test"
    fi
fi

echo ""
echo "💡 To test from Docker container:"
echo "   docker exec -it metrics_backend sh"
echo "   # Then inside container:"
echo "   nslookup $DB_HOST"
echo "   # Or test connection:"
echo "   apk add postgresql-client"
echo "   psql -h $DB_HOST -U $DB_USER -d $DB_NAME"
