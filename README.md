Link para o site: https://praia-segura-sc.onrender.com


# PRAIA SEGURA SC

## 1. Identificação do Projeto

**Nome do Projeto:** 📍 Ponto Seguro

**Desenvolvedor:** Rafael da Silva Corrêa e Isabella Trento Lohn

**Curso:** Análise e Desenvolvimento de Sistemas

---

## 2. Objetivo do Projeto

O sistema **Ponto Seguro** foi desenvolvido com o objetivo de consultar e apresentar informações sobre a balneabilidade das praias de Santa Catarina.

A aplicação utiliza dados públicos disponibilizados pelo Instituto do Meio Ambiente de Santa Catarina (IMA), processa essas informações no backend e as apresenta ao usuário por meio de uma interface web com mapa interativo, filtros e cards informativos.

---

## 3. Tecnologias Utilizadas

### Backend

- Node.js
- Express.js
- CORS

### Frontend

- HTML5
- CSS3
- JavaScript

### Bibliotecas Externas

- Leaflet.js
- OpenStreetMap
- Google Fonts

### Fonte dos Dados

Instituto do Meio Ambiente de Santa Catarina (IMA)

Endpoint utilizado:

```text
https://balneabilidade.ima.sc.gov.br/relatorio/mapa
```

---

## 4. Estrutura do Projeto

```text
PontoSeguro/
│
├── package.json
├── package-lock.json
├── README.md
├── server.js
│
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
│
└── ALTERACOES-V4.md
```

---

## 5. Instalação e Execução

### Pré-requisitos

Antes de executar o sistema, é necessário possuir:

- Node.js versão 18 ou superior
- NPM

### Instalação

Abra o terminal na pasta principal do projeto e execute:

```bash
npm install
```

Esse comando instala as dependências necessárias para o funcionamento do backend.

### Execução

Após instalar as dependências, execute:

```bash
npm start
```

### Acesso ao Sistema

Após iniciar o servidor, acesse no navegador:

```text
http://localhost:3000
```

---

## 6. Funcionamento do Sistema

O funcionamento do sistema ocorre da seguinte forma:

1. O usuário acessa a interface web.
2. O frontend realiza uma requisição para a rota `/api/praias`.
3. O backend consulta o endpoint público do IMA.
4. Os dados são normalizados.
5. O backend retorna os dados ao frontend.
6. O frontend exibe as informações em mapa, filtros e cards.

### Fluxo do Sistema

```text
Usuário
   ↓
Frontend
   ↓
Backend Node.js
   ↓
IMA
   ↓
Backend Node.js
   ↓
Frontend
   ↓
Usuário
```

---

## 7. Funcionalidades

- Consulta de pontos monitorados pelo IMA.
- Mapa interativo com marcadores.
- Marcadores verdes para pontos próprios.
- Marcadores vermelhos para pontos impróprios.
- Busca por praia, município, ponto ou localização.
- Filtro por município.
- Filtro por situação de balneabilidade.
- Tooltip ao passar o mouse sobre o mapa.
- Popup detalhado ao clicar em um marcador.
- Cards informativos.
- Indicador de confiabilidade recente baseado nas últimas cinco análises.

---

## 8. Documentação dos Arquivos

### 8.1 Backend (`server.js`)

O arquivo `server.js` é responsável pela criação e execução do servidor backend da aplicação.

Principais responsabilidades:

- Criar o servidor utilizando Express.
- Disponibilizar a rota `/api/praias`.
- Consultar os dados do IMA.
- Normalizar os dados recebidos.
- Gerenciar cache temporário.
- Fornecer dados ao frontend.
- Servir arquivos estáticos da aplicação.

### 8.2 Frontend (`app.js`)

O arquivo `app.js` contém a lógica principal da interface.

Principais responsabilidades:

- Buscar dados no backend.
- Renderizar os pontos no mapa.
- Criar cards informativos.
- Aplicar filtros.
- Atualizar indicadores.
- Gerar tooltips e popups.
- Calcular a confiabilidade recente das análises.

### 8.3 Estrutura da Interface (`index.html`)

O arquivo `index.html` define a estrutura visual do sistema.

Principais responsabilidades:

- Criar o cabeçalho.
- Criar os controles de busca e filtro.
- Criar a área dos indicadores.
- Criar a área do mapa.
- Criar a área dos cards.
- Importar CSS e JavaScript.

### 8.4 Estilização (`style.css`)

O arquivo `style.css` define a aparência visual da aplicação.

Principais responsabilidades:

- Definir paleta de cores.
- Criar layout responsivo.
- Estilizar cabeçalho, filtros, cards e mapa.
- Diferenciar visualmente pontos próprios e impróprios.
- Melhorar a experiência visual do usuário.

---

## 9. Documentação Interna

O projeto possui documentação interna nos arquivos de código, utilizando comentários explicativos e padrão JSDoc nos arquivos JavaScript.

Foram documentados:

- Variáveis principais.
- Funções.
- Rotas.
- Estruturas HTML.
- Blocos de estilo CSS.
- Funcionamento do cache.
- Funcionamento dos filtros.
- Funcionamento do mapa.