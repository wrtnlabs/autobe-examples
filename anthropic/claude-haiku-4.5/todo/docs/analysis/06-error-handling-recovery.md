# Todo List Application - Complete Requirements Documentation

## Documentation Suite Overview

This complete requirements documentation package provides comprehensive specifications for building a minimal Todo list application. The documentation is organized into 11 interrelated documents that cover all aspects of system design, user interaction, business logic, and operational requirements.

**Service Prefix**: `todo-api`

**User Actors**:
- **Guest**: Unauthenticated users who can register and login
- **User**: Authenticated users who manage their personal todo lists

---

## Document Index

### Document 1: Table of Contents and Navigation (00-toc.md)

**Purpose**: Comprehensive navigation guide for all project documentation

**Key Sections**:
- Quick navigation guides organized by user role
- Complete documentation index with purpose and content description for each document
- Reading order recommendations for different roles (Backend Developers, Project Managers, QA Teams)
- Document relationship diagram showing cross-references
- Quick reference table of document purposes
- Instructions for using the documentation effectively

**What You'll Find**:
- Executive overview of the documentation structure
- Clear guidance on which documents to read based on role
- Cross-document references for related information
- Quick reference for finding specific topics

---

### Document 2: Service Overview (01-service-overview.md)

**Purpose**: Establish foundational context for the Todo list application

**Key Sections**:

**Executive Summary**
- Web-based task management system for personal productivity
- Minimal feature set: create, view, complete, edit, delete todos
- Freemium business model with optional future premium features
- Focus on simplicity and reliability over feature complexity

**What is the Todo List Application**
- Digital replacement for paper-based to-do lists
- Core functions: Create, view, organize, complete, delete tasks
- Minimum viable feature set only (no team collaboration, no recurring tasks)
- Essential functionality with high reliability

**Business Model and Value Proposition**
- Addresses gap between paper notes and complex project management tools
- Five key values: Simplicity, Accessibility, Persistence, Privacy, Reliability
- Revenue model: Free core service with optional future premium features
- Growth strategy: User acquisition → retention → engagement → expansion

**Target Users and Use Cases**

Four primary user personas:
1. **Busy Professional** - Balances multiple projects and deadlines
2. **Student** - Manages assignments and personal responsibilities
3. **Home Manager** - Tracks household and personal projects
4. **Casual User** - Seeks simple personal organization

Five primary use cases:
1. Daily task management and review
2. Quick task capture throughout day
3. Task editing and updating
4. Task completion and cleanup
5. Initial onboarding and setup

**Core Features Overview**

1. **User Authentication** - Registration, login, account management
2. **Todo Creation** - Create tasks with title and optional description
3. **Todo Viewing** - Display complete organized task list
4. **Todo Completion** - Mark tasks as complete/incomplete
5. **Todo Editing** - Modify task details
6. **Todo Deletion** - Remove tasks permanently
7. **User Profile Management** - Change password, view account info

**Success Metrics**
- User Engagement: 1,000+ MAU, 300+ DAU, 2+ sessions/day per user
- Functionality: 5-20 tasks created per week, 60%+ completion rate
- Satisfaction: 70% weekly retention, 6+ month average account duration
- System Health: 99.5% availability, <0.1% error rate, <2 second response time

**Key Application Principles**
- Simplicity First: Deliberately exclude complex features
- Data Privacy: Never share user data; complete data isolation
- Reliability: Prioritize consistency and uptime over feature richness
- User Control: Users maintain complete control of their data

---

### Document 3: User Actors and Authentication (02-user-actors-authentication.md)

**Purpose**: Define complete authentication system and user permissions

**Guest Actor - Unauthenticated Access**

Capabilities:
- View public pages (login, registration, home)
- Register new account with email and password
- Request password reset
- View public application information

Limitations:
- Cannot create, view, edit, or delete todos
- Cannot access authenticated user features
- Cannot view other users' data

**User Actor - Authenticated Member**

Capabilities:
- View all personal todos
- Create new todos
- Edit own todos
- Delete own todos
- Mark todos complete/incomplete
- View account information
- Change password
- Log out

Limitations:
- Cannot view other users' todos
- Cannot access other users' accounts
- Cannot perform administrative functions

**Complete Authentication Requirements**

**User Registration**
- WHEN guest provides email and password, THE system SHALL create new account
- Email validation: Must be valid format and unique
- Password strength: Minimum 8 characters, uppercase, lowercase, number, special character
- Email verification: System sends verification email; user must verify before login
- SUCCESS: Account created, verification email sent

**User Login**
- WHEN user provides email and password, THE system SHALL validate credentials
- Response time: Complete within 1 second
- Error handling: Generic "Invalid email or password" message (security best practice)
- SUCCESS: JWT tokens issued, session established

**Password Change**
- WHEN authenticated user requests password change, THE system SHALL validate current password
- New password must meet strength requirements
- All existing sessions invalidated after successful change
- User must log in again with new password

**Password Reset**
- WHEN user forgets password, THE system SHALL initiate recovery flow
- Recovery token sent to email; valid for 1 hour
- User sets new password; new password must meet strength requirements
- All existing sessions invalidated

**User Logout**
- WHEN user logs out, THE system SHALL invalidate session tokens
- Single logout: Invalidates current device session only
- Full logout: Invalidates all sessions across all devices
- User must authenticate again to access todos

**JWT Token Management**

**Access Token Details**
- Lifespan: 15 minutes
- Payload: userId, email, role, iat, exp, jti
- Usage: Sent with every API request in Authorization header
- Short lifespan minimizes compromise impact

**Refresh Token Details**
- Lifespan: 30 days
- Usage: Used exclusively to obtain new access tokens
- Storage: Stored securely (preferably httpOnly cookie)
- Revocation: Revoked on logout or password change

**Token Refresh Mechanism**
- WHEN access token expires, client sends refresh token
- System validates refresh token
- NEW access token generated with 15-minute expiration
- Refresh token may be rotated (new refresh token issued)
- Response: New access token returned; client stores for subsequent requests

**Session Management**

**Session Initialization**
- WHEN user logs in, THE system SHALL create session record
- Session captures: Device info, IP address, login timestamp
- Tokens associated with session

**Session Timeout**
- Access token expiration: 15 minutes
- Refresh token expiration: 30 days
- Inactivity timeout: 7 days (no API requests)
- Maximum session duration: 30 days

**Multi-Device Sessions**
- Users can maintain multiple concurrent sessions
- Each device has independent session and tokens
- Per-device logout affects only that session
- Global logout affects all devices

**Token Revocation**
- WHEN user logs out, tokens immediately revoked
- WHEN user changes password, all tokens revoked
- Revoked tokens cannot be reused
- Blacklist maintained for duration of original expiration

**Permission Matrix**

| Action | Guest | User |
|--------|-------|------|
| Register | ✅ | ❌ |
| Login | ✅ | ❌ |
| Logout | ❌ | ✅ |
| Change password | ❌ | ✅ |
| Password reset | ✅ | ✅ |
| Create todo | ❌ | ✅ |
| View own todos | ❌ | ✅ |
| Edit own todo | ❌ | ✅ |
| Delete own todo | ❌ | ✅ |
| Search todos | ❌ | ✅ |
| Filter todos | ❌ | ✅ |
| View other users' todos | ❌ | ❌ |
| Modify other users' data | ❌ | ❌ |
| Access admin functions | ❌ | ❌ |

---

### Document 4: Functional Requirements (03-functional-requirements.md)

**Purpose**: Specify all functional capabilities in EARS format

**User Registration and Authentication Functions**

**User Registration**
- WHEN guest provides email and password, THE system SHALL create account
- Email must be valid format and unique
- Password must meet complexity: 8+ chars, uppercase, lowercase, number
- Account creation response includes success message
- System sends verification email to complete registration

**User Login**
- WHEN user provides email and password, THE system SHALL validate credentials
- Validation completes within 1 second
- Invalid credentials return generic error message
- Successful login returns JWT access and refresh tokens
- User session established

**User Logout**
- WHEN user logs out, THE system SHALL invalidate session
- Current device session invalidated
- User must re-authenticate for access

**Todo Creation Functions**

**Create New Todo**
- WHEN authenticated user creates todo, THE system SHALL accept:
  - Title (required, 1-200 characters)
  - Description (optional, 0-1000 characters)
  - Due date (optional, ISO 8601 format)
  - Priority (optional, low/medium/high, defaults to medium)
- Validation: Title required, length limits enforced
- Success: Todo created with unique ID, creation timestamp
- Return: Complete todo object including generated ID

**Todo Retrieval Functions**

**Retrieve All Todos**
- WHEN authenticated user requests todo list, THE system SHALL return:
  - All todos owned by that user
  - Paginated: 20 todos per page, max 100
  - Sort: Newest first by default
  - Include: Total count of all todos
  - Response time: 500ms - 2 seconds based on todo count
  - Each todo includes: ID, title, description, due date, priority, status, timestamps

