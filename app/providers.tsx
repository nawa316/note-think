"use client";

// No session providers needed — Supabase handles sessions via cookies
export default function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
