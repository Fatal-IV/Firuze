/**
 * Basit ve etkili bir Cooldown (Bekleme Süresi) Yöneticisi.
 * Hem XP hem de Komut sistemleri tarafından ortak kullanılır.
 */
class CooldownManager {
    constructor() {
        this.cooldowns = new Map();
    }

    /**
     * Kullanıcının bekleme süresinde olup olmadığını kontrol eder.
     * @param {string} key - Cooldown kategorisi (örn: 'xp:text' veya 'cmd:rank')
     * @param {string} userId - Kullanıcı ID
     * @returns {boolean} - Süre devam ediyorsa true döner.
     */
    checkCooldown(key, userId) {
        const timestamp = this.cooldowns.get(`${key}:${userId}`);
        if (!timestamp) return false;
        return Date.now() < timestamp;
    }

    /**
     * Kalan bekleme süresini saniye cinsinden döndürür.
     * @param {string} key - Cooldown kategorisi
     * @param {string} userId - Kullanıcı ID
     * @returns {number} - Kalan saniye (Süre yoksa 0)
     */
    getRemaining(key, userId) {
        const timestamp = this.cooldowns.get(`${key}:${userId}`);
        if (!timestamp) return 0;
        
        const remaining = timestamp - Date.now();
        return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
    }

    /**
     * Kullanıcı için yeni bir bekleme süresi başlatır.
     * @param {string} key - Cooldown kategorisi
     * @param {string} userId - Kullanıcı ID
     * @param {number} seconds - Beklenecek süre (Saniye)
     */
    setCooldown(key, userId, seconds) {
        const expiresAt = Date.now() + (seconds * 1000);
        this.cooldowns.set(`${key}:${userId}`, expiresAt);
        
        // Bellek sızıntısını önlemek için süresi dolunca map'ten sil
        setTimeout(() => {
            this.cooldowns.delete(`${key}:${userId}`);
        }, seconds * 1000);
    }
}

module.exports = { CooldownManager };