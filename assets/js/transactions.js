// transactions.js - Integrado con Backend
import { api, getCurrentUser, removeAuthToken } from './api-config.js';

// ----------- Verificar autenticación -----------
function checkAuth() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = window.location.origin + '/index.html';
        return null;
    }
    return currentUser;
}

// ----------- Variables globales -----------
let currentUser = null;
let accounts = [];
let isOwnTransfer = true;

// ----------- DOM Elements -----------
const ownTransferCard = document.getElementById('ownTransfer');
const thirdPartyCard = document.getElementById('thirdPartyTransfer');
const transferContainer = document.querySelector('.transfer-form-container');
const fromAccountSelect = document.getElementById('fromAccount');
const toAccountSelect = document.getElementById('toAccountSelect');
const toAccountInput = document.getElementById('toAccountInput');
const amountInput = document.getElementById('amount');
const conceptInput = document.getElementById('concept');
const submitBtn = document.getElementById('submitTransfer');
const receiptDiv = document.querySelector('.transfer-receipt');
const backBtn = document.getElementById('backBtn');

// Modal
const modal = document.getElementById('modal');
const modalMessage = document.getElementById('modalMessage');
const modalClose = document.getElementById('modalClose');
const modalConfirm = document.getElementById('modalConfirm');

// ----------- Inicialización -----------
async function init() {
    currentUser = checkAuth();
    if (!currentUser) return;
    
    await loadUserAccounts();
    setupEventListeners();
}

// ----------- Cargar cuentas del usuario -----------
async function loadUserAccounts() {
    try {
        // Sin userId en query, el backend usa automáticamente el del JWT
        const response = await api.get('/accounts', {
            requiresAuth: true,
            redirectOnNoAuth: true
        });

        if (response.success && response.data) {
            accounts = response.data.filter(acc => 
                acc.estado?.nombre === 'Activa' || acc.estado === 'ACTIVA'
            );
        }
    } catch (error) {
        console.error('Error loading accounts:', error);
        accounts = [];
    }
}

// ----------- Llenar selects -----------
function populateFromAccount() {
    fromAccountSelect.innerHTML = '';
    
    if (accounts.length === 0) {
        fromAccountSelect.innerHTML = '<option value="">No tienes cuentas disponibles</option>';
        return;
    }
    
    accounts.forEach(acc => {
        const option = document.createElement('option');
        option.value = acc.id;
        const moneda = acc.moneda?.codigo || 'CRC';
        const iban = formatIBAN(acc.iban);
        option.textContent = `${acc.aliass} (${iban}) - ${moneda}`;
        option.dataset.iban = acc.iban;
        option.dataset.saldo = acc.saldoActual;
        option.dataset.tipo = acc.tipoCuenta?.nombre || 'Cuenta';
        option.dataset.moneda = moneda;
        fromAccountSelect.appendChild(option);
    });
}

function populateToAccountSelect(selectedFromId = null) {
    toAccountSelect.innerHTML = '';
    
    const availableAccounts = accounts.filter(a => a.id !== selectedFromId);
    
    if (availableAccounts.length === 0) {
        toAccountSelect.innerHTML = '<option value="">No hay otras cuentas disponibles</option>';
        return;
    }
    
    availableAccounts.forEach(acc => {
        const option = document.createElement('option');
        option.value = acc.id;
        const moneda = acc.moneda?.codigo || 'CRC';
        const iban = formatIBAN(acc.iban);
        option.textContent = `${acc.aliass} (${iban}) - ${moneda}`;
        option.dataset.iban = acc.iban;
        toAccountSelect.appendChild(option);
    });
}

// ----------- Event Listeners -----------
function setupEventListeners() {
    if (ownTransferCard) {
        ownTransferCard.addEventListener('click', () => {
            resetSelection();
            ownTransferCard.classList.add('active');
            showForm(true);
        });
    }
    
    if (thirdPartyCard) {
        thirdPartyCard.addEventListener('click', () => {
            resetSelection();
            thirdPartyCard.classList.add('active');
            showForm(false);
        });
    }
    
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            resetSelection();
            clearForm();
            document.querySelector('.transfers-options').style.display = 'grid';
        });
    }
    
    if (fromAccountSelect) {
        fromAccountSelect.addEventListener('change', () => {
            if (isOwnTransfer) {
                populateToAccountSelect(fromAccountSelect.value);
            }
            updateAccountDetail(fromAccountSelect.value);
        });
    }
    
    if (submitBtn) {
        submitBtn.addEventListener('click', handleTransferSubmit);
    }
    
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }
}

