// dashboard.js - Integrado con Backend
import { api, getCurrentUser, removeAuthToken } from './api-config.js';

let currentUser = null;
let accounts = [];
let cards = [];

// ----------- Verificar autenticación -----------
function checkAuth() {
    currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = window.location.origin + '/index.html';
        return false;
    }
    return true;
}

// ----------- Data Loading -----------
async function loadAccounts() {
    try {
        // Sin userId en query, el backend usa automáticamente el del JWT
        const response = await api.get('/accounts', {
            requiresAuth: true,
            redirectOnNoAuth: true
        });

        if (response.success && response.data) {
            return response.data;
        }
        return [];
    } catch (error) {
        console.error('Error loading accounts:', error);
        return [];
    }
}

async function loadCards() {
    try {
        const response = await api.get(`/cards?userId=${currentUser.id}`, {
            requiresAuth: true,
            redirectOnNoAuth: true
        });

        if (response.success && response.data) {
            return response.data;
        }
        return [];
    } catch (error) {
        console.error('Error loading cards:', error);
        return [];
    }
}

async function loadAccountMovements(accountId, page = 1, pageSize = 5) {
    try {
        const response = await api.get(
            `/accounts/${accountId}/movements?page=${page}&pageSize=${pageSize}`,
            {
                requiresAuth: true,
                redirectOnNoAuth: true
            }
        );

        if (response.success && response.data) {
            return response.data.items || [];
        }
        return [];
    } catch (error) {
        console.error('Error loading movements:', error);
        return [];
    }
}

// ----------- Initialization -----------
async function init() {
    showLoading(true);
    
    try {
        if (!checkAuth()) return;

        // Cargar datos del usuario
        const [allAccounts, allCards] = await Promise.all([
            loadAccounts(),
            loadCards()
        ]);

        accounts = allAccounts;
        cards = allCards;

        setupUI();
        setupNavigation();
        setupEventListeners();
        
        updateUserInfo();
        await loadOverviewData();
        
        handleHashNavigation();
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showError('Error al cargar el dashboard');
    } finally {
        showLoading(false);
    }
}

// ----------- Hash Navigation -----------
function handleHashNavigation() {
    const hash = window.location.hash.substring(1); 
    
    if (hash) {
        showSection(hash);
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const targetNavLink = document.querySelector(`[data-section="${hash}"]`);
        if (targetNavLink) {
            targetNavLink.parentElement.classList.add('active');
        }
    }
}

// ----------- UI Setup -----------
function setupUI() {
    const userName = document.getElementById('userName');
    if (userName && currentUser) {
        userName.textContent = currentUser.nombre || currentUser.usuario;
    }
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sidebar = document.querySelector('.sidebar');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            link.parentElement.classList.add('active');
            
            const section = link.dataset.section;
            showSection(section);
            
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        });
    });
}

function setupEventListeners() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                removeAuthToken();
                window.location.href = window.location.origin + '/index.html';
            }
        });
    }

    // Botones de crear cuenta y tarjeta
    const btnCreateAccount = document.getElementById('btnCreateAccount');
    const btnCreateCard = document.getElementById('btnCreateCard');

    if (btnCreateAccount) {
        btnCreateAccount.addEventListener('click', openCreateAccountModal);
    }

    if (btnCreateCard) {
        btnCreateCard.addEventListener('click', openCreateCardModal);
    }
}

// ----------- Section Management -----------
function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    updatePageTitle(sectionName);
    
    switch (sectionName) {
        case 'overview':
            loadOverviewData();
            break;
        case 'accounts':
            loadAccountsData();
            break;
        case 'cards':
            loadCardsData();
            break;
        case 'transfers':
            break;
    }
}

function updatePageTitle(section) {
    const titles = {
        overview: { title: 'Resumen', subtitle: 'Bienvenido a tu dashboard financiero' },
        accounts: { title: 'Cuentas', subtitle: 'Gestiona tus cuentas bancarias' },
        cards: { title: 'Tarjetas', subtitle: 'Administra tus tarjetas de crédito' },
        transfers: { title: 'Transferencias', subtitle: 'Realiza transferencias de dinero' }
    };
    
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    
    if (pageTitle && titles[section]) {
        pageTitle.textContent = titles[section].title;
    }
    
    if (pageSubtitle && titles[section]) {
        pageSubtitle.textContent = titles[section].subtitle;
    }
}

