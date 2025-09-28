import { getUserByName } from './get-data.js';

let currentUser = null;
let accounts = [];
let transactions = [];
let cards = [];
let cardTransactions = [];

// ----------- Data Loading -----------
async function loadAccounts() {
    try {
        const response = await fetch('../assets/data/accounts.json');
        if (!response.ok) throw new Error('No se pudo cargar accounts.json');
        return await response.json();
    } catch (error) {
        console.error('Error loading accounts:', error);
        return [];
    }
}

async function loadTransactions() {
    try {
        const response = await fetch('../assets/data/transactions.json');
        if (!response.ok) throw new Error('No se pudo cargar transactions.json');
        return await response.json();
    } catch (error) {
        console.error('Error loading transactions:', error);
        return [];
    }
}

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

// ----------- User Management -----------
async function getCurrentUser() {
    // En una app real, esto vendría de localStorage o session
    // Por ahora usamos el usuario por defecto
    return await getUserByName('user');
}

// ----------- Initialization -----------
async function init() {
    showLoading(true);
    
    try {
        currentUser = await getCurrentUser();
        if (!currentUser) {
            // Si no hay usuario, redirigir al login
            window.location.href = 'authentication.html';
            return;
        }

        // Cargar datos
        const [allAccounts, allTransactions, allCards, allCardTransactions] = await Promise.all([
            loadAccounts(),
            loadTransactions(),
            loadCards(),
            loadCardTransactions()
        ]);

        // Filtrar datos del usuario actual
        accounts = allAccounts.filter(account => account.propietario === currentUser.username);
        transactions = allTransactions;
        cards = allCards.filter(card => card.propietario === currentUser.username);
        cardTransactions = allCardTransactions;

        // Configurar UI
        setupUI();
        setupNavigation();
        setupEventListeners();
        
        // Cargar datos iniciales
        updateUserInfo();
        loadOverviewData();
        
        // Manejar navegación con hash
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
    const hash = window.location.hash.substring(1); // Remover el #
    
    if (hash) {
        // Activar la sección correspondiente
        showSection(hash);
        
        // Actualizar navegación activa
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
        userName.textContent = currentUser.username;
    }
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sidebar = document.querySelector('.sidebar');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remover clase active de todos los items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Agregar clase active al item clickeado
            link.parentElement.classList.add('active');
            
            // Cambiar sección
            const section = link.dataset.section;
            showSection(section);
            
            // Cerrar sidebar en móvil después de seleccionar una opción
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        });
    });
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

    // Cerrar sidebar al hacer clic fuera de él en móvil
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

    /*
    // Transfer cards
    const ownTransfer = document.getElementById('ownTransfer');
    const thirdPartyTransfer = document.getElementById('thirdPartyTransfer');
    
    if (ownTransfer) {
        ownTransfer.addEventListener('click', () => {
            //alert('Funcionalidad de transferencias entre cuentas propias');
        });
    }
    
    if (thirdPartyTransfer) {
        thirdPartyTransfer.addEventListener('click', () => {
            //alert('Funcionalidad de transferencias a terceros');
        });
    }
    */
}

// ----------- Section Management -----------
function showSection(sectionName) {
    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar la sección seleccionada
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Actualizar título
    updatePageTitle(sectionName);
    
    // Cargar datos específicos de la sección
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
            // No hay datos específicos que cargar
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
        userName.textContent = currentUser.username;
    }
}

function loadOverviewData() {
    loadFeaturedAccount();
    loadAccountsSummary();
    loadRecentTransactions();
    updateStats();
}

function loadFeaturedAccount() {
    if (accounts.length === 0) return;
    
    // Usar la cuenta con mayor saldo como cuenta principal
    const featuredAccount = accounts.reduce((prev, current) => 
        current.saldo > prev.saldo ? current : prev
    );
    
    const accountNumber = document.getElementById('featuredAccountNumber');
    const balance = document.getElementById('featuredBalance');
    const holder = document.getElementById('featuredHolder');
    
    if (accountNumber) accountNumber.textContent = featuredAccount.numero_mascara;
    if (balance) balance.textContent = formatCurrency(featuredAccount.saldo, featuredAccount.moneda);
    if (holder) holder.textContent = currentUser?.username || 'Usuario';
}

function loadAccountsSummary() {
    const accountsList = document.getElementById('accountsList');
    if (!accountsList) return;
    
    accountsList.innerHTML = '';
    
    accounts.forEach(account => {
        const accountItem = createAccountItem(account);
        accountsList.appendChild(accountItem);
    });
}

