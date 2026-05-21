import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

ffmpeg.setFfmpegPath(ffmpegStatic);

const STICKER_SIZE = 512;
const MAX_SIZE_BYTES = 500 * 1024; // 500KB

// ── Imagem → WebP estático ────────────────────────────────────
export async function makeSticker(inputBuffer) {
  try {
    const sticker = await sharp(inputBuffer)
      .resize(STICKER_SIZE, STICKER_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: 80 })
      .toBuffer();

    // Se ainda estiver grande, reduz qualidade
    if (sticker.length > MAX_SIZE_BYTES) {
      return await sharp(inputBuffer)
        .resize(STICKER_SIZE, STICKER_SIZE, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .webp({ quality: 50 })
        .toBuffer();
    }

    return sticker;
  } catch (err) {
    throw new Error('Falha ao processar imagem: ' + err.message);
  }
}

// ── Vídeo → WebP animado ──────────────────────────────────────
export async function makeVideoSticker(inputBuffer) {
  const tmpDir = os.tmpdir();
  const inputFile = path.join(tmpDir, `${randomUUID()}.mp4`);
  const outputFile = path.join(tmpDir, `${randomUUID()}.webp`);

  try {
    // Salvar buffer em arquivo temp
    await fs.writeFile(inputFile, inputBuffer);

    // Converter com ffmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .inputOptions(['-t', '8']) // máx 8 segundos
        .outputOptions([
          '-vf', `scale=${STICKER_SIZE}:${STICKER_SIZE}:force_original_aspect_ratio=decrease,pad=${STICKER_SIZE}:${STICKER_SIZE}:(ow-iw)/2:(oh-ih)/2:color=0x00000000,fps=15`,
          '-loop', '0',
          '-quality', '75',
          '-compression_level', '6',
          '-an', // sem áudio
          '-vsync', '0',
        ])
        .output(outputFile)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    const result = await fs.readFile(outputFile);

    // Limpar arquivos temp
    await fs.unlink(inputFile).catch(() => {});
    await fs.unlink(outputFile).catch(() => {});

    return result;
  } catch (err) {
    // Limpar em caso de erro
    await fs.unlink(inputFile).catch(() => {});
    await fs.unlink(outputFile).catch(() => {});
    throw new Error('Falha ao processar vídeo: ' + err.message);
  }
}
