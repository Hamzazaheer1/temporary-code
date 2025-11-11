import jwt from "jsonwebtoken";
import { privy } from "../services/privy.js";
import User from "../models/User.js";

// Generate JWT Token with Privy user ID
const generateToken = (privyUserId) => {
  if (!privyUserId) {
    throw new Error("Cannot generate token without privyUserId");
  }
  return jwt.sign({ privyUserId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// Set cookie with token
const setTokenCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // Changed to 'lax' for OAuth redirects
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  };

  // Set both cookie names for compatibility
  res.cookie("token", token, cookieOptions);
  res.cookie("privy-token", token, cookieOptions);
};

// @desc    Google OAuth callback handler
// @route   GET /api/auth/google/callback
// @access  Public
// This handler is called after successful Google OAuth authentication
// The user is already created/linked in Privy by the Passport strategy
export const googleCallback = async (req, res) => {
  try {
    const user = req.user;

    if (!user || !user.id) {
      return res.redirect(
        `${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }/sign-in?error=authentication_failed`
      );
    }

    const privyUserId = user.id;
    const email = user.email;

    // Try to verify user exists in Privy (optional - we already have the ID from Passport)
    let privyUser = null;
    try {
      privyUser = await privy.users().get(privyUserId);
    } catch (privyGetError) {
      // If we can't get the user from Privy, that's okay - we have the ID
      // This can happen if there are permission issues, but we can still proceed
      console.warn(
        "Could not verify Privy user, proceeding with user ID:",
        privyGetError.message
      );
    }

    // Ensure user record exists in our database
    let userRecord = await User.findOne({ privyUserId });

    if (!userRecord) {
      // Create user record in our database
      // This should rarely happen as Passport strategy creates it, but handle it anyway
      userRecord = await User.create({
        email: email.toLowerCase().trim(),
        privyUserId,
        name:
          user.name ||
          privyUser?.linked_accounts?.find((acc) => acc.type === "email")
            ?.address ||
          email?.split("@")[0] ||
          "",
      });
    } else {
      // Update user record if needed
      if (user.wallet && !userRecord.walletAddress) {
        userRecord.walletAddress = user.wallet.address;
        userRecord.walletId = user.wallet.id;
        await userRecord.save();
      }
      // Update name if we have it and it's missing
      if (user.name && !userRecord.name) {
        userRecord.name = user.name;
        await userRecord.save();
      }
    }

    // Generate JWT token with Privy user ID
    const token = generateToken(privyUserId);

    // Set cookie
    setTokenCookie(res, token);

    // Redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const redirectUrl = user.isExisting
      ? `${frontendUrl}/?token=${token}&message=signed_in`
      : `${frontendUrl}/?token=${token}&message=signed_up`;

    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/sign-in?error=authentication_failed`);
  }
};
