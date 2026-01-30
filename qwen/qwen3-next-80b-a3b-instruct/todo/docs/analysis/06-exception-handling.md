# Todo List Service Requirements Specification

## Service Vision

The Todo List Service is a secure, multi-user productivity application designed to help individuals manage personal task lists with private data isolation. The system enables users to register and authenticate securely, then create, update, and manage personal to-do items that are accessible only to the account owner.

This service eliminates the need for users to manually track tasks across multiple platforms, providing a centralized, simple, and reliable tool for everyday productivity. With strict data isolation between users, users can trust their personal tasks remain confidential and private.

Success will be measured by user retention, daily active users, and successful authentication rates. The primary performance metric is zero cross-user data access incidents.

## Business Model

### Why This Service Exists

Many individuals struggle with organizing daily tasks using paper, notes apps, or unsecured solutions. This service addresses a critical need for a simple, private, and reliable task management system that respects user privacy and data ownership.

Users don't want their personal tasks exposed to others—even in cloud applications. The market lacks a truly minimal, secure, and user-focused Todo app that prioritizes privacy over feature bloat.

This service solves this problem by designing a minimalist application with one core feature—personal task management—paired with enterprise-grade authentication and zero data sharing between users.

### Revenue Strategy

This service operates under a freemium business model.

- Free Tier: Unlimited personal todo items, basic reminders, and mobile-web access.
- Premium Tier ($2.99/month): Advanced features including due date notifications, priority tagging, export functionality, and cross-device sync with end-to-end encryption.

Revenue will be generated through app store purchases (iOS, Android) and web subscription billing via Stripe.

### Growth Plan

Initial growth will be driven by:
- Organic search traffic targeting "private todo list app" and "secure task manager"
- Word-of-mouth referrals from satisfied users
- Partnerships with productivity blogs and YouTube creators

Future growth will focus on:
- Integration with calendar systems (Google Calendar, Outlook)
- Development of browser extensions
- Enterprise team versions for small teams

### Success Metrics

- Daily Active Users (DAU): 10,000 in first 6 months
- Monthly Active Users (MAU): 50,000 in first year
- User Registration Conversion Rate: ≥25% from landing page visits
- Retention Rate: 40% of users active after 90 days
- Support Ticket Volume: <5 per 1,000 users monthly
- Zero reported data breaches

## User Actors and Authentication

### Actor Hierarchy

The system defines two user actors:

1. **Guest** (Unauthenticated User)
   - Can view the homepage and registration/login forms
   - Cannot access any todo list data
   - Cannot interact with any API endpoints requiring authentication

2. **Member** (Authenticated User)
   - Has a unique account verified by email
   - Can create, read, update, and delete their own todo items
   - Cannot access any other user's todo items
   - Cannot view, edit, or delete content belonging to other users

There are no admin or moderator roles in the initial version.

### Authentication Requirements

All authentication workflows follow industry-standard JWT-based token authentication.

#### Registration Workflow

1. WHEN a guest submits a registration request with valid email and password, THEN THE system SHALL create a new Member account.
2. WHEN the email address is already registered, THEN THE system SHALL respond with HTTP 409 Conflict and error code "AUTH_EMAIL_ALREADY_EXISTS".
3. WHEN the email format is invalid, THEN THE system SHALL respond with HTTP 400 Bad Request and error code "AUTH_INVALID_EMAIL_FORMAT".
4. WHEN the password is shorter than 8 characters, THEN THE system SHALL respond with HTTP 400 Bad Request and error code "AUTH_PASSWORD_TOO_SHORT".
5. WHEN the password contains only common words (e.g., "password", "12345678"), THEN THE system SHALL respond with HTTP 400 Bad Request and error code "AUTH_PASSWORD_TOO_WEAK".
6. WHEN the registration is successful, THEN THE system SHALL send a verification email to the provided address.
7. WHEN the user clicks the verification link, THEN THE system SHALL activate their account and redirect to login page with success message.

#### Login Workflow

