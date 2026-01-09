import pg from "pg";
import dotenv from "dotenv";
import {
  updatePoolMetrics,
  recordQueryMetrics,
  recordConnectionAcquisition,
  updateHealthMetrics,
} from "../services/dbMonitoring.service.js";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "metrics_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  max: parseInt(process.env.DB_POOL_MAX || "20", 10),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || "30000", 10),
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || "2000", 10),
  allowExitOnIdle: false,
});

// Test connection
pool.on("connect", (client) => {
  console.log("✅ Connected to PostgreSQL database");
  // Update pool metrics on new connection
  updatePoolMetrics(pool);
});

pool.on("error", (err) => {
  console.error("❌ Unexpected error on idle client", err);
  recordQueryMetrics("", 0, "error", err);
  // Don't exit on error, let the application handle it
  // process.exit(-1);
});

// Monitor pool events
pool.on("acquire", (client) => {
  updatePoolMetrics(pool);
});

pool.on("remove", (client) => {
  updatePoolMetrics(pool);
});

// Periodic pool metrics update (every 5 seconds)
setInterval(() => {
  updatePoolMetrics(pool);
}, 5000);

export const query = async (text, params) => {
  const queryStart = Date.now();
  
  try {
    // pool.query() handles connection acquisition and release automatically
    // We track the total time which includes acquisition + execution
    const res = await pool.query(text, params);
    const totalDuration = Date.now() - queryStart;
    
    // Estimate connection acquisition time (typically < 10ms)
    // For more accurate tracking, we'd need to use pool.connect() directly
    const estimatedAcquisitionTime = Math.min(totalDuration * 0.1, 10); // Estimate 10% or max 10ms
    recordConnectionAcquisition(estimatedAcquisitionTime);
    
    // Record successful query metrics
    recordQueryMetrics(text, totalDuration, "success");
    
    // Log query (only in development or for slow queries)
    if (process.env.NODE_ENV !== "production" || totalDuration > 1000) {
      console.log("Executed query", {
        text: text.substring(0, 100), // Truncate long queries
        duration: totalDuration,
        rows: res.rowCount,
      });
    }
    
    // Update pool metrics after query
    updatePoolMetrics(pool);
    
    return res;
  } catch (error) {
    const totalDuration = Date.now() - queryStart;
    
    // Record failed query metrics
    recordQueryMetrics(text, totalDuration, "error", error);
    
    // Log error
    console.error("Query error", {
      text: text.substring(0, 100),
      error: error.message,
      code: error.code,
      duration: totalDuration,
    });
    
    // Update pool metrics even on error
    updatePoolMetrics(pool);
    
    throw error;
  }
};

export const initDatabase = async () => {
  try {
    // Test connection with health check
    const healthStart = Date.now();
    await query("SELECT NOW()");
    const healthDuration = Date.now() - healthStart;
    
    updateHealthMetrics(true, healthDuration);
    updatePoolMetrics(pool);

    // Run migrations
    await runMigrations();

    // Start periodic health checks (every 30 seconds)
    startHealthChecks();

    console.log("✅ Database initialized successfully");
    return true;
  } catch (error) {
    updateHealthMetrics(false, 0);
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
};

/**
 * Periodic health check function
 */
const startHealthChecks = () => {
  const healthCheckInterval = setInterval(async () => {
    try {
      const start = Date.now();
      await pool.query("SELECT 1");
      const duration = Date.now() - start;
      updateHealthMetrics(true, duration);
      updatePoolMetrics(pool);
    } catch (error) {
      updateHealthMetrics(false, 0);
      console.error("Health check failed:", error.message);
    }
  }, 30000); // Every 30 seconds

  // Clean up on process exit
  process.on("SIGTERM", () => {
    clearInterval(healthCheckInterval);
  });
  
  process.on("SIGINT", () => {
    clearInterval(healthCheckInterval);
  });
};

const runMigrations = async () => {
  const migrations = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Refresh tokens table
    `CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(500) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // API keys table
    `CREATE TABLE IF NOT EXISTS api_keys (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key_name VARCHAR(255) NOT NULL,
      api_key VARCHAR(255) UNIQUE NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Metric configs table
    `CREATE TABLE IF NOT EXISTS metric_configs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('counter', 'gauge', 'histogram', 'summary')),
      metric_name VARCHAR(255) NOT NULL,
      labels JSONB DEFAULT '[]'::jsonb,
      help_text TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, metric_name)
    )`,

    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
    `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)`,
    `CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_api_keys_api_key ON api_keys(api_key)`,
    `CREATE INDEX IF NOT EXISTS idx_metric_configs_user_id ON metric_configs(user_id)`,
  ];

  for (const migration of migrations) {
    await query(migration);
  }

  console.log("✅ Migrations completed");
};

export default pool;
