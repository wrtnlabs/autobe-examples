# TodoApp: Requirements Specification Document

## Service Vision

THE todoApp SHALL provide a simple, private, and reliable personal task management service that enables individuals to organize their daily responsibilities without complexity or distraction.

WHEN users struggle to remember personal tasks, THE todoApp SHALL provide an intuitive system to capture, track, and complete their individual to-do items with minimal friction.

THE todoApp SHALL enable users to focus on their personal productivity by eliminating the noise of collaborative features and unnecessary complexity found in competing applications.

WHILE users are managing their personal tasks, THE todoApp SHALL maintain absolute data isolation between users to ensure complete privacy and confidentiality.

## Target Market

THE todoApp SHALL target individuals who:

- Need a simple system to track daily tasks without distraction
- Value absolute privacy of personal information
- Reject complex systems with collaborative features they don't need
- Require a reliable system that works consistently across devices
- Prefer a minimalist interface focused on core functionality
- Are not part of teams or organizations that require shared task lists

THE todoApp SHALL NOT target:

- Teams or workgroups requiring shared task management
- Enterprises needing user permissions, reporting, or integrations
- Users requiring calendar sync, reminders, or notifications
- Business users needing workflow automation or team reporting

THE user base SHALL consist entirely of individual consumers who self-identify as needing personal task organization.

WHEN a user registers, THE system SHALL create a completely isolated data container that only that user can access.

## Operational Scope

THE todoApp SHALL offer exactly these core capabilities:

- Registration of new users via email and password
- Authentication of registered users via email and password
- Secure logout of authenticated users
- Display of personal todo list with complete privacy
- Creation of new todo items
- Marking of todo items as completed
- Updating of todo item text
- Deletion of todo items
- Session persistence during active usage
- Secure storage of user data with complete isolation from other users

THE todoApp SHALL NOT offer:

- Shared or team todo lists
- Task comments or collaboration features
- Task categories, labels, or project organization
- Due dates, reminders, or notifications
- Calendar integration
- Import/export functionality
- Multi-device synchronization beyond active session
- API access for third-party applications
- Webhooks or external integrations
- File attachments or rich text formatting
- User profiles beyond email and password
- Social features or user connections
- Admin interfaces or user management

WHEN a user attempts to access another user's todos, THE system SHALL deny access with HTTP 403 Forbidden.

WHEN a user performs any task management action, THE system SHALL only affect that user's own data.

## Success Metrics

THE todoApp SHALL be considered successful when it achieves the following metrics:

- 95% of registered users create at least one todo item within 24 hours of registration
- 80% of active users return to the application at least once per week
- Less than 0.5% of user sessions experience authentication errors
- 100% of todo items are stored with complete data isolation between users
- 100% of user sessions are protected with secure authentication
- Less than 1% of users report usability issues with the core functionality
- 100% of user data is encrypted at rest and in transit
- The service maintains 99.9% uptime for authenticated user operations
- Less than 0.1% of requests result in server-side errors

WHEN the service reaches 10,000 active monthly users, THE system SHALL be considered to have achieved market validation for its minimalist approach to personal task management.

WHEN users indicate they prefer todoApp over other personal task applications, THE system SHALL have proven its value proposition of simplicity and privacy.

WHILE the system is operational, THE todoApp SHALL maintain its focus on individual users and reject feature creep that would compromise its core principle of minimalism and privacy.

## User Authentication and Authorization

### Core Authentication Workflow

WHEN a user attempts to register, THE system SHALL require a valid email address and a password of at least 12 characters that includes at least one uppercase letter, one lowercase letter, one digit, and one special character.

WHEN the registration request is submitted, THE system SHALL validate the format of the email address and password strength before proceeding.

WHEN the email address is already registered, THE system SHALL respond with an error indicating the email is already in use and SHALL NOT create a duplicate account.

WHEN the email format is invalid or the password meets minimum strength requirements, THE system SHALL return a specific error message describing the validation failure.

