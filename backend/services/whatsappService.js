const axios = require('axios');
require('dotenv').config();

class WhatsAppService {
  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    this.apiVersion = 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    
    console.log('WhatsApp Service initialized with:', {
      phoneNumberId: this.phoneNumberId ? 'Set' : 'Not set',
      accessToken: this.accessToken ? 'Set' : 'Not set'
    });
  }

  // WhatsApp mesajı gönder
  async sendMessage(phoneNumber, message, templateName = null) {
    try {
      // Telefon numarasını formatla (90 ile başlamalı)
      let formattedPhone = phoneNumber.replace(/\D/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '90' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('90')) {
        formattedPhone = '90' + formattedPhone;
      }

      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
      
      let payload;
      
      if (templateName) {
        // Template mesajı gönder
        payload = {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: 'tr'
            }
          }
        };
      } else {
        // Özel mesaj gönder
        payload = {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: {
            body: message
          }
        };
      }

      console.log('WhatsApp mesajı gönderiliyor:', {
        phone: formattedPhone,
        messageLength: message.length,
        template: templateName
      });

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('WhatsApp response:', response.data);

      if (response.data.messages && response.data.messages[0]) {
        return {
          success: true,
          messageId: response.data.messages[0].id,
          response: response.data
        };
      } else {
        return {
          success: false,
          error: 'Mesaj gönderilemedi'
        };
      }

    } catch (error) {
      console.error('WhatsApp gönderme hatası:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Kira hatırlatma mesajı gönder
  async sendRentReminder(phoneNumber, propertyName, rentAmount, dueDate, ownerName) {
    const message = `🏠 *Kira Ödeme Hatırlatması*

Merhaba ${ownerName},

${propertyName} gayrimenkulünüzün kira ödemesi yaklaşıyor.

💰 *Kira Tutarı:* ${rentAmount} TL
📅 *Son Ödeme Tarihi:* ${dueDate}

Ödemenizi zamanında yaparak sorun yaşamamanızı öneririz.

Ev Sahibi Danışmanlığı
📞 +90 212 555 1234
🌐 eievdanismanligi.com`;

    return await this.sendMessage(phoneNumber, message);
  }

  // Aidat hatırlatma mesajı gönder
  async sendAidatReminder(phoneNumber, propertyName, aidatAmount, dueDate, ownerName) {
    const message = `🏢 *Aidat Ödeme Hatırlatması*

Merhaba ${ownerName},

${propertyName} gayrimenkulünüzün aidat ödemesi yaklaşıyor.

💰 *Aidat Tutarı:* ${aidatAmount} TL
📅 *Son Ödeme Tarihi:* ${dueDate}

Aidat ödemenizi zamanında yaparak sorun yaşamamanızı öneririz.

Ev Sahibi Danışmanlığı
📞 +90 212 555 1234
🌐 eievdanismanligi.com`;

    return await this.sendMessage(phoneNumber, message);
  }

  // Sözleşme yenileme hatırlatması
  async sendContractRenewalReminder(phoneNumber, propertyName, contractEndDate, ownerName) {
    const message = `📋 *Sözleşme Yenileme Hatırlatması*

Merhaba ${ownerName},

${propertyName} gayrimenkulünüzün kira sözleşmesi yakında sona erecek.

📅 *Sözleşme Bitiş Tarihi:* ${contractEndDate}

Sözleşme yenileme işlemlerinizi zamanında yapmanızı öneririz.

Ev Sahibi Danışmanlığı
📞 +90 212 555 1234
🌐 eievdanismanligi.com`;

    return await this.sendMessage(phoneNumber, message);
  }

  // Test mesajı gönder
  async sendTestMessage(phoneNumber) {
    const message = `🧪 *Test Mesajı*

Bu bir test mesajıdır. WhatsApp hatırlatma sisteminiz başarıyla çalışıyor!

Ev Sahibi Danışmanlığı
📞 +90 212 555 1234
🌐 eievdanismanligi.com`;

    return await this.sendMessage(phoneNumber, message);
  }

  // Webhook doğrulama
  verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === this.verifyToken) {
      return challenge;
    }
    return null;
  }

  // Webhook mesajını işle
  processWebhook(body) {
    try {
      if (body.object === 'whatsapp_business_account') {
        const entry = body.entry[0];
        const changes = entry.changes[0];
        const value = changes.value;

        if (value.messages && value.messages.length > 0) {
          const message = value.messages[0];
          return {
            from: message.from,
            messageType: message.type,
            timestamp: message.timestamp,
            text: message.text ? message.text.body : null
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Webhook işleme hatası:', error);
      return null;
    }
  }
}

module.exports = new WhatsAppService(); 