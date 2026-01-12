import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Mock data
const mockApiKeys = new Map();
let apiKeyIdCounter = 1;

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const testUser = { id: 1, email: 'test@example.com', name: 'Test User' };
const testToken = jwt.sign({ userId: testUser.id }, JWT_SECRET, { expiresIn: '24h' });

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Auth middleware
  const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = { id: decoded.userId, email: testUser.email };
      next();
    } catch {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
  };

  // Create API key
  app.post('/api/v1/api-keys', authenticate, async (req, res) => {
    const { key_name } = req.body;

    if (!key_name) {
      return res.status(400).json({ success: false, error: 'Key name is required' });
    }

    const apiKey = {
      id: apiKeyIdCounter++,
      user_id: req.user.id,
      key_name,
      api_key: `uvp_${crypto.randomBytes(24).toString('hex')}`,
      is_active: true,
      created_at: new Date().toISOString()
    };

    mockApiKeys.set(apiKey.id, apiKey);

    res.status(201).json({
      success: true,
      data: apiKey
    });
  });

  // List API keys
  app.get('/api/v1/api-keys', authenticate, async (req, res) => {
    const userKeys = Array.from(mockApiKeys.values())
      .filter(key => key.user_id === req.user.id);

    res.json({
      success: true,
      data: userKeys
    });
  });

  // Deactivate API key
  app.put('/api/v1/api-keys/:id/deactivate', authenticate, async (req, res) => {
    const keyId = parseInt(req.params.id);
    const apiKey = mockApiKeys.get(keyId);

    if (!apiKey) {
      return res.status(404).json({ success: false, error: 'API key not found' });
    }

    if (apiKey.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    apiKey.is_active = false;
    mockApiKeys.set(keyId, apiKey);

    res.json({
      success: true,
      data: apiKey
    });
  });

  // Delete API key
  app.delete('/api/v1/api-keys/:id', authenticate, async (req, res) => {
    const keyId = parseInt(req.params.id);
    const apiKey = mockApiKeys.get(keyId);

    if (!apiKey) {
      return res.status(404).json({ success: false, error: 'API key not found' });
    }

    if (apiKey.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    mockApiKeys.delete(keyId);

    res.json({
      success: true,
      message: 'API key deleted'
    });
  });

  return app;
};

describe('API Keys API', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    mockApiKeys.clear();
    apiKeyIdCounter = 1;
  });

  describe('POST /api/v1/api-keys', () => {
    it('should create API key when authenticated', async () => {
      const response = await request(app)
        .post('/api/v1/api-keys')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ key_name: 'Test Key' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.key_name).toBe('Test Key');
      expect(response.body.data.api_key).toMatch(/^uvp_/);
      expect(response.body.data.is_active).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/api-keys')
        .send({ key_name: 'Test Key' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail without key name', async () => {
      const response = await request(app)
        .post('/api/v1/api-keys')
        .set('Authorization', `Bearer ${testToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/api-keys', () => {
    beforeEach(async () => {
      // Create some test keys
      await request(app)
        .post('/api/v1/api-keys')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ key_name: 'Key 1' });
      
      await request(app)
        .post('/api/v1/api-keys')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ key_name: 'Key 2' });
    });

    it('should list API keys when authenticated', async () => {
      const response = await request(app)
        .get('/api/v1/api-keys')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/api-keys')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/api-keys/:id/deactivate', () => {
    let keyId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/api-keys')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ key_name: 'Deactivate Test' });
      
      keyId = response.body.data.id;
    });

    it('should deactivate API key', async () => {
      const response = await request(app)
        .put(`/api/v1/api-keys/${keyId}/deactivate`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.is_active).toBe(false);
    });

    it('should fail for non-existent key', async () => {
      const response = await request(app)
        .put('/api/v1/api-keys/9999/deactivate')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/api-keys/:id', () => {
    let keyId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/api-keys')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ key_name: 'Delete Test' });
      
      keyId = response.body.data.id;
    });

    it('should delete API key', async () => {
      await request(app)
        .delete(`/api/v1/api-keys/${keyId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      // Verify it's deleted
      const response = await request(app)
        .get('/api/v1/api-keys')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('should fail for non-existent key', async () => {
      const response = await request(app)
        .delete('/api/v1/api-keys/9999')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});

