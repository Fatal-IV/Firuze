const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ComponentType,
  MessageFlags
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setNameLocalizations({ tr: 'yardım' })
    .setDescription('Lists all commands or shows details for a specific command.')
    .setDescriptionLocalizations({ tr: 'Komutları listeler veya bir komut hakkında detaylı bilgi verir.' })
    .addStringOption(option => 
      option.setName('command')
        .setNameLocalizations({ tr: 'komut' })
        .setDescription('Get detailed info about a specific command')
        .setDescriptionLocalizations({ tr: 'Detaylı bilgi almak istediğiniz komut' })
        .setRequired(false)
        .setAutocomplete(true)
    ),

  async execute(interaction, client, t) {
    const { options } = interaction;
    const commandNameArg = options.getString('command');
    const commands = client.slashCommands;

    // Kullanıcının Discord diline göre hiyerarşi (TR değilse EN)
    const userLocale = interaction.locale === 'tr' ? 'tr' : 'en';

    // --- YARDIMCI FONKSİYON: Dinamik İsim & Açıklama Çekme (Hiyerarşi) ---
    const getLocalizedMetadata = (cmd) => {
      const name = cmd.data.name_localizations?.[userLocale] || 
                   (t(`commands:${cmd.data.name}.name`) !== `commands:${cmd.data.name}.name` ? t(`commands:${cmd.data.name}.name`) : cmd.data.name);
      
      const desc = cmd.data.description_localizations?.[userLocale] || 
                   (t(`commands:${cmd.data.name}.description`) !== `commands:${cmd.data.name}.description` ? t(`commands:${cmd.data.name}.description`) : cmd.data.description);
      
      return { name, desc };
    };

    // --- SENARYO 1: Belirli bir komut arandı ---
    if (commandNameArg) {
      const cmd = commands.get(commandNameArg.toLowerCase());
      if (!cmd) {
        return interaction.reply({ content: t('commands:help.ui.notFound'), flags: MessageFlags.Ephemeral });
      }

      const { name, desc } = getLocalizedMetadata(cmd);

      const detailEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`Help: /${name}`)
        .setDescription(desc)
        .addFields({ name: t('commands:help.ui.usage') || 'Usage', value: `\`/${cmd.data.name}\`` })
        .setFooter({ text: t('commands:help.ui.footer', { user: interaction.user.tag }) });

      return interaction.reply({ embeds: [detailEmbed] });
    }

    // --- SENARYO 2: ANA ARAYÜZ (Kategoriler Yan Yana) ---
    
    // Klasör isimlerini Türkçe etiketlerle eşleştiriyoruz
    const categoryMapping = {
      'admin': userLocale === 'tr' ? 'Yönetici' : 'Admin',
      'info': userLocale === 'tr' ? 'Bilgi' : 'Info',
      'public': userLocale === 'tr' ? 'Genel' : 'General'
    };

    const mainEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(t('commands:help.ui.title'))
      .setDescription(t('commands:help.ui.description'))
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: t('commands:help.ui.footer', { user: interaction.user.tag }) });

    // 1. Madde: Her kategoriden ilk 3 komutu al ve 2. Madde: Yan yana sırala
    Object.entries(categoryMapping).forEach(([folder, label]) => {
      const catCmds = commands
        .filter(cmd => cmd.folder === folder)
        .first(3) // İlk 3 komutu alıyoruz
        .map(cmd => `\`${getLocalizedMetadata(cmd).name}\``)
        .join(', ');

      if (catCmds.length > 0) {
        mainEmbed.addFields({ 
          name: `${client.config?.emojis?.categories?.[folder] || '📁'} ${label}`, 
          value: catCmds, 
          inline: true 
        });
      }
    });

    // 3. Madde: Açılır menü çevirisi direkt komut içerisinde
    const menuPlaceholder = userLocale === 'tr' ? 'Kategorilerden seçim yapın...' : 'Select a category from the menu...';

    const categories = [...new Set(commands.map(cmd => cmd.folder))].filter(cat => cat !== 'owner');

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help_category')
        .setPlaceholder(menuPlaceholder)
        .addOptions(categories.map(cat => ({
          label: categoryMapping[cat] || cat,
          value: cat,
          emoji: client.config?.emojis?.categories?.[cat] || '📁'
        })))
    );

    const initialMsg = await interaction.reply({ embeds: [mainEmbed], components: [row] });

    // --- COLLECTOR (Orijinal Tasarım: > **/** ve └) ---
    const collector = initialMsg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000
    });

    collector.on('collect', async i => {
      const clickerLocale = i.locale === 'tr' ? 'tr' : 'en';
      const clickerT = client.i18n.getFixedT(clickerLocale);

      if (i.user.id !== interaction.user.id) {
        return i.reply({ 
          content: clickerT('errors:auth:notYourInteraction', { user: interaction.user.username }), 
          flags: MessageFlags.Ephemeral 
        });
      }

      const selectedCat = i.values[0];
      const categoryCommands = commands.filter(cmd => cmd.folder === selectedCat);

      const list = categoryCommands.map(cmd => {
        const { name, desc } = getLocalizedMetadata(cmd);
        return `> **/${name}**\n> └ ${desc}`;
      }).join('\n\n');

      const catLabel = categoryMapping[selectedCat] || selectedCat;

      const categoryEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(catLabel)
        .setDescription(list || t('commands:help.ui.noCommands'))
        .setFooter({ text: t('commands:help.ui.footer', { user: interaction.user.tag }) });

      await i.update({ embeds: [categoryEmbed], components: [row] });
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        row.components[0].setDisabled(true)
      );
      interaction.editReply({ components: [disabledRow] }).catch(() => {});
    });
  }
};