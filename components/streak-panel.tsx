"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markRestDay, unmarkRestDay } from "@/lib/actions";
import { FlameIcon } from "@/components/icons";

export default function StreakPanel({
  days,
  checkedInToday,
  restToday,
  hasHistory,
}: {
  days: number;
  checkedInToday: boolean;
  restToday: boolean;
  hasHistory: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  let hint: string;
  if (restToday) {
    hint = "今天休息，连续打卡保持不断";
  } else if (days === 0 && hasHistory) {
    hint = "断了没关系，今天重新开始，历史成就不会消失";
  } else if (days === 0) {
    hint = "完成任意任务即可开始打卡";
  } else if (checkedInToday) {
    hint = "今日已打卡，继续保持！";
  } else {
    hint = "今天还没打卡，别让连续天数归零";
  }

  async function toggleRest() {
    setSaving(true);
    if (restToday) {
      await unmarkRestDay();
    } else {
      await markRestDay();
    }
    setSaving(false);
    router.refresh();
  }

  return (
    <section className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
        <FlameIcon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-zinc-400">连续打卡</p>
        <p className="mt-0.5 text-xl font-bold">
          {days} <span className="text-sm font-medium text-zinc-400">天</span>
        </p>
      </div>
      <div className="ml-auto flex shrink-0 flex-col items-end gap-1.5">
        <button
          type="button"
          onClick={toggleRest}
          disabled={saving}
          className={`rounded-xl border px-3 py-1.5 text-xs transition disabled:opacity-50 ${
            restToday
              ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-300"
              : "border-white/10 bg-white/5 text-zinc-400 hover:border-emerald-400/40 hover:text-emerald-300"
          }`}
        >
          {restToday ? "取消休息" : "今天休息"}
        </button>
        <p className="max-w-[9rem] text-right text-xs leading-snug text-zinc-500">
          {hint}
        </p>
      </div>
    </section>
  );
}
