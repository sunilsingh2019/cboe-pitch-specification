'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [animatedCount, setAnimatedCount] = useState(0);
  const [showDashboardLink, setShowDashboardLink] = useState(false);
  const [forceLoaded, setForceLoaded] = useState(true);
  
  useEffect(() => {
    // Instead of redirecting, just show a dashboard link if logged in
    if (isAuthenticated) {
      setShowDashboardLink(true);
    }
  }, [isAuthenticated]);
  
  // Animated counter effect
  useEffect(() => {
    if (animatedCount < 5000) {
      const timer = setTimeout(() => {
        setAnimatedCount(prev => Math.min(prev + 250, 5000));
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [animatedCount]);
  
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <header className="relative bg-[var(--primary-color)] text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary-color)] to-[#142356] z-0"></div>
        <div className="container mx-auto px-6 py-6 relative z-10">
          <nav className="flex justify-between items-center">
            <div className="flex items-center">
              <Image
                src="https://cdn.cboe.com/assets/images/logos/cboe_logo_inv_50th.svg"
                alt="CBOE Logo"
                width={120}
                height={40}
                className="h-10 w-auto"
              />
              <span className="ml-3 text-xl font-semibold">PITCH Data Processor</span>
            </div>
            <div className="space-x-4">
              {showDashboardLink ? (
                <Link 
                  href="/dashboard" 
                  className="px-4 py-2 rounded-md bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] transition-colors"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link 
                    href="/login" 
                    className="px-4 py-2 rounded-md text-white hover:bg-white/10 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/register" 
                    className="px-4 py-2 rounded-md bg-[var(--secondary-color)] hover:bg-[#0095c9] transition-colors"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </nav>
          
          <div className="flex flex-col md:flex-row items-center pt-16 pb-24">
            <div className="w-full md:w-1/2 mb-10 md:mb-0">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Analyze CBOE PITCH Market Data with Precision
              </h1>
              <p className="text-lg mb-8 text-gray-300 max-w-lg">
                Upload, process, and visualize CBOE PITCH data files. Get detailed insights on market activities, order flows, and execution statistics.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                {showDashboardLink ? (
                  <Link 
                    href="/dashboard" 
                    className="px-6 py-3 rounded-md bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] transition-colors text-center font-medium"
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link 
                      href="/register" 
                      className="px-6 py-3 rounded-md bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] transition-colors text-center font-medium"
                    >
                      Get Started Free
                    </Link>
                    <Link 
                      href="/login" 
                      className="px-6 py-3 rounded-md border border-white hover:bg-white hover:text-[var(--primary-color)] transition-colors text-center font-medium"
                    >
                      Sign In
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="w-full md:w-1/2 flex justify-center">
              <div className="relative w-full max-w-lg h-80 bg-[#1a1f3d] rounded-xl overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary-color)]/50 to-[#142356]/50"></div>
                <div className="absolute inset-0 p-8 flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <div className="text-xl font-semibold">PITCH Data Analyzer</div>
                    <div className="flex space-x-1">
                      <div className="h-3 w-3 rounded-full bg-red-500"></div>
                      <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="h-full overflow-y-auto text-xs font-mono bg-black/50 p-3 rounded">
                      <div className="text-green-500">{'>'}  Processing market data...</div>
                      <div className="text-gray-400">{'>'}  Found {animatedCount.toLocaleString()} messages</div>
                      <div className="text-[var(--secondary-color)]">{'>'}  Analyzing order types...</div>
                      <div className="text-gray-400">{'>'}  Add Order: 42.3%</div>
                      <div className="text-gray-400">{'>'}  Execute Order: 31.8%</div>
                      <div className="text-gray-400">{'>'}  Cancel Order: 22.1%</div>
                      <div className="text-gray-400">{'>'}  Other types: 3.8%</div>
                      <div className="text-[var(--accent-color)]">{'>'}  Analysis complete!</div>
                      <div className="text-white">{'>'}  Generating visualization...</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent"></div>
      </header>
      
      {/* Features Section */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[var(--primary-color)] mb-4">Powerful PITCH Data Analysis</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our platform simplifies the process of analyzing complex CBOE PITCH market data, helping you extract valuable insights in minutes.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Detailed Statistics",
                desc: "Get comprehensive statistics on message types, order flows, and market activities.",
                icon: (
                  <svg className="w-10 h-10 text-[var(--secondary-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                )
              },
              {
                title: "Visual Data Exploration",
                desc: "Visualize market trends and patterns through intuitive charts and graphs.",
                icon: (
                  <svg className="w-10 h-10 text-[var(--secondary-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                )
              },
              {
                title: "Secure Storage",
                desc: "Your uploaded files and analysis results are stored securely for future reference.",
                icon: (
                  <svg className="w-10 h-10 text-[var(--secondary-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )
              },
              {
                title: "Symbol Analysis",
                desc: "Track specific symbols and analyze their performance across multiple data files.",
                icon: (
                  <svg className="w-10 h-10 text-[var(--secondary-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                )
              },
              {
                title: "Flexible Filtering",
                desc: "Filter data by message types, symbols, time ranges, and more for targeted analysis.",
                icon: (
                  <svg className="w-10 h-10 text-[var(--secondary-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                )
              },
              {
                title: "Easy Export",
                desc: "Export analysis results and visualizations for presentations and reports.",
                icon: (
                  <svg className="w-10 h-10 text-[var(--secondary-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )
              }
            ].map((feature, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
                <div className="mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-[var(--primary-color)]">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      <section className="bg-[var(--bg-light)] py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[var(--primary-color)] mb-4">What Our Users Say</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Hear from trading professionals who use our platform for their daily market data analysis.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote: "The PITCH Data Processor has streamlined our analysis workflow, saving us hours each day.",
                author: "Sarah J.",
                role: "Quantitative Analyst"
              },
              {
                quote: "The visualization tools make it easy to spot market trends that would otherwise be hidden in the raw data.",
                author: "Michael T.",
                role: "Market Researcher"
              },
              {
                quote: "I can quickly analyze order flow patterns and make informed trading decisions based on the insights.",
                author: "David L.",
                role: "Prop Trader"
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center mb-4">
                  <div className="h-1.5 w-6 bg-[var(--accent-color)] rounded-full mr-2"></div>
                  <div className="h-1.5 w-3 bg-[var(--secondary-color)] rounded-full"></div>
                </div>
                <p className="text-gray-700 mb-6 italic">"{testimonial.quote}"</p>
                <div>
                  <div className="font-semibold text-[var(--primary-color)]">{testimonial.author}</div>
                  <div className="text-sm text-gray-500">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="bg-[var(--primary-color)] text-white py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Analyze Your PITCH Data?</h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Create a free account and start processing your CBOE PITCH files today.
            No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {showDashboardLink ? (
              <Link 
                href="/dashboard" 
                className="px-8 py-3 rounded-md bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] transition-colors font-medium"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  href="/register" 
                  className="px-8 py-3 rounded-md bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] transition-colors font-medium"
                >
                  Create Free Account
                </Link>
                <Link 
                  href="/login" 
                  className="px-8 py-3 rounded-md bg-[var(--secondary-color)] hover:bg-[#0095c9] transition-colors font-medium"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-white py-12 border-t border-gray-200">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0 flex items-center">
              <Image
                src="https://cdn.cboe.com/assets/images/logos/cboe_logo_inv_50th.svg"
                alt="CBOE Logo"
                width={100}
                height={35}
                className="h-8 w-auto"
              />
              <span className="ml-3 text-gray-700">PITCH Data Processor</span>
            </div>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-6 md:mb-0">
              <Link href="/login" className="text-gray-600 hover:text-[var(--primary-color)]">Login</Link>
              <Link href="/register" className="text-gray-600 hover:text-[var(--primary-color)]">Register</Link>
              <a href="#" className="text-gray-600 hover:text-[var(--primary-color)]">Documentation</a>
              <a href="#" className="text-gray-600 hover:text-[var(--primary-color)]">Support</a>
              <a href="#" className="text-gray-600 hover:text-[var(--primary-color)]">Privacy</a>
              <a href="#" className="text-gray-600 hover:text-[var(--primary-color)]">Terms</a>
            </div>
          </div>
          <div className="pt-8 mt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
            <p>© {new Date().getFullYear()} CBOE PITCH Data Processor. All rights reserved.</p>
            <p className="mt-2">CBOE® and associated marks are trademarks of Cboe Exchange, Inc.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 