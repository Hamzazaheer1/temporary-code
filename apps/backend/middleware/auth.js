import jwt from "jsonwebtoken";
import { privy } from "../services/privy.js";

export const protect = async (req, res, next) => {
  try {
    // Get token from Authorization header first (most reliable), then cookies
    // According to Privy docs: token can be in Authorization header (Bearer) or cookies
    // Priority: Authorization header > privy-token cookie > token cookie
    // This ensures we use the fresh token from localStorage (via Authorization header)
    // instead of potentially stale cookies
    const authHeader = req.headers.authorization?.replace("Bearer ", "");
    const token =
      authHeader || req.cookies?.["privy-token"] || req.cookies?.token;

    // Logging only in development for debugging
    if (process.env.NODE_ENV === "development" && token) {
      console.log(
        `[Auth] Token from: ${
          authHeader
            ? "Authorization header"
            : req.cookies?.["privy-token"]
            ? "privy-token cookie"
            : "token cookie"
        }`
      );
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token provided",
      });
    }

    try {
      // First, try to verify as Privy access token using verifyAuthToken
      // This is the recommended way per Privy documentation
      try {
        const verifiedClaims = await privy
          .utils()
          .auth()
          .verifyAuthToken(token);

        // Token is a valid Privy access token
        // Attach user to request with Privy user ID from verified claims
        req.user = {
          id: verifiedClaims.userId,
          privyId: verifiedClaims.userId,
          privyUserId: verifiedClaims.userId,
          sessionId: verifiedClaims.sessionId,
        };

        return next();
      } catch (privyError) {
        // Privy verification failed, try as our custom JWT token
        // This allows backward compatibility with our custom tokens

        try {
          // Verify JWT token
          if (!process.env.JWT_SECRET) {
            return res.status(500).json({
              success: false,
              message: "Server configuration error: JWT_SECRET not set",
            });
          }

          const decoded = jwt.verify(token, process.env.JWT_SECRET);

          // Check for privyUserId in different possible locations
          const privyUserId =
            decoded.privyUserId || decoded.id || decoded.userId;

          if (!privyUserId) {
            console.error(
              "JWT token missing privyUserId:",
              Object.keys(decoded)
            );
            return res.status(401).json({
              success: false,
              message: "Not authorized, invalid token structure",
            });
          }

          // Attach user to request
          req.user = {
            id: privyUserId,
            privyId: privyUserId,
            privyUserId: privyUserId,
          };

          return next();
        } catch (jwtError) {
          // Both verifications failed
          console.error("Token verification failed:", jwtError.message);
          return res.status(401).json({
            success: false,
            message: "Not authorized, invalid or expired token",
          });
        }
      }
    } catch (error) {
      // Handle unexpected errors
      console.error("Unexpected error in auth middleware:", error);
      return res.status(401).json({
        success: false,
        message: "Not authorized, token verification failed",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
