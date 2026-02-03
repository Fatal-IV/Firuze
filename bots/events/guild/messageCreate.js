const { Events } = require('discord.js');
const db = require('../../database/sqlite');
const { handleTextXP } = require('../../utils/textXpHandler'); 
const { isSpamming } = require('../../utils/spamProtection'); // Yeni spam modülü
const config = require('../../config');
const { executeCommand } = require('../../utils/commandExecutor');

module.exports = {
  name: Events.MessageCreate,

  async execute(message, client) {
    // 1. TEMEL KONTROLLER
    if (message.author.bot || !message.guild) return; 

    const guildId = message.guild.id;
    const guildConfig = db.getGuild(guildId);

    // Sistem kapalıysa işlem yapma
   if (!guildConfig) return;

	const prefix = guildConfig?.prefix || config.prefix;
    if (message.content.startsWith(prefix)) {
      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();
      
      // 1. Önce klasik Prefix koleksiyonuna bak
      let command = client.commands.get(commandName) || 
                      client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
      
      // 2. Bulamazsa Slash koleksiyonuna bak (Hibrit Kontrolü)
      if (!command) {
          command = client.slashCommands.get(commandName);
          // Eğer bir slash komutu bulunduysa ama prefix desteği (prefixExecute) yoksa iptal et
          if (command && !command.prefixExecute) command = null;
      }

      if (command) {
          const db = require('../../database/sqlite');
          // Dil fonksiyonunu (t) oluşturup executor'a gönderiyoruz
          const locale = guildConfig?.language || 'tr';
          const t = client.i18n.getFixedT(locale);
          
          await executeCommand(client, message, command, args, t, db); // t eklendi
          return;
      }
    }
    // 2. YASAK KONTROLÜ (Ignored Channels/Roles)
    // Veritabanı sorgusunu gereksiz yere yapmamak için önce basit kontroller
    const ignores = db.getIgnores(guildId);
    if (ignores.some(i => i.type === 'channel' && i.target_id === message.channel.id)) return;
    if (ignores.some(i => i.type === 'role' && message.member.roles.cache.has(i.target_id))) return;
    
    // 3. SPAM KORUMASI (Hardcoded: 5sn / 3mesaj -> 60sn engel)
    // Eğer kullanıcı spam yapıyorsa XP işlemine hiç girme
    if (isSpamming(message.author.id)) return;

    // 4. XP VE LEVEL İŞLEMLERİ (Modüler)
    await handleTextXP(client, message, guildConfig);
  },
};