import promClient from 'prom-client';

// Create a Registry for database metrics
const dbRegistry = new promClient.Registry();

// Connection Pool Metrics
const poolTotalConnections = new promClient.Gauge({
  name: 'db_pool_total_connections',
  help: 'Total number of connections in the pool',
  labelNames: ['database'],
  registers: [dbRegistry],
});

const poolActiveConnections = new promClient.Gauge({
  name: 'db_pool_active_connections',
  help: 'Number of active connections in use',
  labelNames: ['database'],
  registers: [dbRegistry],
});

const poolIdleConnections = new promClient.Gauge({
  name: 'db_pool_idle_connections',
  help: 'Number of idle connections in the pool',
  labelNames: ['database'],
  registers: [dbRegistry],
});

const poolWaitingCount = new promClient.Gauge({
  name: 'db_pool_waiting_count',
  help: 'Number of requests waiting for a connection',
  labelNames: ['database'],
  registers: [dbRegistry],
});

const poolMaxConnections = new promClient.Gauge({
  name: 'db_pool_max_connections',
  help: 'Maximum number of connections allowed in the pool',
  labelNames: ['database'],
  registers: [dbRegistry],
});

// Query Performance Metrics
const queryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['database', 'query_type', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [dbRegistry],
});

const queryCount = new promClient.Counter({
  name: 'db_query_total',
  help: 'Total number of database queries',
  labelNames: ['database', 'query_type', 'status'],
  registers: [dbRegistry],
});

const slowQueryCount = new promClient.Counter({
  name: 'db_slow_query_total',
  help: 'Total number of slow queries (exceeding threshold)',
  labelNames: ['database', 'query_type'],
  registers: [dbRegistry],
});

// Connection Metrics
const connectionErrors = new promClient.Counter({
  name: 'db_connection_errors_total',
  help: 'Total number of database connection errors',
  labelNames: ['database', 'error_type'],
  registers: [dbRegistry],
});

const connectionAcquisitionTime = new promClient.Histogram({
  name: 'db_connection_acquisition_seconds',
  help: 'Time taken to acquire a connection from the pool',
  labelNames: ['database'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [dbRegistry],
});

// Database Health Metrics
const dbHealthCheck = new promClient.Gauge({
  name: 'db_health_status',
  help: 'Database health status (1 = healthy, 0 = unhealthy)',
  labelNames: ['database'],
  registers: [dbRegistry],
});

const dbResponseTime = new promClient.Gauge({
  name: 'db_response_time_seconds',
  help: 'Database response time for health check',
  labelNames: ['database'],
  registers: [dbRegistry],
});

// Slow query threshold (configurable, default 1 second)
const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '1000', 10);
const DB_NAME = process.env.DB_NAME || 'metrics_db';

/**
 * Update connection pool metrics
 * @param {Object} pool - pg.Pool instance
 */
export const updatePoolMetrics = (pool) => {
  try {
    // pg Pool exposes these properties directly
    const total = pool.totalCount || 0;
    const idle = pool.idleCount || 0;
    const waiting = pool.waitingCount || 0;
    const max = pool.options?.max || pool.max || 20;

    // Calculate active connections
    const active = total - idle;

    poolTotalConnections.set({ database: DB_NAME }, total);
    poolActiveConnections.set({ database: DB_NAME }, active);
    poolIdleConnections.set({ database: DB_NAME }, idle);
    poolWaitingCount.set({ database: DB_NAME }, waiting);
    poolMaxConnections.set({ database: DB_NAME }, max);
  } catch (error) {
    // Fallback if pool stats are not available
    console.warn("Could not update pool metrics:", error.message);
    poolMaxConnections.set({ database: DB_NAME }, pool.options?.max || pool.max || 20);
  }
};

/**
 * Record query metrics
 * @param {string} queryText - The SQL query text
 * @param {number} durationMs - Query duration in milliseconds
 * @param {string} status - Query status: 'success' or 'error'
 * @param {Error} error - Error object if query failed
 */
export const recordQueryMetrics = (queryText, durationMs, status = 'success', error = null) => {
  const durationSeconds = durationMs / 1000;
  const queryType = getQueryType(queryText);

  // Record duration histogram
  queryDuration.observe({ database: DB_NAME, query_type: queryType, status }, durationSeconds);

  // Record query count
  queryCount.inc({ database: DB_NAME, query_type: queryType, status });

  // Record slow queries
  if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
    slowQueryCount.inc({ database: DB_NAME, query_type: queryType });
  }

  // Record connection errors
  if (error && error.code) {
    connectionErrors.inc({ database: DB_NAME, error_type: error.code });
  }
};

/**
 * Record connection acquisition time
 * @param {number} durationMs - Time taken to acquire connection in milliseconds
 */
export const recordConnectionAcquisition = (durationMs) => {
  const durationSeconds = durationMs / 1000;
  connectionAcquisitionTime.observe({ database: DB_NAME }, durationSeconds);
};

/**
 * Update database health metrics
 * @param {boolean} isHealthy - Whether database is healthy
 * @param {number} responseTimeMs - Health check response time in milliseconds
 */
export const updateHealthMetrics = (isHealthy, responseTimeMs = 0) => {
  dbHealthCheck.set({ database: DB_NAME }, isHealthy ? 1 : 0);
  dbResponseTime.set({ database: DB_NAME }, responseTimeMs / 1000);
};

/**
 * Determine query type from SQL text
 * @param {string} queryText - SQL query text
 * @returns {string} Query type
 */
const getQueryType = (queryText) => {
  if (!queryText) return 'unknown';
  
  const normalized = queryText.trim().toUpperCase();
  
  if (normalized.startsWith('SELECT')) return 'select';
  if (normalized.startsWith('INSERT')) return 'insert';
  if (normalized.startsWith('UPDATE')) return 'update';
  if (normalized.startsWith('DELETE')) return 'delete';
  if (normalized.startsWith('CREATE')) return 'create';
  if (normalized.startsWith('ALTER')) return 'alter';
  if (normalized.startsWith('DROP')) return 'drop';
  if (normalized.startsWith('BEGIN') || normalized.startsWith('COMMIT') || normalized.startsWith('ROLLBACK')) return 'transaction';
  
  return 'other';
};

/**
 * Get metrics registry
 */
export const getMetricsRegistry = () => dbRegistry;

/**
 * Get metrics as Prometheus format string
 */
export const getMetrics = async () => {
  return await dbRegistry.metrics();
};

/**
 * Reset all metrics (useful for testing)
 */
export const resetMetrics = () => {
  dbRegistry.resetMetrics();
};

