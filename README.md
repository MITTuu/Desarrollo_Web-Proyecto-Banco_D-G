# 💰 Bank D&G - Plataforma Bancaria Web

Proyecto 1 del curso **IC8057 - Introducción al Desarrollo de Páginas Web** del **Instituto Tecnológico de Costa Rica**.

---

## 📋 Descripción

Prototipo visual interactivo que simula los flujos esenciales de una aplicación bancaria en línea, desarrollado con **HTML5 semántico**, **CSS3**, y **JavaScript vanilla**, siguiendo principios de **accesibilidad**, **usabilidad** y diseño **responsive mobile-first**.

---

## ✨ Características Principales

### 🔐 Módulo de Autenticación
- ✅ Registro de usuarios con validaciones completas
- ✅ Inicio de sesión seguro
- ✅ Recuperación de contraseña en 4 pasos
- ✅ Validación de campos en tiempo real
- ✅ Aceptación de términos y condiciones con PDF modal

### 🧾 Módulo de Gestión de Cuentas
- ✅ Dashboard con resumen de cuentas
- ✅ Vista detallada de cada cuenta con movimientos
- ✅ Filtros avanzados: búsqueda, tipo y fecha
- ✅ Paginación de transacciones (10 por página)
- ✅ Estados de UI: cargando, vacío, error
- ✅ Formato IBAN para números de cuenta

### 💳 Módulo de Tarjetas de Crédito
- ✅ Visualización con diseños diferenciados por tipo:
  - **Gold** – Gradiente dorado
  - **Platinum** – Gradiente plateado
  - **Black** – Gradiente negro
- ✅ Detalle completo con límites y consumo
- ✅ Barra de progreso visual de uso
- ✅ Consulta segura de PIN con verificación en dos pasos
- ✅ Timer de auto-ocultamiento (10 segundos)
- ✅ Filtros por tipo, categoría y fecha

### 💸 Módulo de Transferencias
- ✅ Transferencias entre cuentas propias
- ✅ Transferencias a terceros (mismo banco)

---

## 🛠️ Tecnologías Utilizadas

- 🌐 **HTML5** – Estructura semántica
- 🎨 **CSS3** – Flexbox, Grid, Media Queries
- ⚙️ **JavaScript ES6+** – Módulos, Async/Await
- 🧩 **Boxicons** – Iconografía moderna

---

## 📁 Estructura del Proyecto
```
Desarrollo_Web-Proyecto-Banco_D-G/
├── index.html
├── pages/
│   ├── dashboard.html
│   ├── account-detail.html
│   └── card-detail.html
├── assets/
│   ├── css/
│   │   ├── authentication.css
│   │   ├── dashboard.css
│   │   ├── accounts.css
│   │   └── cards.css
│   ├── js/
│   │   ├── authentication.js
│   │   ├── dashboard.js
│   │   ├── accounts.js
│   │   ├── cards.js
│   │   └── get-data.js
│   ├── data/
│   │   ├── users.json
│   │   ├── accounts.json
│   │   ├── transactions.json
│   │   ├── cards.json
│   │   └── card-transactions.json
│   └── docs/
│       └── terminos.pdf
└── README.md
```

