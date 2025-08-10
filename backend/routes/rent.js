const express = require('express');
const Rent = require('../models/Rent');
const Property = require('../models/Property');
const { auth, isLandlord } = require('../middleware/auth');

const router = express.Router();

// Kiraya verenin ödemelerini getir
router.get('/my-payments', auth, isLandlord, async (req, res) => {
    try {
        const payments = await Rent.find({ landlordId: req.user._id })
            .populate('propertyId', 'name address')
            .sort({ dueDate: -1 });

        // Property bilgisi ekle
        const paymentsWithPropertyInfo = payments.map(payment => {
            const paymentObj = payment.toObject();
            if (payment.propertyId) {
                paymentObj.propertyInfo = {
                    name: payment.propertyId.name,
                    address: payment.propertyId.address
                };
            }
            return paymentObj;
        });

        res.json(paymentsWithPropertyInfo);
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ message: 'Ödemeler alınamadı' });
    }
});

// Yeni ödeme oluştur (kiraya veren için)
router.post('/create-payment', auth, isLandlord, async (req, res) => {
    try {
        const {
            propertyId,
            amount,
            dueDate,
            isAidat,
            status,
            notes
        } = req.body;

        // Gayrimenkul kontrolü
        const property = await Property.findById(propertyId);
        if (!property || property.landlordId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu gayrimenkul için yetkiniz yok' });
        }

        const payment = new Rent({
            propertyId,
            landlordId: req.user._id,
            amount,
            dueDate: new Date(dueDate),
            isAidat: isAidat || false,
            status: status || 'pending',
            notes
        });

        await payment.save();

        const populatedPayment = await Rent.findById(payment._id)
            .populate('propertyId', 'name address');

        res.status(201).json({
            message: 'Ödeme kaydı oluşturuldu',
            payment: populatedPayment
        });

    } catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json({ message: 'Ödeme kaydı oluşturulamadı' });
    }
});

// Ödeme güncelle
router.put('/update-payment/:paymentId', auth, isLandlord, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { 
            propertyId, 
            amount, 
            dueDate, 
            status, 
            paymentDate, 
            notes, 
            isAidat 
        } = req.body;

        const payment = await Rent.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ message: 'Ödeme kaydı bulunamadı' });
        }

        if (payment.landlordId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu ödeme için yetkiniz yok' });
        }

        // Property kontrolü
        if (propertyId) {
            const property = await Property.findById(propertyId);
            if (!property || property.landlordId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Bu gayrimenkul için yetkiniz yok' });
            }
        }

        const updates = {};
        if (propertyId) updates.propertyId = propertyId;
        if (amount !== undefined) updates.amount = amount;
        if (dueDate) updates.dueDate = new Date(dueDate);
        if (status) updates.status = status;
        if (paymentDate) updates.paymentDate = new Date(paymentDate);
        if (notes !== undefined) updates.notes = notes;
        if (isAidat !== undefined) updates.isAidat = isAidat;

        const updatedPayment = await Rent.findByIdAndUpdate(
            paymentId,
            updates,
            { new: true, runValidators: true }
        )
        .populate('propertyId', 'name address');

        res.json({
            message: 'Ödeme güncellendi',
            payment: updatedPayment
        });

    } catch (error) {
        console.error('Update payment error:', error);
        res.status(500).json({ message: 'Ödeme güncellenemedi' });
    }
});

// Ödeme kaydını sil
router.delete('/delete-payment/:paymentId', auth, isLandlord, async (req, res) => {
    try {
        const { paymentId } = req.params;

        const payment = await Rent.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ message: 'Ödeme kaydı bulunamadı' });
        }

        if (payment.landlordId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu ödeme için yetkiniz yok' });
        }

        await Rent.findByIdAndDelete(paymentId);

        res.json({ message: 'Ödeme kaydı silindi' });

    } catch (error) {
        console.error('Delete payment error:', error);
        res.status(500).json({ message: 'Ödeme kaydı silinemedi' });
    }
});

// Ödeme istatistikleri
router.get('/statistics', auth, isLandlord, async (req, res) => {
    try {
        const payments = await Rent.find({ landlordId: req.user._id });
        const properties = await Property.find({ landlordId: req.user._id });

        const statistics = {
            totalProperties: properties.length,
            totalTenants: properties.filter(p => p.status === 'occupied').length,
            pendingPayments: payments.filter(p => p.status === 'pending').length,
            overduePayments: payments.filter(p => p.status === 'overdue').length,
            totalPayments: payments.length,
            totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
            paidAmount: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
            pendingAmount: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
            overdueAmount: payments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0)
        };

        res.json(statistics);

    } catch (error) {
        console.error('Statistics error:', error);
        res.status(500).json({ message: 'İstatistikler alınamadı' });
    }
});

