import { useEffect, useState, useCallback } from 'react';
import { metricsAPI } from '../api/metrics';
import './Alerts.css';

function Alerts() {
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [alertRules, setAlertRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'firing', 'pending'

  const fetchAlerts = useCallback(async () => {
    try {
      setError(null);
      
      const [alertsRes, rulesRes] = await Promise.allSettled([
        metricsAPI.getAlerts(),
        metricsAPI.getRules()
      ]);

      if (alertsRes.status === 'fulfilled' && alertsRes.value?.data?.alerts) {
        setActiveAlerts(alertsRes.value.data.alerts);
      }

      if (rulesRes.status === 'fulfilled' && rulesRes.value?.data?.groups) {
        const rules = rulesRes.value.data.groups.flatMap(group => 
          group.rules.filter(rule => rule.type === 'alerting').map(rule => ({
            ...rule,
            group: group.name
          }))
        );
        setAlertRules(rules);
      }

      setLoading(false);
      setRulesLoading(false);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setError('Failed to fetch alerts');
      setLoading(false);
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStateColor = (state) => {
    switch (state?.toLowerCase()) {
      case 'firing': return '#ef4444';
      case 'pending': return '#f59e0b';
      case 'inactive': return '#10b981';
      default: return '#6b7280';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const firingAlerts = activeAlerts.filter(a => a.state === 'firing');
  const pendingAlerts = activeAlerts.filter(a => a.state === 'pending');

  const filteredAlerts = filter === 'all' 
    ? activeAlerts 
    : activeAlerts.filter(a => a.state === filter);

  const alertmanagerUrl = import.meta.env.VITE_ALERTMANAGER_URL || 'http://localhost:9093';

  return (
    <div className="alerts-page">
      <div className="alerts-page-header">
        <div className="alerts-title-section">
          <h1>Alerts</h1>
          <p className="alerts-subtitle">Monitor alert rules and active incidents</p>
        </div>
        <div className="alerts-header-right">
          {lastUpdated && (
            <span className="last-updated">
              <span className="live-dot"></span>
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <a 
            href={alertmanagerUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            Open Alertmanager →
          </a>
        </div>
      </div>

      {error && (
        <div className="alerts-page-error">
          <span>⚠️ {error}</span>
          <button onClick={fetchAlerts} className="btn btn-secondary">Retry</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="alerts-summary">
        <div className="summary-card summary-card--firing">
          <div className="summary-icon">🔴</div>
          <div className="summary-content">
            <span className="summary-value">{firingAlerts.length}</span>
            <span className="summary-label">Firing</span>
          </div>
        </div>
        <div className="summary-card summary-card--pending">
          <div className="summary-icon">🟡</div>
          <div className="summary-content">
            <span className="summary-value">{pendingAlerts.length}</span>
            <span className="summary-label">Pending</span>
          </div>
        </div>
        <div className="summary-card summary-card--rules">
          <div className="summary-icon">📋</div>
          <div className="summary-content">
            <span className="summary-value">{alertRules.length}</span>
            <span className="summary-label">Alert Rules</span>
          </div>
        </div>
      </div>

      {/* Active Alerts Section */}
      <section className="alerts-section">
        <div className="section-header">
          <h2>Active Alerts</h2>
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({activeAlerts.length})
            </button>
            <button 
              className={`filter-btn ${filter === 'firing' ? 'active' : ''}`}
              onClick={() => setFilter('firing')}
            >
              Firing ({firingAlerts.length})
            </button>
            <button 
              className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
              onClick={() => setFilter('pending')}
            >
              Pending ({pendingAlerts.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="alerts-loading">
            <div className="spinner"></div>
            <span>Loading alerts...</span>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="alerts-empty">
            <span className="alerts-empty-icon">✅</span>
            <span className="alerts-empty-text">No active alerts</span>
            <span className="alerts-empty-sub">All systems are operating normally</span>
          </div>
        ) : (
          <div className="alerts-grid">
            {filteredAlerts.map((alert, index) => (
              <div 
                key={alert.fingerprint || index}
                className={`alert-card alert-card--${alert.state}`}
                style={{ borderLeftColor: getSeverityColor(alert.labels?.severity) }}
              >
                <div className="alert-card-header">
                  <div className="alert-card-title">
                    <span 
                      className="alert-state-badge"
                      style={{ backgroundColor: getStateColor(alert.state) }}
                    >
                      {alert.state?.toUpperCase()}
                    </span>
                    <h3>{alert.labels?.alertname || 'Unknown Alert'}</h3>
                  </div>
                  <span 
                    className="alert-severity"
                    style={{ color: getSeverityColor(alert.labels?.severity) }}
                  >
                    {alert.labels?.severity || 'unknown'}
                  </span>
                </div>
                <div className="alert-card-body">
                  <p className="alert-description">
                    {alert.annotations?.description || alert.annotations?.summary || 'No description available'}
                  </p>
                  <div className="alert-meta">
                    {alert.labels?.instance && (
                      <span className="alert-meta-item">
                        <strong>Instance:</strong> {alert.labels.instance}
                      </span>
                    )}
                    {alert.labels?.job && (
                      <span className="alert-meta-item">
                        <strong>Job:</strong> {alert.labels.job}
                      </span>
                    )}
                    <span className="alert-meta-item">
                      <strong>Started:</strong> {formatTime(alert.activeAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Alert Rules Section */}
      <section className="alerts-section">
        <div className="section-header">
          <h2>Alert Rules</h2>
        </div>

        {rulesLoading ? (
          <div className="alerts-loading">
            <div className="spinner"></div>
            <span>Loading rules...</span>
          </div>
        ) : alertRules.length === 0 ? (
          <div className="alerts-empty">
            <span className="alerts-empty-text">No alert rules configured</span>
          </div>
        ) : (
          <div className="rules-table-container">
            <table className="rules-table">
              <thead>
                <tr>
                  <th>Alert Name</th>
                  <th>Group</th>
                  <th>Severity</th>
                  <th>State</th>
                  <th>For</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {alertRules.map((rule, index) => (
                  <tr key={index}>
                    <td className="rule-name">{rule.name}</td>
                    <td className="rule-group">{rule.group}</td>
                    <td>
                      <span 
                        className="severity-badge"
                        style={{ backgroundColor: getSeverityColor(rule.labels?.severity) }}
                      >
                        {rule.labels?.severity || 'unknown'}
                      </span>
                    </td>
                    <td>
                      <span 
                        className="state-badge"
                        style={{ backgroundColor: getStateColor(rule.state) }}
                      >
                        {rule.state || 'inactive'}
                      </span>
                    </td>
                    <td>{formatDuration(rule.duration)}</td>
                    <td className="rule-description">
                      {rule.annotations?.summary || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Alerts;

