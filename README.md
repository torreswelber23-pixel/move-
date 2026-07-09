# MOVE+ 💧

> Esta não é apenas uma garrafa de água. Cada garrafa, um código único. Uma nova experiência.
> **Beba. Escaneie. Descubra.**

App gamificado da marca de água **MOVE+**. Cada garrafa traz um QR code único; ao
escanear, o consumidor desbloqueia uma experiência (cupom, desafio, conteúdo
secreto, recompensa da comunidade…). Inclui painel de administração para gerar os
códigos (com QR), gerenciar experiências e acompanhar os scans.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS**
- **Supabase** (Postgres) — toda a lógica sensível roda em funções `SECURITY DEFINER`
  gated por senha; as tabelas têm RLS ligado sem acesso direto pela anon key.
- Deploy na **Vercel**

## Rotas

| Rota          | Descrição                                                        |
| ------------- | ---------------------------------------------------------------- |
| `/`           | Landing da marca (Beba. Escaneie. Descubra.)                     |
| `/s/[code]`   | Experiência do scan — valida o código e revela a recompensa      |
| `/admin`      | Painel: estatísticas, geração de códigos (QR) e CRUD de experiências |

## Banco de dados (prefixo `move_`)

Tabelas: `move_experiences`, `move_bottles`, `move_scans`, `move_settings`.
Funções principais:

- `move_scan_bottle(code, ip, ua)` — atribui uma experiência (sorteio ponderado)
  no primeiro scan, registra o evento e retorna a recompensa.
- `move_admin_*` — geração de códigos, CRUD de experiências, stats. Todas exigem a
  senha do admin (armazenada em `move_settings.admin_secret`).

## Variáveis de ambiente

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

> A senha do admin **não** fica em env — é validada no banco. Senha inicial:
> `movemais2026` (troque com `select move_admin_set_secret('movemais2026','NOVA_SENHA')`).

## Rodando localmente

```bash
npm install
npm run dev
```

## Admin

1. Acesse `/admin`
2. Entre com a senha
3. **Códigos** → gere N códigos, imprima a folha de QR e cole nos rótulos
4. **Experiências** → crie recompensas com raridade e peso (chance de sorteio)
5. **Visão geral** → acompanhe os scans em tempo real