WHEN validation passes, THE system SHALL create a new user record with an encrypted password and a unique user identifier.

WHEN registration is successful, THE system SHALL respond with HTTP 201 Created and SHALL automatically authenticate the user by establishing a secure session.

WHEN a user attempts to log in, THE system SHALL require a valid email address and the corresponding password.

WHEN the provided email does not exist, THE system SHALL respond with an error indicating invalid credentials without disclosing whether the email exists.

WHEN the password does not match the stored hash, THE system SHALL respond with an error indicating invalid credentials.

WHEN both email and password are correct, THE system SHALL validate that the user account is active and not suspended.

WHEN login is successful, THE system SHALL issue a cryptographically signed JWT access token with a 24-hour expiration and SHALL set an HTTP-only, Secure, SameSite=Strict cookie containing a refresh token.

WHEN a user logs out, THE system SHALL invalidate the refresh token and clear the HTTP-only cookie.

WHEN a user access token expires, THE system SHALL accept the refresh token to issue a new access token if it has not expired and is still valid.

WHEN the refresh token is invalid, expired, or has been revoked, THE system SHALL respond with HTTP 401 Unauthorized and SHALL require the user to log in again.

WHEN a user attempts to access any todo resource without a valid access token, THE system SHALL respond with HTTP 401 Unauthorized.

### Authorization and Data Isolation

WHEN a user requests any todo list data, THE system SHALL extract the user identifier from the authenticated session.

WHEN a user requests to create a new todo item, THE system SHALL associate the item with the authenticated user's ID.

WHEN a user requests to update, complete, or delete a todo item, THE system SHALL verify that the item's owner ID matches the authenticated user's ID.

WHEN a user attempts to access a todo item owned by another user, THE system SHALL return HTTP 403 Forbidden regardless of the validity of the access token.

WHEN a user attempts to view another user's profile, THE system SHALL return HTTP 403 Forbidden.

WHEN a user attempts to delete their account, THE system SHALL verify their password and SHALL permanently delete all user data including todo items, authentication tokens, and associated records.

WHEN data deletion is requested, THE system SHALL irreversibly remove all personal information and SHALL NOT retain backups for longer than 48 hours for system recovery purposes.

### Access Control Matrix

| Action | Guest | Authenticated User | Admin |
|---|---|---|---|
| Register new account | SHALL be permitted | SHALL be forbidden | SHALL be forbidden |
| Login | SHALL be permitted | SHALL be permitted | SHALL be permitted |
| Logout | SHALL be blocked | SHALL be permitted | SHALL be permitted |
| View own todo list | SHALL be blocked | SHALL be permitted | SHALL be permitted |
| Create todo item | SHALL be blocked | SHALL be permitted | SHALL be permitted |
| Update own todo item | SHALL be blocked | SHALL be permitted | SHALL be permitted |
| Delete own todo item | SHALL be blocked | SHALL be permitted | SHALL be permitted |
| View other user's todo list | SHALL be blocked | SHALL be forbidden | SHALL be forbidden |
| Delete other user's account | SHALL be blocked | SHALL be forbidden | SHALL be permitted |
| Access admin interface | SHALL be blocked | SHALL be forbidden | SHALL be permitted |

## Core Todo Functionality

### Todo Item Data Model

WHEN a todo item is created, THE system SHALL store the following fields:

- A unique identifier (UUID)
- The item's text content (max 500 characters)
- A completion status (boolean)
- A creation timestamp (ISO 8601)
- An update timestamp (ISO 8601)
- The owner's user ID (foreign reference)

WHEN a todo item is retrieved, THE system SHALL return only these fields and SHALL NOT return any internal metadata or system identifiers.

WHEN a todo item's text is updated, THE system SHALL record the new text and update the update timestamp.

WHEN a todo item is marked complete or incomplete, THE system SHALL update the completion status and update timestamp.

WHEN a todo item is deleted, THE system SHALL permanently remove the record from storage.

### User Interactions and Workflows

#### Primary User Journey: Registration to Todo Creation

