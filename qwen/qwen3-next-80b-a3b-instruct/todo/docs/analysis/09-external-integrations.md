# Todo List Application Requirements Specification

## Service Overview

The Todo List application provides a minimal, privacy-focused task management system designed for individual personal use. The system is intentionally kept simple with no complex features, focusing exclusively on enabling users to manage their own private task lists. This service solves the problem of personal task tracking without the distractions and privacy concerns of collaborative or shared task management tools.

The core value proposition is complete data privacy and isolation: users can manage their personal tasks with absolute confidence that no other person can access or view their information. This is achieved through strict authentication and authorization mechanisms that enforce user data isolation at every layer of the system.

The business model is simple: provide a free, high-quality, privacy-focused productivity tool that users can rely on daily. The service will be sustained through potential future non-intrusive premium features (such as advanced filtering or export options) while maintaining the core functionality as completely free and ad-free.

The system is designed with scalability in mind—from managing dozens of personal tasks to potential scaling to thousands of concurrent users—while maintaining simplicity in user experience.

## User Actors

The Todo List application defines three distinct user actors, each with specific roles and permissions that determine their access to system functionality.

### User
- **Primary actor** for the system
- Individual who registers and manages their personal todo lists
- Has complete control over their own data
- Cannot access or modify any data belonging to other users
- All operations must be performed within the context of their own authenticated identity

### Guest
- **Unauthenticated visitor** to the application
- Can view public landing page and application information
- Has no access to any private functionality including todo list management
- Must authenticate to access application features
- Any attempt to access protected resources will trigger authentication flow

### Admin
- **System administrator** with elevated privileges
- Cannot create or manage personal todo lists
- Has access to user management and system monitoring capabilities
- Responsible for maintaining system integrity and user account health
- Only accesses user data for operational purposes (e.g., account suspension, system diagnostics)
- Operates under strict audit controls to ensure no misuse of privileges

## Core Functionality

The Todo List application provides essential functionality for private task management, designed to be minimal and straightforward. All features are scoped to personal use with no collaboration, sharing, or social features.

### Todo List Management

Every authenticated user is automatically granted a private todo list upon successful login. This list is created automatically by the system and is never shared with any other user.

#### List Structure
- The todo list is an ordered collection of todo items
- Each user has exactly one todo list
- The list has no name or title—users work with their one and only personal list
- Items in the list have no hierarchical structure (no subtasks, no categories)
- Items are ordered chronologically by creation date
- The list persists across sessions
- No user can have more than one list

#### List Access Rules
- WHEN a user attempts to access their own todo list, THE system SHALL only return data associated with their authenticated user ID
- IF a user attempts to access another user's todo list, THEN THE system SHALL return HTTP 403 Forbidden status with error code ACCESS_DENIED
- WHEN a guest attempts to access any todo list endpoint, THE system SHALL return HTTP 401 Unauthorized
- WHEN a user's list is empty (no items), THE system SHALL return an empty array
- THE system SHALL ensure that no query includes a user ID that was not derived from the authenticated JWT token

#### List Persistence
- WHEN a user logs in, THE system SHALL restore their todo list from persistent storage with their previous items and status
- WHEN a user creates, updates, or deletes an item, THE system SHALL persist those changes immediately
- WHEN a service outage occurs, THE system SHALL ensure all pending changes are preserved and restored after recovery
- THE system SHALL use a relational database for data persistence with referential integrity
- THE system SHALL never store todo list data in client-side storage (localStorage, sessionStorage)

### Item Creation

Users can create simple text items to track tasks they need to complete. Each item is a discrete entity with minimum metadata.

#### Creation Process
- WHEN a user submits a new todo item via the API (via POST /api/todos) with a non-empty description field, THE system SHALL create a new todo item with the provided text
- THE system SHALL assign each created item a unique UUID as its identifier
- THE system SHALL automatically set the item status to "incomplete" upon creation
- THE system SHALL timestamp the creation time of each item using UTC format
- THE system SHALL associate the new item exclusively with the authenticated user's ID from the JWT token

