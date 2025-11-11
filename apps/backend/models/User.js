import mongoose from "mongoose";

// This model stores the mapping between email and Privy user ID
// Since Privy doesn't have a "find by email" API, we store it here
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    privyUserId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      trim: true,
    },
    walletAddress: {
      type: String,
      trim: true,
      lowercase: true,
    },
    walletId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
