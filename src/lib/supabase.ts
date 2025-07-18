import { createClient } from '@supabase/supabase-js';
import { User, HealthRecord, Document, PlatformStats, ChatMessage } from '@/types';

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database service with mock fallback
export class DatabaseService {
  private useRealDB: boolean;
  private mockData: any;

  constructor() {
    // Check if we have valid Supabase credentials
    this.useRealDB = !!(
      supabaseUrl && 
      supabaseKey && 
      supabaseUrl !== 'your_supabase_url_here' && 
      supabaseKey !== 'your_supabase_anon_key_here' &&
      supabaseUrl.includes('supabase.co')
    );
    
    // Always initialize mock data for demo accounts
    this.initMockData();
    
    console.log(`DatabaseService initialized: ${this.useRealDB ? 'Real Supabase' : 'Mock Mode'}`);
  }

  private initMockData() {
    this.mockData = {
      users: {
        'admin@medchat.ai': {
          id: 'admin-001',
          email: 'admin@medchat.ai',
          password: 'admin123',
          role: 'admin',
          name: 'Dr. Sarah Chen',
          facility: 'MedChat General Hospital',
          department: 'Administration',
          title: 'Chief Medical Officer'
        },
        'doctor@medchat.ai': {
          id: 'provider-001',
          email: 'doctor@medchat.ai',
          password: 'doctor123',
          role: 'provider',
          name: 'Dr. Michael Rodriguez',
          facility: 'MedChat General Hospital',
          department: 'Internal Medicine',
          title: 'Attending Physician'
        },
        'patient@medchat.ai': {
          id: 'patient-001',
          email: 'patient@medchat.ai',
          password: 'patient123',
          role: 'user',
          name: 'John Thompson',
          facility: 'MedChat General Hospital',
          department: 'Patient',
          title: 'Patient'
        }
      },
      healthRecords: {
        'patient-001': {
          medications: [
            {
              id: 'med-001',
              name: 'Lisinopril',
              dosage: '10mg',
              frequency: 'Once daily',
              is_active: true,
              prescribed_date: '2024-01-15',
              prescriber: 'Dr. Michael Rodriguez'
            },
            {
              id: 'med-002',
              name: 'Metformin',
              dosage: '500mg',
              frequency: 'Twice daily with meals',
              is_active: true,
              prescribed_date: '2024-02-01',
              prescriber: 'Dr. Michael Rodriguez'
            }
          ],
          lab_results: [
            {
              id: 'lab-001',
              test_name: 'Complete Blood Count (CBC)',
              value: 'Normal',
              status: '✅ Normal',
              test_date: '2024-01-20',
              details: 'WBC: 7.2K, RBC: 4.8M, Hemoglobin: 14.2 g/dL'
            },
            {
              id: 'lab-002',
              test_name: 'Fasting Glucose',
              value: '95 mg/dL',
              status: '✅ Normal',
              test_date: '2024-01-20',
              details: 'Excellent glucose control'
            }
          ],
          appointments: [
            {
              id: 'apt-001',
              appointment_date: '2024-02-15T10:00:00',
              provider_name: 'Dr. Michael Rodriguez',
              appointment_type: 'Follow-up Visit',
              status: 'Scheduled',
              reason: 'Diabetes management review'
            }
          ],
          vital_signs: [
            {
              date: '2024-01-22',
              heart_rate: '72 bpm',
              blood_pressure: '120/80 mmHg',
              temperature: '98.6°F',
              weight: '170 lbs',
              height: '5\'10"'
            },
            {
              date: '2024-01-15',
              heart_rate: '75 bpm',
              blood_pressure: '118/78 mmHg',
              temperature: '98.4°F',
              weight: '172 lbs',
              height: '5\'10"'
            }
          ]
        }
      },
      documents: {},
      chatHistory: [],
      platformStats: {
        totalUsers: 1247,
        totalChats: 8950,
        totalDocuments: 15420,
        avgResponseTime: 1.2,
        userGrowth: 15.3,
        chatGrowth: 23.8,
        documentGrowth: 18.5,
        usersByRole: [
          { role: 'admin', count: 12 },
          { role: 'provider', count: 145 },
          { role: 'user', count: 1090 }
        ],
        recentActivity: [
          {
            type: 'chat',
            description: 'New AI conversation started by Dr. Smith',
            timestamp: new Date(Date.now() - 300000).toISOString()
          },
          {
            type: 'document',
            description: 'Lab report uploaded by Jane Doe',
            timestamp: new Date(Date.now() - 600000).toISOString()
          },
          {
            type: 'user',
            description: 'New provider registered: Dr. Johnson',
            timestamp: new Date(Date.now() - 900000).toISOString()
          },
          {
            type: 'chat',
            description: 'Patient consultation completed',
            timestamp: new Date(Date.now() - 1200000).toISOString()
          },
          {
            type: 'document',
            description: 'X-ray analysis processed',
            timestamp: new Date(Date.now() - 1500000).toISOString()
          }
        ],
        // Legacy fields for backward compatibility
        total_users: 1247,
        active_sessions: 89,
        monthly_chats: 8950,
        user_breakdown: {
          admin: 12,
          provider: 145,
          user: 1090
        },
        revenue_monthly: 125000,
        growth_rate: 23.5,
        system_uptime: 99.9
      }
    };
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    // Always try mock data first for demo accounts
    const mockUser = this.mockData.users[email];
    if (mockUser && mockUser.password === password) {
      const { password: _, ...userWithoutPassword } = mockUser;
      console.log('✅ Mock user authenticated:', email);
      return userWithoutPassword;
    }

    // Only try real Supabase auth if configured and not a demo account
    if (this.useRealDB && !email.includes('@medchat.ai')) {
      try {
        console.log('🔐 Attempting Supabase authentication for:', email);
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          console.error('Supabase auth error:', error.message);
          return null;
        }

        if (!data.user) {
          console.error('No user returned from Supabase');
          return null;
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          // Return basic user info even if profile fetch fails
          return {
            id: data.user.id,
            email: data.user.email!,
            role: 'user',
            name: data.user.email!.split('@')[0],
            facility: 'Unknown',
            department: 'Unknown',
            title: 'User',
            first_login: false
          };
        }

        return {
          id: data.user.id,
          email: data.user.email!,
          role: profile?.role || 'user',
          name: profile?.name || 'Unknown User',
          facility: profile?.facility,
          department: profile?.department,
          title: profile?.title,
          first_login: profile?.first_login || false
        };
      } catch (error) {
        console.error('Authentication error:', error);
        return null;
      }
    }

