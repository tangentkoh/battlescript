import { rtdb } from "./firebase";
import {
  ref,
  onValue,
  set,
  remove,
  update,
  get,
  serverTimestamp,
  off,
  onDisconnect,
} from "firebase/database";

// マッチングとリアルタイム同期
export interface PlayerSyncData {
  name: string;
  progress: number;
  isFinished: boolean;
}

// マッチング開始
export async function startMatching(
  uid: string,
  name: string,
  rating: number,
  onMatchFound: (roomId: string) => void,
) {
  const poolRef = ref(rtdb, "matching_pool");
  const userInPoolRef = ref(rtdb, `matching_pool/${uid}`);

  const snapshot = await get(poolRef);
  const pool = snapshot.val();

  let opponentId = "";
  if (pool) {
    opponentId = Object.keys(pool).find((id) => id !== uid) || "";
  }

  if (opponentId) {
    // マッチング
    const opponent = pool[opponentId];
    const roomId = `room_${uid}_${opponentId}`;
    const roomRef = ref(rtdb, `rooms/${roomId}`);

    await set(roomRef, {
      status: "playing",
      players: {
        [uid]: { name, progress: 0, isFinished: false },
        [opponentId]: { name: opponent.name, progress: 0, isFinished: false },
      },
      createdAt: serverTimestamp(),
    });

    await remove(ref(rtdb, `matching_pool/${opponentId}`));
    onMatchFound(roomId);
  } else {
    // 待機
    await set(userInPoolRef, { name, rating, joinedAt: serverTimestamp() });

    // 待機中にブラウザを閉じたら削除
    onDisconnect(userInPoolRef).remove();

    const roomsRef = ref(rtdb, "rooms");
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const rooms = snapshot.val();
      if (rooms) {
        const matchedRoomId = Object.keys(rooms).find((id) => id.includes(uid));
        if (matchedRoomId) {
          unsubscribe();
          remove(userInPoolRef);
          onMatchFound(matchedRoomId);
        }
      }
    });
  }
}

// マッチングキャンセル
export async function cancelMatching(uid: string) {
  await remove(ref(rtdb, `matching_pool/${uid}`));
}

// 進捗更新
export function updateProgress(roomId: string, uid: string, progress: number) {
  const updates: Record<string, number> = {};
  updates[`rooms/${roomId}/players/${uid}/progress`] = progress;
  update(ref(rtdb), updates);
}

// 勝利報告
export function reportVictory(roomId: string, uid: string) {
  const updates: Record<string, boolean | string> = {};
  updates[`rooms/${roomId}/players/${uid}/isFinished`] = true;
  updates[`rooms/${roomId}/status`] = "finished";
  update(ref(rtdb), updates);
}

// 敗北報告
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

// 切断による敗北設定
export function setupDisconnectDefeat(roomId: string, uid: string) {
  const playerRef = ref(rtdb, `rooms/${roomId}/players/${uid}/isFinished`);
  onDisconnect(playerRef).set(true);
}
