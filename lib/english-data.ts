import "server-only";
import { getAdminClient } from "@/lib/supabase-admin";
import {
  getLocalDateKey,
  getIsoWeekKey,
  getStreak,
  getWeekRange,
  toLocalDateKey,
} from "@/lib/task-logic";
import {
  computeWeekStats,
  getActiveMonth,
  getForcedRhythm,
  isSpeechMet,
  daysUntil,
  WEEK_TARGETS,
  QUICK_QUOTA,
  type EnglishRhythm,
  type ScheduleMonth,
  type WeekStats,
} from "@/lib/english-logic";
import type { SupabaseClient } from "@supabase/supabase-js";

export type EnglishToday = {
  dateKey: string;
  rhythmCode: string | null;
  rhythmName: string | null;
  rhythmIcon: string | null;
  tasks: EnglishRhythm["tasks"];
  completedTasks: string[];
  xpEarned: number;
};

export type EnglishData = {
  today: EnglishToday;
  rhythms: EnglishRhythm[];
  week: {
    key: string;
    stats: WeekStats;
    speechMet: boolean;
    forced: { code: string; missing: string[] } | null;
  };
  month: {
    index: number;
    label: string;
    vocabCount: number;
    vocabGoal: number;
    oralDone: boolean;
    oralGoal: number;
    realTalkCount: number;
    realTalkGoal: number;
    examDate: string | null;
    examLabel: string | null;
    daysUntilExam: number | null;
  };
  streak: number;
  checkedInToday: boolean;
  restToday: boolean;
  hasHistory: boolean;
  quickQuota: { used: number; max: number };
  plan: ScheduleMonth | null;
};

export type EnglishResult =
  | EnglishData
  | { error: string };

const DEFAULT_GOALS = [
  { month_index: 1, vocab_goal: 250, oral_exam_goal: 1, real_talk_goal: 4 },
  { month_index: 2, vocab_goal: 250, oral_exam_goal: 1, real_talk_goal: 4 },
  { month_index: 3, vocab_goal: 250, oral_exam_goal: 1, real_talk_goal: 4 },
  { month_index: 4, vocab_goal: 250, oral_exam_goal: 1, real_talk_goal: 4 },
  { month_index: 5, vocab_goal: 250, oral_exam_goal: 1, real_talk_goal: 4 },
  { month_index: 6, vocab_goal: 250, oral_exam_goal: 1, real_talk_goal: 4 },
];

