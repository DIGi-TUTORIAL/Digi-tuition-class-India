# DIGI TUTORIAL CLASSES - Product Requirements Document

## Original Problem Statement
Build a full-stack web application for conducting one-to-one live online classes between teachers and students. Admin-controlled platform with class scheduling, student enrollment, Google Meet + Zoom integration, attendance tracking, reports & analytics, cycle-based payments, bulk scheduling, and DIGI TUTORIAL CLASSES branding.

## Architecture
- **Frontend**: React.js + TailwindCSS + Shadcn UI
- **Backend**: FastAPI (Python) + MongoDB
- **Auth**: JWT (httpOnly cookies, 60-min access, 7-day refresh)
- **Integrations**: Google Meet (link-paste), Zoom (Server-to-Server OAuth auto-creation)
- **Design**: Purple & white Swiss high-contrast, Outfit + IBM Plex Sans fonts

## What's Been Implemented

### Phase 1 - MVP (April 14, 2026)
- JWT auth, Admin CRUD, class scheduling, Google Meet, class limits

### Phase 2 - Advanced (April 15, 2026)
- Zoom auto-meeting, attendance tracking, courses, reports, payments

### Phase 3 - Cycle Payments + Branding (April 16, 2026)
- Cycle-based payments (INR), bulk scheduling (1yr max), notifications, DIGI TUTORIAL CLASSES branding

### Phase 4 - Zoom Bulk Fix (April 17, 2026)
- **Zoom Bulk Scheduling**: Each bulk-created class gets a unique Zoom meeting via batched API calls
- **Batching**: 8 meetings per batch with 1.5s delay between batches for rate limiting
- **Retry Logic**: 3 attempts per meeting with exponential backoff
- **Connection Validation**: Checks Zoom connection before allowing Zoom scheduling
- **Verified**: 13 classes created with 13 unique Zoom links in one bulk operation

## Test Credentials
- Admin: admin@classplatform.com / admin123
- Teacher: teacher@demo.com / teacher123
- Student: student@demo.com / student123

## Backlog
### P1 - Next
- [ ] Calendar-based UI view for scheduled classes
- [ ] Email reminders (SendGrid)
- [ ] Class rescheduling (single + series)

### P2 - Future
- [ ] Live chat during class
- [ ] File upload & assignment system
- [ ] Student fee tracking with payment gateway
