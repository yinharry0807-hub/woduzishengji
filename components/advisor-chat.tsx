"use client";

import { useEffect, useRef, useState } from "react";
import {
  chatWithAdvisor,
  type AdvisorMessage,
  type AdvisorModel,
} from "@/lib/actions";
import type { AdvisorContext } from "@/lib/queries";

const STORAGE_KEY = "ggs_advisor_history";

const MODELS: { value: AdvisorModel; label: string }[] = [
  { value: "chat", label: "DeepSeek Chat" },
  { value: "flash", label: "DeepSeek V4 Flash" },
  { value: "pro", label: "DeepSeek V4 Pro" },
];

function loadHistory(): AdvisorMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as AdvisorMessage[]) : [];
    return parsed.filter(
      (m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
    );
  } catch {
    return [];
  }
}

export default function AdvisorChat({
  context,
}: {
  context: AdvisorContext;
}) {
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<AdvisorModel>("chat");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(loadHistory());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || thinking) return;
    setError(null);
    const history = [...messages, { role: "user", content } as AdvisorMessage];
    setMessages(history);
    setInput("");
    setThinking(true);
    const result = await chatWithAdvisor(history, model);
    setThinking(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: result.reply ?? "" },
    ]);
  }

  function buildContextPrompt(): string {
    const issues: string[] = [];
    if (context.brokenStreak) {
      issues.push("我最近断签了（连续打卡归零，但历史记录还在）");
    } else if (context.streak > 0) {
      issues.push(`我当前连续打卡 ${context.streak} 天`);
    }
    if (context.stuckSkills.length > 0) {
      issues.push(
        `技能停滞：${context.stuckSkills
          .map((s) => `「${s.name}」${s.daysSinceProgress} 天没进展`)
          .join("、")}`
      );
    }
    if (issues.length === 0) {
      issues.push("目前没有检测到明显问题，请帮我看一下有没有盲点");
    }
    return `以下是系统检测到的我的现状：${issues.join("；")}。当前 Lv.${context.level} ${context.levelTitle}，总 XP ${context.totalXp}。请直接指出问题并给我今天/本周可落地的建议。`;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-base font-semibold">顾问检测</h2>
        <div className="mt-3 space-y-1.5 text-sm text-zinc-400">
          {context.brokenStreak && (
            <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-rose-300">
              已检测到断签 —— 历史成就不会消失，重点是今天重新开始。
            </p>
          )}
          {context.stuckSkills.length > 0 ? (
            context.stuckSkills.map((skill) => (
              <p key={skill.name} className="rounded-xl bg-amber-500/10 px-3 py-2 text-amber-200">
                技能「{skill.name}」已 {skill.daysSinceProgress} 天没有进展。
              </p>
            ))
          ) : (
            !context.brokenStreak && (
              <p className="rounded-xl bg-white/5 px-3 py-2 text-zinc-400">
                暂未发现明显停滞，可以让顾问帮你找盲点。
              </p>
            )
          )}
        </div>
        <button
          type="button"
          onClick={() => send(buildContextPrompt())}
          disabled={thinking}
          className="mt-3 w-full rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          让顾问分析我的现状
        </button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">对话</h2>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as AdvisorModel)}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-300 outline-none"
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value} className="bg-zinc-900">
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && (
            <p className="py-6 text-center text-xs text-zinc-600">
              顾问人设：客观、零迎合、直接指出问题、给可落地建议。
              <br />
              问它任何问题，例如「我断签了怎么办」「英语怎么坚持」。
            </p>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "bg-violet-500/20 text-violet-100"
                    : "bg-white/5 text-zinc-200"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white/5 px-4 py-2.5 text-sm text-zinc-400">
                顾问思考中…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
            {error}
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mt-3 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入你的问题…"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-sky-400/60"
          />
          <button
            type="submit"
            disabled={thinking || !input.trim()}
            className="shrink-0 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            发送
          </button>
        </form>
      </section>
    </div>
  );
}
