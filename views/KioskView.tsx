
import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../dbService';
import { Student, Course, AttendanceLog } from '../types';
import VirtualKeyboard from '../components/VirtualKeyboard';
import { CheckCircle, ArrowLeft, Clock, UserPlus, Send, Bot, Loader2, ShieldAlert, Mic, Square, Volume2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Logo } from '../components/Logo';

const PROF_REGISTRATION_PIN = "1234";

const KioskView: React.FC = () => {
  const [step, setStep] = useState<'welcome' | 'selection' | 'pin' | 'register-auth' | 'register' | 'success' | 'ai-assistant'>('welcome');
  const [animating, setAnimating] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [pin, setPin] = useState('');
  const [profPin, setProfPin] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');

  // IA Voice State
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string, isAudio?: boolean}[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const config = dbService.getConfig();
    const allCourses = dbService.getCourses();
    const currentCourse = allCourses.find(c => c.id === config.kioskCourseId);
    setCourse(currentCourse || null);

    const allStudents = dbService.getStudents();
    setStudents(allStudents.filter(s => s.courseId === config.kioskCourseId));
  }, [step]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const changeStep = (newStep: typeof step) => {
    setAnimating(true);
    setTimeout(() => {
      setStep(newStep);
      setAnimating(false);
    }, 300);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        sendAudioToAI(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("No s'ha pogut accedir al micròfon.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const sendAudioToAI = async (blob: Blob) => {
    setIsTyping(true);
    setChatMessages(prev => [...prev, { role: 'user', text: "🎤 Àudio enviat...", isAudio: true }]);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType: 'audio/webm' } },
              { text: `Ets un assistent educatiu dels Salesians per al curs ${course?.name}. Escolta l'àudio de l'alumne i respon en català de forma breu i clara.` }
            ]
          }
        });

        const aiText = response.text || "No he entès bé l'àudio. Pots tornar a provar?";
        setChatMessages(prev => [...prev, { role: 'ai', text: aiText }]);
        setIsTyping(false);
      };
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'ai', text: "Error processant l'àudio." }]);
      setIsTyping(false);
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
      setError('PIN de professor incorrecte.');
      setProfPin('');
    }
  };

  const handleRegistration = () => {
    if (!newName.trim() || pin.length < 4 || !course) {
      setError('Nom i PIN requerits (mín. 4 dígits).');
      return;
    }

    const newStudent: Student = {
      id: Date.now().toString(),
      name: newName,
      courseId: course.id,
      pin: pin,
      status: 'absent'
    };

    dbService.addStudent(newStudent);
    setSelectedStudent(newStudent);
    processCheckIn(newStudent);
  };

  const processCheckIn = (student: Student) => {
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
    dbService.saveAttendanceLog(log);
    dbService.updateStudent({ ...student, status: 'present' as const });
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
    setChatMessages([]);
  };

  const containerClasses = `h-screen w-full transition-opacity duration-300 ${animating ? 'opacity-0' : 'opacity-100'}`;

  if (step === 'welcome') {
    return (
      <div onClick={() => changeStep('selection')} className={`${containerClasses} flex flex-col items-center justify-center bg-red-600 text-white cursor-pointer relative`}>
        <div className="animate-bounce mb-8">
           <Logo className="w-48 h-48" />
        </div>
        <h1 className="text-7xl font-black mb-4 tracking-tighter">SalesiansCheck</h1>
        <p className="text-3xl font-bold opacity-80 animate-pulse">Toca per fitxar</p>
      </div>
    );
  }

  if (step === 'selection') {
    return (
      <div className={`${containerClasses} flex flex-col bg-red-50/20`}>
        <header className="p-10 bg-white border-b border-red-100 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Logo className="w-16 h-16" />
            <div>
              <h2 className="text-5xl font-black text-red-900 tracking-tighter">{course?.name || 'Carregant...'}</h2>
              <div className="flex items-center gap-3 text-red-400 mt-1 font-bold text-lg">
                <Clock size={24} />
                <span>{course?.schedule}</span>
              </div>
            </div>
          </div>
          <button onClick={reset} className="p-5 text-red-300 hover:text-red-500 transition-all bg-red-50 rounded-[2rem]">
            <ArrowLeft size={40} />
          </button>
        </header>

        <div className="flex-1 p-10 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
              <p className="text-3xl font-black text-gray-800">Qui ets?</p>
              <div className="flex gap-4">
                <button onClick={() => changeStep('ai-assistant')} className="flex items-center gap-4 px-8 py-5 bg-white border-4 border-red-500 text-red-600 rounded-3xl font-black text-lg hover:bg-red-500 hover:text-white transition-all shadow-lg animate-pulse">
                  <Bot size={28} /> IA Assistenta
                </button>
                <button onClick={() => { setProfPin(''); setError(''); changeStep('register-auth'); }} className="flex items-center gap-4 px-10 py-6 bg-red-600 text-white rounded-3xl font-black text-xl hover:bg-red-700 transition-all shadow-xl">
                  <UserPlus size={32} /> No aparec
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {students.sort((a,b) => a.name.localeCompare(b.name)).map(student => (
                <button key={student.id} onClick={() => handleStudentSelect(student)} disabled={student.status === 'present'}
                  className={`relative p-8 rounded-[2rem] border-4 transition-all text-left group ${student.status === 'present' ? 'bg-green-50 border-green-200 opacity-60' : 'bg-white border-white shadow-xl hover:border-red-400 hover:-translate-y-2'}`}>
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black mb-4 ${student.status === 'present' ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {student.name.charAt(0)}
                  </div>
                  <span className="block text-2xl font-black text-gray-900 leading-tight">{student.name}</span>
                  {student.status === 'present' && <div className="absolute top-6 right-6 text-green-500"><CheckCircle size={32} /></div>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'register-auth') {
    return (
      <div className={`${containerClasses} flex flex-col items-center justify-center p-10 bg-red-50/20`}>
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl w-full max-w-lg text-center border border-red-50 relative">
          <button onClick={() => changeStep('selection')} className="absolute top-8 left-8 p-3 text-gray-300 hover:text-red-500">
            <ArrowLeft size={32} />
          </button>
          <div className="mb-8 pt-4">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><ShieldAlert size={40} /></div>
            <h3 className="text-3xl font-black text-gray-900 mb-2">Autorització Professor</h3>
            <p className="text-gray-400 font-bold">Introdueix el PIN de professor:</p>
          </div>
          <div className="flex justify-center gap-3 mb-10">
            {[...Array(4)].map((_, i) => (<div key={i} className={`w-14 h-20 border-4 rounded-xl flex items-center justify-center text-3xl font-black transition-all ${profPin.length === i ? 'border-red-500 bg-red-50' : 'border-gray-100'}`}>{profPin[i] ? '•' : ''}</div>))}
          </div>
          {error && <p className="text-red-600 font-black mb-6 animate-pulse">{error}</p>}
          <VirtualKeyboard onKeyPress={(k) => handleKeyPress(k, 'prof')} onDelete={() => setProfPin(prev => prev.slice(0, -1))} onClear={() => setProfPin('')} />
          <button onClick={handleProfAuthSubmit} disabled={profPin.length < 4} className="mt-8 w-full py-6 bg-red-950 text-white text-2xl font-black rounded-[2rem] shadow-xl hover:bg-black active:scale-95 disabled:opacity-20 transition-all">Validar PIN</button>
        </div>
      </div>
    );
  }

  if (step === 'register') {
    return (
      <div className={`${containerClasses} flex flex-col items-center justify-center p-10 bg-red-50/30`}>
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl w-full max-w-3xl text-center relative">
          <button onClick={() => changeStep('selection')} className="absolute top-8 left-8 p-4 text-gray-300 hover:text-red-500">
            <ArrowLeft size={40} />
          </button>
          <h3 className="text-4xl font-black mb-8 text-gray-900 mt-4">Nou Registre d'Alumne</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left mb-8">
            <div className="space-y-6">
               <div><label className="block text-xs font-black text-red-400 uppercase tracking-widest mb-2 px-2">Nom i Cognoms</label><input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Escriu aquí..." className="w-full p-6 bg-gray-50 border-4 border-gray-100 rounded-[1.5rem] text-xl font-black focus:border-red-500 outline-none" /></div>
               <div className="bg-red-50 p-6 rounded-2xl border border-red-100"><p className="text-sm font-bold text-red-800 leading-relaxed italic">Estàs afegint-te manualment al curs <b>{course?.name}</b>.</p></div>
            </div>
            <div>
              <label className="block text-xs font-black text-red-400 uppercase tracking-widest mb-4 px-2">Assigna el teu PIN personal</label>
              <div className="flex justify-center gap-2 mb-6">{[...Array(6)].map((_, i) => (<div key={i} className={`w-10 h-14 border-4 rounded-lg flex items-center justify-center text-2xl font-black transition-all ${pin.length === i ? 'border-red-500 bg-red-50' : 'border-gray-100'}`}>{pin[i] ? '•' : ''}</div>))}</div>
              <VirtualKeyboard onKeyPress={(k) => handleKeyPress(k, 'pin')} onDelete={() => setPin(prev => prev.slice(0, -1))} onClear={() => setPin('')} />
            </div>
          </div>
          <button onClick={handleRegistration} disabled={!newName.trim() || pin.length < 4} className="w-full py-6 bg-red-600 text-white text-3xl font-black rounded-[2rem] hover:bg-red-700 disabled:opacity-20 shadow-xl transition-all">Registrar i Fitxar</button>
        </div>
      </div>
    );
  }

  if (step === 'ai-assistant') {
    return (
      <div className={`${containerClasses} flex flex-col bg-red-50/20`}>
        <header className="p-8 bg-white border-b border-red-100 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-5">
            <button onClick={() => changeStep('selection')} className="p-3 text-red-500 hover:bg-red-50 rounded-2xl">
              <ArrowLeft size={32} />
            </button>
            <div className="flex items-center gap-4">
               <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-white"><Bot size={32} /></div>
               <div><h2 className="text-2xl font-black text-gray-900">Assistent de Veu</h2><p className="text-sm font-bold text-green-500 uppercase tracking-widest">Tecnologia Gemini 3 Pro</p></div>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-start"><div className="bg-white p-6 rounded-[2rem] rounded-tl-none shadow-md border border-red-50 max-w-[80%]"><p className="text-lg text-gray-800 font-medium">Hola! Prem el botó del micròfon i parla. T'ajudaré amb el mòdul de <b>{course?.name}</b>.</p></div></div>
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`p-6 rounded-[2rem] shadow-md max-w-[85%] ${msg.role === 'user' ? 'bg-red-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-red-50'}`}><p className="text-lg font-medium whitespace-pre-wrap">{msg.text}</p></div></div>
            ))}
            {isTyping && <div className="flex justify-start animate-pulse"><div className="bg-white p-6 rounded-[2rem] rounded-tl-none shadow-md border border-red-50 flex items-center gap-3"><Loader2 className="animate-spin text-red-500" /> <span className="text-red-400 font-bold italic">Processant la teva veu...</span></div></div>}
            <div ref={chatEndRef} />
          </div>
        </div>
        <div className="p-12 bg-white border-t border-red-50 flex flex-col items-center gap-4">
           {!isRecording ? (
             <button onClick={startRecording} className="w-32 h-32 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-red-700 active:scale-95 transition-all animate-pulse">
               <Mic size={64} />
             </button>
           ) : (
             <button onClick={stopRecording} className="w-32 h-32 bg-red-950 text-white rounded-full flex items-center justify-center shadow-2xl animate-ping">
               <Square size={64} />
             </button>
           )}
           <p className="text-xl font-black text-red-600 uppercase tracking-widest">{isRecording ? 'Escoltant...' : 'Prem per parlar'}</p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className={`${containerClasses} flex flex-col items-center justify-center bg-red-600 text-white p-10 overflow-hidden relative`}>
        <div className="relative z-10 text-center">
          <div className="bg-white p-16 rounded-full shadow-2xl animate-bounce mb-12 flex items-center justify-center"><CheckCircle size={120} className="text-red-600" /></div>
          <h1 className="text-8xl font-black mb-6 tracking-tighter">Fitxat!</h1>
          <p className="text-4xl font-bold opacity-90">{selectedStudent?.name}</p>
          <div className="bg-white/20 px-10 py-4 rounded-full font-black text-2xl inline-block mt-8 backdrop-blur-md">Que tinguis una bona classe!</div>
        </div>
      </div>
    );
  }

  // Fallback a Pin si es perd l'estat
  if (step === 'pin') {
    return (
      <div className={`${containerClasses} flex flex-col items-center justify-center p-10 bg-red-50/20`}>
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl w-full max-w-lg text-center border border-red-50 relative">
          <button onClick={() => changeStep('selection')} className="absolute top-6 left-6 text-gray-300 hover:text-red-500 transition-colors"><ArrowLeft size={32} /></button>
          <div className="mb-8 pt-4">
            <div className="w-24 h-24 bg-red-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl"><span className="text-4xl font-black">{selectedStudent?.name.charAt(0)}</span></div>
            <h3 className="text-3xl font-black text-gray-900 mb-2">{selectedStudent?.name}</h3>
            <p className="text-red-400 font-bold">PIN de seguretat:</p>
          </div>
          <div className="flex justify-center gap-3 mb-10">
            {[...Array(6)].map((_, i) => (<div key={i} className={`w-12 h-16 border-4 rounded-xl flex items-center justify-center text-3xl font-black transition-all ${pin.length === i ? 'border-red-500 bg-red-50' : 'border-gray-100'}`}>{pin[i] ? '•' : ''}</div>))}
          </div>
          {error && <p className="text-red-600 font-black mb-6 animate-pulse">{error}</p>}
          <VirtualKeyboard onKeyPress={(k) => handleKeyPress(k, 'pin')} onDelete={() => setPin(prev => prev.slice(0, -1))} onClear={() => setPin('')} />
          <button onClick={handlePinSubmit} disabled={pin.length < 4} className="mt-8 w-full py-6 bg-red-600 text-white text-2xl font-black rounded-[2rem] shadow-xl hover:bg-red-700 transition-all">Verificar</button>
        </div>
      </div>
    );
  }

  return null;
};

export default KioskView;