#### Creation Constraints
- WHEN a user attempts to create a todo item with an empty string, null, or only whitespace characters as the description, THE system SHALL reject the request with HTTP 400 Bad Request and error code `ITEM_DESCRIPTION_EMPTY`
- IF the item description exceeds 500 characters, THEN THE system SHALL reject the request with HTTP 400 Bad Request and error code `ITEM_DESCRIPTION_TOO_LONG`
- IF the request contains no description field, THEN THE system SHALL reject the request with HTTP 400 Bad Request and error code `MISSING_DESCRIPTION_FIELD`
- WHERE user authentication is invalid or missing (no JWT token, invalid signature, expired token), THE system SHALL reject the request with HTTP 401 Unauthorized and error code `UNAUTHORIZED_ACCESS`
- THE system SHALL normalize whitespace in item descriptions (strip leading/trailing spaces) and reject duplicate items with identical text created within 5 seconds

### Item Status Management

Each todo item has a binary state: incomplete or complete. Users may toggle between these states to reflect task progress.

#### Status Change Rules
- WHEN a user marks a todo item as complete, THE system SHALL update the item's status to "complete" and set the completion timestamp to the current time
- WHEN a user marks a todo item as incomplete, THE system SHALL update the item's status to "incomplete" and remove the completion timestamp
- THE system SHALL maintain the original creation timestamp regardless of status changes
- THE system SHALL allow users to toggle status back and forth as many times as they wish
- WHEN an item is marked complete, THE system SHALL NOT modifier any other properties of the item except status and completed_at
- WHEN the status of an item is changed, THE system SHALL immediately persist the change

#### Status Change Process
- WHEN a user submits a PATCH request to /api/todos/{id} with a JSON body containing "completed": true or "completed": false, THE system SHALL update the status of the specified item
- THE system SHALL validate that the authenticated user is the owner of the item being modified
- IF the item ID does not exist in the system, THEN THE system SHALL return HTTP 404 Not Found with error code `ITEM_NOT_FOUND`
- IF the item ID belongs to a different user, THEN THE system SHALL return HTTP 403 Forbidden with error code `ACCESS_DENIED`
- IF the request body contains invalid data types (e.g., string for completed), THEN THE system SHALL return HTTP 400 Bad Request with error code `INVALID_STATUS_VALUE`

### Item Deletion

Users may remove todo items from their list when they are no longer relevant or have been resolved.

#### Deletion Process
- WHEN a user sends a DELETE request to /api/todos/{id}, THE system SHALL permanently remove the specified item from their list
- THE system SHALL validate that the authenticated user is the owner of the item being deleted
- THE system SHALL perform a hard delete—the item data will be permanently removed from the database
- THE system SHALL immediately reflect the deletion in all subsequent responses

#### Deletion Constraints
- IF the item ID does not exist in the system, THEN THE system SHALL return HTTP 404 Not Found with error code `ITEM_NOT_FOUND`
- IF the user attempts to delete an item they do not own, THEN THE system SHALL return HTTP 403 Forbidden with error code `ACCESS_DENIED`
- IF the user sends a delete request without authentication, THE system SHALL return HTTP 401 Unauthorized with error code `UNAUTHORIZED_ACCESS`
- THE system SHALL NOT allow batch deletion—each item must be deleted individually
- THE system SHALL never use soft deletion or marking items as "deleted"—all deleted items are permanently removed

### Data Persistence

User data must be securely stored and made available across sessions.

#### Storage Requirements
- THE system SHALL store user authentication data (hashed passwords, user ID, email) using bcrypt with 12-round salting
- THE system SHALL store todo list items in a relational database with proper indexing on user_id and created_at
- THE system SHALL encrypt all personal data at rest using AES-256 encryption
- THE system SHALL isolate each user's data using row-level security policies enforced at the query layer
- THE system SHALL never store user data in client-side cache, local storage, or browser cookies

#### Data Retention
- THE system SHALL retain user data indefinitely unless requested to be deleted
- WHEN a user deletes their account, THE system SHALL permanently erase all associated todo list items within 48 hours
- THE system SHALL NOT retain any data from deleted accounts beyond the immediate session termination
- THE system SHALL maintain audit logs of account deletion events for compliance purposes

