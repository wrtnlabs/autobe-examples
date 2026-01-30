# TodoApp Requirements Specification

## Service Overview

TodoApp is a privacy-first, single-user task management service that enables individuals to create, organize, and complete personal to-do items with complete data ownership. Unlike commercial alternatives that aggregate user behavior for advertising, TodoApp provides a minimal, secure environment where users retain full control over their task data without any surveillance, tracking, or monetization of personal activity.

The service runs as a private backend API with no front-end interface — it is designed to be consumed by future mobile or web applications that will render the UI. All data processing, storage, and access control occur server-side, ensuring user privacy is enforced at the platform level.

There are no shared or collaborative features. Every user’s todo list is completely isolated from all others. The service exists solely to provide a trusted, reliable, and private digital space for personal productivity.

## Business Model

### Why This Service Exists

The todoApp service exists to solve the fundamental problem of personal task management in a fragmented digital environment. Modern individuals juggle multiple responsibilities across devices, yet rely on fragmented solutions—sticky notes, calendar reminders, or generic to-do apps that lack proper data ownership and privacy. This service provides a private, secure, and simple platform where users can confidently manage their personal tasks without fear of data exposure, data loss, or corporate surveillance. Unlike public cloud-based task managers that monetize user behavior and aggregate data for advertising, todoApp is intentionally designed as a privacy-first, user-owned productivity tool. The service targets individuals seeking autonomy over their digital workflows—students, freelancers, small business owners, and professionals who value control over their personal data. It differentiates itself by offering zero ad-tracking, zero data mining, and strict user data isolation.

### Revenue Strategy

The todoApp service implements a direct-to-user, premium subscription revenue model with a free trial tier to drive adoption. The core revenue strategy is built on the principle of delivering exceptional value through privacy and simplicity, which users are willing to pay for directly.

#### Tiered Subscription Structure

- **Free Tier**: Unlimited todo items, basic task creation and completion, and single-device sync. No advertisements. Personal data is not shared or analyzed.
- **Premium Tier ($2.99/month or $29.99/year)**: Includes all Free Tier features plus:
  - Cross-device synchronization (web, iOS, Android)
  - Priority customer support
  - Task categorization with custom labels
  - Export functionality (plain text, CSV)
  - Dark mode and theme customization
  - Reduced latency on sync operations

#### User Acquisition and Conversion

- **Organic Growth**: Achieved via word-of-mouth, productivity communities, and GitHub open-source contributions for the backend API documentation.
- **Freemium Conversion Funnel**: Free users are prompted with non-intrusive, contextual upgrade suggestions after reaching 100 tasks or after 30 days of usage.
- **Community-Driven Trust**: No paid ads or influencer marketing—trust is built through transparent privacy policies and open-core architecture.

#### Payment Processing

- Payments handled exclusively through Stripe or Apple/Google in-app purchase systems
- No third-party user data shared with payment processors
- Refund policy aligned with Apple/Google guidelines (14-day full refund window)

#### Strategic Financial Positioning

- Minimal infrastructure cost due to Stateless architecture and efficient Prisma queries
- High gross margins (>90%) due to zero customer acquisition costs from paid ads
- Target: Achieve 5,000 active Premium users within 18 months, generating $150,000/year in recurring revenue

### Growth Plan

#### Phase 1: Product-Market Fit (Months 1–6)

- Launch MVP with core authentication + todo CRUD functionality
- Target developer communities and privacy-conscious productivity forums
- Collect early feedback to refine UX and stability
- Achieve 1,000 total users, 100 Premium conversions

#### Phase 2: Scalable Acquisition (Months 7–12)

- Optimize onboarding flow to reduce signup friction
- Implement referral program: "Invite 3 friends, get 3 months free"
- Submit to dev tool newsletters, Hacker News, and Product Hunt
- Achieve 5,000 total users, 800 Premium conversions

#### Phase 3: Retention Optimization (Months 13–18)

- Introduce micro-engagement features: weekly task summaries, streak tracking
- Monitor and improve user retention via churn analysis
- Expand language support to non-English speakers (first priority: Spanish, Japanese, German)
- Achieve 10,000 total users, 1,800 Premium conversions

#### Retention Strategy

