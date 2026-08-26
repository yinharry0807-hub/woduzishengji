import type { Metadata, Viewport } from "next";
import PwaRegister from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "个人成长系统",
    template: "%s · 个人成长系统",
  },
  description: "一个游戏化的个人成长与打卡系统",
  appleWebApp: {
    capable: true,
    title: "个人成长系统",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-dvh font-sans text-zinc-100 antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
