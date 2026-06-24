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

/**
 * Endpoint local do backend.
 *
 * O frontend não acessa diretamente o IMA. Ele consulta o backend,
 * que busca os dados no endpoint oficial e os devolve normalizados.
 *
 * @constant {string}
 */
const API = "/api/praias";

/**
 * Estado central da aplicação.
 *
 * @property {Array} praias Lista completa recebida da API.
 * @property {Array} filtradas Lista exibida após filtros.
 * @property {Array} markers Marcadores atualmente exibidos no mapa.
 */
const state = {
  praias: [],
  filtradas: [],
  markers: []
};

/**
 * Referências aos elementos HTML utilizados pela interface.
 *
 * Concentrar essas referências em um único objeto evita chamadas
 * repetidas ao document.getElementById ao longo do código.
 */
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

/**
 * Cria o mapa principal usando a biblioteca Leaflet.
 *
 * A posição inicial foi definida para Santa Catarina.
 */
const map = L.map("map").setView([-27.4, -48.7], 8);

/**
 * Adiciona a camada visual do OpenStreetMap ao mapa.
 */
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap"
}).addTo(map);

/**
 * Ícone usado para pontos próprios para banho.
 */
const greenIcon = L.divIcon({
  className: "custom-marker",
  html: "🟢",
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

/**
 * Ícone usado para pontos impróprios para banho.
 */
const redIcon = L.divIcon({
  className: "custom-marker",
  html: "🔴",
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

/**
 * Verifica se o ponto está classificado como próprio.
 *
 * A verificação impede que a palavra "IMPRÓPRIO" seja confundida
 * com "PRÓPRIO", pois uma contém a outra.
 *
 * @param {Object} praia Objeto com os dados do ponto monitorado.
 * @returns {boolean} Verdadeiro quando o ponto está próprio.
 */
function isPropria(praia) {
  return praia.condicao &&
    praia.condicao.toUpperCase().includes("PRÓPRIO") &&
    !praia.condicao.toUpperCase().includes("IMPRÓPRIO");
}

/**
 * Verifica se o ponto está classificado como impróprio.
 *
 * @param {Object} praia Objeto com os dados do ponto monitorado.
 * @returns {boolean} Verdadeiro quando o ponto está impróprio.
 */
function isImpropria(praia) {
  return praia.condicao &&
    praia.condicao.toUpperCase().includes("IMPRÓPRIO");
}

/**
 * Formata data e hora em formato brasileiro.
 *
 * @param {string} iso Data em formato ISO.
 * @returns {string} Data formatada para pt-BR.
 */
function formatarDataHora(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleString("pt-BR");
}

/**
 * Calcula a confiabilidade recente do ponto monitorado.
 *
 * O cálculo considera as últimas cinco análises disponíveis e verifica
 * quantas ficaram abaixo de 800 NMP/100mL de E. coli.
 *
 * Importante: este indicador é informativo e não substitui a
 * classificação oficial do IMA.
 *
 * @param {Object} praia Objeto com dados do ponto monitorado.
 * @returns {{total: number, adequadas: number}} Resultado do cálculo.
 */
function calcularConfiabilidade(praia) {
  const ultimas = Array.isArray(praia.analises) ? praia.analises.slice(0, 5) : [];

  const adequadas = ultimas.filter(analise => {
    const resultado = Number(String(analise.RESULTADO || "").replace(",", "."));
    return Number.isFinite(resultado) && resultado < 800;
  }).length;

  return {
    total: ultimas.length,
    adequadas
  };
}

/**
 * Atualiza os indicadores superiores da interface.
 */
function resumo() {
  const proprias = state.praias.filter(isPropria).length;
  const improprias = state.praias.filter(isImpropria).length;

  els.total.textContent = state.praias.length;
  els.proprias.textContent = proprias;
  els.improprias.textContent = improprias;
}

/**
 * Preenche automaticamente o filtro de municípios.
 *
 * Os municípios são extraídos da lista de pontos carregados pela API.
 */
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

/**
 * Remove todos os marcadores do mapa.
 *
 * Essa função é usada antes de desenhar os pontos novamente,
 * principalmente após a aplicação de filtros.
 */
function limparMarcadores() {
  state.markers.forEach(marker => marker.remove());
  state.markers = [];
}

/**
 * Cria o conteúdo do tooltip exibido ao passar o mouse sobre o marcador.
 *
 * @param {Object} p Ponto monitorado.
 * @returns {string} HTML do tooltip.
 */
function criarTooltip(p) {
  return `
    <strong>📍 ${p.balneario}</strong><br>
    🏙 ${p.municipio}<br>
    ${isImpropria(p) ? "🔴 Imprópria" : "🟢 Própria"}<br>
    📅 ${p.data || "Data não informada"}
  `;
}

/**
 * Cria o conteúdo do popup exibido ao clicar em um marcador.
 *
 * @param {Object} p Ponto monitorado.
 * @returns {string} HTML do popup.
 */
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

/**
 * Renderiza os marcadores no mapa.
 *
 * Cada ponto recebe:
 * - Ícone verde ou vermelho.
 * - Tooltip ao passar o mouse.
 * - Popup detalhado ao clicar.
 *
 * @param {Array} lista Lista de pontos monitorados.
 */
function renderMapa(lista) {
  limparMarcadores();

  lista.forEach(p => {
    const marker = L.marker([p.latitude, p.longitude], {
      icon: isImpropria(p) ? redIcon : greenIcon
    })
      .addTo(map)
      .bindTooltip(criarTooltip(p), {
        direction: "top",
        opacity: 0.96,
        sticky: true,
        className: "ponto-tooltip"
      })
      .bindPopup(criarPopup(p));

    state.markers.push(marker);
  });
}

/**
 * Renderiza os cards dos pontos monitorados.
 *
 * Os cards exibem:
 * - Nome do balneário.
 * - Município.
 * - Condição.
 * - Indicador de confiabilidade recente.
 * - Dados da análise mais recente.
 *
 * @param {Array} lista Lista de pontos monitorados.
 */
function renderCards(lista) {
  els.cards.innerHTML = "";

  if (!lista.length) {
    els.cards.innerHTML = "<p>Nenhum ponto encontrado.</p>";
    return;
  }

  lista.forEach(p => {
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

    /**
     * Ao clicar no card, o mapa é centralizado no ponto correspondente.
     */
    card.addEventListener("click", () => {
      map.setView([p.latitude, p.longitude], 14);
      window.scrollTo({
        top: document.getElementById("map").offsetTop - 12,
        behavior: "smooth"
      });
    });

    els.cards.appendChild(card);
  });
}

/**
 * Aplica os filtros da interface.
 *
 * Filtros disponíveis:
 * - Texto digitado na busca.
 * - Município selecionado.
 * - Situação própria/imprópria.
 */
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

/**
 * Carrega os dados reais do backend e inicializa a interface.
 */
async function carregarPraias() {
  try {
    els.status.textContent = "Carregando dados reais do IMA...";

    const resposta = await fetch(API);

    if (!resposta.ok) {
      throw new Error(`Erro ${resposta.status}`);
    }

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

/**
 * Eventos de interação da interface.
 */
els.search.addEventListener("input", aplicarFiltros);
els.filter.addEventListener("change", aplicarFiltros);
els.cityFilter.addEventListener("change", aplicarFiltros);

/**
 * Inicializa a aplicação.
 */
carregarPraias();
