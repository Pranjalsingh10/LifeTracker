import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "daybloom · Habit tracker", description: "Build a rhythm, one day at a time." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
