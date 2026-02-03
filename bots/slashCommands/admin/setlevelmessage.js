const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder, 
  MessageFlags, 
  ComponentType 
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlevelmessage')
    .setNameLocalizations({ tr: 'seviyemesajı' })
    .setDescription('Sets a custom level-up message for the server.')
    .setDescriptionLocalizations({ tr: 'Sunucu için özel bir seviye atlama mesajı ayarlar.' }),
  
  isAdmin: true,

  async execute(interaction, client, t, db) {

    const guildId = interaction.guild.id;
    let guildSettings = db.getGuild(guildId);

    // --- MEVCUT DURUMU GÖSTEREN ARAYÜZ ---

    const currentMsg = guildSettings.level_up_message 
        ? `\`${guildSettings.level_up_message}\`` 
        : `_${t('commands:setlevelmessage.default')}_`;

    // Bilgi Paneli
    const infoEmbed = new EmbedBuilder()
      .setTitle(t('commands:setlevelmessage.title'))
      .setColor('#5865F2') // Bilgi mesajı mavisi
      .addFields(
        { 
          name: t('commands:setlevelmessage.current'), 
          value: currentMsg, 
          inline: false 
        },
        { 
          name: t('commands:setlevelmessage.variablesTitle'), 
          value: t('commands:setlevelmessage.variablesDesc'), 
          inline: false 
        }
      );

    // Ana Menü Butonları
    const setBtn = new ButtonBuilder()
      .setCustomId('lvlmsg_set')
      .setLabel(t('commands:setlevelmessage.setButton'))
      .setStyle(ButtonStyle.Primary)
      .setEmoji('✏️');

    const resetBtn = new ButtonBuilder()
      .setCustomId('lvlmsg_reset')
      .setLabel(t('commands:setlevelmessage.resetButton'))
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!guildSettings.level_up_message); // Mesaj yoksa pasif

    const cancelBtn = new ButtonBuilder()
      .setCustomId('lvlmsg_cancel')
      .setLabel(t('commands:setlevelmessage.cancelButton'))
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(setBtn, resetBtn, cancelBtn);

    const response = await interaction.reply({
      embeds: [infoEmbed],
      components: [row],
      flags: MessageFlags.Ephemeral, // Sadece yönetici görsün
      withResponse: true
    });

    const message = response.resource ? response.resource.message : response;

    // --- BUTON COLLECTOR (Ana Menü) ---
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000 
    });

    collector.on('collect', async (i) => {
      // 1. İPTAL BUTONU
      if (i.customId === 'lvlmsg_cancel') {
        await i.update({ 
          content: t('commands:setlevelmessage.cancelled'), 
          embeds: [], 
          components: [] 
        });
        collector.stop();
      }

      // 2. SIFIRLA BUTONU
      else if (i.customId === 'lvlmsg_reset') {
        guildSettings.level_up_message = null;
        db.updateGuild(guildSettings);

        await i.update({
          content: t('commands:setlevelmessage.reset'),
          embeds: [],
          components: []
        });
        collector.stop();
      }

      // 3. AYARLA BUTONU (Mesaj Yazma Modu)
      else if (i.customId === 'lvlmsg_set') {
        
        // Kullanıcıya ne yapması gerektiğini söyleyen panel
        const promptEmbed = new EmbedBuilder()
            .setColor('#F1C40F') 
            .setTitle('📝 Mesaj Düzenleme Modu') 
            .setDescription(`**${t('commands:setlevelmessage.prompt')}**`)
            .addFields({
                name: t('commands:setlevelmessage.variablesTitle'), 
                value: t('commands:setlevelmessage.variablesDesc')
            })
            .setFooter({ text: 'Zaman aşımı: 60 saniye' });

        await i.update({
          content: '', 
          embeds: [promptEmbed], 
          components: []
        });
        
        collector.stop(); // Ana menü collector'ını durdur, mesaj beklemeye geç

        // --- MESAJ COLLECTOR (Kullanıcının Yazısını Bekle) ---
        const msgFilter = (m) => m.author.id === interaction.user.id;
        const msgCollector = interaction.channel.createMessageCollector({
          filter: msgFilter,
          max: 1,
          time: 60000
        });

        msgCollector.on('collect', async (msg) => {
          const newMessage = msg.content;
          
          // Kullanıcının yazdığı mesajı temizle (Görüntü kirliliğini önle)
          try { await msg.delete(); } catch(e) {}

          // --- ONAY VE ÖNİZLEME AŞAMASI ---
          
          // Değişkenleri yapay verilerle değiştir (Önizleme için)
          const previewText = newMessage
            .replace(/{user}/g, interaction.user.toString())
            .replace(/{level}/g, '**5**') // Örnek Level 5
            .replace(/{guild}/g, interaction.guild.name);

          // --- GÜNCELLENEN TASARIM: GERÇEKÇİ ÖNİZLEME ---
          // messageCreate.js ve setup.js ile birebir aynı yapı
          const realPreviewEmbed = new EmbedBuilder()
            .setColor('#FFE082') 
            // Title/Author YOK
            .setDescription(`*Seviye Atladın*\n> ${previewText}`) // İtalik başlık ve Alıntı
            .setThumbnail(interaction.user.displayAvatarURL({ size: 256 })) 
            .setFooter({ 
                text: `${interaction.guild.name} • XP Sistemi`, 
                iconURL: interaction.guild.iconURL() 
            })
            .setTimestamp();

          // Onay Butonları
          const saveBtn = new ButtonBuilder()
            .setCustomId('confirm_save')
            .setLabel(t('commands:setlevelmessage.setButton'))
            .setStyle(ButtonStyle.Success)
            .setEmoji('💾');

          const cancelEditBtn = new ButtonBuilder()
            .setCustomId('confirm_cancel')
            .setLabel(t('commands:setlevelmessage.cancelButton'))
            .setStyle(ButtonStyle.Danger)
            .setEmoji('✖️');

          const confirmRow = new ActionRowBuilder().addComponents(saveBtn, cancelEditBtn);

          // Önizlemeyi Göster
          const confirmMsg = await interaction.followUp({
             content: `**${t('commands:setlevelmessage.preview')}**\n_(Aşağıdaki kart, üyeler seviye atladığında tam olarak böyle görünecek)_`,
             embeds: [realPreviewEmbed],
             components: [confirmRow],
             flags: MessageFlags.Ephemeral
          });

          // Onay Butonlarını Dinle
          const confirmCollector = confirmMsg.createMessageComponentCollector({
              componentType: ComponentType.Button,
              time: 60000
          });

          confirmCollector.on('collect', async (btnI) => {
              // KAYDETME İPTAL
              if (btnI.customId === 'confirm_cancel') {
                  await btnI.update({
                      content: t('commands:setlevelmessage.cancelled'),
                      embeds: [],
                      components: []
                  });
                  confirmCollector.stop();
              } 
              // KAYDETME ONAY
              else if (btnI.customId === 'confirm_save') {
                  // Veritabanına kaydet
                  const freshSettings = db.getGuild(guildId);
                  freshSettings.level_up_message = newMessage;
                  db.updateGuild(freshSettings);

                  await btnI.update({
                      content: `✅ **${t('commands:setlevelmessage.success')}**`,
                      embeds: [],
                      components: []
                  });
                  confirmCollector.stop();
              }
          });
        });

        // Zaman aşımı kontrolü (Mesaj yazılmazsa)
        msgCollector.on('end', (collected, reason) => {
          if (reason === 'time') {
            interaction.followUp({ 
              content: t('errors:logic.timeout'), 
              flags: MessageFlags.Ephemeral 
            });
          }
        });
      }
    });

    // Zaman aşımı kontrolü (İlk butonlara basılmazsa)
    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        interaction.editReply({ components: [] }).catch(() => {});
      }
    });
  },
};