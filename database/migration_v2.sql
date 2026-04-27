-- Migration v2: custo/margem em produtos, status_pagamento em pedidos, preco_unitario em itens_pedido

ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS custo  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS margem NUMERIC(5,2) NOT NULL DEFAULT 0;

UPDATE produtos SET custo = preco WHERE custo IS NULL AND preco IS NOT NULL;

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS status_pagamento VARCHAR(20) NOT NULL DEFAULT 'Pendente';

ALTER TABLE pedidos
  DROP CONSTRAINT IF EXISTS chk_status_pagamento;

ALTER TABLE pedidos
  ADD CONSTRAINT chk_status_pagamento
  CHECK (status_pagamento IN ('Pendente', 'Pago'));

ALTER TABLE itens_pedido
  ADD COLUMN IF NOT EXISTS preco_unitario NUMERIC(10,2);

UPDATE itens_pedido ip
SET preco_unitario = p.preco
FROM produtos p
WHERE ip.produto_id = p.id
  AND ip.preco_unitario IS NULL;