- Users are retained through the emotional satisfaction of task completion and data ownership
- No gamification or artificial metrics—only intrinsic motivation
- Data privacy acts as a retention moat: users don’t leave because they trust that their data will remain private
- Monthly email newsletters (opt-in only) provide tips on productivity without selling anything

### Success Metrics

The success of todoApp is measured through a combination of engagement, revenue, and privacy integrity metrics:

#### Engagement Metrics

- **Monthly Active Users (MAU)**: Target 10,000 within 18 months
- **Daily Active Users (DAU/MAU Ratio)**: Target 40%—indicating habitual usage
- **Average Tasks Per Active User**: Target 15+ tasks per active user
- **Task Completion Rate**: Target 70% of created tasks completed within 7 days
- **Session Duration**: Target 2.5 minutes per session (indicating meaningful engagement)

#### Financial Metrics

- **Customer Acquisition Cost (CAC)**: Target $0 — achieved through organic growth
- **Lifetime Value (LTV)**: Target $40 (based on 13.4 months average subscription length)
- **LTV:CAC Ratio**: Target 100+ (indicating sustainable, scalable growth)
- **Gross Margins**: Target >90% (low infrastructure cost, zero ad revenue)
- **Churn Rate**: Target <5% monthly (low due to data ownership retention)

#### Privacy & Trust Metrics

- **Zero Data Breaches**: Absolute requirement
- **Zero Third-Party Sales**: No data sold to advertisers, analytics firms, or data brokers
- **User Trust Score**: Measured via quarterly opt-in surveys targeting: "Do you trust this app with your personal tasks?"
- **Data Deletion Requests**: Target zero violations—full compliance with GDPR, CCPA, and other global privacy laws

#### System Integrity Metrics

- **Uptime**: Target 99.9% monthly availability
- **Error Rate**: Target <0.1% per 10,000 requests
- **Average API Response Time**: Target <500ms for authenticated endpoints

The ultimate metric of success: A user says, "This is my private space to manage what matters. I don’t have to explain it to anyone. It just works."

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*

## User Actors and Authentication

The system includes one primary actor: the **User**, who interacts with the service to manage personal to-do items. There are no administrator or external system actors. All functionality is scoped exclusively to authenticated individual users.

### Authentication Requirements

- Every user must register with a unique, valid email address and a password of minimum 12 characters
- System SHALL NOT accept email addresses that are malformed or already registered
- Passwords SHALL be hashed using bcrypt with salt and stored encrypted at rest
- Authentication session SHALL be managed through secure, HttpOnly, SameSite=Strict JWT tokens with 24-hour expiration
- Tokens SHALL be automatically refreshed upon each authenticated request if within 12-hour grace period
- Token refresh requests SHALL be rejected if the refresh token has expired or been revoked
- User SHALL be required to re-authenticate upon logout or after 30 days of inactivity
- All authentication endpoints SHALL be rate-limited to 5 attempts per IP address per minute

### Actor Hierarchy and Permissions

| Actor | Description | Permissions |
|-------|-------------|-------------|
| User | An individual who registers and manages their personal todo list | - Create, read, update, delete their own todo items\n- Register new account\n- Log in and authenticate\n- Reset password\n- Delete own account\n- All other users’ data is completely invisible and inaccessible |

No shared access. No collaborative features. No admin role. No external system integration. Only user-owned data.

### Token Management

- Access tokens are signed with a 256-bit HMAC key and include claims: userId, exp, iat
- Refresh tokens are stored in encrypted database field (refreshTokenHash)
- Refresh tokens are single-use and invalidated immediately after use
- Tokens are bound to the user’s IP address and User-Agent hash for additional security
- Token revocation is handled by blacklisting upon logout or account deletion

### Permission Matrix

