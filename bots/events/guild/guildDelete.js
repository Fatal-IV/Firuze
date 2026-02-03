const { Events } = require('discord.js');
const logger = require('../../utils/logger'); 
const db = require('../../database/sqlite'); 

// --- KORUMA KURALI TANIMLAMA ---
// Bu ID'ye sahip sunucudan atılsa bile veriler SİLİNMEYECEKTİR.
const PROTECTED_GUILD_ID = '776904485296668712'; 

module.exports = {
  name: Events.GuildDelete,

  async execute(guild, client) {
    // Sunucu mevcut değilse veya ID yoksa işlemi durdur
    if (!guild.available || !guild.id) return;

    // --- KORUMA KONTROLÜ ---
    if (guild.id === PROTECTED_GUILD_ID) {
        logger.warn(`KORUMA KURALI: ${guild.name} (${guild.id}) sunucusundan ayrıldım. Veriler silinmedi.`);
        return; // Silme işlemini atla ve kodu sonlandır
    }
    
    logger.info(`Sunucudan ayrıldım: ${guild.name} (${guild.id}). Verileri siliniyor...`);

    try {
        // Normal silme işlemi (Koruma kontrolünden geçtiği için güvenlidir)
        db.deleteGuild(guild.id); 
        logger.info(`[DB] Sunucu verileri başarıyla silindi: ${guild.id}`);
    } catch (error) {
        logger.error(`Sunucu verileri silinirken hata oluştu: ${error.message}`);
    }
  },
};