// ----------- Data Loading Functions -----------
function updateUserInfo() {
    if (!currentUser) return;
    
    const userName = document.getElementById('userName');
    if (userName) {
        userName.textContent = currentUser.nombre || currentUser.usuario;
    }
}

async function loadOverviewData() {
    loadFeaturedAccount();
    loadAccountsSummary();
    await loadRecentTransactions();
    updateStats();
}

function loadFeaturedAccount() {
    if (accounts.length === 0) return;
    
    // Usar la cuenta con mayor saldo
    const featuredAccount = accounts.reduce((prev, current) => 
        (current.saldoActual || 0) > (prev.saldoActual || 0) ? current : prev
    );
    
    const accountNumber = document.getElementById('featuredAccountNumber');
    const balance = document.getElementById('featuredBalance');
    const holder = document.getElementById('featuredHolder');
    
    if (accountNumber) {
        accountNumber.textContent = formatIBAN(featuredAccount.iban);
    }
    if (balance) {
        balance.textContent = formatAmount(featuredAccount.saldoActual || 0);
    }
    if (holder) {
        holder.textContent = currentUser?.nombre || currentUser?.usuario || 'Usuario';
    }
}

function loadAccountsSummary() {
    const accountsList = document.getElementById('accountsList');
    if (!accountsList) return;
    
    accountsList.innerHTML = '';
    
    if (accounts.length === 0) {
        accountsList.innerHTML = '<p class="no-data">No tienes cuentas activas</p>';
        return;
    }
    
    accounts.forEach(account => {
        const accountItem = createAccountItem(account);
        accountsList.appendChild(accountItem);
    });
}

async function loadRecentTransactions() {
    const recentTransactions = document.getElementById('recentTransactions');
    if (!recentTransactions) return;
    
    recentTransactions.innerHTML = '<p class="loading-text">Cargando movimientos...</p>';
    
    if (accounts.length === 0) {
        recentTransactions.innerHTML = '<p class="no-data">No hay movimientos recientes</p>';
        return;
    }
    
    try {
        // Cargar movimientos de la primera cuenta (o la principal)
        const mainAccount = accounts[0];
        const movements = await loadAccountMovements(mainAccount.id, 1, 5);
        
        recentTransactions.innerHTML = '';
        
        if (movements.length === 0) {
            recentTransactions.innerHTML = '<p class="no-data">No hay movimientos recientes</p>';
            return;
        }
        
        movements.forEach(movement => {
            const transactionItem = createTransactionItem(movement);
            recentTransactions.appendChild(transactionItem);
        });
    } catch (error) {
        console.error('Error loading recent transactions:', error);
        recentTransactions.innerHTML = '<p class="error-text">Error al cargar movimientos</p>';
    }
}

function updateStats() {
    const totalAccounts = document.getElementById('totalAccounts');
    const totalCards = document.getElementById('totalCards');
    const monthlyIncome = document.getElementById('monthlyIncome');
    
    if (totalAccounts) totalAccounts.textContent = accounts.length;
    if (totalCards) totalCards.textContent = cards.length;
    
    // Calcular balance total
    const totalBalance = accounts.reduce((sum, acc) => sum + (acc.saldoActual || 0), 0);
    if (monthlyIncome) {
        monthlyIncome.textContent = formatAmount(totalBalance);
    }
}

function loadAccountsData() {
    const accountsGrid = document.getElementById('accountsGrid');
    if (!accountsGrid) return;
    
    accountsGrid.innerHTML = '';
    
    if (accounts.length === 0) {
        accountsGrid.innerHTML = '<p class="no-data">No tienes cuentas activas</p>';
        return;
    }
    
    accounts.forEach(account => {
        const accountCard = createAccountCard(account);
        accountsGrid.appendChild(accountCard);
    });
}

