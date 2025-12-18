// Global variables
let currentUser = null;
let properties = [];
let payments = [];

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Tracking.js loaded successfully');
    
    // Ensure auth container is visible initially
    const authContainer = document.getElementById('authContainer');
    const dashboard = document.getElementById('dashboard');
    
    if (!authContainer || !dashboard) {
        console.error('Required elements not found:', { authContainer, dashboard });
        return;
    }
    
    console.log('Auth elements found:', { authContainer, dashboard });
    
    authContainer.style.display = 'flex';
    dashboard.style.display = 'none';
    
    // Ensure login form is visible by default
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabs = document.querySelectorAll('.auth-tab');
    
    loginForm.classList.add('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    tabs[0].classList.add('active');
    
    // Add form event listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // Check auth status after ensuring visibility
    checkAuthStatus();
    
    // Load user info from localStorage if available
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
        } catch (error) {
            console.error('Error parsing saved user:', error);
            localStorage.removeItem('user');
        }
    }
});

// Check if user is authenticated
async function checkAuthStatus() {
    const token = localStorage.getItem('token');
    
    if (token) {
        try {
            const response = await apiCall('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const user = await response.json();
                currentUser = user;
                showDashboard();
                loadDashboardData();
            } else {
                console.log('Token invalid, removing from localStorage');
                localStorage.removeItem('token');
                showAuth();
            }
        } catch (error) {
            console.error('Auth check error:', error);
            localStorage.removeItem('token');
            showAuth();
        }
    } else {
        // Check for Google OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const userInfo = urlParams.get('userInfo');
        
        if (token && userInfo) {
            localStorage.setItem('token', token);
            currentUser = JSON.parse(decodeURIComponent(userInfo));
            
            // Store user info in localStorage for persistence
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            showDashboard();
            loadDashboardData();
            
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else {
            console.log('No token found, showing auth form');
            showAuth();
        }
    }
}

// Show authentication form
function showAuth() {
    const authContainer = document.getElementById('authContainer');
    const dashboard = document.getElementById('dashboard');
    
    authContainer.classList.remove('hidden');
    authContainer.style.display = 'flex';
    dashboard.style.display = 'none';
}

// Show dashboard
function showDashboard() {
    const authContainer = document.getElementById('authContainer');
    const dashboard = document.getElementById('dashboard');
    
    authContainer.classList.add('hidden');
    authContainer.style.display = 'none';
    dashboard.style.display = 'block';
    
    if (currentUser) {
        updateUserDisplay(currentUser);
    }
}

// Update user display with avatar and details
function updateUserDisplay(user) {
    const userNameElement = document.getElementById('userName');
    const userEmailElement = document.getElementById('userEmail');
    const userAvatarElement = document.getElementById('userAvatar');
    
    if (userNameElement) {
        userNameElement.textContent = user.name || user.displayName || 'Ev Sahibi';
    }
    
    if (userEmailElement) {
        userEmailElement.textContent = user.email || '';
    }
    
    if (userAvatarElement && user.picture) {
        // Google OAuth profile picture
        userAvatarElement.innerHTML = `<img src="${user.picture}" alt="${user.name || user.displayName || 'Kullanıcı'}">`;
    } else if (userAvatarElement) {
        // Default avatar with user initials
        const initials = getUserInitials(user.name || user.displayName || 'E');
        userAvatarElement.innerHTML = `<span>${initials}</span>`;
        
        // Add a subtle animation
        userAvatarElement.style.animation = 'pulse 2s infinite';
    }
}

// Get user initials from name
function getUserInitials(name) {
    if (!name) return 'E';
    
    const names = name.split(' ');
    if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
    }
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

// Switch between login and register tabs
function switchTab(tab) {
    console.log('switchTab called with:', tab);
    
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabs = document.querySelectorAll('.auth-tab');
    
    if (!loginForm || !registerForm) {
        console.error('Form elements not found:', { loginForm, registerForm });
        return;
    }
    
    console.log('Form elements found:', { loginForm, registerForm, tabsCount: tabs.length });
    
    // Remove active class from all tabs and forms
    tabs.forEach(t => t.classList.remove('active'));
    loginForm.classList.remove('active');
    registerForm.classList.remove('active');
    
    if (tab === 'login') {
        loginForm.classList.add('active');
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        tabs[0].classList.add('active');
    } else {
        registerForm.classList.add('active');
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        tabs[1].classList.add('active');
    }
}

// Handle login form submission
async function handleLogin(e) {
            e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await apiCall('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            
            // Store user info in localStorage
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            showDashboard();
            loadDashboardData();
            showToast('Başarıyla giriş yapıldı!', 'success');
        } else {
            const error = await response.json();
            showToast(error.message || 'Giriş yapılamadı!', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Giriş yapılırken bir hata oluştu!', 'error');
    }
}

// Handle register form submission
async function handleRegister(e) {
            e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    try {
        const response = await apiCall('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        
        if (response.ok) {
            // Kayıt başarılı, kullanıcıyı login sayfasına yönlendir
            showToast('Başarıyla kayıt olundu! Şimdi giriş yapabilirsiniz.', 'success');
            
            // Login tab'ına geç
            switchTab('login');
            
            // Email'i login formuna doldur
            document.getElementById('loginEmail').value = email;
            
            // Login formuna odaklan
            document.getElementById('loginPassword').focus();
            
            // Register formunu temizle
            document.getElementById('registerForm').reset();
            
        } else {
            const error = await response.json();
            showToast(error.message || 'Kayıt olunamadı!', 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showToast('Kayıt olurken bir hata oluştu!', 'error');
    }
}

// Google OAuth login
function loginWithGoogle() {
    console.log('loginWithGoogle called');
    const backendUrl = API_CONFIG.getApiUrl();
    console.log('Redirecting to Google OAuth:', `${backendUrl}/auth/google`);
    window.location.href = `${backendUrl}/auth/google`;
}

// Logout
function secureLogout() {
    // Clear all sensitive data
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('properties');
    localStorage.removeItem('payments');
    
    currentUser = null;
    showAuth();
    showToast('Başarıyla çıkış yapıldı!', 'success');
}

// Keep original logout function for backward compatibility
function logout() {
    secureLogout();
}

// Load dashboard data
async function loadDashboardData() {
    await Promise.all([
        loadStatistics(),
        loadProperties(),
        loadPayments()
    ]);
}

// Load statistics
async function loadStatistics() {
    try {
        const token = localStorage.getItem('token');
        const response = await apiCall('/api/rent/statistics', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            updateStatistics(stats);
        }
    } catch (error) {
        console.error('Statistics error:', error);
    }
}

// Update statistics display
function updateStatistics(stats) {
    document.getElementById('totalProperties').textContent = stats.totalProperties || 0;
    document.getElementById('totalTenants').textContent = stats.totalTenants || 0;
    document.getElementById('pendingPayments').textContent = stats.pendingPayments || 0;
    document.getElementById('overduePayments').textContent = stats.overduePayments || 0;
}

// Load properties
async function loadProperties() {
    try {
        const token = localStorage.getItem('token');
        const response = await apiCall('/api/property/my-properties', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            properties = await response.json();
            displayProperties();
        }
    } catch (error) {
        console.error('Properties error:', error);
    }
}

// Display properties
function displayProperties() {
    const container = document.getElementById('propertiesList');
    
    if (properties.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">Henüz gayrimenkul eklenmemiş.</p>';
        return;
    }
    
    const propertiesHTML = properties.map(property => `
        <div class="property-card" style="background: white; border-radius: 15px; padding: 25px; margin-bottom: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                <h3 style="color: #1e293b; margin: 0;">${property.name}</h3>
                <span style="padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; background: ${property.status === 'occupied' ? '#d4edda' : '#f8d7da'}; color: ${property.status === 'occupied' ? '#155724' : '#721c24'};">${property.status === 'occupied' ? 'Kiracılı' : 'Boş'}</span>
            </div>
            <div style="margin-bottom: 15px;">
                <p style="color: #64748b; margin: 5px 0;"><strong>Adres:</strong> ${property.address}</p>
                <p style="color: #64748b; margin: 5px 0;"><strong>Tür:</strong> ${property.type}</p>
                <p style="color: #64748b; margin: 5px 0;"><strong>Kira:</strong> ₺${property.rent}</p>
                ${property.tenantName ? `<p style="color: #64748b; margin: 5px 0;"><strong>Kiracı:</strong> ${property.tenantName}</p>` : ''}
                ${property.tenantPhone ? `<p style="color: #64748b; margin: 5px 0;"><strong>Telefon:</strong> ${property.tenantPhone}</p>` : ''}
            </div>
            
            <!-- Hatırlatıcı Sistemi -->
            <div style="margin-bottom: 15px; padding: 15px; background: #f8fafc; border-radius: 10px;">
                <h4 style="color: #1e293b; margin-bottom: 10px; font-size: 1rem;">
                    <i class="fas fa-bell"></i> Hatırlatıcı Sistemi
                </h4>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button onclick="showAddReminderModal('${property._id}', '${property.name}')" style="padding: 8px 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
                        <i class="fas fa-plus"></i> Hatırlatıcı Ekle
                    </button>
                    <button onclick="viewReminders('${property._id}')" style="padding: 8px 12px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
                        <i class="fas fa-list"></i> Hatırlatıcıları Görüntüle
                    </button>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button onclick="showPaymentsHistory('${property._id}', '${property.name}')" style="padding: 8px 15px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-calendar-check"></i> Ödemeler
                </button>
                <button onclick="editProperty('${property._id}')" style="padding: 8px 15px; background: #B8860B; color: white; border: none; border-radius: 6px; cursor: pointer;">Düzenle</button>
                <button onclick="deleteProperty('${property._id}')" style="padding: 8px 15px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">Sil</button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = propertiesHTML;
}

// Show add property modal
function showAddPropertyModal() {
    console.log('showAddPropertyModal called');
    
    const modal = document.getElementById('addPropertyModal');
    if (!modal) {
        console.error('addPropertyModal not found');
        return;
    }
    
    console.log('Modal found:', modal);
    modal.style.display = 'block';
}

// Handle add property
async function handleAddProperty(e) {
    e.preventDefault();
    
            const formData = {
            name: document.getElementById('propertyName').value,
            address: document.getElementById('propertyAddress').value,
            type: document.getElementById('propertyType').value,
            rent: parseFloat(document.getElementById('propertyRent').value),
            dueDay: parseInt(document.getElementById('propertyDueDay').value),
            status: document.getElementById('propertyStatus').value,
            tenantName: document.getElementById('tenantName').value || null,
            tenantPhone: document.getElementById('tenantPhone').value || null
        };
    
    try {
        const token = localStorage.getItem('token');
        const response = await apiCall('/api/property/add-property', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            closeModal('addPropertyModal');
            showToast('Gayrimenkul başarıyla eklendi! Otomatik ödeme kayıtları oluşturuluyor...', 'success');
            loadProperties();
            loadStatistics();
            
            // Clear form
            e.target.reset();
        } else {
            const error = await response.json();
            showToast(error.message || 'Gayrimenkul eklenirken hata oluştu!', 'error');
        }
    } catch (error) {
        console.error('Add property error:', error);
        showToast('Gayrimenkul eklenirken bir hata oluştu!', 'error');
    }
}

// Delete property
async function deleteProperty(propertyId) {
    if (!confirm('Bu gayrimenkulü silmek istediğinizden emin misiniz?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await apiCall(`/api/property/delete-property/${propertyId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showToast('Gayrimenkul başarıyla silindi!', 'success');
            loadProperties();
            loadStatistics();
        } else {
            const error = await response.json();
            showToast(error.message || 'Gayrimenkul silinirken hata oluştu!', 'error');
        }
    } catch (error) {
        console.error('Delete property error:', error);
        showToast('Gayrimenkul silinirken bir hata oluştu!', 'error');
    }
}

// Load payments
async function loadPayments() {
    try {
        const token = localStorage.getItem('token');
        const response = await apiCall('/api/rent/my-payments', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            payments = await response.json();
            displayPayments();
        }
    } catch (error) {
        console.error('Payments error:', error);
    }
}

// Display payments
function displayPayments() {
    const container = document.getElementById('paymentsList');
    
    if (payments.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">Henüz ödeme kaydı bulunmuyor.</p>';
        return;
    }
    
    const paymentsHTML = `
        <div style="background: white; border-radius: 15px; padding: 25px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 2px solid #e2e8f0;">
                        <th style="padding: 15px; text-align: left; color: #1e293b; font-weight: 600;">Gayrimenkul</th>
                        <th style="padding: 15px; text-align: left; color: #1e293b; font-weight: 600;">Tür</th>
                        <th style="padding: 15px; text-align: left; color: #1e293b; font-weight: 600;">Tutar</th>
                        <th style="padding: 15px; text-align: left; color: #1e293b; font-weight: 600;">Vade Tarihi</th>
                        <th style="padding: 15px; text-align: left; color: #1e293b; font-weight: 600;">Durum</th>
                        <th style="padding: 15px; text-align: left; color: #1e293b; font-weight: 600;">İşlemler</th>
                    </tr>
                </thead>
                <tbody>
                    ${payments.map(payment => `
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 15px; color: #374151;">${payment.propertyId ? payment.propertyId.name : 'N/A'}</td>
                            <td style="padding: 15px; color: #374151;">${payment.isAidat ? 'Aidat' : 'Kira'}</td>
                            <td style="padding: 15px; color: #374151;">₺${payment.amount}</td>
                            <td style="padding: 15px; color: #374151;">${new Date(payment.dueDate).toLocaleDateString('tr-TR')}</td>
                            <td style="padding: 15px;">
                                <span style="padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; background: ${payment.status === 'paid' ? '#d4edda' : payment.status === 'pending' ? '#fff3cd' : '#f8d7da'}; color: ${payment.status === 'paid' ? '#155724' : payment.status === 'pending' ? '#856404' : '#721c24'};">${payment.status === 'paid' ? 'Ödendi' : payment.status === 'pending' ? 'Bekliyor' : 'Gecikmiş'}</span>
                            </td>
                            <td style="padding: 15px;">
                                <button onclick="editPayment('${payment._id}')" style="padding: 5px 10px; background: #B8860B; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 5px;">Düzenle</button>
                                <button onclick="deletePayment('${payment._id}')" style="padding: 5px 10px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">Sil</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = paymentsHTML;
}

// Show add payment modal
function showAddPaymentModal() {
    // Populate property select
    const propertySelect = document.getElementById('paymentProperty');
    propertySelect.innerHTML = '<option value="">Gayrimenkul Seçin</option>';
    
    properties.forEach(property => {
        propertySelect.innerHTML += `<option value="${property._id}">${property.name}</option>`;
    });
    
    document.getElementById('addPaymentModal').style.display = 'block';
}

// Handle add payment
async function handleAddPayment(e) {
    e.preventDefault();
    
    const formData = {
        propertyId: document.getElementById('paymentProperty').value,
        paymentType: document.getElementById('paymentType').value,
        amount: parseFloat(document.getElementById('paymentAmount').value),
        dueDate: document.getElementById('paymentDueDate').value,
        status: document.getElementById('paymentStatus').value,
        notes: document.getElementById('paymentNotes').value,
        isAidat: document.getElementById('paymentType').value === 'aidat'
    };
    
    try {
        const token = localStorage.getItem('token');
        const response = await apiCall('/api/rent/create-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            closeModal('addPaymentModal');
            showToast('Ödeme başarıyla eklendi!', 'success');
            loadPayments();
            loadStatistics();
            
            // Clear form
            e.target.reset();
        } else {
            const error = await response.json();
            showToast(error.message || 'Ödeme eklenirken hata oluştu!', 'error');
        }
    } catch (error) {
        console.error('Add payment error:', error);
        showToast('Ödeme eklenirken bir hata oluştu!', 'error');
    }
}

// Edit property
function editProperty(propertyId) {
    const property = properties.find(p => p._id === propertyId);
    if (!property) {
        showToast('Gayrimenkul bulunamadı!', 'error');
        return;
    }
    
    // Populate edit form
            document.getElementById('editPropertyId').value = property._id;
        document.getElementById('editPropertyName').value = property.name;
        document.getElementById('editPropertyAddress').value = property.address;
        document.getElementById('editPropertyType').value = property.type;
        document.getElementById('editPropertyRent').value = property.rent;
        document.getElementById('editPropertyDueDay').value = property.dueDay;
        document.getElementById('editPropertyStatus').value = property.status;
        document.getElementById('editTenantName').value = property.tenantName || '';
        document.getElementById('editTenantPhone').value = property.tenantPhone || '';
    
    // Show modal
    document.getElementById('editPropertyModal').style.display = 'block';
}

// Handle edit property
async function handleEditProperty(e) {
    e.preventDefault();
    
    const propertyId = document.getElementById('editPropertyId').value;
            const formData = {
            name: document.getElementById('editPropertyName').value,
            address: document.getElementById('editPropertyAddress').value,
            type: document.getElementById('editPropertyType').value,
            rent: parseFloat(document.getElementById('editPropertyRent').value),
            dueDay: parseInt(document.getElementById('editPropertyDueDay').value),
            status: document.getElementById('editPropertyStatus').value,
            tenantName: document.getElementById('editTenantName').value || null,
            tenantPhone: document.getElementById('editTenantPhone').value || null
        };
    
    try {
        const token = localStorage.getItem('token');
        const response = await apiCall(`/api/property/update-property/${propertyId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            closeModal('editPropertyModal');
            showToast('Gayrimenkul başarıyla güncellendi!', 'success');
            loadProperties();
            loadStatistics();
        } else {
            const error = await response.json();
            showToast(error.message || 'Gayrimenkul güncellenirken hata oluştu!', 'error');
        }
    } catch (error) {
        console.error('Edit property error:', error);
        showToast('Gayrimenkul güncellenirken bir hata oluştu!', 'error');
    }
}

// Edit payment
function editPayment(paymentId) {
    const payment = payments.find(p => p._id === paymentId);
    if (!payment) {
        showToast('Ödeme bulunamadı!', 'error');
        return;
    }
    
    // Populate property select
    const propertySelect = document.getElementById('editPaymentProperty');
    propertySelect.innerHTML = '<option value="">Gayrimenkul Seçin</option>';
    
    properties.forEach(property => {
        propertySelect.innerHTML += `<option value="${property._id}" ${property._id === payment.propertyId?._id ? 'selected' : ''}>${property.name}</option>`;
    });
    
    // Populate edit form
    document.getElementById('editPaymentId').value = payment._id;
    document.getElementById('editPaymentProperty').value = payment.propertyId?._id || '';
    document.getElementById('editPaymentType').value = payment.isAidat ? 'aidat' : 'rent';
    document.getElementById('editPaymentAmount').value = payment.amount;
    document.getElementById('editPaymentDueDate').value = new Date(payment.dueDate).toISOString().split('T')[0];
    document.getElementById('editPaymentStatus').value = payment.status;
    document.getElementById('editPaymentNotes').value = payment.notes || '';
    
    // Show modal
    document.getElementById('editPaymentModal').style.display = 'block';
}

// Handle edit payment
async function handleEditPayment(e) {
    e.preventDefault();
    
    const paymentId = document.getElementById('editPaymentId').value;
    const formData = {
        propertyId: document.getElementById('editPaymentProperty').value,
        amount: parseFloat(document.getElementById('editPaymentAmount').value),
        dueDate: document.getElementById('editPaymentDueDate').value,
        status: document.getElementById('editPaymentStatus').value,
        notes: document.getElementById('editPaymentNotes').value,
        isAidat: document.getElementById('editPaymentType').value === 'aidat'
    };
    
    try {
        const token = localStorage.getItem('token');
        const response = await apiCall(`/api/rent/update-payment/${paymentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            closeModal('editPaymentModal');
            showToast('Ödeme başarıyla güncellendi!', 'success');
            loadPayments();
            loadStatistics();
        } else {
            const error = await response.json();
            showToast(error.message || 'Ödeme güncellenirken hata oluştu!', 'error');
        }
    } catch (error) {
        console.error('Edit payment error:', error);
        showToast('Ödeme güncellenirken bir hata oluştu!', 'error');
    }
}

// Basit ödeme durumu değiştirme
async function togglePaymentStatus(propertyId, paymentType, status) {
    try {
        const token = localStorage.getItem('token');
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        
        // Bu ay için ödeme kaydı var mı kontrol et
        const response = await apiCall(`/api/rent/toggle-payment-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                propertyId,
                paymentType, // 'rent' veya 'aidat'
                status, // 'paid' veya 'pending'
                month: currentMonth,
                year: currentYear
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast(result.message, 'success');
            loadProperties(); // Sayfayı yenile
        } else {
            const error = await response.json();
            showToast(error.message || 'Ödeme durumu güncellenirken hata oluştu!', 'error');
        }
    } catch (error) {
        console.error('Toggle payment status error:', error);
        showToast('Ödeme durumu güncellenirken bir hata oluştu!', 'error');
    }
}

// Ödeme geçmişini göster
let currentPropertyId = null;
let currentPropertyName = null;

// Yıl dropdown'unu dinamik doldur
function fillYearDropdown() {
    const yearSelect = document.getElementById('paymentYear');
    if (!yearSelect) return;
    yearSelect.innerHTML = '';
    const currentYear = new Date().getFullYear();
    for (let y = 2020; y <= 2030; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === currentYear) opt.selected = true;
        yearSelect.appendChild(opt);
    }
}

async function showPaymentsHistory(propertyId, propertyName) {
    currentPropertyId = propertyId;
    currentPropertyName = propertyName;
    document.getElementById('paymentsHistoryTitle').textContent = `${propertyName} - Ödeme Geçmişi`;
    document.getElementById('paymentsHistoryModal').style.display = 'block';
    fillYearDropdown();
    await loadPaymentsHistory();
}

// Ödeme geçmişini yükle
async function loadPaymentsHistory() {
    if (!currentPropertyId) return;
    
    try {
        const token = localStorage.getItem('token');
        const year = document.getElementById('paymentYear').value;
        
        const response = await apiCall(`/api/rent/property-payments/${currentPropertyId}?year=${year}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayPaymentsHistory(data.payments, data.property);
        } else {
            showToast('Ödeme geçmişi yüklenirken hata oluştu!', 'error');
        }
    } catch (error) {
        console.error('Load payments history error:', error);
        showToast('Ödeme geçmişi yüklenirken bir hata oluştu!', 'error');
    }
}

// Ödeme geçmişini tabloda göster
function displayPaymentsHistory(payments, property) {
    const container = document.getElementById('paymentsHistoryTable');
    const year = document.getElementById('paymentYear').value;
    const months = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    let tableHTML = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 1rem;">
            <thead>
                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0;">Ay</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0;">Kira (₺${property.rent})</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0;">Durum</th>
                </tr>
            </thead>
            <tbody>
    `;
    for (let month = 1; month <= 12; month++) {
        const rentPayment = payments.find(p => p.month === month && !p.isAidat);
        const rentStatus = rentPayment ? rentPayment.status : 'pending';
        // Kira radyo butonları
        const rentRadios = ['paid','pending','overdue'].map(st => `
            <label style=\"margin-right: 10px;\">
                <input type=\"radio\" name=\"rent-${month}\" value=\"${st}\" ${rentStatus === st ? 'checked' : ''} onchange=\"changePaymentStatus(${month}, 'rent', '${st}')\">
                <span style=\"color:${st==='paid'?'#10b981':st==='overdue'?'#ef4444':'#f59e0b'};font-weight:600;\">${st==='paid'?'Ödendi':st==='overdue'?'Ödenmedi':'Bekliyor'}</span>
            </label>`).join('');
        tableHTML += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px; font-weight: 600;">${months[month-1]} ${year}</td>
                <td style="padding: 12px;">${rentRadios}</td>
                <td style="padding: 12px;">
                    <span style="padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; background: ${rentStatus === 'paid' ? '#d4edda' : rentStatus === 'overdue' ? '#fee2e2' : '#fff3cd'}; color: ${rentStatus === 'paid' ? '#155724' : rentStatus === 'overdue' ? '#b91c1c' : '#856404'};">
                        ${rentStatus === 'paid' ? '✅ Ödendi' : rentStatus === 'overdue' ? '❌ Ödenmedi' : '⏰ Bekliyor'}
                    </span>
                </td>
            </tr>
        `;
    }
    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
}
// Radyo ile ödeme durumu değiştirme
async function changePaymentStatus(month, paymentType, status) {
    try {
        const token = localStorage.getItem('token');
        const year = document.getElementById('paymentYear').value;
        const response = await apiCall(`/api/rent/toggle-payment-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                propertyId: currentPropertyId,
                paymentType,
                status,
                month,
                year: parseInt(year)
            })
        });
        if (response.ok) {
            const result = await response.json();
            showToast(result.message, 'success');
            await loadPaymentsHistory();
        } else {
            const error = await response.json();
            showToast(error.message || 'Ödeme durumu güncellenirken hata oluştu!', 'error');
        }
    } catch (error) {
        console.error('Change payment status error:', error);
        showToast('Ödeme durumu güncellenirken bir hata oluştu!', 'error');
    }
}

// Bu ay için ödeme kayıtları oluştur
async function generateMonthlyPayments() {
    try {
        const token = localStorage.getItem('token');
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        
        const response = await apiCall(`/api/rent/generate-monthly-payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                propertyId: currentPropertyId,
                month: currentMonth,
                year: currentYear
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast(result.message, 'success');
            await loadPaymentsHistory();
        } else {
            const error = await response.json();
            showToast(error.message || 'Aylık ödemeler oluşturulurken hata oluştu!', 'error');
        }
    } catch (error) {
        console.error('Generate monthly payments error:', error);
        showToast('Aylık ödemeler oluşturulurken bir hata oluştu!', 'error');
    }
}

// Gayrimenkul ödemelerini export et
async function exportPropertyPayments() {
    try {
        const token = localStorage.getItem('token');
        const year = document.getElementById('paymentYear').value;
        
        const response = await apiCall(`/api/rent/export-property-payments/${currentPropertyId}?year=${year}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentPropertyName}-${year}-odemeler.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showToast('Rapor başarıyla indirildi!', 'success');
        } else {
            showToast('Rapor indirilirken hata oluştu!', 'error');
        }
    } catch (error) {
        console.error('Export property payments error:', error);
        showToast('Rapor indirilirken bir hata oluştu!', 'error');
    }
}

// Hatırlatıcı Modal'ını Göster
function showAddReminderModal(propertyId, propertyName) {
    document.getElementById('reminderPropertyId').value = propertyId;
    document.getElementById('reminderModal').style.display = 'block';
    
    // Modal başlığını güncelle
    const modalSubtitle = document.getElementById('reminderModalSubtitle');
    if (modalSubtitle) {
        modalSubtitle.textContent = propertyName;
    }
    
    // Property bilgilerini bul ve SMS önizlemesini güncelle
    const property = properties.find(p => p._id === propertyId);
    if (property) {
        updateEmailPreview(property);
    }
    
    // Form alanlarına event listener ekle
    document.getElementById('reminderName').addEventListener('input', () => updateEmailPreview(property));
    document.getElementById('reminderDays').addEventListener('input', () => updateEmailPreview(property));
    document.getElementById('reminderMessage').addEventListener('input', () => updateEmailPreview(property));
}

// E-posta önizlemesini güncelle
function updateEmailPreview(property) {
    const emailText = `Sayın ${document.getElementById('reminderName').value || 'Ev Sahibi'},\n\n${property.name} gayrimenkulünüzün kira ödeme tarihi yaklaşıyor.\n\nTutar: ₺${property.rent}\n\n${document.getElementById('reminderMessage').value ? `\n${document.getElementById('reminderMessage').value}\n` : ''}\n\nEyüpoğlu&Işıkgör ev sahibi danışmanlığı tarafından gönderilen hatırlatma.`;
    
    const previewElement = document.getElementById('emailPreview');
    if (previewElement) {
        previewElement.innerHTML = emailText.replace(/\n/g, '<br>');
    }
}

// Hatırlatıcı Ekle
async function handleAddReminder(e) {
    e.preventDefault();
    const formData = {
        propertyId: document.getElementById('reminderPropertyId').value,
        ownerName: document.getElementById('reminderName').value,
        email: document.getElementById('reminderEmail').value,
        reminderDays: parseInt(document.getElementById('reminderDays').value),
        customMessage: document.getElementById('reminderMessage').value || null
    };
    try {
        const token = localStorage.getItem('token');
        const response = await apiCall('/api/reminders/add-reminder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        if (response.ok) {
            closeModal('reminderModal');
            showToast('Hatırlatıcı başarıyla eklendi!', 'success');
            e.target.reset();
        } else {
            const error = await response.json();
            showToast(error.message || 'Hatırlatıcı eklenirken hata oluştu!', 'error');
        }
    } catch (error) {
        console.error('Add reminder error:', error);
        showToast('Hatırlatıcı eklenirken bir hata oluştu!', 'error');
    }
}

// Hatırlatıcıları Görüntüle
async function viewReminders(propertyId) {
    try {
        const token = localStorage.getItem('token');
        const response = await apiCall(`/api/reminders/property-reminders/${propertyId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            showRemindersList(data.reminders, data.property);
        } else {
            showToast('Hatırlatıcılar yüklenirken hata oluştu!', 'error');
        }
    } catch (error) {
        console.error('View reminders error:', error);
        showToast('Hatırlatıcılar yüklenirken bir hata oluştu!', 'error');
    }
}

                // Hatırlatıcı Listesini Göster
                function showRemindersList(reminders, property) {
                    const modal = document.createElement('div');
                    modal.className = 'modal';
                    modal.style.display = 'block';
                    modal.innerHTML = `
                        <div class="modal-content" style="max-width: 700px;">
                            <div class="modal-header" style="background: linear-gradient(135deg, #B8860B, #DAA520); color: white; border-radius: 8px 8px 0 0; padding: 20px 25px;">
                                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                                    <div style="display: flex; align-items: center;">
                                        <div style="background: rgba(255,255,255,0.2); border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                                            <i class="fas fa-bell" style="font-size: 18px; color: white;"></i>
                                        </div>
                                        <div>
                                            <h3 style="margin: 0; font-size: 1.4rem; font-weight: 600; color: white;">Hatırlatıcılar</h3>
                                            <p style="margin: 5px 0 0 0; font-size: 0.9rem; color: rgba(255,255,255,0.9);">${property.name}</p>
                                        </div>
                                    </div>
                                    <button class="close-btn" onclick="this.closest('.modal').remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 1.5rem; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.3s;">&times;</button>
                                </div>
                            </div>
                            <div class="modal-body" style="padding: 25px;">
                                ${reminders.length === 0 ? 
                                    `<div style="text-align: center; padding: 40px 20px;">
                                        <div style="background: #f8fafc; border-radius: 12px; padding: 30px; border: 2px dashed #e2e8f0;">
                                            <i class="fas fa-bell-slash" style="font-size: 48px; color: #cbd5e1; margin-bottom: 15px;"></i>
                                            <h4 style="color: #64748b; margin: 10px 0;">Henüz Hatırlatıcı Yok</h4>
                                            <p style="color: #94a3b8; font-size: 14px;">Bu gayrimenkul için henüz hatırlatıcı eklenmemiş.</p>
                                        </div>
                                    </div>` :
                                    `<div style="display: grid; gap: 15px;">
                                        ${reminders.map(reminder => `
                                            <div style="background: linear-gradient(135deg, #f8fafc, #f1f5f9); border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; position: relative; transition: all 0.3s ease;">
                                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                                                    <div style="display: flex; align-items: center;">
                                                        <div style="background: linear-gradient(135deg, #B8860B, #DAA520); border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                                                            <i class="fas fa-user" style="font-size: 14px; color: white;"></i>
                                                        </div>
                                                        <div>
                                                            <h4 style="margin: 0; color: #1e293b; font-weight: 600; font-size: 16px;">${reminder.ownerName || 'Ev Sahibi'}</h4>
                                                            <p style="margin: 5px 0 0 0; color: #64748b; font-size: 13px;">
                                                                <i class="fas fa-calendar-alt" style="margin-right: 5px;"></i>
                                                                Ayın ${reminder.reminderDays}'si
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div style="display: flex; gap: 8px;">
                                                        <span style="padding: 4px 12px; background: ${reminder.isActive ? '#dcfce7' : '#f1f5f9'}; color: ${reminder.isActive ? '#166534' : '#64748b'}; border-radius: 20px; font-size: 12px; font-weight: 500;">
                                                            <i class="fas fa-${reminder.isActive ? 'check-circle' : 'pause-circle'}" style="margin-right: 4px;"></i>
                                                            ${reminder.isActive ? 'Aktif' : 'Pasif'}
                                                        </span>
                                                        <button onclick="sendTestReminder('${reminder._id}')" style="padding: 6px 12px; background: #0ea5e9; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; transition: background 0.3s; display: flex; align-items: center; gap: 5px;">
                                                            <i class="fas fa-paper-plane" style="font-size: 11px;"></i>
                                                            Test Gönder
                                                        </button>
                                                        <button onclick="deleteReminder('${reminder._id}')" style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; transition: background 0.3s; display: flex; align-items: center; gap: 5px;">
                                                            <i class="fas fa-trash" style="font-size: 11px;"></i>
                                                            Sil
                                                        </button>
                                                    </div>
                                                </div>
                                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                                                    <div style="background: white; border-radius: 8px; padding: 12px; border-left: 3px solid #0ea5e9;">
                                                        <p style="margin: 0; color: #64748b; font-size: 13px; font-weight: 500;">
                                                            <i class="fas fa-envelope" style="margin-right: 6px; color: #0ea5e9;"></i>
                                                            E-posta
                                                        </p>
                                                        <p style="margin: 5px 0 0 0; color: #1e293b; font-weight: 600; font-size: 14px;">${reminder.email}</p>
                                                    </div>
                                                    <div style="background: white; border-radius: 8px; padding: 12px; border-left: 3px solid #B8860B;">
                                                        <p style="margin: 0; color: #64748b; font-size: 13px; font-weight: 500;">
                                                            <i class="fas fa-clock" style="margin-right: 6px; color: #B8860B;"></i>
                                                            Saat
                                                        </p>
                                                        <p style="margin: 5px 0 0 0; color: #1e293b; font-weight: 600; font-size: 14px;">12:00</p>
                                                    </div>
                                                </div>
                                                ${reminder.customMessage ? `
                                                    <div style="background: white; border-radius: 8px; padding: 12px; border-left: 3px solid #B8860B; margin-bottom: 15px;">
                                                        <p style="margin: 0; color: #64748b; font-size: 13px; font-weight: 500;">
                                                            <i class="fas fa-comment" style="margin-right: 6px; color: #B8860B;"></i>
                                                            Özel Mesaj
                                                        </p>
                                                        <p style="margin: 5px 0 0 0; color: #1e293b; font-size: 14px; line-height: 1.4;">${reminder.customMessage}</p>
                                                    </div>
                                                ` : ''}
                                                <div style="background: #f0f9ff; border-radius: 8px; padding: 12px; border-left: 3px solid #0ea5e9;">
                                                    <p style="margin: 0; color: #0369a1; font-size: 13px; font-weight: 500;">
                                                        <i class="fas fa-info-circle" style="margin-right: 6px;"></i>
                                                        Sonraki Hatırlatma
                                                    </p>
                                                    <p style="margin: 5px 0 0 0; color: #0c4a6e; font-weight: 600; font-size: 14px;">
                                                        ${reminder.nextSendDate ? new Date(reminder.nextSendDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Hesaplanıyor...'}
                                                    </p>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>`
                                }
                            </div>
                        </div>
                    `;
                    
                    document.body.appendChild(modal);
                }

// Test hatırlatıcısı gönder
async function sendTestReminder(reminderId) {
    if (!confirm('Bu hatırlatıcıyı hemen göndermek istediğinizden emin misiniz?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await apiCall(`/api/reminders/send-test-reminder/${reminderId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast('Test hatırlatıcısı başarıyla gönderildi! E-posta kutunuzu kontrol edin.', 'success');
        } else {
            const error = await response.json();
            showToast(error.message || 'Test hatırlatıcısı gönderilemedi!', 'error');
        }
    } catch (error) {
        console.error('Send test reminder error:', error);
        showToast('Test hatırlatıcısı gönderilirken bir hata oluştu!', 'error');
    }
}

// Hatırlatıcı Sil
async function deleteReminder(reminderId) {
    if (!confirm('Bu hatırlatıcıyı silmek istediğinizden emin misiniz?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await apiCall(`/api/reminders/delete-reminder/${reminderId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showToast('Hatırlatıcı başarıyla silindi!', 'success');
            // Modal'ı yenile
            const modal = document.querySelector('.modal');
            if (modal) modal.remove();
        } else {
            const error = await response.json();
            showToast(error.message || 'Hatırlatıcı silinirken hata oluştu!', 'error');
        }
    } catch (error) {
        console.error('Delete reminder error:', error);
        showToast('Hatırlatıcı silinirken bir hata oluştu!', 'error');
    }
}

// Delete payment
async function deletePayment(paymentId) {
    if (!confirm('Bu ödemeyi silmek istediğinizden emin misiniz?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await apiCall(`/api/rent/delete-payment/${paymentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showToast('Ödeme başarıyla silindi!', 'success');
            loadPayments();
            loadStatistics();
            } else {
            const error = await response.json();
            showToast(error.message || 'Ödeme silinirken hata oluştu!', 'error');
        }
    } catch (error) {
        console.error('Delete payment error:', error);
        showToast('Ödeme silinirken bir hata oluştu!', 'error');
    }
}

// Export data
async function exportData() {
    try {
        const token = localStorage.getItem('token');
        const response = await apiCall('/api/rent/export', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'kira-raporu.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showToast('Rapor başarıyla indirildi!', 'success');
        } else {
            showToast('Rapor indirilirken hata oluştu!', 'error');
        }
    } catch (error) {
        console.error('Export error:', error);
        showToast('Rapor indirilirken bir hata oluştu!', 'error');
    }
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Modal click outside to close functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get all modals
    const modals = document.querySelectorAll('.modal');
    
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            // If click is on the modal backdrop (not the modal-content), close it
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Also add ESC key support
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            modals.forEach(modal => {
                if (modal.style.display === 'block' || window.getComputedStyle(modal).display === 'block') {
                    modal.style.display = 'none';
                }
            });
        }
    });
});