1. WHEN a guest provides valid email and password, THEN THE system SHALL validate credentials and return a JWT access token and refresh token.
2. WHEN the email exists but is unverified, THEN THE system SHALL respond with HTTP 401 Unauthorized and error code "AUTH_ACCOUNT_NOT_VERIFIED".
3. WHEN the user has exceeded five failed login attempts in 15 minutes, THEN THE system SHALL lock the account for 30 minutes and return HTTP 401 with error code "AUTH_ACCOUNT_LOCKED".
4. WHEN credentials are invalid, THEN THE system SHALL respond with HTTP 401 Unauthorized and error code "AUTH_INVALID_CREDENTIALS" without disclosing whether email or password was incorrect.
5. WHEN authentication is successful, THEN THE system SHALL issue:
   - An access token (expires in 15 minutes)
   - A refresh token (expires in 7 days)
6. WHEN the user logs out, THEN THE system SHALL invalidate the refresh token and clear client-side tokens.

#### Token Management

1. WHEN an API request contains a valid, unexpired access token with correct userID, THEN THE system SHALL grant access to the user's own todo resources.
2. WHEN an access token has expired, THEN THE system SHALL respond with HTTP 401 Unauthorized and error code "AUTH_TOKEN_EXPIRED".
3. WHEN a refresh token is provided and valid, THEN THE system SHALL issue a new access token and refresh token.
4. WHEN a refresh token has expired, been revoked, or does not match the requesting user, THEN THE system SHALL respond with HTTP 401 Unauthorized and error code "AUTH_REFRESH_TOKEN_INVALID".
5. WHEN a token is malformed, corrupted, or contains invalid signatures, THEN THE system SHALL respond with HTTP 401 Unauthorized and error code "AUTH_TOKEN_INVALID".

### Permission Matrix

| Endpoint | Guest | Member |
|----------|-------|--------|
| GET /api/auth/register | ✅ | ❌ |
| GET /api/auth/login | ✅ | ❌ |
| GET /api/auth/logout | ❌ | ✅ |
| POST /api/auth/refresh | ❌ | ✅ |
| GET /api/todos | ❌ | ✅ |
| GET /api/todos/:id | ❌ | ✅ |
| POST /api/todos | ❌ | ✅ |
| PUT /api/todos/:id | ❌ | ✅ |
| DELETE /api/todos/:id | ❌ | ✅ |
| GET /api/todos/user/:otherUserId | ❌ | ❌ |
| POST /api/todos/user/:otherUserId | ❌ | ❌ |
| PUT /api/todos/user/:otherUserId | ❌ | ❌ |
| DELETE /api/todos/user/:otherUserId | ❌ | ❌ |

The system enforces strict ownership validation: Every request to a todo item must include a valid access token, and the userId in the token must exactly match the todo item's ownerId.

## Core Todo Functionality

### Core Features

The system implements the following minimal but complete Todo list features:

1. **Todo Item Creation**
   - Title (required, max 500 characters)
   - Description (optional, max 2000 characters)
   - Priority (low, medium, high)
   - Due date (optional, ISO 8601 format)
   - Status (pending, in_progress, completed)

2. **Todo Item Retrieval**
   - Fetch all todo items for the authenticated user
   - Filter by status (pending, in_progress, completed, all)
   - Filter by priority (low, medium, high, all)
   - Sort by created_at, due_date, priority, or status
   - Paginate results (max 100 items per page)

3. **Todo Item Update**
   - Modify title, description, priority, due_date, or status
   - Only the owner can modify their items
   - No cross-user updates allowed

4. **Todo Item Deletion**
   - Delete individual todo items
   - Only the owner can delete their items
   - Soft delete (item marked as deleted but retained for 30 days for recovery)

### Data Model Concepts

The application operates on a simple, denormalized data model:

- Each todo item belongs to exactly one user
- No shared lists or collaboration features
- All query and update operations are scoped to the authenticated user's ID
- The system enforces that no API request can reference any other user's data

### User Interactions

