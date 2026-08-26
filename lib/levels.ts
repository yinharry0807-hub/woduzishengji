export type Level = {
  level: number;
  title: string;
  /** 达到该等级所需的总 XP（累积） */
  threshold: number;
};

export const LEVELS: Level[] = [
  { level: 1, title: "新手", threshold: 0 },
  { level: 2, title: "觉醒", threshold: 100 },
  { level: 3, title: "行动者", threshold: 300 },
  { level: 4, title: "坚持者", threshold: 600 },
  { level: 5, title: "突破者", threshold: 1000 },
  { level: 6, title: "掌控者", threshold: 1500 },
  { level: 7, title: "强者", threshold: 2500 },
  { level: 8, title: "领跑者", threshold: 4000 },
  { level: 9, title: "主宰者", threshold: 6000 },
  { level: 10, title: "传奇", threshold: 10000 },
];

export type LevelInfo = {
  current: Level;
  next: Level | null;
  totalXp: number;
  /** 已获得经验值中，落在当前等级区间的部分 */
  xpIntoLevel: number;
  /** 升到下一级还差多少 XP */
  xpToNext: number;
  /** 当前等级进度 0~1 */
  progress: number;
  isMaxLevel: boolean;
};

export function getLevelInfo(totalXp: number): LevelInfo {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (totalXp >= level.threshold) current = level;
  }

  const next = LEVELS.find((level) => level.threshold > totalXp) ?? null;
  const xpIntoLevel = totalXp - current.threshold;
  const span = next ? next.threshold - current.threshold : 1;

  return {
    current,
    next,
    totalXp,
    xpIntoLevel,
    xpToNext: next ? next.threshold - totalXp : 0,
    progress: next ? Math.min(1, xpIntoLevel / span) : 1,
    isMaxLevel: !next,
  };
}
