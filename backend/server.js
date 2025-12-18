const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session');

// Passport configuration
const passport = require('./config/passport');

// Routes
const authRoutes = require('./routes/auth');
const rentRoutes = require('./routes/rent');
const paymentRoutes = require('./routes/payment');
const propertyRoutes = require('./routes/property');
const reminderRoutes = require('./routes/reminders');
const whatsappRoutes = require('./routes/whatsapp');
const googleAuthRoutes = require('./routes/googleAuth');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: [
        'https://eievdanismanligi.com',
        'https://www.eievdanismanligi.com',
        'https://eievdanismanligi.vercel.app',
        'http://localhost:3000'
    ],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTPS Yönlendirmesi (Production için)
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
        res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
        next();
    }
});

// Session middleware (Google OAuth için gerekli)
app.use(session({
    secret: process.env.JWT_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // Production'da HTTPS zorunlu
        httpOnly: true, // XSS saldırılarına karşı koruma
        maxAge: 24 * 60 * 60 * 1000, // 24 saat
        sameSite: 'strict' // CSRF saldırılarına karşı koruma
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'eievdanismanligi-backend' 
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rent', rentRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/property', propertyRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/auth', googleAuthRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Ev Sahibi Danışmanlığı API',
        version: '1.0.0',
        endpoints: ['/api/auth', '/api/rent', '/api/property', '/api/reminders'],
        status: 'Running'
    });
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kira-takip', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB bağlantısı başarılı'))
.catch(err => console.error('MongoDB bağlantı hatası:', err));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Bir hata oluştu!' });
});

const PORT = process.env.PORT || 8080;
console.log('Port:', PORT);
console.log('Environment:', process.env.NODE_ENV);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server ${PORT} portunda çalışıyor`);
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
}); 