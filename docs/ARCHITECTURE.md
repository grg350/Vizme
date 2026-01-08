# Architecture Documentation

## System Architecture

### High-Level Overview

The Metrics Tracker MVP is built as a microservices-oriented architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐              ┌──────────────┐            │
│  │   Web App    │              │ Client Sites │            │
│  │  (React)     │              │ (Tracking    │            │
│  │              │              │  Code)       │            │
│  └──────┬───────┘              └──────┬───────┘            │
└─────────┼─────────────────────────────┼────────────────────┘
          │                             │
          │ HTTP/REST                   │ HTTP/REST
          │ JWT Auth                    │ API Key Auth
          ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Backend API (Node.js/Express)           │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │   Auth   │  │  Config  │  │  Metrics │          │   │
│  │  │  Module  │  │  Module  │  │  Module  │          │   │
│  │  └──────────┘  └──────────┘  └──────────┘          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────┬───────────────────────────────────┬───────────────┘
          │                                   │
          │                                   │
          ▼                                   ▼
┌──────────────────────┐        ┌──────────────────────────┐
│   Data Layer         │        │   Metrics Layer          │
│                      │        │                          │
│  ┌──────────────┐   │        │  ┌────────────────────┐   │
│  │  PostgreSQL  │   │        │  │  Pushgateway      │   │
│  │              │   │        │  │  (Ingestion)      │   │
│  │  - Users     │   │        │  └────────┬─────────┘   │
│  │  - API Keys  │   │        │           │             │
│  │  - Configs   │   │        │           ▼             │
│  └──────────────┘   │        │  ┌────────────────────┐   │
│                     │        │  │   Prometheus       │   │
│                     │        │  │   (TSDB)           │   │
│                     │        │  └────────┬────────────┘   │
└─────────────────────┘        │           │                │
                               │           ▼                │
                               │  ┌────────────────────┐   │
                               │  │     Grafana        │   │
                               │  │  (Visualization)   │   │
                               │  └────────────────────┘   │
                               └──────────────────────────┘
```

## Component Details

### 1. Frontend (React Application)

**Technology**: React 18 + Vite

**Responsibilities**:
- User authentication UI
- Metric configuration management
- API key management
- Code generation interface
- Dashboard and statistics

**Key Features**:
- Client-side routing (React Router)
- State management (Zustand)
- API client with token refresh
- Responsive UI/UX

**File Structure**:
```
frontend/
├── src/
│   ├── api/          # API client functions
│   ├── components/   # Reusable components
│   ├── pages/        # Page components
│   ├── store/        # State management
│   └── App.jsx       # Main app component
```

### 2. Backend API (Node.js/Express)

**Technology**: Node.js 20 + Express 5

**Responsibilities**:
- Authentication and authorization
- User management
- API key management
- Metric configuration CRUD
- Code generation
- Metrics ingestion
- Prometheus integration

**Architecture Pattern**: RESTful API with middleware-based architecture

**File Structure**:
```
backend/
├── src/
│   ├── database/     # Database connection & migrations
│   ├── middleware/   # Auth, rate limiting, error handling
│   ├── routes/        # API route handlers
│   ├── services/      # Business logic (code generation)
│   └── ...
└── index.js          # Application entry point
```

**Key Modules**:

1. **Authentication Module**
   - JWT-based authentication
   - Password hashing (bcrypt)
   - Token refresh mechanism
   - Session management

2. **API Key Module**
   - Generation and management
   - Validation middleware
   - Rate limiting per key

3. **Metric Configuration Module**
   - CRUD operations
   - Validation (Prometheus format)
   - User-scoped access

4. **Code Generation Module**
   - Template-based generation
   - API key embedding
   - Customizable options

5. **Metrics Ingestion Module**
   - REST endpoint
   - API key authentication
   - Batch processing
   - Prometheus Pushgateway integration

### 3. Database (PostgreSQL)

**Schema Design**:

**Users Table**:
- `id` (SERIAL PRIMARY KEY)
- `email` (VARCHAR, UNIQUE)
- `password_hash` (VARCHAR)
- `name` (VARCHAR, nullable)
- `created_at`, `updated_at` (TIMESTAMP)

**Refresh Tokens Table**:
- `id` (SERIAL PRIMARY KEY)
- `user_id` (INTEGER, FK to users)
- `token` (VARCHAR, UNIQUE)
- `expires_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)

**API Keys Table**:
- `id` (SERIAL PRIMARY KEY)
- `user_id` (INTEGER, FK to users)
- `key_name` (VARCHAR)
- `api_key` (VARCHAR, UNIQUE)
- `is_active` (BOOLEAN)
- `created_at`, `updated_at` (TIMESTAMP)

**Metric Configs Table**:
- `id` (SERIAL PRIMARY KEY)
- `user_id` (INTEGER, FK to users)
- `name` (VARCHAR)
- `description` (TEXT, nullable)
- `metric_type` (VARCHAR, CHECK constraint)
- `metric_name` (VARCHAR, UNIQUE per user)
- `labels` (JSONB)
- `help_text` (TEXT, nullable)
- `created_at`, `updated_at` (TIMESTAMP)

**Indexes**:
- Email lookup (users)
- Token lookup (refresh_tokens)
- API key lookup (api_keys)
- User-scoped queries (metric_configs)

### 4. Metrics Infrastructure

