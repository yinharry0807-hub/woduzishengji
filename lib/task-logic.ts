/**
 * 任务周期 / 连续打卡的核心逻辑（纯函数，便于测试）。
 * 所有“当天 / 本周”判断统一使用上海时区，保证本地与部署后行为一致。
 */

export const TIME_ZONE = "Asia/Shanghai";

export const TASK_CATEGORIES = ["daily", "weekly", "milestone"] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  daily: "每日任务",
  weekly: "每周任务",
  milestone: "里程碑任务",
};

/** 「连续打卡 30 天」里程碑任务的固定 ID（与 supabase/schema.sql 中的种子一致） */
export const STREAK_30_MILESTONE_TASK_ID =
  "00000000-0000-4000-8000-00000000000a";

/** 把日期转换成目标时区的日期键，格式 YYYY-MM-DD */
export function getLocalDateKey(
  date: Date = new Date(),
  timeZone: string = TIME_ZONE
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** 把任意时间（ISO 字符串或 Date）转成目标时区的日期键 */
export function toLocalDateKey(
  value: string | Date,
  timeZone: string = TIME_ZONE
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return getLocalDateKey(date, timeZone);
}

/** ISO 周键，格式 YYYY-Www，周一为一周起点 */
export function getIsoWeekKey(
  date: Date = new Date(),
  timeZone: string = TIME_ZONE
): string {
  const [year, month, day] = getLocalDateKey(date, timeZone)
    .split("-")
    .map(Number);
  const target = new Date(Date.UTC(year, month - 1, day));
  const dayNum = (target.getUTCDay() + 6) % 7; // 周一=0
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = target.getTime();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
  }
  const week = 1 + Math.ceil((firstThursday - target.getTime()) / (7 * 24 * 3600 * 1000));
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** 任务在当前时间所属的“周期键”：daily=当天日期，weekly=ISO 周，milestone=once */
export function getPeriodKey(
  category: TaskCategory,
  now: Date = new Date()
): string {
  if (category === "daily") return getLocalDateKey(now);
  if (category === "weekly") return getIsoWeekKey(now);
  return "once";
}

/** 月份键，格式 YYYY-MM（上海时区） */
export function getMonthKey(
  date: Date = new Date(),
  timeZone: string = TIME_ZONE
): string {
  return getLocalDateKey(date, timeZone).slice(0, 7);
}

/** 本周（周一~周日）的日期范围，格式 YYYY-MM-DD（上海时区） */
export function getWeekRange(
  date: Date = new Date(),
  timeZone: string = TIME_ZONE
): { start: string; end: string } {
  const [year, month, day] = getLocalDateKey(date, timeZone)
    .split("-")
    .map(Number);
  const dayNum = (new Date(year, month - 1, day).getDay() + 6) % 7; // 周一=0
  const startDate = new Date(Date.UTC(year, month - 1, day - dayNum));
  const endDate = new Date(Date.UTC(year, month - 1, day - dayNum + 6));
  return {
    start: startDate.toISOString().slice(0, 10),
    end: endDate.toISOString().slice(0, 10),
  };
}

/**
 * 根据已完成打卡的日期集合计算连续天数。
 * 规则：
 * - 今天已打卡则从今天往前数；今天还没打卡则从昨天往前数（当天内断签不算清零）
 * - restDates 中的「休息日」不增加天数，但也不打断连续性
 */
export function getStreak(
  completionDates: string[],
  restDates: string[] = []
): number {
  if (completionDates.length === 0) return 0;
  const doneSet = new Set(completionDates);
  const restSet = new Set(restDates);
  const today = getLocalDateKey();
  const yesterday = getLocalDateKey(new Date(Date.now() - 86400000));
  const start = doneSet.has(today) || restSet.has(today) ? today : yesterday;
  if (!doneSet.has(start) && !restSet.has(start)) return 0;

  let streak = 0;
  const cursor = new Date(`${start}T00:00:00Z`);
  while (true) {
    const key = toLocalDateKey(cursor);
    if (doneSet.has(key)) {
      streak += 1;
    } else if (!restSet.has(key)) {
      break;
    }
    cursor.setTime(cursor.getTime() - 86400000);
  }
  return streak;
}