function loadCardsData() {
    const cardsGrid = document.getElementById('cardsGrid');
    if (!cardsGrid) return;
    
    cardsGrid.innerHTML = '';
    
    if (cards.length === 0) {
        cardsGrid.innerHTML = '<p class="no-data">No tienes tarjetas de crédito activas</p>';
        return;
    }
    
    cards.forEach(card => {
        const cardElement = createCreditCard(card);
        cardsGrid.appendChild(cardElement);
    });
}

// ----------- UI Creation Functions -----------
function createAccountItem(account) {
    const item = document.createElement('div');
    item.className = 'account-item';
    
    const tipoCuenta = account.tipoCuenta?.nombre || account.tipo || 'Cuenta';
    const moneda = account.moneda?.codigo || account.currency || 'CRC';
    
    item.innerHTML = `
        <div class="account-info">
            <div class="account-icon">
                <i class='bx ${tipoCuenta.includes('Ahorro') ? 'bx-piggy-bank' : 'bx-wallet'}'></i>
            </div>
            <div class="account-details">
                <h4>${account.aliass || 'Cuenta'}</h4>
                <p>${formatIBAN(account.iban)} • ${tipoCuenta}</p>
            </div>
        </div>
        <div class="account-balance">
            ${formatCurrency(account.saldo || 0, moneda)}
        </div>
    `;
    
    item.addEventListener('click', () => {
        showAccountDetail(account);
    });
    
    return item;
}

function createTransactionItem(movement) {
    const item = document.createElement('div');
    item.className = 'transaction-item';
    
    const typeName = movement.tipo?.nombre?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const isCredit = typeName === "credito" || movement.tipoMovimiento?.toUpperCase() === "CREDITO";
    const amountClass = isCredit ? 'credit' : 'debit';
    const amountSign = isCredit ? '+' : '-';
    const icon = isCredit ? 'bx-trend-up' : 'bx-trend-down';
    
    item.innerHTML = `
        <div class="transaction-info">
            <div class="transaction-icon ${amountClass}">
                <i class='bx ${icon}'></i>
            </div>
            <div class="transaction-details">
                <h4>${movement.descripcion || 'Movimiento'}</h4>
                <p>${formatDate(movement.fecha)}</p>
            </div>
        </div>
        <div class="transaction-amount ${amountClass}">
            ${amountSign}${formatCurrency(movement.monto, movement.moneda?.codigo || 'CRC')}
        </div>
    `;
    
    return item;
}

function createAccountCard(account) {
    const card = document.createElement('div');
    card.className = 'account-card';
    
    const tipoCuenta = account.tipoCuenta?.nombre || 'Cuenta';
    const moneda = account.moneda?.codigo || 'CRC';
    
    card.innerHTML = `
        <div class="account-card-header">
            <h3>${account.aliass || 'Cuenta'}</h3>
            <span class="account-type">${tipoCuenta}</span>
        </div>
        <div class="account-card-body">
            <div class="account-number">${formatIBAN(account.iban)}</div>
            <div class="account-balance-large">
                ${formatCurrency(account.saldo || 0, moneda)}
            </div>
        </div>
        <div class="account-card-footer">
            <button class="btn-secondary">Ver Detalles</button>
            <button class="btn-primary">Transferir</button>
        </div>
    `;
    
    const detailBtn = card.querySelector('.btn-secondary');
    const transferBtn = card.querySelector('.btn-primary');
    
    detailBtn.addEventListener('click', () => showAccountDetail(account));
    transferBtn.addEventListener('click', () => startTransfer(account));
    
    return card;
}