    console.log('❌ No valid authentication method found for:', email);
    return null;
  }

  async getHealthData(userId: string): Promise<HealthRecord> {
    if (!this.useRealDB) {
      return this.mockData.healthRecords[userId] || {
        medications: [],
        lab_results: [],
        appointments: [],
        vital_signs: []
      };
    }

    try {
      const [medications, labResults, appointments, vitalSigns] = await Promise.all([
        supabase
          .from('medications')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true),
        supabase
          .from('lab_results')
          .select('*')
          .eq('user_id', userId)
          .order('test_date', { ascending: false })
          .limit(10),
        supabase
          .from('appointments')
          .select('*')
          .eq('user_id', userId)
          .order('appointment_date', { ascending: false })
          .limit(10),
        supabase
          .from('vital_signs')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(5)
      ]);

      return {
        medications: medications.data || [],
        lab_results: labResults.data || [],
        appointments: appointments.data || [],
        vital_signs: vitalSigns.data || []
      };
    } catch (error) {
      console.error('Error getting health data:', error);
      return { 
        medications: [], 
        lab_results: [], 
        appointments: [],
        vital_signs: []
      };
    }
  }

  async getPlatformStats(): Promise<PlatformStats> {
    if (!this.useRealDB) {
      return this.mockData.platformStats;
    }

    try {
      const [users, chats, documents] = await Promise.all([
        supabase.from('users').select('role'),
        supabase.from('chat_history').select('id', { count: 'exact' }),
        supabase.from('documents').select('id', { count: 'exact' })
      ]);

      const userBreakdown = users.data?.reduce((acc: any, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {}) || {};

      const usersByRole = Object.entries(userBreakdown).map(([role, count]) => ({
        role,
        count: count as number
      }));

      // Generate some mock recent activity
      const recentActivity = [
        {
          type: 'chat',
          description: 'New AI conversation started',
          timestamp: new Date(Date.now() - 300000).toISOString()
        },
        {
          type: 'document',
          description: 'Document uploaded and processed',
          timestamp: new Date(Date.now() - 600000).toISOString()
        },
        {
          type: 'user',
          description: 'New user registered',
          timestamp: new Date(Date.now() - 900000).toISOString()
        }
      ];

      return {
        totalUsers: users.data?.length || 0,
        totalChats: chats.count || 0,
        totalDocuments: documents.count || 0,
        avgResponseTime: 1.8, // Would need real tracking
        userGrowth: 12.5, // Would need historical data
        chatGrowth: 18.3, // Would need historical data
        documentGrowth: 15.7, // Would need historical data
        usersByRole,
        recentActivity,
        // Legacy fields for backward compatibility
        total_users: users.data?.length || 0,
        active_sessions: 0,
        monthly_chats: chats.count || 0,
        user_breakdown: userBreakdown
      };
    } catch (error) {
      console.error('Error getting platform stats:', error);
      return this.mockData.platformStats;
    }
  }

  async saveChatMessage(userId: string, message: string, response: string, contextDocs?: string[]): Promise<boolean> {
    const chatMessage = {
      user_id: userId,
      message,
      response,
      context_documents: contextDocs || [],
      created_at: new Date().toISOString()
    };

    if (!this.useRealDB) {
      this.mockData.chatHistory.push(chatMessage);
      return true;
    }

    try {
      const { error } = await supabase
        .from('chat_history')
        .insert(chatMessage);
      
      return !error;
    } catch (error) {
      console.error('Error saving chat message:', error);
      return false;
    }
  }

  async uploadDocument(file: File, userId: string): Promise<Document | null> {
    const fileData = await file.arrayBuffer();
    const filename = file.name;
    const fileType = file.type;
    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const document: Document = {
      id: documentId,
      user_id: userId,
      filename,
      file_size: fileData.byteLength,
      file_type: fileType,
      processed: false,
      created_at: new Date().toISOString()
    };

    if (!this.useRealDB) {
      this.mockData.documents[documentId] = { ...document, file_data: fileData };
      return document;
    }

    try {
      // Upload to Supabase storage
      const filePath = `${userId}/${filename}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, fileData);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      // Save metadata
      const { data, error } = await supabase
        .from('documents')
        .insert({
          ...document,
          file_path: filePath
        })
        .select()
        .single();

      return error ? null : data;
    } catch (error) {
      console.error('Error uploading document:', error);
      return null;
    }
  }

  async getUserDocuments(userId: string): Promise<Document[]> {
    if (!this.useRealDB) {
      return Object.values(this.mockData.documents)
        .filter((doc: any) => doc.user_id === userId)
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as Document[];
    }

    try {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      return data || [];
    } catch (error) {
      console.error('Error getting user documents:', error);
      return [];
    }
  }

  async getAllUsers(): Promise<User[]> {
    if (!this.useRealDB) {
      return Object.values(this.mockData.users).map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        facility: user.facility,
        department: user.department,
        title: user.title,
        first_login: user.first_login || false,
        created_at: new Date().toISOString()
      }));
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async createUser(userData: {
    email: string;
    name: string;
    role: 'admin' | 'provider' | 'user';
    facility?: string;
    department?: string;
    title?: string;
    password: string;
    first_login?: boolean;
  }): Promise<User> {
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (!this.useRealDB) {
      const newUser = {
        id: userId,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        facility: userData.facility || '',
        department: userData.department || '',
        title: userData.title || '',
        password: userData.password,
        first_login: userData.first_login || false,
        created_at: new Date().toISOString()
      };
      
      this.mockData.users[userData.email] = newUser;
      
      return {
        id: userId,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        facility: userData.facility,
        department: userData.department,
        title: userData.title,
        first_login: userData.first_login,
        created_at: new Date().toISOString()
      };
    }

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true
      });

      if (authError) {
        throw new Error(`Auth creation failed: ${authError.message}`);
      }

      // Create profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          facility: userData.facility,
          department: userData.department,
          title: userData.title,
          first_login: userData.first_login || false
        })
        .select()
        .single();

      if (profileError) {
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      return profileData;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(userData: User): Promise<void> {
    if (!this.useRealDB) {
      // Find user in mock data by email
      const mockUser = Object.values(this.mockData.users).find((user: any) => user.id === userData.id);
      if (mockUser) {
        Object.assign(mockUser, {
          name: userData.name,
          role: userData.role,
          facility: userData.facility,
          department: userData.department,
          title: userData.title,
          first_login: userData.first_login
        });
        
        // Update the key in users object if email is found
        const userEmail = Object.keys(this.mockData.users).find(email => 
          this.mockData.users[email].id === userData.id
        );
        if (userEmail) {
          this.mockData.users[userEmail] = mockUser;
        }
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: userData.name,
          role: userData.role,
          facility: userData.facility,
          department: userData.department,
          title: userData.title,
          first_login: userData.first_login
        })
        .eq('id', userData.id);

      if (error) {
        throw new Error(`User update failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    if (!this.useRealDB) {
      // Find and remove from mock data
      const userEmail = Object.keys(this.mockData.users).find(email => 
        this.mockData.users[email].id === userId
      );
      if (userEmail) {
        delete this.mockData.users[userEmail];
      }
      return;
    }

    try {
      // Delete from profile table
      const { error: profileError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (profileError) {
        throw new Error(`Profile deletion failed: ${profileError.message}`);
      }

      // Delete auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authError) {
        console.warn('Auth user deletion failed:', authError.message);
        // Continue anyway as profile is deleted
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    if (!this.useRealDB) {
      // For mock data, just update the password
      const userEmail = Object.keys(this.mockData.users).find(email => 
        this.mockData.users[email].id === userId
      );
      if (userEmail) {
        const user = this.mockData.users[userEmail];
        if (user.password === currentPassword) {
          user.password = newPassword;
        } else {
          throw new Error('Current password is incorrect');
        }
      }
      return;
    }

    try {
      // Verify current password by attempting to sign in
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw new Error(`Password update failed: ${updateError.message}`);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    if (!this.useRealDB) {
      // For mock data, just update the password
      const userEmail = Object.keys(this.mockData.users).find(email => 
        this.mockData.users[email].id === userId
      );
      if (userEmail) {
        const user = this.mockData.users[userEmail];
        user.password = newPassword;
      }
      return;
    }

    try {
      // Update password without requiring current password (for first login)
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (error) {
        throw new Error(`Password update failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    if (!this.useRealDB) {
      const user: any = Object.values(this.mockData.users).find((user: any) => user.id === userId);
      return user ? {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        facility: user.facility,
        department: user.department,
        title: user.title,
        first_login: user.first_login || false,
        created_at: new Date().toISOString()
      } : null;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  getConnectionStatus() {
    return {
      connected: this.useRealDB,
      type: this.useRealDB ? 'Supabase' : 'Mock',
      status: this.useRealDB ? 'Connected' : 'Mock Mode'
    };
  }
}

export const dbService = new DatabaseService();