"use client";

import { useEffect } from "react";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { subscribeUserStats } from "@/lib/user";
import { audioManager } from "@/lib/audio";

// サーバーチック
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
    let unsubscribeStats: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // ユーザーが変わるたびに古い購読を解除
      if (unsubscribeStats) {
        unsubscribeStats();
        unsubscribeStats = null;
      }
      audioManager.playBgm("none");

      if (user) {
        unsubscribeStats = subscribeUserStats(user.uid, (data) => {
          if (data && data.settings?.bgm) {
            audioManager.playBgm(data.settings.bgm);
          }
        });
      }
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeStats) unsubscribeStats();
    };
  }, []);

  return (
    <html lang="ja" className={`${jetbrainsMono.variable}`}>
      <body className="font-mono antialiased bg-[#0d1117] text-[#adbac7]">
        <div className="min-h-screen relative overflow-hidden">
          <div className="absolute inset-0 z-[-1] opacity-5 pointer-events-none bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-size-[40px_40px]"></div>
          {children}
        </div>
      </body>
    </html>
  );
}
