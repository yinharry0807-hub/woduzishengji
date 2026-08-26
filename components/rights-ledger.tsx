"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addRightsEvent, deleteRightsEvent } from "@/lib/actions";
import type { RightsEntry } from "@/lib/queries";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20";

const TYPE_STYLES = {
  gave_up: "border-rose-400/60 text-rose-300 data-[checked=true]:bg-rose-500 data-[checked=true]:border-rose-500 data-[checked=true]:text-white",
  claimed: "border-emerald-400/60 text-emerald-300 data-[checked=true]:bg-emerald-500 data-[checked=true]:border-emerald-500 data-[checked=true]:text-white",
} as const;

const TYPE_LABELS: Record<RightsEntry["eventType"], string> = {
  gave_up: "我算了",
  claimed: "我要回来了",
};

const TYPE_BADGES: Record<RightsEntry["eventType"], string> = {
  gave_up: "bg-rose-500/15 text-rose-300",
  claimed: "bg-emerald-500/15 text-emerald-300",
};

export default function RightsLedger({
  weekStats,
  entries,
  today,
}: {
  weekStats: { gaveUp: number; claimed: number };
  entries: RightsEntry[];
  today: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await addRightsEvent(new FormData(e.currentTarget));
    if (result?.error) {
      setError(result.error);
      setSaving(false);
      return;
    }
    e.currentTarget.reset();
    router.refresh();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);
    const result = await deleteRightsEvent(id);
    if (result?.error) setError(result.error);
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-base font-semibold">本周统计</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-rose-500/10 px-4 py-3 text-center">
            <p className="text-2xl font-bold text-rose-300">
              {weekStats.gaveUp}
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">我算了</p>
          </div>
          <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-center">
            <p className="text-2xl font-bold text-emerald-300">
              {weekStats.claimed}
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">我要回来了</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="mb-4 text-base font-semibold">记录一笔</h2>
        {error && (
          <p className="mb-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
            {error}
          </p>
        )}
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["gave_up", "我算了"],
                ["claimed", "我要回来了"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={`cursor-pointer rounded-xl border px-4 py-3 text-center text-sm font-medium transition ${TYPE_STYLES[value]}`}
              >
                <input
                  type="radio"
                  name="event_type"
                  value={value}
                  defaultChecked={value === "gave_up"}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs text-zinc-400">日期</span>
            <input
              type="date"
              name="event_date"
              defaultValue={today}
              required
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-zinc-400">
              事件描述
            </span>
            <textarea
              name="description"
              rows={3}
              maxLength={200}
              required
              placeholder="发生了什么？你让出了什么，或者争取回了什么？"
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "保存中…" : "保存"}
          </button>
        </form>
      </section>

      {entries.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="mb-3 text-base font-semibold">最近记录</h2>
          <ul className="space-y-2.5">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGES[entry.eventType]}`}
                  >
                    {TYPE_LABELS[entry.eventType]}
                  </span>
                  <span className="text-xs text-zinc-500">{entry.eventDate}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    disabled={deletingId === entry.id}
                    className="ml-auto text-xs text-zinc-600 transition hover:text-rose-300 disabled:opacity-40"
                  >
                    删除
                  </button>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-300">
                  {entry.description}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
