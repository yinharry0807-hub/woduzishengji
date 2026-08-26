import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getReviewData } from "@/lib/queries";
import ToolPageHeader from "@/components/tool-page-header";
import MonthlyReview from "@/components/monthly-review";
import DataError from "@/components/data-error";

export const metadata = {
  title: "止损三问",
};

export default async function ReviewPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getReviewData(session.userId);
  if ("error" in data) return <DataError message={data.error} />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-6 sm:py-10">
      <ToolPageHeader title="止损三问" />
      <MonthlyReview
        currentMonth={data.currentMonth}
        reviews={data.reviews}
      />
      <footer className="mt-2 text-center text-xs text-zinc-600">
        每月 1 日复盘 · 第四阶段
      </footer>
    </main>
  );
}
