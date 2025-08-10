const express = require('express');
const router = express.Router();
const { auth, isLandlord } = require('../middleware/auth');
const Reminder = require('../models/Reminder');
const Property = require('../models/Property');
const reminderService = require('../services/reminderService');

// Hatırlatıcı ekle (sadece email)
router.post('/add-reminder', auth, isLandlord, async (req, res) => {
    try {
        const { propertyId, ownerName, email, reminderDays, customMessage } = req.body;
        // Property kontrolü
        const property = await Property.findById(propertyId);
        if (!property || property.landlordId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu gayrimenkul için yetkiniz yok' });
        }
        // Email kontrolü
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            return res.status(400).json({ message: 'Geçerli bir e-posta adresi giriniz' });
        }
        // Hatırlatma günü kontrolü
        if (reminderDays < 1 || reminderDays > 31) {
            return res.status(400).json({ message: 'Hatırlatma günü 1-31 arasında olmalıdır' });
        }
        // Hatırlatıcı oluştur
        const reminder = new Reminder({
            propertyId,
            landlordId: req.user._id,
            ownerName,
            email,
            reminderDays,
            customMessage
        });
        reminder.nextSendDate = reminder.calculateNextSendDate();
        await reminder.save();
        res.json({ message: 'Hatırlatıcı başarıyla eklendi', reminder });
    } catch (error) {
        console.error('Add reminder error:', error);
        res.status(500).json({ message: 'Hatırlatıcı eklenemedi' });
    }
});

// Gayrimenkul hatırlatıcılarını getir
router.get('/property-reminders/:propertyId', auth, isLandlord, async (req, res) => {
    try {
        const { propertyId } = req.params;
        
        // Property kontrolü
        const property = await Property.findById(propertyId);
        if (!property || property.landlordId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu gayrimenkul için yetkiniz yok' });
        }
        
        // Hatırlatıcıları getir
        const reminders = await Reminder.find({ propertyId }).sort({ createdAt: -1 });
        
        res.json({
            property,
            reminders
        });
        
    } catch (error) {
        console.error('Get property reminders error:', error);
        res.status(500).json({ message: 'Hatırlatıcılar alınamadı' });
    }
});

// Hatırlatıcı sil
router.delete('/delete-reminder/:reminderId', auth, isLandlord, async (req, res) => {
    try {
        const { reminderId } = req.params;
        
        const reminder = await Reminder.findById(reminderId);
        if (!reminder) {
            return res.status(404).json({ message: 'Hatırlatıcı bulunamadı' });
        }
        
        if (reminder.landlordId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu hatırlatıcı için yetkiniz yok' });
        }
        
        await Reminder.findByIdAndDelete(reminderId);
        
        res.json({ message: 'Hatırlatıcı başarıyla silindi' });
        
    } catch (error) {
        console.error('Delete reminder error:', error);
        res.status(500).json({ message: 'Hatırlatıcı silinemedi' });
    }
});

// Hatırlatıcı durumunu değiştir (aktif/pasif)
router.put('/toggle-reminder/:reminderId', auth, isLandlord, async (req, res) => {
    try {
        const { reminderId } = req.params;
        
        const reminder = await Reminder.findById(reminderId);
        if (!reminder) {
            return res.status(404).json({ message: 'Hatırlatıcı bulunamadı' });
        }
        
        if (reminder.landlordId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu hatırlatıcı için yetkiniz yok' });
        }
        
        reminder.isActive = !reminder.isActive;
        await reminder.save();
        
        res.json({
            message: `Hatırlatıcı ${reminder.isActive ? 'aktif' : 'pasif'} hale getirildi`,
            reminder
        });
        
    } catch (error) {
        console.error('Toggle reminder error:', error);
        res.status(500).json({ message: 'Hatırlatıcı durumu değiştirilemedi' });
    }
});

// Gönderilecek hatırlatıcıları getir (SMS servisi için)
router.get('/pending-reminders', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Bugün gönderilecek hatırlatıcıları bul
        const pendingReminders = await Reminder.find({
            isActive: true,
            nextSendDate: {
                $gte: today,
                $lt: tomorrow
            }
        }).populate('propertyId').populate('landlordId');
        
        res.json({
            count: pendingReminders.length,
            reminders: pendingReminders
        });
        
    } catch (error) {
        console.error('Get pending reminders error:', error);
        res.status(500).json({ message: 'Bekleyen hatırlatıcılar alınamadı' });
    }
});

