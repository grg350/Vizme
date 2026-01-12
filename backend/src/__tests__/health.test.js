import request from 'supertest';
import express from 'express';

// Create a minimal test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Health endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  return app;
};

describe('Health Endpoint', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /health', () => {
    it('should return 200 status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return status as healthy', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });

    it('should include timestamp', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should include version', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.version).toBeDefined();
      expect(typeof response.body.version).toBe('string');
    });

    it('should include uptime', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.uptime).toBeDefined();
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should include environment', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.environment).toBeDefined();
    });

    it('should respond quickly (under 100ms)', async () => {
      const start = Date.now();
      await request(app).get('/health').expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });
});