### Performance Expectations

Users have clear expectations regarding system responsiveness.

#### Response Time Requirements
- WHEN a user logs in, THE system SHALL respond within 1 second in 99% of cases
- WHEN a user requests their todo list, THE system SHALL respond within 500 milliseconds in 99% of cases
- WHEN a user creates a new todo item, THE system SHALL respond within 300 milliseconds in 99% of cases
- WHEN a user updates todo status, THE system SHALL respond within 200 milliseconds in 99% of cases
- WHEN a user deletes a todo item, THE system SHALL respond within 200 milliseconds in 99% of cases

#### Load Capacity
- THE system SHALL support 10,000 concurrent users without degradation in response time
- THE system SHALL handle 1,000 requests per minute without error
- THE system SHALL maintain acceptable performance with up to 1,000 todo items per user
- THE system SHALL scale horizontally to handle increasing load

#### Availability
- THE system SHALL be available 99.9% of the time
- THE system SHALL have automatic failover procedures in place to ensure continuous service
- WHEN a service outage occurs, THE system SHALL return a 503 Service Unavailable with the message: "Service temporarily unavailable. Please try again later."

## External Integrations

### Email Service Integration

WHEN a user registers for the Todo List application, THE system SHALL send a verification email to the provided email address.

WHEN a user requests a password reset, THE system SHALL send a password reset link to the registered email address.

WHILE a user account is unverified, THE system SHALL restrict access to all todo functionality.

IF the email delivery fails, THEN THE system SHALL log the error and display "Unable to send verification email. Please try again later." to the user.

WHERE email verification is enabled, THE system SHALL require email confirmation before allowing full system access.

The email service SHALL use an industry-standard provider (such as SendGrid, Mailgun, or Amazon SES) to ensure reliable delivery.

The email service SHALL support transactional emails only and SHALL NOT be used for marketing or newsletter purposes.

The email content SHALL include: user's name, clear verification instructions, and a single-click verification link.

Email templates SHALL be stored as server-side resources and SHALL NOT be editable by users.

### Notification System

WHEN a user creates a new todo item as a reminder, THE system SHALL send a notification to the user's device.

WHEN a user's todo item has a due date approaching (within 1 hour), THE system SHALL send a reminder notification.

WHILE a user has notifications enabled, THE system SHALL deliver all scheduled reminders.

IF a notification fails to deliver, THEN THE system SHALL attempt delivery using an alternative channel (email) and log the failure.

WHERE a user has disabled notifications, THE system SHALL suppress all notification delivery.

The notification system SHALL use platform-native push services (APNs for iOS, FCM for Android) for mobile devices.

The notification system SHALL only deliver notifications to the authenticated user who owns the todo item.

No third-party advertising or marketing notifications SHALL be sent.

### Analytics Integration

THE system SHALL collect anonymous usage statistics to understand feature adoption and system performance.

THE system SHALL record: number of active users per day, average number of todo items per user, and average time to complete a task.

WHEN a user performs any action (create, update, delete, complete todo item), THE system SHALL log the event type and timestamp anonymously.

IF a user opts out of analytics, THEN THE system SHALL immediately stop all data collection for that user.

WHERE analytics are enabled, THE system SHALL store data for no more than 180 days.

The analytics system SHALL NOT collect any personally identifiable information (PII).

The analytics system SHALL NOT track user behavior across other services.

The analytics data SHALL only be used for system improvement and never for advertising or third-party sales.

### Backup and Recovery Services

THE system SHALL perform daily automated backups of all user todo data.

THE system SHALL store backups in encrypted form in geographically separate locations.

IF data corruption is detected, THEN THE system SHALL initiate restore procedures from the most recent valid backup.

WHILE data is being backed up, THE system SHALL maintain normal operations with no service interruption.

WHERE data recovery is requested by the user, THE system SHALL provide a restoration option within 24 hours.

The backup system SHALL retain the last 30 days of backups.

The backup system SHALL use industry-standard encryption (AES-256) for all stored data.

The backup system SHALL be tested quarterly to ensure successful data restoration.

The backup system SHALL NOT include user authentication credentials or session tokens.

