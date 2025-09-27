import { getUsers, getUserByName } from './get-data.js';

let users = [];

// ----------- Cargar usuarios al iniciar -----------
async function init() {
  users = await getUsers();
}

init();

// ---------- UTILS ----------
function setupTogglePassword(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  icon.addEventListener("click", () => {
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    icon.classList.toggle("bx-lock");
    icon.classList.toggle("bx-lock-open-alt");
  });
}

function setupFieldValidation(fields) {
  fields.forEach(field => {
    const errorSpan = field.el.parentElement.querySelector(".error-message");

    field.el.addEventListener("focus", () => {
      field.el.classList.remove("error");
      errorSpan.textContent = "";
    });

    field.el.addEventListener("blur", () => {
      if (field.el.value.trim() !== "" && !field.validator(field.el.value)) {
        field.el.classList.add("error");
        errorSpan.textContent = field.message;
      }
    });

    field.el.addEventListener("input", () => {
      field.el.classList.remove("error");
      errorSpan.textContent = "";
    });
  });
}

function validateFields(fields) {
  let hasError = false;
  fields.forEach(field => {
    const errorSpan = field.el.parentElement.querySelector(".error-message");
    if (!field.validator(field.el.value)) {
      field.el.classList.add("error");
      errorSpan.textContent = field.message;
      hasError = true;
    } else {
      field.el.classList.remove("error");
      errorSpan.textContent = "";
    }
  });
  return !hasError;
}

const dotsEl = document.getElementById("dots");
let dotInterval;

function showLoading(loadingEl, duration = 1500, callback) {
  let dotCount = 0;
  const dotsEl = loadingEl.querySelector("#dots");

  loadingEl.classList.add("show");

  const dotInterval = setInterval(() => {
    dotCount = (dotCount % 3) + 1;
    dotsEl.textContent = ".".repeat(dotCount);
  }, 500);

  setTimeout(() => {
    clearInterval(dotInterval);
    loadingEl.classList.remove("show");
    callback();
  }, duration);
}


// ---------- LOGIN ----------
const container = document.querySelector('.container');
const registerBtnToggle = document.querySelector('.register-btn');
const loginBtnToggle = document.querySelector('.login-btn');

registerBtnToggle.addEventListener('click', () => container.classList.add('active'));
loginBtnToggle.addEventListener('click', () => container.classList.remove('active'));

const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('login-error');
const loginPasswordInput = document.getElementById("login-password");
setupTogglePassword("login-password", "toggleLoginPassword");

loginForm.addEventListener('submit', async e => { 
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = loginPasswordInput.value;

  try {
    const user = await getUserByName(username);

    if (user && user.password === password) {
      window.location.href = "dashboard.html";
    } else {
      loginError.textContent = 'Usuario o contraseña incorrectos';
    }
  } catch (err) {
    console.error("Error al obtener usuario:", err);
    loginError.textContent = 'Hubo un problema al validar el usuario';
  }
});


// ---------- REGISTRO ----------
const registerForm = document.getElementById('registerForm');
const idType = document.getElementById('idType');
const idNumber = document.getElementById('idNumber');
const registerUsername = document.getElementById('register-username');
const birthdate = document.getElementById('birthdate');
const email = document.getElementById('email');
const phone = document.getElementById('phone');
const registerPassword = document.getElementById('register-password');
const confirmPassword = document.getElementById('confirm-password');
const acceptTerms = document.getElementById('acceptTerms');
const registerBtn = document.getElementById('registerBtn');

// Toggle password visibility
setupTogglePassword("register-password", "toggleRegisterPassword");
setupTogglePassword("confirm-password", "toggleRegisterConfirmPassword");

// Términos
const viewTerms = document.getElementById('viewTerms');
const termsModal = document.getElementById('termsModal');
const acceptTermsBtn = document.getElementById('acceptTermsBtn');
const declineTermsBtn = document.getElementById('declineTermsBtn');

viewTerms.addEventListener('click', e => {
  e.preventDefault();
  termsModal.style.display = 'flex';
  termsModal.setAttribute('aria-hidden', 'false');
});
acceptTermsBtn.addEventListener('click', () => {
  termsModal.style.display = 'none';
  termsModal.setAttribute('aria-hidden', 'true');
  acceptTerms.disabled = false;
  acceptTerms.checked = true;
  registerBtn.disabled = false;
});
declineTermsBtn.addEventListener('click', () => {
  termsModal.style.display = 'none';
  termsModal.setAttribute('aria-hidden', 'true');
  acceptTerms.checked = false;
  acceptTerms.disabled = true;
  registerBtn.disabled = true;
});

// Validaciones
function validateId(type, value) {
  const nacional = /^\d{1}-\d{4}-\d{4}$/;
  const dimex = /^\d{11,12}$/;
  const pasaporte = /^[A-Z0-9]{6,12}$/;
  if (type === 'nacional') return nacional.test(value);
  if (type === 'dimex') return dimex.test(value);
  if (type === 'pasaporte') return pasaporte.test(value);
  return false;
}
function validateUsername(u) { return /^[a-z0-9._-]{4,20}$/.test(u) && !users.find(user => user.username === u); }
function validateAge(date) {
  const birth = new Date(date), today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() - birth.getMonth() < 0 || (today.getMonth() - birth.getMonth() === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 18;
}
function validateEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.toLowerCase()); }
function validatePhone(p) { return !p || /^\+506\s\d{4}-\d{4}$/.test(p); }
function validatePassword(p) { return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(p); }

