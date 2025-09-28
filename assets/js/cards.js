import { getUserByName } from './get-data.js';

let currentUser = null;
let currentCard = null;
let allCardTransactions = [];
let filteredTransactions = [];
let currentPage = 1;
const transactionsPerPage = 10;

// ----------- URL Parameters -----------
function getCardIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('cardId');
}

// ----------- Data Loading -----------
async function loadCards() {
    try {
        const response = await fetch('../assets/data/cards.json');
        if (!response.ok) throw new Error('No se pudo cargar cards.json');
        return await response.json();
    } catch (error) {
        console.error('Error loading cards:', error);
        return [];
    }
}

async function loadCardTransactions() {
    try {
        const response = await fetch('../assets/data/card-transactions.json');
        if (!response.ok) throw new Error('No se pudo cargar card-transactions.json');
        return await response.json();
    } catch (error) {
        console.error('Error loading card transactions:', error);
        return [];
    }
}

async function getCurrentUser() {
    return await getUserByName('user');
}

// ----------- Initialization -----------
async function init() {
    try {
        currentUser = await getCurrentUser();
        if (!currentUser) {
            window.location.href = 'authentication.html';
            return;
        }

        const cardId = getCardIdFromUrl();
        if (!cardId) {
            window.location.href = 'dashboard.html';
            return;
        }

        // Cargar datos
        const [cards, cardTransactions] = await Promise.all([
            loadCards(),
            loadCardTransactions()
        ]);

        // Encontrar la tarjeta específica
        currentCard = cards.find(card => 
            card.card_id === cardId && card.propietario === currentUser.username
        );

        if (!currentCard) {
            showError('Tarjeta no encontrada');
            return;
        }

        // Filtrar transacciones de esta tarjeta
        allCardTransactions = cardTransactions.filter(tx => tx.card_id === cardId);
        filteredTransactions = [...allCardTransactions];

        // Configurar UI
        setupUI();
        setupEventListeners();
        
        // Cargar datos
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
        userName.textContent = currentUser.username;
    }
}

function setupEventListeners() {
    // Sidebar toggle para mobile
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Navegación del sidebar
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

    // Cerrar sidebar al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                window.location.href = 'authentication.html';
            }
        });
    }

    // Consultar PIN button
    const consultPinBtn = document.getElementById('consultPinBtn');
    if (consultPinBtn) {
        consultPinBtn.addEventListener('click', () => {
            showPinConsultModal(currentCard);
        });
    }

    // Search
    const searchInput = document.getElementById('searchTransactions');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    // Filters
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

    // Pagination
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

    // Update page title
    document.getElementById('cardType').textContent = `Tarjeta ${currentCard.tipo}`;
    
    // Render card visual
    renderCardVisual();
    
    // Update card limits and usage
    updateCardLimits();
}

