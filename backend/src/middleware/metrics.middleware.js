import client from 'prom-client';

// Create a Registry
const register = new client.Registry();

// Add default labels
register.setDefaultLabels({
  app: 'unified_visibility_platform'
});

// Collect default Node.js metrics (CPU, memory, event loop lag, etc.)
client.collectDefaultMetrics({ 
  register,
  prefix: 'uvp_'
});

// ============================
// Custom HTTP Metrics
// ============================

// HTTP request duration histogram
export const httpRequestDuration = new client.Histogram({
  name: 'uvp_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register]
});

// Total HTTP requests counter
export const httpRequestsTotal = new client.Counter({
  name: 'uvp_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// HTTP request size histogram
export const httpRequestSize = new client.Histogram({
  name: 'uvp_http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
  registers: [register]
});

// HTTP response size histogram
export const httpResponseSize = new client.Histogram({
  name: 'uvp_http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
  registers: [register]
});

// ============================
// Database Metrics
// ============================

// Database query duration histogram
export const dbQueryDuration = new client.Histogram({
  name: 'uvp_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type', 'success'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register]
});

// Database query counter
export const dbQueriesTotal = new client.Counter({
  name: 'uvp_db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['query_type', 'success'],
  registers: [register]
});

// ============================
// Connection Metrics
// ============================

// Active connections gauge
export const activeConnections = new client.Gauge({
  name: 'uvp_active_connections',
  help: 'Number of active connections',
  registers: [register]
});

// Active database connections gauge
export const activeDbConnections = new client.Gauge({
  name: 'uvp_active_db_connections',
  help: 'Number of active database connections',
  registers: [register]
});

// ============================
// Business Metrics
// ============================

// Metrics ingested counter
export const metricsIngested = new client.Counter({
  name: 'uvp_metrics_ingested_total',
  help: 'Total number of metrics ingested',
  labelNames: ['user_id'],
  registers: [register]
});

// API key usage counter
export const apiKeyUsage = new client.Counter({
  name: 'uvp_api_key_usage_total',
  help: 'Total number of API key usages',
  labelNames: ['key_id'],
  registers: [register]
});

// ============================
// Middleware Functions
// ============================

// Normalize route path to avoid high cardinality
const normalizeRoute = (req) => {
  // Get the matched route pattern or fall back to path
  if (req.route && req.route.path) {
    return req.baseUrl + req.route.path;
  }
  
  // For unmatched routes, use a generic label
  const path = req.path || req.url;
  
  // Replace IDs with :id placeholder
  return path
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '/:uuid');
};

// HTTP metrics middleware
export const metricsMiddleware = (req, res, next) => {
  // Skip metrics endpoint to avoid recursion
  if (req.path === '/metrics') {
    return next();
  }

  const startTime = process.hrtime.bigint();
  
  // Track active connections
  activeConnections.inc();
  
  // Capture request size
  const requestSize = parseInt(req.headers['content-length'] || 0, 10);

  // Override res.end to capture metrics
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    // Restore original end
    res.end = originalEnd;
    
    // Calculate duration
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e9; // Convert to seconds
    
    // Get normalized route
    const route = normalizeRoute(req);
    const method = req.method;
    const statusCode = res.statusCode.toString();
    
    // Record metrics
    httpRequestDuration.labels(method, route, statusCode).observe(duration);
    httpRequestsTotal.labels(method, route, statusCode).inc();
    
    if (requestSize > 0) {
      httpRequestSize.labels(method, route).observe(requestSize);
    }
    
    // Calculate response size
    const responseSize = chunk ? chunk.length : 0;
    if (responseSize > 0) {
      httpResponseSize.labels(method, route, statusCode).observe(responseSize);
    }
    
    // Decrement active connections
    activeConnections.dec();
    
    // Call original end
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

// ============================
// Metrics Endpoint Handler
// ============================

export const metricsHandler = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).end('Error generating metrics');
  }
};

// Export the registry for use in other modules
export { register };
export default { register, metricsMiddleware, metricsHandler };