function createCreditCard(card) {
    const cardElement = document.createElement('div');
    cardElement.className = 'credit-card';

    console.log("Tipo recibido desde backend:", card.tipo_nombre);

    // MAPEO: tipo backend → visual frontend
    const mapTipo = {
        "Credito": "Gold",
        "Debito": "Classic"
    };

    const tipoTarjeta = mapTipo[card.tipo_nombre] || "Classic";

    // Colores disponibles
    const gradientes = {
        'Platinum': 'linear-gradient(135deg, #e8e8e8 0%, #c0c0c0 100%)',
        'Gold': 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
        'Black': 'linear-gradient(135deg, #434343 0%, #000000 100%)',
        'Classic': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    };

    const gradiente = gradientes[tipoTarjeta] || gradientes['Classic'];
    const textColor = tipoTarjeta === 'Black' ? '#ffffff' : '#333333';
    const moneda = card.moneda_iso || 'CRC';

    cardElement.style.background = gradiente;

    cardElement.innerHTML = `
        <div class="credit-card-inner" style="color: ${textColor};">
            <div class="card-header">
                <div class="card-type-badge">${tipoTarjeta}</div>
                <div class="card-brand">Bank D&G</div>
            </div>
            
            <div class="card-chip">
                <div class="chip"></div>
            </div>
            
            <div class="card-number">
                ${card.numero_enmascarado}
            </div>
            
            <div class="card-details">
                <div class="card-holder">
                    <div class="label">TITULAR</div>
                    <div class="value">${currentUser.nombre || currentUser.usuario}</div>
                </div>
                <div class="card-expiry">
                    <div class="label">VÁLIDA HASTA</div>
                    <div class="value">${card.fecha_expiracion}</div>
                </div>
            </div>
            
            <div class="card-footer">
                <div class="card-balance">
                    <div class="available">Disponible: ${formatCurrency(card.saldo_actual, moneda)}</div>
                    <div class="limit">Límite: ${formatCurrency(card.limite_credito, moneda)}</div>
                </div>
                <div class="card-actions">
                    <button class="btn-card-action btn-detail" data-card-id="${card.id}">
                        <i class='bx bx-detail'></i>
                    </button>
                    <button class="btn-card-action btn-pin" data-card-id="${card.id}">
                        <i class='bx bx-lock-open'></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const detailBtn = cardElement.querySelector('.btn-detail');
    const pinBtn = cardElement.querySelector('.btn-pin');
    
    if (detailBtn) {
        detailBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showCardDetail(card.id);
        });
    }
    
    if (pinBtn) {
        pinBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            consultPin(card.id);
        });
    }
    
    cardElement.addEventListener('click', () => {
        showCardDetail(card.id);
    });
    
    return cardElement;
}

// ----------- Card Functions -----------
function showCardDetail(cardId) {
    window.location.href = `card-detail.html?cardId=${encodeURIComponent(cardId)}`;
}

async function consultPin(cardId) {
    try {
        // Solicitar OTP
        const otpResponse = await api.post(`/cards/${cardId}/otp`, {}, {
            requiresAuth: true
        });
        
        if (otpResponse.success) {
            // Mostrar modal para ingresar OTP
            showPinConsultModal(cardId);
        } else {
            alert('Error al solicitar código de verificación');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Error al solicitar código');
    }
}

// ----------- PIN Consultation Modal -----------
function showPinConsultModal(cardId) {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    
    const modal = document.createElement('div');
    modal.className = 'pin-modal';
    modal.innerHTML = `
        <div class="pin-modal-content">
            <div class="pin-modal-header">
                <h2>Consultar PIN</h2>
                <button class="close-pin-modal">&times;</button>
            </div>
            
            <div class="pin-steps">
                <div class="pin-step active" data-step="1">
                    <h3>Verificación de Identidad</h3>
                    <p>Ingresa el código de verificación enviado a tu correo</p>
                    <div class="code-sent-message" style="background: #d4edda; color: #155724; padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid #c3e6cb;">
                        <i class='bx bx-check-circle'></i>
                        <span>Código de verificación enviado a tu correo electrónico</span>
                    </div>
                    <div class="input-box">
                        <input type="text" id="pinVerificationCode" placeholder="Código de 6 dígitos" maxlength="6">
                        <span class="error-message"></span>
                    </div>
                    <div class="pin-buttons">
                        <button class="btn-secondary" onclick="resendPinCode('${cardId}')">Reenviar código</button>
                        <button class="btn-primary" onclick="verifyPinCode('${cardId}')">Verificar</button>
                    </div>
                </div>
                
                <div class="pin-step" data-step="2">
                    <h3>Información de la Tarjeta</h3>
                    <div class="pin-card-info">
                        <div class="pin-details">
                            <div class="pin-detail-row">
                                <span class="label">CVV:</span>
                                <span class="value pin-sensitive" id="cardCvv">***</span>
                            </div>
                            <div class="pin-detail-row">
                                <span class="label">PIN:</span>
                                <span class="value pin-sensitive" id="cardPin">****</span>
                            </div>
                        </div>
                    </div>
                    <div class="pin-timer">
                        <span>Esta información se ocultará en: <span id="pinTimer">10</span> segundos</span>
                    </div>
                </div>
            </div>
            
            <div class="pin-loading" style="display: none;">
                <i class='bx bx-loader-alt'></i>
                <p>Verificando código...</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const closeBtn = modal.querySelector('.close-pin-modal');
    closeBtn.addEventListener('click', () => closePinModal(modal));
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closePinModal(modal);
    });
}

