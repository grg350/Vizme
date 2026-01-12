import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { errorHandler } from "./src/middleware/errorHandler.js";
import { authRoutes } from "./src/routes/auth.routes.js";
import { apiKeyRoutes } from "./src/routes/apikey.routes.js";
import { metricConfigRoutes } from "./src/routes/metricconfig.routes.js";
import { codeGenerationRoutes } from "./src/routes/codeGeneration.routes.js";
import { metricsRoutes } from "./src/routes/metrics.routes.js";
import { healthRoutes } from "./src/routes/health.routes.js";
import { prometheusRoutes } from "./src/routes/prometheus.routes.js";
import { initDatabase, setDbMetrics } from "./src/database/connection.js";
import { 
  metricsMiddleware, 
  metricsHandler,
  dbQueryDuration,
  dbQueriesTotal,
  activeDbConnections
} from "./src/middleware/metrics.middleware.js";

dotenv.config();

// Validate required environment variables at startup
const requiredEnvVars = ['JWT_SECRET', 'DB_PASSWORD'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    console.error('Please set all required environment variables. See .env.example for reference.');
    process.exit(1);
  }
}

// Set up database metrics tracking
setDbMetrics({ dbQueryDuration, dbQueriesTotal, activeDbConnections });

const app = express();
const PORT = process.env.PORT || 3000;

// Prometheus metrics endpoint (before other middleware to avoid auth)
app.get("/metrics", metricsHandler);

// Metrics middleware - must be early to track all requests
app.use(metricsMiddleware);

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
app.use("/api/v1/prometheus", prometheusRoutes);

// Error handling
app.use(errorHandler);

// Initialize database and start server
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  })
  .catch((error) => {
    console.error("❌ Failed to initialize database:", error);
    process.exit(1);
  });

export default app;
