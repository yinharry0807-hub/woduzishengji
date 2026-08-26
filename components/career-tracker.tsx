"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addCareerEntry,
  deleteCareerEntry,
  updateCareerEntry,
  type CareerEntryType,
} from "@/lib/actions";
import type { CareerData, CareerEntry } from "@/lib/queries";
import { PlusIcon } from "@/components/icons";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20";
const primaryButtonClass =
  "rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90";
const ghostButtonClass =
  "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/10";

const RESULT_OPTIONS = [
  { value: "pending", label: "未回应" },
  { value: "interview", label: "面试" },
  { value: "rejected", label: "被拒" },
  { value: "offer", label: "Offer" },
] as const;

const RESULT_BADGES: Record<string, string> = {
  pending: "bg-zinc-500/15 text-zinc-300",
  interview: "bg-sky-500/15 text-sky-300",
  rejected: "bg-rose-500/15 text-rose-300",
  offer: "bg-emerald-500/15 text-emerald-300",
};

function Field({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-zinc-400">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        maxLength={300}
        className={inputClass}
      />
    </label>
  );
}

export default function CareerTracker({ data }: { data: CareerData }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editingIndustry, setEditingIndustry] = useState<string | null>(null);

  async function run(
    action: () => Promise<{ error?: string }>
  ): Promise<boolean> {
    setError(null);
    const result = await action();
    if (result?.error) {
      setError(result.error);
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleAddSimple(
    type: "position" | "company",
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const ok = await run(() =>
      addCareerEntry(type, { title: String(formData.get("title") ?? "") })
    );
    if (ok) e.currentTarget.reset();
  }

  async function handleDelete(id: string) {
    await run(() => deleteCareerEntry(id));
  }

  function SimpleListSection({
    title,
    type,
    placeholder,
    entries,
  }: {
    title: string;
    type: "position" | "company";
    placeholder: string;
    entries: CareerEntry[];
  }) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="mb-3 text-base font-semibold">{title}</h2>
        <form onSubmit={(e) => handleAddSimple(type, e)} className="flex gap-2">
          <input
            name="title"
            placeholder={placeholder}
            maxLength={60}
            required
            className={inputClass}
          />
          <button type="submit" className={primaryButtonClass}>
            添加
          </button>
        </form>
        {entries.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {entries.map((entry) => (
              <span
                key={entry.id}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-1 pl-3 pr-1.5 text-sm"
              >
                {entry.title}
                <button
                  type="button"
                  onClick={() => handleDelete(entry.id)}
                  aria-label={`删除 ${entry.title}`}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs text-zinc-400 transition hover:bg-rose-500/30 hover:text-rose-300"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-center text-xs text-zinc-600">暂无，添加第一个</p>
        )}
      </section>
    );
  }

  async function handleAddIndustry(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = String(formData.get("title") ?? "");
    const payload = {
      salary: String(formData.get("salary") ?? ""),
      threshold: String(formData.get("threshold") ?? ""),
      overtime: String(formData.get("overtime") ?? ""),
      outlook: String(formData.get("outlook") ?? ""),
      match: String(formData.get("match") ?? ""),
      interested: String(formData.get("interested") ?? ""),
    };
    const ok = await run(() => addCareerEntry("industry", { title, payload }));
    if (ok) e.currentTarget.reset();
  }

  async function handleSaveIndustry(
    entryId: string,
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const ok = await run(() =>
      updateCareerEntry(entryId, {
        title: String(formData.get("title") ?? ""),
        payload: {
          salary: String(formData.get("salary") ?? ""),
          threshold: String(formData.get("threshold") ?? ""),
          overtime: String(formData.get("overtime") ?? ""),
          outlook: String(formData.get("outlook") ?? ""),
          match: String(formData.get("match") ?? ""),
          interested: String(formData.get("interested") ?? ""),
        },
      })
    );
    if (ok) setEditingIndustry(null);
  }

  function IndustryCard({ entry }: { entry: CareerEntry }) {
    const p = entry.payload as Record<string, string>;
    if (editingIndustry === entry.id) {
      return (
        <form
          onSubmit={(e) => handleSaveIndustry(entry.id, e)}
          className="space-y-2 rounded-xl border border-sky-400/30 bg-sky-500/[0.06] p-4"
        >
          <div className="grid grid-cols-2 gap-2">
            <Field label="行业名" name="title" defaultValue={entry.title} />
            <Field label="薪资范围" name="salary" defaultValue={p.salary} placeholder="如 8-12k" />
            <Field label="门槛" name="threshold" defaultValue={p.threshold} placeholder="学历/经验/技能" />
            <Field label="加班情况" name="overtime" defaultValue={p.overtime} placeholder="965/大小周/996" />
            <Field label="前景" name="outlook" defaultValue={p.outlook} placeholder="增长/稳定/萎缩" />
            <Field label="我的匹配度" name="match" defaultValue={p.match} placeholder="低/中/高" />
            <Field label="我感不感兴趣" name="interested" defaultValue={p.interested} placeholder="感兴趣/一般/不感兴趣" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className={primaryButtonClass}>保存</button>
            <button
              type="button"
              onClick={() => setEditingIndustry(null)}
              className={ghostButtonClass}
            >
              取消
            </button>
          </div>
        </form>
      );
    }

    return (
      <li className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium">{entry.title}</p>
          <div className="flex shrink-0 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setEditingIndustry(entry.id)}
              className="text-zinc-500 transition hover:text-sky-300"
            >
              编辑
            </button>
            <button
              type="button"
              onClick={() => handleDelete(entry.id)}
              className="text-zinc-500 transition hover:text-rose-300"
            >
              删除
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
          薪资 {p.salary || "—"} · 门槛 {p.threshold || "—"} · 加班{" "}
          {p.overtime || "—"} · 前景 {p.outlook || "—"}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          匹配度 {p.match || "—"} · 兴趣 {p.interested || "—"}
        </p>
      </li>
    );
  }

  async function handleAddApplication(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const ok = await run(() =>
      addCareerEntry("application", {
        title: String(formData.get("company") ?? ""),
        eventDate: String(formData.get("event_date") ?? ""),
        payload: {
          position: String(formData.get("position") ?? ""),
          result: String(formData.get("result") ?? "pending"),
        },
      })
    );
    if (ok) e.currentTarget.reset();
  }

  async function handleResultChange(entry: CareerEntry, result: string) {
    await run(() =>
      updateCareerEntry(entry.id, {
        title: entry.title,
        eventDate: entry.eventDate,
        payload: { ...entry.payload, result },
      })
    );
  }

  async function handleAddInterview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const ok = await run(() =>
      addCareerEntry("interview", {
        title: String(formData.get("company") ?? ""),
        eventDate: String(formData.get("event_date") ?? ""),
        payload: {
          questions: String(formData.get("questions") ?? ""),
          performance: String(formData.get("performance") ?? ""),
          review: String(formData.get("review") ?? ""),
        },
      })
    );
    if (ok) e.currentTarget.reset();
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
          {error}
        </p>
      )}

      <SimpleListSection
        title="目标岗位"
        type="position"
        placeholder="如：跨境供应链专员"
        entries={data.positions}
      />
      <SimpleListSection
        title="目标公司"
        type="company"
        placeholder="如：安克创新"
        entries={data.companies}
      />

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="mb-3 text-base font-semibold">行业调研</h2>
        <form
          onSubmit={handleAddIndustry}
          className="space-y-2 rounded-xl border border-dashed border-white/15 p-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <Field label="行业名" name="title" placeholder="如：跨境电商" />
            <Field label="薪资范围" name="salary" placeholder="如 8-12k" />
            <Field label="门槛" name="threshold" placeholder="学历/经验/技能" />
            <Field label="加班情况" name="overtime" placeholder="965/大小周/996" />
            <Field label="前景" name="outlook" placeholder="增长/稳定/萎缩" />
            <Field label="我的匹配度" name="match" placeholder="低/中/高" />
            <Field label="我感不感兴趣" name="interested" placeholder="感兴趣/一般/不感兴趣" />
          </div>
          <button type="submit" className={`${primaryButtonClass} w-full`}>
            添加调研
          </button>
        </form>
        {data.industries.length > 0 && (
          <ul className="mt-3 space-y-2.5">
            {data.industries.map((entry) => (
              <IndustryCard key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="mb-3 text-base font-semibold">简历投递</h2>
        <form
          onSubmit={handleAddApplication}
          className="space-y-2 rounded-xl border border-dashed border-white/15 p-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <Field label="公司" name="company" placeholder="如：安克创新" />
            <Field label="岗位" name="position" placeholder="如：采购专员" />
            <Field label="日期" name="event_date" />
            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-400">结果</span>
              <select name="result" className={inputClass} defaultValue="pending">
                {RESULT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-zinc-900">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className={`${primaryButtonClass} w-full`}>
            添加投递
          </button>
        </form>
        {data.applications.length > 0 && (
          <ul className="mt-3 space-y-2.5">
            {data.applications.map((entry) => {
              const payload = entry.payload as Record<string, string>;
              return (
                <li
                  key={entry.id}
                  className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">
                      {entry.title}
                      <span className="ml-1.5 font-normal text-zinc-400">
                        {payload.position || ""}
                      </span>
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${RESULT_BADGES[payload.result ?? "pending"] ?? RESULT_BADGES.pending}`}
                    >
                      {RESULT_OPTIONS.find((o) => o.value === payload.result)?.label ?? "未回应"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-zinc-500">{entry.eventDate}</span>
                    <select
                      value={payload.result ?? "pending"}
                      onChange={(e) => handleResultChange(entry, e.target.value)}
                      className="ml-auto rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-300 outline-none"
                    >
                      {RESULT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} className="bg-zinc-900">
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      className="text-xs text-zinc-500 transition hover:text-rose-300"
                    >
                      删除
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="mb-3 text-base font-semibold">面试记录</h2>
        <form
          onSubmit={handleAddInterview}
          className="space-y-2 rounded-xl border border-dashed border-white/15 p-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <Field label="公司" name="company" placeholder="如：细刻" />
            <Field label="日期" name="event_date" />
          </div>
          <Field label="面试问题" name="questions" placeholder="把被问到的问题列出来" />
          <Field label="我的表现" name="performance" placeholder="哪些答得好，哪些卡壳" />
          <Field label="复盘" name="review" placeholder="下次怎么改进" />
          <button type="submit" className={`${primaryButtonClass} w-full`}>
            添加面试记录
          </button>
        </form>
        {data.interviews.length > 0 && (
          <ul className="mt-3 space-y-2.5">
            {data.interviews.map((entry) => {
              const payload = entry.payload as Record<string, string>;
              return (
                <li
                  key={entry.id}
                  className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{entry.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">{entry.eventDate}</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        className="text-xs text-zinc-500 transition hover:text-rose-300"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  {payload.questions && (
                    <p className="mt-1.5 text-xs text-zinc-400">
                      <span className="text-zinc-500">问题：</span>
                      {payload.questions}
                    </p>
                  )}
                  {payload.performance && (
                    <p className="mt-1 text-xs text-zinc-400">
                      <span className="text-zinc-500">表现：</span>
                      {payload.performance}
                    </p>
                  )}
                  {payload.review && (
                    <p className="mt-1 text-xs text-zinc-400">
                      <span className="text-zinc-500">复盘：</span>
                      {payload.review}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-zinc-600">
        <PlusIcon className="h-3 w-3" />
        记录越多，成就与顾问分析越准确
      </p>
    </div>
  );
}
