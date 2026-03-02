"use client";

import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { subscribeUserStats, UserData } from "@/lib/user";
import {
  Globe,
  Cpu,
  Settings,
  LogOut,
  Terminal,
  User,
  Trophy,
  Activity,
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

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  // ログインチェック
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
    <div className="min-h-screen bg-[#0d1117] text-[#adbac7] font-mono p-8">
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
            onClick={handleLogout}
            className="hover:text-red-400 flex items-center gap-1 transition-colors text-xs"
          >
            <LogOut size={14} /> LOGOUT
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <MenuCard
          title="ONLINE_BATTLE"
          desc="リアルタイムで世界中のエンジニアとコードの速さを競う。"
          icon={<Globe className="w-10 h-10" />}
          color="border-blue-500/50 hover:bg-blue-500/10 hover:border-blue-400"
          onClick={() => router.push("/battle")}
        />

        <MenuCard
          title="CPU_BATTLE"
          desc="練習モード。自分に最適な難易度のAIと戦う。"
          icon={<Cpu className="w-10 h-10" />}
          color="border-[#00ff41]/50 hover:bg-[#00ff41]/10 hover:border-[#00ff41]"
          onClick={() => router.push("/battle?mode=cpu")}
        />

        <MenuCard
          title="SETTINGS"
          desc="戦績の確認、BGMの選択、プロフィールの編集。"
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

        <div className="mt-6 p-4 bg-[#161b22] border border-[#30363d] rounded text-[10px] opacity-60 uppercase tracking-[0.2em] flex justify-between">
          <p className="animate-pulse">≫ SYSTEM_READY: Connection stable.</p>
          <p>Location: Gifu, Japan</p>
        </div>
      </div>
    </div>
  );
}

// サブコンポーネント
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

// サブコンポーネント
interface MenuCardProps {
  title: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}
function MenuCard({ title, desc, icon, color, onClick }: MenuCardProps) {
  return (
    <button
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
