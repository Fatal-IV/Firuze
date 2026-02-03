const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const contributors = require('../../data/contributors.json');
const { drawCreditsCard } = require('../../utils/creditsCanvas');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('credits')
        .setNameLocalizations({ tr: 'yapimcilar' })
        .setDescription('Firuze geliştirme ekibini ve teşekkür mesajlarını gösterir.'),

    async execute(interaction, client) {
        await interaction.deferReply();
        const userId = interaction.user.id;
        const devData = contributors[userId];

        if (devData) {
            // Yapımcıya özel mesaj ve rengi kullanarak görseli oluştur
            const buffer = await drawCreditsCard(interaction.user, client.user, devData.message, devData.color);
            const attachment = new AttachmentBuilder(buffer, { name: 'firuze-thanks.png' });

            const embed = new EmbedBuilder()
                .setColor(devData.color)
                .setImage('attachment://firuze-thanks.png');

            return interaction.editReply({ embeds: [embed], files: [attachment] });
        } else {
            // Yapımcı listesi (Normal kullanıcı görünümü)
            const embed = new EmbedBuilder()
                .setTitle('💎 Firuze Geliştirme Ekibi')
                .setColor('#2b2d31')
                .setThumbnail(interaction.guild.iconURL())
                .setFooter({ text: 'Firuze projesinde emeği geçen herkese teşekkürler.', iconURL: client.user.displayAvatarURL() });

            let list = "";
            for (const [id, info] of Object.entries(contributors)) {
                list += `**◢ ${info.category}**\n<@${id}>\n\n`;
            }
            embed.setDescription(list);

            return interaction.editReply({ embeds: [embed] });
        }
    }
};