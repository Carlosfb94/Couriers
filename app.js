const config = window.LLACOLEN_COURIERS_CONFIG || {};

const state = {
  courier: "avanza",
  searchType: "nota",
};

const couriers = {
  avanza: {
    name: "Avanza",
    resultTitle: "Seguimiento Avanza",
    subtitle: "Ingresa una nota de venta para consultar.",
    searchTypes: [
      {value: "nota", label: "Nota de venta", queryLabel: "Nota de venta", placeholder: "Ej: 473063"},
    ],
  },
  fedex: {
    name: "FedEx",
    resultTitle: "Seguimiento FedEx",
    subtitle: "Ingresa una factura para consultar.",
    searchTypes: [
      {value: "invoice", label: "Factura", queryLabel: "Factura", placeholder: "Ej: 401215"},
      {value: "tracking", label: "Tracking", queryLabel: "Tracking", placeholder: "Ej: 873407576413"},
    ],
  },
  correos: {
    name: "Correos",
    resultTitle: "Seguimiento Correos",
    subtitle: "Ingresa una factura para consultar.",
    searchTypes: [
      {value: "invoice", label: "Factura", queryLabel: "Factura", placeholder: "Ej: 282773"},
    ],
  },
};

const $ = (id) => document.getElementById(id);

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[char]));

const clean = (value) => String(value || "").trim();
const fallback = (value) => clean(value) || "-";

function unique(values) {
  return values.map(clean).filter((value, index, all) => value && all.indexOf(value) === index);
}

function digits(value) {
  return clean(value).replace(/[^\d]/g, "");
}

function firstInvoice(value) {
  const match = clean(value).match(/\d{4,8}/);
  return match ? match[0] : "";
}

function isoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function setDefaultDates() {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - 30);
  $("fromInput").value = isoDate(from);
  $("toInput").value = isoDate(today);
}

function dateTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString("es-CL");
}

function message(text, type = "") {
  $("message").textContent = text || "";
  $("message").className = type;
}

function resetMetrics() {
  $("metricCourier").textContent = couriers[state.courier].name;
  $("metricEstado").textContent = "-";
  $("metricTracking").textContent = "-";
  $("metricReference").textContent = "-";
}

function currentSearchType() {
  const meta = couriers[state.courier];
  return meta.searchTypes.find((item) => item.value === state.searchType) || meta.searchTypes[0];
}

async function fetchJson(url, params) {
  const res = await fetch(`${url}?${params}`);
  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {message: raw};
  }
  if (!res.ok || data.ok === false) {
    throw new Error(data.message || data.detail || `Error HTTP ${res.status}`);
  }
  return data;
}

function renderEvents(events, emptyText) {
  if (!events.length) return `<div class="empty">${escapeHtml(emptyText)}</div>`;
  return `<div class="timeline">${events.map((event) => `<div class="event">
    <time>${escapeHtml(fallback(dateTime(event.date || event.fecha)))}</time>
    <strong>${escapeHtml(fallback(event.description || event.estado))}</strong>
    <span>${escapeHtml(fallback(event.location || event.oficina || ""))}</span>
  </div>`).join("")}</div>`;
}

function setResultShell(title, subtitle, count = "") {
  $("resultTitle").textContent = title;
  $("resultSubtitle").textContent = subtitle;
  $("resultCount").textContent = count;
}

function renderAvanza(data) {
  const courier = data.courier || {};
  const seguimiento = courier.seguimiento || {};
  const rows = Array.isArray(courier.rows) ? courier.rows : [];
  const events = Array.isArray(seguimiento.eventos) ? seguimiento.eventos : [];
  const status = seguimiento.estadoActual || courier.estado || "";
  const location = unique([seguimiento.comuna, courier.destino]).join(", ");
  const searched = unique([courier.searchedFrom ? `Desde ${courier.searchedFrom}` : "", courier.searchedTo ? `Hasta ${courier.searchedTo}` : ""]).join(" / ");

  setResultShell(data.folio ? `N.Venta ${data.folio}` : "Seguimiento Avanza", data.time ? `Ultima consulta: ${dateTime(data.time)}` : "Consulta Avanza.", data.message || "");
  $("metricEstado").textContent = fallback(status);
  $("metricTracking").textContent = fallback(courier.tracking);
  $("metricReference").textContent = fallback(courier.referencia1 || seguimiento.referencia1 || data.folio);

  if (!data.found || !courier.found) {
    $("results").innerHTML = `<div class="empty">${escapeHtml(data.message || "No encontre seguimiento Avanza para esta nota de venta.")}</div>`;
    return;
  }

  const rowsHtml = rows.length ? `<div class="sectionTitle">Coincidencias Avanza</div>
    <div class="tableWrap"><table><thead><tr><th>Tracking</th><th>Estado</th><th>Destino</th><th>Registro</th><th>Observacion</th></tr></thead>
    <tbody>${rows.map((row) => `<tr>
      <td><strong>${escapeHtml(fallback(row.tracking))}</strong></td>
      <td>${escapeHtml(fallback(row.estado))}</td>
      <td>${escapeHtml(fallback(row.destino))}</td>
      <td>${escapeHtml(unique([row.fechaRegistro, row.horaRegistro]).join(" "))}</td>
      <td>${escapeHtml(fallback(row.observacion))}</td>
    </tr>`).join("")}</tbody></table></div>` : "";

  $("results").innerHTML = `<div class="summary">
    <div class="currentBox">
      <span>Estado actual</span>
      <strong>${escapeHtml(fallback(status))}</strong>
      <p>${escapeHtml(fallback(location))}</p>
    </div>
    <div class="detailGrid">
      <div class="detail"><span>Tracking</span><strong>${escapeHtml(fallback(courier.tracking))}</strong></div>
      <div class="detail"><span>Destino</span><strong>${escapeHtml(fallback(location))}</strong></div>
      <div class="detail"><span>Registro</span><strong>${escapeHtml(unique([courier.fechaRegistro, courier.horaRegistro]).join(" ") || "-")}</strong></div>
      <div class="detail"><span>Referencia</span><strong>${escapeHtml(fallback(courier.referencia1 || seguimiento.referencia1))}</strong></div>
      <div class="detail"><span>Busqueda</span><strong>${escapeHtml(fallback(searched))}</strong></div>
      <div class="detail"><span>Observacion</span><strong>${escapeHtml(fallback(courier.observacion))}</strong></div>
    </div>
  </div>
  <div class="sectionTitle">Linea de tiempo</div>
  ${renderEvents(events, "Avanza no entrego eventos de seguimiento para este tracking.")}
  ${rowsHtml}`;
}

