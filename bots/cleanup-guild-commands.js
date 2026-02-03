const { REST, Routes } = require('discord.js');
require('dotenv').config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.argv[2]; // Guild ID'yi komut satırından alır

if (!token || !clientId || !guildId) {
    console.error('❌ HATA: Eksik bilgi! Kullanım: node cleanup-guild-commands.js <SUNUCU_ID>');
    process.exit(1);
}

const rest = new REST().setToken(token);

(async () => {
    try {
        console.log(`🧹 ${guildId} ID'li sunucudaki yerel komutlar temizleniyor...`);

        // Boş dizi göndererek sunucuya özel tüm komutları siler
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: [] },
        );

        console.log('✅ İşlem başarılı. Bu sunucuda artık sadece global komutlar görünecek.');
        console.log('ℹ️ Not: Değişikliklerin yansıması için Discord uygulamanızı (Ctrl+R) yenilemeniz gerekebilir.');
    } catch (error) {
        console.error('❌ Discord API Hatası:', error);
    }
})();