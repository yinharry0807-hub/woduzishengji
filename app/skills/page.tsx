import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { logout } from "@/lib/actions";
import { getSkillTree } from "@/lib/queries";
import SkillTree from "@/components/skill-tree";
import { ChevronLeftIcon, LogOutIcon } from "@/components/icons";

export const metadata = {
  title: "技能树",
};

export default async function SkillsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getSkillTree(session.userId);
  if ("error" in data) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6">
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-center">
          <p className="text-sm text-rose-300">{data.error}</p>
          <p className="mt-2 text-xs text-zinc-500">
            参见 README「更新数据库」部分
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-6 sm:py-10">
      <header className="flex items-center justify-between gap-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-zinc-300 transition hover:border-violet-400/40 hover:text-violet-300"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" />
          仪表盘
        </Link>
        <h1 className="text-lg font-bold">技能树</h1>
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

      <p className="text-xs text-zinc-500">
        拖动滑块或点 +/- 调整技能进度；自动关联任务将在后续版本上线
      </p>

      <SkillTree branches={data.branches} />

      <footer className="mt-2 text-center text-xs text-zinc-600">
        技能树 · 第三阶段
      </footer>
    </main>
  );
}
