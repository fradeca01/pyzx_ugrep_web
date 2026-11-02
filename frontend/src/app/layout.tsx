import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Header from "@/app/ui/Header";
import "./globals.css";

import React from "react";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Universal Graph Representation Visualizer",
  description: "Transform stabilizer codes into graph representations and visualize them in 3D.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {


  return (
    <html lang="en" className="overflow-hidden">
      <body
        className={`${plexSans.variable} ${plexMono.variable} flex h-dvh flex-col overflow-hidden bg-canvas font-sans antialiased`}
      >
        <Header />
        {children}
      </body>
    </html>
  );
}
