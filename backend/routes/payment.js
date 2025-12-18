const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Rent = require('../models/Rent');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Multer konfigürasyonu - dosya yükleme
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Sadece JPEG, PNG, GIF ve PDF dosyaları yüklenebilir'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Makbuz/dekont yükleme
router.post('/upload-receipt/:paymentId', auth, upload.single('receipt'), async (req, res) => {
    try {
        const { paymentId } = req.params;

        if (!req.file) {
            return res.status(400).json({ message: 'Dosya yüklenmedi' });
        }

        const payment = await Rent.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ message: 'Ödeme kaydı bulunamadı' });
        }

        // Yetki kontrolü
        if (req.user.userType === 'kiracı' && payment.tenantId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu ödeme için yetkiniz yok' });
        }
        if (req.user.userType === 'kiraya_veren' && payment.landlordId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu ödeme için yetkiniz yok' });
        }

        // Eski dosyayı sil
        if (payment.receipt && payment.receipt.path) {
            try {
                fs.unlinkSync(payment.receipt.path);
            } catch (error) {
                console.error('Eski dosya silinemedi:', error);
            }
        }

        // Yeni dosya bilgilerini kaydet
        payment.receipt = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: req.file.path,
            uploadedAt: new Date()
        };

        await payment.save();

        res.json({
            message: 'Makbuz/dekont başarıyla yüklendi',
            receipt: payment.receipt
        });

    } catch (error) {
        console.error('Upload receipt error:', error);
        res.status(500).json({ message: 'Dosya yüklenemedi' });
    }
});

// Makbuz/dekont indirme
router.get('/download-receipt/:paymentId', auth, async (req, res) => {
    try {
        const { paymentId } = req.params;

        const payment = await Rent.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ message: 'Ödeme kaydı bulunamadı' });
        }

        if (!payment.receipt || !payment.receipt.path) {
            return res.status(404).json({ message: 'Makbuz/dekont bulunamadı' });
        }

        // Yetki kontrolü
        if (req.user.userType === 'kiracı' && payment.tenantId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu ödeme için yetkiniz yok' });
        }
        if (req.user.userType === 'kiraya_veren' && payment.landlordId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu ödeme için yetkiniz yok' });
        }

        // Dosya var mı kontrolü
        if (!fs.existsSync(payment.receipt.path)) {
            return res.status(404).json({ message: 'Dosya bulunamadı' });
        }

        res.download(payment.receipt.path, payment.receipt.originalName);

    } catch (error) {
        console.error('Download receipt error:', error);
        res.status(500).json({ message: 'Dosya indirilemedi' });
    }
});

// Makbuz/dekont silme
router.delete('/delete-receipt/:paymentId', auth, async (req, res) => {
    try {
        const { paymentId } = req.params;

        const payment = await Rent.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ message: 'Ödeme kaydı bulunamadı' });
        }

        if (!payment.receipt || !payment.receipt.path) {
            return res.status(404).json({ message: 'Makbuz/dekont bulunamadı' });
        }

        // Yetki kontrolü
        if (req.user.userType === 'kiracı' && payment.tenantId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu ödeme için yetkiniz yok' });
        }
        if (req.user.userType === 'kiraya_veren' && payment.landlordId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu ödeme için yetkiniz yok' });
        }

        // Dosyayı sil
        try {
            fs.unlinkSync(payment.receipt.path);
        } catch (error) {
            console.error('Dosya silinemedi:', error);
        }

        // Veritabanından kaldır
        payment.receipt = undefined;
        await payment.save();

        res.json({ message: 'Makbuz/dekont silindi' });

    } catch (error) {
        console.error('Delete receipt error:', error);
        res.status(500).json({ message: 'Dosya silinemedi' });
    }
});

