import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  "Recebido":          "bg-zinc-700 text-zinc-300",
  "Em preparo":        "bg-yellow-900 text-yellow-300",
  "Saiu para entrega": "bg-blue-900 text-blue-300",
  "Entregue":          "bg-green-900 text-green-300",
};

const STATUS_OPCOES = ["Recebido", "Em preparo", "Saiu para entrega", "Entregue"];

const CARD         = "bg-zinc-800 rounded-xl border border-zinc-600 shadow-lg";
const INPUT        = "w-full bg-zinc-700 border border-zinc-500 rounded-lg px-3 py-2.5 text-zinc-100 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500";
const BTN_PRIMARY  = "bg-orange-600 hover:bg-orange-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition cursor-pointer";
const BTN_SECONDARY= "bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg px-4 py-2 text-sm transition cursor-pointer";

// ─── Utilidades ───────────────────────────────────────────────────────────────

function Badge({ status }) {
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLE[status] || "bg-zinc-700 text-zinc-300"}`}>
      {status}
    </span>
  );
}

function Alert({ type, children }) {
  const styles = {
    success: "bg-green-950 border border-green-700 text-green-400",
    error:   "bg-red-950 border border-red-700 text-red-400",
  };
  return <div className={`${styles[type]} rounded-lg px-4 py-3 text-sm`}>{children}</div>;
}

function numPedido(id) {
  return String(id).padStart(3, "0");
}

function calcTotal(itens) {
  return (itens || []).reduce((acc, i) => acc + Number(i.preco) * i.quantidade, 0);
}

function resumoItens(itens) {
  return (itens || []).map((i) => `${i.nome} ×${i.quantidade}`).join(", ") || "—";
}

// ─── FILIAL: Fazer Pedido ──────────────────────────────────────────────────────

function FazerPedido() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [produtos, setProdutos] = useState([]);
  const [qtds, setQtds] = useState({});
  const [sucesso, setSucesso] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/produtos")
      .then((r) => r.json())
      .then((data) => setProdutos(data))
      .catch((err) => console.error("Erro ao carregar produtos:", err));
  }, []);

  const setQtd = (id, val) =>
    setQtds((prev) => ({ ...prev, [id]: Math.max(0, parseInt(val) || 0) }));

  const itensSelecionados = produtos.filter((p) => qtds[p.id] > 0);
  const total = calcTotal(itensSelecionados.map((p) => ({ ...p, quantidade: qtds[p.id] })));

  const enviar = async () => {
    if (!itensSelecionados.length) return;
    setLoading(true);
    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filial_id: user.filial_id,
          created_by: user.id,
          itens: itensSelecionados.map((p) => ({ produto_id: p.id, quantidade: qtds[p.id] })),
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar pedido");
      setSucesso(true);
      setQtds({});
      setTimeout(() => setSucesso(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar pedido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-zinc-100 text-xl font-semibold">Fazer Pedido</h2>
          <p className="text-zinc-500 text-sm mt-0.5">Selecione os produtos e as quantidades</p>
        </div>
      </div>

      {sucesso && <Alert type="success">Pedido enviado com sucesso! Aguarde a confirmação.</Alert>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {produtos.map((p) => {
          const selecionado = qtds[p.id] > 0;
          return (
            <div key={p.id} className={`${CARD} p-5 transition-all ${selecionado ? "border-orange-500 ring-1 ring-orange-500/30" : ""} ${!p.disponivel ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-zinc-100 font-semibold">{p.nome}</p>
                  <p className="text-orange-400 text-sm font-medium mt-0.5">R$ {Number(p.preco).toFixed(2)}</p>
                </div>
                {!p.disponivel && <span className="text-xs bg-red-900 text-red-400 px-2 py-0.5 rounded-full">Indisponível</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setQtd(p.id, (qtds[p.id] || 0) - 1)} disabled={!p.disponivel}
                  className="w-8 h-8 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-100 text-lg flex items-center justify-center transition cursor-pointer disabled:opacity-40">−</button>
                <input type="number" min="0" value={qtds[p.id] || 0} onChange={(e) => setQtd(p.id, e.target.value)} disabled={!p.disponivel}
                  className="flex-1 bg-zinc-700 border border-zinc-500 rounded-lg py-1.5 text-zinc-100 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed" />
                <button onClick={() => setQtd(p.id, (qtds[p.id] || 0) + 1)} disabled={!p.disponivel}
                  className="w-8 h-8 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-100 text-lg flex items-center justify-center transition cursor-pointer disabled:opacity-40">+</button>
              </div>
            </div>
          );
        })}
        {produtos.length === 0 && (
          <p className="text-zinc-500 text-sm col-span-3">Carregando produtos...</p>
        )}
      </div>

      <div className={`${CARD} p-5`}>
        <p className="text-zinc-100 font-semibold mb-4">Resumo do pedido</p>
        {itensSelecionados.length === 0
          ? <p className="text-zinc-500 text-sm">Nenhum item selecionado.</p>
          : (
            <div className="flex flex-col gap-2 mb-4">
              {itensSelecionados.map((p) => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span className="text-zinc-300">{p.nome} × {qtds[p.id]}</span>
                  <span className="text-zinc-400">R$ {(Number(p.preco) * qtds[p.id]).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-zinc-700 mt-2 pt-3 flex justify-between font-semibold">
                <span className="text-zinc-100">Total</span>
                <span className="text-orange-400 text-base">R$ {total.toFixed(2)}</span>
              </div>
            </div>
          )}
        <button onClick={enviar} disabled={!itensSelecionados.length || loading}
          className={`${BTN_PRIMARY} w-full py-2.5 disabled:opacity-40`}>
          {loading ? "Enviando..." : "Enviar Pedido"}
        </button>
      </div>
    </div>
  );
}

// ─── FILIAL: Meus Pedidos ─────────────────────────────────────────────────────

function MeusPedidos() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    fetch(`/api/pedidos?filial_id=${user.filial_id}`)
      .then((r) => r.json())
      .then((data) => setPedidos(data))
      .catch((err) => console.error("Erro ao carregar pedidos:", err));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-zinc-100 text-xl font-semibold">Meus Pedidos</h2>
        <p className="text-zinc-500 text-sm mt-0.5">Histórico de pedidos enviados</p>
      </div>
      <div className="flex flex-col gap-3">
        {pedidos.map((p) => (
          <div key={p.id} className={`${CARD} p-5`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <p className="text-zinc-100 font-semibold">Pedido #{numPedido(p.id)}</p>
                <Badge status={p.status} />
              </div>
              <span className="text-zinc-500 text-xs">
                {new Date(p.data_pedido).toLocaleString("pt-BR")}
              </span>
            </div>
            <p className="text-zinc-400 text-sm mb-2">{resumoItens(p.itens)}</p>
            <p className="text-orange-400 text-sm font-semibold">R$ {calcTotal(p.itens).toFixed(2)}</p>
          </div>
        ))}
        {pedidos.length === 0 && <p className="text-zinc-500 text-sm">Nenhum pedido encontrado.</p>}
      </div>
    </div>
  );
}

