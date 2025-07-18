-- MedChat AI Pro - Supabase User Setup Script
-- Run this in your Supabase SQL Editor

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
    embedding VECTOR(1536), -- For OpenAI embeddings
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

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their own medications" ON medications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own lab results" ON lab_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own appointments" ON appointments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own documents" ON documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own chat history" ON chat_history FOR SELECT USING (auth.uid() = user_id);

-- Insert demo users
INSERT INTO users (id, email, role, name, facility, department, title) VALUES 
    ('11111111-1111-1111-1111-111111111111', 'admin@medchat.ai', 'admin', 'Dr. Sarah Chen', 'MedChat General Hospital', 'Administration', 'Chief Medical Officer'),
    ('22222222-2222-2222-2222-222222222222', 'doctor@medchat.ai', 'provider', 'Dr. Michael Rodriguez', 'MedChat General Hospital', 'Internal Medicine', 'Attending Physician'),
    ('33333333-3333-3333-3333-333333333333', 'patient@medchat.ai', 'user', 'John Thompson', 'MedChat General Hospital', 'Patient', 'Patient')
ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    facility = EXCLUDED.facility,
    department = EXCLUDED.department,
    title = EXCLUDED.title,
    updated_at = NOW();

-- Insert sample medications for patient
INSERT INTO medications (user_id, name, dosage, frequency, is_active, prescribed_date, prescriber, start_date) VALUES 
    ('33333333-3333-3333-3333-333333333333', 'Lisinopril', '10mg', 'Once daily', TRUE, '2024-01-15', 'Dr. Michael Rodriguez', '2024-01-15'),
    ('33333333-3333-3333-3333-333333333333', 'Metformin', '500mg', 'Twice daily with meals', TRUE, '2024-02-01', 'Dr. Michael Rodriguez', '2024-02-01'),
    ('33333333-3333-3333-3333-333333333333', 'Aspirin', '81mg', 'Once daily', TRUE, '2024-01-20', 'Dr. Michael Rodriguez', '2024-01-20')
ON CONFLICT DO NOTHING;

-- Insert sample lab results for patient
INSERT INTO lab_results (user_id, test_name, value, status, test_date, details) VALUES 
    ('33333333-3333-3333-3333-333333333333', 'Complete Blood Count (CBC)', 'Normal', '✅ Normal', '2024-01-20', 'WBC: 7.2K, RBC: 4.8M, Hemoglobin: 14.2 g/dL'),
    ('33333333-3333-3333-3333-333333333333', 'Fasting Glucose', '95 mg/dL', '✅ Normal', '2024-01-20', 'Excellent glucose control'),
    ('33333333-3333-3333-3333-333333333333', 'HbA1c', '6.8%', '⚠️ Elevated', '2024-01-20', 'Diabetes management needed'),
    ('33333333-3333-3333-3333-333333333333', 'Blood Pressure', '128/82 mmHg', '⚠️ Elevated', '2024-01-25', 'Hypertension monitoring required')
ON CONFLICT DO NOTHING;

-- Insert sample appointments for patient
INSERT INTO appointments (user_id, appointment_date, provider_name, appointment_type, status, reason) VALUES 
    ('33333333-3333-3333-3333-333333333333', '2024-02-15 10:00:00+00', 'Dr. Michael Rodriguez', 'Follow-up Visit', 'Scheduled', 'Diabetes management review'),
    ('33333333-3333-3333-3333-333333333333', '2024-03-01 14:30:00+00', 'Dr. Sarah Chen', 'Consultation', 'Scheduled', 'Hypertension evaluation'),
    ('33333333-3333-3333-3333-333333333333', '2024-02-28 09:00:00+00', 'Lab Technician', 'Lab Work', 'Scheduled', 'Routine blood work')
ON CONFLICT DO NOTHING;

-- Create auth users (you'll need to do this through Supabase Auth)
-- Note: You'll need to create these users in the Supabase Auth system separately
-- with the following credentials:
-- 
-- admin@medchat.ai / admin123
-- doctor@medchat.ai / doctor123  
-- patient@medchat.ai / patient123

-- Create a function to sync auth users with our users table
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO users (id, email, role, name, facility, department, title)
    VALUES (
        NEW.id,
        NEW.email,
        CASE 
            WHEN NEW.email = 'admin@medchat.ai' THEN 'admin'
            WHEN NEW.email = 'doctor@medchat.ai' THEN 'provider'
            ELSE 'user'
        END,
        CASE 
            WHEN NEW.email = 'admin@medchat.ai' THEN 'Dr. Sarah Chen'
            WHEN NEW.email = 'doctor@medchat.ai' THEN 'Dr. Michael Rodriguez'
            WHEN NEW.email = 'patient@medchat.ai' THEN 'John Thompson'
            ELSE 'New User'
        END,
        'MedChat General Hospital',
        CASE 
            WHEN NEW.email = 'admin@medchat.ai' THEN 'Administration'
            WHEN NEW.email = 'doctor@medchat.ai' THEN 'Internal Medicine'
            ELSE 'Patient'
        END,
        CASE 
            WHEN NEW.email = 'admin@medchat.ai' THEN 'Chief Medical Officer'
            WHEN NEW.email = 'doctor@medchat.ai' THEN 'Attending Physician'
            ELSE 'Patient'
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new auth users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', FALSE);

-- Create storage policy
CREATE POLICY "Users can upload their own documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view their own documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable vector extension for document embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents USING ivfflat (embedding vector_cosine_ops);

-- Success message
SELECT 'Database setup completed successfully!' AS status;