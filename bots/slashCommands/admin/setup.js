const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ChannelSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setNameLocalizations({ tr: 'kurulum' })
    .setDescription('Opens the XP system control panel.')
    .setDescriptionLocalizations({ tr: 'XP sistemi kontrol panelini açar.' }),

  isAdmin: true,

  async execute(interaction, client, t, db) {
    const { guild } = interaction;
    let settings = db.getGuild(guild.id);

    // --- FONKSİYON: PANELİ GÖSTER ---
    const showDashboard = async (isUpdate = false, targetInteraction = interaction) => {
        settings = db.getGuild(guild.id);
        
        const isLogSet = !!settings.log_channel_id;
        const logChannel = isLogSet ? guild.channels.cache.get(settings.log_channel_id) : null;
        
        const on = '🟢';
        const off = '🔴';
        const logStatus = isLogSet 
            ? `${on} **${t('system:common.active')}** (${logChannel ? logChannel.toString() : '#silinmis-kanal'})` 
            : `${off} **${t('system:common.inactive')}**`;

        const cooldownVal = settings.cooldown || 60;
        
        const embed = new EmbedBuilder()
            .setColor(isLogSet ? '#2ECC71' : '#E74C3C')
            .setTitle(`⚙️ ${t('commands:setup.panelTitle')}`)
            .setDescription(t('commands:setup.panelDesc'))
            .addFields(
                { 
                    name: `📜 ${t('commands:settings.logChannel')} ${isLogSet ? '✅' : '⚠️'}`, 
                    value: `> ${logStatus}`, 
                    inline: false 
                },
                { 
                    name: `⏱️ ${t('commands:settings.cooldown')}`, 
                    value: `> ⚡ **${cooldownVal} ${t('system:common.secondsShort')}**`, 
                    inline: false 
                }
            )
            .setFooter({ text: isLogSet ? t('commands:setup.systemReady') : t('commands:setup.waitingAction') })
            .setThumbnail(guild.iconURL());

        const components = generateComponents(settings, t);

        let msg;
        if (isUpdate) {
            msg = await targetInteraction.update({ embeds: [embed], components: components, fetchReply: true });
        } else {
            msg = await targetInteraction.reply({ embeds: [embed], components: components, fetchReply: true });
        }
        return msg;
    };

    // --- YARDIMCI: MENÜLER VE BUTONLAR ---
    function generateComponents(settings, t) {
       const isLogSet = !!settings.log_channel_id;
       const cooldownVal = settings.cooldown || 60;

       const channelRow = new ActionRowBuilder().addComponents(
           new ChannelSelectMenuBuilder()
               .setCustomId('setup_select_log')
               .setPlaceholder(t('commands:setup.selectLogPlaceholder'))
               .setChannelTypes(ChannelType.GuildText)
       );

       const cooldownRow = new ActionRowBuilder().addComponents(
           new StringSelectMenuBuilder()
               .setCustomId('setup_select_cooldown')
               .setPlaceholder(`Mevcut: ${cooldownVal}sn`)
               .addOptions(
                   new StringSelectMenuOptionBuilder().setLabel('3s (Flash)').setValue('3').setEmoji('⚡'),
                   new StringSelectMenuOptionBuilder().setLabel('5s (Hızlı)').setValue('5').setEmoji('⏩'),
                   new StringSelectMenuOptionBuilder().setLabel('10s (Seri)').setValue('10').setEmoji('▶️'),
                   new StringSelectMenuOptionBuilder().setLabel('30s (Dengeli)').setValue('30').setEmoji('⚖️'),
                   new StringSelectMenuOptionBuilder().setLabel('60s (Normal)').setValue('60').setEmoji('👍'),
                   new StringSelectMenuOptionBuilder().setLabel('2m (Yavaş)').setValue('120').setEmoji('🐢')
               )
       );

       const buttonRow = new ActionRowBuilder().addComponents(
           new ButtonBuilder()
               .setCustomId('setup_btn_save')
               .setLabel(t('system:common.active'))
               .setStyle(ButtonStyle.Success)
               .setDisabled(!isLogSet),
           
           new ButtonBuilder()
               .setCustomId('setup_btn_reset')
               .setLabel(t('system:common.reset'))
               .setStyle(ButtonStyle.Danger)
       );

       return [channelRow, cooldownRow, buttonRow];
    }

    // --- 1. AŞAMA: MEVCUT AYAR KONTROLÜ ---
    if (settings.log_channel_id) {
        const currentLog = guild.channels.cache.get(settings.log_channel_id);
        const logName = currentLog ? currentLog.name : t('system:common.notSet');
        
        const warningEmbed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle(`⚠️ ${t('commands:setup.existingSetupTitle')}`)
            .setDescription(t('commands:setup.existingSetupDesc'))
            .addFields(
                { name: t('commands:setup.currentLog'), value: `\`#${logName}\``, inline: true },
                { name: t('commands:setup.currentCooldown'), value: `\`${settings.cooldown}sn\``, inline: true }
            )

        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('setup_warn_confirm')
                .setLabel(t('commands:setup.btnResetAndStart'))
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('setup_warn_cancel')
                .setLabel(t('system:common.cancel'))
                .setStyle(ButtonStyle.Secondary)
        );

        const warningMsg = await interaction.reply({
            embeds: [warningEmbed],
            components: [confirmRow],
            fetchReply: true
        });

        const warnCollector = warningMsg.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000
        });

        warnCollector.on('collect', async (i) => {
          if (i.customId === 'setup_warn_confirm') {
                warnCollector.stop('confirmed');
                initMainCollector(await showDashboard(true, i));
            }
            else if (i.customId === 'setup_warn_cancel') {
                await i.update({ content: t('commands:setup.cancelled'), embeds: [], components: [] });
                warnCollector.stop('cancelled');
            }
        });
        return; 
    }

    // --- 2. AŞAMA: İLK KURULUM ---
    initMainCollector(await showDashboard(false, interaction));


    // --- COLLECTOR YÖNETİMİ ---
    function initMainCollector(message) {
        const collector = message.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 300000 
        });

        collector.on('collect', async (i) => {
            let currentSettings = db.getGuild(guild.id);

            if (i.customId === 'setup_select_log') {
                currentSettings.log_channel_id = i.values[0];
                db.updateGuild(currentSettings);
                
                const newSettings = db.getGuild(guild.id);
                await i.update({ 
                    embeds: [createDashboardEmbed(newSettings, guild, t)], 
                    components: generateComponents(newSettings, t) 
                });
            }
            else if (i.customId === 'setup_select_cooldown') {
                currentSettings.cooldown = parseInt(i.values[0]);
                db.updateGuild(currentSettings);
                
                const newSettings = db.getGuild(guild.id);
                await i.update({ 
                    embeds: [createDashboardEmbed(newSettings, guild, t)], 
                    components: generateComponents(newSettings, t) 
                });
            }
            else if (i.customId === 'setup_btn_reset') {
                currentSettings.log_channel_id = null;
                currentSettings.cooldown = 60;
                db.updateGuild(currentSettings);
                
                const newSettings = db.getGuild(guild.id);
                await i.update({ 
                    embeds: [createDashboardEmbed(newSettings, guild, t)], 
                    components: generateComponents(newSettings, t) 
                });
            }
            else if (i.customId === 'setup_btn_save') {
                let testResultText = "";
                const logChannel = guild.channels.cache.get(currentSettings.log_channel_id);
                
                // TEST MESAJI
                if (logChannel) {
                    try {
                        let rawMsg = currentSettings.level_up_message || t('events.levelUp.message');
                        const descriptionText = rawMsg
                            .replace(/{user}/g, interaction.user.toString())
                            .replace(/{level}/g, '**2**') 
                            .replace(/{guild}/g, guild.name);

                        // --- YENİ EMBED TASARIMI ---
                        const testEmbed = new EmbedBuilder()
                            .setColor('#FFE082') 
                            .setDescription(`*Seviye Atladın*\n> ${descriptionText}`)
                            .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
                            .setFooter({ 
                                text: t('commands:setup.testMessageFooter'),
                                iconURL: guild.iconURL() 
                            })
                            .setTimestamp();

                        await logChannel.send({ 
                            content: interaction.user.toString(), 
                            embeds: [testEmbed] 
                        });
                        
                        testResultText = `\n\n✅ **${t('commands:setup.testSent')}** ${logChannel.toString()}`;

                    } catch (err) {
                        console.error(err);
                        testResultText = `\n\n⚠️ **${t('commands:setup.testFailed')}**\n(${err.message})`;
                    }
                }

                await i.update({
                    content: `✅ **${t('commands:setup.complete')}**`,
                    embeds: [new EmbedBuilder()
                        .setColor('#2ECC71')
                        .setTitle(t('commands:setup.systemActiveTitle'))
                        .setDescription(t('commands:setup.finalNote', { channel: `<#${currentSettings.log_channel_id}>` }) + testResultText)
                    ],
                    components: [] 
                });
                collector.stop('saved');
            }
        });
    }

    function createDashboardEmbed(settings, guild, t) {
        const isLogSet = !!settings.log_channel_id;
        const logChannel = isLogSet ? guild.channels.cache.get(settings.log_channel_id) : null;
        const on = '🟢';
        const off = '🔴';
        const logStatus = isLogSet 
            ? `${on} **${t('system:common.active')}** (${logChannel ? logChannel.toString() : '#silinmis-kanal'})` 
            : `${off} **${t('system:common.inactive')}**`;
        
        return new EmbedBuilder()
            .setColor(isLogSet ? '#2ECC71' : '#E74C3C')
            .setTitle(`⚙️ ${t('commands:setup.panelTitle')}`)
            .setDescription(t('commands:setup.panelDesc'))
            .addFields(
                { name: `📜 ${t('commands:settings.logChannel')} ${isLogSet ? '✅' : '⚠️'}`, value: `> ${logStatus}`, inline: false },
                { name: `⏱️ ${t('commands:settings.cooldown')}`, value: `> ⚡ **${settings.cooldown || 60} ${t('system:common.secondsShort')}**`, inline: false }
            )
            .setFooter({ text: isLogSet ? t('commands:setup.systemReady') : t('commands:setup.waitingAction') })
            .setThumbnail(guild.iconURL());
    }
  }
};