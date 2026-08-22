const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Renderのスリープ対策用（Webサーバーとしての応答を返す）
app.get('/', (req, res) => {
  res.send('Bot is running!');
});

app.listen(PORT, () => {
  console.log(`Web server is listening on port ${PORT}`);
});

const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

// スラッシュコマンド（/panel）の定義
const commands = [
  new SlashCommandBuilder()
    .setName('panel')
    .setDescription('作業状況を記録します')
    .addStringOption(option =>
      option.setName('status')
        .setDescription('報告するステータスを選択してください')
        .setRequired(true)
        .addChoices(
          { name: '🐣 出勤', value: 'work_start' },
          { name: '🍱 食事休憩', value: 'meal_start' },
          { name: '🚬 タバコ休憩', value: 'tobacco_start' },
          { name: '✅ 休憩から戻る', value: 'break_end' },
          { name: '👤 キャラ作成開始', value: 'chara_start' },
          { name: '👤 キャラ作成終了', value: 'chara_end' },
          { name: '🎯 新規AT開始', value: 'newat_start' },
          { name: '🎯 新規AT終了', value: 'newat_end' },
          { name: '📅 8日以降AT開始', value: 'day8at_start' },
          { name: '📅 8日以降AT終了', value: 'day8at_end' },
          { name: '🏁 退勤', value: 'work_end' }
        )
    )
].map(command => command.toJSON());

// 接続のデバッグ用ログ
client.on('debug', info => {
  if (info.includes('[Login]') || info.includes('Gateway') || info.includes('heartbeat')) {
    console.log('Discord Debug:', info);
  }
});

// 起動時の処理
client.once('ready', async () => {
  console.log(`🎉【成功】readyイベントが発火しました！ Logged in as ${client.user.tag}`);
  
  // HAREサーバー専用としてスラッシュコマンドを即時登録
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  
  try {
    const GUILD_ID = '1196382108868939839'; 

    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: commands }
    );
    console.log('【成功】サーバー専用のスラッシュコマンドの登録が完了しました！');
  } catch (error) {
    console.error('【エラー】コマンド登録時にエラーが発生しました:', error);
  }
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

// /panel コマンド実行時の処理
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'panel') {
    await interaction.deferReply({ ephemeral: true });

    const selectedValue = interaction.options.getString('status');
    const userName = interaction.user.username;
    
    const now = new Date();
    const fullDateStr = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const timeStr = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });

    let messageText = '';
    let statusName = '';

    switch (selectedValue) {
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
    }

    if (selectedValue === 'work_end') {
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

    await sendToGAS(fullDateStr, userName, statusName, messageText);

    let targetChannelId = '';
    if (selectedValue === 'work_start' || selectedValue === 'work_end') {
      targetChannelId = process.env.ATTENDANCE_CHANNEL_ID;
    } else {
      targetChannelId = process.env.BUSINESS_CHANNEL_ID;
    }

    if (targetChannelId) {
      try {
        const channel = await client.channels.fetch(targetChannelId);
        if (channel) {
          await channel.send(messageText);
        }
      } catch (err) {
        console.error('チャンネルへの送信エラー:', err);
      }
    }

    await interaction.editReply({ content: `記録しました：${messageText}` });
  }
});

// エラーや警告をログに出すための設定
client.on('error', error => {
  console.error('Discordクライアントエラー:', error);
});

process.on('unhandledRejection', error => {
  console.error('未処理のPromise拒否:', error);
});

// 最後にDiscordへログイン
console.log('Discordへのログインを試みます...');
client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    console.log('client.loginのPromiseが正常に解決されました！');
  })
  .catch(err => {
    console.error('【重大なログインエラー】:', err);
  });
