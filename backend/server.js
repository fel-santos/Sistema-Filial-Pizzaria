import express from "express";
import cors from "cors";
import pkg from "pg";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

app.get("/", (req, res) => {
  res.send("API rodando com sucesso!");
});

// Suporta senhas em texto puro (legado) e bcrypt
async function verificarSenha(plain, stored) {
  if (stored.startsWith("$2b$") || stored.startsWith("$2a$")) {
    return bcrypt.compare(plain, stored);
  }
  return plain === stored;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.post("/login", async (req, res) => {
  const { email, senha } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0)
      return res.status(400).json({ error: "Usuário não encontrado" });

    const user = result.rows[0];
    if (!(await verificarSenha(senha, user.senha)))
      return res.status(400).json({ error: "Senha inválida" });

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

app.get("/produtos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM produtos ORDER BY nome");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

app.post("/produtos", async (req, res) => {
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

app.patch("/produtos/:id", async (req, res) => {
  const { id } = req.params;
  const { preco, disponivel } = req.body;
  try {
    const fields = [];
    const values = [];
    let i = 1;
    if (preco !== undefined) { fields.push(`preco = $${i++}`); values.push(preco); }
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

// ─── Filiais ──────────────────────────────────────────────────────────────────

app.get("/filiais", async (req, res) => {
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

app.post("/filiais", async (req, res) => {
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
    res.status(500).json({ error: "Erro no servidor" });
  } finally {
    client.release();
  }
});

app.patch("/filiais/:id", async (req, res) => {
  const { id } = req.params;
  const { ativo } = req.body;
  try {
    const result = await pool.query(
      "UPDATE filiais SET ativo = $1 WHERE id = $2 RETURNING *",
      [ativo, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// ─── Pedidos ──────────────────────────────────────────────────────────────────

app.get("/pedidos", async (req, res) => {
  const { filial_id } = req.query;
  try {
    let result;
    if (filial_id) {
      result = await pool.query(
        `SELECT pe.id, pe.status, pe.data_pedido,
           COALESCE(json_agg(json_build_object('nome', p.nome, 'quantidade', ip.quantidade, 'preco', p.preco))
             FILTER (WHERE ip.id IS NOT NULL), '[]') AS itens
         FROM pedidos pe
         LEFT JOIN itens_pedido ip ON ip.pedido_id = pe.id
         LEFT JOIN produtos p ON p.id = ip.produto_id
         WHERE pe.filial_id = $1
         GROUP BY pe.id
         ORDER BY pe.data_pedido DESC`,
        [filial_id]
      );
    } else {
      result = await pool.query(
        `SELECT pe.id, pe.status, pe.data_pedido, f.nome AS filial_nome,
           COALESCE(json_agg(json_build_object('nome', p.nome, 'quantidade', ip.quantidade, 'preco', p.preco))
             FILTER (WHERE ip.id IS NOT NULL), '[]') AS itens
         FROM pedidos pe
         JOIN filiais f ON f.id = pe.filial_id
         LEFT JOIN itens_pedido ip ON ip.pedido_id = pe.id
         LEFT JOIN produtos p ON p.id = ip.produto_id
         GROUP BY pe.id, f.nome
         ORDER BY pe.data_pedido DESC`
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

app.post("/pedidos", async (req, res) => {
  const { filial_id, created_by, itens } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const pedidoResult = await client.query(
      "INSERT INTO pedidos (filial_id, status, created_by) VALUES ($1, 'Recebido', $2) RETURNING *",
      [filial_id, created_by]
    );
    const pedido = pedidoResult.rows[0];
    for (const item of itens) {
      await client.query(
        "INSERT INTO itens_pedido (pedido_id, produto_id, quantidade) VALUES ($1, $2, $3)",
        [pedido.id, item.produto_id, item.quantidade]
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

app.patch("/pedidos/:id/status", async (req, res) => {
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

app.get("/relatorios", async (req, res) => {
  try {
    const [totaisRes, porFilialRes, topProdutosRes, faturamentoRes] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE data_pedido::date = CURRENT_DATE) AS "totalHoje",
          COUNT(*) FILTER (WHERE data_pedido::date = CURRENT_DATE AND status = 'Entregue') AS "entreguesHoje"
        FROM pedidos
      `),
      pool.query(`
        SELECT f.nome,
          COUNT(pe.id) FILTER (WHERE pe.data_pedido::date = CURRENT_DATE) AS pedidos,
          COALESCE(SUM(ip.quantidade) FILTER (WHERE pe.data_pedido::date = CURRENT_DATE), 0) AS itens,
          COALESCE(SUM(p.preco * ip.quantidade) FILTER (WHERE pe.data_pedido::date = CURRENT_DATE), 0) AS total
        FROM filiais f
        LEFT JOIN pedidos pe ON pe.filial_id = f.id
        LEFT JOIN itens_pedido ip ON ip.pedido_id = pe.id
        LEFT JOIN produtos p ON p.id = ip.produto_id
        GROUP BY f.id, f.nome
        ORDER BY f.nome
      `),
      pool.query(`
        SELECT p.nome, COUNT(ip.id) AS pedidos
        FROM produtos p
        JOIN itens_pedido ip ON ip.produto_id = p.id
        GROUP BY p.id, p.nome
        ORDER BY pedidos DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT COALESCE(SUM(p.preco * ip.quantidade), 0) AS faturamento
        FROM pedidos pe
        JOIN itens_pedido ip ON ip.pedido_id = pe.id
        JOIN produtos p ON p.id = ip.produto_id
        WHERE pe.data_pedido::date = CURRENT_DATE
      `),
    ]);

    res.json({
      totalHoje: totaisRes.rows[0].totalHoje,
      entreguesHoje: totaisRes.rows[0].entreguesHoje,
      faturamentoHoje: faturamentoRes.rows[0].faturamento,
      porFilial: porFilialRes.rows,
      topProdutos: topProdutosRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// ─── Perfil ───────────────────────────────────────────────────────────────────

app.get("/perfil/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT id, nome, email, tipo, filial_id FROM users WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

app.put("/perfil/:id", async (req, res) => {
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

app.patch("/perfil/:id/senha", async (req, res) => {
  const { id } = req.params;
  const { senhaAtual, novaSenha } = req.body;
  try {
    const result = await pool.query("SELECT senha FROM users WHERE id = $1", [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Usuário não encontrado" });
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

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000 🚀");
});
