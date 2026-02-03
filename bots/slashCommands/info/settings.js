const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  PermissionsBitField, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setNameLocalizations({ tr: 'ayarlar' })
    .setDescription('Shows current server XP settings.')
    .setDescriptionLocalizations({ tr: 'Sunucunun mevcut XP ve Seviye ayarlarını gösterir.' }),

  permissions: PermissionsBitField.Flags.ManageGuild,

  async execute(interaction, client, t, db) {
    const guildId = interaction.guild.id;

    // --- YARDIMCI FONKSİYONLAR ---
    
    // Ana Ayarlar Embed'i Oluşturucu
    const createMainEmbed = () => {
      const guildSettings = db.getGuild(guildId);
      const ignores = db.getIgnores(guildId);

      const formatList = (items) => {
        if (!items || items.length === 0) return `*${t('common.none')}*`;
        return items.length <= 5 ? items.join(', ') : items.slice(0, 5).join(', ') + ` ... (+${items.length - 5})`;
      };

      const ignoredChannels = formatList(ignores.filter(i => i.type === 'channel').map(i => `<#${i.target_id}>`));
      const ignoredRoles = formatList(ignores.filter(i => i.type === 'role').map(i => `<@&${i.target_id}>`));
      const logChannel = guildSettings.log_channel_id ? `<#${guildSettings.log_channel_id}>` : `_${t('system:common.notSet')}_`;
      const msgPreview = guildSettings.level_up_message || t('system:events.levelUp.message', { user: '{user}', level: '{level}' });

      return new EmbedBuilder()
        .setTitle(t('commands:settings.title', { guildName: interaction.guild.name }))
        .setColor('#2B2D31')
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .addFields(
          { name: `📌 ${t('commands:settings.logChannel')}`, value: `└ ${logChannel}`, inline: true },
          { name: `⏱️ ${t('commands:settings.cooldown')}`, value: `└ ${t('commands:settings.seconds', { sec: guildSettings.cooldown })}`, inline: true },
          { name: `🛡️ ${t('commands:settings.spamProtection')}`, value: `└ ${t('commands:settings.spamDesc', { window: guildSettings.spamWindow, count: guildSettings.spamCount })}`, inline: false },
          { name: `💬 Seviye Mesajı`, value: `\`\`\`${msgPreview}\`\`\``, inline: false },
          { name: `🚫 ${t('commands:settings.ignoredChannels')}`, value: ignoredChannels, inline: true },
          { name: `🚫 ${t('commands:settings.ignoredRoles')}`, value: ignoredRoles, inline: true }
        )
        .setFooter({ text: t('commands:settings.footer') });
    };

    // Rol Listesi Embed'i Oluşturucu
    const createRolesEmbed = () => {
      const roles = db.getAllLevelRoles(guildId);
      let description = roles.length === 0 
        ? t('commands:settings.noLevelRoles') 
        : roles.map(r => {
            const role = interaction.guild.roles.cache.get(r.role_id);
            const count = role ? role.members.size : 0;
            return t('commands:settings.levelRoleFormat', { 
              level: r.level, 
              role: role ? `<@&${r.role_id}>` : `[${t('system:common.deletedRole')}]`,
              count: count
            });
          }).join('\n');

      return new EmbedBuilder()
        .setTitle(`📊 ${t('commands:settings.levelRolesTitle')}`)
        .setDescription(description)
        .setColor('#5865F2')
        .setTimestamp();
    };

    // --- BUTONLAR ---
    const mainRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('view_roles').setLabel(t('commands:settings.viewRolesBtn')).setStyle(ButtonStyle.Primary).setEmoji('📜')
    );

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('back_to_main').setLabel(t('commands:settings.backBtn')).setStyle(ButtonStyle.Secondary).setEmoji('⬅️')
    );

    // --- ÇALIŞTIRMA ---
    const response = await interaction.reply({ embeds: [createMainEmbed()], components: [mainRow] });

    const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: '❌', ephemeral: true });

      if (i.customId === 'view_roles') {
        await i.update({ embeds: [createRolesEmbed()], components: [backRow] });
      } else if (i.customId === 'back_to_main') {
        await i.update({ embeds: [createMainEmbed()], components: [mainRow] });
      }
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};