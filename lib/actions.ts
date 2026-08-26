"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/supabase-admin";
import { verifyPassword } from "@/lib/password";
import { createSession, destroySession, getSession } from "@/lib/session";
import {
  getLocalDateKey,
  getIsoWeekKey,
  getPeriodKey,
  getStreak,
  toLocalDateKey,
  getWeekRange,
  STREAK_30_MILESTONE_TASK_ID,
  type TaskCategory,
} from "@/lib/task-logic";
import {
  computeWeekStats,
  getActiveMonth,
  getForcedRhythm,
  QUICK_QUOTA,
  type EnglishLogRow,
} from "@/lib/english-logic";
import {
  ensureEnglishMonthlyGoals,
  recomputeEnglishWeek,
} from "@/lib/english-data";

export type LoginState = {
  error?: string;
};

/**
 * 简单密码登录：只校验密码，不需要注册。
 * 用户名固定为 admin（由 supabase/schema.sql 初始化）。
 */
export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "请输入密码" };

  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from("users")
      .select("id, username, password_hash")
      .eq("username", "admin")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return { error: "用户尚未初始化，请先在 Supabase 中执行 supabase/schema.sql" };
    }
    if (!verifyPassword(password, data.password_hash)) {
      return { error: "密码错误，请重试" };
    }

    await createSession({ userId: data.id, username: data.username });
  } catch (err) {
    console.error("登录失败:", err);
    return { error: "登录失败，请检查 Supabase 配置与网络" };
  }

  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export type CompleteTaskResult = {
  error?: string;
};

/**
 * 打卡：点击任务后标记本期完成并发放 XP。
 * - 每日任务：每天只能完成一次（周期键=当天日期）
 * - 每周任务：每周只能完成一次（周期键=ISO 周）
 * - 里程碑任务：只能完成一次（周期键=once）
 * 连续打卡满 30 天后，会自动完成对应的里程碑任务。
 */
export async function completeTask(taskId: string): Promise<CompleteTaskResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const client = getAdminClient();
  const { data: task, error: taskError } = await client
    .from("tasks")
    .select("id, category, xp, is_active")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError) {
    console.error("查询任务失败:", taskError);
    return { error: "任务加载失败，请稍后重试" };
  }
  if (!task || !task.is_active) return { error: "任务不存在或已停用" };

  const periodKey = getPeriodKey(task.category as TaskCategory);

  const { data: existing } = await client
    .from("task_logs")
    .select("id")
    .eq("user_id", session.userId)
    .eq("task_id", taskId)
    .eq("period_key", periodKey)
    .maybeSingle();

  if (existing) return { error: "本期任务已完成，无需重复打卡" };

  const { error: insertError } = await client.from("task_logs").insert({
    user_id: session.userId,
    task_id: taskId,
    period_key: periodKey,
    xp_earned: task.xp,
  });
  if (insertError) {
    console.error("打卡失败:", insertError);
    return { error: "打卡失败，请稍后重试" };
  }

  await maybeCompleteStreakMilestone(client, session.userId);
  revalidatePath("/dashboard");
  return {};
}

/** 连续打卡满 30 天时，自动完成「连续打卡30天」里程碑任务 */
async function maybeCompleteStreakMilestone(
  client: SupabaseClient,
  userId: string
): Promise<void> {
  const { data: logs } = await client
    .from("task_logs")
    .select("completed_at")
    .eq("user_id", userId);
  if (!logs) return;

  const dates = [
    ...new Set(logs.map((log) => toLocalDateKey(log.completed_at))),
  ];
  if (getStreak(dates) < 30) return;

  const { data: done } = await client
    .from("task_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("task_id", STREAK_30_MILESTONE_TASK_ID)
    .maybeSingle();
  if (done) return;

  const { data: milestoneTask } = await client
    .from("tasks")
    .select("xp")
    .eq("id", STREAK_30_MILESTONE_TASK_ID)
    .maybeSingle();
  if (!milestoneTask) return;

  await client.from("task_logs").insert({
    user_id: userId,
    task_id: STREAK_30_MILESTONE_TASK_ID,
    period_key: "once",
    xp_earned: milestoneTask.xp,
  });
}

export type SkillActionResult = {
  error?: string;
};

/** 新增自定义技能分支（parent_id 为空） */
export async function addSkillBranch(
  formData: FormData
): Promise<SkillActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!name) return { error: "请输入分支名称" };
  if (name.length > 30) return { error: "分支名称不能超过 30 个字" };

  const client = getAdminClient();
  const { data: maxRow } = await client
    .from("skills")
    .select("sort_order")
    .is("parent_id", null)
    .order("sort_order", { ascending: false })
    .limit(1);
  const sortOrder = (maxRow?.[0]?.sort_order ?? 0) + 10;

  const { error } = await client.from("skills").insert({
    name,
    description,
    parent_id: null,
    sort_order: sortOrder,
  });
  if (error) {
    console.error("新增技能分支失败:", error);
    return { error: "新增分支失败，请稍后重试" };
  }

  revalidatePath("/skills");
  return {};
}

