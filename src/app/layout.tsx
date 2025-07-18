import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/contexts/ThemeContext';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MedChat AI Pro - Intelligent Healthcare Assistant',
  description: 'Advanced healthcare assistant with Claude AI, Supabase, and OpenAI integration. HIPAA compliant platform for healthcare professionals and patients.',
  keywords: 'healthcare, AI, medical assistant, Claude AI, telemedicine, HIPAA compliant',
  authors: [{ name: 'MedChat AI Pro Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'MedChat AI Pro - Intelligent Healthcare Assistant',
    description: 'Advanced healthcare assistant with Claude AI integration',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MedChat AI Pro',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MedChat AI Pro - Intelligent Healthcare Assistant',
    description: 'Advanced healthcare assistant with Claude AI integration',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full dark">
      <body className={`${inter.className} h-full bg-dark-100 text-gray-100`}>
        <ThemeProvider>
          <div className="min-h-full">
            {children}
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--toast-bg)',
                color: 'var(--toast-text)',
              },
              success: {
                duration: 3000,
                style: {
                  background: '#15803d',
                  color: '#f1f5f9',
                },
              },
              error: {
                duration: 5000,
                style: {
                  background: '#991b1b',
                  color: '#f1f5f9',
                },
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}