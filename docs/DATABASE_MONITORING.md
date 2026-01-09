# Database Monitoring Best Practices

This document outlines the comprehensive database monitoring solution implemented for connection pool and query performance tracking.

## Overview

The monitoring system provides real-time visibility into:
- **Connection Pool Metrics**: Active, idle, waiting, and total connections
- **Query Performance**: Duration, count, errors, and slow query detection
- **Database Health**: Health status and response time
- **Connection Acquisition**: Time taken to acquire connections from the pool

## Architecture

### Components

1. **Database Monitoring Service** (`dbMonitoring.service.js`)
   - Exposes Prometheus metrics using `prom-client`
   - Tracks all database operations and connection pool state
   - Provides metrics in Prometheus format

2. **Enhanced Connection Pool** (`connection.js`)
   - Wraps all queries with performance tracking
   - Monitors connection pool events
   - Performs periodic health checks

3. **Prometheus Integration**
   - Metrics endpoint: `/api/v1/metrics/prometheus`
   - Scraped by Prometheus every 10 seconds
   - Stored with 30-day retention

4. **Grafana Dashboard**
   - Real-time visualization of all metrics
   - Pre-configured alerts and thresholds
   - Query performance analysis

## Metrics Exposed

### Connection Pool Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `db_pool_total_connections` | Gauge | Total connections in pool |
| `db_pool_active_connections` | Gauge | Active connections in use |
| `db_pool_idle_connections` | Gauge | Idle connections available |
| `db_pool_waiting_count` | Gauge | Requests waiting for connection |
| `db_pool_max_connections` | Gauge | Maximum pool size |

### Query Performance Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `db_query_duration_seconds` | Histogram | Query execution time distribution |
| `db_query_total` | Counter | Total queries by type and status |
| `db_slow_query_total` | Counter | Queries exceeding threshold (default: 1s) |

### Connection Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `db_connection_acquisition_seconds` | Histogram | Time to acquire connection |
| `db_connection_errors_total` | Counter | Connection errors by type |

### Health Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `db_health_status` | Gauge | Health status (1=healthy, 0=unhealthy) |
| `db_response_time_seconds` | Gauge | Health check response time |

## Best Practices Implemented

### 1. Connection Pool Monitoring

**Key Metrics to Watch:**
- **Pool Utilization**: `(total_connections / max_connections) * 100`
  - Alert if > 85%
  - Consider increasing pool size if consistently high

- **Waiting Connections**: `db_pool_waiting_count`
  - Alert if > 0 (indicates pool exhaustion)
  - Immediate action required if > 5

- **Active vs Idle Ratio**
  - Healthy: More idle than active connections
  - Warning: Active approaching max
  - Critical: No idle connections available

**Optimization Tips:**
```javascript
// Recommended pool settings
{
  max: 20,                    // Adjust based on DB server capacity
  idleTimeoutMillis: 30000,    // Close idle connections after 30s
  connectionTimeoutMillis: 2000 // Fail fast if can't connect
}
```

### 2. Query Performance Monitoring

**Slow Query Detection:**
- Default threshold: 1000ms (configurable via `SLOW_QUERY_THRESHOLD_MS`)
- Tracked per query type (SELECT, INSERT, UPDATE, DELETE)
- Alert on increasing slow query rate

**Query Duration Percentiles:**
- **p95**: 95% of queries complete within this time
- **p99**: 99% of queries complete within this time
- **p99.9**: For high-traffic systems

**Best Practices:**
- Monitor query duration histograms for distribution
- Track query rate by type to identify hotspots
- Set alerts on p95 > 500ms or p99 > 1s

### 3. Connection Acquisition Monitoring

**Why It Matters:**
- High acquisition time indicates pool contention
- Should typically be < 10ms
- Alert if p95 > 50ms or p99 > 100ms

**Troubleshooting:**
- High acquisition time + waiting connections = increase pool size
- High acquisition time + low utilization = check network latency

### 4. Error Tracking

**Connection Errors:**
- Track by error code (e.g., `ECONNREFUSED`, `ETIMEDOUT`)
- Alert immediately on any connection errors
- Monitor error rate trends

**Query Errors:**
- Track by query type and error code
- Distinguish between application errors and DB errors
- Set up alerts for error rate spikes

### 5. Health Checks

**Implementation:**
- Periodic health checks every 30 seconds
- Simple `SELECT 1` query to verify connectivity
- Response time tracking for health check queries

