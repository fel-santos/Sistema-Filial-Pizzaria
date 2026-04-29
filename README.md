# PizzaSystem — Sistema de Gestão de Filiais

Sistema web completo para gestão de uma distribuidora de pizzas e suas filiais. O administrador gerencia produtos, filiais e pedidos; cada filial acessa um painel próprio para fazer pedidos e acompanhar status em tempo real.

## Funcionalidades

**Painel Admin**
- Cadastro, edição, ativação/desativação e exclusão de filiais
- Gestão de produtos (preço, disponibilidade)
- Visualização de todos os pedidos com atualização automática (polling 10s)
- Alteração de status de entrega e status de pagamento por pedido
- Relatórios por data e por filial: vendas, lucro, produtos mais pedidos

**Painel Filial**
- Login exclusivo com bloqueio automático se a filial estiver desativada
- Fazer pedidos com busca de produto em tempo real
- Acompanhar histórico e status do pedido mais recente (atualização automática)
- Filtros por status e data nos pedidos

**Geral**
- Autenticação com bcrypt
- Preço travado no momento do pedido (sem distorção retroativa)
- Design responsivo (mobile e desktop)
- Tema escuro / claro

## Stack

| Camada    | Tecnologia                               |
|-----------|------------------------------------------|
| Frontend  | React 19, React Router 7, TailwindCSS 4  |
| Backend   | Node.js, Express 5                       |
| Banco     | PostgreSQL                               |
| Build     | Vite 8                                   |

## Como rodar localmente

### Pré-requisitos
- Node.js 18+
- PostgreSQL 14+

### 1. Banco de dados

```bash
psql -U postgres -c "CREATE DATABASE dbSistemaFilial;"
psql -U postgres -d dbSistemaFilial -f database/tabelas.sql
psql -U postgres -d dbSistemaFilial -f database/migration_v2.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edite o .env com suas credenciais do PostgreSQL
npm install
node setup.js   # Cria admin e produtos iniciais (execute uma vez)
npm run dev     # Inicia em modo desenvolvimento
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev     # Disponível em http://localhost:5173
```

### Credenciais padrão (após rodar setup.js)

| Tipo  | Email           | Senha    |
|-------|-----------------|----------|
| Admin | admin@pizza.com | admin123 |

> Para criar um usuário de filial, acesse o painel admin → Filiais → Nova Filial.

## Deploy (Hostinger VPS)

### 1. Build do frontend

```bash
cd frontend
npm run build   # Gera frontend/dist/
```

### 2. Variáveis de ambiente no servidor

Crie o arquivo `backend/.env` com:

```env
NODE_ENV=production
PORT=3000
DB_USER=...
DB_HOST=...
DB_NAME=...
DB_PASSWORD=...
DB_PORT=5432
CORS_ORIGIN=https://seudominio.com
```

### 3. Iniciar o backend

```bash
cd backend
npm install --omit=dev
npm start
```

Em produção, o Express serve o frontend buildado em `frontend/dist/` automaticamente — um único processo, uma única porta.

### 4. Nginx (proxy reverso recomendado)

```nginx
server {
    listen 80;
    server_name seudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## API — Endpoints principais

| Método | Rota                       | Descrição                         |
|--------|----------------------------|-----------------------------------|
| POST   | /api/login                 | Autenticação                      |
| GET    | /api/produtos              | Listar produtos                   |
| POST   | /api/produtos              | Criar produto                     |
| PATCH  | /api/produtos/:id          | Atualizar preço / disponibilidade |
| GET    | /api/filiais               | Listar filiais                    |
| POST   | /api/filiais               | Criar filial + usuário de acesso  |
| PATCH  | /api/filiais/:id           | Editar / ativar / desativar       |
| GET    | /api/pedidos               | Listar pedidos (com filtros)      |
| POST   | /api/pedidos               | Criar pedido                      |
| PATCH  | /api/pedidos/:id/status    | Atualizar status de entrega       |
| PATCH  | /api/pedidos/:id/pagamento | Marcar como Pago / Pendente       |
| GET    | /api/relatorios            | Relatório por data e filial       |

