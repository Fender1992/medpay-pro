// MedChat AI Pro - Create Auth Users Script
// Run this with: node create-auth-users.js

const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const supabaseUrl = 'https://xtjyjchqjtiymmxobgua.supabase.co';
const supabaseServiceKey = 'your-supabase-service-role-key'; // You need to get this from Supabase dashboard

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAuthUsers() {
  console.log('🔐 Creating demo auth users...');
  
  const users = [
    {
      email: 'admin@medchat.ai',
      password: 'admin123',
      role: 'admin',
      name: 'Dr. Sarah Chen'
    },
    {
      email: 'doctor@medchat.ai',
      password: 'doctor123',
      role: 'provider',
      name: 'Dr. Michael Rodriguez'
    },
    {
      email: 'patient@medchat.ai',
      password: 'patient123',
      role: 'user',
      name: 'John Thompson'
    }
  ];

  for (const user of users) {
    try {
      console.log(`Creating user: ${user.email}`);
      
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          name: user.name,
          role: user.role
        }
      });

      if (error) {
        console.error(`❌ Error creating ${user.email}:`, error.message);
      } else {
        console.log(`✅ Successfully created ${user.email}`);
      }
    } catch (err) {
      console.error(`❌ Exception creating ${user.email}:`, err.message);
    }
  }
  
  console.log('🎉 Auth user creation completed!');
}

// Alternative: Manual steps to create users
function printManualSteps() {
  console.log(`
🔐 MANUAL STEPS TO CREATE AUTH USERS:

1. Go to your Supabase dashboard
2. Navigate to Authentication > Users
3. Click "Add user" for each demo account:

   Admin Account:
   - Email: admin@medchat.ai
   - Password: admin123
   - Confirm: ✓
   
   Provider Account:
   - Email: doctor@medchat.ai
   - Password: doctor123
   - Confirm: ✓
   
   Patient Account:  
   - Email: patient@medchat.ai
   - Password: patient123
   - Confirm: ✓

4. After creating users, run the SQL script in your Supabase SQL Editor
5. The trigger will automatically sync the auth users with your users table
`);
}

// Check if service key is configured
if (supabaseServiceKey === 'your-supabase-service-role-key') {
  console.log('⚠️  Service key not configured. Showing manual steps instead...');
  printManualSteps();
} else {
  createAuthUsers();
}