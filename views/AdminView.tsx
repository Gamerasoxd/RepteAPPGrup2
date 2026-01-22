
import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../dbService';
import { Student, Course, AttendanceLog, AppConfig } from '../types';
import { 
  Users, Calendar, BarChart3, LogOut, 
  Trash2, Edit3, Search, 
  Clock, Database, MessageSquare, X,
  HardDrive, Download, 
  TrendingUp, Loader2, RefreshCw, Power, ShieldAlert,
  CheckCircle, FileText, AlertCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { Logo } from '../components/Logo';

interface AdminViewProps {
  onLogout: () => void;
}

type Timeframe = 'day' | 'week' | 'month' | 'year';

const AdminView: React.FC<AdminViewProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'courses' | 'logs' | 'database' | 'absences'>('dashboard');
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [config, setConfig] = useState<AppConfig>({ kioskCourseId: '1' });
  const [dbStats, setDbStats] = useState({ total_students: 0, total_courses: 0, total_logs: 0, justified_absences: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isDbOnline, setIsDbOnline] = useState<boolean | null>(null);
  
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<Timeframe>('month');

  useEffect(() => {
    refreshData();
    const interval = setInterval(async () => {
      const status = await dbService.checkConnection();
      setIsDbOnline(status);
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [studentsData, logsData, coursesData, configData, statsData, connection] = await Promise.all([
        dbService.getStudents(),
        dbService.getAttendanceLogs(),
        dbService.getCourses(),
        dbService.getConfig(),
        dbService.getDbStats(),
        dbService.checkConnection()
      ]);
      setStudents(studentsData);
      setCourses(coursesData);
      setLogs(logsData);
      setConfig(configData);
      setDbStats(statsData);
      setIsDbOnline(connection);
    } catch (e) {
      console.error("Error refreshData:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateConfig = async (courseId: string) => {
    const newCfg = { kioskCourseId: courseId };
    setConfig(newCfg);
    await dbService.saveConfig(newCfg);
    await refreshData();
  };

  const handleReset = async () => {
    if (!confirm("ATENCIÓ: Vols reiniciar el sistema? Aquesta acció esborrarà tots els registres d'assistència i restablirà els alumnes de mostra.")) return;
    setIsLoading(true);
    await dbService.resetSystem();
    await refreshData();
  };

  const exportToCSV = () => {
    const activeCourseName = courses.find(c => c.id === config.kioskCourseId)?.name || 'General';
    const courseLogs = logs.filter(l => l.courseId === config.kioskCourseId);
    let csv = "Alumne,Data,Hora,Estat,Justificat,Motiu\n";
    courseLogs.forEach(l => {
      csv += `"${l.studentName}","${l.date}","${l.timestamp}","${l.status}","${l.isJustified ? 'SI' : 'NO'}","${l.justificationReason || ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `asistencia_${activeCourseName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
      (activeTab === 'students' ? true : s.courseId === config.kioskCourseId)
    );
  }, [students, searchTerm, config.kioskCourseId, activeTab]);

  const statsChart = useMemo(() => {
    const today = new Date().toLocaleDateString();
    const courseLogs = logs.filter(l => l.courseId === config.kioskCourseId && l.date === today);
    const presentCount = courseLogs.filter(l => l.status === 'present').length;
    const totalInCourse = students.filter(s => s.courseId === config.kioskCourseId).length;
    return [
      { name: 'Presents', value: presentCount, color: '#ef4444' },
      { name: 'Absents', value: Math.max(0, totalInCourse - presentCount), color: '#450a0a' }
    ];
  }, [logs, students, config.kioskCourseId]);

  const getStudentStats = (studentId: string) => {
    const now = new Date();
    const filteredLogs = logs.filter(l => {
      if (l.studentId !== studentId) return false;
      const [d, m, y] = l.date.split('/');
      const logDate = new Date(`${y}-${m}-${d}`);
      
      if (timeFilter === 'day') return l.date === now.toLocaleDateString();
      if (timeFilter === 'week') return (now.getTime() - logDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
      if (timeFilter === 'month') return (now.getTime() - logDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
      if (timeFilter === 'year') return logDate.getFullYear() === now.getFullYear();
      return true;
    });

    const lates = filteredLogs.filter(l => l.status === 'late').length;
    const absences = filteredLogs.filter(l => l.status === 'absent').length;
    const justified = filteredLogs.filter(l => l.status === 'absent' && l.isJustified).length;
    
    let divisor = 1;
    if (timeFilter === 'day') divisor = 1;
    if (timeFilter === 'week') divisor = 5;
    if (timeFilter === 'month') divisor = 20;
    if (timeFilter === 'year') divisor = 180;

    const rate = Math.max(0, Math.min(100, Math.round(((divisor - (absences - justified)) / divisor) * 100)));
    return { lates, absences, justified, rate };
  };

  const justifiedLogs = useMemo(() => {
    return logs.filter(l => l.status === 'absent' && l.isJustified).reverse();
  }, [logs]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="w-64 bg-red-950 text-white flex flex-col z-20 shadow-2xl">
        <div className="p-8 flex items-center gap-3 border-b border-red-900">
          <Logo className="w-10 h-10" />
          <span className="font-black text-xl tracking-tighter uppercase">Professor</span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white text-red-950 shadow-lg' : 'hover:bg-red-900/50'}`}><BarChart3 size={18} /> Taulell</button>
          <button onClick={() => setActiveTab('absences')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'absences' ? 'bg-white text-red-950 shadow-lg' : 'hover:bg-red-900/50'}`}><MessageSquare size={18} /> Absències {justifiedLogs.length > 0 && <span className="ml-auto bg-red-600 text-[10px] px-2 py-0.5 rounded-full">{justifiedLogs.length}</span>}</button>
          <button onClick={() => setActiveTab('students')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'students' ? 'bg-white text-red-950 shadow-lg' : 'hover:bg-red-900/50'}`}><Users size={18} /> Alumnat</button>
          <button onClick={() => setActiveTab('courses')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'courses' ? 'bg-white text-red-950 shadow-lg' : 'hover:bg-red-900/50'}`}><Calendar size={18} /> Cursos</button>
          <button onClick={() => setActiveTab('logs')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'logs' ? 'bg-white text-red-950 shadow-lg' : 'hover:bg-red-900/50'}`}><Clock size={18} /> Històric</button>
          <div className="pt-4 mt-4 border-t border-red-900/30">
            <button onClick={() => setActiveTab('database')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'database' ? 'bg-white text-red-950 shadow-lg' : 'hover:bg-red-900/50 opacity-60'}`}><Database size={18} /> Dades</button>
          </div>
        </nav>
        <div className="p-4"><button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-300 hover:text-white font-bold transition-all"><LogOut size={18} /> Surt</button></div>
      </aside>

      <main className="flex-1 overflow-auto p-10 bg-gray-50/50 relative">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
             <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Salesians Admin</h1>
             <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border shadow-sm">
                <div className={`w-2 h-2 rounded-full ${isDbOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px] font-black uppercase text-gray-500">{isDbOnline ? 'En línia' : 'Offline'}</span>
             </div>
          </div>
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
              <input type="text" placeholder="Cerca alumne..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-white border-2 border-gray-100 p-2 pl-10 pr-4 rounded-xl font-bold text-sm shadow-sm outline-none focus:border-red-500" />
            </div>
            <select value={config.kioskCourseId} onChange={(e) => handleUpdateConfig(e.target.value)} className="bg-white border-2 border-red-50 p-2 px-4 rounded-xl font-bold text-red-600 shadow-sm outline-none cursor-pointer">
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center h-[60vh]"><Loader2 className="animate-spin text-red-600" size={48} /></div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl border shadow-sm">
                  <h3 className="text-lg font-black mb-6">Assistència d'Avui</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statsChart}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="value" radius={[5,5,0,0]} barSize={50}>{statsChart.map((e,i)=><Cell key={i} fill={e.color}/>)}</Bar></BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-3xl border shadow-sm flex flex-col">
                  <h3 className="text-lg font-black mb-6 text-red-600">Avisos recents</h3>
                  <div className="flex-1 space-y-4">
                    {justifiedLogs.slice(0, 3).map(log => (
                      <div key={log.id} className="p-4 bg-gray-50 rounded-xl border hover:border-red-200 transition-all cursor-pointer" onClick={() => setActiveTab('absences')}>
                        <p className="font-black text-xs">{log.studentName}</p>
                        <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 italic">"{log.justificationReason}"</p>
                      </div>
                    ))}
                    {justifiedLogs.length === 0 && <div className="text-center py-10 opacity-30 text-xs font-bold uppercase">Sense avisos</div>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'students' && (
              <div className="bg-white p-8 rounded-[2rem] border shadow-sm">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black flex items-center gap-3 text-red-600"><TrendingUp/> Seguiment Alumnat</h3>
                    <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                       {(['day', 'week', 'month', 'year'] as Timeframe[]).map(f => (
                         <button key={f} onClick={() => setTimeFilter(f)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${timeFilter === f ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>{f === 'day' ? 'Avui' : f === 'week' ? 'Setmana' : f === 'month' ? 'Mes' : 'Any'}</button>
                       ))}
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {filteredStudents.map(student => {
                     const stats = getStudentStats(student.id);
                     return (
                       <div key={student.id} className="p-6 bg-gray-50 rounded-2xl border flex flex-col hover:border-red-200 transition-all">
                         <div className="flex justify-between items-start mb-4">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-white border-2 border-red-50 text-red-600 font-black flex items-center justify-center rounded-xl">{student.name.charAt(0)}</div>
                             <div>
                               <p className="font-black text-gray-900 text-sm leading-tight">{student.name}</p>
                               <p className="text-[10px] text-gray-400 font-bold uppercase">ID: {student.id}</p>
                             </div>
                           </div>
                           <div className="flex gap-2">
                             <button onClick={() => setEditingStudent(student)} className="p-2 text-blue-400 bg-white rounded-lg border shadow-sm"><Edit3 size={14}/></button>
                             <button onClick={() => dbService.deleteStudent(student.id).then(refreshData)} className="p-2 text-red-400 bg-white rounded-lg border shadow-sm"><Trash2 size={14}/></button>
                           </div>
                         </div>
                         <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="p-2 bg-white rounded-xl border text-center">
                              <p className="text-[8px] font-black text-gray-400 uppercase">Retards</p>
                              <p className={`font-black ${stats.lates > 3 ? 'text-red-600' : 'text-gray-900'}`}>{stats.lates}</p>
                            </div>
                            <div className="p-2 bg-white rounded-xl border text-center">
                              <p className="text-[8px] font-black text-gray-400 uppercase">Faltes</p>
                              <p className="font-black text-gray-900">{stats.absences}</p>
                            </div>
                            <div className="p-2 bg-white rounded-xl border text-center">
                              <p className="text-[8px] font-black text-gray-400 uppercase">Justif.</p>
                              <p className="font-black text-green-600">{stats.justified}</p>
                            </div>
                         </div>
                         <div>
                            <div className="flex justify-between items-center mb-1">
                               <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Taxa Assistència ({timeFilter})</span>
                               <span className={`text-[10px] font-black ${stats.rate > 90 ? 'text-green-600' : stats.rate > 70 ? 'text-orange-600' : 'text-red-600'}`}>{stats.rate}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                               <div className={`h-full rounded-full transition-all duration-1000 ${stats.rate > 90 ? 'bg-green-500' : stats.rate > 70 ? 'bg-orange-500' : 'bg-red-500'}`} style={{width: `${stats.rate}%`}} />
                            </div>
                         </div>
                       </div>
                     );
                   })}
                 </div>
              </div>
            )}

            {activeTab === 'absences' && (
              <div className="bg-white p-8 rounded-[2rem] border shadow-sm">
                <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-red-600"><MessageSquare/> Justificacions Recents</h3>
                <div className="space-y-4">
                  {justifiedLogs.map(log => (
                    <div key={log.id} className="p-6 bg-gray-50 rounded-2xl border flex flex-col md:flex-row gap-6">
                      <div className="flex items-center gap-4 md:w-1/3">
                        <div className="w-12 h-12 bg-red-600 text-white font-black flex items-center justify-center rounded-2xl shrink-0">{log.studentName.charAt(0)}</div>
                        <div>
                          <p className="font-black text-gray-900">{log.studentName}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{log.date} · {log.timestamp}</p>
                        </div>
                      </div>
                      <div className="flex-1 bg-white p-4 rounded-xl border italic text-sm text-gray-600">"{log.justificationReason}"</div>
                      <div className="flex items-center justify-center md:w-32"><span className="px-4 py-1 bg-green-100 text-green-700 text-[10px] font-black rounded-full uppercase">Validat IA</span></div>
                    </div>
                  ))}
                  {justifiedLogs.length === 0 && <div className="text-center py-20 opacity-30 font-black uppercase tracking-widest">Sense justificacions pendents</div>}
                </div>
              </div>
            )}

            {activeTab === 'courses' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {courses.map(course => (
                  <div key={course.id} className={`p-8 bg-white rounded-3xl border shadow-sm transition-all ${config.kioskCourseId === course.id ? 'border-red-600 shadow-xl scale-105' : 'border-gray-100 hover:border-red-200'}`}>
                    <div className="w-12 h-12 bg-red-50 text-red-600 flex items-center justify-center rounded-2xl mb-6"><Calendar size={24}/></div>
                    <h4 className="text-xl font-black text-gray-900 mb-1">{course.name}</h4>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">{course.schedule}</p>
                    <button onClick={() => handleUpdateConfig(course.id)} className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${config.kioskCourseId === course.id ? 'bg-gray-100 text-gray-400 cursor-default' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                      {config.kioskCourseId === course.id ? 'Seleccionat per Quiosc' : 'Configurar Quiosc'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="bg-white p-8 rounded-[2rem] border shadow-sm overflow-hidden">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black flex items-center gap-3 text-red-600"><Clock/> Històric Detallat</h3>
                    <button onClick={exportToCSV} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase hover:bg-red-700"><Download size={16}/> Exportar CSV</button>
                 </div>
                 <div className="overflow-x-auto max-h-[60vh] custom-scrollbar">
                    <table className="w-full text-left">
                      <thead className="sticky top-0 bg-white border-b-2 border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <tr><th className="py-4 px-2">Alumne</th><th className="py-4 text-center">Data</th><th className="py-4 text-center">Hora</th><th className="py-4 text-center">Estat</th><th className="py-4 px-2">Motiu / Prova</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {logs.slice().reverse().filter(l => l.courseId === config.kioskCourseId).map(log => (
                          <tr key={log.id} className="hover:bg-gray-50 text-sm">
                            <td className="py-4 px-2 font-bold">{log.studentName}</td>
                            <td className="py-4 text-center text-gray-500">{log.date}</td>
                            <td className="py-4 text-center text-gray-500">{log.timestamp}</td>
                            <td className="py-4 text-center"><span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${log.status === 'present' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>{log.status}</span></td>
                            <td className="py-4 px-2 text-xs italic text-gray-400 max-w-xs truncate">{log.justificationReason || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
              </div>
            )}

            {activeTab === 'database' && (
              <div className="space-y-6">
                <div className="bg-white p-8 rounded-[2rem] border shadow-sm">
                   <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-black flex items-center gap-2"><HardDrive className="text-red-600"/> Manteniment del Sistema</h3>
                      <div className="flex gap-4">
                        <button onClick={handleReset} className="px-6 py-3 bg-red-600 text-white rounded-xl font-black text-xs flex items-center gap-3 shadow-lg hover:bg-red-700 transition-all"><Power size={18}/> Reiniciar Sistema</button>
                        <button onClick={() => setShowPreview(!showPreview)} className="px-6 py-3 bg-gray-900 text-white rounded-xl font-black text-xs hover:bg-black">{showPreview ? 'Amagar JSON' : 'Veure Raw JSON'}</button>
                      </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-8 bg-gray-50 rounded-3xl border">
                         <h4 className="text-xs font-black uppercase text-gray-400 mb-4">Estat Connexió Supabase</h4>
                         <div className="flex items-center gap-4 mb-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${isDbOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}>{isDbOnline ? <CheckCircle size={32}/> : <ShieldAlert size={32}/>}</div>
                            <div>
                               <p className="font-black text-lg">{isDbOnline ? 'Base de dades en línia' : 'Error de Connexió'}</p>
                               <p className="text-xs text-gray-400 font-mono">Ping: {new Date().toLocaleTimeString()}</p>
                            </div>
                         </div>
                         <button onClick={refreshData} className="w-full py-4 bg-white border border-gray-200 text-gray-600 rounded-xl font-black text-xs flex items-center justify-center gap-3 hover:bg-gray-100 transition-all"><RefreshCw size={16}/> FORÇAR REFRESC</button>
                      </div>
                      <div className="p-8 bg-gray-50 rounded-3xl border flex flex-col justify-center text-center">
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Registres totals</p>
                         <p className="text-5xl font-black text-red-600 tracking-tighter">{dbStats.total_logs}</p>
                         <p className="mt-4 text-[10px] font-bold text-gray-400 uppercase">Faltes justificades: {dbStats.justified_absences}</p>
                      </div>
                   </div>

                   {showPreview && (
                     <div className="mt-8 bg-gray-900 p-6 rounded-2xl text-green-400 font-mono text-xs overflow-auto max-h-96">
                       <pre>{JSON.stringify({ stats: dbStats, connection: isDbOnline, samples: students.slice(0, 3) }, null, 2)}</pre>
                     </div>
                   )}
                </div>
              </div>
            )}
          </div>
        )}

        {editingStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in duration-200">
              <h3 className="text-2xl font-black mb-6 text-red-600 flex items-center gap-3"><Edit3/> Editar Alumne</h3>
              <form onSubmit={async (e)=>{e.preventDefault(); await dbService.updateStudent(editingStudent); setEditingStudent(null); refreshData();}} className="space-y-6">
                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Nom i Cognoms</label>
                <input type="text" value={editingStudent.name} onChange={e=>setEditingStudent({...editingStudent, name:e.target.value})} className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-red-500"/></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Curs</label>
                  <select value={editingStudent.courseId} onChange={e=>setEditingStudent({...editingStudent, courseId:e.target.value})} className="w-full p-4 bg-gray-50 border rounded-2xl font-bold">{courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">PIN</label>
                  <input type="text" value={editingStudent.pin||''} onChange={e=>setEditingStudent({...editingStudent, pin:e.target.value})} className="w-full p-4 bg-gray-50 border rounded-2xl font-bold"/></div>
                </div>
                <div className="flex gap-4 pt-4"><button type="button" onClick={()=>setEditingStudent(null)} className="flex-1 py-4 text-gray-400 font-bold">Cancel·lar</button><button type="submit" className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl shadow-xl hover:bg-red-700">GUARDAR</button></div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminView;
