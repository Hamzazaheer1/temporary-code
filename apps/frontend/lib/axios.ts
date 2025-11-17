import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type AccessTokenFetcher = () => Promise<string | null>;

let accessTokenFetcher: AccessTokenFetcher | null = null;

export const setAccessTokenFetcher = (fetcher: AccessTokenFetcher | null) => {
  accessTokenFetcher = fetcher;
};

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    if (config.headers?.Authorization) {
      return config;
    }

    if (accessTokenFetcher) {
      try {
        const token = await accessTokenFetcher();
        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Failed to retrieve Privy access token", error);
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      const message = error.response.data?.message || "An error occurred";
      const enrichedError = new Error(message);
      (enrichedError as any).response = error.response;
      return Promise.reject(enrichedError);
    }

    if (error.request) {
      return Promise.reject(
        new Error("Network error. Please check your connection.")
      );
    }

    return Promise.reject(error);
  }
);

export default apiClient;
