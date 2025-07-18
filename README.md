# 🏥 MedChat AI Pro

> **Advanced Healthcare AI Assistant with Claude AI, Supabase, and OpenAI Integration**

A complete healthcare AI platform featuring real-time conversations, document processing, and role-based dashboards built with Next.js 14 and modern web technologies.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- API Keys: Anthropic (Claude), OpenAI, Supabase

### Installation
```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# 3. Start development server
npm run dev

# 4. Open browser
http://localhost:3000
```

### Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Administrator | admin@medchat.ai | admin123 |
| Healthcare Provider | doctor@medchat.ai | doctor123 |
| Patient | patient@medchat.ai | patient123 |

## ✨ Key Features

- 🤖 **Claude AI Integration** - Real-time medical conversations and analysis
- 📄 **Document Processing** - Drag-and-drop upload with vector embeddings
- 🎨 **Modern UI/UX** - Dark/light mode with responsive design
- 👥 **Role-Based Access** - Tailored dashboards for different user types
- 📊 **Live Analytics** - Real-time platform metrics and insights
- 🔒 **HIPAA Compliant** - Healthcare data security and encryption
- 🌐 **Production Ready** - Vercel deployment configuration

## 🏗️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Supabase (PostgreSQL + pgvector)
- **AI Services**: Claude AI (Anthropic), OpenAI (Embeddings)
- **UI Components**: Heroicons, Framer Motion
- **Deployment**: Vercel-optimized

## 📋 Environment Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# AI Service Keys
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key
```

## 🚀 Vercel Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/medchat-ai-pro)

1. Push code to GitHub
2. Import repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

## 📖 Complete Documentation

For comprehensive documentation including:
- **Full journey and lessons learned**
- **Detailed technical implementation**
- **Troubleshooting guide**
- **Production deployment**
- **Security best practices**

See: **[MEDCHAT-AI-PRO-COMPLETE.md](./MEDCHAT-AI-PRO-COMPLETE.md)**

## 🔧 Development Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # Code linting
```

## 📁 Project Structure

```
src/
├── app/              # Next.js App Router
├── components/       # React components
├── lib/             # Services (AI, Database)
├── types/           # TypeScript definitions
└── contexts/        # React contexts
```

---

🏥 **MedChat AI Pro** - *Your Intelligent Healthcare Companion*

**Version**: 3.0.0 | **Status**: Production Ready | **License**: MIT