/**
 * ============================================================
 * PONTO SEGURO - FRONTEND
 * ============================================================
 *
 * Este arquivo contém a lógica principal da interface.
 *
 * Principais responsabilidades:
 * - Buscar dados no backend.
 * - Exibir os pontos no mapa.
 * - Criar cards com informações das praias.
 * - Aplicar filtros por busca, município e situação.
 * - Exibir tooltips e popups no mapa.
 * - Calcular a confiabilidade recente das análises.
 */

const API = "/api/praias";

const state = {
  praias: [],
  filtradas: [],
  markers: [],
  limiteCards: 120
};

const els = {
  search: document.getElementById("search"),
  filter: document.getElementById("filter"),
  cityFilter: document.getElementById("cityFilter"),
  cards: document.getElementById("cards"),
  status: document.getElementById("status"),
  total: document.getElementById("total"),
  proprias: document.getElementById("proprias"),
  improprias: document.getElementById("improprias"),
  updated: document.getElementById("updated")
};

const map = L.map("map", { preferCanvas: true }).setView([-27.4, -48.7], 8);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap"
}).addTo(map);
 
const greenIcon = L.divIcon({

    className: "custom-marker",
    html: "🟢",
    iconSize: [24,24],
    iconAnchor: [12,12]

});

const redIcon = L.divIcon({

    className: "custom-marker",
    html: "🔴",
    iconSize: [24,24],
    iconAnchor: [12,12]

});

let filtroTimer = null;

function isPropria(praia) {
  return praia.condicao &&
    praia.condicao.toUpperCase().includes("PRÓPRIO") &&
    !praia.condicao.toUpperCase().includes("IMPRÓPRIO");
}

function isImpropria(praia) {
  return praia.condicao &&
    praia.condicao.toUpperCase().includes("IMPRÓPRIO");
}

function formatarDataHora(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleString("pt-BR");
}

function calcularConfiabilidade(praia) {
  const ultimas = Array.isArray(praia.analises) ? praia.analises.slice(0, 5) : [];
  const adequadas = ultimas.filter(analise => {
    const resultado = Number(String(analise.RESULTADO || "").replace(",", "."));
    return Number.isFinite(resultado) && resultado < 800;
  }).length;
  return { total: ultimas.length, adequadas };
}

function resumo() {
  els.total.textContent = state.praias.length;
  els.proprias.textContent = state.praias.filter(isPropria).length;
  els.improprias.textContent = state.praias.filter(isImpropria).length;
}

