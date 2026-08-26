/**
 * 英语工作台核心逻辑（纯函数，便于测试）。
 * 周硬指标：口语输出≥3次 / 精学≥1次 / 复盘≥1次 / 输入≥6天
 */

export type EnglishTask = {
  key: string;
  label: string;
  xp: number;
};

export type EnglishRhythm = {
  code: string;
  name: string;
  icon: string;
  description: string | null;
  tasks: EnglishTask[];
  isFallback: boolean;
};

export type EnglishLogRow = {
  dateKey: string;
  rhythmCode: string;
  completedTasks: string[];
};

export type WeekStats = {
  speech: number;
  realTalk: number;
  intensive: number;
  review: number;
  inputDays: number;
  quickCount: number;
};

export const WEEK_TARGETS = {
  speech: 3,
  intensive: 1,
  review: 1,
  inputDays: 6,
} as const;

export const QUICK_QUOTA = 2;

export const EMPTY_WEEK_STATS: WeekStats = {
  speech: 0,
  realTalk: 0,
  intensive: 0,
  review: 0,
  inputDays: 0,
  quickCount: 0,
};

/** 从一周的每日记录计算硬指标统计 */
export function computeWeekStats(logs: EnglishLogRow[]): WeekStats {
  const stats: WeekStats = { ...EMPTY_WEEK_STATS };
  for (const log of logs) {
    const tasks = new Set(log.completedTasks ?? []);
    if (log.rhythmCode === "quick") stats.quickCount += 1;
    if (tasks.has("input")) stats.inputDays += 1;
    if (tasks.has("ai_chat")) stats.speech += 1;
    if (tasks.has("real_talk")) {
      stats.speech += 1;
      stats.realTalk += 1;
    }
    if (tasks.has("intensive")) stats.intensive += 1;
    if (tasks.has("review")) stats.review += 1;
  }
  return stats;
}

/** 口语输出是否达标：≥3次；第2个月起其中至少1次必须是真人连线 */
export function isSpeechMet(stats: WeekStats, monthIndex: number): boolean {
  if (stats.speech < WEEK_TARGETS.speech) return false;
  if (monthIndex >= 2 && stats.realTalk < 1) return false;
  return true;
}

export type ScheduleMonth = {
  monthIndex: number;
  monthLabel: string;
  startDate: string;
  endDate: string;
  combo: Array<{ rhythm: string; count: number }>;
  specialDays: Array<{ date: string; type: string; label: string }>;
  note: string | null;
};

/** 根据日期找到当前所处的计划月份（超出范围时取最近的一月） */
export function getActiveMonth(
  dateKey: string,
  schedule: ScheduleMonth[]
): ScheduleMonth | null {
  if (schedule.length === 0) return null;
  const sorted = [...schedule].sort((a, b) =>
    a.startDate.localeCompare(b.startDate)
  );
  if (dateKey < sorted[0].startDate) return sorted[0];
  if (dateKey > sorted[sorted.length - 1].endDate) {
    return sorted[sorted.length - 1];
  }
  return (
    sorted.find(
      (month) => dateKey >= month.startDate && dateKey <= month.endDate
    ) ?? null
  );
}

/**
 * 防偷懒：周日且硬指标未达标时，强制安排对应节奏（没得商量）。
 * 优先级：口语（对话日/真人日）→ 精学（精学日）→ 复盘（复盘日）。
 */
export function getForcedRhythm(opts: {
  todayKey: string;
  weekEnd: string;
  stats: WeekStats;
  monthIndex: number;
}): { code: string; missing: string[] } | null {
  if (opts.todayKey !== opts.weekEnd) return null; // 只在周日触发

  const missing: string[] = [];
  const speechShort = Math.max(
    0,
    WEEK_TARGETS.speech - opts.stats.speech
  );
  if (speechShort > 0) {
    missing.push(`口语输出还差 ${speechShort} 次`);
  } else if (opts.monthIndex >= 2 && opts.stats.realTalk < 1) {
    missing.push("本月起口语中至少 1 次必须是真人连线（本周还没有）");
  }
  if (opts.stats.intensive < WEEK_TARGETS.intensive) {
    missing.push("精学还差 1 次");
  }
  if (opts.stats.review < WEEK_TARGETS.review) {
    missing.push("复盘还差 1 次");
  }
  if (missing.length === 0) return null;

  let code: string;
  if (speechShort > 0 || (opts.monthIndex >= 2 && opts.stats.realTalk < 1)) {
    code = opts.monthIndex >= 2 && opts.stats.realTalk < 1 ? "real" : "dialogue";
  } else if (opts.stats.intensive < WEEK_TARGETS.intensive) {
    code = "intensive";
  } else {
    code = "review";
  }

  return { code, missing };
}

/** 计算距离某日期还剩几天（今天算 0，已过为负数） */
export function daysUntil(dateKey: string, todayKey: string): number {
  const target = new Date(`${dateKey}T00:00:00Z`).getTime();
  const today = new Date(`${todayKey}T00:00:00Z`).getTime();
  return Math.round((target - today) / 86400000);
}
