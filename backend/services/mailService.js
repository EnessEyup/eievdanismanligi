const nodemailer = require('nodemailer');
require('dotenv').config();

// Mail transporter konfigürasyonu
const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Transporter doğrulaması
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Mail transporter hatası:', error);
    } else {
        console.log('✅ Mail server hazır');
    }
});

async function sendMail(to, subject, text) {
    try {
        console.log(`📧 Mail gönderiliyor: ${to} - ${subject}`);
        
        // Mail environment değişkenlerini kontrol et
        if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
            throw new Error('Mail konfigürasyonu eksik! MAIL_USER ve MAIL_PASS environment değişkenleri gerekli.');
        }

        const mailOptions = {
            from: `"Ev Sahibi Danışmanlığı" <${process.env.MAIL_USER}>`,
            to,
            subject,
            text,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #B8860B; color: white; padding: 20px; text-align: center;">
                        <h2>🏠 Kira Hatırlatma</h2>
                    </div>
                    <div style="padding: 20px; background: #f9f9f9;">
                        <p style="white-space: pre-line;">${text}</p>
                    </div>
                    <div style="background: #f0f0f0; padding: 10px; text-align: center; font-size: 12px; color: #666;">
                        <p>Bu mesaj Ev Sahibi Danışmanlığı tarafından otomatik olarak gönderilmiştir.</p>
                        <p>Eyüpoğlu & Işıkgör Hukuk Bürosu</p>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ Mail başarıyla gönderildi: ${result.messageId}`);
        return result;

    } catch (error) {
        console.error('❌ Mail gönderim hatası:', error.message);
        throw error;
    }
}

// Test mail fonksiyonu
async function sendTestMail() {
    try {
        await sendMail(
            process.env.MAIL_USER, 
            'Mail Service Test', 
            'Bu bir test mesajıdır. Mail servisi çalışıyor.'
        );
        console.log('✅ Test mail başarıyla gönderildi');
        return true;
    } catch (error) {
        console.error('❌ Test mail hatası:', error);
        return false;
    }
}

module.exports = { sendMail, sendTestMail };