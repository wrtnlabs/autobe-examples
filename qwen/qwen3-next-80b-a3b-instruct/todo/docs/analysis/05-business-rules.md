# Todo List Application Requirements

## Service Overview

This is a multi-user Todo list application designed to provide individuals with a simple, private space to manage their personal tasks. The system ensures complete data isolation between users, where each person's todo items are accessible only to themselves. No shared lists, no team features, no collaboration — only personal task management with robust authentication to guarantee privacy.

The service is intentionally minimal, focusing solely on the core functionality of creating, viewing, updating, and deleting personal todo items. All non-essential features (sharing, tagging, reminders, categories) are intentionally excluded to maintain simplicity and reduce complexity.

Users register with an email and password, authenticate to establish a secure session, and interact exclusively with their own data. The system is built on the principle of "your data, your access" — no user can ever see or modify another user's todo items, even accidentally.

The service operates as a RESTful API with client applications (web or mobile) interacting through HTTP endpoints. All communication is encrypted via HTTPS, and authentication is handled securely using JSON Web Tokens (JWT) with refresh token rotation.

The backend is architected to handle concurrent access without data corruption, ensure data integrity through timestamping and versioning, and provide clear, actionable error messages to users when operations fail.

## User Actors

The system defines exactly two user actors:

### Guest
- **Description**: A user who has not yet registered or logged in to the system
- **Capabilities**:
  - View public landing page
  - Access registration page
  - Access login page
  - View basic service information
- **Restrictions**:
  - Cannot access any todo list functionality
  - Cannot view, create, update, or delete any todo items
  - Cannot access user account settings

### Member
- **Description**: A registered and authenticated user who owns their own todo list
- **Capabilities**:
  - Create new todo items
  - Retrieve own list of todo items
  - Update title or completion status of own todo items
  - Delete own todo items
  - View own account information
  - Logout of session
- **Restrictions**:
  - Cannot access any todo items belonging to other users
  - Cannot modify other users' accounts
  - Cannot perform administrative functions
  - Cannot access system-level configuration

## Core Functionality

The Todo List application supports the following essential user operations:

### Todo Item Creation

- WHEN a Member submits a todo item title via the API, THE system SHALL validate that the title is non-empty and between 1 and 500 characters in length.
- WHEN validation passes, THE system SHALL create a new todo item with:
  - `userId` set to the authenticated Member's user ID
  - `title` set to the submitted value (trimmed of whitespace)
  - `isCompleted` set to `false`
  - `createdAt` set to the current server timestamp in ISO 8601 format
  - `updatedAt` set to the current server timestamp in ISO 8601 format
  - `completedAt` set to `null`
  - `version` set to `1`
- IF the title is empty or contains only whitespace, THEN THE system SHALL reject the request with HTTP 400 Bad Request and error code "VALIDATION_TITLE_REQUIRED".
- IF the title exceeds 500 characters, THEN THE system SHALL reject the request with HTTP 400 Bad Request and error code "VALIDATION_TITLE_TOO_LONG".

### Todo Item Retrieval

- WHEN a Member requests their todo list, THE system SHALL:
  - Verify the User's authentication token is valid and not expired
  - Query the database for all todo items where `userId` matches the authenticated Member's ID
  - Exclude any todo items where `userId` does not match
- THE system SHALL return a JSON array of todo items with the following fields:
  - `id` (UUID)
  - `title` (string)
  - `isCompleted` (boolean)
  - `createdAt` (ISO 8601 timestamp)
  - `updatedAt` (ISO 8601 timestamp)
  - `completedAt` (ISO 8601 timestamp or null)
  - `version` (integer)
- IF no todo items exist for the user, THE system SHALL return an empty array — not an error.
- IF authentication token is missing, malformed, or expired, THE system SHALL return HTTP 401 Unauthorized with error code "AUTH_TOKEN_INVALID".

### Todo Item Status Modification

- WHEN a Member updates the completion status of a todo item, THE system SHALL:
  - Verify the todo item exists and belongs to the authenticated Member (ID matches `userId`)
  - Validate that the `isCompleted` field is strictly `true` or `false`
  - Update `isCompleted` to the provided value
  - Set `updatedAt` to current server timestamp
  - If marking as completed (`isCompleted = true`):
    - Set `completedAt` to current server timestamp
  - If marking as incomplete (`isCompleted = false`):
    - Set `completedAt` to `null`
  - Increment `version` by 1
