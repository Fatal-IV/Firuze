const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = (client) => {
  const eventFolders = fs.readdirSync(path.join(__dirname, '../events'));
  let eventCount = 0;

  for (const folder of eventFolders) {
    const eventFiles = fs.readdirSync(path.join(__dirname, '../events', folder)).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
      const event = require(path.join(__dirname, '../events', folder, file));
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      eventCount++;
    }
  }
   logger.success(`${eventCount} adet Event başarıyla dinleniyor.`);
};