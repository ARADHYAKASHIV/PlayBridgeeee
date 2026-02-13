import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Assuming Inter is available or I'll use standard sans
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "PlaylistBridge",
    description: "Transfer YouTube Music playlists to Spotify",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>{children}</body>
        </html>
    );
}
