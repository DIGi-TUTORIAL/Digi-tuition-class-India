# DIGI TUTORIAL CLASSES - Product Requirements Document

## Architecture
- **Frontend**: React.js + TailwindCSS + Shadcn UI
- **Backend**: FastAPI (Python) + MongoDB
- **Auth**: JWT (httpOnly cookies, force password change, forgot/reset)
- **Integrations**: Google Meet, Zoom (S2S OAuth), SendGrid (emails)

## All Implemented Features

### Core: JWT auth, admin CRUD, class scheduling, Google Meet, class limits
### Zoom: Auto-meeting creation (single + bulk), unique links per class, batching/retry
### Attendance: Join/Leave buttons, server-side timestamps, duration calc, reports
### Courses: CRUD, assign students/teachers
### Payments: Cycle-based (INR), per-class, teacher cycle view, payment recording
### Branding: DIGI TUTORIAL CLASSES logo, headers, footers on all pages
### Notifications: Admin bell icon, cycle completion alerts
### Extended Models: Teacher (qualification, levels, subjects), Student (grade, board, DOA)
### Group Classes: Individual + group with multi-student selection
### Edit/Delete: Admin edit teachers/students/classes, delete with confirmation
### Auth: Force password change, forgot password (SendGrid email), reset with token
### SendGrid: Branded credential emails, password reset emails
### Recording Links: Per-class, visible to admin+student, hidden from teacher
### Calendar: Month + Week views for all roles
### Drag & Drop Rescheduling: Admin-only, auto-save on drop (month keeps time, week sets hour)
### Subject-Teacher Mapping: CRUD per student, "By Student" grouped view, student "By Subject" tab

## Test Credentials
- Admin: admin@classplatform.com / admin123
- Teacher: teacher@demo.com / teacher123
- Student: student@demo.com / student123

## Backlog
### P1 - Next
- [ ] Parent portal (view child's attendance, recordings, payments)
- [ ] WhatsApp notifications
### P2 - Future
- [ ] Live chat during class
- [ ] File upload & assignment system
- [ ] Student fee tracking with payment gateway
