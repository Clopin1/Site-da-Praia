# Link para o site: https://praia-segura-sc.onrender.com


# PRAIA SEGURA SC

## 1. Identificação do Projeto

**Nome do Projeto:** Praia Segura SC

**Desenvolvedor:** Rafael da Silva Corrêa

**Curso:** Análise e Desenvolvimento de Sistemas

---

## 2. Objetivo do Projeto

O sistema Praia Segura SC foi desenvolvido com o objetivo de disponibilizar informações atualizadas sobre a balneabilidade das praias de Santa Catarina.

A aplicação realiza a consulta de dados públicos fornecidos pelo Instituto do Meio Ambiente de Santa Catarina (IMA), processa essas informações e as apresenta ao usuário por meio de uma interface web com mapa interativo, filtros e sistema de pesquisa.

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

### Fonte dos Dados

Instituto do Meio Ambiente de Santa Catarina (IMA)

Endpoint utilizado:

https://balneabilidade.ima.sc.gov.br/relatorio/mapa

---

## 4. Estrutura do Projeto

```text
Site-da-Praia/
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
└── node_modules/
```

---

## 5. Instalação e Execução

### Pré-requisitos

Antes de executar o sistema é necessário possuir:

- Node.js versão 18 ou superior
- NPM

### Instalação

Abra o terminal na pasta principal do projeto e execute:

```bash
npm install
```

O comando acima instalará todas as dependências necessárias para a execução do sistema.

### Inicialização

Após a instalação das dependências, execute:

```bash
npm start
```

### Acesso

Após iniciar o servidor, acesse:

```text
http://localhost:3000
```

---

## 6. Funcionamento do Sistema

O funcionamento da aplicação ocorre da seguinte forma:

1. O usuário acessa a interface web.
2. O frontend realiza uma requisição para o backend.
3. O backend consulta os dados públicos disponibilizados pelo IMA.
4. Os dados são normalizados e organizados.
5. As informações são enviadas ao frontend.
6. O frontend apresenta os resultados em lista e mapa interativo.

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

# 7. Documentação dos Arquivos

## 7.1 Backend (server.js)

O arquivo `server.js` é responsável pela criação e execução do servidor backend da aplicação.

Principais responsabilidades:

- Criar o servidor utilizando Express.
- Disponibilizar a rota `/api/praias`.
- Consultar os dados do IMA.
- Normalizar os dados recebidos.
- Gerenciar cache temporário.
- Fornecer dados ao frontend.
- Servir arquivos estáticos da aplicação.

Tecnologias utilizadas:

- Node.js
- Express.js
- CORS

Endpoint utilizado:

```text
https://balneabilidade.ima.sc.gov.br/relatorio/mapa
```

---

## 7.2 Frontend (app.js)

O arquivo `app.js` contém toda a lógica da interface do usuário.

Principais responsabilidades:

- Realizar requisições à API.
- Carregar dados das praias.
- Atualizar indicadores estatísticos.
- Exibir os pontos no mapa.
- Permitir pesquisa por praia ou município.
- Aplicar filtros de condição.
- Atualizar dinamicamente os resultados exibidos.

Tecnologias utilizadas:

- JavaScript
- Leaflet.js
- OpenStreetMap

---

## 7.3 Estrutura da Interface (index.html)

O arquivo `index.html` define toda a estrutura visual da aplicação.

Principais responsabilidades:

- Organizar os elementos da interface.
- Criar cabeçalho, filtros e pesquisa.
- Criar espaço para os indicadores.
- Criar área para exibição do mapa.
- Criar área para exibição dos cartões de praias.
- Importar os arquivos CSS e JavaScript.

---

## 7.4 Estilização da Interface (style.css)

O arquivo `style.css` é responsável pela aparência visual da aplicação.

Principais responsabilidades:

- Definir layout.
- Definir cores e tipografia.
- Criar responsividade.
- Estilizar cartões e indicadores.
- Diferenciar visualmente praias próprias e impróprias.
- Organizar os elementos da página.