function renderFedex(data) {
  const shipments = Array.isArray(data.shipments) ? data.shipments : [];
  const first = shipments[0] || {};
  setResultShell(data.tracking ? `Tracking ${data.tracking}` : data.invoice ? `Factura ${data.invoice}` : "Seguimiento FedEx", data.time ? `Ultima consulta: ${dateTime(data.time)}` : "Consulta FedEx.", data.message || "");
  $("metricEstado").textContent = fallback(first.status);
  $("metricTracking").textContent = fallback(first.trackingNumber);
  $("metricReference").textContent = fallback(first.invoiceNumber || first.purchaseOrder || data.invoice || data.tracking);

  if (!shipments.length) {
    $("results").innerHTML = `<div class="empty">No encontre envios FedEx para esa busqueda.</div>`;
    return;
  }

  $("results").innerHTML = shipments.map((shipment, index) => `<article class="shipment">
    <div class="shipmentHead">
      <div>
        <h3>${escapeHtml(fallback(shipment.trackingNumber || `Envio ${index + 1}`))}</h3>
        <p>${escapeHtml(fallback(shipment.service))}</p>
      </div>
      <span class="pill">${escapeHtml(fallback(shipment.status))}</span>
    </div>
    <div class="detailGrid">
      <div class="detail"><span>Tracking</span><strong>${escapeHtml(fallback(shipment.trackingNumber))}</strong></div>
      <div class="detail"><span>Factura</span><strong>${escapeHtml(fallback(shipment.invoiceNumber))}</strong></div>
      <div class="detail"><span>Estado</span><strong>${escapeHtml(fallback(shipment.status))}</strong></div>
      <div class="detail"><span>Destino</span><strong>${escapeHtml(fallback(shipment.destination))}</strong></div>
      <div class="detail"><span>Entrega estimada</span><strong>${escapeHtml(fallback(dateTime(shipment.estimatedDelivery)))}</strong></div>
      <div class="detail"><span>Orden compra</span><strong>${escapeHtml(fallback(shipment.purchaseOrder))}</strong></div>
    </div>
    <div class="sectionTitle">Linea de tiempo</div>
    ${renderEvents(Array.isArray(shipment.events) ? shipment.events : [], "FedEx no entrego eventos de seguimiento para este envio.")}
  </article>`).join("");
}

function renderCorreos(data) {
  const shipments = Array.isArray(data.shipments) ? data.shipments : [];
  const first = shipments[0] || {};
  setResultShell(data.invoice ? `Factura ${data.invoice}` : "Seguimiento Correos", data.time ? `Ultima consulta: ${dateTime(data.time)}` : "Consulta Correos.", data.message || "");
  $("metricEstado").textContent = fallback(first.status);
  $("metricTracking").textContent = fallback(first.trackingNumber);
  $("metricReference").textContent = fallback(first.invoiceNumber || data.invoice);

  if (!shipments.length) {
    $("results").innerHTML = `<div class="empty">No encontre envios Correos para esa factura.</div>`;
    return;
  }

  $("results").innerHTML = shipments.map((shipment, index) => `<article class="shipment">
    <div class="shipmentHead">
      <div>
        <h3>${escapeHtml(fallback(shipment.trackingNumber || `Envio ${index + 1}`))}</h3>
        <p>${escapeHtml(fallback(shipment.service ? `Servicio ${shipment.service}` : ""))}</p>
      </div>
      <span class="pill">${escapeHtml(fallback(shipment.status))}</span>
    </div>
    <div class="detailGrid">
      <div class="detail"><span>Tracking</span><strong>${escapeHtml(fallback(shipment.trackingNumber))}</strong></div>
      <div class="detail"><span>Factura / referencia</span><strong>${escapeHtml(fallback(shipment.invoiceNumber))}</strong></div>
      <div class="detail"><span>Estado</span><strong>${escapeHtml(fallback(shipment.status))}</strong></div>
      <div class="detail"><span>Fecha entrega</span><strong>${escapeHtml(fallback(shipment.deliveryDate))}</strong></div>
      <div class="detail"><span>Recibido por</span><strong>${escapeHtml(fallback(shipment.receiverName))}</strong></div>
      <div class="detail"><span>Oficina</span><strong>${escapeHtml(fallback(shipment.office))}</strong></div>
    </div>
    <div class="sectionTitle">Linea de tiempo</div>
    ${renderEvents(Array.isArray(shipment.events) ? shipment.events : [], "Correos no entrego eventos para este envio.")}
  </article>`).join("");
}

