// Debug script - Mail konfigürasyonu olmadan reminder logic'ini test et
const mongoose = require('mongoose');
require('dotenv').config();

// Mock reminder service (mail göndermeyen versiyon)
class MockReminderService {
    async checkAndSendReminders() {
        try {
            console.log('🔍 [DEBUG] Hatırlatıcı kontrolü başlatılıyor...');
            const today = new Date();
            const todayDay = today.getDate();
            const currentMonth = today.getMonth() + 1;
            const currentYear = today.getFullYear();
            
            console.log(`📅 [DEBUG] Kontrol tarihi: ${today.toLocaleDateString('tr-TR')}`);
            console.log(`📅 [DEBUG] Bugünün günü: ${todayDay}`);
            console.log(`📅 [DEBUG] Ay: ${currentMonth}, Yıl: ${currentYear}`);
            
            console.log('\n🔍 [DEBUG] Yarın (14 Ağustos) için hatırlatıcı var mı kontrol ediliyor...');
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowDay = tomorrow.getDate();
            
            console.log(`📅 [DEBUG] Yarın: ${tomorrow.toLocaleDateString('tr-TR')} (Gün: ${tomorrowDay})`);
            
            // Simüle: database'de reminderDays: 14 olan kayıt var mı?
            console.log(`\n🎯 [DEBUG] Database sorgusu simülasyonu:`);
            console.log(`Query: { isActive: true, reminderDays: ${tomorrowDay} }`);
            
            console.log(`\n✅ [DEBUG] Eğer database'de reminderDays: ${tomorrowDay} olan aktif kayıt varsa,`);
            console.log(`   yarın saat 12:00'da mail gönderilecek!`);
            
            console.log('\n📧 [DEBUG] Cron job zamanlaması:');
            console.log('  • Production: Her gün saat 12:00 (0 12 * * *)');
            console.log('  • Development: Her 5 dakika (*/5 * * * *)');
            
            return {
                success: true,
                todayDay,
                tomorrowDay,
                debug: true
            };
            
        } catch (error) {
            console.error('❌ [DEBUG] Hata:', error);
            return { success: false, error: error.message };
        }
    }
}

// Debug test'i çalıştır
async function debugTest() {
    console.log('🧪 [DEBUG] Reminder Logic Test\n');
    
    const mockService = new MockReminderService();
    const result = await mockService.checkAndSendReminders();
    
    console.log('\n📋 [DEBUG] Sonuç:', JSON.stringify(result, null, 2));
    
    console.log('\n🔧 [DEBUG] Hatırlatıcı sistemini aktifleştirmek için:');
    console.log('1. .env dosyasında MAIL_USER ve MAIL_PASS ayarla');
    console.log('2. Gmail\'de App Password oluştur');
    console.log('3. MONGODB_URI\'yi production database\'e ayarla');
    console.log('4. Server\'ı restart et (npm run dev veya npm start)');
    
    process.exit(0);
}

debugTest();