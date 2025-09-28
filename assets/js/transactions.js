import { getAccounts } from './get-data.js';

// ----------- DOM ----------
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
const receiptFrom = document.getElementById('receiptFrom');
const receiptTo = document.getElementById('receiptTo');
const receiptAmount = document.getElementById('receiptAmount');
const receiptConcept = document.getElementById('receiptConcept');
const receiptDate = document.getElementById('receiptDate');
const backBtn = document.getElementById('backBtn');

// Modal
const modal = document.getElementById('modal');
const modalMessage = document.getElementById('modalMessage');
const modalClose = document.getElementById('modalClose');
const modalConfirm = document.getElementById('modalConfirm');

// ----------- Variables ----------
let accounts = [];
let isOwnTransfer = true;

// ----------- Inicialización ----------
async function init() { accounts = await getAccounts(); }
init();

// ----------- Cuentas ----------
function getUserAccounts(userId = 'user') {
    return accounts.filter(a => a.propietario === userId && a.estado === 'activa');
}
function getThirdPartyAccounts(userId = 'user') {
    return accounts.filter(a => a.propietario !== userId && a.estado === 'activa');
}

// ----------- Llenado selects ----------
function populateFromAccount() {
    const userAccounts = getUserAccounts();
    fromAccountSelect.innerHTML = '';
    userAccounts.forEach(acc => {
        const option = document.createElement('option');
        option.value = acc.account_id;
        option.textContent = `${acc.alias} (${acc.numero_mascara}) - ${acc.moneda}`;
        fromAccountSelect.appendChild(option);
    });
}

function populateToAccountSelect(selectedFromId = null) {
    const userAccounts = getUserAccounts().filter(a => a.account_id !== selectedFromId);
    toAccountSelect.innerHTML = '';
    userAccounts.forEach(acc => {
        const option = document.createElement('option');
        option.value = acc.account_id;
        option.textContent = `${acc.alias} (${acc.numero_mascara}) - ${acc.moneda}`;
        toAccountSelect.appendChild(option);
    });
}

// ----------- Reset ----------
function resetSelection() {
    ownTransferCard.classList.remove('active');
    thirdPartyCard.classList.remove('active');
    transferContainer.style.display = 'none';
    receiptDiv.style.display = 'none';
    backBtn.style.display = 'none';
}

// ----------- Mostrar formulario ----------
fromAccountSelect.addEventListener('change', () => {
    if (isOwnTransfer) populateToAccountSelect(fromAccountSelect.value);
    updateAccountDetail(fromAccountSelect.value);
});

