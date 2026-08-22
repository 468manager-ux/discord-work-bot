const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// GAS（スプレッドシート）へデータを送信する関数
async function sendToGAS(dateStr, userName, statusName, messageText) {
  const gasUrl = process.env.GAS_URL;
  if (!gasUrl) return;

  try {
    await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateStr, name: userName, status: statusName, message: messageText })
    });
  } catch (error) {
    console.error('GAS送信エラー:', error);
  }
}

// DiscordのWebhookへ送信する関数
async function sendToDiscordWebhook(webhookUrl, messageText) {
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: messageText })
    });
  } catch (error) {
    console.error('Discord Webhook送信エラー:', error);
  }
}

// ブラウザ用の操作画面（ボタンページ）を表示
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>勤怠・業務管理パネル</title>
      <style>
        body { font-family: sans-serif; background: #f4f7f6; padding: 20px; max-width: 500px; margin: 0 auto; }
        h2 { color: #333; text-align: center; }
        .user-select { margin-bottom: 20px; text-align: center; }
        select { padding: 10px; font-size: 16px; width: 100%; border-radius: 5px; border: 1px solid #ccc; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        button { padding: 15px; font-size: 16px; font-weight: bold; color: white; border: none; border-radius: 8px; cursor: pointer; transition: 0.2s; }
        button:active { transform: scale(0.98); }
        .btn-work { background-color: #2ecc71; grid-column: span 2; }
        .btn-break { background-color: #e67e22; }
        .btn-other { background-color: #3498db; }
        #result { margin-top: 20px; text-align: center; font-weight: bold; color: #27ae60; }
      </style>
    </head>
    <body>
      <h2>勤怠・業務管理パネル</h2>
      <div class="user-select">
        <label for="userName">ユーザー名：</label>
        <select id="userName">
          <option value="h.0035">h.0035</option>
          <option value="nitsushi09798">nitsushi09798</option>
        </select>
      </div>
      <div class="grid">
        <button class="btn-work" onclick="sendAction('work_start')">🟢 出勤</button>
        <button class="btn-work" onclick="sendAction('work_end')">🔴 退勤</button>
        <button class="btn-break" onclick="sendAction('meal_start')">🍱 食事休憩開始</button>
        <button class="btn-break" onclick="sendAction('tobacco_start')">🚬 タバコ休憩</button>
        <button class="btn-break" onclick="sendAction('break_end')" style="grid-column: span 2;">🔙 休憩終了</button>
        <button class="btn-other" onclick="sendAction('chara_start')">🎨 キャラ作成開始</button>
        <button class="btn-other" onclick="sendAction('chara_end')">🏁 キャラ作成終了</button>
        <button class="btn-other" onclick="sendAction('newat_start')">⚡ 新規AT開始</button>
        <button class="btn-other" onclick="sendAction('newat_end')">🏁 新規AT終了</button>
        <button class="btn-other" onclick="sendAction('day8at_start')" style="grid-column: span 2;">⭐ 8日以降AT開始</button>
        <button class="btn-other" onclick="sendAction('day8at_end')" style="grid-column: span 2;">🏁 8日以降AT終了</button>
      </div>
      <div id="result"></div>

      <script>
        async function sendAction(status) {
          const userName = document.getElementById('userName').value;
          const resultDiv = document.getElementById('result');
          resultDiv.innerText = '送信中...';

          try {
            const res = await fetch('/webhook', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status, userName })
            });
            const data = await res.json();
            if (data.success) {
              resultDiv.innerText = '✅ 送信完了: ' + data.message;
            } else {
              resultDiv.innerText = '❌ エラーが発生しました';
            }
          } catch (err) {
            resultDiv.innerText = '❌ 通信エラー';
          }
        }
      </script>
    </body>
    </html>
  `);
});

// ボタンから、あるいは外部からのデータ受信エンドポイント
app.post('/webhook', async (req, res) => {
  const { status, userName } = req.body;
  if (!status || !userName) return res.status(400).send('Missing status or userName');

  const now = new Date();
  const fullDateStr = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  const timeStr = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });

  let messageText = '';
  let statusName = '';

  switch (status) {
    case 'work_start': statusName = '出勤'; messageText = `${timeStr} ${userName}：出勤しました`; break;
    case 'work_end': 
      statusName = '退勤'; 
      messageText = `${timeStr} ${userName}：お疲れ様でした（退勤）`;
      let sheetUrl = userName === 'h.0035' ? 'https://docs.google.com/spreadsheets/d/1wW1B9HZRxyfFHglTGeAY3Ef8JEqfV04zSDq-G4fHuDo/edit?gid=1072658342#gid=1072658342' : 'https://docs.google.com/spreadsheets/d/1wW1B9HZRxyfFHglTGeAY3Ef8JEqfV04zSDq-G4fHuDo/edit?gid=1555584964#gid=1555584964';
      messageText += ` 勤務時間の確認はこちら→ ${sheetUrl}`;
      break;
    case 'meal_start': statusName = '食事休憩開始'; messageText = `${timeStr} ${userName}：食事休憩開始`; break;
    case 'tobacco_start': statusName = 'タバコ休憩開始'; messageText = `${timeStr} ${userName}：タバコ休憩開始`; break;
    case 'break_end': statusName = '休憩終了'; messageText = `${timeStr} ${userName}：休憩から戻りました`; break;
    case 'chara_start': statusName = 'キャラ作成開始'; messageText = `${timeStr} ${userName}：キャラ作成開始`; break;
    case 'chara_end': statusName = 'キャラ作成終了'; messageText = `${timeStr} ${userName}：キャラ作成終了`; break;
    case 'newat_start': statusName = '新規AT開始'; messageText = `${timeStr} ${userName}：新規AT開始`; break;
    case 'newat_end': statusName = '新規AT終了'; messageText = `${timeStr} ${userName}：新規AT終了`; break;
    case 'day8at_start': 
      statusName = '8日以降AT開始';
      const endTime = new Date(now.getTime() + 30 * 60000);
      const endTimeStr = endTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
      messageText = `${timeStr} ${userName}：8日以降AT開始（${endTimeStr}まで）`;
      break;
    case 'day8at_end': statusName = '8日以降AT終了'; messageText = `${timeStr} ${userName}：8日以降AT終了`; break;
    default: return res.status(400).send('Invalid status');
  }

  // GASへ送信
  await sendToGAS(fullDateStr, userName, statusName, messageText);

  // Discordへ送信
  const targetWebhookUrl = (status === 'work_start' || status === 'work_end') ? process.env.ATTENDANCE_WEBHOOK_URL : process.env.BUSINESS_WEBHOOK_URL;
  await sendToDiscordWebhook(targetWebhookUrl, messageText);

  res.status(200).send({ success: true, message: messageText });
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
