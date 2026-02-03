const { Events, ActivityType } = require('discord.js');
const { VOICE_XP_INTERVAL_MINUTES } = require('../../config');
const logger = require('../../utils/logger');
const voiceManager = require('../../utils/voiceManager'); 
const chalk = require('chalk');
const Table = require('cli-table3');
const fs = require('fs')
const path = require('path')

module.exports = {
  name: Events.ClientReady,
  once: true,
  
  async execute(client) {
    // --- DASHBOARD ---
    const userCount = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    const guildCount = client.guilds.cache.size;
    
    const dashboard = new Table({
        head: [chalk.white('İstatistik'), chalk.white('Değer')],
        colWidths: [20, 40]
    });

    dashboard.push(
        [chalk.cyan('Bot Kullanıcısı'), chalk.bold(client.user.tag)],
        [chalk.cyan('Sunucu Sayısı'), guildCount],
        [chalk.cyan('Toplam Kullanıcı'), userCount],
        [chalk.cyan('Ses XP Sistemi'), `${chalk.yellow(VOICE_XP_INTERVAL_MINUTES)} Dakika`],
        [chalk.cyan('Durum'), chalk.bgGreen.black(' AKTİF ')]
    );

    console.log(dashboard.toString());
    logger.success(`${chalk.bold.green(client.user.username)} göreve hazır!`);

    // --- DURUM AYARLAMASI ---
    const updateStatus = () => {
        const filePath = path.join(__dirname, '../../statuses.txt');
        
        try {
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf8');
                const statuses = data.split('\n').map(s => s.trim()).filter(line => line !== "");

                if (statuses.length > 0) {
                    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
                    client.user.setPresence({
                        activities: [{ name: randomStatus, type: ActivityType.Playing }],
                        status: 'idle',
                    });
                }
            }
        } catch (err) {
           logger.error('Durum hatası: ' + err.message);
        }
    };

    updateStatus();
    setInterval(updateStatus, 10 * 60 * 1000); // 10 dakikada bir değişir

    // --- SES XP YÖNETİCİSİNİ BAŞLAT ---
    voiceManager.init(client);
  },
};