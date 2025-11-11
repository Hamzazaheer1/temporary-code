import type { Metadata } from "next";
import { Inter, Roboto } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { PrivyProvider } from "@/providers/PrivyProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import FontAwesomeLoader from "@/components/FontAwesomeLoader";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monique Powell - Dashboard",
  description: "Monique Powell application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${roboto.variable} antialiased`}>
        <FontAwesomeLoader />
        <PrivyProvider>
          <QueryProvider>
            <AuthProvider>{children}</AuthProvider>
          </QueryProvider>
        </PrivyProvider>
      </body>
    </html>
  );
}
