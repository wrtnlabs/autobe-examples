# Todo List Service Overview

## Service Overview

The Todo List service is a minimal productivity tool designed exclusively for individual, personal task management. It eliminates all complexity, distraction, and enterprise features to provide a focused, frictionless experience for recording and tracking daily tasks. This service exists because modern digital life is overwhelmed by overly complex task managers that bury users under hierarchical folders, due dates, priorities, sharing features, and notifications — when what most people need is simply to capture a thought, check it off, and move on. The Todo List service answers this need with surgical precision: a clean interface that lets users create, view, update, and delete their own tasks — nothing more, nothing less.

## Business Model

### Why This Service Exists

Millions of individuals struggle to remember small, daily tasks. They use sticky notes, phone reminders, cluttered notebook apps, or feature-heavy productivity suites — none of which fully satisfy the need for simplicity. The Todo List service fills this gap by offering a purpose-built, distraction-free tool that requires no configuration, no learning curve, and no digital clutter. Unlike competing apps that monetize through subscriptions, data harvesting, or enterprise upsells, this service is intentionally non-monetary: it succeeds by helping users accomplish more with less, thereby building trust and organic adoption. Its value is not in generating revenue, but in restoring mental clarity.

### Core Value Proposition

The core value of this service is **uncomplicated task ownership**. Users regain control of their mental space by having a trusted, reliable place to offload thoughts without the burden of management. It is not a project tracker, not a team collaboration tool, not a calendar integration — it is a one-to-one relationship between a user and their own tasks. The service is designed so that users can complete it in under 10 seconds: open → type → check → close. The entire experience is crafted to be invisible until needed.

### Target User Profile

The target user is an individual seeking clarity in daily rhythm — not a project manager, freelancer, or team lead. They may be a student organizing assignments, a parent managing household chores, a professional jotting down meeting follow-ups, or someone recovering from digital overwhelm. They do not want labels, filters, reminders, or groups. They want one list. One place. One action per item. They value speed, privacy, and predictability over flexibility and extensibility.

### Revenue Model (if any)

