# Database Schema Documentation

This document provides comprehensive documentation for the Healthcare AI Chat Application database schema, designed for HIPAA compliance and optimal performance.

## Overview

The database is built on PostgreSQL with extensions for vector operations, encryption, and UUID generation. The schema supports:

- **HIPAA Compliance**: Encrypted patient data with comprehensive audit trails
- **AI Integration**: Vector embeddings for semantic search
- **Multi-tenancy**: Support for multiple healthcare facilities
- **Real-time Chat**: Optimized for conversation and message storage
- **Document Management**: Secure file storage with metadata extraction

## Database Setup

### Prerequisites

- PostgreSQL 15+
- Required extensions: `uuid-ossp`, `pgcrypto`, `vector`

### Installation Script

```sql
-- Run the complete schema setup
\i database/schema.sql
```

⚠️ **WARNING**: The schema script will DROP ALL existing tables. Use with extreme caution in production.

## Schema Overview

### Core Entity Relationships

```
Users (Healthcare Professionals)
├── User Roles (Many-to-Many)
├── Facility Users (Many-to-Many)
└── Audit Logs

Facilities (Healthcare Organizations)
├── Patients
├── Documents
├── Conversations
└── Facility Users

Patients
├── Patient History
├── Patient Documents
└── Conversations

Documents
├── Document Embeddings
├── Patient Documents
└── Message Attachments

Conversations
├── Conversation Participants
├── Messages
└── Message Attachments
```

## Table Definitions

### Core User Management

#### `users`

Healthcare professionals and system users.

| Column               | Type         | Description                  |
| -------------------- | ------------ | ---------------------------- |
| `id`                 | UUID         | Primary key                  |
| `email`              | VARCHAR(255) | Unique email address         |
| `encrypted_password` | TEXT         | Encrypted password           |
| `first_name`         | VARCHAR(100) | First name                   |
| `last_name`          | VARCHAR(100) | Last name                    |
| `license_number`     | VARCHAR(50)  | Professional license number  |
| `npi_number`         | VARCHAR(20)  | National Provider Identifier |
| `phone`              | VARCHAR(20)  | Contact phone                |
| `is_active`          | BOOLEAN      | Account status               |
| `last_login_at`      | TIMESTAMPTZ  | Last login timestamp         |
| `created_at`         | TIMESTAMPTZ  | Record creation time         |
| `updated_at`         | TIMESTAMPTZ  | Last update time             |

#### `user_roles`

Many-to-many relationship between users and their roles.

| Column        | Type           | Description                                 |
| ------------- | -------------- | ------------------------------------------- |
| `id`          | UUID           | Primary key                                 |
| `user_id`     | UUID           | Foreign key to users                        |
| `role`        | user_role_type | Enum: physician, nurse, administrator, etc. |
| `facility_id` | UUID           | Foreign key to facilities                   |
| `department`  | VARCHAR(100)   | Department assignment                       |
| `is_primary`  | BOOLEAN        | Primary role flag                           |
| `assigned_at` | TIMESTAMPTZ    | Role assignment time                        |

#### `facilities`

Healthcare organizations and their information.

| Column          | Type         | Description                  |
| --------------- | ------------ | ---------------------------- |
| `id`            | UUID         | Primary key                  |
| `name`          | VARCHAR(255) | Facility name                |
| `npi`           | VARCHAR(20)  | National Provider Identifier |
| `address_line1` | VARCHAR(255) | Street address               |
| `city`          | VARCHAR(100) | City                         |
| `state`         | VARCHAR(50)  | State/province               |
| `zip_code`      | VARCHAR(20)  | Postal code                  |
| `facility_type` | VARCHAR(100) | Type: hospital, clinic, etc. |
| `settings`      | JSONB        | Facility-specific settings   |
| `is_active`     | BOOLEAN      | Active status                |

### Patient Data (HIPAA Compliant)

#### `patients`

Patient records with encrypted personally identifiable information.

