import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Bespoken Beaver by Toronto DAO | X Persona Location Finder',
    description: 'Discover places tailored to your X personality profile',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
        <head>
            {/* Adding CSP meta tag directly */}
            <meta
                httpEquiv="Content-Security-Policy"
                content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.googleapis.com *.gstatic.com; style-src 'self' 'unsafe-inline' *.googleapis.com; img-src 'self' data: blob: *.googleapis.com *.gstatic.com lh3.googleusercontent.com streetviewpixels-pa.googleapis.com *.mypinata.cloud; font-src 'self' data: fonts.gstatic.com; connect-src 'self' *.googleapis.com;"
            />
        </head>
        <body className={inter.className}>
            <div className="min-h-screen flex flex-col">
                <header className="bg-blue-600 text-white py-4 shadow-md">
                    <div className="container mx-auto px-4">
                        <div className="flex items-center">
                            <div className="mr-3 flex-shrink-0">
                                <img
                                    src="https://scarlet-quick-canid-140.mypinata.cloud/ipfs/bafkreihp25xfg73nuiyh6srinse7h77helt7qdgel4afxninjwjeuyplhm"
                                    alt="Beaver Logo"
                                    width={72}
                                    height={72}
                                    className="rounded-full border-2 border-white"
                                    style={{ objectFit: 'cover' }}
                                />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">Bespoken Beaver by Toronto DAO</h1>
                                <p className="text-sm text-blue-100">Discover your perfect places based on your X persona</p>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-grow">
                    {children}
                </main>

                <footer className="bg-gray-100 py-4 border-t border-gray-200">
                    <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
                        <p>© 2025 Toronto DAO. All rights reserved.</p>
                        <p className="mt-1">We respect your privacy and do not store any of your personal data.</p>
                    </div>
                </footer>
            </div>
        </body>
        </html>
    );
}
