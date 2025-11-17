import express from "express";
import passport from "passport";
import {
  signup,
  signin,
  getMe,
  signout,
} from "../controllers/authController.js";
import { googleCallback } from "../controllers/googleAuthController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.post("/signup", signup);
router.post("/signin", signin);

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  (req, res, next) => {
    console.log("🔵 Google OAuth callback received");
    console.log("Query params:", req.query);
    console.log(
      "Callback URL configured:",
      process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:4000/api/auth/google/callback"
    );
    next();
  },
  (req, res, next) => {
    passport.authenticate(
      "google",
      {
        session: false,
        failureRedirect: `${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }/sign-in?error=authentication_failed`,
      },
      (err, user, info) => {
        if (err) {
          console.error("❌ Passport authentication error:", err);
          console.error("Error details:", {
            message: err.message,
            stack: err.stack,
            name: err.name,
            code: err.code,
          });
          const frontendUrl =
            process.env.FRONTEND_URL || "http://localhost:3000";
          return res.redirect(
            `${frontendUrl}/sign-in?error=authentication_failed`
          );
        }
        if (!user) {
          console.error("❌ Passport authentication failed - no user returned");
          console.error("Info:", info);
          const frontendUrl =
            process.env.FRONTEND_URL || "http://localhost:3000";
          return res.redirect(
            `${frontendUrl}/sign-in?error=authentication_failed`
          );
        }
        req.user = user;
        next();
      }
    )(req, res, next);
  },
  googleCallback
);

// Protected routes
router.get("/me", protect, getMe);
router.post("/signout", protect, signout);

export default router;