// Global functions for PIN modal
window.verifyPinCode = async function(cardId) {
    const code = document.getElementById('pinVerificationCode').value;
    const errorSpan = document.querySelector('#pinVerificationCode + .error-message');
    
    if (!code || code.length !== 6) {
        errorSpan.textContent = 'Ingrese un código de 6 dígitos';
        return;
    }
    
    errorSpan.textContent = '';
    
    const loading = document.querySelector('.pin-loading');
    loading.style.display = 'block';
    
    try {
        const response = await api.post(`/cards/${cardId}/view-details`, {
            otpCode: code
        }, {
            requiresAuth: true
        });
        
        loading.style.display = 'none';
        
        if (response.success && response.data) {
            showPinInformation(response.data);
        } else {
            errorSpan.textContent = 'Código incorrecto';
        }
    } catch (error) {
        loading.style.display = 'none';
        errorSpan.textContent = error.message || 'Código incorrecto';
    }
};

window.resendPinCode = async function(cardId) {
    try {
        await api.post(`/cards/${cardId}/otp`, {}, {
            requiresAuth: true
        });
        
        const codeMessage = document.querySelector('.code-sent-message span');
        if (codeMessage) {
            codeMessage.textContent = 'Código reenviado a tu correo electrónico';
            setTimeout(() => {
                codeMessage.textContent = 'Código de verificación enviado a tu correo electrónico';
            }, 3000);
        }
    } catch (error) {
        alert(error.message || 'Error al reenviar código');
    }
};

function showPinInformation(cardData) {
    document.querySelector('.pin-step[data-step="1"]').classList.remove('active');
    document.querySelector('.pin-step[data-step="2"]').classList.add('active');
    
    document.getElementById('cardCvv').textContent = cardData.cvv;
    document.getElementById('cardPin').textContent = cardData.pin;
    
    let timer = 10;
    const timerElement = document.getElementById('pinTimer');
    
    const interval = setInterval(() => {
        timer--;
        timerElement.textContent = timer;
        
        if (timer <= 0) {
            clearInterval(interval);
            document.getElementById('cardCvv').textContent = '***';
            document.getElementById('cardPin').textContent = '****';
            document.querySelector('.pin-timer').innerHTML = '<span style="color: #e74c3c;">Información ocultada por seguridad</span>';
        }
    }, 1000);
}

function closePinModal(modal) {
    document.body.removeChild(modal);
}

// ----------- Helper Functions -----------
function formatCurrency(amount, currency = 'CRC') {
    const symbol = currency === 'USD' ? '$' : '₡';
    return `${symbol}${parseFloat(amount).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatAmount(amount) {
    return parseFloat(amount).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatIBAN(iban) {
    if (!iban) return '****';
    // Formato: CR01 B04 XXXXXXXXXXXX -> mostrar últimos 4
    return `**** **** **** ${iban.slice(-4)}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        if (show) {
            loadingOverlay.classList.add('show');
        } else {
            loadingOverlay.classList.remove('show');
        }
    }
}

function showError(message) {
    alert(message);
}

// ----------- Placeholder Functions -----------
function showAccountDetail(account) {
    window.location.href = `account-detail.html?accountId=${encodeURIComponent(account.id)}`;
}

function startTransfer(account) {
    // Ir a la sección de transferencias
    window.location.hash = 'transfers';
    showSection('transfers');
}

// ----------- Initialize -----------
document.addEventListener('DOMContentLoaded', init);

// ----------- Modal Crear Cuenta -----------
let accountTypes = [];
let currencies = [];
let cardTypes = [];
let accountStatuses = [];

