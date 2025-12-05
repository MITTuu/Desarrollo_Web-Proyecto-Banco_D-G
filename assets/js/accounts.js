// accounts.js - Integrado con Backend
import { api, getCurrentUser, removeAuthToken } from './api-config.js';

let currentUser = null;
let currentAccount = null;
let allTransactions = [];
let filteredTransactions = [];
let currentPage = 1;
const transactionsPerPage = 10;

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
function getAccountIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('accountId');
}

// ----------- Data Loading -----------
async function loadAccountById(accountId) {
    try {
        const response = await api.get(`/accounts/${accountId}`, {
            requiresAuth: true,
            redirectOnNoAuth: true
        });

        if (response.success && response.data) {
            return response.data;
        }
        return null;
    } catch (error) {
        console.error('Error loading account:', error);
        return null;
    }
}

async function loadAccountMovements(accountId, page = 1, pageSize = 50) {
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

async function loadAccountBalance(accountId) {
    try {
        const response = await api.get(
            `/accounts/${accountId}/movements?page=1&pageSize=5000`,
            {
                requiresAuth: true,
                redirectOnNoAuth: true
            }
        );

        if (!response.success || !response.data) {
            throw new Error("Error al cargar movimientos");
        }

        const movimientos = response.data.items || [];

        let saldo = 0;

        movimientos.forEach(mov => {
            const tipo = mov.tipo.nombre.toUpperCase();
            const monto = Number(mov.monto);

            if (tipo === "Credito".toUpperCase()) {
                saldo += monto;
            } else if (tipo === "Debito".toUpperCase()) {
                saldo -= monto;
            }
        });

        const saldoFormateado = saldo.toLocaleString("es-CR", {
            style: "currency",
            currency: "CRC"
        });

        document.getElementById("accountBalance").textContent = saldoFormateado;
        document.getElementById("lastUpdate").textContent = "Ahora mismo";

    } catch (error) {
        console.error("Error calculando el saldo:", error);
        document.getElementById("accountBalance").textContent = "Error";
    }
}



// ----------- Initialization -----------
async function init() {
    try {
        if (!checkAuth()) return;

        const accountId = getAccountIdFromUrl();
        if (!accountId) {
            window.location.href = 'dashboard.html';
            return;
        }

        showLoadingState();

        // Cargar cuenta y movimientos
        currentAccount = await loadAccountById(accountId);
        loadAccountBalance(accountId);


        if (!currentAccount) {
            showError('Cuenta no encontrada');
            return;
        }

        
        // Cargar movimientos
        allTransactions = calcularSaldos(await loadAccountMovements(accountId));
        filteredTransactions = [...allTransactions];


        setupUI();
        setupEventListeners();
        
        updateAccountInfo();
        await loadTransactionsData(); 
        
    } catch (error) {
        console.error('Error initializing account detail:', error);
        showError('Error al cargar los datos de la cuenta');
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

    const transferBtn = document.getElementById('transferBtn');
    if (transferBtn) {
        transferBtn.addEventListener('click', () => {
            window.location.href = 'dashboard.html#transfers';
        });
    }

    const searchInput = document.getElementById('searchTransactions');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    const typeFilter = document.getElementById('typeFilter');
    const dateFilter = document.getElementById('dateFilter');
    
    if (typeFilter) {
        typeFilter.addEventListener('change', handleFilters);
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

// ----------- Account Info -----------
function updateAccountInfo() {
    if (!currentAccount) return;

    const tipoCuenta = currentAccount.tipoCuenta?.nombre || 'Cuenta';
    const moneda = currentAccount.moneda?.codigo || 'CRC';

    document.getElementById('accountAlias').textContent = currentAccount.aliass || 'Cuenta';
    document.getElementById('accountAliasDetail').textContent = currentAccount.aliass || 'Cuenta';
    
    document.getElementById('accountNumber').textContent = formatIBAN(currentAccount.iban);
    document.getElementById('accountType').textContent = tipoCuenta;
    document.getElementById('accountCurrency').textContent = moneda;
    document.getElementById('accountBalance').textContent = formatCurrency(currentAccount.saldoActual || 0, moneda);
    
    const icon = document.getElementById('accountIcon');
    if (icon) {
        icon.className = tipoCuenta.includes('Ahorro') ? 'bx bx-piggy-bank' : 'bx bx-wallet';
    }
    
    document.getElementById('lastUpdate').textContent = new Date().toLocaleDateString('es-CR');
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
    const dateFilter = document.getElementById('dateFilter').value;

    filteredTransactions = allTransactions.filter(transaction => {
        const matchesSearch = !searchTerm || 
            (transaction.descripcion && transaction.descripcion.toLowerCase().includes(searchTerm));

        const tipoMovimiento = transaction.tipo?.nombre || transaction.tipoMovimiento;
        const matchesType = !typeFilter || tipoMovimiento === typeFilter;

        const matchesDate = filterByDate(transaction, dateFilter);

        return matchesSearch && matchesType && matchesDate;
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
        createTransactionRow(transaction)
    ).join('');
}

function hideAllStates() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('transactionsList').style.display = 'none';
}





// ----------- Transaction Row Creation -----------
function createTransactionRow(transaction) {
    const tipoMovimiento = transaction.tipo?.nombre || transaction.tipoMovimiento || '';
    const normalizedTipo = tipoMovimiento.toLowerCase();
    const isCredit = normalizedTipo === "credito";
    
    const amountClass = isCredit ? "credit" : "debit";
    const amountSign = isCredit ? "+" : "-";
    const icon = isCredit ? "bx-trend-up" : "bx-trend-down";

    const moneda = transaction.moneda?.iso || currentAccount.moneda?.codigo || "CRC";

    return `
        <div class="transaction-row">
            <div class="transaction-main">
                <div class="transaction-icon ${amountClass}">
                    <i class='bx ${icon}'></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-description">${transaction.descripcion || "Movimiento"}</div>
                    <div class="transaction-meta">
                        <span>${formatDate(transaction.fecha)}</span>
                        <span class="separator">•</span>
                        <span>ID: ${transaction.id ? String(transaction.id).slice(0, 8) : "N/A"}</span>
                    </div>
                </div>
            </div>
            <div class="transaction-amount-section">
                <div class="transaction-amount ${amountClass}">
                    ${amountSign}${formatCurrency(transaction.monto, moneda)}
                </div>
                <div class="transaction-balance">
                    Saldo: ${formatCurrency(transaction.saldoPosterior, moneda)}
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

function calcularSaldos(transacciones) {
    let saldo = 0;

    return transacciones.map(tx => {
        const tipo = tx.tipo?.nombre?.toLowerCase();

        if (tipo === "credito") {
            saldo += tx.monto;
        } else if (tipo === "debito") {
            saldo -= tx.monto;
        }

        return { ...tx, saldoPosterior: saldo };
    });
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

// ----------- Error Handling -----------
function showError(message) {
    showErrorState();
    const errorState = document.getElementById('errorState');
    const errorMessage = errorState.querySelector('p');
    if (errorMessage) {
        errorMessage.textContent = message;
    }
}

function retryLoadTransactions() {
    init();
}
window.retryLoadTransactions = retryLoadTransactions;

// ----------- Helper Functions -----------
function formatCurrency(amount, currency = 'CRC') {
    const symbol = currency === 'USD' ? '$' : '₡';
    return `${symbol}${parseFloat(amount).toLocaleString('es-CR', { minimumFractionDigits: 2 })}`;
}

function formatIBAN(iban) {
    if (!iban) return '****';
    return `**** **** **** ${iban.slice(-4)}`;
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