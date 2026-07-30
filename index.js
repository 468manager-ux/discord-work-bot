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
          { name: '🍱 食事休憩', value: 'meal_start' },
          { name: '🚬 タバコ休憩', value: 'tobacco_start' },
          { name: '✅ 休憩から戻る', value: 'break_end' },
          { name: '👤 キャラ作成開始', value: 'chara_start' },
          { name: '👤 キャラ作成終了', value: 'chara_end' },
          { name: '🎯 新規AT開始', value: 'newat_start' },
          { name: '🎯 新規AT終了', value: 'newat_end' },
          { name: '📅 8日以降AT開始', value: 'day8at_start' },
          { name: '📅 8日以降AT終了', value: 'day8at_end' }
        )
    )
].map(command => command.toJSON());

// 起動時に特定サーバーへスラッシュコマンドを即時登録
client.once('ready', async () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);

  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const GUILD_ID = '1196382108868939839';
    
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: commands }
    );
    console.log('スラッシュコマンドの登録が完了しました！');
  } catch (error) {
    console.error('コマンド登録エラー:', error);
  }
});

// ① /panel コマンドが実行された時の処理（手前で選択する方式）
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'panel') {
    const selectedValue = interaction.options.getString('status');
    const userName = interaction.user.username;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });

    let messageText = '';
    if (selectedValue === 'meal_start') messageText = `${timeStr} ${userName}：食事休憩開始`;
    else if (selectedValue === 'tobacco_start') messageText = `${timeStr} ${userName}：タバコ休憩開始`;
    else if (selectedValue === 'break_end') messageText = `${timeStr} ${userName}：休憩から戻りました`;
    else if (selectedValue === 'chara_start') messageText = `${timeStr} ${userName}：キャラ作成開始`;
    else if (selectedValue === 'chara_end') messageText = `${timeStr} ${userName}：キャラ作成終了`;
    else if (selectedValue === 'newat_start') messageText = `${timeStr} ${userName}：新規AT開始`;
    else if (selectedValue === 'newat_end') messageText = `${timeStr} ${userName}：新規AT終了`;
    else if (selectedValue === 'day8at_start') messageText = `${timeStr} ${userName}：8日以降AT開始`;
    else if (selectedValue === 'day8at_end') messageText = `${timeStr} ${userName}：8日以降AT終了`;

    await interaction.reply({ content: messageText });
  }
});

// ② 「半角スペース」が送信された時の処理（ボタンパネルを表示する方式）
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  // メッセージが半角スペース（または全角スペース）のみの場合
  if (message.content === ' ' || message.content === ' ') {
    // 送信されたスペースメッセージを削除
    try { await message.delete(); } catch (e) {}

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

    // ボタンパネルをチャットに送信
    await message.channel.send({
      content: '**【作業状況パネル】**',
      components: [row1, row2, row3, row4]
    });
  }
});

// ③ ボタンが押された時の処理
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  const customId = interaction.customId;
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
