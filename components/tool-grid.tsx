import Link from "next/link";

const TOOLS = [
  {
    href: "/skills",
    emoji: "🌳",
    name: "技能树",
    desc: "查看与调整技能进度",
  },
  {
    href: "/english",
    emoji: "🗣",
    name: "英语工作台",
    desc: "每日节奏 + 每周硬指标",
  },
  {
    href: "/career",
    emoji: "💼",
    name: "职业规划",
    desc: "岗位/公司/投递/面试",
  },
  {
    href: "/finances",
    emoji: "💰",
    name: "财务追踪",
    desc: "记录每月收支与存款",
  },
  {
    href: "/reflection",
    emoji: "📓",
    name: "复盘",
    desc: "每晚3分钟 + 周日总结",
  },
  {
    href: "/rights",
    emoji: "⚖️",
    name: "权利账本",
    desc: "算了 · 要回来了",
  },
  {
    href: "/rewards",
    emoji: "🏅",
    name: "奖励与成就",
    desc: "徽章墙与解锁奖励",
  },
  {
    href: "/advisor",
    emoji: "🤖",
    name: "AI顾问",
    desc: "DeepSeek 引导 NPC",
  },
  {
    href: "/review",
    emoji: "📋",
    name: "止损三问",
    desc: "每月1日的复盘提醒",
  },
] as const;

export default function ToolGrid() {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">我的工具</h2>
      <div className="grid grid-cols-2 gap-3">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-violet-400/40 hover:bg-white/[0.07]"
          >
            <span className="text-2xl">{tool.emoji}</span>
            <p className="mt-2 text-sm font-semibold">{tool.name}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{tool.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
