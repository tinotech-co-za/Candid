"use client";

import { ConvexClientProvider } from "./ConvexClientProvider";
import { Toaster } from "sonner";
import { ReactNode } from "react";

export function ClientWrapper({ children }: { children: ReactNode }) {
  return (
    <ConvexClientProvider>
      {children}
      <Toaster />
    </ConvexClientProvider>
  );
}