| Column                        | Type        | Description                             |
| ----------------------------- | ----------- | --------------------------------------- |
| `id`                          | UUID        | Primary key                             |
| `facility_id`                 | UUID        | Foreign key to facilities               |
| `mrn`                         | VARCHAR(50) | Medical Record Number (facility-unique) |
| `ssn_encrypted`               | TEXT        | Encrypted Social Security Number        |
| `first_name_encrypted`        | TEXT        | Encrypted first name                    |
| `last_name_encrypted`         | TEXT        | Encrypted last name                     |
| `date_of_birth_encrypted`     | TEXT        | Encrypted date of birth                 |
| `gender`                      | VARCHAR(20) | Gender identity                         |
| `phone_encrypted`             | TEXT        | Encrypted phone number                  |
| `email_encrypted`             | TEXT        | Encrypted email address                 |
| `emergency_contact_encrypted` | TEXT        | Encrypted emergency contact info        |
| `insurance_info_encrypted`    | TEXT        | Encrypted insurance information         |
| `allergies`                   | TEXT[]      | Array of known allergies                |
| `is_active`                   | BOOLEAN     | Active patient status                   |

**Security Notes**:

- All PII fields are encrypted using `pgcrypto`
- MRN is unique per facility for patient identification
- Encryption keys managed through external key management system

#### `patient_history`

Medical visit and treatment history.

| Column                   | Type         | Description             |
| ------------------------ | ------------ | ----------------------- |
| `id`                     | UUID         | Primary key             |
| `patient_id`             | UUID         | Foreign key to patients |
| `visit_date`             | TIMESTAMPTZ  | Date and time of visit  |
| `department`             | VARCHAR(100) | Department/unit         |
| `primary_diagnosis`      | TEXT         | Primary diagnosis       |
| `secondary_diagnoses`    | TEXT[]       | Additional diagnoses    |
| `medications`            | JSONB        | Medication information  |
| `vital_signs`            | JSONB        | Vital signs data        |
| `notes`                  | TEXT         | Clinical notes          |
| `attending_physician_id` | UUID         | Foreign key to users    |
| `discharge_date`         | TIMESTAMPTZ  | Discharge timestamp     |

### Document Management

#### `documents`

File storage and metadata for medical documents.

| Column               | Type          | Description                            |
| -------------------- | ------------- | -------------------------------------- |
| `id`                 | UUID          | Primary key                            |
| `facility_id`        | UUID          | Foreign key to facilities              |
| `original_filename`  | VARCHAR(500)  | Original file name                     |
| `stored_filename`    | VARCHAR(500)  | Storage system filename                |
| `file_path`          | TEXT          | Storage path                           |
| `file_size`          | BIGINT        | File size in bytes                     |
| `mime_type`          | VARCHAR(100)  | MIME type                              |
| `document_type`      | document_type | Enum: medical_record, lab_result, etc. |
| `checksum`           | VARCHAR(64)   | File integrity checksum                |
| `is_encrypted`       | BOOLEAN       | Encryption status                      |
| `encryption_key_id`  | VARCHAR(100)  | Key management reference               |
| `uploaded_by`        | UUID          | Foreign key to users                   |
| `processing_status`  | VARCHAR(50)   | Processing state                       |
| `ocr_text`           | TEXT          | Extracted text content                 |
| `extracted_metadata` | JSONB         | Document metadata                      |

#### `document_embeddings`

Vector embeddings for AI-powered semantic search.

| Column        | Type         | Description                         |
| ------------- | ------------ | ----------------------------------- |
| `id`          | UUID         | Primary key                         |
| `document_id` | UUID         | Foreign key to documents            |
| `chunk_index` | INTEGER      | Text chunk sequence number          |
| `chunk_text`  | TEXT         | Text content chunk                  |
| `embedding`   | vector(1536) | Vector embedding (OpenAI dimension) |
| `metadata`    | JSONB        | Chunk-specific metadata             |

**AI Integration Notes**:

- Documents are split into chunks for processing
- Embeddings enable semantic search across medical content
- Vector similarity search for finding relevant information

### Chat System

#### `conversations`

Chat conversations and their metadata.

