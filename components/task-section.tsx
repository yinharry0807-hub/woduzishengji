"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeTask } from "@/lib/actions";
import { CheckCircleIcon } from "@/components/task-icons";

export type TaskItem = {
  id: string;
  title: string;
  description?: string | null;
  xp: number;
  done: boolean;
};

const ACCENTS = {
  violet: {
    badge: "bg-violet-500/15 text-violet-300",
    button: "border-violet-400/60 text-violet-300 hover:bg-violet-500/20",
    done: "border-violet-500 bg-violet-500 text-white",
  },
  emerald: {
    badge: "bg-emerald-500/15 text-emerald-300",
    button: "border-emerald-400/60 text-emerald-300 hover:bg-emerald-500/20",
    done: "border-emerald-500 bg-emerald-500 text-white",
  },
  amber: {
    badge: "bg-amber-500/15 text-amber-300",
    button: "border-amber-400/60 text-amber-300 hover:bg-amber-500/20",
    done: "border-amber-500 bg-amber-500 text-white",
  },
} as const;

type TaskSectionProps = {
  title: string;
  hint?: string;
  count: string;
  tasks: TaskItem[];
  accent: keyof typeof ACCENTS;
};

export default function TaskSection({
  title,
  hint,
  count,
  tasks,
  accent,
}: TaskSectionProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const styles = ACCENTS[accent];

  async function handleComplete(taskId: string) {
    setPendingId(taskId);
    setError(null);
    const result = await completeTask(taskId);
    if (result?.error) setError(result.error);
    router.refresh();
    setPendingId(null);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-zinc-300">
          {count}
        </span>
      </div>
      {hint && <p className="mb-3 text-xs text-zinc-500">{hint}</p>}

      {tasks.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-white/15 px-4 py-8 text-center">
          <p className="text-sm text-zinc-500">暂无任务</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {tasks.map((task) => {
            const pending = pendingId === task.id;
            return (
              <li
                key={task.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
              >
                <button
                  type="button"
                  onClick={() => handleComplete(task.id)}
                  disabled={task.done || pending}
                  aria-label={task.done ? `${task.title}（已完成）` : `完成${task.title}`}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition disabled:cursor-not-allowed ${
                    task.done ? styles.done : styles.button
                  } ${pending ? "opacity-60" : ""}`}
                >
                  {task.done ? (
                    <CheckCircleIcon className="h-4 w-4" />
                  ) : (
                    <span
                      className={`h-2 w-2 rounded-full ${
                        pending ? "animate-pulse bg-current" : "bg-current"
                      }`}
                    />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={
                      task.done
                        ? "text-sm text-zinc-500 line-through"
                        : "text-sm"
                    }
                  >
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {task.description}
                    </p>
                  )}
                </div>

                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${styles.badge}`}
                >
                  +{task.xp} XP
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}
    </section>
  );
}
