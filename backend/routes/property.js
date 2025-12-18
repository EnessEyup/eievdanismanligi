const express = require('express');
const Property = require('../models/Property');
const { auth, isLandlord } = require('../middleware/auth');

const router = express.Router();

// Kiraya verenin gayrimenkullerini getir
router.get('/my-properties', auth, isLandlord, async (req, res) => {
    try {
        const properties = await Property.find({ 
            landlordId: req.user._id
        });

        res.json(properties);
    } catch (error) {
        console.error('Get properties error:', error);
        res.status(500).json({ message: 'Gayrimenkuller alınamadı' });
    }
});

// Yeni gayrimenkul ekle (kiraya veren için)
router.post('/add-property', auth, isLandlord, async (req, res) => {
    try {
        const {
            name,
            address,
            type,
            rent,
            aidat,
            dueDay,
            status,
            tenantName,
            tenantPhone
        } = req.body;

        const property = new Property({
            landlordId: req.user._id,
            name,
            address,
            type,
            rent,
            aidat: aidat || 0,
            dueDay,
            status,
            tenantName: tenantName || null,
            tenantPhone: tenantPhone || null
        });

        await property.save();

        res.status(201).json({
            message: 'Gayrimenkul başarıyla eklendi',
            property
        });

    } catch (error) {
        console.error('Add property error:', error);
        res.status(500).json({ message: 'Gayrimenkul eklenemedi' });
    }
});

// Gayrimenkul güncelle
router.put('/update-property/:propertyId', auth, isLandlord, async (req, res) => {
    try {
        const { propertyId } = req.params;
        const updates = req.body;

        const property = await Property.findById(propertyId);
        if (!property) {
            return res.status(404).json({ message: 'Gayrimenkul bulunamadı' });
        }

        if (property.landlordId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu gayrimenkul için yetkiniz yok' });
        }

        const updatedProperty = await Property.findByIdAndUpdate(
            propertyId,
            updates,
            { new: true, runValidators: true }
        );

        res.json({
            message: 'Gayrimenkul güncellendi',
            property: updatedProperty
        });

    } catch (error) {
        console.error('Update property error:', error);
        res.status(500).json({ message: 'Gayrimenkul güncellenemedi' });
    }
});

// Gayrimenkul sil
router.delete('/delete-property/:propertyId', auth, isLandlord, async (req, res) => {
    try {
        const { propertyId } = req.params;

        const property = await Property.findById(propertyId);
        if (!property) {
            return res.status(404).json({ message: 'Gayrimenkul bulunamadı' });
        }

        if (property.landlordId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu gayrimenkul için yetkiniz yok' });
        }

        await Property.findByIdAndDelete(propertyId);

        res.json({ message: 'Gayrimenkul silindi' });

    } catch (error) {
        console.error('Delete property error:', error);
        res.status(500).json({ message: 'Gayrimenkul silinemedi' });
    }
});

module.exports = router; 