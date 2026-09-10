import { createClient } from "@supabase/supabase-js";

// Admin client — uses service role key, ONLY used in API routes (server-side)
// Never expose this key to the browser!
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
