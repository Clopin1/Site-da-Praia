/**
 * Importa o Express, biblioteca utilizada para criar o servidor web.
 */
const express = require("express");

/**
 * Importa o CORS, utilizado para permitir requisições entre frontend e backend.
 */
const cors = require("cors");

/**
 * Importa o módulo path, nativo do Node.js, usado para trabalhar com caminhos de arquivos.
 */
const path = require("path");

 /**
 * Cria a aplicação Express.
 * A variável app representa o servidor do sistema.
 */ 
const app = express();

/**
 * Define a porta onde o servidor será executado.
 * No Render, a porta vem de process.env.PORT.
 * Localmente, caso não exista uma porta definida, será usada a porta 3000.
 */
const PORT = process.env.PORT || 3000;

/**
 * URL oficial do IMA utilizada para obter os dados de balneabilidade.
 */
const IMA_URL = "https://balneabilidade.ima.sc.gov.br/relatorio/mapa";

/**
 * Habilita o CORS para permitir que o frontend acesse a API.
 */
app.use(cors());

/**
 * Define a pasta public como pasta de arquivos estáticos.
 * Nela ficam o HTML, CSS e JavaScript do frontend.
 */
app.use(express.static(path.join(__dirname, "public")));

/**
 * Objeto usado para armazenar os dados temporariamente.
 * Isso evita consultar o IMA a todo momento.
 */
let cache = {
  data: null,
  updatedAt: null
};


/**
 * Normaliza um item recebido da API do IMA.
 *
 * O IMA retorna os dados com nomes em letras maiúsculas.
 * Esta função transforma esses dados em um formato mais simples
 * para ser utilizado pelo frontend.
 *
 * @param {Object} item Registro original retornado pelo IMA.
 * @returns {Object} Registro normalizado da praia.
 */
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

/**
 * Rota principal da API.
 *
 * Quando o frontend acessa /api/praias, esta função é executada.
 * Ela consulta os dados do IMA, normaliza as informações e retorna
 * os dados em formato JSON.
 */
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

/**
 * Rota de fallback.
 *
 * Caso o usuário acesse qualquer rota que não seja a API,
 * o servidor retorna o arquivo index.html.
 */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/**
 * Inicializa o servidor na porta definida.
 */
app.listen(PORT, () => {
  console.log(`Praia Segura SC rodando em http://localhost:${PORT}`);
});
