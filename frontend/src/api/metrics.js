import client from './client';

// Query Prometheus via backend proxy
export const metricsAPI = {
  // Instant query
  async query(promQuery) {
    const response = await client.get('/api/v1/prometheus/query', {
      params: { query: promQuery }
    });
    return response.data;
  },

  // Range query for time series data
  async queryRange(promQuery, start, end, step = '15s') {
    const response = await client.get('/api/v1/prometheus/query_range', {
      params: { query: promQuery, start, end, step }
    });
    return response.data;
  },

  // Get Prometheus targets
  async getTargets() {
    const response = await client.get('/api/v1/prometheus/targets');
    return response.data;
  },

  // Get alert rules
  async getRules() {
    const response = await client.get('/api/v1/prometheus/rules');
    return response.data;
  },

  // Get active alerts from Prometheus
  async getAlerts() {
    const response = await client.get('/api/v1/prometheus/alerts');
    return response.data;
  },

  // Get alerts from Alertmanager
  async getAlertmanagerAlerts() {
    const response = await client.get('/api/v1/prometheus/alertmanager/alerts');
    return response.data;
  },

  // Get Alertmanager status
  async getAlertmanagerStatus() {
    const response = await client.get('/api/v1/prometheus/alertmanager/status');
    return response.data;
  }
};

// Helper functions for metric calculations
export const metricsHelpers = {
  // Parse Prometheus instant query result to get scalar value
  parseScalarResult(result) {
    if (result?.status === 'success' && result?.data?.result?.[0]) {
      const value = parseFloat(result.data.result[0].value[1]);
      return isNaN(value) ? null : value;
    }
    return null;
  },

  // Parse Prometheus range query result to time series data
  parseRangeResult(result, legendFormat = 'value') {
    if (result?.status !== 'success' || !result?.data?.result) {
      return [];
    }

    return result.data.result.flatMap(series => {
      const labels = series.metric || {};
      let legend = legendFormat;
      
      // Replace label placeholders in legend format
      Object.entries(labels).forEach(([key, val]) => {
        legend = legend.replace(`{{${key}}}`, val);
      });

      return series.values.map(([timestamp, value]) => ({
        timestamp: timestamp * 1000, // Convert to milliseconds
        time: new Date(timestamp * 1000).toLocaleTimeString(),
        [legend]: parseFloat(value),
        ...labels
      }));
    });
  },

  // Merge multiple series into single timeline
  mergeTimeSeries(seriesArray) {
    const timeMap = new Map();

    seriesArray.forEach(series => {
      series.forEach(point => {
        const existing = timeMap.get(point.timestamp) || { timestamp: point.timestamp, time: point.time };
        Object.assign(existing, point);
        timeMap.set(point.timestamp, existing);
      });
    });

    return Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  },

  // Get time range parameters
  getTimeRange(duration = '1h') {
    const now = Math.floor(Date.now() / 1000);
    const durationMap = {
      '5m': 5 * 60,
      '15m': 15 * 60,
      '30m': 30 * 60,
      '1h': 60 * 60,
      '3h': 3 * 60 * 60,
      '6h': 6 * 60 * 60,
      '12h': 12 * 60 * 60,
      '24h': 24 * 60 * 60,
      '7d': 7 * 24 * 60 * 60
    };

    const seconds = durationMap[duration] || 60 * 60;
    const step = seconds <= 3600 ? '15s' : seconds <= 86400 ? '1m' : '5m';

    return {
      start: now - seconds,
      end: now,
      step
    };
  }
};

export default metricsAPI;

