# Supabase Setup for MedChat AI Pro

## Step 1: Run the SQL Script

1. **Open your Supabase dashboard**
2. **Go to SQL Editor**
3. **Copy and paste the entire contents of `setup-supabase-users.sql`**
4. **Click "Run"**

This will create:
- All necessary tables (users, medications, lab_results, appointments, documents, chat_history)
- Row Level Security (RLS) policies
- Sample data for demo accounts
- Vector extension for document embeddings
- Storage bucket for documents

## Step 2: Create Auth Users

You have two options:

### Option A: Manual (Recommended)
1. **Go to Authentication > Users in your Supabase dashboard**
2. **Click "Add user" for each account:**

   **Admin Account:**
   - Email: `admin@medchat.ai`
   - Password: `admin123`
   - Auto Confirm User: ✓

   **Provider Account:**
   - Email: `doctor@medchat.ai`
   - Password: `doctor123`
   - Auto Confirm User: ✓

   **Patient Account:**
   - Email: `patient@medchat.ai`
   - Password: `patient123`
   - Auto Confirm User: ✓

### Option B: Automated Script
1. **Get your Service Role Key from Supabase dashboard**
2. **Edit `create-auth-users.js` and add your service key**
3. **Run:** `node create-auth-users.js`

## Step 3: Verify Setup

1. **Check that tables were created:**
   - Go to Database > Tables
   - You should see: users, medications, lab_results, appointments, documents, chat_history

2. **Check that users were created:**
   - Go to Authentication > Users
   - You should see 3 users with the demo emails

3. **Check that sample data exists:**
   - Go to Database > Table Editor
   - Select the `users` table
   - You should see the 3 demo users with their roles

## Step 4: Test Authentication

1. **Start your Next.js application**
2. **Try logging in with demo accounts:**
   - `admin@medchat.ai` / `admin123`
   - `doctor@medchat.ai` / `doctor123`
   - `patient@medchat.ai` / `patient123`

## Database Schema

### Users Table
- `id` (UUID, Primary Key)
- `email` (Text, Unique)
- `role` (Text: 'admin', 'provider', 'user')
- `name` (Text)
- `facility` (Text)
- `department` (Text)
- `title` (Text)

### Medications Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key)
- `name` (Text)
- `dosage` (Text)
- `frequency` (Text)
- `is_active` (Boolean)
- `prescribed_date` (Date)
- `prescriber` (Text)

### Lab Results Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key)
- `test_name` (Text)
- `value` (Text)
- `status` (Text)
- `test_date` (Date)
- `details` (Text)

### Appointments Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key)
- `appointment_date` (Timestamp)
- `provider_name` (Text)
- `appointment_type` (Text)
- `status` (Text)
- `reason` (Text)

### Documents Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key)
- `filename` (Text)
- `file_size` (Integer)
- `file_type` (Text)
- `file_path` (Text)
- `processed` (Boolean)
- `content` (Text)
- `embedding` (Vector[1536])

### Chat History Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key)
- `message` (Text)
- `response` (Text)
- `context_documents` (Text Array)

## Security Features

- **Row Level Security (RLS)** enabled on all tables
- **Users can only access their own data**
- **Auth integration** with automatic user sync
- **Secure document storage** with user-specific access

## Demo Accounts

| Role | Email | Password | Name |
|------|-------|----------|------|
| Admin | admin@medchat.ai | admin123 | Dr. Sarah Chen |
| Provider | doctor@medchat.ai | doctor123 | Dr. Michael Rodriguez |
| Patient | patient@medchat.ai | patient123 | John Thompson |

## Troubleshooting

### If login fails:
1. Check that auth users were created in Authentication > Users
2. Verify that the users table has the matching records
3. Check that RLS policies are properly set up

### If data doesn't appear:
1. Verify that sample data was inserted
2. Check that the user IDs match between auth.users and your users table
3. Ensure RLS policies allow the user to access their data

### If document upload fails:
1. Check that the storage bucket 'documents' was created
2. Verify storage policies are in place
3. Ensure the vector extension is enabled

## Next Steps

After setting up Supabase:
1. Your Next.js app will automatically connect to real Supabase
2. Demo accounts will work for authentication
3. Real data will be stored and retrieved
4. Document uploads will work with vector embeddings
5. Chat history will be persisted