#!/bin/bash

# Diagnostic script to check .env configuration

echo "🔍 Checking Docker Compose .env configuration..."
echo ""

ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ ERROR: .env file not found in docker/ directory"
    echo "💡 Create .env file with the following variables:"
    echo ""
    echo "DB_HOST=your-database-host"
    echo "DB_PORT=5432"
    echo "DB_NAME=your-database-name"
    echo "DB_USER=your-database-user"
    echo "DB_PASSWORD=your-database-password"
    echo "DB_SSL=true"
    echo "JWT_SECRET=your-secret-key"
    exit 1
fi

echo "✅ .env file found"
echo ""

# Check required variables
REQUIRED_VARS=("DB_HOST" "DB_NAME" "DB_USER" "DB_PASSWORD")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" "$ENV_FILE"; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "❌ Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    exit 1
fi

echo "✅ All required environment variables are present"
echo ""

# Show non-sensitive values
echo "📋 Configuration (non-sensitive values):"
grep -E "^DB_HOST=|^DB_PORT=|^DB_NAME=|^DB_USER=|^DB_SSL=" "$ENV_FILE" | sed 's/PASSWORD=.*/PASSWORD=***/'
echo ""

echo "✅ Configuration check passed!"
echo "💡 Run: docker compose up -d to start services"
