import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  "Recebido":          "bg-zinc-700 text-zinc-300",
  "Em preparo":        "bg-yellow-900 text-yellow-300",
  "Saiu para entrega": "bg-blue-900 text-blue-300",
  "Entregue":          "bg-green-900 text-green-300",
};
const STATUS_OPCOES  = ["Recebido", "Em preparo", "Saiu para entrega", "Entregue"];
const CARD           = "bg-zinc-800 rounded-xl border border-zinc-600 shadow-lg";
const INPUT_BASE     = "bg-zinc-700 border border-zinc-500 rounded-lg px-3 py-2.5 text-zinc-100 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500";
const INPUT          = INPUT_BASE + " w-full";
const BTN_PRIMARY    = "bg-orange-600 hover:bg-orange-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition cursor-pointer";
const BTN_SECONDARY  = "bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg px-4 py-2 text-sm transition cursor-pointer";
const BTN_DANGER     = "bg-red-900 hover:bg-red-800 text-red-300 rounded-lg px-4 py-2 text-sm font-medium transition cursor-pointer";

function hoje() { return new Date().toISOString().split("T")[0]; }

// ─── Ícones ───────────────────────────────────────────────────────────────────

function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}
function IconX() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

// ─── Componentes base ─────────────────────────────────────────────────────────