async function search(event) {
  event.preventDefault();
  let data;
  let query = clean($("queryInput").value);
  const courier = state.courier;
  const searchType = state.searchType;

  if (courier === "avanza") query = digits(query);
  if (courier === "correos") query = firstInvoice(query);
  if (courier === "fedex" && searchType === "invoice") query = firstInvoice(query);
  if (courier === "fedex" && searchType === "tracking") query = digits(query);
  if (!query) return;

  $("queryInput").value = query;
  $("searchButton").disabled = true;
  resetMetrics();
  setResultShell(`${couriers[courier].name} ${query}`, `Consultando ${couriers[courier].name}...`);
  $("results").innerHTML = `<div class="empty">Consultando seguimiento...</div>`;
  message(`Consultando ${couriers[courier].name}...`);

  try {
    if (courier === "avanza") {
      data = await fetchJson(config.avanzaFunctionUrl, new URLSearchParams({folio: query}));
      renderAvanza(data);
    } else if (courier === "correos") {
      data = await fetchJson(config.correosFunctionUrl, new URLSearchParams({invoice: query}));
      renderCorreos(data);
    } else {
      const params = searchType === "tracking"
        ? new URLSearchParams({type: "tracking", tracking: query})
        : new URLSearchParams({type: "invoice", invoice: query, from: $("fromInput").value, to: $("toInput").value});
      data = await fetchJson(config.fedexFunctionUrl, params);
      renderFedex(data);
    }
    message(data.message || "Consulta lista.", data.found ? "" : "error");
  } catch (error) {
    $("results").innerHTML = `<div class="empty">${escapeHtml(error.message || "Error consultando courier.")}</div>`;
    message(error.message || "Error consultando courier.", "error");
  } finally {
    $("searchButton").disabled = false;
  }
}

function syncSearchType(preserveValue = true) {
  const select = $("searchType");
  const meta = couriers[state.courier];
  const previous = preserveValue ? select.value : "";
  select.innerHTML = meta.searchTypes
    .map((item) => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`)
    .join("");
  const next = meta.searchTypes.some((item) => item.value === previous) ? previous : meta.searchTypes[0].value;
  select.value = next;
  state.searchType = next;
  select.disabled = meta.searchTypes.length === 1;

  const type = currentSearchType();
  const usesFedexInvoiceDates = state.courier === "fedex" && state.searchType === "invoice";
  $("queryLabel").textContent = type.queryLabel;
  $("queryInput").placeholder = type.placeholder;
  $("fromField").hidden = !usesFedexInvoiceDates;
  $("toField").hidden = !usesFedexInvoiceDates;
  $("fromInput").required = usesFedexInvoiceDates;
  $("toInput").required = usesFedexInvoiceDates;
}

function resetSearchView() {
  const meta = couriers[state.courier];
  const type = currentSearchType();
  const title = state.courier === "fedex" && state.searchType === "tracking"
    ? "Seguimiento FedEx por tracking"
    : meta.resultTitle;
  const subtitle = state.courier === "fedex"
    ? `Ingresa ${type.label.toLowerCase()} para consultar.`
    : meta.subtitle;
  message("");
  resetMetrics();
  setResultShell(title, subtitle);
  $("resultCount").textContent = "";
  $("results").innerHTML = `<div class="empty">Sin consulta.</div>`;
}

function setCourier(courier) {
  state.courier = courier;
  document.querySelectorAll(".courierTab").forEach((button) => {
    button.classList.toggle("active", button.dataset.courier === courier);
  });
  $("queryInput").value = "";
  syncSearchType(false);
  resetSearchView();
}

document.querySelectorAll(".courierTab").forEach((button) => {
  button.addEventListener("click", () => setCourier(button.dataset.courier));
});

$("searchType").addEventListener("change", () => {
  state.searchType = $("searchType").value;
  $("queryInput").value = "";
  syncSearchType();
  resetSearchView();
});
$("searchForm").addEventListener("submit", search);

setDefaultDates();
setCourier("avanza");
