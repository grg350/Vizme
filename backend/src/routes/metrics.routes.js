import express from 'express';
import axios from 'axios';
import { body, validationResult } from 'express-validator';
import { authenticateApiKey, authenticate } from '../middleware/auth.middleware.js';
import { metricsLimiter } from '../middleware/rateLimiter.js';
import { BadRequestError } from '../middleware/errorHandler.js';
import { query } from '../database/connection.js';
import { getMetrics } from '../services/dbMonitoring.service.js';

const router = express.Router();

const PUSHGATEWAY_URL = process.env.PUSHGATEWAY_URL || 'http://localhost:9091';
const METRIC_TYPES = ['counter', 'gauge', 'histogram', 'summary'];

// Validate metric value
const validateMetricValue = (value, type) => {
  const numValue = typeof value === 'number' ? value : parseFloat(value);
  
  if (isNaN(numValue)) {
    return false;
  }

  // Prometheus values must be non-negative for counters
  if (type === 'counter' && numValue < 0) {
    return false;
  }

  return true;
};

// Push metric to Prometheus Pushgateway
const pushToPrometheus = async (metric, userId) => {
  const metricName = metric.name.replace(/[^a-zA-Z0-9_]/g, '_');
  const metricType = metric.type || 'gauge';
  
  // Build Prometheus metric format
  let prometheusMetric = `# TYPE ${metricName} ${metricType}\n`;
  
  // Build labels string
  const labels = Object.entries(metric.labels || {})
    .map(([key, value]) => `${key}="${String(value).replace(/"/g, '\\"')}"`)
    .join(',');
  
  const labelsStr = labels ? `{${labels}}` : '';
  prometheusMetric += `${metricName}${labelsStr} ${metric.value}\n`;

  try {
    const response = await axios.post(
      `${PUSHGATEWAY_URL}/metrics/job/metrics_platform/instance/${userId}`,
      prometheusMetric,
      {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 5000,
      }
    );

    return response.status === 200;
  } catch (error) {
    console.error('Failed to push metric to Prometheus:', error.message);
    throw new Error('Failed to push metric to Prometheus');
  }
};

// Prometheus metrics endpoint (exposes database metrics)
router.get('/prometheus', async (req, res) => {
  try {
    const metrics = await getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

// Metrics ingestion endpoint (requires API key)
router.post('/',
  authenticateApiKey,
  metricsLimiter,
  [
    body('metrics').isArray({ min: 1, max: 100 }).withMessage('Metrics must be an array with 1-100 items'),
    body('metrics.*.name').trim().isLength({ min: 1 }).withMessage('Metric name is required'),
    body('metrics.*.type').isIn(METRIC_TYPES).withMessage(`Metric type must be one of: ${METRIC_TYPES.join(', ')}`),
    body('metrics.*.value').custom((value) => {
      const numValue = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(numValue)) {
        throw new Error('Metric value must be a number');
      }
      return true;
    }),
    body('metrics.*.labels').optional().isObject()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { metrics } = req.body;
      const userId = req.user.id;

      // Validate and process each metric
      const validMetrics = [];
      const errors_list = [];

      for (let i = 0; i < metrics.length; i++) {
        const metric = metrics[i];
        
        // Validate metric value
        if (!validateMetricValue(metric.value, metric.type)) {
          errors_list.push({
            index: i,
            error: `Invalid value for ${metric.type} metric`
          });
          continue;
        }

        // Verify metric config exists (optional - can allow custom metrics)
        // For MVP, we'll allow any metric but log it
        validMetrics.push({
          name: metric.name,
          type: metric.type,
          value: typeof metric.value === 'number' ? metric.value : parseFloat(metric.value),
          labels: {
            ...metric.labels,
            user_id: userId.toString()
          }
        });
      }

      if (validMetrics.length === 0) {
        throw new BadRequestError('No valid metrics to process', errors_list);
      }

      // Push to Prometheus Pushgateway
      const pushPromises = validMetrics.map(metric => pushToPrometheus(metric, userId));
      await Promise.allSettled(pushPromises);

      res.json({
        success: true,
        processed: validMetrics.length,
        errors: errors_list.length > 0 ? errors_list : undefined
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get metrics summary (requires authentication)
router.get('/summary',
  authenticate,
  async (req, res, next) => {
    try {
      // This would typically query Prometheus API or a metrics database
      // For now, return a placeholder
      res.json({
        success: true,
        message: 'Metrics summary endpoint - to be implemented with Prometheus query API'
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as metricsRoutes };
