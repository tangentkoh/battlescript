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
} from "@/lib/user";
import {
  Terminal,
  Save,
  ArrowLeft,
  Music,
  User,
  Trash2,
  CheckCircle,
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

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#adbac7] font-mono p-8">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
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

        <div className="space-y-10">
          {/* プロフィール設定 */}
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

          {/* BGM設定 */}
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

          {/* 危険エリア */}
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

          {/* 保存ボタン・ステータス */}
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
