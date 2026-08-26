import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAdvisorContext } from "@/lib/queries";
import ToolPageHeader from "@/components/tool-page-header";
import AdvisorChat from "@/components/advisor-chat";
import DataError from "@/components/data-error";

export const metadata = {
  title: "AI顾问",
};

export default async function AdvisorPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getAdvisorContext(session.userId);
  if ("error" in data) return <DataError message={data.error} />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-6 sm:py-10">
      <ToolPageHeader title="AI顾问" />
      <AdvisorChat context={data} />
      <footer className="mt-2 text-center text-xs text-zinc-600">
        DeepSeek 驱动 · 第七阶段
      </footer>
    </main>
  );
}