WHEN a user visits the application's landing page for the first time, THE system SHALL display the registration form.

WHEN a user enters a valid email and strong password and submits the form, THE system SHALL process the registration.

WHEN registration succeeds, THE system SHALL display the user's empty todo list with a prompt to add the first task.

WHEN the user enters text into the todo input field and submits it, THE system SHALL validate the input (non-empty, ≤500 characters) and create the todo item.

WHEN the todo item is created successfully, THE system SHALL display the new item in the list with an "incomplete" status.

#### Secondary User Journey: Task Update and Completion

WHEN a user views their todo list, THE system SHALL display each item with its text and completion status.

WHEN a user clicks the checkbox next to an incomplete item, THE system SHALL toggle the item to "completed" status.

WHEN a user clicks the checkbox next to a completed item, THE system SHALL toggle the item back to "incomplete" status.

WHEN a user edits the text of an item by clicking on it, THE system SHALL open an inline editor.

WHEN the user saves the updated text, THE system SHALL validate it and update the item.

WHEN the updated text is empty or exceeds 500 characters, THE system SHALL restore the original text and display an error message.

WHEN a user deletes a todo item by clicking the delete button, THE system SHALL show a confirmation dialog.

WHEN the user confirms deletion, THE system SHALL permanently remove the item.

WHEN a user cancels the deletion, THE system SHALL close the dialog without modifying the item.

### Validation Rules

WHEN a user attempts to create or update a todo item, THE system SHALL validate that the text is between 1 and 500 characters.

WHEN a user attempts to create a todo item with empty text, THE system SHALL reject the request with an error message.

WHEN a user attempts to create a todo item with text longer than 500 characters, THE system SHALL truncate the input to 500 characters and show a warning message.

WHEN a user attempts to create a todo item with only whitespace, THE system SHALL reject the request.

WHEN a user attempts to update a todo item that does not exist, THE system SHALL return HTTP 404 Not Found.

WHEN a user attempts to delete a todo item that does not exist, THE system SHALL return HTTP 404 Not Found.

## User Scenarios and Workflows

### Scenario 1: New User Registration

WHEN a first-time user visits the todoApp website,
- THE user SHALL be presented with a clean registration form
- THE user SHALL be unable to access any task management features
- THE user SHALL see clear instructions for creating an account

WHEN the user enters:
- An email address: admin@example.com
- A password: MySecurePassword123!
- The registration button is clicked

THE system SHALL:
- Validate email format is correct
- Validate password strength meets requirements
- Check that no existing account uses this email
- Generate a unique user ID
- Hash and securely store the password
- Create a user record with active status
- Issue a secure session token
- Redirect to the user's new empty todo list
- Display a welcome message: "Welcome! Your first todo is waiting."

WHEN the user enters an invalid email (e.g., "not-an-email"),
- THE system SHALL immediately highlight the email field in error state
- THE system SHALL display: "Please enter a valid email address"
- THE system SHALL prevent form submission until corrected

WHEN the user enters an email already registered (e.g., admin@example.com),
- THE system SHALL display: "This email is already in use. Please log in or use a different email."
- THE system SHALL NOT reveal whether the email exists for security reasons


### Scenario 2: Secure Authentication

WHEN a registered user visits the todoApp website and clicks login,
- THE user SHALL be presented with a login form
- THE user SHALL enter their email and password
- THE user SHALL click "Login"

WHEN credentials are valid:
- THE system SHALL validate password hash
- THE system SHALL check account status
- THE system SHALL issue a time-bound JWT access token
- THE system SHALL set an HTTP-only, Secure, SameSite=Strict refresh token cookie
- THE system SHALL redirect to the user's todo list
- THE system SHALL display the user's name (email) in the header

WHEN credentials are invalid:
- THE system SHALL display: "Invalid email or password"
- THE system SHALL NOT specify whether email or password was incorrect
- THE system SHALL log the attempt for security monitoring
- THE system SHALL prevent rapid retry attempts with exponential backoff