function carregarMunicipios() {
  els.cityFilter.innerHTML = '<option value="TODAS">Todos os municípios</option>';
  const municipios = [...new Set(state.praias.map(p => p.municipio))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  municipios.forEach(municipio => {
    const option = document.createElement("option");
    option.value = municipio;
    option.textContent = municipio;
    els.cityFilter.appendChild(option);
  });
}

function criarTooltip(p) {
  return `
    <strong>📍 ${p.balneario}</strong><br>
    🏙 ${p.municipio}<br>
    ${isImpropria(p) ? "🔴 Imprópria" : "🟢 Própria"}<br>
    📅 ${p.data || "Data não informada"}
  `;
}

function criarPopup(p) {
  const confiabilidade = calcularConfiabilidade(p);
  return `
    <div class="popup-title">📍 ${p.balneario}</div>
    <div>🏙 ${p.municipio}</div>
    ${p.ponto ? `<div>📌 ${p.ponto}</div>` : ""}
    <div><strong>${isImpropria(p) ? "🔴 Imprópria" : "🟢 Própria"}</strong></div>
    <hr>
    <div>📅 Data: ${p.data || "Não informada"}</div>
    <div>🌧 Chuva: ${p.chuva || "Não informada"}</div>
    <div>🌡 Água: ${p.tempAgua || "Não informada"}°C</div>
    <div>🦠 E. coli: ${p.resultado || "Não informado"} NMP/100mL</div>
    <div>📊 ${confiabilidade.adequadas}/${confiabilidade.total} análises recentes abaixo de 800 NMP/100mL</div>
  `;
}

function criarMarcador(p) {

    const marker = L.marker(
        [p.latitude, p.longitude],
        {
            icon: isImpropria(p) ? redIcon : greenIcon
        }
    );

    marker.on("mouseover", () => {

        marker.bindTooltip(criarTooltip(p), {
            direction: "top",
            opacity: 0.96,
            sticky: false,
            className: "ponto-tooltip"
        });

        marker.openTooltip();

    });

    marker.on("mouseout", () => {

        marker.closeTooltip();
        marker.unbindTooltip();

    });

    marker.on("click", () => {

        if (!marker.getPopup()) {
            marker.bindPopup(criarPopup(p));
        }

        marker.openPopup();

    });

    return marker;

}

function renderMapa(lista) {

    state.markers ??= [];

    state.markers.forEach(marker => map.removeLayer(marker));

    state.markers = [];

    lista.forEach(p => {

        const marker = criarMarcador(p);

        marker.addTo(map);

        state.markers.push(marker);

    });

}

function renderCards(lista) {
  els.cards.innerHTML = "";

  if (!lista.length) {
    els.cards.innerHTML = "<p>Nenhum ponto encontrado.</p>";
    return;
  }

  const fragment = document.createDocumentFragment();
  const listaLimitada = lista.slice(0, state.limiteCards);

  if (lista.length > state.limiteCards) {
    const aviso = document.createElement("p");
    aviso.className = "status";
    aviso.textContent = `Exibindo ${state.limiteCards} de ${lista.length} cards. Use os filtros para refinar a busca.`;
    fragment.appendChild(aviso);
  }

  listaLimitada.forEach(p => {
    const card = document.createElement("article");
    const propria = isPropria(p);
    const impropria = isImpropria(p);
    const confiabilidade = calcularConfiabilidade(p);
    const porcentagem = confiabilidade.total
      ? Math.round((confiabilidade.adequadas / confiabilidade.total) * 100)
      : 0;

    card.className = `card ${propria ? "proprio" : ""} ${impropria ? "improprio" : ""}`;

    card.innerHTML = `
      <h3>📍 ${p.balneario}</h3>
      <p class="muted">🏙 ${p.municipio}${p.ponto ? " • " + p.ponto : ""}</p>
      <span class="badge ${impropria ? "improprio" : "proprio"}">
        ${impropria ? "🔴 Imprópria" : "🟢 Própria para banho"}
      </span>
      <div class="confidence">
        <div class="confidence-label">
          <span>Confiabilidade recente</span>
          <span>${confiabilidade.adequadas}/${confiabilidade.total || 0}</span>
        </div>
        <div class="confidence-bar">
          <div class="confidence-fill" style="width: ${porcentagem}%"></div>
        </div>
      </div>
      <div class="details">
        <div class="detail-row"><span>📌</span><div><strong>Local:</strong> ${p.localizacao || "Não informado"}</div></div>
        <div class="detail-row"><span>📅</span><div><strong>Data:</strong> ${p.data || "Não informada"}</div></div>
        <div class="detail-row"><span>🌧</span><div><strong>Chuva:</strong> ${p.chuva || "Não informada"}</div></div>
        <div class="detail-row"><span>🌡</span><div><strong>Temperatura da água:</strong> ${p.tempAgua || "Não informado"}°C</div></div>
        <div class="detail-row"><span>🦠</span><div><strong>E. coli:</strong> ${p.resultado || "Não informado"} NMP/100mL</div></div>
      </div>
    `;

    card.addEventListener("click", () => {
      map.setView([p.latitude, p.longitude], 14);
      window.scrollTo({
        top: document.getElementById("map").offsetTop - 12,
        behavior: "smooth"
      });
    });

    fragment.appendChild(card);
  });

  els.cards.appendChild(fragment);
}

function aplicarFiltros() {
  const termo = els.search.value.trim().toLowerCase();
  const filtro = els.filter.value;
  const cidadeSelecionada = els.cityFilter.value;

  state.filtradas = state.praias.filter(p => {
    const texto = `${p.balneario} ${p.municipio} ${p.ponto} ${p.localizacao}`.toLowerCase();
    const bateTexto = texto.includes(termo);
    const bateCidade = cidadeSelecionada === "TODAS" || p.municipio === cidadeSelecionada;
    const bateStatus =
      filtro === "TODAS" ||
      (filtro === "PRÓPRIO" && isPropria(p)) ||
      (filtro === "IMPRÓPRIO" && isImpropria(p));

    return bateTexto && bateCidade && bateStatus;
  });

  els.status.textContent = `${state.filtradas.length} ponto(s) exibido(s).`;
  renderCards(state.filtradas);
  renderMapa(state.filtradas);
}

function aplicarFiltrosComDebounce() {
  clearTimeout(filtroTimer);
  filtroTimer = setTimeout(aplicarFiltros, 250);
}

async function carregarPraias() {
  try {
    els.status.textContent = "Carregando dados reais do IMA...";
    const resposta = await fetch(API);

    if (!resposta.ok) throw new Error(`Erro ${resposta.status}`);

    const json = await resposta.json();
    state.praias = json.dados || [];
    state.filtradas = state.praias;

    els.updated.textContent = formatarDataHora(json.atualizadoEm);
    els.status.textContent = `${state.praias.length} pontos carregados do IMA.`;

    resumo();
    carregarMunicipios();
    renderCards(state.praias);
    renderMapa(state.praias);
  } catch (erro) {
    console.error(erro);
    els.status.textContent = "Erro ao carregar dados. Verifique se o backend está rodando.";
  }
}

els.search.addEventListener("input", aplicarFiltrosComDebounce);
els.filter.addEventListener("change", aplicarFiltros);
els.cityFilter.addEventListener("change", aplicarFiltros);

carregarPraias();