| Endpoint | Method | Actor | Required Token | Access Rule |
|----------|--------|-------|----------------|-------------|
| /api/v1/auth/register | POST | Guest | No | Allow if email not registered |
| /api/v1/auth/login | POST | Guest | No | Allow if credentials valid |
| /api/v1/auth/refresh | POST | User | Valid access token | Allow if token not expired, refresh token valid |
| /api/v1/auth/logout | POST | User | Valid access token | Revoke token, invalidate refresh token |
| /api/v1/auth/forgot-password | POST | Guest | No | Allow if email exists |
| /api/v1/auth/reset-password | POST | Guest | No | Allow if token is valid and not expired |
| /api/v1/todo | GET | User | Valid access token | Return ONLY user's own todo items |
| /api/v1/todo | POST | User | Valid access token | Create todo item owned by authenticated user |
| /api/v1/todo/{id} | GET | User | Valid access token | Return item only if owned by user |
| /api/v1/todo/{id} | PUT | User | Valid access token | Update item only if owned by user |
| /api/v1/todo/{id} | DELETE | User | Valid access token | Delete item only if owned by user |
| /api/v1/user | GET | User | Valid access token | Return user profile only for authenticated user |
| /api/v1/user | DELETE | User | Valid access token | Delete account and all associated todo items |

## Core Todo Functionality

The Todo feature set is intentionally minimal: only essential operations for personal task tracking.

### Core Features

The following operations are exposed through the API:

- Register a new account
- Log in to existing account
- Obtain and refresh authentication token
- Create a todo item
- Read a todo item by ID
- Update a todo item’s title or completion status
- Delete a todo item
- Retrieve all todo items owned by the user
- Reset password via email
- Delete user account and all associated data

### Data Model Concepts

All user data is isolated within an account-bound namespace. No cross-user data access is permitted under any circumstance.

#### Todo Item

A todo item represents a discrete task defined by a user. It has the following attributes:

- `id`: system-generated unique identifier (UUID)
- `title`: user-defined text, 1–255 characters, required
- `completed`: boolean flag indicating completion status
- `createdAt`: timestamp when item was created
- `updatedAt`: timestamp when item was last modified
- `userId`: foreign key linking to the owning user

Every todo item belongs to exactly one user. No shared fields or metadata. No tags, categories, or priorities.

#### User Account

Represents a registered individual with exclusive access to their own data.

- `id`: system-generated unique identifier (UUID)
- `email`: unique, lowercase, validated email address
- `passwordHash`: bcrypt-hashed password (no plaintext)
- `refreshTokenHash`: encrypted hash of one active refresh token
- `lastLoginAt`: timestamp of most recent successful login
- `createdAt`: timestamp of account creation
- `isDeleted`: soft-delete flag, used for GDPR compliance

User account cannot be shared. Account deletion permanently removes all associated todo items.

### User Interactions

#### Registration

WHEN a visitor navigates to the registration page, THE system SHALL display a form requesting:
- Email address (validated for format)
- Password (minimum 12 characters)

WHEN the visitor submits the form, THE system SHALL:
- Verify the email is not already registered
- Hash the password using bcrypt with cost 12
- Create a new user record with status "active"
- Issue a new access token and refresh token
- Store the refresh token hash in the user record
- Return 201 Created with user profile and tokens

WHEN the email is already registered, THE system SHALL return 409 Conflict with message: "Email already in use."

WHEN the password is less than 12 characters, THE system SHALL return 400 Bad Request with message: "Password must be at least 12 characters long."

#### Login

WHEN an existing user submits valid credentials, THE system SHALL:
- Verify email exists and is not deleted
- Validate password against stored hash
- Refresh the user's last login timestamp
- Issue a new access token (24h expiry) and refresh token (7d expiry)
- Store new refresh token hash, invalidate old one
- Return 200 OK with access token, refresh token and user profile

WHEN credentials are invalid, THE system SHALL return 401 Unauthorized with message: "Invalid email or password."

WHEN account is marked as deleted, THE system SHALL return 401 Unauthorized with message: "This account has been deleted."

#### Todo Item Creation

WHEN a user submits a new todo item via POST /api/v1/todo, THE system SHALL:
- Verify access token is valid and belongs to authenticated user
- Ensure title is between 1 and 255 characters
- Ensure title does not contain only whitespace
- Set `createdAt` and `updatedAt` to current UTC time
- Set `completed` to false
- Assign the `userId` from the authenticated user
- Store the item in the database
- Return 201 Created with the full item object

WHEN title is empty or only whitespace, THE system SHALL return 400 Bad Request with message: "Todo title cannot be empty or contain only spaces."

WHEN title exceeds 255 characters, THE system SHALL return 400 Bad Request with message: "Todo title cannot exceed 255 characters."

#### Todo Item Update

