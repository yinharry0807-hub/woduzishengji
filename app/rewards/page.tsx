import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getRewardsData, getAchievementsData } from "@/lib/queries";
import { SAVINGS_TARGET } from "@/lib/queries";
import ToolPageHeader from "@/components/tool-page-header";
import DataError from "@/components/data-error";

export const metadata = {
  title: "奖励与成就",
};

function formatMoney(value: number): string {
  return "¥" + value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

export default async function RewardsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [data, achievements] = await Promise.all([
    getRewardsData(session.userId),
    getAchievementsData(session.userId),
  ]);
  if ("error" in data) return <DataError message={data.error} />;
  const badgeItems = !("error" in achievements) ? achievements.items : [];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-6 sm:py-10">
      <ToolPageHeader title="奖励与成就" />

      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
        <p className="text-sm font-semibold text-rose-200">🚨 奖励红线</p>
        <p className="mt-1 text-xs leading-relaxed text-rose-300/90">
          所有奖励一律不得动用强制储蓄，只能从生活费结余里支出。存进「强制储蓄」的钱就是不可动的底仓。
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-base font-semibold">体验型奖励</h2>
        <div className="mt-3 space-y-3">
          <RewardRow
            title="连续打卡 7 天"
            reward="解锁一顿好饭（预算 ≤ ¥50）"
            progress={data.streak}
            target={7}
          />
          <RewardRow
            title="连续打卡 21 天"
            reward="解锁一件小东西（预算 ≤ ¥100）"
            progress={data.streak}
            target={21}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-base font-semibold">里程碑大奖</h2>
        <div className="mt-3 space-y-3">
          <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span>存款破万</span>
              <span className="text-xs text-emerald-300">
                {formatMoney(data.savingsTotal)} / {formatMoney(SAVINGS_TARGET)}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                style={{ width: `${data.savingsPercent}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">
              达标后进入特殊成就页
            </p>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm">
            <span>拿到 Offer</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs ${
                data.offerUnlocked
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-white/10 text-zinc-400"
              }`}
            >
              {data.offerUnlocked ? "已达成 🎉" : "未达成"}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">解锁型奖励</h2>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-zinc-300">
            {data.badgeUnlockedCount}/{data.badgeTotal}
          </span>
        </div>
        <p className="text-xs text-zinc-500">
          当前 Lv.{data.level} {data.levelTitle} · 升级解锁称号，徽章全部免费
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="mb-3 text-base font-semibold">成就徽章墙</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {badgeItems.map((item) => (
            <div
              key={item.code}
              className={`rounded-xl border px-2 py-3 text-center ${
                item.unlocked
                  ? `border-violet-400/30 bg-violet-500/10 ${item.newly ? "animate-unlock animate-glow" : ""}`
                  : "border-white/5 bg-white/[0.02] opacity-45"
              }`}
            >
              <span className="text-2xl">{item.emoji}</span>
              <p className="mt-1 text-[11px] font-medium leading-tight">
                {item.title}
              </p>
              <p className="mt-0.5 text-[10px] leading-tight text-zinc-500">
                {item.unlocked ? "已解锁" : "未解锁"}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          达成条件自动检测，解锁时会有动画提示；成就永久保留，断签不影响。
        </p>
      </section>

      <footer className="mt-2 text-center text-xs text-zinc-600">
        奖励与容错 · 第六阶段
      </footer>
    </main>
  );
}

function RewardRow({
  title,
  reward,
  progress,
  target,
}: {
  title: string;
  reward: string;
  progress: number;
  target: number;
}) {
  const percent = Math.min(100, Math.round((progress / target) * 100));
  const unlocked = progress >= target;
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
      <div className="flex items-center justify-between text-sm">
        <span>{title}</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs ${
            unlocked
              ? "bg-amber-500/20 text-amber-300"
              : "bg-white/10 text-zinc-400"
          }`}
        >
          {unlocked ? "已解锁 🎉" : `${progress}/${target} 天`}
        </span>
      </div>
      <p className="mt-1 text-xs text-zinc-500">{reward}</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
