// Core application types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'provider' | 'user';
  facility?: string;
  department?: string;
  title?: string;
  created_at?: string;
  first_login?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | string;
  type?: 'text' | 'document';
  documents?: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    uploadedAt: Date;
    userId: string;
  }>;
  metadata?: {
    sources?: string[];
    confidence?: number;
    context_used?: boolean;
    langchain_enhanced?: boolean;
  };
}

export interface Document {
  id: string;
  user_id: string;
  filename: string;
  file_path?: string;
  file_size: number;
  file_type: string;
  content?: string;
  embedding?: number[];
  processed: boolean;
  created_at: string;
}

export interface HealthRecord {
  medications: Medication[];
  lab_results: LabResult[];
  appointments: Appointment[];
  vital_signs?: VitalSign[];
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  is_active: boolean;
  prescribed_date?: string;
  prescriber?: string;
}

export interface LabResult {
  id: string;
  test_name: string;
  value: string;
  status: string;
  test_date: string;
  details?: string;
}

export interface Appointment {
  id: string;
  appointment_date: string;
  provider_name: string;
  appointment_type: string;
  reason?: string;
  status: string;
}

export interface VitalSign {
  date: string;
  blood_pressure?: string;
  heart_rate?: string;
  temperature?: string;
  weight?: string;
  height?: string;
}

export interface PlatformStats {
  totalUsers: number;
  totalChats: number;
  totalDocuments: number;
  avgResponseTime: number;
  userGrowth: number;
  chatGrowth: number;
  documentGrowth: number;
  usersByRole: Array<{
    role: string;
    count: number;
  }>;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
  // Legacy fields for backward compatibility
  total_users?: number;
  active_sessions?: number;
  monthly_chats?: number;
  user_breakdown?: {
    admin: number;
    provider: number;
    user: number;
  };
  revenue_monthly?: number;
  growth_rate?: number;
  system_uptime?: number;
}

export interface APIStatus {
  claude: {
    available: boolean;
    status: string;
    model?: string;
  };
  openai: {
    available: boolean;
    status: string;
    model?: string;
  };
  database: {
    available: boolean;
    status: string;
    type: string;
  };
}

export interface ChatRequest {
  message: string;
  user_id: string;
  user_role: string;
  documents?: Document[];
  health_data?: HealthRecord;
}

export interface ChatResponse {
  response: string;
  success: boolean;
  error?: string;
  metadata?: {
    sources?: string[];
    confidence?: number;
    context_used?: boolean;
    processing_time?: number;
  };
}