const registerFields = [
  { el: idNumber, validator: () => validateId(idType.value, idNumber.value), message: "Número de identificación inválido" },
  { el: registerUsername, validator: () => validateUsername(registerUsername.value), message: "Username inválido o ya en uso" },
  { el: birthdate, validator: () => validateAge(birthdate.value), message: "Debes ser mayor de 18 años" },
  { el: email, validator: () => validateEmail(email.value), message: "Correo electrónico inválido" },
  { el: phone, validator: () => validatePhone(phone.value), message: "Formato de teléfono inválido" },
  { el: registerPassword, validator: () => validatePassword(registerPassword.value), message: "Contraseña débil. Usa mayúsculas, minúsculas y números." },
  { el: confirmPassword, validator: () => confirmPassword.value === registerPassword.value, message: "Las contraseñas no coinciden" }
];
setupFieldValidation(registerFields);

registerForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!acceptTerms.checked) { alert("Debes aceptar los términos y condiciones"); return; }
  if (!validateFields(registerFields)) return;
  users.push({ username: registerUsername.value, password: registerPassword.value });

  const successModal = document.getElementById('successModal');
  successModal.style.display = 'flex';
  setTimeout(() => {
    successModal.style.display = 'none';
    container.classList.remove('active');
  }, 3000);
});

// ---------- RECUPERAR CONTRASEÑA ----------
const recoverModal = document.getElementById("recoverModal");
const openRecover = document.getElementById("openRecover");
const closeRecover = document.getElementById("closeRecover");
const loadingRecover = document.getElementById("recoverLoading");

let currentStep = 1;

function resetRecover() {
  currentStep = 1;
  document.querySelectorAll("#recoverModal .step-content").forEach((s, i) => { s.hidden = i !== 0; });
  document.querySelectorAll("#recoverModal .progress-bar .step").forEach((s, i) => {
    s.classList.toggle("active", i === 0);
    s.classList.remove("completed");
  });
}
function closeRecoverModal() { recoverModal.style.display = "none"; recoverModal.setAttribute("aria-hidden", "true"); resetRecover(); }
function goToStep(step) {
  currentStep = step;
  const contents = document.querySelectorAll("#recoverModal .step-content");
  contents.forEach(s => s.hidden = parseInt(s.dataset.step) !== step);
  const steps = document.querySelectorAll("#recoverModal .progress-bar .step");
  steps.forEach((s,i) => {
    s.classList.toggle("active", i===step-1);
    s.classList.toggle("completed", i<step-1);
  });
}
openRecover.addEventListener("click", e => { e.preventDefault(); recoverModal.style.display = "flex"; recoverModal.setAttribute("aria-hidden", "false"); resetRecover(); });
closeRecover.addEventListener("click", closeRecoverModal);
recoverModal.addEventListener("click", e => { if(e.target===recoverModal) closeRecoverModal(); });

// Campos de recuperación
const recoverFields = [
  { el: document.getElementById("recover-identifier"), validator: v => !!v.trim(), message: "Ingrese su usuario o correo" },
  { el: document.getElementById("recover-code"), validator: v => v.trim() === "123456", message: "Código inválido" },
  { el: document.getElementById("new-password"), validator: validatePassword, message: "Contraseña débil" },
  { el: document.getElementById("confirm-new-password"), validator: v => v === document.getElementById("new-password").value, message: "Las contraseñas no coinciden" }
];
setupFieldValidation(recoverFields);

setupTogglePassword("new-password", "toggleNewPassword");
setupTogglePassword("confirm-new-password", "toggleConfirmNewPassword");

// Paso 1
document.getElementById("sendCodeBtn").addEventListener("click", () => {
  const input = document.getElementById("recover-identifier");
  const error = input.nextElementSibling;
  if(!input.value.trim()){ input.classList.add("error"); error.textContent="Ingrese su usuario o correo"; return; }
  input.classList.remove("error"); error.textContent="";
  showLoading(loadingRecover,1500,()=>goToStep(2));
});

// Paso 2
document.getElementById("verifyCodeBtn").addEventListener("click", () => {
  const input = document.getElementById("recover-code");
  const error = input.nextElementSibling;
  if(input.value.trim()!=="123456"){ input.classList.add("error"); error.textContent="Código inválido"; return; }
  input.classList.remove("error"); error.textContent="";
  goToStep(3);
});
document.getElementById("resendCodeBtn").addEventListener("click", ()=>alert("Se ha reenviado el código de verificación."));

// Paso 3
document.getElementById("changePasswordBtn").addEventListener("click", () => {
  const newPass = document.getElementById("new-password");
  const confirmPass = document.getElementById("confirm-new-password");
  let hasError=false;
  if(!validatePassword(newPass.value)){ newPass.classList.add("error"); hasError=true; }
  if(confirmPass.value!==newPass.value){ confirmPass.classList.add("error"); hasError=true; }
  if(hasError) return;
  showLoading(loadingRecover,1500,()=>goToStep(4));
});

// Paso 4
document.getElementById("goToLoginBtn").addEventListener("click", () => { closeRecoverModal(); container.classList.remove('active'); });
