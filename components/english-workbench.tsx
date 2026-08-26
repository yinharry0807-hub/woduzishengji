"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addEnglishWord,
  chooseEnglishRhythm,
  markEnglishOralExam,
  toggleEnglishTask,
} from "@/lib/actions";
import type { EnglishData } from "@/lib/english-data";
import { FlameIcon } from "@/components/icons";

const TASK_ICONS: Record<string, string> = {
  input: "📺",
  words: "📝",
  ai_chat: "🗣",
  real_talk: "👥",
  intensive: "📚",
  review: "🔄",
};

const RHYTHM_NAMES: Record<string, string> = {
  quick: "快速日",
  input: "输入日",
  dialogue: "对话日",
  real: "真人日",
  intensive: "精学日",
  review: "复盘日",
};

function formatNumber(value: number): string {
  return value.toLocaleString("zh-CN");
}

export default function EnglishWorkbench({ data }: { data: EnglishData }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const { today, week, month, rhythms, quickQuota } = data;

  async function run(
    action: () => Promise<{ error?: string }>,
    success?: () => void
  ) {
    setError(null);
    setSaving(true);
    const result = await action();
    setSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    success?.();
    router.refresh();
  }

  const canChangeRhythm =
    today.rhythmCode !== null && today.completedTasks.length === 0;
  const todayDone = today.tasks.length > 0;
  const todayProgress =
    today.tasks.length === 0
      ? 0
      : today.completedTasks.filter((key) =>
          today.tasks.some((task) => task.key === key)
        ).length;

  const speechShort = Math.max(0, 3 - week.stats.speech);
  const intensiveShort = Math.max(0, 1 - week.stats.intensive);
  const reviewShort = Math.max(0, 1 - week.stats.review);
  const inputShort = Math.max(0, 6 - week.stats.inputDays);
  const vocabShort = Math.max(0, month.vocabGoal - month.vocabCount);
  const realShort = Math.max(0, month.realTalkGoal - month.realTalkCount);

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
          {error}
        </p>
      )}

      {week.forced && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
          <p className="text-sm font-semibold text-rose-200">
            🚨 今天是周日，硬指标未达标
          </p>
          <p className="mt-1 text-xs leading-relaxed text-rose-300/90">
            还差：{week.forced.missing.join("、")}。今天必须安排：
            {RHYTHM_NAMES[week.forced.code] ?? week.forced.code}，没得商量。
          </p>
        </div>
      )}

      {/* 今日进度 */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">今日进度</h2>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-zinc-300">
            {today.rhythmCode
              ? `${todayProgress}/${today.tasks.length} 项`
              : "未选择节奏"}
          </span>
        </div>
        {today.rhythmCode ? (
          <>
            <p className="mt-2 text-sm">
              {today.rhythmIcon} {today.rhythmName}
              <span className="ml-2 text-xs text-zinc-500">
                已完成 {todayProgress} 项
              </span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {today.tasks.map((task) => {
                const done = today.completedTasks.includes(task.key);
                return (
                  <span
                    key={task.key}
                    className={`rounded-full px-3 py-1 text-xs ${
                      done
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-white/5 text-zinc-500"
                    }`}
                  >
                    {TASK_ICONS[task.key] ?? "▪"} {task.label} {done ? "✓" : "▢"}
                  </span>
                );
              })}
            </div>
            {todayProgress === today.tasks.length && today.tasks.length > 0 && (
              <p className="mt-3 text-sm font-medium text-emerald-300">
                🎉 今日任务全部完成（+{today.xpEarned} XP）
              </p>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">
            还没选今天的节奏，往下选一个吧 👇
          </p>
        )}
      </section>

      {/* 本周硬指标 */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-base font-semibold">本周硬指标</h2>
        <p className="mt-1 text-xs text-zinc-500">
          无论每天选什么节奏，每周都要达成
        </p>
        <div className="mt-3 space-y-2.5">
          <IndicatorRow
            icon="🗣"
            label="口语输出"
            value={`${week.stats.speech}/3次`}
            met={week.speechMet}
            short={
              week.speechMet
                ? null
                : month.index >= 2 && week.stats.realTalk < 1
                  ? "需真人"
                  : `差 ${speechShort} 次`
            }
            note={month.index >= 2 ? "第2个月起至少1次真人" : "AI对话或真人连线都算"}
          />
          <IndicatorRow
            icon="📚"
            label="精学"
            value={`${week.stats.intensive}/1次`}
            met={week.stats.intensive >= 1}
            short={intensiveShort > 0 ? `差 ${intensiveShort} 次` : null}
          />
          <IndicatorRow
            icon="🔄"
            label="复盘"
            value={`${week.stats.review}/1次`}
            met={week.stats.review >= 1}
            short={reviewShort > 0 ? `差 ${reviewShort} 次` : null}
            note="周日做最顺"
          />
          <IndicatorRow
            icon="📺"
            label="输入"
            value={`${week.stats.inputDays}/6天`}
            met={week.stats.inputDays >= 6}
            short={inputShort > 0 ? `差 ${inputShort} 天` : null}
            note="快速日的15分钟也算"
          />
        </div>
      </section>

      {/* 连续打卡 */}
      <section className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
          <FlameIcon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs text-zinc-400">连续打卡（与主系统共用）</p>
          <p className="mt-0.5 text-xl font-bold">
            {data.streak}{" "}
            <span className="text-sm font-medium text-zinc-400">天</span>
          </p>
        </div>
        <p className="ml-auto text-right text-xs text-zinc-500">
          {data.checkedInToday
            ? "今日已打卡 ✓"
            : data.restToday
              ? "今日休息日"
              : "今天还没完成"}
        </p>
      </section>

      {/* 本月进度 + 口试 */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">本月进度</h2>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-zinc-300">
            {month.label || "未在计划期"}
          </span>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          <p className="flex items-center justify-between">
            <span>📝 词汇</span>
            <span className={vocabShort > 0 ? "font-semibold text-rose-300" : "text-emerald-300"}>
              {formatNumber(month.vocabCount)}/{formatNumber(month.vocabGoal)}
              {vocabShort > 0 && <span className="ml-1 text-xs text-rose-400">差 {vocabShort}</span>}
            </span>
          </p>
          <p className="flex items-center justify-between">
            <span>🎤 口试</span>
            <span className={month.oralDone ? "text-emerald-300" : "font-semibold text-rose-300"}>
              {month.oralDone ? 1 : 0}/{month.oralGoal}
              {!month.oralDone && (
                <span className="ml-1 text-xs text-rose-400">未完成</span>
              )}
            </span>
          </p>
          <p className="flex items-center justify-between">
            <span>👥 真人连线</span>
            <span className={realShort > 0 ? "font-semibold text-rose-300" : "text-emerald-300"}>
              {month.realTalkCount}/{month.realTalkGoal} 次
              {realShort > 0 && <span className="ml-1 text-xs text-rose-400">差 {realShort}</span>}
            </span>
          </p>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
          <p className="text-sm">
            {month.examLabel ? `🎤 ${month.examLabel}` : "本月口试"}
            {month.examDate && (
              <span className="ml-2 text-xs text-zinc-500">{month.examDate}</span>
            )}
          </p>
          {month.oralDone ? (
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs text-emerald-300">
              已完成 ✓
            </span>
          ) : month.examDate && month.daysUntilExam !== null ? (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs ${
                month.daysUntilExam <= 0
                  ? "bg-rose-500/15 text-rose-300"
                  : "bg-amber-500/15 text-amber-300"
              }`}
            >
              {month.daysUntilExam <= 0
                ? "口试已到期！"
                : `还有 ${month.daysUntilExam} 天`}
            </span>
          ) : null}
        </div>
        {!month.oralDone &&
          month.examDate &&
          month.daysUntilExam !== null &&
          month.daysUntilExam <= 0 && (
            <button
              type="button"
              onClick={() => run(() => markEnglishOralExam())}
              disabled={saving}
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-400 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              完成口试（+50 XP）
            </button>
          )}
      </section>

      {/* 选节奏 / 任务清单 */}
      {today.rhythmCode === null || (showPicker && canChangeRhythm) ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">今天是什么日子？</h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs ${
                quickQuota.used >= quickQuota.max
                  ? "bg-rose-500/15 text-rose-300"
                  : "bg-white/10 text-zinc-300"
              }`}
            >
              ⚡ 快速日额度 {quickQuota.used}/{quickQuota.max}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {rhythms.map((rhythm) => (
              <button
                key={rhythm.code}
                type="button"
                onClick={() =>
                  run(() => chooseEnglishRhythm(rhythm.code), () =>
                    setShowPicker(false)
                  )
                }
                disabled={saving}
                className={`rounded-2xl border p-4 text-left transition hover:border-violet-400/50 disabled:opacity-60 ${
                  week.forced && week.forced.code === rhythm.code
                    ? "border-rose-400/60 bg-rose-500/10"
                    : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <span className="text-2xl">{rhythm.icon}</span>
                <p className="mt-2 text-sm font-semibold">
                  {rhythm.name}
                  {week.forced && week.forced.code === rhythm.code && (
                    <span className="ml-1 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-300">
                      必须
                    </span>
                  )}
                  {rhythm.isFallback && (
                    <span className="ml-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300">
                      保底
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  {rhythm.tasks.map((task) => task.label).join(" + ")}
                </p>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              今日任务 · {today.rhythmIcon} {today.rhythmName}
            </h2>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-zinc-300">
              {todayProgress}/{today.tasks.length} 项
            </span>
          </div>
          <ul className="mt-3 space-y-2.5">
            {today.tasks.map((task) => {
              const done = today.completedTasks.includes(task.key);
              return (
                <li
                  key={task.key}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
                >
                  <button
                    type="button"
                    onClick={() => run(() => toggleEnglishTask(task.key))}
                    disabled={saving}
                    aria-label={`${done ? "取消" : "完成"}${task.label}`}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-50 ${
                      done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-white/20 text-zinc-500 hover:border-emerald-400/60"
                    }`}
                  >
                    {done ? "✓" : ""}
                  </button>
                  <span
                    className={`flex-1 text-sm ${done ? "text-zinc-500 line-through" : ""}`}
                  >
                    {TASK_ICONS[task.key] ?? "▪"} {task.label}
                  </span>
                  <span className="text-xs text-violet-300">+{task.xp} XP</span>
                </li>
              );
            })}
          </ul>
          {todayProgress === today.tasks.length && today.tasks.length > 0 && (
            <p className="mt-3 text-center text-sm font-medium text-emerald-300">
              🎉 今日节奏全部完成
            </p>
          )}
          {canChangeRhythm && (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="mt-3 w-full rounded-xl border border-dashed border-white/15 py-2 text-xs text-zinc-400 transition hover:text-zinc-200"
            >
              还没完成任何任务，可以更换今天的节奏
            </button>
          )}
        </section>
      )}

      {/* 记生词 */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-base font-semibold">记生词</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            run(
              () =>
                addEnglishWord(
                  String(formData.get("word") ?? ""),
                  String(formData.get("note") ?? "")
                ),
              () => e.currentTarget.reset()
            );
          }}
          className="mt-3 flex gap-2"
        >
          <input
            name="word"
            placeholder="输入单词…"
            maxLength={60}
            required
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-emerald-400/60"
          />
          <input
            name="note"
            placeholder="释义（可选）"
            maxLength={100}
            className="w-28 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-emerald-400/60"
          />
          <button
            type="submit"
            disabled={saving}
            className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            记下
          </button>
        </form>
        <p className="mt-2 text-xs text-zinc-500">
          本月已记 {formatNumber(month.vocabCount)} 个，目标{" "}
          {formatNumber(month.vocabGoal)} 个
        </p>
      </section>

      <Link
        href="/english/plan"
        className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/15 py-3 text-sm text-zinc-400 transition hover:border-violet-400/40 hover:text-violet-300"
      >
        📅 查看半年计划
      </Link>
    </div>
  );
}

function IndicatorRow({
  icon,
  label,
  value,
  met,
  short,
  note,
}: {
  icon: string;
  label: string;
  value: string;
  met: boolean;
  short: string | null;
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-2.5">
      <div className="flex items-center justify-between text-sm">
        <span>
          {icon} {label}
        </span>
        <span className={met ? "text-emerald-300" : "font-semibold text-rose-300"}>
          {value}
          {short && (
            <span className="ml-1.5 rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px]">
              差 {short}
            </span>
          )}
        </span>
      </div>
      {note && <p className="mt-0.5 text-[11px] text-zinc-600">{note}</p>}
    </div>
  );
}
