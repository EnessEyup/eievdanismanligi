const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// JWT Token oluşturma
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET || 'your-super-secret-jwt-key',
        { expiresIn: '7d' }
    );
};

// Kullanıcı Kaydı
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, userType, phone, address } = req.body;

        // E-posta kontrolü
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanılıyor' });
        }

        // Yeni kullanıcı oluşturma
        const user = new User({
            name,
            email,
            password,
            userType,
            phone,
            address
        });

        await user.save();

        // Token oluşturma
        const token = generateToken(user._id);

        res.status(201).json({
            message: 'Kullanıcı başarıyla oluşturuldu',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                userType: user.userType,
                phone: user.phone,
                address: user.address
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Kayıt işlemi başarısız' });
    }
});

// Kullanıcı Girişi
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Kullanıcıyı bul
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Geçersiz e-posta veya şifre' });
        }

        // Şifre kontrolü
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Geçersiz e-posta veya şifre' });
        }

        // Hesap aktif mi kontrolü
        if (!user.isActive) {
            return res.status(401).json({ message: 'Hesabınız aktif değil' });
        }

        // Token oluşturma
        const token = generateToken(user._id);

        res.json({
            message: 'Giriş başarılı',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                userType: user.userType,
                phone: user.phone,
                address: user.address
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Giriş işlemi başarısız' });
    }
});

// Profil Bilgilerini Getir
router.get('/profile', auth, async (req, res) => {
    try {
        res.json({
            user: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                userType: req.user.userType,
                phone: req.user.phone,
                address: req.user.address,
                emailNotifications: req.user.emailNotifications,
                smsNotifications: req.user.smsNotifications,
                createdAt: req.user.createdAt
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ message: 'Profil bilgileri alınamadı' });
    }
});

// Profil Güncelleme
router.put('/profile', auth, async (req, res) => {
    try {
        const { name, phone, address, emailNotifications, smsNotifications } = req.body;

        const updates = {};
        if (name) updates.name = name;
        if (phone) updates.phone = phone;
        if (address) updates.address = address;
        if (emailNotifications !== undefined) updates.emailNotifications = emailNotifications;
        if (smsNotifications !== undefined) updates.smsNotifications = smsNotifications;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updates,
            { new: true, runValidators: true }
        );

        res.json({
            message: 'Profil başarıyla güncellendi',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                userType: user.userType,
                phone: user.phone,
                address: user.address,
                emailNotifications: user.emailNotifications,
                smsNotifications: user.smsNotifications
            }
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ message: 'Profil güncellenemedi' });
    }
});

// Şifre Değiştirme
router.put('/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Mevcut şifre kontrolü
        const isCurrentPasswordValid = await req.user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ message: 'Mevcut şifre yanlış' });
        }

        // Yeni şifre kontrolü
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Yeni şifre en az 6 karakter olmalıdır' });
        }

        // Şifreyi güncelle
        req.user.password = newPassword;
        await req.user.save();

        res.json({ message: 'Şifre başarıyla değiştirildi' });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ message: 'Şifre değiştirilemedi' });
    }
});

// Çıkış (Token'ı geçersiz kılma için)
router.post('/logout', auth, async (req, res) => {
    try {
        // JWT stateless olduğu için client tarafında token'ı silmek yeterli
        // Ama gelecekte blacklist eklenebilir
        res.json({ message: 'Başarıyla çıkış yapıldı' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Çıkış işlemi başarısız' });
    }
});

// Kullanıcı tipi güncelleme (Google OAuth için)
router.put('/update-user-type', async (req, res) => {
    try {
        const { userId, userType } = req.body;

        if (!userId || !userType) {
            return res.status(400).json({ message: 'Kullanıcı ID ve kullanıcı tipi gerekli' });
        }

        if (userType !== 'kiraya_veren') {
            return res.status(400).json({ message: 'Geçersiz kullanıcı tipi' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { userType },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }

        res.json({
            message: 'Kullanıcı tipi başarıyla güncellendi',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                userType: user.userType
            }
        });

    } catch (error) {
        console.error('Update user type error:', error);
        res.status(500).json({ message: 'Kullanıcı tipi güncellenemedi' });
    }
});

// Kullanıcı bilgilerini getir
router.get('/me', auth, async (req, res) => {
    try {
        res.json({
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            userType: req.user.userType,
            phone: req.user.phone,
            address: req.user.address,
            profilePicture: req.user.profilePicture,
            isEmailVerified: req.user.isEmailVerified,
            isActive: req.user.isActive
        });
    } catch (error) {
        console.error('Get user info error:', error);
        res.status(500).json({ message: 'Kullanıcı bilgileri alınamadı' });
    }
});

// Token oluşturma (Google OAuth için)
router.post('/create-token', async (req, res) => {
    try {
        const { userId, email, userType, name, profilePicture } = req.body;

        if (!userId || !email || !userType || !name) {
            return res.status(400).json({ message: 'Gerekli bilgiler eksik' });
        }

        const token = jwt.sign(
            { 
                userId,
                email,
                userType,
                name,
                profilePicture
            },
            process.env.JWT_SECRET || 'your-super-secret-jwt-key',
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Token başarıyla oluşturuldu',
            token
        });

    } catch (error) {
        console.error('Create token error:', error);
        res.status(500).json({ message: 'Token oluşturulamadı' });
    }
});


module.exports = router; 