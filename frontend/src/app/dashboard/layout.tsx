'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);
  
  const handleLogout = async () => {
    await logout();
  };
  
  const isActive = (path: string) => {
    return pathname === path;
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-[var(--primary-color)] text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Image
              src="https://cdn.cboe.com/assets/images/logos/cboe_logo_inv_50th.svg"
              alt="CBOE Logo"
              width={120}
              height={40}
              className="h-8 w-auto mr-3"
            />
            <h1 className="text-xl font-bold">PITCH Data Processor</h1>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <span className="text-sm">
                Welcome, {user.first_name}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="bg-white text-[var(--primary-color)] hover:bg-gray-100 px-3 py-1 rounded transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      
      <div className="flex container mx-auto px-4 py-8">
        {/* Sidebar */}
        <aside className="w-64 bg-white p-4 rounded-lg shadow-md mr-6">
          <nav>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/dashboard" 
                  className={`block px-4 py-2 rounded transition-colors ${
                    isActive('/dashboard')
                      ? 'bg-[var(--accent-color)] text-white'
                      : 'hover:bg-[rgba(84,207,99,0.1)] hover:text-[var(--accent-color)]'
                  } font-medium`}
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link 
                  href="/dashboard/upload" 
                  className={`block px-4 py-2 rounded transition-colors ${
                    isActive('/dashboard/upload')
                      ? 'bg-[var(--accent-color)] text-white'
                      : 'hover:bg-[rgba(84,207,99,0.1)] hover:text-[var(--accent-color)]'
                  } font-medium`}
                >
                  Upload PITCH File
                </Link>
              </li>
              <li>
                <Link 
                  href="/dashboard/history" 
                  className={`block px-4 py-2 rounded transition-colors ${
                    isActive('/dashboard/history')
                      ? 'bg-[var(--accent-color)] text-white'
                      : 'hover:bg-[rgba(84,207,99,0.1)] hover:text-[var(--accent-color)]'
                  } font-medium`}
                >
                  File History
                </Link>
              </li>
              <li>
                <Link 
                  href="/dashboard/profile" 
                  className={`block px-4 py-2 rounded transition-colors ${
                    isActive('/dashboard/profile')
                      ? 'bg-[var(--accent-color)] text-white'
                      : 'hover:bg-[rgba(84,207,99,0.1)] hover:text-[var(--accent-color)]'
                  } font-medium`}
                >
                  My Profile
                </Link>
              </li>
            </ul>
          </nav>
        </aside>
        
        {/* Main content */}
        <main className="flex-1 bg-white p-6 rounded-lg shadow-md">
          {children}
        </main>
      </div>
      
      <footer className="bg-[var(--bg-light)] p-4 mt-auto">
        <div className="container mx-auto text-center text-gray-600">
          <p>© {new Date().getFullYear()} CBOE PITCH Data Processor</p>
        </div>
      </footer>
    </div>
  );
} 