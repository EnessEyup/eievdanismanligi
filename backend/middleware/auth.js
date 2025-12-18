const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Yetkilendirme token\'ı bulunamadı' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key');
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({ message: 'Geçersiz token' });
        }

        if (!user.isActive) {
            return res.status(401).json({ message: 'Hesabınız aktif değil' });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ message: 'Geçersiz token' });
    }
};

// Kullanıcı tipi kontrolü
const checkUserType = (allowedTypes) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Yetkilendirme gerekli' });
        }

        if (!allowedTypes.includes(req.user.userType)) {
            return res.status(403).json({ 
                message: 'Bu işlem için yetkiniz bulunmamaktadır' 
            });
        }

        next();
    };
};

// Kiraya veren kontrolü
const isLandlord = checkUserType(['kiraya_veren']);

// Her iki tip de (sadece ev sahipleri için)
const isAnyUser = checkUserType(['kiraya_veren']);

module.exports = {
    auth,
    isLandlord,
    isAnyUser
}; 