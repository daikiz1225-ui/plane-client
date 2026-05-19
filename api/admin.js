import { Redis } from '@upstash/redis';

// 🔌 提供された接続情報をコードに直接セット
const redis = new Redis({
  url: "https://big-monkfish-128403.upstash.io",
  token: "gQAAAAAAAfWTAAIgcDFiMmMyYjE5ZTA5ODc0Y2ZiYTM2NGFiYTU4MWVlMGViYQ",
});

const ADMIN_SECRET = "googloadmin123"; // 🔒 管理画面用の秘密の合言葉

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { secret, action, usernameToDelete } = req.body;

  // 1. 合言葉が一致しているか厳重にチェック
  if (!secret || secret !== ADMIN_SECRET) {
    return res.status(403).json({ success: false, error: '合言葉が違います。' });
  }

  try {
    // 🗑️ アカウント削除処理
    if (action === 'delete') {
      if (!usernameToDelete) {
        return res.status(400).json({ success: false, error: '削除するユーザー名が指定されていません。' });
      }

      // ユーザー情報キーと、データ用キーの両方を完全に削除
      await redis.del(`user:${usernameToDelete}`);
      await redis.del(`user:${usernameToDelete}:data`);

      return res.status(200).json({ success: true, message: `ユーザー「${usernameToDelete}」のデータを完全に削除しました。` });
    }

    // 📋 通常の全データ一括取得処理（デフォルト）
    const userKeys = await redis.keys('user:*');
    const accountKeys = userKeys.filter(key => !key.endsWith(':data'));
    const allData = [];

    for (const accountKey of accountKeys) {
      const username = accountKey.replace('user:', '');
      const passwordHash = await redis.get(accountKey);
      const backupData = await redis.get(`user:${username}:data`);

      allData.push({
        username,
        passwordHash: passwordHash || '未設定',
        backupData: backupData || { yt_history: [], yt_subs: [] }
      });
    }

    return res.status(200).json({ success: true, data: allData });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
  }
}
