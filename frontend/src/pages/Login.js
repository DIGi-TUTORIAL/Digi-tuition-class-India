import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role) {
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'teacher') navigate('/teacher');
      else if (user.role === 'student') navigate('/student');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      // Navigation handled by useEffect
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image */}
      <div 
        className="hidden lg:block lg:w-1/2 bg-cover bg-center relative"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1771873437291-674dc79b4653?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwbGFwdG9wJTIwc21pbGluZ3xlbnwwfHx8fDE3NzYxMzEyMTZ8MA&ixlib=rb-4.1.0&q=85')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 to-purple-600/20"></div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-950 mb-2" data-testid="login-title">
              Welcome Back
            </h1>
            <p className="text-base text-gray-600 leading-relaxed">
              Sign in to access your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md" data-testid="login-error">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-2 border-gray-200 focus:ring-purple-600"
                data-testid="login-email-input"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-2 border-gray-200 focus:ring-purple-600"
                data-testid="login-password-input"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#5B21B6] hover:bg-[#4C1D95] text-white transition-colors duration-200"
              data-testid="login-submit-button"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;