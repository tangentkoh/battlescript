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
  config: { lang: string; diff: string },
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
    // ホストとしてマッチング成立
    const opponent = pool[opponentId];
    const roomId = `room_${uid}_${opponentId}`;
    const roomRef = ref(rtdb, `rooms/${roomId}`);

    await set(roomRef, {
      status: "playing",
      host: uid,
      language: config.lang,
      difficulty: config.diff,
      players: {
        [uid]: { name, progress: 0, isFinished: false },
        [opponentId]: { name: opponent.name, progress: 0, isFinished: false },
      },
      problem: null,
      createdAt: serverTimestamp(),
    });

    await remove(ref(rtdb, `matching_pool/${opponentId}`));
    onMatchFound(roomId);
  } else {
    // ゲストとしてプールに参加
    await set(userInPoolRef, { name, rating, joinedAt: serverTimestamp() });
    onDisconnect(userInPoolRef).remove();

    const roomsRef = ref(rtdb, "rooms");
    onValue(roomsRef, (snapshot) => {
      const rooms = snapshot.val();
      if (rooms) {
        // 自分が含まれている進行中の部屋を探す
        const matchedRoomId = Object.keys(rooms).find(
          (id) => id.includes(uid) && rooms[id].status === "playing",
        );
        if (matchedRoomId) {
          off(roomsRef);
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

// ルーム破壊
export async function leaveRoom(roomId: string, uid: string) {
  const roomRef = ref(rtdb, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  const roomData = snapshot.val();

  if (!roomData) return;

  const playerRef = ref(rtdb, `rooms/${roomId}/players/${uid}`);
  await remove(playerRef);

  const updatedSnapshot = await get(ref(rtdb, `rooms/${roomId}/players`));
  const remainingPlayers = updatedSnapshot.val();

  if (!remainingPlayers || Object.keys(remainingPlayers).length === 0) {
    await remove(roomRef);
    console.log(`≫ ROOM_${roomId}_DELETED_SUCCESSFULLY`);
  }
}
