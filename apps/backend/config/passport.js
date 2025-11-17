import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { privy, APIError, PrivyAPIError } from "../services/privy.js";
import User from "../models/User.js";

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id || user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    // Try to find in our database first
    const userRecord = await User.findOne({ privyUserId: id });
    if (userRecord) {
      return done(null, {
        id: userRecord.privyUserId,
        email: userRecord.email,
      });
    }
    done(null, { id });
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
// This follows Privy's recommended approach for backend-based OAuth
// Users are created in Privy with Google OAuth credentials
// IMPORTANT: GOOGLE_CALLBACK_URL must match EXACTLY what's configured in Google Cloud Console
// For production, it should be: https://your-backend-domain.vercel.app/api/auth/google/callback
const callbackUrl =
  process.env.GOOGLE_CALLBACK_URL ||
  "http://localhost:4000/api/auth/google/callback";

if (!process.env.GOOGLE_CALLBACK_URL) {
  console.warn(
    "⚠️ WARNING: GOOGLE_CALLBACK_URL not set! Using default localhost URL."
  );
  console.warn("   This will cause OAuth to fail in production!");
  console.warn(
    "   Set GOOGLE_CALLBACK_URL to your production backend URL in Vercel."
  );
}

console.log("🔧 Google OAuth Strategy configured:");
console.log(
  "  - Client ID:",
  process.env.GOOGLE_CLIENT_ID
    ? "***" + process.env.GOOGLE_CLIENT_ID.slice(-4)
    : "NOT SET"
);
console.log(
  "  - Client Secret:",
  process.env.GOOGLE_CLIENT_SECRET ? "***SET***" : "NOT SET"
);
console.log("  - Callback URL:", callbackUrl);
console.log(
  "  ⚠️  Make sure this EXACT URL is in Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs"
);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: callbackUrl,
      passReqToCallback: false,
    },
    async (accessToken, refreshToken, profile, done) => {
      console.log("🟢 Google OAuth strategy callback executed");
      console.log("Profile received:", {
        id: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.displayName,
      });
      try {
        const email = profile.emails?.[0]?.value;
        const name =
          profile.displayName ||
          profile.name?.givenName ||
          profile.name?.familyName ||
          email?.split("@")[0] ||
          "User";
        const googleSubject = profile.id; // Google user ID

        if (!email) {
          return done(new Error("Email not provided by Google"), null);
        }

        // Check if user exists in our database (by email first)
        let userRecord = await User.findOne({
          email: email.toLowerCase().trim(),
        });

        // If we found a user record with a Privy ID, use it
        if (userRecord && userRecord.privyUserId) {
          // User exists in our DB with Privy ID
          // Verify the user still exists in Privy and check if Google account is linked
          try {
            let privyUser;
            try {
              privyUser = await privy.users().get(userRecord.privyUserId);
            } catch (getError) {
              // Only treat specific configuration errors as configuration issues
              const isConfigError =
                getError.message?.includes("Invalid Privy app ID") ||
                getError.message?.includes("missing_or_invalid_privy_app_id") ||
                (getError instanceof APIError &&
                  (getError.status === 401 || getError.status === 403));

              if (isConfigError) {
                console.error("Privy configuration error:", getError.message);
                return done(
                  new Error(
                    "Privy configuration error: Invalid or missing PRIVY_APP_ID or PRIVY_APP_SECRET. Please check your .env file."
                  ),
                  null
                );
              }

              // If user not found (404) or other API errors, log and continue to create new user
              // This handles cases where the Privy user was deleted or doesn't exist
              console.warn(
                "Could not get Privy user, will create new one:",
                getError.message
              );
              // Continue to create new user below
              throw getError; // Re-throw to be caught by outer catch
            }

            // Check if Google account is already linked
            const hasGoogleAccount = privyUser.linked_accounts?.some(
              (acc) =>
                acc.type === "google_oauth" && acc.subject === googleSubject
            );

            if (!hasGoogleAccount) {
              // Try to update user to add Google account
              // Note: Privy may require creating a new user with both accounts
              // For now, we'll use the existing user - Google OAuth will still work
              // as the user can authenticate via email
              console.log(
                "Google account not linked to existing Privy user. User can still authenticate."
              );
            }

            return done(null, {
              id: userRecord.privyUserId,
              email,
              name,
              isExisting: true,
            });
          } catch (privyError) {
            // Privy user might not exist anymore, or there was an error getting it
            // Continue to create new user below
            // This is expected if the user doesn't exist in Privy yet
          }
        }

        // Create new user in Privy with Google OAuth
        // This is Privy's recommended approach: create user with linked accounts
        let privyUser;
        let isExistingPrivyUser = false;
        try {
          privyUser = await privy.users().create({
            linked_accounts: [
              {
                type: "email",
                address: email.toLowerCase().trim(),
              },
              {
                type: "google_oauth",
                subject: googleSubject,
                email: email.toLowerCase().trim(),
                name: name,
              },
            ],
          });
        } catch (privyCreateError) {
          console.error("Error creating Privy user:", privyCreateError);

          // Check for specific configuration errors first
          const isConfigError =
            privyCreateError.message?.includes(
              "Input conflict caused by an existing user"
            ) ||
            privyCreateError.message?.includes("Invalid Privy app ID") ||
            privyCreateError.message?.includes(
              "missing_or_invalid_privy_app_id"
            ) ||
            (privyCreateError instanceof APIError &&
              (privyCreateError.status === 401 ||
                privyCreateError.status === 403));

          // Handle 422 conflict - user already exists
          if (
            privyCreateError instanceof APIError &&
            privyCreateError.status === 422
          ) {
            // Extract Privy user ID from error message or cause field
            // Format: "Input conflict caused by an existing user: did:privy:..."
            // Or in error.cause: "did:privy:..."
            let existingPrivyUserId = null;

            // Try to get from cause field first (most reliable)
            if (privyCreateError.error?.cause) {
              const cause = privyCreateError.error.cause;
              const causeMatch = cause.match(/did:privy:[\w]+/);
              if (causeMatch) {
                existingPrivyUserId = causeMatch[0];
              }
            }

            // Fallback to error message
            if (!existingPrivyUserId) {
              const conflictMatch =
                privyCreateError.message?.match(/did:privy:[\w]+/);
              if (conflictMatch) {
                existingPrivyUserId = conflictMatch[0];
              }
            }

            if (existingPrivyUserId) {
              console.log(
                `User already exists in Privy, using existing user: ${existingPrivyUserId}`
              );
              isExistingPrivyUser = true;

              // Check if we have this user in our database (by Privy ID)
              if (!userRecord) {
                userRecord = await User.findOne({
                  privyUserId: existingPrivyUserId,
                });
              }

              // If still no record found, check by email (might have been created differently)
              if (!userRecord) {
                userRecord = await User.findOne({
                  email: email.toLowerCase().trim(),
                });
              }

              try {
                // Try to get the existing user from Privy (optional - we have the ID)
                privyUser = await privy.users().get(existingPrivyUserId);
              } catch (getError) {
                // If we can't get the user, that's okay - we'll use the ID we have
                // This can happen if there are permission issues, but we can still proceed
                console.warn(
                  "Could not fetch full Privy user details, using ID only:",
                  getError.message
                );
                // Create a minimal user object with just the ID
                // We'll get the email from the Google profile or our database
                privyUser = {
                  id: existingPrivyUserId,
                  linked_accounts: [
                    {
                      type: "email",
                      address: email.toLowerCase().trim(),
                    },
                  ],
                };
              }
            } else {
              return done(
                new Error(
                  "User conflict detected but could not extract user ID from error"
                ),
                null
              );
            }
          } else if (isConfigError) {
            return done(
              new Error(
                "Privy configuration error: Invalid or missing PRIVY_APP_ID or PRIVY_APP_SECRET. Please check your .env file."
              ),
              null
            );
          } else if (
            privyCreateError instanceof APIError ||
            privyCreateError instanceof PrivyAPIError
          ) {
            // For other Privy API errors, return a more specific error
            return done(
              new Error(
                `Privy API error: ${
                  privyCreateError.message || "Failed to create user in Privy"
                }`
              ),
              null
            );
          } else {
            // For any other errors, re-throw
            throw privyCreateError;
          }
        }

        // Check if user already has a wallet (only create if they don't have one)
        let wallet = null;

        // First, check if we have wallet info in our database
        if (userRecord && userRecord.walletAddress && userRecord.walletId) {
          wallet = {
            id: userRecord.walletId,
            address: userRecord.walletAddress,
            chain_type: "ethereum",
          };
          console.log("Using existing wallet from database:", wallet.address);
        } else {
          // Try to get existing wallets from Privy
          try {
            const wallets = await privy
              .wallets()
              .list({ owner: { user_id: privyUser.id } });
            if (wallets && wallets.length > 0) {
              // User already has a wallet, use the first one
              wallet = {
                id: wallets[0].id,
                address: wallets[0].address,
                chain_type: wallets[0].chain_type || "ethereum",
              };
              console.log("Using existing wallet from Privy:", wallet.address);
            }
          } catch (listError) {
            console.warn(
              "Could not list wallets, will try to create:",
              listError.message
            );
          }

          // Only create a new wallet if user doesn't have one
          if (!wallet) {
            try {
              const createdWallet = await privy.wallets().create({
                chain_type: "stellar",
                owner: { user_id: privyUser.id },
              });
              wallet = {
                id: createdWallet.id,
                address: createdWallet.address,
                chain_type: createdWallet.chain_type,
              };
              console.log("Created new wallet:", wallet.address);
            } catch (walletError) {
              // Wallet creation is optional, continue even if it fails
              // This might fail if user already has a wallet but we couldn't list it
              console.warn(
                "Wallet creation failed (user may already have one):",
                walletError.message
              );
            }
          }
        }

        // Store in our database (for quick lookup by email)
        if (userRecord) {
          // Update existing record
          let needsSave = false;

          // Update Privy user ID if it's different
          if (userRecord.privyUserId !== privyUser.id) {
            userRecord.privyUserId = privyUser.id;
            needsSave = true;
          }

          // Update name if we have one and it's missing
          if (name && !userRecord.name) {
            userRecord.name = name;
            needsSave = true;
          }

          // Update wallet info only if we have new wallet info and it's different
          if (
            wallet?.address &&
            (!userRecord.walletAddress ||
              userRecord.walletAddress !== wallet.address)
          ) {
            userRecord.walletAddress = wallet.address;
            userRecord.walletId = wallet.id;
            needsSave = true;
          }

          if (needsSave) {
            await userRecord.save();
          }
        } else {
          // Create new record only if it doesn't exist
          // Double-check to avoid duplicates
          const existingRecord = await User.findOne({
            $or: [
              { privyUserId: privyUser.id },
              { email: email.toLowerCase().trim() },
            ],
          });

          if (!existingRecord) {
            userRecord = await User.create({
              email: email.toLowerCase().trim(),
              privyUserId: privyUser.id,
              name,
              walletAddress: wallet?.address || null,
              walletId: wallet?.id || null,
            });
          } else {
            // Use existing record
            userRecord = existingRecord;
            // Update it if needed
            if (wallet?.address && !userRecord.walletAddress) {
              userRecord.walletAddress = wallet.address;
              userRecord.walletId = wallet.id;
              await userRecord.save();
            }
          }
        }

        return done(null, {
          id: privyUser.id,
          email,
          name,
          wallet,
          isExisting: isExistingPrivyUser || !!userRecord,
        });
      } catch (error) {
        console.error("❌ Google OAuth strategy error:", error);
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code,
        });
        return done(error, null);
      }
    }
  )
);

export default passport;
