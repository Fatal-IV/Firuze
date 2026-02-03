const { Collection } = require('discord.js');
const config = require('../config'); // YENİ: Config senkronizasyonu eklendi
const logger = require('./logger')
/**
 * Spam Koruması Modülü
 * Config dosyasındaki (config.js) limitlere göre çalışır.
 */

const spamTracker = new Collection();

// Temizlik Döngüsü: 5 dakikada bir eski verileri bellekten siler
setInterval(() => {
    const now = Date.now();
    const windowMs = (config.SPAM_WINDOW_SECONDS || 5) * 1000;
    
    spamTracker.forEach((data, userId) => {
        // Blok süresi bitmiş VE son mesajın üzerinden pencere süresi geçmişse sil
        if (now > data.blockedUntil && now - data.startTime > windowMs) {
            spamTracker.delete(userId);
        }
    });
}, 5 * 60 * 1000);

function isSpamming(userId) {
    const now = Date.now();
    
    // --- DÜZELTME BAŞLANGICI ---
    // Değerleri Config dosyasından dinamik olarak çekiyoruz
    const WINDOW_MS = (config.SPAM_WINDOW_SECONDS || 5) * 1000; // Örn: 5000ms
    const MAX_COUNT = config.SPAM_MESSAGE_COUNT || 4;         // Örn: 3 mesaj
    // ---------------------------

    if (!spamTracker.has(userId)) {
        spamTracker.set(userId, { count: 1, startTime: now, blockedUntil: 0 });
        return false;
    }

    const userData = spamTracker.get(userId);

    // 1. KULLANICI ZATEN BLOKLU MU?
    if (now < userData.blockedUntil) {
        // Log kirliliği olmaması için yorum satırına alındı
         console.log(`[SPAM-KORUMA] ${userId} şu an engelli.`);
        return true; 
    }

    // 2. ZAMAN PENCERESİ KONTROLÜ (Config'e göre)
    if (now - userData.startTime > WINDOW_MS) {
        // Pencere süresi (örn: 5sn) geçtiyse sayacı sıfırla
        userData.count = 1;
        userData.startTime = now;
        userData.blockedUntil = 0; 
        return false;
    }

    // 3. PENCERE İÇİNDEYSE SAYACI ARTIR
    userData.count++;

    // 4. LİMİT AŞIMI (Config'e göre)
    if (userData.count > MAX_COUNT) {
      console.log(`[SPAM-TESPIT] ${userId} çok hızlı mesaj attı! (${MAX_COUNT} üzeri). 60 sn XP engeli.`);
        
        // Kullanıcı spam yaptıysa 60 saniye boyunca (sabit ceza süresi) XP kazanamaz
        userData.blockedUntil = now + 30000; 
        return true; 
    }

    return false;
}

module.exports = { isSpamming };