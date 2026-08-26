import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getFinanceData } from "@/lib/queries";
import { getMonthKey } from "@/lib/task-logic";
import ToolPageHeader from "@/components/tool-page-header";
import FinanceTracker from "@/components/finance-tracker";
import DataError from "@/components/data-error";

export const metadata = {
  title: "财务追踪",
};

export default async function FinancesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getFinanceData(session.userId);
  if ("error" in data) return <DataError message={data.error} />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-6 sm:py-10">
      <ToolPageHeader title="财务追踪" />
      <FinanceTracker
        currentMonth={getMonthKey()}
        months={data.months}
        totalSaved={data.totalSaved}
        percent={data.percent}
      />
      <footer className="mt-2 text-center text-xs text-zinc-600">
        财务追踪 · 第四阶段
      </footer>
    </main>
  );
}
