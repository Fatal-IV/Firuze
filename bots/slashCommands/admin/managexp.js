const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('managexp') // Teknik isim (İngilizce olmak zorunda)
    .setNameLocalizations({
      tr: 'xpyonet', // Türk kullanıcıların göreceği isim
    })
    .setDescription('Manage a user\'s XP.')
    .setDescriptionLocalizations({
      tr: 'Bir kullanıcının XP miktarını yönetir.',
    })
    // İşlem Seçeneği
    .addStringOption(option =>
      option.setName('action')
        .setNameLocalizations({ tr: 'işlem' })
        .setDescription('Add or remove XP')
        .setDescriptionLocalizations({ tr: 'Yapılacak işlem: Ekle veya Çıkar' })
        .setRequired(true)
        .addChoices(
          { name: 'Add', value: 'add', name_localizations: { tr: 'Ekle' } },
          { name: 'Remove', value: 'remove', name_localizations: { tr: 'Çıkar' } }
        ))
    // Tür Seçeneği
    .addStringOption(option =>
      option.setName('type')
        .setNameLocalizations({ tr: 'tür' })
        .setDescription('Text or Voice XP')
        .setDescriptionLocalizations({ tr: 'XP türü: Metin veya Ses' })
        .setRequired(true)
        .addChoices(
          { name: 'Text XP', value: 'text', name_localizations: { tr: 'Metin XP' } },
          { name: 'Voice XP', value: 'voice', name_localizations: { tr: 'Ses XP' } }
        ))
    // Kullanıcı Seçeneği
    .addUserOption(option =>
      option.setName('user')
        .setNameLocalizations({ tr: 'kullanıcı' })
        .setDescription('Target user')
        .setDescriptionLocalizations({ tr: 'XP\'si yönetilecek kullanıcı' })
        .setRequired(true))
    // Miktar Seçeneği
    .addIntegerOption(option =>
      option.setName('amount')
        .setNameLocalizations({ tr: 'miktar' })
        .setDescription('Amount of XP')
        .setDescriptionLocalizations({ tr: 'Eklenecek veya çıkarılacak miktar' })
        .setMinValue(1)
        .setRequired(true)),
  permissions: PermissionFlagsBits.ManageGuild,

  async execute(interaction, client, t, db) {
    await interaction.deferReply({ ephemeral: true });

    const action = interaction.options.getString('action');
    const type = interaction.options.getString('type');
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const guildId = interaction.guild.id;

    if (targetUser.bot) return interaction.editReply(t('commands:rank.isBot'));

    // Çıkarma işlemiyse miktarı negatife çevir
    const finalAmount = action === 'add' ? amount : -amount;
    let result;

    try {
      if (type === 'text') {
        // Mevcut addXP fonksiyonu negatif değerleri de destekler
        result = db.addXP(guildId, targetUser.id, finalAmount);
      } else {
        db.addVoiceXP(guildId, targetUser.id, finalAmount);
        const stats = db.getUserStats(guildId, targetUser.id);
        result = { newLevel: stats.level };
      }

      await interaction.editReply({
        content: t('commands:managexp.success', {
          user: targetUser.username,
          amount: amount,
          type: t(`commands:managexp.types.${type}`),
          action: t(`commands:managexp.actions.${action}`),
          level: result.newLevel
        })
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply(t('errors:logic.commandError'));
    }
  }
};