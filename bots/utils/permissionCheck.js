const { PermissionsBitField } = require('discord.js');

/**
 * @param {Object} member - Mesajı atan üye (message.member)
 * @param {Object} command - Çalıştırılmak istenen komut objesi
 * @param {Function} t - Çeviri fonksiyonu (i18next)
 * @returns {String|null} - Yetki eksikse çevrilmiş hata mesajı, tamsa null döner.
 */
function checkPermissions(member, command, t) {
    if (!member || !member.permissions) return t('common.error');
    if (command.isAdmin === true) {
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return t('common.noPermission', { permission: 'Administrator' });
        }
        return null; // Yönetici ise tam yetkilidir.
    }

    // 2. Permissions Kontrolü (Dizi içindeki yetkiler)
    if (command.permissions && Array.isArray(command.permissions) && command.permissions.length > 0) {
        const missing = member.permissions.missing(command.permissions);
        if (missing.length > 0) {
            // İlk eksik yetkiyi al ve okunabilir formata getir (Örn: ManageGuild -> Manage Guild)
            const permName = missing[0].replace(/([A-Z])/g, ' $1').trim();
            return t('common.noPermission', { permission: permName });
        }
    }

    // 3. Yetki gereksinimi yoksa veya tüm şartlar sağlandıysa
    return null;
}

module.exports = { checkPermissions };