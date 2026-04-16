# DIGI TUTORIAL CLASSES - Product Requirements Document

## Original Problem Statement
Build a full-stack web application for conducting one-to-one live online classes between teachers and students. Admin-controlled platform with class scheduling, student enrollment, Google Meet + Zoom integration, attendance tracking, reports & analytics, cycle-based payments, bulk scheduling, and DIGI TUTORIAL CLASSES branding.

## Architecture
- **Frontend**: React.js + TailwindCSS + Shadcn UI
- **Backend**: FastAPI (Python) + MongoDB
- **Auth**: JWT (httpOnly cookies, 60-min access, 7-day refresh)
- **Integrations**: Google Meet (link-paste), Zoom (Server-to-Server OAuth)
- **Design**: Purple & white Swiss high-contrast, Outfit + IBM Plex Sans fonts

## User Personas
1. **Admin** - Super control panel, manages everything
2. **Teacher** - Views assigned classes, joins/leaves with attendance, sees cycle payments
3. **Student** - Views enrollment, class limits, joins/leaves with tracking

## What's Been Implemented

### Phase 1 - MVP (April 14, 2026)
- JWT authentication with login, logout, role-based access
- Admin dashboard: create teachers, enroll students, schedule classes
- Class limit enforcement, Google Meet integration

### Phase 2 - Advanced (April 15, 2026)
- Zoom auto-meeting creation (S2S OAuth)
- Attendance tracking (join/leave with timestamps, duration calculation)
- Course management, Reports & analytics, Payment tracking

### Phase 3 - Cycle Payments + Scheduling + Branding (April 16, 2026)
- **Cycle-Based Teacher Payments (INR)**: Cycle sizes (4/8/12/16/20/24), cycle amounts in INR, teacher sees cycles not per-class rate
- **Bulk Recurring Scheduling**: Days of week, start/end date, auto-create classes (max 1 year)
- **Dashboard Notifications**: Bell icon, cycle completion alerts for admin
- **DIGI TUTORIAL CLASSES Branding**: Logo on login/admin/teacher/student, footer on all pages
- **Student Cycle Visibility**: Progress circle, used/total/remaining display
- **Demo Accounts**: Seeded teacher@demo.com and student@demo.com

## Prioritized Backlog

### P0 - Done
- [x] All Phase 1, 2, 3 features complete

### P1 - Next
- [ ] Re-enable Zoom marketplace app (user action)
- [ ] Email reminders via SendGrid
- [ ] Class rescheduling (single + series)

### P2 - Future
- [ ] Live chat during class
- [ ] File upload & assignment system
- [ ] Student fee tracking with payment gateway
- [ ] Google Calendar sync
- [ ] WhatsApp alerts
