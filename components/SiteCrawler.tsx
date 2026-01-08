import React, { useState, useEffect } from 'react';
import { CrawlerConfig } from '../types';
import { Globe, Play, Settings2, Loader2, AlertTriangle, Lock, Key, CheckCircle } from 'lucide-react';

interface Props {
  onCrawl: (config: CrawlerConfig, description?: string) => Promise<void>;
  isLoading: boolean;
}

const SiteCrawler: React.FC<Props> = ({ onCrawl, isLoading }) => {
  const [url, setUrl] = useState('https://www.fme.de'); 
  const [showAuth, setShowAuth] = useState(false);
  const [auth, setAuth] = useState({ user: '', pass: '' });
  const [options, setOptions] = useState({
    includePages: true,
    includePosts: false,
    includeCustom: false
  });

  // Auto-show auth if values are present (e.g. if we persist state later)
  useEffect(() => {
    if (auth.user || auth.pass) setShowAuth(true);
  }, [auth.user, auth.pass]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCrawl({
        url,
        username: auth.user,
        appPassword: auth.pass,
        ...options
    }, ""); 
  };

  const hasAuth = !!(auth.user && auth.pass);

  return (
    <div className="relative z-10 max-w-xl mx-auto mt-10 p-8 bg-white rounded-xl shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-600 rounded-lg text-white">
                <Globe size={32} />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-slate-900">WP Structure Architect</h1>
                <p className="text-slate-500">Site Crawler & Visualizer</p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">WordPress URL</label>
                <div className="relative">
                    <input 
                        type="url" 
                        required
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        className="w-full pl-4 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="https://ihre-wordpress-seite.de"
                    />
                </div>
            </div>

            {/* Auth Toggle */}
            <div className="border-t border-slate-100 pt-4">
                <button 
                    type="button"
                    onClick={() => setShowAuth(!showAuth)}
                    className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 font-medium transition-colors w-full justify-between"
                >
                    <div className="flex items-center gap-2">
                        <Lock size={16} className={showAuth ? "text-blue-600" : ""} />
                        <span>{showAuth ? 'Authentifizierung' : 'Authentifizierung (Optional)'}</span>
                    </div>
                    {hasAuth && <CheckCircle size={16} className="text-green-500" />}
                </button>
                
                {showAuth && (
                    <div className="mt-4 grid grid-cols-1 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-in slide-in-from-top-2">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Username / E-Mail</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={auth.user}
                                    onChange={e => setAuth({...auth, user: e.target.value})}
                                    className="w-full pl-9 pr-3 py-2 rounded border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    placeholder="admin"
                                />
                                <Lock size={14} className="absolute left-3 top-2.5 text-slate-400" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">
                                Application Password 
                            </label>
                            <div className="relative">
                                <input 
                                    type="password" 
                                    value={auth.pass}
                                    onChange={e => setAuth({...auth, pass: e.target.value})}
                                    className="w-full pl-9 pr-3 py-2 rounded border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    placeholder="xxxx xxxx xxxx xxxx"
                                />
                                <Key size={14} className="absolute left-3 top-2.5 text-slate-400" />
                            </div>
                            <p className="mt-1.5 text-[10px] text-slate-500 leading-tight">
                                Erstellen Sie ein App-Passwort in WP Admin &rarr; Benutzer &rarr; Profil.
                                <br />Nutzen <strong>nicht</strong> Ihr Login-Passwort!
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-3 text-slate-800 font-semibold">
                    <Settings2 size={18} />
                    <span>Import Filter</span>
                </div>
                <div className="flex gap-4 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded border border-slate-200 shadow-sm hover:border-blue-300">
                        <input 
                            type="checkbox" 
                            checked={options.includePages}
                            onChange={e => setOptions({...options, includePages: e.target.checked})}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">Seiten</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded border border-slate-200 shadow-sm hover:border-blue-300">
                        <input 
                            type="checkbox" 
                            checked={options.includePosts}
                            onChange={e => setOptions({...options, includePosts: e.target.checked})}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">Beiträge</span>
                    </label>
                </div>
            </div>

            {hasAuth && (
                 <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3">
                    <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                    <div className="text-xs text-amber-800 leading-relaxed">
                        <strong>Authentifizierung aktiv:</strong> Es wird versucht, eine direkte Verbindung oder einen Auth-kompatiblen Proxy zu nutzen. 
                        Falls dies fehlschlägt, stellen Sie sicher, dass Ihre WP-Installation REST API Zugriffe von außen erlaubt (CORS).
                    </div>
               </div>
            )}

            <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="animate-spin" />
                        Lade Struktur...
                    </>
                ) : (
                    <>
                        <Play size={20} fill="currentColor" />
                        Struktur Analysieren
                    </>
                )}
            </button>
        </form>
    </div>
  );
};

export default SiteCrawler;