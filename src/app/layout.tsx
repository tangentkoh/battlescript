"use client";

import { useEffect } from "react";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { subscribeUserStats } from "@/lib/user";
import { audioManager } from "@/lib/audio";

// サーバーチックな雰囲気を出すための等幅フォント設定
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // アプリ全体でログイン状態とユーザー設定（BGM）を監視
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // ログイン中なら、そのユーザーの設定（BGMなど）を購読
        const unsubscribeStats = subscribeUserStats(user.uid, (data) => {
          if (data.settings?.bgm) {
            // Firestoreの設定が変わるたびにBGMを更新
            audioManager.playBgm(data.settings.bgm);
          }
        });
        return () => unsubscribeStats();
      } else {
        // 未ログイン時はBGMを止める
        audioManager.playBgm("none");
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <html lang="ja" className={`${jetbrainsMono.variable}`}>
      <body className="font-mono antialiased bg-[#0d1117] text-[#adbac7]">
        {/* 全ページ共通の背景ノイズやスキャンラインをここに入れてもOK */}
        <div className="min-h-screen relative overflow-hidden">
          {/* サーバーチックな薄いグリッド背景の例 */}
          <div className="absolute inset-0 z-[-1] opacity-5 pointer-events-none bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-size-[40px_40px]"></div>
          {children}
        </div>
      </body>
    </html>
  );
}