/** 在指定分支下新增技能节点 */
export async function addSkillNode(
  branchId: string,
  formData: FormData
): Promise<SkillActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "请输入技能名称" };
  if (name.length > 30) return { error: "技能名称不能超过 30 个字" };

  const client = getAdminClient();
  const { data: branch } = await client
    .from("skills")
    .select("id")
    .eq("id", branchId)
    .is("parent_id", null)
    .maybeSingle();
  if (!branch) return { error: "找不到该技能分支" };

  const { data: maxRow } = await client
    .from("skills")
    .select("sort_order")
    .eq("parent_id", branchId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const sortOrder = (maxRow?.[0]?.sort_order ?? 0) + 10;

  const { error } = await client.from("skills").insert({
    name,
    description: null,
    parent_id: branchId,
    sort_order: sortOrder,
  });
  if (error) {
    console.error("新增技能节点失败:", error);
    return { error: "新增技能失败，请稍后重试" };
  }

  revalidatePath("/skills");
  return {};
}

/** 手动调整技能节点进度（0-100），自动关联任务将在后续版本实现 */
export async function updateSkillProgress(
  skillId: string,
  progress: number
): Promise<SkillActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const value = Math.round(Number(progress));
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return { error: "进度必须在 0-100 之间" };
  }

  const client = getAdminClient();
  const { error } = await client.from("skill_progress").upsert(
    {
      user_id: session.userId,
      skill_id: skillId,
      progress: value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,skill_id" }
  );
  if (error) {
    console.error("更新技能进度失败:", error);
    return { error: "更新进度失败，请稍后重试" };
  }

  revalidatePath("/skills");
  return {};
}

export type ToolActionResult = {
  error?: string;
};

function parseAmount(value: FormDataEntryValue | null): number {
  const num = Number(String(value ?? ""));
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

/** 保存某个月的财务记录（收入/强制储蓄/生活费/副业收入），按 用户+月份 覆盖保存 */
export async function saveFinance(
  formData: FormData
): Promise<ToolActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const month = String(formData.get("month") ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "请选择月份" };

  const client = getAdminClient();
  const { error } = await client.from("finances").upsert(
    {
      user_id: session.userId,
      month,
      income: parseAmount(formData.get("income")),
      forced_savings: parseAmount(formData.get("forced_savings")),
      living_expense: parseAmount(formData.get("living_expense")),
      side_income: parseAmount(formData.get("side_income")),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,month" }
  );
  if (error) {
    console.error("保存财务记录失败:", error);
    return { error: "保存失败，请稍后重试" };
  }

  revalidatePath("/finances");
  revalidatePath("/dashboard");
  return {};
}

/** 记录一条权利账本事件：gave_up=我算了 / claimed=我要回来了 */
export async function addRightsEvent(
  formData: FormData
): Promise<ToolActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const eventType = String(formData.get("event_type") ?? "");
  if (eventType !== "gave_up" && eventType !== "claimed") {
    return { error: "请选择事件类型" };
  }
  const eventDate = String(formData.get("event_date") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    return { error: "请选择日期" };
  }
  const description = String(formData.get("description") ?? "").trim();
  if (!description) return { error: "请填写事件描述" };
  if (description.length > 200) return { error: "描述不能超过 200 字" };

  const client = getAdminClient();
  const { error } = await client.from("rights_ledger").insert({
    user_id: session.userId,
    event_date: eventDate,
    event_type: eventType,
    description,
  });
  if (error) {
    console.error("记录失败:", error);
    return { error: "记录失败，请稍后重试" };
  }

  revalidatePath("/rights");
  return {};
}

