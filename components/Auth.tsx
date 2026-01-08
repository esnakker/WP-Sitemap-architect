import React, { useState } from 'react';
import { supabase } from '../services/supabaseService';
import { LogOut, Mail, Lock, Loader2 } from 'lucide-react';

interface AuthProps {
  onAuthStateChange: (user: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthStateChange }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setEmail('');
        setPassword('');
        alert('Registrierung erfolgreich! Bitte überprüfen Sie Ihre E-Mail.');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          onAuthStateChange(data.user);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onAuthStateChange(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">WP Structure Architect</h1>
          <p className="text-slate-500 mb-6">Site Crawler & Visualizer</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">E-Mail</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="name@example.com"
                />
                <Mail size={18} className="absolute left-3 top-2.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Passwort</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                />
                <Lock size={18} className="absolute left-3 top-2.5 text-slate-400" />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {isSignUp ? 'Registrieren' : 'Anmelden'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {isSignUp ? 'Haben Sie bereits ein Konto? Anmelden' : 'Neues Konto erstellen?'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const LogoutButton: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium transition-all"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
      Abmelden
    </button>
  );
};
