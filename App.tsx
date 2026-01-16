
import React, { useState } from 'react';
import { ViewMode } from './types';
import KioskView from './views/KioskView';
import AdminView from './views/AdminView';
import { UserCheck, ShieldCheck } from 'lucide-react';
import { Logo } from './components/Logo';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('kiosk');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [loginError, setLoginError] = useState(false);

  const handleAdminAccess = () => {
    if (isAuthenticated) setView('admin');
    else setShowLogin(true);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '123456') {
      setIsAuthenticated(true);
      setView('admin');
      setShowLogin(false);
      setPasswordInput('');
      setLoginError(false);
    } else {
      setLoginError(true);
      setPasswordInput('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-red-50/10">
      <div className="fixed bottom-6 right-6 z-50 flex gap-3">
        <button onClick={() => setView('kiosk')} className={`p-4 rounded-full shadow-2xl flex items-center gap-3 transition-all transform hover:scale-105 ${view === 'kiosk' ? 'bg-red-600 text-white ring-4 ring-red-200' : 'bg-white text-gray-600'}`}><UserCheck size={24} /><span className="text-sm font-bold">Mode Alumne</span></button>
        <button onClick={handleAdminAccess} className={`p-4 rounded-full shadow-2xl flex items-center gap-3 transition-all transform hover:scale-105 ${view === 'admin' ? 'bg-red-600 text-white ring-4 ring-red-200' : 'bg-white text-gray-600'}`}><ShieldCheck size={24} /><span className="text-sm font-bold">Mode Professor</span></button>
      </div>

      {showLogin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-red-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-10">
            <div className="flex justify-center mb-6"><Logo className="w-24 h-24" /></div>
            <h2 className="text-3xl font-black text-center mb-2 text-gray-900">Accés Professor</h2>
            <p className="text-gray-500 text-center mb-8 text-sm font-medium">Contrasenya: 123456</p>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <input autoFocus type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className={`w-full p-5 bg-gray-50 border-2 rounded-2xl text-center text-3xl font-bold tracking-[0.5em] focus:outline-none ${loginError ? 'border-red-500' : 'border-gray-100'}`} />
              {loginError && <p className="text-red-500 text-center text-xs font-black">Contrasenya incorrecta</p>}
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowLogin(false)} className="flex-1 py-4 text-gray-400 font-bold">Enrere</button><button type="submit" className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 shadow-lg">Entrar</button></div>
            </form>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-auto no-select">{view === 'kiosk' ? <KioskView /> : <AdminView onLogout={() => {setIsAuthenticated(false); setView('kiosk');}} />}</main>
    </div>
  );
};

export default App;
