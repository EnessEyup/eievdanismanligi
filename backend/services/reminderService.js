const Reminder = require('../models/Reminder');
const Property = require('../models/Property');
const mailService = require('./mailService');

class ReminderService {
    // Bekleyen hatırlatıcıları kontrol et ve mail gönder
    async checkAndSendReminders() {
        try {
            console.log('🔍 Hatırlatıcı kontrolü başlatılıyor...');
            const today = new Date();
            const todayDay = today.getDate();
            const currentMonth = today.getMonth() + 1;
            const currentYear = today.getFullYear();
            
            console.log(`📅 Kontrol tarihi: ${today.toLocaleDateString('tr-TR')} (Gün: ${todayDay})`);

            // Bugün gönderilmesi gereken hatırlatıcıları bul
            const pendingReminders = await Reminder.find({
                isActive: true,
                $or: [
                    { reminderDays: todayDay }, // Eski format uyumluluğu
                    { 
                        $expr: {
                            $eq: [{ $dayOfMonth: "$nextSendDate" }, todayDay]
                        }
                    }
                ]
            }).populate('propertyId');

            console.log(`📊 ${pendingReminders.length} adet potansiyel hatırlatıcı bulundu`);
            
            // Bugün gerçekten gönderilmesi gerekenleri filtrele
            const todaysReminders = pendingReminders.filter(reminder => {
                if (reminder.nextSendDate && reminder.nextSendDate <= today) {
                    return true;
                }
                if (reminder.reminderDays === todayDay) {
                    return true;
                }
                return false;
            });

            console.log(`✅ ${todaysReminders.length} adet bugün gönderilecek hatırlatıcı`);

            let successCount = 0;
            let errorCount = 0;
            
            for (const reminder of todaysReminders) {
                try {
                    console.log(`📧 Hatırlatıcı işleniyor: ${reminder._id} (${reminder.email})`);
                    await this.sendReminder(reminder);
                    successCount++;
                } catch (error) {
                    console.error(`❌ Hatırlatıcı gönderme hatası (ID: ${reminder._id}):`, error.message);
                    errorCount++;
                }
            }
            
            console.log(`🏁 Hatırlatıcı kontrolü tamamlandı. Başarılı: ${successCount}, Hatalı: ${errorCount}`);
            return {
                success: true,
                total: todaysReminders.length,
                successCount,
                errorCount,
                details: {
                    checkedDate: today.toISOString(),
                    dayOfMonth: todayDay
                }
            };
        } catch (error) {
            console.error('❌ Hatırlatıcı kontrolü hatası:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Tek bir hatırlatıcıyı gönder
    async sendReminder(reminder) {
        try {
            const property = reminder.propertyId;
            if (!property) {
                throw new Error('Gayrimenkul bulunamadı');
            }
            // Mail içeriği oluştur
            const subject = `Kira Hatırlatma: ${property.name}`;
            let text = `Sayın ${reminder.ownerName},\n${property.name} gayrimenkulünüzün kira ödeme tarihi yaklaşıyor. Tutar: ₺${property.rent}\n`;
            if (reminder.customMessage) {
                text += `\n${reminder.customMessage}`;
            }
            text += `\n\nEyüpoğlu&Işıkgör ev sahibi danışmanlığı tarafından gönderilen hatırlatma`;
            // Mail gönder
            await mailService.sendMail(reminder.email, subject, text);
            // Hatırlatıcıyı güncelle
            reminder.lastSentDate = new Date();
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            nextMonth.setDate(reminder.reminderDays);
            nextMonth.setHours(12, 0, 0, 0);
            reminder.nextSendDate = nextMonth;
            await reminder.save();
            console.log(`Hatırlatıcı başarıyla mail ile gönderildi ve güncellendi. ID: ${reminder._id}`);
            return { success: true, reminderId: reminder._id, nextSendDate: reminder.nextSendDate };
        } catch (error) {
            console.error('Mail gönderimi hatası:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new ReminderService(); 