The user SHALL have no mechanism to initiate or manage backups directly.

## User Workflows

### User Registration Flow
- Guest navigates to the registration page
- Guest enters valid email address and password (minimum 12 characters)
- Guest submits registration form
- THE system SHALL immediately send a verification email
- THE system SHALL create an unverified user account with status "pending_verification"
- Guest receives email with verification link
- Guest clicks verification link
- THE system SHALL validate the token in the link
- THE system SHALL update user status to "active"
- Guest is redirected to login page with success message
- IF verification link expires or is invalid, THE system SHALL display "Invalid or expired verification link. Please request a new one."
- IF email is already registered, THE system SHALL display "This email is already registered. Please log in or reset password."

### User Login Flow
- Guest navigates to login page
- Guest enters email and password
- Guest submits login form
- THE system SHALL validate credentials against stored hash
- IF credentials are correct, THE system SHALL:
  - Generate a JWT access token (15-minute expiration)
  - Generate a refresh token (7-day expiration)
  - Store refresh token in httpOnly, Secure, SameSite=Strict cookie
  - Return access token in Authorization header
  - Redirect user to /dashboard
- IF credentials are invalid, THE system SHALL:
  - Return HTTP 401 Unauthorized
  - Return message: "Invalid email or password"
  - Log the failed attempt for security monitoring
  - Implement exponential backoff after 5 failed attempts within 5 minutes

### Todo List Access Flow
- User is authenticated with valid JWT
- User navigates to /todos
- THE system SHALL:
  - Extract user ID from JWT token
  - Query database for all todo items WHERE user_id = {extracted_id}
  - Return items sorted by creation date ascending
- IF user is not authenticated, THE system SHALL return HTTP 401 Unauthorized
- IF request contains user ID in body or URL that does not match JWT subject, THE system SHALL return HTTP 403 Forbidden

### Todo Item Creation Flow
- User is on their todo list page
- User types a description in the input field
- User clicks "Add" or presses Enter
- THE system SHALL:
  - Send POST request to /api/todos with {"description": "text"}
  - Include valid JWT token in Authorization header
  - Receive HTTP 201 Created with response body containing new item
  - Add item to the displayed list immediately
- IF validation fails, THE system SHALL display appropriate error message near input field
- IF network fails, THE system SHALL display "Connection failed. Try again." and retry on next attempt

### Todo Item Completion Flow
- User is viewing their todo list
- User clicks "Mark as complete" button next to an item
- THE system SHALL:
  - Send PATCH request to /api/todos/{id} with {"completed": true}
  - Include valid JWT token
  - Receive HTTP 200 OK
  - Update item display visually to show checkmark and strike-through
- IF item is already complete, clicking "Mark as complete" shall toggle to "Mark as incomplete"
- IF server fails to update, THE system SHALL show "Failed to update. Try again." and revert UI state

### Todo Item Deletion Flow
- User is viewing their todo list
- User clicks "Delete" button next to an item
- THE system SHALL:
  - Show confirmation dialog: "Are you sure you want to delete this task? This cannot be undone."
  - If confirmed, send DELETE request to /api/todos/{id}
  - Include valid JWT token
  - Receive HTTP 204 No Content
  - Remove item from display immediately
- IF deletion fails, THE system SHALL show "Failed to delete. Try again." and do not remove from display
- IF user has no permission (should not happen), THE system SHALL show "Access denied" and return to list

### User Logout Flow
- User clicks "Log out" button
- THE system SHALL:
  - Remove access token from memory
  - Invalidate refresh token on server (send DELETE to /api/auth/refresh)
  - Remove refresh token cookie
  - Redirect to /login with message: "You have been logged out."
- THE system SHALL NOT use "logout" as a client-side only action
- THE system SHALL ensure user cannot make authenticated requests after logout

## Business Rules

### Data Validation Rules

- School email addresses are allowed
- Password must be at least 12 characters
- Email must follow RFC 5322 format
- Description must be at least 1 character and no more than 500 characters
- JWT token must be valid and not expired
- User ID (UUID) must match standard UUIDv4 format
- Authorization header must be in format "Bearer token"
- Refresh token cookie must have HttpOnly, Secure, and SameSite=Strict flags

