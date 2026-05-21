FROM node:20-slim

# Instalar dependências do sistema (ffmpeg + sharp)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libvips-dev \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar dependências
COPY package.json ./
RUN npm install --omit=dev

# Copiar código
COPY src/ ./src/

# Criar pasta de auth (persistência)
RUN mkdir -p /app/auth

# Expor porta (Railway exige)
EXPOSE 3000

# Servidor HTTP mínimo pra Railway não matar o processo
RUN echo 'import http from "http"; http.createServer((_, res) => res.end("OK")).listen(process.env.PORT || 3000);' > /app/keep_alive.js

CMD ["node", "-e", "import('./keep_alive.js'); import('./src/index.js');"]
