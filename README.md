# Água Premiada 💧🎁

> Parabéns! Escaneie o QR code e veja o seu prêmio.

App da marca de água **Água Premiada**. Cada garrafa traz um QR code único; ao
escanear, o consumidor se cadastra e concorre a um prêmio em dinheiro sorteado
entre os participantes. Inclui painel administrativo completo e uma rede de
motoristas parceiros que vendem as garrafas.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS**
- **Supabase** (Postgres) — toda a lógica sensível roda em funções `SECURITY DEFINER`
  gated por senha; as tabelas têm RLS ligado sem acesso direto pela anon key.
- Deploy na **Vercel**

## Rotas

| Rota          | Descrição                                                          |
| ------------- | ------------------------------------------------------------------- |
| `/`           | Landing da marca                                                    |
| `/s/[code]`   | Scan da garrafa — valida o código, mostra estado (aberto/expirado/já cadastrado) e cadastra o participante no sorteio |
| `/motorista`  | Portal do motorista parceiro — cadastro, login e painel com nível, estoque e indicações |
| `/admin`      | Painel administrativo (abas abaixo)                                 |

## Painel admin

- **Sorteio** — participantes, sortear ganhador, configurações (prêmio, validade do código, link do grupo, "onde comprar")
- **Rótulos** — sobe a arte da folha A4, detecta os QRs de exemplo automaticamente (ou arrasta manualmente), gera os códigos e imprime
- **Motoristas** — aprova cadastros, entrega lotes/estoque de garrafas, registra vendas em dinheiro no acerto
- **Visão geral** — estatísticas gerais
- **Códigos** — geração avulsa de códigos com QR

## Mecânica do código

Cada garrafa tem um código único de uso único, com validade configurável
(padrão 1h após o primeiro scan). Depois de expirado ou já resgatado, a
página mostra um CTA para comprar uma garrafa nova.

## Rede de motoristas

Motoristas se cadastram em `/motorista`, recebem um código de acesso e um
código de indicação. Sobem de nível conforme as vendas do mês:

| Nível | Meta | Benefício |
| --- | --- | --- |
| 🥉 Bronze | Entrou na rede | R$1,00/garrafa |
| 🥈 Prata | 300 garrafas/mês | + bônus de R$200 |
| 🥇 Ouro | 600 garrafas/mês | R$1,20/garrafa + kit |
| 💎 Diamante | 1.000 garrafas/mês | R$1,50/garrafa + bônus |

Modelo de consignação: o admin entrega um estoque de garrafas ao motorista;
vendas em dinheiro são registradas manualmente no acerto (abate o estoque e
conta pra comissão/nível). Pagamento via PIX automático (banner com QR do
motorista, confirmação via gateway) é a próxima etapa planejada.

## Banco de dados (prefixo `move_`)

Principais tabelas: `move_bottles`, `move_scans`, `move_raffle_entries`,
`move_drivers`, `move_stock_deliveries`, `move_cash_sales`, `move_settings`,
`move_label_templates`, `move_label_prints`.

Todo acesso do cliente passa por funções `SECURITY DEFINER` gated pela senha
do admin (`move_check_admin`), nunca direto nas tabelas.

## Variáveis de ambiente

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

> A senha do admin **não** fica em env — é validada no banco, na tabela
> `move_settings` (chave `admin_secret`). Troque com:
> `select move_admin_set_secret('senha_atual','nova_senha')`.

## Rodando localmente

```bash
npm install
npm run dev
```