// Excel çıktısı alma (basit CSV formatında)
router.get('/export-excel', auth, async (req, res) => {
    try {
        const { year, month } = req.query;
        const filter = {};

        if (year) filter.year = parseInt(year);
        if (month) filter.month = parseInt(month);

        // Kullanıcı tipine göre filtreleme
        if (req.user.userType === 'kiracı') {
            filter.tenantId = req.user._id;
        } else if (req.user.userType === 'kiraya_veren') {
            filter.landlordId = req.user._id;
        }

        const payments = await Rent.find(filter)
            .populate('propertyId', 'title address')
            .populate('tenantId', 'name email')
            .populate('landlordId', 'name email')
            .sort({ dueDate: -1 });

        // CSV formatında veri oluştur
        let csvContent = 'Tarih,Ay,Yıl,Gayrimenkul,Kiracı,Kiraya Veren,Tutar,Durum,Ödeme Tarihi,Ödeme Yöntemi,Notlar\n';

        payments.forEach(payment => {
            const row = [
                payment.dueDate.toISOString().split('T')[0],
                payment.month,
                payment.year,
                `"${payment.propertyId?.title || ''}"`,
                `"${payment.tenantId?.name || ''}"`,
                `"${payment.landlordId?.name || ''}"`,
                payment.amount,
                payment.status,
                payment.paymentDate ? payment.paymentDate.toISOString().split('T')[0] : '',
                payment.paymentMethod || '',
                `"${payment.notes || ''}"`
            ].join(',');
            csvContent += row + '\n';
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=kira-odemeleri-${year || 'tum'}.csv`);
        res.send(csvContent);

    } catch (error) {
        console.error('Export Excel error:', error);
        res.status(500).json({ message: 'Excel çıktısı alınamadı' });
    }
});

// PDF çıktısı alma (basit HTML formatında)
router.get('/export-pdf', auth, async (req, res) => {
    try {
        const { year, month } = req.query;
        const filter = {};

        if (year) filter.year = parseInt(year);
        if (month) filter.month = parseInt(month);

        // Kullanıcı tipine göre filtreleme
        if (req.user.userType === 'kiracı') {
            filter.tenantId = req.user._id;
        } else if (req.user.userType === 'kiraya_veren') {
            filter.landlordId = req.user._id;
        }

        const payments = await Rent.find(filter)
            .populate('propertyId', 'title address')
            .populate('tenantId', 'name email')
            .populate('landlordId', 'name email')
            .sort({ dueDate: -1 });

        // Basit HTML raporu oluştur
        let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Kira Ödemeleri Raporu</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .header { text-align: center; margin-bottom: 30px; }
                .status-paid { color: green; }
                .status-pending { color: orange; }
                .status-overdue { color: red; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Kira Ödemeleri Raporu</h1>
                <p>Kullanıcı: ${req.user.name} (${req.user.userType})</p>
                <p>Tarih: ${new Date().toLocaleDateString('tr-TR')}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Tarih</th>
                        <th>Gayrimenkul</th>
                        <th>Kiracı</th>
                        <th>Kiraya Veren</th>
                        <th>Tutar</th>
                        <th>Durum</th>
                        <th>Ödeme Tarihi</th>
                    </tr>
                </thead>
                <tbody>
        `;

        payments.forEach(payment => {
            const statusClass = payment.status === 'ödendi' ? 'status-paid' : 
                              payment.status === 'bekliyor' ? 'status-pending' : 'status-overdue';
            
            htmlContent += `
                <tr>
                    <td>${payment.dueDate.toLocaleDateString('tr-TR')}</td>
                    <td>${payment.propertyId?.title || ''}</td>
                    <td>${payment.tenantId?.name || ''}</td>
                    <td>${payment.landlordId?.name || ''}</td>
                    <td>${payment.amount.toLocaleString('tr-TR')} ₺</td>
                    <td class="${statusClass}">${payment.status}</td>
                    <td>${payment.paymentDate ? payment.paymentDate.toLocaleDateString('tr-TR') : '-'}</td>
                </tr>
            `;
        });

        htmlContent += `
                </tbody>
            </table>
        </body>
        </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename=kira-raporu-${year || 'tum'}.html`);
        res.send(htmlContent);

    } catch (error) {
        console.error('Export PDF error:', error);
        res.status(500).json({ message: 'PDF çıktısı alınamadı' });
    }
});

module.exports = router; 