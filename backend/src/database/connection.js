import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "metrics_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Metrics tracking - will be set after import to avoid circular dependency
let dbMetrics = null;

export const setDbMetrics = (metrics) => {
  dbMetrics = metrics;
};

// Test connection
pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database");
  if (dbMetrics?.activeDbConnections) {
    dbMetrics.activeDbConnections.inc();
  }
});

pool.on("remove", () => {
  if (dbMetrics?.activeDbConnections) {
    dbMetrics.activeDbConnections.dec();
  }
});

pool.on("error", (err) => {
  console.error("❌ Unexpected error on idle client", err);
  process.exit(-1);
});

// Extract query type from SQL text
const getQueryType = (text) => {
  const trimmed = text.trim().toUpperCase();
  if (trimmed.startsWith('SELECT')) return 'select';
  if (trimmed.startsWith('INSERT')) return 'insert';
  if (trimmed.startsWith('UPDATE')) return 'update';
  if (trimmed.startsWith('DELETE')) return 'delete';
  if (trimmed.startsWith('CREATE')) return 'create';
  if (trimmed.startsWith('DROP')) return 'drop';
  if (trimmed.startsWith('ALTER')) return 'alter';
  return 'other';
};

export const query = async (text, params) => {
  const start = Date.now();
  const queryType = getQueryType(text);
  let success = 'true';
  
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Record metrics if available
    if (dbMetrics) {
      const durationSeconds = duration / 1000;
      dbMetrics.dbQueryDuration.labels(queryType, success).observe(durationSeconds);
      dbMetrics.dbQueriesTotal.labels(queryType, success).inc();
    }
    
    console.log("Executed query", { text: text.substring(0, 50), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    success = 'false';
    const duration = Date.now() - start;
    
    // Record error metrics
    if (dbMetrics) {
      const durationSeconds = duration / 1000;
      dbMetrics.dbQueryDuration.labels(queryType, success).observe(durationSeconds);
      dbMetrics.dbQueriesTotal.labels(queryType, success).inc();
    }
    
    console.error("Query error", { text: text.substring(0, 50), error: error.message });
    throw error;
  }
};

export const initDatabase = async () => {
  try {
    // Test connection
    await query("SELECT NOW()");

    // Run migrations
    await runMigrations();

    console.log("✅ Database initialized successfully");
    return true;
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
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
