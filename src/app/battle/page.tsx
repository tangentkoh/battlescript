"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  Suspense,
} from "react";
import Editor from "@monaco-editor/react";
import { Send, Globe, Cpu, Loader2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { generateProblem, Problem, judgeCode } from "@/lib/gemini";
import { updateBattleResult, subscribeUserStats, UserData } from "@/lib/user";
import { auth, rtdb } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue, update } from "firebase/database";
import {
  updateProgress,
  subscribeOpponent,
  reportVictory,
  setupDisconnectDefeat,
  leaveRoom,
  PlayerSyncData,
} from "@/lib/matchmaking";

function BattleContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const mode = searchParams.get("mode") || "cpu";
  const language = searchParams.get("lang") || "cpp";
  const difficulty =
    (searchParams.get("diff") as "easy" | "medium" | "hard") || "easy";
  const editorLanguageMap: Record<string, string> = {
    cpp: "cpp",
    python: "python",
    java: "java",
  };
  const roomId = searchParams.get("roomId");
  const hasInitialized = useRef(false);

  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState<string>("");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [consoleLog, setConsoleLog] = useState<string[]>([
    "[SYSTEM]: INITIALIZING...",
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coolDown, setCoolDown] = useState(0);
  const [cpuProgress, setCpuProgress] = useState(0);
  const [battleActive, setBattleActive] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [battleResult, setBattleResult] = useState<
    "PLAYER_WIN" | "CPU_WIN" | null
  >(null);
  const [opponentData, setOpponentData] = useState<PlayerSyncData | null>(null);

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

  // 対戦終了処理
  const handleBattleEnd = useCallback(
    async (result: "PLAYER_WIN" | "CPU_WIN") => {
      if (!battleActive) return;
      setBattleActive(false);
      setBattleResult(result);
      setShowResult(true);

      const isWin = result === "PLAYER_WIN";
      const uid = userDataRef.current?.uid;

      if (uid) {
        if (isWin && mode === "online" && roomId) reportVictory(roomId, uid);
        await updateBattleResult(uid, isWin, mode === "cpu");
      }
    },
    [mode, roomId, battleActive],
  );

  // ユーザー認証監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/");
      else {
        subscribeUserStats(user.uid, (data) => setUserData(data));
        if (mode === "online" && roomId)
          setupDisconnectDefeat(roomId, user.uid);
      }
    });
    return () => unsubscribe();
  }, [router, mode, roomId]);

  // オンライン同期
  useEffect(() => {
    if (mode === "online" && roomId && userData) {
      // 自分以外のUIDを特定
      const parts = roomId.split("_");
      const oppId = parts.find(
        (id) => id !== userData.uid && id !== "room" && !/^\d+$/.test(id),
      );

      if (oppId) {
        const unsubscribe = subscribeOpponent(roomId, oppId, (data) => {
          setOpponentData(data);
          if (data?.isFinished && battleActive) handleBattleEnd("CPU_WIN");
        });
        return () => unsubscribe();
      }
    }
  }, [mode, roomId, userData, battleActive, handleBattleEnd]);

  // 自分の進捗送信
  useEffect(() => {
    if (mode === "online" && battleActive && roomId && userData) {
      const tid = setInterval(() => {
        const progress = Math.min((code.length / 500) * 100, 100);
        updateProgress(roomId, userData.uid, progress);
      }, 2000);
      return () => clearInterval(tid);
    }
  }, [mode, battleActive, roomId, userData, code.length]);

  // CPU進捗ロジック
  useEffect(() => {
    if (mode === "cpu" && battleActive && !loading) {
      const tid = setInterval(() => {
        setCpuProgress((p) => {
          const inc =
            difficulty === "easy" ? 0.4 : difficulty === "medium" ? 0.2 : 0.1;
          if (p >= 100) {
            handleBattleEnd("CPU_WIN");
            return 100;
          }
          return p + inc;
        });
      }, 1000);
      return () => clearInterval(tid);
    }
  }, [mode, battleActive, loading, difficulty, handleBattleEnd]);

  // 問題生成と同期ロジック
  useEffect(() => {
    if (hasInitialized.current) return;
    if (mode !== "online" || !roomId || !userData) {
      if (mode === "cpu" && !problem) {
        hasInitialized.current = true;
        (async () => {
          try {
            setLoading(true);
            const p = await generateProblem(difficulty, language);
            setProblem(p);
            setBattleActive(true);
            setLoading(false);
            addLog(`[SYSTEM]: BATTLE_START // MODE:CPU`);
          } catch {
            addLog("[ERROR]: Gemini API Offline.");
            setLoading(false);
          }
        })();
      }
      return;
    }

    hasInitialized.current = true;
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, async (snapshot) => {
      const roomData = snapshot.val();
      if (!roomData) return;

      if (roomData.host === userData.uid && !roomData.problem && loading) {
        try {
          const newProblem = await generateProblem(difficulty, language);
          await update(roomRef, {
            problem: newProblem,
            language: language,
          });
        } catch {
          addLog("[ERROR]: Failed to generate problem.");
        }
      }

      if (roomData.problem && !problem) {
        setProblem(roomData.problem);
        if (roomData.language) {
          addLog(`≫ SYNC_LANGUAGE: ${roomData.language.toUpperCase()}`);
        }
        setBattleActive(true);
        setLoading(false);
        addLog("≫ CONNECTION_STABLE. PROBLEM_SYNCED.");
      }
    });
    return () => {
      unsubscribe();
    };
  }, [roomId, userData, mode, difficulty, language, problem, loading, addLog]);

  // クールダウン処理
  useEffect(() => {
    if (coolDown > 0) {
      const tid = setTimeout(() => setCoolDown(coolDown - 1), 1000);
      return () => clearTimeout(tid);
    }
  }, [coolDown]);

  const handleSubmit = async () => {
    if (coolDown > 0 || isSubmitting || !problem) return;
    setIsSubmitting(true);
    setCoolDown(30);
    addLog("≫ [SYSTEM]: Judging...");
    try {
      const res = await judgeCode(problem, code, language);
      if (res.isCorrect) handleBattleEnd("PLAYER_WIN");
      else addLog(`≫ [WA]: ${res.feedback}`);
    } catch {
      addLog("≫ [ERROR]: Judge Error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center font-mono text-[#00ff41] gap-4">
        <Loader2 className="animate-spin" size={40} />
        <div>INITIALIZING_BATTLE_STATION...</div>
      </div>
    );

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-[#adbac7] font-mono overflow-hidden">
      <header className="h-14 border-b border-[#30363d] flex items-center justify-between px-6 bg-[#161b22]">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() =>
              battleActive
                ? confirm(
                    "リタイアしますか？(バトルには負けたことになります)",
                  ) && handleBattleEnd("CPU_WIN")
                : router.push("/home")
            }
            className="text-[#00ff41] hover:underline text-xs tracking-tighter"
          >
            ≪ EXIT
          </button>
          <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded border border-[#30363d] text-[10px]">
            {mode === "cpu" ? <Cpu size={12} /> : <Globe size={12} />}
            <span>
              {mode.toUpperCase()}
              {/* */}
              {language.toUpperCase()}
              {/* */} {difficulty.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[8px] opacity-50 text-red-500 font-bold uppercase">
            {mode === "online" ? "OPPONENT" : "CPU"}_PROGRESS
          </div>
          <div className="h-1.5 w-32 bg-gray-800 rounded-full mt-1 overflow-hidden border border-white/5">
            <div
              className="h-full bg-red-500 transition-all duration-1000 ease-linear"
              style={
                {
                  width: `${mode === "online" ? opponentData?.progress || 0 : cpuProgress}%`,
                } as React.CSSProperties
              }
            />
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-1/3 flex flex-col border-r border-[#30363d]">
          <div className="flex-1 p-6 overflow-y-auto border-b border-[#30363d] bg-black/10">
            <h2 className="text-[#00ff41] text-lg mb-4 flex items-center gap-2 uppercase tracking-tighter">
              {problem?.title}
            </h2>
            <p className="text-sm leading-relaxed mb-6 whitespace-pre-wrap">
              {problem?.description}
            </p>
            <div className="space-y-4">
              <div className="bg-black/40 p-3 rounded border border-[#30363d]">
                <p className="text-[10px] opacity-50 mb-1 font-bold">INPUT</p>
                <code className="text-white text-xs">
                  {problem?.sample_input}
                </code>
              </div>
              <div className="bg-black/40 p-3 rounded border border-[#30363d]">
                <p className="text-[10px] opacity-50 mb-1 font-bold">OUTPUT</p>
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
            language={" " + editorLanguageMap[language] || " cpp"}
            theme="vs-dark"
            value={code}
            onChange={(v) => setCode(v || "")}
            options={{
              fontSize: 16,
              minimap: { enabled: false },
              fontFamily: "JetBrains Mono",
            }}
          />
          <div className="absolute bottom-6 right-8 flex flex-col items-end gap-3">
            {coolDown > 0 && (
              <div className="text-[10px] text-orange-500 animate-pulse font-bold bg-black/80 px-3 py-1 border border-orange-500/50 rounded shadow-lg">
                COOLDOWN: {coolDown}s
              </div>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={coolDown > 0 || isSubmitting}
              className={`flex items-center gap-2 px-8 py-2 rounded font-bold transition-all shadow-md ${coolDown > 0 || isSubmitting ? "bg-gray-700 text-gray-500 border-none" : "bg-[#00ff41] text-black hover:bg-green-400 active:scale-95"}`}
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
      </main>

      {showResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md overflow-y-auto p-4">
          <div
            className={`p-8 border-2 rounded-lg max-w-2xl w-full bg-[#161b22] ${
              battleResult === "PLAYER_WIN"
                ? "border-[#00ff41]"
                : "border-red-500"
            }`}
          >
            <h2
              className={`text-4xl font-black italic mb-4 ${
                battleResult === "PLAYER_WIN"
                  ? "text-[#00ff41]"
                  : "text-red-500"
              }`}
            >
              {battleResult === "PLAYER_WIN" ? "BATTLE_WIN" : "BATTLE_LOSE"}
            </h2>
            <div className="mt-6 text-left">
              <p className="text-[10px] text-gray-500 mb-2 uppercase font-bold tracking-widest">
                Model_Solution ({language.toUpperCase()})
              </p>
              <div className="bg-black/60 p-4 rounded border border-[#30363d] max-h-60 overflow-y-auto text-xs text-blue-300 font-mono whitespace-pre">
                {problem?.model_solution || "NO_SOLUTION_AVAILABLE"}
              </div>
            </div>
            <div className="bg-black/50 border border-[#30363d] p-6 rounded my-8">
              <p className="text-[10px] text-gray-500 mb-1 uppercase">
                Rating_Adjustment
              </p>
              <div className="flex items-center justify-center gap-4">
                <span className="text-2xl text-gray-400 font-bold">
                  {userData?.stats.rating}
                </span>
                <span className="text-xl text-gray-600">===</span>
                <span
                  className={`text-4xl font-black ${battleResult === "PLAYER_WIN" ? "text-[#00ff41]" : "text-red-500"}`}
                >
                  {battleResult === "PLAYER_WIN" ? "↑" : "↓"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (mode === "online" && roomId && userData)
                  await leaveRoom(roomId, userData.uid);
                router.push("/home");
              }}
              className={`w-full py-4 font-black tracking-widest ${
                battleResult === "PLAYER_WIN"
                  ? "bg-[#00ff41] text-black"
                  : "bg-red-600 text-white"
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

export default function BattlePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center font-mono text-[#00ff41] gap-4">
          <Loader2 className="animate-spin" size={40} />
          <div className="animate-pulse tracking-widest">
            LOADING_RESOURCES...
          </div>
        </div>
      }
    >
      <BattleContent />
    </Suspense>
  );
}
