"use client";

import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { subscribeUserStats, UserData } from "@/lib/user";
import { startMatching, cancelMatching } from "@/lib/matchmaking";
import {
  Globe,
  Cpu,
  Settings,
  LogOut,
  Terminal,
  User,
  Trophy,
  Activity,
  X,
} from "lucide-react";
import {
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  // マッチング待機中かどうかのフラグ
  const [isMatching, setIsMatching] = useState(false);

  const [logs, setLogs] = useState<string[]>(["≫ SYSTEM_INITIALIZED"]);
  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev.slice(-4), msg]);
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState({
    lang: "cpp",
    diff: "easy",
    mode: "cpu",
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/");
      } else {
        setUser(currentUser);
        const unsubscribeStats = subscribeUserStats(currentUser.uid, (data) => {
          setUserData(data);
        });
        return () => unsubscribeStats();
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  // タブを閉じたり、画面遷移した時に待機状態ならキャンセルする
  useEffect(() => {
    return () => {
      if (isMatching && user) {
        cancelMatching(user.uid);
      }
    };
  }, [isMatching, user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  // オンライン対戦ボタンのハンドラ
  const handleOnlineBattleClick = async () => {
    if (!userData) return;
    if (isMatching) {
      // 待機中ならキャンセル
      await cancelMatching(userData.uid);
      setIsMatching(false);
      addLog("≫ MATCHMAKING_ABORTED_BY_USER.");
    } else {
      // 待機開始
      setIsMatching(true);
      addLog("≫ INITIALIZING_MATCHMAKING_PROTOCOL...");
      startMatching(
        userData.uid,
        userData.displayName || "GUEST_USER",
        userData.stats.rating,
        { lang: selectedConfig.lang, diff: selectedConfig.diff },
        (roomId: string) => {
          setIsMatching(false);
          addLog(`≫ MATCH_FOUND: ROOM_${roomId.slice(0, 8)}`);
          router.push(
            `/battle?mode=online&roomId=${roomId}&lang=${selectedConfig.lang}&diff=${selectedConfig.diff}`,
          );
        },
      );
    }
  };

  if (!user || !userData) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center font-mono text-[#00ff41]">
        <div className="animate-pulse flex items-center gap-2">
          <Terminal size={20} /> INITIALIZING_SYSTEM...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#adbac7] font-mono p-8 relative">
      <div className="max-w-5xl mx-auto flex justify-between items-center mb-12 border-b border-[#30363d] pb-4">
        <div className="flex items-center gap-3">
          <Terminal className="text-[#00ff41]" />
          <h1 className="text-xl font-bold tracking-tighter text-white uppercase">
            BattleScript // HQ
          </h1>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2 bg-[#161b22] px-3 py-1 rounded border border-[#30363d]">
            <User size={14} className="text-[#00ff41]" />
            <span className="text-white">
              {userData.displayName || user.displayName}
            </span>
          </div>
          <button
            type="button"
            title="Logout"
            onClick={handleLogout}
            className="hover:text-red-400 flex items-center gap-1 transition-colors text-xs"
          >
            <LogOut size={14} /> LOGOUT
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <MenuCard
          title={isMatching ? "MATCHING..." : "ONLINE_BATTLE"}
          desc={
            isMatching
              ? "待機中... 他のエンジニアをスキャンしています。再クリックでキャンセル。"
              : "リアルタイムで世界中のエンジニアとコードの速さを競う。"
          }
          icon={
            <Globe
              className={`w-10 h-10 ${isMatching ? "animate-spin text-blue-400" : ""}`}
            />
          }
          color={
            isMatching
              ? "border-blue-400 bg-blue-500/20"
              : "border-blue-500/50 hover:bg-blue-500/10"
          }
          onClick={() => {
            if (isMatching) {
              handleOnlineBattleClick();
            } else {
              setSelectedConfig({ ...selectedConfig, mode: "online" });
              setIsModalOpen(true);
            }
          }}
        />

        <MenuCard
          title="CPU_BATTLE"
          desc="練習モード。自分に最適な難易度のCPUと戦う。"
          icon={<Cpu className="w-10 h-10" />}
          color="border-[#00ff41]/50 hover:bg-[#00ff41]/10 hover:border-[#00ff41]"
          onClick={() => {
            setSelectedConfig({ ...selectedConfig, mode: "cpu" });
            setIsModalOpen(true);
          }}
        />

        <MenuCard
          title="SETTINGS"
          desc="戦績の確認、ランキング、プロフィールの編集。"
          icon={<Settings className="w-10 h-10" />}
          color="border-purple-500/50 hover:bg-purple-500/10 hover:border-purple-400"
          onClick={() => router.push("/settings")}
        />
      </div>

      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatBox
            label="CURRENT_RATING"
            value={userData.stats.rating}
            icon={<Trophy size={14} />}
            color="text-yellow-500"
          />
          <StatBox
            label="TOTAL_WINS"
            value={userData.stats.wins}
            icon={<Activity size={14} />}
            color="text-[#00ff41]"
          />
          <StatBox
            label="TOTAL_LOSSES"
            value={userData.stats.losses}
            icon={<Activity size={14} />}
            color="text-red-500"
          />
        </div>
        <div className="mt-6 p-4 bg-[#161b22] border border-[#30363d] rounded text-[10px] opacity-60 uppercase tracking-[0.2em]">
          {logs.map((log, i) => (
            <p
              key={i}
              className={
                i === logs.length - 1 ? "animate-pulse text-[#00ff41]" : ""
              }
            >
              {log}
            </p>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#00ff41]/30 p-8 rounded-lg max-w-md w-full shadow-[0_0_30px_rgba(0,255,65,0.1)] relative">
            <button
              type="button"
              title="Close Modal"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-[#00ff41] text-xl font-bold mb-6 tracking-widest flex items-center gap-2">
              <Terminal size={20} /> INITIALIZE_ENGAGEMENT
            </h2>

            <div className="mb-6">
              <p className="text-[10px] opacity-50 mb-3 uppercase font-bold tracking-widest">
                Select_Difficulty
              </p>
              <div className="grid grid-cols-3 gap-2">
                {["easy", "medium", "hard"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      setSelectedConfig({ ...selectedConfig, diff: d })
                    }
                    className={`py-2 text-xs border rounded transition-all font-bold ${
                      selectedConfig.diff === d
                        ? "border-[#00ff41] bg-[#00ff41]/10 text-white shadow-[0_0_10px_rgba(0,255,65,0.2)]"
                        : "border-[#30363d] text-gray-500 hover:border-gray-500"
                    }`}
                  >
                    {d.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <p className="text-[10px] opacity-50 mb-3 uppercase font-bold tracking-widest">
                Tactical_Language
              </p>
              <div className="grid grid-cols-3 gap-2">
                {["cpp", "python", "java"].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() =>
                      setSelectedConfig({ ...selectedConfig, lang: l })
                    }
                    className={`py-2 text-xs border rounded transition-all font-bold ${
                      selectedConfig.lang === l
                        ? "border-[#00ff41] bg-[#00ff41]/10 text-white shadow-[0_0_10px_rgba(0,255,65,0.2)]"
                        : "border-[#30363d] text-gray-500 hover:border-gray-500"
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                if (selectedConfig.mode === "online") {
                  handleOnlineBattleClick();
                } else {
                  router.push(
                    `/battle?mode=${selectedConfig.mode}&lang=${selectedConfig.lang}&diff=${selectedConfig.diff}`,
                  );
                }
              }}
              className="w-full py-4 bg-[#00ff41] text-black hover:bg-green-400 transition-all rounded font-black tracking-widest shadow-[0_0_20px_rgba(0,255,65,0.4)] active:scale-95 uppercase"
            >
              Launch_Battle_Sequence
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] p-4 rounded flex flex-col gap-1 shadow-inner">
      <div className="flex items-center gap-2 text-[10px] font-bold opacity-50">
        {icon} {label}
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function MenuCard({ title, desc, icon, color, onClick }: MenuCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center text-center p-8 border bg-[#161b22] rounded-lg transition-all duration-300 group ${color}`}
    >
      <div className="mb-4 text-white group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h2 className="text-lg font-bold text-white mb-2 tracking-widest">
        {title}
      </h2>
      <p className="text-sm opacity-70 leading-relaxed">{desc}</p>
    </button>
  );
}

interface MenuCardProps {
  title: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}
