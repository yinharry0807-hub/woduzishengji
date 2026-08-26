"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addSkillBranch,
  addSkillNode,
  updateSkillProgress,
} from "@/lib/actions";
import { MinusIcon, PlusIcon } from "@/components/icons";

type SkillNode = {
  id: string;
  name: string;
  progress: number;
};

type SkillBranch = {
  id: string;
  name: string;
  description: string | null;
  nodes: SkillNode[];
};

const ACCENTS = [
  { bar: "bg-violet-500", chip: "bg-violet-500/15 text-violet-300" },
  { bar: "bg-emerald-500", chip: "bg-emerald-500/15 text-emerald-300" },
  { bar: "bg-sky-500", chip: "bg-sky-500/15 text-sky-300" },
  { bar: "bg-amber-500", chip: "bg-amber-500/15 text-amber-300" },
  { bar: "bg-rose-500", chip: "bg-rose-500/15 text-rose-300" },
] as const;

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/20";
const primaryButtonClass =
  "rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90";
const ghostButtonClass =
  "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10";

export default function SkillTree({ branches }: { branches: SkillBranch[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [addingNodeTo, setAddingNodeTo] = useState<string | null>(null);

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

  async function handleAddBranch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const ok = await run(() => addSkillBranch(formData));
    if (ok) {
      e.currentTarget.reset();
      setShowBranchForm(false);
    }
  }

  async function handleAddNode(
    branchId: string,
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const ok = await run(() => addSkillNode(branchId, formData));
    if (ok) {
      e.currentTarget.reset();
      setAddingNodeTo(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
          {error}
        </p>
      )}

      {showBranchForm ? (
        <form
          onSubmit={handleAddBranch}
          className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-5"
        >
          <input
            name="name"
            placeholder="分支名称，如：写作技能树"
            maxLength={30}
            required
            className={inputClass}
          />
          <input
            name="description"
            placeholder="分支描述（可选）"
            maxLength={60}
            className={inputClass}
          />
          <div className="flex gap-2">
            <button type="submit" className={primaryButtonClass}>
              创建分支
            </button>
            <button
              type="button"
              onClick={() => setShowBranchForm(false)}
              className={ghostButtonClass}
            >
              取消
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowBranchForm(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/15 py-3 text-sm text-zinc-400 transition hover:border-violet-400/40 hover:text-violet-300"
        >
          <PlusIcon className="h-4 w-4" />
          新增技能分支
        </button>
      )}

      {branches.map((branch, index) => {
        const accent = ACCENTS[index % ACCENTS.length];
        const avg =
          branch.nodes.length === 0
            ? 0
            : Math.round(
                branch.nodes.reduce((sum, node) => sum + node.progress, 0) /
                  branch.nodes.length
              );

        return (
          <section
            key={branch.id}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold">{branch.name}</h2>
                {branch.description && (
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {branch.description}
                  </p>
                )}
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${accent.chip}`}
              >
                平均 {avg}%
              </span>
            </div>

            {branch.nodes.length > 0 ? (
              <ul className="mt-4 space-y-2.5">
                {branch.nodes.map((node) => (
                  <NodeRow
                    key={node.id}
                    node={node}
                    barClass={accent.bar}
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-center text-xs text-zinc-600">
                暂无技能，点击下方「添加技能」
              </p>
            )}

            {addingNodeTo === branch.id ? (
              <form
                onSubmit={(e) => handleAddNode(branch.id, e)}
                className="mt-3 space-y-2"
              >
                <input
                  name="name"
                  placeholder="技能名称，如：阅读习惯"
                  maxLength={30}
                  required
                  className={inputClass}
                />
                <div className="flex gap-2">
                  <button type="submit" className={primaryButtonClass}>
                    添加
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingNodeTo(null)}
                    className={ghostButtonClass}
                  >
                    取消
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAddingNodeTo(branch.id)}
                className="mt-3 flex items-center gap-1 text-xs text-zinc-400 transition hover:text-zinc-200"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                添加技能
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}

function NodeRow({
  node,
  barClass,
}: {
  node: SkillNode;
  barClass: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(node.progress);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(node.progress);
  }, [node.progress]);

  async function commit(next: number) {
    const clamped = Math.min(100, Math.max(0, next));
    setValue(clamped);
    setSaving(true);
    await updateSkillProgress(node.id, clamped);
    setSaving(false);
    router.refresh();
  }

  return (
    <li className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1 truncate text-sm">{node.name}</span>
        <span className="shrink-0 text-xs font-medium text-zinc-400">
          {value}%
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => commit(value - 10)}
          disabled={value <= 0 || saving}
          aria-label={`${node.name} 进度减 10`}
          className="flex h-7 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <MinusIcon className="h-3.5 w-3.5" />
        </button>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          disabled={saving}
          onChange={(e) => setValue(Number(e.target.value))}
          onPointerUp={() => commit(value)}
          onKeyUp={() => commit(value)}
          onBlur={() => commit(value)}
          aria-label={`${node.name} 进度`}
          className="min-w-0 flex-1 accent-violet-500"
        />
        <button
          type="button"
          onClick={() => commit(value + 10)}
          disabled={value >= 100 || saving}
          aria-label={`${node.name} 进度加 10`}
          className="flex h-7 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PlusIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${barClass} transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
    </li>
  );
}
