# 🍕 Sistema Filial Pizzaria

Sistema interno para gerenciamento de pedidos entre filiais de uma pizzaria.

---

## 🚀 Tecnologias utilizadas

* Frontend: React + Vite
* Backend: Node.js + Express
* Banco de Dados: PostgreSQL

---

## 📦 Funcionalidades

* Login de usuários (Admin e Filiais)
* Envio de pedidos
* Acompanhamento de status
* Gestão de produtos
* Gestão de filiais

---

# 🧑‍💻 Como rodar o projeto em outra máquina

## 🔹 1. Clonar o repositório

```bash
git clone https://github.com/fel-santos/Sistema-Filial-Pizzaria.git
cd Sistema-Filial-Pizzaria
```

---

## 🔹 2. Instalar o PostgreSQL

Baixe e instale o PostgreSQL.

Durante a instalação:

* Defina uma senha para o usuário `postgres`
* Porta padrão: `5432`

---

## 🔹 3. Criar o banco de dados

Abra o pgAdmin ou terminal e execute:

```sql
CREATE DATABASE dbSistemaFilial;
```

---

## 🔹 4. Criar as tabelas

Execute o script SQL abaixo:

```sql
-- FILIAIS
CREATE TABLE filiais (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    endereco TEXT,
    telefone VARCHAR(20),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- USUÁRIOS
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ADMIN', 'FILIAL')),
    filial_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (filial_id) REFERENCES filiais(id),
    CHECK (
        (tipo = 'ADMIN' AND filial_id IS NULL) OR
        (tipo = 'FILIAL' AND filial_id IS NOT NULL)
    )
);

-- PRODUTOS
CREATE TABLE produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    preco NUMERIC(10,2),
    disponivel BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PEDIDOS
CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    filial_id INT NOT NULL,
    status VARCHAR(20) DEFAULT 'recebido',
    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (filial_id) REFERENCES filiais(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ITENS DO PEDIDO
CREATE TABLE itens_pedido (
    id SERIAL PRIMARY KEY,
    pedido_id INT NOT NULL,
    produto_id INT NOT NULL,
    quantidade INT NOT NULL,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
);
```

---

## 🔹 5. Criar usuário administrador

```sql
INSERT INTO users (nome, email, senha, tipo)
VALUES ('Admin', 'admin@px.com', 'pxPizarria@123', 'ADMIN');
```

---

## 🔹 6. Configurar o backend

Acesse a pasta:

```bash
cd backend
```

Instale as dependências:

```bash
npm install
```

Crie um arquivo `.env`:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=dbSistemaFilial
DB_PASSWORD=SUA_SENHA_AQUI
DB_PORT=5432
```

---

## 🔹 7. Rodar o backend

```bash
node server.js
```

Deve aparecer:

```
Servidor rodando na porta 3000 🚀
```

---

## 🔹 8. Rodar o frontend

Abra outro terminal:

```bash
cd frontend
npm install
npm run dev
```

---

## 🔹 9. Acessar o sistema

Abra no navegador:

```
http://localhost:5173
```

---

## 🔐 Login padrão

```
Email: admin@px.com
Senha: pxPizarria@123
```

---

# 📌 Observações

* O sistema ainda está em desenvolvimento
* Senhas ainda não estão criptografadas (será implementado futuramente)
* Backend roda na porta 3000
* Frontend roda na porta 5173

---

# 🚀 Próximos passos

* Criptografia de senha (bcrypt)
* Autenticação com JWT
* Dashboard completo
* Sistema de pedidos em tempo real

---

# 👨‍💻 Autor

Projeto desenvolvido por Felipe Santos 🚀