- IF the item ID does not belong to the authenticated user, THE system SHALL return HTTP 403 Forbidden with error code "ACCESS_DENIED".
- IF `isCompleted` is not a boolean value, THE system SHALL return HTTP 400 Bad Request with error code "VALIDATION_COMPLETE_STATUS_INVALID".
- IF the todo item does not exist, THE system SHALL return HTTP 404 Not Found with error code "ITEM_NOT_FOUND".

### Todo Item Deletion

- WHEN a Member requests deletion of a todo item, THE system SHALL:
  - Verify the todo item exists and belongs to the authenticated Member
  - Permanently remove the item from the database
  - Return HTTP 204 No Content on successful deletion
- IF the todo item does not exist, THE system SHALL return HTTP 404 Not Found with error code "ITEM_NOT_FOUND".
- IF the item belongs to another user, THE system SHALL return HTTP 403 Forbidden with error code "ACCESS_DENIED".
- There is no trash, no soft delete, no undelete capability — deletion is final.

## User Workflows

### User Registration Flow

1. The Guest navigates to the registration page from the landing page
2. The Guest enters a valid email address and a password of at least 8 characters
3. The Guest clicks the "Register" button
4. THE system SHALL:
   - Check that email is unique (not already registered)
   - Validate password meets minimum length requirement (8+ characters)
   - Hash the password using bcrypt with cost factor 12
   - Create a new User record in the database
   - Generate a welcome email with authentication link
   - Return HTTP 201 Created with success message
5. The Guest receives email notification and is invited to log in

### User Login Flow

1. The Guest (or previously registered user) navigates to the login page
2. The Guest enters their registered email and password
3. The Guest clicks the "Login" button
4. THE system SHALL:
   - Locate the user by email
   - Verify the password matches the stored hash
   - If valid:
     - Generate a short-lived access token (JWT, expiry: 15 minutes)
     - Generate a long-lived refresh token (UUID, stored in database)
     - Set HTTP-only, Secure, SameSite=Strict cookies for both tokens
     - Return HTTP 200 OK with success status
   - If invalid:
     - Return HTTP 401 Unauthorized with error code "AUTH_INVALID_CREDENTIALS"
     - Log failed attempt
5. The Member is granted access to their dashboard and todo list

### Todo List Access Flow

1. The authenticated Member loads the main application screen
2. THE system SHALL:
   - Read the access token from HTTP-only cookie
   - Validate token signature and expiration
   - Extract user ID from token payload
   - Query database for all todo items matching that user ID
   - Return data in JSON array
3. The application renders the list of todo items in the user interface
4. If the user clicks "Refresh", the process repeats with fresh token validation
5. If authentication token has expired:
   - Client automatically requests new token using refresh token
   - Server validates refresh token, generates new access token, and returns it
   - Client updates cookie with new access token
   - User experiences seamless continuation

### Todo Item Creation Flow

1. The Member clicks the "Add New Task" button in UI
2. The Member fills in a task title (1–500 characters)
3. The Member clicks "Save"
4. THE system SHALL:
   - Receive JSON body with `{ "title": "..." }`
   - Validate title length and non-empty
   - Create item with associated userId from authenticated session
   - Respond with the new item
5. UI displays new item and clears input field

### Todo Item Completion Flow

1. The Member checks the checkbox next to a todo item
2. THE system SHALL:
   - Send PATCH request to `/todos/{id}` with `{ "isCompleted": true }`
   - Validate item ownership
   - Update `isCompleted` and `completedAt` fields
   - Increment version number
   - Return 200 OK with updated item
3. UI updates visual state (item marked as complete, strikethrough)

### Todo Item Deletion Flow

1. The Member clicks the "Delete" button next to a todo item
2. The system SHALL:
   - Send DELETE request to `/todos/{id}`
   - Validate item ownership
   - Permanently remove item from database
   - Return 204 No Content
3. UI removes item from visual list immediately

### User Logout Flow

1. The Member clicks the "Logout" button
2. THE system SHALL:
   - Receive POST request to `/auth/logout`
   - Invalidate the refresh token (delete from database)
   - Clear all authentication cookies (access and refresh)
   - Return 200 OK
3. Member is redirected to landing page
4. All todo list functionality becomes inaccessible until next login

## Business Rules

### Data Validation Rules

