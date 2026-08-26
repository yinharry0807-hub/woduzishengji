"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveFinance } from "@/lib/actions";
import type { FinanceMonth } from "@/lib/queries";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20";

function formatMoney(value: number): string {
  return "¥" + value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

export default function FinanceTracker({
  currentMonth,
  months,
  totalSaved,
  percent,
}: {
  currentMonth: string;
  months: FinanceMonth[];
  totalSaved: number;
  percent: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await saveFinance(new FormData(e.currentTarget));
    if (result?.error) {
      setError(result.error);
      setSaving(false);
      return;
    }
    router.refresh();
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">存款进度</h2>
          <span className="text-xs font-medium text-emerald-300">
            {percent}%
          </span>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight">
          {formatMoney(totalSaved)}
          <span className="text-sm font-normal text-zinc-500">
            {" "}
            / {formatMoney(15000)} 目标
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
          {formatMoney(Math.max(0, 15000 - totalSaved))}
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="mb-4 text-base font-semibold">记录本月财务</h2>
        {error && (
          <p className="mb-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
            {error}
          </p>
        )}
        <form onSubmit={handleSave} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs text-zinc-400">月份</span>
            <input
              type="month"
              name="month"
              defaultValue={currentMonth}
              required
              className={inputClass}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-400">收入（元）</span>
              <input
                type="number"
                name="income"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-400">
                强制储蓄（元）
              </span>
              <input
                type="number"
                name="forced_savings"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-400">生活费（元）</span>
              <input
                type="number"
                name="living_expense"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-400">
                副业收入（元）
              </span>
              <input
                type="number"
                name="side_income"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                className={inputClass}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "保存中…" : "保存"}
          </button>
        </form>
      </section>

      {months.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="mb-3 text-base font-semibold">历史记录</h2>
          <ul className="space-y-2.5">
            {months.map((item) => (
              <li
                key={item.month}
                className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.month}</span>
                  <span className="text-xs text-zinc-500">
                    净结余{" "}
                    {formatMoney(
                      item.income + item.sideIncome - item.livingExpense
                    )}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                  收入 {formatMoney(item.income)} · 储蓄{" "}
                  {formatMoney(item.forcedSavings)} · 生活{" "}
                  {formatMoney(item.livingExpense)} · 副业{" "}
                  {formatMoney(item.sideIncome)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
