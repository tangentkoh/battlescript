"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Send, /*Play,*/ Globe, Cpu, Loader2 } from "lucide-react"; // TEST機能と共に無効か
import { useSearchParams, useRouter } from "next/navigation";
import { generateProblem, Problem, judgeCode } from "@/lib/gemini";
import { updateBattleResult, subscribeUserStats, UserData } from "@/lib/user";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function BattlePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const mode = searchParams.get("mode") || "cpu";
  const language = searchParams.get("lang") || "cpp";
  const difficulty =
    (searchParams.get("diff") as "easy" | "medium" | "hard") || "easy";

  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState<string>("");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [consoleLog, setConsoleLog] = useState<string[]>([
    "[SYSTEM]: Awaiting initialization...",
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coolDown, setCoolDown] = useState(0);
  const [cpuProgress, setCpuProgress] = useState(0);
  const [battleActive, setBattleActive] = useState(false);

  const [showResult, setShowResult] = useState(false);
  const [battleResult, setBattleResult] = useState<
    "PLAYER_WIN" | "CPU_WIN" | null
  >(null);

  // 最新の値を参照する
  const userDataRef = useRef<UserData | null>(null);
  useEffect(() => {
    userDataRef.current = userData;
  }, [userData]);

  const addLog = useCallback((msg: string) => {
    setConsoleLog((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${msg}`,
    ]);
  }, []);

  // ログイン状態とユーザーデータ
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/");
      } else {
        const unsubscribeStats = subscribeUserStats(currentUser.uid, (data) => {
          setUserData(data);
        });
        return () => unsubscribeStats();
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  const handleBattleEnd = useCallback(
    async (result: "PLAYER_WIN" | "CPU_WIN") => {
      setBattleActive(false);
      setBattleResult(result);
      setShowResult(true); // リザルト画面

      const isWin = result === "PLAYER_WIN";
      const currentUserId = userDataRef.current?.uid;

      if (currentUserId) {
        await updateBattleResult(currentUserId, isWin, mode === "cpu");
      }
    },
    [mode],
  );

  const handleRetire = () => {
    if (
      confirm(
        "SYSTEM_WARNING: 離脱すると敗北として処理されます。続行しますか？",
      )
    ) {
      handleBattleEnd("CPU_WIN");
    }
  };

  useEffect(() => {
    let isMounted = true;

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
    };
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
          const increment = difficulty === "easy" ? 0.4 : 0.2;
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
      {/* 以前のJSX部分をそのまま維持 */}
      <header className="h-14 border-b border-[#30363d] flex items-center justify-between px-6 bg-[#161b22]">
        <div className="flex items-center gap-4">
          <button
            type="button"
            title="Retire from Battle"
            onClick={handleRetire}
            className="text-[#00ff41] hover:underline text-xs"
          >
            ≪ EXIT
          </button>
          <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded border border-[#30363d] text-[10px]">
            {mode === "cpu" ? <Cpu size={12} /> : <Globe size={12} />}
            <span>
              {mode.toUpperCase()} {/* */} {language.toUpperCase()} {/* */}
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
                style={{ width: `${cpuProgress}%` } as React.CSSProperties}
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
                <p className="text-[10px] opacity-50 mb-1 font-bold uppercase">
                  Sample Input
                </p>
                <code className="text-white text-xs">
                  {problem?.sample_input}
                </code>
              </div>
              <div className="bg-black/40 p-3 rounded border border-[#30363d]">
                <p className="text-[10px] opacity-50 mb-1 font-bold uppercase">
                  Sample Output
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
              {/*
              <button
                type="button"
                title="Run Tests"
                className="flex items-center gap-2 px-6 py-2 bg-[#30363d] hover:bg-gray-700 text-white rounded transition-all active:scale-95 shadow-md"
              >
                <Play size={18} />
                <span className="text-xs font-bold">RUN_TEST</span>
              </button>
              */}

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

      {showResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md transition-all duration-700">
          <div
            className={`p-10 border-2 rounded-lg text-center max-w-lg w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] ${
              battleResult === "PLAYER_WIN"
                ? "border-[#00ff41] shadow-[#00ff41]/20"
                : "border-red-500 shadow-red-500/20"
            }`}
          >
            <h2
              className={`text-5xl font-black italic tracking-tighter mb-2 ${
                battleResult === "PLAYER_WIN"
                  ? "text-[#00ff41] animate-pulse"
                  : "text-red-500"
              }`}
            >
              {battleResult === "PLAYER_WIN" ? "BATTLE_WIN" : "BATTLE_LOSE"}
            </h2>

            <p className="text-[10px] opacity-60 mb-8 tracking-[0.5em] uppercase">
              {battleResult === "PLAYER_WIN"
                ? "Mission Objective: Completed"
                : "Mission Objective: Failed"}
            </p>

            <div className="bg-black/50 border border-[#30363d] p-6 rounded mb-8">
              <div className="text-[10px] text-gray-500 mb-1 uppercase">
                Rating_Adjustment
              </div>
              <div className="flex items-center justify-center gap-4">
                {/* 現在のレート */}
                <span className="text-2xl text-gray-400 font-bold">
                  {userData?.stats.rating}
                </span>
                <span className="text-xl text-gray-600">←←←</span>
                {/* 更新後のレートを計算して表示 */}
                <span
                  className={`text-4xl font-black ${battleResult === "PLAYER_WIN" ? "text-[#00ff41]" : "text-red-500"}`}
                >
                  {battleResult === "PLAYER_WIN" ? 1 : -1}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/home")}
              className={`w-full py-4 font-black tracking-[0.2em] transition-all active:scale-95 ${
                battleResult === "PLAYER_WIN"
                  ? "bg-[#00ff41] text-black hover:bg-green-400"
                  : "bg-red-600 text-white hover:bg-red-500"
              }`}
            >
              RETURN_TO_BASE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
