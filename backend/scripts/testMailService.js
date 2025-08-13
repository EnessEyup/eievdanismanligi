const mongoose = require('mongoose');
const mailService = require('../services/mailService');
const reminderService = require('../services/reminderService');
require('dotenv').config();

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ MongoDB bağlantısı başarılı');
}).catch(err => {
    console.error('❌ MongoDB bağlantı hatası:', err);
    process.exit(1);
});

async function testMailService() {
    console.log('🧪 Mail Service Test Başlatılıyor...\n');
    
    try {
        // 1. Mail service test
        console.log('1️⃣ Mail service test mail gönderimi...');
        await mailService.sendTestMail();
        console.log('✅ Test mail başarılı\n');
        
        // 2. Reminder service test  
        console.log('2️⃣ Hatırlatıcı service kontrolü...');
        const result = await reminderService.checkAndSendReminders();
        console.log('Sonuç:', JSON.stringify(result, null, 2));
        console.log('✅ Hatırlatıcı kontrolü tamamlandı\n');
        
        // 3. Environment variables kontrolü
        console.log('3️⃣ Environment değişkenleri kontrolü...');
        console.log('MAIL_USER:', process.env.MAIL_USER ? '✅ Mevcut' : '❌ Eksik');
        console.log('MAIL_PASS:', process.env.MAIL_PASS ? '✅ Mevcut' : '❌ Eksik');
        console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Mevcut' : '❌ Eksik');
        
    } catch (error) {
        console.error('❌ Test hatası:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n💾 MongoDB bağlantısı kapatıldı');
        process.exit(0);
    }
}

// Test'i çalıştır
testMailService();