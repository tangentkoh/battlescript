"use client";

import React, { useState, useEffect, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { /*Terminal,*/ Send, Play, Globe, Cpu, Loader2 } from "lucide-react"; // 一時無効
import { useSearchParams, useRouter } from "next/navigation";
import { generateProblem, Problem, judgeCode } from "@/lib/gemini";

export default function BattlePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const mode = searchParams.get("mode") || "cpu";
  const language = searchParams.get("lang") || "cpp";
  const difficulty =
    (searchParams.get("diff") as "easy" | "medium" | "hard") || "easy";

  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [consoleLog, setConsoleLog] = useState<string[]>([
    "[SYSTEM]: Awaiting initialization...",
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coolDown, setCoolDown] = useState(0);
  const [cpuProgress, setCpuProgress] = useState(0);
  const [battleActive, setBattleActive] = useState(false);

  const addLog = useCallback((msg: string) => {
    setConsoleLog((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${msg}`,
    ]);
  }, []);

  const handleBattleEnd = useCallback(
    (result: "PLAYER_WIN" | "CPU_WIN") => {
      setBattleActive(false);
      if (result === "PLAYER_WIN") {
        addLog("≫ [SUCCESS]: PLAYER_AC_COMPLETED. YOU WIN!");
        alert("勝利しました！");
      } else {
        addLog("≫ [FAILED]: CPU_AC_FIRST. YOU LOSE...");
        alert("CPUが先に正解しました。敗北です。");
      }
      router.push("/home");
    },
    [addLog, router],
  );

  useEffect(() => {
    let isMounted = true; // 重複実行防止フラグ

    async function initBattle() {
      try {
        setLoading(true);
        const newProblem = await generateProblem(difficulty);

        if (isMounted) {
          setProblem(newProblem);
          setBattleActive(true);
          setCoolDown(30);
          addLog(`[SYSTEM]: Mode initialized as ${mode}`);
          addLog(`[SYSTEM]: Problem loaded. Battle start!`);
        }
      } catch {
        if (isMounted) addLog("[ERROR]: Failed to reach Gemini API.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initBattle();
    return () => {
      isMounted = false;
    }; // クリーンアップ
  }, [difficulty, mode, addLog]);

  useEffect(() => {
    if (coolDown > 0) {
      const timer = setTimeout(() => setCoolDown(coolDown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [coolDown]);

  useEffect(() => {
    if (battleActive && !loading) {
      const interval = setInterval(() => {
        setCpuProgress((prev) => {
          const increment = difficulty === "easy" ? 0.5 : 1.0;
          if (prev >= 100) {
            handleBattleEnd("CPU_WIN");
            return 100;
          }
          return prev + increment;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [battleActive, loading, difficulty, handleBattleEnd]);

  const handleSubmit = async () => {
    if (coolDown > 0 || isSubmitting || !problem) return;
    setIsSubmitting(true);
    setCoolDown(30);
    addLog("≫ [SYSTEM]: Judging code...");
    try {
      const result = await judgeCode(problem, code, language);
      if (result.isCorrect) handleBattleEnd("PLAYER_WIN");
      else addLog(`≫ [WA]: ${result.feedback}`);
    } catch {
      addLog("≫ [ERROR]: Judge system error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center font-mono text-[#00ff41] gap-4">
        <Loader2 className="animate-spin" size={40} />
        <div className="animate-pulse tracking-widest">INITIALIZING...</div>
      </div>
    );

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-[#adbac7] font-mono overflow-hidden">
      <header className="h-14 border-b border-[#30363d] flex items-center justify-between px-6 bg-[#161b22]">
        <div className="flex items-center gap-4">
          <button
            type="button"
            title="Exit Battle"
            onClick={() => router.push("/home")}
            className="text-[#00ff41] hover:underline text-xs"
          >
            ≪ EXIT
          </button>
          <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded border border-[#30363d] text-[10px]">
            {mode === "cpu" ? <Cpu size={12} /> : <Globe size={12} />}
            <span>
              {mode.toUpperCase()} {/* */} {language.toUpperCase()} {/*  */}{" "}
              {difficulty.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex gap-8">
          <div className="text-right">
            <div className="text-[8px] opacity-50 text-red-500 font-bold uppercase tracking-widest">
              CPU_SYNC_PROGRESS
            </div>
            <div className="h-1.5 w-32 bg-gray-800 rounded-full mt-1 overflow-hidden border border-white/5">
              <div
                className="h-full bg-red-500 transition-all duration-1000 ease-linear"
                style={{ width: `${cpuProgress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-1/3 flex flex-col border-r border-[#30363d]">
          <div className="flex-1 p-6 overflow-y-auto border-b border-[#30363d] bg-black/10">
            <h2 className="text-[#00ff41] text-lg mb-4 flex items-center gap-2 uppercase tracking-tighter">
              {problem?.title || "UNRESOLVED_PROBLEM"}
            </h2>
            <div className="space-y-4 text-sm leading-relaxed">
              <p className="whitespace-pre-wrap">{problem?.description}</p>

              <div className="bg-black/40 p-3 rounded border border-[#30363d]">
                <p className="text-[10px] opacity-50 mb-1 font-bold">
                  SAMPLE_INPUT
                </p>
                <code className="text-white text-xs">
                  {problem?.sample_input}
                </code>
              </div>

              <div className="bg-black/40 p-3 rounded border border-[#30363d]">
                <p className="text-[10px] opacity-50 mb-1 font-bold">
                  SAMPLE_OUTPUT
                </p>
                <code className="text-white text-xs">
                  {problem?.sample_output}
                </code>
              </div>
            </div>
          </div>

          <div className="h-1/3 p-4 bg-black/60 font-mono text-[10px] overflow-y-auto text-gray-500">
            {consoleLog.map((log, i) => (
              <p key={i}>{log}</p>
            ))}
          </div>
        </div>

        <div className="flex-1 relative">
          <Editor
            height="100%"
            language={language === "cpp" ? "cpp" : language}
            theme="vs-dark"
            value={code}
            onChange={(val) => setCode(val || "")}
            options={{
              fontSize: 16,
              minimap: { enabled: false },
              fontFamily: "JetBrains Mono",
            }}
          />

          <div className="absolute bottom-6 right-8 flex flex-col items-end gap-3">
            {coolDown > 0 && (
              <div className="text-[10px] text-orange-500 animate-pulse font-bold bg-black/80 px-3 py-1 border border-orange-500/50 rounded shadow-lg">
                SYSTEM_COOLING: {coolDown}s
              </div>
            )}
            <div className="flex gap-4">
              <button
                type="button"
                title="Run Tests"
                className="flex items-center gap-2 px-6 py-2 bg-[#30363d] hover:bg-gray-700 text-white rounded transition-all active:scale-95 shadow-md"
              >
                <Play size={18} />
                <span className="text-xs font-bold">RUN_TEST</span>
              </button>
              <button
                type="button"
                title="Submit Code"
                onClick={handleSubmit}
                disabled={coolDown > 0 || isSubmitting}
                className={`flex items-center gap-2 px-8 py-2 rounded font-bold transition-all shadow-md ${
                  coolDown > 0 || isSubmitting
                    ? "bg-gray-700 text-gray-500 border-none"
                    : "bg-[#00ff41] text-black hover:bg-green-400 active:scale-95"
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Send size={18} />
                )}
                <span className="text-xs uppercase">
                  {isSubmitting ? "JUDGING" : "SUBMIT"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
