const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetxp')
    .setNameLocalizations({ tr: 'xp-sıfırla' })
    .setDescription('Resets all XP and levels for this server.')
    .setDescriptionLocalizations({ tr: 'Bu sunucudaki tüm XP ve seviyeleri sıfırlar.' })
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  isAdmin: true,

  async execute(interaction, client, t, db) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = interaction.guild.id;

    try {
      // Veritabanındaki tüm kullanıcı verilerini (XP, Seviye, Sayaçlar) sıfırlar
      db.resetGuildXP(guildId);

      await interaction.editReply({
        content: t('commands:resetxp.success')
      });
    } catch (error) {
      console.error("[RESETXP HATA]:", error);
      await interaction.editReply({ content: t('system:common.error') });
    }
  },
};