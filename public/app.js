const API = "/api/praias";

const state = {
  praias: [],
  filtradas: [],
  markers: []
};

const els = {
  search: document.getElementById("search"),
  filter: document.getElementById("filter"),
  cards: document.getElementById("cards"),
  status: document.getElementById("status"),
  total: document.getElementById("total"),
  proprias: document.getElementById("proprias"),
  improprias: document.getElementById("improprias"),
  updated: document.getElementById("updated")
};

const map = L.map("map").setView([-27.4, -48.7], 8);

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

function isPropria(praia) {
  return praia.condicao && praia.condicao.toUpperCase().includes("PRÓPRIO") && !praia.condicao.toUpperCase().includes("IMPRÓPRIO");
}

function isImpropria(praia) {
  return praia.condicao && praia.condicao.toUpperCase().includes("IMPRÓPRIO");
}

function formatarDataHora(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleString("pt-BR");
}

function resumo() {
  const proprias = state.praias.filter(isPropria).length;
  const improprias = state.praias.filter(isImpropria).length;

  els.total.textContent = state.praias.length;
  els.proprias.textContent = proprias;
  els.improprias.textContent = improprias;
}

function limparMarcadores() {
  state.markers.forEach(marker => marker.remove());
  state.markers = [];
}

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

function aplicarFiltros() {
  const termo = els.search.value.trim().toLowerCase();
  const filtro = els.filter.value;

  state.filtradas = state.praias.filter(p => {
    const texto = `${p.balneario} ${p.municipio} ${p.ponto} ${p.localizacao}`.toLowerCase();

    const bateTexto = texto.includes(termo);
    const bateStatus =
      filtro === "TODAS" ||
      (filtro === "PRÓPRIO" && isPropria(p)) ||
      (filtro === "IMPRÓPRIO" && isImpropria(p));

    return bateTexto && bateStatus;
  });

  els.status.textContent = `${state.filtradas.length} ponto(s) exibido(s).`;
  renderCards(state.filtradas);
  renderMapa(state.filtradas);
}

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
    renderCards(state.praias);
    renderMapa(state.praias);
  } catch (erro) {
    console.error(erro);
    els.status.textContent = "Erro ao carregar dados. Verifique se o backend está rodando.";
  }
}

els.search.addEventListener("input", aplicarFiltros);
els.filter.addEventListener("change", aplicarFiltros);

carregarPraias();
