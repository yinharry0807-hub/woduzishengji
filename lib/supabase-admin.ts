import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * 服务端专用的 Supabase 客户端（Service Role Key）。
 * 只能被 Server Action / Route Handler 使用，绝不能引入客户端组件。
 * Service Role Key 可以绕过 RLS，因此仅用于受控的服务端操作。
 */
export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "缺少 Supabase 环境变量，请先按照 .env.example 配置 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY。"
    );
  }
  client ??= createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return client;
}
