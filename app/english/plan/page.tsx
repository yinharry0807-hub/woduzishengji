import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getEnglishPlan } from "@/lib/english-data";
import DataError from "@/components/data-error";
import { ChevronLeftIcon } from "@/components/icons";

const RHYTHM_NAMES: Record<string, string> = {
  quick: "快速日",
  input: "输入日",
  dialogue: "对话日",
  real: "真人日",
  intensive: "精学日",
  review: "复盘日",
};

export const metadata = {
  title: "半年计划",
};

export default async function EnglishPlanPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getEnglishPlan();
  if ("error" in data) return <DataError message={data.error} />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-6 sm:py-10">
      <header className="flex items-center justify-between gap-2">
        <Link
          href="/english"
          className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-zinc-300 transition hover:border-violet-400/40 hover:text-violet-300"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" />
          英语工作台
        </Link>
        <h1 className="text-lg font-bold">半年计划</h1>
        <span className="w-16" />
      </header>

      <p className="text-xs text-zinc-500">
        内置节奏组合建议，灵活排到哪一天都行；特殊日（口试/里程碑）建议照做。
      </p>

      {data.map((month) => (
        <section
          key={month.monthIndex}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
        >
          <h2 className="text-base font-semibold">{month.monthLabel}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {month.combo.map((item) => (
              <span
                key={item.rhythm}
                className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-zinc-300"
              >
                {RHYTHM_NAMES[item.rhythm] ?? item.rhythm} ×{item.count}
              </span>
            ))}
          </div>
          {month.specialDays.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {month.specialDays.map((day) => (
                <li
                  key={day.date}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${
                    day.type === "exam"
                      ? "bg-fuchsia-500/10 text-fuchsia-200"
                      : "bg-white/5 text-zinc-400"
                  }`}
                >
                  <span className="text-[11px] text-zinc-500">{day.date}</span>
                  {day.label}
                </li>
              ))}
            </ul>
          )}
          {month.note && (
            <p className="mt-3 text-xs text-zinc-500">备注：{month.note}</p>
          )}
        </section>
      ))}

      <footer className="mt-2 text-center text-xs text-zinc-600">
        半年计划 · 内置数据
      </footer>
    </main>
  );
}
