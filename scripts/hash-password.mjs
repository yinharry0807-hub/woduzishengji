// 生成与 lib/password.ts 相同格式的 scrypt 密码哈希
// 用法：node scripts/hash-password.mjs "你的密码"
import { randomBytes, scryptSync } from "node:crypto";

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

const password = process.argv[2];
if (!password) {
  console.error("用法: node scripts/hash-password.mjs <你的密码>");
  process.exit(1);
}

console.log(hashPassword(password));
