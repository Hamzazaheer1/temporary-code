import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    const headerToken = req.headers.authorization || "";
    const bearerToken = headerToken.startsWith("Bearer ")
      ? headerToken.slice(7)
      : headerToken;

    const token =
      bearerToken?.trim() ||
      req.cookies?.["token"] ||
      req.cookies?.["privy-token"];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const privyUserId = decoded?.privyUserId;

    if (!privyUserId) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, missing user identifier in token",
      });
    }

    const userRecord = await User.findOne({ privyUserId });

    if (!userRecord) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, user not found",
      });
    }

    req.user = {
      id: userRecord._id,
      privyId: privyUserId,
      privyUserId,
      user: userRecord,
    };

    return next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(401).json({
      success: false,
      message: "Not authorized, invalid or expired token",
    });
  }
};
