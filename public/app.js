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

/**
 * Estado central da aplicação.
 *
 * praias: lista completa recebida da API.
 * filtradas: lista exibida após filtros.
 * markersCache: guarda marcadores já criados para reutilização.
 * visibleMarkers: guarda apenas os marcadores atualmente adicionados ao mapa.
 * limiteCards: limita a quantidade de cards renderizados simultaneamente.
 */
const state = {
  praias: [],
  filtradas: [],
  markersCache: new Map(),
  visibleMarkers: new Map(),
  limiteCards: 120
};

/**
 * Referências aos elementos HTML manipulados pelo JavaScript.
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
 * Cria o mapa principal usando Leaflet.
 *
 * A opção preferCanvas ajuda em camadas vetoriais, mas os marcadores
 * personalizados continuam sendo elementos do Leaflet. A principal
 * otimização aqui é renderizar apenas os pontos visíveis.
 */
const map = L.map("map", { preferCanvas: true }).setView([-27.4, -48.7], 8);

/**
 * Camada visual do mapa usando OpenStreetMap.
 */
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap"
}).addTo(map);

const greenIcon = L.divIcon({
    className: "custom-marker",
    html: "🟢",
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

const redIcon = L.divIcon({
    className: "custom-marker",
    html: "🔴",
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

let filtroTimer = null;
let mapaTimer = null;

/**
 * Gera uma chave única para cada ponto monitorado.
 *
 * @param {Object} praia Dados do ponto.
 * @returns {string} Identificador único.
 */
function getMarkerKey(praia) {
  return String(
    praia.codigo ||
    `${praia.municipio}-${praia.balneario}-${praia.ponto}-${praia.latitude}-${praia.longitude}`
  );
}

/**
 * Verifica se o ponto está próprio.
 *
 * A verificação impede que "IMPRÓPRIO" seja confundido com "PRÓPRIO".
 *
 * @param {Object} praia Dados do ponto.
 * @returns {boolean}
 */
function isPropria(praia) {
  return praia.condicao &&
    praia.condicao.toUpperCase().includes("PRÓPRIO") &&
    !praia.condicao.toUpperCase().includes("IMPRÓPRIO");
}

/**
 * Verifica se o ponto está impróprio.
 *
 * @param {Object} praia Dados do ponto.
 * @returns {boolean}
 */
function isImpropria(praia) {
  return praia.condicao &&
    praia.condicao.toUpperCase().includes("IMPRÓPRIO");
}

/**
 * Formata data ISO para o padrão brasileiro.
 *
 * @param {string} iso Data em formato ISO.
 * @returns {string}
 */
function formatarDataHora(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleString("pt-BR");
}

/**
 * Calcula a confiabilidade recente com base nas últimas cinco análises.
 *
 * Esse indicador é apenas informativo e não substitui a classificação
 * oficial do IMA.
 *
 * @param {Object} praia Dados do ponto.
 * @returns {{total: number, adequadas: number}}
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
 * Atualiza os indicadores superiores.
 */
function resumo() {
  els.total.textContent = state.praias.length;
  els.proprias.textContent = state.praias.filter(isPropria).length;
  els.improprias.textContent = state.praias.filter(isImpropria).length;
}

/**
 * Preenche o filtro de municípios com base nos dados carregados.
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
 * Cria o conteúdo do tooltip exibido ao passar o mouse.
 *
 * @param {Object} p Dados do ponto.
 * @returns {string}
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
 * Cria o conteúdo do popup exibido ao clicar no marcador.
 *
 * @param {Object} p Dados do ponto.
 * @returns {string}
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
 * Cria ou reaproveita um marcador.
 *
 * O marcador só recebe tooltip quando o mouse passa por cima e só recebe
 * popup quando o usuário clica. Isso reduz a quantidade de elementos ativos
 * no mapa.
 *
 * @param {Object} p Dados do ponto.
 * @returns {Object} Marcador Leaflet.
 */
function obterOuCriarMarcador(p) {
  const key = getMarkerKey(p);

  if (state.markersCache.has(key)) {
    return state.markersCache.get(key);
  }

  const marker = L.marker(
    [p.latitude, p.longitude],
    {
        icon: isImpropria(p)
            ? redIcon
            : greenIcon
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

  state.markersCache.set(key, marker);
  return marker;
}

/**
 * Verifica se um ponto está dentro da área visível do mapa.
 *
 * @param {Object} p Dados do ponto.
 * @param {Object} bounds Limites visíveis do mapa.
 * @returns {boolean}
 */
function pontoEstaVisivel(p, bounds) {
  return bounds.contains([p.latitude, p.longitude]);
}

/**
 * Renderiza somente os marcadores que estão visíveis na tela.
 *
 * Essa técnica é chamada de viewport culling. Ela mantém todos os dados
 * carregados, mas adiciona ao mapa apenas os pontos dentro da área visível,
 * reduzindo o número de elementos renderizados pelo navegador.
 */
function renderMapaVisivel() {
  const bounds = map.getBounds().pad(0.15);
  const proximosVisiveis = new Set();

  state.filtradas.forEach(p => {
    if (!pontoEstaVisivel(p, bounds)) {
      return;
    }

    const key = getMarkerKey(p);
    proximosVisiveis.add(key);

    if (!state.visibleMarkers.has(key)) {
      const marker = obterOuCriarMarcador(p);
      marker.addTo(map);
      state.visibleMarkers.set(key, marker);
    }
  });

  state.visibleMarkers.forEach((marker, key) => {
    if (!proximosVisiveis.has(key)) {
      map.removeLayer(marker);
      state.visibleMarkers.delete(key);
    }
  });
}

/**
 * Agenda a atualização dos marcadores visíveis.
 *
 * O pequeno atraso evita múltiplas atualizações seguidas enquanto o mapa
 * está terminando de mover ou aproximar.
 */
function agendarRenderMapaVisivel() {
  clearTimeout(mapaTimer);
  mapaTimer = setTimeout(renderMapaVisivel, 80);
}

/**
 * Remove todos os marcadores atualmente visíveis.
 */
function limparMarcadoresVisiveis() {
  state.visibleMarkers.forEach(marker => map.removeLayer(marker));
  state.visibleMarkers.clear();
}

/**
 * Atualiza o mapa após a aplicação de filtros.
 *
 * Quando o filtro muda, removemos os marcadores visíveis e renderizamos
 * novamente apenas os que continuam dentro da área atual do mapa.
 */
function renderMapa(lista) {
  limparMarcadoresVisiveis();
  state.filtradas = lista;
  renderMapaVisivel();
}

/**
 * Renderiza os cards dos pontos filtrados.
 *
 * A lista é limitada para melhorar desempenho quando muitos resultados
 * são encontrados.
 *
 * @param {Array} lista Lista de pontos.
 */
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

/**
 * Aplica busca textual, filtro por município e filtro por situação.
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

  els.status.textContent = `${state.filtradas.length} ponto(s) filtrado(s). Renderizando apenas os visíveis no mapa.`;

  renderCards(state.filtradas);
  renderMapa(state.filtradas);
}

/**
 * Aplica filtros com atraso curto para evitar reprocessamento a cada tecla.
 */
function aplicarFiltrosComDebounce() {
  clearTimeout(filtroTimer);
  filtroTimer = setTimeout(aplicarFiltros, 400);
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
    els.status.textContent = `${state.praias.length} pontos carregados do IMA. Renderizando apenas os pontos visíveis no mapa.`;

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
els.search.addEventListener("input", aplicarFiltrosComDebounce);
els.filter.addEventListener("change", aplicarFiltros);
els.cityFilter.addEventListener("change", aplicarFiltros);

/**
 * Atualiza os marcadores apenas quando o usuário termina de mover ou dar zoom.
 */
map.on("moveend zoomend", agendarRenderMapaVisivel);

/**
 * Inicialização do sistema.
 */
carregarPraias();