WHEN a user attempts to log in from a new device:
- THE system SHALL issue new tokens as usual
- THE system SHALL NOT require additional verification
- THE system SHALL maintain session persistence for 24 hours

WHEN a user leaves their browser open for 25 hours:
- THE system SHALL detect expired access token
- THE system SHALL attempt to refresh token with refresh cookie
- WHEN refresh fails (expired or invalid), THE system SHALL redirect to login
- THE user SHALL be required to re-enter credentials

### Scenario 3: Private Todo Item Management

WHEN a user is logged in and views their todo list:
- THE user SHALL see only items they created
- THE user SHALL NOT see any items created by other users
- THE user SHALL see an empty list if no items exist

WHEN a user adds a new todo item:
- THE text "Buy groceries" shall be submitted
- THE system SHALL assign it to the authenticated user's ID
- THE system SHALL store the item with a unique UUID
- THE system SHALL return the item immediately to the client
- THE system SHALL display the item on the list with an unchecked checkbox

WHEN another user attempts to access this item by direct URL:
- THE requester SHALL authenticate with their own credentials
- THE system SHALL verify the item's owner ID does not match the requester's ID
- THE system SHALL return HTTP 403 Forbidden
- THE requester SHALL NOT receive the existence or metadata of any item

WHEN the same item is modified by its owner:
- THE owner SHALL click "Edit" and change the text to "Buy organic groceries"
- THE system SHALL update the item
- THE system SHALL update the modified timestamp
- THE system SHALL return the updated item to the owner
- THE item SHALL be reflected instantly in the UI
- THE item SHALL remain unmodified for all other users

WHEN a user deletes an item:
- THE owner SHALL click "Delete" and confirm
- THE system SHALL permanently remove the item from primary and backup storage
- THE API SHALL respond with HTTP 204 No Content
- THE item SHALL be removed from the UI without delay

### Scenario 4: Session Persistence and Re-authentication

WHEN a user closes their browser and reopens it after 2 hours:
- THE system SHALL detect no active session
- THE system SHALL check for the presence of a refresh token cookie
- THE refresh token SHALL be valid and unrevoked
- THE system SHALL use the refresh token to obtain a new access token
- THE system SHALL restore the user's todo list automatically
- THE user SHALL remain logged in without re-entering credentials

WHEN the refresh token cookie is missing:
- THE system SHALL redirect the user to the login page
- THE user SHALL be required to re-authenticate

WHEN a user clicks "Sign Out":
- THE system SHALL clear the refresh token cookie
- THE system SHALL invalidate the refresh token on the server
- THE system SHALL clear the access token from client memory
- THE system SHALL redirect to the landing page with a logout message

WHEN a user logs in from a different device:
- THE system SHALL issue a fresh set of tokens
- THE system SHALL NOT invalidate sessions on other devices
- BOTH sessions SHALL remain active independently
- THE user SHALL be able to manage todos from either device

### Scenario 5: Account Deletion

WHEN a user clicks "Delete Account":
- THE system SHALL display a warning message: "This action cannot be undone. All your todo items, account data, and preferences will be permanently erased."
- THE system SHALL require the user to re-enter their password
- THE system SHALL verify the password against the stored hash

WHEN the password is correct:
- THE system SHALL permanently delete the user's user record
- THE system SHALL delete all associated todo items
- THE system SHALL revoke all active sessions
- THE system SHALL delete the refresh token from storage
- THE system SHALL remove any stored access tokens linked to this user

WHEN deletion is complete:
- THE system SHALL redirect to the registration page
- THE system SHALL display: "Your account has been permanently deleted. Thank you for using todoApp."

WHEN the password is incorrect:
- THE system SHALL display: "Incorrect password. Account deletion failed."
- THE system SHALL remain on the confirmation screen
- THE user SHALL be able to retry or cancel

## Exception Handling

### Authentication Errors

WHEN a login request contains an invalid email format:
- THE system SHALL return HTTP 400 Bad Request
- THE response SHALL contain: "Invalid email format"

