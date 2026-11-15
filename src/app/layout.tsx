import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Life Tracker · Habits, Journal, Goals, and Expenses", description: "Track your habits, write about your day, reach your goals, and manage your spending." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
