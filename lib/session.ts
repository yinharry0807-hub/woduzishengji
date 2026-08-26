import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "ggs_session";
const SESSION_DAYS = 30;

export type Session = {
  userId: string;
  username: string;
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET 未配置或太短，请参考 .env.example 生成一长串随机字符串。"
    );
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/** 生成带签名的会话令牌：base64(payload).signature */
function buildToken(session: Session): string {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(
    JSON.stringify({ uid: session.userId, u: session.username, exp })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** 校验并解析会话令牌，无效返回 null */
export function parseToken(token: string | undefined): Session | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      uid: string;
      u: string;
      exp: number;
    };
    if (typeof data.uid !== "string" || typeof data.u !== "string") return null;
    if (!data.exp || data.exp < Date.now()) return null;
    return { userId: data.uid, username: data.u };
  } catch {
    return null;
  }
}

/** 在 Server Component / Server Action 中读取当前会话 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  return parseToken(cookieStore.get(COOKIE_NAME)?.value);
}

/** 登录成功后写入会话 Cookie */
export async function createSession(session: Session): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, buildToken(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

/** 退出登录 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
