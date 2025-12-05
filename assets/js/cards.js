// cards.js - CORRECCIÓN FINAL - Obtención automática de email
import { api, getCurrentUser, removeAuthToken } from './api-config.js';

let currentUser = null;
let currentCard = null;
let allCardTransactions = [];
let filteredTransactions = [];
let currentPage = 1;
const transactionsPerPage = 10;

// Variable global para almacenar el cardId durante la verificación
let pendingCardId = null;

// Relación entre ID de tarjeta (backend) y estilo visual (frontend)
const cardStyleMap = {
    "1aeacfee-d488-4232-9f89-0cf8d1483f37": "Classic",
    "87f9a1a6-4db1-4003-b335-5edd944659d2": "Gold"
};

// ----------- Verificar autenticación -----------
function checkAuth() {
    currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = window.location.origin + '/index.html';
        return false;
    }
    return true;
}

// ----------- URL Parameters -----------
function getCardIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('cardId');
}

// ----------- Data Loading -----------
async function loadCardById(cardId) {
    try {
        const response = await api.get(`/cards/${cardId}`, {
            requiresAuth: true,
            redirectOnNoAuth: true
        });

        if (response.success && response.data) {
            return response.data;
        }
        return null;
    } catch (error) {
        console.error('Error loading card:', error);
        return null;
    }
}

async function loadCardMovements(cardId, page = 1, pageSize = 50) {
    try {
        const response = await api.get(
            `/cards/${cardId}/movements?page=${page}&pageSize=${pageSize}`,
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
        console.error('Error loading card movements:', error);
        return [];
    }
}

// ----------- Initialization -----------
async function init() {
    try {
        if (!checkAuth()) return;

        const cardId = getCardIdFromUrl();
        if (!cardId) {
            window.location.href = 'dashboard.html';
            return;
        }

        showLoadingState();

        currentCard = await loadCardById(cardId);

        if (!currentCard) {
            showError('Tarjeta no encontrada');
            return;
        }

        allCardTransactions = await loadCardMovements(cardId);
        filteredTransactions = [...allCardTransactions];

        setupUI();
        setupEventListeners();
        
        updateCardInfo();
        await loadTransactionsData();
        
    } catch (error) {
        console.error('Error initializing card detail:', error);
        showError('Error al cargar los datos de la tarjeta');
    }
}

// ----------- UI Setup -----------
function setupUI() {
    const userName = document.getElementById('userName');
    if (userName && currentUser) {
        userName.textContent = currentUser.nombre || currentUser.usuario;
    }
}

function setupEventListeners() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            
            if (href && href !== '#') {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                }
                return;
            }
            
            e.preventDefault();
            const sectionText = link.querySelector('span').textContent;
            
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
            
            switch(sectionText) {
                case 'Resumen':
                    window.location.href = 'dashboard.html';
                    break;
                case 'Cuentas':
                    window.location.href = 'dashboard.html#accounts';
                    break;
                case 'Tarjetas':
                    window.location.href = 'dashboard.html#cards';
                    break;
                case 'Transferencias':
                    window.location.href = 'dashboard.html#transfers';
                    break;
            }
        });
    });

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

    const consultPinBtn = document.getElementById('consultPinBtn');
    if (consultPinBtn) {
        consultPinBtn.addEventListener('click', () => {
            showPinConsultModal(currentCard);
        });
    }

    const searchInput = document.getElementById('searchTransactions');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    const typeFilter = document.getElementById('typeFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const dateFilter = document.getElementById('dateFilter');
    
    if (typeFilter) {
        typeFilter.addEventListener('change', handleFilters);
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', handleFilters);
    }
    
    if (dateFilter) {
        dateFilter.addEventListener('change', handleFilters);
    }

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => changePage(currentPage - 1));
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => changePage(currentPage + 1));
    }
}

// ----------- Card Info -----------
function updateCardInfo() {
    if (!currentCard) return;

    const tipoBackend = currentCard.tipo;
    const tipoVisual = cardStyleMap[tipoBackend] || "Classic";

    document.getElementById('cardType').textContent = `Tarjeta ${tipoVisual}`;

    renderCardVisual(tipoVisual);
    updateCardLimits();
}

