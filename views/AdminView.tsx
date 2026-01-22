
import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../dbService';
import { Student, Course, AttendanceLog, AppConfig } from '../types';
import { 
  Users, Calendar, BarChart3, LogOut, 
  Trash2, Plus, Edit3, AlertCircle, Search, 
  CheckCircle, Clock, Database, FileSpreadsheet, MessageSquare, X, Eye
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'courses' | 'logs' | 'database' | 'absences'>('dashboard');
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [config, setConfig] = useState<AppConfig>({ kioskCourseId: '1' });
  const [searchTerm, setSearchTerm] = useState('');
  const [logSearchTerm, setLogSearchTerm] = useState('');
  
  // Modals state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [viewingAbsence, setViewingAbsence] = useState<AttendanceLog | null>(null);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
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

  const handleSaveStudent = (e: React.FormEvent) => {
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const courseId = formData.get('courseId') as string;

    if (editingStudent) {
      dbService.updateStudent({ ...editingStudent, name, courseId });
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

  const handleSaveCourse = (e: React.FormEvent) => {
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const schedule = formData.get('schedule') as string;

    if (editingCourse) {
      dbService.updateCourse({ ...editingCourse, name, schedule });
    } else {
      const newCourse: Course = { id: Date.now().toString(), name, schedule };
      dbService.addCourse(newCourse);
    }
    refreshData();
    setIsAddingCourse(false);
    setEditingCourse(null);
  };

  const exportCSV = () => {
    const header = "DATA;HORA;ALUMNE;ID;CURS;ESTAT;JUSTIFICADA;MOTIU\n";
    const rows = logs.map(l => {
      const courseName = courses.find(c => c.id === l.courseId)?.name || 'N/A';
      return `${l.date};${l.timestamp};${l.studentName};${l.studentId};${courseName};${l.status.toUpperCase()};${l.isJustified ? 'SI' : 'NO'};${l.justificationReason || ''}`;
    }).join('\n');
    
    const bom = "\uFEFF";
    const csvContent = bom + header + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reports_Salesians_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const stats = useMemo(() => {
    const today = new Date().toLocaleDateString();
    const todayLogs = logs.filter(l => l.date === today && l.status === 'present');
    const presentCount = todayLogs.length;
    const totalCount = students.filter(s => s.courseId === config.kioskCourseId).length;
    return [
      { name: 'Presents', value: presentCount, color: '#ef4444' },
      { name: 'Absents', value: Math.max(0, totalCount - presentCount), color: '#450a0a' }
    ];
  }, [logs, students, config]);

  const absenceReports = useMemo(() => {
    return logs.filter(l => l.status === 'absent' && l.justificationReason).reverse();
  }, [logs]);

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-red-950 text-white flex flex-col z-20 print:hidden">
        <div className="p-8 flex items-center gap-3 border-b border-red-900">
          <Logo className="w-10 h-10" />
          <span className="font-black text-xl">Professor</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white text-red-950 shadow-lg' : 'hover:bg-red-900'}`}><BarChart3 size={18} /> Taulell</button>
          <button onClick={() => setActiveTab('absences')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'absences' ? 'bg-white text-red-950 shadow-lg' : 'hover:bg-red-900'}`}><MessageSquare size={18} /> Absències</button>
          <button onClick={() => setActiveTab('students')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'students' ? 'bg-white text-red-950 shadow-lg' : 'hover:bg-red-900'}`}><Users size={18} /> Alumnat</button>
          <button onClick={() => setActiveTab('courses')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'courses' ? 'bg-white text-red-950 shadow-lg' : 'hover:bg-red-900'}`}><Calendar size={18} /> Cursos</button>
          <button onClick={() => setActiveTab('logs')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'logs' ? 'bg-white text-red-950 shadow-lg' : 'hover:bg-red-900'}`}><Clock size={18} /> Històric</button>
          <button onClick={() => setActiveTab('database')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'database' ? 'bg-white text-red-950 shadow-lg' : 'hover:bg-red-900'}`}><Database size={18} /> Dades</button>
        </nav>
        <div className="p-4"><button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-300 hover:text-white font-bold transition-all"><LogOut size={18} /> Surt</button></div>
      </aside>

      <main className="flex-1 overflow-auto p-10">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Salesians Administration</h1>
          <div className="flex gap-4">
            <select value={config.kioskCourseId} onChange={(e) => handleUpdateConfig(e.target.value)} className="bg-white border-2 border-red-50 p-2 px-4 rounded-xl font-bold text-red-600 shadow-sm outline-none">{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-black mb-6">Assistència d'Avui</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" radius={[5, 5, 0, 0]} barSize={50}>{stats.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Bar></BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-red-600"><AlertCircle size={20} /> Absències Pendents</h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {absenceReports.slice(0, 5).map(report => (
                  <div key={report.id} className="p-4 rounded-2xl border bg-gray-50 flex flex-col gap-1">
                    <span className="font-black text-xs">{report.studentName}</span>
                    <p className="text-[10px] text-gray-500 line-clamp-2">{report.justificationReason}</p>
                    <div className="mt-2">
                       {report.isJustified ? <span className="bg-green-100 text-green-700 text-[9px] px-2 py-0.5 rounded-full font-black uppercase">Justificada IA</span> : <span className="bg-red-100 text-red-700 text-[9px] px-2 py-0.5 rounded-full font-black uppercase">No Justificada</span>}
                    </div>
                  </div>
                ))}
                {absenceReports.length === 0 && <p className="text-gray-400 text-xs text-center py-10">No hi ha avisos d'absència.</p>}
                <button onClick={() => setActiveTab('absences')} className="w-full py-2 text-xs font-black text-red-600 uppercase tracking-widest mt-2 hover:underline">Veure tots els reports</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'absences' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
               <h3 className="text-xl font-black">Reports d'Absència</h3>
               <button onClick={exportCSV} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold flex items-center gap-2"><FileSpreadsheet size={16} /> Exportar Excel</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {absenceReports.map(report => (
                <div key={report.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                   <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600 font-black">{report.studentName.charAt(0)}</div>
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${report.isJustified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {report.isJustified ? 'Justificada IA' : 'No Justificada'}
                      </span>
                   </div>
                   <h4 className="font-black text-gray-900 mb-1">{report.studentName}</h4>
                   <p className="text-[10px] text-gray-400 font-bold uppercase mb-3 flex items-center gap-1"><Clock size={12}/> {report.date} a les {report.timestamp}</p>
                   <div className="bg-gray-50 p-4 rounded-xl border mb-4">
                      <p className="text-xs text-gray-600 italic leading-relaxed">"{report.justificationReason}"</p>
                   </div>
                   <button 
                    onClick={() => setViewingAbsence(report)}
                    className="w-full py-3 bg-white border-2 border-red-50 text-red-600 rounded-xl text-xs font-black hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                   >
                     <Eye size={14} /> VEURE DETALLS
                   </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal de detalls de l'absència */}
        {viewingAbsence && (
          <div className="fixed inset-0 z-[100] bg-red-950/60 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl relative">
               <button onClick={() => setViewingAbsence(null)} className="absolute top-8 right-8 text-gray-300 hover:text-red-600"><X size={24}/></button>
               <h3 className="text-2xl font-black mb-2">Detalls de l'Absència</h3>
               <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-8">ID Report: {viewingAbsence.id}</p>
               
               <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black">{viewingAbsence.studentName.charAt(0)}</div>
                    <div>
                       <p className="font-black text-xl">{viewingAbsence.studentName}</p>
                       <p className="text-sm font-bold text-gray-400">{courses.find(c => c.id === viewingAbsence.courseId)?.name || 'Curs no especificat'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-gray-50 p-4 rounded-2xl border">
                        <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Data</label>
                        <p className="font-bold text-sm">{viewingAbsence.date}</p>
                     </div>
                     <div className="bg-gray-50 p-4 rounded-2xl border">
                        <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Estat IA</label>
                        <p className={`font-bold text-sm ${viewingAbsence.isJustified ? 'text-green-600' : 'text-red-600'}`}>
                           {viewingAbsence.isJustified ? 'APROVAT' : 'PENDENT/NO OFICIAL'}
                        </p>
                     </div>
                  </div>

                  <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                     <label className="text-[9px] font-black text-red-400 uppercase block mb-2">Informació de l'Alumne</label>
                     <p className="text-sm text-red-900 font-medium leading-relaxed italic">"{viewingAbsence.justificationReason}"</p>
                  </div>

                  <button 
                    onClick={() => setViewingAbsence(null)}
                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-100 active:scale-95 transition-all"
                  >
                    TANCAR DETALLS
                  </button>
               </div>
            </div>
          </div>
        )}

        {/* Altres pestanyes es mantenen igual o milloren en estil... */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
             <div className="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} /><input type="text" placeholder="Cerca..." value={logSearchTerm} onChange={(e) => setLogSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border rounded-xl bg-gray-50 text-sm" /></div>
              <button onClick={exportCSV} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold flex items-center gap-2"><FileSpreadsheet size={16} /> Excel</button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-black"><tr className="border-b"><th className="px-6 py-4">Data</th><th className="px-6 py-4">Alumne</th><th className="px-6 py-4">Estat</th><th className="px-6 py-4">Motiu / Justificant</th></tr></thead>
                <tbody>{logs.slice().reverse().map(log => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-xs font-mono">{log.date} {log.timestamp}</td>
                      <td className="px-6 py-4 font-bold">{log.studentName}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${log.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{log.status}</span>
                      </td>
                      <td className="px-6 py-4 text-xs italic text-gray-500">{log.justificationReason || '-'}</td>
                    </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center"><h3 className="font-black text-xl">Llistat d'Alumnat</h3><button onClick={() => setIsAddingStudent(true)} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold flex items-center gap-2"><Plus size={16} /> Nou Alumne</button></div>
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead><tr className="bg-gray-50 border-b text-[10px] font-black uppercase text-gray-400"><th className="px-6 py-4">ID</th><th className="px-6 py-4">Nom</th><th className="px-6 py-4 text-right">Accions</th></tr></thead>
                <tbody>{students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(student => (
                  <tr key={student.id} className="border-b hover:bg-red-50/20">
                    <td className="px-6 py-4 text-xs font-mono text-gray-400">{student.id}</td>
                    <td className="px-6 py-4 font-bold">{student.name}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setEditingStudent(student)} className="p-2 text-gray-400 hover:text-red-600"><Edit3 size={16} /></button>
                      <button onClick={() => {if(confirm('Eliminar?')) {dbService.deleteStudent(student.id); refreshData();}}} className="p-2 text-gray-400 hover:text-red-900"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'courses' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center"><h3 className="font-black text-xl">Configuració de Cursos</h3><button onClick={() => setIsAddingCourse(true)} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold flex items-center gap-2"><Plus size={16} /> Nou Curs</button></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{courses.map(c => (
              <div key={c.id} className="bg-white p-6 rounded-2xl border shadow-sm group">
                <div className="flex justify-between mb-4"><div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center font-black">{c.name.charAt(0)}</div><button onClick={() => setEditingCourse(c)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-600"><Edit3 size={16} /></button></div>
                <h4 className="font-black text-sm">{c.name}</h4><p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{c.schedule}</p>
              </div>
            ))}</div>
          </div>
        )}

        {(isAddingStudent || editingStudent) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-red-950/60 backdrop-blur-sm p-6">
             <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
               <h2 className="text-xl font-black mb-6">{editingStudent ? 'Editar' : 'Nou'} Alumne</h2>
               <form onSubmit={handleSaveStudent} className="space-y-4">
                 <div><label className="text-[10px] font-black uppercase text-gray-400">Nom</label><input name="name" defaultValue={editingStudent?.name} required className="w-full p-4 bg-gray-50 border-2 rounded-xl font-bold focus:border-red-500 outline-none" /></div>
                 <div><label className="text-[10px] font-black uppercase text-gray-400">Curs</label><select name="courseId" defaultValue={editingStudent?.courseId || config.kioskCourseId} className="w-full p-4 bg-gray-50 border-2 rounded-xl font-bold focus:border-red-500 outline-none">{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                 <div className="flex gap-2 pt-4"><button type="button" onClick={() => {setIsAddingStudent(false); setEditingStudent(null);}} className="flex-1 py-3 font-bold text-gray-400">Cancel·la</button><button type="submit" className="flex-2 py-4 px-8 bg-red-600 text-white rounded-xl font-black shadow-lg">Guardar Alumne</button></div>
               </form>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminView;
