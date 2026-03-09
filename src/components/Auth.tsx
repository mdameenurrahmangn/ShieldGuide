import React, { useState } from 'react';
import { Shield, Mail, Phone, User, ChevronRight, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthProps {
  onLogin: (userData: { name: string; email: string; phone: string }) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [step, setStep] = useState<'initial' | 'register' | 'login' | 'otp'>('initial');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    otp: ''
  });
  const [isError, setIsError] = useState(false);

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate sending OTP
    setStep('otp');
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.otp === '123456') { // Mock OTP
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name || 'Traveler',
            email: formData.email,
            phone: formData.phone
          })
        });
        const data = await response.json();
        if (data.success) {
          onLogin(data.user);
        }
      } catch (error) {
        console.error('Auth error:', error);
      }
    } else {
      setIsError(true);
      setTimeout(() => setIsError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-xl border border-slate-200"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-4 rounded-2xl bg-slate-900 text-white mb-4 shadow-lg">
            <Shield className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">ShieldGuide</h1>
          <p className="text-slate-500 mt-2 font-medium">Your global safety companion</p>
        </div>

        {step === 'initial' && (
          <div className="space-y-4">
            <button 
              onClick={() => setStep('register')}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg"
            >
              Create Account
            </button>
            <button 
              onClick={() => setStep('login')}
              className="w-full py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95"
            >
              Sign In
            </button>
          </div>
        )}

        {(step === 'register' || step === 'login') && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <button 
              type="button"
              onClick={() => setStep('initial')}
              className="flex items-center gap-2 text-slate-500 font-bold text-sm mb-4 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            
            <h2 className="text-xl font-bold text-slate-900 mb-6">
              {step === 'register' ? 'Join ShieldGuide' : 'Welcome Back'}
            </h2>

            {step === 'register' && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text"
                  required
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-900 transition-all text-slate-900 font-medium"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="email"
                required
                placeholder="Email Address"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-900 transition-all text-slate-900 font-medium"
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
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-900 transition-all text-slate-900 font-medium"
              />
            </div>

            <button 
              type="submit"
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
            >
              Send OTP
              <ChevronRight className="w-5 h-5" />
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Verify Email</h2>
              <p className="text-sm text-slate-500">We've sent a 6-digit code to <span className="text-slate-900 font-bold">{formData.email}</span></p>
              <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">(Demo Code: 123456)</p>
            </div>

            <input 
              type="text"
              required
              maxLength={6}
              placeholder="000000"
              value={formData.otp}
              onChange={e => setFormData({...formData, otp: e.target.value})}
              className={`w-full text-center text-3xl tracking-[0.5em] py-6 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-900 transition-all text-slate-900 font-bold ${isError ? 'ring-2 ring-red-500 animate-shake' : ''}`}
            />

            <button 
              type="submit"
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg"
            >
              Verify & Continue
            </button>

            <button 
              type="button"
              onClick={() => setStep('login')}
              className="w-full text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
            >
              Resend Code
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
