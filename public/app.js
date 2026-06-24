/**
 * Endpoint utilizado pelo frontend para obter os dados
 * processados pelo servidor backend.
 */
const API = "/api/praias";

/**
 * Armazena os dados utilizados pelo frontend.
 *
 * praias:
 * Lista completa recebida do backend.
 *
 * filtradas:
 * Lista resultante após aplicação de filtros.
 *
 * markers:
 * Marcadores atualmente exibidos no mapa.
 */
const state = {
  praias: [],
  filtradas: [],
  markers: []
};

function carregarMunicipios() {
  const municipios = [...new Set(state.praias.map(p => p.municipio))].sort();

  municipios.forEach(municipio => {
    const option = document.createElement("option");
    option.value = municipio;
    option.textContent = municipio;
    els.cityFilter.appendChild(option);
  });
}

/**
 * Referências para os elementos da interface.
 *
 * Permite manipular os componentes da página
 * sem realizar múltiplas buscas no DOM.
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
 * Cria o mapa principal utilizando Leaflet.
 *
 * O mapa é centralizado inicialmente no litoral
 * de Santa Catarina.
 */
const map = L.map("map").setView([-27.4, -48.7], 8);


L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap"
}).addTo(map);

/**
 * Ícone utilizado para praias próprias.
 */
const greenIcon = L.divIcon({
  className: "custom-marker",
  html: "🟢",
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

/**
 * Ícone utilizado para praias impróprias.
 */
const redIcon = L.divIcon({
  className: "custom-marker",
  html: "🔴",
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

/**
 * Verifica se uma praia está própria para banho.
 *
 * @param {Object} praia Praia analisada.
 * @returns {boolean}
 */
function isPropria(praia) {
  return praia.condicao && praia.condicao.toUpperCase().includes("PRÓPRIO") && !praia.condicao.toUpperCase().includes("IMPRÓPRIO");
}

/**
 * Verifica se uma praia está imprópria para banho.
 *
 * @param {Object} praia Praia analisada.
 * @returns {boolean}
 */
function isImpropria(praia) {
  return praia.condicao && praia.condicao.toUpperCase().includes("IMPRÓPRIO");
}

function formatarDataHora(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleString("pt-BR");
}

/**
 * Atualiza os indicadores exibidos na página.
 *
 * Exibe:
 * - Total de pontos
 * - Quantidade de pontos próprios
 * - Quantidade de pontos impróprios
 */
function resumo() {
  const proprias = state.praias.filter(isPropria).length;
  const improprias = state.praias.filter(isImpropria).length;

  els.total.textContent = state.praias.length;
  els.proprias.textContent = proprias;
  els.improprias.textContent = improprias;
}

/**
 * Remove todos os marcadores atualmente
 * exibidos no mapa.
 */
function limparMarcadores() {
  state.markers.forEach(marker => marker.remove());
  state.markers = [];
}

/**
 * Cria os marcadores das praias no mapa.
 *
 * @param {Array} lista Lista de praias a serem exibidas.
 */
function renderMapa(lista) {
  limparMarcadores();

  lista.forEach(p => {
    const marker = L.marker([p.latitude, p.longitude], {
      icon: isImpropria(p) ? redIcon : greenIcon
    })
      .addTo(map)
      .bindPopup(`
        <strong>${p.balneario}</strong><br>
        ${p.municipio}<br>
        ${p.ponto ? p.ponto + "<br>" : ""}
        <b>${p.condicao}</b><br>
        ${p.data || ""}
      `);

    state.markers.push(marker);
  });
}

/**
 * Gera os cartões de informação das praias.
 *
 * Cada cartão apresenta:
 * - Nome da praia
 * - Município
 * - Condição
 * - Data da análise
 * - Informações complementares
 *
 * @param {Array} lista Lista de praias.
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

    card.className = `card ${propria ? "proprio" : ""} ${impropria ? "improprio" : ""}`;

    card.innerHTML = `
      <h3>${p.balneario}</h3>
      <p class="muted">${p.municipio}${p.ponto ? " • " + p.ponto : ""}</p>

      <span class="badge ${impropria ? "improprio" : "proprio"}">
        ${impropria ? "🔴 Imprópria" : "🟢 Própria"}
      </span>

      <div class="details">
        <div><strong>Local:</strong> ${p.localizacao || "Não informado"}</div>
        <div><strong>Data:</strong> ${p.data || "Não informada"}</div>
        <div><strong>Chuva:</strong> ${p.chuva || "Não informado"}</div>
        <div><strong>Nivel de E. Coli:</strong> ${p.resultado || "Não informado"}</div>
        <div><strong>Temp. água:</strong> ${p.tempAgua || "Não informado"}</div>
      </div>
    `;

    card.addEventListener("click", () => {
      map.setView([p.latitude, p.longitude], 14);
      window.scrollTo({ top: document.getElementById("map").offsetTop - 10, behavior: "smooth" });
    });

    els.cards.appendChild(card);
  });
}

/**
 * Realiza a pesquisa textual e aplica
 * os filtros de condição selecionados
 * pelo usuário.
 */
function aplicarFiltros() {
  const termo = els.search.value.trim().toLowerCase();
  const filtro = els.filter.value;
  const cidadeSelecionada = els.cityFilter.value;

  state.filtradas = state.praias.filter(p => {
    const texto = `${p.balneario} ${p.municipio} ${p.ponto} ${p.localizacao}`.toLowerCase();

    const bateTexto = texto.includes(termo);
    const bateStatus =
      filtro === "TODAS" ||
      (filtro === "PRÓPRIO" && isPropria(p)) ||
      (filtro === "IMPRÓPRIO" && isImpropria(p));

    const bateCidade =
      cidadeSelecionada === "TODAS" || p.municipio === cidadeSelecionada;
    return bateTexto && bateStatus && bateCidade;
  });

  els.status.textContent = `${state.filtradas.length} ponto(s) exibido(s).`;
  renderCards(state.filtradas);
  renderMapa(state.filtradas);
}

/**
 * Carrega os dados do backend.
 *
 * Fluxo:
 * 1. Consulta a API local.
 * 2. Recebe os dados normalizados.
 * 3. Atualiza os indicadores.
 * 4. Atualiza o mapa.
 * 5. Atualiza a lista de praias.
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
 * Evento disparado quando o usuário
 * digita no campo de pesquisa.
 */
els.search.addEventListener("input", aplicarFiltros);

/**
 * Evento disparado quando o usuário
 * altera o filtro de condição.
 */
els.filter.addEventListener("change", aplicarFiltros);

/**
 * Inicia o carregamento inicial da aplicação.
 */
carregarPraias();