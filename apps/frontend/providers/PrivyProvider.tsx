"use client";

import { PrivyProvider as PrivyProviderBase } from "@privy-io/react-auth";
import { ReactNode } from "react";

export function PrivyProvider({ children }: { children: ReactNode }) {
  // Get app ID from environment variable
  // In Next.js, NEXT_PUBLIC_ variables are available at build time
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    console.error(
      "NEXT_PUBLIC_PRIVY_APP_ID is not set. Please add it to your .env.local file."
    );
    // Still render children but Privy hooks will fail with a clear error
    return <>{children}</>;
  }

  return (
    <PrivyProviderBase
      appId={appId}
      config={{
        loginMethods: ["email"],
        appearance: {
          theme: "light",
          accentColor: "#5f2dc4",
        },
      }}
    >
      {children}
    </PrivyProviderBase>
  );
}