/** 删除一条权利账本记录 */
export async function deleteRightsEvent(
  entryId: string
): Promise<ToolActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const client = getAdminClient();
  const { error } = await client
    .from("rights_ledger")
    .delete()
    .eq("id", entryId)
    .eq("user_id", session.userId);
  if (error) {
    console.error("删除记录失败:", error);
    return { error: "删除失败，请稍后重试" };
  }

  revalidatePath("/rights");
  return {};
}

/** 保存某月的止损三问复盘，按 用户+月份 覆盖保存 */
export async function saveMonthlyReview(
  formData: FormData
): Promise<ToolActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const month = String(formData.get("month") ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "请选择月份" };

  const q1 = String(formData.get("q1") ?? "").trim();
  const q2 = String(formData.get("q2") ?? "").trim();
  const q3 = String(formData.get("q3") ?? "").trim();
  if (!q1 || !q2 || !q3) return { error: "请填写全部三个问题" };
  if ([q1, q2, q3].some((text) => text.length > 500)) {
    return { error: "每个回答不能超过 500 字" };
  }

  const client = getAdminClient();
  const { error } = await client.from("monthly_review").upsert(
    {
      user_id: session.userId,
      month,
      q1,
      q2,
      q3,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,month" }
  );
  if (error) {
    console.error("保存复盘失败:", error);
    return { error: "保存失败，请稍后重试" };
  }

  revalidatePath("/review");
  revalidatePath("/dashboard");
  return {};
}

// ── 第六阶段：休息日 ────────────────────────────────────

/** 标记今天为休息日：不增加连续打卡天数，但也不打断连续性 */
export async function markRestDay(): Promise<ToolActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const client = getAdminClient();
  const { error } = await client.from("rest_days").upsert(
    {
      user_id: session.userId,
      date_key: getLocalDateKey(),
    },
    { onConflict: "user_id,date_key" }
  );
  if (error) {
    console.error("标记休息日失败:", error);
    return { error: "操作失败，请稍后重试" };
  }

  revalidatePath("/dashboard");
  return {};
}

/** 取消今天的休息日标记 */
export async function unmarkRestDay(): Promise<ToolActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const client = getAdminClient();
  const { error } = await client
    .from("rest_days")
    .delete()
    .eq("user_id", session.userId)
    .eq("date_key", getLocalDateKey());
  if (error) {
    console.error("取消休息日失败:", error);
    return { error: "操作失败，请稍后重试" };
  }

  revalidatePath("/dashboard");
  return {};
}

// ── 第五阶段：职业规划 ──────────────────────────────────

export type CareerEntryType =
  | "position"
  | "company"
  | "industry"
  | "application"
  | "interview";

export type CareerEntryInput = {
  title: string;
  eventDate?: string | null;
  payload?: Record<string, unknown>;
};

function cleanPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string") {
      const text = value.trim();
      if (text.length > 300) return {};
      cleaned[key] = text;
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/** 新增一条职业规划记录（岗位/公司/行业调研/投递/面试） */
export async function addCareerEntry(
  type: CareerEntryType,
  input: CareerEntryInput
): Promise<ToolActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const title = String(input.title ?? "").trim();
  if (!title) return { error: "请填写名称" };
  if (title.length > 60) return { error: "名称不能超过 60 字" };
  const eventDate =
    input.eventDate && /^\d{4}-\d{2}-\d{2}$/.test(input.eventDate)
      ? input.eventDate
      : null;

  const client = getAdminClient();
  const { error } = await client.from("career_plans").insert({
    user_id: session.userId,
    type,
    title,
    payload: cleanPayload(input.payload ?? {}),
    event_date: eventDate,
  });
  if (error) {
    console.error("新增职业规划记录失败:", error);
    return { error: "保存失败，请稍后重试" };
  }

  revalidatePath("/career");
  revalidatePath("/dashboard");
  return {};
}

