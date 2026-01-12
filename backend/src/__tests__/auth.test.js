import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { jest } from '@jest/globals';

// Mock database
const mockUsers = new Map();
const mockTokens = new Map();
let userIdCounter = 1;

const mockQuery = jest.fn().mockImplementation(async (text, params) => {
  // Handle different query types - order matters for specificity
  
  // Get user by ID (for token verification) - check WHERE id = pattern
  if (text.includes('SELECT') && text.includes('users') && text.includes('WHERE') && text.includes('id = $1')) {
    const id = params[0];
    const user = mockUsers.get(id);
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }
  
  // Get user by email (for login/signup) - check WHERE email = pattern
  if (text.includes('SELECT') && text.includes('users') && text.includes('email = $1')) {
    const email = params[0];
    const user = Array.from(mockUsers.values()).find(u => u.email === email);
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }
  
  if (text.includes('INSERT INTO users')) {
    const [email, passwordHash, name] = params;
    const user = { id: userIdCounter++, email, password_hash: passwordHash, name };
    mockUsers.set(user.id, user);
    return { rows: [user], rowCount: 1 };
  }
  
  if (text.includes('INSERT INTO refresh_tokens')) {
    const [userId, token, expiresAt] = params;
    mockTokens.set(token, { user_id: userId, token, expires_at: expiresAt });
    return { rows: [{ token }], rowCount: 1 };
  }

  if (text.includes('SELECT') && text.includes('refresh_tokens')) {
    const token = params[0];
    const tokenData = mockTokens.get(token);
    return { rows: tokenData ? [tokenData] : [], rowCount: tokenData ? 1 : 0 };
  }

  return { rows: [], rowCount: 0 };
});

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

  // Signup endpoint
  app.post('/api/v1/auth/signup', async (req, res) => {
    try {
      const { email, password, name } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ 
          success: false, 
          error: 'Email and password are required' 
        });
      }

      if (password.length < 6) {
        return res.status(400).json({ 
          success: false, 
          error: 'Password must be at least 6 characters' 
        });
      }

      // Check if user exists
      const existingUser = await mockQuery('SELECT * FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ 
          success: false, 
          error: 'Email already registered' 
        });
      }

      // Create user
      const passwordHash = await bcrypt.hash(password, 10);
      const result = await mockQuery(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING *',
        [email, passwordHash, name]
      );

      const user = result.rows[0];
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

      res.status(201).json({
        success: true,
        data: {
          user: { id: user.id, email: user.email, name: user.name },
          token
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Login endpoint
  app.post('/api/v1/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ 
          success: false, 
          error: 'Email and password are required' 
        });
      }

      const result = await mockQuery('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];

      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid credentials' 
        });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid credentials' 
        });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
      const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });

      await mockQuery(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
      );

      res.json({
        success: true,
        data: {
          user: { id: user.id, email: user.email, name: user.name },
          token,
          refreshToken
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Protected route
  app.get('/api/v1/auth/me', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          success: false, 
          error: 'No token provided' 
        });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);

      const result = await mockQuery('SELECT id, email, name FROM users WHERE id = $1', [decoded.userId]);
      const user = result.rows[0];

      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: 'User not found' 
        });
      }

      res.json({ success: true, data: { user } });
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid or expired token' 
        });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return app;
};

describe('Auth API', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    mockUsers.clear();
    mockTokens.clear();
    userIdCounter = 1;
    mockQuery.mockClear();
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should create a new user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.token).toBeDefined();
    });

    it('should fail with missing email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          password: 'password123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with missing password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'test@example.com'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with short password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'test@example.com',
          password: '123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with duplicate email', async () => {
      // Create first user
      await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'password123'
        })
        .expect(201);

      // Try to create second user with same email
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'password456'
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already registered');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'login@example.com',
          password: 'password123',
          name: 'Login User'
        });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me (Protected Route)', () => {
    let authToken;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'protected@example.com',
          password: 'password123'
        });
      
      authToken = response.body.data.token;
    });

    it('should fail without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should succeed with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('protected@example.com');
    });
  });
});