WHEN a user sends PUT request to /api/v1/todo/{id}, THE system SHALL:
- Verify access token is valid and belongs to authenticated user
- Verify the todo item exists and is owned by the authenticated user
- Allow update of title (1–255 chars) and/or completion status
- Update `updatedAt` to current UTC time
- Return 200 OK with updated item

WHEN item does not exist or user does not own it, THE system SHALL return 404 Not Found with message: "Todo item not found."

WHEN title is empty or only whitespace, THE system SHALL return 400 Bad Request with message: "Todo title cannot be empty or contain only spaces."

WHEN title exceeds 255 characters, THE system SHALL return 400 Bad Request with message: "Todo title cannot exceed 255 characters."

#### Todo Item Deletion

WHEN a user sends DELETE request to /api/v1/todo/{id}, THE system SHALL:
- Verify access token is valid and belongs to authenticated user
- Verify the todo item exists and is owned by the authenticated user
- Delete the item permanently from database
- Return 204 No Content

WHEN item does not exist or user does not own it, THE system SHALL return 404 Not Found with message: "Todo item not found."

#### Retrieve All Todos

WHEN a user sends GET request to /api/v1/todo, THE system SHALL:
- Verify access token is valid and belongs to authenticated user
- Query all todo items where userId matches authenticated user
- Order results by createdAt descending
- Return 200 OK with array of items
- Include only id, title, completed, createdAt, updatedAt

WHEN user has no todo items, THE system SHALL return empty array ([])

#### Password Reset

WHEN a user requests password reset by submitting email, THE system SHALL:
- Verify email belongs to an active (not deleted) user
- Generate a 6-hour expiration reset token
- Store the reset token in database, hashed
- Send email with unique reset link containing token
- Return 204 No Content (do not reveal if email exists or not)

WHEN reset token is submitted with new password, THE system SHALL:
- Verify token exists, valid, and not expired
- Verify new password is 12+ characters
- Hash new password
- Clear reset token from database
- Update user passwordHash
- Invalidate all active tokens (force re-login)
- Return 204 No Content

WHEN reset token is invalid or expired, THE system SHALL return 401 Unauthorized with message: "Reset token is invalid or expired."

WHEN new password is less than 12 characters, THE system SHALL return 400 Bad Request with message: "Password must be at least 12 characters long."

#### Account Deletion

WHEN a user sends DELETE request to /api/v1/user, THE system SHALL:
- Verify access token is valid and belongs to authenticated user
- Set isDeleted flag to true
- Delete all associated todo items
- Invalidate all active and refresh tokens immediately
- Return 204 No Content

WHEN a user is already marked as deleted, THE system SHALL return 410 Gone with message: "Account already deleted."

### Validation Rules

- Every todo item must be associated with a valid, active user
- No user may access another user’s data under any circumstance
- No email may be registered more than once
- Passwords must be minimum 12 characters
- Todo titles must be 1–255 characters and not whitespace-only
- Refresh tokens must be single-use
- Reset tokens expire after 6 hours
- Password hashes must use bcrypt with cost 12
- All tokens must be signed and encrypted as JWT

## User Scenarios and Workflows

### Primary User Journey: Registration to Todo Creation

1. User visits the service website (external interface)
2. User clicks "Sign Up"
3. User enters valid email and strong password (≥12 chars)
4. User submits registration form
5. System validates email uniqueness and password strength
6. System creates user record and issues access token
7. User is redirected to dashboard
8. User enters task title "Buy groceries"
9. User clicks "Add"
10. System validates title length and saves item
11. User sees new task in list

### Secondary User Journey: Task Update and Completion

1. User logs in
2. User sees existing task: "Buy groceries"
3. User clicks checkbox next to task
4. System sends PUT request to /api/v1/todo/{id} with completed=true
5. System updates updatedAt timestamp
6. Task visually updates to "completed"
7. User clicks title to edit it
8. User changes title to "Buy groceries and apples"
9. System validates new title length
10. System updates record
11. User sees updated title

### Special Scenario: Password Reset

1. User forgets password
2. User clicks "Forgot Password"
3. User enters registered email
4. System generates reset token and sends email
5. User opens email and clicks link
6. User enters new password (≥12 chars)
7. System validates token
8. System updates password hash
9. System invalidates all active sessions
10. User is logged out
11. User must log in again with new password

### Special Scenario: Account Deletion

