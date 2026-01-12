import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { metricsAPI, metricsHelpers } from '../api/metrics';
import TimeSeriesChart from '../components/charts/TimeSeriesChart';
import GaugeChart from '../components/charts/GaugeChart';
import StatCard from '../components/charts/StatCard';
import AlertsList from '../components/charts/AlertsList';
import './Dashboard.css';

const REFRESH_INTERVAL = 10000; // 10 seconds

function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Stat metrics
  const [stats, setStats] = useState({
    requestRate: null,
    errorRate: null,
    p95Latency: null,
    activeConnections: null,
  });
  
  // Time series data
  const [requestsTimeSeries, setRequestsTimeSeries] = useState([]);
  const [latencyTimeSeries, setLatencyTimeSeries] = useState([]);
  
  // Infrastructure metrics
  const [cpuUsage, setCpuUsage] = useState(null);
  const [memoryUsage, setMemoryUsage] = useState(null);
  
  // Alerts
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      const { start, end, step } = metricsHelpers.getTimeRange('1h');

      // Fetch all metrics in parallel
      const [
        requestRateRes,
        errorRateRes,
        latencyRes,
        connectionsRes,
        cpuRes,
        memoryRes,
        requestsRangeRes,
        latencyRangeRes,
        alertsRes
      ] = await Promise.allSettled([
        metricsAPI.query('sum(rate(uvp_http_requests_total[5m]))'),
        metricsAPI.query('(sum(rate(uvp_http_requests_total{status_code=~"5.."}[5m])) / sum(rate(uvp_http_requests_total[5m]))) * 100'),
        metricsAPI.query('histogram_quantile(0.95, sum(rate(uvp_http_request_duration_seconds_bucket[5m])) by (le))'),
        metricsAPI.query('uvp_active_connections'),
        metricsAPI.query('100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)'),
        metricsAPI.query('(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100'),
        metricsAPI.queryRange('sum(rate(uvp_http_requests_total[5m]))', start, end, step),
        metricsAPI.queryRange('histogram_quantile(0.95, sum(rate(uvp_http_request_duration_seconds_bucket[5m])) by (le))', start, end, step),
        metricsAPI.getAlerts()
      ]);

      // Parse stat results
      setStats({
        requestRate: requestRateRes.status === 'fulfilled' ? metricsHelpers.parseScalarResult(requestRateRes.value) : null,
        errorRate: errorRateRes.status === 'fulfilled' ? metricsHelpers.parseScalarResult(errorRateRes.value) : null,
        p95Latency: latencyRes.status === 'fulfilled' ? metricsHelpers.parseScalarResult(latencyRes.value) : null,
        activeConnections: connectionsRes.status === 'fulfilled' ? metricsHelpers.parseScalarResult(connectionsRes.value) : null,
      });

      // Parse infrastructure metrics
      setCpuUsage(cpuRes.status === 'fulfilled' ? metricsHelpers.parseScalarResult(cpuRes.value) : null);
      setMemoryUsage(memoryRes.status === 'fulfilled' ? metricsHelpers.parseScalarResult(memoryRes.value) : null);

      // Parse time series
      if (requestsRangeRes.status === 'fulfilled') {
        const data = metricsHelpers.parseRangeResult(requestsRangeRes.value, 'requests');
        setRequestsTimeSeries(data);
      }

      if (latencyRangeRes.status === 'fulfilled') {
        const data = metricsHelpers.parseRangeResult(latencyRangeRes.value, 'p95');
        setLatencyTimeSeries(data);
      }

      // Parse alerts
      if (alertsRes.status === 'fulfilled' && alertsRes.value?.data?.alerts) {
        setAlerts(alertsRes.value.data.alerts.filter(a => a.state === 'firing'));
      }
      setAlertsLoading(false);

      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setError('Failed to connect to metrics service');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    
    const interval = setInterval(fetchMetrics, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title-section">
          <h1>Unified Dashboard</h1>
          <p className="dashboard-subtitle">Real-time observability at a glance</p>
        </div>
        <div className="dashboard-header-right">
          {lastUpdated && (
            <span className="last-updated">
              <span className="live-dot"></span>
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <a 
            href={import.meta.env.VITE_GRAFANA_URL || 'http://localhost:3001'} 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            Open Grafana →
          </a>
        </div>
      </div>

      {error && (
        <div className="dashboard-error">
          <span>⚠️ {error}</span>
          <button onClick={fetchMetrics} className="btn btn-secondary">Retry</button>
        </div>
      )}

      {/* Key Stats Row */}
      <section className="dashboard-section">
        <div className="stats-row">
          <StatCard
            title="Request Rate"
            value={stats.requestRate}
            unit="/s"
            icon="📊"
            color="cyan"
            loading={loading}
            format="number"
            sparklineData={requestsTimeSeries.map(d => d.requests)}
          />
          <StatCard
            title="Error Rate"
            value={stats.errorRate}
            unit="%"
            icon="⚠️"
            color={stats.errorRate > 5 ? 'red' : stats.errorRate > 1 ? 'amber' : 'green'}
            loading={loading}
            format="percent"
          />
          <StatCard
            title="P95 Latency"
            value={stats.p95Latency}
            icon="⏱️"
            color={stats.p95Latency > 1 ? 'red' : stats.p95Latency > 0.5 ? 'amber' : 'green'}
            loading={loading}
            format="duration"
            sparklineData={latencyTimeSeries.map(d => d.p95)}
          />
          <StatCard
            title="Active Connections"
            value={stats.activeConnections}
            icon="🔗"
            color="blue"
            loading={loading}
            format="number"
          />
        </div>
      </section>

      {/* Time Series Charts Row */}
      <section className="dashboard-section">
        <div className="charts-row">
          <div className="chart-card">
            <TimeSeriesChart
              data={requestsTimeSeries}
              lines={[{ dataKey: 'requests', name: 'Requests/s', color: '#06b6d4' }]}
              title="Request Rate Over Time"
              unit="reqps"
              type="area"
              height={250}
              loading={loading}
            />
          </div>
          <div className="chart-card">
            <TimeSeriesChart
              data={latencyTimeSeries}
              lines={[{ dataKey: 'p95', name: 'P95 Latency', color: '#8b5cf6' }]}
              title="Latency Over Time"
              unit="s"
              type="line"
              height={250}
              loading={loading}
              thresholds={[{ value: 1, label: 'SLO', color: '#ef4444' }]}
            />
          </div>
        </div>
      </section>

      {/* Infrastructure & Alerts Row */}
      <section className="dashboard-section">
        <div className="bottom-row">
          <div className="infrastructure-card">
            <h3 className="section-title">Infrastructure</h3>
            <div className="gauges-row">
              <GaugeChart
                title="CPU Usage"
                value={cpuUsage}
                max={100}
                unit="%"
                thresholds={[
                  { value: 60, color: '#10b981' },
                  { value: 80, color: '#f59e0b' },
                  { value: 100, color: '#ef4444' },
                ]}
                loading={loading}
              />
              <GaugeChart
                title="Memory Usage"
                value={memoryUsage}
                max={100}
                unit="%"
                thresholds={[
                  { value: 70, color: '#10b981' },
                  { value: 85, color: '#f59e0b' },
                  { value: 100, color: '#ef4444' },
                ]}
                loading={loading}
              />
            </div>
          </div>
          <div className="alerts-card">
            <AlertsList
              alerts={alerts}
              loading={alertsLoading}
              maxItems={4}
              onViewAll={() => navigate('/alerts')}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
