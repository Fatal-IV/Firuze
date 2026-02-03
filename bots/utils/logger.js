const chalk = require('chalk');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

// --- KLASÖR VE DOSYA AYARLARI ---
const logDir = path.join(__dirname, '../logs');

// Logs klasörü yoksa oluştur
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const errorFile = path.join(logDir, 'error.log');
const combinedFile = path.join(logDir, 'combined.log');

// Renk kodlarını temizlemek için Regex (Dosyaya temiz metin yazmak için)
const stripAnsi = (str) => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

const log = (message, type = 'info') => {
  const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
  let color;
  let prefix;

  // Tip belirleme
  switch (type) {
    case 'success':
      color = chalk.green;
      prefix = '[BAŞARILI]';
      break;
    case 'error':
      color = chalk.red;
      prefix = '[HATA]';
      break;
    case 'xpmessage':
      color = chalk.greenBright;
      prefix = '[XP-KAZANIM]';
      break;
    case 'warn':
      color = chalk.yellow;
      prefix = '[UYARI]';
      break;
    case 'info':
    default:
      color = chalk.blue;
      prefix = '[BİLGİ]';
      break;
  }

  // 1. KONSOL ÇIKTISI (Renkli)
  const consoleOutput = `${chalk.gray(timestamp)} ${color(prefix)} ${message}`;
  console.log(consoleOutput);

  // 2. DOSYA ÇIKTISI (Renksiz / Temiz)
  const fileOutput = `[${timestamp}] ${prefix} ${stripAnsi(message)}\n`;

  try {
      // Her şeyi combined.log'a yaz
      fs.appendFileSync(combinedFile, fileOutput);

      // Sadece HATA ve UYARI durumlarını error.log'a DA yaz
      if (type === 'error' || type === 'warn') {
          fs.appendFileSync(errorFile, fileOutput);
      }
  } catch (err) {
      console.error('Log dosyasına yazılamadı:', err);
  }
};

module.exports = {
  success: (msg) => log(msg, 'success'),
  error: (msg) => log(msg, 'error'),
  warn: (msg) => log(msg, 'warn'),
  info: (msg) => log(msg, 'info'),
  xpmessage: (msg) => log(msg, 'xpmessage')
};