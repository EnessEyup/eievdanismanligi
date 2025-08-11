const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Google OAuth ile giriş başlat
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

// Google OAuth callback
router.get('/google/callback', passport.authenticate('google', { 
    failureRedirect: process.env.NODE_ENV === 'production' 
        ? 'https://eievdanismanligi.com/pages/tracking.html?error=google_auth_failed'
        : '/pages/tracking.html?error=google_auth_failed',
    session: false 
}), (req, res) => {
    try {
        // JWT token oluştur
        const token = jwt.sign(
            { 
                userId: req.user._id,
                email: req.user.email,
                userType: req.user.userType,
                name: req.user.name,
                profilePicture: req.user.profilePicture
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // User info'yu JSON olarak encode et
        const userInfo = JSON.stringify({
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            userType: req.user.userType,
            profilePicture: req.user.profilePicture
        });

        // Frontend domain'e yönlendir
        const frontendUrl = process.env.NODE_ENV === 'production' 
            ? 'https://eievdanismanligi.com'
            : 'http://localhost:3000';
        
        res.redirect(`${frontendUrl}/pages/tracking.html?token=${token}&userInfo=${encodeURIComponent(userInfo)}`);
    } catch (error) {
        console.error('Google auth callback error:', error);
        const frontendUrl = process.env.NODE_ENV === 'production' 
            ? 'https://eievdanismanligi.com'
            : 'http://localhost:3000';
        res.redirect(`${frontendUrl}/pages/tracking.html?error=token_creation_failed`);
    }
});

// Google OAuth durumunu kontrol et
router.get('/google/status', (req, res) => {
    res.json({ 
        message: 'Google OAuth aktif',
        clientId: process.env.GOOGLE_CLIENT_ID ? 'Yapılandırıldı' : 'Yapılandırılmadı'
    });
});

module.exports = router; 