#!/bin/bash

# Unified Visibility Platform - Start Script
# Usage: ./start.sh [--build]

set -e



SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Add this near the top of start.sh
if [ -f .env ]; then
    echo -e "${CYAN}📦 Loading environment from .env file...${NC}"
    export $(grep -v '^#' .env | xargs -d '\n')
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          Unified Visibility Platform                       ║"
echo "║                    Starting...                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check for required environment variables
if [ -z "$JWT_SECRET" ]; then
    echo -e "${YELLOW}⚠️  JWT_SECRET not set. Generating a random secret...${NC}"
    export JWT_SECRET=$(openssl rand -base64 32)
fi

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  DB_PASSWORD not set. Using default 'postgres'...${NC}"
    export DB_PASSWORD=postgres
fi

# Build option
BUILD_FLAG=""
if [ "$1" == "--build" ]; then
    BUILD_FLAG="--build"
    echo -e "${CYAN}🔨 Building containers...${NC}"
fi

# Start services
cd docker
docker compose up -d $BUILD_FLAG

# Wait for services to be ready
echo -e "${CYAN}⏳ Waiting for services to start...${NC}"
sleep 5

# Check service health
echo -e "${CYAN}🔍 Checking service health...${NC}"

check_service() {
    local name=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $name is ready${NC}"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}✗ $name failed to start${NC}"
    return 1
}

check_service "Backend" "http://localhost:3000/health" || true
check_service "Prometheus" "http://localhost:9090/-/ready" || true
check_service "Grafana" "http://localhost:3001/api/health" || true

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Platform is ready! 🚀                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Access the platform:${NC}"
echo -e "  📊 Frontend:      ${GREEN}http://localhost${NC}"
echo -e "  🔌 Backend API:   ${GREEN}http://localhost:3000${NC}"
echo -e "  📈 Grafana:       ${GREEN}http://localhost:3001${NC} (admin/admin)"
echo -e "  🔍 Prometheus:    ${GREEN}http://localhost:9090${NC}"
echo -e "  🚨 Alertmanager:  ${GREEN}http://localhost:9093${NC}"
echo ""
echo -e "${YELLOW}To stop the platform, run: ./stop.sh${NC}"
echo -e "${YELLOW}To view logs: cd docker && docker compose logs -f${NC}"

