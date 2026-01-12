import { useState, useEffect, useRef } from 'react';

function StatCard({
  title,
  value,
  previousValue,
  unit = '',
  icon,
  color = 'cyan',
  loading = false,
  error = null,
  sparklineData = [],
  format = 'number'
}) {
  const [trend, setTrend] = useState(null);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current !== undefined && value !== undefined) {
      if (value > prevValueRef.current) {
        setTrend('up');
      } else if (value < prevValueRef.current) {
        setTrend('down');
      } else {
        setTrend(null);
      }
    }
    prevValueRef.current = value;
  }, [value]);

  // Calculate percentage change
  const percentChange = previousValue && value !== undefined
    ? ((value - previousValue) / previousValue * 100)
    : null;

  // Format the value for display
  const formatValue = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    
    if (format === 'percent') {
      return `${val.toFixed(1)}%`;
    }
    if (format === 'duration') {
      if (val < 0.001) return `${(val * 1000000).toFixed(0)}µs`;
      if (val < 1) return `${(val * 1000).toFixed(0)}ms`;
      return `${val.toFixed(2)}s`;
    }
    if (format === 'bytes') {
      if (val >= 1073741824) return `${(val / 1073741824).toFixed(1)} GB`;
      if (val >= 1048576) return `${(val / 1048576).toFixed(1)} MB`;
      if (val >= 1024) return `${(val / 1024).toFixed(1)} KB`;
      return `${val} B`;
    }
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    if (Number.isInteger(val)) return val.toString();
    return val.toFixed(2);
  };

  // Color classes
  const colorClasses = {
    cyan: 'stat-card--cyan',
    green: 'stat-card--green',
    amber: 'stat-card--amber',
    red: 'stat-card--red',
    violet: 'stat-card--violet',
    blue: 'stat-card--blue'
  };

  // Simple SVG sparkline
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;

    const values = sparklineData.map(d => typeof d === 'number' ? d : d.value).filter(v => !isNaN(v));
    if (values.length < 2) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    
    const width = 60;
    const height = 20;
    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="stat-sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          points={points}
        />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className={`stat-card ${colorClasses[color] || ''}`}>
        <div className="stat-card-header">
          {icon && <span className="stat-icon">{icon}</span>}
          <h4 className="stat-title">{title}</h4>
        </div>
        <div className="stat-loading">
          <div className="stat-spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`stat-card stat-card--error`}>
        <div className="stat-card-header">
          {icon && <span className="stat-icon">{icon}</span>}
          <h4 className="stat-title">{title}</h4>
        </div>
        <div className="stat-error">⚠️ Error</div>
      </div>
    );
  }

  return (
    <div className={`stat-card ${colorClasses[color] || ''}`}>
      <div className="stat-card-header">
        {icon && <span className="stat-icon">{icon}</span>}
        <h4 className="stat-title">{title}</h4>
        <div className="stat-live-indicator"></div>
      </div>
      <div className="stat-body">
        <div className="stat-main">
          <span className="stat-value">{formatValue(value)}</span>
          {unit && <span className="stat-unit">{unit}</span>}
          {trend && (
            <span className={`stat-trend stat-trend--${trend}`}>
              {trend === 'up' ? '↑' : '↓'}
            </span>
          )}
        </div>
        <div className="stat-secondary">
          {renderSparkline()}
          {percentChange !== null && (
            <span className={`stat-change ${percentChange >= 0 ? 'stat-change--positive' : 'stat-change--negative'}`}>
              {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default StatCard;

