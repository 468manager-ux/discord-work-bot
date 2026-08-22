const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// JSON形式のデータを扱えるようにする
app.use(express.json());

// Renderのスリープ対策用（Webサーバーとしての応答）
app.get('/', (req, res) => {
  res.send('Discord Webhook Bot is running!');
});

// GAS（スプレッドシート）へデータを送信する関数
async function sendToGAS(dateStr, userName, statusName, messageText) {
  const gasUrl = process.env.GAS_URL;
  if (!gasUrl) {
    console.error('GAS_URLが設定されていません');
    return;
  }

  const data = {
    date: dateStr,
    name: userName,
    status: statusName,
    message: messageText
  };

  try {
    await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    console.log('GASへ送信成功:', statusName);
  } catch (error) {
    console.error('GAS送信エラー:', error);
  }
}

// DiscordのWebhookへメッセージを送信する関数
async function sendToDiscordWebhook(webhookUrl, messageText) {
  if (!webhookUrl) {
    console.error('DiscordのWebhook URLが設定されていません');
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: messageText })
    });
    console.log('Discord Webhookへ送信成功');
  } catch (error) {
    console.error('Discord Webhook送信エラー:', error);
  }
}

// 外部（GASやボタンなど）からのリクエストを受け取るエンドポイント
app.post('/webhook', async (req, res) => {
  const { status, userName } = req.body;
  
  if (!status || !userName) {
    return res.status(400).send('Missing status or userName');
  }

  const now = new Date();
  const fullDateStr = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  const timeStr = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });

  let messageText = '';
  let statusName = '';

  switch (status) {
    case 'work_start':
      statusName = '出勤';
      messageText = `${timeStr} ${userName}：出勤しました`;
      break;
    case 'work_end':
      statusName = '退勤';
      messageText = `${timeStr} ${userName}：お疲れ様でした（退勤）`;
      break;
    case 'meal_start':
      statusName = '食事休憩開始';
      messageText = `${timeStr} ${userName}：食事休憩開始`;
      break;
    case 'tobacco_start':
      statusName = 'タバコ休憩開始';
      messageText = `${timeStr} ${userName}：タバコ休憩開始`;
      break;
    case 'break_end':
      statusName = '休憩終了';
      messageText = `${timeStr} ${userName}：休憩から戻りました`;
      break;
    case 'chara_start':
      statusName = 'キャラ作成開始';
      messageText = `${timeStr} ${userName}：キャラ作成開始`;
      break;
    case 'chara_end':
      statusName = 'キャラ作成終了';
      messageText = `${timeStr} ${userName}：キャラ作成終了`;
      break;
    case 'newat_start':
      statusName = '新規AT開始';
      messageText = `${timeStr} ${userName}：新規AT開始`;
      break;
    case 'newat_end':
      statusName = '新規AT終了';
      messageText = `${timeStr} ${userName}：新規AT終了`;
      break;
    case 'day8at_start':
      statusName = '8日以降AT開始';
      const endTime = new Date(now.getTime() + 30 * 60000); 
      const endTimeStr = endTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
      messageText = `${timeStr} ${userName}：8日以降AT開始（${endTimeStr}まで）`;
      break;
    case 'day8at_end':
      statusName = '8日以降AT終了';
      messageText = `${timeStr} ${userName}：8日以降AT終了`;
      break;
    default:
      return res.status(400).send('Invalid status');
  }

  if (status === 'work_end') {
    let sheetUrl = '';
    if (userName === 'h.0035') {
      sheetUrl = 'https://docs.google.com/spreadsheets/d/1wW1B9HZRxyfFHglTGeAY3Ef8JEqfV04zSDq-G4fHuDo/edit?gid=1072658342#gid=1072658342';
    } else if (userName === 'nitsushi09798') {
      sheetUrl = 'https://docs.google.com/spreadsheets/d/1wW1B9HZRxyfFHglTGeAY3Ef8JEqfV04zSDq-G4fHuDo/edit?gid=1555584964#gid=1555584964';
    }

    if (sheetUrl) {
      messageText = `${timeStr} ${userName}：お疲れ様でした（退勤） 勤務時間の確認はこちら→ ${sheetUrl}`;
    }
  }

  // GASへ送信
  await sendToGAS(fullDateStr, userName, statusName, messageText);

  // チャンネルに応じたWebhook URLに送信
  let targetWebhookUrl = '';
  if (status === 'work_start' || status === 'work_end') {
    targetWebhookUrl = process.env.ATTENDANCE_WEBHOOK_URL;
  } else {
    targetWebhookUrl = process.env.BUSINESS_WEBHOOK_URL;
  }

  if (targetWebhookUrl) {
    await sendToDiscordWebhook(targetWebhookUrl, messageText);
  }

  res.status(200).send({ success: true, message: messageText });
});

app.listen(PORT, () => {
  console.log(`Webhook server is listening on port ${PORT}`);
});
