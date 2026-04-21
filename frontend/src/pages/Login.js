import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role) {
      if (user.force_password_change) { navigate('/change-password'); return; }
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'teacher') navigate('/teacher');
      else if (user.role === 'student') navigate('/student');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!email || !password) { setError('Email and password are required'); return; }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) setError(result.error);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${BACKEND_URL}/api/auth/forgot-password`, { email: forgotEmail });
      toast.success('If the email exists, a reset link has been sent');
      setShowForgot(false);
    } catch (err) { toast.error('Failed to send reset email'); }
  };

  if (showForgot) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8 bg-white">
          <div className="w-full max-w-md">
            <div className="flex flex-col items-center mb-8">
              <img src="/logo.png" alt="Logo" className="w-20 h-20 rounded-full object-cover mb-4" />
              <h1 className="text-3xl font-bold tracking-tight text-gray-950" style={{ fontFamily: 'Outfit' }}>Forgot Password</h1>
              <p className="text-gray-600 mt-2">Enter your email to receive a reset link</p>
            </div>
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div><Label>Email Address</Label><Input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required data-testid="forgot-email-input" /></div>
              <Button type="submit" className="w-full bg-[#5B21B6] hover:bg-[#4C1D95] text-white" data-testid="forgot-submit">Send Reset Link</Button>
              <button type="button" onClick={() => setShowForgot(false)} className="w-full text-sm text-[#5B21B6] hover:underline">Back to Login</button>
            </form>
          </div>
        </div>
        <footer className="border-t border-gray-200 bg-white py-4 px-8 text-center"><p className="text-xs text-gray-500">DIGI TUTORIAL CLASSES</p></footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex">
        <div className="hidden lg:block lg:w-1/2 bg-cover bg-center relative" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1771873437291-674dc79b4653?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwbGFwdG9wJTIwc21pbGluZ3xlbnwwfHx8fDE3NzYxMzEyMTZ8MA&ixlib=rb-4.1.0&q=85')` }}>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 to-purple-600/20"></div>
          <div className="absolute bottom-8 left-8 right-8"><div className="bg-white/10 backdrop-blur-xl rounded-lg p-6"><p className="text-white text-lg font-medium" style={{ fontFamily: 'Outfit' }}>Welcome to DIGI TUTORIAL CLASSES</p><p className="text-white/80 text-sm mt-1">Your one-stop platform for online learning excellence</p></div></div>
        </div>
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
          <div className="w-full max-w-md">
            <div className="flex flex-col items-center mb-8">
              <img src="/logo.png" alt="Logo" className="w-20 h-20 rounded-full object-cover mb-4" data-testid="login-logo" />
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-950" style={{ fontFamily: 'Outfit' }} data-testid="login-title">DIGI TUTORIAL CLASSES</h1>
              <p className="text-base text-gray-600 mt-2">Sign in to access your dashboard</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
              {error && <div className="p-4 bg-red-50 border border-red-200 rounded-md" data-testid="login-error"><p className="text-sm text-red-600">{error}</p></div>}
              <div><Label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-2" data-testid="login-email-input" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Password</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-2" data-testid="login-password-input" /></div>
              <Button type="submit" disabled={loading} className="w-full bg-[#5B21B6] hover:bg-[#4C1D95] text-white" data-testid="login-submit-button">{loading ? 'Signing in...' : 'Sign In'}</Button>
              <button type="button" onClick={() => setShowForgot(true)} className="w-full text-sm text-[#5B21B6] hover:underline" data-testid="forgot-password-link">Forgot Password?</button>
            </form>
          </div>
        </div>
      </div>
      <footer className="border-t border-gray-200 bg-white py-4 px-8 text-center"><p className="text-xs text-gray-500">DIGI TUTORIAL CLASSES - Online Learning Platform</p></footer>
    </div>
  );
};

export default Login;
