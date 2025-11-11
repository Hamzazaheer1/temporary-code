"use client";

import { useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "@/components/Dashboard";

function HomeContent() {
  const { user, loading, authenticated, setToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenProcessedRef = useRef(false);
  const processingTokenRef = useRef(false);

  // Handle OAuth callback with token
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      if (!tokenProcessedRef.current) {
        // Mark as processed to prevent re-running
        tokenProcessedRef.current = true;
        processingTokenRef.current = true;
        // Set token from OAuth callback (this will trigger checkAuth)
        setToken(token)
          .then(() => {
            // Remove token from URL after token is set
            router.replace("/");
          })
          .catch((error) => {
            console.error("Error setting token from OAuth callback:", error);
            // Still remove token from URL even on error
            router.replace("/");
          })
          .finally(() => {
            processingTokenRef.current = false;
          });
      }
    } else {
      // Reset ref when token is no longer in URL (allows processing new tokens)
      tokenProcessedRef.current = false;
      processingTokenRef.current = false;
    }
  }, [searchParams, router, setToken]); // Keep setToken but use ref to prevent loops

  useEffect(() => {
    // Don't redirect if we're still processing a token from OAuth callback
    if (!loading && !authenticated && !processingTokenRef.current) {
      router.push("/sign-in");
    }
  }, [authenticated, loading, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-dvh">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated || !user) {
    return null; // Will redirect to sign-in
  }

  return <Dashboard />;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-dvh">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
