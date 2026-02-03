const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const Table = require('cli-table3');
const logger = require('../utils/logger');

module.exports = (client) => {
  // --- 1. Prefix Komut Yükleyici ---
  const prefixTable = new Table({
    head: [chalk.cyan('Prefix Komutları'), chalk.cyan('Durum')],
    style: { head: [], border: [] }
  });

  const commandFolders = fs.readdirSync(path.join(__dirname, '../commands'));
  
  for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(path.join(__dirname, '../commands', folder)).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      try {
        const command = require(path.join(__dirname, '../commands', folder, file));
        
        // ÖNEMLİ: Yardım komutu için kategori bilgisini ekliyoruz
        command.folder = folder; 
        
        client.commands.set(command.name, command);
        prefixTable.push([command.name, chalk.green('Yüklendi')]);
      } catch (e) {
        prefixTable.push([file, chalk.red('Hata')]);
        logger.error(`${file} yüklenirken hata: ${e.message}`);
      }
    }
  }
  if (prefixTable.length > 0) console.log(prefixTable.toString());

  // --- 2. Slash Komut Yükleyici ---
   const slashTable = new Table({
    head: [chalk.blue('Slash Komutları'), chalk.blue('Klasör'), chalk.blue('Durum')],
  }); 

  const slashFolders = fs.readdirSync(path.join(__dirname, '../slashCommands'));
  for (const folder of slashFolders) {
    const slashFiles = fs.readdirSync(path.join(__dirname, '../slashCommands', folder)).filter(file => file.endsWith('.js'));
    for (const file of slashFiles) {
      try {
        const slashCommand = require(path.join(__dirname, '../slashCommands', folder, file));
        
        // ÖNEMLİ: Help.js'in çalışması için klasör adını komuta ekliyoruz!
        slashCommand.folder = folder; 
        
        client.slashCommands.set(slashCommand.data.name, slashCommand);
        slashTable.push([slashCommand.data.name, folder, chalk.green('OK')]);
      } catch (e) {
        slashTable.push([file, folder, chalk.red('FAIL')]);
        logger.error(`${file} Slash komutu hatası: ${e.message}`);
      }
    }
  }
  console.log(slashTable.toString());
};