
# Instala dependências do sistema necessárias
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Define variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=8080

# Copia tudo primeiro
COPY . .

# Instala dependências
RUN npm ci --omit=dev || npm install --omit=dev

# Gera o Prisma Client (se existir)
RUN if [ -d "prisma" ]; then npx prisma generate; fi

# Compila o TypeScript (se necessário)
RUN npm run build || echo "No build script found"

# Expõe a porta
EXPOSE 8080

# Comando para iniciar
CMD if [ -f "prisma/postgresql-schema.prisma" ]; then npx prisma migrate deploy --schema ./prisma/postgresql-schema.prisma; fi && npm start
