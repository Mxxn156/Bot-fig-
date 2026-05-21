import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { makeSticker, makeVideoSticker } from './sticker.js';
import NodeCache from 'node-cache';

// Cache pra evitar processar a mesma msg duas vezes
const processed = new NodeCache({ stdTTL: 60 });

// Nome do bot (pode mudar aqui)
const BOT_NAME = 'StickerBot 🎭';
const PREFIX = '!';

export async function handleMessage(sock, msg) {
  const msgId = msg.key.id;
  if (processed.get(msgId)) return;
  processed.set(msgId, true);

  const jid = msg.key.remoteJid;
  const isGroup = jid.endsWith('@g.us');
  const content = msg.message;

  // Tipo da mensagem
  const msgType = Object.keys(content)[0];

  // Texto da mensagem
  const text =
    content?.conversation ||
    content?.extendedTextMessage?.text ||
    content?.imageMessage?.caption ||
    content?.videoMessage?.caption ||
    '';

  const body = text.trim().toLowerCase();

  // ── Comandos de texto ──────────────────────────────────────
  if (body === `${PREFIX}help` || body === `${PREFIX}ajuda` || body === 'oi') {
    await sendHelp(sock, jid);
    return;
  }

  if (body === `${PREFIX}ping`) {
    await sock.sendMessage(jid, { text: '🏓 Pong! Bot online.' });
    return;
  }

  // ── !sticker com mídia anexada ──────────────────────────────
  if (body.startsWith(`${PREFIX}sticker`) || body.startsWith(`${PREFIX}s`)) {
    // Verificar se tem mídia na mensagem atual
    if (msgType === 'imageMessage' || msgType === 'videoMessage') {
      await processMedia(sock, jid, msg, msgType);
      return;
    }

    // Verificar se é resposta a uma mensagem com mídia
    const quoted = content?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quoted) {
      const quotedType = Object.keys(quoted)[0];
      if (quotedType === 'imageMessage' || quotedType === 'videoMessage') {
        const fakeMsg = {
          ...msg,
          message: quoted,
          key: { ...msg.key, id: msg.key.id + '_q' },
        };
        await processMedia(sock, jid, fakeMsg, quotedType);
        return;
      }
    }

    await sock.sendMessage(jid, {
      text: '📎 Envie uma imagem/vídeo junto com *!sticker*\nou responda a uma imagem/vídeo com *!sticker*',
    });
    return;
  }

  // ── Mídia sem comando: sticker automático se tiver caption ─
  // (opcional — só ativa se a caption for !s)
  if (
    (msgType === 'imageMessage' || msgType === 'videoMessage') &&
    (text.toLowerCase() === `${PREFIX}s` || text.toLowerCase() === `${PREFIX}sticker`)
  ) {
    await processMedia(sock, jid, msg, msgType);
    return;
  }
}

// ── Processador de mídia → sticker ───────────────────────────
async function processMedia(sock, jid, msg, msgType) {
  const isVideo = msgType === 'videoMessage';

  // Reação de "processando"
  await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

  try {
    let stickerBuffer;

    if (isVideo) {
      await sock.sendMessage(jid, { text: '🎬 Convertendo vídeo... aguenta aí!' });
      const buffer = await downloadMediaMessage(msg, 'buffer', {});
      stickerBuffer = await makeVideoSticker(buffer);
    } else {
      const buffer = await downloadMediaMessage(msg, 'buffer', {});
      stickerBuffer = await makeSticker(buffer);
    }

    await sock.sendMessage(
      jid,
      {
        sticker: stickerBuffer,
      },
      { quoted: msg }
    );

    // Reação de sucesso
    await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
  } catch (err) {
    console.error('Erro ao criar sticker:', err.message);
    await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
    await sock.sendMessage(jid, {
      text: `❌ Não consegui criar a figurinha.\nErro: ${err.message}`,
    });
  }
}

// ── Mensagem de ajuda ─────────────────────────────────────────
async function sendHelp(sock, jid) {
  const help = `🎭 *${BOT_NAME}*

Olá! Aqui estão meus comandos:

📌 *Criar figurinha:*
→ Envie uma imagem com a legenda *!sticker*
→ Envie um vídeo com a legenda *!sticker*
→ Responda qualquer imagem/vídeo com *!sticker*

⚡ *Atalho:*
→ Use *!s* no lugar de *!sticker*

📋 *Outros comandos:*
→ *!help* — mostra esta mensagem
→ *!ping* — verifica se o bot está online

📝 *Dicas:*
• Vídeos viram stickers animados (.webp)
• Imagens ficam em 512×512
• Melhor resultado: imagens quadradas`;

  await sock.sendMessage(jid, { text: help });
}
