import { useState } from "react";
import "./Login.css";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    // validação simples
    if (!email || !senha) {
        alert("Preencha todos os campos");
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, senha }),
        });

        const data = await response.json();

        if (!response.ok) {
        alert(data.error);
        return;
        }

        console.log(data);

        // só entra se login for válido
        navigate("/dashboard");

    } catch (err) {
        console.error(err);
        alert("Erro ao conectar com servidor");
    }
    };

    return (
    <div className="login-container">
        <form className="login-form" onSubmit={handleLogin}>
        <h2>Login</h2>

        <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
        />

        <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="login-input"
        />

        <button type="submit" className="login-button">
            Entrar
        </button>
        </form>
    </div>
    );
}

export default Login;