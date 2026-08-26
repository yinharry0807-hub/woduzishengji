export type AchievementDef = {
  code: string;
  title: string;
  description: string;
  emoji: string;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { code: "first_checkin", title: "第一次打卡", description: "完成任意一项任务", emoji: "✅" },
  { code: "streak_7", title: "连续打卡7天", description: "连续 7 天完成打卡", emoji: "🔥" },
  { code: "streak_21", title: "连续打卡21天", description: "连续 21 天完成打卡", emoji: "⚡" },
  { code: "first_rest_day", title: "合理休息", description: "第一次标记休息日", emoji: "🛌" },
  { code: "first_resume", title: "投出第一份简历", description: "完成第一次简历投递", emoji: "📮" },
  { code: "first_industry", title: "行业调研入门", description: "完成第一个行业调研", emoji: "🔍" },
  { code: "first_interview", title: "第一场面试", description: "完成第一次面试记录", emoji: "🎤" },
  { code: "first_offer", title: "拿下 Offer", description: "投递结果出现 offer", emoji: "🏆" },
  { code: "savings_10000", title: "存款破万", description: "累计强制储蓄达到 ¥10,000", emoji: "💰" },
  { code: "rights_first", title: "权益觉醒", description: "第一次记录「我要回来了」", emoji: "✊" },
  { code: "level_5", title: "突破者", description: "达到 Lv.5 突破者", emoji: "🚀" },
  { code: "level_10", title: "传奇", description: "达到 Lv.10 传奇", emoji: "👑" },
];

export type AchievementContext = {
  totalLogs: number;
  streak: number;
  hasRestDay: boolean;
  hasResume: boolean;
  hasIndustry: boolean;
  hasInterview: boolean;
  hasOffer: boolean;
  savingsTotal: number;
  rightsClaimed: number;
  level: number;
};

/** 根据现状计算已满足条件的成就编码 */
export function computeEligibleCodes(context: AchievementContext): string[] {
  const codes: string[] = [];
  if (context.totalLogs > 0) codes.push("first_checkin");
  if (context.streak >= 7) codes.push("streak_7");
  if (context.streak >= 21) codes.push("streak_21");
  if (context.hasRestDay) codes.push("first_rest_day");
  if (context.hasResume) codes.push("first_resume");
  if (context.hasIndustry) codes.push("first_industry");
  if (context.hasInterview) codes.push("first_interview");
  if (context.hasOffer) codes.push("first_offer");
  if (context.savingsTotal >= 10000) codes.push("savings_10000");
  if (context.rightsClaimed > 0) codes.push("rights_first");
  if (context.level >= 5) codes.push("level_5");
  if (context.level >= 10) codes.push("level_10");
  return codes;
}