// SMS gönderildikten sonra hatırlatıcıyı güncelle
router.put('/mark-sent/:reminderId', async (req, res) => {
    try {
        const { reminderId } = req.params;
        
        const reminder = await Reminder.findById(reminderId);
        if (!reminder) {
            return res.status(404).json({ message: 'Hatırlatıcı bulunamadı' });
        }
        
        // Son gönderim tarihini güncelle
        reminder.lastSentDate = new Date();
        
        // Bir sonraki ayın aynı gününe ayarla
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(reminder.reminderDays);
        nextMonth.setHours(12, 0, 0, 0);
        
        reminder.nextSendDate = nextMonth;
        
        await reminder.save();
        
        res.json({
            message: 'Hatırlatıcı güncellendi',
            reminder
        });
        
    } catch (error) {
        console.error('Mark reminder sent error:', error);
        res.status(500).json({ message: 'Hatırlatıcı güncellenemedi' });
    }
});

// Otomatik hatırlatıcı kontrolü (cron job için)
router.post('/check-reminders', async (req, res) => {
    try {
        const result = await reminderService.checkAndSendReminders();
        res.json(result);
    } catch (error) {
        console.error('Check reminders error:', error);
        res.status(500).json({ message: 'Hatırlatıcı kontrolü yapılamadı' });
    }
});

// Test SMS gönder
router.post('/send-test-sms/:reminderId', auth, isLandlord, async (req, res) => {
    try {
        const { reminderId } = req.params;
        
        const reminder = await Reminder.findById(reminderId);
        if (!reminder) {
            return res.status(404).json({ message: 'Hatırlatıcı bulunamadı' });
        }
        
        if (reminder.landlordId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu hatırlatıcı için yetkiniz yok' });
        }
        
        const result = await reminderService.sendTestSMS(reminderId);
        res.json(result);
        
    } catch (error) {
        console.error('Send test SMS error:', error);
        res.status(500).json({ message: 'Test SMS gönderilemedi' });
    }
});

// Aktif hatırlatıcıları listele
router.get('/active-reminders', auth, isLandlord, async (req, res) => {
    try {
        const result = await reminderService.getActiveReminders();
        res.json(result);
    } catch (error) {
        console.error('Get active reminders error:', error);
        res.status(500).json({ message: 'Aktif hatırlatıcılar alınamadı' });
    }
});

// SMS bakiye sorgula
router.get('/sms-balance', auth, isLandlord, async (req, res) => {
    try {
        const result = await reminderService.getSMSBalance();
        res.json(result);
    } catch (error) {
        console.error('Get SMS balance error:', error);
        res.status(500).json({ message: 'SMS bakiyesi sorgulanamadı' });
    }
});

// Manuel test için hatırlatıcı gönder
router.post('/send-test-reminder/:reminderId', auth, isLandlord, async (req, res) => {
    try {
        const { reminderId } = req.params;
        const reminder = await Reminder.findById(reminderId).populate('propertyId');
        
        if (!reminder) {
            return res.status(404).json({ message: 'Hatırlatıcı bulunamadı' });
        }
        
        // Hatırlatıcının bu kullanıcıya ait olduğunu kontrol et
        if (reminder.landlordId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu hatırlatıcıya erişim yetkiniz yok' });
        }
        
        const result = await reminderService.sendReminder(reminder);
        
        if (result.success) {
            res.json({ 
                message: 'Test hatırlatıcısı başarıyla gönderildi!', 
                nextSendDate: result.nextSendDate 
            });
        } else {
            res.status(500).json({ 
                message: 'Hatırlatıcı gönderilemedi', 
                error: result.error 
            });
        }
    } catch (error) {
        console.error('Send test reminder error:', error);
        res.status(500).json({ message: 'Test hatırlatıcısı gönderilirken hata oluştu' });
    }
});

module.exports = router; 