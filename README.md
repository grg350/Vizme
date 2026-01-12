# Unified Visibility Platform (UVP)

A comprehensive observability platform providing a "Single Pane of Glass" for monitoring applications and infrastructure. Features real-time metrics, custom dashboards, alerting, and SLI/SLO tracking.

## ✨ Features

- **📊 Unified Dashboard** - Real-time metrics visualization in React with auto-refresh
- **🔍 Application Metrics** - HTTP request rates, latency percentiles, error rates
- **💻 Infrastructure Metrics** - CPU, memory, disk, and network monitoring
- **🚨 Alerting** - Threshold-based alerts with Alertmanager integration
- **📈 SLI/SLO Tracking** - Availability and latency SLIs with error budget tracking
- **🎨 Custom Metrics** - Define and collect custom business metrics
- **📉 Grafana Dashboards** - Pre-configured production-quality dashboards
- **🔐 Secure** - JWT authentication, API key management, no hardcoded secrets

## 🚀 Quick Start

### One-Command Startup

```bash
# Start the entire platform
./start.sh

# Or with rebuild
./start.sh --build
```

That's it! The platform will be available at:

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost | Create account |
| **Backend API** | http://localhost:3000 | - |
| **Grafana** | http://localhost:3001 | admin / admin |
| **Prometheus** | http://localhost:9090 | - |
| **Alertmanager** | http://localhost:9093 | - |

### Stop the Platform

```bash
./stop.sh
```

## 📁 Project Structure

```
unified_visibility_platform/
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── database/        # PostgreSQL connection
│   │   ├── middleware/      # Auth, metrics, error handling
│   │   ├── routes/          # API endpoints
│   │   └── services/        # Business logic
│   └── Dockerfile
├── frontend/                # React + Vite application
│   ├── src/
│   │   ├── api/             # API clients
│   │   ├── components/      # Reusable components
│   │   │   └── charts/      # Chart components
│   │   ├── pages/           # Page components
│   │   └── store/           # Zustand state
│   ├── Dockerfile
│   └── nginx.conf
├── docker/                  # Docker Compose setup
│   ├── alertmanager/        # Alertmanager config
│   ├── grafana/             # Grafana dashboards & provisioning
│   └── prometheus/          # Prometheus config & rules
├── start.sh                 # One-command startup
└── stop.sh                  # Stop all services
```

## 📊 Metrics & Monitoring

### Application Metrics (Backend)

The backend exposes Prometheus metrics at `/metrics`:

- `uvp_http_requests_total` - Total HTTP requests by method, route, status
- `uvp_http_request_duration_seconds` - Request latency histogram
- `uvp_db_query_duration_seconds` - Database query latency
- `uvp_active_connections` - Current active connections

### Infrastructure Metrics (Node Exporter)

- CPU, memory, disk usage
- Network I/O
- System load average

### SLI Metrics (Recording Rules)

- `sli:availability:ratio` - Successful request ratio
- `sli:latency:ratio` - Requests under 500ms ratio
- `sli:error_budget:remaining` - Remaining error budget

## 🚨 Alert Rules

Pre-configured alerts include:

| Alert | Condition | Severity |
|-------|-----------|----------|
| HighErrorRate | 5xx rate > 5% for 5m | Critical |
| HighLatency | P95 > 1s for 5m | Warning |
| ServiceDown | Target down for 1m | Critical |
| HighCPUUsage | CPU > 80% for 5m | Warning |
| HighMemoryUsage | Memory > 85% for 5m | Warning |
| HighDiskUsage | Disk > 90% for 5m | Critical |

## 🎨 Grafana Dashboards

Three pre-configured dashboards:

1. **Application Overview** - Request rates, latency, errors, SLIs
2. **Infrastructure Overview** - CPU, memory, disk, network
3. **User Metrics** - Custom metrics from Pushgateway

## 🔧 Development

### Backend Development

```bash
cd backend
npm install
npm run dev
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Run Tests

```bash
cd backend
npm test
```

## 🔐 Environment Variables

Required environment variables (set in docker-compose or shell):

```bash
JWT_SECRET=your-secure-jwt-secret-min-32-characters
DB_PASSWORD=your-secure-database-password
```

See `backend/.env.example` for all options.

## 📚 User Flow

1. **Sign Up** - Create an account at http://localhost
2. **Configure Metrics** - Define custom metrics to collect
3. **Generate API Key** - Create authentication key for your app
4. **Generate Code** - Copy JavaScript tracking snippet
5. **Integrate** - Paste code in your website
6. **Monitor** - View metrics in the unified dashboard or Grafana

## 🛠 Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18, Vite, Recharts, Zustand |
| Backend | Node.js 20, Express 5, PostgreSQL |
| Metrics | Prometheus, Pushgateway, prom-client |
| Visualization | Grafana, Recharts |
| Alerting | Alertmanager |
| Infrastructure | Docker, Nginx |

## 📄 License

ISC

## 🤝 Support

For issues or questions, check the `docs/` folder or open an issue.
