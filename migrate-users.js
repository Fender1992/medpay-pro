#!/usr/bin/env node

// MedChat AI Pro - User Migration Script
// This script will create demo users in your Supabase project

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  
  const envContent = fs.readFileSync(filePath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#][^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      envVars[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
  });
  
  return envVars;
}

// Load environment variables from .env files
const envFiles = ['.env', '.env.local'];
let envVars = {};

envFiles.forEach(file => {
  const vars = loadEnvFile(path.join(__dirname, file));
  envVars = { ...envVars, ...vars };
});

// Your Supabase credentials
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🏥 MedChat AI Pro - User Migration Script');
console.log('=========================================');
console.log(`📡 Supabase URL: ${supabaseUrl}`);
console.log(`🔑 Anon Key: ${supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'Not found'}`);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase credentials not found in environment files');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Demo users to create
const demoUsers = [
  {
    email: 'admin@medchat.ai',
    password: 'admin123',
    role: 'admin',
    name: 'Dr. Sarah Chen',
    facility: 'MedChat General Hospital',
    department: 'Administration',
    title: 'Chief Medical Officer'
  },
  {
    email: 'doctor@medchat.ai',
    password: 'doctor123',
    role: 'provider',
    name: 'Dr. Michael Rodriguez',
    facility: 'MedChat General Hospital',
    department: 'Internal Medicine',
    title: 'Attending Physician'
  },
  {
    email: 'patient@medchat.ai',
    password: 'patient123',
    role: 'user',
    name: 'John Thompson',
    facility: 'MedChat General Hospital',
    department: 'Patient',
    title: 'Patient'
  }
];

async function runSQL(sql) {
  console.log('📊 Running SQL script...');
  
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.error('❌ SQL Error:', error);
    return false;
  }
  
  console.log('✅ SQL executed successfully');
  return true;
}

async function createDatabase() {
  console.log('🗄️  Setting up database schema...');
  
  const sql = `
-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'provider', 'user')),
    name TEXT NOT NULL,
    facility TEXT,
    department TEXT,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create medications table
CREATE TABLE IF NOT EXISTS medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    prescribed_date DATE,
    prescriber TEXT,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lab_results table
CREATE TABLE IF NOT EXISTS lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    test_name TEXT NOT NULL,
    value TEXT NOT NULL,
    status TEXT NOT NULL,
    test_date DATE NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    provider_name TEXT NOT NULL,
    appointment_type TEXT NOT NULL,
    status TEXT DEFAULT 'Scheduled',
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    file_path TEXT,
    processed BOOLEAN DEFAULT FALSE,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_history table
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    context_documents TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable vector extension if available
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
    -- Add vector column to documents table
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding vector(1536);
EXCEPTION
    WHEN others THEN
        NULL; -- Ignore if vector extension is not available
END $$;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can view their own medications" ON medications;
DROP POLICY IF EXISTS "Users can view their own lab results" ON lab_results;
DROP POLICY IF EXISTS "Users can view their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
DROP POLICY IF EXISTS "Users can view their own chat history" ON chat_history;

-- Create RLS policies
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view their own medications" ON medications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own lab results" ON lab_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own appointments" ON appointments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own documents" ON documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own chat history" ON chat_history FOR SELECT USING (auth.uid() = user_id);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
`;

  try {
    // Split SQL into individual statements and execute them
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement.trim() + ';' });
        if (error) {
          console.log(`⚠️  SQL warning: ${error.message}`);
        }
      }
    }
    
    console.log('✅ Database schema created successfully');
    return true;
  } catch (error) {
    console.error('❌ Database creation error:', error);
    return false;
  }
}

