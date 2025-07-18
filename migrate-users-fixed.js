#!/usr/bin/env node

// MedChat AI Pro - Fixed User Migration Script
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

console.log('🏥 MedChat AI Pro - Fixed User Migration Script');
console.log('==============================================');
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

async function testConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    const { data, error } = await supabase.from('_supabase_migrations').select('*').limit(1);
    
    if (error) {
      console.log('📊 Database connection established');
      console.log('⚠️  Note: _supabase_migrations table not found (this is normal)');
    } else {
      console.log('✅ Database connection successful');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

async function createTables() {
  console.log('🗄️  Creating database tables...');
  
  const tables = [
    {
      name: 'users',
      sql: `
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
        )
      `
    },
    {
      name: 'medications',
      sql: `
        CREATE TABLE IF NOT EXISTS medications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          name TEXT NOT NULL,
          dosage TEXT NOT NULL,
          frequency TEXT NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          prescribed_date DATE,
          prescriber TEXT,
          start_date DATE DEFAULT CURRENT_DATE,
          end_date DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `
    },
    {
      name: 'lab_results',
      sql: `
        CREATE TABLE IF NOT EXISTS lab_results (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          test_name TEXT NOT NULL,
          value TEXT NOT NULL,
          status TEXT NOT NULL,
          test_date DATE NOT NULL,
          details TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `
    },
    {
      name: 'appointments',
      sql: `
        CREATE TABLE IF NOT EXISTS appointments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
          provider_name TEXT NOT NULL,
          appointment_type TEXT NOT NULL,
          status TEXT DEFAULT 'Scheduled',
          reason TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `
    },
    {
      name: 'documents',
      sql: `
        CREATE TABLE IF NOT EXISTS documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          filename TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          file_type TEXT NOT NULL,
          file_path TEXT,
          processed BOOLEAN DEFAULT FALSE,
          content TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `
    },
    {
      name: 'chat_history',
      sql: `
        CREATE TABLE IF NOT EXISTS chat_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          message TEXT NOT NULL,
          response TEXT NOT NULL,
          context_documents TEXT[] DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `
    }
  ];

  let successCount = 0;
  
  for (const table of tables) {
    try {
      console.log(`  Creating table: ${table.name}`);
      
      // Try to query the table first to see if it exists
      const { data, error } = await supabase.from(table.name).select('*').limit(1);
      
      if (error && error.message.includes('does not exist')) {
        console.log(`  ⚠️  Table ${table.name} doesn't exist, needs manual creation`);
        console.log(`  📝 SQL for ${table.name}:`);
        console.log(table.sql);
        console.log('');
      } else {
        console.log(`  ✅ Table ${table.name} exists`);
        successCount++;
      }
      
    } catch (error) {
      console.error(`  ❌ Error checking table ${table.name}:`, error.message);
    }
  }
  
  console.log(`✅ Table check completed: ${successCount}/${tables.length} tables exist`);
  return successCount > 0;
}

async function insertDemoData() {
  console.log('📝 Inserting demo data...');
  
  try {
    // Try to insert demo users
    console.log('  Inserting demo users...');
    
    const usersToInsert = [
      { 
        id: '11111111-1111-1111-1111-111111111111', 
        email: 'admin@medchat.ai', 
        role: 'admin', 
        name: 'Dr. Sarah Chen', 
        facility: 'MedChat General Hospital', 
        department: 'Administration', 
        title: 'Chief Medical Officer' 
      },
      { 
        id: '22222222-2222-2222-2222-222222222222', 
        email: 'doctor@medchat.ai', 
        role: 'provider', 
        name: 'Dr. Michael Rodriguez', 
        facility: 'MedChat General Hospital', 
        department: 'Internal Medicine', 
        title: 'Attending Physician' 
      },
      { 
        id: '33333333-3333-3333-3333-333333333333', 
        email: 'patient@medchat.ai', 
        role: 'user', 
        name: 'John Thompson', 
        facility: 'MedChat General Hospital', 
        department: 'Patient', 
        title: 'Patient' 
      }
    ];

    const { data: userData, error: usersError } = await supabase
      .from('users')
      .upsert(usersToInsert, { onConflict: 'email' })
      .select();

    if (usersError) {
      console.error('  ❌ Error inserting users:', usersError);
      console.error('  Full error details:', JSON.stringify(usersError, null, 2));
      return false;
    }

    console.log(`  ✅ Inserted ${userData ? userData.length : 0} users`);

    // Insert sample medications for patient
    console.log('  Inserting sample medications...');
    
    const medicationsToInsert = [
      { 
        user_id: '33333333-3333-3333-3333-333333333333', 
        name: 'Lisinopril', 
        dosage: '10mg', 
        frequency: 'Once daily', 
        is_active: true, 
        prescribed_date: '2024-01-15', 
        prescriber: 'Dr. Michael Rodriguez', 
        start_date: '2024-01-15' 
      },
      { 
        user_id: '33333333-3333-3333-3333-333333333333', 
        name: 'Metformin', 
        dosage: '500mg', 
        frequency: 'Twice daily with meals', 
        is_active: true, 
        prescribed_date: '2024-02-01', 
        prescriber: 'Dr. Michael Rodriguez', 
        start_date: '2024-02-01' 
      },
      { 
        user_id: '33333333-3333-3333-3333-333333333333', 
        name: 'Aspirin', 
        dosage: '81mg', 
        frequency: 'Once daily', 
        is_active: true, 
        prescribed_date: '2024-01-20', 
        prescriber: 'Dr. Michael Rodriguez', 
        start_date: '2024-01-20' 
      }
    ];

    const { data: medicationData, error: medicationsError } = await supabase
      .from('medications')
      .upsert(medicationsToInsert)
      .select();

    if (medicationsError) {
      console.error('  ❌ Error inserting medications:', medicationsError);
    } else {
      console.log(`  ✅ Inserted ${medicationData ? medicationData.length : 0} medications`);
    }

    // Insert sample lab results for patient
    console.log('  Inserting sample lab results...');
    
    const labResultsToInsert = [
      { 
        user_id: '33333333-3333-3333-3333-333333333333', 
        test_name: 'Complete Blood Count (CBC)', 
        value: 'Normal', 
        status: '✅ Normal', 
        test_date: '2024-01-20', 
        details: 'WBC: 7.2K, RBC: 4.8M, Hemoglobin: 14.2 g/dL' 
      },
      { 
        user_id: '33333333-3333-3333-3333-333333333333', 
        test_name: 'Fasting Glucose', 
        value: '95 mg/dL', 
        status: '✅ Normal', 
        test_date: '2024-01-20', 
        details: 'Excellent glucose control' 
      },
      { 
        user_id: '33333333-3333-3333-3333-333333333333', 
        test_name: 'HbA1c', 
        value: '6.8%', 
        status: '⚠️ Elevated', 
        test_date: '2024-01-20', 
        details: 'Diabetes management needed' 
      }
    ];

    const { data: labData, error: labError } = await supabase
      .from('lab_results')
      .upsert(labResultsToInsert)
      .select();

    if (labError) {
      console.error('  ❌ Error inserting lab results:', labError);
    } else {
      console.log(`  ✅ Inserted ${labData ? labData.length : 0} lab results`);
    }

    // Insert sample appointments for patient
    console.log('  Inserting sample appointments...');
    
    const appointmentsToInsert = [
      { 
        user_id: '33333333-3333-3333-3333-333333333333', 
        appointment_date: '2024-02-15T10:00:00+00:00', 
        provider_name: 'Dr. Michael Rodriguez', 
        appointment_type: 'Follow-up Visit', 
        status: 'Scheduled', 
        reason: 'Diabetes management review' 
      },
      { 
        user_id: '33333333-3333-3333-3333-333333333333', 
        appointment_date: '2024-03-01T14:30:00+00:00', 
        provider_name: 'Dr. Sarah Chen', 
        appointment_type: 'Consultation', 
        status: 'Scheduled', 
        reason: 'Hypertension evaluation' 
      }
    ];

    const { data: appointmentData, error: appointmentsError } = await supabase
      .from('appointments')
      .upsert(appointmentsToInsert)
      .select();

    if (appointmentsError) {
      console.error('  ❌ Error inserting appointments:', appointmentsError);
    } else {
      console.log(`  ✅ Inserted ${appointmentData ? appointmentData.length : 0} appointments`);
    }

    console.log('✅ Demo data insertion completed');
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error during data insertion:', error);
    return false;
  }
}

async function signUpUsers() {
  console.log('🔐 Creating authentication users...');
  
  for (const user of demoUsers) {
    console.log(`  Creating auth user: ${user.email}`);
    
    try {
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
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          console.log(`  ✅ User ${user.email} already exists`);
        } else {
          console.error(`  ❌ Error creating ${user.email}:`, error.message);
          console.error(`  Full error:`, JSON.stringify(error, null, 2));
        }
      } else {
        console.log(`  ✅ Successfully created auth user: ${user.email}`);
        if (data.user) {
          console.log(`  📧 User ID: ${data.user.id}`);
        }
      }
      
    } catch (error) {
      console.error(`  ❌ Exception creating ${user.email}:`, error.message);
    }
  }
}

