import "server-only";
import { getAdminClient } from "@/lib/supabase-admin";
import {
  getLocalDateKey,
  getPeriodKey,
  getStreak,
  toLocalDateKey,
  getMonthKey,
  getWeekRange,
  type TaskCategory,
} from "@/lib/task-logic";
import { getLevelInfo, LEVELS } from "@/lib/levels";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ACHIEVEMENTS,
  computeEligibleCodes,
  type AchievementContext,
  type AchievementDef,
} from "@/lib/achievements";

/** 存款目标（元） */
export const SAVINGS_TARGET = 15000;

/** 英语模块的 XP（每日节奏任务 + 口试）与有完成的日期，表缺失时降级为空 */
async function getEnglishXpAndDates(
  client: SupabaseClient,
  userId: string
): Promise<{ xp: number; dates: string[] }> {
  try {
    const [logsRes, goalsRes] = await Promise.all([
      client
        .from("english_daily_logs")
        .select("date_key, xp_earned, completed_tasks")
        .eq("user_id", userId),
      client
        .from("english_monthly_goals")
        .select("oral_exam_xp")
        .eq("user_id", userId),
    ]);
    if (logsRes.error) throw logsRes.error;
    if (goalsRes.error) throw goalsRes.error;

    const logs = logsRes.data ?? [];
    const xp =
      logs.reduce((sum, log) => sum + (Number(log.xp_earned) || 0), 0) +
      (goalsRes.data ?? []).reduce(
        (sum, goal) => sum + (Number(goal.oral_exam_xp) || 0),
        0
      );
    const dates = logs
      .filter(
        (log) =>
          Array.isArray(log.completed_tasks) && log.completed_tasks.length > 0
      )
      .map((log) => log.date_key);
    return { xp, dates };
  } catch (err) {
    console.error("加载英语数据失败（已降级）:", err);
    return { xp: 0, dates: [] };
  }
}

export type TaskWithStatus = {
  id: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  xp: number;
  done: boolean;
};

export type DashboardData =
  | {
      tasks: TaskWithStatus[];
      totalXp: number;
      streak: number;
      checkedInToday: boolean;
      restToday: boolean;
      hasHistory: boolean;
    }
  | {
      error: string;
    };

/** 加载仪表盘所需数据：任务列表（含本期完成状态）、总 XP、连续打卡天数 */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  try {
    const client = getAdminClient();
    const [tasksRes, logsRes] = await Promise.all([
      client
        .from("tasks")
        .select("id, title, description, category, xp, sort_order")
        .eq("is_active", true)
        .order("sort_order"),
      client
        .from("task_logs")
        .select("task_id, period_key, xp_earned, completed_at")
        .eq("user_id", userId),
    ]);

    if (tasksRes.error) throw tasksRes.error;
    if (logsRes.error) throw logsRes.error;

    const logs = logsRes.data ?? [];
    const tasks = tasksRes.data ?? [];
    // 休息日表未建时降级为空，不影响任务与等级展示
    let restDates: string[] = [];
    try {
      const restRes = await client
        .from("rest_days")
        .select("date_key")
        .eq("user_id", userId);
      if (restRes.error) throw restRes.error;
      restDates = (restRes.data ?? []).map((row) => row.date_key);
    } catch (err) {
      console.error("加载休息日失败（已降级）:", err);
    }
    const todayKey = getPeriodKey("daily");
    const weekKey = getPeriodKey("weekly");

    const tasksWithStatus: TaskWithStatus[] = tasks.map((task) => {
      const done = logs.some((log) => {
        if (task.category === "milestone") return log.task_id === task.id;
        if (task.category === "daily") {
          return log.task_id === task.id && log.period_key === todayKey;
        }
        return log.task_id === task.id && log.period_key === weekKey;
      });
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category as TaskCategory,
        xp: task.xp,
        done,
      };
    });

    const english = await getEnglishXpAndDates(client, userId);
    const totalXp =
      logs.reduce((sum, log) => sum + (Number(log.xp_earned) || 0), 0) +
      english.xp;
    const completionDates = [
      ...new Set([
        ...logs.map((log) => toLocalDateKey(log.completed_at)),
        ...english.dates,
      ]),
    ];

    return {
      tasks: tasksWithStatus,
      totalXp,
      streak: getStreak(completionDates, restDates),
      checkedInToday: completionDates.includes(todayKey),
      restToday: restDates.includes(todayKey),
      hasHistory: logs.length > 0 || english.dates.length > 0,
    };
  } catch (err) {
    console.error("加载仪表盘数据失败:", err);
    return {
      error: "数据加载失败，请确认已执行更新后的 supabase/schema.sql（新增 tasks 与 task_logs 表）",
    };
  }
}

