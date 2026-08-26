import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getReflectionData } from "@/lib/queries";
import ToolPageHeader from "@/components/tool-page-header";
import ReflectionTracker from "@/components/reflection-tracker";
import DataError from "@/components/data-error";

export const metadata = {
  title: "复盘",
};

export default async function ReflectionPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getReflectionData(session.userId);
  if ("error" in data) return <DataError message={data.error} />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-6 sm:py-10">
      <ToolPageHeader title="复盘" />
      <ReflectionTracker data={data} />
      <footer className="mt-2 text-center text-xs text-zinc-600">
        每晚3分钟 + 周日复盘 · 第五阶段
      </footer>
    </main>
  );
}