**Retrieve Single Todo**
- WHEN user requests specific todo, THE system SHALL:
  - Verify user owns the todo
  - Return complete todo object
  - Return "not found" if todo doesn't exist
  - Return authorization error if user doesn't own todo

**Todo Update Functions**

**Update Todo Title/Description**
- WHEN user updates todo, THE system SHALL:
  - Validate new title (1-200 chars, non-empty)
  - Validate new description (0-1000 chars)
  - Verify user owns todo
  - Update timestamp to current time
  - Return updated todo object
  - Reject if validation fails

**Update Todo Completion Status**
- WHEN user marks todo complete, THE system SHALL:
  - Change completion status to true
  - Record completion timestamp
  - Update modified timestamp
  - Verify user owns todo
- WHEN user marks completed todo incomplete, THE system SHALL:
  - Change completion status to false
  - Clear completion timestamp
  - Update modified timestamp

**Update Other Todo Fields**
- WHEN user updates due date, THE system SHALL:
  - Validate date format (ISO 8601)
  - Allow null/optional due date
  - Update timestamp
- WHEN user updates priority, THE system SHALL:
  - Validate priority is low/medium/high
  - Update timestamp
  - Return updated todo

**Todo Deletion Functions**

**Delete Individual Todo**
- WHEN user deletes todo, THE system SHALL:
  - Verify user owns todo
  - Permanently remove from database
  - Return success confirmation
  - Return "not found" if todo doesn't exist
  - Return authorization error if user doesn't own todo

**List Management Functions**

**Single Unified List**
- THE system SHALL maintain single todo list per user
- No categories, folders, or projects in minimum version
- Complete data isolation between users

**Data Validation Functions**

**Required and Optional Fields**
- Title: Required, non-empty after trimming
- Description: Optional
- Due date: Optional, valid ISO 8601 format
- Priority: Optional, defaults to medium (low/medium/high)

**Field Length Constraints**
- Title: 1-200 characters
- Description: 0-1000 characters
- Email: Valid format, max 255 characters
- Password: 8-128 characters

**Character and Content Restrictions**
- Accept all UTF-8 characters
- Trim whitespace before validation
- Reject whitespace-only titles
- No character restrictions for content

**Search and Filtering Functions**

**Filter by Completion Status**
- WHEN user applies filter, THE system SHALL support:
  - Completed todos only
  - Incomplete todos only
  - All todos (no filter)
- Results returned in paginated format

**Search Todo Titles**
- WHEN user searches, THE system SHALL:
  - Search title text (case-insensitive)
  - Find matching todos within 1-2 seconds
  - Return paginated results
  - Return search results in same format as regular retrieval

**Sort Todos**
- THE system SHALL support sorting by:
  - Creation date (ascending/descending)
  - Updated date (ascending/descending)
  - Due date (ascending, null values last)
  - Priority level (low→medium→high or reverse)
- Default: Creation date descending (newest first)

**Timestamp Management**
- System auto-records creation timestamp (immutable)
- System auto-records updated timestamp (updates on any change)
- Timestamps in UTC ISO 8601 format
- Timestamps included in all todo responses

**User Session Persistence**
- WHILE user is active, THE system SHALL maintain session
- Session remains valid as long as JWT token is valid
- Inactive sessions timeout (7 days)
- Todos persist across sessions unchanged

---

### Document 5: User Scenarios and Workflows (04-user-scenarios-workflows.md)

**Purpose**: Document step-by-step user interactions and complete journeys

**User Registration Scenario - Complete Flow**

**Step 1: User Accesses Registration**
- Guest navigates to registration interface
- System displays form with email and password fields

**Step 2: User Enters Email**
- User provides email address
- System validates format in real-time
- User sees feedback on email validity

**Step 3: User Enters Password**
- User provides password meeting requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- System shows password strength feedback

**Step 4: User Confirms Password**
- User re-enters password to prevent typos
- System indicates if passwords match

**Step 5: System Checks Email Uniqueness**
- Before submission, system verifies email doesn't exist
- If exists, user sees: "An account with this email already exists"
- User must provide different email

**Step 6: Registration Submission**
- User submits form
- System performs final validation
- System creates account with hashed password
- System sends verification email

**Step 7: User Receives Verification Email**
- Email arrives with verification link
- User must click link within 24 hours
- If not verified in 24 hours, user requests new link

**Step 8: Account Activation Complete**
- User clicks verification link
- System confirms email ownership
- Account becomes active
- Success message: "Your email has been verified. You can now log in."

**Error Scenarios During Registration**
- Invalid email format → "Please enter a valid email address"
- Password missing requirements → Lists all unmet requirements
- Passwords don't match → "Passwords do not match"
- Email already registered → "An account with this email already exists"
- Registration fails → "Registration failed. Please try again."
- Verification email not received → User can request resend

**User Login Scenario - Complete Flow**

**Step 1: User Accesses Login**
- User navigates to login interface
- System displays email and password fields

**Step 2: User Enters Credentials**
- User provides registered email and password
- System does not validate format yet

**Step 3: User Submits Login**
- User submits form
- System validates credentials against stored data

**Step 4: Credentials Verified Successfully**
- Email and password match registered, verified account
- System generates JWT token with user info
- System creates user session
- User redirected to todo dashboard
- Welcome message: "Welcome back, [email]"

**Step 5: User Gains Access**
- User has full access to authenticated features
- All requests include JWT token
- User sees personalized todo list

**Error Scenarios During Login**
- Email not found → "Invalid email or password"
- Incorrect password → "Invalid email or password"
- Email not verified → "Please verify your email before logging in"
- Account locked (5 failed attempts) → "Account temporarily locked. Try again in 15 minutes."
- Session expired → "Your session has expired. Please log in again."

**Creating a Todo - Complete Flow**

**Step 1: User Initiates Creation**
- User selects "New Todo" option
- System displays creation form with fields:
  - Title (required)
  - Description (optional)
  - Due date (optional)
  - Priority (optional)

**Step 2: User Enters Title**
- User types title describing the task
- System validates in real-time:
  - Title must not be empty
  - Cannot exceed 200 characters
  - Character count displayed

**Step 3: User Enters Optional Description**
- User optionally adds details
- System validates:
  - Cannot exceed 1000 characters
  - Character count displayed
  - Field completely optional

**Step 4: User Sets Optional Due Date**
- User optionally selects due date
- System enforces:
  - Due date must be today or future
  - Cannot set past date
  - Consistent with user locale

**Step 5: User Sets Optional Priority**
- User optionally selects: Low, Medium, High
- Default is Medium if not specified
- Selection clearly indicated

**Step 6: Form Validation**
- Before submission, system validates entire form:
  - Title required and not empty
  - Title within character limit
  - Description within limit
  - Due date valid
  - All values correct data type
- Problematic fields highlighted with error messages

**Step 7: User Submits**
- User submits form
- System authenticates session
- System creates todo with:
  - Unique ID
  - Assigned to user
  - Current timestamp
  - Incomplete status
  - All provided fields

**Step 8: Confirmation and Display**
- Success message: "Todo created successfully"
- New todo appears in list
- Form clears or closes
- User returns to todo list

**Error Scenarios During Creation**
- Missing title → "Title is required"
- Title too long → "Title cannot exceed 200 characters"
- Description too long → "Description cannot exceed 1000 characters"
- Invalid due date → "Please enter a valid date"
- Past due date → "Due date cannot be in the past"
- Session expired → "Your session has expired. Please log in again."
- System error → "Failed to create todo. Please try again."

**Viewing All Todos - Complete Flow**

**Step 1: User Accesses Dashboard**
- Authenticated user navigates to todo list
- System retrieves user's complete todo collection
- Session verified
- System ensures user sees only their todos

**Step 2: System Organizes Todos**
- Default order: By creation date (newest first)
- Display information:
  - Todo title
  - Due date (if set)
  - Priority level (if set)
  - Completion status
  - Total count of all todos
  - Count of pending todos

**Step 3: User Sees Organized List**
- Todos displayed in clear, readable format
- Essential information visible at glance
- Immediate view of pending tasks
- Clear indication of due dates

**Step 4: User Applies Optional Filters**
- View all todos
- View pending/incomplete todos only
- View completed todos only
- Display updates instantly
- Current filter clearly indicated

**Step 5: User Sorts List**
- Change sort order by:
  - Creation date (oldest/newest)
  - Due date (earliest/latest)
  - Priority (high to low)
- Display reorders instantly
- Current sort clearly indicated

**Step 6: User Interacts with Todos**
- From list, user can:
  - Click todo for details
  - Mark complete (single action)
  - Delete (with confirmation)
  - Edit
  - Create new

