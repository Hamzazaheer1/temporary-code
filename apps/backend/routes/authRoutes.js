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
  passport.authenticate("google", {
    session: false, // We're using JWT, not sessions
    failureRedirect: `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/sign-in?error=authentication_failed`,
  }),
  googleCallback
);

// Protected routes
router.get("/me", protect, getMe);
router.post("/signout", protect, signout);

export default router;
