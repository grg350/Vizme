import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { errorHandler } from "./src/middleware/errorHandler.js";
import { authRoutes } from "./src/routes/auth.routes.js";
import { apiKeyRoutes } from "./src/routes/apiKey.routes.js";
import { metricConfigRoutes } from "./src/routes/metricConfig.routes.js";
import { codeGenerationRoutes } from "./src/routes/codeGeneration.routes.js";
import { metricsRoutes } from "./src/routes/metrics.routes.js";
import { healthRoutes } from "./src/routes/health.routes.js";
import { initDatabase } from "./src/database/connection.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Log startup configuration (non-sensitive)
console.log("🔧 Starting backend server...");
console.log("📋 Configuration:");
console.log(`   - Port: ${PORT}`);
console.log(`   - Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`   - Database Host: ${process.env.DB_HOST || "localhost"}`);
console.log(`   - Database Port: ${process.env.DB_PORT || "5432"}`);
console.log(`   - Database Name: ${process.env.DB_NAME || "metrics_db"}`);
console.log(`   - Database User: ${process.env.DB_USER || "postgres"}`);
console.log(`   - Database SSL: ${process.env.DB_SSL || "false"}`);
console.log(`   - Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error("💡 Make sure .env file exists in docker/ directory with all required variables");
  console.error("💡 Or set them in docker-compose.yml environment section");
}

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.use("/health", healthRoutes);

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/api-keys", apiKeyRoutes);
app.use("/api/v1/metric-configs", metricConfigRoutes);
app.use("/api/v1/code-generation", codeGenerationRoutes);
app.use("/api/v1/metrics", metricsRoutes);

// Error handling
app.use(errorHandler);

// Start server immediately, initialize database in background with retries
let dbInitialized = false;
let dbInitPromise = null;

// Initialize database with retry logic
const startDatabaseInit = async () => {
  try {
    await initDatabase(5, 5000); // 5 retries, 5 second delay
    dbInitialized = true;
    console.log("✅ Database ready");
  } catch (error) {
    console.error("❌ Database initialization failed after all retries");
    console.error("⚠️  Server is running but database operations will fail");
    console.error("💡 Check your .env file and database connectivity");
    dbInitialized = false;
  }
};

// Start database initialization in background
dbInitPromise = startDatabaseInit();

// Start server immediately (don't wait for DB)
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌐 API available at http://localhost:${PORT}/api/v1`);
  console.log(`🏥 Health check at http://localhost:${PORT}/health`);
  console.log(`⏳ Database initialization in progress...`);
});

// Export db status for health checks
export { dbInitialized, dbInitPromise };

export default app;
