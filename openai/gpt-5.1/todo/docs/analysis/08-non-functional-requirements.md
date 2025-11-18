# Non-Functional Requirements Summary for Minimal Todo Backend (todoApp)

## Purpose

Non-functional requirements describe how the todoApp backend should behave in terms of speed, reliability, security, and scale. They apply to all features (authentication, managing todos, and admin operations) and focus on user experience, not technical implementation.

Actors mentioned:
- **guestUser**: Not logged in.
- **memberUser**: Logged-in regular user managing their own todos.
- **adminUser**: Admin managing users and handling exceptional situations.

## 1. Performance (Speed and Responsiveness)

### 1.1 General response times
- WHEN a memberUser does a normal action that touches a small amount of data (for example, viewing a small todo list or managing a single todo), THE system SHALL respond within **500 ms** for at least **95%** of these requests under normal conditions.
- WHEN a guestUser calls public endpoints (for example, a status or info endpoint), THE system SHALL respond within **800 ms** for at least **95%** of these requests under normal conditions.
- WHEN an adminUser runs normal admin actions that don’t involve bulk data, THE system SHALL respond within **1 second** for at least **95%** of these requests under normal conditions.
- WHEN requests arrive during a short planned maintenance window, THE system SHALL either complete them successfully or reply within **2 seconds** with a clear message that the service is temporarily unavailable.

### 1.2 Core todo operations
For single-todo actions by a memberUser under normal conditions:
- WHEN creating a todo, THE system SHALL confirm creation within **700 ms** in at least **95%** of requests.
- WHEN updating a todo, THE system SHALL confirm the update within **700 ms** in at least **95%** of requests.
- WHEN completing or reopening a todo, THE system SHALL confirm the change within **700 ms** in at least **95%** of requests.
- WHEN deleting a todo, THE system SHALL confirm deletion within **700 ms** in at least **95%** of requests.
- WHEN listing todos for a normal-sized result set, THE system SHALL return the list within **800 ms** in at least **95%** of requests.
- WHERE a user has a very large number of todos, THE system SHALL return results in **pages**, and each page request SHALL complete within **1 second** in at least **95%** of such requests.

### 1.3 Concurrency and throughput
- WHERE there are up to **10,000** registered memberUsers and up to **500** active sessions at once, THE system SHALL meet the response time targets defined above for at least **95%** of requests.
- WHERE active sessions temporarily double (short spikes), THE system SHALL still meet its timing targets for at least **90%** of requests, possibly by degrading non-essential work first.
- WHILE the system is under sustained heavy load, THE system SHALL prioritize core todo operations (create, list, update, complete, reopen, delete) over non-essential features (for example, analytics or heavy admin queries).

### 1.4 Graceful degradation
- IF the system cannot meet normal response time targets, THEN THE system SHALL still try to complete operations correctly, unless that threatens overall stability.
- IF an operation must be rejected or delayed due to overload, THEN THE system SHALL answer within **3 seconds** with a clear “service busy, try later” style message.
- IF the same user repeatedly triggers overload within a short period, THEN THE system SHALL throttle or limit that user’s **non-essential** operations while still serving essential todo operations where possible.

## 2. Availability and Reliability

### 2.1 Uptime targets
- THE system SHALL provide todo operations for memberUsers with at least **99.0%** availability per month, excluding pre-announced maintenance.
- THE system SHALL provide essential admin operations with at least **99.0%** availability per month, excluding pre-announced maintenance.
- THE system SHALL provide a way (for example, a status-style endpoint or pattern) for users or operators to know whether the service is healthy or in maintenance.

### 2.2 Maintenance and degraded modes
- WHERE scheduled maintenance is needed, THE system SHALL allow pre-announced windows of at most **2 hours per week** on average.
- WHEN in a scheduled maintenance window, THE system SHALL respond within **2 seconds** to every request with a clear maintenance message and SHALL not accept state-changing todo operations.
- WHEN the system is partially degraded (some parts failing), THE system SHALL prioritize data safety and correctness of core todo operations, even if this means temporarily disabling optional or non-critical features.

### 2.3 Data durability and loss tolerance
- THE system SHALL protect user and todo data so that **more than the last 5 minutes** of confirmed changes are **very unlikely** to be lost during normal conditions.
- IF a severe incident occurs that could cause greater data loss, THEN THE system SHALL prefer rolling back to the last clearly safe state rather than presenting inconsistent or corrupted todo data.
- WHEN a user receives a success confirmation for a todo operation, THE system SHALL ensure that result is durable and remains visible after transient failures or restarts.

### 2.4 Backup, restore, incidents
- THE system SHALL maintain regular backups of critical user and todo data so that in worst-case disaster scenarios, no more than **24 hours** of user activity is lost.
- IF disaster recovery is needed, THEN THE system SHALL aim to restore core todo and authentication capabilities within **24 hours**, clearly communicating any data limitations.
- WHEN a major incident is detected, THE system SHALL support switching to a controlled state, in which new write operations can be rejected or queued while read access may continue if consistency can be maintained.

## 3. Scalability

### 3.1 Expected scale
- WHERE the memberUser base grows up to **100,000** users (with proportional system capacity), THE system SHALL still meet the performance and availability targets above.
- WHERE the total number of todo items grows up to **10 million**, THE system SHALL still provide acceptable response times for paginated listing and single-item operations as defined in the performance section.

### 3.2 Workload patterns
- WHILE the typical workload remains read-heavy (users viewing their lists more often than writing), THE system SHALL be optimized for fast reads without sacrificing correctness of writes.
- WHERE a small number of accounts creates far more todos than average, THE system SHALL still provide predictable performance for other users.

