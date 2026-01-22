
export interface Student {
  id: string;
  name: string;
  courseId: string;
  pin: string | null;
  lastCheckIn?: string;
  status: 'present' | 'absent' | 'late';
}

export interface Course {
  id: string;
  name: string;
  schedule: string;
}

export interface AttendanceLog {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  date: string;
  timestamp: string;
  status: 'present' | 'late' | 'absent';
  isJustified?: boolean;
  justificationReason?: string;
  justificationDocUrl?: string;
}

export interface AppConfig {
  kioskCourseId: string;
}

export type ViewMode = 'kiosk' | 'admin' | 'mobile';
