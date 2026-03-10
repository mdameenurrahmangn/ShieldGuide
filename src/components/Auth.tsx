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
        setIsError(data.error || "Registration failed");
      }
    } catch (error) {
      setIsError("Connection error. Please try again.");
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
        setIsError(data.error || "Invalid email or password");
      }
    } catch (error) {
      setIsError("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-xl border border-slate-200 dark:border-slate-800"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-4 rounded-2xl bg-slate-900 dark:bg-primary-600 text-white mb-4 shadow-lg">
            <Shield className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">ShieldGuide</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Your global safety companion</p>
        </div>

        {step === 'initial' && (
          <div className="space-y-4">
            <button 
              onClick={() => setStep('register')}
              className="w-full py-4 bg-slate-900 dark:bg-primary-600 text-white rounded-2xl font-bold hover:bg-slate-800 dark:hover:bg-primary-700 transition-all active:scale-95 shadow-lg"
            >
              Create Account
            </button>
            <button 
              onClick={() => setStep('login')}
              className="w-full py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-750 transition-all active:scale-95"
            >
              Sign In
            </button>
          </div>
        )}

        {step !== 'initial' && (
          <form onSubmit={step === 'register' ? handleRegister : handleLogin} className="space-y-4">
            <button 
              type="button"
              onClick={() => setStep('initial')}
              className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold text-sm mb-4 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
              {step === 'register' ? 'Join ShieldGuide' : 'Welcome Back'}
            </h2>

            {isError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold text-center animate-shake">
                {isError}
              </div>
            )}

            {step === 'register' && (
              <>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text"
                    required
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary-600 transition-all text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="tel"
                    required
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary-600 transition-all text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="email"
                required
                placeholder="Email Address"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary-600 transition-all text-slate-900 dark:text-white font-medium"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="password"
                required
                placeholder="Password"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary-600 transition-all text-slate-900 dark:text-white font-medium"
              />
            </div>

            {step === 'register' && (
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="password"
                  required
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary-600 transition-all text-slate-900 dark:text-white font-medium"
                />
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-slate-900 dark:bg-primary-600 text-white rounded-2xl font-bold hover:bg-slate-800 dark:hover:bg-primary-700 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : step === 'register' ? 'Create Account' : 'Sign In'}
              {!isLoading && <ChevronRight className="w-5 h-5" />}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