1. User decides to stop using service
2. User navigates to account settings
3. User clicks "Delete My Account"
4. System prompts for confirmation
5. User confirms deletion
6. System sets isDeleted=true
7. System deletes all associated todo items
8. System invalidates all sessions
9. User receives 204
10. User attempts to log in: receives 401 "Account deleted"

## Exception Handling

### Authentication Errors

| Error Condition | HTTP Status | Response Message |
|-----------------|-------------|------------------|
| Invalid email or password | 401 Unauthorized | "Invalid email or password." |
| Missing or invalid access token | 401 Unauthorized | "Authentication token is missing or invalid." |
| Expired access token | 401 Unauthorized | "Authentication token has expired. Please refresh." |
| Invalid refresh token | 401 Unauthorized | "Refresh token is invalid or expired." |
| Attempt to log in to deleted account | 401 Unauthorized | "This account has been deleted." |
| Too many login attempts (5/min) | 429 Too Many Requests | "Too many failed attempts. Please wait before trying again." |

### Authorization Errors

| Error Condition | HTTP Status | Response Message |
|-----------------|-------------|------------------|
| User tries to access another user’s todo item | 404 Not Found | "Todo item not found." |
| User tries to delete another user’s todo item | 404 Not Found | "Todo item not found." |
| User tries to update another user’s todo item | 404 Not Found | "Todo item not found." |
| User tries to access /api/v1/user without authentication | 401 Unauthorized | "Authentication token is missing or invalid." |

### Input Validation Failures

| Error Condition | HTTP Status | Response Message |
|-----------------|-------------|------------------|
| Email already registered | 409 Conflict | "Email already in use." |
| Password under 12 characters | 400 Bad Request | "Password must be at least 12 characters long." |
| Todo title empty or only whitespace | 400 Bad Request | "Todo title cannot be empty or contain only spaces." |
| Todo title exceeds 255 characters | 400 Bad Request | "Todo title cannot exceed 255 characters." |
| Reset token expired | 401 Unauthorized | "Reset token is invalid or expired." |
| Invalid email format | 400 Bad Request | "Invalid email format." |

### System Failures

| Error Condition | HTTP Status | Response Message |
|-----------------|-------------|------------------|
| Database connection failed | 503 Service Unavailable | "Service temporarily unavailable. Please try again later." |
| Token signing failed | 500 Internal Server Error | "Authentication system malfunction. Please contact support." |
| Email service unavailable | 503 Service Unavailable | "Password reset email could not be sent. Please try again later." |
| Rate limit exceeded (server-side) | 503 Service Unavailable | "Service overloaded. Please try again in a few minutes." |

## Performance Expectations

### Response Time Requirements

- User authentication (login/register): ≤ 500ms
- Todo item creation: ≤ 400ms
- Todo item retrieval (10 items): ≤ 300ms
- Todo item update/delete: ≤ 350ms
- Password reset email trigger: ≤ 1000ms

All endpoints must respond within 1 second under 95% load conditions.

### Scalability Expectations

- Support 1,000 concurrent authenticated users during peak
- Handle 50 requests per second per node
- Support 100,000 total registered users
- Maintain performance as user task count grows to 10,000 per user

### System Availability

- Target uptime: 99.9% monthly
- Downtime allowance: ≤ 7.2 hours per year
- System must be resilient to single-point-of-failure
- No scheduled maintenance windows — zero planned downtime

## Security and Compliance

### Data Privacy

- No user data is ever shared with third parties
- No telemetry, analytics, or behavioral tracking
- All user data is stored in an encrypted database
- User may delete account and data at any time
- Data deletion is permanent and non-reversible

### Authentication Security

- All passwords hashed with bcrypt cost 12
- Access tokens are signed JWTs with 24-hour expiration
- Refresh tokens are hashed and stored securely
- All tokens are bound to IP address and User-Agent
- Tokens are invalidated on logout or password reset
- No plain-text passwords ever stored or transmitted
- API endpoints protected against brute force attacks (5 attempts/minute)

### Access Control Enforcement

- Every request to /api/v1/todo/{id} is validated against userId
- No endpoint returns data for unauthenticated users
- No endpoint returns data for non-owning users
- No endpoint returns any indication of non-owning resources
- All 404 responses are uniform to prevent enumeration

### Regulatory Compliance

