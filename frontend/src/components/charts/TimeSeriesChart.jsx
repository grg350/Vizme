import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ReferenceLine
} from 'recharts';

const COLORS = [
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#3b82f6', // blue
  '#ec4899', // pink
  '#84cc16', // lime
];

function TimeSeriesChart({ 
  data, 
  lines = [], 
  type = 'line', // 'line' or 'area'
  height = 300,
  title,
  unit = '',
  thresholds = [],
  showGrid = true,
  showLegend = true,
  loading = false,
  error = null
}) {
  if (loading) {
    return (
      <div className="chart-container" style={{ height }}>
        {title && <h3 className="chart-title">{title}</h3>}
        <div className="chart-loading">
          <div className="chart-spinner"></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chart-container" style={{ height }}>
        {title && <h3 className="chart-title">{title}</h3>}
        <div className="chart-error">
          <span>⚠️ {error}</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="chart-container" style={{ height }}>
        {title && <h3 className="chart-title">{title}</h3>}
        <div className="chart-empty">
          <span>No data available</span>
        </div>
      </div>
    );
  }

  const ChartComponent = type === 'area' ? AreaChart : LineChart;
  const DataComponent = type === 'area' ? Area : Line;

  const formatValue = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return '-';
    if (unit === 's') {
      return value < 0.001 ? `${(value * 1000000).toFixed(0)}µs` :
             value < 1 ? `${(value * 1000).toFixed(1)}ms` :
             `${value.toFixed(2)}s`;
    }
    if (unit === '%') return `${value.toFixed(1)}%`;
    if (unit === 'reqps') return `${value.toFixed(2)}/s`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(2);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-time">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {formatValue(entry.value)}{unit && ` ${unit}`}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="chart-container">
      {title && <h3 className="chart-title">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(255,255,255,0.1)" 
              vertical={false}
            />
          )}
          <XAxis 
            dataKey="time" 
            stroke="#64748b"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          <YAxis 
            stroke="#64748b"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={formatValue}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend 
              wrapperStyle={{ paddingTop: 10 }}
              iconType="line"
            />
          )}
          
          {thresholds.map((threshold, index) => (
            <ReferenceLine 
              key={index}
              y={threshold.value} 
              stroke={threshold.color || '#ef4444'} 
              strokeDasharray="5 5"
              label={{ value: threshold.label, fill: threshold.color || '#ef4444', fontSize: 10 }}
            />
          ))}

          {lines.map((line, index) => (
            <DataComponent
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name || line.dataKey}
              stroke={line.color || COLORS[index % COLORS.length]}
              fill={type === 'area' ? line.color || COLORS[index % COLORS.length] : undefined}
              fillOpacity={type === 'area' ? 0.3 : undefined}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}

export default TimeSeriesChart;

