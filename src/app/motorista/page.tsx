import type { Metadata } from "next";
import { DriverPortal } from "@/components/driver/DriverPortal";

export const metadata: Metadata = {
  title: "Motoristas Água Premiada | Venda água, suba de nível, ganhe mais",
  description:
    "Entre pra rede de motoristas parceiros Água Premiada. Ganhe por garrafa vendida, suba de nível (Bronze, Prata, Ouro, Diamante) e desbloqueie bônus.",
};

export default function MotoristaPage() {
  return <DriverPortal />;
}
