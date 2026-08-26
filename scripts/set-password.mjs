// 修改 Supabase users 表中 admin 用户的密码
// 用法：npm run set-password -- "新密码"（不传参数时会交互式输入）
import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import readline from "node:readline/promises";

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, KEY_LENGTH, {
    N,
    r: R,
    p: P,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${N}$${R}$${P}$${salt}$${derived.toString("hex")}`;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "缺少环境变量。请先复制 .env.example 为 .env，并填写 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY。"
  );
  process.exit(1);
}

let password = process.argv[2];
if (!password) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question("请输入新密码: ");
  rl.close();
}

if (!password) {
  console.error("密码不能为空");
  process.exit(1);
}

const client = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

const { data, error } = await client
  .from("users")
  .update({ password_hash: hashPassword(password) })
  .eq("username", "admin")
  .select("id, username");

if (error) {
  console.error("更新失败:", error.message);
  process.exit(1);
}

if (!data || data.length === 0) {
  console.error(
    "未找到 admin 用户，请先在 Supabase 的 SQL Editor 中执行 supabase/schema.sql 建表。"
  );
  process.exit(1);
}

console.log(`密码更新成功 ✅（用户：${data[0].username}）`);
