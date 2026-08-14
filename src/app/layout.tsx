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
  title: "Água Premiada | Parabéns, escaneie e veja seu prêmio",
  description:
    "Cada garrafa Água Premiada tem um código único. Escaneie o QR code do rótulo e descubra o seu prêmio.",
  openGraph: {
    title: "Água Premiada | Parabéns, escaneie e veja seu prêmio",
    description: "Cada garrafa, um código único. Escaneie o QR code e descubra o seu prêmio.",
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
