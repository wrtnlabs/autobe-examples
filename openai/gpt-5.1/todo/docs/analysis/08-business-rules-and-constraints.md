# Business Rules and Constraints for the Todo List Application

## 1. Introduction
The Todo List application is governed by a set of mandatory business rules, validation conditions, compliance safeguards, and operational boundaries. These requirements are intended to guarantee correct, secure, and consistent system behavior while minimizing ambiguity. All requirements are written in natural language, using the EARS (Easy Approach to Requirements Syntax) format for absolute clarity. The target audience is backend developers and project stakeholders who need an exhaustive, implementation-ready business specification.

## 2. Task Validations

**Task Core Attributes:**
- THE task SHALL have a non-empty title of no more than 100 characters.
- THE task SHALL optionally include a description of up to 600 characters.
- THE task SHALL possess a completion status, which is always boolean (completed or not).
- THE task SHALL, on creation, default the completed status to 'not completed.'
- THE task SHALL permit only plain text; file attachments or media uploads are not supported.
- THE task SHALL support an optional due date, which, if given, SHALL be an ISO 8601 date that is either today or a future date.

**Required vs Optional:**
- THE system SHALL require a valid title for every task creation operation.
- THE system SHALL reject any task creation where the title is missing, exceeds 100 characters, or is only whitespace.
- WHERE a due date is provided, THE system SHALL require it be today or in the future and SHALL reject past dates as invalid.
- IF a description is provided, THE system SHALL ensure it is no longer than 600 characters.

**User Task Capacity:**
- THE system SHALL limit each user's active (non-deleted) tasks to 200. Exceeding this will result in rejection with a meaningful error.
- WHEN a task is deleted, THE system SHALL decrement the count correspondingly. Deleted tasks do not count toward the 200 limit.

## 3. User Restrictions

**Task Authorship and Ownership:**
- WHEN a user creates a task, THE system SHALL permanently associate the task with the creator’s unique user ID.
- THE system SHALL deny any attempt to read, update, or delete a task that is not owned by the requesting user.
- WHEN a user lists tasks, THE system SHALL only return their own tasks.
- THE system SHALL NOT support shared, delegated, or collaborative tasks. All actions are restricted to the authenticated owner.

**Authentication Required:**
- WHEN any operation to create, view, update, or delete tasks is attempted, THE system SHALL require successful user authentication first.
- THE system SHALL not permit guest or anonymous actions on tasks of any kind.

## 4. Legal and Compliance Needs

**User Data Privacy and Security:**
- THE system SHALL securely store all user data using recognized industry best practices.
- WHERE required by law, THE system SHALL allow users to delete all their account data, including all tasks, with permanent effect.
- THE system SHALL practice data minimization, never collecting unnecessary personal information through the task process.

**Age and Sensitive Content:**
- THE system SHALL NOT require age verification for registration, unless required by relevant jurisdictional law.
- THE system SHALL NOT include advertising or user tracking. No requirements for ads, data analysis, or behavioral targeting are present in this project.

## 5. Operational Constraints

**API Usage and Rate Limiting:**
- THE system SHALL implement API rate limiting for key endpoints (task creation, update, delete), such that no user may exceed 60 actions per minute. (This value is a guideline and should be tuned for production stability.)
- IF a user surpasses their per-minute allowance, THE system SHALL deny any further requests for a temporary period and SHALL supply an actionable error message.

**Data Consistency and Reliability:**
- WHEN a task is created, modified, or removed, THE system SHALL guarantee atomic persistence. Partial or intermediate saves SHALL never be observable.
- THE system SHALL provide strong consistency guarantees for all user task lists. Task changes SHALL always be accurately reflected to the task owner without eventual/async anomalies.

**Service Availability:**
- WHEN planned downtime or maintenance is necessary, THE system SHALL notify affected users at the earliest feasible opportunity via a user-facing message.
- IF an operation fails due to maintenance, THE system SHALL return a clear, explicit error instructing the user to try again later.

## 6. Visual Rule Summary

```mermaid
graph LR
    A["User Initiates Task Creation"] --> B{"Title Valid?"}
    B --|"No"| C["Reject: Invalid/Missing Title"]
    B --|"Yes"| D{"Active Task Limit Reached?"}
    D --|"Yes"| E["Reject: Task Limit Exceeded"]
    D --|"No"| F["Create Task (Associate with User)"]
    F --> G{"Due Date Provided?"}
    G --|"Yes"| H{"Due Date In Future or Today?"}
    H --|"No"| I["Reject: Invalid Due Date"]
    H --|"Yes"| J["Save Task"]
    G --|"No"| J
    J --> K["Return Success Response"]
```

## 7. Key Restrictions: Summary Table

| Category        | Business Rule Summary                                         |
|----------------|---------------------------------------------------------------|
| Title          | Required; 1–100 chars; no empty or whitespace-only titles      |
| Description    | Optional; max 600 characters                                  |
| Completed      | Boolean; defaults to not completed                            |
| Due Date       | Optional; today/future only; ISO date required                |
| Task Limit     | 200 active per user (deleted don’t count)                     |
| Ownership      | Only accessible/managed by creator                            |
| Authentication | All actions require user authentication                       |
| Attachments    | Not supported                                                 |
| Rate Limit     | 60 critical actions per user/min (configurable)               |
| Privacy        | Minimal PII, strong security, user-driven deletion supported   |
| Consistency    | Atomic changes, always accurate, never partial or stale views |
| Maintenance    | User notified ahead; downtime returns friendly error           |

## 8. Conformance and Enforcement
- All rules SHALL be enforced strictly by backend validation logic, independent of frontend validation.
- On violations, THE backend SHALL supply actionable, specific error messages so users can easily recover.
- Backend error responses SHALL describe the violation (e.g., title missing, rate limit exceeded, insufficient permissions, etc.) and provide clear guidance for correction.
- No requirements herein may be ignored or relaxed in implementation without explicit, documented business approval.

---
These business rules, constraints, and validations are mandatory for the production Todo List application, forming the definitive implementation specification for backend engineers and process owners.