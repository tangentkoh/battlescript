"use client";

import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Terminal, ShieldCheck } from "lucide-react";
import { syncUserToFirestore } from "@/lib/user";

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = async () => {
    try {
      console.log("Login started...");
      const result = await signInWithPopup(auth, googleProvider);

      if (result.user) {
        console.log("Auth success, syncing with Firestore...");
        // Firestoreへの保存が終わるのを確実に待つ
        await syncUserToFirestore(result.user);

        console.log("Sync success, redirecting to /home...");
        // 遷移を実行
        router.push("/home");

        // 念のため、App Routerのキャッシュをリフレッシュ（遷移を確実にするため）
        router.refresh();
      }
    } catch (error) {
      console.error("Login Error details:", error);
      alert(
        "認証またはデータ同期に失敗しました。コンソールを確認してください。",
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center font-mono">
      <div className="max-w-md w-full p-8 border border-[#30363d] bg-[#161b22] rounded-lg shadow-2xl text-center">
        {/* アイコン演出 */}
        <div className="mb-6 flex justify-center">
          <div className="p-4 rounded-full bg-black/40 border border-[#00ff41]/30">
            <ShieldCheck className="w-12 h-12 text-[#00ff41] animate-pulse" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-[#00ff41] tracking-[0.2em] mb-2">
          BATTLE_SCRIPT
        </h1>
        <p className="text-[#adbac7] text-xs mb-8 opacity-70">
          SYSTEM_ACCESS_REQUIRED: PLEASE_AUTHENTICATE
        </p>

        <button
          onClick={handleLogin}
          className="w-full py-3 px-6 bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black transition-all duration-300 flex items-center justify-center gap-3 group active:scale-95"
        >
          <Terminal
            size={20}
            className="group-hover:rotate-12 transition-transform"
          />
          SIGN_IN_WITH_GOOGLE
        </button>

        <div className="mt-8 text-[10px] text-gray-600 flex justify-between uppercase">
          <span>Status: Online</span>
          <span>Security: Firebase_Encrypted</span>
        </div>
      </div>
    </div>
  );
}
