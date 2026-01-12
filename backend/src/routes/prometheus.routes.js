import express from 'express';
import axios from 'axios';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
const ALERTMANAGER_URL = process.env.ALERTMANAGER_URL || 'http://alertmanager:9093';

// Proxy instant query to Prometheus
router.get('/query', authenticate, async (req, res, next) => {
  try {
    const { query, time } = req.query;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: 'Query parameter is required' 
      });
    }

    const params = { query };
    if (time) params.time = time;

    const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
      params,
      timeout: 30000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Prometheus query error:', error.message);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    next(error);
  }
});

// Proxy range query to Prometheus
router.get('/query_range', authenticate, async (req, res, next) => {
  try {
    const { query, start, end, step } = req.query;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: 'Query parameter is required' 
      });
    }

    const params = { query };
    if (start) params.start = start;
    if (end) params.end = end;
    if (step) params.step = step;

    const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query_range`, {
      params,
      timeout: 30000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Prometheus query_range error:', error.message);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    next(error);
  }
});

// Get Prometheus targets
router.get('/targets', authenticate, async (req, res, next) => {
  try {
    const response = await axios.get(`${PROMETHEUS_URL}/api/v1/targets`, {
      timeout: 10000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Prometheus targets error:', error.message);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    next(error);
  }
});

// Get alert rules from Prometheus
router.get('/rules', authenticate, async (req, res, next) => {
  try {
    const response = await axios.get(`${PROMETHEUS_URL}/api/v1/rules`, {
      timeout: 10000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Prometheus rules error:', error.message);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    next(error);
  }
});

// Get active alerts from Prometheus
router.get('/alerts', authenticate, async (req, res, next) => {
  try {
    const response = await axios.get(`${PROMETHEUS_URL}/api/v1/alerts`, {
      timeout: 10000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Prometheus alerts error:', error.message);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    next(error);
  }
});

// Get alerts from Alertmanager
router.get('/alertmanager/alerts', authenticate, async (req, res, next) => {
  try {
    const response = await axios.get(`${ALERTMANAGER_URL}/api/v2/alerts`, {
      timeout: 10000
    });

    res.json({
      status: 'success',
      data: response.data
    });
  } catch (error) {
    console.error('Alertmanager alerts error:', error.message);
    // Return empty array if Alertmanager is not available
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.json({
        status: 'success',
        data: []
      });
    }
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    next(error);
  }
});

// Get Alertmanager status
router.get('/alertmanager/status', authenticate, async (req, res, next) => {
  try {
    const response = await axios.get(`${ALERTMANAGER_URL}/api/v2/status`, {
      timeout: 10000
    });

    res.json({
      status: 'success',
      data: response.data
    });
  } catch (error) {
    console.error('Alertmanager status error:', error.message);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    // Return offline status if not available
    res.json({
      status: 'success',
      data: { cluster: { status: 'offline' } }
    });
  }
});

export { router as prometheusRoutes };

