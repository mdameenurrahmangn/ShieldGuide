import React, { useState } from 'react';
import { Shield, Mail, Phone, User, ChevronRight, ArrowLeft, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuthProps {
  onLogin: (userData: { name: string; email: string; phone: string }) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [step, setStep] = useState<'initial' | 'register' | 'login'>('initial');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [isError, setIsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setIsError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setIsError(null);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password
        })
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('shieldguide_token', data.token);
        onLogin(data.user);
      } else {
        console.error("❌ Registration API error:", data.error);
        setIsError(data.error || "Registration failed");
      }
    } catch (error: any) {
      console.error("❌ Registration connection error:", error);
      setIsError(`Connection error: ${error.message || "Please check your internet or server status."}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      if (response.status === 404) {
        setIsError("Server error: Login endpoint not found. Please restart the server.");
        return;
      }

      const data = await response.json();
      if (data.success) {
        localStorage.setItem('shieldguide_token', data.token);
        onLogin(data.user);
      } else {
        console.error("❌ Login API error:", data.error);
        setIsError(data.error || "Invalid email or password");
      }
    } catch (error: any) {
      console.error("❌ Login connection error:", error);
      setIsError(`Connection error: ${error.message || "Please check your internet or server status."}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen mesh-gradient flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md frosted-glass rounded-[40px] p-10 relative overflow-hidden group"
      >
        <div className="flex flex-col items-center text-center mb-10 relative z-10">
          <div className="p-5 rounded-3xl bg-charcoal text-white mb-6 shadow-2xl group-hover:scale-110 transition-transform duration-500">
            <Shield className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-black text-charcoal tracking-tight">ShieldGuide</h1>
          <p className="text-charcoal/40 mt-3 font-bold uppercase tracking-[0.2em] text-xs">Your Precision Safety Shield</p>
        </div>

        {step === 'initial' && (
          <div className="space-y-4 relative z-10">
            <button
              onClick={() => setStep('register')}
              className="w-full py-5 bg-charcoal text-white rounded-[20px] font-black text-sm uppercase tracking-[0.2em] hover:bg-charcoal/90 transition-all active:scale-95 shadow-xl"
            >
              Register
            </button>
            <button
              onClick={() => setStep('login')}
              className="w-full py-5 bg-white/40 text-charcoal border border-white/60 rounded-[20px] font-black text-sm uppercase tracking-[0.2em] hover:bg-white/60 transition-all active:scale-95 backdrop-blur-md"
            >
              Sign In
            </button>
          </div>
        )}

        {step !== 'initial' && (
          <form onSubmit={step === 'register' ? handleRegister : handleLogin} className="space-y-4 relative z-10">
            <button
              type="button"
              onClick={() => setStep('initial')}
              className="flex items-center gap-2 text-charcoal/40 font-black text-[10px] uppercase tracking-widest mb-6 hover:text-charcoal transition-colors group/back"
            >
              <ArrowLeft className="w-3 h-3 group-hover/back:-translate-x-1 transition-transform" />
              Return
            </button>

            <h2 className="text-2xl font-black text-charcoal mb-8 tracking-tight">
              {step === 'register' ? 'Join the Network' : 'Identify Yourself'}
            </h2>

            {isError && (
              <div className="p-5 bg-red-100/50 border border-red-200/50 rounded-2xl text-red-600 text-xs font-black uppercase tracking-wider text-center animate-shake">
                {isError}
              </div>
            )}

            {step === 'register' && (
              <>
                <div className="relative group/input">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/20 group-focus-within/input:text-deep-periwinkle transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder="Full Identity"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-14 pr-6 py-5 bg-white/30 border border-white/40 rounded-2xl focus:ring-2 focus:ring-deep-periwinkle transition-all text-charcoal font-bold placeholder:text-charcoal/20"
                  />
                </div>
                <div className="relative group/input">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/20 group-focus-within/input:text-deep-periwinkle transition-colors" />
                  <input
                    type="tel"
                    required
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-14 pr-6 py-5 bg-white/30 border border-white/40 rounded-2xl focus:ring-2 focus:ring-deep-periwinkle transition-all text-charcoal font-bold placeholder:text-charcoal/20"
                  />
                </div>
              </>
            )}

            <div className="relative group/input">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/20 group-focus-within/input:text-deep-periwinkle transition-colors" />
              <input
                type="email"
                required
                placeholder="Email Address"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-14 pr-6 py-5 bg-white/30 border border-white/40 rounded-2xl focus:ring-2 focus:ring-deep-periwinkle transition-all text-charcoal font-bold placeholder:text-charcoal/20"
              />
            </div>

            <div className="relative group/input">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/20 group-focus-within/input:text-deep-periwinkle transition-colors" />
              <input
                type="password"
                required
                placeholder="Access Code"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-14 pr-6 py-5 bg-white/30 border border-white/40 rounded-2xl focus:ring-2 focus:ring-deep-periwinkle transition-all text-charcoal font-bold placeholder:text-charcoal/20"
              />
            </div>

            {step === 'register' && (
              <div className="relative group/input">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/20 group-focus-within/input:text-deep-periwinkle transition-colors" />
                <input
                  type="password"
                  required
                  placeholder="Repeat Code"
                  value={formData.confirmPassword}
                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-14 pr-6 py-5 bg-white/30 border border-white/40 rounded-2xl focus:ring-2 focus:ring-deep-periwinkle transition-all text-charcoal font-bold placeholder:text-charcoal/20"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-5 bg-deep-periwinkle text-white rounded-[20px] font-black text-sm uppercase tracking-[0.2em] hover:bg-deep-periwinkle/90 transition-all active:scale-95 shadow-xl shadow-deep-periwinkle/20 flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
            >
              {isLoading ? 'Processing Access...' : step === 'register' ? 'Authorize Deployment' : 'Grant Access'}
              {!isLoading && <ChevronRight className="w-5 h-5" />}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
