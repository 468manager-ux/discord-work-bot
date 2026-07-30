const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// コマンドの定義
const commands = [
  new SlashCommandBuilder()
    .setName('panel')
    .setDescription('作業状況パネルを表示します')
].map(command => command.toJSON());

// 起動時にDiscordへスラッシュコマンドを自動登録
client.once('ready', async () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);

  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    console.log('スラッシュコマンドを登録中...');
    
    // 全サーバーにコマンドを登録
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('スラッシュコマンドの登録が完了しました！');
  } catch (error) {
    console.error('コマンド登録エラー:', error);
  }
});

// スラッシュコマンド（/panel）が実行された時の処理
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'panel') {
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

    await interaction.reply({
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

  await interaction.deferUpdate();

  if (customId.endsWith('_start')) {
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
