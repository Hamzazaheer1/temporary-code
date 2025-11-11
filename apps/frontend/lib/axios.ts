import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add token from localStorage if available and not already set
    // This ensures token is always sent with requests
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("privy_token");
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Handle common errors
    if (error.response) {
      // If token is invalid/expired (401), clear it
      if (error.response.status === 401) {
        localStorage.removeItem("privy_token");
      }
      // Server responded with error status
      const message = error.response.data?.message || "An error occurred";
      return Promise.reject(new Error(message));
    } else if (error.request) {
      // Request made but no response received
      return Promise.reject(
        new Error("Network error. Please check your connection.")
      );
    } else {
      // Something else happened
      return Promise.reject(error);
    }
  }
);

export default apiClient;
