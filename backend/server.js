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

app.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Usuário não encontrado" });
    }

    const user = result.rows[0];

    // ⚠️ TEMPORÁRIO (porque sua senha ainda não está com bcrypt)
    if (senha !== user.senha) {
      return res.status(400).json({ error: "Senha inválida" });
    }

    res.json({
      message: "Login realizado com sucesso",
      user: {
        id: user.id,
        nome: user.nome,
        tipo: user.tipo,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000 🚀");
});