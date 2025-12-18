// Calculator functionality for Eyüpoğlu & Işıkgör Platform

class RentCalculator {
    constructor() {
        this.tufeRates = {
            2024: 64.77,
            2023: 64.27,
            2022: 36.08,
            2021: 19.60,
            2020: 14.60
        };
        this.maxIncreaseRate = 25; // Maximum legal increase rate
        this.init();
    }

    init() {
        this.initTufeCalculator();
        this.initPaymentCalculator();
        this.initProjectionCalculator();
        this.initChart();
    }

    // TÜFE Kira Hesaplayıcı
    initTufeCalculator() {
        const form = document.getElementById('tufe-calculator');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.calculateTufeIncrease();
        });

        // Set default contract date to 1 year ago
        const contractDateInput = document.getElementById('contract-date');
        if (contractDateInput) {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            contractDateInput.value = oneYearAgo.toISOString().split('T')[0];
        }
    }

    calculateTufeIncrease() {
        const contractDate = document.getElementById('contract-date').value;
        const currentRent = parseFloat(document.getElementById('current-rent').value);
        const tufeRate = parseFloat(document.getElementById('tufe-rate').value);
        const resultPanel = document.getElementById('tufe-result');

        if (!contractDate || !currentRent || !tufeRate) {
            this.showError(resultPanel, 'Lütfen tüm alanları doldurun.');
            return;
        }

        // Calculate time difference
        const contractYear = new Date(contractDate).getFullYear();
        const currentYear = new Date().getFullYear();
        const contractAnniversary = new Date(contractDate);
        contractAnniversary.setFullYear(currentYear);

        // Check if increase is due
        const today = new Date();
        const monthsDiff = this.getMonthsDifference(new Date(contractDate), today);

        if (monthsDiff < 12) {
            this.showWarning(resultPanel, 
                `Kira artışı için henüz erken. Sözleşme tarihinden ${12 - monthsDiff} ay daha geçmesi gerekiyor.`,
                {
                    'Sözleşme Tarihi': this.formatDate(contractDate),
                    'Bir Sonraki Artış Tarihi': this.formatDate(contractAnniversary),
                    'Mevcut Kira': this.formatCurrency(currentRent)
                }
            );
            return;
        }

        // Calculate increase
        const tufeIncrease = (currentRent * tufeRate) / 100;
        const maxAllowedIncrease = (currentRent * this.maxIncreaseRate) / 100;
        const actualIncrease = Math.min(tufeIncrease, maxAllowedIncrease);
        const newRent = currentRent + actualIncrease;
        const effectiveRate = (actualIncrease / currentRent) * 100;

        const isLimited = tufeIncrease > maxAllowedIncrease;

        this.showSuccess(resultPanel, 'Kira Artışı Hesaplandı', {
            'Mevcut Kira': this.formatCurrency(currentRent),
            'TÜFE Oranı': `%${tufeRate}`,
            'TÜFE\'ye Göre Artış': this.formatCurrency(tufeIncrease),
            'Yasal Maksimum Artış': this.formatCurrency(maxAllowedIncrease),
            'Uygulanacak Artış': this.formatCurrency(actualIncrease),
            'Efektif Artış Oranı': `%${effectiveRate.toFixed(2)}`,
            'Yeni Kira Bedeli': this.formatCurrency(newRent)
        }, isLimited ? 'Artış yasal limit (%25) ile sınırlandırılmıştır.' : null);
    }

    // Eksik Ödeme Hesaplayıcı
    initPaymentCalculator() {
        const form = document.getElementById('payment-calculator');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.calculatePaymentDifference();
        });
    }

    calculatePaymentDifference() {
        const monthlyRent = parseFloat(document.getElementById('monthly-rent').value);
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const paidAmount = parseFloat(document.getElementById('paid-amount').value);
        const resultPanel = document.getElementById('payment-result');

        if (!monthlyRent || !startDate || !endDate || paidAmount === undefined) {
            this.showError(resultPanel, 'Lütfen tüm alanları doldurun.');
            return;
        }

        // Calculate months between dates
        const months = this.getMonthsDifference(new Date(startDate), new Date(endDate));
        if (months <= 0) {
            this.showError(resultPanel, 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır.');
            return;
        }

        const totalRentDue = monthlyRent * months;
        const difference = totalRentDue - paidAmount;

        let resultType, title, note;
        if (Math.abs(difference) < 0.01) {
            resultType = 'success';
            title = 'Ödemeler Eksiksiz';
            note = 'Tüm kira ödemeleriniz tam ve zamanında yapılmış.';
        } else if (difference > 0) {
            resultType = 'error';
            title = 'Eksik Ödeme Tespit Edildi';
            note = 'Eksik ödeme miktarı yasal faizi ile birlikte talep edilebilir.';
        } else {
            resultType = 'warning';
            title = 'Fazla Ödeme Tespit Edildi';
            note = 'Fazla ödenen miktar iade talep edilebilir.';
        }

        const resultData = {
            'Dönem': `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`,
            'Ay Sayısı': `${months} ay`,
            'Aylık Kira': this.formatCurrency(monthlyRent),
            'Ödenecek Toplam': this.formatCurrency(totalRentDue),
            'Ödenen Toplam': this.formatCurrency(paidAmount),
            'Fark': `${difference > 0 ? 'Eksik: ' : 'Fazla: '}${this.formatCurrency(Math.abs(difference))}`
        };

        if (resultType === 'success') {
            this.showSuccess(resultPanel, title, resultData, note);
        } else if (resultType === 'error') {
            this.showError(resultPanel, title, resultData, note);
        } else {
            this.showWarning(resultPanel, title, resultData, note);
        }
    }

    // Kira Artış Simülatörü
    initProjectionCalculator() {
        const form = document.getElementById('projection-calculator');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.calculateProjection();
        });
    }

    calculateProjection() {
        const baseRent = parseFloat(document.getElementById('base-rent').value);
        const projectionYears = parseInt(document.getElementById('projection-years').value);
        const annualIncrease = parseFloat(document.getElementById('annual-increase').value);
        const resultPanel = document.getElementById('projection-result');

        if (!baseRent || !projectionYears || !annualIncrease) {
            this.showError(resultPanel, 'Lütfen tüm alanları doldurun.');
            return;
        }

        if (annualIncrease > this.maxIncreaseRate) {
            this.showWarning(resultPanel, 
                `Yasal limit %${this.maxIncreaseRate} olduğu için hesaplama bu oranla yapılacaktır.`,
                { 'Girilen Oran': `%${annualIncrease}`, 'Kullanılan Oran': `%${this.maxIncreaseRate}` }
            );
        }

        const effectiveRate = Math.min(annualIncrease, this.maxIncreaseRate);
        const projectionData = this.generateProjectionTable(baseRent, projectionYears, effectiveRate);

        this.showProjection(resultPanel, projectionData, effectiveRate);
    }

    generateProjectionTable(baseRent, years, rate) {
        const data = [];
        let currentRent = baseRent;
        
        data.push({
            year: 'Başlangıç',
            rent: currentRent,
            increase: 0,
            cumulativeIncrease: 0
        });

        for (let i = 1; i <= years; i++) {
            const increase = (currentRent * rate) / 100;
            currentRent += increase;
            const cumulativeIncrease = currentRent - baseRent;
            
            data.push({
                year: `${i}. Yıl`,
                rent: currentRent,
                increase: increase,
                cumulativeIncrease: cumulativeIncrease
            });
        }

        return data;
    }

    showProjection(panel, data, rate) {
        const finalRent = data[data.length - 1].rent;
        const totalIncrease = finalRent - data[0].rent;
        const totalPercentage = ((totalIncrease / data[0].rent) * 100);

        let html = `
            <div class="result-title">
                <i class="fas fa-chart-line"></i>
                Kira Artış Projeksiyonu
            </div>
            <div class="result-summary" style="margin-bottom: 24px; padding: 16px; background: var(--primary-gold); color: var(--primary-brown); border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">
                    ${this.formatCurrency(finalRent)}
                </div>
                <div style="font-size: 14px; opacity: 0.8;">
                    ${data.length - 1} yıl sonraki tahmini kira bedeli
                </div>
            </div>
            <table class="projection-table">
                <thead>
                    <tr>
                        <th>Dönem</th>
                        <th>Kira Bedeli</th>
                        <th>Yıllık Artış</th>
                        <th>Toplam Artış</th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.forEach(row => {
            html += `
                <tr>
                    <td class="year-column">${row.year}</td>
                    <td class="amount-column">${this.formatCurrency(row.rent)}</td>
                    <td>${row.increase > 0 ? this.formatCurrency(row.increase) : '-'}</td>
                    <td>${row.cumulativeIncrease > 0 ? this.formatCurrency(row.cumulativeIncrease) : '-'}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
            <div style="margin-top: 16px; padding: 12px; background: var(--gray-100); border-radius: 8px; font-size: 14px; color: var(--gray-600);">
                <strong>Not:</strong> Bu projeksiyon yıllık %${rate} artış oranı baz alınarak hazırlanmıştır. 
                Gerçek artış oranları TÜFE ve yasal düzenlemelere göre değişiklik gösterebilir.
            </div>
        `;

        panel.innerHTML = html;
        panel.className = 'result-panel show success';
    }

    // Utility methods for showing results
    showSuccess(panel, title, data = {}, note = null) {
        this.showResult(panel, title, data, note, 'success');
    }

    showError(panel, title, data = {}, note = null) {
        this.showResult(panel, title, data, note, 'error');
    }

    showWarning(panel, title, data = {}, note = null) {
        this.showResult(panel, title, data, note, 'warning');
    }

    showResult(panel, title, data, note, type) {
        let html = `
            <div class="result-title">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
                ${title}
            </div>
        `;

        if (Object.keys(data).length > 0) {
            Object.entries(data).forEach(([key, value]) => {
                html += `
                    <div class="result-item">
                        <span class="result-label">${key}:</span>
                        <span class="result-value">${value}</span>
                    </div>
                `;
            });
        }

        if (note) {
            html += `
                <div style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.7); border-radius: 8px; font-size: 14px;">
                    <strong>Not:</strong> ${note}
                </div>
            `;
        }

        panel.innerHTML = html;
        panel.className = `result-panel show ${type}`;
    }

    // Chart initialization
    initChart() {
        const canvas = document.getElementById('rentChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Sample data for the chart
        const years = ['2020', '2021', '2022', '2023', '2024'];
        const tufeRates = [14.6, 19.6, 36.08, 64.27, 64.77];
        const maxRate = Array(years.length).fill(25);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: 'TÜFE Oranı (%)',
                    data: tufeRates,
                    borderColor: '#D4AF37',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Yasal Maksimum (%)',
                    data: maxRate,
                    borderColor: '#8B4513',
                    backgroundColor: 'rgba(139, 69, 19, 0.1)',
                    borderDash: [5, 5],
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'TÜFE Oranları vs Yasal Maksimum Artış',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#8B4513'
                    },
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 70,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        },
                        title: {
                            display: true,
                            text: 'Artış Oranı (%)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Yıl'
                        }
                    }
                }
            }
        });
    }

    // Utility methods
    getMonthsDifference(date1, date2) {
        const monthDiff = (date2.getFullYear() - date1.getFullYear()) * 12 + 
                         (date2.getMonth() - date1.getMonth());
        return Math.max(0, monthDiff);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    formatDate(dateString) {
        return new Intl.DateTimeFormat('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(dateString));
    }
}

// Initialize calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.rentCalculator = new RentCalculator();
});