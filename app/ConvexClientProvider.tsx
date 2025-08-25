"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ReactNode, useEffect, useState } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [convex, setConvex] = useState<ConvexReactClient | null>(null);

  useEffect(() => {
    // Initialize Convex client on the client side only
    const convexUrl = process.env.SITE_URL;
    if (convexUrl && typeof window !== "undefined") {
      setConvex(new ConvexReactClient(convexUrl));
    }
  }, []);

  if (!convex) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}