- WHEN a user attempts to create a new todo item, THE system SHALL validate that the title field is not empty and has a minimum length of 1 character.
- WHEN a user attempts to create a new todo item, THE system SHALL validate that the title field does not exceed 500 characters in length.
- WHEN a user attempts to update an existing todo item, THE system SHALL validate that the title field follows the same length requirements as creation.
- WHEN a user attempts to mark a todo item as complete, THE system SHALL validate that the isCompleted boolean value is strictly true or false, rejecting any other values.
- WHEN a user attempts to delete a todo item, THE system SHALL validate that the item ID is a valid UUID format.
- WHEN a user attempts to retrieve their todo list, THE system SHALL validate that the user has a valid, non-expired authentication token.
- WHEN a user attempts to perform any operation on a todo item, THE system SHALL validate that the item ID exists within the database and was created by the authenticated user.
- IF a todo item title contains only whitespace characters, THEN THE system SHALL reject the request with validation error.
- IF a todo item ID format is malformed or not a valid UUID, THEN THE system SHALL reject the request with validation error.
- WHERE a todo item has an empty title, THE system SHALL treat it as invalid and prevent persisting the item.

### Access Control Rules

- WHEN any user attempts to access a todo item, THE system SHALL verify that the item's userId matches the authenticated user's userId.
- WHILE a user is authenticated, THE system SHALL allow access only to todo items created by that specific user.
- IF a user attempts to access a todo item that belongs to another user, THEN THE system SHALL return HTTP 403 Forbidden with error code ACCESS_DENIED.
- IF a user attempts to update a todo item that belongs to another user, THEN THE system SHALL return HTTP 403 Forbidden with error code ACCESS_DENIED.
- IF a user attempts to delete a todo item that belongs to another user, THEN THE system SHALL return HTTP 403 Forbidden with error code ACCESS_DENIED.
- IF a user attempts to mark a todo item as complete that belongs to another user, THEN THE system SHALL return HTTP 403 Forbidden with error code ACCESS_DENIED.
- WHILE a user is not authenticated, THE system SHALL block all access to todo list functionality and redirect to authentication page.
- THE system SHALL never expose any todo item metadata (creation date, modification date, status) to users not owner of the item.
- WHERE a user logs in, THE system SHALL return only the todo items belonging to that user in response to list requests.
- WHERE a user performs any operation on a todo item, THE system SHALL ensure the operation is performed only on items where userId equals the authenticated user's userId.

### Concurrent Access Rules

- WHILE multiple users access the system simultaneously, THE system SHALL ensure operations on todo items are isolated per user.
- WHEN two users attempt to perform operations on the same todo item simultaneously, THE system SHALL ensure no interaction occurs because items belong exclusively to individual users.
- WHILE a user modifies a todo item, THE system SHALL use database-level locking to prevent race conditions for that item's update.
- WHEN a user updates a todo item, THE system SHALL use optimistic concurrency control by checking the item's version number against the stored version.
- IF two users attempt to update the same todo item with the same version number, THEN THE system SHALL reject the second update with error code CONCURRENT_UPDATE.
- WHERE updates to todo items occur, THE system SHALL increment the item's version number after each successful modification.
- IF a user refreshes their todo list, THE system SHALL always return the most recent version of each item as stored in the database.

### Data Integrity Rules

- WHEN a user creates a new todo item, THE system SHALL automatically assign the item's userId to match the authenticated user's userId.
- WHEN a user creates a new todo item, THE system SHALL set the createdAt timestamp to the current server time in ISO 8601 format.
- WHEN a user updates a todo item, THE system SHALL update the updatedAt timestamp to the current server time in ISO 8601 format.
- WHEN a user marks a todo item as complete, THE system SHALL set the completedAt timestamp to the current server time in ISO 8601 format.
- WHEN a user marks a todo item as incomplete, THE system SHALL clear the completedAt timestamp.
- IF a todo item is deleted, THE system SHALL permanently remove the item from the database with no possibility of recovery.
- IF a user account is deleted, THE system SHALL cascade delete all todo items associated with that user.
- WHERE a todo item exists, THE system SHALL guarantee that the userId field always references a valid existing user in the system.
- WHERE a todo item exists, THE system SHALL guarantee that the title field is never null or undefined.
- WHERE a todo item exists, THE system SHALL guarantee that the isCompleted field is always a boolean value.
- WHERE a todo item exists, THE system SHALL guarantee that the createdAt and updatedAt fields are valid ISO 8601 timestamps.

### Error Handling Rules

