# Praia Segura SC v3

Site funcional com frontend + backend Node.js para consultar dados de balneabilidade de Santa Catarina.

## Como rodar

1. Instale o Node.js 18 ou superior.
2. Abra a pasta do projeto no terminal.
3. Rode:

```bash
npm install
npm start
```

4. Abra no navegador:

```txt
http://localhost:3000
```

## Como funciona

- O frontend chama `/api/praias`.
- O backend Node.js busca os dados no endpoint público do IMA:
  `https://balneabilidade.ima.sc.gov.br/relatorio/mapa`
- O backend normaliza os dados e envia para o frontend.
- O frontend mostra mapa, cards, busca e filtro por condição.

## Arquivos principais

- `server.js`: backend Express
- `public/index.html`: estrutura do site
- `public/style.css`: visual
- `public/app.js`: lógica do mapa, busca e cards
