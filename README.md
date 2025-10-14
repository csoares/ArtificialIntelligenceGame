# Desafio das Emoções - UFP

Game completo com IA e Visão Computacional para deteção de emoções faciais.

## 🚀 Como Executar

### 1️⃣ Instalar Dependências

Primeiro, instala o Node.js (se ainda não tiveres): https://nodejs.org/

Depois, na pasta do projeto, executa:

```bash
npm install
```

### 2️⃣ Iniciar o Servidor

```bash
npm start
```

Vais ver esta mensagem:

```
════════════════════════════════════════════════
  🎮 DESAFIO DAS EMOÇÕES - Server Running
════════════════════════════════════════════════
  📡 Server: http://localhost:3000
  📊 CSV File: /caminho/para/resultados_emocoes.csv
  ✓ Ready to receive results!
════════════════════════════════════════════════
```

### 3️⃣ Abrir o Jogo

Abre o teu browser e vai a:

```
http://localhost:3000
```

## 📊 Resultados

Os resultados são guardados automaticamente no ficheiro **`resultados_emocoes.csv`** na pasta do projeto.

### Exportar Resultados

No ecrã final do jogo, clica no botão **"Exportar Dados (CSV)"** para descarregar todos os resultados acumulados.

## 🛠 Estrutura do Projeto

```
SantoTirsoChallenge/
├── index.html              # Frontend do jogo
├── app.js                  # Lógica do jogo (frontend)
├── style.css               # Estilos
├── server.js               # Backend Node.js
├── package.json            # Dependências
├── resultados_emocoes.csv  # Base de dados local (criada automaticamente)
└── models/                 # Modelos de IA (face-api.js)
```

## 📝 API Endpoints

### POST `/api/save-result`
Guarda um resultado de aluno.

**Body:**
```json
{
  "firstName": "João",
  "lastName": "Silva",
  "school": "Escola Secundária",
  "score": 4,
  "timestamp": "2025-10-14T10:30:00.000Z"
}
```

### GET `/api/download-results`
Descarrega o ficheiro CSV com todos os resultados.

### GET `/api/results-count`
Retorna o número de alunos que já jogaram.

## 🔧 Desenvolvimento

Para desenvolvimento com auto-reload:

```bash
npm run dev
```

## ⚠️ Notas Importantes

- O servidor precisa estar **sempre a correr** para o jogo funcionar
- Os resultados são guardados localmente em `resultados_emocoes.csv`
- Se o servidor não estiver a correr, vais ver uma mensagem de erro no ecrã final
- O jogo requer acesso à câmara do computador

## 📦 Dependências

- **express**: Framework web para Node.js
- **cors**: Permite comunicação entre frontend e backend
- **nodemon** (dev): Auto-reload durante desenvolvimento

## 🎓 Criado para UFP - Universidade Fernando Pessoa

Este jogo demonstra conceitos de:
- Inteligência Artificial
- Visão Computacional
- Deteção de Emoções Faciais
- Desenvolvimento Full Stack (Frontend + Backend)
