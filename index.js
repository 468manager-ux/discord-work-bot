const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(process.env.PORT || 3000);

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

// 起動時にSlash Commandを登録
client.once('ready', async () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('スラッシュコマンドの登録が正常に完了しました！');
  } catch (error) {
    console.error('コマンド登録エラー:', error);
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
    await interaction.deferReply();

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
        messageText = `${timeStr}側 ${userName}：8日以降AT開始`;
        break;
      case 'day8at_end':
        statusName = '8日以降AT終了';
        messageText = `${timeStr} ${userName}：8日以降AT終了`;
        break;
    }

    // 1. スプレッドシート（GAS）に送信
    sendToGAS(fullDateStr, userName, statusName, messageText);

    // 2. 出勤・退勤の場合は、専用チャンネル（1476851793836245054）にも通知を飛ばす
    if (selectedValue === 'work_start' || selectedValue === 'work_end') {
      const attendanceChannelId = process.env.ATTENDANCE_CHANNEL_ID;
      if (attendanceChannelId) {
        try {
          const channel = await client.channels.fetch(attendanceChannelId);
          if (channel) {
            await channel.send(messageText);
          }
        } catch (err) {
          console.error('勤怠チャンネルへの送信エラー:', err);
        }
      }
    }

    // 3. Discordに返信（実行した本人への通知）
    await interaction.editReply({ content: messageText });
  }
});

client.login(process.env.DISCORD_TOKEN);
