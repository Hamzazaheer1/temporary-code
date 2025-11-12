import jwt from "jsonwebtoken";
import { privy, APIError, PrivyAPIError } from "../services/privy.js";
import User from "../models/User.js";

// Generate JWT Token with Privy user ID
const generateToken = (privyUserId) => {
  if (!privyUserId) {
    console.error(
      "ERROR: generateToken called with undefined/null privyUserId!"
    );
    throw new Error("Cannot generate token without privyUserId");
  }

  return jwt.sign({ privyUserId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// Set cookie with token
// According to Privy docs, cookies should be set with proper options for persistence
const setTokenCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // Allows cross-site requests with credentials
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/", // Available on all paths
  };

  // Set both cookie names for compatibility with Privy's expected format
  res.cookie("token", token, cookieOptions);
  res.cookie("privy-token", token, cookieOptions);
};

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

          // Generate token with the new privyUserId
          const token = generateToken(privyUser.id);
          setTokenCookie(res, token);

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
              token,
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
      const token = generateToken(existingUser.privyUserId);
      setTokenCookie(res, token);

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
          token,
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
    const token = generateToken(user.id);
    setTokenCookie(res, token);

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
        token,
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

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide email",
      });
    }

    // If privyToken is provided, verify it using Privy's verifyAuthToken
    if (privyToken) {
      try {
        // Verify the Privy access token
        const verifiedClaims = await privy
          .utils()
          .auth()
          .verifyAuthToken(privyToken);

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
          console.log(
            "User not found in database, creating new user record..."
          );

          // Get user email from Privy or use the email from request
          let userEmail = email;
          try {
            // Try to get user info from Privy
            const privyUser = await privy.users().get(privyUserId);
            if (privyUser && privyUser.linked_accounts) {
              const emailAccount = privyUser.linked_accounts.find(
                (acc) => acc.type === "email"
              );
              if (emailAccount && emailAccount.address) {
                userEmail = emailAccount.address;
              }
            }
          } catch (privyError) {
            console.warn(
              "Could not fetch user from Privy, using email from request:",
              privyError
            );
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
          const existingUserByEmail = await User.findOne({
            email: userEmail.toLowerCase().trim(),
          });

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
                email: userEmail.toLowerCase().trim(),
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
                userRecord = await User.findOne({
                  $or: [
                    { privyUserId: privyUserId },
                    { email: userEmail.toLowerCase().trim() },
                  ],
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

        // Generate JWT token using the privyUserId we extracted
        const token = generateToken(privyUserId);
        setTokenCookie(res, token);

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
            token,
          },
        });
      } catch (verifyError) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token",
          error: verifyError.message,
        });
      }
    }

    // Find user by email in our database
    const userRecord = await User.findOne({
      email: email.toLowerCase().trim(),
    });
    if (!userRecord) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please sign up first.",
      });
    }

    // Check if user has privyUserId
    if (!userRecord.privyUserId) {
      return res.status(500).json({
        success: false,
        message: "User record is missing Privy user ID. Please sign up again.",
        error: "Missing privyUserId in user record",
      });
    }

    // Generate JWT token with Privy user ID
    // We trust our database record since user was created in Privy during signup
    const token = generateToken(userRecord.privyUserId);
    setTokenCookie(res, token);

    return res.status(200).json({
      success: true,
      message: "Signed in successfully",
      data: {
        user: {
          id: userRecord.privyUserId,
          email: userRecord.email,
          name: userRecord.name || "",
          walletAddress: userRecord.walletAddress || null,
          createdAt: userRecord.createdAt,
        },
        token,
      },
    });
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
    // req.user should be set by middleware after verifying JWT token
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
      sameSite: "lax",
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