/** 确保该用户的 6 个月度目标行存在（不覆盖已填写的口试状态） */
export async function ensureEnglishMonthlyGoals(
  client: SupabaseClient,
  userId: string
): Promise<void> {
  for (const goal of DEFAULT_GOALS) {
    await client.from("english_monthly_goals").upsert(
      {
        user_id: userId,
        ...goal,
        oral_exam_done: false,
        oral_exam_xp: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,month_index" }
    );
  }
}

/** 从本周每日记录重算硬指标并写入 english_weekly_stats（保持统计表新鲜） */
export async function recomputeEnglishWeek(
  client: SupabaseClient,
  userId: string
): Promise<void> {
  const weekKey = getIsoWeekKey();
  const range = getWeekRange();
  const { data, error } = await client
    .from("english_daily_logs")
    .select("date_key, rhythm_code, completed_tasks")
    .eq("user_id", userId)
    .gte("date_key", range.start)
    .lte("date_key", range.end);
  if (error) {
    console.error("重算英语周统计失败:", error);
    return;
  }
  const stats = computeWeekStats(
    (data ?? []).map((row) => ({
      dateKey: row.date_key,
      rhythmCode: row.rhythm_code,
      completedTasks: row.completed_tasks ?? [],
    }))
  );
  await client.from("english_weekly_stats").upsert(
    {
      user_id: userId,
      week_key: weekKey,
      speech_count: stats.speech,
      real_talk_count: stats.realTalk,
      intensive_count: stats.intensive,
      review_count: stats.review,
      input_days: stats.inputDays,
      quick_count: stats.quickCount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,week_key" }
  );
}

/** 加载英语工作台全部数据 */
export async function getEnglishData(userId: string): Promise<EnglishResult> {
  try {
    const client = getAdminClient();
    await ensureEnglishMonthlyGoals(client, userId);

    const todayKey = getLocalDateKey();
    const weekKey = getIsoWeekKey();
    const range = getWeekRange();

    const [rhythmsRes, logsRes, restRes, scheduleRes, wordsRes, goalsRes, taskLogsRes] =
      await Promise.all([
        client
          .from("english_rhythms")
          .select("code, name, icon, description, tasks, is_fallback, sort_order")
          .eq("is_active", true)
          .order("sort_order"),
        client
          .from("english_daily_logs")
          .select("date_key, rhythm_code, completed_tasks, xp_earned")
          .eq("user_id", userId),
        client.from("rest_days").select("date_key").eq("user_id", userId),
        client.from("english_schedule").select("*").order("month_index"),
        client
          .from("english_words")
          .select("created_at")
          .eq("user_id", userId),
        client
          .from("english_monthly_goals")
          .select("month_index, vocab_goal, oral_exam_goal, real_talk_goal, oral_exam_done")
          .eq("user_id", userId),
        client
          .from("task_logs")
          .select("completed_at")
          .eq("user_id", userId),
      ]);

    for (const res of [
      rhythmsRes,
      logsRes,
      restRes,
      scheduleRes,
      wordsRes,
      goalsRes,
      taskLogsRes,
    ]) {
      if (res.error) throw res.error;
    }

    const rhythms: EnglishRhythm[] = (rhythmsRes.data ?? []).map((row) => ({
      code: row.code,
      name: row.name,
      icon: row.icon,
      description: row.description,
      tasks: row.tasks ?? [],
      isFallback: Boolean(row.is_fallback),
    }));
    const rhythmByCode = new Map(rhythms.map((r) => [r.code, r]));

    const logs = (logsRes.data ?? []).map((row) => ({
      dateKey: row.date_key,
      rhythmCode: row.rhythm_code,
      completedTasks: row.completed_tasks ?? [],
      xpEarned: Number(row.xp_earned) || 0,
    }));
    const todayLog = logs.find((log) => log.dateKey === todayKey) ?? null;
    const todayRhythm = todayLog
      ? rhythmByCode.get(todayLog.rhythmCode) ?? null
      : null;

    const weekLogs = logs.filter(
      (log) => log.dateKey >= range.start && log.dateKey <= range.end
    );
    const stats = computeWeekStats(weekLogs);

    const schedule: ScheduleMonth[] = (scheduleRes.data ?? []).map((row) => ({
      monthIndex: row.month_index,
      monthLabel: row.month_label,
      startDate: row.start_date,
      endDate: row.end_date,
      combo: row.combo ?? [],
      specialDays: row.special_days ?? [],
      note: row.note,
    }));
    const activeMonth = getActiveMonth(todayKey, schedule);
    const goalsMap = new Map(
      (goalsRes.data ?? []).map((row) => [row.month_index, row])
    );
    const goal = activeMonth ? goalsMap.get(activeMonth.monthIndex) : null;

    const monthLogs = activeMonth
      ? logs.filter(
          (log) =>
            log.dateKey >= activeMonth.startDate &&
            log.dateKey <= activeMonth.endDate
        )
      : [];
    const realTalkCount = monthLogs.filter((log) =>
      log.completedTasks.includes("real_talk")
    ).length;

    const words = (wordsRes.data ?? []) as Array<{ created_at: string }>;
    const vocabCount = activeMonth
      ? words.filter((word) => {
          const dateKey = toLocalDateKey(word.created_at);
          return dateKey >= activeMonth.startDate && dateKey <= activeMonth.endDate;
        }).length
      : 0;

    const exam = activeMonth
      ? (activeMonth.specialDays ?? []).find((day) => day.type === "exam") ?? null
      : null;

    const restDates = (restRes.data ?? []).map((row) => row.date_key);
    const taskDates = (taskLogsRes.data ?? []).map((log) =>
      toLocalDateKey(log.completed_at)
    );
    const englishDates = logs
      .filter((log) => log.completedTasks.length > 0)
      .map((log) => log.dateKey);
    const allDates = [...new Set([...taskDates, ...englishDates])];
    const streak = getStreak(allDates, restDates);

    const speechMet = activeMonth
      ? isSpeechMet(stats, activeMonth.monthIndex)
      : stats.speech >= WEEK_TARGETS.speech;
    const forced = activeMonth
      ? getForcedRhythm({
          todayKey,
          weekEnd: range.end,
          stats,
          monthIndex: activeMonth.monthIndex,
        })
      : null;

    return {
      today: todayLog
        ? {
            dateKey: todayLog.dateKey,
            rhythmCode: todayLog.rhythmCode,
            rhythmName: todayRhythm?.name ?? todayLog.rhythmCode,
            rhythmIcon: todayRhythm?.icon ?? "📘",
            tasks: todayRhythm?.tasks ?? [],
            completedTasks: todayLog.completedTasks,
            xpEarned: todayLog.xpEarned,
          }
        : {
            dateKey: todayKey,
            rhythmCode: null,
            rhythmName: null,
            rhythmIcon: null,
            tasks: [],
            completedTasks: [],
            xpEarned: 0,
          },
      rhythms,
      week: { key: weekKey, stats, speechMet, forced },
      month: {
        index: activeMonth?.monthIndex ?? 0,
        label: activeMonth?.monthLabel ?? "",
        vocabCount,
        vocabGoal: goal?.vocab_goal ?? 250,
        oralDone: Boolean(goal?.oral_exam_done),
        oralGoal: goal?.oral_exam_goal ?? 1,
        realTalkCount,
        realTalkGoal: goal?.real_talk_goal ?? 4,
        examDate: exam?.date ?? null,
        examLabel: exam?.label ?? null,
        daysUntilExam: exam ? daysUntil(exam.date, todayKey) : null,
      },
      streak,
      checkedInToday: allDates.includes(todayKey),
      restToday: restDates.includes(todayKey),
      hasHistory: allDates.length > 0,
      quickQuota: { used: stats.quickCount, max: QUICK_QUOTA },
      plan: activeMonth ?? null,
    };
  } catch (err) {
    console.error("加载英语工作台失败:", err);
    return {
      error: "英语工作台加载失败，请确认已执行更新后的 supabase/schema.sql（新增英语相关表）",
    };
  }
}

/** 半年计划数据（全局内置，供查看页使用） */
export async function getEnglishPlan(): Promise<
  ScheduleMonth[] | { error: string }
> {
  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from("english_schedule")
      .select("*")
      .order("month_index");
    if (error) throw error;
    const schedule: ScheduleMonth[] = (data ?? []).map((row) => ({
      monthIndex: row.month_index,
      monthLabel: row.month_label,
      startDate: row.start_date,
      endDate: row.end_date,
      combo: row.combo ?? [],
      specialDays: row.special_days ?? [],
      note: row.note,
    }));
    return schedule;
  } catch (err) {
    console.error("加载半年计划失败:", err);
    return {
      error: "半年计划加载失败，请确认已执行更新后的 supabase/schema.sql（新增 english_schedule 表）",
    };
  }
}
