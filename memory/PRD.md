# DIGI TUTORIAL CLASSES - Product Requirements Document

## Architecture
- **Frontend**: React.js + TailwindCSS + Shadcn UI
- **Backend**: FastAPI (Python) + MongoDB
- **Auth**: JWT (httpOnly cookies)
- **Integrations**: Google Meet (link-paste), Zoom (Server-to-Server OAuth)

## What's Been Implemented

### Phase 1 - MVP: JWT auth, Admin CRUD, class scheduling, Google Meet, class limits
### Phase 2 - Advanced: Zoom auto-meeting, attendance tracking, courses, reports, payments
### Phase 3 - Cycle Payments + Branding: Cycle-based INR payments, bulk scheduling, notifications, DIGI TUTORIAL CLASSES branding
### Phase 4 - Zoom Bulk Fix: Unique Zoom meetings per bulk class, batching, retry logic
### Phase 5 - Calendar + Regenerate (April 17, 2026)
- **Calendar View for all roles**: Monthly grid + Weekly time-slot views with toggle
- **Admin Calendar**: See all classes, click for details, Regenerate Zoom Link button
- **Teacher Calendar**: See assigned classes on calendar
- **Student Calendar**: See their scheduled classes on calendar
- **Class Detail Panel**: Click any event to see full details (student, teacher, platform, status, duration, join link)
- **Regenerate Zoom Link**: Admin-only button creates new Zoom meeting for any class

## Test Credentials
- Admin: admin@classplatform.com / admin123
- Teacher: teacher@demo.com / teacher123
- Student: student@demo.com / student123

## Backlog
### P1 - Next
- [ ] Email reminders (SendGrid)
- [ ] Class rescheduling (drag & drop on calendar)
### P2 - Future
- [ ] Live chat during class
- [ ] File upload & assignment system
- [ ] Student fee tracking with payment gateway
