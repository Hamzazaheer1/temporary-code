import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { PrivyClient, APIError, PrivyAPIError } from "@privy-io/node";

// Ensure .env is loaded before accessing environment variables
// This handles cases where the module is imported before dotenv/config runs
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "../.env") });

const privy = new PrivyClient({
  appId: process.env.PRIVY_APP_ID,
  appSecret: process.env.PRIVY_APP_SECRET,
});

export { privy, APIError, PrivyAPIError };