async function loadCatalogData() {
    try {
        // Cargar tipos de cuenta
        const typesResponse = await api.get('/catalog/account-types', { requiresAuth: true });
        if (typesResponse.success && typesResponse.data) {
            accountTypes = typesResponse.data;
        }

        // Cargar monedas
        const currenciesResponse = await api.get('/catalog/currencies', { requiresAuth: true });
        if (currenciesResponse.success && currenciesResponse.data) {
            currencies = currenciesResponse.data;
        }

        // Cargar tipos de tarjeta
        const cardTypesResponse = await api.get('/catalog/card-types', { requiresAuth: true });
        if (cardTypesResponse.success && cardTypesResponse.data) {
            cardTypes = cardTypesResponse.data;
        }

        // Cargar estados de cuenta
        const statusesResponse = await api.get('/catalog/account-statuses', { requiresAuth: true });
        if (statusesResponse.success && statusesResponse.data) {
            accountStatuses = statusesResponse.data;
        }
    } catch (error) {
        console.error('Error loading catalog data:', error);
    }
}

function openCreateAccountModal() {
    const modal = document.getElementById('modalCreateAccount');
    const typeSelect = document.getElementById('accountType');
    const currencySelect = document.getElementById('accountCurrency');
    const statusSelect = document.getElementById('accountStatus');

    // Llenar tipos de cuenta
    typeSelect.innerHTML = '<option value="">Seleccione...</option>';
    if (accountTypes.length > 0) {
        accountTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.id;
            option.textContent = type.nombre;
            typeSelect.appendChild(option);
        });
    }

    // Llenar monedas
    currencySelect.innerHTML = '<option value="">Seleccione...</option>';
    if (currencies.length > 0) {
        currencies.forEach(curr => {
            const option = document.createElement('option');
            option.value = curr.id;
            option.textContent = `${curr.nombre} (${curr.iso})`;
            currencySelect.appendChild(option);
        });
    }

    // Llenar estados
    statusSelect.innerHTML = '<option value="">Seleccione...</option>';
    if (accountStatuses.length > 0) {
        accountStatuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status.id;
            option.textContent = status.nombre;
            statusSelect.appendChild(option);
            
            // Seleccionar "Activa" por defecto si existe
            if (status.nombre === 'Activa') {
                option.selected = true;
            }
        });
    }

    modal.classList.remove('hidden');

    // Event listeners
    document.getElementById('closeCreateAccount').onclick = () => closeModal('modalCreateAccount');
    document.getElementById('cancelCreateAccount').onclick = () => closeModal('modalCreateAccount');
    document.getElementById('formCreateAccount').onsubmit = handleCreateAccount;
}

async function handleCreateAccount(e) {
    e.preventDefault();

    const aliass = document.getElementById('accountAlias').value.trim();
    const iban = document.getElementById('accountIban').value.trim().toUpperCase();
    const tipoCuenta = document.getElementById('accountType').value;
    const moneda = document.getElementById('accountCurrency').value;
    const estado = document.getElementById('accountStatus').value;
    const saldoInicial = parseFloat(document.getElementById('accountInitialBalance').value) || 0;

    // Validar IBAN
    if (!validateIBAN(iban)) {
        showModalError('accountIban', 'IBAN inválido. Formato: CR01B04XXXXXXXXXXXX (22 caracteres)');
        return;
    }

    try {
        showLoading(true);

        const response = await api.post('/accounts', {
            usuarioId: currentUser.id,
            iban: iban,
            aliass: aliass,
            tipoCuenta: tipoCuenta,
            moneda: moneda,
            estado: estado,
            saldoInicial: saldoInicial
        }, {
            requiresAuth: true
        });

        showLoading(false);

        if (response.success) {
            closeModal('modalCreateAccount');
            alert('¡Cuenta creada exitosamente!');
            
            // Recargar cuentas
            accounts = await loadAccounts();
            loadAccountsData();
            loadAccountsSummary();
            loadFeaturedAccount();
            updateStats();
        } else {
            alert(response.message || 'Error al crear cuenta');
        }
    } catch (error) {
        showLoading(false);
        console.error('Error creating account:', error);
        alert(error.message || 'Error al crear cuenta');
    }
}

