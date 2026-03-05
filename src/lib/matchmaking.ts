// src/lib/matchmaking.ts
import { rtdb } from "./firebase";
import {
  ref,
  onValue,
  /*push,*/
  set,
  remove,
  update,
  get,
  serverTimestamp,
  off,
} from "firebase/database";

export async function startMatching(
  uid: string,
  name: string,
  rating: number,
  config: { lang: string; diff: string },
  onMatchFound: (roomId: string) => void,
) {
  const poolRef = ref(rtdb, "matching_pool");
  const userInPoolRef = ref(rtdb, `matching_pool/${uid}`);

  // 1. 待機中のプレイヤーを確認
  const snapshot = await get(poolRef);
  const pool = snapshot.val();

  let opponentId = "";
  if (pool) {
    // 自分以外の最初に見つかったユーザーを相手にする
    opponentId = Object.keys(pool).find((id) => id !== uid) || "";
  }

  if (opponentId) {
    // 【マッチ成立！】
    const opponent = pool[opponentId];
    const roomId = `room_${uid}_${opponentId}`; // ユニークなルームID
    const roomRef = ref(rtdb, `rooms/${roomId}`);

    // ルームを作成し、待機列から相手を削除
    await set(roomRef, {
      status: "waiting",
      difficulty: "medium", // とりあえず固定
      players: {
        [uid]: { name, progress: 0, isReady: true },
        [opponentId]: { name: opponent.name, progress: 0, isReady: true },
      },
      createdAt: serverTimestamp(),
    });

    await remove(ref(rtdb, `matching_pool/${opponentId}`));
    onMatchFound(roomId);
  } else {
    // 【自分が待機列に並ぶ】
    await set(userInPoolRef, {
      name,
      rating,
      joinedAt: serverTimestamp(),
    });

    // 誰かが自分を拾ってルームを作ってくれるのを監視
    const roomsRef = ref(rtdb, "rooms");
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const rooms = snapshot.val();
      if (rooms) {
        // 自分が含まれているルームを探す
        const matchedRoomId = Object.keys(rooms).find((id) => id.includes(uid));
        if (matchedRoomId) {
          unsubscribe();
          remove(userInPoolRef); // 待機列から削除
          onMatchFound(matchedRoomId);
        }
      }
    });
  }
}

export interface PlayerSyncData {
  name: string;
  progress: number;
  isFinished: boolean; // 勝利判定用
}

// 自分の進捗を送信する
export function updateProgress(roomId: string, uid: string, progress: number) {
  const updates: Record<string, number> = {}; // 型指定
  updates[`rooms/${roomId}/players/${uid}/progress`] = progress;
  update(ref(rtdb), updates);
}

// 勝利を報告する
export function reportVictory(roomId: string, uid: string) {
  const updates: Record<string, boolean | string> = {};
  updates[`rooms/${roomId}/players/${uid}/isFinished`] = true;
  updates[`rooms/${roomId}/status`] = "finished";
  update(ref(rtdb), updates);
}

// 相手の進捗を監視する
export function subscribeOpponent(
  roomId: string,
  opponentId: string,
  callback: (data: PlayerSyncData | null) => void,
) {
  const opponentRef = ref(rtdb, `rooms/${roomId}/players/${opponentId}`);
  onValue(opponentRef, (snapshot) => {
    callback(snapshot.val() as PlayerSyncData | null);
  });
  return () => off(opponentRef);
}
