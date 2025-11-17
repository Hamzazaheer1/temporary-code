import { privy } from "../services/privy.js";
import User from "../models/User.js";
import { generateToken, setTokenCookie } from "../utils/token.js";

// @desc    Google OAuth callback handler
// @route   GET /api/auth/google/callback
// @access  Public
// This handler is called after successful Google OAuth authentication
// The user is already created/linked in Privy by the Passport strategy
export const googleCallback = async (req, res) => {
  try {
    console.log("✅ Google callback handler called");
    console.log(
      "Request user:",
      req.user ? { id: req.user.id, email: req.user.email } : "null"
    );
    console.log("Request query:", req.query);

    const user = req.user;

    if (!user || !user.id) {
      console.error("❌ No user in request after Passport authentication");
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
    console.log(
      "Google callback redirecting to frontend:",
      frontendUrl,
      "existing user?",
      !!user.isExisting
    );
    const redirectUrl = user.isExisting
      ? `${frontendUrl}/?token=${token}&message=signed_in`
      : `${frontendUrl}/?token=${token}&message=signed_up`;

    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    console.error(
      "Google callback error redirect using frontend URL:",
      frontendUrl
    );
    res.redirect(`${frontendUrl}/sign-in?error=authentication_failed`);
  }
};
