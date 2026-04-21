# DIGI TUTORIAL CLASSES - Product Requirements Document

## Architecture
- **Frontend**: React.js + TailwindCSS + Shadcn UI
- **Backend**: FastAPI (Python) + MongoDB
- **Auth**: JWT (httpOnly cookies, force password change, forgot/reset)
- **Integrations**: Google Meet, Zoom (S2S OAuth), SendGrid (emails)

## What's Been Implemented

### Phase 1-4: Core, Zoom, Calendar, Attendance, Payments, Branding

### Phase 5 - Major Upgrade (April 21, 2026)
- **Extended Teacher Management**: phone, qualification, experience, date_of_joining, teaching_levels (multi-select: Primary/Middle/Secondary/Higher Secondary), subjects (multi-select)
- **Extended Student Management**: grade (Nursery-Class 12), board (ICSE/CBSE/IB/IGCSE/Mixed), date_of_admission, subjects
- **Group Class Support**: class_type (individual/group), multi-student selection, shared meet link
- **Edit/Delete**: Admin can edit teachers/students/classes with pre-filled forms, delete with confirmation popup
- **Password Management**: Force change on first login, change password from dashboard, forgot password with SendGrid email reset link
- **SendGrid Email**: Login credentials sent on user creation, password reset emails with branded HTML templates
- **Recording Links**: Optional Zoom recording URL per class, visible to admin+student, hidden from teachers
- **Sorting**: Classes sorted by creation time (newest first)
- **Calendar View**: Month + Week toggle for Admin/Teacher/Student with Regenerate Zoom Link (admin only)

## Test Credentials
- Admin: admin@classplatform.com / admin123
- Teacher: teacher@demo.com / teacher123
- Student: student@demo.com / student123

## Backlog
### P1 - Next
- [ ] Drag & drop rescheduling on calendar
- [ ] Multi-subject teacher-student assignment
### P2 - Future
- [ ] Live chat during class
- [ ] File upload & assignment system
- [ ] Student fee tracking with payment gateway