function loadRecentTransactions() {
    const recentTransactions = document.getElementById('recentTransactions');
    if (!recentTransactions) return;
    
    // Obtener las últimas 5 transacciones
    const userAccountIds = accounts.map(acc => acc.account_id);
    const userTransactions = transactions
        .filter(tx => userAccountIds.includes(tx.account_id))
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 5);
    
    recentTransactions.innerHTML = '';
    
    userTransactions.forEach(transaction => {
        const transactionItem = createTransactionItem(transaction);
        recentTransactions.appendChild(transactionItem);
    });
}

function updateStats() {
    const totalAccounts = document.getElementById('totalAccounts');
    const totalCards = document.getElementById('totalCards');
    const monthlyIncome = document.getElementById('monthlyIncome');
    
    if (totalAccounts) totalAccounts.textContent = accounts.length;
    if (totalCards) totalCards.textContent = cards.length;
    if (monthlyIncome) monthlyIncome.textContent = '+15.2%'; // Mock data
}

function loadAccountsData() {
    const accountsGrid = document.getElementById('accountsGrid');
    if (!accountsGrid) return;
    
    accountsGrid.innerHTML = '';
    
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
    item.innerHTML = `
        <div class="account-info">
            <div class="account-icon">
                <i class='bx ${account.tipo === 'Ahorro' ? 'bx-piggy-bank' : 'bx-wallet'}'></i>
            </div>
            <div class="account-details">
                <h4>${account.alias}</h4>
                <p>${account.numero_mascara} • ${account.tipo}</p>
            </div>
        </div>
        <div class="account-balance">
            ${formatCurrency(account.saldo, account.moneda)}
        </div>
    `;
    
    item.addEventListener('click', () => {
        showAccountDetail(account);
    });
    
    return item;
}

function createTransactionItem(transaction) {
    const item = document.createElement('div');
    item.className = 'transaction-item';
    
    const isCredit = transaction.tipo === 'CREDITO';
    const amountClass = isCredit ? 'credit' : 'debit';
    const amountSign = isCredit ? '+' : '-';
    const icon = isCredit ? 'bx-trend-up' : 'bx-trend-down';
    
    item.innerHTML = `
        <div class="transaction-info">
            <div class="transaction-icon ${amountClass}">
                <i class='bx ${icon}'></i>
            </div>
            <div class="transaction-details">
                <h4>${transaction.descripcion}</h4>
                <p>${formatDate(transaction.fecha)}</p>
            </div>
        </div>
        <div class="transaction-amount ${amountClass}">
            ${amountSign}${formatCurrency(transaction.monto, transaction.moneda)}
        </div>
    `;
    
    return item;
}

function createAccountCard(account) {
    const card = document.createElement('div');
    card.className = 'account-card';
    card.innerHTML = `
        <div class="account-card-header">
            <h3>${account.alias}</h3>
            <span class="account-type">${account.tipo}</span>
        </div>
        <div class="account-card-body">
            <div class="account-number">${account.numero_mascara}</div>
            <div class="account-balance-large">
                ${formatCurrency(account.saldo, account.moneda)}
            </div>
        </div>
        <div class="account-card-footer">
            <button class="btn-secondary">Ver Detalles</button>
            <button class="btn-primary">Transferir</button>
        </div>
    `;
    
    // Event listeners para los botones
    const detailBtn = card.querySelector('.btn-secondary');
    const transferBtn = card.querySelector('.btn-primary');
    
    detailBtn.addEventListener('click', () => showAccountDetail(account));
    transferBtn.addEventListener('click', () => startTransfer(account));
    
    return card;
}

