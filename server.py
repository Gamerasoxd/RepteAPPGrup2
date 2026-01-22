
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import sqlite3
import uvicorn
import json

app = FastAPI(title="SalesiansCheck API Pro")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_NAME = "asistencia.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    # Taula Alumnes
    c.execute('''CREATE TABLE IF NOT EXISTS students 
                 (id TEXT PRIMARY KEY, name TEXT, courseId TEXT, pin TEXT, status TEXT)''')
    # Taula Cursos
    c.execute('''CREATE TABLE IF NOT EXISTS courses 
                 (id TEXT PRIMARY KEY, name TEXT, schedule TEXT)''')
    # Taula Registres d'Assistència
    c.execute('''CREATE TABLE IF NOT EXISTS attendance 
                 (id TEXT PRIMARY KEY, studentId TEXT, studentName TEXT, courseId TEXT, 
                  date TEXT, timestamp TEXT, status TEXT, isJustified BOOLEAN, justificationReason TEXT)''')
    # Taula de Configuració del Sistema
    c.execute('''CREATE TABLE IF NOT EXISTS settings 
                 (key TEXT PRIMARY KEY, value TEXT)''')
    
    # Inicialització de cursos
    c.execute("SELECT COUNT(*) FROM courses")
    if c.fetchone()[0] == 0:
        default_courses = [
            ('1', 'IPO', 'Dilluns i Dimecres'),
            ('2', 'Serveis de Xarxa', 'Dimarts i Dijous'),
            ('3', 'Sostenibilitat', 'Divendres'),
            ('4', 'Sistemes operatius', 'Dilluns a Dijous'),
            ('5', 'Projecte Intermodular', 'Tarda')
        ]
        c.executemany("INSERT INTO courses VALUES (?,?,?)", default_courses)

    # Inicialització d'alumnes
    c.execute("SELECT COUNT(*) FROM students")
    if c.fetchone()[0] == 0:
        RAW_STUDENTS = [
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
        ]
        student_data = [(str(202500 + i), name, '1', None, 'absent') for i, name in enumerate(RAW_STUDENTS)]
        c.executemany("INSERT INTO students VALUES (?,?,?,?,?)", student_data)

    # Configuració per defecte
    c.execute("INSERT OR IGNORE INTO settings VALUES (?, ?)", ('kioskCourseId', '1'))
        
    conn.commit()
    conn.close()

# Models
class StudentSchema(BaseModel):
    id: str
    name: str
    courseId: str
    pin: Optional[str] = None
    status: str

class CourseSchema(BaseModel):
    id: str
    name: str
    schedule: str

class AttendanceSchema(BaseModel):
    id: str
    studentId: str
    studentName: str
    courseId: str
    date: str
    timestamp: str
    status: str
    isJustified: Optional[bool] = False
    justificationReason: Optional[str] = ""

class SettingsSchema(BaseModel):
    kioskCourseId: str

# --- RUTES DE CONFIGURACIÓ ---

@app.get("/settings")
def get_settings():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("SELECT value FROM settings WHERE key = 'kioskCourseId'")
    row = c.fetchone()
    conn.close()
    return {"kioskCourseId": row[0] if row else "1"}

@app.post("/settings")
def update_settings(s: SettingsSchema):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("UPDATE settings SET value = ? WHERE key = 'kioskCourseId'", (s.kioskCourseId,))
    conn.commit()
    conn.close()
    return {"status": "updated"}

# --- RUTES D'ADMINISTRACIÓ DE BD ---

@app.get("/db/stats")
def get_db_stats():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    stats = {}
    c.execute("SELECT COUNT(*) FROM students")
    stats['total_students'] = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM courses")
    stats['total_courses'] = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM attendance")
    stats['total_logs'] = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM attendance WHERE isJustified = 1")
    stats['justified_absences'] = c.fetchone()[0]
    conn.close()
    return stats

# --- RUTES ESTÀNDARD ---

@app.get("/students", response_model=List[StudentSchema])
def get_students():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM students")
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/students")
def add_student(s: StudentSchema):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("INSERT OR REPLACE INTO students VALUES (?,?,?,?,?)", 
              (s.id, s.name, s.courseId, s.pin, s.status))
    conn.commit()
    conn.close()
    return {"status": "ok"}

@app.delete("/students/{student_id}")
def delete_student(student_id: str):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM students WHERE id = ?", (student_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted"}

@app.get("/courses", response_model=List[CourseSchema])
def get_courses():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM courses")
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/courses")
def add_course(course: CourseSchema):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("INSERT OR REPLACE INTO courses VALUES (?,?,?)", 
              (course.id, course.name, course.schedule))
    conn.commit()
    conn.close()
    return {"status": "ok"}

@app.get("/attendance", response_model=List[AttendanceSchema])
def get_attendance():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM attendance")
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/attendance")
def save_attendance(a: AttendanceSchema):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("INSERT INTO attendance VALUES (?,?,?,?,?,?,?,?,?)",
              (a.id, a.studentId, a.studentName, a.courseId, a.date, a.timestamp, 
               a.status, a.isJustified, a.justificationReason))
    c.execute("UPDATE students SET status = ? WHERE id = ?", (a.status, a.studentId))
    conn.commit()
    conn.close()
    return {"status": "ok"}

if __name__ == "__main__":
    init_db()
    print("🚀 Servidor Python Obert en http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