export type SkillNodeData = {
  id: string;
  name: string;
  progress: number;
};

export type SkillBranchData = {
  id: string;
  name: string;
  description: string | null;
  nodes: SkillNodeData[];
};

export type SkillTreeData =
  | {
      branches: SkillBranchData[];
    }
  | {
      error: string;
    };

/** 加载技能树：分支 + 分支下的技能节点（含当前用户进度） */
export async function getSkillTree(userId: string): Promise<SkillTreeData> {
  try {
    const client = getAdminClient();
    const [skillsRes, progressRes] = await Promise.all([
      client
        .from("skills")
        .select("id, name, description, parent_id, sort_order")
        .order("sort_order"),
      client
        .from("skill_progress")
        .select("skill_id, progress")
        .eq("user_id", userId),
    ]);

    if (skillsRes.error) throw skillsRes.error;
    if (progressRes.error) throw progressRes.error;

    const progressMap = new Map<string, number>();
    for (const row of progressRes.data ?? []) {
      progressMap.set(row.skill_id, Number(row.progress) || 0);
    }

    const branches: SkillBranchData[] = [];
    const nodesByParent = new Map<string, Array<{ id: string; name: string }>>();
    for (const skill of skillsRes.data ?? []) {
      if (skill.parent_id) {
        const list = nodesByParent.get(skill.parent_id) ?? [];
        list.push({ id: skill.id, name: skill.name });
        nodesByParent.set(skill.parent_id, list);
      } else {
        branches.push({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          nodes: [],
        });
      }
    }

    for (const branch of branches) {
      branch.nodes = (nodesByParent.get(branch.id) ?? []).map((node) => ({
        id: node.id,
        name: node.name,
        progress: progressMap.get(node.id) ?? 0,
      }));
    }

    return { branches };
  } catch (err) {
    console.error("加载技能树失败:", err);
    return {
      error: "技能树加载失败，请确认已执行更新后的 supabase/schema.sql（新增 skills 与 skill_progress 表）",
    };
  }
}

export type FinanceMonth = {
  month: string;
  income: number;
  forcedSavings: number;
  livingExpense: number;
  sideIncome: number;
};

export type FinanceData =
  | {
      months: FinanceMonth[];
      totalSaved: number;
      percent: number;
    }
  | {
      error: string;
    };

/** 财务数据：所有已记录月份 + 累计存款（强制储蓄之和） */
export async function getFinanceData(userId: string): Promise<FinanceData> {
  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from("finances")
      .select(
        "month, income, forced_savings, living_expense, side_income"
      )
      .eq("user_id", userId)
      .order("month", { ascending: false });
    if (error) throw error;

    const months: FinanceMonth[] = (data ?? []).map((row) => ({
      month: row.month,
      income: Number(row.income) || 0,
      forcedSavings: Number(row.forced_savings) || 0,
      livingExpense: Number(row.living_expense) || 0,
      sideIncome: Number(row.side_income) || 0,
    }));
    const totalSaved = months.reduce(
      (sum, item) => sum + item.forcedSavings,
      0
    );

    return {
      months,
      totalSaved,
      percent: Math.min(100, Math.round((totalSaved / SAVINGS_TARGET) * 100)),
    };
  } catch (err) {
    console.error("加载财务数据失败:", err);
    return {
      error: "财务数据加载失败，请确认已执行更新后的 supabase/schema.sql（新增 finances 表）",
    };
  }
}