// Basit ödeme durumu değiştirme
router.post('/toggle-payment-status', auth, isLandlord, async (req, res) => {
    try {
        const { propertyId, paymentType, status, month, year } = req.body;
        // Property kontrolü
        const property = await Property.findById(propertyId);
        if (!property || property.landlordId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu gayrimenkul için yetkiniz yok' });
        }
        // Bu ay için ödeme kaydı var mı kontrol et
        let payment = await Rent.findOne({
            propertyId,
            isAidat: false,
            month,
            year
        });
        if (!payment) {
            // Yeni ödeme kaydı oluştur
            const dueDate = new Date(year, month - 1, property.dueDay);
            const amount = property.rent;
            payment = new Rent({
                propertyId,
                landlordId: req.user._id,
                amount,
                dueDate,
                isAidat: false,
                status, // paid, pending, overdue
                month,
                year
            });
        } else {
            // Mevcut ödeme kaydını güncelle
            payment.status = status; // paid, pending, overdue
        }
        await payment.save();
        let statusText = 'Bekliyor';
        if (status === 'paid') statusText = 'Ödendi';
        if (status === 'overdue') statusText = 'Ödenmedi';
        const typeText = 'Kira';
        res.json({
            message: `${typeText} durumu "${statusText}" olarak güncellendi`,
            payment
        });
    } catch (error) {
        console.error('Toggle payment status error:', error);
        res.status(500).json({ message: 'Ödeme durumu güncellenemedi' });
    }
});

// Gayrimenkul ödeme geçmişini getir
router.get('/property-payments/:propertyId', auth, isLandlord, async (req, res) => {
    try {
        const { propertyId } = req.params;
        const { year } = req.query;
        
        // Property kontrolü
        const property = await Property.findById(propertyId);
        if (!property || property.landlordId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu gayrimenkul için yetkiniz yok' });
        }
        
        // O yıl için tüm ödemeleri getir
        const payments = await Rent.find({
            propertyId,
            year: parseInt(year)
        }).sort({ month: 1 });
        
        res.json({
            property,
            payments
        });
        
    } catch (error) {
        console.error('Get property payments error:', error);
        res.status(500).json({ message: 'Ödeme geçmişi alınamadı' });
    }
});

// Aylık ödeme kayıtları oluştur
router.post('/generate-monthly-payments', auth, isLandlord, async (req, res) => {
    try {
        const { propertyId, month, year } = req.body;
        
        // Property kontrolü
        const property = await Property.findById(propertyId);
        if (!property || property.landlordId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu gayrimenkul için yetkiniz yok' });
        }
        
        // Bu ay için kira kaydı var mı kontrol et
        let rentPayment = await Rent.findOne({
            propertyId,
            isAidat: false,
            month,
            year
        });
        
        if (!rentPayment) {
            rentPayment = new Rent({
                propertyId,
                landlordId: req.user._id,
                amount: property.rent,
                dueDate: new Date(year, month - 1, property.dueDay),
                isAidat: false,
                status: 'pending',
                month,
                year
            });
            await rentPayment.save();
        }
        
        res.json({
            message: `${month}. ay için kira kaydı oluşturuldu`,
            rentPayment
        });
        
    } catch (error) {
        console.error('Generate monthly payments error:', error);
        res.status(500).json({ message: 'Aylık ödemeler oluşturulamadı' });
    }
});

// Gayrimenkul ödemelerini export et
router.get('/export-property-payments/:propertyId', auth, isLandlord, async (req, res) => {
    try {
        const { propertyId } = req.params;
        const { year } = req.query;
        // Property kontrolü
        const property = await Property.findById(propertyId);
        if (!property || property.landlordId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu gayrimenkul için yetkiniz yok' });
        }
        // O yıl için tüm ödemeleri getir
        const payments = await Rent.find({
            propertyId,
            year: parseInt(year)
        }).sort({ month: 1 });
        const months = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];
        // CSV formatında veri hazırla
        let csvContent = '\uFEFFAy,Kira Durumu,Kira Tutarı\n';
        for (let month = 1; month <= 12; month++) {
            const rentPayment = payments.find(p => p.month === month && !p.isAidat);
            const rentStatus = rentPayment ? (rentPayment.status === 'paid' ? 'Ödendi' : rentPayment.status === 'overdue' ? 'Ödenmedi' : 'Bekliyor') : 'Bekliyor';
            csvContent += `"${months[month-1]} ${year}","${rentStatus}","₺${property.rent}"\n`;
        }
        res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
        res.setHeader('Content-Disposition', `attachment; filename=${property.name.replace(/\s+/g,'_')}-${year}-odemeler.csv`);
        res.send(csvContent);
    } catch (error) {
        console.error('Export property payments error:', error);
        res.status(500).json({ message: 'Rapor export edilemedi' });
    }
});

// Veri export et
router.get('/export', auth, isLandlord, async (req, res) => {
    try {
        const payments = await Rent.find({ landlordId: req.user._id })
            .populate('propertyId', 'name address')
            .sort({ dueDate: -1 });

        const properties = await Property.find({ landlordId: req.user._id });

        // CSV formatında veri hazırla
        let csvContent = 'Gayrimenkul,Tür,Tutar,Vade Tarihi,Durum,Notlar\n';
        
        payments.forEach(payment => {
            const propertyName = payment.propertyId ? payment.propertyId.name : 'N/A';
            const amount = payment.amount;
            const dueDate = new Date(payment.dueDate).toLocaleDateString('tr-TR');
            const status = payment.status === 'paid' ? 'Ödendi' : 
                          payment.status === 'pending' ? 'Bekliyor' : 'Gecikmiş';
            const notes = payment.notes || '';
            
            csvContent += `"${propertyName}","Kira","${amount}","${dueDate}","${status}","${notes}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=kira-raporu.csv');
        res.send(csvContent);

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ message: 'Veri export edilemedi' });
    }
});

module.exports = router; 