// ─── FILIAL: Acompanhar Status ────────────────────────────────────────────────

const ETAPAS = ["Recebido", "Em preparo", "Saiu para entrega", "Entregue"];

function AcompanharStatus() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [pedidos, setPedidos] = useState([]);

  const carregar = () => {
    fetch(`/api/pedidos?filial_id=${user.filial_id}`)
      .then((r) => r.json())
      .then((data) => setPedidos(data))
      .catch((err) => console.error("Erro ao carregar status:", err));
  };

  useEffect(() => {
    carregar();
    const timer = setInterval(carregar, 10000);
    return () => clearInterval(timer);
  }, []);

  const pedido = pedidos[0];

  if (!pedido) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-zinc-100 text-xl font-semibold">Acompanhar Status</h2>
          <p className="text-zinc-500 text-sm mt-0.5">Status do pedido mais recente</p>
        </div>
        <p className="text-zinc-500 text-sm">Nenhum pedido encontrado.</p>
      </div>
    );
  }

  const statusAtual = pedido.status;
  const idxAtual = ETAPAS.indexOf(statusAtual);
  const total = calcTotal(pedido.itens);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-zinc-100 text-xl font-semibold">Acompanhar Status</h2>
        <p className="text-zinc-500 text-sm mt-0.5">Status do pedido mais recente</p>
      </div>

      <div className={`${CARD} p-6 max-w-xl`}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-zinc-100 font-semibold">Pedido #{numPedido(pedido.id)}</p>
          <span className="text-zinc-500 text-xs">
            {new Date(pedido.data_pedido).toLocaleString("pt-BR")}
          </span>
        </div>
        <p className="text-zinc-400 text-sm mb-8">{resumoItens(pedido.itens)}</p>

        <div className="flex items-start">
          {ETAPAS.map((etapa, idx) => (
            <div key={etapa} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  idx < idxAtual  ? "bg-green-700 text-white"
                  : idx === idxAtual ? "bg-orange-600 text-white ring-4 ring-orange-600/20"
                  : "bg-zinc-700 text-zinc-500"
                }`}>
                  {idx < idxAtual ? "✓" : idx + 1}
                </div>
                <p className={`text-xs mt-2 text-center w-20 leading-tight ${
                  idx === idxAtual ? "text-orange-400 font-medium"
                  : idx < idxAtual ? "text-green-400"
                  : "text-zinc-600"
                }`}>{etapa}</p>
              </div>
              {idx < ETAPAS.length - 1 && (
                <div className={`flex-1 h-0.5 mb-7 mx-1 ${idx < idxAtual ? "bg-green-700" : "bg-zinc-700"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-zinc-700 mt-6 pt-4 flex justify-between text-sm">
          <span className="text-zinc-400">Total do pedido</span>
          <span className="text-orange-400 font-semibold">R$ {total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN: Pedidos ───────────────────────────────────────────────────────────

function PedidosAdmin() {
  const [pedidos, setPedidos] = useState([]);
  const [filtro, setFiltro] = useState("Todas");

  useEffect(() => {
    fetch("/api/pedidos")
      .then((r) => r.json())
      .then((data) => setPedidos(data))
      .catch((err) => console.error("Erro ao carregar pedidos:", err));
  }, []);

  const filiais = ["Todas", ...new Set(pedidos.map((p) => p.filial_nome))];
  const lista = filtro === "Todas" ? pedidos : pedidos.filter((p) => p.filial_nome === filtro);

  const atualizarStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/pedidos/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar status");
      setPedidos((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar status.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-zinc-100 text-xl font-semibold">Pedidos</h2>
          <p className="text-zinc-500 text-sm mt-0.5">
            {lista.length} pedido{lista.length !== 1 ? "s" : ""} encontrado{lista.length !== 1 ? "s" : ""}
          </p>
        </div>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}
          className="bg-zinc-700 border border-zinc-500 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
          {filiais.map((f) => <option key={f}>{f}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-3">
        {lista.map((p) => {
          const horario = new Date(p.data_pedido).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          const total = calcTotal(p.itens);
          return (
            <div key={p.id} className={`${CARD} p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-zinc-100 font-semibold">#{numPedido(p.id)}</p>
                  <p className="text-zinc-400 text-sm">{p.filial_nome}</p>
                  <Badge status={p.status} />
                </div>
                <p className="text-zinc-500 text-sm">{resumoItens(p.itens)}</p>
                <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                  <span>{horario}</span>
                  <span className="text-orange-400 font-semibold text-sm">R$ {total.toFixed(2)}</span>
                </div>
              </div>
              <select value={p.status} onChange={(e) => atualizarStatus(p.id, e.target.value)}
                className="bg-zinc-700 border border-zinc-500 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 shrink-0 cursor-pointer">
                {STATUS_OPCOES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          );
        })}
        {lista.length === 0 && <p className="text-zinc-500 text-sm">Nenhum pedido encontrado.</p>}
      </div>
    </div>
  );
}

// ─── ADMIN: Filiais ───────────────────────────────────────────────────────────

function Filiais() {
  const [filiais, setFiliais] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ nome: "", endereco: "", telefone: "", email: "", senha: "" });

  useEffect(() => {
    fetch("/api/filiais")
      .then((r) => r.json())
      .then((data) => setFiliais(data))
      .catch((err) => console.error("Erro ao carregar filiais:", err));
  }, []);

  const salvar = async () => {
    if (!form.nome) return;
    try {
      const res = await fetch("/api/filiais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Erro ao criar filial");
      const nova = await res.json();
      setFiliais((prev) => [...prev, nova]);
      setForm({ nome: "", endereco: "", telefone: "", email: "", senha: "" });
      setMostrarForm(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao criar filial.");
    }
  };

  const toggleAtiva = async (id) => {
    const filial = filiais.find((f) => f.id === id);
    try {
      const res = await fetch(`/api/filiais/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !filial.ativo }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar filial");
      setFiliais((prev) => prev.map((f) => f.id === id ? { ...f, ativo: !f.ativo } : f));
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar filial.");
    }
  };

  const campos = [
    { key: "nome",     placeholder: "Nome da filial" },
    { key: "endereco", placeholder: "Endereço" },
    { key: "telefone", placeholder: "Telefone" },
    { key: "email",    placeholder: "Email de acesso" },
    { key: "senha",    placeholder: "Senha inicial" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-zinc-100 text-xl font-semibold">Filiais</h2>
          <p className="text-zinc-500 text-sm mt-0.5">
            {filiais.length} filial{filiais.length !== 1 ? "is" : ""} cadastrada{filiais.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => setMostrarForm(!mostrarForm)} className={BTN_PRIMARY}>
          + Nova Filial
        </button>
      </div>

      {mostrarForm && (
        <div className={`${CARD} p-5 flex flex-col gap-3`}>
          <p className="text-zinc-100 font-semibold mb-1">Nova filial</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {campos.map(({ key, placeholder }) => (
              <input key={key} type={key === "senha" ? "password" : "text"} placeholder={placeholder}
                value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className={INPUT} />
            ))}
          </div>
          <div className="flex gap-2 mt-1">
            <button onClick={salvar} className={BTN_PRIMARY}>Salvar</button>
            <button onClick={() => setMostrarForm(false)} className={BTN_SECONDARY}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {filiais.map((f) => (
          <div key={f.id} className={`${CARD} p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`}>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <p className="text-zinc-100 font-semibold">{f.nome}</p>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${f.ativo ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                  {f.ativo ? "Ativa" : "Inativa"}
                </span>
              </div>
              <p className="text-zinc-400 text-sm">{f.endereco}</p>
              <p className="text-zinc-500 text-xs">{f.telefone}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button className={BTN_SECONDARY}>Editar</button>
              <button onClick={() => toggleAtiva(f.id)}
                className={`text-sm rounded-lg px-4 py-2 transition cursor-pointer font-medium ${f.ativo ? "bg-red-900 hover:bg-red-800 text-red-300" : "bg-green-900 hover:bg-green-800 text-green-300"}`}>
                {f.ativo ? "Desativar" : "Ativar"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ADMIN: Produtos ──────────────────────────────────────────────────────────

function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ nome: "", preco: "" });
  const [editandoPreco, setEditandoPreco] = useState(null);
  const [novoPreco, setNovoPreco] = useState("");

  useEffect(() => {
    fetch("/api/produtos")
      .then((r) => r.json())
      .then((data) => setProdutos(data))
      .catch((err) => console.error("Erro ao carregar produtos:", err));
  }, []);

  const adicionar = async () => {
    if (!form.nome || !form.preco) return;
    try {
      const res = await fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: form.nome, preco: parseFloat(form.preco) }),
      });
      if (!res.ok) throw new Error("Erro ao criar produto");
      const novo = await res.json();
      setProdutos((prev) => [...prev, novo]);
      setForm({ nome: "", preco: "" });
      setMostrarForm(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao criar produto.");
    }
  };

  const salvarPreco = async (id) => {
    try {
      const res = await fetch(`/api/produtos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preco: parseFloat(novoPreco) }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar preço");
      const atualizado = await res.json();
      setProdutos((prev) => prev.map((p) => p.id === id ? atualizado : p));
      setEditandoPreco(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar preço.");
    }
  };

  const toggleDisponivel = async (id) => {
    const produto = produtos.find((p) => p.id === id);
    try {
      const res = await fetch(`/api/produtos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disponivel: !produto.disponivel }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar produto");
      const atualizado = await res.json();
      setProdutos((prev) => prev.map((p) => p.id === id ? atualizado : p));
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar produto.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-zinc-100 text-xl font-semibold">Produtos</h2>
          <p className="text-zinc-500 text-sm mt-0.5">{produtos.length} produtos cadastrados</p>
        </div>
        <button onClick={() => setMostrarForm(!mostrarForm)} className={BTN_PRIMARY}>
          + Novo Produto
        </button>
      </div>

      {mostrarForm && (
        <div className={`${CARD} p-5 flex flex-col gap-3`}>
          <p className="text-zinc-100 font-semibold mb-1">Novo produto</p>
          <div className="flex gap-2">
            <input placeholder="Nome do produto" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={INPUT + " flex-1"} />
            <input placeholder="Preço (R$)" type="number" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} className={INPUT + " w-36"} />
          </div>
          <div className="flex gap-2">
            <button onClick={adicionar} className={BTN_PRIMARY}>Salvar</button>
            <button onClick={() => setMostrarForm(false)} className={BTN_SECONDARY}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {produtos.map((p) => (
          <div key={p.id} className={`${CARD} p-5 flex flex-col gap-4`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-zinc-100 font-semibold">{p.nome}</p>
                <p className="text-orange-400 font-semibold mt-0.5">R$ {Number(p.preco).toFixed(2)}</p>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0 ${p.disponivel ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                {p.disponivel ? "Disponível" : "Indisponível"}
              </span>
            </div>

            {editandoPreco === p.id ? (
              <div className="flex gap-2">
                <input type="number" defaultValue={p.preco} onChange={(e) => setNovoPreco(e.target.value)}
                  className="flex-1 bg-zinc-700 border border-zinc-500 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                <button onClick={() => salvarPreco(p.id)} className={BTN_PRIMARY}>Salvar</button>
              </div>
            ) : (
              <button onClick={() => { setEditandoPreco(p.id); setNovoPreco(p.preco); }}
                className="text-zinc-500 hover:text-zinc-300 text-xs text-left transition cursor-pointer">
                ✏️ Editar preço
              </button>
            )}

            <button onClick={() => toggleDisponivel(p.id)}
              className={`text-xs rounded-lg px-3 py-2 transition cursor-pointer font-medium ${p.disponivel ? "bg-red-900 hover:bg-red-800 text-red-300" : "bg-green-900 hover:bg-green-800 text-green-300"}`}>
              {p.disponivel ? "Marcar indisponível" : "Marcar disponível"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ADMIN: Relatórios ────────────────────────────────────────────────────────

function Relatorios() {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    fetch("/api/relatorios")
      .then((r) => r.json())
      .then((data) => setDados(data))
      .catch((err) => console.error("Erro ao carregar relatórios:", err));
  }, []);

  const cards = [
    { label: "Pedidos hoje",       valor: dados ? String(dados.totalHoje) : "—",                                    cor: "text-zinc-100" },
    { label: "Pedidos entregues",  valor: dados ? String(dados.entreguesHoje) : "—",                                cor: "text-green-400" },
    { label: "Faturamento do dia", valor: dados ? `R$ ${Number(dados.faturamentoHoje).toFixed(2)}` : "—",           cor: "text-orange-400" },
  ];

  const porFilial    = dados?.porFilial    || [];
  const topProdutos  = dados?.topProdutos  || [];
  const maxPedidos   = topProdutos[0]?.pedidos || 1;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-zinc-100 text-xl font-semibold">Relatórios</h2>
        <p className="text-zinc-500 text-sm mt-0.5">Resumo do dia</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className={`${CARD} p-5`}>
            <p className="text-zinc-500 text-sm mb-2">{c.label}</p>
            <p className={`text-2xl font-bold ${c.cor}`}>{c.valor}</p>
          </div>
        ))}
      </div>

      <div className={`${CARD} overflow-hidden`}>
        <div className="px-5 py-4 border-b border-zinc-600">
          <p className="text-zinc-100 font-semibold">Pedidos por Filial</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-600">
              {["Filial", "Pedidos", "Itens", "Total"].map((col) => (
                <th key={col} className="text-zinc-400 font-medium text-left px-5 py-3">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {porFilial.map((r, i) => (
              <tr key={r.nome} className={`hover:bg-zinc-700 transition ${i < porFilial.length - 1 ? "border-b border-zinc-600" : ""}`}>
                <td className="px-5 py-3 text-zinc-100 font-medium">{r.nome}</td>
                <td className="px-5 py-3 text-zinc-400">{r.pedidos}</td>
                <td className="px-5 py-3 text-zinc-400">{r.itens}</td>
                <td className="px-5 py-3 text-orange-400 font-semibold">R$ {Number(r.total).toFixed(2)}</td>
              </tr>
            ))}
            {porFilial.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-4 text-zinc-500 text-sm">Nenhum dado disponível.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={`${CARD} p-5`}>
        <p className="text-zinc-100 font-semibold mb-5">Produtos mais pedidos</p>
        <div className="flex flex-col gap-4">
          {topProdutos.map((p, i) => (
            <div key={p.nome}>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-300 font-medium">{i + 1}. {p.nome}</span>
                <span className="text-zinc-500">{p.pedidos} pedidos</span>
              </div>
              <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div className="h-full bg-orange-600 rounded-full transition-all"
                  style={{ width: `${Math.round(p.pedidos / maxPedidos * 100)}%` }} />
              </div>
            </div>
          ))}
          {topProdutos.length === 0 && <p className="text-zinc-500 text-sm">Nenhum dado disponível.</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Perfil ───────────────────────────────────────────────────────────────────

function Perfil() {
  const [userRaw, setUserRaw] = useState(JSON.parse(localStorage.getItem("user") || "null"));
  const [nome, setNome] = useState(userRaw?.nome || "");
  const [email] = useState(userRaw?.email || "—");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [erro, setErro] = useState("");

  const flash = (fn, msg) => { fn(msg); setTimeout(() => fn(""), 3000); };

  const salvarNome = async () => {
    if (!nome.trim()) { flash(setErro, "Nome não pode ser vazio."); return; }
    try {
      const res = await fetch(`/api/perfil/${userRaw.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar nome");
      const updated = { ...userRaw, nome };
      setUserRaw(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      flash(setSucesso, "Nome atualizado com sucesso!");
      setErro("");
    } catch (err) {
      console.error(err);
      flash(setErro, "Erro ao salvar nome.");
    }
  };

  const salvarSenha = async () => {
    setErro(""); setSucesso("");
    if (!senhaAtual || !novaSenha || !confirmarSenha) { flash(setErro, "Preencha todos os campos."); return; }
    if (novaSenha !== confirmarSenha) { flash(setErro, "As senhas não coincidem."); return; }
    if (novaSenha.length < 6) { flash(setErro, "Mínimo 6 caracteres."); return; }
    try {
      const res = await fetch(`/api/perfil/${userRaw.id}/senha`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual, novaSenha }),
      });
      const data = await res.json();
      if (!res.ok) { flash(setErro, data.error || "Erro ao alterar senha."); return; }
      flash(setSucesso, "Senha alterada com sucesso!");
      setSenhaAtual(""); setNovaSenha(""); setConfirmarSenha("");
    } catch (err) {
      console.error(err);
      flash(setErro, "Erro ao alterar senha.");
    }
  };

  const iniciais = nome.trim().split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <div>
        <h2 className="text-zinc-100 text-xl font-semibold">Perfil</h2>
        <p className="text-zinc-500 text-sm mt-0.5">Gerencie suas informações</p>
      </div>

      {sucesso && <Alert type="success">{sucesso}</Alert>}
      {erro    && <Alert type="error">{erro}</Alert>}

      <div className={`${CARD} p-5 flex flex-col gap-5`}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-orange-600 flex items-center justify-center shrink-0 shadow-lg">
            <span className="text-white font-bold text-xl">{iniciais}</span>
          </div>
          <div>
            <p className="text-zinc-100 font-semibold text-base">{userRaw?.nome}</p>
            <p className="text-zinc-400 text-sm">{email}</p>
            <span className="text-xs bg-orange-900 text-orange-400 px-2.5 py-0.5 rounded-full font-medium mt-1 inline-block">
              {userRaw?.tipo}
            </span>
          </div>
        </div>

        <div className="border-t border-zinc-600 pt-4 flex flex-col gap-3">
          <label className="text-zinc-400 text-sm font-medium">Nome</label>
          <div className="flex gap-2">
            <input value={nome} onChange={(e) => setNome(e.target.value)} className={INPUT + " flex-1"} />
            <button onClick={salvarNome} className={BTN_PRIMARY + " shrink-0"}>Salvar</button>
          </div>
          <label className="text-zinc-400 text-sm font-medium">Email</label>
          <input value={email} readOnly
            className="w-full bg-zinc-700/50 border border-zinc-600 rounded-lg px-3 py-2.5 text-zinc-500 text-sm cursor-default focus:outline-none" />
        </div>
      </div>

      <div className={`${CARD} p-5 flex flex-col gap-3`}>
        <p className="text-zinc-100 font-semibold">Alterar senha</p>
        <input type="password" placeholder="Senha atual" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} className={INPUT} />
        <input type="password" placeholder="Nova senha" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} className={INPUT} />
        <input type="password" placeholder="Confirmar nova senha" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} className={INPUT} />
        <button onClick={salvarSenha} className={BTN_PRIMARY + " w-fit"}>Alterar senha</button>
      </div>
    </div>
  );
}

// ─── Configurações ────────────────────────────────────────────────────────────

function Toggle({ ativo, onChange }) {
  return (
    <button onClick={() => onChange(!ativo)}
      className={`w-12 h-6 rounded-full transition-colors cursor-pointer relative shrink-0 ${ativo ? "bg-orange-600" : "bg-zinc-700"}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${ativo ? "left-[26px]" : "left-0.5"}`} />
    </button>
  );
}

function Configuracoes({ tema, setTema }) {
  const [notifPedido, setNotifPedido] = useState(true);
  const [notifStatus, setNotifStatus] = useState(true);
  const [sucesso, setSucesso] = useState(false);

  const salvar = () => {
    localStorage.setItem("tema", tema);
    setSucesso(true);
    setTimeout(() => setSucesso(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <div>
        <h2 className="text-zinc-100 text-xl font-semibold">Configurações</h2>
        <p className="text-zinc-500 text-sm mt-0.5">Preferências do sistema</p>
      </div>

      {sucesso && <Alert type="success">Preferências salvas!</Alert>}

      <div className={`${CARD} p-5 flex flex-col gap-4`}>
        <p className="text-zinc-100 font-semibold">Aparência</p>
        <div>
          <label className="text-zinc-400 text-sm font-medium block mb-3">Tema</label>
          <div className="flex gap-2">
            {[{ id: "dark", label: "🌙 Escuro" }, { id: "light", label: "☀️ Claro" }].map((t) => (
              <button key={t.id} onClick={() => setTema(t.id)}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                  tema === t.id ? "bg-orange-600 text-white" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600 hover:text-zinc-100"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`${CARD} p-5 flex flex-col gap-4`}>
        <p className="text-zinc-100 font-semibold">Notificações</p>
        {[
          { label: "Novo pedido recebido",   desc: "Alertar quando uma filial enviar pedido",      val: notifPedido, fn: setNotifPedido },
          { label: "Atualização de status",  desc: "Alertar quando o status do pedido mudar",      val: notifStatus, fn: setNotifStatus },
        ].map((n) => (
          <div key={n.label} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-zinc-300 text-sm font-medium">{n.label}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{n.desc}</p>
            </div>
            <Toggle ativo={n.val} onChange={n.fn} />
          </div>
        ))}
      </div>

      <button onClick={salvar} className={BTN_PRIMARY + " w-fit"}>Salvar preferências</button>
    </div>
  );
}

// ─── Layout principal ─────────────────────────────────────────────────────────

const SECOES_FILIAL = [
  { id: "fazer-pedido", label: "Fazer Pedido" },
  { id: "meus-pedidos", label: "Meus Pedidos" },
  { id: "acompanhar",   label: "Acompanhar Status" },
];

const SECOES_ADMIN = [
  { id: "pedidos",    label: "Pedidos" },
  { id: "filiais",    label: "Filiais" },
  { id: "produtos",   label: "Produtos" },
  { id: "relatorios", label: "Relatórios" },
];

const SECOES_COMUNS = [
  { id: "perfil",        label: "Perfil" },
  { id: "configuracoes", label: "Configurações" },
];

function NavItem({ secao, atual, onClick, children }) {
  const ativo = secao === atual;
  return (
    <button onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer flex items-center gap-2 ${
        ativo ? "bg-orange-600 text-white shadow-md" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
      }`}>
      {children}
    </button>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isAdmin = user?.tipo === "ADMIN";
  const secoes = isAdmin ? SECOES_ADMIN : SECOES_FILIAL;

  const [secao, setSecao] = useState(secoes[0].id);
  const [tema, setTemaState] = useState(() => localStorage.getItem("tema") || "dark");

  const setTema = (t) => {
    setTemaState(t);
    localStorage.setItem("tema", t);
    document.documentElement.classList.toggle("light-theme", t === "light");
  };

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    document.documentElement.classList.toggle("light-theme", tema === "light");
  }, []);

  const logout = () => {
    localStorage.removeItem("user");
    document.documentElement.classList.remove("light-theme");
    navigate("/");
  };

  if (!user) return null;

  const iniciais = user.nome?.trim().split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-60 bg-zinc-900 border-r border-zinc-700 flex flex-col shrink-0">
        <div className="px-4 py-5 border-b border-zinc-700">
          <span className="text-xl">🍕</span>
          <span className="text-orange-500 font-bold text-base ml-1.5">PizzaSystem</span>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {secoes.map((s) => (
            <NavItem key={s.id} secao={s.id} atual={secao} onClick={() => setSecao(s.id)}>
              {s.label}
            </NavItem>
          ))}

          <div className="border-t border-zinc-700 my-3" />

          {SECOES_COMUNS.map((s) => (
            <NavItem key={s.id} secao={s.id} atual={secao} onClick={() => setSecao(s.id)}>
              {s.label}
            </NavItem>
          ))}
        </nav>

        <button onClick={() => setSecao("perfil")}
          className="flex items-center gap-3 px-4 py-4 border-t border-zinc-700 hover:bg-zinc-800 transition cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-orange-600 flex items-center justify-center shrink-0 shadow">
            <span className="text-white text-sm font-bold">{iniciais}</span>
          </div>
          <div className="text-left overflow-hidden flex-1 min-w-0">
            <p className="text-zinc-100 text-sm font-medium truncate">{user.nome}</p>
            <p className="text-zinc-500 text-xs truncate">{user.email || user.tipo}</p>
          </div>
        </button>
      </aside>

      {/* ── Conteúdo ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        <header className="flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-700 shrink-0">
          <div className="flex items-center gap-3">
            <p className="text-zinc-100 font-semibold">{user.nome}</p>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isAdmin ? "bg-orange-900 text-orange-400" : "bg-zinc-700 text-zinc-300"}`}>
              {user.tipo}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setTema(tema === "dark" ? "light" : "dark")}
              className="text-zinc-400 hover:text-zinc-100 transition cursor-pointer text-lg" title="Alternar tema">
              {tema === "dark" ? "☀️" : "🌙"}
            </button>
            <button onClick={logout} className="text-zinc-400 hover:text-red-400 text-sm font-medium transition cursor-pointer">
              Sair
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-zinc-950">
          {!isAdmin && secao === "fazer-pedido" && <FazerPedido />}
          {!isAdmin && secao === "meus-pedidos" && <MeusPedidos />}
          {!isAdmin && secao === "acompanhar"   && <AcompanharStatus />}

          {isAdmin && secao === "pedidos"    && <PedidosAdmin />}
          {isAdmin && secao === "filiais"    && <Filiais />}
          {isAdmin && secao === "produtos"   && <Produtos />}
          {isAdmin && secao === "relatorios" && <Relatorios />}

          {secao === "perfil"        && <Perfil />}
          {secao === "configuracoes" && <Configuracoes tema={tema} setTema={setTema} />}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
