
import { Student, Course, AttendanceLog, AppConfig } from './types';

const STORAGE_KEYS = {
  STUDENTS: 'salesianscheck_students_final',
  COURSES: 'salesianscheck_courses_final',
  ATTENDANCE: 'salesianscheck_attendance_final',
  CONFIG: 'salesianscheck_config_final'
};

const DEFAULT_COURSES: Course[] = [
  { id: '1', name: 'IPO', schedule: 'Dilluns i Dimecres' },
  { id: '2', name: 'Serveis de Xarxa', schedule: 'Dimarts i Dijous' },
  { id: '3', name: 'Sostenibilitat aplicada al sistema productiu', schedule: 'Divendres' },
  { id: '4', name: 'Sistemes operatius en xarxa', schedule: 'Dilluns a Dijous' },
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

const DEFAULT_STUDENTS: Student[] = RAW_STUDENTS.map((name, index) => ({
  id: (202500 + index).toString(),
  name,
  courseId: '1', 
  pin: null,
  status: 'absent'
}));

export const dbService = {
  getStudents: (): Student[] => {
    const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    return data ? JSON.parse(data) : DEFAULT_STUDENTS;
  },
  saveStudents: (students: Student[]) => {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  },
  importStudents: (newStudents: Student[]) => {
    const current = dbService.getStudents();
    const combined = [...current, ...newStudents];
    dbService.saveStudents(combined);
  },
  addStudent: (student: Student) => {
    const students = dbService.getStudents();
    students.push(student);
    dbService.saveStudents(students);
  },
  updateStudent: (updatedStudent: Student) => {
    const students = dbService.getStudents();
    const index = students.findIndex(s => s.id === updatedStudent.id);
    if (index !== -1) {
      students[index] = updatedStudent;
      dbService.saveStudents(students);
    }
  },
  deleteStudent: (id: string) => {
    const students = dbService.getStudents();
    dbService.saveStudents(students.filter(s => s.id !== id));
  },
  getCourses: (): Course[] => {
    const data = localStorage.getItem(STORAGE_KEYS.COURSES);
    return data ? JSON.parse(data) : DEFAULT_COURSES;
  },
  saveCourses: (courses: Course[]) => {
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
  },
  addCourse: (course: Course) => {
    const courses = dbService.getCourses();
    courses.push(course);
    dbService.saveCourses(courses);
  },
  updateCourse: (updatedCourse: Course) => {
    const courses = dbService.getCourses();
    const index = courses.findIndex(c => c.id === updatedCourse.id);
    if (index !== -1) {
      courses[index] = updatedCourse;
      dbService.saveCourses(courses);
    }
  },
  deleteCourse: (id: string) => {
    const courses = dbService.getCourses();
    dbService.saveCourses(courses.filter(c => c.id !== id));
  },
  getAttendanceLogs: (): AttendanceLog[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    return data ? JSON.parse(data) : [];
  },
  saveAttendanceLogs: (logs: AttendanceLog[]) => {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(logs));
  },
  saveAttendanceLog: (log: AttendanceLog) => {
    const logs = dbService.getAttendanceLogs();
    logs.push(log);
    dbService.saveAttendanceLogs(logs);
  },
  getConfig: (): AppConfig => {
    const data = localStorage.getItem(STORAGE_KEYS.CONFIG);
    return data ? JSON.parse(data) : { kioskCourseId: '1' };
  },
  saveConfig: (config: AppConfig) => {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  },
  exportFullDatabase: () => {
    const fullDb = {
      students: dbService.getStudents(),
      courses: dbService.getCourses(),
      logs: dbService.getAttendanceLogs(),
      config: dbService.getConfig()
    };
    return JSON.stringify(fullDb, null, 2);
  },
  importFullDatabase: (json: string) => {
    try {
      const data = JSON.parse(json);
      if (data.students) dbService.saveStudents(data.students);
      if (data.courses) dbService.saveCourses(data.courses);
      if (data.logs) dbService.saveAttendanceLogs(data.logs);
      if (data.config) dbService.saveConfig(data.config);
      return true;
    } catch (e) {
      return false;
    }
  }
};
