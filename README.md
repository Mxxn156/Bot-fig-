# 🎭 StickerBot — Bot de Figurinhas pra WhatsApp

Bot que converte imagens e vídeos em figurinhas do WhatsApp automaticamente.

## ✨ Comandos

| Comando | O que faz |
|---|---|
| `!sticker` ou `!s` | Converte imagem/vídeo em figurinha |
| `!help` ou `!ajuda` | Mostra todos os comandos |
| `!ping` | Verifica se o bot está online |

**Como usar:**
- Envie uma imagem com legenda `!sticker`
- Envie um vídeo com legenda `!sticker`
- Responda qualquer imagem/vídeo com `!sticker`

---

## 🚀 Como hospedar no Railway (GRATUITO)

### Passo 1 — Criar conta e repositório

1. Crie uma conta em **github.com** (se não tiver)
2. Crie um repositório novo (pode ser privado)
3. Faça upload de todos os arquivos deste projeto

### Passo 2 — Deploy no Railway

1. Acesse **railway.app** e faça login com GitHub
2. Clique em **"New Project"**
3. Escolha **"Deploy from GitHub repo"**
4. Selecione seu repositório
5. Railway vai detectar o `Dockerfile` automaticamente
6. Clique em **Deploy** e aguarde o build (2-3 minutos)

### Passo 3 — Conectar seu número

1. No Railway, vá em **"View Logs"** (ícone de terminal)
2. Você vai ver um QR Code no terminal
3. No seu WhatsApp: **Configurações → Aparelhos Conectados → Conectar aparelho**
4. Escaneie o QR Code
5. Pronto! O bot vai confirmar com "✅ Bot conectado com sucesso!"

### Passo 4 — Manter conectado

O Railway gratuito dá **500 horas/mês** (suficiente pra rodar 24/7).

Para não perder a sessão entre deploys, adicione um **Volume** no Railway:
1. Na aba do projeto, clique em **"+ New"** → **"Volume"**
2. Monte em `/app/auth`
3. Isso salva a sessão do WhatsApp permanentemente

---

## 💻 Rodar localmente (para testar)

```bash
# Instalar dependências
npm install

# Iniciar bot
npm start
```

Escaneie o QR Code que aparecer no terminal.

---

## 📁 Estrutura do projeto

```
whatsapp-sticker-bot/
├── src/
│   ├── index.js      # Conexão com WhatsApp
│   ├── handlers.js   # Lógica dos comandos
│   └── sticker.js    # Conversão de mídia
├── auth/             # Sessão (gerada automaticamente)
├── Dockerfile        # Para Railway
├── package.json
└── README.md
```

---

## ⚠️ Avisos importantes

- **Não compartilhe** a pasta `/auth` com ninguém — contém sua sessão do WhatsApp
- O bot funciona em chats privados e grupos
- Vídeos são limitados a 8 segundos pra manter o arquivo pequeno
- WhatsApp pode desconectar o bot eventualmente — basta reconectar

---

## 🛠️ Personalização

Para mudar o nome do bot ou o prefixo dos comandos, edite `src/handlers.js`:

```js
const BOT_NAME = 'StickerBot 🎭';  // Nome no !help
const PREFIX = '!';                  // Prefixo dos comandos
```