function renderCardVisual() {
    const cardVisual = document.getElementById('cardVisual');
    const textColor = currentCard.tipo === 'Black' ? '#ffffff' : '#333333';
    
    cardVisual.innerHTML = `
        <div class="card-detail-view card-${currentCard.tipo.toLowerCase()}" style="background: ${currentCard.gradiente};">
            <div class="card-detail-inner" style="color: ${textColor};">
                <div class="card-detail-header">
                    <div class="card-type-large">${currentCard.tipo}</div>
                    <div class="card-brand-large">Bank D&G</div>
                </div>
                
                <div class="card-chip-section">
                    <div class="chip-large"></div>
                </div>
                
                <div class="card-number-large">
                    ${currentCard.numero_mascara}
                </div>
                
                <div class="card-bottom-section">
                    <div class="card-holder-section">
                        <div class="card-label">TITULAR</div>
                        <div class="card-value">${currentCard.titular}</div>
                    </div>
                    <div class="card-exp-section">
                        <div class="card-label">VÁLIDA HASTA</div>
                        <div class="card-value">${currentCard.exp}</div>
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
    
    if (cardLimit) cardLimit.textContent = formatCurrency(currentCard.limite, currentCard.moneda);
    if (cardAvailable) cardAvailable.textContent = formatCurrency(currentCard.saldo_disponible, currentCard.moneda);
    if (cardConsumed) cardConsumed.textContent = formatCurrency(currentCard.saldo_consumido, currentCard.moneda);
    
    // Calculate usage percentage
    const usagePercent = (currentCard.saldo_consumido / currentCard.limite) * 100;
    
    if (usageBar) {
        usageBar.style.width = `${usagePercent}%`;
    }
    
    if (usagePercentage) {
        usagePercentage.textContent = `${usagePercent.toFixed(1)}%`;
    }
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
        // Search filter (descripción o comercio)
        const matchesSearch = !searchTerm || 
            transaction.descripcion.toLowerCase().includes(searchTerm) ||
            transaction.comercio.toLowerCase().includes(searchTerm);

        // Type filter
        const matchesType = !typeFilter || transaction.tipo === typeFilter;

        // Category filter
        const matchesCategory = !categoryFilter || transaction.categoria === categoryFilter;

        // Date filter
        const matchesDate = filterByDate(transaction, dateFilter);

        return matchesSearch && matchesType && matchesCategory && matchesDate;
    });

    // Reset to first page
    currentPage = 1;
    loadTransactions();
}

function filterByDate(transaction, dateFilter) {
    if (!dateFilter) return true;

    const transactionDate = new Date(transaction.fecha);
    const now = new Date();
    
    // Normalizar fechas para comparación (solo año, mes, día)
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
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * transactionsPerPage;
    const endIndex = startIndex + transactionsPerPage;
    const pageTransactions = filteredTransactions.slice(startIndex, endIndex);
    
    // Generate HTML
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
    const isCompra = transaction.tipo === 'COMPRA';
    const amountClass = isCompra ? 'compra' : 'pago';
    const amountSign = isCompra ? '-' : '+';
    const icon = isCompra ? 'bx-shopping-bag' : 'bx-money';
    
    return `
        <div class="card-transaction-row">
            <div class="card-transaction-main">
                <div class="card-transaction-icon ${amountClass}">
                    <i class='bx ${icon}'></i>
                </div>
                <div class="card-transaction-details">
                    <div class="card-transaction-description">${transaction.descripcion}</div>
                    <div class="card-transaction-comercio">${transaction.comercio}</div>
                    <div class="card-transaction-meta">
                        <span class="category-tag">${transaction.categoria}</span>
                        <span class="separator">•</span>
                        <span>${formatDate(transaction.fecha)}</span>
                    </div>
                </div>
            </div>
            <div class="card-transaction-amount-section">
                <div class="card-transaction-amount ${amountClass}">
                    ${amountSign}${formatCurrency(transaction.monto, transaction.moneda)}
                </div>
                <div class="card-transaction-date">
                    ID: ${transaction.id.split('-').pop()}
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

// ----------- PIN Consultation Modal -----------
function showPinConsultModal(card) {
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
                    <div class="input-box">
                        <input type="text" id="pinVerificationCode" placeholder="Código de 6 dígitos" maxlength="6">
                        <span class="error-message"></span>
                    </div>
                    <div class="pin-buttons">
                        <button class="btn-secondary" onclick="resendPinCode()">Reenviar código</button>
                        <button class="btn-primary" onclick="verifyPinCode('${card.card_id}')">Verificar</button>
                    </div>
                </div>
                
                <div class="pin-step" data-step="2">
                    <h3>Información de la Tarjeta</h3>
                    <div class="pin-card-info">
                        <div class="pin-card-preview" style="background: ${card.gradiente};">
                            <div class="pin-card-type">${card.tipo}</div>
                            <div class="pin-card-number">${card.numero_mascara}</div>
                        </div>
                        <div class="pin-details">
                            <div class="pin-detail-row">
                                <span class="label">CVV:</span>
                                <span class="value pin-sensitive" id="cardCvv">***</span>
                            </div>
                            <div class="pin-detail-row">
                                <span class="label">PIN:</span>
                                <span class="value pin-sensitive" id="cardPin">****</span>
                                <button class="copy-btn" onclick="copyPin('${card.pin}')">
                                    <i class='bx bx-copy'></i>
                                </button>
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

// ----------- Global functions for PIN modal -----------
window.verifyPinCode = function(cardId) {
    const code = document.getElementById('pinVerificationCode').value;
    const errorSpan = document.querySelector('#pinVerificationCode + .error-message');
    
    if (code !== '123456') {
        errorSpan.textContent = 'Código incorrecto. Intenta nuevamente.';
        return;
    }
    
    errorSpan.textContent = '';
    
    const loading = document.querySelector('.pin-loading');
    loading.style.display = 'block';
    
    setTimeout(() => {
        loading.style.display = 'none';
        showPinInformation(cardId);
    }, 1500);
};

window.resendPinCode = function() {
    alert('Código de verificación reenviado a tu correo electrónico');
};

window.copyPin = function(pin) {
    navigator.clipboard.writeText(pin).then(() => {
        alert('PIN copiado al portapapeles');
    }).catch(() => {
        alert('No se pudo copiar el PIN');
    });
};

function showPinInformation(cardId) {
    document.querySelector('.pin-step[data-step="1"]').classList.remove('active');
    document.querySelector('.pin-step[data-step="2"]').classList.add('active');
    
    document.getElementById('cardCvv').textContent = currentCard.cvv;
    document.getElementById('cardPin').textContent = currentCard.pin;
    
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
    loadTransactionsData();
};

// ----------- Helper Functions -----------
function formatCurrency(amount, currency) {
    const symbol = currency === 'USD' ? '$' : '₡';
    return `${symbol}${amount.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`;
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