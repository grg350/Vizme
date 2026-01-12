function AlertsList({ 
  alerts = [], 
  loading = false, 
  error = null,
  maxItems = 5,
  showViewAll = true,
  onViewAll
}) {
  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return '🔴';
      case 'warning': return '🟡';
      case 'info': return '🔵';
      default: return '⚪';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="alerts-list">
        <h3 className="alerts-title">Active Alerts</h3>
        <div className="alerts-loading">
          <div className="chart-spinner"></div>
          <span>Loading alerts...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alerts-list">
        <h3 className="alerts-title">Active Alerts</h3>
        <div className="alerts-error">
          <span>⚠️ Failed to load alerts</span>
        </div>
      </div>
    );
  }

  const displayAlerts = alerts.slice(0, maxItems);
  const hasMore = alerts.length > maxItems;

  return (
    <div className="alerts-list">
      <div className="alerts-header">
        <h3 className="alerts-title">
          Active Alerts
          {alerts.length > 0 && (
            <span className="alerts-count">{alerts.length}</span>
          )}
        </h3>
      </div>

      {displayAlerts.length === 0 ? (
        <div className="alerts-empty">
          <span className="alerts-empty-icon">✓</span>
          <span>No active alerts</span>
          <span className="alerts-empty-sub">All systems operational</span>
        </div>
      ) : (
        <div className="alerts-items">
          {displayAlerts.map((alert, index) => (
            <div 
              key={alert.fingerprint || index} 
              className="alert-item"
              style={{ borderLeftColor: getSeverityColor(alert.labels?.severity) }}
            >
              <div className="alert-item-header">
                <span className="alert-severity">
                  {getSeverityIcon(alert.labels?.severity)}
                </span>
                <span className="alert-name">{alert.labels?.alertname || 'Unknown'}</span>
                <span className="alert-time">{formatTime(alert.startsAt || alert.activeAt)}</span>
              </div>
              <div className="alert-item-body">
                <p className="alert-description">
                  {alert.annotations?.description || alert.annotations?.summary || 'No description'}
                </p>
                {alert.labels?.instance && (
                  <span className="alert-instance">{alert.labels.instance}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(hasMore || showViewAll) && alerts.length > 0 && (
        <button className="alerts-view-all" onClick={onViewAll}>
          {hasMore ? `View all ${alerts.length} alerts →` : 'View all alerts →'}
        </button>
      )}
    </div>
  );
}

export default AlertsList;

