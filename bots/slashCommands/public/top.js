const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  AttachmentBuilder
} = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { getLevelFromXP } = require('../../utils/levelSystem');
const path = require('path');

// ===== YARDIMCI HELPER'LAR =====
function roundedRect(ctx, x, y, w, h, r, color) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (color) ctx.fillStyle = color;
  ctx.fill();
}

function drawCircularImage(ctx, img, cx, cy, r, border = 0, color = '#fff') {
  ctx.save();
  if (border > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + border, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
}

async function loadAvatarSafe(url) {
  try {
    return await loadImage(url);
  } catch {
    return null;
  }
}

function truncateText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength - 1) + '…' : text;
}

// Arka planı belleğe al (Performans için)
let cachedTopBg;
const getTopBg = async () => cachedTopBg || (cachedTopBg = await loadImage(path.join(__dirname, '../../assets/top_bg.png')));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top')
    .setNameLocalizations({ tr: 'sıralama', 'en-US': 'top' })
    .setDescription('Displays the server leaderboard with a visually rich interface.')
    .setDescriptionLocalizations({
      tr: 'Sunucu liderlik tablosunu görsel açıdan zengin bir arayüzle gösterir.',
      'en-US': 'Displays the server leaderboard with a visually rich interface.'
    }),

  async execute(interaction, client) {
    const { guild, locale, user } = interaction;
    const t = client.i18n.getFixedT(locale);

    await interaction.deferReply();

    let currentPeriod = 'all';

    const formatter = new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 1
    });

    const formatXP = (num) => formatter.format(num).replace(/\s/g, '') + " XP";

    const generatePodiumImage = async (top3Users) => {
      const W = 900, H = 380;
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext('2d');

      // 1. Önbellekli Arka Planı Çiz
      const bg = await getTopBg();
      ctx.drawImage(bg, 0, 0);

      // Başlık
      ctx.fillStyle = '#FFB86B';
      ctx.font = 'bold 14px "Segoe UI"';
      ctx.fillText((t('commands:top.title') || 'LEADERBOARD').toUpperCase(), 70, 70);

      // 2. PARALEL AVATAR YÜKLEME
      const avatarPromises = top3Users.map(async (entry) => {
        const member = guild.members.cache.get(entry.user_id);
        const avatarURL = member
          ? member.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true })
          : (client.users.cache.get(entry.user_id)?.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }) || 'https://cdn.discordapp.com/embed/avatars/0.png');
        return loadAvatarSafe(avatarURL);
      });
      const avatars = await Promise.all(avatarPromises);

      const slots = [
        { x: 450, y: 165, r: 62, label: 'RANK', value: '#1', ring1: '#FF8A3C', ring2: '#E47A24' },
        { x: 250, y: 205, r: 54, label: 'RANK', value: '#2', ring1: '#D47B2F', ring2: '#B35A1E' },
        { x: 650, y: 205, r: 54, label: 'RANK', value: '#3', ring1: '#D47B2F', ring2: '#B35A1E' }
      ];

      for (let i = 0; i < 3; i++) {
        const entry = top3Users[i];
        if (!entry) continue;

        const slot = slots[i];
        const avatar = avatars[i];
        const member = guild.members.cache.get(entry.user_id);
        const username = member ? member.displayName : (client.users.cache.get(entry.user_id)?.username || 'Unknown');

        // Halka çizimi
        ctx.beginPath();
        ctx.arc(slot.x, slot.y, slot.r + 14, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 10;
        ctx.stroke();

        const ringGrad = ctx.createLinearGradient(0, 0, W, H);
        ringGrad.addColorStop(0, slot.ring1);
        ringGrad.addColorStop(1, slot.ring2);

        ctx.beginPath();
        ctx.arc(slot.x, slot.y, slot.r + 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2);
        ctx.strokeStyle = ringGrad;
        ctx.lineWidth = 10;
        ctx.stroke();

        if (avatar) {
          drawCircularImage(ctx, avatar, slot.x, slot.y, slot.r, 4, '#fff');
        }

        // Chip: Rank
        const chipY = slot.y - slot.r - 48;
        const chipW = 110, chipH = 34;
        const chipX = slot.x - chipW / 2;
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        roundedRect(ctx, chipX, chipY, chipW, chipH, 12);
        ctx.fillStyle = '#FFB86B'; ctx.font = 'bold 14px "Segoe UI"'; ctx.fillText(slot.label, chipX + 14, chipY + 22);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 20px "Segoe UI"'; ctx.textAlign = 'right'; ctx.fillText(slot.value, chipX + chipW - 14, chipY + 22); ctx.textAlign = 'left';

        // İsim + XP + Defansif Level Kontrolü
        const xpVal = entry.gained_xp !== undefined ? entry.gained_xp : entry.total_xp;
        const currentLevel = entry.level || getLevelFromXP(xpVal);

        ctx.fillStyle = '#FFFFFF'; ctx.font = '600 26px "Segoe UI"'; ctx.textAlign = 'center';
        ctx.fillText(truncateText(username, 16), slot.x, slot.y + slot.r + 46);
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '18px "Segoe UI"';
        ctx.fillText(`Lv. ${currentLevel}  •  ${formatXP(xpVal)}`, slot.x, slot.y + slot.r + 74);
        ctx.textAlign = 'left';
      }

      return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'leaderboard.png' });
    };

    const generateLeaderboardMessage = async (period) => {
      const fullLeaderboard = client.db.getLeaderboard(guild.id, period, 100);
      const top10 = fullLeaderboard.slice(0, 10);
      const top3 = top10.slice(0, 3);
      const rest = top10.slice(3, 10);

      const userIds = top10.map(entry => entry.user_id);
      if (!userIds.includes(user.id)) userIds.push(user.id);
      await guild.members.fetch({ user: userIds }).catch(() => {});

      let periodTitle;
      switch (period) {
        case 'day': periodTitle = t('commands:top.daily'); break;
        case 'week': periodTitle = t('commands:top.weekly'); break;
        case 'month': periodTitle = t('commands:top.monthly'); break;
        default: periodTitle = t('commands:top.alltime');
      }

      const attachment = await generatePodiumImage(top3);

      const embed = new EmbedBuilder()
        .setColor('#2B2D31')
        .setAuthor({ name: `${guild.name} • ${periodTitle}`, iconURL: guild.iconURL() })
        .setImage('attachment://leaderboard.png')
        .setTimestamp();

      let description = "";
      if (top10.length === 0) {
        description = `>>> 🚫 **${t('commands:top.noData')}**\n*${t('commands:rank.noData')}*`;
      } else if (rest.length > 0) {
        description += `### 📜 ${t('commands:top.title')} (4 - 10)\n`;
        rest.forEach((entry, index) => {
          const globalIndex = index + 4;
          const member = guild.members.cache.get(entry.user_id);
          const name = member ? member.displayName : (client.users.cache.get(entry.user_id)?.username || 'Unknown');
          const safeName = truncateText(name.replace(/[*_`~]/g, ''), 20);
          const xpVal = entry.gained_xp !== undefined ? entry.gained_xp : entry.total_xp;
          const currentLevel = entry.level || getLevelFromXP(xpVal); // Defansif Kontrol

          description += `**${globalIndex}.** ${safeName}\n╰ \`Lv.${currentLevel}\` • \`${formatXP(xpVal)}\`\n`;
        });
      } else {
        description = `*${t('commands:top.textInfo')}*`;
      }

      embed.setDescription(description);

      const userRankIndex = fullLeaderboard.findIndex(u => u.user_id === user.id);
      const userRank = userRankIndex !== -1 ? `#${userRankIndex + 1}` : '100+';
      const userEntry = fullLeaderboard[userRankIndex];
      const myXP = userEntry ? (userEntry.gained_xp !== undefined ? userEntry.gained_xp : userEntry.total_xp) : 0;
      const myLevel = userEntry ? (userEntry.level || getLevelFromXP(myXP)) : 0;

      embed.setFooter({
        text: `${t('commands:top.yourStatsTitle')}: ${userRank} • Lv.${myLevel} • ${formatXP(myXP)}`,
        iconURL: user.displayAvatarURL()
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('top_all').setLabel(t('commands:top.alltime')).setEmoji('🏆').setStyle(period === 'all' ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(period === 'all'),
        new ButtonBuilder().setCustomId('top_month').setLabel(t('commands:top.monthly')).setEmoji('📅').setStyle(period === 'month' ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(period === 'month'),
        new ButtonBuilder().setCustomId('top_week').setLabel(t('commands:top.weekly')).setEmoji('🗓️').setStyle(period === 'week' ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(period === 'week'),
        new ButtonBuilder().setCustomId('top_day').setLabel(t('commands:top.daily')).setEmoji('⏰').setStyle(period === 'day' ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(period === 'day')
      );

      return { embeds: [embed], components: [row], files: [attachment] };
    };

    const data = await generateLeaderboardMessage(currentPeriod);
    const msg = await interaction.editReply(data);

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== user.id) return i.reply({ content: t('errors:auth.notYourInteraction'), ephemeral: true });
      if (i.customId === 'top_all') currentPeriod = 'all';
      if (i.customId === 'top_month') currentPeriod = 'month';
      if (i.customId === 'top_week') currentPeriod = 'week';
      if (i.customId === 'top_day') currentPeriod = 'day';

      await i.deferUpdate();
      const newData = await generateLeaderboardMessage(currentPeriod);
      await interaction.editReply(newData);
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        msg.components[0].components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
      );
      interaction.editReply({ components: [disabledRow] }).catch(() => {});
    });
  },
};