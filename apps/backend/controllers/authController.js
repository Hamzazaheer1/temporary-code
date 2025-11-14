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
        error: process.env.NODE_ENV === "development" ? verifyError.message : undefined,
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
    verifiedClaims.userId ||   // camelCase fallback
    verifiedClaims.sub ||      // JWT standard
    verifiedClaims.id ||       // Simple id field
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
  const searchPattern = new RegExp(`^(did:privy:)?${escapeRegex(userId)}$`, "i");

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
    if (createError.code === 11000 || createError.message?.includes("duplicate")) {
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
    console.warn("Wallet creation failed, attempting to list existing wallets:", walletError.message);

    // Try to get existing wallet
    try {
      const wallets = await privy.wallets().list({ 
        owner: { user_id: privyUserId } 
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