**Error Scenarios**
- No todos yet → "No todos yet. Create your first todo to get started."
- Session expired → "Your session has expired. Please log in again."
- Cannot load todos → "Unable to load todos. Please try again."
- Todos modified elsewhere → List updates in real-time

**Completing a Todo - Complete Flow**

**Step 1: User Identifies Target Todo**
- User sees pending todo in list
- Todo shows as incomplete
- User selects completion action

**Step 2: User Initiates Completion**
- User clicks completion checkbox/button
- Action is immediate and clear

**Step 3: System Updates Status**
- System verifies authentication
- System verifies user owns todo
- Completion status changed to complete
- Timestamp recorded
- Update confirmed

**Step 4: User Receives Confirmation**
- Success message: "Todo marked as complete"
- Visual update (checkmark, strikethrough, color)
- Todo may move in filtered view
- Pending count decreases

**Step 5: Statistics Update**
- Total pending count decreases by one
- Completion percentage updates
- User sees immediate progress feedback

**Error Scenarios**
- Todo not found → "Todo not found. It may have been deleted."
- Authentication failed → "Your session has expired. Please log in again."
- Permission denied → "You do not have permission to modify this todo"
- Concurrent deletion → "This todo has been deleted and is no longer available"
- System error → "Failed to update todo. Please try again."

**Editing a Todo - Complete Flow**

**Step 1: User Identifies Todo to Edit**
- User selects todo from list
- User indicates desire to edit

**Step 2: System Loads Edit Form**
- System retrieves full todo details
- Form pre-populated with current values:
  - Current title
  - Current description
  - Current due date
  - Current priority
  - Current status

**Step 3: User Modifies Fields**
- User can modify any field:
  - Title (1-200 chars, non-empty)
  - Description (0-1000 chars)
  - Due date (future or null)
  - Priority (low/medium/high)
  - Status (if editable)
- Real-time validation feedback
- Changes highlighted

**Step 4: Form Validation**
- Before submission, system validates:
  - Title non-empty and within limit
  - Description within limit
  - Due date valid
  - All correct data types
  - At least one field changed (or allows submission anyway)
- Problematic fields highlighted

**Step 5: User Submits Changes**
- User submits edit form
- System authenticates session
- System verifies todo still exists and belongs to user
- System applies all changes
- Modification timestamp updated
- Success confirmed

**Step 6: Confirmation Displayed**
- Success message: "Todo updated successfully"
- All fields updated to new values
- Returned to appropriate view

**Error Scenarios**
- Empty title → "Title is required"
- Title too long → "Title cannot exceed 200 characters"
- Description too long → "Description cannot exceed 1000 characters"
- Invalid due date → "Due date cannot be in the past"
- No changes → Optional: Error or allow submission
- Todo deleted elsewhere → "This todo has been deleted and is no longer available"
- Session expired → "Your session has expired. Please log in again."
- Save failed → "Failed to update todo. Please try again."

**Deleting a Todo - Complete Flow**

**Step 1: User Identifies Todo to Delete**
- User selects delete action for todo

**Step 2: System Requests Confirmation**
- Confirmation dialog appears
- Message: "Are you sure you want to delete this todo? This action cannot be undone."
- Todo title shown to prevent wrong deletion
- Options: Confirm or Cancel

**Step 3: User Confirms**
- User explicitly confirms deletion
- System verifies authentication
- System verifies ownership
- System permanently deletes todo
- Deletion confirmed

**Step 4: Confirmation Displayed**
- Success message: "Todo deleted successfully"
- Deleted todo disappears from list
- Total todo count decreases
- Pending count may decrease
- If viewing single todo, returns to list

**Step 5: List Updates**
- All active views reflect deletion
- Refresh not required
- Deletion is permanent and irreversible

**Error Scenarios**
- User cancels → No deletion, todo remains
- Todo not found → "Todo not found. It may have already been deleted."
- Authentication failed → "Your session has expired. Please log in again."
- Permission denied → "You do not have permission to delete this todo"
- Concurrent deletion → "This todo has already been deleted"
- System error → "Failed to delete todo. Please try again."

**Logging Out Scenario - Complete Flow**

**Step 1: User Initiates Logout**
- User selects logout option
- Optional confirmation

**Step 2: System Terminates Session**
- System clears JWT token
- System invalidates session
- Refresh token revoked
- Logout timestamp recorded
- User no longer authenticated

**Step 3: User Redirected**
- User redirected to login page or welcome page
- Success message: "You have been logged out successfully"
- All access to authenticated features revoked

**Step 4: Data Cleared**
- Sensitive data removed from client storage
- Cached todos cleared
- Authentication token removed
- Cannot access protected features without re-login

**Step 5: User Can Login Again**
- User can log in with credentials
- New session created
- New JWT token issued
- User sees all previous todos intact

**Error Scenarios**
- Session already expired → "You have been logged out."
- Logout request fails → "Logout failed. Please try again."
- User closes browser without logout → Session eventually expires; must re-login

**Workflow Summary**

**Primary Happy Path**
1. Guest navigates to application
2. Guest registers new account (with email verification)
3. Guest logs in with registered credentials
4. User creates first todo
5. User views todo list
6. User continues with todo management (create, edit, complete, delete)
7. User logs out

**Extended User Journey**
- User logs in again later
- All previous todos present
- User completes tasks
- User edits as priorities change
- User deletes no-longer-needed todos
- User logs out

**Decision Points**
- Guest: Register or login (or password reset)
- User: Filter/sort preferences
- User: Edit, complete, or delete existing todos
- User: Add optional fields or keep todos simple

**Error Recovery Paths**
- Validation errors: Correct and resubmit
- Session expired: Re-authenticate
- Invalid actions: Clear error message and guidance
- Operations cancelable: Can return to previous state

---

### Document 6: Business Rules and Constraints (05-business-rules-constraints.md)

**Purpose**: Define all business logic, validation rules, and system constraints

**Todo Creation Rules**

**Core Creation Requirements**
- WHEN user creates todo, THE system SHALL record unique ID, creation timestamp, incomplete status
- WHEN user creates todo, THE system SHALL associate exclusively with that user
- WHEN user creates todo, THE system SHALL require non-empty title
- Maximum 10,000 todos per user (prevents resource exhaustion)
- IF user at 10,000 limit attempts to create, THE system SHALL reject

**Title Requirements**
- 1-255 characters minimum to maximum
- Stored and displayed exactly as entered
- Accept any characters: letters, numbers, punctuation, spaces, symbols
- Reject whitespace-only titles (effectively empty)

**Initial State**
- Completion status automatically set to incomplete
- Creation timestamp recorded in UTC

**Todo Content Rules**

**Description Rules**
- Description up to 5,000 characters
- IF description exceeds 5,000 characters, THE system SHALL reject
- Accept any characters
- Completely optional; can be empty/null

**Title Immutability and Updates**
- WHEN user updates todo, THE system SHALL allow title modification
- New title must be 1-255 characters
- Title completely overwritten (not appended)

**Content Validation on Update**
- Same validation rules as creation apply to updates
- Character limits enforced
- Non-empty title enforced
- IF validation fails, THE system SHALL reject and preserve existing content

**Todo Ownership Rules**

**Exclusive User Ownership**
- EVERY todo owned by exactly one user
- Ownership cannot be transferred
- WHEN todo created, THE system SHALL permanently associate with creator
- WHILE authenticated, user can access only their todos
- IF user attempts to access other user's todo, THE system SHALL deny

**Data Isolation**
- Complete data isolation between users
- Each user's list completely separate and inaccessible
- WHEN user retrieves todos, THE system SHALL return only their todos
- IF one user deleted, THE system SHALL delete their todos

**Visibility and Access Control**
- Todos of one user NEVER visible to other users or guests
- WHEN request made, THE system SHALL filter for authenticated user only

**Todo Completion Rules**

**Completion State Management**
- Completion status: Boolean (true/false)
- WHEN user marks complete, THE system SHALL set status true, record timestamp
- WHEN user marks incomplete, THE system SHALL set status false, clear timestamp
- WHERE status changes, THE system SHALL preserve in history

**Completion Does Not Affect Editing**
- Completed todos remain editable
- Completion status independent from other properties
- WHEN completed todo modified, THE system SHALL preserve completion status unless updated

**Data Validation Rules**

**Title Field Validation**
- Required, cannot be null/empty/whitespace-only
- 1-255 characters
- IF title empty or exceeds limit, THE system SHALL reject
- Character count includes all spaces and special characters

**Description Field Validation**
- Optional; can be null, empty, or up to 5,000 characters
- IF exceeds 5,000 characters, THE system SHALL reject
- Accept any valid character

**Field-Level Validation**
- WHEN creating/updating, THE system SHALL validate each field independently
- IF any field fails, THE system SHALL reject entire operation
- Provide specific error message for each failure

