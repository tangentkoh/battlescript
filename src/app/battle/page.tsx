"use client";

import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import { Terminal, Send, Play, /*Cpu,*/ Globe } from "lucide-react"; // 一時無効

export default function BattlePage() {
  const [code, setCode] = useState<string | undefined>(
    "// Write your C++ code here...\n#include <iostream>\n\nint main() {\n    return 0;\n}",
  );

  return (
    <div className="flex flex-col h-screen bg-terminal-bg text-terminal-text font-mono">
      {/* ヘッダー */}
      <header className="h-14 border-b border-terminal-border flex items-center justify-between px-6 bg-[#161b22]">
        <div className="flex items-center gap-4">
          <span className="text-terminal-green font-bold tracking-widest animate-pulse">
            BATTLE_SCRIPT v1.0
          </span>
          <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded border border-terminal-border text-xs">
            <Globe size={14} className="text-blue-400" />
            <span>NET_BATTLE: ACTIVE</span>
          </div>
        </div>
        <div className="text-xl font-bold text-white">02:45</div>
        <div className="flex gap-4">
          <div className="text-right">
            <div className="text-[10px] opacity-50 text-terminal-green">
              YOU
            </div>
            <div className="h-1 w-24 bg-gray-700 rounded-full mt-1">
              <div className="h-full bg-terminal-green w-[60%] shadow-[0_0_8px_#00ff41]"></div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] opacity-50 text-red-500">ENEMY</div>
            <div className="h-1 w-24 bg-gray-700 rounded-full mt-1">
              <div className="h-full bg-red-500 w-[45%] shadow-[0_0_8px_#ef4444]"></div>
            </div>
          </div>
        </div>
      </header>

      {/* メインエリア */}
      <main className="flex-1 flex overflow-hidden">
        {/* 左側：問題文 & コンソール */}
        <div className="w-1/3 flex flex-col border-r border-terminal-border">
          <div className="flex-1 p-6 overflow-y-auto border-b border-terminal-border bg-black/20">
            <h2 className="text-terminal-green text-lg mb-4 flex items-center gap-2">
              <Terminal size={18} /> PROBLEM_STATEMENT
            </h2>
            <div className="space-y-4 text-sm leading-relaxed">
              <p>
                正の整数 N が与えられます。1 から N
                までの和を求めて出力してください。
              </p>
              <div className="bg-black/40 p-3 rounded border border-terminal-border">
                <p className="text-xs opacity-50 mb-1 font-bold">
                  INPUT EXAMPLE
                </p>
                <code className="text-white">10</code>
              </div>
              <div className="bg-black/40 p-3 rounded border border-terminal-border">
                <p className="text-xs opacity-50 mb-1 font-bold">
                  OUTPUT EXAMPLE
                </p>
                <code className="text-white">55</code>
              </div>
            </div>
          </div>
          <div className="h-1/3 p-4 bg-black/60 font-mono text-xs overflow-y-auto">
            <p className="text-terminal-green opacity-50">
              [SYSTEM]: Waiting for compilation...
            </p>
          </div>
        </div>

        {/* 右側：エディタ */}
        <div className="flex-1 relative group">
          <Editor
            height="100%"
            defaultLanguage="cpp"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value)}
            options={{
              fontSize: 16,
              minimap: { enabled: false },
              padding: { top: 20 },
              fontFamily: "JetBrains Mono",
              cursorBlinking: "smooth",
            }}
          />

          {/* 操作ボタン */}
          <div className="absolute bottom-6 right-8 flex gap-4">
            <button className="flex items-center gap-2 px-6 py-2 bg-terminal-border hover:bg-gray-700 text-white rounded transition-all active:scale-95 shadow-lg">
              <Play size={18} /> RUN
            </button>
            <button className="flex items-center gap-2 px-6 py-2 bg-terminal-green hover:bg-green-400 text-black font-bold rounded transition-all active:scale-95 shadow-[0_0_15px_rgba(0,255,65,0.4)]">
              <Send size={18} /> SUBMIT
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
