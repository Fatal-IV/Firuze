const i18next = require('i18next');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * i18next'i çoklu dosya (Namespace) yapısıyla başlatır.
 */
async function initializeI18next() {
  logger.info('Dil sistemi modüler yapıya geçiriliyor...');

  const resources = {};
  const localesPath = path.join(__dirname, '..', 'locales');
  const languages = ['en', 'tr'];
  const namespaces = ['commands', 'errors', 'system'];

  // Başlatma durumunu takip etmek için tablo verisi
  const loadingStatus = [];

  try {
    for (const lng of languages) {
      resources[lng] = {};
      
      for (const ns of namespaces) {
        const filePath = path.join(localesPath, lng, `${ns}.json`);
        
        if (fs.existsSync(filePath)) {
          try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            resources[lng][ns] = JSON.parse(fileContent);
            loadingStatus.push({ Dil: lng, Modül: ns, Durum: '✅ Yüklendi' });
          } catch (parseErr) {
            loadingStatus.push({ Dil: lng, Modül: ns, Durum: '❌ JSON Hatası' });
            logger.error(`${lng}/${ns}.json ayrıştırılamadı: ${parseErr.message}`);
          }
        } else {
          loadingStatus.push({ Dil: lng, Modül: ns, Durum: '⚠️ Eksik Dosya' });
        }
      }
    }

    // Yükleme sonuçlarını konsola tablo olarak bastır (İsteğin üzerine)
    console.table(loadingStatus);

  } catch (err) {
    logger.error(`Dil dosyaları yüklenirken KRİTİK HATA: ${err.message}`);
    throw new Error('Dil sistemi başlatılamadı.');
  }

  await i18next.init({
    debug: false,
    fallbackLng: 'en',
    supportedLngs: languages,
    resources: resources,
    ns: namespaces, // 'commands', 'errors', 'system'
    defaultNS: 'system', // Varsayılan namespace
    
    interpolation: {
      escapeValue: false, // Discord için HTML escape kapalı olmalı
      prefix: '{{',
      suffix: '}}'
    },
    // Seviye atlama mesajlarındaki {user} gibi özel etiketler için fallback
    allowObjectInHTMLChildren: true 
  });

  logger.success('Modüler dil sistemi başarıyla aktif edildi.');
  return i18next;
}

module.exports = { initializeI18next };