**Character Encoding**
- Accept Unicode characters in all text fields
- Preserve exact encoding as submitted
- WHEN storing/retrieving, THE system SHALL maintain integrity

**User Account Rules**

**Registration Requirements**
- WHEN user registers, THE system SHALL require email and password
- Email address: Unique across entire system (no duplicates)
- IF duplicate email attempted, THE system SHALL reject
- Email format: Valid according to standard requirements

**Password Requirements**
- Minimum 8 characters
- Stored securely using bcrypt (cost factor 10 minimum)
- Plaintext password NEVER stored, logged, or displayed
- WHEN logging in, THE system SHALL use secure comparison

**Account Status**
- WHEN registration successful, account in active status
- User immediately has full functionality
- IF user logs out, account remains in system; can re-login anytime

**Email Uniqueness**
- Email uniqueness enforced at database level
- Case-insensitive comparison (email@example.com = EMAIL@EXAMPLE.COM)

**System Constraints**

**Todos Per User Limit**
- Maximum 10,000 active todos per user
- IF user reaches limit and attempts creation, THE system SHALL reject
- WHERE user at limit, user can delete todos to make room

**Data Retention**
- WHEN todo deleted, THE system SHALL permanently remove it
- WHERE user account deleted, THE system SHALL delete all associated todos
- Backup copies not available to users for recovery

**Request Limits**
- THE system SHALL support concurrent requests without corruption
- WHEN multiple requests for same user, THE system SHALL process sequentially

**Timestamp Precision**
- Timestamps recorded with sufficient precision for sequencing
- Consistent format and timezone
- Ensure accurate event ordering

**Uniqueness Constraints**
- Each todo has unique identifier (cannot be duplicated)
- WHEN todo created, THE system SHALL generate unique identifier
- WHILE todo exists, identifier remains unchanged and immutable

**Concurrent Modification Handling**
- WHEN two requests modify same todo simultaneously, THE system SHALL process in defined order
- IF rapid successive updates, THE system SHALL apply in order received, preserve consistency
- System SHALL NOT allow conflicting modifications to overwrite

**State Consistency**
- WHILE user viewing list, THE system SHALL ensure consistency and accuracy
- WHEN user's action affects todo, THE system SHALL update atomically (all-or-nothing)

**Account and Todo Association**
- Relationship between user and todos permanent and immutable
- Todo cannot change owners
- WHEN todo created, association established and permanent

---

### Document 7: Error Handling and Recovery (06-error-handling-recovery.md)

**Purpose**: Define all error scenarios, messages, and recovery paths

**Authentication Errors**

**Invalid Login Credentials**
- WHEN user submits incorrect email or password, THE system SHALL return HTTP 401
- Error code: AUTH_INVALID_CREDENTIALS
- Message: "Invalid email or password. Please check your credentials and try again."
- Do not specify which field incorrect (security)
- Recovery: Retry login or use password reset

**Email Not Registered**
- WHEN user attempts login with non-existent email, THE system SHALL return HTTP 401
- Error code: AUTH_EMAIL_NOT_FOUND
- Message: "No account found with this email address. Please register first or try a different email."
- Recovery: Navigate to registration or try different email

**Account Not Activated**
- WHEN user attempts login with unverified account, THE system SHALL return HTTP 403
- Error code: AUTH_EMAIL_NOT_VERIFIED
- Message: "Your account is not yet activated. Please check your email for the verification link and click it to activate your account."
- Recovery: Click verification link in email; request new if needed

**Session Expired**
- WHEN user's session expires due to inactivity, THE system SHALL return HTTP 401
- Error code: AUTH_SESSION_EXPIRED
- Message: "Your session has expired. Please log in again to continue."
- Recovery: Click "Log In Again" button; directed to login page

**Invalid or Malformed Token**
- WHEN user has corrupted/invalid/malformed JWT, THE system SHALL return HTTP 401
- Error code: AUTH_INVALID_TOKEN
- Message: "Your authentication token is invalid. Please log in again."
- Recovery: Clear session/localStorage and log in again

**Missing Authentication Token**
- WHEN user attempts protected endpoint without token, THE system SHALL return HTTP 401
- Error code: AUTH_MISSING_TOKEN
- Message: "Authentication required. Please log in to access this feature."
- Recovery: Log in to obtain token; retry action

**Token Refresh Failed**
- WHEN refresh token invalid/expired/revoked, THE system SHALL return HTTP 401
- Error code: AUTH_REFRESH_FAILED
- Message: "Unable to refresh your session. Please log in again."
- Recovery: Log in again to establish new session

**Validation Errors**

**Missing Required Field**
- WHEN required field missing/empty, THE system SHALL return HTTP 400
- Error code: VALIDATION_MISSING_REQUIRED_FIELD
- Message: "The following fields are required: [field names]. Please fill them in and try again."
- Recovery: Fill missing fields and resubmit

**Invalid Email Format**
- WHEN email doesn't match valid format, THE system SHALL return HTTP 400
- Error code: VALIDATION_INVALID_EMAIL_FORMAT
- Message: "Please enter a valid email address (e.g., user@example.com)."
- Recovery: Review and correct email; resubmit

**Email Already Registered**
- WHEN user attempts registration with existing email, THE system SHALL return HTTP 409
- Error code: VALIDATION_EMAIL_ALREADY_EXISTS
- Message: "This email address is already registered. Please log in or use a different email address."
- Recovery: Log in with that email or register with different email

**Password Too Short**
- WHEN password shorter than minimum, THE system SHALL return HTTP 400
- Error code: VALIDATION_PASSWORD_TOO_SHORT
- Message: "Password must be at least 8 characters long."
- Recovery: Enter longer password (minimum 8 characters)

**Todo Title Missing or Empty**
- WHEN todo created without title, THE system SHALL return HTTP 400
- Error code: VALIDATION_TODO_TITLE_REQUIRED
- Message: "Todo title is required. Please enter a title for your todo."
- Recovery: Provide non-empty title and resubmit

**Todo Title Too Long**
- WHEN title exceeds 200 characters, THE system SHALL return HTTP 400
- Error code: VALIDATION_TODO_TITLE_TOO_LONG
- Message: "Todo title must be 200 characters or fewer. You have entered [current length] characters."
- Recovery: Shorten title to 200 characters or fewer

**Todo Description Too Long**
- WHEN description exceeds 1000 characters, THE system SHALL return HTTP 400
- Error code: VALIDATION_TODO_DESCRIPTION_TOO_LONG
- Message: "Todo description must be 1000 characters or fewer. You have entered [current length] characters."
- Recovery: Shorten description to 1000 characters or fewer

**Invalid Data Type**
- WHEN field has wrong data type, THE system SHALL return HTTP 400
- Error code: VALIDATION_INVALID_DATA_TYPE
- Message: "Invalid data format for [field name]. Expected [expected type], received [actual type]."
- Recovery: Correct data to expected format

**Invalid Date Format**
- WHEN date doesn't match expected format, THE system SHALL return HTTP 400
- Error code: VALIDATION_INVALID_DATE_FORMAT
- Message: "Please enter a valid date in the format YYYY-MM-DD (e.g., 2024-12-25)."
- Recovery: Enter date in correct format (YYYY-MM-DD)

**Permission Errors**

**Insufficient Permissions**
- WHEN user lacks privileges for action, THE system SHALL return HTTP 403
- Error code: PERMISSION_INSUFFICIENT_PRIVILEGES
- Message: "You do not have permission to perform this action."
- Recovery: Cannot perform action; contact support if error

**Cannot Modify Other User's Todo**
- WHEN user attempts to update other's todo, THE system SHALL return HTTP 403
- Error code: PERMISSION_CANNOT_MODIFY_OTHER_USER_TODO
- Message: "You can only modify your own todos. This todo belongs to another user."
- Recovery: Cannot access other users' todos; work with your own

**Cannot View Other User's Todo**
- WHEN user attempts to view other's todo, THE system SHALL return HTTP 403
- Error code: PERMISSION_CANNOT_VIEW_OTHER_USER_TODO
- Message: "You do not have permission to view this todo."
- Recovery: Can only view your own todos

**Data Not Found Errors**

**Todo Not Found**
- WHEN todo ID doesn't exist or deleted, THE system SHALL return HTTP 404
- Error code: NOT_FOUND_TODO
- Message: "The todo you are looking for could not be found. It may have been deleted or the ID is incorrect."
- Recovery: Return to todo list; find available todos

**User Account Not Found**
- WHEN user account no longer exists, THE system SHALL return HTTP 404
- Error code: NOT_FOUND_USER_ACCOUNT
- Message: "Your account could not be found. Please log in again or contact support."
- Recovery: Log out and log back in; contact support if persists

**System Constraint Errors**