#### Primary Workflow: Registration → Todo Creation

1. User navigates to application homepage
2. User clicks "Sign Up"
3. User enters email and password
4. System sends verification email
5. User clicks verification link
6. System activates account and redirects to login
7. User logs in with credentials
8. System redirects to dashboard
9. User clicks "New Todo"
10. User enters title and optional details
11. User clicks "Save"
12. System creates item and displays in list

#### Secondary Workflow: Task Update and Completion

1. User views todo list
2. User clicks on todo item with status "pending"
3. User changes status to "in_progress" and saves
4. System updates item
5. User later changes status to "completed"
6. System marks item as complete, applies completion timestamp
7. Completed items are visually grayed out in list

#### Special Scenario: Password Reset

1. User clicks "Forgot Password?" on login screen
2. System prompts for email
3. User enters registered email
4. System sends password reset link with 1-hour expiration token
5. User clicks link and enters new password
6. System validates token, updates password, and logs user out
7. User must log in again with new credentials

### Validation Rules

#### Todo Item Creation Validation

WHEN a user attempts to create a todo item with an empty title, THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_EMPTY_TITLE".

WHEN a user attempts to create a todo item with a title longer than 500 characters, THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_TITLE_TOO_LONG".

WHEN a user attempts to create a todo item with a description longer than 2000 characters, THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_DESCRIPTION_TOO_LONG".

WHEN a user attempts to create a todo item with invalid characters (null bytes, control characters), THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_INVALID_CHARACTERS".

WHEN a user attempts to create a todo item with an invalid priority value (not "low", "medium", or "high"), THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_INVALID_PRIORITY".

WHEN a user attempts to create a todo item with an invalid due_date format (not ISO 8601), THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_INVALID_DATE_FORMAT".

#### Todo Item Update Validation

WHEN a user attempts to update a todo item's status with an invalid value (not "pending", "in_progress", or "completed"), THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_INVALID_STATUS".

WHEN a user attempts to update a todo item with a different user's ID in the request body, THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_INVALID_USER_ID".

WHEN a user attempts to update a todo item's title to empty during update, THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_EMPTY_TITLE".

#### Todo Item Query Validation

WHEN a user attempts to filter todos by priority with an invalid value (not "low", "medium", "high", or "all"), THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_INVALID_FILTER_PRIORITY".

WHEN a user attempts to sort todos by an invalid field (not "created_at", "due_date", "priority", or "status"), THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_INVALID_SORT_FIELD".

WHEN a user attempts to request a page number less than 1 when paginating todos, THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_INVALID_PAGE_NUMBER".

WHEN a user attempts to request a page size greater than 100 when paginating todos, THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_PAGE_SIZE_EXCEEDED".

## User Scenarios and Workflows

### User Journey: Registration and First Use

Sarah, a college student, wants to organize her study tasks. She visits the Todo List Service website.

1. Sarah clicks "Get Started" on the homepage.
2. She fills in her university email (sarah@university.edu) and a strong password.
3. She clicks "Create Account".
4. The system sends a verification email with a unique link.
5. Sarah checks her email inbox, opens the message, and clicks "Verify Email".
6. The system confirms her account is now active and redirects her to the login page.
7. Sarah logs in with her email and password.
8. She is taken to her empty dashboard.
9. She clicks "Add New Task", types "Study for Calculus midterm", and clicks "Save".
10. The task appears in her list with status "pending".
11. Sarah closes the browser, confident her tasks are now securely stored.

### User Journey: Managing Daily Tasks

David, a software engineer, uses the app daily to track his work and personal tasks.

1. David logs in on his laptop.
2. He sees three pending tasks: "Review PR", "Call Bob", "Buy groceries".
3. He clicks into the "Review PR" task and changes its status to "in_progress".
4. He adds a description: "Check for memory leak in user authentication module."
5. He sets priority to "high".
6. He marks the "Buy groceries" task as "completed".
7. He adds a new task: "Schedule dentist appointment".
8. He clicks "Logout" when he finishes.
9. All changes are synced to his account and available on his phone.

