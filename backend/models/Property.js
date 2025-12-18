const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
    landlordId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Gayrimenkul adı zorunludur'],
        trim: true
    },
    address: {
        type: String,
        required: [true, 'Adres zorunludur'],
        trim: true
    },
    type: {
        type: String,
        enum: ['daire', 'villa', 'dükkan', 'ofis', 'arsa'],
        default: 'daire'
    },
    rent: {
        type: Number,
        required: [true, 'Kira tutarı zorunludur'],
        min: [0, 'Kira tutarı negatif olamaz']
    },
    aidat: {
        type: Number,
        default: 0,
        min: [0, 'Aidat tutarı negatif olamaz']
    },
    dueDay: {
        type: Number,
        required: [true, 'Ödeme günü zorunludur'],
        min: [1, 'Ödeme günü 1-31 arasında olmalıdır'],
        max: [31, 'Ödeme günü 1-31 arasında olmalıdır']
    },
    status: {
        type: String,
        enum: ['vacant', 'occupied'],
        default: 'vacant'
    },
    tenantName: {
        type: String,
        trim: true
    },
    tenantPhone: {
        type: String,
        trim: true
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

// Kiraya veren için index
propertySchema.index({ landlordId: 1, status: 1 });

module.exports = mongoose.model('Property', propertySchema); 