/** 更新一条职业规划记录（编辑行业调研/投递结果/面试复盘） */
export async function updateCareerEntry(
  entryId: string,
  input: CareerEntryInput
): Promise<ToolActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const title = String(input.title ?? "").trim();
  if (!title) return { error: "请填写名称" };
  const eventDate =
    input.eventDate && /^\d{4}-\d{2}-\d{2}$/.test(input.eventDate)
      ? input.eventDate
      : null;

  const client = getAdminClient();
  const { error } = await client
    .from("career_plans")
    .update({
      title,
      payload: cleanPayload(input.payload ?? {}),
      event_date: eventDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .eq("user_id", session.userId);
  if (error) {
    console.error("更新职业规划记录失败:", error);
    return { error: "更新失败，请稍后重试" };
  }

  revalidatePath("/career");
  revalidatePath("/dashboard");
  return {};
}

/** 删除一条职业规划记录 */
export async function deleteCareerEntry(
  entryId: string
): Promise<ToolActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const client = getAdminClient();
  const { error } = await client
    .from("career_plans")
    .delete()
    .eq("id", entryId)
    .eq("user_id", session.userId);
  if (error) {
    console.error("删除职业规划记录失败:", error);
    return { error: "删除失败，请稍后重试" };
  }

  revalidatePath("/career");
  revalidatePath("/dashboard");
  return {};
}

// ── 第五阶段：复盘 ─────────────────────────────────────

/** 保存复盘（daily=每日收尾 / weekly=周日复盘），按 用户+类型+日期 覆盖保存 */
export async function saveReflection(
  formData: FormData
): Promise<ToolActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const type = String(formData.get("type") ?? "");
  if (type !== "daily" && type !== "weekly") return { error: "复盘类型错误" };
  const dateKey = String(formData.get("date_key") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return { error: "请选择日期" };

  const q1 = String(formData.get("q1") ?? "").trim();
  const q2 = String(formData.get("q2") ?? "").trim();
  const q3 = String(formData.get("q3") ?? "").trim();
  if (!q1 || !q2 || !q3) return { error: "请填写全部内容" };
  if ([q1, q2, q3].some((text) => text.length > 500)) {
    return { error: "每项不能超过 500 字" };
  }

  const client = getAdminClient();
  const { error } = await client.from("reflections").upsert(
    {
      user_id: session.userId,
      type,
      date_key: dateKey,
      q1,
      q2,
      q3,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,type,date_key" }
  );
  if (error) {
    console.error("保存复盘失败:", error);
    return { error: "保存失败，请稍后重试" };
  }

  revalidatePath("/reflection");
  return {};
}

// ── 第七阶段：DeepSeek AI 顾问 ─────────────────────────

export type AdvisorMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AdvisorModel = "chat" | "flash" | "pro";

const ADVISOR_SYSTEM_PROMPT = `你是「成长顾问」，一个安装在个人成长系统中的 AI 引导 NPC。
人设要求：
1. 客观、零迎合：不说空话套话，不为了安慰而说好话。
2. 直接指出问题：发现拖延、自我欺骗、目标模糊等迹象时，直接点出来。
3. 给可落地建议：每条建议必须是今天/本周就能执行的具体动作，避免泛泛而谈。
4. 语气简洁有力，用中文回答，一般控制在 300 字以内。
如果用户提到断签、技能停滞、复盘、求职、存款等话题，结合系统数据（用户会在消息里提供）给出针对性分析。`;

/**
 * 调用 DeepSeek Chat Completions（OpenAI 兼容接口）。
 * API Key 只存在于服务端环境变量，绝不发送到前端。
 */
export async function chatWithAdvisor(
  messages: AdvisorMessage[],
  model: AdvisorModel = "chat"
): Promise<{ reply?: string; error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return { error: "未配置 DEEPSEEK_API_KEY，请参考 README「配置 DeepSeek」后重启" };
  }

  const baseUrl = (
    process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com"
  ).replace(/\/+$/, "");
  const modelKey = `DEEPSEEK_MODEL_${model.toUpperCase()}`;
  const modelName = process.env[modelKey] ?? "deepseek-chat";
  const history = messages.slice(-12);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: ADVISOR_SYSTEM_PROMPT },
          ...history,
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`DeepSeek 请求失败 ${res.status}:`, text.slice(0, 300));
      return { error: `AI 服务返回错误（${res.status}），请稍后重试` };
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = json.choices?.[0]?.message?.content;
    if (!reply) return { error: "AI 没有返回内容，请重试" };
    return { reply };
  } catch (err) {
    console.error("DeepSeek 请求失败:", err);
    return { error: "无法连接 AI 服务，请检查网络或 API Key 配置" };
  }
}