- IF validation of a todo item title fails, THEN THE system SHALL respond with HTTP 400 Bad Request and error code VALIDATION_TITLE_REQUIRED.
- IF validation of a todo item ID fails, THEN THE system SHALL respond with HTTP 400 Bad Request and error code VALIDATION_ID_INVALID.
- IF authentication token is missing or malformed, THEN THE system SHALL respond with HTTP 401 Unauthorized and error code AUTH_TOKEN_MISSING.
- IF authentication token has expired, THEN THE system SHALL respond with HTTP 401 Unauthorized and error code AUTH_TOKEN_EXPIRED.
- IF a user attempts to access a non-existent todo item, THEN THE system SHALL respond with HTTP 404 Not Found and error code ITEM_NOT_FOUND.
- IF a user attempts an unauthorized operation on another user's todo item, THEN THE system SHALL respond with HTTP 403 Forbidden and error code ACCESS_DENIED.
- IF a user attempts a concurrent update on a todo item, THEN THE system SHALL respond with HTTP 409 Conflict and error code CONCURRENT_UPDATE.
- IF the database fails to connect or responds with error, THEN THE system SHALL respond with HTTP 500 Internal Server Error and error code DATABASE_ERROR.
- IF the system encounters an unexpected internal error, THEN THE system SHALL respond with HTTP 500 Internal Server Error and error code SYSTEM_ERROR.
- IF a user's authentication session is terminated by the system, THEN THE system SHALL respond with HTTP 401 Unauthorized and error code SESSION_TERMINATED.
- IF a request exceeds the rate limit of 100 requests per minute from a single IP, THEN THE system SHALL respond with HTTP 429 Too Many Requests and error code RATE_LIMIT_EXCEEDED.

## Authentication and Authorization

The system implements a secure, stateless authentication mechanism based on JSON Web Tokens (JWT) and refresh token rotation.

### Authentication Workflow

- All authentication endpoints (`/auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh`) are public and do not require prior authentication
- Upon successful registration or login, the server issues two HTTP-only, Secure, SameSite=Strict cookies:
  1. `access_token` — Short-lived JWT (expires in 15 minutes)
  2. `refresh_token` — Long-lived randomized UUID (stored server-side with expiration)
- The `access_token` contains:
  - User ID
  - Role ("member")
  - Expiration timestamp
  - JWT signature verified by server
- The `refresh_token` is stored in a database table with:
  - Token UUID
  - Associated user ID
  - Issued timestamp (iat)
  - Expiration timestamp (exp)
  - Revoked status flag
- On each API request to protected endpoints (`/todos/*`), the server:
  1. Reads `access_token` from cookie
  2. Validates signature and expiration
  3. Extracts user ID from payload
  4. Verifies user exists and is active
  5. Performs request with authenticated context
- If `access_token` is expired, the client automatically sends a request to `/auth/refresh`:
  1. Client sends `refresh_token` cookie
  2. Server validates refresh token exists, is not revoked, and is not expired
  3. Server generates a new `access_token`
  4. Server sends new `access_token` in HTTP-only cookie
  5. The refresh token remains valid (unless intentionally revoked)
- On logout, server revokes the refresh token by setting its `revoked` flag to true

### Authorization Model

- All access to todo-related endpoints (`/todos`) is restricted to authenticated Members
- The system enforces "ownership" as the sole authorization rule:
  - Every todo item has a `userId` field
  - Every user operation on a todo item validates `userId === authenticatedUserId`
- There are no roles beyond "guest" and "member" — no administrators, no moderators
- There are no group permissions, no shared lists, no team features
- Every API request that accesses a todo item checks user ownership before any data manipulation
- The system never returns a todo item that belongs to a different user, even in error messages — all unauthorized attempts return `ACCESS_DENIED` without revealing existence

### Session Management

- The system does not maintain server-side sessions (stateless design)
- All authentication state is carried in the access token and refresh token
- The refresh token serves as the only persistent authentication state
- Token revocation is implemented by marking refresh tokens as revoked in database
- Each user may have only one active refresh token at a time — new login invalidates old
- Idle logout: If a refresh token is not used for 30 days, it auto-expires
- Token rotation: New access token issued per request if old is near expiration

### JWT Configuration

- Algorithm: HS256 (HMAC with SHA-256)
- Issuer: "todo-auth-service"
- Audience: "todo-application-client"
- Expiry: 15 minutes for access token, 7 days for refresh token
- Payload claims:
  - `sub`: user ID (string)
  - `role`: "member"
  - `iat`: issued at timestamp
  - `exp`: expiration timestamp
- Token signing key: 256-bit cryptographically random key stored in secure secrets manager

### Permission Matrix

