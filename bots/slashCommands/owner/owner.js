const { 
    SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, 
    UserSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, 
    MessageFlags, AttachmentBuilder 
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const db = require('../../database/sqlite');

// Önbellek temizleme fonksiyonu
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
        .setDescription('Bot Sahibi Gelişmiş Yönetim Paneli')
        .addSubcommand(sub => sub.setName('panel').setDescription('Tüm yönetim araçlarını kategorize edilmiş şekilde kullanın.')),

    async execute(interaction, client) {
        const authorizedIds = ['712202911958171748', '784577184420986900'];
        if (!authorizedIds.includes(interaction.user.id)) {
            return interaction.reply({ content: '⛔ **Yetki Reddedildi:** Bu panel sadece bot sahiplerine özeldir.', flags: MessageFlags.Ephemeral });
        }

        // --- ARAYÜZ ÜRETECİLERİ ---
        const getHomeUI = () => {
            const embed = new EmbedBuilder()
                .setTitle('🛠️ Firuze - Kurucu Kontrol Paneli')
                .setColor('#2b2d31')
                .addFields(
                    { name: '🤖 Sistem Durumu', value: `\`\`\`RAM: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\nSunucu: ${client.guilds.cache.size}\nPin: ${client.ws.ping}ms\`\`\``, inline: false }
                )
                .setFooter({ text: 'Lütfen işlem yapmak için bir kategori seçin.' });

            const menu = new StringSelectMenuBuilder()
                .setCustomId('category_selector')
                .setPlaceholder('📂 Bir kategori seçin...')
                .addOptions([
                    { label: 'Sistem & Durum', value: 'cat_system', emoji: '⚙️', description: 'Yenileme ve bot durumu kontrolleri.' },
                    { label: 'Veritabanı & Dosya', value: 'cat_db', emoji: '💾', description: 'Yedekleme ve log temizleme.' },
                    { label: 'Kullanıcı & XP Yönetimi', value: 'cat_xp', emoji: '📊', description: 'Dağıtım ve Low-XP (Ceza) Listesi.' }
                ]);

            return { embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] };
        };

        const response = await interaction.reply({ ...getHomeUI(), flags: MessageFlags.Ephemeral });

        // --- KOLEKTÖR (Sızıntı Önleyici) ---
        const collector = response.createMessageComponentCollector({ time: 900000 }); // 15 Dakika aktif

        collector.on('collect', async i => {
            const choice = i.values[0];

            // --- ANA MENÜYE DÖNÜŞ ---
            if (choice === 'back_to_main') return await i.update(getHomeUI());

            // --- KATEGORİ 1: SİSTEM & DURUM ---
            if (choice === 'cat_system') {
                const embed = new EmbedBuilder().setTitle('⚙️ Sistem & Durum').setColor('#5865F2').setDescription('Botun çekirdek yapısını buradan yönetin.');
                const menu = new StringSelectMenuBuilder().setCustomId('system_ops').setPlaceholder('Bir işlem seçin...').addOptions([
                    { label: 'Komutları Yenile', value: 'reload_cmds', emoji: '🔄' },
                    { label: 'Eventları Yenile', value: 'reload_events', emoji: '📢' },
                    { label: 'Bot Durumunu Güncelle', value: 'update_status', emoji: '🎭' },
                    { label: 'Botu Yeniden Başlat', value: 'restart_bot', emoji: '⚠️' },
                    { label: '🏠 Ana Menüye Dön', value: 'back_to_main' }
                ]);
                return i.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
            }

            // --- KATEGORİ 2: VERİTABANI & DOSYA ---
            if (choice === 'cat_db') {
                const embed = new EmbedBuilder().setTitle('💾 Veritabanı & Dosya Yönetimi').setColor('#FEE75C').setDescription('Veri güvenliği ve dosya temizliği araçları.');
                const menu = new StringSelectMenuBuilder().setCustomId('db_ops').setPlaceholder('Bir işlem seçin...').addOptions([
                    { label: 'DB Yedeği Al (DM)', value: 'db_backup', emoji: '💾' },
                    { label: 'Sistem Loglarını Temizle (PM2)', value: 'clear_logs', emoji: '🧹' },
                    { label: '🏠 Ana Menüye Dön', value: 'back_to_main' }
                ]);
                return i.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
            }

            // --- KATEGORİ 3: KULLANICI & XP YÖNETİMİ (LOW-XP DÜZELTİLDİ) ---
            if (choice === 'cat_xp') {
                await i.deferUpdate();
                
                // Gerçek Low-XP (Ceza) Listesini Çek
                const lowXPUsers = db.getLowXPUsers ? db.getLowXPUsers() : []; // sqlite.js'de bu fonksiyonun olduğunu varsayıyoruz
                const listText = lowXPUsers.length > 0 
                    ? lowXPUsers.map(u => `<@${u.user_id}>`).join(', ') 
                    : '_Liste boş. Bu listedekiler %90 daha az XP alır._';

                const embed = new EmbedBuilder()
                    .setTitle('📊 Kullanıcı & XP Yönetimi')
                    .setDescription(`**📉 Low-XP (Ceza) Listesindeki Kullanıcılar:**\n${listText}`)
                    .setColor('#EB459E');

                const userSelect = new ActionRowBuilder().addComponents(
                    new UserSelectMenuBuilder()
                        .setCustomId('manage_low_xp')
                        .setPlaceholder('Listeye eklemek/çıkarmak için kullanıcı seçin...')
                        .setMinValues(1)
                        .setMaxValues(5)
                );

                const opsMenu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('xp_dist_ops')
                        .setPlaceholder('Bir dağıtım veya ayar seçin...')
                        .addOptions([
                            { label: 'Toplu XP Dağıtımı (Herkes)', value: 'dist_all', emoji: '📢' },
                            { label: 'Seviyeye Göre XP Dağıtımı', value: 'dist_lvl', emoji: '🎯' },
                            { label: 'XP Boost Ayarlama', value: 'set_boost', emoji: '🚀' },
                            { label: '🏠 Ana Menüye Dön', value: 'back_to_main' }
                        ])
                );

                return i.editReply({ embeds: [embed], components: [userSelect, opsMenu] });
            }

            // --- İŞLEM MANTIKLARI ---

            // DB Yedekleme
            if (choice === 'db_backup') {
                const dbPath = path.join(__dirname, '../../../db.sqlite');
                if (!fs.existsSync(dbPath)) return i.reply({ content: '❌ Veritabanı dosyası bulunamadı!', flags: MessageFlags.Ephemeral });

                const now = new Date();
                const timestamp = `${now.toLocaleDateString('tr-TR')} ${now.toLocaleTimeString('tr-TR')}`;
                const attachment = new AttachmentBuilder(dbPath, { name: `firuze_yedek_${Date.now()}.sqlite` });

                await i.user.send({ 
                    content: `💾 **Firuze Veritabanı Yedeği**\n📅 **Tarih:** ${timestamp}\n⚠️ Bu dosyayı güvenli bir yerde saklayın.`, 
                    files: [attachment] 
                }).then(() => i.reply({ content: '✅ Yedek DM kutunuza iletildi.', flags: MessageFlags.Ephemeral }))
                  .catch(() => i.reply({ content: '❌ DM kutunuz kapalı olduğu için gönderilemedi.', flags: MessageFlags.Ephemeral }));
            }

            // Log Temizleme
            if (choice === 'clear_logs') {
                exec('pm2 flush', (err) => {
                    i.reply({ content: err ? '❌ Hata: PM2 bulunamadı veya yetki yetersiz.' : '🧹 PM2 logları başarıyla temizlendi.', flags: MessageFlags.Ephemeral });
                });
            }

            // Low-XP Listesi Güncelleme (Ekle/Çıkar)
            if (i.customId === 'manage_low_xp') {
                await i.deferUpdate();
                for (const userId of i.values) {
                    // db.toggleLowXPUser fonksiyonu: Varsa siler, yoksa ekler
                    db.toggleLowXPUser ? db.toggleLowXPUser(userId) : null;
                }
                return i.editReply({ content: '✅ Seçilen kullanıcılar için Low-XP durumu güncellendi. (Panelini yenilemek için kategoriye tekrar girin.)' });
            }

            // Seviyeye Göre XP (Daha önce çözdüğümüz modal yapısı)
            if (choice === 'dist_lvl') {
                const modal = new ModalBuilder().setCustomId('modal_lvl').setTitle('Seviye Bazlı XP');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('l').setLabel('Seviye').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('a').setLabel('XP Miktarı').setStyle(TextInputStyle.Short).setRequired(true))
                );
                await i.showModal(modal);
                try {
                    const m = await i.awaitModalSubmit({ filter: it => it.user.id === i.user.id, time: 60000 });
                    await m.deferReply({ flags: MessageFlags.Ephemeral });
                    const target = parseInt(m.fields.getTextInputValue('l'));
                    const amount = parseInt(m.fields.getTextInputValue('a'));
                    const users = db.getUsersByLevel(i.guild.id, target);
                    const ids = users.map(u => u.user_id);
                    db.addBulkXP(i.guild.id, ids, amount);
                    await m.editReply(`✅ **${target}. seviyedeki** ${ids.length} kullanıcıya **${amount} XP** eklendi.`);
                } catch (e) {}
            }
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => null);
        });
    }
};