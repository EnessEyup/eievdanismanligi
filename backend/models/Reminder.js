const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
    propertyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: true
    },
    landlordId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ownerName: {
        type: String,
        required: [true, 'Ev sahibi adı zorunludur'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'E-posta adresi zorunludur'],
        trim: true
    },
    reminderDays: {
        type: Number,
        required: [true, 'Hatırlatma günü zorunludur'],
        min: [1, 'En az ayın 1\'i seçilebilir'],
        max: [31, 'En fazla ayın 31\'i seçilebilir']
    },
    customMessage: {
        type: String,
        trim: true,
        maxlength: [500, 'Özel mesaj en fazla 500 karakter olabilir']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastSentDate: {
        type: Date
    },
    nextSendDate: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Property ve landlord için index
reminderSchema.index({ propertyId: 1, landlordId: 1 });
reminderSchema.index({ nextSendDate: 1, isActive: 1 });

// Sonraki gönderim tarihini hesapla
reminderSchema.methods.calculateNextSendDate = function() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Bu ayın seçilen günü
    const thisMonthReminderDate = new Date(currentYear, currentMonth, this.reminderDays, 12, 0, 0);
    
    // Eğer bu ayın seçilen günü geçmişse, gelecek ayın seçilen günü
    const nextMonthReminderDate = new Date(currentYear, currentMonth + 1, this.reminderDays, 12, 0, 0);
    
    const reminderDate = thisMonthReminderDate > today ? thisMonthReminderDate : nextMonthReminderDate;
    
    return reminderDate;
};

// SMS mesajını oluştur
reminderSchema.methods.generateSMSMessage = function(property) {
    const baseMessage = `Sayın ${this.ownerName}, ${property.name} gayrimenkulünün kira ödeme tarihi yaklaşıyor. Tutar: ₺${property.rent}\n\nSiteye giriş yaparak ödeme durumunu güncelleyebilirsiniz.\n\nEyüpoğlu&Işıkgör ev sahibi danışmanlığı tarafından gönderilen hatırlatma`;
    
    if (this.customMessage) {
        return `${baseMessage}\n\n${this.customMessage}\n\nEyüpoğlu&Işıkgör ev sahibi danışmanlığı`;
    }
    
    return baseMessage;
};

module.exports = mongoose.model('Reminder', reminderSchema); 