| Column              | Type                | Description                                     |
| ------------------- | ------------------- | ----------------------------------------------- |
| `id`                | UUID                | Primary key                                     |
| `facility_id`       | UUID                | Foreign key to facilities                       |
| `title`             | VARCHAR(255)        | Conversation title                              |
| `patient_id`        | UUID                | Associated patient (optional)                   |
| `conversation_type` | VARCHAR(50)         | Type: general, patient_specific, administrative |
| `status`            | conversation_status | Enum: active, archived, escalated, completed    |
| `priority`          | VARCHAR(20)         | Priority level                                  |
| `tags`              | TEXT[]              | Conversation tags                               |
| `metadata`          | JSONB               | Additional metadata                             |
| `created_by`        | UUID                | Conversation creator                            |
| `archived_by`       | UUID                | User who archived conversation                  |

#### `messages`

Individual chat messages within conversations.

| Column              | Type         | Description                                    |
| ------------------- | ------------ | ---------------------------------------------- |
| `id`                | UUID         | Primary key                                    |
| `conversation_id`   | UUID         | Foreign key to conversations                   |
| `sender_id`         | UUID         | Foreign key to users (NULL for AI)             |
| `message_type`      | message_type | Enum: text, document_upload, ai_response, etc. |
| `content`           | TEXT         | Message content                                |
| `ai_model`          | VARCHAR(100) | AI model used for generation                   |
| `ai_confidence`     | DECIMAL(3,2) | AI confidence score                            |
| `is_sensitive`      | BOOLEAN      | Contains sensitive information                 |
| `parent_message_id` | UUID         | Parent message for threading                   |
| `thread_id`         | UUID         | Thread identifier                              |
| `metadata`          | JSONB        | Message metadata                               |
| `edited_at`         | TIMESTAMPTZ  | Last edit timestamp                            |

### Audit and Compliance

#### `audit_logs`

Immutable audit trail for HIPAA compliance.

| Column             | Type              | Description                                     |
| ------------------ | ----------------- | ----------------------------------------------- |
| `id`               | UUID              | Primary key                                     |
| `user_id`          | UUID              | User performing action                          |
| `facility_id`      | UUID              | Associated facility                             |
| `patient_id`       | UUID              | Associated patient                              |
| `action`           | audit_action_type | Action type: create, read, update, delete, etc. |
| `resource_type`    | VARCHAR(100)      | Table name or resource type                     |
| `resource_id`      | UUID              | ID of affected resource                         |
| `old_values`       | JSONB             | Previous values (for updates)                   |
| `new_values`       | JSONB             | New values (for creates/updates)                |
| `ip_address`       | INET              | Client IP address                               |
| `user_agent`       | TEXT              | Client user agent                               |
| `session_id`       | VARCHAR(255)      | Session identifier                              |
| `compliance_flags` | TEXT[]            | Compliance-related flags                        |
| `created_at`       | TIMESTAMPTZ       | Action timestamp                                |

**Compliance Features**:

- Immutable records (no updates or deletes)
- Comprehensive data change tracking
- IP and session tracking for security
- Automatic trigger-based logging

## Custom Types (Enums)

### `user_role_type`

```sql
'physician', 'nurse', 'administrator', 'pharmacist',
'technician', 'social_worker', 'case_manager', 'system_admin'
```

### `document_type`

```sql
'medical_record', 'lab_result', 'imaging_report', 'discharge_summary',
'treatment_plan', 'insurance_document', 'consent_form', 'medication_list',
'allergy_record', 'clinical_note', 'referral', 'other'
```

### `message_type`

```sql
'text', 'document_upload', 'system_notification', 'ai_response', 'query_result'
```

### `conversation_status`

```sql
'active', 'archived', 'escalated', 'completed'
```

### `audit_action_type`

```sql
'create', 'read', 'update', 'delete', 'login', 'logout',
'document_access', 'patient_access', 'export'
```

## Security Features

### Row Level Security (RLS)

All sensitive tables have RLS enabled with policies based on:

- User facility associations
- Role-based permissions
- Patient access controls

Example policy:

```sql
CREATE POLICY "Facility users can access facility patients" ON patients
    FOR ALL USING (
        facility_id IN (
            SELECT facility_id FROM facility_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );
```

### Encryption

