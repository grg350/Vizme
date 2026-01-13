import { Link } from 'react-router-dom';
import { register } from '../services/keycloak';

function Signup() {
  const handleSignup = async () => {
    try {
      await register();
      // Keycloak will handle the redirect after registration
    } catch (error) {
      console.error('Signup failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated gradient orbs */}
      <div className="absolute top-0 -right-40 w-96 h-96 bg-emerald-600/30 rounded-full mix-blend-multiply filter blur-[128px] animate-float" />
      <div className="absolute bottom-0 -left-40 w-96 h-96 bg-cyan-600/30 rounded-full mix-blend-multiply filter blur-[128px] animate-float" style={{ animationDelay: '-3s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-600/20 rounded-full mix-blend-multiply filter blur-[128px]" />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Signup card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Glow effect behind card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 via-cyan-500 to-emerald-600 rounded-3xl blur-xl opacity-20 animate-glow" />
        
        <div className="relative bg-[#0c0c12]/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-10 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 relative">
              {/* Outer ring */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-cyan-500 to-teal-500 rounded-2xl rotate-6 opacity-80" />
              {/* Inner square */}
              <div className="relative w-full h-full bg-gradient-to-br from-emerald-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
              Create Account
            </h1>
            <p className="text-white/40 text-sm">
              Join the platform and start monitoring
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="text-white/20 text-xs uppercase tracking-widest">Get Started</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          {/* Sign up button */}
          <button
            onClick={handleSignup}
            className="group relative w-full py-4 rounded-xl font-semibold text-white overflow-hidden transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]"
          >
            {/* Button gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-cyan-600 to-emerald-600 bg-[length:200%_100%] group-hover:animate-[shimmer_1.5s_infinite]" />
            
            {/* Shine effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </div>
            
            {/* Button content */}
            <span className="relative z-10 flex items-center justify-center gap-3">
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span>Create Your Account</span>
              <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>

          {/* Features list */}
          <div className="mt-8 space-y-3">
            {[
              'Real-time metrics monitoring',
              'Custom dashboards & alerts',
              'API key management'
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-white/40 text-sm">
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-white/30 text-sm">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
              >
                Sign in
              </Link>
            </p>
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

export default Signup;
