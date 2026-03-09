"use client";

import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  subscribeUserStats,
  UserData,
  updateUserSettings,
  updateDisplayName,
  resetUserStats,
  getTopRankers,
} from "@/lib/user";
import {
  Terminal,
  Save,
  ArrowLeft,
  Music,
  User,
  Trash2,
  CheckCircle,
  Trophy,
  Medal,
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";

const BGM_OPTIONS = [
  { id: "none", name: "NONE (SILENCE)" },
  { id: "logic", name: "LOGIC.mp3" },
  { id: "dark", name: "DARK.mp3" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [newName, setNewName] = useState("");
  const [selectedBgm, setSelectedBgm] = useState("none");
  const [statusMsg, setStatusMsg] = useState("");
  const [rankers, setRankers] = useState<UserData[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/");
      } else {
        const unsubStats = subscribeUserStats(user.uid, (data) => {
          setUserData(data);
          setNewName(data.displayName || "");
          setSelectedBgm(data.settings?.bgm || "none");
        });
        return () => unsubStats();
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchRanking = async () => {
      const topUsers = await getTopRankers();
      setRankers(topUsers);
    };
    fetchRanking();
  }, []);

  const handleSave = async () => {
    if (!userData) return;
    try {
      await updateDisplayName(userData.uid, newName);
      await updateUserSettings(userData.uid, { bgm: selectedBgm });
      showStatus("SYSTEM_UPDATED_SUCCESSFULLY");
    } catch {
      showStatus("ERROR: UPDATE_FAILED");
    }
  };

  const handleReset = async () => {
    if (!userData) return;
    if (
      confirm("全ての戦績データをリセットしますか？この操作は取り消せません。")
    ) {
      await resetUserStats(userData.uid);
      showStatus("STATS_EMIT_COMPLETED");
    }
  };

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(""), 3000);
  };

  if (!userData) return <div className="bg-[#0d1117] min-h-screen" />;

  // 設定画面
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#adbac7] font-mono p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-12 border-b border-[#30363d] pb-4">
          <button
            onClick={() => router.push("/home")}
            className="flex items-center gap-2 hover:text-[#00ff41] transition-colors text-sm"
          >
            <ArrowLeft size={16} /> BACK_TO_HQ
          </button>
          <div className="flex items-center gap-2">
            <Terminal size={18} className="text-[#00ff41]" />
            <h1 className="text-xl font-bold tracking-widest text-white">
              SYSTEM_SETTINGS
            </h1>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-[#00ff41] text-sm font-bold mb-6 tracking-[0.3em] flex items-center gap-2">
            <Trophy size={16} /> GLOBAL_TOP_RANKERS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rankers.map((player, index) => (
              <div
                key={player.uid}
                className={`p-4 border bg-[#161b22] rounded relative overflow-hidden ${
                  index === 0
                    ? "border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]"
                    : "border-[#30363d]"
                }`}
              >
                <div className="absolute top-2 right-2 opacity-20">
                  <Medal
                    size={40}
                    className={
                      index === 0
                        ? "text-yellow-500"
                        : index === 1
                          ? "text-gray-400"
                          : "text-amber-700"
                    }
                  />
                </div>

                <div className="text-[10px] opacity-50 uppercase font-bold">
                  Rank_0{index + 1}
                </div>
                <div className="text-white font-bold truncate pr-8">
                  {player.displayName || "GUEST_USER"}
                </div>
                <div
                  className={`text-xl font-black mt-1 ${
                    index === 0 ? "text-yellow-500" : "text-[#adbac7]"
                  }`}
                >
                  {player.stats.rating}{" "}
                  <span className="text-[10px] opacity-50 font-normal ml-1">
                    RP
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-10">
          <section className="bg-[#161b22] border border-[#30363d] p-6 rounded-lg">
            <h2 className="text-[#00ff41] text-xs font-bold mb-6 flex items-center gap-2">
              <User size={14} /> USER_PROFILE_MANAGEMENT
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="display-name"
                  className="block text-[10px] opacity-50 mb-2"
                >
                  DISPLAY_NAME
                </label>
                <input
                  id="display-name"
                  type="text"
                  value={newName}
                  placeholder="Enter your pilot name..."
                  aria-label="Display Name"
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-black/40 border border-[#30363d] p-3 text-white rounded focus:border-[#00ff41] outline-none transition-colors"
                />
              </div>
            </div>
          </section>

          <section className="bg-[#161b22] border border-[#30363d] p-6 rounded-lg">
            <h2 className="text-[#00ff41] text-xs font-bold mb-6 flex items-center gap-2">
              <Music size={14} /> AUDIO_ENVIRONMENT_CONFIG
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {BGM_OPTIONS.map((bgm) => (
                <button
                  key={bgm.id}
                  onClick={() => setSelectedBgm(bgm.id)}
                  className={`flex justify-between items-center p-4 border rounded transition-all ${
                    selectedBgm === bgm.id
                      ? "border-[#00ff41] bg-[#00ff41]/5 text-white"
                      : "border-[#30363d] text-gray-500 hover:border-gray-500"
                  }`}
                >
                  <span className="text-sm tracking-widest">{bgm.name}</span>
                  {selectedBgm === bgm.id && (
                    <CheckCircle size={16} className="text-[#00ff41]" />
                  )}
                </button>
              ))}
            </div>
            <p className="mt-4 text-[10px] opacity-40 text-center uppercase">
              ※Volume control: Handled via OS mixer.
            </p>
          </section>

          <section className="border border-red-900/30 p-6 rounded-lg bg-red-900/5">
            <h2 className="text-red-500 text-xs font-bold mb-6 flex items-center gap-2">
              <Trash2 size={14} /> DANGER_ZONE
            </h2>
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-red-500/50 text-red-500 text-xs hover:bg-red-500 hover:text-white transition-all rounded"
            >
              RESET_ALL_BATTLE_STATS
            </button>
          </section>

          <div className="flex items-center gap-6 pt-4">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-8 py-3 bg-[#00ff41] text-black font-bold rounded hover:bg-green-400 transition-all active:scale-95"
            >
              <Save size={18} /> SAVE_CHANGES
            </button>
            {statusMsg && (
              <span className="text-[#00ff41] text-xs animate-pulse tracking-widest font-bold">
                ≫ {statusMsg}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
