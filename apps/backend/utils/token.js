import jwt from "jsonwebtoken";

export const generateToken = (privyUserId) => {
  if (!privyUserId) {
    throw new Error("Cannot generate token without privyUserId");
  }

  return jwt.sign({ privyUserId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

export const setTokenCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };

  res.cookie("token", token, cookieOptions);
  res.cookie("privy-token", token, cookieOptions);
};