WHEN a login request is made with no email provided:
- THE system SHALL return HTTP 400 Bad Request
- THE response SHALL contain: "Email is required"

WHEN a login request is made with no password provided:
- THE system SHALL return HTTP 400 Bad Request
- THE response SHALL contain: "Password is required"

WHEN a registration request contains an email that already exists:
- THE system SHALL return HTTP 409 Conflict
- THE response SHALL contain: "Email already registered"

WHEN a registration request contains an email with invalid format:
- THE system SHALL return HTTP 400 Bad Request
- THE response SHALL contain: "Invalid email format"

WHEN a registration request contains a password shorter than 12 characters:
- THE system SHALL return HTTP 400 Bad Request
- THE response SHALL contain: "Password must be at least 12 characters"

WHEN a registration request contains a password without uppercase letter:
- THE system SHALL return HTTP 400 Bad Request
- THE response SHALL contain: "Password must contain at least one uppercase letter"

WHEN a registration request contains a password without lowercase letter:
- THE system SHALL return HTTP 400 Bad Request
- THE response SHALL contain: "Password must contain at least one lowercase letter"

WHEN a registration request contains a password without digit:
- THE system SHALL return HTTP 400 Bad Request
- THE response SHALL contain: "Password must contain at least one digit"

WHEN a registration request contains a password without special character:
- THE system SHALL return HTTP 400 Bad Request
- THE response SHALL contain: "Password must contain at least one special character"

### Authorization Errors

WHEN a user attempts to access /todos endpoint without authentication:
- THE system SHALL return HTTP 401 Unauthorized
- THE response SHALL contain: "Authentication required"

WHEN a user attempts to access another user's todo item:
- THE system SHALL return HTTP 403 Forbidden
- THE response SHALL contain: "Access denied"

WHEN a user attempts to delete another user's account:
- THE system SHALL return HTTP 403 Forbidden
- THE response SHALL contain: "Access denied"

WHEN an authenticated user attempts to access admin routes:
- THE system SHALL return HTTP 403 Forbidden
- THE response SHALL contain: "Access denied"

WHEN a user attempts to refresh token with an expired refresh token:
- THE system SHALL return HTTP 401 Unauthorized
- THE response SHALL contain: "Invalid or expired refresh token"

### Input Validation Failures

WHEN a user attempts to create a todo item with empty text:
- THE system SHALL return HTTP 400 Bad Request
- THE response SHALL contain: "Todo text cannot be empty"

WHEN a user attempts to create a todo item with more than 500 characters:
- THE system SHALL return HTTP 400 Bad Request
- THE response SHALL contain: "Todo text cannot exceed 500 characters"

WHEN a user attempts to create a todo item with only whitespace:
- THE system SHALL return HTTP 400 Bad Request
- THE response SHALL contain: "Todo text cannot be only whitespace"

WHEN a user attempts to update a non-existent todo item:
- THE system SHALL return HTTP 404 Not Found
- THE response SHALL contain: "Todo item not found"

WHEN a user attempts to delete a non-existent todo item:
- THE system SHALL return HTTP 404 Not Found
- THE response SHALL contain: "Todo item not found"

### System Failures

WHEN the database connection fails during user registration:
- THE system SHALL return HTTP 500 Internal Server Error
- THE response SHALL contain: "Service temporarily unavailable. Please try again."

WHEN the JWT signing key is not available during authentication:
- THE system SHALL return HTTP 500 Internal Server Error
- THE response SHALL contain: "Service temporarily unavailable. Please try again."

WHEN the token verification fails due to system-level corruption:
- THE system SHALL return HTTP 500 Internal Server Error
- THE response SHALL contain: "Service temporarily unavailable. Please try again."

WHEN the server experiences an unhandled exception:
- THE system SHALL log the error internally
- THE system SHALL return HTTP 500 Internal Server Error
- THE response SHALL contain: "Service temporarily unavailable. Please try again."

