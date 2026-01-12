#!/bin/bash

# Unified Visibility Platform - Stop Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          Unified Visibility Platform                       ║"
echo "║                    Stopping...                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

cd docker
docker compose down

echo ""
echo -e "${GREEN}✓ All services stopped${NC}"
echo ""
echo -e "${CYAN}To restart, run: ./start.sh${NC}"
echo -e "${CYAN}To remove all data: cd docker && docker compose down -v${NC}"

