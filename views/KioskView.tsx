
import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../dbService';
import { Student, Course, AttendanceLog } from '../types';
import VirtualKeyboard from '../components/VirtualKeyboard';
// Added Search to the imports from lucide-react
import { CheckCircle, ArrowLeft, Clock, UserPlus, Send, Bot, Loader2, ShieldAlert, Mic, Square, Volume2, Database, X, Sparkles, Search } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Logo } from '../components/Logo';

const PROF_REGISTRATION_PIN = "1234";

const KioskView: React.FC = () => {
  const [step, setStep] = useState<'welcome' | 'selection' | 'pin' | 'register-auth' | 'register' | 'success'>('welcome');
  const [showAi, setShowAi] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [pin, setPin] = useState('');
  const [idSearch, setIdSearch] = useState('');
  const [profPin, setProfPin] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // IA State
  const [aiMessage, setAiMessage] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const config = await dbService.getConfig();
      const allCourses = await dbService.getCourses();
      const currentCourse = allCourses.find(c => c.id === config.kioskCourseId);
      setCourse(currentCourse || null);

      const allStudents = await dbService.getStudents();
      setStudents(allStudents.filter(s => s.courseId === config.kioskCourseId));
      setIsLoading(false);
    };
    loadData();
  }, [step]);

  const changeStep = (newStep: typeof step) => {
    setAnimating(true);
    setTimeout(() => {
      setStep(newStep);
      setAnimating(false);
    }, 300);
  };

  const handleAiAssistant = async () => {
    if (!aiMessage.trim()) return;
    setIsAiLoading(true);
    try {
      // Create a new GoogleGenAI instance right before making an API call
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: aiMessage,
        config: {
          systemInstruction: "Ets l'Assistent Virtual de SalesiansCheck. Ets amable i ajudes els alumnes a utilitzar el sistema de fitxatge. No permetis el registre sense PIN de professor. L'alumne està davant d'un Quiosc de fitxatge. El curs actual és: " + (course?.name || 'desconegut')
        }
      });
      setAiResponse(response.text || "Ho sento, no t'he entès.");
    } catch (err) {
      console.error("AI Error:", err);
      setAiResponse("Error en connectar amb el cervell de la IA. Revisa la connexió al servidor.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setPin('');
    setError('');
    changeStep('pin');
  };

  const handleKeyPress = (key: string, target: 'pin' | 'prof') => {
    if (target === 'pin') {
      if (pin.length < 6) setPin(prev => prev + key);
    } else {
      if (profPin.length < 4) setProfPin(prev => prev + key);
    }
  };

  const handlePinSubmit = () => {
    if (!selectedStudent) return;
    if (selectedStudent.pin === null || selectedStudent.pin === pin) {
      processCheckIn(selectedStudent);
    } else {
      setError('PIN incorrecte.');
      setPin('');
    }
  };

  const handleProfAuthSubmit = () => {
    if (profPin === PROF_REGISTRATION_PIN) {
      setProfPin('');
      setError('');
      changeStep('register');
    } else {
      setError('PIN incorrecte.');
      setProfPin('');
    }
  };

  const handleRegistration = async () => {
    if (!newName.trim() || pin.length < 4 || !course) {
      setError('Nom i PIN mín. 4 dígits requerits.');
      return;
    }
    const newStudent: Student = {
      id: Date.now().toString(),
      name: newName,
      courseId: course.id,
      pin: pin,
      status: 'absent'
    };
    await dbService.addStudent(newStudent);
    setSelectedStudent(newStudent);
    processCheckIn(newStudent);
  };

  const processCheckIn = async (student: Student) => {
    if (!course) return;
    const log: AttendanceLog = {
      id: Date.now().toString(),
      studentId: student.id,
      studentName: student.name,
      courseId: course.id,
      date: new Date().toLocaleDateString(),
      timestamp: new Date().toLocaleTimeString(),
      status: 'present'
    };
    await dbService.saveAttendanceLog(log);
    changeStep('success');
    setTimeout(() => reset(), 4000);
  };

  const reset = () => {
    setStep('welcome');
    setSelectedStudent(null);
    setPin('');
    setProfPin('');
    setError('');
    setNewName('');
    setIdSearch('');
    setShowAi(false);
    setAiResponse('');
  };

  const containerClasses = `h-screen w-full transition-opacity duration-300 ${animating ? 'opacity-0' : 'opacity-100'}`;

  if (step === 'welcome') {
    return (
      <div onClick={() => changeStep('selection')} className={`${containerClasses} flex flex-col items-center justify-center bg-red-600 text-white cursor-pointer relative`}>
        <div className="animate-bounce mb-8"><Logo className="w-48 h-48" /></div>
        <h1 className="text-7xl font-black mb-4 tracking-tighter uppercase italic">SalesiansCheck</h1>
        <p className="text-3xl font-bold opacity-80 animate-pulse">Toca per fitxar</p>
      </div>
    );
  }

  return (
    <div className={`${containerClasses} flex flex-col bg-red-50/20 relative`}>
      <header className="p-10 bg-white border-b border-red-100 shadow-sm flex justify-between items-center z-10">
        <div className="flex items-center gap-6">
          <Logo className="w-16 h-16" />
          <div>
            <h2 className="text-5xl font-black text-red-900 tracking-tighter">{course?.name || (isLoading ? 'Carregant...' : 'Sense Curs')}</h2>
          </div>
        </div>
        <div className="flex gap-4">
           <button onClick={() => setShowAi(true)} className="p-5 bg-blue-600 text-white rounded-[2rem] flex items-center gap-3 font-black shadow-lg hover:bg-blue-700 active:scale-95 transition-transform"><Bot size={32}/> Assistent IA</button>
           <button onClick={reset} className="p-5 text-red-300 hover:text-red-500 bg-red-50 rounded-[2rem] active:scale-95 transition-transform"><ArrowLeft size={40} /></button>
        </div>
      </header>

      <main className="flex-1 p-10 overflow-y-auto relative custom-scrollbar">
        {step === 'selection' && (
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-12">
              <div className="relative w-1/2">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={24}/>
                <input type="text" placeholder="Busca el teu nom..." value={idSearch} onChange={e => setIdSearch(e.target.value)} className="w-full pl-16 pr-8 py-6 bg-white border-4 border-white shadow-xl rounded-[2rem] text-xl font-black outline-none focus:border-red-400" />
              </div>
              <button onClick={() => changeStep('register-auth')} className="flex items-center gap-4 px-10 py-6 bg-red-600 text-white rounded-3xl font-black text-xl shadow-xl hover:bg-red-700 transition-all active:scale-95"><UserPlus size={32} /> No aparec</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {students
                .filter(s => s.name.toLowerCase().includes(idSearch.toLowerCase()))
                .sort((a,b) => a.name.localeCompare(b.name))
                .map(student => (
                <button key={student.id} onClick={() => handleStudentSelect(student)} disabled={student.status === 'present'}
                  className={`relative p-8 rounded-[2rem] border-4 transition-all text-left ${student.status === 'present' ? 'bg-green-50 border-green-200 opacity-60' : 'bg-white border-white shadow-xl hover:border-red-400 hover:-translate-y-2'}`}>
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black mb-4 ${student.status === 'present' ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-600'}`}>{student.name.charAt(0)}</div>
                  <span className="block text-2xl font-black text-gray-900 leading-tight">{student.name}</span>
                  {student.status === 'present' && <div className="absolute top-6 right-6 text-green-500"><CheckCircle size={32} /></div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'pin' && selectedStudent && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="bg-white p-12 rounded-[3rem] shadow-2xl w-full max-w-lg text-center border border-red-50">
              <div className="w-24 h-24 bg-red-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl font-black text-4xl">{selectedStudent.name.charAt(0)}</div>
              <h3 className="text-3xl font-black text-gray-900 mb-8">{selectedStudent.name}</h3>
              <div className="flex justify-center gap-3 mb-10">
                {[...Array(6)].map((_, i) => (<div key={i} className={`w-12 h-16 border-4 rounded-xl flex items-center justify-center text-3xl font-black ${pin.length === i ? 'border-red-500 bg-red-50' : 'border-gray-100'}`}>{pin[i] ? '•' : ''}</div>))}
              </div>
              {error && <p className="text-red-600 font-black mb-6 uppercase text-xs">{error}</p>}
              <VirtualKeyboard onKeyPress={(k) => handleKeyPress(k, 'pin')} onDelete={() => setPin(prev => prev.slice(0, -1))} onClear={() => setPin('')} />
              <button onClick={handlePinSubmit} disabled={pin.length < 4} className="mt-8 w-full py-6 bg-red-600 text-white text-2xl font-black rounded-[2rem] shadow-xl hover:bg-red-700 active:scale-95 transition-all">FITXAR ARA</button>
            </div>
          </div>
        )}

        {step === 'register-auth' && (
          <div className="flex flex-col items-center justify-center h-full">
             <div className="bg-white p-12 rounded-[3rem] shadow-2xl w-full max-w-lg text-center border border-red-50">
                <ShieldAlert size={64} className="mx-auto text-red-600 mb-4" />
                <h3 className="text-3xl font-black text-gray-900 mb-2">Accés Professor</h3>
                <p className="text-gray-400 font-bold mb-8">PIN de registre (1234):</p>
                <div className="flex justify-center gap-3 mb-10">
                   {[...Array(4)].map((_, i) => (<div key={i} className={`w-14 h-16 border-4 rounded-xl flex items-center justify-center text-3xl font-black ${profPin.length === i ? 'border-red-500 bg-red-50' : 'border-gray-100'}`}>{profPin[i] ? '•' : ''}</div>))}
                </div>
                <VirtualKeyboard onKeyPress={(k) => handleKeyPress(k, 'prof')} onDelete={() => setProfPin(prev => prev.slice(0, -1))} onClear={() => setProfPin('')} />
                <button onClick={handleProfAuthSubmit} disabled={profPin.length < 4} className="mt-8 w-full py-6 bg-red-600 text-white text-2xl font-black rounded-[2rem] shadow-xl hover:bg-red-700 active:scale-95 transition-transform">AUTORITZAR</button>
             </div>
          </div>
        )}

        {step === 'register' && (
          <div className="flex flex-col items-center justify-center h-full">
             <div className="bg-white p-12 rounded-[3rem] shadow-2xl w-full max-w-lg border border-red-50">
                <h3 className="text-3xl font-black text-gray-900 mb-8 text-center uppercase tracking-tighter">Nou Alumne</h3>
                <div className="space-y-6">
                   <div>
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-4">Nom i Cognoms</label>
                     <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full p-6 bg-gray-50 border-2 rounded-[2rem] font-bold outline-none focus:border-red-500" placeholder="Ex: Joan Garcia" />
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-4">PIN (4-6 digits)</label>
                     <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full p-6 bg-gray-50 border-2 rounded-[2rem] font-bold text-center tracking-[1em]" placeholder="••••" />
                   </div>
                   <button onClick={handleRegistration} className="w-full py-6 bg-red-600 text-white text-2xl font-black rounded-[2rem] shadow-xl hover:bg-red-700 active:scale-95 transition-transform">REGISTRAR</button>
                </div>
             </div>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center h-full bg-red-600 rounded-[4rem] text-white p-10 animate-pulse">
            <CheckCircle size={160} className="mb-12" />
            <h1 className="text-9xl font-black mb-6 tracking-tighter uppercase">FITXAT!</h1>
            <p className="text-4xl font-bold opacity-80 uppercase tracking-widest">Bona classe, {selectedStudent?.name}</p>
          </div>
        )}
      </main>

      {/* Assistent IA Modal */}
      {showAi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/80 backdrop-blur-md p-10">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[70vh] animate-in zoom-in duration-200">
            <header className="p-8 bg-blue-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl"><Bot size={40}/></div>
                <div>
                  <h4 className="text-2xl font-black">Assistent Salesià</h4>
                  <p className="text-xs font-bold opacity-80 uppercase">Impulsat per Gemini IA</p>
                </div>
              </div>
              <button onClick={() => setShowAi(false)} className="p-4 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X size={32}/></button>
            </header>
            <div className="flex-1 p-8 overflow-y-auto bg-blue-50/30 custom-scrollbar">
              {aiResponse ? (
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <div className="bg-blue-600 text-white p-4 rounded-2xl rounded-tr-none font-bold shadow-md max-w-[80%]">{aiMessage}</div>
                  </div>
                  <div className="flex justify-start gap-3 animate-in slide-in-from-left-4">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0"><Sparkles size={20}/></div>
                    <div className="bg-white p-6 rounded-2xl rounded-tl-none border shadow-sm text-gray-800 leading-relaxed font-medium">{aiResponse}</div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-blue-300">
                  <Bot size={80} className="mb-4 opacity-20"/>
                  <p className="text-xl font-bold">En què et puc ajudar?</p>
                  <p className="text-sm">Pregunta'm com fitxar, horaris o qualsevol dubte.</p>
                </div>
              )}
            </div>
            <div className="p-6 bg-white border-t border-blue-100 flex gap-4">
              <input 
                type="text" 
                value={aiMessage} 
                onChange={e => setAiMessage(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleAiAssistant()}
                placeholder="Escriu la teva consulta..." 
                className="flex-1 p-5 bg-gray-50 border-2 border-blue-50 rounded-2xl font-bold outline-none focus:border-blue-500"
              />
              <button 
                onClick={handleAiAssistant} 
                disabled={isAiLoading || !aiMessage.trim()}
                className="p-5 bg-blue-600 text-white rounded-2xl shadow-xl hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
              >
                {isAiLoading ? <Loader2 className="animate-spin" size={32}/> : <Send size={32}/>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KioskView;