### User Journey: Account Recovery

Lisa forgets her password after two months of inactivity.

1. Lisa visits the site and clicks "Forgot Password?".
2. She enters her email address: lisa@example.com.
3. The system sends a password reset email with a time-limited token.
4. Lisa doesn’t check her email for 3 hours.
5. When she finally checks, she clicks the reset link, but it says "Link expired".
6. Lisa re-initiates the reset process.
7. The system sends a new email.
8. Lisa successfully resets her password and logs in.
9. She updates her password to something more memorable.

### User Journey: Attempting Unauthorized Access

Tom believes another member's todo data might be accessible.

1. Tom logs in with his credentials.
2. He manually modifies a URL in the browser to access /api/todos/123456, expecting to see someone else's data.
3. The system checks the JWT in his token.
4. The userId in his token is 789, but the requested todo item (123456) has ownerId 321.
5. The system responds with HTTP 403 Forbidden and error code "AUTH_UNAUTHORIZED_ACCESS".
6. Tom receives the message: "You don't have permission to access this todo list."
7. The system logs this as a potential security attempt.

### User Journey: Session Expiration

Mike leaves his laptop open at a coffee shop.

1. Mike logs in and starts working on his todos.
2. He walks away for 20 minutes.
3. His access token expires after 15 minutes.
4. When he returns and tries to create a new task, the system responds with HTTP 401 Unauthorized, error code "AUTH_TOKEN_EXPIRED".
5. The application automatically redirects him to the login page with the message: "Your session has expired. Please log in again to continue."
6. Mike re-authenticates with his password.
7. He continues his work without data loss—his todo list is still visible.

## Exception Handling

### Authentication Errors

#### Invalid Credentials

WHEN a user attempts to log in with incorrect email or password, THE system SHALL respond with HTTP 401 Unauthorized and return a JSON object containing error code "AUTH_INVALID_CREDENTIALS".

WHEN a guest attempts to authenticate after five consecutive failed attempts within 15 minutes, THE system SHALL temporarily lock the account for 30 minutes and return error code "AUTH_ACCOUNT_LOCKED".

WHEN an email address is provided that does not exist in the system, THE system SHALL NOT disclose this information and SHALL respond with the same "AUTH_INVALID_CREDENTIALS" error code as for invalid passwords to prevent account enumeration attacks.

WHEN the authentication request contains malformed JSON or missing required fields (email, password), THE system SHALL respond with HTTP 400 Bad Request and error code "AUTH_INVALID_REQUEST_FORMAT".

### Invalid Token

WHEN a user makes a request with an expired access token, THE system SHALL respond with HTTP 401 Unauthorized and return error code "AUTH_TOKEN_EXPIRED".

WHEN a user makes a request with an invalidly formatted or corrupted access token, THE system SHALL respond with HTTP 401 Unauthorized and return error code "AUTH_TOKEN_INVALID".

WHEN a user attempts to use a refresh token that has been revoked or does not belong to the requesting user, THE system SHALL respond with HTTP 401 Unauthorized and return error code "AUTH_REFRESH_TOKEN_INVALID".

WHEN a user attempts to exchange an invalid or expired refresh token for a new access token, THE system SHALL respond with HTTP 401 Unauthorized and return error code "AUTH_REFRESH_TOKEN_EXPIRED".

### Authorization Errors

#### Unauthorized Access

WHEN a user attempts to access another user's todo list, THE system SHALL respond with HTTP 403 Forbidden and error code "AUTH_UNAUTHORIZED_ACCESS".

WHEN a user attempts to update or delete a todo item that does not belong to them, THE system SHALL respond with HTTP 403 Forbidden and error code "AUTH_UNAUTHORIZED_MODIFICATION".

WHEN a user attempts to access the API endpoints without being authenticated, THE system SHALL respond with HTTP 401 Unauthorized and error code "AUTH_MISSING_TOKEN".