| Endpoint | Method | Guest | Member |
| --- | --- | --- | --- |
| `/auth/register` | POST | Allowed | Not Allowed |
| `/auth/login` | POST | Allowed | Allowed |
| `/auth/logout` | POST | Not Allowed | Allowed |
| `/auth/refresh` | POST | Not Allowed | Allowed |
| `/todos` | GET | Not Allowed | Allowed |
| `/todos` | POST | Not Allowed | Allowed |
| `/todos/{id}` | GET | Not Allowed | Allowed |
| `/todos/{id}` | PATCH | Not Allowed | Allowed |
| `/todos/{id}` | DELETE | Not Allowed | Allowed |

## Performance and Security

### Performance Expectations

- Response time for all authenticated endpoints: under 200ms at 95th percentile
- Maximum concurrent users supported: 100,000 with horizontal scaling
- Database query for todo list retrieval: returns under 100ms for 100 items
- User registration and login: under 500ms even under peak load
- Refresh token validation: under 50ms per request
- API gateway timeout: 1 second configured with retry logic on client
- Database connection pool: 20 connections per backend instance
- Automatic scaling: increases backend instances when CPU usage exceeds 70% for 5 minutes

### Data Protection

- All user passwords are hashed using bcrypt with cost factor 12
- All communication is encrypted via TLS 1.3
- All stored tokens (refresh) are stored as hashed values in database
- No Personally Identifiable Information (PII) beyond email and hashed password is stored
- Email addresses are never shared, sold, or used for marketing
- Database backups are taken daily and encrypted at rest
- Backups are stored in secure, access-restricted cloud storage

### Privacy Requirements

- All user data is owned exclusively by the user
- No data is analyzed for behavioral profiling or advertising
- No third-party trackers or analytics scripts are included in client web app
- Data retention: User account and todo items retained indefinitely
- Data deletion: Upon user request, all data is permanently and irreversibly deleted within 24 hours
- No data is retained after account deletion

### Compliance Standards

- The system complies with:
  - GDPR (General Data Protection Regulation)
  - CCPA (California Consumer Privacy Act)
  - Privacy by Design principles
- User consent is implied through registration
- Users can request data export (via manual support ticket)
- Users can request immediate account deletion
- No cross-border data transfer occurs beyond standard cloud provider regions

### Data Retention Policy

- User account data: retained indefinitely unless deleted by user
- Todo items: retained permanently unless deleted by user
- Authentication tokens: refresh tokens retained until revoked or expired (max 7 days)
- Access logs: retained for 30 days for debugging and security monitoring
- Error logs: retained for 30 days and then purged
- Analytics logs: no analytics data collected
- Backup files: retained for 14 days then discarded

## System Context

### System Boundaries

- This system is a standalone backend service with no integrated frontend
- The frontend (web or mobile app) is expected to be developed separately and will consume this API
- The service does not include any user interface components
- The service does not handle email delivery — it sends emails via external SMTP provider
- The service does not perform SMS or push notifications
- The service does not interface with any external payment systems
- The service does not integrate with social logins (Google, Apple, etc.)

### Architecture Assumptions

- Backend is implemented using NestJS with TypeScript
- Database is Prisma with PostgreSQL
- Authentication is jwt-simple and bcrypt
- Deployment is via Docker containers on Kubernetes
- Logging is handled via Winston
- Monitoring uses Prometheus and Grafana
- Environment variables manage secrets and configuration
- HTTPS is terminated by reverse proxy (Nginx)
- API rate limiting implemented at edge
- Database connections are pooled and managed by Prisma

### Technology Choices

- Backend Framework: NestJS (TypeScript)
- ORM: Prisma
- Database: PostgreSQL
- Authentication: JWT with refresh token rotation
- Hashing: bcrypt with cost 12
- Containerization: Docker
- Orchestration: Kubernetes
- API Documentation: Swagger (OpenAPI 3.0)
- CI/CD: GitHub Actions
- Environment: Node.js 18+

### Deployment Scenarios

#### Development
- Local Docker Compose setup
- PostgreSQL database in container
- Environment variables loaded from `.env`
- HTTPS disabled for local testing
- Log output directly to terminal

#### Staging
- Container deployed in cloud container service
- Same configuration as production but with test data
- Separate database instance
- SSL cert from Let's Encrypt
- Email delivery disabled (emails logged to file)
- Rate limits increased for testing

#### Production
- Multiple replicas of backend containers
- Load-balanced via Kubernetes Ingress
- HTTPS with enterprise SSL certificate
- Separate dedicated PostgreSQL instance with automated backups
- External SMTP provider for email
- Redis for rate limiting and session state
- Monitoring with alerting on 5xx errors
- Daily automated security scans
- Incident response protocol activated for authentication failures

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*