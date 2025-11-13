import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { PrivyClient, APIError, PrivyAPIError } from "@privy-io/node";

// Ensure .env is loaded before accessing environment variables
// This handles cases where the module is imported before dotenv/config runs
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load .env file, but don't fail if it doesn't exist (for production where env vars are set differently)
try {
  config({ path: join(__dirname, "../.env") });
} catch (error) {
  // .env file might not exist in production, that's okay if env vars are set via system
  console.warn("Could not load .env file, using system environment variables");
}

// Get environment variables
const PRIVY_APP_ID = process.env.PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;

// Validate that required environment variables are set
if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
  const missing = [];
  if (!PRIVY_APP_ID) missing.push("PRIVY_APP_ID");
  if (!PRIVY_APP_SECRET) missing.push("PRIVY_APP_SECRET");
  
  console.error("❌ CRITICAL: Privy environment variables are missing:");
  console.error(`   Missing: ${missing.join(", ")}`);
  console.error("   Please set these in your .env file or system environment variables");
  console.error("   For production, ensure these are set in your deployment platform");
  
  // Still create the client but it will fail on first use with a clear error
  // This allows the server to start and show the error via /api/health endpoint
}

// Create PrivyClient - will throw error if appId/appSecret are invalid
let privy;
try {
  privy = new PrivyClient({
    appId: PRIVY_APP_ID,
    appSecret: PRIVY_APP_SECRET,
  });
} catch (error) {
  console.error("❌ Failed to initialize PrivyClient:", error.message);
  // Create a dummy client that will fail on use - this allows server to start
  // and show configuration errors via health endpoint
  privy = null;
}

export { privy, APIError, PrivyAPIError };