WHEN a user attempts to perform administrative actions but is not an admin (in the case of future admin roles), THE system SHALL respond with HTTP 403 Forbidden and error code "AUTH_ADMIN_REQUIRED".

### Input Validation Failures

#### Todo Item Creation Validation

WHEN a user attempts to create a todo item with an empty title, THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_EMPTY_TITLE".

WHEN a user attempts to create a todo item with a title longer than 500 characters, THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_TITLE_TOO_LONG".

WHEN a user attempts to create a todo item with a description longer than 2000 characters, THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_DESCRIPTION_TOO_LONG".

WHEN a user attempts to create a todo item with invalid characters (null bytes, control characters), THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_INVALID_CHARACTERS".

WHEN a user attempts to create a todo item with an invalid priority value (not "low", "medium", or "high"), THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_INVALID_PRIORITY".

WHEN a user attempts to create a todo item with an invalid due_date format (not ISO 8601), THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_INVALID_DATE_FORMAT".

#### Todo Item Update Validation

WHEN a user attempts to update a todo item's status with an invalid value (not "pending", "in_progress", or "completed"), THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_INVALID_STATUS".

WHEN a user attempts to update a todo item with a different user's ID in the request body, THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_INVALID_USER_ID".

WHEN a user attempts to update a todo item's title to empty during update, THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_EMPTY_TITLE".

#### Todo Item Query Validation

WHEN a user attempts to filter todos by priority with an invalid value (not "low", "medium", "high", or "all"), THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_INVALID_FILTER_PRIORITY".

WHEN a user attempts to sort todos by an invalid field (not "created_at", "due_date", "priority", or "status"), THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_INVALID_SORT_FIELD".

WHEN a user attempts to request a page number less than 1 when paginating todos, THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_INVALID_PAGE_NUMBER".

WHEN a user attempts to request a page size greater than 100 when paginating todos, THE system SHALL respond with HTTP 400 Bad Request and error code "TODO_PAGE_SIZE_EXCEEDED".

### System Failures

#### Database Connection Issues

IF the database connection fails during any operation, THEN THE system SHALL respond with HTTP 503 Service Unavailable and error code "DB_CONNECTION_FAILED".

IF the database connection timeout occurs during any query, THEN THE system SHALL respond with HTTP 503 Service Unavailable and error code "DB_TIMEOUT".

IF the database returns an unexpected internal error (not handled by validation rules), THEN THE system SHALL respond with HTTP 500 Internal Server Error and error code "DB_INTERNAL_ERROR".

#### Server Resource Exhaustion

IF the server's memory usage exceeds 90% during request processing, THEN THE system SHALL respond with HTTP 503 Service Unavailable and error code "SERVER_MEMORY_EXHAUSTED".

IF the server's CPU usage exceeds 95% during request processing, THEN THE system SHALL respond with HTTP 503 Service Unavailable and error code "SERVER_CPU_EXHAUSTED".

IF the server cannot spawn a new process due to system resource limits, THEN THE system SHALL respond with HTTP 503 Service Unavailable and error code "SERVER_PROCESS_LIMIT".

#### External Service Failures

WHEN an external email service fails during user registration or password reset, THE system SHALL respond with HTTP 503 Service Unavailable and error code "EMAIL_SERVICE_UNAVAILABLE".

WHEN an external rate limiter service becomes unavailable, THE system SHALL continue operating with local rate limiting and log a warning with error code "RATE_LIMITER_UNAVAILABLE".

WHEN any external dependency fails (SMS, logging, monitoring), THE system SHALL continue functioning with appropriate fallbacks and log detailed errors with service-specific error codes.

### User-Facing Error Recovery Processes

#### Authentication Recovery

WHEN authentication fails due to invalid credentials, THEN THE system SHALL provide clear, non-technical error message: "Invalid email or password. Please try again."

WHEN account is locked due to multiple failed attempts, THEN THE system SHALL display: "We've locked your account temporarily due to multiple login attempts. Please wait 30 minutes before trying again."