// ----------- Mostrar formulario -----------
function showForm(isOwn) {
    isOwnTransfer = isOwn;
    document.querySelector('.transfers-options').style.display = 'none';
    transferContainer.style.display = 'block';
    backBtn.style.display = 'block';

    populateFromAccount();
    
    if (fromAccountSelect.options.length > 0) {
        updateAccountDetail(fromAccountSelect.value);
    }

    if (isOwn) {
        populateToAccountSelect(fromAccountSelect.value);
        toAccountSelect.style.display = 'block';
        toAccountInput.style.display = 'none';
    } else {
        toAccountSelect.style.display = 'none';
        toAccountInput.style.display = 'block';
        toAccountInput.value = '';
    }
}

// ----------- Detalle cuenta origen -----------
function updateAccountDetail(accountId) {
    const acc = accounts.find(a => a.id === accountId);
    const accountDetail = document.getElementById('accountDetail');
    const detailBalance = document.getElementById('detailBalance');
    const detailType = document.getElementById('detailType');
    const detailCurrency = document.getElementById('detailCurrency');
    
    if (!acc || !accountDetail) {
        if (accountDetail) accountDetail.style.display = 'none';
        return;
    }
    
    const moneda = acc.moneda?.codigo || 'CRC';
    detailBalance.textContent = formatCurrency(acc.saldoActual || 0, moneda);
    detailType.textContent = acc.tipoCuenta?.nombre || 'Cuenta';
    detailCurrency.textContent = moneda;
    accountDetail.style.display = 'block';
}

// ----------- Reset y clear -----------
function resetSelection() {
    if (ownTransferCard) ownTransferCard.classList.remove('active');
    if (thirdPartyCard) thirdPartyCard.classList.remove('active');
    if (transferContainer) transferContainer.style.display = 'none';
    if (receiptDiv) receiptDiv.style.display = 'none';
    if (backBtn) backBtn.style.display = 'none';
}

function clearForm() {
    if (toAccountInput) toAccountInput.value = '';
    if (amountInput) amountInput.value = '';
    if (conceptInput) conceptInput.value = '';
}

// ----------- Modal -----------
function showModal(message, confirm = false, onConfirm = null) {
    if (!modal || !modalMessage) return;
    
    modalMessage.innerHTML = message;
    modal.classList.remove('hidden');
    
    if (confirm && modalConfirm) {
        modalConfirm.style.display = 'inline-block';
        modalConfirm.onclick = onConfirm;
    } else if (modalConfirm) {
        modalConfirm.style.display = 'none';
    }
}

// ----------- Validación -----------
function validateTransfer() {
    const fromAcc = accounts.find(a => a.id === fromAccountSelect.value);
    const amount = parseFloat(amountInput.value);
    const description = conceptInput.value || 'Transferencia';

    if (!fromAcc) {
        showModal("Seleccione una cuenta de origen válida.");
        return false;
    }
    
    if (!amount || amount <= 0) {
        showModal("Ingrese un monto válido mayor a 0.");
        return false;
    }
    
    if (amount > fromAcc.saldoActual) {
        showModal("Saldo insuficiente en la cuenta origen.");
        return false;
    }

    if (isOwnTransfer) {
        const toAcc = accounts.find(a => a.id === toAccountSelect.value);
        if (!toAcc) {
            showModal("Seleccione una cuenta destino válida.");
            return false;
        }
        
        // Validar moneda
        const fromCurrency = fromAcc.moneda?.codigo || fromAcc.moneda;
        const toCurrency = toAcc.moneda?.codigo || toAcc.moneda;
        
        if (fromCurrency !== toCurrency) {
            showModal("Las cuentas deben ser de la misma moneda.");
            return false;
        }
        
        return { fromAcc, toAcc, amount, description, currency: fromCurrency };
    } else {
        const inputIBAN = toAccountInput.value.replace(/\s/g, '');
        
        if (!inputIBAN) {
            showModal("Ingrese un IBAN de cuenta destino.");
            return false;
        }
        
        if (!validateIBAN(inputIBAN)) {
            showModal("El formato del IBAN no es válido.");
            return false;
        }
        
        if (inputIBAN === fromAcc.iban.replace(/\s/g, '')) {
            showModal("La cuenta destino no puede ser la misma que la de origen.");
            return false;
        }
        
        return { 
            fromAcc, 
            toIBAN: inputIBAN, 
            amount, 
            description, 
            currency: fromAcc.moneda?.codigo || 'CRC'
        };
    }
}

function validateIBAN(iban) {
    // Formato: CR01BXXXXXXXXXXXX (22 caracteres)
    const ibanRegex = /^CR\d{2}B\d{2}\d{12}$/;
    return ibanRegex.test(iban);
}

