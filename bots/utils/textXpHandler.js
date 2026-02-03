const { EmbedBuilder } = require('discord.js');
const db = require('../database/sqlite');
const { getRandomTextXP, getLevelFromXP } = require('./levelSystem');
const logger = require('./logger');


/**
 * Mesaj başına XP verme ve Rol Denetimi işlemlerini yönetir.
 */
async function handleTextXP(client, message, guildConfig) {
    // 1. Temel Kontroller
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;
    const userId = message.author.id;
    const now = Date.now();

    // 2. Kullanıcı Verilerini Çek
    const userStats = db.getUserStats(guildId, userId);
    if (!userStats) return;

    // 3. Cooldown (Bekleme Süresi) Kontrolü
    // Setup'ta ayarlanan süreyi al (yoksa varsayılan 30sn)
    const cooldownSeconds = guildConfig.cooldown || 30; 
    const lastGainTime = userStats.last_text_xp_gain || 0;
    const timePassed = now - lastGainTime;
    const messageCount = userStats.current_cooldown_messages || 0;
    const lastText = userStats.last_message_text || "";

    let currentMessageCount = 1;
    let updateTimestamp = now; // Varsayılan olarak zamanı güncelliyoruz

    // Eğer ayarlanmış süre (cooldown) henüz dolmadıysa:
    if (timePassed < (cooldownSeconds * 1000)) {
        // 2 mesaj hakkı dolduysa veya mesaj bir öncekiyle aynıysa (makro engeli) iptal et
        if (messageCount >= 2 || message.content.trim() === lastText) return;
        
        currentMessageCount = messageCount + 1;
        updateTimestamp = lastGainTime; // 2. mesajda süreyi sıfırlama, ilk mesajın süresinden devam et
    } else {
        // Süre dolmuşsa: Yeni bir periyot başlat
        currentMessageCount = 1;
        updateTimestamp = now;
    }

    // 4. Seviye ve XP Hesaplamaları
    const oldLevel = getLevelFromXP(userStats.text_xp);
    
    // TEMEL XP: config.js'deki (10-25) aralığını kullanır
    let xpToGive = getRandomTextXP(oldLevel); 

    // XP BOOST: Veritabanındaki (guildConfig) dinamik çarpan kontrolü
    const isBoostActive = guildConfig.boost_expires && Date.now() < guildConfig.boost_expires;
    if (isBoostActive) {
        // config.js'den gelen taban XP, veritabanındaki çarpanla çarpılır
        xpToGive = Math.floor(xpToGive * (guildConfig.xp_multiplier || 1));
    }

    const newTotalXP = userStats.text_xp + xpToGive;
    const newLevel = getLevelFromXP(newTotalXP);

    // KONSOL ÇIKTISI
    console.log(`[XP LOG] ${message.author.tag} | Taban: ${xpToGive / (isBoostActive ? guildConfig.xp_multiplier : 1)} | Sonuç: ${xpToGive} ${isBoostActive ? `(x${guildConfig.xp_multiplier} Aktif)` : ''}`);

    // Yeni veritabanı fonksiyonu ile tüm verileri tek seferde güncelliyoruz
    db.updateUserXPWithCounter(
        guildId, 
        userId, 
        newTotalXP, 
        newLevel, 
        currentMessageCount, 
        message.content.trim(), 
        updateTimestamp
    );

    // --- 5. SEVİYE ATLAMA MESAJI ---
    const guildLocale = message.guild.preferredLocale === 'tr' ? 'tr' : 'en';
    const t = client.i18n.getFixedT(guildLocale);
    
    if (newLevel > oldLevel) {
        try {
            const logChannelId = guildConfig.log_channel_id;
            const logChannel = message.guild.channels.cache.get(logChannelId);

            if (logChannel) {
                let rawMsg = guildConfig.level_up_message || t('system:events.levelUp.message');

                const descriptionText = rawMsg
                    .replace(/{user}/g, message.author.toString())
                    .replace(/{level}/g, `**${newLevel}**`)
                    .replace(/{guild}/g, message.guild.name);

                const levelEmbed = new EmbedBuilder()
                    .setColor('#FFE082')
                    .setDescription(`*${t('system:events.levelUp.title')}*\n> ${descriptionText}`)
                    .setThumbnail(message.author.displayAvatarURL({ size: 256 }))
                    .setTimestamp();

                await logChannel.send({ 
                    content: message.author.toString(), 
                    embeds: [levelEmbed] 
                });
            }
        } catch (err) {
            logger.error(`Seviye mesajı gönderilemedi: ${err.message}`);
        }
    }

    // --- 6. ROL DENETLEYİCİ (AUDIT) ---
    try {
        const allRoles = db.getAllLevelRoles(guildId);
        
        if (allRoles && allRoles.length > 0) {
            const member = await message.guild.members.fetch(userId);
            const eligibleRoles = allRoles.filter(r => newLevel >= r.level);

            for (const roleData of eligibleRoles) {
                let role = message.guild.roles.cache.get(roleData.role_id);
                if (!role) {
                    role = await message.guild.roles.fetch(roleData.role_id).catch(() => null);
                }

                if (role && !member.roles.cache.has(role.id)) {
                    if (role.editable) {
                        await member.roles.add(role)
                            .then(() => console.log(`[AUDIT] Eksik Rol Verildi: ${role.name} -> ${message.author.tag}`))
                            .catch(e => logger.error(`[ERROR] Rol eklenemedi: ${e.message}`));
                    } else {
                        console.log(`[HIYERARŞİ HATASI] ⚠️ ${role.name} rolü botun üzerinde olduğu için verilemiyor!`);
                    }
                }
            }
        }
    } catch (roleErr) {
        logger.error(`Rol denetim sistemi hatası: ${roleErr.stack}`);
    }
}

module.exports = { handleTextXP };