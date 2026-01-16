
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { dbService } from '../dbService';
import { Student, Course, AttendanceLog, AppConfig } from '../types';
import { 
  Users, Calendar, BarChart3, LogOut, 
  Trash2, Plus, Edit3, AlertCircle, Search, 
  CheckCircle, Clock, Database, Download, Upload, FileText, Printer, X, FileSpreadsheet
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { Logo } from '../components/Logo';

interface AdminViewProps {
  onLogout: () => void;
}

const AdminView: React.FC<AdminViewProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'courses' | 'logs' | 'database'>('dashboard');
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [config, setConfig] = useState<AppConfig>({ kioskCourseId: '1' });
  const [searchTerm, setSearchTerm] = useState('');
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Modals state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  
  const [selectedStudentReport, setSelectedStudentReport] = useState<Student | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setStudents(dbService.getStudents());
    setCourses(dbService.getCourses());
    setLogs(dbService.getAttendanceLogs());
    setConfig(dbService.getConfig());
  };

  const handleUpdateConfig = (courseId: string) => {
    const newConfig = { ...config, kioskCourseId: courseId };
    setConfig(newConfig);
    dbService.saveConfig(newConfig);
  };

  // Fix for Error: Cannot find name 'handleSaveStudent'.
  const handleSaveStudent = (e: React.FormEvent) => {
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const courseId = formData.get('courseId') as string;

    if (editingStudent) {
      dbService.updateStudent({
        ...editingStudent,
        name,
        courseId
      });
    } else {
      const newStudent: Student = {
        id: Date.now().toString(),
        name,
        courseId,
        pin: null,
        status: 'absent'
      };
      dbService.addStudent(newStudent);
    }
    refreshData();
    setIsAddingStudent(false);
    setEditingStudent(null);
  };

  // Fix for Error: Cannot find name 'handleSaveCourse'.
  const handleSaveCourse = (e: React.FormEvent) => {
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const schedule = formData.get('schedule') as string;

    if (editingCourse) {
      dbService.updateCourse({
        ...editingCourse,
        name,
        schedule
      });
    } else {
      const newCourse: Course = {
        id: Date.now().toString(),
        name,
        schedule
      };
      dbService.addCourse(newCourse);
    }
    refreshData();
    setIsAddingCourse(false);
    setEditingCourse(null);
  };

  const exportCSV = () => {
    // Generació d'un CSV compatible amb Excel amb codificació UTF-8 i format visual
    const header = "DATA;HORA;ALUMNE;ID;CURS;ESTAT\n";
    const rows = logs.map(l => {
      const courseName = courses.find(c => c.id === l.courseId)?.name || 'N/A';
      return `${l.date};${l.timestamp};${l.studentName};${l.studentId};${courseName};PRESENT`;
    }).join('\n');
    
    const bom = "\uFEFF"; // Byte Order Mark per a que Excel detecti UTF-8 correctament
    const csvContent = bom + header + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SalesiansCheck_Taula_Assistència_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportDB = () => {
    const data = dbService.exportFullDatabase();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salesianscheck_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const printReport = () => {
    window.print();
  };

  const getStudentStats = (studentId: string) => {
    const studentLogs = logs.filter(l => l.studentId === studentId);
    const totalSessions = 20; 
    const present = studentLogs.length;
    const absent = Math.max(0, totalSessions - present);
    return { present, absent, totalSessions, history: studentLogs };
  };

  const stats = useMemo(() => {
    const today = new Date().toLocaleDateString();
    const todayLogs = logs.filter(l => l.date === today);
    const present = todayLogs.length;
    const total = students.filter(s => s.courseId === config.kioskCourseId).length;
    const absent = Math.max(0, total - present);
    return [
      { name: 'Presents', value: present, color: '#ef4444' },
      { name: 'Absents', value: absent, color: '#450a0a' }
    ];
  }, [logs, students, config]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => 
      l.studentName.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
      l.studentId.includes(logSearchTerm)
    ).reverse();
  }, [logs, logSearchTerm]);

  return (
    <div className="flex h-screen bg-red-50/20">
      <aside className="w-72 bg-red-950 text-white flex flex-col shadow-2xl z-20 print:hidden">
        <div className="p-10 flex items-center gap-4 border-b border-red-900/50">
          <Logo className="w-12 h-12 rounded-lg" />
          <span className="text-2xl font-black tracking-tighter">Professor</span>
        </div>
        <nav className="flex-1 p-6 space-y-2 mt-6">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${activeTab === 'dashboard' ? 'bg-white text-red-950 shadow-xl' : 'hover:bg-red-900/40 text-red-100'}`}><BarChart3 size={20} /><span className="font-bold">Taulell</span></button>
          <button onClick={() => setActiveTab('students')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${activeTab === 'students' ? 'bg-white text-red-950 shadow-xl' : 'hover:bg-red-900/40 text-red-100'}`}><Users size={20} /><span className="font-bold">Alumnat</span></button>
          <button onClick={() => setActiveTab('courses')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${activeTab === 'courses' ? 'bg-white text-red-950 shadow-xl' : 'hover:bg-red-900/40 text-red-100'}`}><Calendar size={20} /><span className="font-bold">Cursos</span></button>
          <button onClick={() => setActiveTab('logs')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${activeTab === 'logs' ? 'bg-white text-red-950 shadow-xl' : 'hover:bg-red-900/40 text-red-100'}`}><Clock size={20} /><span className="font-bold">Registre</span></button>
          <button onClick={() => setActiveTab('database')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${activeTab === 'database' ? 'bg-white text-red-950 shadow-xl' : 'hover:bg-red-900/40 text-red-100'}`}><Database size={20} /><span className="font-bold">Dades</span></button>
        </nav>
        <div className="p-6 border-t border-red-900/50">
          <button onClick={onLogout} className="w-full flex items-center gap-4 px-6 py-4 text-red-200 hover:text-white hover:bg-red-500/20 rounded-2xl font-bold transition-all"><LogOut size={20} /><span>Surt</span></button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-12 print:p-0 print:bg-white">
        <header className="flex justify-between items-center mb-12 print:hidden">
          <div><h1 className="text-5xl font-black text-gray-900 tracking-tighter">Control Central</h1><p className="text-red-400 font-bold text-lg mt-1">Gestió acadèmica SalesiansCheck</p></div>
          <div className="bg-white px-8 py-4 rounded-3xl shadow-xl border border-red-50 flex items-center gap-6"><span className="text-xs font-black text-red-300 uppercase tracking-widest">Curs Actiu</span>
            <select value={config.kioskCourseId} onChange={(e) => handleUpdateConfig(e.target.value)} className="bg-transparent font-black text-red-600 focus:outline-none cursor-pointer text-xl">{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] shadow-xl border border-red-50">
              <h3 className="text-2xl font-black mb-8 flex items-center gap-3 text-gray-800"><BarChart3 className="text-red-600" size={28} /> Assistència d'avui</h3>
              <div className="h-80">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={stats}><CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#fee2e2" /><XAxis dataKey="name" tick={{fontSize: 12, fontWeight: '800'}} /><YAxis /><Tooltip /><Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={60}>{stats.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Bar></BarChart>
                 </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-red-50">
                <h3 className="text-2xl font-black mb-2 flex items-center gap-3 text-gray-800"><AlertCircle className="text-red-600" size={28} /> Absències</h3>
                <p className="text-xs text-red-400 mb-6 font-bold uppercase tracking-widest">Alumnat sense fitxar</p>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                   {students.filter(s => s.courseId === config.kioskCourseId && !logs.some(l => l.studentId === s.id && l.date === new Date().toLocaleDateString())).map(s => (
                      <div key={s.id} className="flex items-center gap-4 p-3 rounded-xl bg-red-50/50 border border-red-100"><div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div><span className="text-gray-900 font-bold">{s.name}</span></div>
                    ))}
                </div>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-lg border border-red-50">
              <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-red-300" size={20} /><input type="text" placeholder="Cercar alumne..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 pr-6 py-3 w-80 border-2 border-gray-100 rounded-xl bg-gray-50 font-bold" /></div>
              <div className="flex gap-3">
                <button onClick={() => setIsBulkImporting(true)} className="px-6 py-3 bg-red-50 text-red-600 rounded-xl font-black flex items-center gap-2"><Upload size={20} /> Importar Llistat</button>
                <button onClick={() => setIsAddingStudent(true)} className="px-6 py-3 bg-red-600 text-white rounded-xl font-black flex items-center gap-2"><Plus size={20} /> Nou Alumne</button>
              </div>
            </div>
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-red-50">
              <table className="w-full text-left">
                <thead><tr className="bg-red-50 text-red-400 uppercase text-[10px] font-black border-b border-red-50"><th className="px-8 py-5">Identificador</th><th className="px-8 py-5">Nom Complet</th><th className="px-8 py-5">Mòdul</th><th className="px-8 py-5 text-right">Accions</th></tr></thead>
                <tbody>{students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(student => (
                    <tr key={student.id} className="hover:bg-red-50/10 border-b border-red-50 transition-colors">
                      <td className="px-8 py-5 font-mono text-xs text-gray-400">{student.id}</td>
                      <td className="px-8 py-5 font-black text-gray-800">{student.name}</td>
                      <td className="px-8 py-5"><span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase">{courses.find(c => c.id === student.courseId)?.name || 'N/A'}</span></td>
                      <td className="px-8 py-5 text-right space-x-2">
                        <button onClick={() => setSelectedStudentReport(student)} className="p-2 text-gray-400 hover:text-blue-600"><FileText size={18} /></button>
                        <button onClick={() => setEditingStudent(student)} className="p-2 text-gray-400 hover:text-red-600"><Edit3 size={18} /></button>
                        <button onClick={() => {if(confirm('Eliminar?')) {dbService.deleteStudent(student.id); refreshData();}}} className="p-2 text-gray-400 hover:text-red-900"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-6">
             <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-lg border border-red-50">
              <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-red-300" size={20} /><input type="text" placeholder="Cercar al registre..." value={logSearchTerm} onChange={(e) => setLogSearchTerm(e.target.value)} className="pl-12 pr-6 py-3 w-96 border-2 border-gray-100 rounded-xl bg-gray-50 font-bold" /></div>
              <button onClick={exportCSV} className="px-6 py-3 bg-green-600 text-white rounded-xl font-black flex items-center gap-2"><FileSpreadsheet size={20} /> Exportar Excel</button>
            </div>
            <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-red-50">
              <table className="w-full text-left">
                <thead><tr className="bg-red-50 text-red-400 uppercase text-[10px] font-black border-b border-red-50"><th className="px-8 py-5">Data</th><th className="px-8 py-5">Hora</th><th className="px-8 py-5">Alumne</th><th className="px-8 py-5">Estat</th></tr></thead>
                <tbody>{filteredLogs.slice(0, 100).map(log => (
                    <tr key={log.id} className="border-b border-red-50 hover:bg-gray-50/50">
                      <td className="px-8 py-5 font-mono text-xs text-gray-400">{log.date}</td>
                      <td className="px-8 py-5 font-mono text-xs text-gray-400">{log.timestamp}</td>
                      <td className="px-8 py-5 font-black text-gray-800">{log.studentName}</td>
                      <td className="px-8 py-5"><span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase">Present</span></td>
                    </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'database' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-red-50">
                <div className="flex items-center gap-4 mb-8"><Download className="text-red-600" size={32} /><div><h3 className="text-2xl font-black">Còpia JSON</h3><p className="text-sm text-gray-500 font-medium">Full backup.</p></div></div>
                <button onClick={exportDB} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-red-700">Descarregar JSON</button>
              </div>
              <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-red-50">
                <div className="flex items-center gap-4 mb-8"><FileSpreadsheet className="text-green-600" size={32} /><div><h3 className="text-2xl font-black">Taula Visual</h3><p className="text-sm text-gray-500 font-medium">Excel format.</p></div></div>
                <button onClick={exportCSV} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-green-700">Generar Excel</button>
              </div>
              <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-red-50">
                <div className="flex items-center gap-4 mb-8"><Upload className="text-blue-600" size={32} /><div><h3 className="text-2xl font-black">Restaurar</h3><p className="text-sm text-gray-500 font-medium">Carregar fitxer.</p></div></div>
                <label className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl text-center cursor-pointer">
                  Triar Fitxer <input type="file" accept=".json" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (dbService.importFullDatabase(ev.target?.result as string)) { alert('Fet!'); refreshData(); }
                        else alert('Error!');
                      };
                      reader.readAsText(file);
                    }
                  }} />
                </label>
              </div>
            </div>
            <div className="bg-red-950 text-red-200 p-10 rounded-[2.5rem] shadow-2xl overflow-hidden">
               <h3 className="text-xl font-black mb-6">Visualitzador Raw (Dades en Viu)</h3>
               <div className="bg-black/30 p-8 rounded-2xl font-mono text-xs max-h-[500px] overflow-auto whitespace-pre border border-red-900 custom-scrollbar">{dbService.exportFullDatabase()}</div>
            </div>
          </div>
        )}

        {/* Cursos Tab */}
        {activeTab === 'courses' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center"><h3 className="text-3xl font-black text-gray-800">Assignatures i Horaris</h3><button onClick={() => setIsAddingCourse(true)} className="px-6 py-3 bg-red-600 text-white rounded-xl font-black flex items-center gap-2"><Plus size={20} /> Nou Curs</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{courses.map(course => (
                <div key={course.id} className="group p-8 bg-white border border-red-100 rounded-[2rem] shadow-lg relative overflow-hidden transition-all hover:shadow-2xl">
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 flex gap-2"><button onClick={() => setEditingCourse(course)} className="p-2 bg-white shadow-md rounded-lg text-gray-400 hover:text-red-600"><Edit3 size={16} /></button><button onClick={() => {if(confirm('Eliminar?')) {dbService.deleteCourse(course.id); refreshData();}}} className="p-2 bg-white shadow-md rounded-lg text-gray-400 hover:text-red-900"><Trash2 size={16} /></button></div>
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6 font-black text-xl">{course.name.charAt(0)}</div>
                  <h4 className="text-xl font-black text-gray-900 mb-2">{course.name}</h4><p className="text-red-400 font-bold text-sm uppercase">{course.schedule}</p>
                </div>
            ))}</div>
          </div>
        )}

        {/* Modals Alumne / Curs / Report detallat (mantinguts igual però amb botons "Enrere" clars) */}
        {(isAddingStudent || editingStudent) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-950/40 backdrop-blur-sm p-6">
             <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl border border-red-100">
               <h2 className="text-3xl font-black mb-6 text-red-950 tracking-tighter">{editingStudent ? 'Editar Alumne' : 'Nou Alumne'}</h2>
               <form onSubmit={(e) => { e.preventDefault(); handleSaveStudent(e); }} className="space-y-4">
                 <div><label className="block text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Nom de l'Alumne</label><input name="name" defaultValue={editingStudent?.name} required className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold text-lg focus:border-red-500 outline-none transition-all" /></div>
                 <div><label className="block text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Assignar Curs</label><select name="courseId" defaultValue={editingStudent?.courseId || config.kioskCourseId} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold text-lg focus:border-red-500 outline-none transition-all">{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                 <div className="flex gap-4 pt-4"><button type="button" onClick={() => {setIsAddingStudent(false); setEditingStudent(null);}} className="flex-1 py-4 font-bold text-red-300">Enrere</button><button type="submit" className="flex-[2] py-4 font-black bg-red-600 text-white rounded-xl shadow-lg hover:bg-red-700">Guardar</button></div>
               </form>
             </div>
          </div>
        )}

        {(isAddingCourse || editingCourse) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-950/40 backdrop-blur-sm p-6">
             <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl border border-red-100">
               <h2 className="text-3xl font-black mb-6 text-red-950 tracking-tighter">{editingCourse ? 'Editar Curs' : 'Nou Curs'}</h2>
               <form onSubmit={(e) => { e.preventDefault(); handleSaveCourse(e); }} className="space-y-4">
                 <div><label className="block text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Nom del Mòdul</label><input name="name" defaultValue={editingCourse?.name} required placeholder="Ex: Xarxes..." className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold text-lg focus:border-red-500 outline-none transition-all" /></div>
                 <div><label className="block text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Horari / Sessió</label><input name="schedule" defaultValue={editingCourse?.schedule} required placeholder="Ex: Dilluns 08:00..." className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold text-lg focus:border-red-500 outline-none transition-all" /></div>
                 <div className="flex gap-4 pt-4"><button type="button" onClick={() => {setIsAddingCourse(false); setEditingCourse(null);}} className="flex-1 py-4 font-bold text-red-300">Enrere</button><button type="submit" className="flex-[2] py-4 font-black bg-red-600 text-white rounded-xl shadow-lg hover:bg-red-700">Guardar Curs</button></div>
               </form>
             </div>
          </div>
        )}

        {selectedStudentReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-950/60 backdrop-blur-md p-6 print:p-0 print:bg-white">
             <div ref={reportRef} className="bg-white rounded-[3rem] w-full max-w-4xl p-16 shadow-2xl relative overflow-hidden print:shadow-none print:rounded-none">
               <button onClick={() => setSelectedStudentReport(null)} className="absolute top-8 right-8 p-3 bg-red-50 text-red-600 rounded-full print:hidden"><X size={24} /></button>
               <div className="flex justify-between items-start mb-16 border-b-4 border-red-600 pb-8">
                 <div><h2 className="text-4xl font-black text-red-950 mb-2">Report Individual</h2><p className="text-gray-400 font-bold text-xs uppercase">Salesians de Terrassa - Informàtica</p></div>
                 <Logo className="w-20 h-20" />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
                 <div><h4 className="text-[10px] font-black text-red-400 uppercase mb-6">Detalls de l'Alumne</h4><div className="space-y-4">
                      <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-400">Nom:</span><span className="font-black text-gray-900">{selectedStudentReport.name}</span></div>
                      <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-400">Mòdul:</span><span className="font-black text-red-600">{courses.find(c => c.id === selectedStudentReport.courseId)?.name}</span></div>
                    </div></div>
                 <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 text-center"><h4 className="text-[10px] font-black text-red-400 uppercase mb-4">Assistència</h4><div className="flex gap-8 items-center justify-center">
                       <div><p className="text-4xl font-black text-green-600">{getStudentStats(selectedStudentReport.id).present}</p><p className="text-[10px] font-black text-gray-400">Presents</p></div>
                       <div className="w-px h-12 bg-gray-200"></div>
                       <div><p className="text-4xl font-black text-red-600">{getStudentStats(selectedStudentReport.id).absent}</p><p className="text-[10px] font-black text-gray-400">Faltes</p></div>
                    </div></div>
               </div>
               <div className="mt-16 flex gap-4 print:hidden"><button onClick={printReport} className="flex-1 py-5 bg-red-600 text-white rounded-2xl font-black shadow-xl hover:bg-red-700 transition-all flex items-center justify-center gap-3"><Printer size={24} /> Imprimir PDF</button></div>
               <p className="mt-12 text-[10px] text-gray-300 text-center font-bold uppercase tracking-[0.4em] print:mt-24">Generat per SalesiansCheck - Sistema Oficial</p>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminView;
