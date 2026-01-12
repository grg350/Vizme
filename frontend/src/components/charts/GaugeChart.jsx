import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function GaugeChart({
  value,
  max = 100,
  title,
  unit = '%',
  thresholds = [
    { value: 60, color: '#10b981' },  // green
    { value: 80, color: '#f59e0b' },  // amber
    { value: 100, color: '#ef4444' }, // red
  ],
  size = 150,
  loading = false,
  error = null
}) {
  // Get color based on value
  const getColor = (val) => {
    for (const threshold of thresholds) {
      if (val <= threshold.value) {
        return threshold.color;
      }
    }
    return thresholds[thresholds.length - 1]?.color || '#ef4444';
  };

  const displayValue = value ?? 0;
  const percentage = Math.min(Math.max((displayValue / max) * 100, 0), 100);
  const color = getColor(displayValue);

  // Format the value for display
  const formatValue = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    if (unit === 's') {
      return val < 0.001 ? `${(val * 1000000).toFixed(0)}µs` :
             val < 1 ? `${(val * 1000).toFixed(0)}ms` :
             `${val.toFixed(2)}s`;
    }
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toFixed(1);
  };

  if (loading) {
    return (
      <div className="gauge-container">
        {title && <h4 className="gauge-title">{title}</h4>}
        <div className="gauge-loading">
          <div className="chart-spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gauge-container">
        {title && <h4 className="gauge-title">{title}</h4>}
        <div className="gauge-error">⚠️</div>
      </div>
    );
  }

  // Data for the gauge (semi-circle)
  const data = [
    { value: percentage, color },
    { value: 100 - percentage, color: 'rgba(255,255,255,0.1)' }
  ];

  return (
    <div className="gauge-container">
      {title && <h4 className="gauge-title">{title}</h4>}
      <div className="gauge-wrapper" style={{ width: size, height: size / 2 + 30 }}>
        <ResponsiveContainer width="100%" height={size / 2 + 20}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={size / 2 - 15}
              outerRadius={size / 2}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="gauge-value-container">
          <span className="gauge-value" style={{ color }}>
            {formatValue(displayValue)}
          </span>
          <span className="gauge-unit">{unit}</span>
        </div>
      </div>
    </div>
  );
}

export default GaugeChart;