// ── 英语工作台（第八阶段）────────────────────────────────

/** 选择今天的节奏（快速日额度 + 周日硬指标强制校验） */
export async function chooseEnglishRhythm(
  rhythmCode: string
): Promise<ToolActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const client = getAdminClient();
  const [rhythmRes, rhythmsRes, scheduleRes, logsRes] = await Promise.all([
    client
      .from("english_rhythms")
      .select("code, name")
      .eq("code", rhythmCode)
      .eq("is_active", true)
      .maybeSingle(),
    client
      .from("english_rhythms")
      .select("code, name")
      .eq("is_active", true),
    client.from("english_schedule").select("*").order("month_index"),
    client
      .from("english_daily_logs")
      .select("date_key, rhythm_code, completed_tasks, xp_earned")
      .eq("user_id", session.userId),
  ]);
  if (rhythmRes.error || rhythmsRes.error || scheduleRes.error || logsRes.error) {
    console.error(
      "加载节奏数据失败:",
      rhythmRes.error ?? rhythmsRes.error ?? scheduleRes.error ?? logsRes.error
    );
    return { error: "加载失败，请稍后重试" };
  }

  const rhythm = rhythmRes.data;
  if (!rhythm) return { error: "节奏不存在或已停用" };

  const todayKey = getLocalDateKey();
  const range = getWeekRange();
  const todayLog = (logsRes.data ?? []).find((log) => log.date_key === todayKey);
  const weekLogs = (logsRes.data ?? []).filter(
    (log) => log.date_key >= range.start && log.date_key <= range.end
  );
  const stats = computeWeekStats(
    weekLogs.map((log) => ({
      dateKey: log.date_key,
      rhythmCode: log.rhythm_code,
      completedTasks: log.completed_tasks ?? [],
    }))
  );

  // 防偷懒规则一：快速日一周最多 2 次
  if (rhythmCode === "quick") {
    const prospective =
      stats.quickCount + (todayLog?.rhythm_code === "quick" ? 0 : 1);
    if (prospective > QUICK_QUOTA) {
      return { error: `本周快速日额度已用完（最多 ${QUICK_QUOTA} 次），今天换个节奏吧` };
    }
  }

  // 防偷懒规则二：周日硬指标未达标时强制安排
  const schedule = (scheduleRes.data ?? []).map((row) => ({
    monthIndex: row.month_index,
    monthLabel: row.month_label,
    startDate: row.start_date,
    endDate: row.end_date,
    combo: row.combo ?? [],
    specialDays: row.special_days ?? [],
    note: row.note,
  }));
  const activeMonth = getActiveMonth(todayKey, schedule);
  if (activeMonth) {
    const forced = getForcedRhythm({
      todayKey,
      weekEnd: range.end,
      stats,
      monthIndex: activeMonth.monthIndex,
    });
    if (forced && forced.code !== rhythmCode) {
      const nameMap = new Map(
        (rhythmsRes.data ?? []).map((row) => [row.code, row.name])
      );
      return {
        error: `本周硬指标未达标（还差：${forced.missing.join("、")}），今天必须安排：${nameMap.get(forced.code) ?? forced.code}`,
      };
    }
  }

  const payload = {
    user_id: session.userId,
    date_key: todayKey,
    rhythm_code: rhythmCode,
    completed_tasks: todayLog?.completed_tasks ?? [],
    used_quick_quota: rhythmCode === "quick",
    xp_earned: todayLog?.xp_earned ?? 0,
    updated_at: new Date().toISOString(),
  };
  const { error } = await client.from("english_daily_logs").upsert(payload, {
    onConflict: "user_id,date_key",
  });
  if (error) {
    console.error("选择节奏失败:", error);
    return { error: "保存失败，请稍后重试" };
  }

  await recomputeEnglishWeek(client, session.userId);
  revalidatePath("/english");
  revalidatePath("/dashboard");
  return {};
}