function createCreditCard(card) {
    const cardElement = document.createElement('div');
    cardElement.className = 'credit-card';
    cardElement.style.background = card.gradiente;
    
    // Determinar el color del texto basado en el tipo de tarjeta
    const textColor = card.tipo === 'Black' ? '#ffffff' : card.tipo === 'Platinum' ? '#333333' : '#333333';
    
    cardElement.innerHTML = `
        <div class="credit-card-inner" style="color: ${textColor};">
            <div class="card-header">
                <div class="card-type-badge">${card.tipo}</div>
                <div class="card-brand">Bank D&G</div>
            </div>
            
            <div class="card-chip">
                <div class="chip"></div>
            </div>
            
            <div class="card-number">
                ${card.numero_mascara}
            </div>
            
            <div class="card-details">
                <div class="card-holder">
                    <div class="label">TITULAR</div>
                    <div class="value">${card.titular}</div>
                </div>
                <div class="card-expiry">
                    <div class="label">VÁLIDA HASTA</div>
                    <div class="value">${card.exp}</div>
                </div>
            </div>
            
            <div class="card-footer">
                <div class="card-balance">
                    <div class="available">Disponible: ${formatCurrency(card.saldo_disponible, card.moneda)}</div>
                    <div class="limit">Límite: ${formatCurrency(card.limite, card.moneda)}</div>
                </div>
                <div class="card-actions">
                    <button class="btn-card-action btn-detail" data-card-id="${card.card_id}">
                        <i class='bx bx-detail'></i>
                    </button>
                    <button class="btn-card-action btn-pin" data-card-id="${card.card_id}">
                        <i class='bx bx-lock-open'></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Event listeners para los botones
    const detailBtn = cardElement.querySelector('.btn-detail');
    const pinBtn = cardElement.querySelector('.btn-pin');
    
    if (detailBtn) {
        detailBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showCardDetail(card.card_id);
        });
    }
    
    if (pinBtn) {
        pinBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            consultPin(card.card_id);
        });
    }
    
    // Event listener para toda la tarjeta
    cardElement.addEventListener('click', () => {
        showCardDetail(card.card_id);
    });
    
    return cardElement;
}

// ----------- Card Functions -----------
function showCardDetail(cardId) {
    // Redirigir a la página de detalle con el ID de la tarjeta
    window.location.href = `card-detail.html?cardId=${encodeURIComponent(cardId)}`;
}

function consultPin(cardId) {
    const card = cards.find(c => c.card_id === cardId);
    if (!card) return;
    
    showPinConsultModal(card);
}

// ----------- PIN Consultation Modal -----------
function showPinConsultModal(card) {
    // Crear modal dinámicamente
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
    
    // Event listeners
    const closeBtn = modal.querySelector('.close-pin-modal');
    closeBtn.addEventListener('click', () => closePinModal(modal));
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closePinModal(modal);
    });
}

// Global functions for PIN modal
window.verifyPinCode = function(cardId) {
    const code = document.getElementById('pinVerificationCode').value;
    const errorSpan = document.querySelector('#pinVerificationCode + .error-message');
    
    if (code !== '123456') {
        errorSpan.textContent = 'Código incorrecto. Intenta nuevamente.';
        return;
    }
    
    errorSpan.textContent = '';
    
    // Mostrar loading
    const loading = document.querySelector('.pin-loading');
    loading.style.display = 'block';
    
    setTimeout(() => {
        loading.style.display = 'none';
        showPinInformation(cardId);
    }, 1500);
};

function showPinInformation(cardId) {
    const card = cards.find(c => c.card_id === cardId);
    if (!card) return;
    
    // Cambiar al paso 2
    document.querySelector('.pin-step[data-step="1"]').classList.remove('active');
    document.querySelector('.pin-step[data-step="2"]').classList.add('active');
    
    // Mostrar información
    document.getElementById('cardCvv').textContent = card.cvv;
    document.getElementById('cardPin').textContent = card.pin;
    
    // Iniciar timer de 10 segundos
    let timer = 10;
    const timerElement = document.getElementById('pinTimer');
    
    const interval = setInterval(() => {
        timer--;
        timerElement.textContent = timer;
        
        if (timer <= 0) {
            clearInterval(interval);
            // Ocultar información sensible
            document.getElementById('cardCvv').textContent = '***';
            document.getElementById('cardPin').textContent = '****';
            document.querySelector('.pin-timer').innerHTML = '<span style="color: #e74c3c;">Información ocultada por seguridad</span>';
        }
    }, 1000);
}

window.resendPinCode = function() {
    // Mostrar mensaje de reenvío en el modal
    const codeMessage = document.querySelector('.code-sent-message');
    if (codeMessage) {
        // Cambiar temporalmente el mensaje
        const originalContent = codeMessage.innerHTML;
        codeMessage.innerHTML = `
            <i class='bx bx-check-circle'></i>
            <span>Código reenviado a tu correo electrónico</span>
        `;
        
        // Volver al mensaje original después de 3 segundos
        setTimeout(() => {
            codeMessage.innerHTML = originalContent;
        }, 3000);
    }
};

window.copyPin = function(pin) {
    navigator.clipboard.writeText(pin).then(() => {
        alert('PIN copiado al portapapeles');
    }).catch(() => {
        alert('No se pudo copiar el PIN');
    });
};

function closePinModal(modal) {
    document.body.removeChild(modal);
}

// ----------- Helper Functions -----------
function formatCurrency(amount, currency) {
    const symbol = currency === 'USD' ? '$' : '₡';
    return `${symbol}${amount.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`;
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
    alert(message); // En una app real, usaríamos un toast o modal
}

// ----------- Placeholder Functions -----------
function showAccountDetail(account) {
    // Redirigir a la página de detalle con el ID de la cuenta
    window.location.href = `account-detail.html?accountId=${encodeURIComponent(account.account_id)}`;
}

function startTransfer(account) {
    alert(`Iniciar transferencia desde: ${account.alias}`);
}

// ----------- Initialize -----------
document.addEventListener('DOMContentLoaded', init);