function Badge({ status }) {
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${STATUS_STYLE[status] || "bg-zinc-700 text-zinc-300"}`}>
      {status}
    </span>
  );
}

function Alert({ type, children }) {
  const s = { success: "bg-green-950 border-green-700 text-green-400", error: "bg-red-950 border-red-700 text-red-400" };
  return <div className={`${s[type]} border rounded-lg px-4 py-3 text-sm`}>{children}</div>;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-zinc-600 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );
}

function Confirm({ mensagem, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-zinc-800 border border-zinc-600 rounded-xl p-6 max-w-sm w-full shadow-2xl">
        <p className="text-zinc-100 font-semibold mb-2">Confirmar ação</p>
        <p className="text-zinc-400 text-sm mb-6">{mensagem}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className={BTN_SECONDARY}>Cancelar</button>
          <button onClick={onConfirm} className="bg-red-700 hover:bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition cursor-pointer">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

function numPedido(id)  { return String(id).padStart(3, "0"); }
function calcTotal(its) { return (its || []).reduce((a, i) => a + Number(i.preco_unitario ?? i.preco) * i.quantidade, 0); }
function resumoItens(its) { return (its || []).map((i) => `${i.nome} ×${i.quantidade}`).join(", ") || "—"; }

// ─── FILIAL: Fazer Pedido ─────────────────────────────────────────────────────

function FazerPedido() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [produtos, setProdutos] = useState([]);
  const [qtds, setQtds]         = useState({});
  const [busca, setBusca]       = useState("");
  const [loading, setLoading]   = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso]   = useState(false);
  const [erro, setErro]         = useState("");

  useEffect(() => {
    fetch("/api/produtos")
      .then((r) => r.json())
      .then((d) => { setProdutos(d); setLoading(false); })
      .catch(() => { setErro("Erro ao carregar produtos."); setLoading(false); });
  }, []);

  const setQtd = (id, v) => setQtds((p) => ({ ...p, [id]: Math.max(0, parseInt(v) || 0) }));
  const filtrados    = produtos
    .filter((p) => !busca || p.nome.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => b.disponivel - a.disponivel);
  const selecionados = produtos.filter((p) => qtds[p.id] > 0);
  const total = selecionados.reduce((a, p) => a + Number(p.preco) * qtds[p.id], 0);

  const enviar = async () => {
    if (!selecionados.length) return;
    setEnviando(true); setErro("");
    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filial_id: user.filial_id,
          created_by: user.id,
          itens: selecionados.map((p) => ({ produto_id: p.id, quantidade: qtds[p.id] })),
        }),
      });
      if (!res.ok) throw new Error();
      setSucesso(true); setQtds({});
      setTimeout(() => setSucesso(false), 3000);
    } catch { setErro("Erro ao enviar pedido. Tente novamente."); }
    finally  { setEnviando(false); }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-zinc-100 text-xl font-semibold">Fazer Pedido</h2>
        <p className="text-zinc-500 text-sm mt-0.5">Selecione os produtos e as quantidades</p>
      </div>

      {sucesso && <Alert type="success">Pedido enviado com sucesso! Aguarde a confirmação.</Alert>}
      {erro    && <Alert type="error">{erro}</Alert>}

      {!loading && (
        <input
          placeholder="Buscar produto..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className={INPUT}
        />
      )}

      {loading ? <Spinner /> : produtos.length === 0 ? (
        <p className="text-zinc-500 text-sm">Nenhum produto disponível no momento.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.length === 0 && (
            <p className="text-zinc-500 text-sm col-span-full">Nenhum produto encontrado para "{busca}".</p>
          )}
          {filtrados.map((p) => (
            <div key={p.id} className={`${CARD} p-4 transition-all ${qtds[p.id] > 0 ? "border-orange-500 ring-1 ring-orange-500/30" : ""} ${!p.disponivel ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-zinc-100 font-semibold">{p.nome}</p>
                  <p className="text-orange-400 text-sm font-medium mt-0.5">R$ {Number(p.preco).toFixed(2)}</p>
                </div>
                {!p.disponivel && <span className="text-xs bg-red-900 text-red-400 px-2 py-0.5 rounded-full whitespace-nowrap">Indisponível</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setQtd(p.id, (qtds[p.id] || 0) - 1)} disabled={!p.disponivel}
                  className="w-9 h-9 shrink-0 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-100 text-lg flex items-center justify-center transition cursor-pointer disabled:opacity-40">−</button>
                <input type="number" min="0" value={qtds[p.id] || 0} onChange={(e) => setQtd(p.id, e.target.value)} disabled={!p.disponivel}
                  className="flex-1 min-w-0 bg-zinc-700 border border-zinc-500 rounded-lg py-2 text-zinc-100 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed" />
                <button onClick={() => setQtd(p.id, (qtds[p.id] || 0) + 1)} disabled={!p.disponivel}
                  className="w-9 h-9 shrink-0 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-100 text-lg flex items-center justify-center transition cursor-pointer disabled:opacity-40">+</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div className={`${CARD} p-5`}>
          <p className="text-zinc-100 font-semibold mb-4">Resumo do pedido</p>
          {selecionados.length === 0 ? (
            <p className="text-zinc-500 text-sm">Nenhum item selecionado.</p>
          ) : (
            <div className="flex flex-col gap-2 mb-4">
              {selecionados.map((p) => (
                <div key={p.id} className="flex justify-between text-sm gap-2">
                  <span className="text-zinc-300 truncate">{p.nome} × {qtds[p.id]}</span>
                  <span className="text-zinc-400 shrink-0">R$ {(Number(p.preco) * qtds[p.id]).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-zinc-700 mt-2 pt-3 flex justify-between font-semibold">
                <span className="text-zinc-100">Total</span>
                <span className="text-orange-400 text-base">R$ {total.toFixed(2)}</span>
              </div>
            </div>
          )}
          <button onClick={enviar} disabled={!selecionados.length || enviando}
            className={`${BTN_PRIMARY} w-full py-2.5 disabled:opacity-40`}>
            {enviando ? "Enviando..." : "Enviar Pedido"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── FILIAL: Meus Pedidos ─────────────────────────────────────────────────────

function MeusPedidos() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [pedidos, setPedidos]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroData, setFiltroData]   = useState("");

  useEffect(() => {
    fetch(`/api/pedidos?filial_id=${user.filial_id}`)
      .then((r) => r.json())
      .then((d) => { setPedidos(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const lista = pedidos.filter((p) => {
    if (filtroStatus !== "Todos" && p.status !== filtroStatus) return false;
    if (filtroData && new Date(p.data_pedido).toISOString().split("T")[0] !== filtroData) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-zinc-100 text-xl font-semibold">Meus Pedidos</h2>
        <p className="text-zinc-500 text-sm mt-0.5">Histórico de pedidos enviados</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className={INPUT_BASE + " w-full sm:w-auto"}>
          <option>Todos</option>
          {STATUS_OPCOES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input type="date" value={filtroData} max={hoje()} onChange={(e) => setFiltroData(e.target.value)}
          className={INPUT_BASE + " w-full sm:w-auto"} />
        {filtroData && (
          <button onClick={() => setFiltroData("")} className={BTN_SECONDARY}>Limpar data</button>
        )}
      </div>

      {loading ? <Spinner /> : (
        <div className="flex flex-col gap-3">
          {lista.map((p) => (
            <div key={p.id} className={`${CARD} p-4 sm:p-5`}>
              <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-zinc-100 font-semibold">Pedido #{numPedido(p.id)}</p>
                  <Badge status={p.status} />
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${(p.status_pagamento || "Pendente") === "Pago" ? "bg-green-900 text-green-300" : "bg-yellow-900 text-yellow-300"}`}>
                    {p.status_pagamento || "Pendente"}
                  </span>
                </div>
                <span className="text-zinc-500 text-xs">{new Date(p.data_pedido).toLocaleString("pt-BR")}</span>
              </div>
              <p className="text-zinc-400 text-sm mb-2 break-words">{resumoItens(p.itens)}</p>
              <p className="text-orange-400 text-sm font-semibold">R$ {calcTotal(p.itens).toFixed(2)}</p>
            </div>
          ))}
          {lista.length === 0 && <p className="text-zinc-500 text-sm">Nenhum pedido encontrado.</p>}
        </div>
      )}
    </div>
  );
}

// ─── FILIAL: Acompanhar Status ────────────────────────────────────────────────

const ETAPAS = ["Recebido", "Em preparo", "Saiu para entrega", "Entregue"];

function AcompanharStatus() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregar = () =>
    fetch(`/api/pedidos?filial_id=${user.filial_id}`)
      .then((r) => r.json())
      .then((d) => { setPedidos(d); setLoading(false); })
      .catch(() => setLoading(false));

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 10000);
    return () => clearInterval(t);
  }, []);

  const pedido   = pedidos[0];
  const idxAtual = ETAPAS.indexOf(pedido?.status);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-zinc-100 text-xl font-semibold">Acompanhar Status</h2>
        <p className="text-zinc-500 text-sm mt-0.5">Pedido mais recente · atualiza a cada 10s</p>
      </div>
      {loading ? <Spinner /> : !pedido ? (
        <p className="text-zinc-500 text-sm">Nenhum pedido encontrado.</p>
      ) : (
        <div className={`${CARD} p-5 max-w-xl`}>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
            <p className="text-zinc-100 font-semibold">Pedido #{numPedido(pedido.id)}</p>
            <span className="text-zinc-500 text-xs">{new Date(pedido.data_pedido).toLocaleString("pt-BR")}</span>
          </div>
          <p className="text-zinc-400 text-sm mb-6 break-words">{resumoItens(pedido.itens)}</p>

          <div className="overflow-x-auto pb-1">
            <div className="flex items-start min-w-[320px]">
              {ETAPAS.map((etapa, idx) => (
                <div key={etapa} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 ${
                      idx < idxAtual   ? "bg-green-700 text-white"
                      : idx === idxAtual ? "bg-orange-600 text-white ring-4 ring-orange-600/20"
                      : "bg-zinc-700 text-zinc-500"
                    }`}>{idx < idxAtual ? "✓" : idx + 1}</div>
                    <p className={`text-xs mt-2 text-center w-16 leading-tight ${
                      idx === idxAtual ? "text-orange-400 font-medium" : idx < idxAtual ? "text-green-400" : "text-zinc-600"
                    }`}>{etapa}</p>
                  </div>
                  {idx < ETAPAS.length - 1 && (
                    <div className={`flex-1 h-0.5 mb-7 mx-1 ${idx < idxAtual ? "bg-green-700" : "bg-zinc-700"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-zinc-700 mt-4 pt-4 flex justify-between text-sm">
            <span className="text-zinc-400">Total do pedido</span>
            <span className="text-orange-400 font-semibold">R$ {calcTotal(pedido.itens).toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN: Pedidos ───────────────────────────────────────────────────────────

function PedidosAdmin() {
  const [pedidos, setPedidos]           = useState([]);
  const [filtroFilial, setFiltroFilial]       = useState("Todas");
  const [filtroStatus, setFiltroStatus]       = useState("Todos");
  const [filtroPagamento, setFiltroPagamento] = useState("Todos");
  const [filtroData, setFiltroData]           = useState("");
  const [loading, setLoading]                 = useState(true);
  const [erro, setErro]                       = useState("");

  const carregar = () =>
    fetch("/api/pedidos")
      .then((r) => r.json())
      .then((d) => { setPedidos(d); setLoading(false); })
      .catch(() => setLoading(false));

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 10000);
    return () => clearInterval(t);
  }, []);

  const filiais = ["Todas", ...new Set(pedidos.map((p) => p.filial_nome).filter(Boolean))];

  const lista = pedidos.filter((p) => {
    if (filtroFilial !== "Todas" && p.filial_nome !== filtroFilial) return false;
    if (filtroStatus !== "Todos" && p.status !== filtroStatus) return false;
    if (filtroPagamento !== "Todos" && (p.status_pagamento || "Pendente") !== filtroPagamento) return false;
    if (filtroData && new Date(p.data_pedido).toISOString().split("T")[0] !== filtroData) return false;
    return true;
  });

  const atualizarPagamento = async (id, status_pagamento) => {
    try {
      const res = await fetch(`/api/pedidos/${id}/pagamento`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status_pagamento }),
      });
      if (!res.ok) throw new Error();
      setPedidos((prev) => prev.map((p) => p.id === id ? { ...p, status_pagamento } : p));
    } catch { setErro("Erro ao atualizar pagamento."); }
  };

  const atualizarStatus = async (id, status) => {
    setErro("");
    try {
      const res = await fetch(`/api/pedidos/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setPedidos((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
    } catch { setErro("Erro ao atualizar status do pedido."); }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-zinc-100 text-xl font-semibold">Pedidos</h2>
          <p className="text-zinc-500 text-sm mt-0.5">{lista.length} pedido{lista.length !== 1 ? "s" : ""} · atualiza a cada 10s</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={filtroFilial} onChange={(e) => setFiltroFilial(e.target.value)} className={INPUT_BASE + " w-full sm:w-auto"}>
          {filiais.map((f) => <option key={f}>{f}</option>)}
        </select>
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className={INPUT_BASE + " w-full sm:w-auto"}>
          <option>Todos</option>
          {STATUS_OPCOES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filtroPagamento} onChange={(e) => setFiltroPagamento(e.target.value)} className={INPUT_BASE + " w-full sm:w-auto"}>
          <option>Todos</option>
          <option>Pendente</option>
          <option>Pago</option>
        </select>
        <input type="date" value={filtroData} max={hoje()} onChange={(e) => setFiltroData(e.target.value)}
          className={INPUT_BASE + " w-full sm:w-auto"} />
        {filtroData && (
          <button onClick={() => setFiltroData("")} className={BTN_SECONDARY}>Limpar data</button>
        )}
      </div>

      {erro && <Alert type="error">{erro}</Alert>}

      {loading ? <Spinner /> : (
        <div className="flex flex-col gap-3">
          {lista.map((p) => {
            const horario = new Date(p.data_pedido).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            return (
              <div key={p.id} className={`${CARD} p-4 sm:p-5`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-zinc-100 font-semibold">#{numPedido(p.id)}</p>
                      <p className="text-zinc-400 text-sm">{p.filial_nome}</p>
                      <Badge status={p.status} />
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${(p.status_pagamento || "Pendente") === "Pago" ? "bg-green-900 text-green-300" : "bg-yellow-900 text-yellow-300"}`}>
                        {p.status_pagamento || "Pendente"}
                      </span>
                    </div>
                    <p className="text-zinc-500 text-sm break-words">{resumoItens(p.itens)}</p>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span>{horario}</span>
                      <span className="text-orange-400 font-semibold text-sm">R$ {calcTotal(p.itens).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <button
                      onClick={() => atualizarPagamento(p.id, (p.status_pagamento || "Pendente") === "Pago" ? "Pendente" : "Pago")}
                      className={`text-xs rounded-lg px-3 py-2 font-medium transition cursor-pointer whitespace-nowrap ${(p.status_pagamento || "Pendente") === "Pago" ? "bg-zinc-700 hover:bg-zinc-600 text-zinc-300" : "bg-green-900 hover:bg-green-800 text-green-300"}`}>
                      {(p.status_pagamento || "Pendente") === "Pago" ? "Estornar" : "Marcar como Pago"}
                    </button>
                    <select value={p.status} onChange={(e) => atualizarStatus(p.id, e.target.value)}
                      className={INPUT_BASE + " w-full sm:w-44 cursor-pointer"}>
                      {STATUS_OPCOES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
          {lista.length === 0 && <p className="text-zinc-500 text-sm">Nenhum pedido encontrado.</p>}
        </div>
      )}
    </div>
  );
}

// ─── ADMIN: Filiais ───────────────────────────────────────────────────────────

function Filiais() {
  const [filiais, setFiliais]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm]               = useState({ nome: "", endereco: "", telefone: "", email: "", senha: "" });
  const [editando, setEditando]       = useState(null);
  const [formEdit, setFormEdit]       = useState({ nome: "", endereco: "", telefone: "" });
  const [confirm, setConfirm]         = useState(null);
  const [erro, setErro]               = useState("");
  const [sucesso, setSucesso]         = useState("");

  const flash = (fn, msg) => { fn(msg); setTimeout(() => fn(""), 3000); };

  useEffect(() => {
    fetch("/api/filiais")
      .then((r) => r.json())
      .then((d) => { setFiliais(d); setLoading(false); })
      .catch(() => { setErro("Erro ao carregar filiais."); setLoading(false); });
  }, []);

  const salvar = async () => {
    if (!form.nome || !form.email || !form.senha) { setErro("Nome, email e senha são obrigatórios."); return; }
    setErro("");
    try {
      const res = await fetch("/api/filiais", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error || "Erro ao criar filial."); return; }
      setFiliais((prev) => [...prev, data]);
      setForm({ nome: "", endereco: "", telefone: "", email: "", senha: "" });
      setMostrarForm(false);
      flash(setSucesso, "Filial criada com sucesso!");
    } catch { setErro("Erro ao criar filial."); }
  };

  const iniciarEdicao = (f) => {
    setEditando(f.id);
    setFormEdit({ nome: f.nome, endereco: f.endereco || "", telefone: f.telefone || "" });
  };

  const salvarEdicao = async () => {
    setErro("");
    try {
      const res = await fetch(`/api/filiais/${editando}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formEdit),
      });
      if (!res.ok) throw new Error();
      const atualizada = await res.json();
      setFiliais((prev) => prev.map((f) => f.id === editando ? atualizada : f));
      setEditando(null);
      flash(setSucesso, "Filial atualizada!");
    } catch { setErro("Erro ao atualizar filial."); }
  };

  const toggleAtiva = async (id) => {
    const f = filiais.find((x) => x.id === id);
    try {
      const res = await fetch(`/api/filiais/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !f.ativo }),
      });
      if (!res.ok) throw new Error();
      setFiliais((prev) => prev.map((x) => x.id === id ? { ...x, ativo: !x.ativo } : x));
    } catch { setErro("Erro ao atualizar filial."); }
  };

  const excluir = (id, nome) => {
    setConfirm({
      mensagem: `Excluir a filial "${nome}"? O usuário de acesso também será removido. Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          const res  = await fetch(`/api/filiais/${id}`, { method: "DELETE" });
          const data = await res.json();
          if (!res.ok) { setErro(data.error || "Erro ao excluir filial."); return; }
          setFiliais((prev) => prev.filter((f) => f.id !== id));
          flash(setSucesso, "Filial excluída.");
        } catch { setErro("Erro ao excluir filial."); }
      },
    });
  };

  const camposNova = [
    { key: "nome",     label: "Nome da filial",  type: "text"     },
    { key: "endereco", label: "Endereço",        type: "text"     },
    { key: "telefone", label: "Telefone",        type: "text"     },
    { key: "email",    label: "Email de acesso", type: "email"    },
    { key: "senha",    label: "Senha inicial",   type: "password" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {confirm && <Confirm {...confirm} onCancel={() => setConfirm(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-zinc-100 text-xl font-semibold">Filiais</h2>
          <p className="text-zinc-500 text-sm mt-0.5">
            {filiais.length} filial{filiais.length !== 1 ? "is" : ""} cadastrada{filiais.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => setMostrarForm(!mostrarForm)} className={BTN_PRIMARY}>+ Nova Filial</button>
      </div>

      {sucesso && <Alert type="success">{sucesso}</Alert>}
      {erro    && <Alert type="error">{erro}</Alert>}

      {mostrarForm && (
        <div className={`${CARD} p-5 flex flex-col gap-4`}>
          <p className="text-zinc-100 font-semibold">Nova filial</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {camposNova.map(({ key, label, type }) => (
              <input key={key} type={type} placeholder={label}
                value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className={INPUT} />
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={salvar} className={BTN_PRIMARY}>Salvar</button>
            <button onClick={() => setMostrarForm(false)} className={BTN_SECONDARY}>Cancelar</button>
          </div>
        </div>
      )}

      {loading ? <Spinner /> : (
        <div className="flex flex-col gap-3">
          {filiais.map((f) => (
            <div key={f.id} className={`${CARD} p-4 sm:p-5`}>
              {editando === f.id ? (
                <div className="flex flex-col gap-3">
                  <p className="text-zinc-300 text-sm font-medium">Editando: <span className="text-zinc-100">{f.nome}</span></p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input placeholder="Nome"      value={formEdit.nome}     onChange={(e) => setFormEdit({ ...formEdit, nome: e.target.value })}     className={INPUT} />
                    <input placeholder="Endereço"  value={formEdit.endereco} onChange={(e) => setFormEdit({ ...formEdit, endereco: e.target.value })} className={INPUT} />
                    <input placeholder="Telefone"  value={formEdit.telefone} onChange={(e) => setFormEdit({ ...formEdit, telefone: e.target.value })} className={INPUT} />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={salvarEdicao} className={BTN_PRIMARY}>Salvar</button>
                    <button onClick={() => setEditando(null)} className={BTN_SECONDARY}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-zinc-100 font-semibold">{f.nome}</p>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${f.ativo ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                        {f.ativo ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-sm">{f.endereco || "—"}</p>
                    <p className="text-zinc-500 text-xs">{f.telefone || "—"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button onClick={() => iniciarEdicao(f)} className={BTN_SECONDARY}>Editar</button>
                    <button onClick={() => toggleAtiva(f.id)}
                      className={`text-sm rounded-lg px-4 py-2 transition cursor-pointer font-medium ${f.ativo ? "bg-red-900 hover:bg-red-800 text-red-300" : "bg-green-900 hover:bg-green-800 text-green-300"}`}>
                      {f.ativo ? "Desativar" : "Ativar"}
                    </button>
                    <button onClick={() => excluir(f.id, f.nome)} className={BTN_DANGER}>Excluir</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filiais.length === 0 && <p className="text-zinc-500 text-sm">Nenhuma filial cadastrada.</p>}
        </div>
      )}
    </div>
  );
}

// ─── ADMIN: Produtos ──────────────────────────────────────────────────────────

function Produtos() {
  const [produtos, setProdutos]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [mostrarForm, setMostrarForm]     = useState(false);
  const [form, setForm]                   = useState({ nome: "", preco: "" });
  const [editandoPreco, setEditandoPreco] = useState(null);
  const [novoPreco, setNovoPreco]         = useState("");
  const [confirm, setConfirm]             = useState(null);
  const [erro, setErro]                   = useState("");
  const [sucesso, setSucesso]             = useState("");
  const [busca, setBusca]                 = useState("");
  const [filtroDisp, setFiltroDisp]       = useState("Todos");

  const flash = (fn, msg) => { fn(msg); setTimeout(() => fn(""), 3000); };

  useEffect(() => {
    fetch("/api/produtos")
      .then((r) => r.json())
      .then((d) => { setProdutos(d); setLoading(false); })
      .catch(() => { setErro("Erro ao carregar produtos."); setLoading(false); });
  }, []);

  const adicionar = async () => {
    if (!form.nome || !form.preco) { setErro("Nome e preço são obrigatórios."); return; }
    setErro("");
    try {
      const res = await fetch("/api/produtos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: form.nome, preco: parseFloat(form.preco) }),
      });
      if (!res.ok) throw new Error();
      const novo = await res.json();
      setProdutos((prev) => [...prev, novo]);
      setForm({ nome: "", preco: "" }); setMostrarForm(false);
      flash(setSucesso, "Produto criado!");
    } catch { setErro("Erro ao criar produto."); }
  };

  const salvarPreco = async (id) => {
    setErro("");
    try {
      const res = await fetch(`/api/produtos/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preco: parseFloat(novoPreco) }),
      });
      if (!res.ok) throw new Error();
      setProdutos((prev) => prev.map((p) => p.id === id ? { ...p, preco: parseFloat(novoPreco) } : p));
      setEditandoPreco(null);
      flash(setSucesso, "Preço atualizado!");
    } catch { setErro("Erro ao atualizar preço."); }
  };

  const toggleDisponivel = async (id) => {
    const produto = produtos.find((p) => p.id === id);
    try {
      const res = await fetch(`/api/produtos/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disponivel: !produto.disponivel }),
      });
      if (!res.ok) throw new Error();
      const atualizado = await res.json();
      setProdutos((prev) => prev.map((p) => p.id === id ? atualizado : p));
    } catch { setErro("Erro ao atualizar disponibilidade."); }
  };

  const excluir = (id, nome) => {
    setConfirm({
      mensagem: `Excluir o produto "${nome}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          const res  = await fetch(`/api/produtos/${id}`, { method: "DELETE" });
          const data = await res.json();
          if (!res.ok) { setErro(data.error || "Erro ao excluir produto."); return; }
          setProdutos((prev) => prev.filter((p) => p.id !== id));
          flash(setSucesso, "Produto excluído.");
        } catch { setErro("Erro ao excluir produto."); }
      },
    });
  };

  const lista = produtos.filter((p) => {
    if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtroDisp === "Disponível"   && !p.disponivel) return false;
    if (filtroDisp === "Indisponível" &&  p.disponivel) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      {confirm && <Confirm {...confirm} onCancel={() => setConfirm(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-zinc-100 text-xl font-semibold">Produtos</h2>
          <p className="text-zinc-500 text-sm mt-0.5">{lista.length} de {produtos.length} produtos</p>
        </div>
        <button onClick={() => setMostrarForm(!mostrarForm)} className={BTN_PRIMARY}>+ Novo Produto</button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input placeholder="Buscar produto..." value={busca} onChange={(e) => setBusca(e.target.value)}
          className={INPUT_BASE + " flex-1 min-w-[180px]"} />
        <select value={filtroDisp} onChange={(e) => setFiltroDisp(e.target.value)} className={INPUT_BASE + " w-full sm:w-auto"}>
          <option>Todos</option>
          <option>Disponível</option>
          <option>Indisponível</option>
        </select>
      </div>

      {sucesso && <Alert type="success">{sucesso}</Alert>}
      {erro    && <Alert type="error">{erro}</Alert>}

      {mostrarForm && (
        <div className={`${CARD} p-5 flex flex-col gap-4`}>
          <p className="text-zinc-100 font-semibold">Novo produto</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input placeholder="Nome do produto" value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })} className={INPUT_BASE + " flex-1"} />
            <input placeholder="Preço (R$)" type="number" min="0" step="0.01" value={form.preco}
              onChange={(e) => setForm({ ...form, preco: e.target.value })} className={INPUT_BASE + " w-full sm:w-36"} />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={adicionar} className={BTN_PRIMARY}>Salvar</button>
            <button onClick={() => setMostrarForm(false)} className={BTN_SECONDARY}>Cancelar</button>
          </div>
        </div>
      )}

      {loading ? <Spinner /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lista.map((p) => (
            <div key={p.id} className={`${CARD} p-4 sm:p-5 flex flex-col gap-4`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-zinc-100 font-semibold truncate">{p.nome}</p>
                  <p className="text-orange-400 font-semibold mt-0.5">R$ {Number(p.preco).toFixed(2)}</p>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0 ${p.disponivel ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                  {p.disponivel ? "Disponível" : "Indisponível"}
                </span>
              </div>

              {editandoPreco === p.id ? (
                <div className="flex gap-2">
                  <input type="number" defaultValue={p.preco} onChange={(e) => setNovoPreco(e.target.value)}
                    className={INPUT_BASE + " flex-1"} />
                  <button onClick={() => salvarPreco(p.id)} className={BTN_PRIMARY + " shrink-0"}>OK</button>
                </div>
              ) : (
                <button onClick={() => { setEditandoPreco(p.id); setNovoPreco(p.preco); }}
                  className="text-zinc-500 hover:text-zinc-300 text-xs text-left transition cursor-pointer">
                  ✏️ Editar preço
                </button>
              )}

              <div className="flex gap-2 flex-wrap mt-auto">
                <button onClick={() => toggleDisponivel(p.id)}
                  className={`flex-1 text-xs rounded-lg px-3 py-2 transition cursor-pointer font-medium ${p.disponivel ? "bg-red-900 hover:bg-red-800 text-red-300" : "bg-green-900 hover:bg-green-800 text-green-300"}`}>
                  {p.disponivel ? "Marcar indisponível" : "Marcar disponível"}
                </button>
                <button onClick={() => excluir(p.id, p.nome)}
                  className="text-xs rounded-lg px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-400 hover:text-red-400 transition cursor-pointer">
                  Excluir
                </button>
              </div>
            </div>
          ))}
          {lista.length === 0 && <p className="text-zinc-500 text-sm col-span-full">Nenhum produto encontrado.</p>}
        </div>
      )}
    </div>
  );
}

// ─── ADMIN: Relatórios ────────────────────────────────────────────────────────

function Relatorios() {
  const [dados, setDados]       = useState(null);
  const [data, setData]         = useState(hoje());
  const [loading, setLoading]   = useState(true);
  const [filiais, setFiliais]   = useState([]);
  const [filialId, setFilialId] = useState("");

  useEffect(() => {
    fetch("/api/filiais")
      .then((r) => r.json())
      .then(setFiliais)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = `/api/relatorios?data=${data}${filialId ? `&filial_id=${filialId}` : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => { setDados(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [data, filialId]);

  const fmt = (v) => `R$ ${Number(v).toFixed(2)}`;

  const cards = [
    { label: "Pedidos no dia",     valor: dados ? String(dados.totalHoje) : "—",                cor: "text-zinc-100"   },
    { label: "Pedidos entregues",  valor: dados ? String(dados.entreguesHoje) : "—",            cor: "text-green-400"  },
    { label: "Vendas do dia",      valor: dados ? fmt(dados.faturamentoHoje) : "—",             cor: "text-orange-400" },
    { label: "Lucro do dia",       valor: dados ? fmt(dados.lucroHoje) : "—",                   cor: "text-emerald-400" },
  ];

  const cardsGeral = [
    { label: "Total de vendas (geral)", valor: dados ? fmt(dados.totalVendas) : "—", cor: "text-orange-400" },
    { label: "Lucro total (geral)",     valor: dados ? fmt(dados.totalLucro)  : "—", cor: "text-emerald-400" },
  ];

  const porFilial   = dados?.porFilial   || [];
  const topProdutos = dados?.topProdutos || [];
  const maxPedidos  = Number(topProdutos[0]?.pedidos) || 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-zinc-100 text-xl font-semibold">Relatórios</h2>
          <p className="text-zinc-500 text-sm mt-0.5">
            {filialId ? filiais.find((f) => String(f.id) === filialId)?.nome : "Todas as filiais"} · {data}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={filialId} onChange={(e) => setFilialId(e.target.value)} className={INPUT_BASE + " w-full sm:w-auto"}>
            <option value="">Todas as filiais</option>
            {filiais.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
          <input type="date" value={data} max={hoje()} onChange={(e) => setData(e.target.value)}
            className={INPUT_BASE + " w-full sm:w-auto"} />
        </div>
      </div>

      {loading ? <Spinner /> : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {cards.map((c) => (
              <div key={c.label} className={`${CARD} p-5`}>
                <p className="text-zinc-500 text-sm mb-2">{c.label}</p>
                <p className={`text-xl sm:text-2xl font-bold ${c.cor}`}>{c.valor}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cardsGeral.map((c) => (
              <div key={c.label} className={`${CARD} p-5 flex items-center justify-between gap-4`}>
                <p className="text-zinc-400 text-sm">{c.label}</p>
                <p className={`text-xl font-bold shrink-0 ${c.cor}`}>{c.valor}</p>
              </div>
            ))}
          </div>

          <div className={`${CARD} overflow-hidden`}>
            <div className="px-5 py-4 border-b border-zinc-600">
              <p className="text-zinc-100 font-semibold">Pedidos por Filial</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b border-zinc-600">
                    {["Filial", "Pedidos", "Itens", "Total"].map((col) => (
                      <th key={col} className="text-zinc-400 font-medium text-left px-5 py-3 whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {porFilial.map((r, i) => (
                    <tr key={r.nome} className={`hover:bg-zinc-700 transition ${i < porFilial.length - 1 ? "border-b border-zinc-600" : ""}`}>
                      <td className="px-5 py-3 text-zinc-100 font-medium">{r.nome}</td>
                      <td className="px-5 py-3 text-zinc-400">{r.pedidos}</td>
                      <td className="px-5 py-3 text-zinc-400">{r.itens}</td>
                      <td className="px-5 py-3 text-orange-400 font-semibold whitespace-nowrap">R$ {Number(r.total).toFixed(2)}</td>
                    </tr>
                  ))}
                  {porFilial.length === 0 && (
                    <tr><td colSpan={4} className="px-5 py-4 text-zinc-500 text-sm">Nenhum dado para esta data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`${CARD} p-5`}>
            <p className="text-zinc-100 font-semibold mb-5">Produtos mais pedidos no dia</p>
            <div className="flex flex-col gap-4">
              {topProdutos.map((p, i) => (
                <div key={p.nome}>
                  <div className="flex justify-between text-sm mb-2 gap-2">
                    <span className="text-zinc-300 font-medium truncate">{i + 1}. {p.nome}</span>
                    <span className="text-zinc-500 shrink-0">{p.pedidos} pedidos</span>
                  </div>
                  <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-600 rounded-full transition-all"
                      style={{ width: `${Math.round(Number(p.pedidos) / maxPedidos * 100)}%` }} />
                  </div>
                </div>
              ))}
              {topProdutos.length === 0 && <p className="text-zinc-500 text-sm">Nenhum dado disponível.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Perfil ───────────────────────────────────────────────────────────────────

function Perfil() {
  const [userRaw, setUserRaw]               = useState(JSON.parse(localStorage.getItem("user") || "null"));
  const [nome, setNome]                     = useState(userRaw?.nome || "");
  const [email]                             = useState(userRaw?.email || "—");
  const [senhaAtual, setSenhaAtual]         = useState("");
  const [novaSenha, setNovaSenha]           = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [sucesso, setSucesso]               = useState("");
  const [erro, setErro]                     = useState("");
  const [filialDados, setFilialDados]       = useState(null);

  const flash = (fn, msg) => { fn(msg); setTimeout(() => fn(""), 3000); };

  useEffect(() => {
    if (userRaw?.filial_id) {
      fetch(`/api/filiais/${userRaw.filial_id}`)
        .then((r) => r.json())
        .then(setFilialDados)
        .catch(() => {});
    }
  }, []);

  const salvarNome = async () => {
    if (!nome.trim()) { flash(setErro, "Nome não pode ser vazio."); return; }
    try {
      const res = await fetch(`/api/perfil/${userRaw.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      });
      if (!res.ok) throw new Error();
      const updated = { ...userRaw, nome };
      setUserRaw(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      flash(setSucesso, "Nome atualizado!"); setErro("");
    } catch { flash(setErro, "Erro ao salvar nome."); }
  };

  const salvarSenha = async () => {
    setErro(""); setSucesso("");
    if (!senhaAtual || !novaSenha || !confirmarSenha) { flash(setErro, "Preencha todos os campos."); return; }
    if (novaSenha !== confirmarSenha) { flash(setErro, "As senhas não coincidem."); return; }
    if (novaSenha.length < 6)         { flash(setErro, "Mínimo 6 caracteres."); return; }
    try {
      const res = await fetch(`/api/perfil/${userRaw.id}/senha`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual, novaSenha }),
      });
      const data = await res.json();
      if (!res.ok) { flash(setErro, data.error || "Erro ao alterar senha."); return; }
      flash(setSucesso, "Senha alterada!");
      setSenhaAtual(""); setNovaSenha(""); setConfirmarSenha("");
    } catch { flash(setErro, "Erro ao alterar senha."); }
  };

  const iniciais = nome.trim().split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex flex-col gap-4 max-w-lg w-full">
      <div>
        <h2 className="text-zinc-100 text-xl font-semibold">Perfil</h2>
        <p className="text-zinc-500 text-sm mt-0.5">Gerencie suas informações</p>
      </div>

      {sucesso && <Alert type="success">{sucesso}</Alert>}
      {erro    && <Alert type="error">{erro}</Alert>}

      <div className={`${CARD} p-5 flex flex-col gap-5`}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-orange-600 flex items-center justify-center shrink-0 shadow-lg">
            <span className="text-white font-bold text-lg sm:text-xl">{iniciais}</span>
          </div>
          <div className="min-w-0">
            <p className="text-zinc-100 font-semibold text-base truncate">{userRaw?.nome}</p>
            <p className="text-zinc-400 text-sm truncate">{email}</p>
            <span className="text-xs bg-orange-900 text-orange-400 px-2.5 py-0.5 rounded-full font-medium mt-1 inline-block">
              {userRaw?.tipo}
            </span>
          </div>
        </div>

        <div className="border-t border-zinc-600 pt-4 flex flex-col gap-3">
          <label className="text-zinc-400 text-sm font-medium">Nome</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={nome} onChange={(e) => setNome(e.target.value)} className={INPUT_BASE + " flex-1"} />
            <button onClick={salvarNome} className={BTN_PRIMARY + " sm:shrink-0"}>Salvar</button>
          </div>
          <label className="text-zinc-400 text-sm font-medium">Email</label>
          <input value={email} readOnly
            className="w-full bg-zinc-700/50 border border-zinc-600 rounded-lg px-3 py-2.5 text-zinc-500 text-sm cursor-default focus:outline-none" />
        </div>
      </div>

      {/* Dados da filial — só para usuários tipo FILIAL */}
      {userRaw?.tipo === "FILIAL" && (
        <div className={`${CARD} p-5 flex flex-col gap-4`}>
          <p className="text-zinc-100 font-semibold">Dados da Filial</p>
          {filialDados ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Nome",     valor: filialDados.nome },
                { label: "Endereço", valor: filialDados.endereco || "—" },
                { label: "Telefone", valor: filialDados.telefone || "—" },
                { label: "Status",   valor: filialDados.ativo ? "Ativa" : "Inativa", badge: filialDados.ativo },
              ].map(({ label, valor, badge }) => (
                <div key={label}>
                  <p className="text-zinc-500 text-xs mb-1">{label}</p>
                  {badge !== undefined ? (
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${badge ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                      {valor}
                    </span>
                  ) : (
                    <p className="text-zinc-200 text-sm">{valor}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm">Carregando dados...</p>
          )}
        </div>
      )}

      <div className={`${CARD} p-5 flex flex-col gap-3`}>
        <p className="text-zinc-100 font-semibold">Alterar senha</p>
        <input type="password" placeholder="Senha atual"          value={senhaAtual}     onChange={(e) => setSenhaAtual(e.target.value)}     className={INPUT} />
        <input type="password" placeholder="Nova senha"           value={novaSenha}      onChange={(e) => setNovaSenha(e.target.value)}      className={INPUT} />
        <input type="password" placeholder="Confirmar nova senha" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} className={INPUT} />
        <button onClick={salvarSenha} className={BTN_PRIMARY + " w-full sm:w-fit"}>Alterar senha</button>
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
  const [sucesso, setSucesso]         = useState(false);

  const salvar = () => {
    localStorage.setItem("tema", tema);
    setSucesso(true);
    setTimeout(() => setSucesso(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 max-w-lg w-full">
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
                className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${tema === t.id ? "bg-orange-600 text-white" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`${CARD} p-5 flex flex-col gap-4`}>
        <p className="text-zinc-100 font-semibold">Notificações</p>
        {[
          { label: "Novo pedido recebido",  desc: "Alertar quando uma filial enviar pedido",  val: notifPedido, fn: setNotifPedido },
          { label: "Atualização de status", desc: "Alertar quando o status do pedido mudar",  val: notifStatus, fn: setNotifStatus },
        ].map((n) => (
          <div key={n.label} className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-zinc-300 text-sm font-medium">{n.label}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{n.desc}</p>
            </div>
            <Toggle ativo={n.val} onChange={n.fn} />
          </div>
        ))}
      </div>

      <button onClick={salvar} className={BTN_PRIMARY + " w-full sm:w-fit"}>Salvar preferências</button>
    </div>
  );
}

// ─── Layout principal ─────────────────────────────────────────────────────────

const SECOES_FILIAL = [
  { id: "fazer-pedido", label: "Fazer Pedido"      },
  { id: "meus-pedidos", label: "Meus Pedidos"      },
  { id: "acompanhar",   label: "Acompanhar Status" },
];
const SECOES_ADMIN = [
  { id: "pedidos",    label: "Pedidos"    },
  { id: "filiais",    label: "Filiais"    },
  { id: "produtos",   label: "Produtos"   },
  { id: "relatorios", label: "Relatórios" },
];
const SECOES_COMUNS = [
  { id: "perfil",        label: "Perfil"       },
  { id: "configuracoes", label: "Configurações" },
];

function NavItem({ secao, atual, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${secao === atual ? "bg-orange-600 text-white shadow-md" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"}`}>
      {children}
    </button>
  );
}

function Dashboard() {
  const navigate              = useNavigate();
  const user                  = JSON.parse(localStorage.getItem("user") || "null");
  const isAdmin               = user?.tipo === "ADMIN";
  const secoes                = isAdmin ? SECOES_ADMIN : SECOES_FILIAL;
  const [secao, setSecao]     = useState(secoes[0].id);
  const [tema, setTemaState]  = useState(() => localStorage.getItem("tema") || "dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const setTema = (t) => {
    setTemaState(t);
    localStorage.setItem("tema", t);
    document.documentElement.classList.toggle("light-theme", t === "light");
  };

  const handleNav = (id) => { setSecao(id); setSidebarOpen(false); };

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    document.documentElement.classList.toggle("light-theme", tema === "light");

    if (user.tipo === "FILIAL") {
      fetch(`/api/filiais/${user.filial_id}`)
        .then((r) => r.json())
        .then((filial) => {
          if (!filial.ativo) {
            localStorage.removeItem("user");
            navigate("/");
          }
        })
        .catch(() => {});
    }
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

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed md:relative top-0 left-0 h-full md:h-auto w-64 md:w-60 bg-zinc-900 border-r border-zinc-700 flex flex-col shrink-0 z-50 md:z-auto transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="px-4 py-5 border-b border-zinc-700 flex items-center justify-between">
          <div><span className="text-xl">🍕</span><span className="text-orange-500 font-bold text-base ml-1.5">PizzaSystem</span></div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-zinc-400 hover:text-zinc-100 cursor-pointer"><IconX /></button>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {secoes.map((s) => (
            <NavItem key={s.id} secao={s.id} atual={secao} onClick={() => handleNav(s.id)}>{s.label}</NavItem>
          ))}
          <div className="border-t border-zinc-700 my-3" />
          {SECOES_COMUNS.map((s) => (
            <NavItem key={s.id} secao={s.id} atual={secao} onClick={() => handleNav(s.id)}>{s.label}</NavItem>
          ))}
        </nav>

        <button onClick={() => handleNav("perfil")}
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
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="flex items-center justify-between px-4 sm:px-6 py-4 bg-zinc-900 border-b border-zinc-700 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-zinc-400 hover:text-zinc-100 cursor-pointer shrink-0"><IconMenu /></button>
            <p className="text-zinc-100 font-semibold truncate">{user.nome}</p>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 hidden sm:inline ${isAdmin ? "bg-orange-900 text-orange-400" : "bg-zinc-700 text-zinc-300"}`}>
              {user.tipo}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button onClick={() => setTema(tema === "dark" ? "light" : "dark")}
              className="text-zinc-400 hover:text-zinc-100 transition cursor-pointer text-lg" title="Alternar tema">
              {tema === "dark" ? "☀️" : "🌙"}
            </button>
            <button onClick={logout} className="text-zinc-400 hover:text-red-400 text-sm font-medium transition cursor-pointer">Sair</button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-950">
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
