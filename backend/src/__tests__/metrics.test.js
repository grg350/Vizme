import request from 'supertest';
import express from 'express';

// Mock API key data
const mockApiKeys = new Map();
mockApiKeys.set('valid-api-key', {
  id: 1,
  user_id: 1,
  api_key: 'valid-api-key',
  is_active: true
});

mockApiKeys.set('inactive-api-key', {
  id: 2,
  user_id: 1,
  api_key: 'inactive-api-key',
  is_active: false
});

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // API key auth middleware
  const authenticateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ success: false, error: 'API key required' });
    }

    const keyData = mockApiKeys.get(apiKey);
    
    if (!keyData) {
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }

    if (!keyData.is_active) {
      return res.status(401).json({ success: false, error: 'API key is inactive' });
    }

    req.apiKey = keyData;
    req.user = { id: keyData.user_id };
    next();
  };

  // Metrics ingestion endpoint
  app.post('/api/v1/metrics', authenticateApiKey, async (req, res) => {
    const { metrics } = req.body;

    // Validate metrics array
    if (!metrics || !Array.isArray(metrics)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Metrics must be an array' 
      });
    }

    if (metrics.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'At least one metric is required' 
      });
    }

    if (metrics.length > 100) {
      return res.status(400).json({ 
        success: false, 
        error: 'Maximum 100 metrics per request' 
      });
    }

    // Validate each metric
    const validTypes = ['counter', 'gauge', 'histogram', 'summary'];
    const errors = [];
    const validMetrics = [];

    metrics.forEach((metric, index) => {
      if (!metric.name) {
        errors.push({ index, error: 'Metric name is required' });
        return;
      }

      if (!metric.type || !validTypes.includes(metric.type)) {
        errors.push({ index, error: `Invalid metric type. Must be one of: ${validTypes.join(', ')}` });
        return;
      }

      if (metric.value === undefined || isNaN(parseFloat(metric.value))) {
        errors.push({ index, error: 'Metric value must be a number' });
        return;
      }

      if (metric.type === 'counter' && parseFloat(metric.value) < 0) {
        errors.push({ index, error: 'Counter values must be non-negative' });
        return;
      }

      validMetrics.push({
        ...metric,
        value: parseFloat(metric.value)
      });
    });

    if (validMetrics.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No valid metrics to process',
        details: errors
      });
    }

    // In real implementation, this would push to Pushgateway
    res.json({
      success: true,
      data: {
        processed: validMetrics.length,
        total: metrics.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  });

  return app;
};

describe('Metrics API', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('POST /api/v1/metrics', () => {
    it('should ingest metrics with valid API key', async () => {
      const response = await request(app)
        .post('/api/v1/metrics')
        .set('X-API-Key', 'valid-api-key')
        .send({
          metrics: [
            { name: 'page_views', type: 'counter', value: 1 },
            { name: 'response_time', type: 'gauge', value: 0.5 }
          ]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.processed).toBe(2);
    });

    it('should fail without API key', async () => {
      const response = await request(app)
        .post('/api/v1/metrics')
        .send({
          metrics: [
            { name: 'page_views', type: 'counter', value: 1 }
          ]
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('API key required');
    });

    it('should fail with invalid API key', async () => {
      const response = await request(app)
        .post('/api/v1/metrics')
        .set('X-API-Key', 'invalid-api-key')
        .send({
          metrics: [
            { name: 'page_views', type: 'counter', value: 1 }
          ]
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid API key');
    });

    it('should fail with inactive API key', async () => {
      const response = await request(app)
        .post('/api/v1/metrics')
        .set('X-API-Key', 'inactive-api-key')
        .send({
          metrics: [
            { name: 'page_views', type: 'counter', value: 1 }
          ]
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle batch metrics', async () => {
      const metrics = Array.from({ length: 50 }, (_, i) => ({
        name: `metric_${i}`,
        type: 'gauge',
        value: Math.random() * 100
      }));

      const response = await request(app)
        .post('/api/v1/metrics')
        .set('X-API-Key', 'valid-api-key')
        .send({ metrics })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.processed).toBe(50);
    });

    it('should reject empty metrics array', async () => {
      const response = await request(app)
        .post('/api/v1/metrics')
        .set('X-API-Key', 'valid-api-key')
        .send({ metrics: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid metric type', async () => {
      const response = await request(app)
        .post('/api/v1/metrics')
        .set('X-API-Key', 'valid-api-key')
        .send({
          metrics: [
            { name: 'test', type: 'invalid_type', value: 1 }
          ]
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject negative counter values', async () => {
      const response = await request(app)
        .post('/api/v1/metrics')
        .set('X-API-Key', 'valid-api-key')
        .send({
          metrics: [
            { name: 'test', type: 'counter', value: -5 }
          ]
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should accept metrics with labels', async () => {
      const response = await request(app)
        .post('/api/v1/metrics')
        .set('X-API-Key', 'valid-api-key')
        .send({
          metrics: [
            { 
              name: 'http_requests', 
              type: 'counter', 
              value: 1,
              labels: { method: 'GET', path: '/api' }
            }
          ]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle partial failures gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/metrics')
        .set('X-API-Key', 'valid-api-key')
        .send({
          metrics: [
            { name: 'valid_metric', type: 'gauge', value: 1 },
            { name: 'invalid_metric', type: 'gauge', value: 'not-a-number' },
            { name: 'another_valid', type: 'counter', value: 5 }
          ]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.processed).toBe(2);
      expect(response.body.data.errors).toHaveLength(1);
    });
  });
});

