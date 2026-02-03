const { SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const { generateRankCard } = require('../../utils/rankCard');
const logger = require('../../utils/logger');
const db = require('../../database/sqlite');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setNameLocalizations({ tr: 'seviye' })
    .setDescription('Displays your or another user\'s rank card.')
    .setDescriptionLocalizations({ tr: 'Sizin veya başka bir kullanıcının seviye kartını gösterir.' })
    .addUserOption(option => 
      option.setName('user')
        .setNameLocalizations({ tr: 'kullanıcı' })
        .setDescription('The user whose rank you want to see.')
        .setDescriptionLocalizations({ tr: 'Seviye kartını görmek istediğiniz kullanıcıyı seçin.' })
    ),

  async execute(interaction, client, t, db) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    
    await interaction.deferReply();
    return this.handleRank(interaction, targetMember || targetUser, client, t, db);
  },

  async prefixExecute(message, args, client, t, db) {
    const targetUser = message.mentions.users.first() || client.users.cache.get(args[0]) || message.author;
    const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
    return this.handleRank(message, targetMember || targetUser, client, t, db);
  },

  async handleRank(context, member, client, t, db) {
    try {
      if (!db) {
        logger.error("[RANK HATA] Veritabanı nesnesi ulaşmadı. Lütfen Executor/Interaction dosyalarını kontrol edin.");
        return context.editReply ? context.editReply({ content: "❌ Database Error" }) : context.reply({ content: "❌ Database Error" });
      }

      // 50013 hatasını önlemek için yetki kontrolü
      const botMember = context.guild.members.me;
      if (!context.channel.permissionsFor(botMember).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles])) {
        return console.log("HATA: Kanala mesaj veya dosya gönderme yetkim yok!");
      }

      const stats = db.getUserStats(context.guild.id, member.id);
      if (!stats || (stats.text_xp === 0 && stats.voice_xp === 0)) {
        return context.editReply ? context.editReply({ content: t('commands:rank.noData') }) : context.reply({ content: t('commands:rank.noData') });
      }

      const rank = db.getUserRank(context.guild.id, member.id);
      const buffer = await generateRankCard(member, stats, rank);
      const attachment = new AttachmentBuilder(buffer, { name: `rank-${member.id}.png` });

      if (context.editReply) await context.editReply({ files: [attachment] });
      else await context.reply({ files: [attachment] });

    } catch (err) {
      if (err.code === 10062 || err.code === 50013) return; // Bilinen API hatalarında çökme
      logger.error(`[RANK HATA] ${err.stack}`);
    }
  }
};