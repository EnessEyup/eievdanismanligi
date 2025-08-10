const mongoose = require('mongoose');
const reminderService = require('../services/reminderService');
require('dotenv').config();

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB bağlantısı başarılı');
}).catch(err => {
    console.error('MongoDB bağlantı hatası:', err);
    process.exit(1);
});

// Hatırlatıcıları kontrol et ve gönder
async function sendReminders() {
    try {
        console.log('=== Hatırlatıcı Kontrolü Başlatılıyor ===');
        console.log('Tarih:', new Date().toLocaleString('tr-TR'));
        
        const result = await reminderService.checkAndSendReminders();
        
        if (result.success) {
            console.log(`✅ Kontrol tamamlandı!`);
            console.log(`📊 Toplam: ${result.total} hatırlatıcı`);
            console.log(`✅ Başarılı: ${result.successCount}`);
            console.log(`❌ Hatalı: ${result.errorCount}`);
        } else {
            console.log(`❌ Kontrol hatası: ${result.error}`);
        }
        
    } catch (error) {
        console.error('❌ Script hatası:', error);
    } finally {
        // MongoDB bağlantısını kapat
        await mongoose.connection.close();
        console.log('MongoDB bağlantısı kapatıldı');
        process.exit(0);
    }
}

// Scripti çalıştır
sendReminders(); 