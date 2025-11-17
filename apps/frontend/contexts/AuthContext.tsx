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
import apiClient from "@/lib/axios";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  signup: (email: string, name?: string) => Promise<void>;
  signin: (email: string, privyToken: string, name?: string) => Promise<void>;
  signout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setToken: (token: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const TOKEN_STORAGE_KEY = "auth_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken) {
      setAuthToken(storedToken);
      apiClient.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
    }
  }, []);

  const fetchUser = useCallback(async () => {
    if (!ready && !authToken) {
      return;
    }

    if (!privyAuthenticated && !authToken) {
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
  }, [authToken, privyAuthenticated, ready]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const setToken = useCallback(
    async (token: string | null) => {
      if (typeof window !== "undefined") {
        if (token) {
          window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
          apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
        } else {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
          delete apiClient.defaults.headers.common.Authorization;
        }
      }
      setAuthToken(token);

      if (token) {
        await fetchUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    },
    [fetchUser]
  );

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
      const response = await authApi.signin(email, privyToken, name);
      const token = response.data?.token;
      if (token) {
        await setToken(token);
      } else {
        await fetchUser();
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
      await setToken(null);
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
        setToken,
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
