import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { logout } from "@/lib/actions";
import {
  getDashboardData,
  getSavingsSummary,
  getCurrentMonthReviewStatus,
  getAchievementsData,
  getAdvisorContext,
} from "@/lib/queries";
import { getLevelInfo } from "@/lib/levels";
import LevelCard from "@/components/level-card";
import StreakPanel from "@/components/streak-panel";
import TaskSection from "@/components/task-section";
import SavingsCard from "@/components/savings-card";
import ToolGrid from "@/components/tool-grid";
import { LogOutIcon } from "@/components/icons";

export const metadata = {
  title: "仪表盘",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [data, savings, reviewStatus, achievements, advisor] =
    await Promise.all([
      getDashboardData(session.userId),
      getSavingsSummary(session.userId),
      getCurrentMonthReviewStatus(session.userId),
      getAchievementsData(session.userId),
      getAdvisorContext(session.userId),
    ]);
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

  const levelInfo = getLevelInfo(data.totalXp);
  const daily = data.tasks.filter((task) => task.category === "daily");
  const weekly = data.tasks.filter((task) => task.category === "weekly");
  const milestone = data.tasks.filter((task) => task.category === "milestone");
  const dailyDone = daily.filter((task) => task.done).length;
  const weeklyDone = weekly.filter((task) => task.done).length;
  const milestoneDone = milestone.filter((task) => task.done).length;
  const showReviewReminder =
    reviewStatus.filled === false && !("unavailable" in reviewStatus);
  const newlyUnlocked =
    !("error" in achievements) ? achievements.newlyUnlocked : [];
  const advisorIssues =
    !("error" in advisor) && (advisor.brokenStreak || advisor.stuckSkills.length > 0);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-6 sm:py-10">
      <header className="mb-1 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">个人成长系统</h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            今天也要加油，{session.username}
          </p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 transition hover:border-rose-400/40 hover:text-rose-300"
          >
            <LogOutIcon />
            退出
          </button>
        </form>
      </header>

      {newlyUnlocked.length > 0 && (
        <div className="animate-unlock rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4 text-center">
          <p className="text-sm font-semibold text-violet-200">
            🎉 新成就解锁
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {newlyUnlocked.map((item) => (
              <span
                key={item.code}
                className="rounded-full bg-violet-500/20 px-3 py-1 text-xs text-violet-100"
              >
                {item.emoji} {item.title}
              </span>
            ))}
          </div>
          <Link
            href="/rewards"
            className="mt-2 inline-block text-xs text-violet-300 underline"
          >
            查看徽章墙
          </Link>
        </div>
      )}

      {showReviewReminder && (
        <Link
          href="/review"
          className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3"
        >
          <span className="text-xl">⏰</span>
          <p className="text-sm text-amber-200">
            本月止损三问还没填写，点此进入复盘
          </p>
        </Link>
      )}

      {advisorIssues && (
        <Link
          href="/advisor"
          className="flex items-center gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3"
        >
          <span className="text-xl">🤖</span>
          <p className="text-sm text-sky-200">
            顾问检测到你的状态有变化，点此听听它的建议
          </p>
        </Link>
      )}

      <ToolGrid />

      <LevelCard
        level={levelInfo.current.level}
        title={levelInfo.current.title}
        totalXp={levelInfo.totalXp}
        xpIntoLevel={levelInfo.xpIntoLevel}
        xpToNext={levelInfo.xpToNext}
        progress={levelInfo.progress}
        isMaxLevel={levelInfo.isMaxLevel}
      />

      <StreakPanel
        days={data.streak}
        checkedInToday={data.checkedInToday}
        restToday={data.restToday}
        hasHistory={data.hasHistory}
      />

      <TaskSection
        title="每日任务"
        hint={
          data.restToday
            ? "今天休息，明天满血继续"
            : dailyDone < daily.length
              ? "今天休息也是合理的，明天继续"
              : "全部完成，太棒了！"
        }
        count={`${dailyDone}/${daily.length}`}
        tasks={daily}
        accent="violet"
      />

      <TaskSection
        title="每周任务"
        hint="每周一重置"
        count={`${weeklyDone}/${weekly.length}`}
        tasks={weekly}
        accent="emerald"
      />

      <TaskSection
        title="里程碑任务"
        hint="一次性任务，完成后永久保留"
        count={`${milestoneDone}/${milestone.length}`}
        tasks={milestone}
        accent="amber"
      />

      <SavingsCard
        totalSaved={savings.totalSaved}
        percent={savings.percent}
        unavailable={savings.unavailable}
      />

      <footer className="mt-2 text-center text-xs text-zinc-600">
        第五~七阶段 · 职业规划 / 复盘 / 奖励 / AI顾问已上线
      </footer>
    </main>
  );
}
