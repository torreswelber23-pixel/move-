import type { Metadata, Viewport } from "next";
import { Inter, Anton } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MOVE+ | Hidrate-se. Viva mais.",
  description:
    "Esta não é apenas uma garrafa de água. Cada garrafa, um código único. Uma nova experiência. Beba. Escaneie. Descubra.",
  openGraph: {
    title: "MOVE+ | Hidrate-se. Viva mais.",
    description: "Beba. Escaneie. Descubra. Cada garrafa, uma nova experiência.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${anton.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
