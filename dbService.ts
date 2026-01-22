
import { createClient } from '@supabase/supabase-js';
import { Student, Course, AttendanceLog, AppConfig } from './types';

// Credencials de Supabase
export const SUPABASE_URL = 'https://quaqudgvtouqaqyecami.supabase.co';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1YXF1ZGd2dG91cWFxeWVjYW1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwODQ5NDIsImV4cCI6MjA4NDY2MDk0Mn0.AC_dMxlMfdNgQkxDrrcxzJFJ6rBokygrAgDZ48ZDUGQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const dbService = {
  getStudents: async (): Promise<Student[]> => {
    try {
      const { data, error } = await supabase.from('students').select('*');
      if (error) throw error;
      return data.map(s => ({
        id: s.id,
        name: s.name,
        courseId: s.course_id,
        pin: s.pin,
        status: s.status as 'present' | 'absent' | 'late'
      }));
    } catch (e) {
      console.error("Error getStudents:", e);
      return [];
    }
  },

  getCourses: async (): Promise<Course[]> => {
    try {
      const { data, error } = await supabase.from('courses').select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error("Error getCourses:", e);
      return [];
    }
  },

  getAttendanceLogs: async (): Promise<AttendanceLog[]> => {
    try {
      const { data, error } = await supabase.from('attendance').select('*');
      if (error) throw error;
      return data.map(l => ({
        id: l.id,
        studentId: l.student_id,
        studentName: l.student_name,
        courseId: l.course_id,
        date: l.date,
        timestamp: l.timestamp,
        status: l.status as 'present' | 'late' | 'absent',
        isJustified: l.is_justified,
        justificationReason: l.justification_reason
      }));
    } catch (e) {
      console.error("Error getAttendanceLogs:", e);
      return [];
    }
  },

  addStudent: async (student: Student) => {
    await supabase.from('students').upsert({
      id: student.id,
      name: student.name,
      course_id: student.courseId,
      pin: student.pin,
      status: student.status
    });
  },

  updateStudent: async (student: Student) => {
    await supabase.from('students').update({
      name: student.name,
      course_id: student.courseId,
      pin: student.pin,
      status: student.status
    }).eq('id', student.id);
  },

  deleteStudent: async (studentId: string) => {
    const { error } = await supabase.from('students').delete().eq('id', studentId);
    if (error) throw error;
  },

  saveAttendanceLog: async (log: AttendanceLog) => {
    await supabase.from('attendance').insert({
      id: log.id,
      student_id: log.studentId,
      student_name: log.studentName,
      course_id: log.courseId,
      date: log.date,
      timestamp: log.timestamp,
      status: log.status,
      is_justified: log.isJustified,
      justification_reason: log.justificationReason
    });
    await supabase.from('students').update({ status: log.status }).eq('id', log.studentId);
  },

  getConfig: async (): Promise<AppConfig> => {
    try {
      const { data } = await supabase.from('settings').select('value').eq('key', 'kioskCourseId').single();
      return { kioskCourseId: data?.value || '1' };
    } catch {
      return { kioskCourseId: '1' };
    }
  },

  saveConfig: async (config: AppConfig) => {
    await supabase.from('settings').upsert({ key: 'kioskCourseId', value: config.kioskCourseId });
  },

  checkConnection: async (): Promise<boolean> => {
    try {
      const { error } = await supabase.from('settings').select('key').limit(1);
      return !error;
    } catch {
      return false;
    }
  },

  resetSystem: async () => {
    // Esborra assistències
    await supabase.from('attendance').delete().neq('id', '0');
    // Reseteja estats d'alumnes
    await supabase.from('students').update({ status: 'absent' }).neq('id', '0');
    // Seed base
    await dbService.seedDatabase();
    return true;
  },

  seedDatabase: async () => {
    const defaultCourses = [
      { id: '1', name: 'IPO', schedule: 'Dilluns i Dimecres' },
      { id: '2', name: 'Serveis de Xarxa', schedule: 'Dimarts i Dijous' },
      { id: '3', name: 'Sostenibilitat', schedule: 'Divendres' },
      { id: '4', name: 'Sistemes operatius', schedule: 'Dilluns a Dijous' },
      { id: '5', name: 'Projecte Intermodular', schedule: 'Tarda' }
    ];

    const RAW_STUDENTS = [
      'Gabriel Alejandro Mosqueda Gimenez', 'Joel Cabello Serna', 'Mª Angels Casadesús Torres',
      'Izan Cruzado Fabre', 'Daniel Estrada Serrano', 'Biel González Ayala',
      'Hugo Hernández Herrero', 'Guillem Hernández Pérez', 'Abdelkader Kabab',
      'Daniel Marcos Rosa', 'Carles Martí Valls', 'Izan Martínez Ferrer',
      'Eric Martínez García', 'Yerian Martínez Gómez', 'Sergi Miguel Salmerón',
      'Diego Muñoz Lasala', 'Fernando Navarro Romero', 'Oriol Ortiz Catalán',
      'Marc Palma Viñolas', 'Xabier Ruiz Fregenal', 'Víctor Salmerón Gavilán',
      'Juan Sánchez Valverde', 'Iker Santos Castillo', 'Eben Sifuentes Joyanes',
      'Biel Suárez Picañol', 'David Vaquero Zarza', 'Raúl Vilchez Rodríguez',
      'Zhenhan Xu', 'Yixin Zhang'
    ];

    const studentsData = RAW_STUDENTS.map((name, i) => ({
      id: (202500 + i).toString(),
      name,
      course_id: '1',
      pin: null,
      status: 'absent'
    }));

    await supabase.from('courses').upsert(defaultCourses);
    await supabase.from('students').upsert(studentsData);
    await supabase.from('settings').upsert({ key: 'kioskCourseId', value: '1' });
    return true;
  },

  getDbStats: async () => {
    try {
      const [students, courses, logs, justified] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('attendance').select('*', { count: 'exact', head: true }),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('is_justified', true)
      ]);
      return {
        total_students: students.count || 0,
        total_courses: courses.count || 0,
        total_logs: logs.count || 0,
        justified_absences: justified.count || 0
      };
    } catch {
      return { total_students: 0, total_courses: 0, total_logs: 0, justified_absences: 0 };
    }
  }
};