### Access Control Rules

- User data is isolated at the database layer using explicit user ID filtering
- All database queries to /todos must include WHERE user_id = {extracted_from_jwt}
- The application has no endpoint that accepts user ID parameters from request body or URL without JWT validation
- Admin has read-only access to user account metadata (email, creation date)
- Admin cannot view or modify todo list items of any user
- All operations require JWT validation before processing

### Concurrent Access Rules

- Multiple devices can be logged into the same account simultaneously
- Each device maintains its own JWT token and refresh token
- Concurrent updates to the same todo item are resolved using last-write-wins strategy
- System logs all concurrent access events for security monitoring
- User can view active sessions and revoke them individually

### Data Integrity Rules

- All todos must be associated with a valid user ID
- User email must be unique across the system
- Refresh tokens are linked to specific users and must be invalidated on logout
- JWT tokens cannot be modified or forged
- Item creation timestamps are in UTC and cannot be set by client
- Database foreign key relationships enforce referential integrity

### Error Handling Rules

- Authentication errors must reveal no information about what went wrong (no "invalid email" vs "invalid password" distinction)
- Authorization errors must not reveal whether a resource exists (always return 403, not 404)
- Validation errors must provide specific error codes and human-readable messages
- System errors must log internally but only show generic error to users
- Network errors must be caught and displayed as "Connection failed. Please check your network." to users
- Input errors must be highlighted in the UI with specific messages

## Error Handling

### Authentication Errors

- Invalid credentials → HTTP 401 Unauthorized, error code `INVALID_CREDENTIALS`
- Expired access token → HTTP 401 Unauthorized, error code `ACCESS_TOKEN_EXPIRED`
- Invalid JWT signature → HTTP 401 Unauthorized, error code `INVALID_JWT_SIGNATURE`
- Missing authorization header → HTTP 401 Unauthorized, error code `MISSING_AUTHORIZATION`
- Invalid refresh token → HTTP 401 Unauthorized, error code `INVALID_REFRESH_TOKEN`

### Authorization Errors

- Accessing another user's data → HTTP 403 Forbidden, error code `ACCESS_DENIED`
- Accessing protected resource without authentication → HTTP 403 Forbidden, error code `UNAUTHORIZED_ACCESS`
- Admin attempting to modify user data → HTTP 403 Forbidden, error code `ADMIN_NO_ACCESS`

### Validation Errors

- Empty description → HTTP 400 Bad Request, error code `ITEM_DESCRIPTION_EMPTY`
- Description too long → HTTP 400 Bad Request, error code `ITEM_DESCRIPTION_TOO_LONG`
- Invalid email format → HTTP 400 Bad Request, error code `INVALID_EMAIL_FORMAT`
- Password too short → HTTP 400 Bad Request, error code `PASSWORD_TOO_SHORT`
- Invalid token format → HTTP 400 Bad Request, error code `INVALID_TOKEN_FORMAT`

### System Errors

- Database connection failed → HTTP 500 Internal Server Error, error code `DATABASE_CONNECTION`
- Email service down → HTTP 503 Service Unavailable, error code `EMAIL_SERVICE_DOWN`
- File system full (for backups) → HTTP 500 Internal Server Error, error code `STORAGE_FULL`
- Internal server error → HTTP 500 Internal Server Error, error code `INTERNAL_SERVER_ERROR`

### Network Errors

- Timeout during request → HTTP 504 Gateway Timeout, error code `REQUEST_TIMEOUT`
- Connection refused → HTTP 502 Bad Gateway, error code `CONNECTION_REFUSED`
- DNS resolution failed → HTTP 502 Bad Gateway, error code `DNS_FAILURE`

### Recovery Procedures

- For authentication failures: Prompt user to re-login
- For validation errors: Highlight incorrect field with specific message
- For system errors: Display generic error message, log error for support team
- For network errors: Attempt refresh after 3 second delay, display retry button
- For email delivery errors: Provide "Resend verification email" button
- For account deletion errors: Store deletion request and process asynchronously

## Performance

### Response Time Expectations

All response times are measured from the moment the request is received by the server until the complete response is sent.

