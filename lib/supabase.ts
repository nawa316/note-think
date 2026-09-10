import { createBrowserClient } from "@supabase/ssr";

// Browser client — uses @supabase/ssr's createBrowserClient which stores
// the session in cookies (not localStorage), so the server-side proxy
// middleware can read it and correctly protect routes.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