// Inicializar detalle al mostrar formulario
function showForm(isOwn) {
    isOwnTransfer = isOwn;
    document.querySelector('.transfers-options').style.display = 'none';
    transferContainer.style.display = 'block';
    backBtn.style.display = 'block';

    populateFromAccount();
    updateAccountDetail(fromAccountSelect.value); // <- actualizar detalle al cargar formulario

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


// ----------- Detalle cuenta origen ----------
const accountDetail = document.getElementById('accountDetail');
const detailBalance = document.getElementById('detailBalance');
const detailType = document.getElementById('detailType');
const detailCurrency = document.getElementById('detailCurrency');

function updateAccountDetail(accountId) {
    const acc = accounts.find(a => a.account_id === accountId);
    if (!acc) {
        accountDetail.style.display = 'none';
        return;
    }
    detailBalance.textContent = `₡ ${acc.saldo.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`;
    detailType.textContent = acc.tipo;
    detailCurrency.textContent = acc.moneda;
    accountDetail.style.display = 'block';
}


// Botón volver
backBtn.addEventListener('click', () => {
    resetSelection();
    clearForm();
    document.querySelector('.transfers-options').style.display = 'grid'; // mostrar nuevamente opciones
});


// ----------- Eventos selección ----------
ownTransferCard.addEventListener('click', () => { resetSelection(); ownTransferCard.classList.add('active'); showForm(true); });
thirdPartyCard.addEventListener('click', () => { resetSelection(); thirdPartyCard.classList.add('active'); showForm(false); });

// ----------- Botón volver ----------
backBtn.addEventListener('click', () => { resetSelection(); clearForm(); });

// ----------- Clear form ----------
function clearForm() {
    toAccountInput.value = '';
    amountInput.value = '';
    conceptInput.value = '';
}

// ----------- Modal ----------
function showModal(message, confirm = false, onConfirm = null) {
    modalMessage.innerHTML = message;
    modal.classList.remove('hidden');
    modalConfirm.style.display = confirm ? 'inline-block' : 'none';
    modalConfirm.onclick = onConfirm;
}

modalClose.addEventListener('click', () => { modal.classList.add('hidden'); });

// ----------- Validación ----------
function validateTransfer() {
    const fromAcc = accounts.find(a => a.account_id === fromAccountSelect.value);
    const amount = parseFloat(amountInput.value);
    const description = conceptInput.value || '-';

    if (!fromAcc) { showModal("Seleccione una cuenta de origen válida."); return false; }
    if (!amount || amount <= 0) { showModal("Ingrese un monto válido mayor a 0."); return false; }
    if (amount > fromAcc.saldo) { showModal("Saldo insuficiente en la cuenta origen."); return false; }

    if (isOwnTransfer) {
        const toAcc = accounts.find(a => a.account_id === toAccountSelect.value);
        if (!toAcc) { showModal("Seleccione una cuenta destino válida."); return false; }
        return { fromAcc, toAcc, amount, description };
    } else {
        const inputNumber = toAccountInput.value.replace(/\s/g, '');
        if (!inputNumber) { showModal("Ingrese un número de cuenta destino."); return false; }
        if (inputNumber === fromAcc.numero.replace(/\s/g,'')) { showModal("La cuenta destino no puede ser la misma que la de origen."); return false; }
        const toAcc = accounts.find(a => a.numero.replace(/\s/g,'')===inputNumber && a.propietario!=='user');
        if (!toAcc) { showModal("La cuenta destino no existe o no pertenece a un tercero válido."); return false; }
        return { fromAcc, toAcc, amount, description };
    }
}

// ----------- Continuar transferencia (mostrar resumen) ----------
submitBtn.addEventListener('click', () => {
    const data = validateTransfer();
    if (!data) return;

    const { fromAcc, toAcc, amount, description } = data;

    // Mostrar modal de confirmación
    const summary = `
        <p><strong>De:</strong> ${fromAcc.alias} (${fromAcc.numero_mascara})</p>
        <p><strong>Para:</strong> ${toAcc.alias} (${toAcc.numero_mascara})</p>
        <p><strong>Monto:</strong> ₡ ${amount.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</p>
        <p><strong>Concepto:</strong> ${description}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
    `;
    showModal(summary, true, () => {
        modal.classList.add('hidden');
        // mostrar comprobante debajo del formulario
        receiptFrom.textContent = `${fromAcc.alias} (${fromAcc.numero_mascara})`;
        receiptTo.textContent = `${toAcc.alias} (${toAcc.numero_mascara})`;
        receiptAmount.textContent = `₡ ${amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
        receiptConcept.textContent = description;
        receiptDate.textContent = new Date().toLocaleString();
        receiptDiv.style.display = 'block';
        clearForm();
    });
});


// ----------- Mostrar recibo ----------
function showReceipt({fromAcc,toAcc,amount,description}) {
    receiptFrom.textContent = `${fromAcc.alias} (${fromAcc.numero_mascara})`;
    receiptTo.textContent = `${toAcc.alias} (${toAcc.numero_mascara})`;
    receiptAmount.textContent = `₡ ${amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
    receiptConcept.textContent = description;
    receiptDate.textContent = new Date().toLocaleString();
    receiptDiv.style.display = 'block';
}

// ----------- Descargar / Compartir (simplificado) ----------
document.getElementById('downloadBtn').addEventListener('click',()=>{ alert('Descarga PDF (simulada)'); });
document.getElementById('shareBtn').addEventListener('click',()=>{ alert('Compartir comprobante (simulado)'); });

// ----------- Actualizar destino cuando cambia origen (solo cuentas propias) ----------
fromAccountSelect.addEventListener('change', ()=>{
    if(isOwnTransfer) populateToAccountSelect(fromAccountSelect.value);
});
