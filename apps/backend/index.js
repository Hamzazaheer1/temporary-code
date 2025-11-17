import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "./config/passport.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/monique-powell";

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session middleware (for OAuth)
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || process.env.JWT_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// CORS middleware (allow all origins)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "false");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// MongoDB connection
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
  });

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "Hello from the backend 👋",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  const health = {
    status: "ok",
    uptime: process.uptime(),
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    privy: {
      configured: !!(process.env.PRIVY_APP_ID && process.env.PRIVY_APP_SECRET),
      appId: process.env.PRIVY_APP_ID
        ? "***" + process.env.PRIVY_APP_ID.slice(-4)
        : "not set",
    },
    google: {
      configured: !!(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ),
    },
  };

  res.json(health);
});

// Auth routes
app.use("/api/auth", authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error stack:", err.stack);
  console.error("Error message:", err.message);

  // Check for Privy configuration errors
  if (
    err.message?.includes("Invalid Privy app ID") ||
    err.message?.includes("missing_or_invalid_privy_app_id") ||
    err.message?.includes("Privy configuration error")
  ) {
    return res.status(500).json({
      success: false,
      message: "Privy configuration error",
      error:
        process.env.NODE_ENV === "development"
          ? "Invalid or missing PRIVY_APP_ID or PRIVY_APP_SECRET. Please check your .env file and ensure you have valid Privy credentials from https://dashboard.privy.io/"
          : "Server configuration error",
    });
  }

  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
