import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { ThemeProvider } from "@/components/layout/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Webflow CMS Manager",
  description: "Manage your Webflow CMS Collections, Fields, and Items",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider>
          <NavigationProgress />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