| Endpoint | Action | Target Response Time | Acceptable Range |
|----------|--------|---------------------|------------------|
| POST /api/auth/login | Login | ≤ 1s | ≤ 1.5s |
| POST /api/auth/register | Registration | ≤ 1.5s | ≤ 2s |
| GET /api/todos | Get todo list | ≤ 500ms | ≤ 700ms |
| POST /api/todos | Create item | ≤ 300ms | ≤ 500ms |
| PATCH /api/todos/{id} | Update item | ≤ 200ms | ≤ 300ms |
| DELETE /api/todos/{id} | Delete item | ≤ 200ms | ≤ 300ms |
| POST /api/auth/logout | Logout | ≤ 500ms | ≤ 700ms |
| POST /api/auth/password/request | Request password reset | ≤ 1s | ≤ 1.5s |
| POST /api/auth/password/reset | Reset password | ≤ 1s | ≤ 1.5s |

### Load Capacity Estimates

| Metric | Target | Acceptable Range |
|--------|--------|------------------|
| Concurrent users | 10,000 | 8,000–12,000 |
| Requests per minute | 1,000 | 900–1,100 |
| Todo items per user | 1,000 | 800–1,200 |
| Peak traffic (1 minute) | 5x average | 5,000 requests/minute |
| Data storage per user | 5 KB | 3–8 KB |
| Users per server instance | 500 | 300–700 |

### Availability Requirements

- 99.9% uptime means maximum 8.76 hours of downtime per year
- Service must be available during all business hours (Asia/Seoul timezone)
- Maintenance windows must occur between 2:00 AM and 4:00 AM Korea Standard Time
- Automated monitoring must trigger alerts if downtime exceeds 5 minutes
- Load balancer must distribute traffic across at least 2 redundant server instances
- When a server fails, there must be automatic failover to healthy instances

### Scalability Considerations

- All services must be stateless, with session data stored only in JWT tokens and refresh token cookie
- Database must use read/write replication to handle high query volume
- Redis cache should be used for rate limiting and frequently accessed metadata
- Email sending must be queued to avoid request latency
- File storage for backups must be object storage (S3-compatible)
- Horizontal scaling must be possible by deploying additional application instances

## Security

### Authentication Security

- JWT tokens SHALL use HS256 algorithm with 256-bit cryptographically secure random secret key
- Access tokens SHALL expire after 15 minutes of inactivity
- Refresh tokens SHALL be stored in httpOnly, Secure, SameSite=Strict cookie
- Refresh tokens SHALL expire after 7 days
- Access tokens SHALL be stored only in memory on client side (never localStorage)
- Passwords SHALL be hashed using bcrypt with a cost factor of 12 and random salt
- Login attempts shall be rate-limited (5 attempts per minute, 20 per hour)
- Token refresh requests shall be logged
- All sessions shall be trackable, allowing users to see active sessions and revoke them

### Data Protection

- All data at rest SHALL be encrypted with AES-256
- All data in transit SHALL use TLS 1.3 with perfect forward secrecy
- Database SHALL enforce row-level security so that every query contains WHERE user_id = {token_id}
- No personal data shall be logged to application logs
- Backup files SHALL be encrypted with separate key
- API endpoints SHALL be protected by HTTP Strict Transport Security (HSTS)
- Vulnerability scans SHALL be performed weekly

### Privacy Requirements

- No personally identifiable information (PII) shall be shared with third parties
- Analytics SHALL collect only anonymous usage metrics
- Users SHALL be able to request data export and deletion
- Email addresses shall be used only for limited system purposes (verification, password reset)
- The service shall not track user behavior beyond the application
- User must explicitly opt in to analytics and cannot be opted in by default

### Compliance Standards

- Comply with GDPR for data protection and user rights
- Comply with CCPA for California residents
- Maintain records of data processing activities
- Implement Data Protection Impact Assessment (DPIA)
- Appoint a Data Protection Officer (DPO)
- Implement Security by Design principles

### Data Retention Policy

