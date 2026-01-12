import express from 'express';
import axios from 'axios';
import { body, validationResult } from 'express-validator';
import { authenticateApiKey, authenticate } from '../middleware/auth.middleware.js';
import { metricsLimiter } from '../middleware/rateLimiter.js';
import { BadRequestError } from '../middleware/errorHandler.js';

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

// Format a single metric in Prometheus text format
const formatMetric = (metric) => {
  const { name, type, value, labels, help } = metric;

  // Build label string
  const labelString = Object.entries(labels || {})
    .map(([k, v]) => `${k}="${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`)
    .join(',');
  
  // Build the metric line
  const metricLine = labelString 
    ? `${name}{${labelString}} ${value}`
    : `${name} ${value}`;

  // Include TYPE and HELP for better Prometheus compatibility
  const lines = [];
  if (help) {
    lines.push(`# HELP ${name} ${help}`);
  }
  lines.push(`# TYPE ${name} ${type}`);
  lines.push(metricLine);
  
  return lines.join('\n');
};

// Batch push all metrics to Prometheus Pushgateway in a single request
const pushBatchToPrometheus = async (metrics, userId) => {
  if (!metrics || metrics.length === 0) {
    return;
  }

  // Format all metrics into a single text payload
  const metricLines = metrics.map(formatMetric);
  const payload = metricLines.join('\n\n') + '\n';

  // Push to Pushgateway
  const jobName = `user_${userId}`;
  const pushUrl = `${PUSHGATEWAY_URL}/metrics/job/${jobName}`;

  try {
    await axios.post(pushUrl, payload, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      },
      timeout: 10000
    });
  } catch (error) {
    console.error('Failed to push batch to Pushgateway:', error.message);
    throw new Error('Failed to push metrics to Prometheus');
  }
};

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

      // Batch push all metrics to Prometheus Pushgateway in a single request
      await pushBatchToPrometheus(validMetrics, userId);

      res.json({
        success: true,
        data: {
          processed: validMetrics.length,
          total: metrics.length,
          errors: errors_list.length > 0 ? errors_list : undefined
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get metrics (for authenticated users to view their metrics)
router.get('/',
  authenticate,
  async (req, res, next) => {
    try {
      // This would typically query Prometheus API or a metrics database
      // For MVP, we'll return a message directing to Grafana
      res.json({
        success: true,
        message: 'View your metrics in Grafana',
        grafanaUrl: process.env.GRAFANA_URL || 'http://localhost:3001'
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as metricsRoutes };

