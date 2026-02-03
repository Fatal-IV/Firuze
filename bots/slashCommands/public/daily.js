const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const { handleStreak } = require('../../utils/daily/streakHandler');
const { calculateXP } = require('../../utils/daily/xpCalculator');
const { createDailyImage } = require('../../utils/daily/dailyCanvas');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setNameLocalizations({ tr: 'günlük' })
        .setDescription('Claim your daily XP reward!')
        .setDescriptionLocalizations({ tr: 'Günlük XP ödülünü al!' }),

    async execute(interaction, client, t, db) {
        const { guild, user, member } = interaction;
        const userData = db.getUserStats(guild.id, user.id);
        
        // 1. Seri ve Zaman Kontrolü
        const streakData = handleStreak(userData.last_daily || 0, userData.daily_streak || 0);

     if (!streakData.canClaim) {
    const remaining = streakData.nextAvailable - Date.now();
    const hours = Math.floor(remaining / 3600000);
    // Math.ceil kullanarak 0 dakika görünmesini engelliyoruz
    const minutes = Math.ceil((remaining % 3600000) / 60000);

    return interaction.reply({
        content: t('errors:daily.cooldown', { hours, minutes }),
        flags: MessageFlags.Ephemeral
    });
}

        await interaction.deferReply();

        // 2. XP ve Veritabanı Güncelleme
        const gainedXP = calculateXP(streakData.newStreak);
        
        // Veritabanı altyapınıza göre güncellenir
        const { oldLevel, newLevel } = db.addXP(guild.id, user.id, gainedXP);
        db.setDaily(guild.id, user.id, Date.now(), streakData.newStreak);

        // 3. Görsel Oluşturma (dailyCanvas.js modülünden)
        // Kart üzerindeki sabit etiketleri dil sisteminden çekiyoruz
        const labels = {
            dailyTitle: t('commands:daily.chipTitle').toUpperCase(),
            rewardLabel: t('commands:daily.rewardLabel')
        };

        const buffer = await createDailyImage(user, member, gainedXP, newLevel, streakData.newStreak, t);
       	const attachment = new AttachmentBuilder(buffer, { name: 'daily-reward.png' });

        // 4. Yanıt Gönderme (Hata mesajı kaldırıldı)
     	await interaction.editReply({ 
    		files: [attachment] 
		});

        // 5. Seviye Atlama Logu (Sadece seviye arttıysa)
        if (newLevel > oldLevel) {
            const guildConfig = db.getGuild(guild.id);
            const logChannel = guild.channels.cache.get(guildConfig.log_channel_id);
            if (logChannel) {
                const levelMsg = (guildConfig.level_up_message || t('system:events.levelUp.message'))
                    .replace(/{user}/g, user.toString())
                    .replace(/{level}/g, `**${newLevel}**`);
                logChannel.send({ content: levelMsg });
            }
        }
    }
};