WHEN token expires, THEN THE system SHALL display: "Your session has expired. Please log in again to continue."

WHEN user tries to log in with an email address that doesn't exist, THEN THE system SHALL display: "Invalid email or password. Please try again."

#### Todo Management Recovery

WHEN a user tries to access someone else's todo list, THEN THE system SHALL display: "You don't have permission to access this todo list."

WHEN a user tries to create a todo with an empty title, THEN THE system SHALL display: "Please enter a title for your todo item."

WHEN a user tries to create a todo with a title longer than 500 characters, THEN THE system SHALL display: "Your todo title is too long. Please use 500 characters or less."

WHEN a user tries to update a todo that no longer exists, THEN THE system SHALL display: "This todo item no longer exists."

WHEN a user tries to filter or sort todos with invalid parameters, THEN THE system SHALL display: "Invalid filter or sort parameter. Please check your selection and try again."

#### General Recovery

WHEN the system experiences a temporary failure, THEN THE system SHALL display: "We're experiencing technical difficulties. Please try again in a few minutes."

WHEN user tries to perform an action that's currently unavailable due to maintenance, THEN THE system SHALL display: "The service is currently under maintenance. We'll be back soon."

WHEN user reaches a rate limit, THEN THE system SHALL display: "You've made too many requests in a short period. Please wait a few seconds before trying again."

WHEN any error occurs that cannot be handled gracefully, THEN THE system SHALL display a generic system error message: "An unexpected error occurred. Please try again or contact support if the problem persists."

## Performance Expectations

### Response Time Requirements

WHEN a user submits any request, THE system SHALL respond with an error notification within 200 milliseconds in 99% of cases.

WHEN the system experiences high load with multiple concurrent requests, THE system SHALL still respond with error notifications within 1 second in 95% of cases.

WHEN a user makes a request resulting in authentication error, THE system SHALL return response within 100 milliseconds.

WHEN a user makes a request resulting in input validation error, THE system SHALL return response within 100 milliseconds.

WHEN a user makes a request requiring database lookup, THE system SHALL return errors within 500 milliseconds.

### Scalability Expectations

- The system shall handle 1,000 concurrent authenticated users during peak hours.
- The system shall support 50,000 active monthly users without degradation in performance.
- Database queries for user-specific todo lists shall execute in under 100ms even with 10,000 items per user.

### System Availability

- Target uptime: 99.9% monthly
- Planned maintenance windows: Only on weekends, between 2:00 AM - 4:00 AM (KST)
- Service Degradation Response: If availability falls below 99%, automatic alerts sent to operations team

## Security and Compliance

### Data Privacy

- All user data (email, todo items) is encrypted at rest using AES-256.
- All data in transit uses TLS 1.3 with perfect forward secrecy.
- No user data is shared with third parties, except as required for email delivery (via approved providers).
- User data is never used for advertising or analytics without explicit opt-in.

### Authentication Security

- Passwords are hashed using bcrypt with a cost factor of 12 and salt.
- Access tokens are signed using RS256 (JWT) with 2048-bit RSA keys.
- Refresh tokens are stored encrypted in database with rotation.
- All authentication endpoints are protected against brute force attacks using rate limiting and account locking.

### Access Control Enforcement

- Every API call is validated for user ownership before any database access.
- No endpoint accesses another user’s data, even with direct database query.
- The system enforces ownership via token claims, not request parameters.
- Authorization is checked server-side—client-side filtering is never trusted.

### Regulatory Compliance

- The system complies with GDPR for user data handling:
  - Right to Access: Users can download their todo data in JSON format.
  - Right to Erasure: Users can completely delete their account and all data.
  - Data Portability: All data can be exported in standardized format.
- The system complies with CCPA for California residents.
- No personal data is transferred outside South Korea unless explicitly agreed by user.

## Business Rules

### Todo Item Validation