### 3.3 Conceptual scaling approach
- THE system SHALL be designed so that adding more capacity (of whatever type the implementation team chooses) allows it to continue meeting performance and availability targets.
- WHERE possible, THE system SHALL avoid business rules that assume a single-server limitation so that scaling decisions remain a technical concern, not a business constraint.

### 3.4 Limits and throttling
- THE system SHALL define reasonable per-user rate limits so that normal users do not hit limits during normal daily use.
- IF a guestUser or memberUser exceeds rate limits, THEN THE system SHALL temporarily reject further requests from that actor and clearly communicate that a limit was hit, while keeping existing data safe.
- IF an adminUser runs bulk or heavy operations that can harm service quality for others, THEN THE system SHALL allow such operations only within defined boundaries or time windows that align with business policy.

## 4. Security and Privacy

### 4.1 Principles
- THE system SHALL ensure that each memberUser can see and manage only their own todos, unless there is an explicit rule allowing admin access.
- THE system SHALL minimize exposure of sensitive user data and only return what is necessary for each operation.
- THE system SHALL treat all inputs as untrusted and validate them according to separate validation and business rule requirements.

### 4.2 Authentication and sessions (quality expectations)
- WHEN a memberUser or adminUser logs in successfully, THE system SHALL create a session or token that is valid only for a limited time, as defined in the authentication document.
- WHILE that session or token is valid, THE system SHALL treat requests made with it as authenticated for exactly one user and SHALL prevent its use to impersonate another user.
- IF a session or token is suspected to be compromised, THEN THE system SHALL allow it to be invalidated so that further use is rejected.

### 4.3 Authorization and access boundaries
- THE system SHALL ensure that memberUsers can access and modify only their own todo items.
- WHERE an adminUser has a valid business reason to access or remove any user’s todo items, THE system SHALL allow this and SHALL ensure such operations are auditable.
- IF an actor attempts to access or modify something they are not allowed to, THEN THE system SHALL reject the operation with a clear insufficient-permissions indication, without leaking extra information about the target.

### 4.4 Privacy of todo content
- THE system SHALL treat todo titles, descriptions, and metadata as private to the owning memberUser and authorized admin operations.
- WHERE logs or analytics are collected, THE system SHALL avoid storing full todo content in them and SHALL focus on non-sensitive metadata wherever possible.
- IF data is anonymized for analytics, THEN THE system SHALL ensure that individual users cannot be re-identified from that anonymized data following normal business review practice.

### 4.5 Logging and monitoring
- THE system SHALL log enough information to reconstruct important security events such as failed logins, password resets, suspicious rate-limit violations, and admin deletions.
- WHERE logs contain user identifiers or metadata, THE system SHALL restrict access to those logs to authorized operators only.
- IF monitoring detects repeated errors or abnormal error spikes, THEN THE system SHALL support placing the system into a safer limited mode while investigation happens.

## 5. Consolidated EARS-Style Requirements (Quick Reference)

### 5.1 Performance
- WHEN a memberUser performs a typical single-todo operation, THE system SHALL respond within **700 ms** in at least **95%** of such requests under normal conditions.
- WHEN a memberUser requests a paginated list of todos, THE system SHALL respond within **1 second per page** in at least **95%** of such requests under normal conditions.
- WHEN a guestUser accesses a public endpoint, THE system SHALL respond within **800 ms** in at least **95%** of such requests under normal conditions.
- WHERE simultaneous sessions remain within normal limits, THE system SHALL maintain the defined response time targets.
- IF a request is rejected due to overload, THEN THE system SHALL respond within **3 seconds** with a clear “busy” message.

### 5.2 Availability and reliability
- THE system SHALL achieve at least **99.0%** availability for core todo operations each month, excluding planned maintenance.
- WHEN scheduled maintenance occurs, THE system SHALL return clear maintenance responses within **2 seconds** and SHALL not accept state-changing operations.
- THE system SHALL ensure confirmed todo operations remain durable and visible after transient failures.
- IF a severe incident threatens data integrity, THEN THE system SHALL prefer a clear, consistent rollback to the last safe state over serving corrupted data.
- THE system SHALL maintain backups often enough that worst-case disaster recovery loses no more than **24 hours** of activity.

### 5.3 Scalability
- WHERE the memberUser base grows up to **100,000** accounts, THE system SHALL still meet performance and availability targets assuming proportional capacity is provided.
- WHERE total stored todos reach **10 million**, THE system SHALL still offer paginated access within the defined response times.
- THE system SHALL support increasing capacity without changing behavior visible to end users.
- IF a single user or small group creates unusually high load, THEN THE system SHALL protect overall service quality by rate limiting those users while keeping normal users unaffected.

### 5.4 Security and privacy
- THE system SHALL ensure each memberUser can access and manage only their own todos, except where adminUsers perform permitted admin actions.
- WHEN a user logs in, THE system SHALL issue a time-limited session or token tied to that user.
- IF suspicious access patterns are detected, THEN THE system SHALL enable operators to revoke affected sessions or tokens and to use logs for investigation.
- THE system SHALL minimize storage of sensitive todo content in logs and analytics.
- IF an actor attempts an unauthorized operation, THEN THE system SHALL deny the request and clearly indicate insufficient permissions without exposing additional details.

## 6. Measurement and Acceptance

- THE system SHALL be testable with repeatable performance tests that simulate normal user operations at normal and moderately elevated load while checking the defined response time targets.
- THE system SHALL offer enough observability (for example, through metrics or logs, as chosen by the implementation team) to calculate availability and error rates over time.
- THE system SHALL support regular security and privacy reviews to confirm that authorization boundaries, data exposure, and logging match the requirements above.
- THE system SHALL provide ways for operators to adjust rate limits, maintenance schedules, and incident-handling practices according to business policy without changing user-visible functional behavior.