**Alerting:**
- Health status = 0 (unhealthy)
- Response time > 1 second
- Health check failures > 3 consecutive

## Configuration

### Environment Variables

```bash
# Database Connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=metrics_db
DB_USER=postgres
DB_PASSWORD=postgres

# Connection Pool Settings
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=2000

# Monitoring Settings
SLOW_QUERY_THRESHOLD_MS=1000  # Alert threshold for slow queries
```

### Prometheus Configuration

The Prometheus configuration (`docker/prometheus/prometheus.yml`) includes:
- Scrape interval: 10 seconds
- Metrics path: `/api/v1/metrics/prometheus`
- Retention: 30 days

### Grafana Dashboard

Access the dashboard at: `http://localhost:3001`
- Default credentials: `admin/admin`
- Dashboard: "Database Monitoring Dashboard"

## Alerting Recommendations

### Critical Alerts

1. **Pool Exhaustion**
   ```
   db_pool_waiting_count > 0
   ```
   Action: Increase pool size or optimize queries

2. **Database Unhealthy**
   ```
   db_health_status == 0
   ```
   Action: Check database server status

3. **High Error Rate**
   ```
   rate(db_connection_errors_total[5m]) > 0
   ```
   Action: Investigate connection issues

### Warning Alerts

1. **High Pool Utilization**
   ```
   (db_pool_total_connections / db_pool_max_connections) > 0.85
   ```
   Action: Monitor and consider scaling

2. **Slow Query Spike**
   ```
   rate(db_slow_query_total[5m]) > 10
   ```
   Action: Review slow queries and optimize

3. **High Query Duration**
   ```
   histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m])) > 0.5
   ```
   Action: Optimize slow queries

## Performance Optimization Tips

### 1. Connection Pool Sizing

**Formula:**
```
pool_size = ((core_count * 2) + effective_spindle_count)
```

**For PostgreSQL:**
- Default: 20 connections
- Small apps: 10-20
- Medium apps: 20-50
- Large apps: 50-100 (monitor DB server capacity)

### 2. Query Optimization

- Use indexes on frequently queried columns
- Avoid N+1 queries (use JOINs or batch queries)
- Use connection pooling for all queries
- Monitor slow query log

### 3. Connection Management

- Always release connections (automatic with pool.query)
- Use transactions for multi-step operations
- Set appropriate timeouts
- Monitor connection acquisition time

### 4. Monitoring Best Practices

- **Baseline Metrics**: Establish normal ranges during low traffic
- **Trend Analysis**: Monitor metrics over time, not just current values
- **Correlation**: Correlate query performance with application metrics
- **Capacity Planning**: Use metrics to plan for growth

## Troubleshooting Guide

### High Pool Utilization

**Symptoms:**
- `db_pool_total_connections` approaching `db_pool_max_connections`
- `db_pool_waiting_count` > 0

**Solutions:**
1. Increase pool size (if DB server can handle it)
2. Optimize slow queries
3. Add connection pooling at application level
4. Consider read replicas for read-heavy workloads

### Slow Queries

**Symptoms:**
- High `db_query_duration_seconds` percentiles
- Increasing `db_slow_query_total`

**Solutions:**
1. Analyze slow queries using EXPLAIN ANALYZE
2. Add missing indexes
3. Optimize query logic
4. Consider query caching for frequently accessed data

### Connection Errors

**Symptoms:**
- `db_connection_errors_total` increasing
- `db_health_status` = 0

**Solutions:**
1. Check database server status
2. Verify network connectivity
3. Review connection timeout settings
4. Check database server connection limits

## Integration with Existing Monitoring

The database metrics integrate seamlessly with:
- **Prometheus**: Scraped every 10 seconds
- **Grafana**: Pre-configured dashboard
- **Pushgateway**: For batch job metrics
- **Application Metrics**: Can be correlated with app-level metrics

## Future Enhancements

Potential improvements:
1. **Query Plan Analysis**: Track query plans and execution statistics
2. **Table-level Metrics**: Track queries per table
3. **Transaction Metrics**: Monitor transaction duration and rollbacks
4. **Replication Lag**: If using read replicas
5. **Lock Monitoring**: Track database locks and deadlocks
6. **Index Usage**: Monitor index hit rates

## References

- [PostgreSQL Connection Pooling Best Practices](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [pg-pool Documentation](https://node-postgres.com/features/pooling)