This service has no revenue model. It is intentionally not monetized. There are no ads, no premium tiers, no subscription fees, no data sales, and no third-party integrations. Revenue is not a goal. Success is defined by user retention, daily active usage, and the quiet satisfaction of users who find their mental load reduced. Any future monetization would directly contradict this service’s core philosophy and is formally excluded as out of scope (#09-future-considerations.md).

### Success Metrics

Success is measured through behavioral indicators, not financial ones:

- Daily Active Users (DAU) → Must grow steadily as users adopt the habit
- Sessions per User → Target: 2–5 sessions per day
- Tasks Created per Day → Target: 5–10 tasks per active user
- Renewal Rate → Must be >90% after 30 days
- Completion Time per Task → Averaging under 8 seconds
- Zero Support Tickets → Successful implementation is silent

These metrics ensure the service remains focused on the user experience, not engagement hacking or financial KPIs.

### Competitive Landscape

The service competes directly with:

- Natural products: Pen and paper, sticky notes
- Generic tools: Phone notes, notepad apps, Siri/Google reminders
- Feature-heavy apps: Todoist, Microsoft To Do, TickTick, Things

It wins by sacrificing everything except the core function. Where other tools offer 50 features, this app offers one: task persistence. Where others ask users to learn workflows, this app assumes users know what to do. It doesn't compete on power — it competes on absence of noise.

## User Actor Structure

The system recognizes exactly one actor: the **user** (member). This actor represents a single authenticated individual with exclusive ownership of their data. There are no guest users, no administrators, no collaborators, no shared lists. All system behavior is designed around the singular, private relationship between a user and their tasks.

### Key Actor Behaviors

- The user can create a new to-do item for personal use
- The user can view all their to-do items in a chronological list
- The user can update the text of any of their own to-do items
- The user can mark any of their own to-do items as completed or incomplete
- The user can permanently delete any of their own to-do items
- The user can log in and out of their session

### Access Restrictions

- A user cannot view, edit, or delete any to-do item owned by another user
- A user cannot list, search, or discover other users
- A user cannot assign, share, or transfer ownership of any task
- A user cannot create team-wide or group-based tasks
- A user cannot modify settings that affect other users

### User Session Expectations

- A user must authenticate to begin a session
- A session persists until explicitly logged out
- Session lifetime is 30 days unless revoked
- Server-side state is maintained via JWT token
- Tokens are stored locally on client device (localStorage)

### JWT Payload Requirements

The server generates a JWT with the following payload upon successful authentication:

```json
{
  "userId": "unique-user-identifier",
  "role": "member",
  "permissions": ["create_todo", "read_todo", "update_todo", "delete_todo"]
}
```

This payload is verified on every request to enforce ownership.

### Authentication Flow Summary

1. User opens app
2. If no valid token exists, prompts for email/password
3. User provides credentials
4. System validates credentials and generates JWT
5. JWT is stored in localStorage
6. Subsequent requests include JWT in Authorization header
7. Server validates JWT, extracts userId
8. All operations are scoped to userId

## User Scenarios

### Onboarding Experience

- The user visits the application website
- No tutorial is shown, no welcome screen, no signup form
- The user is presented with a single input field labeled "What needs to be done?"
- The user types their first task
- Presses Enter or clicks "Add"
- The task appears in the list below
- The user is immediately productive — no registration, no email verification, no onboarding steps
- Login is only required if the user clears their browser data or uses another device

### Creating a New Todo Item

- WHEN the user types text into the input field and presses Enter or clicks the "Add" button,
- THE system SHALL validate that the text is not empty and does not exceed 255 characters,
- THEN THE system SHALL create a new todo item with completion status set to false,
- AND THE system SHALL append the new item to the top of the user’s list.

### Viewing the Todo List

- WHEN the user opens the application with a valid session,
- THE system SHALL retrieve all todo items associated with the user’s authenticated ID,
- THEN THE system SHALL display them in reverse chronological order (newest first),
- AND THE system SHALL show each item with its text and completion status (unchecked or checked).

### Marking a Todo as Complete

- WHEN the user clicks the checkbox next to any todo item,
- THE system SHALL toggle the completion status of that item’s record,
- THEN THE system SHALL persist the update to the database,
- AND THE system SHALL visually update the item’s appearance (strikethrough if completed).

### Editing an Existing Todo

- WHEN the user double-clicks the text of an existing todo item,
- THE system SHALL replace the displayed text with an editable input field,
- THEN THE user SHALL be allowed to modify the text,
- AND WHEN the user presses Enter or clicks outside the field,
- THE system SHALL update the item’s text content and persist the change,
- IF the edited text becomes empty or exceeds 255 characters,
- THEN THE system SHALL revert the change and display a user-friendly message: "Description must be between 1 and 255 characters."

### Deleting a Todo

- WHEN the user clicks the "X" button on any todo item,
- THE system SHALL display a confirmation dialog saying: "Are you sure you want to delete this task? This cannot be undone."
- IF the user confirms,
- THEN THE system SHALL immediately remove the item from the database,
- AND THE system SHALL hide the item from the UI instantly.
- IF the user cancels,
- THEN THE system SHALL do nothing and close the dialog.
- Deleted items are permanently removed and cannot be recovered.

### Logging Out

- WHEN the user clicks "Log Out",
- THE system SHALL remove the JWT from localStorage,
- THEN THE system SHALL redirect the user to the login prompt screen,
- AND THE system SHALL display a message: "You have been logged out. Your tasks are securely stored and will be available when you log back in."

### Returning After Logout

- WHEN a user returns to the application after logging out,
- THE system SHALL check for a stored JWT in localStorage,
- IF a valid, unexpired JWT is found,
- THEN THE system SHALL authenticate the user automatically and load their list,
- IF the JWT is missing or invalid,
- THEN THE system SHALL show the login form: "Please enter your email and password to access your tasks."

## Functional Requirements

### Authentication Requirements

- WHEN a user attempts to sign in with email and password,
- THE system SHALL verify that the email format matches standard Internet email syntax,
- THE system SHALL verify that the password is at least 8 characters long,
- THEN THE system SHALL match the provided credentials against the stored hashed password,
- IF the credentials are valid,
- THEN THE system SHALL generate and return a signed JWT token valid for 30 days.

- WHEN a user attempts to register a new account,
- THE system SHALL check if the provided email is already registered,
- IF the email is already in use,
- THEN THE system SHALL return an error: "An account with this email already exists."
- IF the email is available,
- THEN THE system SHALL hash the password using bcrypt,
- AND THE system SHALL create a new user record with the hashed password and email,
- AND THE system SHALL generate and return a signed JWT.

- WHEN a user sends a request with an expired or invalid JWT,
- THEN THE system SHALL return HTTP 401 Unauthorized with JSON body: {"error":"Invalid or expired token"}.

### Todo Item Management Requirements

- WHEN a user submits a new todo item,
- THE system SHALL accept text input between 1 and 255 characters,
- IF the input is empty or contains only whitespace,
- THEN THE system SHALL reject the request with error: "Todo description cannot be empty."
- IF the input exceeds 255 characters,
- THEN THE system SHALL reject the request with error: "Todo description must be 255 characters or fewer."
- THEN THE system SHALL create a new record with: created_at (ISO 8601), updated_at (equal to created_at), completed (false), user_id (from JWT), and text (trimmed and validated).

- WHEN a user requests their todo list,
- THE system SHALL return only items where user_id matches the authenticated user's ID,
- AND THE system SHALL return items sorted by created_at in descending order (newest first),
- AND THE system SHALL include: id, text, completed, created_at, updated_at for each item.

- WHEN a user marks a todo as completed or incomplete,
- THE system SHALL verify that the todo item’s user_id matches the authenticated user’s ID,
- IF it does not match,
- THEN THE system SHALL return HTTP 403 Forbidden with error: "You do not own this task."
- THEN THE system SHALL update the completed field to the opposite value,
- AND THE system SHALL update the updated_at timestamp to current time.

- WHEN a user edits a todo item,
- THE system SHALL verify the item’s user_id matches the authenticated user’s ID,
- IF it does not match,
- THEN THE system SHALL return HTTP 403 Forbidden with error: "You do not own this task."
- THEN THE system SHALL update the text field to the new value,
- IF the new text is empty or exceeds 255 characters,
- THEN THE system SHALL return HTTP 400 Bad Request with error: "Todo description must be between 1 and 255 characters."
- AND THE system SHALL update the updated_at timestamp.

- WHEN a user deletes a todo item,
- THE system SHALL verify the item’s user_id matches the authenticated user’s ID,
- IF it does not match,
- THEN THE system SHALL return HTTP 403 Forbidden with error: "You do not own this task."
- THEN THE system SHALL immediately remove the item from the database,
- AND THE system SHALL not retain any copy, backup, or archive of the deleted item.

### Data Persistence Requirements

- THE system SHALL persist all todo items and user accounts using Prisma ORM with PostgreSQL.
- ALL data must be stored permanently unless explicitly deleted.
- Deleted records shall not be soft-deleted; they must be permanently removed.
- No backup or replication system is required.

### Return Format Requirements

- THE system SHALL return all todo items in a JSON array with the following structure:

```json
[
  {
    "id": "uuid",
    "text": "string",
    "completed": true|false,
    "created_at": "ISO 8601 date-time",
    "updated_at": "ISO 8601 date-time"
  }
]
```

### User Session Requirements

- THE system SHALL maintain user sessions using JWT tokens.
- ALL API endpoints (except /auth/login and /auth/register) SHALL require a valid JWT.
- JWT SHALL contain: userId, role, permissions.
- Access token expiration SHALL be 30 days.
- Refresh token mechanism SHALL NOT be implemented.
- Tokens SHALL be stored in browser localStorage.
- The system SHALL NOT use HTTP-only cookies.
- Session state SHALL NOT be stored server-side.

## Business Rules

### Data Validation Rules

- Todo text must be between 1 and 255 UTF-8 characters (inclusive).
- Todo text must not be empty.
- Todo text must not consist solely of whitespace.
- User email must be a valid email address format (e.g., user@example.com).
- User password must be at least 8 characters long.

### Status Transition Rules

- A todo item can only have one of two states: completed = true OR completed = false.
- There is no intermediate, draft, or pending status.
- Completion status may be toggled an unlimited number of times.
- Once deleted, a todo item’s status cannot be read or modified.

### Ownership Enforcement

- Every todo item SHALL be associated with exactly one user_id (from JWT).
- Every read, update, or delete request SHALL be rejected if user_id in request does not match user_id in JWT.
- A user SHALL never be able to retrieve, alter, or delete another user’s tasks.
- No exceptions are permitted. All operations are strictly scoped.

### Concurrency Rules

- If two clients attempt to update the same todo item simultaneously,
- THE system SHALL process the requests in the order received.
- The last update shall overwrite the previous one.
- No shading, locking, or optimistic concurrency control is required.
- No conflict notifications are issued to users.

### Data Persistence Guarantees

- All data SHALL be written to disk asynchronously but with durability.
- If the database is unreachable for more than 10 seconds,
- THEN the system SHALL return HTTP 503 Service Unavailable.
- If a user creates a todo during temporary unavailability,
- THE system SHALL indicate failure and allow retry.
- If data cannot be written at all,
- THEN PostgreSQL’s write-ahead log guarantees zero data loss on recovery.

### Error Handling Rules

- ALL errors returned to the client SHALL be human-readable.
- NO server stack traces, SQL errors, or internal identifiers SHALL be exposed.
- Error messages SHALL guide the user toward corrective action.
- All HTTP errors SHALL follow RESTful conventions (400, 401, 403, 404, 500, 503).

## Error Handling

### Authentication Errors

- IF the user enters an email that is not in the database,
- THEN THE system SHALL return: "No account found with this email address."
- IF the user enters an incorrect password,
- THEN THE system SHALL return: "Invalid password. Please try again."
- IF the user tries to register with an already-used email,
- THEN THE system SHALL return: "An account with this email already exists."
- IF the user submits malformed email or password,
- THEN THE system SHALL return: "Email must be valid. Password must be at least 8 characters."

### Requirements Validation Errors

- IF the todo text is empty or contains only spaces,
- THEN THE system SHALL return: "Todo description cannot be empty."
- IF the todo text exceeds 255 characters,
- THEN THE system SHALL return: "Todo description must be 255 characters or fewer."
- IF the user tries to update or delete a todo with an invalid UUID,
- THEN THE system SHALL return: "Task not found."

### Ownership Violation Errors

- IF the user attempts to edit, view, or delete a todo item owned by another user,
- THEN THE system SHALL return: "You do not own this task."

### Storage Failure Errors

- IF the database is temporarily unreachable,
- THEN THE system SHALL return: "The server is busy. Please try again in a few seconds."
- IF the database is permanently unavailable,
- THEN THE system SHALL return: "Service temporarily down. Our team is working to restore access."
- IF the data directory is full or corrupted,
- THEN THE system SHALL return: "Storage error. Contact support."

### Network Connectivity Errors

- IF the user loses network connection while attempting to create/update/delete a task,
- THEN THE system SHALL return: "No internet connection. Please check your network and try again."
- The UI SHALL indicate this with a visual badge (not part of this document).

### Unknown Errors

- IF an unexpected error occurs (e.g., code bug, unhandled exception),
- THEN THE system SHALL return: "An unexpected error occurred. Please refresh the page. If this continues, contact support."
- The server SHALL log the error internally but return nothing technical to the user.

## Performance Expectations

### Authentication Response Time

- WHEN a user submits valid email and password,
- THE system SHALL respond with JWT in under 2 seconds.
- This includes DNS lookup, server processing, database query, and token signing.

### Todo List Load Time

- WHEN a user logs in with 500 pending todo items,
- THE system SHALL return the full list and render it on screen in under 1.5 seconds.
- The UI must display 100% of items within that time.

### Todo Item Creation Latency

- WHEN a user adds a new todo item,
- THE system SHALL respond with confirmation and display the item in under 1 second.
- The experience must feel instantaneous — no spinner longer than 500ms.

### Todo Update and Deletion Responsiveness

- WHEN a user toggles completion or deletes a todo,
- THE system SHALL apply the visual change instantly (on UI) before network acknowledgment,
- THEN SHALL sync with server in background,
- AND SHALL revert the change if the server returns an error.

### Offline Behavior Expectations

- THE system SHALL not support offline usage.
- All actions require a live connection to the server.
- If network is lost, all new edits are discarded and the user must reconnect to submit.
- No local caching, local storage conflict resolution, or sync-on-reconnect is implemented.

## Security and Privacy

### Data Transmission Security

- ALL communication between client and server SHALL use HTTPS with TLS 1.3.
- No HTTP endpoints are allowed.
- Strict transport security (HSTS) SHALL be enforced with a max-age of 1 year.

### Authentication Security

- Passwords SHALL never be stored in plaintext.
- User passwords SHALL be hashed using bcrypt with a cost of 12.
- JWT tokens SHALL be signed with HMAC-SHA256 using a server-side secret key never exposed to clients.
- Tokens SHALL not contain sensitive data beyond user ID and permissions.

### Data Storage Security

- All user data SHALL be stored in an encrypted PostgreSQL database.
- At-rest encryption SHALL be enabled at the storage layer (e.g., LUKS, AWS encryption).
- No sensitive data (e.g., passwords) shall be backed up or logged.

### User Data Isolation

- Every user’s data SHALL be completely isolated from every other user’s data.
- A user SHALL not be able to access another user’s account through any means — including URL manipulation, direct database access, or API fuzzing.
- Access controls SHALL be enforced at the database query level via user_id filtering.

### Data Retention Policy

- User accounts and todo items SHALL be retained indefinitely.
- The service SHALL NOT automatically delete inactive accounts.
- Upon user request (via support), data SHALL be permanently erased within 7 days.

### Third-Party Integrations

- NO third-party services shall be integrated into the application.
- NO analytics, ads, tracking scripts (Google Analytics, Hotjar, etc.) are permitted.
- NO external authentication providers (Google, Apple, GitHub) are supported.
- NO cloud functions, webhooks, or APIs to other systems are implemented.

## Future Considerations

### Potential Enhancements (Non-Approved)

The following features, while logically desirable to users, are explicitly excluded from scope:

- Sharing todos with other users
- Group or family task lists
- Tags, categories, or folders
- Due dates, reminders, or recurring tasks
- Priority levels (high, medium, low)
- Search or filter functionality
- Sorting (by date, text, completion)
- Bulk operations (delete all, mark all complete)
- Mobile apps (iOS, Android)
- API access for external tools (webhooks, OAuth)
- Themes or UI customization
- Import/export of task data
- Sync across multiple devices using cloud account
- Profiles or user avatars

### Scope Boundaries

This service remains strictly a **personal, single-user, text-only task tracker**. Any deviation from this scope would violate the core philosophy of minimalism.

### Extensibility Constraints

- The architecture is designed so that new features cannot be extended without significant rework.
- The user model is singular and does not support roles.
- Data model is flat and contains no nested relationships.
- Authentication is built on JWT and cannot support federated identity.
- APIs are not versioned — breaking changes would require a new service.

### Versioning Strategy

- Only one version of this service will ever be deployed.
- No version numbers will be exposed.
- Updates will be rolled silently and always be backward-compatible.
- Bugs will be fixed in place — users will not be required to upgrade.

## Document References

For complete implementation guidance, refer to the following documents:

- [Business Model](./01-business-model.md)
- [User Actors](./02-user-actors.md)
- [Primary User Journey](./03-primary-user-journey.md)
- [Functional Requirements](./04-functional-requirements.md)
- [Business Rules](./05-business-rules.md)
- [Error Handling](./06-error-handling.md)
- [Performance Expectations](./07-performance-expectations.md)
- [Security and Privacy](./08-security-and-privacy.md)
- [Future Considerations](./09-future-considerations.md)
- [Document References](./10-document-references.md)

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*