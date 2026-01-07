export const generateTrackingCode = ({ apiKey, metricConfigs, autoTrack, customEvents, baseUrl }) => {
  const metricsEndpoint = `${baseUrl}/api/v1/metrics`;
  
  // Build metric configs object
  const configsObject = metricConfigs.reduce((acc, config) => {
    acc[config.metric_name] = {
      type: config.metric_type,
      labels: config.labels || [],
      help: config.help_text || ''
    };
    return acc;
  }, {});

  const code = `
(function() {
  'use strict';
  
  // Configuration
  const CONFIG = {
    apiKey: '${apiKey}',
    endpoint: '${metricsEndpoint}',
    metrics: ${JSON.stringify(configsObject, null, 2)},
    autoTrack: ${autoTrack},
    customEvents: ${customEvents}
  };

  // Queue for offline support
  const queue = [];
  const MAX_QUEUE_SIZE = 100;

  // Batch metrics for sending
  let batch = [];
  const BATCH_SIZE = 10;
  const BATCH_TIMEOUT = 5000; // 5 seconds

  let batchTimer = null;

  // Send metrics to server
  function sendMetrics(metrics) {
    if (!metrics || metrics.length === 0) return;

    const payload = {
      metrics: metrics.map(m => ({
        name: m.name,
        type: m.type,
        value: m.value,
        labels: m.labels || {}
      }))
    };

    // Try to send immediately
    fetch(CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CONFIG.apiKey
      },
      body: JSON.stringify(payload)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to send metrics');
      }
      return response.json();
    })
    .catch(error => {
      console.warn('Metrics tracking error:', error);
      // Add to queue for retry
      if (queue.length < MAX_QUEUE_SIZE) {
        queue.push(...metrics);
      }
    });
  }

  // Process batch
  function processBatch() {
    if (batch.length === 0) return;
    
    const metricsToSend = [...batch];
    batch = [];
    
    sendMetrics(metricsToSend);
  }

  // Add metric to batch
  function addMetric(metric) {
    batch.push(metric);
    
    if (batch.length >= BATCH_SIZE) {
      processBatch();
    } else {
      // Reset timer
      if (batchTimer) {
        clearTimeout(batchTimer);
      }
      batchTimer = setTimeout(processBatch, BATCH_TIMEOUT);
    }
  }

  // Track metric
  function trackMetric(name, value, labels = {}) {
    const config = CONFIG.metrics[name];
    if (!config) {
      console.warn('Unknown metric:', name);
      return;
    }

    const metric = {
      name: name,
      type: config.type,
      value: typeof value === 'number' ? value : parseFloat(value) || 0,
      labels: { ...config.labels, ...labels }
    };

    addMetric(metric);
  }

  // Auto-tracking
  if (CONFIG.autoTrack) {
    // Page view
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('load', function() {
        trackMetric('page_views', 1, {
          page: window.location.pathname,
          referrer: document.referrer || ''
        });
      });

      // Time on page
      let startTime = Date.now();
      window.addEventListener('beforeunload', function() {
        const timeOnPage = Math.round((Date.now() - startTime) / 1000);
        trackMetric('time_on_page', timeOnPage, {
          page: window.location.pathname
        });
        // Send remaining batch
        processBatch();
      });
    }
  }

  // Custom events tracking
  if (CONFIG.customEvents) {
    // Expose global tracking function
    if (typeof window !== 'undefined') {
      window.trackMetric = function(name, value, labels) {
        trackMetric(name, value, labels);
      };

      // Track clicks on elements with data-track attribute
      if (document.addEventListener) {
        document.addEventListener('click', function(e) {
          const element = e.target.closest('[data-track]');
          if (element) {
            const metricName = element.getAttribute('data-track');
            const metricValue = parseFloat(element.getAttribute('data-value')) || 1;
            const metricLabels = {};
            
            // Extract label attributes
            Array.from(element.attributes).forEach(attr => {
              if (attr.name.startsWith('data-label-')) {
                const labelName = attr.name.replace('data-label-', '');
                metricLabels[labelName] = attr.value;
              }
            });

            trackMetric(metricName, metricValue, metricLabels);
          }
        });
      }
    }
  }

  // Retry queue on online
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('online', function() {
      if (queue.length > 0) {
        const metricsToRetry = queue.splice(0, BATCH_SIZE);
        sendMetrics(metricsToRetry);
      }
    });
  }

  // Expose API
  if (typeof window !== 'undefined') {
    window.MetricsTracker = {
      track: trackMetric,
      flush: processBatch
    };
  }
})();
`.trim();

  return code;
};

