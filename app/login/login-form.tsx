"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/actions";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-zinc-300">密码</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          placeholder="请输入密码"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder-zinc-500 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/20"
        />
      </label>

      {state.error && (
        <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-base font-semibold text-white shadow-glow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "登录中…" : "进入系统"}
      </button>
    </form>
  );
}
