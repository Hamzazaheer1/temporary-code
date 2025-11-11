"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { authApi, User } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  token: string | null;
  signup: (email: string, name?: string) => Promise<void>;
  signin: (email: string, privyToken?: string, name?: string) => Promise<void>;
  signout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setToken: (token: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load token from localStorage on mount
  useEffect(() => {
    const validateAndLoadToken = async () => {
      const storedToken = localStorage.getItem("privy_token");
      if (storedToken) {
        // Validate token structure before using it
        try {
          // Basic JWT structure check - should have 3 parts separated by dots
          const parts = storedToken.split(".");
          if (parts.length !== 3) {
            console.warn("Invalid token format, clearing...");
            localStorage.removeItem("privy_token");
            setLoading(false);
            return;
          }
          // Decode payload to check if it has privyUserId (without verification)
          const payload = JSON.parse(atob(parts[1]));
          if (!payload.privyUserId) {
            console.warn(
              "Token missing privyUserId, clearing old/invalid token..."
            );
            localStorage.removeItem("privy_token");
            // Also clear cookies by calling signout endpoint
            // This ensures both localStorage and cookies are cleared
            try {
              await authApi.signout();
            } catch (e) {
              // Ignore signout errors
            }
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn("Error checking token structure, clearing...", e);
          localStorage.removeItem("privy_token");
          setLoading(false);
          return;
        }
        setToken(storedToken);
        checkAuth(storedToken);
      } else {
        setLoading(false);
      }
    };

    validateAndLoadToken();
  }, []);

  const checkAuth = async (authToken?: string) => {
    const tokenToUse = authToken || token;
    if (!tokenToUse) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      // Try to get user data from backend
      // Backend will verify token (either Privy access token or our custom JWT)
      const response = await authApi.getMe(tokenToUse);
      setUser(response.data.user);
      // Token is valid, keep it
      if (tokenToUse && tokenToUse !== token) {
        setToken(tokenToUse);
        localStorage.setItem("privy_token", tokenToUse);
      }
    } catch (error: any) {
      // Token invalid or expired, clear it
      console.error("Auth check failed:", error?.message || error);
      // Only clear token if it's actually an auth error (401)
      if (error?.response?.status === 401 || error?.message?.includes("401")) {
        setToken(null);
        setUser(null);
        localStorage.removeItem("privy_token");
      }
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, name?: string) => {
    try {
      const response = await authApi.signup(email, name);
      // Backend creates user in Privy and returns user data
      setUser(response.data.user);
      // If backend returns a token, store it
      if (response.data.token) {
        setToken(response.data.token);
        localStorage.setItem("privy_token", response.data.token);
      }
    } catch (error: any) {
      throw error;
    }
  };

  const signin = async (email: string, privyToken?: string, name?: string) => {
    try {
      const response = await authApi.signin(email, privyToken, name);
      setUser(response.data.user);
      if (response.data.token) {
        setToken(response.data.token);
        localStorage.setItem("privy_token", response.data.token);
      }
    } catch (error: any) {
      throw error;
    }
  };

  const signout = async () => {
    try {
      await authApi.signout();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem("privy_token");
    }
  };

  const refreshUser = async () => {
    if (token) {
      await checkAuth(token);
    }
  };

  const handleSetToken = async (newToken: string | null) => {
    setToken(newToken);
    if (newToken) {
      localStorage.setItem("privy_token", newToken);
      setLoading(true); // Set loading while checking auth
      await checkAuth(newToken);
    } else {
      localStorage.removeItem("privy_token");
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authenticated: !!user && !!token,
        token,
        signup,
        signin,
        signout,
        refreshUser,
        setToken: handleSetToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
