const axios = require('axios');
require('dotenv').config();

class SMSService {
  constructor() {
    this.apiKey = process.env.SMS_API_KEY || process.env.ILETIMERKEZI_API_KEY;
    this.apiHash = process.env.SMS_API_HASH || process.env.ILETIMERKEZI_HASH;
    this.sender = process.env.SMS_SENDER || process.env.ILETIMERKEZI_SENDER || 'APITEST';
    
    console.log('SMS Service initialized with:', {
      apiKey: this.apiKey ? 'Set' : 'Not set',
      hash: this.apiHash ? 'Set' : 'Not set',
      sender: this.sender
    });
  }

  async sendSMS(phone, message) {
    try {
      // Telefon numarasını düzelt (0 ile başlıyorsa kaldır)
      if (phone.startsWith('0')) {
        phone = phone.substring(1);
      }
      
      // GET yöntemi - en basit ve güvenilir
      const params = new URLSearchParams({
        key: this.apiKey,
        hash: this.apiHash,
        sender: this.sender,
        text: message,
        receipents: phone,
        iys: '1',  // IYS kontrolü aktif
        iysList: 'BIREYSEL'  // Bireysel liste
      });

      const url = `https://api.iletimerkezi.com/v1/send-sms/get/?${params.toString()}`;
      
      console.log('SMS gönderiliyor (GET):', {
        phone: phone,
        sender: this.sender,
        messageLength: message.length,
        message: message.substring(0, 100) + '...'
      });

      const response = await axios.get(url);
      console.log('İleti Merkezi response:', response.data);

      // Response kontrolü
      if (response.data && response.data.includes('<response>')) {
        // XML response parse et
        const codeMatch = response.data.match(/<code>(\d+)<\/code>/);
        const messageMatch = response.data.match(/<message>(.*?)<\/message>/);
        
        if (codeMatch && codeMatch[1] === '200') {
          const orderIdMatch = response.data.match(/<id>(\d+)<\/id>/);
          console.log('SMS başarıyla gönderildi. Order ID:', orderIdMatch ? orderIdMatch[1] : 'N/A');
          return {
            success: true,
            orderId: orderIdMatch ? orderIdMatch[1] : null,
            response: response.data
          };
        } else {
          const errorMessage = messageMatch ? messageMatch[1] : 'Bilinmeyen hata';
          console.error('SMS gönderimi başarısız:', errorMessage);
          return {
            success: false,
            error: errorMessage
          };
        }
      } else if (typeof response.data === 'string' && response.data.includes(':')) {
        // Eski format response (id:mesaj)
        const parts = response.data.split(':');
        if (parts[0] && parseInt(parts[0]) > 0) {
          console.log('SMS başarıyla gönderildi. Order ID:', parts[0]);
          return {
            success: true,
            orderId: parts[0],
            response: response.data
          };
        } else {
          console.error('SMS gönderimi başarısız:', response.data);
          return {
            success: false,
            error: response.data
          };
        }
      }
      
      return {
        success: false,
        error: 'Geçersiz API response'
      };
      
    } catch (error) {
      console.error('SMS gönderme hatası:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        
        // XML hata mesajını parse et
        if (error.response.data && error.response.data.includes('<message>')) {
          const errorMatch = error.response.data.match(/<message>(.*?)<\/message>/);
          if (errorMatch) {
            return {
              success: false,
              error: errorMatch[1]
            };
          }
        }
      }
      
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Alternatif: JSON POST yöntemi
  async sendSMSJSON(phone, message) {
    try {
      // Telefon numarasını düzelt
      if (phone.startsWith('0')) {
        phone = phone.substring(1);
      }

      const requestData = {
        request: {
          authentication: {
            key: this.apiKey,
            hash: this.apiHash
          },
          order: {
            sender: this.sender,
            sendDateTime: [],
            iys: '1',
            iysList: 'BIREYSEL',
            message: {
              text: message,
              receipents: {
                number: [phone]
              }
            }
          }
        }
      };

      console.log('SMS gönderiliyor (JSON):', {
        phone: phone,
        sender: this.sender
      });

      const response = await axios.post('https://api.iletimerkezi.com/v1/send-sms/json', requestData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('İleti Merkezi response (JSON):', response.data);

      if (response.data && response.data.response) {
        if (response.data.response.status.code === '200') {
          return {
            success: true,
            orderId: response.data.response.order?.id,
            response: response.data
          };
        } else {
          return {
            success: false,
            error: response.data.response.status.message
          };
        }
      }
      
      return {
        success: false,
        error: 'Geçersiz response'
      };
      
    } catch (error) {
      console.error('SMS gönderme hatası (JSON):', error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }
}

module.exports = new SMSService(); 