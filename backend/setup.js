// Rode uma vez para criar o admin e os produtos iniciais:
//   node setup.js

import bcrypt from "bcrypt";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function setup() {
  console.log("Iniciando setup do banco...\n");

  // ── Admin ──────────────────────────────────────────────────────────────────
  const hash = await bcrypt.hash("admin123", 10);
  const adminRes = await pool.query(
    `INSERT INTO users (nome, email, senha, tipo)
     VALUES ($1, $2, $3, 'ADMIN')
     ON CONFLICT (email) DO NOTHING
     RETURNING email`,
    ["Administrador", "admin@pizza.com", hash]
  );
  if (adminRes.rowCount > 0) {
    console.log("✅ Admin criado:");
    console.log("   Email : admin@pizza.com");
    console.log("   Senha : admin123");
  } else {
    console.log("ℹ️  Admin já existe (admin@pizza.com) — nenhuma alteração.");
  }

  // ── Produtos ───────────────────────────────────────────────────────────────
  const produtos = [
    ["Calabresa",       28.00],
    ["Mussarela",       26.00],
    ["Frango",          29.00],
    ["Portuguesa",      31.00],
    ["Margherita",      27.00],
    ["Quatro Queijos",  33.00],
    ["Pepperoni",       35.00],
    ["Vegetariana",     30.00],
    ["Napolitana",      32.00],
    ["Atum",            29.00],
  ];

  let inseridos = 0;
  for (const [nome, preco] of produtos) {
    const r = await pool.query(
      `INSERT INTO produtos (nome, preco, disponivel)
       VALUES ($1, $2, true)
       ON CONFLICT DO NOTHING
       RETURNING nome`,
      [nome, preco]
    );
    if (r.rowCount > 0) inseridos++;
  }

  console.log(`\n✅ Produtos: ${inseridos} inserido(s), ${produtos.length - inseridos} já existia(m).`);
  console.log("\nSetup concluído! 🚀");

  await pool.end();
}

setup().catch((err) => {
  console.error("Erro no setup:", err.message);
  process.exit(1);
});