WHEN multiple requests are made simultaneously to delete the same token:
- THE system SHALL handle concurrency safely using optimistic locking
- THE system SHALL return HTTP 409 Conflict on stale operations
- THE response SHALL contain: "Transaction failed due to concurrent modification. Please refresh and try again."

## Performance Expectations

WHEN a user performs authentication (login or registration):
- THE system SHALL complete the operation within 500 milliseconds under normal load
- THE system SHALL guarantee response times under 1 second even under peak traffic

WHEN a user requests their todo list (up to 100 items):
- THE system SHALL return results within 300 milliseconds
- THE system SHALL support retrieval of up to 500 items within 800 milliseconds

WHEN a user creates, updates, or deletes a todo item:
- THE system SHALL complete the operation within 200 milliseconds
- THE system SHALL maintain consistent response times even when serving 10,000 concurrent users

WHEN a user accesses the application from mobile networks:
- THE system SHALL optimize payload size to under 2 KB for JSON responses
- THE system SHALL use compression (gzip) for all API responses

WHEN the system receives concurrent requests (10,000+):
- THE system SHALL maintain availability for authentication operations
- THE system SHALL queue and process task operations with minimal delay
- THE system SHALL not degrade response times by more than 200% under maximum load

## Security and Compliance

### Data Privacy

WHEN user data is transmitted over the network:
- THE system SHALL use TLS 1.3 encryption for ALL communication
- THE system SHALL enforce HSTS (HTTP Strict Transport Security) with a max-age of 1 year

WHEN user data is stored:
- THE system SHALL encrypt passwords with bcrypt at cost 12
- THE system SHALL never store passwords in plaintext
- THE system SHALL never log passwords or authentication secrets

WHEN user data is stored in the database:
- THE system SHALL store user identifiers as UUIDs
- THE system SHALL reference user data via UUID, never email address
- THE system SHALL anonymize logs to remove any personal identifiers

WHEN a user requests deletion of their account:
- THE system SHALL immediately delete all personal data from primary storage
- THE system SHALL schedule deletion of backups for 48 hours later
- THE system SHALL provide audit logs for deletion operations

### Authentication Security

WHEN user credentials are transmitted:
- THE system SHALL never allow HTTP (insecure) connections
- THE system SHALL use HTTPS for all endpoints

WHEN authentication tokens are issued:
- THE system SHALL use JWT with RS256 signature algorithm
- THE system SHALL encode user ID, not email, in token payload
- THE system SHALL set access token expiration to 24 hours
- THE system SHALL set refresh token expiration to 30 days
- THE system SHALL set refresh token cookie to HTTP-only, Secure, SameSite=Strict

WHEN refresh tokens are stored:
- THE system SHALL store them in encrypted form
- THE system SHALL bind tokens to user agent and IP (optional)
- THE system SHALL invalidate all tokens on password change

WHEN a user's password is changed:
- THE system SHALL immediately invalidate all existing refresh and access tokens
- THE system SHALL require the user to authenticate again

### Access Control Enforcement

WHEN a user requests any resource:
- THE system SHALL validate authentication before authorization
- THE system SHALL check user permissions based on authenticated ID
- THE system SHALL enforce data ownership with absolute isolation

WHEN a query requests data:
- THE system SHALL filter results to include only items associated with the authenticated user
- THE system SHALL use parameterized queries to prevent SQL injection
- THE system SHALL validate all IDs against the authenticated user context

WHEN an API call is received:
- THE system SHALL reject any request that does not contain the proper authentication context
- THE system SHALL never return data about items not owned by the authenticated user
- THE system SHALL not reveal whether a resource exists if the user is not permitted to access it

### Regulatory Compliance

WHEN user data is processed:
- THE system SHALL comply with GDPR Article 5 and Article 17 for personal data processing and right to erasure
- THE system SHALL not collect any data beyond what is necessary for service operation
- THE system SHALL not share data with third parties
- THE system SHALL not use data for profiling or behavioral advertising
- THE system SHALL provide clear privacy policy explaining data handling

