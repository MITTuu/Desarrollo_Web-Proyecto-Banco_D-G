import { getUserByName } from './get-data.js';

let currentUser = null;
let accounts = [];
let transactions = [];

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
        const [allAccounts, allTransactions] = await Promise.all([
            loadAccounts(),
            loadTransactions()
        ]);

        // Filtrar cuentas del usuario actual
        accounts = allAccounts.filter(account => account.propietario === currentUser.username);
        transactions = allTransactions;

        // Configurar UI
        setupUI();
        setupNavigation();
        setupEventListeners();
        
        // Cargar datos iniciales
        updateUserInfo();
        loadOverviewData();
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showError('Error al cargar el dashboard');
    } finally {
        showLoading(false);
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

    // Transfer cards
    const ownTransfer = document.getElementById('ownTransfer');
    const thirdPartyTransfer = document.getElementById('thirdPartyTransfer');
    
    if (ownTransfer) {
        ownTransfer.addEventListener('click', () => {
            alert('Funcionalidad de transferencias entre cuentas propias');
        });
    }
    
    if (thirdPartyTransfer) {
        thirdPartyTransfer.addEventListener('click', () => {
            alert('Funcionalidad de transferencias a terceros');
        });
    }
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
    if (totalCards) totalCards.textContent = '2'; // Mock data
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
    // Placeholder para tarjetas - se implementará en el módulo de tarjetas
    const cardsGrid = document.getElementById('cardsGrid');
    if (!cardsGrid) return;
    
    cardsGrid.innerHTML = '<p>Módulo de tarjetas en desarrollo...</p>';
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
    alert(`Mostrar detalle de cuenta: ${account.alias}\nSaldo: ${formatCurrency(account.saldo, account.moneda)}`);
}

function startTransfer(account) {
    alert(`Iniciar transferencia desde: ${account.alias}`);
}

// ----------- Initialize -----------
document.addEventListener('DOMContentLoaded', init);