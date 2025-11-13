import { privy } from "../services/privy.js";

export const protect = async (req, res, next) => {
  try {
    const headerToken = req.headers.authorization || "";
    const bearerToken = headerToken.startsWith("Bearer ")
      ? headerToken.slice(7)
      : headerToken;

    const token =
      bearerToken?.trim() || req.cookies?.["privy-token"] || req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token provided",
      });
    }

    const verifiedClaims = await privy.utils().auth().verifyAuthToken(token);

    const privyUserId =
      verifiedClaims.userId ||
      verifiedClaims.user_id ||
      verifiedClaims.sub ||
      (verifiedClaims.user && verifiedClaims.user.id);

    if (!privyUserId) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, missing user identifier in token",
      });
    }

    req.user = {
      id: privyUserId,
      privyId: privyUserId,
      privyUserId,
      sessionId:
        verifiedClaims.sessionId ||
        verifiedClaims.session_id ||
        verifiedClaims.sid ||
        null,
      claims: verifiedClaims,
    };

    return next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({
      success: false,
      message: "Not authorized, invalid or expired token",
    });
  }
};