export type SavingsSummary =
  | {
      totalSaved: number;
      percent: number;
      unavailable: false;
    }
  | {
      totalSaved: 0;
      percent: 0;
      unavailable: true;
    };

/** 仪表盘用的轻量存款汇总（表不存在时降级为不可用，不影响页面其他部分） */
export async function getSavingsSummary(
  userId: string
): Promise<SavingsSummary> {
  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from("finances")
      .select("forced_savings")
      .eq("user_id", userId);
    if (error) throw error;

    const totalSaved = (data ?? []).reduce(
      (sum, row) => sum + (Number(row.forced_savings) || 0),
      0
    );
    return {
      totalSaved,
      percent: Math.min(100, Math.round((totalSaved / SAVINGS_TARGET) * 100)),
      unavailable: false,
    };
  } catch (err) {
    console.error("加载存款汇总失败:", err);
    return { totalSaved: 0, percent: 0, unavailable: true };
  }
}

export type RightsEntry = {
  id: string;
  eventDate: string;
  description: string;
  eventType: "gave_up" | "claimed";
};

export type RightsData =
  | {
      weekStats: { gaveUp: number; claimed: number };
      entries: RightsEntry[];
    }
  | {
      error: string;
    };

/** 权利账本：本周统计 + 最近记录 */
export async function getRightsData(userId: string): Promise<RightsData> {
  try {
    const client = getAdminClient();
    const { start, end } = getWeekRange();
    const [weekRes, listRes] = await Promise.all([
      client
        .from("rights_ledger")
        .select("event_type")
        .eq("user_id", userId)
        .gte("event_date", start)
        .lte("event_date", end),
      client
        .from("rights_ledger")
        .select("id, event_date, description, event_type")
        .eq("user_id", userId)
        .order("event_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (weekRes.error) throw weekRes.error;
    if (listRes.error) throw listRes.error;

    let gaveUp = 0;
    let claimed = 0;
    for (const row of weekRes.data ?? []) {
      if (row.event_type === "gave_up") gaveUp += 1;
      else claimed += 1;
    }

    const entries: RightsEntry[] = (listRes.data ?? []).map((row) => ({
      id: row.id,
      eventDate: row.event_date,
      description: row.description,
      eventType: row.event_type as RightsEntry["eventType"],
    }));

    return { weekStats: { gaveUp, claimed }, entries };
  } catch (err) {
    console.error("加载权利账本失败:", err);
    return {
      error: "权利账本加载失败，请确认已执行更新后的 supabase/schema.sql（新增 rights_ledger 表）",
    };
  }
}

export type ReviewEntry = {
  month: string;
  q1: string;
  q2: string;
  q3: string;
};

export type ReviewData =
  | {
      currentMonth: string;
      reviews: ReviewEntry[];
    }
  | {
      error: string;
    };

/** 每月复盘（止损三问）历史 */
export async function getReviewData(userId: string): Promise<ReviewData> {
  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from("monthly_review")
      .select("month, q1, q2, q3")
      .eq("user_id", userId)
      .order("month", { ascending: false })
      .limit(12);
    if (error) throw error;

    const reviews: ReviewEntry[] = (data ?? []).map((row) => ({
      month: row.month,
      q1: row.q1,
      q2: row.q2,
      q3: row.q3,
    }));
    return { currentMonth: getMonthKey(), reviews };
  } catch (err) {
    console.error("加载每月复盘失败:", err);
    return {
      error: "复盘数据加载失败，请确认已执行更新后的 supabase/schema.sql（新增 monthly_review 表）",
    };
  }
}

export type ReviewStatus =
  | { filled: boolean }
  | { filled: false; unavailable: true };

/** 仪表盘提醒用：本月复盘是否已填写（表不存在时降级） */
export async function getCurrentMonthReviewStatus(
  userId: string
): Promise<ReviewStatus> {
  try {
    const client = getAdminClient();
    const currentMonth = getMonthKey();
    const { data, error } = await client
      .from("monthly_review")
      .select("id")
      .eq("user_id", userId)
      .eq("month", currentMonth)
      .maybeSingle();
    if (error) throw error;
    return { filled: Boolean(data) };
  } catch (err) {
    console.error("加载本月复盘状态失败:", err);
    return { filled: false, unavailable: true };
  }
}

// ── 第五阶段：职业规划 ─────────────────────────────────

export type CareerEntry = {
  id: string;
  title: string;
  eventDate: string | null;
  payload: Record<string, unknown>;
};

export type CareerData = {
  positions: CareerEntry[];
  companies: CareerEntry[];
  industries: CareerEntry[];
  applications: CareerEntry[];
  interviews: CareerEntry[];
};

export type CareerResult =
  | CareerData
  | { error: string };

export async function getCareerData(userId: string): Promise<CareerResult> {
  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from("career_plans")
      .select("id, type, title, payload, event_date")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const grouped: Record<string, CareerEntry[]> = {
      position: [],
      company: [],
      industry: [],
      application: [],
      interview: [],
    };
    for (const row of data ?? []) {
      const list = grouped[row.type];
      if (!list) continue;
      list.push({
        id: row.id,
        title: row.title,
        eventDate: row.event_date,
        payload: row.payload ?? {},
      });
    }

    return {
      positions: grouped.position,
      companies: grouped.company,
      industries: grouped.industry,
      applications: grouped.application,
      interviews: grouped.interview,
    };
  } catch (err) {
    console.error("加载职业规划失败:", err);
    return {
      error: "职业规划加载失败，请确认已执行更新后的 supabase/schema.sql（新增 career_plans 表）",
    };
  }
}

// ── 第五阶段：复盘 ─────────────────────────────────────

export type ReflectionEntry = {
  type: "daily" | "weekly";
  dateKey: string;
  q1: string;
  q2: string;
  q3: string;
};

export type ReflectionData = {
  todayKey: string;
  weekKey: string;
  todayDaily: ReflectionEntry | null;
  thisWeek: ReflectionEntry | null;
  dailyHistory: ReflectionEntry[];
  weeklyHistory: ReflectionEntry[];
};

export type ReflectionResult =
  | ReflectionData
  | { error: string };

export async function getReflectionData(
  userId: string
): Promise<ReflectionResult> {
  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from("reflections")
      .select("type, date_key, q1, q2, q3")
      .eq("user_id", userId)
      .order("date_key", { ascending: false })
      .limit(60);
    if (error) throw error;

    const todayKey = getLocalDateKey();
    const weekKey = getWeekRange().start;
    const dailyHistory: ReflectionEntry[] = [];
    const weeklyHistory: ReflectionEntry[] = [];
    let todayDaily: ReflectionEntry | null = null;
    let thisWeek: ReflectionEntry | null = null;

    for (const row of data ?? []) {
      const entry: ReflectionEntry = {
        type: row.type,
        dateKey: row.date_key,
        q1: row.q1,
        q2: row.q2,
        q3: row.q3,
      };
      if (row.type === "daily") {
        if (row.date_key === todayKey) todayDaily = entry;
        else dailyHistory.push(entry);
      } else {
        if (row.date_key === weekKey) thisWeek = entry;
        else weeklyHistory.push(entry);
      }
    }

    return {
      todayKey,
      weekKey,
      todayDaily,
      thisWeek,
      dailyHistory: dailyHistory.slice(0, 7),
      weeklyHistory: weeklyHistory.slice(0, 12),
    };
  } catch (err) {
    console.error("加载复盘失败:", err);
    return {
      error: "复盘加载失败，请确认已执行更新后的 supabase/schema.sql（新增 reflections 表）",
    };
  }
}

