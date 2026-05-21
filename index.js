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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, 'auth');

const logger = pino({ level: 'silent' });

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ['StickerBot', 'Chrome', '1.0.0'],
    generateHighQualityLinkPreview: false,
  });

  // ── QR Code ───────────────────────────────────────────────
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n╔══════════════════════════════════════╗');
      console.log('║   📱 Escaneie o QR Code abaixo:      ║');
      console.log('╚══════════════════════════════════════╝\n');
      qrcode.generate(qr, { small: true });
      console.log('\n👉 Abra WhatsApp > Aparelhos Conectados > Conectar\n');
    }

    if (connection === 'close') {
      const shouldReconnect =
        new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log('🔄 Reconectando...');
        startBot();
      } else {
        console.log('🚪 Desconectado. Delete a pasta /auth e reinicie.');
      }
    }

    if (connection === 'open') {
      console.log('✅ Bot conectado com sucesso!');
      console.log('🤖 Aguardando mensagens...\n');
    }
  });

  // ── Salvar credenciais ────────────────────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ── Mensagens ─────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message) continue;
      if (msg.key.fromMe) continue; // ignorar próprias mensagens

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
