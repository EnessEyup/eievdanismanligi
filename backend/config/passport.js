const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
require('dotenv').config();

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === 'production'
        ? "https://eievdanismanligi.onrender.com/auth/google/callback"
        : "http://localhost:3000/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Kullanıcının zaten var olup olmadığını kontrol et
        let user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
            // Kullanıcı varsa, Google bilgilerini güncelle
            user.googleId = profile.id;
            user.name = profile.displayName;
            user.profilePicture = profile.photos[0]?.value;
            await user.save();
            return done(null, user);
        }
        
        // Yeni kullanıcı oluştur
        user = new User({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            profilePicture: profile.photos[0]?.value,
            userType: 'kiraya_veren', // Varsayılan olarak kiraya veren
            isEmailVerified: true // Google ile giriş yapan kullanıcılar doğrulanmış sayılır
        });
        
        await user.save();
        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

module.exports = passport; 