function renderCardVisual(tipoTarjeta) {
    const cardVisual = document.getElementById('cardVisual');

    const gradientes = {
        'Platinum': 'linear-gradient(135deg, #e8e8e8 0%, #c0c0c0 100%)',
        'Gold': 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
        'Black': 'linear-gradient(135deg, #434343 0%, #000000 100%)',
        'Classic': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    };

    const colors = gradientes[tipoTarjeta];
    const textColor = tipoTarjeta === 'Black' ? '#ffffff' : '#333333';

    cardVisual.style.background = colors;
    cardVisual.style.color = textColor;

    cardVisual.innerHTML = `
        <div class="card-detail-view" style="background: ${colors}; color: ${textColor};">
            <div class="card-detail-inner">
                <div class="card-detail-header">
                    <div class="card-type-large">${tipoTarjeta}</div>
                    <div class="card-brand-large">Bank D&G</div>
                </div>
                <div class="card-chip-section">
                    <div class="chip-large"></div>
                </div>
                <div class="card-number-large">
                    ${currentCard.numero_enmascarado}
                </div>
                <div class="card-bottom-section">
                    <div class="card-holder-section">
                        <div class="card-label">TITULAR</div>
                        <div class="card-value">${currentUser.nombre || currentUser.usuario}</div>
                    </div>
                    <div class="card-exp-section">
                        <div class="card-label">VÁLIDA HASTA</div>
                        <div class="card-value">${currentCard.fecha_expiracion}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function updateCardLimits() {
    const cardLimit = document.getElementById('cardLimit');
    const cardAvailable = document.getElementById('cardAvailable');
    const cardConsumed = document.getElementById('cardConsumed');
    const usageBar = document.getElementById('usageBar');
    const usagePercentage = document.getElementById('usagePercentage');

    const limite = Number(currentCard.limite_credito) || 0;
    const consumido = Number(currentCard.saldo_actual) || 0;
    const disponible = limite - consumido;
    const moneda = currentCard.moneda_iso || "CRC";

    cardLimit.textContent = formatCurrency(limite, moneda);
    cardAvailable.textContent = formatCurrency(disponible, moneda);
    cardConsumed.textContent = formatCurrency(consumido, moneda);

    const usagePercent = limite > 0 ? (consumido / limite) * 100 : 0;
    usageBar.style.width = `${usagePercent}%`;
    usagePercentage.textContent = `${usagePercent.toFixed(1)}%`;
}

// ----------- Search and Filters -----------
function handleSearch() {
    applyFilters();
}

function handleFilters() {
    applyFilters();
}

function applyFilters() {
    const searchTerm = document.getElementById('searchTransactions').value.toLowerCase().trim();
    const typeFilter = document.getElementById('typeFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;

    filteredTransactions = allCardTransactions.filter(transaction => {
        const matchesSearch = !searchTerm || 
            (transaction.descripcion && transaction.descripcion.toLowerCase().includes(searchTerm));

        const tipoMovimiento = transaction.tipo?.nombre || '';
        const matchesType = !typeFilter || tipoMovimiento === typeFilter;
        const matchesCategory = !categoryFilter;
        const matchesDate = filterByDate(transaction, dateFilter);

        return matchesSearch && matchesType && matchesCategory && matchesDate;
    });

    currentPage = 1;
    loadTransactions();
}

function filterByDate(transaction, dateFilter) {
    if (!dateFilter) return true;

    const transactionDate = new Date(transaction.fecha);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const txDate = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());

    switch (dateFilter) {
        case 'today':
            return txDate.getTime() === today.getTime();
        case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return txDate >= weekAgo && txDate <= today;
        case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return txDate >= monthAgo && txDate <= today;
        default:
            return true;
    }
}

// ----------- Transactions Loading -----------
async function loadTransactionsData() {
    showLoadingState();
    setTimeout(() => {
        if (filteredTransactions.length === 0) {
            showEmptyState();
        } else {
            showTransactionsList();
        }
        updateResultsInfo();
        updatePagination();
    }, 200);
}

function loadTransactions() {
    showLoadingState();
    setTimeout(() => {
        if (filteredTransactions.length === 0) {
            showEmptyState();
        } else {
            showTransactionsList();
        }
        updateResultsInfo();
        updatePagination();
    }, 200);
}

function showLoadingState() {
    hideAllStates();
    document.getElementById('loadingState').style.display = 'block';
}

function showEmptyState() {
    hideAllStates();
    document.getElementById('emptyState').style.display = 'block';
}

function showErrorState() {
    hideAllStates();
    document.getElementById('errorState').style.display = 'block';
}

function showTransactionsList() {
    hideAllStates();
    const transactionsList = document.getElementById('transactionsList');
    transactionsList.style.display = 'block';
    const startIndex = (currentPage - 1) * transactionsPerPage;
    const endIndex = startIndex + transactionsPerPage;
    const pageTransactions = filteredTransactions.slice(startIndex, endIndex);
    transactionsList.innerHTML = pageTransactions.map(transaction => 
        createCardTransactionRow(transaction)
    ).join('');
}

function hideAllStates() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('transactionsList').style.display = 'none';
}

// ----------- Transaction Row Creation -----------
function createCardTransactionRow(transaction) {
    const tipoMovimiento = transaction.tipo?.nombre || '';
    const isCompra = tipoMovimiento.toLowerCase().includes('compra') || tipoMovimiento === 'COMPRA';
    const amountClass = isCompra ? 'compra' : 'pago';
    const amountSign = isCompra ? '-' : '+';
    const icon = isCompra ? 'bx-shopping-bag' : 'bx-money';
    const moneda = transaction.moneda?.codigo || currentCard.moneda?.codigo || 'CRC';
    
    return `
        <div class="card-transaction-row">
            <div class="card-transaction-main">
                <div class="card-transaction-icon ${amountClass}">
                    <i class='bx ${icon}'></i>
                </div>
                <div class="card-transaction-details">
                    <div class="card-transaction-description">${transaction.descripcion || 'Movimiento'}</div>
                    <div class="card-transaction-meta">
                        <span>${formatDate(transaction.fecha)}</span>
                    </div>
                </div>
            </div>
            <div class="card-transaction-amount-section">
                <div class="card-transaction-amount ${amountClass}">
                    ${amountSign}${formatCurrency(transaction.monto, moneda)}
                </div>
                <div class="card-transaction-date">
                    ID: ${transaction.id ? String(transaction.id).slice(0, 8) : 'N/A'}
                </div>
            </div>
        </div>
    `;
}

// ----------- Pagination -----------
function updatePagination() {
    const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);
    const pagination = document.getElementById('pagination');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const currentPageSpan = document.getElementById('currentPage');
    const totalPagesSpan = document.getElementById('totalPages');

    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }

    pagination.style.display = 'flex';
    currentPageSpan.textContent = currentPage;
    totalPagesSpan.textContent = totalPages;

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

function changePage(newPage) {
    const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        showTransactionsList();
        updatePagination();
        document.getElementById('transactionsList').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
}

// ----------- Results Info -----------
function updateResultsInfo() {
    const resultsInfo = document.getElementById('transactionsCount');
    const total = filteredTransactions.length;
    
    if (total === 0) {
        resultsInfo.textContent = 'No hay movimientos';
    } else if (total === 1) {
        resultsInfo.textContent = '1 movimiento encontrado';
    } else {
        const startIndex = (currentPage - 1) * transactionsPerPage + 1;
        const endIndex = Math.min(currentPage * transactionsPerPage, total);
        if (total <= transactionsPerPage) {
            resultsInfo.textContent = `${total} movimientos encontrados`;
        } else {
            resultsInfo.textContent = `Mostrando ${startIndex}-${endIndex} de ${total} movimientos`;
        }
    }
}

// ----------- PIN Consultation Modal - VERSIÓN FINAL -----------
async function showPinConsultModal(card) {
    try {
        console.log('=== INICIO SOLICITUD OTP ===');
        console.log('Card ID:', card.id);
        console.log('Usuario actual:', currentUser);
        
        // Guardar el cardId para usar después de la verificación
        pendingCardId = card.id;
        
        // Solicitar OTP al backend
        const otpResponse = await api.post(`/cards/${card.id}/otp`, {}, {
            requiresAuth: true
        });
        
        console.log('Respuesta OTP:', otpResponse);
        
        if (!otpResponse.success) {
            alert('Error al solicitar código de verificación: ' + (otpResponse.message || ''));
            return;
        }
        
        // Mostrar modal
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
                            <button class="btn-secondary" onclick="resendPinCode()">Reenviar código</button>
                            <button class="btn-primary" onclick="verifyPinCode()">Verificar</button>
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
        
    } catch (error) {
        console.error('Error en showPinConsultModal:', error);
        alert(error.message || 'Error al solicitar código');
    }
}

// ----------- Global functions for PIN modal - VERSIÓN FINAL -----------
window.verifyPinCode = async function() {
    console.log('=== INICIO VERIFICACIÓN ===');
    console.log('Usuario actual:', currentUser);
    console.log('Card ID pendiente:', pendingCardId);
    
    const code = document.getElementById('pinVerificationCode').value;
    const errorSpan = document.querySelector('#pinVerificationCode + .error-message');

    // Validar código
    if (!code || code.length !== 6) {
        errorSpan.textContent = 'Código debe tener 6 dígitos';
        return;
    }

    errorSpan.textContent = '';

    const loading = document.querySelector('.pin-loading');
    const steps = document.querySelector('.pin-steps');
    
    steps.style.display = 'none';
    loading.style.display = 'block';

    try {
        // Obtener el email del usuario actual
        const userEmail = currentUser.email || currentUser.correo || currentUser.usuario;
        
        console.log('Email a verificar:', userEmail);
        console.log('Código ingresado:', code);
        
        // Verificar OTP
        const verifyResponse = await api.post(
            `/auth/verify-otp`,
            {
                email: userEmail,
                code: code,
                purpose: "password_reset"
            },
            { requiresAuth: false }
        );

        console.log('Respuesta verificación:', verifyResponse);

        if (!verifyResponse.success) {
            loading.style.display = 'none';
            steps.style.display = 'block';
            errorSpan.textContent = verifyResponse.message || 'Código incorrecto';
            return;
        }

        // Si OTP es válido, obtener datos de la tarjeta
        console.log('OTP válido, obteniendo datos de tarjeta:', pendingCardId);
        
        const cardDataResponse = await api.get(`/cards/${pendingCardId}`, {
            requiresAuth: true
        });

        console.log('Datos de tarjeta:', cardDataResponse);

        loading.style.display = 'none';

        if (!cardDataResponse.success || !cardDataResponse.data) {
            steps.style.display = 'block';
            errorSpan.textContent = 'Error al obtener datos de la tarjeta';
            return;
        }

        // Mostrar información sensible
        showPinInformation({
            cvv: cardDataResponse.data.cvv,
            pin: cardDataResponse.data.pin
        });

    } catch (error) {
        console.error('Error en verificación:', error);
        loading.style.display = 'none';
        steps.style.display = 'block';
        errorSpan.textContent = error.message || 'Error al verificar código';
    }
};

window.resendPinCode = async function() {
    console.log('=== REENVIAR CÓDIGO ===');
    console.log('Card ID:', pendingCardId);
    
    if (!pendingCardId) {
        alert('Error: No hay tarjeta seleccionada');
        return;
    }
    
    try {
        const response = await api.post(`/cards/${pendingCardId}/otp`, {}, {
            requiresAuth: true
        });
        
        console.log('Respuesta reenvío:', response);
        
        if (!response.success) {
            alert('Error al reenviar código: ' + (response.message || ''));
            return;
        }
        
        const codeMessage = document.querySelector('.code-sent-message span');
        if (codeMessage) {
            codeMessage.textContent = 'Código reenviado a tu correo electrónico';
            setTimeout(() => {
                codeMessage.textContent = 'Código de verificación enviado a tu correo electrónico';
            }, 3000);
        }
    } catch (error) {
        console.error('Error al reenviar:', error);
        alert(error.message || 'Error al reenviar código');
    }
};

function showPinInformation(cardData) {
    console.log('=== MOSTRAR INFORMACIÓN ===');
    console.log('CVV:', cardData.cvv);
    console.log('PIN:', cardData.pin);
    
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
    pendingCardId = null; // Limpiar la variable global
    document.body.removeChild(modal);
}

// ----------- Error Handling -----------
function showError(message) {
    showErrorState();
    const errorState = document.getElementById('errorState');
    const errorMessage = errorState.querySelector('p');
    if (errorMessage) {
        errorMessage.textContent = message;
    }
}

window.retryLoadTransactions = function() {
    init();
};

// ----------- Helper Functions -----------
function formatCurrency(amount, currency = 'CRC') {
    const symbol = currency === 'USD' ? '$' : '₡';
    return `${symbol}${parseFloat(amount).toLocaleString('es-CR', { minimumFractionDigits: 2 })}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return `Hoy, ${date.toLocaleTimeString('es-CR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        })}`;
    }
    
    if (date.toDateString() === yesterday.toDateString()) {
        return `Ayer, ${date.toLocaleTimeString('es-CR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        })}`;
    }
    
    return date.toLocaleDateString('es-CR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ----------- Initialize -----------
document.addEventListener('DOMContentLoaded', init);