/** 勾选/取消今天的节奏任务，联动 XP */
export async function toggleEnglishTask(
  taskKey: string
): Promise<ToolActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const client = getAdminClient();
  const todayKey = getLocalDateKey();
  const { data: log, error: logError } = await client
    .from("english_daily_logs")
    .select("id, rhythm_code, completed_tasks, xp_earned")
    .eq("user_id", session.userId)
    .eq("date_key", todayKey)
    .maybeSingle();
  if (logError || !log) {
    return { error: "请先选择今天的节奏" };
  }

  const { data: rhythm, error: rhythmError } = await client
    .from("english_rhythms")
    .select("tasks")
    .eq("code", log.rhythm_code)
    .maybeSingle();
  if (rhythmError || !rhythm) return { error: "节奏数据异常，请重试" };

  const task = (rhythm.tasks ?? []).find(
    (item: { key: string }) => item.key === taskKey
  );
  if (!task) return { error: "该任务不属于今天的节奏" };

  const completed: string[] = log.completed_tasks ?? [];
  const has = completed.includes(taskKey);
  const next = has
    ? completed.filter((key) => key !== taskKey)
    : [...completed, taskKey];
  const nextXp = Math.max(
    0,
    (Number(log.xp_earned) || 0) + (has ? -task.xp : task.xp)
  );

  const { error } = await client
    .from("english_daily_logs")
    .update({
      completed_tasks: next,
      xp_earned: nextXp,
      updated_at: new Date().toISOString(),
    })
    .eq("id", log.id);
  if (error) {
    console.error("更新任务状态失败:", error);
    return { error: "保存失败，请稍后重试" };
  }

  await recomputeEnglishWeek(client, session.userId);
  revalidatePath("/english");
  revalidatePath("/dashboard");
  return {};
}

/** 记录一个生词（计入月度词汇量） */
export async function addEnglishWord(
  word: string,
  note: string
): Promise<ToolActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const text = String(word ?? "").trim();
  if (!text) return { error: "请输入单词" };
  if (text.length > 60) return { error: "单词过长" };

  const client = getAdminClient();
  const { error } = await client.from("english_words").insert({
    user_id: session.userId,
    word: text,
    note: String(note ?? "").trim() || null,
  });
  if (error) {
    console.error("记录生词失败:", error);
    return { error: "保存失败，请稍后重试" };
  }

  revalidatePath("/english");
  return {};
}

/** 完成本月口试（+50 XP），只能在口试日期当天或之后标记 */
export async function markEnglishOralExam(): Promise<ToolActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const client = getAdminClient();
  const todayKey = getLocalDateKey();
  const scheduleRes = await client
    .from("english_schedule")
    .select("*")
    .order("month_index");
  if (scheduleRes.error) return { error: "加载计划失败，请稍后重试" };

  const schedule = (scheduleRes.data ?? []).map((row) => ({
    monthIndex: row.month_index,
    monthLabel: row.month_label,
    startDate: row.start_date,
    endDate: row.end_date,
    combo: row.combo ?? [],
    specialDays: row.special_days ?? [],
    note: row.note,
  }));
  const activeMonth = getActiveMonth(todayKey, schedule);
  if (!activeMonth) return { error: "当前不在计划期内" };

  const exam = (activeMonth.specialDays ?? []).find(
    (day) => day.type === "exam"
  );
  if (!exam) return { error: "本月没有口试安排" };
  if (todayKey < exam.date) {
    return { error: `还没到口试日期（${exam.label}：${exam.date}）` };
  }

  await ensureEnglishMonthlyGoals(client, session.userId);
  const { data: goal, error: goalError } = await client
    .from("english_monthly_goals")
    .select("id, oral_exam_done")
    .eq("user_id", session.userId)
    .eq("month_index", activeMonth.monthIndex)
    .maybeSingle();
  if (goalError || !goal) return { error: "目标数据异常，请重试" };
  if (goal.oral_exam_done) return { error: "本月口试已完成" };

  const { error } = await client
    .from("english_monthly_goals")
    .update({
      oral_exam_done: true,
      oral_exam_xp: 50,
      updated_at: new Date().toISOString(),
    })
    .eq("id", goal.id);
  if (error) {
    console.error("完成口试失败:", error);
    return { error: "保存失败，请稍后重试" };
  }

  revalidatePath("/english");
  revalidatePath("/dashboard");
  return {};
}
