"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { usePrivy } from "@privy-io/react-auth";
import { authApi, User } from "@/lib/api";
import { setAccessTokenFetcher } from "@/lib/axios";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  signup: (email: string, name?: string) => Promise<void>;
  signin: (email: string, privyToken: string, name?: string) => Promise<void>;
  signout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    ready,
    authenticated: privyAuthenticated,
    getAccessToken,
    logout,
  } = usePrivy();

  useEffect(() => {
    setAccessTokenFetcher(getAccessToken);
    return () => setAccessTokenFetcher(null);
  }, [getAccessToken]);

  const fetchUser = useCallback(async () => {
    if (!ready) {
      return;
    }

    if (!privyAuthenticated) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.getMe();
      setUser(response.data.user);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) {
        setUser(null);
      } else {
        console.error("Auth fetch failed:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [privyAuthenticated, ready]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    fetchUser();
  }, [fetchUser, ready]);

  const signup = async (email: string, name?: string) => {
    try {
      await authApi.signup(email, name);
      await fetchUser();
    } catch (error: any) {
      throw error;
    }
  };

  const signin = async (email: string, privyToken: string, name?: string) => {
    try {
      await authApi.signin(email, privyToken, name);
      await fetchUser();
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
      try {
        await logout();
      } catch (privyError) {
        console.error("Error logging out of Privy:", privyError);
      }
      setUser(null);
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authenticated: !!user,
        signup,
        signin,
        signout,
        refreshUser,
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