- A todo item’s title must be non-empty and ≤ 500 characters.
- A todo item’s description must be ≤ 2000 characters.
- Priority must be one of: "low", "medium", "high".
- Status must be one of: "pending", "in_progress", "completed".
- Due date, if provided, must be a valid ISO 8601 date/time.
- No item can have a due date set in the past unless it’s already been completed.

### User Data Ownership

- Each todo item is owned by exactly one user account.
- The system guarantees that no user can access, modify, or delete another user’s todo items.
- A user cannot transfer ownership of their todo items to another user.
- A user’s authentication token must contain a userID claim that exactly matches the ownerId of any todo item they attempt to access.

### Concurrency Rules

- Multiple users can interact with the system simultaneously without interfering with each other.
- A single user may edit multiple todo items concurrently from different devices.
- No optimistic or pessimistic locking is required because no shared resources exist between users.

### State Transitions

- A todo item’s status may transition:
  - "pending" → "in_progress"
  - "pending" → "completed"
  - "in_progress" → "completed"
  - "in_progress" → "pending"
  - "completed" → "pending"
- Once marked "completed", a todo item remains visible in history
- Completed items can be filtered out but not permanently deleted unless user chooses permanent deletion

## Data Flow and Lifecycle

### Data Entry Points

1. Web UI: User interacts with front-end application in browser
2. Mobile App (future): User submits todos via native mobile interface
3. API Requests: Authorized clients (web/mobile) make authenticated HTTP requests
4. Email Service: External service sends verification and password reset emails (outbound)

### Data Processing Flow

