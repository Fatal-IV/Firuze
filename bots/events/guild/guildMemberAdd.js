const { Events } = require('discord.js');
const db = require('../../database/sqlite');
const logger = require('../../utils/logger');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const userStats = db.getUserStats(member.guild.id, member.id);
        if (!userStats || userStats.text_xp === 0) return;

        const { getLevelFromXP } = require('../../utils/levelSystem');
        const currentLevel = getLevelFromXP(userStats.text_xp);
        const allRoles = db.getAllLevelRoles(member.guild.id);

        if (allRoles.length > 0) {
            const rolesToAdd = allRoles
                .filter(r => currentLevel >= r.level)
                .map(r => r.role_id);

            for (const roleId of rolesToAdd) {
                const role = member.guild.roles.cache.get(roleId);
                if (role && role.editable && !member.roles.cache.has(roleId)) {
                    await member.roles.add(role).catch(() => {});
                }
            }
            logger.info(`${member.user.tag} sunucuya tekrar katıldı, ${rolesToAdd.length} rolü iade edildi.`);
        }
    }
};