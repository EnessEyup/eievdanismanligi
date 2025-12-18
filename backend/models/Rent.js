const mongoose = require('mongoose');

const rentSchema = new mongoose.Schema({
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
    amount: {
        type: Number,
        required: [true, 'Ödeme tutarı zorunludur'],
        min: [0, 'Ödeme tutarı negatif olamaz']
    },
    dueDate: {
        type: Date,
        required: [true, 'Vade tarihi zorunludur']
    },
    paymentDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'overdue'],
        default: 'pending'
    },
    isAidat: {
        type: Boolean,
        default: false
    },
    month: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    year: {
        type: Number,
        required: true
    },
    notes: {
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

// Vade tarihi ve durum için index
rentSchema.index({ dueDate: 1, status: 1 });
rentSchema.index({ propertyId: 1, status: 1 });
rentSchema.index({ propertyId: 1, month: 1, year: 1, isAidat: 1 });

// Gecikme kontrolü
rentSchema.methods.isOverdue = function() {
    return this.dueDate < new Date() && this.status !== 'paid';
};

// Gecikme günü hesaplama
rentSchema.methods.getOverdueDays = function() {
    if (this.status === 'paid') return 0;
    const today = new Date();
    const dueDate = new Date(this.dueDate);
    const diffTime = today - dueDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
};

module.exports = mongoose.model('Rent', rentSchema); 