- **Patient PII**: All personally identifiable information encrypted using `pgcrypto`
- **Documents**: Files encrypted at storage layer
- **Transmission**: TLS 1.3 for all data in transit

### Audit Triggers

Automatic logging triggers on sensitive tables:

```sql
CREATE TRIGGER audit_patients_trigger
    AFTER INSERT OR UPDATE OR DELETE ON patients
    FOR EACH ROW EXECUTE FUNCTION log_data_access();
```

## Performance Optimization

### Indexes

Strategic indexes for common query patterns:

```sql
-- Patient lookups by facility and MRN
CREATE INDEX idx_patients_facility_mrn ON patients(facility_id, mrn);

-- Document searches by type and facility
CREATE INDEX idx_documents_facility_type ON documents(facility_id, document_type);

-- Message retrieval by conversation
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);

-- Vector similarity search
CREATE INDEX idx_document_embeddings_vector ON document_embeddings
    USING ivfflat (embedding vector_cosine_ops);
```

### Query Patterns

Common optimized queries:

```sql
-- Find patient by MRN within facility
SELECT * FROM patients
WHERE facility_id = $1 AND mrn = $2 AND is_active = true;

-- Semantic search across documents
SELECT d.*, e.chunk_text,
       1 - (e.embedding <=> $1) as similarity
FROM documents d
JOIN document_embeddings e ON d.id = e.document_id
WHERE d.facility_id = $2
ORDER BY e.embedding <=> $1
LIMIT 10;

-- Recent conversation messages
SELECT m.*, u.first_name, u.last_name
FROM messages m
LEFT JOIN users u ON m.sender_id = u.id
WHERE m.conversation_id = $1
ORDER BY m.created_at DESC
LIMIT 50;
```

## Backup and Recovery

### Backup Strategy

1. **Continuous WAL Archiving**: Real-time transaction log backup
2. **Daily Full Backups**: Complete database snapshots
3. **Point-in-Time Recovery**: Ability to restore to any timestamp
4. **Cross-Region Replication**: Geographic redundancy

### Recovery Procedures

```sql
-- Point-in-time recovery example
pg_basebackup --write-recovery-conf --checkpoint=fast
```

## Monitoring and Maintenance

### Health Checks

```sql
-- Database connection health
SELECT 1;

-- Table size monitoring
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage statistics
SELECT
    indexrelname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Maintenance Tasks

```sql
-- Regular maintenance
VACUUM ANALYZE;
REINDEX DATABASE healthcare_chat;

-- Update statistics
ANALYZE;
```

## Migration Guidelines

### Schema Changes

1. Always use migrations for schema changes
2. Test migrations on copy of production data
3. Plan for zero-downtime deployments
4. Maintain backward compatibility during transitions

### Data Migration

```sql
-- Example: Adding new column with default
ALTER TABLE patients
ADD COLUMN preferred_language VARCHAR(10) DEFAULT 'en';

-- Backfill data
UPDATE patients
SET preferred_language = 'en'
WHERE preferred_language IS NULL;
```

## Troubleshooting

### Common Issues

1. **Vector Extension**: Ensure `vector` extension is properly installed
2. **Permissions**: Verify RLS policies don't block legitimate access
3. **Performance**: Monitor query execution plans for optimization opportunities

### Diagnostic Queries

```sql
-- Check for long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- Check table locks
SELECT t.relname, l.locktype, page, virtualtransaction, pid, mode, granted
FROM pg_locks l, pg_stat_all_tables t
WHERE l.relation = t.relid
ORDER BY relation asc;
```

## Future Enhancements

### Planned Improvements

1. **Partitioning**: Time-based partitioning for audit logs and messages
2. **Materialized Views**: Pre-computed analytics for reporting
3. **Advanced Indexing**: GIN indexes for full-text search
4. **Temporal Tables**: Built-in versioning for critical data

### Scalability Considerations

- **Read Replicas**: Distribute read queries across multiple servers
- **Connection Pooling**: Implement pgBouncer for connection management
- **Caching**: Redis integration for frequently accessed data
- **Archival**: Automated archival of old records

---

**Note**: This schema is designed for HIPAA compliance and production use. Always consult with security and compliance teams before deploying to production environments.
