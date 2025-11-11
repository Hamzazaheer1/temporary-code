"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, User } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuth as useAuthContext } from "@/contexts/AuthContext";

// Query key factory
export const authKeys = {
  all: ["auth"] as const,
  user: () => [...authKeys.all, "user"] as const,
};

// Get current user query
export function useGetMe() {
  const { token } = useAuthContext();

  return useQuery({
    queryKey: authKeys.user(),
    queryFn: async () => {
      if (!token) {
        throw new Error("No token available");
      }
      const response = await authApi.getMe(token);
      return response.data.user;
    },
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Sign up mutation
export function useSignup() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { signup } = useAuthContext();

  return useMutation({
    mutationFn: ({ email, name }: { email: string; name?: string }) =>
      signup(email, name),
    onSuccess: () => {
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: authKeys.user() });
      // Redirect to dashboard
      router.push("/");
    },
  });
}

// Sign in mutation
export function useSignin() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { signin } = useAuthContext();

  return useMutation({
    mutationFn: ({
      email,
      privyToken = "",
      name,
    }: {
      email: string;
      privyToken?: string;
      name?: string;
    }) => signin(email, privyToken, name),
    onSuccess: () => {
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: authKeys.user() });
      // Redirect to dashboard
      router.push("/");
    },
  });
}

// Sign out mutation
export function useSignout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { signout } = useAuthContext();

  return useMutation({
    mutationFn: () => signout(),
    onSuccess: () => {
      // Clear user data from cache
      queryClient.setQueryData<User | null>(authKeys.user(), null);
      // Remove all queries
      queryClient.clear();
      // Redirect to sign in
      router.push("/sign-in");
    },
  });
}