1. User submits data via HTTP POST/PUT/DELETE to /api/todos/* endpoints
2. API Gateway validates request headers (Content-Type, Authorization)
3. Authentication middleware verifies JWT signature, expiry, and userId claim
4. Authorization middleware verifies userId claim matches resource ownerId
5. Input validator checks data types, length, format, enum values
6. Database layer (Prisma) performs operation with filtered WHERE clause: WHERE ownerId = :userId
7. Response is formatted with appropriate HTTP status and body

### Data Storage

- Database: PostgreSQL 15
- Tables: 
  - `user_accounts` (id, email, password_hash, is_verified, created_at, updated_at, deleted_at)
  - `todo_items` (id, title, description, priority, status, due_date, ownerId, created_at, updated_at, deleted_at)
- All data stored in Seoul, South Korea
- Backups occur every 6 hours, retained for 30 days

### Data Lifecycle

- User registration → email verification → account activation → data access
- Todo items are created, updated, and archived (not immediately deleted)
- When a user deletes their account:
  - Their account is flagged as "deleted"
  - All todo items are soft-deleted (deleted_at timestamp set)
  - Database records remain inaccessible for 30 days
  - After 30 days, records are permanently purged from storage
- Backup retention: 30 days

## Future Considerations

### Potential Feature Extensions

- **Reminders and Notifications**: Push notifications and email reminders for upcoming deadlines
- **Recurring Tasks**: Allow users to create daily/weekly/monthly repeating tasks
- **Shared Lists (Team Version)**: Collaborative lists for small teams (with explicit sharing)
- **Tagging System**: Custom tags to categorize tasks beyond priority and status
- **Import/Export**: Support for CSV, JSON, and Todo.txt formats
- **Dark Mode**: User preference for interface theme
- **Voice Entry**: "Add todo: Call mom tomorrow" via voice recognition

### Scalability Considerations

- User growth beyond 1M users: Shard user accounts by region
- High read loads: Implement Redis caching for frequently accessed user todo lists
- Large datasets (>10k items per user): Add database indexing on ownerId + createdAt + status
- Global users: Deploy edge nodes in North America and Europe

### Integration Opportunities

- **Calendar Sync**: Connect to Google Calendar, Outlook, Apple Calendar for due date visibility
- **Email Integration**: Auto-create tasks from flagged emails
- **Slack/Teams Bot**: Create tasks via chat commands
- **Browser Extension**: Quick-add tasks from any webpage
- **Smart Home**: "Alexa, add milk to my todo list"

# Error Code Catalog

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| AUTH_INVALID_CREDENTIALS | 401 | Invalid email or password |
| AUTH_ACCOUNT_LOCKED | 401 | Account temporarily locked due to multiple failed attempts |
| AUTH_TOKEN_EXPIRED | 401 | Access token has expired |
| AUTH_TOKEN_INVALID | 401 | Access token is malformed or invalid |
| AUTH_REFRESH_TOKEN_INVALID | 401 | Refresh token is invalid |
| AUTH_REFRESH_TOKEN_EXPIRED | 401 | Refresh token has expired |
| AUTH_MISSING_TOKEN | 401 | No authentication token provided |
| AUTH_TOKEN_INVALID_USER | 401 | Token contains invalid userID |
| AUTH_MISSING_PERMISSIONS | 403 | Token missing required permissions |
| AUTH_UNAUTHORIZED_ACCESS | 403 | User attempts to access another user's data |
| AUTH_UNAUTHORIZED_MODIFICATION | 403 | User attempts to modify another user's data |
| AUTH_ADMIN_REQUIRED | 403 | Admin permission required for action |
| AUTH_INVALID_REQUEST_FORMAT | 400 | Authentication request has invalid JSON format or missing fields |
| AUTH_MISSING_HEADER | 401 | Authorization header missing when required |
| AUTH_EMAIL_ALREADY_EXISTS | 409 | Email already registered |
| AUTH_INVALID_EMAIL_FORMAT | 400 | Email address is malformed |
| AUTH_PASSWORD_TOO_SHORT | 400 | Password is shorter than 8 characters |
| AUTH_PASSWORD_TOO_WEAK | 400 | Password is too common or weak |
| AUTH_ACCOUNT_NOT_VERIFIED | 401 | User account is not verified |
| TODO_EMPTY_TITLE | 400 | Todo item title is empty |
| TODO_TITLE_TOO_LONG | 400 | Todo item title exceeds 500 characters |
| TODO_DESCRIPTION_TOO_LONG | 400 | Todo item description exceeds 2000 characters |
| TODO_INVALID_CHARACTERS | 400 | Todo item contains invalid characters |
| TODO_INVALID_PRIORITY | 400 | Priority value is not low, medium, or high |
| TODO_INVALID_DATE_FORMAT | 400 | Due date is not in ISO 8601 format |
| TODO_INVALID_STATUS | 400 | Todo status is not pending, in_progress, or completed |
| TODO_INVALID_USER_ID | 400 | Request contains user ID that does not match authenticated user |
| TODO_INVALID_FILTER_PRIORITY | 400 | Priority filter value is invalid |
| TODO_INVALID_SORT_FIELD | 400 | Sort field is not valid |
| TODO_INVALID_PAGE_NUMBER | 400 | Page number less than 1 |
| TODO_PAGE_SIZE_EXCEEDED | 400 | Page size greater than 100 |
| INVALID_JSON_FORMAT | 400 | Request body is not valid JSON |
| INVALID_CONTENT_TYPE | 415 | Content-Type header is not application/json |
| INVALID_ACCEPT_HEADER | 406 | Accept header is not application/json |
| DB_CONNECTION_FAILED | 503 | Cannot establish connection to database |
| DB_TIMEOUT | 503 | Database query timeout |
| DB_INTERNAL_ERROR | 500 | Database returned unexpected internal error |
| SERVER_MEMORY_EXHAUSTED | 503 | Server memory utilization exceeds safe threshold |
| SERVER_CPU_EXHAUSTED | 503 | Server CPU utilization exceeds safe threshold |
| SERVER_PROCESS_LIMIT | 503 | Server cannot spawn new processes due to system limits |
| EMAIL_SERVICE_UNAVAILABLE | 503 | External email service is unreachable |
| RATE_LIMITER_UNAVAILABLE | 503 | Rate limiting service is unavailable, using local fallback |
| RATE_LIMIT_EXCEEDED | 429 | User has exceeded rate limit |
| DB_NOT_FOUND | 404 | Requested todo item does not exist |

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*