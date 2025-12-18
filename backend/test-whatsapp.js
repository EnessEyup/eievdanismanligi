const whatsappService = require('./services/whatsappService');

async function testWhatsApp() {
    console.log('WhatsApp test başlatılıyor...');
    
    // Test telefon numarası (kendi numaranı gir)
    const testPhone = '905412911633';
    
    try {
        console.log('Test mesajı gönderiliyor...');
        
        const result = await whatsappService.sendTestMessage(testPhone);
        
        if (result.success) {
            console.log('✅ Test mesajı başarıyla gönderildi!');
            console.log('Message ID:', result.messageId);
        } else {
            console.log('❌ Test mesajı gönderilemedi!');
            console.log('Hata:', result.error);
        }
        
    } catch (error) {
        console.error('Test hatası:', error);
    }
}

// Test'i çalıştır
testWhatsApp(); 