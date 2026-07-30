const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');
const http = require('http');
http.createServer((req, res) => res.end('Bot is running!')).listen(process.env.PORT || 3000);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// 開始時刻を保持するメモリ記憶（簡易版）
const userSessions = new Map();

client.once('ready', async () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
  await sendPanel();
});

// コマンド `/setup-panel` でパネルを出力
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'setup-panel') {
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
  }

  // ボタンが押された時の処理
  if (interaction.isButton()) {
    const customId = interaction.customId;
    const userId = interaction.user.id;
    const userName = interaction.user.username;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });

    let message = '';

    // 開始イベントの場合
    if (customId.endsWith('_start')) {
      const taskName = getTaskName(customId);
      userSessions.set(`${userId}_${customId.replace('_start', '')}`, now);
      message = `[${timeStr}] 👤 **${userName}** さんが **${taskName}** を開始しました`;
    } 
    // 終了イベント・戻りの場合
    else {
      const taskKey = customId.replace('_end', '');
      const startTime = userSessions.get(`${userId}_${taskKey}`);
      let durationStr = '';

      if (startTime) {
        const diffMinutes = Math.round((now - startTime) / 1000 / 60);
        durationStr = ` (${diffMinutes}分)`;
        userSessions.delete(`${userId}_${taskKey}`);
      }

      const taskName = getTaskName(customId);
      message = `[${timeStr}] 👤 **${userName}** さんが **${taskName}** しました${durationStr}`;
    }

    await interaction.reply({ content: message });
  }
});

function getTaskName(id) {
  const map = {
    'meal_start': '食事休憩に入り',
    'tobacco_start': 'タバコ休憩に入り',
    'break_end': '休憩から戻り',
    'chara_start': 'キャラ作成を開始',
    'chara_end': 'キャラ作成を終了',
    'newat_start': '新規ATを開始',
    'newat_end': '新規ATを終了',
    'day8at_start': '8日以降ATを開始',
    'day8at_end': '8日以降ATを終了'
  };
  return map[id] || '操作';
}

client.login(process.env.DISCORD_TOKEN);
