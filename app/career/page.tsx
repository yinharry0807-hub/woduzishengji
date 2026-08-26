import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCareerData } from "@/lib/queries";
import ToolPageHeader from "@/components/tool-page-header";
import CareerTracker from "@/components/career-tracker";
import DataError from "@/components/data-error";

export const metadata = {
  title: "职业规划",
};

export default async function CareerPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getCareerData(session.userId);
  if ("error" in data) return <DataError message={data.error} />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-6 sm:py-10">
      <ToolPageHeader title="职业规划" />
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="rounded-xl bg-white/5 py-2.5">
          <p className="text-lg font-bold">{data.positions.length}</p>
          <p className="text-[10px] text-zinc-500">目标岗位</p>
        </div>
        <div className="rounded-xl bg-white/5 py-2.5">
          <p className="text-lg font-bold">{data.companies.length}</p>
          <p className="text-[10px] text-zinc-500">目标公司</p>
        </div>
        <div className="rounded-xl bg-white/5 py-2.5">
          <p className="text-lg font-bold">{data.applications.length}</p>
          <p className="text-[10px] text-zinc-500">已投递</p>
        </div>
        <div className="rounded-xl bg-white/5 py-2.5">
          <p className="text-lg font-bold">{data.interviews.length}</p>
          <p className="text-[10px] text-zinc-500">面试</p>
        </div>
      </div>
      <CareerTracker data={data} />
      <footer className="mt-2 text-center text-xs text-zinc-600">
        职业规划 · 第五阶段
      </footer>
    </main>
  );
}
