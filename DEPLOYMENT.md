# 🚀 MedChat AI Pro - Deployment Guide

## Overview

MedChat AI Pro is now consolidated into a single, optimized application with all APIs configured and intelligent fallbacks for missing services.

## ✅ Current Configuration

Based on your `.env` file, you have:
- **✅ Anthropic Claude API** - Fully configured
- **✅ Supabase Database** - URL and anon key configured  
- **✅ OpenAI API** - Configured for embeddings

## 🎯 Quick Start

### Option 1: Simple Run
```bash
python run.py
```

### Option 2: Direct Streamlit
```bash
streamlit run app.py
```

### Option 3: Production Ready
```bash
pip install -r requirements.txt
python -m streamlit run app.py --server.port 8501 --server.headless true
```

## 🌐 Access the Application

Once running, access at: **http://localhost:8501**

## 🎭 Test Accounts (Mock Mode)

If Supabase database isn't set up, the app runs in mock mode with these accounts:

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| **Admin** | admin@medchat.ai | admin123 | Platform management & analytics |
| **Provider** | doctor@medchat.ai | doctor123 | Clinical tools & patient care |
| **Patient** | patient@medchat.ai | patient123 | Personal health records |

## 🗄️ Database Setup (Optional)

To use real Supabase database, run this SQL in your Supabase SQL Editor:

```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table (extends Supabase auth)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT CHECK (role IN ('admin', 'provider', 'user')),
    facility TEXT,
    department TEXT,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents with vector embeddings
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    filename TEXT NOT NULL,
    file_path TEXT,
    file_size INTEGER,
    file_type TEXT,
    content TEXT,
    embedding vector(1536),
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat history
CREATE TABLE chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    context_documents TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health data tables
CREATE TABLE medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    is_active BOOLEAN DEFAULT true,
    prescribed_date DATE,
    prescriber TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    test_name TEXT NOT NULL,
    value TEXT,
    status TEXT,
    test_date DATE,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    provider_name TEXT,
    appointment_date TIMESTAMPTZ,
    appointment_type TEXT,
    reason TEXT,
    status TEXT DEFAULT 'Scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
```

## 🔧 System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Streamlit UI  │    │   Claude AI     │    │   OpenAI        │
│   (app.py)      │────│   (Anthropic)   │    │   (Embeddings)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                              │
         │              ┌─────────────────┐            │
         └──────────────│   Supabase      │────────────┘
                        │   (PostgreSQL   │
                        │    + pgvector)  │
                        └─────────────────┘
```

## ⚡ Features Available

### 🤖 AI-Powered Chat
- **Real Claude AI responses** using your Anthropic API key
- **Role-specific prompts** for Admin, Provider, and Patient
- **Context-aware conversations** with medical knowledge
- **Document analysis** and Q&A with uploaded files

### 📄 Document Intelligence
- **Multi-format support**: PDF, images, text, CSV, JSON
- **OCR text extraction** from images and scanned documents
- **Semantic search** with OpenAI embeddings
- **Drag & drop upload** directly in chat interface

### 🏥 Healthcare Integration
- **HIPAA compliant** architecture and data handling
- **Role-based access** control (Admin/Provider/Patient)
- **Health data management** (medications, labs, appointments)
- **Platform analytics** for administrators

### 🔄 Smart Fallbacks
- **No Supabase**: Uses in-memory mock storage with sample data
- **No OpenAI**: Uses deterministic mock embeddings
- **No Claude**: Shows configuration prompts and basic responses

## 📊 Monitoring & Status

The application includes real-time status monitoring:
- **Database connection** status (Supabase vs Mock)
- **AI service availability** (Claude, OpenAI)
- **System health metrics** in sidebar
- **Error handling** with graceful degradation

## 🔐 Security Features

- **Environment variable** protection for API keys
- **No sensitive data** in logs or error messages
- **User session management** with role-based permissions
- **Comprehensive audit logging** for HIPAA compliance

## 🚀 Deployment Options

### Local Development
- Run with `python run.py`
- Development server at localhost:8501

### Production Deployment
- **Streamlit Cloud**: Push to GitHub and deploy
- **Docker**: Containerize with your preferred platform
- **Heroku/Railway**: Deploy with buildpack
- **AWS/GCP/Azure**: Use container services

## 📞 Support & Configuration

The application is designed to work immediately with your configured API keys. It will:

1. **Auto-detect available services** and configure accordingly
2. **Provide helpful status indicators** in the UI
3. **Offer configuration guidance** when services are missing
4. **Fall back gracefully** to demo mode when needed

---

🏥 **MedChat AI Pro** - Your intelligent healthcare companion is ready to launch!