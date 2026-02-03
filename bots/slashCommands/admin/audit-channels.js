const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType, 
    ChannelType, 
    PermissionFlagsBits,
    MessageFlags
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('audit-channels')
        .setNameLocalizations({ tr: 'kanal-denetimi' })
        .setDescription('Analyzes visible categories and channels with a paginated report.')
        .setDescriptionLocalizations({ tr: 'Görülebilen kategori ve kanalları sayfalı bir raporla analiz eder.' }),
    	isAdmin: true,

    async execute(interaction, client, t) {
        await interaction.deferReply();
        
        const channels = interaction.guild.channels.cache;
        const categories = channels
            .filter(c => c.type === ChannelType.GuildCategory)
            .sort((a, b) => a.position - b.position);
        
        const pages = [];
        let currentFields = [];
        let catInPage = 0;

        categories.forEach(cat => {
            const children = channels
                .filter(c => c.parentId === cat.id)
                .sort((a, b) => a.position - b.position);
            
            const channelList = children.map(ch => `✅ ${ch.toString()}`).join('\n') || `*${t('commands:audit.noVisible') || 'Bu kategoride görünen kanal yok.'}*`;
            
            currentFields.push({
                name: `📂 ${cat.name.toUpperCase()}`,
                value: channelList,
                inline: false
            });

            catInPage++;
            if (catInPage % 5 === 0) {
                pages.push(currentFields);
                currentFields = [];
            }
        });
        
        if (currentFields.length > 0) pages.push(currentFields);
        if (pages.length === 0) return interaction.editReply(t('commands:audit.noCategory') || 'Denetlenecek kategori bulunamadı.');

        let currentPage = 0;

        const createEmbed = (pageIdx) => {
            return new EmbedBuilder()
                .setTitle('🔍 Firuze | Kanal Denetim Raporu')
                .setColor('#5865F2')
                .setDescription(t('commands:auditchannels.description') || '> Aşağıdaki listede yer almayan kanallar bota tamamen gizlidir. Kategoriler ve içerisindeki "✅" işaretli kanallar botun erişebildiği alanlardır.')
                .addFields(pages[pageIdx])
                .setFooter({ 
                    text: `Sayfa ${pageIdx + 1} / ${pages.length} • ${interaction.guild.name}`,
                    iconURL: interaction.guild.iconURL() 
                })
                .setTimestamp();
        };

        const getButtons = (pageIdx) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('⬅️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(pageIdx === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('➡️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(pageIdx === pages.length - 1)
            );
        };

        const msg = await interaction.editReply({ 
            embeds: [createEmbed(0)], 
            components: [getButtons(0)] 
        });

        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 300000 
        });

        collector.on('collect', async (i) => {
            const clickerT = client.i18n.getFixedT(i.locale);
            if (i.user.id !== interaction.user.id) {
                return i.reply({ 
                    content: clickerT('errors:auth.notYourInteraction', { user: interaction.user.username }), 
                    flags: MessageFlags.Ephemeral 
                });
            }

            if (i.customId === 'prev') currentPage--;
            else if (i.customId === 'next') currentPage++;

            await i.update({ 
                embeds: [createEmbed(currentPage)], 
                components: [getButtons(currentPage)] 
            });
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('d1').setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('d2').setLabel('➡️').setStyle(ButtonStyle.Secondary).setDisabled(true)
            );
            interaction.editReply({ components: [disabledRow] }).catch(() => {});
        });
    }
};