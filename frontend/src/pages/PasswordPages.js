import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const ChangePassword = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const isForced = user?.force_password_change;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    if (newPw.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/auth/change-password`, { current_password: isForced ? undefined : currentPw, new_password: newPw }, { withCredentials: true });
      toast.success('Password changed successfully');
      if (isForced) { window.location.href = '/'; }
      else navigate(-1);
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 rounded-full object-cover mb-4" />
          <h1 className="text-2xl font-bold text-gray-950" style={{ fontFamily: 'Outfit' }}>{isForced ? 'Set New Password' : 'Change Password'}</h1>
          {isForced && <p className="text-sm text-red-600 mt-2">You must change your password before continuing</p>}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" data-testid="change-password-form">
          {!isForced && <div><Label>Current Password</Label><Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required data-testid="current-password-input" /></div>}
          <div><Label>New Password</Label><Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required data-testid="new-password-input" /></div>
          <div><Label>Confirm New Password</Label><Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required data-testid="confirm-password-input" /></div>
          <Button type="submit" disabled={loading} className="w-full bg-[#5B21B6] hover:bg-[#4C1D95] text-white" data-testid="change-password-submit">{loading ? 'Changing...' : 'Change Password'}</Button>
          {!isForced && <button type="button" onClick={() => navigate(-1)} className="w-full text-sm text-gray-500 hover:underline">Cancel</button>}
        </form>
      </div>
    </div>
  );
};

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    if (newPw.length < 6) { toast.error('Min 6 characters'); return; }
    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/auth/reset-password`, { token, new_password: newPw });
      toast.success('Password reset! You can now login.');
      navigate('/login');
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    setLoading(false);
  };

  if (!token) return <div className="min-h-screen flex items-center justify-center"><p className="text-red-600">Invalid reset link</p></div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 rounded-full object-cover mb-4" />
          <h1 className="text-2xl font-bold text-gray-950" style={{ fontFamily: 'Outfit' }}>Reset Password</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" data-testid="reset-password-form">
          <div><Label>New Password</Label><Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required /></div>
          <div><Label>Confirm Password</Label><Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required /></div>
          <Button type="submit" disabled={loading} className="w-full bg-[#5B21B6] hover:bg-[#4C1D95] text-white">{loading ? 'Resetting...' : 'Reset Password'}</Button>
        </form>
      </div>
    </div>
  );
};
