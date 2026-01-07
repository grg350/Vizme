# Metrics Tracker - MVP

A comprehensive metrics collection and visualization platform that allows users to configure custom metrics, generate tracking code, and visualize data in Grafana.

## Features

✅ **User Authentication** - Secure signup/login with JWT tokens  
✅ **Metric Configuration** - Define custom metrics (counter, gauge, histogram, summary)  
✅ **API Key Management** - Generate and manage API keys for authentication  
✅ **Code Generation** - Generate JavaScript tracking code for client websites  
✅ **Metrics Ingestion** - REST API endpoint for collecting metrics  
✅ **Prometheus Integration** - Store metrics in Prometheus time-series database  
✅ **Grafana Visualization** - Pre-configured dashboards for metric visualization

## Quick Start

### Using Docker (Recommended)

```bash
# Start all services
cd docker
docker-compose up -d

# Setup backend
cd ../backend
npm install
cp .env.example .env
npm start

# Setup frontend
cd ../frontend
npm install
npm run dev
```

Access:

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Grafana: http://localhost:3001 (admin/admin)
- Prometheus: http://localhost:9090

### Manual Setup

See [docs/SETUP.md](./docs/SETUP.md) for detailed instructions.

## Project Structure

```
unified-project/
├── backend/          # Node.js + Express API
├── frontend/         # React + Vite application
├── docker/           # Docker Compose configuration
└── docs/             # Documentation
```

## Documentation

- [Setup Guide](./docs/SETUP.md) - Detailed setup instructions
- [API Documentation](./docs/README.md#api-documentation) - Complete API reference
- [Architecture](./docs/ARCHITECTURE.md) - System architecture and design

## Technology Stack

**Backend:**

- Node.js 20 + Express 5
- PostgreSQL 15
- JWT Authentication
- Prometheus Pushgateway

**Frontend:**

- React 18 + Vite
- React Router
- Zustand

**Infrastructure:**

- Docker & Docker Compose
- Prometheus
- Grafana

## User Flow

1. **Sign Up/Login** - Create account and authenticate
2. **Configure Metrics** - Define what metrics to collect
3. **Generate API Key** - Create authentication key
4. **Generate Code** - Get JavaScript tracking snippet
5. **Integrate** - Paste code in your website
6. **Visualize** - View metrics in Grafana

## Development

### Backend

```bash
cd backend
npm install
npm run dev  # Development with auto-reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev  # Development server
```

## Production Deployment

See [docs/README.md](./docs/README.md#deployment) for production deployment guidelines.

## License

ISC

## Support

For issues or questions, refer to the documentation in the `docs/` folder.
