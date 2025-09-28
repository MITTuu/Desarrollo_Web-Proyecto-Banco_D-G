const form = document.getElementById("transferForm");
const tipoRadios = document.querySelectorAll("input[name='tipo']");
const destinoContainer = document.getElementById("destinoContainer");
const continuarBtn = document.getElementById("continuarBtn");

const modal = document.getElementById("modal");
const resumen = document.getElementById("resumen");
const cancelarBtn = document.getElementById("cancelarBtn");
const confirmarBtn = document.getElementById("confirmarBtn");

const comprobante = document.getElementById("comprobante");
const detalleComprobante = document.getElementById("detalleComprobante");
const descargarBtn = document.getElementById("descargarBtn");
const compartirBtn = document.getElementById("compartirBtn");

// Cambiar formulario según tipo
tipoRadios.forEach(radio => {
  radio.addEventListener("change", () => {
    if (radio.value === "propias") {
      destinoContainer.innerHTML = `
        <label for="destino">Cuenta destino</label>
        <select id="destino" required>
          <option value="">Seleccione</option>
          <option value="123-002">123-002 (USD)</option>
        </select>
      `;
    } else {
      destinoContainer.innerHTML = `
        <label for="destino">Cuenta destino</label>
        <input type="text" id="destino" placeholder="Número de cuenta" required>
      `;
    }
  });
});

// Validaciones básicas
form.addEventListener("input", () => {
  const origen = document.getElementById("origen").value;
  const destino = document.getElementById("destino").value;
  const monto = parseFloat(document.getElementById("monto").value);

  continuarBtn.disabled = !(origen && destino && monto > 0);
});

// Mostrar modal
form.addEventListener("submit", e => {
  e.preventDefault();

  const origen = document.getElementById("origen").value;
  const destino = document.getElementById("destino").value;
  const moneda = document.getElementById("moneda").value;
  const monto = document.getElementById("monto").value;
  const descripcion = document.getElementById("descripcion").value;

  resumen.innerHTML = `
    <p><strong>Origen:</strong> ${origen}</p>
    <p><strong>Destino:</strong> ${destino}</p>
    <p><strong>Moneda:</strong> ${moneda}</p>
    <p><strong>Monto:</strong> ${monto}</p>
    <p><strong>Descripción:</strong> ${descripcion || "N/A"}</p>
    <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
  `;

  modal.classList.remove("hidden");
});

// Cancelar
cancelarBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
});

// Confirmar
confirmarBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
  comprobante.classList.remove("hidden"); // Mostrar comprobante a la par
  detalleComprobante.innerHTML = resumen.innerHTML;
});

// Descargar comprobante
descargarBtn.addEventListener("click", () => {
  const blob = new Blob([detalleComprobante.innerText], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "comprobante.txt";
  a.click();
});

// Compartir comprobante
compartirBtn.addEventListener("click", async () => {
  try {
    await navigator.share({
      title: "Comprobante de Transferencia",
      text: detalleComprobante.innerText
    });
  } catch (e) {
    alert("Compartir no soportado en este navegador.");
  }
});
