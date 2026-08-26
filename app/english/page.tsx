import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getEnglishData } from "@/lib/english-data";
import ToolPageHeader from "@/components/tool-page-header";
import EnglishWorkbench from "@/components/english-workbench";
import DataError from "@/components/data-error";

export const metadata = {
  title: "英语工作台",
};

export default async function EnglishPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getEnglishData(session.userId);
  if ("error" in data) return <DataError message={data.error} />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-6 sm:py-10">
      <ToolPageHeader title="英语工作台" />
      <EnglishWorkbench data={data} />
      <footer className="mt-2 text-center text-xs text-zinc-600">
        每日节奏选择 + 每周硬指标 · 英语模块
      </footer>
    </main>
  );
}
