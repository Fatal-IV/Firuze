const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlevel')
    .setNameLocalizations({ tr: 'seviye-ayarla' })
    .setDescription('Manually sets a user\'s level.')
    .setDescriptionLocalizations({ tr: 'Bir kullanıcının seviyesini manuel olarak ayarlar.' })
    .addUserOption(option =>
      option.setName('user')
        .setNameLocalizations({ tr: 'kullanıcı' })
        .setDescription('The user whose level you want to set.')
        .setDescriptionLocalizations({ tr: 'Seviyesini ayarlamak istediğiniz kullanıcı.' })
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('level')
        .setNameLocalizations({ tr: 'seviye' })
        .setDescription('The new level you want to set.')
        .setDescriptionLocalizations({ tr: 'Ayarlamak istediğiniz yeni seviye.' })
        .setMinValue(0) 
        .setRequired(true)
    ),  isAdmin: true,

  async execute(interaction, client, t, db) {
    // Yanıtın sadece yöneticiye görünmesi için ephemeral kullanıyoruz
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const targetUser = interaction.options.getUser('user');
    const newLevel = interaction.options.getInteger('level');
    const guildId = interaction.guild.id;

    // 1. Bot Kontrolü
    if (targetUser.bot) {
      return interaction.editReply({ 
        content: t('commands:setlevel.isBot') 
      });
    }

    try {
      // 2. Veritabanı İşlemi (Seviye ve gerekli XP'yi otomatik ayarlar)
      const result = db.setLevel(guildId, targetUser.id, newLevel);
      
      // 3. Başarı Mesajı
      await interaction.editReply({
        content: t('commands:setlevel.success', { 
          user: targetUser.username, 
          oldLevel: result.oldLevel, 
          newLevel: newLevel 
        })
      });

      // 4. Log Kanalına Bilgi Gönder (Opsiyonel)
      const guildSettings = db.getGuild(guildId);
      const logChannel = interaction.guild.channels.cache.get(guildSettings.log_channel_id);
      if (logChannel) {
          logChannel.send({
              content: `🛠️ **Admin İşlemi:** ${interaction.user.tag}, ${targetUser.tag} kullanıcısının seviyesini \`${result.oldLevel}\` -> \`${newLevel}\` olarak güncelledi.`
          });
      }

    } catch (error) {
      console.error("[SETLEVEL HATA]:", error);
      await interaction.editReply({ content: t('system:common.error') });
    }
  },
};