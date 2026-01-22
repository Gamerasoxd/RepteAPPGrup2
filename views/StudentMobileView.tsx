
import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../dbService';
import { Student, Course, AttendanceLog } from '../types';
import VirtualKeyboard from '../components/VirtualKeyboard';
import { 
  Calendar as CalendarIcon, 
  FileText, 
  Camera, 
  Send, 
  CheckCircle, 
  ArrowLeft, 
  Clock, 
  Bot, 
  Loader2, 
  ChevronRight,
  Search,
  X,
  AlertCircle,
  LogOut,
  FileSearch,
  Check,
  Slash
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Logo } from '../components/Logo';

const StudentMobileView: React.FC = () => {
  const [step, setStep] = useState<'identity' | 'login' | 'dashboard' | 'calendar' | 'justify-form'>('identity');
  const [selectedIdentity, setSelectedIdentity] = useState<Student | null>(null);
  const [pin, setPin] = useState('');
  const [idSearch, setIdSearch] = useState('');
  const [error, setError] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  // Form State
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [reason, setReason] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('14:00');
  const [isJustified, setIsJustified] = useState(false);
  const [pendingDoc, setPendingDoc] = useState<string | null>(null);
  const [aiValidation, setAiValidation] = useState<'idle' | 'scanning' | 'approved' | 'rejected'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStudents(dbService.getStudents());
    const allCourses = dbService.getCourses();
    setCourses(allCourses);
    if (allCourses.length > 0) setSelectedCourseId(allCourses[0].id);
  }, []);

  const handleIdentitySelect = (s: Student) => {
    setSelectedIdentity(s);
    setStep('login');
    setPin('');
    setError('');
  };

  const handleLogin = () => {
    if (!selectedIdentity) return;
    if (selectedIdentity.pin === null) {
      if (pin.length < 4) {
        setError('El PIN ha de tenir almenys 4 dígits');
        return;
      }
      const updatedStudent = { ...selectedIdentity, pin };
      dbService.updateStudent(updatedStudent);
      setSelectedIdentity(updatedStudent);
      setStep('dashboard');
    } else if (selectedIdentity.pin === pin) {
      setStep('dashboard');
    } else {
      setError('PIN incorrecte');
      setPin('');
    }
  };

  const scanDocumentWithAI = async () => {
    if (!pendingDoc) return;
    setAiValidation('scanning');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: [
            { inlineData: { data: pendingDoc.split(',')[1], mimeType: 'image/jpeg' } },
            { text: "Analitza aquest document. És un justificant mèdic o oficial vàlid? Respon en JSON amb 'valid' (boolean) i 'summary' (string breu en català)." }
          ]
        },
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || '{"valid": false}');
      setAiValidation(result.valid ? 'approved' : 'rejected');
      if (result.valid) setReason(prev => prev + (prev ? " | " : "") + result.summary);
    } catch (err) {
      console.error(err);
      setAiValidation('rejected');
    }
  };

  const handleSubmitJustification = () => {
    if (!selectedIdentity || !selectedCourseId || !reason) {
      alert("Si us plau, omple tots els camps obligatoris.");
      return;
    }

    setIsSubmitting(true);
    
    const log: AttendanceLog = {
      id: Date.now().toString(),
      studentId: selectedIdentity.id,
      studentName: selectedIdentity.name,
      courseId: selectedCourseId,
      date: new Date().toLocaleDateString(),
      timestamp: new Date().toLocaleTimeString(),
      status: 'absent',
      isJustified: isJustified && aiValidation === 'approved',
      justificationReason: `[${startTime}-${endTime}] ${reason}`
    };
    
    dbService.saveAttendanceLog(log);
    
    setTimeout(() => {
      setIsSubmitting(false);
      setStep('dashboard');
      // Reset form
      setReason('');
      setPendingDoc(null);
      setAiValidation('idle');
      setIsJustified(false);
    }, 2000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPendingDoc(reader.result as string);
        setAiValidation('idle');
      };
      reader.readAsDataURL(file);
    }
  };

  if (step === 'identity') {
    const filtered = students.filter(s => s.name.toLowerCase().includes(idSearch.toLowerCase()));
    return (
      <div className="h-screen bg-red-950 flex flex-col items-center p-6 pt-12">
        <div className="bg-white rounded-[3rem] w-full max-w-sm p-10 shadow-2xl flex flex-col h-full border-t-8 border-red-600 overflow-hidden">
          <Logo className="w-14 h-14 mx-auto mb-6 shrink-0" />
          <h2 className="text-xl font-black text-center mb-6 shrink-0">Identificació</h2>
          <div className="relative mb-6 shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input type="text" value={idSearch} onChange={(e) => setIdSearch(e.target.value)} placeholder="Cerca..." className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 rounded-2xl font-bold outline-none focus:border-red-500" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
            {filtered.map(s => (
              <button key={s.id} onClick={() => handleIdentitySelect(s)} className="w-full p-4 text-left border rounded-xl hover:bg-red-50 flex justify-between items-center group transition-all">
                <span className="font-bold text-sm truncate pr-2">{s.name}</span>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-red-500 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'login') {
    return (
      <div className="h-screen bg-red-950 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-[3rem] w-full max-w-sm p-10 shadow-2xl text-center relative border-t-8 border-red-600">
          <button onClick={() => setStep('identity')} className="absolute top-8 left-8 text-gray-300 hover:text-red-600"><ArrowLeft size={24} /></button>
          <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center text-white font-black text-3xl mx-auto mb-4 shadow-lg">{selectedIdentity?.name.charAt(0)}</div>
          <p className="font-black text-gray-900 mb-8 truncate">{selectedIdentity?.name}</p>
          <div className="flex justify-center gap-2 mb-10">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`w-10 h-14 border-4 rounded-xl flex items-center justify-center text-2xl font-black transition-all ${pin.length === i ? 'border-red-500 bg-red-50' : pin.length > i ? 'border-gray-900 bg-gray-50' : 'border-gray-100'}`}>{pin[i] ? '•' : ''}</div>
            ))}
          </div>
          {error && <p className="text-red-500 font-bold mb-4 text-[10px] bg-red-50 py-2 rounded-lg uppercase tracking-wider">{error}</p>}
          <VirtualKeyboard onKeyPress={(k) => pin.length < 6 && setPin(p => p + k)} onDelete={() => setPin(p => p.slice(0, -1))} onClear={() => setPin('')} />
          <button onClick={handleLogin} disabled={pin.length < 4} className="mt-8 w-full py-5 bg-red-600 text-white font-black rounded-2xl disabled:opacity-30 shadow-xl shadow-red-100 active:scale-95 transition-all">ENTRAR</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative overflow-hidden">
      <header className="bg-white p-6 border-b flex justify-between items-center shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white font-black shadow-md">{selectedIdentity?.name.charAt(0)}</div>
          <span className="font-black text-sm truncate max-w-[150px]">{selectedIdentity?.name}</span>
        </div>
        <button onClick={() => setStep('identity')} className="p-2 text-gray-400 hover:text-red-600"><LogOut size={20} /></button>
      </header>

      <main className="flex-1 overflow-y-auto p-6 pb-24 custom-scrollbar">
        {step === 'dashboard' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-red-600 p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
              <h3 className="text-xl font-black">Bon dia!</h3>
              <p className="text-sm opacity-80">Què vols fer avui?</p>
              <div className="absolute -right-4 -bottom-4 opacity-10"><Logo className="w-24 h-24 rotate-12" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setStep('calendar')} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 hover:bg-red-50 active:scale-95 transition-all">
                <CalendarIcon className="text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-center">Horari</span>
              </button>
              <button onClick={() => setStep('justify-form')} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 hover:bg-red-50 active:scale-95 transition-all">
                <FileText className="text-green-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-center">Justificar</span>
              </button>
            </div>
          </div>
        )}

        {step === 'calendar' && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <h3 className="font-black text-gray-900 flex items-center gap-2 px-2"><CalendarIcon size={18} className="text-red-600"/> El meu Horari</h3>
            <div className="space-y-3">
              {courses.map(c => (
                <div key={c.id} className="bg-white p-5 rounded-xl border border-gray-100 flex justify-between items-center shadow-sm">
                  <span className="font-bold text-sm">{c.name}</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{c.schedule}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setStep('dashboard')} className="w-full py-4 text-gray-400 font-bold hover:text-red-600">Tornar al menú</button>
          </div>
        )}

        {step === 'justify-form' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
               <h3 className="font-black text-gray-900 flex items-center gap-2"><FileText size={18} className="text-green-500"/> Justificar Falta</h3>
               <button onClick={() => setStep('dashboard')} className="text-gray-400 hover:text-red-600"><X size={20}/></button>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              {/* Selecció de Curs */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Classe / Mòdul</label>
                <select 
                  value={selectedCourseId} 
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:ring-2 focus:ring-red-100"
                >
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Horari */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Des de les</label>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:ring-2 focus:ring-red-100" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Fins les</label>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:ring-2 focus:ring-red-100" />
                </div>
              </div>

              {/* Motiu */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Motiu detallat</label>
                <textarea 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explica per què no podràs assistir..."
                  className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:ring-2 focus:ring-red-100 h-24 resize-none"
                />
              </div>

              {/* Toggle Justificada */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isJustified ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                    <Check size={18} />
                  </div>
                  <span className="font-bold text-sm">Falta Justificada?</span>
                </div>
                <button 
                  onClick={() => setIsJustified(!isJustified)}
                  className={`w-12 h-6 rounded-full relative transition-all ${isJustified ? 'bg-red-600' : 'bg-gray-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${isJustified ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              {/* Secció Document si és justificada */}
              {isJustified && (
                <div className="space-y-4 pt-2 border-t border-dashed animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Adjuntar Prova (IA Scanner)</label>
                  
                  <div className="flex gap-3 items-end">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex-1 h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${pendingDoc ? 'border-red-200 bg-red-50' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      {pendingDoc ? (
                        <img src={pendingDoc} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <>
                          <Camera className="text-gray-300 mb-2" size={32} />
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Toca per pujar</span>
                        </>
                      )}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                    
                    {pendingDoc && aiValidation !== 'approved' && (
                      <button 
                        onClick={scanDocumentWithAI}
                        disabled={aiValidation === 'scanning'}
                        className="p-4 bg-red-600 text-white rounded-2xl shadow-lg active:scale-95 disabled:opacity-50"
                      >
                        {aiValidation === 'scanning' ? <Loader2 className="animate-spin" /> : <FileSearch />}
                      </button>
                    )}
                  </div>

                  {aiValidation === 'approved' && (
                    <div className="p-3 bg-green-50 text-green-700 rounded-xl flex items-center gap-3 border border-green-100 animate-in zoom-in">
                      <CheckCircle size={16} />
                      <span className="text-xs font-black uppercase tracking-wider">Document validat per IA</span>
                    </div>
                  )}

                  {aiValidation === 'rejected' && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100 animate-in zoom-in">
                      <AlertCircle size={16} />
                      <span className="text-xs font-black uppercase tracking-wider">Document no vàlid o il·legible</span>
                    </div>
                  )}
                </div>
              )}

              {/* Botó Final */}
              <button 
                onClick={handleSubmitJustification}
                disabled={isSubmitting || (isJustified && aiValidation !== 'approved')}
                className="w-full py-5 bg-red-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-red-100 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-30"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    <span>ENVIANT...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle />
                    <span>COMPLETAR REGISTRE</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Navigation - Hidden during form to focus user */}
      {step !== 'justify-form' && (
        <nav className={`absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] bg-white rounded-full shadow-2xl border border-gray-100 flex justify-around p-3 z-30 transition-all ${step === 'identity' || step === 'login' ? 'translate-y-32' : ''}`}>
          <button onClick={() => setStep('dashboard')} className={`p-4 rounded-full transition-all ${step === 'dashboard' ? 'bg-red-50 text-red-600' : 'text-gray-300'}`}><Bot size={24} /></button>
          <button onClick={() => setStep('calendar')} className={`p-4 rounded-full transition-all ${step === 'calendar' ? 'bg-red-50 text-red-600' : 'text-gray-300'}`}><CalendarIcon size={24} /></button>
          <button onClick={() => setStep('justify-form')} className={`p-4 rounded-full transition-all ${step === 'justify-form' ? 'bg-red-50 text-red-600' : 'text-gray-300'}`}><FileText size={24} /></button>
        </nav>
      )}
    </div>
  );
};

export default StudentMobileView;
