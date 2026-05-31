const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const IMA_URL = "https://balneabilidade.ima.sc.gov.br/relatorio/mapa";

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

let cache = {
  data: null,
  updatedAt: null
};

function normalizarItem(item) {
  const ultimaAnalise = Array.isArray(item.ANALISES) ? item.ANALISES[0] : null;

  return {
    codigo: item.CODIGO || "",
    municipio: item.MUNICIPIO || "Município não informado",
    balneario: item.BALNEARIO || "Praia não informada",
    ponto: item.PONTO_NOME || "",
    localizacao: item.LOCALIZACAO || "",
    latitude: Number(String(item.LATITUDE).replace(",", ".")),
    longitude: Number(String(item.LONGITUDE).replace(",", ".")),
    condicao: ultimaAnalise?.CONDICAO || "N/D",
    data: ultimaAnalise?.DATA || "",
    chuva: ultimaAnalise?.CHUVA || "",
    resultado: ultimaAnalise?.RESULTADO || "",
    tempAgua: ultimaAnalise?.TEMP_AGUA || "",
    analises: item.ANALISES || []
  };
}

app.get("/api/praias", async (req, res) => {
  try {
    const agora = Date.now();
    const cacheValido = cache.data && cache.updatedAt && agora - cache.updatedAt < 1000 * 60 * 15;

    if (cacheValido) {
      return res.json({
        fonte: "IMA SC",
        cache: true,
        atualizadoEm: new Date(cache.updatedAt).toISOString(),
        total: cache.data.length,
        dados: cache.data
      });
    }

    const resposta = await fetch(IMA_URL, {
      headers: {
        "User-Agent": "PraiaSeguraSC/1.0"
      }
    });

    if (!resposta.ok) {
      throw new Error(`IMA respondeu com status ${resposta.status}`);
    }

    const bruto = await resposta.json();
    const dados = bruto
      .map(normalizarItem)
      .filter(item => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));

    cache = {
      data: dados,
      updatedAt: agora
    };

    res.json({
      fonte: "IMA SC",
      cache: false,
      atualizadoEm: new Date(agora).toISOString(),
      total: dados.length,
      dados
    });
  } catch (erro) {
    console.error("Erro ao buscar dados do IMA:", erro);
    res.status(500).json({
      erro: "Não foi possível carregar os dados do IMA.",
      detalhe: erro.message
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Praia Segura SC rodando em http://localhost:${PORT}`);
});
