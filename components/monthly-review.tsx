"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveMonthlyReview } from "@/lib/actions";
import type { ReviewEntry } from "@/lib/queries";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20";

const QUESTIONS = [
  { key: "q1", text: "1. 这份工作还在给我什么？" },
  { key: "q2", text: "2. 我在失去什么？" },
  { key: "q3", text: "3. 离职触发条件到了吗？" },
] as const;

export default function MonthlyReview({
  currentMonth,
  reviews,
}: {
  currentMonth: string;
  reviews: ReviewEntry[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const currentReview = reviews.find((item) => item.month === currentMonth);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await saveMonthlyReview(new FormData(e.currentTarget));
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
      {!currentReview && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
          <span className="text-xl">⏰</span>
          <p className="text-sm text-amber-200">
            本月（{currentMonth}）的止损三问还没填写，建议每月 1 日复盘一次
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">止损三问</h2>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-zinc-300">
            每月 1 日
          </span>
        </div>

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
          {QUESTIONS.map((question) => (
            <label key={question.key} className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-300">
                {question.text}
              </span>
              <textarea
                name={question.key}
                rows={3}
                maxLength={500}
                required
                defaultValue={
                  currentReview ? currentReview[question.key] : ""
                }
                placeholder="写下你的答案…"
                className={inputClass}
              />
            </label>
          ))}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "保存中…" : currentReview ? "更新复盘" : "保存复盘"}
          </button>
        </form>
      </section>

      {reviews.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="mb-3 text-base font-semibold">历史复盘</h2>
          <ul className="space-y-2.5">
            {reviews.map((review) => (
              <li
                key={review.month}
                className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
              >
                <p className="text-sm font-medium text-zinc-300">
                  {review.month}
                </p>
                <div className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-zinc-400">
                  <p>
                    <span className="text-zinc-500">这份工作还在给我什么？</span>
                    <br />
                    {review.q1}
                  </p>
                  <p>
                    <span className="text-zinc-500">我在失去什么？</span>
                    <br />
                    {review.q2}
                  </p>
                  <p>
                    <span className="text-zinc-500">离职触发条件到了吗？</span>
                    <br />
                    {review.q3}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