// ── 第六阶段：成就 / 奖励 ─────────────────────────────

async function loadAchievementContext(
  client: SupabaseClient,
  userId: string
): Promise<AchievementContext> {
  const [logsRes, restRes, financesRes, careerRes, rightsRes] =
    await Promise.all([
      client
        .from("task_logs")
        .select("completed_at, xp_earned")
        .eq("user_id", userId),
      client.from("rest_days").select("date_key").eq("user_id", userId),
      client
        .from("finances")
        .select("forced_savings")
        .eq("user_id", userId),
      client
        .from("career_plans")
        .select("type, payload")
        .eq("user_id", userId),
      client
        .from("rights_ledger")
        .select("event_type")
        .eq("user_id", userId),
    ]);
  for (const res of [logsRes, restRes, financesRes, careerRes, rightsRes]) {
    if (res.error) throw res.error;
  }

  const logs = logsRes.data ?? [];
  const completionDates = [
    ...new Set(logs.map((log) => toLocalDateKey(log.completed_at))),
  ];
  const restDates = (restRes.data ?? []).map((row) => row.date_key);
  const english = await getEnglishXpAndDates(client, userId);
  const totalXp =
    logs.reduce((sum, log) => sum + (Number(log.xp_earned) || 0), 0) +
    english.xp;
  const savingsTotal = (financesRes.data ?? []).reduce(
    (sum, row) => sum + (Number(row.forced_savings) || 0),
    0
  );
  const careerRows = careerRes.data ?? [];

  return {
    totalLogs: logs.length + english.dates.length,
    streak: getStreak(completionDates, restDates),
    hasRestDay: restDates.length > 0,
    hasResume: careerRows.some((row) => row.type === "application"),
    hasIndustry: careerRows.some((row) => row.type === "industry"),
    hasInterview: careerRows.some((row) => row.type === "interview"),
    hasOffer: careerRows.some(
      (row) => row.type === "application" && row.payload?.result === "offer"
    ),
    savingsTotal,
    rightsClaimed: (rightsRes.data ?? []).filter(
      (row) => row.event_type === "claimed"
    ).length,
    level: getLevelInfo(totalXp).current.level,
  };
}

