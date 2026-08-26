import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getRightsData } from "@/lib/queries";
import { getLocalDateKey } from "@/lib/task-logic";
import ToolPageHeader from "@/components/tool-page-header";
import RightsLedger from "@/components/rights-ledger";
import DataError from "@/components/data-error";

export const metadata = {
  title: "权利账本",
};

export default async function RightsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getRightsData(session.userId);
  if ("error" in data) return <DataError message={data.error} />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-6 sm:py-10">
      <ToolPageHeader title="权利账本" />
      <RightsLedger
        weekStats={data.weekStats}
        entries={data.entries}
        today={getLocalDateKey()}
      />
      <footer className="mt-2 text-center text-xs text-zinc-600">
        权利账本 · 第四阶段
      </footer>
    </main>
  );
}
