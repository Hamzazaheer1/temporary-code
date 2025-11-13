import { privy, APIError, PrivyAPIError } from "../services/privy.js";
import User from "../models/User.js";

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
export const signup = async (req, res) => {
  try {
    const { email, name } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide email",
      });
    }

    // Check if user already exists in our database
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // User exists, check if they have privyUserId
      if (!existingUser.privyUserId) {
        // User exists but doesn't have privyUserId - create Privy user and update record
        if (process.env.NODE_ENV === "development") {
          console.log("Updating existing user with missing privyUserId...");
        }
        try {
          // Create user in Privy
          const privyUser = await privy.users().create({
            linked_accounts: [
              {
                type: "email",
                address: email,
              },
            ],
          });

          // Create wallet for the user if they don't have one
          let wallet = null;
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
          } catch (walletError) {
            console.warn("Wallet creation failed:", walletError);
          }

          // Update existing user record with privyUserId and wallet
          existingUser.privyUserId = privyUser.id;
          if (name && !existingUser.name) {
            existingUser.name = name;
          }
          if (wallet?.address && !existingUser.walletAddress) {
            existingUser.walletAddress = wallet.address;
            existingUser.walletId = wallet.id;
          }
          await existingUser.save();

          return res.status(200).json({
            success: true,
            message: "User account updated successfully",
            data: {
              user: {
                id: privyUser.id,
                email: existingUser.email,
                name: existingUser.name || name || "",
                walletAddress:
                  existingUser.walletAddress || wallet?.address || null,
                createdAt: existingUser.createdAt,
              },
              ...(wallet && { wallet }),
            },
          });
        } catch (privyError) {
          console.error(
            "Error creating Privy user for existing user:",
            privyError
          );
          return res.status(500).json({
            success: false,
            message: "Error updating user account",
            error: privyError.message,
          });
        }
      }
      // User exists, generate token and return
      return res.status(200).json({
        success: true,
        message: "User already exists",
        data: {
          user: {
            id: existingUser.privyUserId,
            email: existingUser.email,
            name: existingUser.name || "",
            walletAddress: existingUser.walletAddress || null,
            createdAt: existingUser.createdAt,
          },
        },
      });
    }

    // Create user in Privy
    const user = await privy.users().create({
      linked_accounts: [
        {
          type: "email",
          address: email,
        },
      ],
    });

    // Optionally create a wallet for the user
    let wallet = null;
    try {
      const createdWallet = await privy.wallets().create({
        chain_type: "stellar",
        owner: { user_id: user.id },
      });
      wallet = {
        id: createdWallet.id,
        address: createdWallet.address,
        chain_type: createdWallet.chain_type,
      };
    } catch (walletError) {
      // Wallet creation is optional, continue even if it fails
      console.warn("Wallet creation failed:", walletError);
    }

    // Store email -> Privy user ID mapping in MongoDB
    await User.create({
      email,
      privyUserId: user.id,
      name: name || "",
      walletAddress: wallet?.address || null,
      walletId: wallet?.id || null,
    });

    // Generate JWT token with Privy user ID
    if (!user || !user.id) {
      return res.status(500).json({
        success: false,
        message: "Error creating user in Privy",
        error: "Privy user ID is missing",
      });
    }
    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user: {
          id: user.id,
          email:
            user.linked_accounts?.find((acc) => acc.type === "email")
              ?.address || email,
          name: name || "",
          walletAddress: wallet?.address || null,
          createdAt: user.created_at,
        },
        wallet,
      },
    });
  } catch (error) {
    if (error instanceof APIError) {
      return res.status(error.status || 400).json({
        success: false,
        message: error.message || "Error creating user",
        error: error.name,
      });
    } else if (error instanceof PrivyAPIError) {
      return res.status(400).json({
        success: false,
        message: error.message || "Error creating user",
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Error creating user",
        error: error.message,
      });
    }
  }
};

