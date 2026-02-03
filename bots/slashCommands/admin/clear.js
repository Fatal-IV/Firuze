const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  ChannelType, 
  EmbedBuilder,
  MessageFlags
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setNameLocalizations({ tr: 'temizle' })
    .setDescription('Deletes a large number of messages.')
    .setDescriptionLocalizations({ tr: 'Belirtilen sayıda mesajı toplu olarak temizler.' })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(option => 
      option.setName('amount')
        .setNameLocalizations({ tr: 'miktar' })
        .setDescription('Total messages to delete (Up to 500)')
        .setDescriptionLocalizations({ tr: 'Silinecek toplam mesaj sayısı (Maks: 500)' })
        .setMinValue(1)
        .setMaxValue(500)
        .setRequired(true))
    .addUserOption(option => 
      option.setName('target')
        .setNameLocalizations({ tr: 'hedef' })
        .setDescription('Delete only messages from this user.')
        .setDescriptionLocalizations({ tr: 'Sadece bu kullanıcının mesajlarını siler.' })),

  // --- SLASH YÜRÜTÜCÜ ---
  async execute(interaction, client, t) {
    const amount = interaction.options.getInteger('amount');
    const target = interaction.options.getUser('target');
    
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    return this.handleClear(interaction, interaction.channel, amount, target, t);
  },

  // --- PREFIX YÜRÜTÜCÜ ---
  async prefixExecute(message, args, client, t) {
    const amount = parseInt(args[0]);
    
    if (isNaN(amount) || amount < 1) {
      return message.reply(t('commands:clear.invalidAmount'));
    }

    const target = message.mentions.users.first();
    return this.handleClear(message, message.channel, amount, target, t);
  },

  // --- ANA MOTOR ---
  async handleClear(context, channel, amount, target, t) {
    let remaining = amount;
    let totalDeleted = 0;

    try {
      while (remaining > 0) {
        const batchSize = remaining > 100 ? 100 : remaining;
        const fetched = await channel.messages.fetch({ limit: batchSize });
        
        if (fetched.size === 0) break;

        const toDelete = target ? fetched.filter(m => m.author.id === target.id) : fetched;
        
        // true: 14 günden eski mesajları görmezden gel
        const deleted = await channel.bulkDelete(toDelete, true);
        
        totalDeleted += deleted.size;
        remaining -= batchSize;

        if (deleted.size === 0 && toDelete.size > 0) break;
        if (fetched.size < batchSize) break;
      }

      const successEmbed = new EmbedBuilder()
        .setColor('#43B581')
        .setDescription(`✅ **${totalDeleted}** ${t('commands:clear.successSuffix')}`);

      if (target) {
        successEmbed.setFooter({ 
          text: t('commands:clear.targetFooter', { tag: target.tag }) 
        });
      }

      if (context.editReply) {
        // Interaction yanıtı
        await context.editReply({ embeds: [successEmbed] });
      } else {
        // Kanal mesajı yanıtı (Unknown Message hatasını önlemek için .send)
        const reply = await channel.send({ embeds: [successEmbed] });
        setTimeout(() => reply.delete().catch(() => {}), 5000);
      }

    } catch (err) {
      const errMsg = t('errors:logic.commandError');
      if (context.editReply) {
        await context.editReply({ content: errMsg }).catch(() => {});
      } else {
        channel.send({ content: errMsg }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
      }
    }
  }
};