**Too Many Todos**
- WHEN user at 10,000 todo limit attempts creation, THE system SHALL return HTTP 400
- Error code: CONSTRAINT_TOO_MANY_TODOS
- Message: "You have reached the maximum number of todos (10,000). Please delete some todos before creating new ones."
- Recovery: Delete existing todos to make room

**Rate Limit Exceeded**
- WHEN user exceeds rate limit (100 requests/minute), THE system SHALL return HTTP 429
- Error code: CONSTRAINT_RATE_LIMIT_EXCEEDED
- Message: "You are making requests too quickly. Please wait a moment and try again."
- Recovery: Wait at least 1 minute before making additional requests

**Concurrent Modification Handling**

**Todo Modified by Another Session**
- WHEN user updates todo modified elsewhere, THE system SHALL return HTTP 409
- Error code: CONCURRENCY_TODO_MODIFIED
- Message: "This todo was modified elsewhere before you saved your changes. Your changes could not be saved to avoid losing the other changes. Please refresh and try again."
- Recovery: Refresh and edit again with current data

**Deleted During Edit**
- WHEN user saves changes to deleted todo, THE system SHALL return HTTP 410
- Error code: CONCURRENCY_TODO_DELETED
- Message: "The todo you were editing has been deleted. Your changes could not be saved."
- Recovery: Return to todo list; deletion reflected there

**Error Response Structure**

All error responses follow consistent structure:

```json
{
  "success": false,
  "error": {
    "code": "[ERROR_CODE]",
    "message": "[User-friendly message]",
    "details": "[Optional additional info]",
    "timestamp": "[ISO 8601 timestamp]"
  }
}
```

**HTTP Status Codes Used**

| Code | Usage | Category |
|------|-------|----------|
| 400 | Input validation failed | Validation |
| 401 | Authentication failed | Authentication |
| 403 | User lacks permission | Permission |
| 404 | Resource doesn't exist | Not Found |
| 409 | Concurrent modification | Concurrency |
| 410 | Resource deleted | Concurrency |
| 429 | Rate limit/quota exceeded | Constraints |

---

### Document 8: Performance Expectations (07-performance-expectations.md)

**Purpose**: Specify performance targets and user experience standards

**Authentication Performance**

**User Registration Performance**
- WHEN guest submits registration form, THE system SHALL complete within 2 seconds
- Includes: Email validation, password validation, account creation, database persistence, response generation

**User Login Performance**
- WHEN user provides valid credentials, THE system SHALL complete within 1 second
- Includes: Credential validation, password verification, JWT generation, session initialization, response

**JWT Token Refresh Performance**
- WHEN user requests token refresh, THE system SHALL complete within 500 milliseconds
- Must be faster than login (happens transparently during use)

**Todo Operations Performance**

**Creating a New Todo**
- WHEN user submits new todo, THE system SHALL complete within 1 second
- Includes: Input validation, todo creation, database persistence, response with created todo

**Retrieving All Todos**
- WHEN user requests todo list, THE system SHALL return within 2 seconds regardless of quantity
- Performance by volume:
  - Up to 100 todos: 500 milliseconds
  - 101-500 todos: 1 second
  - 501-1000 todos: 2 seconds
  - Over 1000: Use pagination, first page within 1 second

**Retrieving Single Todo**
- WHEN user requests specific todo, THE system SHALL return within 500 milliseconds

**Updating a Todo**
- WHEN user modifies todo, THE system SHALL complete within 1 second
- Includes: Input validation, update, database persistence, confirmation

**Deleting a Todo**
- WHEN user deletes todo, THE system SHALL complete within 1 second

**List Management Performance**

**Sorting and Filtering**
- WHEN user filters or sorts todos, THE system SHALL complete within 1.5 seconds
- Supported filters: Completion status
- Supported sorts: Creation date, due date, priority

**Pagination**
- WHERE user has 100+ todos, THE system SHALL paginate (50 todos per page)
- Each page request within 1 second

**Search Performance**

**Todo Search**
- WHEN user searches todos by title, THE system SHALL complete within 2 seconds
- Simple search (single word): 1 second
- Complex search (multiple terms): 2 seconds
- Search with 1000+ todos: 2 seconds

**Concurrent User Handling**

**Minimum Concurrent Support**
- THE system SHALL support minimum 1,000 concurrent authenticated users
- Each user experiences full responsiveness
- No performance degradation
- Response time targets maintained per user

**Per-User Performance**
- WHILE 1,000 users active simultaneously, THE system SHALL maintain individual response time targets for each user

**Data Limits and Scalability**

**Maximum Todos Per User**
- THE system SHALL support users with 1,000 todos without performance degradation
- All response time targets maintained with pagination
- Over 1,000 todos: Still acceptable performance with pagination

**User Experience Metrics**

**Perceived Responsiveness**
- WHEN user performs action, THE system SHALL respond within 1 second for perception of immediacy
- Under 1 second: Immediate and responsive
- 1-3 seconds: Acceptable but noticeable
- Over 3 seconds: Feels slow

**Visual Feedback Timing**
- WHEN user performs action, THE system SHALL provide feedback within 1 second
- Feedback: Success message, updated list, or confirmation

**Form Submission Response**
- WHEN user submits form, THE system SHALL validate and return within 1 second
- Success or validation error messages displayed

**Load Indication**
- IF operation requires more than 1 second, THE system SHALL show loading indicator within 500 milliseconds
- Prevents user thinking system is frozen

**Performance Degradation Scenarios**

**System Under Load**
- IF approaching maximum concurrent users, THE system SHALL maintain:
  - Critical operations (login, todo display): 1-2 seconds
  - Non-critical operations (search, filtering): 3-5 seconds
  - Minimum acceptable: 3-5 second response times

**Database Query Optimization**
- WHEN retrieving user data, THE system SHALL optimize queries
- Database response time: Maximum 200 milliseconds
- Other components use remaining time budget

**Performance Testing and Verification**

**Performance Baseline**
- THE system SHALL maintain all targets during normal operation with 100-1,000 concurrent users
- Measured empirically through testing
- Consistent across multiple requests
- Sustained over extended periods

**Acceptable Thresholds**
- Acceptable: Meets targets 95% of time
- Degraded but acceptable: Meets targets 90% of time
- Unacceptable: Below 90% compliance

**Summary of Performance Targets**

| Operation | Target | Notes |
|-----------|--------|-------|
| User Registration | 2 seconds | Includes validation and account creation |
| User Login | 1 second | Includes credential validation and JWT generation |
| JWT Token Refresh | 500 ms | Must be faster than login |
| Create Todo | 1 second | Includes validation and persistence |
| Retrieve All Todos | 500 ms - 2 seconds | Varies by todo count; paginated for 100+ |
| Retrieve Single Todo | 500 ms | Fast single object retrieval |
| Update Todo | 1 second | Includes validation and persistence |
| Delete Todo | 1 second | Fast removal operation |
| Search Todos | 1-2 seconds | Based on search complexity |
| Filter/Sort Todos | 1.5 seconds | Includes filtering and sorting logic |
| Per-Page Retrieval | 1 second | For paginated lists |
| Concurrent Users | 1,000 minimum | All targets maintained per user |

---

### Document 9: Data Model Concepts (08-data-model-concepts.md)

**Purpose**: Describe conceptual data structure from business perspective

**User Data Concepts**

**What Defines a User**
- Individual person who registered with system
- Each user represents one person maintaining their own todo list

**Core User Information**
- Unique identifier (internal reference)
- Email address (used for login)
- Password (securely stored)
- Account creation date
- Last login timestamp
- Account status (active/suspended/deleted)

**User Account Lifecycle**
1. Registration Phase: Guest creates account
2. Active Phase: User successfully logs in
3. Inactive Phase: User exists but inactive for period
4. Deletion Phase: Account deleted or marked for deletion

**User Credentials and Authentication**
- Email serves as username for login
- Password stored using secure hashing (never plain text)
- System verifies identity without storing plaintext

**Todo Data Concepts**

**What Constitutes a Todo**
- Unit of work or personal goal user wants to track
- Information helping user remember and manage tasks

