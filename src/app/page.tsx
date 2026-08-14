import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { CodeEntry } from "@/components/CodeEntry";

const BENEFITS = [
  { emoji: "💰", title: "Concorra a R$100", desc: "Cada garrafa escaneada te coloca na disputa do prêmio em dinheiro." },
  { emoji: "📲", title: "Cadastro em segundos", desc: "Nome + WhatsApp e pronto: você já está concorrendo." },
  { emoji: "🎉", title: "Sorteio ao vivo", desc: "O ganhador é sorteado no grupo, na frente de todo mundo." },
  { emoji: "💛", title: "Comunidade Água Premiada", desc: "Entre no grupo e não perca os próximos sorteios e drops." },
  { emoji: "💧", title: "Quanto mais garrafas", desc: "Mais códigos, mais chances de ser o sortudo do PIX." },
];

const ATTRS = [
  { label: "Água mineral natural" },
  { label: "Fonte protegida" },
  { label: "Energia pro seu dia" },
  { label: "Feita para você" },
];

export default function Home() {
  return (
    <main className="relative min-h-screen bg-move-dark bg-grain overflow-hidden">
      {/* top bar */}
      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <BrandLogo size="text-2xl" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-move-yellow/80">
          Hidrate-se · Viva mais
        </span>
      </header>

      {/* hero */}
      <section className="relative z-10 px-5 pt-8 pb-16 sm:px-8 sm:pt-14">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-5 inline-block rounded-full border border-move-yellow/40 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-move-yellow">
            🎁 Parabéns! Escaneie o QR code e veja o seu prêmio
          </p>
          <h1 className="font-display text-5xl leading-[0.9] sm:text-7xl">
            <span className="text-white">Água</span>{" "}
            <span className="shine">Premiada</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-neutral-300 sm:text-xl">
            Cada garrafa tem um código único que te coloca na disputa de{" "}
            <span className="font-bold text-move-yellow">R$100 no PIX.</span>{" "}
            Escaneou, cadastrou, tá concorrendo.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <span className="rounded-full bg-move-yellow px-5 py-2 text-sm font-black uppercase tracking-wider text-black">
              Beba
            </span>
            <span className="text-move-yellow">→</span>
            <span className="rounded-full bg-move-yellow px-5 py-2 text-sm font-black uppercase tracking-wider text-black">
              Escaneie
            </span>
            <span className="text-move-yellow">→</span>
            <span className="rounded-full bg-move-yellow px-5 py-2 text-sm font-black uppercase tracking-wider text-black">
              Descubra
            </span>
          </div>
        </div>

        {/* code entry */}
        <div className="mx-auto mt-12 max-w-md">
          <CodeEntry />
          <p className="mt-3 text-center text-xs text-neutral-500">
            Aponte a câmera do celular pro QR do rótulo — ou digite o código acima.
          </p>
        </div>

        {/* attributes strip */}
        <div className="mx-auto mt-12 flex max-w-2xl flex-wrap justify-center gap-x-6 gap-y-2">
          {ATTRS.map((a) => (
            <span
              key={a.label}
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-400"
            >
              <span className="text-move-yellow">◆</span>
              {a.label}
            </span>
          ))}
        </div>
      </section>

      {/* what happens */}
      <section className="relative z-10 border-t border-white/10 bg-black/40 px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display text-3xl uppercase text-white sm:text-4xl">
            O que acontece depois que{" "}
            <span className="text-move-yellow">você escaneia?</span>
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="rounded-2xl border border-white/10 bg-move-panel p-5 transition hover:border-move-yellow/50"
              >
                <div className="text-3xl">{b.emoji}</div>
                <h3 className="mt-3 text-lg font-bold text-white">{b.title}</h3>
                <p className="mt-1 text-sm text-neutral-400">{b.desc}</p>
              </div>
            ))}
            <div className="flex flex-col justify-center rounded-2xl border border-move-yellow/40 bg-move-yellow/10 p-5">
              <p className="font-display text-xl uppercase leading-tight text-move-yellow">
                Cada garrafa, um código único.
              </p>
              <p className="mt-1 text-sm text-neutral-300">Uma chance de ganhar R$100.</p>
            </div>
          </div>
        </div>
      </section>

      {/* driver CTA */}
      <section className="relative z-10 border-t border-white/10 px-5 py-12 sm:px-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 rounded-2xl border border-move-yellow/40 bg-move-yellow/5 p-6 sm:flex-row">
          <div>
            <p className="font-display text-2xl uppercase text-white">
              🚗 É motorista? <span className="text-move-yellow">Ganhe vendendo Água Premiada</span>
            </p>
            <p className="mt-1 text-sm text-neutral-300">
              R$1 por garrafa, níveis, bônus e ranking. Suba de Bronze a Diamante.
            </p>
          </div>
          <Link
            href="/motorista"
            className="shrink-0 rounded-xl bg-move-yellow px-6 py-3 text-sm font-black uppercase tracking-wider text-black"
          >
            Ser parceiro
          </Link>
        </div>
      </section>

      {/* before you throw away */}
      <section className="relative z-10 px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-move-yellow">
            ⚠ Antes de jogar esta garrafa fora
          </p>
          <h2 className="mt-4 font-display text-4xl uppercase leading-none text-white sm:text-5xl">
            Existe algo escondido neste rótulo.
          </h2>
          <p className="mt-4 text-lg text-neutral-300">
            Vire a garrafa. Escaneie. <span className="text-move-yellow">Descubra.</span>
          </p>
        </div>
      </section>

      {/* footer */}
      <footer className="relative z-10 border-t border-white/10 px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 sm:flex-row">
          <BrandLogo size="text-xl" />
          <p className="text-xs text-neutral-500">
            © {new Date().getFullYear()} Água Premiada · Hidrate-se. Viva mais.
          </p>
          <Link
            href="/admin"
            className="text-xs font-semibold uppercase tracking-wider text-neutral-600 transition hover:text-move-yellow"
          >
            Admin
          </Link>
        </div>
      </footer>
    </main>
  );
}