function openCreateCardModal() {
    const modal = document.getElementById('modalCreateCard');
    const typeSelect = document.getElementById('cardType');
    const currencySelect = document.getElementById('cardCurrency');

    // Llenar tipos de tarjeta
    typeSelect.innerHTML = '<option value="">Seleccione...</option>';
    if (cardTypes.length > 0) {
        cardTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.id;
            option.textContent = type.nombre;
            typeSelect.appendChild(option);
        });
    }

    // Llenar monedas
    currencySelect.innerHTML = '<option value="">Seleccione...</option>';
    if (currencies.length > 0) {
        currencies.forEach(curr => {
            const option = document.createElement('option');
            option.value = curr.id;
            option.textContent = `${curr.nombre} (${curr.iso})`;
            currencySelect.appendChild(option);
        });
    }

    modal.classList.remove('hidden');

    // Event listeners
    document.getElementById('closeCreateCard').onclick = () => closeModal('modalCreateCard');
    document.getElementById('cancelCreateCard').onclick = () => closeModal('modalCreateCard');
    document.getElementById('formCreateCard').onsubmit = handleCreateCard;
}

async function handleCreateCard(e) {
    e.preventDefault();

    const tipo = document.getElementById('cardType').value;
    const numeroEnmascarado = document.getElementById('cardNumber').value.trim();
    const fechaExpiracion = document.getElementById('cardExpiry').value.trim();
    const cvv = document.getElementById('cardCVV').value.trim();
    const pin = document.getElementById('cardPIN').value.trim();
    const moneda = document.getElementById('cardCurrency').value;
    const limiteCredito = parseFloat(document.getElementById('cardLimit').value) || 0;

    // Validaciones
    if (!/^\d{4}\s\*{4}\s\*{4}\s\d{4}$/.test(numeroEnmascarado)) {
        showModalError('cardNumber', 'Formato inválido. Ejemplo: 4512 **** **** 1234');
        return;
    }

    if (!/^\d{2}\/\d{4}$/.test(fechaExpiracion)) {
        showModalError('cardExpiry', 'Formato inválido. Ejemplo: 12/2027');
        return;
    }

    if (!/^\d{3}$/.test(cvv)) {
        showModalError('cardCVV', 'CVV debe tener 3 dígitos');
        return;
    }

    if (!/^\d{4}$/.test(pin)) {
        showModalError('cardPIN', 'PIN debe tener 4 dígitos');
        return;
    }

    try {
        showLoading(true);

        const response = await api.post('/cards', {
            usuarioId: currentUser.id,
            tipo: tipo,
            numeroEnmascarado: numeroEnmascarado,
            fechaExpiracion: fechaExpiracion,
            cvv: cvv,
            pin: pin,
            moneda: moneda,
            limiteCredito: limiteCredito,
            saldoActual: 0
        }, {
            requiresAuth: true
        });

        showLoading(false);

        if (response.success) {
            closeModal('modalCreateCard');
            alert('¡Tarjeta solicitada exitosamente!');
            
            // Recargar tarjetas
            cards = await loadCards();
            loadCardsData();
            updateStats();
        } else {
            alert(response.message || 'Error al crear tarjeta');
        }
    } catch (error) {
        showLoading(false);
        console.error('Error creating card:', error);
        alert(error.message || 'Error al crear tarjeta');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        
        // Limpiar formulario
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
            // Limpiar mensajes de error
            form.querySelectorAll('.error-message').forEach(span => span.textContent = '');
        }
    }
}

function showModalError(inputId, message) {
    const input = document.getElementById(inputId);
    const errorSpan = input.parentElement.querySelector('.error-message');
    if (errorSpan) {
        errorSpan.textContent = message;
        input.classList.add('error');
    }
}

function validateIBAN(iban) {
    // Formato: CR01B04XXXXXXXXXXXX (22 caracteres)
    const ibanRegex = /^CR\d{2}B\d{2}\d{12}$/;
    return ibanRegex.test(iban);
}

// Cargar datos de catálogo al inicializar
init().then(() => loadCatalogData());