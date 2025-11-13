import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cross-origin requests from your domain
  allowedDevOrigins: [
    "https://mi6.usesendana.com",
    "http://mi6.usesendana.com",
  ],
};

export default nextConfig;
