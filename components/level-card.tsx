type LevelCardProps = {
  level: number;
  title: string;
  totalXp: number;
  xpIntoLevel: number;
  xpToNext: number;
  progress: number;
  isMaxLevel: boolean;
};

export default function LevelCard({
  level,
  title,
  totalXp,
  xpIntoLevel,
  xpToNext,
  progress,
  isMaxLevel,
}: LevelCardProps) {
  const percent = isMaxLevel ? 100 : Math.min(100, Math.round(progress * 100));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percent / 100);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="flex items-center gap-5">
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="url(#xpGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
            <defs>
              <linearGradient id="xpGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#d946ef" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold leading-none">Lv.{level}</span>
            <span className="mt-1 text-[10px] text-zinc-400">{title}</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs text-zinc-400">当前等级</p>
          <p className="mt-0.5 text-xl font-bold">
            Lv.{level}{" "}
            <span className="text-sm font-medium text-zinc-400">{title}</span>
          </p>
          <p className="mt-2 text-xs text-zinc-400">
            总经验{" "}
            <span className="font-semibold text-violet-300">
              {totalXp.toLocaleString("zh-CN")}
            </span>{" "}
            XP
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {isMaxLevel
              ? "已满级，传奇之路继续"
              : `距 Lv.${level + 1} 还差 ${xpToNext.toLocaleString("zh-CN")} XP`}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