WHEN data retention is required:
- THE system SHALL retain user data only while the account is active
- THE system SHALL purge all data immediately upon user deletion
- THE system SHALL retain system logs for 30 days for debugging and abuse detection only
- THE system SHALL encrypt all backups and retain them for 48 hours maximum

## Business Rules

### Todo Item Validation

WHEN a todo item is created or updated, THE system SHALL enforce the following business rules:

- Task text SHALL be between 1 and 500 characters
- Empty tasks SHALL NOT be permitted
- Non-alphanumeric tasks consisting only of whitespace SHALL NOT be permitted
- Leading or trailing whitespace SHALL be trimmed before storage
- Each task SHALL be uniquely identified by a UUID
- Each task SHALL be owned exclusively by one authenticated user
- Completed status SHALL be an immutable boolean flag
- Creation timestamp SHALL be set at creation and immutable
- Update timestamp SHALL be updated on any modification

### User Data Ownership

WHEN any data operation is performed on a todo item:

- THE system SHALL verify that the authenticated user's ID matches the item's owner ID
- THE system SHALL NOT allow any operation on items without this ownership verification
- THE system SHALL treat the relationship between user and todo as a hard ownership contract
- THE system SHALL permit no delegation, sharing, or inheritance of todo items
- THE system SHALL ensure absolute data isolation between users

### Concurrency Rules

WHEN multiple users simultaneously update the same todo item (through race condition):
- THE system SHALL not allow concurrent updates on the same item
- THE system SHALL use optimistic locking with version counter
- WHEN a conflict occurs, THE system SHALL return HTTP 409 Conflict
- WHEN a conflict occurs, THE response SHALL contain: "Todo item has been modified by another user. Please refresh and try again."
- WHEN a conflict occurs, THE system SHALL NOT overwrite changes

### State Transitions

THE todo item SHALL only transition between these states:

- New (created, not yet displayed)
- Active (created and visible)
- Completed (task marked completed)
- Deleted (permanently removed)

WHEN a task is created:
- The task SHALL start in "Active" state
- The system SHALL immediately return the complete item to client

WHEN a task is set to completed:
- The status SHALL change from "Active" to "Completed"
- The update timestamp SHALL be updated
- The system SHALL return the updated item to client

WHEN a task is set to active:
- The status SHALL change from "Completed" to "Active"
- The update timestamp SHALL be updated
- The system SHALL return the updated item to client

WHEN a task is deleted:
- The state SHALL transition immediately to "Deleted"
- The record SHALL be removed from all accessible storage
- THE system SHALL return HTTP 204 No Content

WHEN an attempt is made to change state outside permitted transitions:
- THE system SHALL ignore the request
- THE system SHALL return HTTP 400 Bad Request
- THE response SHALL contain: "Invalid state transition"

## Data Flow and Lifecycle

### Data Entry Points

WHEN users interact with the todoApp:

- The primary data entry point is via the web application frontend
- Data flows through API endpoints protected by authentication
- All data is submitted via HTTP POST, PUT, PATCH, DELETE requests
- User authentication data (email/password) is entered via registration and login forms
- Todo item data (text) is entered via the todo input field

### Data Processing Flow

WHEN a user registers:

1. User submits email and password
2. System validates format and strength
3. System checks for existing account
4. System generates user ID (UUID)
5. System encrypts password with bcrypt
6. System creates user record in database
7. System issues authentication tokens
8. System redirects to user's todo list

WHEN a user logs in:

1. User submits email and password
2. System retrieves user record by email
3. System verifies password hash
4. System validates account status
5. System issues JWT access token
6. System sets HTTP-only refresh token cookie
7. System redirects to todo list dashboard

WHEN a user creates a todo item:

1. User enters text and submits
2. System validates item length
3. System generates UUID
4. System sets creation timestamp
5. System assigns authenticated user ID
6. System stores record in database
7. System returns created item to client

WHEN a user updates a todo item:

