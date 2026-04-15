# ClassMeet Pro - Product Requirements Document

## Original Problem Statement
Build a full-stack web application for conducting one-to-one live online classes between teachers and students. Admin-controlled platform with class scheduling, student enrollment with mandatory fields, Google Meet + Zoom integration, attendance tracking, reports & analytics, and payment tracking.

## Architecture
- **Frontend**: React.js + TailwindCSS + Shadcn UI
- **Backend**: FastAPI (Python) + MongoDB
- **Auth**: JWT (httpOnly cookies, 60-min access, 7-day refresh)
- **Integrations**: Google Meet (link-paste), Zoom (Server-to-Server OAuth auto-creation)
- **Design**: Purple & white Swiss high-contrast, Outfit + IBM Plex Sans fonts

## User Personas
1. **Admin** - Super control panel, manages everything
2. **Teacher** - Views assigned classes, joins/leaves with attendance tracking
3. **Student** - Views enrollment, class limits, joins/leaves with tracking

## Core Requirements (Static)
- Student enrollment with mandatory fields (name, parent name, contact, gmail ID)
- Class limit enforcement (remaining classes check)
- Role-based access control (admin/teacher/student)
- Server-side attendance timestamps

## What's Been Implemented (April 14-15, 2026)

### Phase 1 - MVP
- JWT authentication with login, logout, role-based access
- Admin dashboard: create teachers, enroll students, schedule classes
- Teacher dashboard: view assigned classes, join links
- Student dashboard: enrollment details, class summary, join buttons
- Class limit enforcement (disable join when remaining=0)
- Google Meet link-based integration

### Phase 2 - Advanced Features
- **Zoom Auto-Meeting Creation**: Server-to-Server OAuth integration (credentials provided but app currently disabled in Zoom marketplace)
- **Attendance Tracking**: Join/Leave buttons for both teachers and students with server-side timestamps, duration calculation
- **Course Management**: Create courses, assign students/teachers, batch scheduling
- **Reports & Analytics**: Student summary, teacher summary, attendance log with filters (by student, teacher, date range)
- **Payment Tracking**: Teacher hourly rates, payment recording, calculated payment from hours taught
- **Enhanced Admin Dashboard**: 7-tab sidebar navigation (Overview, Teachers, Students, Classes, Courses, Reports, Payments)
- **Demo Accounts**: Seeded teacher@demo.com and student@demo.com for testing

## Prioritized Backlog

### P0 - Done
- [x] JWT Auth + Role-based access
- [x] Admin CRUD (teachers, students, classes)
- [x] Student enrollment with mandatory fields
- [x] Class limit enforcement
- [x] Google Meet integration
- [x] Attendance tracking (join/leave)
- [x] Reports & analytics
- [x] Course management
- [x] Payment tracking

### P1 - Next
- [ ] Re-enable Zoom marketplace app (user action needed)
- [ ] Email notifications for class reminders
- [ ] WhatsApp alerts integration

### P2 - Future
- [ ] Live chat during class
- [ ] File upload & assignment system
- [ ] Class rescheduling system
- [ ] Student fee tracking with payment gateway (Stripe/Razorpay)
- [ ] Google Calendar sync