export type AchievementItem = AchievementDef & {
  unlocked: boolean;
  unlockedAt: string | null;
  newly: boolean;
};

export type AchievementsResult =
  | {
      items: AchievementItem[];
      newlyUnlocked: AchievementItem[];
    }
  | { error: string };

/** 计算当前应解锁的成就，把新达成的写入数据库并返回（含刚解锁的，用于动画） */
export async function getAchievementsData(
  userId: string
): Promise<AchievementsResult> {
  try {
    const client = getAdminClient();
    const context = await loadAchievementContext(client, userId);
    const eligible = new Set(computeEligibleCodes(context));

    const { data: existingRows, error: existingError } = await client
      .from("achievements")
      .select("code, unlocked_at")
      .eq("user_id", userId);
    if (existingError) throw existingError;

    const existing = new Map<string, string>();
    for (const row of existingRows ?? []) {
      existing.set(row.code, row.unlocked_at);
    }

    const newlyUnlocked: AchievementItem[] = [];
    for (const code of eligible) {
      if (!existing.has(code)) {
        await client
          .from("achievements")
          .insert({ user_id: userId, code });
        const def = ACHIEVEMENTS.find((item) => item.code === code);
        if (def) {
          newlyUnlocked.push({
            ...def,
            unlocked: true,
            unlockedAt: new Date().toISOString(),
            newly: true,
          });
        }
      }
    }

    const items: AchievementItem[] = ACHIEVEMENTS.map((def) => ({
      ...def,
      unlocked: eligible.has(def.code) || existing.has(def.code),
      unlockedAt: existing.get(def.code) ?? null,
      newly: newlyUnlocked.some((item) => item.code === def.code),
    }));

    return { items, newlyUnlocked };
  } catch (err) {
    console.error("加载成就失败:", err);
    return {
      error: "成就加载失败，请确认已执行更新后的 supabase/schema.sql",
    };
  }
}

export type RewardsData = {
  streak: number;
  savingsTotal: number;
  savingsPercent: number;
  level: number;
  levelTitle: string;
  offerUnlocked: boolean;
  badgeUnlockedCount: number;
  badgeTotal: number;
};

export type RewardsResult = RewardsData | { error: string };