// ----------- Procesar transferencia -----------
async function handleTransferSubmit() {
    const data = validateTransfer();
    if (!data) return;

    const { fromAcc, toAcc, toIBAN, amount, description, currency } = data;
    
    // Obtener UUID de moneda (necesitas mapear o buscar en tu BD)
    // Este es un ejemplo, ajusta según tu estructura
    const currencyId = fromAcc.moneda?.id || fromAcc.moneda;

    // Preparar resumen
    const toDisplay = isOwnTransfer 
        ? `${toAcc.aliass} (${formatIBAN(toAcc.iban)})`
        : `IBAN: ${toIBAN}`;
    
    const monedaSimbolo = currency === 'USD' ? '$' : '₡';
    
    const summary = `
        <p><strong>De:</strong> ${fromAcc.aliass} (${formatIBAN(fromAcc.iban)})</p>
        <p><strong>Para:</strong> ${toDisplay}</p>
        <p><strong>Monto:</strong> ${monedaSimbolo}${amount.toLocaleString('es-CR', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
        <p><strong>Concepto:</strong> ${description}</p>
    `;
    
    showModal(summary, true, async () => {
        modal.classList.add('hidden');
        await processTransfer(data);
    });
}

async function processTransfer(data) {
    const { fromAcc, toAcc, toIBAN, amount, description, currency } = data;
    
    try {
        // Mostrar loading
        showModal('<p>Procesando transferencia...</p>');
        
        let response;
        
        if (isOwnTransfer) {
            // Transferencia interna
            response = await api.post('/transfers/internal', {
                fromAccountId: fromAcc.id,
                toAccountId: toAcc.id,
                amount: amount,
                currency: fromAcc.moneda?.id || fromAcc.moneda,
                description: description,
                userId: currentUser.id
            }, {
                requiresAuth: true
            });
        } else {
            // Transferencia a terceros (mismo banco)
            // Nota: Ajustar según tu endpoint real
            response = await api.post('/transfers/third-party', {
                fromAccountId: fromAcc.id,
                toIBAN: toIBAN,
                amount: amount,
                currency: fromAcc.moneda?.id || fromAcc.moneda,
                description: description,
                userId: currentUser.id
            }, {
                requiresAuth: true
            });
        }
        
        modal.classList.add('hidden');
        
        if (response.success && response.data) {
            // Mostrar comprobante
            showReceipt({
                fromAcc,
                toAcc: isOwnTransfer ? toAcc : { aliass: 'Tercero', iban: toIBAN },
                amount,
                description,
                currency,
                receipt: response.data.receipt || response.data.transactionId
            });
            
            // Recargar cuentas para actualizar saldos
            await loadUserAccounts();
            
            // Limpiar formulario
            clearForm();
        } else {
            showModal(`<p>Error: ${response.message || 'No se pudo procesar la transferencia'}</p>`);
        }
        
    } catch (error) {
        console.error('Error processing transfer:', error);
        modal.classList.add('hidden');
        showModal(`<p>Error: ${error.message || 'No se pudo procesar la transferencia'}</p>`);
    }
}

// ----------- Mostrar comprobante -----------
function showReceipt({fromAcc, toAcc, amount, description, currency, receipt}) {
    const receiptFrom = document.getElementById('receiptFrom');
    const receiptTo = document.getElementById('receiptTo');
    const receiptAmount = document.getElementById('receiptAmount');
    const receiptConcept = document.getElementById('receiptConcept');
    const receiptDate = document.getElementById('receiptDate');
    
    if (!receiptDiv || !receiptFrom) return;
    
    receiptFrom.textContent = `${fromAcc.aliass} (${formatIBAN(fromAcc.iban)})`;
    receiptTo.textContent = `${toAcc.aliass} (${formatIBAN(toAcc.iban)})`;
    receiptAmount.textContent = formatCurrency(amount, currency);
    receiptConcept.textContent = description;
    receiptDate.textContent = new Date().toLocaleString('es-CR');
    
    if (transferContainer) transferContainer.style.display = 'none';
    receiptDiv.style.display = 'block';
    
    showModal(`
        <div style="text-align: center;">
            <i class='bx bx-check-circle' style="font-size: 3rem; color: #27ae60;"></i>
            <h3>¡Transferencia exitosa!</h3>
            <p>Comprobante: ${receipt}</p>
        </div>
    `);
}

// ----------- Acciones comprobante -----------
const downloadBtn = document.getElementById('downloadBtn');
const shareBtn = document.getElementById('shareBtn');

if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
        alert('Descarga de PDF (simulada)');
    });
}

if (shareBtn) {
    shareBtn.addEventListener('click', () => {
        alert('Compartir comprobante (simulado)');
    });
}

// ----------- Helper Functions -----------
function formatCurrency(amount, currency = 'CRC') {
    const symbol = currency === 'USD' ? '$' : '₡';
    return `${symbol}${parseFloat(amount).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatIBAN(iban) {
    if (!iban) return '****';
    return `**** **** **** ${iban.slice(-4)}`;
}

// ----------- Initialize -----------
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}