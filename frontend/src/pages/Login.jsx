import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/keycloak';
import { useAuthStore } from '../store/authStore';

function Login() {
  const navigate = useNavigate();
  const isAuthenticatedStore = useAuthStore((state) => state.isAuthenticated);
  const authReady = useAuthStore((state) => state.authReady);

  // Redirect to dashboard if already authenticated
  // CRITICAL: Only use Zustand store, NOT direct Keycloak check
  // Direct Keycloak check causes race condition with store updates
  useEffect(() => {
    if (authReady && isAuthenticatedStore) {
      navigate('/', { replace: true });
    }
  }, [authReady, isAuthenticatedStore, navigate]);

  const handleLogin = () => {
    login();
  };

  // Don't show login form if already authenticated
  if (authReady && isAuthenticatedStore) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="text-white/60">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated gradient orbs */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-violet-600/30 rounded-full mix-blend-multiply filter blur-[128px] animate-float" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-fuchsia-600/30 rounded-full mix-blend-multiply filter blur-[128px] animate-float" style={{ animationDelay: '-3s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full mix-blend-multiply filter blur-[128px]" />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Glow effect behind card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600 rounded-3xl blur-xl opacity-20 animate-glow" />
        
        <div className="relative bg-[#0c0c12]/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-10 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 relative">
              {/* Outer ring */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 rounded-2xl rotate-6 opacity-80" />
              {/* Inner square */}
              <div className="relative w-full h-full bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
              Unified Visibility
            </h1>
            <p className="text-white/40 text-sm">
              Monitor your infrastructure in one place
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="text-white/20 text-xs uppercase tracking-widest">Sign in</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          {/* Sign in button */}
          <button
            onClick={handleLogin}
            className="group relative w-full py-4 rounded-xl font-semibold text-white overflow-hidden transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]"
          >
            {/* Button gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 bg-[length:200%_100%] group-hover:animate-[shimmer_1.5s_infinite]" />
            
            {/* Shine effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </div>
            
            {/* Button content */}
            <span className="relative z-10 flex items-center justify-center gap-3">
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span>Continue to Sign In</span>
              <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-white/30 text-sm">
              Don't have an account?{' '}
              <Link 
                to="/signup" 
                className="text-violet-400 hover:text-violet-300 transition-colors font-medium"
              >
                Create one
              </Link>
            </p>
          </div>

          {/* Security badge */}
          <div className="mt-8 flex items-center justify-center gap-2 text-white/20">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-xs">Enterprise-grade security</span>
          </div>
        </div>
      </div>

      {/* Add shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export default Login;
