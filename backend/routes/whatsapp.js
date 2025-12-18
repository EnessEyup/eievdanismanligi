const express = require('express');
const router = express.Router();
const { auth, isLandlord } = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');
const Reminder = require('../models/Reminder');
const Property = require('../models/Property');

// WhatsApp webhook doğrulama
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verificationToken = whatsappService.verifyWebhook(mode, token, challenge);
  
  if (verificationToken) {
    res.status(200).send(verificationToken);
  } else {
    res.status(403).send('Forbidden');
  }
});

// WhatsApp webhook mesaj alma
router.post('/webhook', (req, res) => {
  const body = req.body;
  
  // Webhook doğrulama
  if (body.object === 'whatsapp_business_account') {
    const entry = body.entry[0];
    const changes = entry.changes[0];
    const value = changes.value;

    if (value.messages && value.messages.length > 0) {
      const message = whatsappService.processWebhook(body);
      
      if (message) {
        console.log('WhatsApp mesajı alındı:', message);
        
        // Burada gelen mesajları işleyebilirsiniz
        // Örneğin: "STOP" mesajı gelirse hatırlatmayı durdur
        if (message.text && message.text.toLowerCase() === 'stop') {
          // Hatırlatmayı durdur
          console.log('Kullanıcı hatırlatmayı durdurdu:', message.from);
        }
      }
    }
  }
  
  res.status(200).send('OK');
});

// WhatsApp test mesajı gönder
router.post('/send-test', auth, isLandlord, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ message: 'Telefon numarası gerekli' });
    }
    
    const result = await whatsappService.sendTestMessage(phoneNumber);
    
    if (result.success) {
      res.json({
        message: 'Test mesajı başarıyla gönderildi',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        message: 'Test mesajı gönderilemedi',
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Send test WhatsApp error:', error);
    res.status(500).json({ message: 'Test mesajı gönderilemedi' });
  }
});

// WhatsApp kira hatırlatması gönder
router.post('/send-rent-reminder', auth, isLandlord, async (req, res) => {
  try {
    const { phoneNumber, propertyName, rentAmount, dueDate, ownerName } = req.body;
    
    if (!phoneNumber || !propertyName || !rentAmount || !dueDate || !ownerName) {
      return res.status(400).json({ message: 'Tüm alanlar gerekli' });
    }
    
    const result = await whatsappService.sendRentReminder(
      phoneNumber, 
      propertyName, 
      rentAmount, 
      dueDate, 
      ownerName
    );
    
    if (result.success) {
      res.json({
        message: 'Kira hatırlatması başarıyla gönderildi',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        message: 'Kira hatırlatması gönderilemedi',
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Send rent reminder WhatsApp error:', error);
    res.status(500).json({ message: 'Kira hatırlatması gönderilemedi' });
  }
});

// WhatsApp aidat hatırlatması gönder
router.post('/send-aidat-reminder', auth, isLandlord, async (req, res) => {
  try {
    const { phoneNumber, propertyName, aidatAmount, dueDate, ownerName } = req.body;
    
    if (!phoneNumber || !propertyName || !aidatAmount || !dueDate || !ownerName) {
      return res.status(400).json({ message: 'Tüm alanlar gerekli' });
    }
    
    const result = await whatsappService.sendAidatReminder(
      phoneNumber, 
      propertyName, 
      aidatAmount, 
      dueDate, 
      ownerName
    );
    
    if (result.success) {
      res.json({
        message: 'Aidat hatırlatması başarıyla gönderildi',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        message: 'Aidat hatırlatması gönderilemedi',
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Send aidat reminder WhatsApp error:', error);
    res.status(500).json({ message: 'Aidat hatırlatması gönderilemedi' });
  }
});

// WhatsApp sözleşme yenileme hatırlatması gönder
router.post('/send-contract-reminder', auth, isLandlord, async (req, res) => {
  try {
    const { phoneNumber, propertyName, contractEndDate, ownerName } = req.body;
    
    if (!phoneNumber || !propertyName || !contractEndDate || !ownerName) {
      return res.status(400).json({ message: 'Tüm alanlar gerekli' });
    }
    
    const result = await whatsappService.sendContractRenewalReminder(
      phoneNumber, 
      propertyName, 
      contractEndDate, 
      ownerName
    );
    
    if (result.success) {
      res.json({
        message: 'Sözleşme yenileme hatırlatması başarıyla gönderildi',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        message: 'Sözleşme yenileme hatırlatması gönderilemedi',
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Send contract reminder WhatsApp error:', error);
    res.status(500).json({ message: 'Sözleşme yenileme hatırlatması gönderilemedi' });
  }
});

// WhatsApp hatırlatma ayarları
router.post('/update-reminder-preference', auth, isLandlord, async (req, res) => {
  try {
    const { reminderId, useWhatsapp } = req.body;
    
    const reminder = await Reminder.findById(reminderId);
    if (!reminder) {
      return res.status(404).json({ message: 'Hatırlatıcı bulunamadı' });
    }
    
    if (reminder.landlordId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Bu hatırlatıcı için yetkiniz yok' });
    }
    
    reminder.useWhatsapp = useWhatsapp;
    await reminder.save();
    
    res.json({
      message: 'Hatırlatma tercihi güncellendi',
      useWhatsapp: reminder.useWhatsapp
    });
    
  } catch (error) {
    console.error('Update reminder preference error:', error);
    res.status(500).json({ message: 'Hatırlatma tercihi güncellenemedi' });
  }
});

// WhatsApp durumu kontrol et
router.get('/status', auth, isLandlord, async (req, res) => {
  try {
    const status = {
      configured: !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ? 'Set' : 'Not set',
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN ? 'Set' : 'Not set'
    };
    
    res.json(status);
    
  } catch (error) {
    console.error('WhatsApp status error:', error);
    res.status(500).json({ message: 'WhatsApp durumu kontrol edilemedi' });
  }
});

module.exports = router; 