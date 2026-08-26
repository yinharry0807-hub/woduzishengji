import Link from "next/link";
import { logout } from "@/lib/actions";
import { ChevronLeftIcon, LogOutIcon } from "@/components/icons";

export default function ToolPageHeader({ title }: { title: string }) {
  return (
    <header className="flex items-center justify-between gap-2">
      <Link
        href="/dashboard"
        className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-zinc-300 transition hover:border-violet-400/40 hover:text-violet-300"
      >
        <ChevronLeftIcon className="h-3.5 w-3.5" />
        仪表盘
      </Link>
      <h1 className="text-lg font-bold">{title}</h1>
      <form action={logout}>
        <button
          type="submit"
          className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-zinc-300 transition hover:border-rose-400/40 hover:text-rose-300"
        >
          <LogOutIcon />
          退出
        </button>
      </form>
    </header>
  );
}
