const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 開始時刻を保持するメモリ記憶（簡易版）
const userSessions = new Map();

client.once('ready', async () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
});

// `!panel` と発言されたらパネルを出力
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  if (message.content === '!panel') {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('meal_start').setLabel('🍱 食事休憩').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('tobacco_start').setLabel('🚬 タバコ休憩').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('break_end').setLabel('✅ 休憩から戻る').setStyle(ButtonStyle.Success)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('chara_start').setLabel('👤 キャラ作成開始').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('chara_end').setLabel('👤 キャラ作成終了').setStyle(ButtonStyle.Danger)
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('newat_start').setLabel('🎯 新規AT開始').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('newat_end').setLabel('🎯 新規AT終了').setStyle(ButtonStyle.Danger)
    );

    const row4 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('day8at_start').setLabel('📅 8日以降AT開始').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('day8at_end').setLabel('📅 8日以降AT終了').setStyle(ButtonStyle.Danger)
    );

    await message.channel.send({
      content: '**【作業状況パネル】**\nボタンを押して記録してください。',
      components: [row1, row2, row3, row4]
    });
  }
});

// ボタンが押された時の処理
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  const customId = interaction.customId;
  const userId = interaction.user.id;
  const userName = interaction.user.username;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });

  // 応答の遅延を防止
  await interaction.deferUpdate();

  // 処理分岐
  if (customId.endsWith('_start')) {
    userSessions.set(`${userId}_${customId}`, now);
    let actionName = '';
    if (customId === 'meal_start') actionName = '食事休憩';
    if (customId === 'tobacco_start') actionName = 'タバコ休憩';
    if (customId === 'chara_start') actionName = 'キャラ作成';
    if (customId === 'newat_start') actionName = '新規AT';
    if (customId === 'day8at_start') actionName = '8日以降AT';

    await interaction.channel.send(`${timeStr} ${userName}：${actionName}開始`);
  } else if (customId === 'break_end') {
    await interaction.channel.send(`${timeStr} ${userName}：休憩から戻りました`);
  } else if (customId.endsWith('_end')) {
    let actionName = '';
    if (customId === 'chara_end') actionName = 'キャラ作成';
    if (customId === 'newat_end') actionName = '新規AT';
    if (customId === 'day8at_end') actionName = '8日以降AT';

    await interaction.channel.send(`${timeStr} ${userName}：${actionName}終了`);
  }
});

client.login(process.env.DISCORD_TOKEN);
