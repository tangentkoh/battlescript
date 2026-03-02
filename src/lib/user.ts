import { db } from "./firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { User as FirebaseUser } from "firebase/auth";
import { onSnapshot } from "firebase/firestore";

export async function syncUserToFirestore(user: FirebaseUser) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // 初回ログイン時の初期データ
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      email: user.email,
      stats: {
        wins: 0,
        losses: 0,
        rating: 1500,
      },
      settings: {
        bgm: "none",
        volume: 50,
      },
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });
    console.log("New user created in Firestore!");
  } else {
    // 既存ユーザーの場合はログイン日だけ更新
    await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
  }
}

// ユーザーデータの型定義
export interface UserStats {
  wins: number;
  losses: number;
  rating: number;
}
export interface UserData {
  uid: string;
  displayName: string | null;
  stats: UserStats;
  settings: {
    bgm: string;
    volume: number;
  };
}
// ユーザーデータをリアルタイムで購読するHooks用の関数
export function subscribeUserStats(
  uid: string,
  callback: (data: UserData) => void,
) {
  const userRef = doc(db, "users", uid);
  return onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      // データの存在を確認し、型をキャスト
      callback(docSnap.data() as UserData);
    }
  });
}