- User data SHALL be retained for the lifetime of the user account
- When user requests account deletion, data SHALL be completely erased within 48 hours
- Backup files SHALL be retained for 30 days
- Authentication logs SHALL be retained for 90 days
- Audit logs SHALL be retained for 1 year
- Analytics data SHALL be retained for 180 days
- Error logs SHALL be retained for 14 days

## Roadmap

### Version 1.0 Goals

- Complete user registration and authentication with email verification
- Single-user private todo list
- Create, update, delete, and complete todo items
- Secure data isolation between users
- Email service integration for verification and password reset
- Secure token-based authentication (JWT + refresh tokens)
- Basic error handling and validation
- 99.9% uptime 

### Version 1.1 Feature Wishlist

- Dark mode interface
- Filter tasks by status (all, incomplete, complete)
- Sort tasks by date completed
- Export todo list to JSON or CSV
- Import todo list from file
- Trash can with recovery (soft delete) option
- Edit task description

### Version 2.0 Future Possibilities

- Add due dates and reminders to tasks
- Task categories or tags
- Search function for task descriptions
- Custom notification sounds
- Multiple list support (project-based)
- Mobile app (iOS/Android)
- Calendar sync integration (iCal)
- Webhook support for automation

### Technical Debt Considerations

- Use of JWT/refresh token pattern instead of session cookies may require future migration
- Encryption key rotation strategy has not been designed
- Convincing backup testing has not been implemented
- Internationalization (i18n) support has not been planned
- GraphQL API endpoint has not been designed

## System Context

### System Boundaries

The Todo List application has clearly defined boundaries:

- **In Scope**:
  - User authentication and authorization
  - Private todo list management
  - Database persistence
  - Email verification and password reset
  - Secure API design
  - 24/7 service availability
  - Backup and recovery
  - Anonymous usage analytics

- **Out of Scope**:
  - Web frontend implementation (UI/UX)
  - Mobile application development
  - Social features (sharing, team lists, comments)
  - Task collaboration
  - Integration with other productivity tools
  - Real-time notifications (push/pull)
  - Customizable themes
  - Task priority levels
  - Repeating tasks
  - File attachments
  - Calendar integration

The application exists as a backend service that can be consumed by any client application (web, mobile, etc.). The backend provides APIs but does not provide any frontend code.

### Architecture Assumptions

- The system uses a microservices architecture with the Todo application as a standalone service
- Frontend applications will be separate and consume this API via HTTP
- The system is stateless—session data stored only in tokens and cookies
- The system uses asynchronous communication for email and analytics
- Third-party services (email, analytics, backups) are managed externally
- Depends on PostgreSQL database with pgBouncer connection pooling
- Uses Node.js with NestJS framework
- Uses Prisma ORM for data access
- Uses Redis for rate limiting
- Uses Nginx as reverse proxy and load balancer
- Uses Docker for containerization
- Uses Kubernetes for orchestration

### Technology Choices

- Node.js (v20) with NestJS framework
- Prisma ORM with PostgreSQL
- JSON Web Tokens (JWT) with HS256 signature
- bcrypt for password hashing
- PGPool for database connection pooling
- Redis for session rate limiting
- SendGrid for transactional email
- Google Firebase Cloud Messaging (FCM) and APNs for push notifications
- AWS S3 for backups
- Prometheus and Grafana for monitoring
- GitHub Actions for CI/CD pipeline
- Jest and Supertest for testing

### Deployment Scenarios

- **Production Deployment**:
  - Cloud provider: AWS
  - Region: ap-northeast-2 (Seoul)
  - Container orchestration: Kubernetes (EKS)
  - Database: Amazon RDS for PostgreSQL
  - Redis: ElastiCache
  - Email: Amazon SES
  - Backups: Amazon S3 with versioning
  - Monitoring: CloudWatch with custom dashboards
  - Security: AWS WAF, NAT Gateway, Security Groups
  - CI/CD: GitHub Actions

- **Staging/Testing Deployment**:
  - Same architecture as production
  - PostgreSQL with data seeded from production snapshots
  - Disabled email sending
  - Reduced monitoring frequency

- **Local Development**:
  - Docker Compose for database, Redis, and API server
  - SQLite for local development database
  - Mocked external services
  - Environment variables for configuration

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*