1. User modifies item text
2. System validates new text length
3. System retrieves item by ID and owner ID
4. System updates text and update timestamp
5. System stores changes in database
6. System returns updated item to client

WHEN a user deletes a todo item:

1. User confirms deletion
2. System retrieves item by ID and owner ID
3. System validates ownership
4. System removes record from database
5. System returns HTTP 204 No Content

WHEN a user logs out:

1. User clicks logout button
2. System invalidates refresh token in database
3. System clears HTTP-only refresh token cookie
4. System clears access token from frontend memory
5. System redirects to landing page

### Data Storage

WHEN data is stored:

- All user data SHALL be stored in a PostgreSQL database
- User authentication data SHALL be encrypted at rest using AES-256 encryption
- All user data SHALL be separated by user ID
- No user data SHALL be shared between rows
- All tables SHALL have row-level security enabled

WHEN user data is persisted:

- User records SHALL be stored in a `users` table
- Todo items SHALL be stored in a `todos` table
- Each todo item SHALL be linked to a user via `user_id`
- The `user_id` SHALL be a UUID reference, never the email
- All timestamps SHALL use UTC timezone
- All data SHALL be stored in normalized form
- No denormalized copies of user data SHALL be created
- Database backups SHALL be encrypted and stored separately

### Data Lifecycle

WHEN data is created:

- User account: Created on registration, persists until deletion
- Todo item: Created on user submission, persists until deletion

WHEN data is modified:

- User data: Only modified by user actions (password reset, deletion)
- Todo item data: Modified by user actions (text update, completion toggle)

WHEN data is accessed:

- User data: Accessed only during authentication and profile management
- Todo item data: Accessed only when retrieved by owner

WHEN data is deleted:

- User account: Deleted forever on user request or after 30 days of inactivity
- Todo item: Deleted forever on user request
- Backups: Retained for 48 hours after deletion for recovery
- Logs: Retained for 30 days for security and debugging

WHEN data becomes obsolete:

- Inactive accounts: After 30 days of no login, SHALL be automatically deleted
- Stale sessions: Tokens expiring without refresh SHALL be purged
- Old backups: Shall be deleted after 48 hours
- Debug logs: Shall be rotated and deleted after 30 days

## Future Considerations

WHEN considering future enhancements, THE system SHALL maintain core principles of:

- Minimalism
- Privacy
- Absolute data isolation
- Simplicity of use

### Potential Feature Extensions

WHEN considering feature additions:

- The system SHALL NOT allow collaborative features
- The system SHALL NOT allow categories, labels, or tags
- The system SHALL NOT allow due dates, reminders, or notifications
- The system SHALL NOT allow calendar import/export
- The system SHALL NOT allow file attachments
- The system SHALL NOT allow API access

WHEN considering mobile applications:

- The same core functionality SHALL be preserved
- The UI SHALL be adapted for touch interfaces
- The authentication flow SHALL remain unchanged
- The privacy model SHALL remain absolute

### Scalability Considerations

WHEN user count exceeds 100,000:

- The system SHALL shard user data by user ID range
- The system SHALL use caching for frequently accessed todo lists
- The system SHALL implement rate limiting for authentication endpoints
- The system SHALL maintain database indexes on user ID
- The system SHALL ensure authentication tokens can be generated at scale

WHEN the service requires global availability:

- User data SHALL remain in geo-specific regions
- Authentication tokens SHALL be signed with global key
- Session replication SHALL be avoided
- Data isolation SHALL be preserved across regions

### Integration Opportunities

THE system SHALL remain completely isolationist and SHALL NOT integrate with:

- Calendar services
- Communication platforms
- Cloud storage services
- Social networks
- Productivity tools
- Third-party authentication providers

WHEN an external service requests access:

- THE system SHALL deny all API access
- THE system SHALL not provide OAuth endpoints
- THE system SHALL not generate client credentials
- THE system SHALL not support webhooks

THE todoApp SHALL be a self-contained, closed system that relies solely on user trust and word-of-mouth growth. Any integration or external dependency violates its core mission.

