import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Jineteada – MVP',
  description: 'Preparar sorteo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