- Fully compliant with GDPR
- Fully compliant with CCPA
- Zero data transfer outside user’s region
- Right to be forgotten: All data purged on account deletion
- Data processing agreement: Service acts as data processor only
- No cookies except HttpOnly session token
- No tracking pixels, fingerprinting, or third-party scripts

## Business Rules

### Todo Item Validation

- Each todo item must be associated with exactly one user
- A user may have unlimited todo items
- Title must be 1–255 visible characters
- Title cannot be empty or contain only whitespace
- Completion status defaults to false
- No duplicates: system SHALL NOT prevent duplicate titles
- No priority, category, or tags supported

### User Data Ownership

- All data generated belongs exclusively to the user
- The service provider owns only the software platform, not user content
- No data mining, profiling, or advertising tracking
- User may export or delete data at any time
- User data may never be accessed by any party except the user

### Concurrency Rules

- No optimistic or pessimistic locking needed
- Concurrent updates to same todo item by same user are permitted
- Concurrent updates by different users are impossible
- Last-write-wins is acceptable since users only interact with their own data

### State Transitions

#### Todo Item Lifecycle

```mermaid
stateDiagram-v2
    [*] --> "Pending"
    "Pending" --> "Completed": user marks as complete
    "Completed" --> "Pending": user unmarks completion
    "Pending" --> "Deleted": user deletes item
    "Completed" --> "Deleted": user deletes item
```

#### User Account Lifecycle

```mermaid
stateDiagram-v2
    [*] --> "Active"
    "Active" --> "Deleted": user requests deletion
    "Active" --> "Inactive": 30 days of no login
    "Inactive" --> "Deleted": user logs in and cancels inactivity
    "Inactive" --> "Deleted": 30 days of inactivity expires
```

## Data Flow and Lifecycle

### Data Entry Points

- HTTP requests to `/api/v1/auth/register`
- HTTP requests to `/api/v1/auth/login`
- HTTP requests to `/api/v1/todo`
- HTTP requests to `/api/v1/auth/forgot-password`
- HTTP requests to `/api/v1/auth/reset-password`
- HTTP requests to `/api/v1/user`

### Data Processing Flow

1. HTTP request received
2. Authentication middleware validates access or refresh token
3. User identity extracted from token
4. Authorization middleware verifies user ownership
5. Request body validated for format and business rules
6. Database transaction executed
7. Response serialized and returned

All operations are transactional. If any validation or authorization check fails, the entire operation is aborted.

### Data Storage

Todos and users are stored in a relational database using Prisma. No caching layer. All data accessed from primary storage. Storage is encrypted at rest.

#### Tables

- `todo_users`
  - id (UUID)
  - email (encrypted)
  - passwordHash (bcrypt)
  - refreshTokenHash (encrypted)
  - lastLoginAt (datetime)
  - createdAt (datetime)
  - isDeleted (boolean)

- `todo_items`
  - id (UUID)
  - userId (foreign key to todo_users.id)
  - title (string)
  - completed (boolean)
  - createdAt (datetime)
  - updatedAt (datetime)

All indexes: userId on todo_items, email on todo_users.

### Data Lifecycle

- Registration: Data created when new user signs up
- Active state: Data is readable and modifiable by user
- Inactive state: Data remains untouched for 30 days of inactivity
- Deletion: Data erased permanently with no backup

All deleted data is unrecoverable. No soft-deletion backups. No logs retained beyond 7 days.

## Future Considerations

### Potential Feature Extensions

- Export to CSV or plaintext
- Dark mode (UI only)
- Local storage backup for offline access
- Multi-device sync with conflict resolution
- Weekly email summaries
- Import tasks from text files

All future features must preserve: privacy-first design, zero data sharing, and single-user isolation.

### Scalability Considerations

- Horizontal scaling of API layer via load balancing
- Database replication for read-heavy operations
- CDN caching for static frontend assets

No architectural changes will compromise data isolation.

### Integration Opportunities

- OAuth login via Google or Apple (future opt-in)
- Webhooks to notify external services on task completion (future opt-in)

All integrations require explicit user consent and never compromise data isolation.

> *Developer Note: This document defines business requirements only. All technical implementation—including database schema, API contract, authentication logic, and Prisma models—is derived directly from this specification. No additional input is required.*