// @desc    Sign in user
// @route   POST /api/auth/signin
// @access  Public
export const signin = async (req, res) => {
  try {
    const { email, privyToken, name } = req.body;

    if (!privyToken) {
      return res.status(400).json({
        success: false,
        message: "Privy access token is required",
      });
    }

    try {
      const trimmedToken =
        typeof privyToken === "string" ? privyToken.trim() : "";

      if (!trimmedToken) {
        console.error("Privy token was provided but empty after trimming");
        return res.status(401).json({
          success: false,
          message: "Invalid token: token is empty",
        });
      }

      const bearerPrefixMatch = /^Bearer\s+/i;
      const normalizedToken = trimmedToken.replace(bearerPrefixMatch, "");

      if (normalizedToken !== trimmedToken) {
        console.log("Removed Bearer prefix from provided Privy token");
      }

      if (!normalizedToken || normalizedToken.includes(" ")) {
        console.error("Normalized Privy token is invalid", {
          hasSpace: normalizedToken?.includes(" "),
          length: normalizedToken?.length,
        });
        return res.status(401).json({
          success: false,
          message: "Invalid token format",
        });
      }

      // Debug: Log before verification
      console.log("========== PRIVY TOKEN VERIFICATION START ==========");
      console.log("Privy App ID:", process.env.PRIVY_APP_ID ? "SET ✓" : "NOT SET ✗");
      console.log("Privy App ID Value:", process.env.PRIVY_APP_ID?.substring(0, 20) + "...");
      console.log("Privy App Secret:", process.env.PRIVY_APP_SECRET ? "SET ✓" : "NOT SET ✗");
      console.log("Token Length:", normalizedToken.length);
      console.log("Token Preview:", normalizedToken.substring(0, 30) + "...");
      
      // Decode JWT to check issuer (without verification)
      try {
        const tokenParts = normalizedToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          console.log("Token Issuer (iss):", payload.iss || "N/A");
          console.log("Token Audience (aud):", payload.aud || "N/A");
          console.log("Token Expiry:", payload.exp ? new Date(payload.exp * 1000).toISOString() : "N/A");
          console.log("Token Issued At:", payload.iat ? new Date(payload.iat * 1000).toISOString() : "N/A");
          console.log("Is Token Expired:", payload.exp ? Date.now() > payload.exp * 1000 : "Unknown");
        }
      } catch (decodeError) {
        console.warn("Could not decode token payload:", decodeError.message);
      }
      
      // Verify the Privy access token
      const verifiedClaims = await privy
        .utils()
        .auth()
        .verifyAuthToken(normalizedToken);
      
      console.log("Token Verification: SUCCESS ✓");
      console.log("==================================================");

      // Log the entire verified claims object for debugging
      console.log(
        "Full verified claims from Privy token:",
        JSON.stringify(verifiedClaims, null, 2)
      );
      console.log("Verified claims keys:", Object.keys(verifiedClaims));

      // Get the Privy user ID - Privy's verifyAuthToken returns user_id (with underscore)
      // Based on the logs, Privy returns: { user_id: "did:privy:...", ... }
      const privyUserId =
        verifiedClaims.user_id || // Privy uses user_id (with underscore)
        verifiedClaims.userId || // Fallback to camelCase
        verifiedClaims.sub || // JWT standard sub field
        verifiedClaims.id ||
        (verifiedClaims.user && verifiedClaims.user.id) ||
        (typeof verifiedClaims === "string" ? verifiedClaims : null);

      if (!privyUserId) {
        console.error(
          "No user ID found in verified claims. Full object:",
          JSON.stringify(verifiedClaims, null, 2)
        );
        return res.status(401).json({
          success: false,
          message: "Invalid token: missing user ID",
          error: `Token verification failed - no user ID found. Claims: ${JSON.stringify(
            verifiedClaims
          )}`,
        });
      }

      console.log("Looking up user with privyUserId:", privyUserId);

      // Find user in our database by Privy user ID
      // The privyUserId should match exactly what's stored in the database
      let userRecord = await User.findOne({
        privyUserId: privyUserId,
      });

      // If not found, try with the full DID format (if it's not already)
      if (!userRecord && !privyUserId.startsWith("did:privy:")) {
        console.log("Trying with did:privy: prefix");
        userRecord = await User.findOne({
          privyUserId: `did:privy:${privyUserId}`,
        });
      }

      // If still not found, try without the prefix
      if (!userRecord && privyUserId.startsWith("did:privy:")) {
        const userIdWithoutPrefix = privyUserId.replace("did:privy:", "");
        console.log("Trying without did:privy: prefix:", userIdWithoutPrefix);
        userRecord = await User.findOne({
          privyUserId: userIdWithoutPrefix,
        });
      }

      if (!userRecord) {
        // Also try a case-insensitive search as a last resort
        const allUsers = await User.find({});
        const matchingUser = allUsers.find(
          (u) =>
            u.privyUserId &&
            u.privyUserId.toLowerCase() === privyUserId.toLowerCase()
        );

        if (matchingUser) {
          console.log("Found user with case-insensitive match");
          userRecord = matchingUser;
        }
        // If still not found, we'll create the user below (don't return error here)
      }

      // If user not found in database, create them
      // This happens when user signs up via Privy OTP (Privy creates user, but we haven't created DB record yet)
      if (!userRecord) {
        console.log("User not found in database, creating new user record...");

        // Get user email from Privy or use the email from request
        const normalizeEmail = (value) =>
          typeof value === "string" ? value.toLowerCase().trim() : "";

        let userEmail = normalizeEmail(email);
        try {
          // Try to get user info from Privy
          const privyUser = await privy.users().get(privyUserId);
          if (privyUser && privyUser.linked_accounts) {
            const emailAccount = privyUser.linked_accounts.find(
              (acc) => acc.type === "email"
            );
            if (emailAccount && emailAccount.address) {
              userEmail = normalizeEmail(emailAccount.address);
            }
          }
        } catch (privyError) {
          console.warn(
            "Could not fetch user from Privy, using email from request:",
            privyError
          );
        }

        if (!userEmail) {
          return res.status(400).json({
            success: false,
            message:
              "Unable to determine user email from Privy token. Please ensure the account has an email linked.",
          });
        }

        // Create wallet for the new user
        let wallet = null;
        try {
          const createdWallet = await privy.wallets().create({
            chain_type: "stellar",
            owner: { user_id: privyUserId },
          });
          wallet = {
            id: createdWallet.id,
            address: createdWallet.address,
            chain_type: createdWallet.chain_type,
          };
        } catch (walletError) {
          console.warn("Wallet creation failed:", walletError);
          // Try to get existing wallet if creation fails
          try {
            const wallets = await privy
              .wallets()
              .list({ owner: { user_id: privyUserId } });
            if (wallets && wallets.length > 0) {
              wallet = {
                id: wallets[0].id,
                address: wallets[0].address,
                chain_type: wallets[0].chain_type,
              };
            }
          } catch (listError) {
            console.warn("Could not list wallets:", listError);
          }
        }

        // Check if user with this email already exists (edge case)
        const existingUserByEmail = userEmail
          ? await User.findOne({
              email: userEmail,
            })
          : null;

        if (existingUserByEmail) {
          // User exists by email but different privyUserId - update it
          console.log("User exists by email, updating privyUserId...");
          existingUserByEmail.privyUserId = privyUserId;
          if (name && !existingUserByEmail.name) {
            existingUserByEmail.name = name;
          }
          if (wallet?.address && !existingUserByEmail.walletAddress) {
            existingUserByEmail.walletAddress = wallet.address;
            existingUserByEmail.walletId = wallet.id;
          }
          await existingUserByEmail.save();
          userRecord = existingUserByEmail;
          console.log("Updated existing user with new privyUserId:", {
            email: userRecord.email,
            privyUserId: userRecord.privyUserId,
          });
        } else {
          // Create new user record in our database
          try {
            userRecord = await User.create({
              email: userEmail,
              privyUserId: privyUserId,
              name: name || "", // Use name from request if provided (from signup page)
              walletAddress: wallet?.address || null,
              walletId: wallet?.id || null,
            });

            console.log("New user created in database:", {
              email: userRecord.email,
              privyUserId: userRecord.privyUserId,
              name: userRecord.name,
              walletAddress: userRecord.walletAddress,
            });
          } catch (createError) {
            console.error("Error creating user in database:", createError);
            // If creation fails due to duplicate, try to find the user
            if (
              createError.code === 11000 ||
              createError.message?.includes("duplicate")
            ) {
              const orConditions = [{ privyUserId: privyUserId }];
              if (userEmail) {
                orConditions.push({ email: userEmail });
              }

              userRecord = await User.findOne({
                $or: orConditions,
              });
              if (userRecord) {
                console.log(
                  "Found user after duplicate error:",
                  userRecord.email
                );
              } else {
                throw createError;
              }
            } else {
              throw createError;
            }
          }
        }
      } else {
        console.log("User found:", {
          email: userRecord.email,
          privyUserId: userRecord.privyUserId,
        });
      }

      return res.status(200).json({
        success: true,
        message:
          userRecord.createdAt &&
          new Date(userRecord.createdAt).getTime() > Date.now() - 5000
            ? "Account created and signed in successfully"
            : "Signed in successfully",
        data: {
          user: {
            id: privyUserId,
            email: userRecord.email,
            name: userRecord.name || "",
            walletAddress: userRecord.walletAddress || null,
            createdAt: userRecord.createdAt,
          },
        },
      });
    } catch (verifyError) {
      // Detailed error logging for debugging
      console.error("========== PRIVY TOKEN VERIFICATION ERROR ==========");
      console.error("Error Type:", verifyError.constructor.name);
      console.error("Error Message:", verifyError.message);
      console.error("Error Code:", verifyError.code || "N/A");
      console.error("Error Status:", verifyError.status || "N/A");
      console.error("Full Error:", JSON.stringify(verifyError, Object.getOwnPropertyNames(verifyError)));
      console.error("Privy App ID Set:", !!process.env.PRIVY_APP_ID);
      console.error("Privy App ID Value:", process.env.PRIVY_APP_ID?.substring(0, 20) + "...");
      console.error("Privy App Secret Set:", !!process.env.PRIVY_APP_SECRET);
      console.error("Token Length:", normalizedToken?.length || 0);
      console.error("Token First 20 chars:", normalizedToken?.substring(0, 20) || "N/A");
      
      // Try to decode token to check if it's expired or wrong issuer
      try {
        const tokenParts = normalizedToken?.split('.');
        if (tokenParts && tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          console.error("Token Issuer (iss):", payload.iss || "N/A");
          console.error("Token Audience (aud):", payload.aud || "N/A");
          console.error("Token Expiry:", payload.exp ? new Date(payload.exp * 1000).toISOString() : "N/A");
          console.error("Is Token Expired:", payload.exp ? Date.now() > payload.exp * 1000 : "Unknown");
          console.error("Expected App ID:", process.env.PRIVY_APP_ID);
          console.error("Token Issuer Match:", payload.iss?.includes(process.env.PRIVY_APP_ID) ? "YES ✓" : "NO ✗");
        }
      } catch (decodeError) {
        console.error("Could not decode token for debugging:", decodeError.message);
      }
      
      console.error("==================================================");
      
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
        error: verifyError.message || "Token verification failed",
        errorType: verifyError.constructor.name,
        errorCode: verifyError.code || verifyError.status || "UNKNOWN",
      });
    }
  } catch (error) {
    if (error instanceof APIError) {
      return res.status(error.status || 401).json({
        success: false,
        message: error.message || "Error signing in",
        error: error.name,
      });
    } else if (error instanceof PrivyAPIError) {
      return res.status(401).json({
        success: false,
        message: error.message || "Error signing in",
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Error signing in",
        error: error.message,
      });
    }
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    // req.user is set by middleware after verifying the Privy access token
    const privyUserId = req.user?.privyId || req.user?.privyUserId;

    if (!privyUserId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Get user record from our database
    const userRecord = await User.findOne({ privyUserId });

    if (!userRecord) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: privyUserId,
          email: userRecord.email,
          name: userRecord.name || "",
          walletAddress: userRecord.walletAddress || null,
          createdAt: userRecord.createdAt,
          updatedAt: userRecord.updatedAt,
        },
      },
    });
  } catch (error) {
    if (error instanceof APIError) {
      return res.status(error.status || 401).json({
        success: false,
        message: error.message || "Error fetching user",
        error: error.name,
      });
    } else if (error instanceof PrivyAPIError) {
      return res.status(401).json({
        success: false,
        message: error.message || "Error fetching user",
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Error fetching user",
        error: error.message,
      });
    }
  }
};

// @desc    Sign out user
// @route   POST /api/auth/signout
// @access  Private
export const signout = async (req, res) => {
  try {
    // Clear both cookie names
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      path: "/",
    };
    res.clearCookie("token", cookieOptions);
    res.clearCookie("privy-token", cookieOptions);

    res.status(200).json({
      success: true,
      message: "Signed out successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error signing out",
      error: error.message,
    });
  }
};
n", cookieOptions);

    res.status(200).json({
      success: true,
      message: "Signed out successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error signing out",
      error: error.message,
    });
  }
};