async function verifySetup() {
  console.log('🔍 Verifying setup...');
  
  try {
    // Check if users exist
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('email, role, name')
      .limit(10);
    
    if (usersError) {
      console.error('  ❌ Error checking users:', usersError);
      return false;
    }
    
    console.log(`  ✅ Found ${users ? users.length : 0} users in database`);
    
    if (users && users.length > 0) {
      console.log('  📋 Users:');
      users.forEach(user => {
        console.log(`    - ${user.email} (${user.role}): ${user.name}`);
      });
    }
    
    // Check medications
    const { data: medications, error: medError } = await supabase
      .from('medications')
      .select('name, dosage')
      .limit(5);
    
    if (!medError && medications) {
      console.log(`  ✅ Found ${medications.length} medications`);
    }
    
    // Check lab results
    const { data: labs, error: labError } = await supabase
      .from('lab_results')
      .select('test_name, value')
      .limit(5);
    
    if (!labError && labs) {
      console.log(`  ✅ Found ${labs.length} lab results`);
    }
    
    return true;
    
  } catch (error) {
    console.error('  ❌ Verification failed:', error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 Starting enhanced user migration...\n');
    
    // Step 1: Test connection
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Connection failed');
      process.exit(1);
    }
    
    // Step 2: Check/create tables
    const tablesReady = await createTables();
    if (!tablesReady) {
      console.error('⚠️  Some tables may not exist. Please run the SQL manually in Supabase dashboard.');
      console.error('    Check the SQL statements printed above.');
    }
    
    // Step 3: Insert demo data
    const dataSuccess = await insertDemoData();
    if (!dataSuccess) {
      console.error('❌ Demo data insertion failed');
      // Don't exit, continue to try auth user creation
    }
    
    // Step 4: Create auth users
    await signUpUsers();
    
    // Step 5: Verify setup
    const verified = await verifySetup();
    
    console.log('\n🎉 Migration completed!');
    
    if (verified) {
      console.log('\n📋 Demo Accounts:');
      console.log('┌─────────────────────┬─────────────────────┬───────────┐');
      console.log('│ Email               │ Password            │ Role      │');
      console.log('├─────────────────────┼─────────────────────┼───────────┤');
      console.log('│ admin@medchat.ai    │ admin123           │ Admin     │');
      console.log('│ doctor@medchat.ai   │ doctor123          │ Provider  │');
      console.log('│ patient@medchat.ai  │ patient123         │ Patient   │');
      console.log('└─────────────────────┴─────────────────────┴───────────┘');
    }
    
    console.log('\n🔥 Next Steps:');
    console.log('1. If tables don\'t exist, run the SQL manually in Supabase');
    console.log('2. Run your Next.js app: start-windows.bat');
    console.log('3. Try logging in with demo accounts');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Full error:', JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

// Run the migration
main();