import apiClient from "./axios";

export interface User {
  id: string;
  email: string;
  name: string;
  walletAddress?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    wallet?: {
      id: string;
      address: string;
      chain_type: string;
    };
    token?: string;
  };
}

export interface MeResponse {
  success: boolean;
  data: {
    user: User;
  };
}

// Auth API functions using axios - calling our backend Privy APIs
export const authApi = {
  signup: async (email: string, name?: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/api/auth/signup", {
      email,
      name,
    });
    return response.data;
  },

  signin: async (
    email: string,
    privyToken?: string,
    name?: string
  ): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/api/auth/signin", {
      email,
      privyToken: privyToken || undefined,
      name: name || undefined,
    });
    return response.data;
  },

  getMe: async (token?: string): Promise<MeResponse> => {
    // If token is provided, use it; otherwise axios interceptor will add it from localStorage
    const config = token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : {}; // Empty config - axios interceptor will handle it

    const response = await apiClient.get<MeResponse>("/api/auth/me", config);
    return response.data;
  },

  signout: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post("/api/auth/signout");
    return response.data;
  },
};
