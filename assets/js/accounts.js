import { getUserByName } from './get-data.js';

let currentUser = null;
let currentAccount = null;
let allTransactions = [];
let filteredTransactions = [];
let currentPage = 1;
const transactionsPerPage = 10;

// ----------- URL Parameters -----------
function getAccountIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('accountId');
}

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

async function loadTransactionsAPI() {
    try {
        const response = await fetch('../assets/data/transactions.json');
        if (!response.ok) throw new Error('No se pudo cargar transactions.json');
        return await response.json();
    } catch (error) {
        console.error('Error loading transactions:', error);
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

        const accountId = getAccountIdFromUrl();
        if (!accountId) {
            window.location.href = 'dashboard.html';
            return;
        }

        // Cargar datos
        const [accounts, transactions] = await Promise.all([
            loadAccounts(),
            loadTransactionsAPI()
        ]);

        // Encontrar la cuenta específica
        currentAccount = accounts.find(acc => 
            acc.account_id === accountId && acc.propietario === currentUser.username
        );

        if (!currentAccount) {
            showError('Cuenta no encontrada');
            return;
        }

        // Filtrar transacciones de esta cuenta
        allTransactions = transactions.filter(tx => tx.account_id === accountId);
        filteredTransactions = [...allTransactions];

        // Configurar UI
        setupUI();
        setupEventListeners();
        
        // Cargar datos
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
            
            // Si tiene href específico, no prevenir default
            if (href && href !== '#') {
                // Cerrar sidebar en móvil
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                }
                return; // Permitir navegación normal
            }
            
            // Para links sin href específico
            e.preventDefault();
            
            // Obtener el texto del span para determinar la sección
            const sectionText = link.querySelector('span').textContent;
            
            // Cerrar sidebar en móvil
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
            
            // Navegar según la sección
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

    // Transfer button
    const transferBtn = document.getElementById('transferBtn');
    if (transferBtn) {
        transferBtn.addEventListener('click', () => {
            alert('Funcionalidad de transferencias (pendiente de implementar)');
        });
    }

    // Search
    const searchInput = document.getElementById('searchTransactions');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    // Filters
    const typeFilter = document.getElementById('typeFilter');
    const dateFilter = document.getElementById('dateFilter');
    
    if (typeFilter) {
        typeFilter.addEventListener('change', handleFilters);
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

// ----------- Account Info -----------
function updateAccountInfo() {
    if (!currentAccount) return;

    // Update page title and breadcrumb
    document.getElementById('accountAlias').textContent = currentAccount.alias;
    document.getElementById('accountAliasDetail').textContent = currentAccount.alias;
    
    // Update account details
    document.getElementById('accountNumber').textContent = currentAccount.account_id;
    document.getElementById('accountType').textContent = currentAccount.tipo;
    document.getElementById('accountCurrency').textContent = currentAccount.moneda;
    document.getElementById('accountBalance').textContent = formatCurrency(currentAccount.saldo, currentAccount.moneda);
    
    // Update icon based on account type
    const icon = document.getElementById('accountIcon');
    if (icon) {
        icon.className = currentAccount.tipo === 'Ahorro' ? 'bx bx-piggy-bank' : 'bx bx-wallet';
    }
    
    // Update last update time
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
        // Search filter
        const matchesSearch = !searchTerm || 
            transaction.descripcion.toLowerCase().includes(searchTerm);

        // Type filter
        const matchesType = !typeFilter || transaction.tipo === typeFilter;

        // Date filter
        const matchesDate = filterByDate(transaction, dateFilter);

        return matchesSearch && matchesType && matchesDate;
    });

    // Reset to first page
    currentPage = 1;
    loadTransactions();
}

function filterByDate(transaction, dateFilter) {
    if (!dateFilter) return true;
    console.log(new Date("2025-09-27T14:15:00Z").toLocaleDateString('es-CR'));

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

    // Reducir el delay a algo más razonable (200ms)
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

    // Delay más corto para los filtros
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
    const isCredit = transaction.tipo === 'CREDITO';
    const amountClass = isCredit ? 'credit' : 'debit';
    const amountSign = isCredit ? '+' : '-';
    const icon = isCredit ? 'bx-trend-up' : 'bx-trend-down';
    
    return `
        <div class="transaction-row">
            <div class="transaction-main">
                <div class="transaction-icon ${amountClass}">
                    <i class='bx ${icon}'></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-description">${transaction.descripcion}</div>
                    <div class="transaction-meta">
                        <span>${formatDate(transaction.fecha)}</span>
                        <span class="separator">•</span>
                        <span>ID: ${transaction.id}</span>
                    </div>
                </div>
            </div>
            <div class="transaction-amount-section">
                <div class="transaction-amount ${amountClass}">
                    ${amountSign}${formatCurrency(transaction.monto, transaction.moneda)}
                </div>
                <div class="transaction-balance">
                    Saldo: ${formatCurrency(transaction.saldo_posterior, transaction.moneda)}
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
        
        // Scroll to top of transactions
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
    loadTransactions();
}

// ----------- Helper Functions -----------
function formatCurrency(amount, currency) {
    const symbol = currency === 'USD' ? ' : ':'₡';
    return `${symbol}${amount.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
        return `Hoy, ${date.toLocaleTimeString('es-CR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        })}`;
    }
    
    // Check if it's yesterday
    if (date.toDateString() === yesterday.toDateString()) {
        return `Ayer, ${date.toLocaleTimeString('es-CR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        })}`;
    }
    
    // Otherwise show full date
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