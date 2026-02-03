const { 
    SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, 
    UserSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, 
    ComponentType, MessageFlags, AttachmentBuilder, ActivityType 
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../../config');
const db = require('../../database/sqlite');
const Database = require('better-sqlite3'); 

const clearCache = (f) => {
    const d = path.join(__dirname, '../../', f);
    if (fs.existsSync(d)) {
        fs.readdirSync(d).forEach(file => {
            const p = path.join(d, file);
            if (fs.lstatSync(p).isDirectory()) clearCache(path.join(f, file));
            else delete require.cache[require.resolve(p)];
        });
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('owner')
        .setDescription('Bot Sahibi Yönetim Paneli')
        .addSubcommand(sub => sub.setName('panel').setDescription('Tüm araçları tek merkezden yönetin.')),

    async execute(interaction, client) {
        // --- YETKİ KONTROLÜ ---
        const authorizedIds = ['712202911958171748', '784577184420986900'];
        if (!authorizedIds.includes(interaction.user.id)) {
            return interaction.reply({ content: '⛔ **Sistem Erişimi Reddedildi.**', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const guildId = interaction.guild.id;

        // --- YARDIMCI GÖRÜNÜM FONKSİYONLARI ---
        const getPanelData = () => {
            const uptime = process.uptime();
            const d = Math.floor(uptime / (3600 * 24)), h = Math.floor(uptime % (3600 * 24) / 3600), m = Math.floor(uptime % 3600 / 60);
            
            const statsDb = new Database('./db.sqlite', { readonly: true });
            const userCount = statsDb.prepare('SELECT COUNT(*) as count FROM users').get().count;
            statsDb.close();

            const mainEmbed = new EmbedBuilder()
                .setTitle('🚀 Firuze | Master Control Unit')
                .setDescription('Sistem bileşenlerini yönetmek için aşağıdaki kategorilerden birini seçin.')
                .setColor('#5865F2')
                .addFields(
                    { name: '🖥️ Sunucu Durumu', value: `\`Uptime: ${d}g ${h}s ${m}d\`\n\`Gecikme: ${client.ws.ping}ms\``, inline: true },
                    { name: '💾 Veri İstatistikleri', value: `\`Kullanıcı: ${userCount}\`\n\`RAM: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB\``, inline: true }
                )
                .setThumbnail(client.user.displayAvatarURL());

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('panel_category')
                    .setPlaceholder('📂 Yönetim Kategorisi Seçin...')
                    .addOptions(
                        { label: 'Sistem & Durum', description: 'Komutlar, Eventler ve Bot Durumu', value: 'cat_sys', emoji: '🛠️' },
                        { label: 'Veritabanı & Dosya', description: 'Yedekleme ve Log Yönetimi', value: 'cat_file', emoji: '📂' },
                        { label: 'Kullanıcı & XP', description: 'Low-XP Listesi ve Toplu XP', value: 'cat_user', emoji: '👥' }
                    )
            );

            return { embeds: [mainEmbed], components: [row] };
        };

        const getUserPanel = () => {
            const lowList = db.getIgnores(guildId).filter(x => x.type === 'user_low_xp');
            const listText = lowList.map((x, idx) => `\`${idx + 1}.\` <@${x.target_id}>`).join('\n') || '*Liste şu an boş.*';
            
            const subEmbed = new EmbedBuilder()
                .setTitle('👥 Kullanıcı Yönetimi')
                .setDescription(`📉 **Düşük XP Alan Kullanıcılar:**\n${listText}`)
                .setColor('#2B2D31');

            const userSelectRow = new ActionRowBuilder().addComponents(
                new UserSelectMenuBuilder()
                    .setCustomId('user_toggle_lowxp')
                    .setPlaceholder('Ekle/Çıkar için kullanıcı seçin...')
            );

            const giftMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('panel_action').setPlaceholder('Hızlı İşlemler...')
                    .addOptions(
                        { label: 'Toplu Hediye XP (Herkes)', value: 'gift_xp', emoji: '🎁' },
                        { label: 'Seviyeye Göre Hediye XP', value: 'gift_xp_level', emoji: '⭐' },
                        { label: 'XP Boost Ayarla', value: 'set_boost', emoji: '🚀' },
                        { label: 'Ana Menüye Dön', value: 'back_main', emoji: '🏠' }
                    )
            );

            return { embeds: [subEmbed], components: [userSelectRow, giftMenu] };
        };

        const msg = await interaction.editReply(getPanelData());
        const collector = msg.createMessageComponentCollector({ time: 300000 });

        collector.on('collect', async (i) => {
            if (i.customId === 'panel_category') {
                const cat = i.values[0];
                if (cat === 'cat_user') return i.update(getUserPanel());

                const subEmbed = new EmbedBuilder().setColor('#2B2D31');
                const actionRow = new ActionRowBuilder();
                const menu = new StringSelectMenuBuilder().setCustomId('panel_action').setPlaceholder('⚡ Yapılacak İşlemi Seçin...');

                if (cat === 'cat_sys') {
                    subEmbed.setTitle('🛠️ Sistem Araçları').setDescription('Botun çekirdek fonksiyonlarını buradan tetikleyebilirsiniz.');
                    menu.addOptions(
                        { label: 'Komutları Yenile', value: 'ref_cmd', emoji: '📜' },
                        { label: 'Eventleri Yenile', value: 'ref_evt', emoji: '🔔' },
                        { label: 'Bot Durumunu Güncelle', value: 'set_status', emoji: '🎭' },
                        { label: 'Botu Yeniden Başlat', value: 'bot_res', emoji: '🔄' },
                        { label: 'Ana Menüye Dön', value: 'back_main', emoji: '🏠' }
                    );
                } else if (cat === 'cat_file') {
                    subEmbed.setTitle('📂 Veritabanı & Dosya').setDescription('Sistem verilerini yedekleyin veya temizleyin.');
                    menu.addOptions(
                        { label: 'DB Yedeği Al (Sadece DM)', value: 'db_bak', emoji: '📦' },
                        { label: 'Sistem Loglarını Temizle', value: 'log_flu', emoji: '🧹' },
                        { label: 'Ana Menüye Dön', value: 'back_main', emoji: '🏠' }
                    );
                }

                await i.update({ embeds: [subEmbed], components: [actionRow.addComponents(menu)] });
            }

            if (i.customId === 'user_toggle_lowxp') {
                const targetId = i.values[0];
                const exists = db.getIgnores(guildId).find(x => x.target_id === targetId && x.type === 'user_low_xp');
                if (exists) db.removeIgnore(guildId, targetId); else db.addIgnore(guildId, targetId, 'user_low_xp');
                return i.update(getUserPanel());
            }

            if (i.customId === 'panel_action') {
                const action = i.values[0];
                if (action === 'back_main') return i.update(getPanelData());

                if (action === 'set_status') {
                    const modal = new ModalBuilder().setCustomId('modal_status').setTitle('Durum Mesajı Ayarla');
                    modal.addComponents(new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('status_text').setLabel('Yeni Durum').setStyle(TextInputStyle.Short).setRequired(true)
                    ));
                    return i.showModal(modal);
                }

                if (action === 'gift_xp') {
                    const modal = new ModalBuilder().setCustomId('m_gift').setTitle('Toplu XP Gönderimi (Herkes)');
                    modal.addComponents(new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('m_amt').setLabel('Miktar').setStyle(TextInputStyle.Short).setPlaceholder('Örn: 500').setRequired(true)
                    ));
                    return i.showModal(modal);
                }

                if (action === 'gift_xp_level') {
                    const modal = new ModalBuilder().setCustomId('m_gift_level').setTitle('Seviyeye Özel XP Dağıtımı');
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_level').setLabel('Hedef Seviye').setStyle(TextInputStyle.Short).setPlaceholder('Örn: 5').setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('xp_amount').setLabel('Eklenecek XP Miktarı').setStyle(TextInputStyle.Short).setPlaceholder('Örn: 1000').setRequired(true))
                    );
                    return i.showModal(modal);
                }

                // --- XP BOOST MODAL TETİKLEYİCİ ---
                if (action === 'set_boost') {
                    const modal = new ModalBuilder().setCustomId('modal_boost').setTitle('XP Boost Ayarla');
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_mult').setLabel('Çarpan (Örn: 2)').setStyle(TextInputStyle.Short).setPlaceholder('2').setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b_time').setLabel('Süre (Dakika)').setStyle(TextInputStyle.Short).setPlaceholder('60').setRequired(true))
                    );
                    return i.showModal(modal);
                }

                await i.deferUpdate();
                if (action === 'ref_cmd') {
                    client.slashCommands.clear(); clearCache('slashCommands');
                    require('../../handlers/commandHandler')(client);
                    return i.followUp({ content: '✅ Komut önbelleği tazelendi.', flags: MessageFlags.Ephemeral });
                }
                if (action === 'ref_evt') {
                    client.removeAllListeners(); clearCache('events');
                    require('../../handlers/eventHandler')(client);
                    return i.followUp({ content: '✅ Event dinleyicileri yenilendi.', flags: MessageFlags.Ephemeral });
                }
                if (action === 'db_bak') {
                    try {
                        const dbBuffer = fs.readFileSync('./db.sqlite');
                        const attachment = new AttachmentBuilder(dbBuffer, { name: `firuze-backup-${Date.now()}.sqlite` });
                        await interaction.user.send({ content: `📦 **Firuze Güvenlik Yedeği**`, files: [attachment] });
                        return i.followUp({ content: '✅ Yedek DM kutunuza gönderildi.', flags: MessageFlags.Ephemeral });
                    } catch (err) {
                        return i.followUp({ content: '❌ Hata oluştu.', flags: MessageFlags.Ephemeral });
                    }
                }
                if (action === 'log_flu') {
                    const p = path.join(__dirname, '../../logs/combined.log');
                    if (fs.existsSync(p)) fs.writeFileSync(p, '');
                    return i.followUp({ content: '🧹 Log dosyası boşaltıldı.', flags: MessageFlags.Ephemeral });
                }
                if (action === 'bot_res') process.exit(0);
            }
        });

        const modalListener = async (m) => {
            if (!m.isModalSubmit()) return;

            if (m.customId === 'modal_status') {
                client.off('interactionCreate', modalListener);
                await m.deferReply({ flags: MessageFlags.Ephemeral });
                const txt = m.fields.getTextInputValue('status_text');
                client.user.setActivity(txt, { type: ActivityType.Custom });
                return m.editReply(`🎭 Bot durumu güncellendi: **${txt}**`);
            }

            if (m.customId === 'm_gift') {
                client.off('interactionCreate', modalListener);
                await m.deferReply({ flags: MessageFlags.Ephemeral });
                const amt = parseInt(m.fields.getTextInputValue('m_amt'));
                if (isNaN(amt) || amt <= 0) return m.editReply('❌ Geçersiz miktar.');
                const sDb = new Database('./db.sqlite');
                const users = sDb.prepare('SELECT user_id FROM users WHERE guild_id = ? AND level > 0').all(m.guild.id);
                sDb.close();
                users.forEach(u => db.addXP(m.guild.id, u.user_id, amt));
                return m.editReply(`🎁 **${users.length}** kullanıcıya **${amt} XP** verildi.`);
            }

            if (m.customId === 'm_gift_level') {
                client.off('interactionCreate', modalListener);
                await m.deferReply({ flags: MessageFlags.Ephemeral });
                const targetLevel = parseInt(m.fields.getTextInputValue('target_level'));
                const amt = parseInt(m.fields.getTextInputValue('xp_amount'));
                if (isNaN(targetLevel) || isNaN(amt) || amt <= 0) return m.editReply('❌ Geçersiz veri.');
                const users = db.getUsersByLevel(m.guild.id, targetLevel);
                if (!users || users.length === 0) return m.editReply(`⚠️ Kimse bulunamadı.`);
                db.addBulkXP(m.guild.id, users, amt);
                return m.editReply(`🎁 **${targetLevel}. seviyedeki** **${users.length}** kişiye **${amt} XP** eklendi.`);
            }

            // --- XP BOOST MODAL YANITI ---
            if (m.customId === 'modal_boost') {
                client.off('interactionCreate', modalListener);
                await m.deferReply({ flags: MessageFlags.Ephemeral });
                const mult = parseFloat(m.fields.getTextInputValue('b_mult'));
                const time = parseInt(m.fields.getTextInputValue('b_time'));
                
                if (isNaN(mult) || isNaN(time) || mult <= 0 || time <= 0) {
                    return m.editReply('❌ Geçersiz çarpan veya süre girdiniz.');
                }

                db.setBoost(m.guild.id, mult, time);
                const expiresAt = Math.floor((Date.now() + (time * 60 * 1000)) / 1000);
                return m.editReply(`🚀 **XP Boost Aktif Edildi!**\nÇarpan: **x${mult}**\nBitiş: <t:${expiresAt}:R>`);
            }
        };
        client.on('interactionCreate', modalListener);
    }
};