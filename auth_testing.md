# Authentication Testing Playbook

## Step 1: MongoDB Verification

```bash
mongosh
use test_database
db.users.find({role: "admin"}).pretty()
db.users.findOne({role: "admin"}, {password_hash: 1})
```

**Verify:**
- bcrypt hash starts with `$2b$`
- Indexes exist on:
  - users.email (unique)
  - login_attempts.identifier

## Step 2: API Testing

### Admin Login Test
```bash
API_URL="https://class-meet-pro.preview.emergentagent.com"

curl -c cookies.txt -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@classplatform.com","password":"admin123"}'

cat cookies.txt

curl -b cookies.txt $API_URL/api/auth/me
```

**Expected:**
- Login returns user object with `_id`, `name`, `email`, `role`
- Cookies contain `access_token` and `refresh_token`
- `/me` endpoint returns admin user data

### Create Teacher Test
```bash
curl -b cookies.txt -X POST $API_URL/api/admin/teachers \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com"}'
```

### Enroll Student Test
```bash
curl -b cookies.txt -X POST $API_URL/api/admin/students \
  -H "Content-Type: application/json" \
  -d '{
    "student_name":"Jane Smith",
    "parent_name":"Robert Smith",
    "contact_number":"1234567890",
    "gmail_id":"jane@example.com",
    "total_classes":10
  }'
```

## Step 3: Frontend Testing

### Login Flow
1. Navigate to `/login`
2. Enter admin credentials
3. Verify redirect to `/admin`
4. Check stats display correctly

### Admin Dashboard
1. Create a teacher (verify temp password shown)
2. Enroll a student with all mandatory fields
3. Schedule a class with teacher/student selection
4. Verify tables update in real-time

### Role-Based Access
1. Try accessing `/teacher` as admin (should redirect)
2. Login as teacher
3. Verify only assigned classes visible
4. Login as student
5. Verify enrollment details and class limits

## Step 4: Class Limit Testing

1. Create student with 1 class
2. Schedule 1 class for that student
3. Login as student
4. Join the class
5. Verify "No Classes Remaining" message appears
6. Try joining another class (should be blocked)