**Core Todo Information**
- Unique identifier (unique within user's todos)
- Title or name (what todo is about)
- Description (optional details)
- Completion status (done or pending)
- Created date (when user created todo)
- Last modified date (when last changed)
- Completed date (when marked done)
- Owner/Creator (which user owns this todo)

**Todo Lifecycle**
1. Creation: User creates new todo
2. Active/Pending: User hasn't marked complete
3. Completed: User marked as done
4. Modified: User edited details
5. Deleted: User removed from list

**Todo Properties in Detail**

**Title** (Required)
- Main subject or name of todo
- What user needs to remember
- Essential for every todo

**Description** (Optional)
- Additional context or details
- May include notes or clarifications
- Can be empty if title sufficient

**Completion Status** (Required)
- Binary: Either complete or incomplete
- System records when status changes

**Timestamps**
- Creation timestamp: When created (immutable)
- Last-modified timestamp: When last changed
- Completion timestamp: When marked done

**Data Relationships**

**User-to-Todo Relationship**
- One user owns many todos
- Each todo belongs to exactly one user
- Exclusive ownership

Relationship implications:
- WHEN viewing todos, THE system SHALL display only user's todos
- WHEN modifying, THE system SHALL verify user ownership
- WHEN user deleted, THE system SHALL handle their todos

**Data Isolation Between Users**
- Complete data isolation maintained
- User A cannot see/access/modify User B's todos
- Each user's list independent and private
- System treats user data as completely separate

**No Cross-User Relationships**
- No sharing between users
- No collaborative todo management
- No assignment to other users
- No visibility outside personal ownership

**Data Lifecycle**

**Complete User Data Lifecycle**
- Registration: Create user record
- Active Usage: User logs in, creates/modifies todos
- Inactivity: Account may be marked inactive but can resume
- Deletion: Account removed, login no longer possible

**Complete Todo Data Lifecycle**
- Creation: User creates with title
- Active/Pending: User working on or planning
- Completion: User finishes or decides not to do
- Modification: User edits details
- Deletion: User removes permanently

**Data Ownership Rules**

**Core Ownership Principle**
- WHEN user creates todo, THE system SHALL mark user as owner
- Owner can: View, edit, mark complete/incomplete, delete
- Only owner can perform operations

**Ownership Verification**
- WHEN user attempts operation, THE system SHALL verify ownership
- IF not owner, THE system SHALL deny access

**Multi-User Isolation**
- IF multiple users in system, THE system SHALL maintain complete isolation
- User A's todos completely invisible to User B
- User A cannot discover, access, or modify User B's todos

**Data Retention and Cleanup**

**User Account Deletion**
- Option 1 (Cascade Deletion): Delete all user's todos
- Option 2 (Orphaning): Keep todos but mark as orphaned
- If cascaded: Todos permanently removed, cannot recover

**Todo Retention**
- THE system SHALL retain all active todos indefinitely
- Completed todos remain stored and visible
- Users may reference past todos for history

**Deleted Data**
- WHEN user deletes todo, THE system SHALL remove permanently
- Not visible to user
- Not recoverable
- Resources released

**Audit Trail** (Optional)
- Tracks modification timestamps
- Shows when todos created/changed/completed
- Provides user with activity history

**Data Validation Scope**

**User Data Validation**
- Email: Valid format, unique
- Password: Meets minimum length and complexity
- Account Status: Valid predefined states

**Todo Data Validation**
- Title: Not empty, maximum 200 characters
- Description: Optional, maximum 1000 characters
- Completion Status: Valid states (complete/incomplete)
- Ownership: References valid user, required
- Timestamps: Valid date/time, chronological order

**Summary**

Todo List data model centers on **user ownership and isolation**:
1. Users are fundamental entity
2. Todos are primary business objects
3. Relationship: One-to-many (user owns many todos)
4. Isolation: Absolute (users see only their todos)
5. Lifecycle: Clear progression through creation, active use, deletion
6. Validation: Ensures data integrity
7. Retention: Simple (keep until user deletes)

---

### Document 10: Security and Compliance (09-security-compliance.md)

**Purpose**: Define security requirements, privacy considerations, and compliance needs

**Security Overview**

Todo list application handles sensitive user information:
- User credentials (email and password)
- User account information
- Personal todo items and content
- User session data

Security architecture must ensure:
- Only authenticated users access system
- Users access only their todos
- User data protected from unauthorized access
- Passwords stored securely
- Sessions managed safely
- Data transmission secure
- System resilient against common attacks

**Authentication Security**

**JWT Token-Based Authentication**
- THE system SHALL use JSON Web Tokens for authentication
- Access token contains: userId, email, role, iat, exp, jti
- Access token expiration: 15 minutes
- Refresh token expiration: 30 days
- Token signed with 256-bit minimum entropy secret key
- Use strong signing algorithm (HS256 or RS256)

**Login Security**
- WHEN user logs in, THE system SHALL validate email and password
- Return HTTP 401 with generic error message (prevent user enumeration)
- Log all login attempts (success and failure) with timestamp and IP

**Session Token Validation**
- WHEN request made, THE system SHALL extract and validate JWT token
- Verify token signature, check expiration
- Extract user information from claims
- IF invalid/expired, THE system SHALL return HTTP 401

**Authorization and Access Control**

**User Access Control**
- WHEN user accesses todo, THE system SHALL verify ownership
- Allow operation only if user owns todo
- IF not owner, THE system SHALL return HTTP 403

**Guest vs. Authenticated Permissions**
- Guest: Registration, login, public pages only
- User: Full access to authenticated features and personal todos

**Role-Based Access Control**
- THE system SHALL use role claim in JWT: "guest" or "user"
- Each endpoint verifies appropriate role

**Password Requirements**

**Password Complexity**
- Minimum 8 characters, maximum 128 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one numeric digit (0-9)
- At least one special character: !@#$%^&*()_+-=[]{}|;:,.<>?

**Password Storage**
- NEVER store passwords in plain text
- Hash using bcrypt (cost factor minimum 10)
- Alternative: Argon2id or PBKDF2 (100,000+ iterations)
- Use unique salt per password
- Use secure comparison functions (timing attack resistant)

**Password Change**
- Require current password verification
- New password must meet strength requirements
- Cannot use current password as new password
- All existing sessions invalidated

**Data Privacy**

**Personal Data Protection**
- Treat all user data as confidential
- Collect only necessary data:
  - Email (authentication and recovery)
  - Password hash (authentication)
  - Todo information (core functionality)
- Do NOT collect: Phone, addresses, payment info, location

**Data Access Restrictions**
- Each user accesses only their own data
- Administrators access only aggregated non-personal data
- Support staff access only for customer support (with audit logging)
- Third parties have NO access

**User Data Deletion**
- WHEN user requests deletion, THE system SHALL authenticate
- Delete all personal data including todos
- Delete authentication credentials
- Retain only anonymized logs
- Complete within 24 hours

**Data Protection**

**Encryption in Transit**
- THE system SHALL use HTTPS (TLS 1.2 or higher)
- Redirect all HTTP to HTTPS
- Set HSTS header (minimum 31536000 seconds)
- Use strong TLS cipher suites (TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256 or stronger)
- Require TLS certificate validation

**Encryption at Rest**
- Encrypt sensitive data at rest in database
- Passwords protected by hashing (not additional encryption)
- User emails: Encrypt using AES-256-GCM
- Todo content: Encrypt sensitive fields using AES-256-GCM

**Encryption Key Management**
- Store keys in separate key management system
- Rotate keys regularly (minimum annually)
- Never store keys with encrypted data
- Use different keys for different data types

**Data Integrity**
- Verify data integrity using cryptographic hashing (SHA-256 or stronger)
- Detect unauthorized data modifications
- Monitor for tampering
- Maintain database referential integrity

**Session Security**

**Session Timeout**
- Access tokens expire: 15 minutes
- Refresh tokens expire: 30 days
- Inactivity timeout: 7 days
- Maximum session duration: 30 days
- Display warning 2 minutes before expiration

**Session Invalidation**
- WHEN user logs out, THE system SHALL immediately invalidate tokens
- Blacklist tokens for duration of original expiration
- Prevent token reuse after logout

**Concurrent Sessions**
- THE system SHALL allow multiple concurrent sessions per user
- Each device/browser has independent session
- Per-device logout affects only that session
- Global logout affects all sessions

**Token Revocation**
- WHEN user changes password, THE system SHALL revoke all tokens
- WHEN user logs out, THE system SHALL revoke that session's tokens
- Revoked tokens cannot be reused

**Session Hijacking Prevention**
- THE system SHALL track session context (IP, user agent)
- Monitor for context changes
- Alert users or require re-authentication on suspicious changes

**Input Security**

**Input Validation**
- THE system SHALL validate ALL user input server-side
- Email: Valid format
- Password: Meet complexity requirements
- Todo title: 1-255 characters, non-empty
- Todo description: 0-1000 characters
- Status: Boolean values
- Completion: Boolean values
- Reject invalid input with HTTP 400

**SQL Injection Prevention**
- THE system SHALL use parameterized queries (prepared statements)
- Never concatenate user input into SQL
- Use ORM frameworks providing protection
- Escape special characters appropriately

**Cross-Site Scripting (XSS) Prevention**
- THE system SHALL encode all user-provided content before returning
- Never execute user input as code
- Escape special characters per context:
  - HTML encoding for HTML context
  - JavaScript encoding for JavaScript context
  - URL encoding for URL context
- Set Content-Security-Policy (CSP) headers

**Input Length Limits**
- Email: Maximum 255 characters
- Password: Maximum 128 characters
- Todo title: Maximum 255 characters
- Todo description: Maximum 5000 characters
- Search queries: Maximum 100 characters
- Reject requests exceeding limits with HTTP 400

**Special Character Handling**
- Accept special characters in todo titles and descriptions
- Validate and encode before storage or display
- Prevent null byte injection
- Handle Unicode characters safely

**Authentication Error Handling**

**Failed Login Handling**
- Return HTTP 401 with generic error message
- Do NOT indicate if email exists or password incorrect
- Do NOT reveal account lockout status
- Log failed attempts with timestamp and IP

**Rate Limiting**
- Maximum 5 login attempts per IP per 15 minutes
- Return HTTP 429 when rate limit exceeded

**Token Validation Error Handling**
- Return HTTP 401 for invalid/expired tokens
- Do NOT reveal specific reason
- Do NOT include token details in messages
- Suggest user log in again

**Permission Error Handling**
- Return HTTP 403 for authorization failures
- Return HTTP 404 when resource doesn't exist or not authorized
- Use HTTP 404 to prevent disclosing resource existence
- Do NOT reveal reason for denial

**OWASP Security Concerns**

**Broken Authentication Coverage**
- JWT-based authentication with secure token management
- Passwords hashed with bcrypt (cost factor 10+)
- Session management with timeout and invalidation
- Password requirements enforced

**Broken Access Control Coverage**
- User ownership verification for all operations
- Role-based access control
- Proper HTTP status codes (401, 403, 404)

**Injection Prevention**
- Parameterized queries for all database operations
- Input validation for all user data
- Output encoding for all displayed content

**Security Misconfiguration**
- HTTPS-only communication (TLS 1.2+)
- Security headers (HSTS, CSP, X-Content-Type-Options)
- Secure cookie attributes (HttpOnly, Secure, SameSite)

**Identification and Authentication Failures**
- Strong password requirements (8 chars with complexity)
- JWT tokens with appropriate expiration
- Secure password storage using bcrypt

**Security Headers**
- Strict-Transport-Security: max-age=31536000; includeSubDomains
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Content-Security-Policy: default-src 'self'
- X-XSS-Protection: 1; mode=block

**API Security**
- All endpoints require HTTPS
- API rate limiting (prevent brute force and DoS)
- Request size limits (maximum 10 KB)
- Request timeout limits (30 seconds maximum)
- Proper HTTP methods usage

**Security Logging and Monitoring**

**Security Event Logging**
- Log user registration with timestamp
- Log login attempts (success and failure) with IP
- Log logout with timestamp
- Log password changes
- Log failed authentication attempts
- Log unauthorized access attempts
- Log token validation failures
- Log data access operations

**Sensitive Data Not Logged**
- Never log passwords or hashes
- Never log full JWT tokens
- Never log sensitive data in plain text

**Log Retention**
- Login activity logs: 90 days
- Failed authentication: 90 days
- Unauthorized access: 90 days
- Password changes: 1 year
- User registration: 1 year
- Archive logs older than 90 days

**Security Monitoring**
- Monitor for unusual login attempts from single IP
- Detect requests from multiple countries in short time
- Alert on attempts to access other users' resources
- Alert on rapid API requests (rate limit violations)
- Alert on injection attempts
- Alert administrators on suspicious activities

---

### Document 11: Technical Environment (10-technical-environment.md)

**Purpose**: Describe technical infrastructure and architectural needs

**System Architecture Principles**

**Client-Server Architecture**
- Frontend Client: Separate UI (web/mobile) communicates through APIs
- Backend Server: RESTful APIs handle business logic, data persistence, user management
- Stateless Design: Each request contains needed information; no server session state (except JWT)
- Separation of Concerns: Authentication, business logic, data access separated

**Technology Stack Orientation**

- Backend Framework: Node.js-based framework for RESTful APIs
- Runtime: JavaScript runtime optimized for I/O and concurrent requests
- Language: TypeScript with strong typing
- API Style: RESTful following HTTP standards

Benefits: Rapid development, strong typing, excellent performance, industry-standard

**Environment Tiers**

1. **Development**: Local machines, auto-reload, verbose logging, test data, relaxed security
2. **Staging**: Production-like, realistic data, all integrations active, full security
3. **Production**: High availability, redundancy, strict security, 24/7 monitoring

**API Architecture Concepts**

**RESTful API Design Principles**

**Resource-Based Design**
- Resources identified by URLs (e.g., /users, /todos)
- Plural nouns indicate collections
- Nested resources show relationships

**HTTP Methods Map to Operations**
- GET: Retrieve (read-only, no side effects)
- POST: Create
- PUT: Update entire resource
- PATCH: Partial update
- DELETE: Remove

**Stateless Communication**
- Each request independent and complete
- Server doesn't maintain client context
- Authentication provided in each request via JWT

**Request/Response Structure**

**Standard Request**
- Information in URL path, query parameters, or body
- Content-Type: application/json
- Authentication token in Authorization header (Bearer scheme)
- Request body as JSON for data operations

**Standard Response**
- HTTP Status Code indicates success/failure
- Response body: Result data or error details
- Response headers: Metadata (content type, cache directives)
- Errors include error code and message

**API Versioning**

- URL-based versioning (e.g., /api/v1/todos)
- New versions support existing functionality
- Old versions available during transition
- Deprecation notice before removal

**Authentication Protocol**

**JWT Implementation**

**What is JWT**
- Open standard (RFC 7519)
- Self-contained tokens asserting claims
- Digitally signed: Server verifies authenticity
- No server-side session storage needed

**JWT Structure**

header.payload.signature

- Header: Token type and signing algorithm
- Payload: Claims (userId, role, iat, exp)
- Signature: Cryptographic signature

**Token Lifecycle**

1. Token Generation: User authenticates, server creates token
2. Token Usage: Client includes in Authorization header
3. Token Expiration: Short expiration time (15-30 minutes)
4. Token Refresh: Client uses refresh token to get new access token

**Security Protocols**

- Secure Signing: Strong algorithms (HMAC-SHA256 or RSA)
- HTTPS Only: All token transmission encrypted
- Secure Storage: Client storage (httpOnly cookies preferred)
- Token Validation: Server verifies on every request
- Token Revocation: Logout invalidates tokens
- Password Security: Meets minimum complexity, strong hashing

**Database Requirements**

**Data Persistence Concepts**

Database required for:
- User Accounts: Credentials, profile, metadata
- Todo Items: Content, status, timestamps, user relationships
- Session Data: Active sessions, refresh tokens (if database-backed)
- Audit Trail: User actions for security/debugging

**Data Durability**
- Data persists across restarts
- Survives server failures (replicated backups)
- No data loss on normal shutdown
- Automated backup procedures

**Storage Requirements**

**User Data**
- Account information: email, password hash, creation timestamp
- Profile data: name, status, preferences
- Authentication history: last login, device info (optional)

**Todo Data**
- Content: title, description, status
- Metadata: creation timestamp, modified timestamp, due date
- Relationships: owner, priority
- History: audit trail (optional)

**Storage Capacity**
- Initial: 1,000-10,000 users, 5,000-100,000 todos
- Growth: 10x over 2 years
- Average todo: ~500 bytes
- Total: 50 MB - 500 MB initially
- Scales to multi-gigabyte as user base grows

**Data Integrity Needs**

**Consistency**
- Unique emails (no duplicates)
- Each todo owned by exactly one user
- Orphaned todos handled per policy
- Operations atomic (all-or-nothing)

**Referential Integrity**
- Foreign key relationships maintained
- Cascading deletes or soft deletes
- No invalid cross-references

**Data Validation at Database Level**
- Data types enforced
- Field length constraints
- Required fields not null
- Unique constraints enforced

**External Services and Integrations**

**Email Services** (Optional but recommended)

For:
- Email Verification: Verification link to new user
- Password Reset: Reset link when user forgets password
- Notifications: Optional reminders for due todos

Requirements:
- SMTP or API integration
- Reliable delivery (minutes)
- HTML template support
- Bounce handling and retries

Recommended: Third-party service (SendGrid, Mailgun, AWS SES)

**Logging Services**

Centralized logging for:
- Application logs: Info, warning, error messages
- Request logs: HTTP method, path, status, duration
- Authentication logs: Login attempts, tokens, failures
- Error logs: Stack traces, detailed error information

Requirements:
- Structured logging (JSON format)
- UTC timestamps
- Minimum 30 days retention
- Searchable and queryable
- Real-time access plus historical archive

Options:
- Self-hosted: ELK Stack (Elasticsearch, Logstash, Kibana)
- Cloud: CloudWatch, Datadog, Splunk

**Monitoring and Alerting**

Continuous monitoring for:
- Uptime: Application availability alerts
- Performance Metrics: CPU, memory, disk, connections
- API Metrics: Request rate, response time, error rate
- Alerting: Automatic notifications when thresholds exceeded

Options:
- APM Service: New Relic, Datadog, Elastic APM
- Open Source: Prometheus + Grafana

**Deployment Considerations**

**Environment Setup**

**Development**
- Local or shared development server
- Auto-reload on code changes
- Verbose logging
- Test data and fixtures
- Loose security

**Staging**
- Production-like configuration
- Realistic dataset size
- All external services active
- Full logging and monitoring
- Full security controls

**Production**
- High availability with redundancy
- Database replication and backups
- Load balancing
- Strict access controls
- 24/7 monitoring

**Deployment Process**

1. Code Commit: Developer pushes to Git
2. Automated Tests: Test suite runs; fails on failure
3. Build: Application built, dependencies compiled
4. Staging Deployment: Code deployed automatically
5. Testing: Automated and manual testing
6. Production Deployment: Manual approval gate
7. Verification: Health checks and smoke tests
8. Rollback: Previous version available for rollback

**Deployment Frequency**
- Development: Multiple times per day
- Staging: Daily to weekly
- Production: As needed; typically daily

**Configuration Management**

**Environment-Specific Settings**

- Database URL: Different per environment
- API Keys: Different credentials per environment
- Feature Flags: Enable/disable per environment
- Log Level: Verbose in dev; warnings/errors in prod
- CORS Settings: Restrict origins per environment
- Rate Limiting: Relaxed in dev; strict in prod

**Configuration Storage**

- Environment variables for sensitive data
- Configuration files for non-sensitive settings
- Secrets management system (AWS Secrets Manager, Vault)
- Never commit secrets to version control

**Monitoring and Logging**

**Application Logging**

**Logging Strategy**
- Request Logging: Every API request with method, path, status, duration
- User Actions: Significant actions (login, creation, deletion)
- Errors: All errors with stack trace
- Performance: Slow queries and requests
- Security: Authentication, permission denials

**Log Format**
- Structured JSON
- Timestamp (ISO 8601 UTC)
- Log level (DEBUG, INFO, WARN, ERROR, FATAL)
- Logger name/component
- Message and context
- Request ID for tracing

**Performance Monitoring**

**Metrics to Track**
- API Response Times: p50, p95, p99 percentiles
- Request Throughput: Requests per second
- Error Rate: Percentage of errors
- Database Performance: Query time, connection pool
- Server Resources: CPU, memory, disk
- Active Sessions: Concurrent users

**Performance Targets**
- 95% API responses under 500ms
- 99% under 2 seconds
- 95% database queries under 100ms
- Error rate under 0.1%
- 99.9% availability target

**Error Tracking**

**Error Monitoring**
- Error aggregation and grouping
- Full stack traces captured
- Error rate tracking
- Alerting on rate threshold
- Search by user, timestamp, type

**Categories Tracked**
- Authentication failures
- Validation errors
- Permission errors
- Resource not found
- Database errors
- Unexpected exceptions

**User Activity Logging**

**Activity Audit Trail** (Optional)
- User registrations
- Login activity with IP, timestamp
- Todo operations (create/modify/delete)
- Account changes
- Permission changes

**Retention Policy**
- User activity: Minimum 90 days
- Critical security events: Longer
- GDPR compliance: User data deletable
- Audit trail preserved for investigation

**Development Standards**

**Code Quality Standards**

**Version Control**
- All code in Git
- Meaningful commit messages
- Branch strategy (main, develop, features)
- Code review process (pull requests)
- Commit history for traceability

**Code Style**
- Consistent formatting and naming
- Linting tools enforce style automatically
- Readability prioritized
- Comments for complex logic

**Type Safety**
- TypeScript for compile-time error catching
- Strict type checking enabled
- No `any` types
- Type definitions for dependencies

**Testing Requirements**

**Testing Levels**

1. **Unit Tests**: Individual functions in isolation
   - Target: 80%+ code coverage
   - Fast execution (< 1 second)
   - No external dependencies (mocked)

2. **Integration Tests**: Multiple components together
   - API endpoints with real database
   - External services mocked
   - Realistic scenarios

3. **End-to-End Tests**: Complete user workflows
   - User registration → login → create → complete scenarios
   - Run against staging
   - Catch integration issues

**Test Automation**
- Tests run automatically on commit
- Build fails if tests fail
- New features require tests
- Regression tests for critical functionality

**Documentation Standards**

**Code Documentation**
- README.md with setup and running instructions
- Inline comments for complex logic
- JSDoc/TypeDoc comments for public functions
- Architecture documentation

**API Documentation**
- Endpoints documented (paths, methods, parameters)
- Example requests and responses
- Authentication requirements
- Error responses documented

**Deployment Documentation**
- Setup instructions for development
- Staging and production deployment procedures
- Emergency rollback procedures
- Troubleshooting guide

**Infrastructure Scalability**

**Growth Projections**

**Expected User Growth**
- Year 1: 1,000 - 10,000 users
- Year 2: 10,000 - 100,000 users
- Year 3: 100,000+ users

**Expected Data Growth**
- Average user: 10-50 todos
- Storage: MB initially → GB at scale
- Linear growth with user count

**Usage Patterns**
- Peak: Work hours (9 AM - 6 PM)
- Off-peak: Nights and weekends
- Seasonal variations: Possible at year/quarter starts
- Peak concurrent: 100-1000 at 1-year mark

**Scaling Strategy**

**Horizontal Scaling**
- Multiple application servers
- Load balancer distributes requests
- Stateless design: Each server independent
- Easy capacity addition

**Vertical Scaling**
- Initial: Single server sufficient
- Database optimization: Indexing before scaling
- Incremental: Move to horizontal when needed

**Database Scaling**
- Read Replicas: Multiple read-only copies
- Connection Pooling: Efficient connection reuse
- Caching Layer: Cache frequently accessed data
- Database Optimization: Proper indexing

**Load Balancing Concepts**

**Distribution Strategy**
- Request Distribution: Across available servers
- Health Checks: Automatic removal of unhealthy servers
- Session Affinity: Route requests appropriately
- Geographic Distribution: Servers in different regions (future)

**Benefits**
- Increased Capacity: Handle more concurrent users
- High Availability: Service available if server fails
- Transparent Scaling: Add/remove without client changes
- Performance: Requests served by least-loaded server

**Data Governance and Compliance**

**Data Backup and Recovery**

**Backup Strategy**
- Automated daily backups
- Point-in-time recovery (7-30 days)
- Off-site storage
- Regular testing of restoration

**Recovery Procedures**
- Database corruption: Restore from backup
- Accidental deletion: Point-in-time recovery
- Disaster: Full system recovery in alternate location

**Data Retention Policies**

**User Data**
- Active accounts: All data retained
- Closed accounts: 30-90 days retention
- Legal hold: Retained if required
- Deletion: After retention period, permanent

**Audit Trail**
- Activity logs: Minimum 1 year
- Security events: Longer retention
- Compliance: Meets regulatory requirements

**Privacy and Data Protection**

**Data Security**
- Encryption in Transit: HTTPS/TLS
- Encryption at Rest: Sensitive data encrypted
- Access Control: Only authorized access
- Password Security: Strong hashing, never plain text

**User Privacy**
- Minimal Data Collection: Only necessary data
- Data Access: Users view/export their data
- Data Deletion: Users can delete accounts and todos
- Privacy Policy: Clear data usage explanation

---

## Cross-Document Integration Summary

This complete requirements documentation suite is fully integrated and cross-referenced:

**Document Flow**:
- 00-toc.md: Navigation to all documents
- 01-service-overview.md: Business context foundation
- 02-user-actors-authentication.md: User roles and auth flows
- 03-functional-requirements.md: What system does (EARS format)
- 04-user-scenarios-workflows.md: How users interact
- 05-business-rules-constraints.md: System logic and limits
- 06-error-handling-recovery.md: Error scenarios and recovery
- 07-performance-expectations.md: Speed and scale targets
- 08-data-model-concepts.md: Data structure (conceptual)
- 09-security-compliance.md: Security and privacy
- 10-technical-environment.md: Infrastructure and architecture

**Implementation Ready**:
- Complete specifications for building the application
- Business requirements clearly stated (not technical implementation)
- EARS format requirements for clarity and precision
- Error scenarios and recovery paths documented
- Performance targets measurable and achievable
- Security requirements comprehensive
- All functionality covered with no gaps

**Minimum Viable Product (MVP)**:
- Core features: User auth, todo CRUD operations
- Simple data model: Users own todos
- Focus on reliability: Essential functionality over features
- Clear scope: No team collaboration, recurring tasks, or complexity

This documentation enables the development team to build a complete, functional Todo list application with clear requirements, business logic, security standards, and performance expectations.