**Prometheus Pushgateway**:
- Receives metrics from backend
- Temporary storage for ephemeral clients
- Scraped by Prometheus

**Prometheus**:
- Time-series database
- Scrapes from Pushgateway
- Stores metrics long-term
- Query language (PromQL)

**Grafana**:
- Visualization platform
- Connects to Prometheus
- Pre-configured dashboards
- Query builder interface

## Data Flow

### Authentication Flow

```
1. User submits credentials
   ↓
2. Backend validates and hashes password
   ↓
3. Backend generates JWT tokens (access + refresh)
   ↓
4. Backend stores refresh token in database
   ↓
5. Frontend stores tokens in localStorage
   ↓
6. Frontend includes access token in API requests
   ↓
7. Backend validates token on each request
   ↓
8. On token expiry, frontend uses refresh token
   ↓
9. Backend issues new access token
```

### Metric Collection Flow

```
1. Client website loads tracking code
   ↓
2. Code initializes with API key and configs
   ↓
3. Code tracks events (auto or custom)
   ↓
4. Code batches metrics (10 per batch or 5s timeout)
   ↓
5. Code sends POST to /api/v1/metrics
   ↓
6. Backend validates API key
   ↓
7. Backend validates metrics format
   ↓
8. Backend pushes to Pushgateway
   ↓
9. Prometheus scrapes Pushgateway
   ↓
10. Metrics stored in Prometheus TSDB
    ↓
11. Grafana queries Prometheus
    ↓
12. User views metrics in Grafana
```

### Code Generation Flow

```
1. User selects API key and metric configs
   ↓
2. Backend fetches configs from database
   ↓
3. Backend generates JavaScript code template
   ↓
4. Backend embeds API key and configs
   ↓
5. Backend returns code to frontend
   ↓
6. User copies code to clipboard
   ↓
7. User pastes code in website
```

## Security Architecture

### Authentication & Authorization

1. **Password Security**:
   - bcrypt with 12 rounds
   - Minimum 8 characters
   - No password storage in plain text

2. **Token Security**:
   - Short-lived access tokens (15min)
   - Longer refresh tokens (7 days)
   - Token rotation on refresh
   - Secure storage in localStorage

3. **API Key Security**:
   - Cryptographically secure generation
   - One-time display
   - Active/inactive status
   - Per-key rate limiting

### Input Validation

- **Backend**: express-validator
- **Frontend**: HTML5 validation + custom validation
- **Database**: Constraints and checks
- **Sanitization**: Input sanitization on all user inputs

### Rate Limiting

- **Auth endpoints**: 5 requests/minute
- **Metrics endpoint**: 100 requests/minute per API key
- **General API**: 100 requests/minute

### Network Security

- CORS configuration
- Helmet.js security headers
- HTTPS in production (recommended)
- API key in headers (not URL)

## Scalability Considerations

### Current MVP Limitations

- Single backend instance
- Single PostgreSQL instance
- No caching layer
- No message queue
- Synchronous metric processing

### Future Scalability Options

1. **Horizontal Scaling**:
   - Load balancer (nginx/HAProxy)
   - Multiple backend instances
   - Stateless JWT authentication

2. **Database Scaling**:
   - Read replicas
   - Connection pooling
   - Query optimization

3. **Metrics Scaling**:
   - Prometheus federation
   - Multiple Pushgateway instances
   - Metric aggregation

4. **Caching**:
   - Redis for session storage
   - Cache metric configs
   - Cache API key lookups

5. **Async Processing**:
   - Message queue (RabbitMQ/Kafka)
   - Background workers
   - Batch processing

## Monitoring & Observability

### Application Monitoring

- Health check endpoint (`/health`)
- Request logging (morgan)
- Error logging
- Database query logging

### Metrics Monitoring

- Prometheus metrics
- Grafana dashboards
- Alert rules (future)

### Logging

- Structured logging (JSON format)
- Log levels (info, warn, error)
- Request/response logging
- Error stack traces

## Deployment Architecture

### Development

```
Local Machine
├── Frontend (Vite dev server :5173)
├── Backend (Node.js :3000)
└── Docker Compose
    ├── PostgreSQL (:5432)
    ├── Prometheus (:9090)
    ├── Pushgateway (:9091)
    └── Grafana (:3001)
```

### Production (Recommended)

```
Internet
  ↓
Load Balancer (nginx/HAProxy)
  ├── Frontend (Static files/CDN)
  └── Backend (Multiple instances)
      ├── PostgreSQL (Primary + Replicas)
      └── Prometheus Stack
          ├── Pushgateway
          ├── Prometheus
          └── Grafana
```

## Error Handling

### Backend Error Handling

- Centralized error handler middleware
- Custom error classes
- HTTP status codes
- Error messages (sanitized in production)
- Stack traces (development only)

### Frontend Error Handling

- Try-catch in API calls
- Error boundaries (React)
- User-friendly error messages
- Retry logic for failed requests

## Testing Strategy (Future)

### Unit Tests
- Service functions
- Utility functions
- Validation logic

### Integration Tests
- API endpoints
- Database operations
- Authentication flow

### E2E Tests
- User workflows
- Metric collection
- Code generation

## Performance Optimization

### Current Optimizations

- Database indexes
- Connection pooling
- Batch metric processing
- Client-side batching

### Future Optimizations

- Database query optimization
- Caching layer
- CDN for static assets
- Compression (gzip)
- Database query result caching

