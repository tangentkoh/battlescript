// src/lib/audio.ts
import { Howl } from "howler";

class AudioManager {
  private static instance: AudioManager;
  private currentBgm: Howl | null = null;
  private currentBgmId: string = "none";

  private constructor() {}

  static getInstance() {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  playBgm(bgmId: string) {
    if (this.currentBgmId === bgmId) return; // 同じ曲なら何もしない

    if (this.currentBgm) {
      this.currentBgm.fade(1, 0, 1000); // 1秒かけてフェードアウト
      const oldBgm = this.currentBgm;
      setTimeout(() => oldBgm.stop(), 1000);
    }

    if (bgmId === "none") {
      this.currentBgmId = "none";
      this.currentBgm = null;
      return;
    }

    // public/bgm/ フォルダにファイルを置く想定
    this.currentBgm = new Howl({
      src: [`/bgm/${bgmId}.mp3`],
      loop: true,
      volume: 0.5,
      html5: true, // 大きなファイルでもストリーミング再生
    });

    this.currentBgm.play();
    this.currentBgm.fade(0, 0.5, 2000); // 2秒かけてフェードイン
    this.currentBgmId = bgmId;
  }
}

export const audioManager = AudioManager.getInstance();
