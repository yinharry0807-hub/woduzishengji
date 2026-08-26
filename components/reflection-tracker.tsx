"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveReflection } from "@/lib/actions";
import type { ReflectionData } from "@/lib/queries";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/20";

export default function ReflectionTracker({ data }: { data: ReflectionData }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await saveReflection(new FormData(e.currentTarget));
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
      {error && (
        <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">每晚3分钟收尾</h2>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-zinc-300">
            三行必填
          </span>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          <input type="hidden" name="type" value="daily" />
          <label className="block">
            <span className="mb-1.5 block text-xs text-zinc-400">日期</span>
            <input
              type="date"
              name="date_key"
              defaultValue={data.todayKey}
              required
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-300">
              1. 今天我要回来了一件什么事？
            </span>
            <textarea
              name="q1"
              rows={2}
              maxLength={500}
              required
              defaultValue={data.todayDaily?.q1 ?? ""}
              placeholder="哪怕很小，也写下来…"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-300">
              2. 今天我又「算了」一件事，下次怎么办？
            </span>
            <textarea
              name="q2"
              rows={2}
              maxLength={500}
              required
              defaultValue={data.todayDaily?.q2 ?? ""}
              placeholder="诚实记录，然后写下下次的应对…"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-300">
              3. 明天我要做的一个最小动作是什么？
            </span>
            <textarea
              name="q3"
              rows={2}
              maxLength={500}
              required
              defaultValue={data.todayDaily?.q3 ?? ""}
              placeholder="小到不可能失败的动作…"
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "保存中…" : data.todayDaily ? "更新今日收尾" : "保存今日收尾"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">周日复盘</h2>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-zinc-300">
            本周（自 {data.weekKey}）
          </span>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          <input type="hidden" name="type" value="weekly" />
          <input type="hidden" name="date_key" value={data.weekKey} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-300">
              本周数据总结
            </span>
            <textarea
              name="q1"
              rows={3}
              maxLength={500}
              required
              defaultValue={data.thisWeek?.q1 ?? ""}
              placeholder="打卡几次、投了几份简历、存了多少钱、算了/要回来了什么…"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-300">
              下周计划
            </span>
            <textarea
              name="q2"
              rows={3}
              maxLength={500}
              required
              defaultValue={data.thisWeek?.q2 ?? ""}
              placeholder="3 个以内最重要的事…"
              className={inputClass}
            />
          </label>
          <input type="hidden" name="q3" value="每周复盘" />
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "保存中…" : data.thisWeek ? "更新本周复盘" : "保存本周复盘"}
          </button>
        </form>
      </section>

      {data.dailyHistory.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="mb-3 text-base font-semibold">近期收尾记录</h2>
          <ul className="space-y-2.5">
            {data.dailyHistory.map((entry) => (
              <li
                key={`daily-${entry.dateKey}`}
                className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
              >
                <p className="text-xs text-zinc-500">{entry.dateKey}</p>
                <div className="mt-1 space-y-1 text-xs leading-relaxed text-zinc-400">
                  <p>要回来了：{entry.q1}</p>
                  <p>算了：{entry.q2}</p>
                  <p>明天最小动作：{entry.q3}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.weeklyHistory.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="mb-3 text-base font-semibold">历史周复盘</h2>
          <ul className="space-y-2.5">
            {data.weeklyHistory.map((entry) => (
              <li
                key={`weekly-${entry.dateKey}`}
                className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
              >
                <p className="text-xs text-zinc-500">周起 {entry.dateKey}</p>
                <div className="mt-1 space-y-1 text-xs leading-relaxed text-zinc-400">
                  <p>总结：{entry.q1}</p>
                  <p>计划：{entry.q2}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
