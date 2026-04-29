import express from "express";
import cors from "cors";
import pkg from "pg";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const { Pool } = pkg;
const app    = express();
const router = express.Router();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }));
app.use(express.json());

const pool = new Pool({
  user:     process.env.DB_USER,
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port:     process.env.DB_PORT,
});

async function verificarSenha(plain, stored) {
  if (stored.startsWith("$2b$") || stored.startsWith("$2a$"))
    return bcrypt.compare(plain, stored);
  return plain === stored;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

router.post("/login", async (req, res) => {
  const { email, senha } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0)
      return res.status(400).json({ error: "Usuário não encontrado" });

    const user = result.rows[0];
    if (!(await verificarSenha(senha, user.senha)))
      return res.status(400).json({ error: "Senha inválida" });

    if (user.tipo === "FILIAL") {
      const filialRes = await pool.query("SELECT ativo FROM filiais WHERE id = $1", [user.filial_id]);
      if (!filialRes.rows[0]?.ativo)
        return res.status(403).json({ error: "Filial desativada. Entre em contato com o administrador." });
    }

    res.json({
      message: "Login realizado com sucesso",
      user: { id: user.id, nome: user.nome, tipo: user.tipo, filial_id: user.filial_id },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// ─── Produtos ─────────────────────────────────────────────────────────────────

router.get("/produtos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM produtos ORDER BY nome");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

router.post("/produtos", async (req, res) => {
  const { nome, preco, descricao } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO produtos (nome, preco, descricao) VALUES ($1, $2, $3) RETURNING *",
      [nome, preco, descricao || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

router.patch("/produtos/:id", async (req, res) => {
  const { id } = req.params;
  const { preco, disponivel } = req.body;
  try {
    const fields = [];
    const values = [];
    let i = 1;
    if (preco      !== undefined) { fields.push(`preco = $${i++}`);      values.push(preco); }
    if (disponivel !== undefined) { fields.push(`disponivel = $${i++}`); values.push(disponivel); }
    if (!fields.length) return res.status(400).json({ error: "Nenhum campo para atualizar" });
    values.push(id);
    const result = await pool.query(
      `UPDATE produtos SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

router.delete("/produtos/:id", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM itens_pedido WHERE produto_id = $1", [id]);
    await client.query("DELETE FROM produtos WHERE id = $1", [id]);
    await client.query("COMMIT");
    res.json({ message: "Produto removido" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  } finally {
    client.release();
  }
});

// ─── Filiais ──────────────────────────────────────────────────────────────────

router.get("/filiais", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nome, endereco, telefone, ativo FROM filiais ORDER BY nome"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

router.get("/filiais/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT id, nome, endereco, telefone, ativo FROM filiais WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Filial não encontrada" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

router.post("/filiais", async (req, res) => {
  const { nome, endereco, telefone, email, senha } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const filialResult = await client.query(
      "INSERT INTO filiais (nome, endereco, telefone) VALUES ($1, $2, $3) RETURNING *",
      [nome, endereco, telefone]
    );
    const filial = filialResult.rows[0];
    const hash = await bcrypt.hash(senha, 10);
    await client.query(
      "INSERT INTO users (nome, email, senha, tipo, filial_id) VALUES ($1, $2, $3, 'FILIAL', $4)",
      [nome, email, hash, filial.id]
    );
    await client.query("COMMIT");
    res.status(201).json(filial);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    if (err.code === "23505")
      return res.status(400).json({ error: "Email já cadastrado." });
    res.status(500).json({ error: "Erro no servidor" });
  } finally {
    client.release();
  }
});

router.patch("/filiais/:id", async (req, res) => {
  const { id } = req.params;
  const { ativo, nome, endereco, telefone } = req.body;
  try {
    const fields = [];
    const values = [];
    let i = 1;
    if (ativo    !== undefined) { fields.push(`ativo = $${i++}`);    values.push(ativo); }
    if (nome     !== undefined) { fields.push(`nome = $${i++}`);     values.push(nome); }
    if (endereco !== undefined) { fields.push(`endereco = $${i++}`); values.push(endereco); }
    if (telefone !== undefined) { fields.push(`telefone = $${i++}`); values.push(telefone); }
    if (!fields.length) return res.status(400).json({ error: "Nenhum campo para atualizar" });
    values.push(id);
    const result = await pool.query(
      `UPDATE filiais SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

router.delete("/filiais/:id", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "DELETE FROM itens_pedido WHERE pedido_id IN (SELECT id FROM pedidos WHERE filial_id = $1)",
      [id]
    );
    await client.query("DELETE FROM pedidos WHERE filial_id = $1", [id]);
    await client.query("DELETE FROM users WHERE filial_id = $1", [id]);
    await client.query("DELETE FROM filiais WHERE id = $1", [id]);
    await client.query("COMMIT");
    res.json({ message: "Filial removida" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  } finally {
    client.release();
  }
});

// ─── Pedidos ──────────────────────────────────────────────────────────────────

router.get("/pedidos", async (req, res) => {
  const { filial_id, status, data_inicio, data_fim } = req.query;
  try {
    const conds  = [];
    const values = [];
    let i = 1;

    if (filial_id)   { conds.push(`pe.filial_id = $${i++}`);                values.push(filial_id); }
    if (status)      { conds.push(`pe.status = $${i++}`);                   values.push(status); }
    if (data_inicio) { conds.push(`pe.data_pedido::date >= $${i++}::date`); values.push(data_inicio); }
    if (data_fim)    { conds.push(`pe.data_pedido::date <= $${i++}::date`); values.push(data_fim); }

    const where      = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const selectItens = `COALESCE(json_agg(
             json_build_object('nome', p.nome, 'quantidade', ip.quantidade, 'preco', p.preco, 'preco_unitario', ip.preco_unitario)
           ) FILTER (WHERE ip.id IS NOT NULL), '[]') AS itens`;

    let result;
    if (filial_id) {
      result = await pool.query(
        `SELECT pe.id, pe.status, pe.status_pagamento, pe.data_pedido, ${selectItens}
         FROM pedidos pe
         LEFT JOIN itens_pedido ip ON ip.pedido_id = pe.id
         LEFT JOIN produtos p ON p.id = ip.produto_id
         ${where}
         GROUP BY pe.id
         ORDER BY pe.data_pedido DESC`,
        values
      );
    } else {
      result = await pool.query(
        `SELECT pe.id, pe.status, pe.status_pagamento, pe.data_pedido, f.nome AS filial_nome, ${selectItens}
         FROM pedidos pe
         JOIN filiais f ON f.id = pe.filial_id
         LEFT JOIN itens_pedido ip ON ip.pedido_id = pe.id
         LEFT JOIN produtos p ON p.id = ip.produto_id
         ${where}
         GROUP BY pe.id, f.nome
         ORDER BY pe.data_pedido DESC`,
        values
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

router.post("/pedidos", async (req, res) => {
  const { filial_id, created_by, itens } = req.body;

  const filialCheck = await pool.query("SELECT ativo FROM filiais WHERE id = $1", [filial_id]);
  if (!filialCheck.rows[0]?.ativo)
    return res.status(403).json({ error: "Filial desativada." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const pedidoResult = await client.query(
      "INSERT INTO pedidos (filial_id, status, created_by) VALUES ($1, 'Recebido', $2) RETURNING *",
      [filial_id, created_by]
    );
    const pedido = pedidoResult.rows[0];
    for (const item of itens) {
      const prodRes       = await client.query("SELECT preco FROM produtos WHERE id = $1", [item.produto_id]);
      const preco_unitario = prodRes.rows[0]?.preco ?? null;
      await client.query(
        "INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES ($1, $2, $3, $4)",
        [pedido.id, item.produto_id, item.quantidade, preco_unitario]
      );
    }
    await client.query("COMMIT");
    res.status(201).json(pedido);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  } finally {
    client.release();
  }
});

router.patch("/pedidos/:id/pagamento", async (req, res) => {
  const { id } = req.params;
  const { status_pagamento } = req.body;
  try {
    const result = await pool.query(
      "UPDATE pedidos SET status_pagamento = $1 WHERE id = $2 RETURNING *",
      [status_pagamento, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

router.patch("/pedidos/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await pool.query(
      "UPDATE pedidos SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// ─── Relatórios ───────────────────────────────────────────────────────────────

router.get("/relatorios", async (req, res) => {
  const data     = req.query.data || new Date().toISOString().split("T")[0];
  const filialId = req.query.filial_id ? parseInt(req.query.filial_id) : null;
  const fCond    = filialId ? `AND pe.filial_id = ${filialId}` : "";

  try {
    const [totaisRes, porFilialRes, topProdutosRes, faturamentoRes, geralRes] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE pe.data_pedido::date = $1::date ${fCond}) AS "totalHoje",
           COUNT(*) FILTER (WHERE pe.data_pedido::date = $1::date AND pe.status = 'Entregue' ${fCond}) AS "entreguesHoje"
         FROM pedidos pe`,
        [data]
      ),
      pool.query(
        `SELECT f.nome,
           COUNT(pe.id)                FILTER (WHERE pe.data_pedido::date = $1::date ${fCond}) AS pedidos,
           COALESCE(SUM(ip.quantidade) FILTER (WHERE pe.data_pedido::date = $1::date ${fCond}), 0) AS itens,
           COALESCE(SUM(COALESCE(ip.preco_unitario, p.preco) * ip.quantidade) FILTER (WHERE pe.data_pedido::date = $1::date ${fCond}), 0) AS total
         FROM filiais f
         LEFT JOIN pedidos pe ON pe.filial_id = f.id
         LEFT JOIN itens_pedido ip ON ip.pedido_id = pe.id
         LEFT JOIN produtos p ON p.id = ip.produto_id
         ${filialId ? `WHERE f.id = ${filialId}` : ""}
         GROUP BY f.id, f.nome
         ORDER BY f.nome`,
        [data]
      ),
      pool.query(
        `SELECT p.nome, COUNT(ip.id) AS pedidos
         FROM produtos p
         JOIN itens_pedido ip ON ip.produto_id = p.id
         JOIN pedidos pe ON pe.id = ip.pedido_id
         WHERE pe.data_pedido::date = $1::date ${fCond}
         GROUP BY p.id, p.nome
         ORDER BY pedidos DESC
         LIMIT 5`,
        [data]
      ),
      pool.query(
        `SELECT
           COALESCE(SUM(COALESCE(ip.preco_unitario, p.preco) * ip.quantidade), 0) AS faturamento,
           COALESCE(SUM((COALESCE(ip.preco_unitario, p.preco) - COALESCE(p.custo, 0)) * ip.quantidade), 0) AS lucro
         FROM pedidos pe
         JOIN itens_pedido ip ON ip.pedido_id = pe.id
         JOIN produtos p ON p.id = ip.produto_id
         WHERE pe.data_pedido::date = $1::date ${fCond}`,
        [data]
      ),
      pool.query(
        `SELECT
           COALESCE(SUM(COALESCE(ip.preco_unitario, p.preco) * ip.quantidade), 0) AS total_vendas,
           COALESCE(SUM((COALESCE(ip.preco_unitario, p.preco) - COALESCE(p.custo, 0)) * ip.quantidade), 0) AS total_lucro
         FROM pedidos pe
         JOIN itens_pedido ip ON ip.pedido_id = pe.id
         JOIN produtos p ON p.id = ip.produto_id
         WHERE 1=1 ${fCond}`,
        []
      ),
    ]);

    res.json({
      totalHoje:       totaisRes.rows[0].totalHoje,
      entreguesHoje:   totaisRes.rows[0].entreguesHoje,
      faturamentoHoje: faturamentoRes.rows[0].faturamento,
      lucroHoje:       faturamentoRes.rows[0].lucro,
      totalVendas:     geralRes.rows[0].total_vendas,
      totalLucro:      geralRes.rows[0].total_lucro,
      porFilial:       porFilialRes.rows,
      topProdutos:     topProdutosRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// ─── Perfil ───────────────────────────────────────────────────────────────────

router.get("/perfil/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT id, nome, email, tipo, filial_id FROM users WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Usuário não encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

router.put("/perfil/:id", async (req, res) => {
  const { id } = req.params;
  const { nome } = req.body;
  try {
    const result = await pool.query(
      "UPDATE users SET nome = $1 WHERE id = $2 RETURNING id, nome, email, tipo, filial_id",
      [nome, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

router.patch("/perfil/:id/senha", async (req, res) => {
  const { id } = req.params;
  const { senhaAtual, novaSenha } = req.body;
  try {
    const result = await pool.query("SELECT senha FROM users WHERE id = $1", [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Usuário não encontrado" });
    if (!(await verificarSenha(senhaAtual, result.rows[0].senha)))
      return res.status(400).json({ error: "Senha atual incorreta" });
    const hash = await bcrypt.hash(novaSenha, 10);
    await pool.query("UPDATE users SET senha = $1 WHERE id = $2", [hash, id]);
    res.json({ message: "Senha alterada com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// ─── Montar router e servir frontend ──────────────────────────────────────────

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const dist = path.join(__dirname, "../frontend/dist");
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
