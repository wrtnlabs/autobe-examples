# Non‑Functional Requirements

**Document ID**: 06‑non‑functional-requirements.md  
**Version**: 1.0  
**Date**: 2025‑11‑18

---

## 1. Introduction

The purpose of this document is to specify the **non‑functional requirements** for the **Discussion Board** service (service prefix: `discussionBoard`). These requirements outline the expected quality attributes that the system must exhibit to provide a reliable, secure, and performant environment for all user actors (guest, member, admin). The document is intended for **backend architects and developers** who will design, implement, and operate the system.

> **Related Document**: For functional behavior, see the [Functional Requirements Document](./04-functional-requirements.md).

---

## 2. Performance Requirements

### 2.1 Response Time

- **WHEN** a **guest** or **member** requests to view a list of articles, **THE** system **SHALL** return the page within **1.5 seconds** for the first 5,000 articles and within **2 seconds** for any page up to 10,000 articles.
- **WHEN** a **member** requests an individual article with its attachments, **THE** system **SHALL** deliver the content and all inline images within **2 seconds** for attachments smaller than **2 MB**.
- **WHEN** a **member** uploads an attachment, **THE** system **SHALL** acknowledge successful upload within **3 seconds** for files up to **10 MB** in size.

### 2.2 Throughput

- **THE** system **SHALL** support a minimum throughput of **200 requests per second** under peak load, measured as a combination of article reads, comment submissions, and attachment uploads.

### 2.3 Latency Limits for Attachments

- **WHEN** a **member** uploads an image file, **THE** system **SHALL** store the file and return a reference URL within **3 seconds** for files up to **5 MB**.
- **WHEN** a **member** uploads a generic file (PDF, DOCX, etc.), **THE** system **SHALL** store the file and return a reference URL within **5 seconds** for files up to **10 MB**.

---

## 3. Security Requirements

### 3.1 Authentication & Authorization

- **THE** system **SHALL** enforce authentication for all actions that modify data (posting articles, commenting, uploading attachments, moderation). Unauthenticated guests may only read publicly visible content.
- **THE** system **SHALL** use industry‑standard password hashing (e.g., bcrypt) for stored credentials.
- **THE** system **SHALL** lock a user account after **5 consecutive failed login attempts** and require a password reset.

### 3.2 Data Protection

- **THE** system **SHALL** encrypt all data in transit using TLS 1.2 or higher.
- **THE** system **SHALL** encrypt stored attachment files at rest using server‑side encryption.
- **THE** system **SHALL** retain audit logs for all privileged operations (admin deletions, user bans) for at least **90 days**.

### 3.3 Input Validation & Sanitization

- **THE** system **SHALL** validate all user‑provided text to prevent SQL injection, cross‑site scripting (XSS), and other injection attacks.
- **THE** system **SHALL** restrict uploaded file types to images (PNG, JPEG, GIF) and common documents (PDF, DOCX, TXT). Any other file type **SHALL** be rejected with an appropriate error message.

---

## 4. Scalability Requirements

### 4.1 Concurrency

- **THE** system **SHALL** support up to **10 000 concurrent users** with acceptable performance as defined in Section 2 (response times below the stated thresholds).

### 4.2 Horizontal Scaling

- **THE** system **SHALL** be capable of horizontal scaling for the web tier and attachment storage tier without requiring changes to the application code.

### 4.3 Elastic Load Management

- **THE** system **SHALL** automatically distribute incoming traffic across multiple instances to maintain response‑time targets during traffic spikes.

---

## 5. Compliance Requirements

### 5.1 Data Privacy (GDPR‑like)

- **THE** system **SHALL** allow any user to request deletion of their personal data within **30 days** of the request.
- **THE** system **SHALL** store minimal personal data (email, hashed password, role). No unnecessary profiling data will be collected.
- **THE** system **SHALL** provide a clear privacy notice describing how personal data is used, stored, and shared.

### 5.2 Legal Retention

- **THE** system **SHALL** retain public articles and comments for a minimum of **2 years** unless removed by the author or an administrator.
- **THE** system **SHALL** retain deleted content logs for **90 days** for audit purposes.

---

## 6. Acceptance Criteria

| Requirement | Acceptance Test |
|-------------|-----------------|
| Response time for article list ≤ 2 s | Load test with 5 000 concurrent reads; measured latency ≤ 2 s |
| Attachment upload ≤ 5 s for 10 MB files | Upload a 10 MB PDF; timer confirms ≤ 5 s |
| Account lock after 5 failed logins | Simulate 5 bad password attempts; verify lockout occurs |
| TLS encryption for all traffic | Perform a security scan; confirm TLS 1.2+ is enforced |
| GDPR deletion request fulfilled in ≤ 30 days | Submit a deletion request; verify data removal within period |
| Support 10 000 concurrent users | Stress test with 10 000 active sessions; verify response‑time SLA |

---

## 7. References

- **Functional Requirements** – [Functional Requirements Document](./04-functional-requirements.md)
- **Business Rules** – [Business Rules Document](./07-business-rules.md)
- **Error Handling** – [Error Handling Document](./08-error-handling.md)

---

*This document defines **business requirements only**. All technical implementation decisions (architecture, APIs, database design, etc.) are at the discretion of the development team.*