const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'setprefix',
    aliases: ['prefix', 'önek'],
    permissions: [PermissionsBitField.Flags.ManageGuild],

    async execute(message, args, client, t, db) {
        const newPrefix = args[0];

        if (!newPrefix) {
            return message.reply(t('commands.setprefix.no_args'));
        }

        if (newPrefix.length > 5) {
            return message.reply(t('commands.setprefix.too_long'));
        }

        // SADECE TEK YERDEN DB GÜNCELLE
        db.updatePrefix(message.guild.id, newPrefix);

        return message.reply(
            t('commands.setprefix.success', { prefix: newPrefix })
        );
    }
};