async function insertDemoData() {
  console.log('📝 Inserting demo data...');
  
  // Insert demo users
  const { error: usersError } = await supabase
    .from('users')
    .upsert([
      { id: '11111111-1111-1111-1111-111111111111', email: 'admin@medchat.ai', role: 'admin', name: 'Dr. Sarah Chen', facility: 'MedChat General Hospital', department: 'Administration', title: 'Chief Medical Officer' },
      { id: '22222222-2222-2222-2222-222222222222', email: 'doctor@medchat.ai', role: 'provider', name: 'Dr. Michael Rodriguez', facility: 'MedChat General Hospital', department: 'Internal Medicine', title: 'Attending Physician' },
      { id: '33333333-3333-3333-3333-333333333333', email: 'patient@medchat.ai', role: 'user', name: 'John Thompson', facility: 'MedChat General Hospital', department: 'Patient', title: 'Patient' }
    ]);

  if (usersError) {
    console.error('❌ Error inserting users:', usersError);
    return false;
  }

  // Insert sample medications for patient
  const { error: medicationsError } = await supabase
    .from('medications')
    .upsert([
      { user_id: '33333333-3333-3333-3333-333333333333', name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', is_active: true, prescribed_date: '2024-01-15', prescriber: 'Dr. Michael Rodriguez', start_date: '2024-01-15' },
      { user_id: '33333333-3333-3333-3333-333333333333', name: 'Metformin', dosage: '500mg', frequency: 'Twice daily with meals', is_active: true, prescribed_date: '2024-02-01', prescriber: 'Dr. Michael Rodriguez', start_date: '2024-02-01' },
      { user_id: '33333333-3333-3333-3333-333333333333', name: 'Aspirin', dosage: '81mg', frequency: 'Once daily', is_active: true, prescribed_date: '2024-01-20', prescriber: 'Dr. Michael Rodriguez', start_date: '2024-01-20' }
    ]);

  if (medicationsError) {
    console.error('❌ Error inserting medications:', medicationsError);
  }

  // Insert sample lab results for patient
  const { error: labError } = await supabase
    .from('lab_results')
    .upsert([
      { user_id: '33333333-3333-3333-3333-333333333333', test_name: 'Complete Blood Count (CBC)', value: 'Normal', status: '✅ Normal', test_date: '2024-01-20', details: 'WBC: 7.2K, RBC: 4.8M, Hemoglobin: 14.2 g/dL' },
      { user_id: '33333333-3333-3333-3333-333333333333', test_name: 'Fasting Glucose', value: '95 mg/dL', status: '✅ Normal', test_date: '2024-01-20', details: 'Excellent glucose control' },
      { user_id: '33333333-3333-3333-3333-333333333333', test_name: 'HbA1c', value: '6.8%', status: '⚠️ Elevated', test_date: '2024-01-20', details: 'Diabetes management needed' }
    ]);

  if (labError) {
    console.error('❌ Error inserting lab results:', labError);
  }

  // Insert sample appointments for patient
  const { error: appointmentsError } = await supabase
    .from('appointments')
    .upsert([
      { user_id: '33333333-3333-3333-3333-333333333333', appointment_date: '2024-02-15T10:00:00+00:00', provider_name: 'Dr. Michael Rodriguez', appointment_type: 'Follow-up Visit', status: 'Scheduled', reason: 'Diabetes management review' },
      { user_id: '33333333-3333-3333-3333-333333333333', appointment_date: '2024-03-01T14:30:00+00:00', provider_name: 'Dr. Sarah Chen', appointment_type: 'Consultation', status: 'Scheduled', reason: 'Hypertension evaluation' }
    ]);

  if (appointmentsError) {
    console.error('❌ Error inserting appointments:', appointmentsError);
  }

  console.log('✅ Demo data inserted successfully');
  return true;
}

async function signUpUsers() {
  console.log('🔐 Creating authentication users...');
  
  for (const user of demoUsers) {
    console.log(`Creating auth user: ${user.email}`);
    
    const { data, error } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        data: {
          name: user.name,
          role: user.role
        }
      }
    });
    
    if (error) {
      if (error.message.includes('already registered')) {
        console.log(`✅ User ${user.email} already exists`);
      } else {
        console.error(`❌ Error creating ${user.email}:`, error.message);
      }
    } else {
      console.log(`✅ Successfully created auth user: ${user.email}`);
    }
  }
}

async function main() {
  try {
    console.log('🚀 Starting user migration...\n');
    
    // Step 1: Create database schema
    const dbSuccess = await createDatabase();
    if (!dbSuccess) {
      console.error('❌ Database setup failed');
      process.exit(1);
    }
    
    // Step 2: Insert demo data
    const dataSuccess = await insertDemoData();
    if (!dataSuccess) {
      console.error('❌ Demo data insertion failed');
      process.exit(1);
    }
    
    // Step 3: Create auth users
    await signUpUsers();
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Demo Accounts Created:');
    console.log('┌─────────────────────┬─────────────────────┬───────────┐');
    console.log('│ Email               │ Password            │ Role      │');
    console.log('├─────────────────────┼─────────────────────┼───────────┤');
    console.log('│ admin@medchat.ai    │ admin123           │ Admin     │');
    console.log('│ doctor@medchat.ai   │ doctor123          │ Provider  │');
    console.log('│ patient@medchat.ai  │ patient123         │ Patient   │');
    console.log('└─────────────────────┴─────────────────────┴───────────┘');
    
    console.log('\n🔥 Next Steps:');
    console.log('1. Run your Next.js app: start-windows.bat');
    console.log('2. Try logging in with any of the demo accounts');
    console.log('3. Check that real data appears in the dashboards');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
main();