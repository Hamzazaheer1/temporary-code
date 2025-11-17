import { privy, APIError, PrivyAPIError } from "../services/privy.js";
import User from "../models/User.js";
import { generateToken, setTokenCookie } from "../utils/token.js";

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

// @desc Sign in user
// @route POST /api/auth/signin
// @access Public

export const signin = async (req, res) => {
  try {
    const { email, privyToken, name } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide email",
      });
    }

    // Privy token is required for authentication
    if (!privyToken) {
      return res.status(400).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    // Verify the Privy access token
    let verifiedClaims;
    try {
      verifiedClaims = await privy.utils().auth().verifyAuthToken(privyToken);
      console.log("Token verified for user:", verifiedClaims.user_id);
    } catch (verifyError) {
      console.error("Token verification failed:", verifyError.message);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token",
        error:
          process.env.NODE_ENV === "development"
            ? verifyError.message
            : undefined,
      });
    }

    // Extract Privy user ID from verified claims
    const privyUserId = extractPrivyUserId(verifiedClaims);
    if (!privyUserId) {
      console.error(
        "No user ID found in verified claims:",
        JSON.stringify(verifiedClaims, null, 2)
      );
      return res.status(401).json({
        success: false,
        message: "Invalid token: missing user identification",
      });
    }

    // Find or create user in database
    let userRecord = await findUserByPrivyId(privyUserId);
    let isNewUser = false;

    if (!userRecord) {
      console.log("User not found in database, creating new user record...");
      userRecord = await createUserFromPrivy(privyUserId, email, name);
      isNewUser = true;
    }

    // Generate JWT token
    const token = generateToken(privyUserId);
    setTokenCookie(res, token);

    return res.status(200).json({
      success: true,
      message: isNewUser
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
        token,
      },
    });
  } catch (error) {
    console.error("Signin error:", error);

    if (error instanceof APIError) {
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Authentication failed",
        error: process.env.NODE_ENV === "development" ? error.name : undefined,
      });
    }

    if (error instanceof PrivyAPIError) {
      return res.status(401).json({
        success: false,
        message: error.message || "Authentication failed",
      });
    }

    return res.status(500).json({
      success: false,
      message: "An error occurred during sign in",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============ Helper Functions ============

/**
 * Extracts the Privy user ID from verified token claims.
 * Tries multiple possible field names for compatibility.
 *
 * @param {object} verifiedClaims - The verified JWT claims from Privy
 * @returns {string|null} The Privy user ID or null if not found
 */
function extractPrivyUserId(verifiedClaims) {
  return (
    verifiedClaims.user_id || // Privy standard (snake_case)
    verifiedClaims.userId || // camelCase fallback
    verifiedClaims.sub || // JWT standard
    verifiedClaims.id || // Simple id field
    verifiedClaims.user?.id || // Nested user object
    (typeof verifiedClaims === "string" ? verifiedClaims : null)
  );
}

/**
 * Finds a user by their Privy user ID, trying multiple format variations.
 * Uses case-insensitive search and handles did:privy: prefix variations.
 *
 * @param {string} privyUserId - The Privy user ID to search for
 * @returns {Promise<object|null>} The user record or null if not found
 */
async function findUserByPrivyId(privyUserId) {
  // Build regex for case-insensitive search with optional did:privy: prefix
  const userId = privyUserId.replace(/^did:privy:/i, "");
  const searchPattern = new RegExp(
    `^(did:privy:)?${escapeRegex(userId)}$`,
    "i"
  );

  const userRecord = await User.findOne({
    privyUserId: searchPattern,
  });

  return userRecord;
}

/**
 * Creates a new user record from Privy authentication.
 * Fetches user details from Privy API and creates a wallet.
 *
 * @param {string} privyUserId - The Privy user ID
 * @param {string} fallbackEmail - Email from request body (fallback)
 * @param {string} name - User's name (optional)
 * @returns {Promise<object>} The created user record
 */
async function createUserFromPrivy(privyUserId, fallbackEmail, name) {
  // Fetch user details from Privy
  const userEmail = await fetchUserEmailFromPrivy(privyUserId, fallbackEmail);

  // Create or get wallet
  const wallet = await getOrCreateWallet(privyUserId);

  // Check if user exists by email (edge case: email exists, different privyUserId)
  const existingUser = await User.findOne({
    email: userEmail.toLowerCase().trim(),
  });

  if (existingUser) {
    console.log("User exists by email, updating privyUserId...");
    existingUser.privyUserId = privyUserId;
    if (name && !existingUser.name) {
      existingUser.name = name;
    }
    if (wallet?.address && !existingUser.walletAddress) {
      existingUser.walletAddress = wallet.address;
      existingUser.walletId = wallet.id;
    }
    await existingUser.save();
    return existingUser;
  }

  // Create new user with upsert to prevent race conditions
  try {
    const userRecord = await User.create({
      email: userEmail.toLowerCase().trim(),
      privyUserId: privyUserId,
      name: name || "",
      walletAddress: wallet?.address || null,
      walletId: wallet?.id || null,
    });

    console.log("New user created:", {
      email: userRecord.email,
      privyUserId: userRecord.privyUserId,
      walletAddress: userRecord.walletAddress,
    });

    return userRecord;
  } catch (createError) {
    // Handle duplicate key errors (race condition)
    if (
      createError.code === 11000 ||
      createError.message?.includes("duplicate")
    ) {
      console.log("Duplicate detected, fetching existing user...");
      const existingRecord = await User.findOne({
        $or: [
          { privyUserId: privyUserId },
          { email: userEmail.toLowerCase().trim() },
        ],
      });

      if (existingRecord) {
        return existingRecord;
      }
    }

    throw createError;
  }
}

/**
 * Fetches user's email from Privy API.
 *
 * @param {string} privyUserId - The Privy user ID
 * @param {string} fallbackEmail - Fallback email if Privy fetch fails
 * @returns {Promise<string>} The user's email address
 */
async function fetchUserEmailFromPrivy(privyUserId, fallbackEmail) {
  try {
    const privyUser = await privy.users().get(privyUserId);

    if (privyUser?.linked_accounts) {
      const emailAccount = privyUser.linked_accounts.find(
        (acc) => acc.type === "email"
      );

      if (emailAccount?.address) {
        return emailAccount.address;
      }
    }
  } catch (error) {
    console.warn("Could not fetch user from Privy:", error.message);
  }

  return fallbackEmail;
}

/**
 * Gets existing wallet or creates a new Stellar wallet for the user.
 *
 * @param {string} privyUserId - The Privy user ID
 * @returns {Promise<object|null>} Wallet object with id, address, chain_type
 */
async function getOrCreateWallet(privyUserId) {
  try {
    // Try to create new wallet
    const createdWallet = await privy.wallets().create({
      chain_type: "stellar",
      owner: { user_id: privyUserId },
    });

    return {
      id: createdWallet.id,
      address: createdWallet.address,
      chain_type: createdWallet.chain_type,
    };
  } catch (walletError) {
    console.warn(
      "Wallet creation failed, attempting to list existing wallets:",
      walletError.message
    );

    // Try to get existing wallet
    try {
      const wallets = await privy.wallets().list({
        owner: { user_id: privyUserId },
      });

      if (wallets?.length > 0) {
        return {
          id: wallets[0].id,
          address: wallets[0].address,
          chain_type: wallets[0].chain_type,
        };
      }
    } catch (listError) {
      console.warn("Could not list wallets:", listError.message);
    }
  }

  return null;
}

/**
 * Escapes special regex characters in a string.
 *
 * @param {string} string - The string to escape
 * @returns {string} The escaped string
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
