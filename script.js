// Mobile menu toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// TÜFE oranları (örnek veriler - gerçek uygulamada API'den alınmalı)
const tufeRates = {
    '2024': 64.77,
    '2023': 64.27,
    '2022': 36.08,
    '2021': 19.60,
    '2020': 14.60
};

// Kira hesaplama fonksiyonu
function calculateRent() {
    const contractDate = document.getElementById('contract-date').value;
    const previousRent = parseFloat(document.getElementById('previous-rent').value);
    const resultDiv = document.getElementById('rent-result');

    if (!contractDate || !previousRent) {
        resultDiv.innerHTML = '<span style="color: red;">Lütfen tüm alanları doldurun.</span>';
        return;
    }

    const contractYear = new Date(contractDate).getFullYear();
    const currentYear = new Date().getFullYear();
    
    if (contractYear === currentYear) {
        resultDiv.innerHTML = '<span style="color: orange;">Bu yıl içinde yapılan sözleşmelerde henüz artış yapılamaz.</span>';
        return;
    }

    // Basit TÜFE hesaplaması (gerçek uygulamada daha karmaşık olacak)
    const tufeRate = tufeRates[currentYear] || 50; // Varsayılan oran
    const increaseRate = tufeRate / 100;
    const maxIncrease = previousRent * 0.25; // Maksimum %25 artış
    const tufeIncrease = previousRent * increaseRate;
    
    const actualIncrease = Math.min(tufeIncrease, maxIncrease);
    const newRent = previousRent + actualIncrease;
    const increasePercentage = (actualIncrease / previousRent * 100).toFixed(2);

    resultDiv.innerHTML = `
        <div style="text-align: left;">
            <strong>Hesaplama Sonucu:</strong><br>
            Önceki Kira: ${previousRent.toLocaleString('tr-TR')} TL<br>
            Artış Oranı: %${increasePercentage}<br>
            Artış Tutarı: ${actualIncrease.toLocaleString('tr-TR')} TL<br>
            <strong>Yeni Kira: ${newRent.toLocaleString('tr-TR')} TL</strong>
        </div>
    `;
}

// Borç hesaplama fonksiyonu
function calculateDebt() {
    const monthlyRent = parseFloat(document.getElementById('monthly-rent').value);
    const months = parseInt(document.getElementById('months').value);
    const paidAmount = parseFloat(document.getElementById('paid-amount').value);
    const resultDiv = document.getElementById('debt-result');

    if (!monthlyRent || !months || paidAmount === undefined) {
        resultDiv.innerHTML = '<span style="color: red;">Lütfen tüm alanları doldurun.</span>';
        return;
    }

    const totalRent = monthlyRent * months;
    const difference = totalRent - paidAmount;

    let resultText = '';
    let resultColor = '';

    if (difference > 0) {
        resultText = `
            <div style="text-align: left;">
                <strong>Borç Durumu:</strong><br>
                Olması Gereken: ${totalRent.toLocaleString('tr-TR')} TL<br>
                Ödenen: ${paidAmount.toLocaleString('tr-TR')} TL<br>
                <strong style="color: red;">Eksik: ${difference.toLocaleString('tr-TR')} TL</strong>
            </div>
        `;
    } else if (difference < 0) {
        resultText = `
            <div style="text-align: left;">
                <strong>Alacak Durumu:</strong><br>
                Olması Gereken: ${totalRent.toLocaleString('tr-TR')} TL<br>
                Ödenen: ${paidAmount.toLocaleString('tr-TR')} TL<br>
                <strong style="color: green;">Fazla: ${Math.abs(difference).toLocaleString('tr-TR')} TL</strong>
            </div>
        `;
    } else {
        resultText = `
            <div style="text-align: left;">
                <strong>Ödeme Durumu:</strong><br>
                <strong style="color: green;">Ödemeler tam ve eksiksiz!</strong><br>
                Toplam: ${totalRent.toLocaleString('tr-TR')} TL
            </div>
        `;
    }

    resultDiv.innerHTML = resultText;
}

// Form submission handler
document.querySelector('.contact-form form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Form verilerini topla
    const formData = new FormData(this);
    const formObject = {};
    formData.forEach((value, key) => {
        formObject[key] = value;
    });
    
    // Basit validasyon
    const requiredFields = this.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.style.borderColor = 'red';
            isValid = false;
        } else {
            field.style.borderColor = '#ddd';
        }
    });
    
    if (isValid) {
        // Gerçek uygulamada burada form verisi sunucuya gönderilir
        alert('Randevu talebiniz başarıyla alındı. En kısa sürede sizinle iletişime geçeceğiz.');
        this.reset();
    } else {
        alert('Lütfen tüm zorunlu alanları doldurun.');
    }
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Animate elements on scroll
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.tool-card, .service-card, .feature, .knowledge-card');
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Navbar background change on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.style.backgroundColor = 'rgba(44, 62, 80, 0.95)';
        navbar.style.backdropFilter = 'blur(10px)';
    } else {
        navbar.style.backgroundColor = '#2c3e50';
        navbar.style.backdropFilter = 'none';
    }
});