FROM node:20-slim

# Instala dependências do sistema necessárias
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Define variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=8080

# Copia arquivos de dependências
COPY package*.json ./

# Instala dependências
RUN npm ci --omit=dev

# Copia arquivos do Prisma
COPY prisma ./prisma

# Gera o Prisma Client
RUN npx prisma generate

# Copia o resto do código
COPY . .

# Compila o TypeScript (se necessário)
RUN npm run build || echo "No build script found"

# Expõe a porta
EXPOSE 8080

# Comando para iniciar
CMD npx prisma migrate deploy --schema ./prisma/postgresql-schema.prisma && node dist/main.js || node src/main.js
