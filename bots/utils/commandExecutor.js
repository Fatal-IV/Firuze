const logger = require('./logger');

async function executeCommand(client, message, command, args, t, db) {
  try {
    // 1. Slash/Hibrit dosyasındaki prefix mantığı
    if (command.prefixExecute) {
      // SIRALAMA: message, args, client, t, db
      await command.prefixExecute(message, args, client, t, db); 
    } 
    // 2. Klasik prefix komutları
    else if (command.execute) {
      // SIRALAMA: message, args, client, t, db
      await command.execute(message, args, client, t, db);
    }
  } catch (error) {
    logger.error(`Komut yürütme hatası (${command.name || command.data?.name}): ${error.stack}`);
    message.reply('❌ Komut çalıştırılırken bir hata oluştu.');
  }
}

module.exports = { executeCommand };