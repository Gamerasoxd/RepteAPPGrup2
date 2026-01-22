
import React, { useState, useEffect } from 'react';
import { ViewMode } from './types';
import KioskView from './views/KioskView';
import AdminView from './views/AdminView';
import StudentMobileView from './views/StudentMobileView';
import { UserCheck, ShieldCheck, Smartphone } from 'lucide-react';
import { Logo } from './components/Logo';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('kiosk');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth < 768;
      setIsMobileDevice(isMobile);
      if (isMobile) {
        setView('mobile');
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const NavButton = ({ target, icon: Icon, label, activeColor }: { target: ViewMode, icon: any, label: string, activeColor: string }) => (
    <button
      onClick={() => {
        if (target === 'admin') handleAdminAccess();
        else setView(target);
      }}
      className={`group relative flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ${
        view === target 
          ? `${activeColor} text-white shadow-xl scale-110` 
          : 'bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-600 shadow-sm border border-gray-100'
      }`}
    >
      <Icon size={24} />
      <span className="absolute right-16 bg-gray-900 text-white text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest z-50 whitespace-nowrap shadow-xl">
        {label}
      </span>
    </button>
  );

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-gray-50 font-inter">
      {/* Sidebar Navigation - Hidden on mobile devices */}
      {!isMobileDevice && (
        <nav className="fixed right-6 bottom-8 z-[100] flex flex-col gap-4 print:hidden">
          <NavButton target="kiosk" icon={UserCheck} label="Mode Quiosc" activeColor="bg-red-600" />
          <NavButton target="mobile" icon={Smartphone} label="App Alumne" activeColor="bg-red-950" />
          <NavButton target="admin" icon={ShieldCheck} label="Panell Professor" activeColor="bg-red-600" />
        </nav>
      )}

      {showLogin && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-red-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-10">
            <div className="flex justify-center mb-6"><Logo className="w-20 h-20" /></div>
            <h2 className="text-2xl font-black text-center mb-1 text-gray-900">Accés Professor</h2>
            <p className="text-gray-400 text-center mb-8 text-xs font-bold uppercase tracking-widest">PIN de seguretat (123456)</p>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <input 
                autoFocus 
                type="password" 
                value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)} 
                className={`w-full p-5 bg-gray-50 border-2 rounded-2xl text-center text-3xl font-bold tracking-[0.5em] focus:outline-none transition-all ${loginError ? 'border-red-500 bg-red-50' : 'border-gray-100 focus:border-red-500'}`} 
              />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowLogin(false)} className="flex-1 py-4 text-gray-400 font-bold hover:text-red-600">Cancel·lar</button>
                <button type="submit" className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 shadow-lg active:scale-95 transition-all">Entrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="flex-1 h-screen overflow-hidden">
        {view === 'kiosk' && <KioskView />}
        {view === 'admin' && <AdminView onLogout={() => {setIsAuthenticated(false); setView('kiosk');}} />}
        {view === 'mobile' && <StudentMobileView />}
      </main>
    </div>
  );
};

export default App;
