// Test setup file
import dotenv from 'dotenv';

// Load test environment
dotenv.config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only';
process.env.DB_PASSWORD = 'postgres';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'metrics_db';
process.env.DB_USER = 'postgres';
process.env.PUSHGATEWAY_URL = 'http://localhost:9091';
