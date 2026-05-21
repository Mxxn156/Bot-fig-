import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { handleMessage } from './handlers.js';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, 'auth');

const logger = pino({ level: 'silent' });

// ── Servidor HTTP pra Railway não matar o processo ────────────
const PORT = process.env.PORT || 3000;
let botStatus = 'iniciando';
let lastQR = null;

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (botStatus === 'aguardando_qr' && lastQR) {
    // Mostra o QR Code em texto na página web
    res.writeHead(200);
    res.end(`
      <html><body style="background:#111;color:#0f0;font-family:monospace;padding:20px">
        <h2>📱 StickerBot — Escaneie o QR Code</h2>
        <p>Abra WhatsApp > Aparelhos Conectados > Conectar aparelho</p>
        <pre style="font-size:12px">${lastQR}</pre>
        <p style="color:#888">Atualize a página se o QR expirar.</p>
      </body></html>
    `);
  } else if (botStatus === 'conectado') {
    res.writeHead(200);
    res.end('<html><body style="background:#111;color:#0f0;font-family:monospace;padding:20px"><h2>✅ StickerBot online!</h2></body></html>');
  } else {
    res.writeHead(200);
    res.end('<html><body style="background:#111;color:#0f0;font-family:monospace;padding:20px"><h2>⏳ StickerBot iniciando...</h2></body></html>');
  }
});

server.listen(PORT, () => {
  console.log(`🌐 Servidor HTTP rodando na porta ${PORT}`);
});

// ── Bot ───────────────────────────────────────────────────────
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ['StickerBot', 'Chrome', '1.0.0'],
    generateHighQualityLinkPreview: false,
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      botStatus = 'aguardando_qr';
      lastQR = qr;
      console.log('\n╔══════════════════════════════════════╗');
      console.log('║   📱 Escaneie o QR Code abaixo:      ║');
      console.log('╚══════════════════════════════════════╝\n');
      qrcode.generate(qr, { small: true });
      console.log('\n👉 Ou acesse a URL do Railway no navegador pra ver o QR Code!\n');
    }

    if (connection === 'close') {
      botStatus = 'reconectando';
      lastQR = null;
      const shouldReconnect =
        new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log('🔄 Reconectando...');
        setTimeout(() => startBot(), 3000); // espera 3s antes de reconectar
      } else {
        console.log('🚪 Desconectado. Delete a pasta /auth e reinicie.');
        botStatus = 'desconectado';
      }
    }

    if (connection === 'open') {
      botStatus = 'conectado';
      lastQR = null;
      console.log('✅ Bot conectado com sucesso!');
      console.log('🤖 Aguardando mensagens...\n');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message) continue;
      if (msg.key.fromMe) continue;

      try {
        await handleMessage(sock, msg);
      } catch (err) {
        console.error('Erro ao processar mensagem:', err.message);
      }
    }
  });
}

console.log('🚀 Iniciando StickerBot...\n');
startBot();
