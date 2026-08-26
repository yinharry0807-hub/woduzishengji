import { SAVINGS_TARGET } from "@/lib/queries";

type SavingsCardProps = {
  totalSaved: number;
  percent: number;
  unavailable: boolean;
};

function formatAmount(value: number): string {
  return "¥" + value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

export default function SavingsCard({
  totalSaved,
  percent,
  unavailable,
}: SavingsCardProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">存款进度</h2>
        <span className="text-xs font-medium text-emerald-300">
          {unavailable ? "--" : `${percent}%`}
        </span>
      </div>

      {unavailable ? (
        <p className="py-2 text-sm text-zinc-500">
          执行更新后的 schema.sql 后显示真实存款进度
        </p>
      ) : (
        <>
          <p className="text-2xl font-bold tracking-tight">
            {formatAmount(totalSaved)}
            <span className="text-sm font-normal text-zinc-500">
              {" "}
              / {formatAmount(SAVINGS_TARGET)}
            </span>
          </p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            存款 = 各月「强制储蓄」累计 · 距离目标还差{" "}
            {formatAmount(Math.max(0, SAVINGS_TARGET - totalSaved))}
          </p>
        </>
      )}
    </section>
  );
}