/** 奖励页数据：连续打卡/存款/等级/offer 状态 + 徽章数量 */
export async function getRewardsData(userId: string): Promise<RewardsResult> {
  try {
    const client = getAdminClient();
    const context = await loadAchievementContext(client, userId);
    const eligible = new Set(computeEligibleCodes(context));
    const { data: existingRows } = await client
      .from("achievements")
      .select("code")
      .eq("user_id", userId);
    const unlockedSet = new Set([
      ...eligible,
      ...(existingRows ?? []).map((row) => row.code),
    ]);

    return {
      streak: context.streak,
      savingsTotal: context.savingsTotal,
      savingsPercent: Math.min(
        100,
        Math.round((context.savingsTotal / SAVINGS_TARGET) * 100)
      ),
      level: context.level,
      levelTitle:
        LEVELS.find((level) => level.level === context.level)?.title ?? "新手",
      offerUnlocked: context.hasOffer,
      badgeUnlockedCount: unlockedSet.size,
      badgeTotal: ACHIEVEMENTS.length,
    };
  } catch (err) {
    console.error("加载奖励数据失败:", err);
    return { error: "奖励数据加载失败，请确认已执行更新后的 supabase/schema.sql" };
  }
}

// ── 第七阶段：AI 顾问上下文 ────────────────────────────

export type AdvisorContext = {
  streak: number;
  hasHistory: boolean;
  brokenStreak: boolean;
  totalXp: number;
  level: number;
  levelTitle: string;
  stuckSkills: { name: string; daysSinceProgress: number }[];
};

export type AdvisorContextResult =
  | AdvisorContext
  | { error: string };

/** AI 顾问上下文：检测断签、停滞技能等，用于主动建议 */
export async function getAdvisorContext(
  userId: string
): Promise<AdvisorContextResult> {
  try {
    const client = getAdminClient();
    const [logsRes, restRes, progressRes, skillsRes] = await Promise.all([
      client
        .from("task_logs")
        .select("completed_at, xp_earned")
        .eq("user_id", userId),
      client.from("rest_days").select("date_key").eq("user_id", userId),
      client
        .from("skill_progress")
        .select("skill_id, progress, updated_at")
        .eq("user_id", userId),
      client.from("skills").select("id, name, parent_id"),
    ]);
    if (logsRes.error) throw logsRes.error;
    if (restRes.error) throw restRes.error;
    if (progressRes.error) throw progressRes.error;
    if (skillsRes.error) throw skillsRes.error;

    const logs = logsRes.data ?? [];
    const english = await getEnglishXpAndDates(client, userId);
    const completionDates = [
      ...new Set([
        ...logs.map((log) => toLocalDateKey(log.completed_at)),
        ...english.dates,
      ]),
    ];
    const restDates = (restRes.data ?? []).map((row) => row.date_key);
    const streak = getStreak(completionDates, restDates);
    const totalXp =
      logs.reduce((sum, log) => sum + (Number(log.xp_earned) || 0), 0) +
      english.xp;
    const levelInfo = getLevelInfo(totalXp);

    const skillNames = new Map<string, string>();
    for (const skill of skillsRes.data ?? []) {
      if (skill.parent_id) skillNames.set(skill.id, skill.name);
    }
    const now = Date.now();
    const DAY = 86400000;
    const stuckSkills = (progressRes.data ?? [])
      .map((row) => ({
        name: skillNames.get(row.skill_id) ?? "未知技能",
        progress: Number(row.progress) || 0,
        daysSinceProgress: Math.floor(
          (now - new Date(row.updated_at).getTime()) / DAY
        ),
      }))
      .filter(
        (item) =>
          item.progress > 0 &&
          item.progress < 100 &&
          item.daysSinceProgress >= 14
      )
      .sort((a, b) => b.daysSinceProgress - a.daysSinceProgress)
      .slice(0, 3)
      .map((item) => ({
        name: item.name,
        daysSinceProgress: item.daysSinceProgress,
      }));

    return {
      streak,
      hasHistory: logs.length > 0 || english.dates.length > 0,
      brokenStreak: streak === 0 && (logs.length > 0 || english.dates.length > 0),
      totalXp,
      level: levelInfo.current.level,
      levelTitle: levelInfo.current.title,
      stuckSkills,
    };
  } catch (err) {
    console.error("加载顾问上下文失败:", err);
    return {
      error: "顾问数据加载失败，请确认已执行更新后的 supabase/schema.sql",
    };
  }
}
