import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginForm from "./login-form";

export const metadata = {
  title: "登录",
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-3xl shadow-glow">
          ⚡
        </div>
        <h1 className="text-2xl font-bold tracking-wide">个人成长系统</h1>
        <p className="mt-2 text-sm text-zinc-400">
          输入密码，进入你的成长世界
        </p>
      </div>

      <LoginForm />

      <p className="mt-8 text-center text-xs text-zinc-600">
        仅限本人使用 · 无需注册
      </p>
    </main>
  );
}
