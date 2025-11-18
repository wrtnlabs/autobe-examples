# Todo List Service Requirements Specification

## Service Vision

The Todo List service exists to help individuals reduce cognitive load by providing a simple, reliable, and personal system for tracking tasks and commitments. In today's fast-paced digital environment, people are overwhelmed by unstructured responsibilities — from work deadlines to personal errands — and lose mental bandwidth trying to remember what needs to be done. This service eliminates the friction of analog lists (paper, sticky notes) and the complexity of feature-bloated productivity apps by offering a minimalist, focused, and intuitive digital todo list that becomes an extension of the user's memory.

## Problem Statement

Individuals face four core challenges in managing daily tasks:

1. **Memory overload** — Humans have limited working memory, and attempting to track tasks mentally leads to stress, forgetfulness, and missed deadlines.
2. **Fragmented tools** — People juggle multiple apps (notes, calendars, email, project tools) that don't communicate, creating duplication and confusion.
3. **Over-engineered solutions** — Existing productivity apps include calendars, hierarchies, tagging, collaboration, and reminders that are unnecessary for simple personal task tracking, making them intimidating and hard to adopt.
4. **Lack of persistence** — Paper lists get lost, whiteboards get erased, and sticky notes are forgotten.

The Todo List service solves these problems by providing a single-purpose, always-available digital list that requires just one tap to add a task and one tap to mark it done — with no clutter, no learning curve, and no distractions.

## Target Users

The primary user of this service is the **Personal Task Organizer**, a demographic that includes:

- Young professionals managing workloads without team support
- Students juggling assignments, extracurriculars, and part-time work
- Parents managing household duties and family schedules
- Remote workers seeking structure without corporate tools
- Anyone feeling overwhelmed by daily tasks but rejecting complex software

This user is:
- Tech-savvy enough to use a smartphone or web app
- Time-constrained and values efficiency
- Skeptical of productivity hype and bloated features
- Frustrated by apps that require setup, training, or subscriptions
- Looking for a tool that feels like a natural extension of thought, not an external system to manage

Secondary users include: 
- **New users** (those currently using pen and paper or disorganized digital notes) who need a seamless migration path to a digital system
- **Returning users** who previously tried similar apps but abandoned them due to complexity

## Core Value Proposition

The Todo List service delivers five core value pillars:

1. **Radical Simplicity** 
   - Only three actions: create, complete, delete
   - No categories, tags, priorities, reminders, or collaboration
   - One interface, one workflow, one mental model

2. **Instant Usability** 
   - No onboarding, no tutorials, no settings
   - User can begin using the service within 5 seconds of landing on the homepage
   - First-time users achieve their intended outcome (adding a todo) on the first try

3. **Personal Ownership** 
   - Data belongs solely to the user — no sharing, no syncing across devices by default, no cloud collaboration
   - Accessible only via verified identity — no public lists, no community features
   - The list is a private tool for self-management, not a team tool

4. **Reliable Persistence** 
   - Tasks are saved permanently until explicitly deleted
   - No risk of loss due to device failure, app closure, or accidental refresh
   - Safer than paper, easier than digital notes

5. **Emotional Safety** 
   - No gamification, no streaks, no pressure to complete
   - No notifications, no reminders, no deadlines — the user sets their own pace
   - The system never judges — whether the list is empty or long, it accepts the user unconditionally

This service doesn’t compete with Notion, Todoist, or Microsoft To Do. It competes with the idea that productivity requires complexity. It replaces the urge to write on a napkin with a clean, reliable, persistent digital alternative.

## Competitive Landscape

The product space includes three categories:

1. **Pro Apps** — Todoist, TickTick, Microsoft To Do
   - Pros: Feature-rich, sync across devices, reminders, collaboration
   - Cons: Steep learning curve, overwhelming UI, perceived as "work tools", subscription fees
   - Mismatch: These are for teams and project managers, not individuals managing personal lists

2. **Minimalist Apps** — Todoist (minimal mode), Apple Notes, Google Keep
   - Pros: Simple interfaces, quick add functionality
   - Cons: Lack persistence guarantees, mixed with notes and reminders, mixed-use platform, missing authentication
   - Mismatch: Not purpose-built for todo list management — these are general-purpose note-taking tools

3. **Offline Paper Systems** — Moleskine, Post-it Notes, Whiteboards
   - Pros: No tech required, familiar, tactile
   - Cons: Easily lost, not searchable, non-digital, un-recoverable if damaged or discarded
   - Mismatch: Fragile, non-portable, disconnected from digital life

The Todo List service wins by offering:
- **The simplicity of paper**
- **The persistence of cloud storage**
- **The privacy of local ownership**
- **The security of authenticated access**
- **The immediacy of zero-click activation**

It fills the zero gap in the market: a purpose-built, web-accessible, authenticated, single-purpose todo list with no compromises beyond the core requirement.

## Success Metrics

Success for this service is defined by behavioral and retention-driven metrics — not feature usage or profitability. This is not a monetization play. It is a user-centered behavioral tool. Success means users find it so useful they never return to paper.

### Primary Success Metrics

1. **Daily Active Users (DAU) / Monthly Active Users (MAU) Ratio** 
   - Target: ≥ 60%
   - A user who returns daily uses this as a habitual tool — it's embedded in their daily routine
   - Below 40% indicates the service is not becoming part of the user’s mental workflow

2. **New User Retention (Day 7)** 
   - Target: ≥ 70%
   - 70% of users who sign up and create their first todo item return within 7 days
   - Measured as: Users who register → Create at least one todo → Log back in within 7 days
   - This measures whether the service solves the core problem of memory overload

3. **Average Todo Items Created per Session** 
   - Target: ≥ 3.5 items
   - If users only create 1–2 items, they may be using it as a temporary scratchpad
   - 3.5+ items indicates the system is replacing their mental todo buffer

4. **Task Completion Rate (Per User)** 
   - Target: ≥ 50% of created items marked complete over 30 days
   - Indicates the service is facilitating progress, not just information storage
   - Very low completion rates suggest users create tasks to "get them out of their head" but don’t trust the system to track progress

5. **Retention Without Re-engagement** 
   - Target: 25% of users return after 90 days without any email notifications or marketing
   - Proves the service stands on its own merit — users come back because it works, not because they’re pestered

### Behavioral Indicators of Success

- User writes multiple todo items in a single session and marks one or more complete without editing
- User adds items in the morning and checks off items in the evening — indicating integration into daily rhythm
- Users return to the app immediately after completing a task — suggesting the system is part of the completion ritual
- No user complaints about "too many features" — consistent across support channels
- No users ask for reminders, categories, or sharing features — meaning the minimalism resonates

### Business Sustainability

This service does not require revenue to be successful. Success is defined by adoption and retention. If the service becomes indispensable to even 10,000 users around the world, it has served its purpose.

If monetization is ever considered, it would be through:
- Optional premium donation (no feature gating)
- Open-source core with optional hosted service fee
- Ethical sponsorship (e.g., from productivity educators)

Revenue is not a goal — usage is.

## Narrative Summary

This service is not about productivity hacks. It isn't for achieving more. It’s about remembering less.

It exists because everyone has a song in their head they can’t remember — and the weight of forgotten tasks weighs heavier than the tasks themselves.

This is a digital memory extension — clean, quiet, and personal — for anyone who’s ever sighed and said, "I just need to remember to..."

No fluff. No bells. No whistles.

Just a list.

And the peace that comes with knowing it's safely there — waiting, not judging, never lost.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*

## Authentication Requirements

### Authentication Flow

WHEN a guest visits the Todo List application, THE system SHALL display a public landing page with option to register or log in. 

WHEN a guest submits a registration form with a valid email and password, THE system SHALL create a new user account with the role of "member" and set account status to "unverified".

WHEN a new user registers, THE system SHALL send a verification email containing a unique, time-limited token to the provided email address.

WHEN a user clicks the verification link in the email, THE system SHALL validate the token, update the account status to "verified", and log the user in automatically.

WHEN an unverified user attempts to access any todo list functionality, THE system SHALL redirect to a verification required page with instructions to complete email verification.

WHEN a user attempts to log in with registered email and password, THE system SHALL validate credentials and, if correct, issue a JWT access token and refresh token.

WHEN a user’s login credentials are invalid, THE system SHALL return HTTP 401 Unauthorized with error message "Invalid email or password" and SHALL not disclose which credential was incorrect.

WHEN a user logs out, THE system SHALL delete the client-side token and invalidate the current session on the server.

WHEN the access token expires, THE system SHALL automatically attempt to refresh the session using the refresh token stored in HTTP cookie.

WHEN a refresh token is invalid, expired, or revoked, THE system SHALL return HTTP 401 Unauthorized and require the user to log in again.

WHEN a user resets their password via the "Forgot Password" flow, THE system SHALL send a time-limited reset link to the registered email address.

WHEN a user submits a new password via the reset link, THE system SHALL validate the token, update the password, and logout all active sessions for the user.

### User Actor Permissions Matrix

#### Guest Actor

WHEN a guest attempts to view todo items, THE system SHALL deny access and display message: "Please log in to view your tasks."

WHEN a guest attempts to create a todo item, THE system SHALL deny access and return HTTP 401 Unauthorized.

WHEN a guest attempts to update or delete a todo item, THE system SHALL deny access and return HTTP 401 Unauthorized.

WHEN a guest attempts to access the profile page, THE system SHALL redirect to the login page.

WHEN a guest attempts to access any API endpoint protected by authentication, THE system SHALL return HTTP 401 Unauthorized.

#### Member Actor

WHEN a member accesses the todo list interface, THE system SHALL display only todo items created by that user.

WHEN a member creates a new todo item, THE system SHALL assign the item to the authenticated user’s ID and set status to "pending".

WHEN a member updates a todo item, THE system SHALL verify that the item’s user ID matches the authenticated member’s ID before allowing the update.

WHEN a member deletes a todo item, THE system SHALL verify that the item’s user ID matches the authenticated member’s ID before allowing deletion.

WHEN a member attempts to update or delete a todo item created by another user, THE system SHALL return HTTP 403 Forbidden with message "You do not have permission to modify this item."

WHEN a member changes their password, THE system SHALL require current password verification before updating.

WHEN a member logs out from one device, THE system SHALL not affect active sessions on other devices.

WHEN a member chooses "Revoke All Sessions", THE system SHALL invalidate all refresh tokens associated with their account and require re-authentication on all devices.

### Token Management Strategy

#### JWT Token Structure

THE system SHALL use JWT access tokens and refresh tokens for all authentication sessions.

THE access token SHALL be signed using HS256 algorithm with a server-side secret key.

THE refresh token SHALL be a cryptographically secure random string stored in the database with user association.

THE access token payload SHALL contain:
- "userId": string (unique user identifier)
- "role": string ("member" for authenticated users)
- "iat": number (ISO timestamp of issuance)
- "exp": number (ISO timestamp of expiration, 15 minutes after issuance)

THE refresh token payload SHALL contain:
- "userId": string (unique user identifier)
- "jti": string (unique JWT ID)
- "iat": number (ISO timestamp of issuance)
- "exp": number (ISO timestamp of expiration, 30 days after issuance)

THE access token SHALL be stored client-side in memory (not localStorage or cookies) for security.

THE refresh token SHALL be stored client-side in an HTTP-only, Secure, SameSite=Strict cookie.

THE server SHALL maintain a list of revoked refresh tokens to prevent token reuse.

WHEN a new refresh token is issued, THE system SHALL invalidate all previous refresh tokens for that user.

### Session Lifecycle

WHILE a user is authenticated and has a valid access token, THE system SHALL allow access to protected resources.

WHEN the access token expires (15 minutes after issuance), THE system SHALL automatically attempt to refresh the token using the refresh token.

WHEN a refresh token is valid and not revoked, THE system SHALL issue a new access token and reset its expiration timer.

WHEN the refresh token expires (30 days after issuance), THE system SHALL require the user to re-authenticate with email and password.

WHEN a user logs out manually, THE system SHALL delete the refresh token cookie and add the used refresh token to the revoked list.

WHEN the system detects a user has been inactive for over 30 minutes, THE system SHALL automatically invalidate the session.

WHEN an account is deleted, THE system SHALL immediately invalidate all active access and refresh tokens for that user.

WHEN an account is blocked or suspended, THE system SHALL immediately invalidate all active tokens.

WHEN a user changes their password, THE system SHALL invalidate all refresh tokens associated with that account.

WHEN a user logs in from a new device, THE system SHALL store the device fingerprint (user agent + IP region) and log the event for audit trail.

### Password Management

THE system SHALL require passwords to be at least 12 characters in length.

THE system SHALL require passwords to contain at least one uppercase letter, one lowercase letter, one digit, and one special character.

THE system SHALL not store passwords in plain text. All passwords SHALL be hashed using bcrypt with a work factor of 12.

THE system SHALL prevent common, easily guessable passwords (e.g., "password123", "todolist2025") and return appropriate error messages.

THE system SHALL allow users to change their password and SHALL require re-authentication with the current password before allowing the change.

THE system SHALL prevent users from reusing any of their previous 5 passwords.

THE system SHALL implement account lockout after 5 consecutive failed login attempts for a given email.

WHEN a user exceeds 5 failed login attempts, THE system SHALL lock the account for 15 minutes and notify the user via email.

WHEN an account is locked, THE system SHALL allow the user to unlock via the "Forgot Password" link.

WHEN a user attempts to use the same password as the last five used, THE system SHALL return error: "You cannot reuse a recently used password."

## Functional Requirements

This document defines all functional requirements for the Todo List application using the EARS (Easy Approach to Requirements Syntax) format. All requirements are written in natural business language with EARS keywords in English and descriptions in en-US. This document is intended for backend developers building the application and must be implemented exactly as specified.

### Todo Item Creation

WHEN a member attempts to create a new todo item, THE system SHALL validate that the title is provided and not empty. 

WHEN a member attempts to create a new todo item, THE system SHALL validate that the title contains at least one non-whitespace character. 

WHEN a member attempts to create a new todo item, THE system SHALL validate that the title does not exceed 1000 characters in length. 

WHEN a member attempts to create a new todo item, THE system SHALL validate that the description, if provided, does not exceed 5000 characters in length. 

WHEN a member successfully provides a valid title and optional description, THE system SHALL create a new todo item with the following default properties: status set to "pending", createdAt set to the current timestamp, and updatedAt set to the same value as createdAt. 

WHEN a member successfully creates a todo item, THE system SHALL assign the item to the authenticated user's account and ensure other users cannot access it. 

WHEN a guest attempts to create a todo item, THE system SHALL deny the request and return HTTP 401 with error code AUTH_REQUIRED. 

IF the title is empty or contains only whitespace characters, THEN THE system SHALL return HTTP 400 with error code TODO_TITLE_REQUIRED. 

IF the title exceeds 1000 characters, THEN THE system SHALL return HTTP 400 with error code TODO_TITLE_TOO_LONG. 

IF the description exceeds 5000 characters, THEN THE system SHALL return HTTP 400 with error code TODO_DESCRIPTION_TOO_LONG. 

### Todo Item Retrieval

WHEN a member requests to retrieve their todo items, THE system SHALL return all todo items belonging to that user, sorted by createdAt in descending order (newest first). 

WHEN a member requests to retrieve a specific todo item by ID, THE system SHALL validate that the item exists and belongs to the authenticated user. 

WHEN a member requests to retrieve a specific todo item by ID, THE system SHALL return the item's full details including: id, title, description, status, createdAt, and updatedAt. 

WHEN a member requests to retrieve their todo items, THE system SHALL return at most 100 items per page. 

WHEN a member requests to retrieve their todo items with pagination parameters (page and limit), THE system SHALL return the requested page of results, respecting the limit parameter up to 100. 

IF the requested todo item ID does not exist or does not belong to the authenticated user, THEN THE system SHALL return HTTP 404 with error code TODO_NOT_FOUND. 

IF the page parameter is less than 1, THEN THE system SHALL return HTTP 400 with error code PAGINATION_INVALID_PAGE. 

IF the limit parameter is less than 1 or greater than 100, THEN THE system SHALL return HTTP 400 with error code PAGINATION_INVALID_LIMIT. 

WHILE a member is authenticated, THE system SHALL always enforce ownership checks before returning any todo item data. 

### Todo Item Updates

WHEN a member attempts to update an existing todo item, THE system SHALL validate that the item exists and belongs to the authenticated user. 

WHEN a member updates a todo item's title, THE system SHALL validate that the new title is not empty and contains at least one non-whitespace character. 

WHEN a member updates a todo item's title, THE system SHALL validate that the new title does not exceed 1000 characters in length. 

WHEN a member updates a todo item's description, THE system SHALL validate that the new description does not exceed 5000 characters in length. 

WHEN a member updates any field of a todo item, THE system SHALL update the updatedAt timestamp to the current time. 

WHEN a member updates a todo item, THE system SHALL allow partial updates (e.g., updating title without touching description). 

WHEN a member successfully updates a todo item, THE system SHALL return the updated item with all current properties. 

IF the requested todo item ID does not exist or does not belong to the authenticated user, THEN THE system SHALL return HTTP 404 with error code TODO_NOT_FOUND. 

IF the new title is empty or contains only whitespace characters, THEN THE system SHALL return HTTP 400 with error code TODO_TITLE_REQUIRED. 

IF the new title exceeds 1000 characters, THEN THE system SHALL return HTTP 400 with error code TODO_TITLE_TOO_LONG. 

IF the new description exceeds 5000 characters, THEN THE system SHALL return HTTP 400 with error code TODO_DESCRIPTION_TOO_LONG. 

### Todo Item Deletion

WHEN a member requests to delete a todo item, THE system SHALL validate that the item exists and belongs to the authenticated user. 

WHEN a member successfully deletes a todo item, THE system SHALL remove the item from the database permanently. 

WHEN a member requests to delete a todo item, THE system SHALL return HTTP 204 No Content upon successful deletion. 

IF the requested todo item ID does not exist or does not belong to the authenticated user, THEN THE system SHALL return HTTP 404 with error code TODO_NOT_FOUND. 

IF a member attempts to delete a todo item that is not theirs, THEN THE system SHALL return HTTP 404 with error code TODO_NOT_FOUND (to prevent enumeration of other users' items). 

### Todo Item Status Management

WHEN a member marks a todo item as completed, THE system SHALL change the status from "pending" to "completed". 

WHEN a member marks a todo item as pending, THE system SHALL change the status from "completed" to "pending". 

WHEN a member attempts to set a todo item's status to any value other than "pending" or "completed", THE system SHALL return HTTP 400 with error code TODO_INVALID_STATUS. 

WHEN a todo item's status is updated, THE system SHALL update the updatedAt timestamp to the current time. 

WHEN a todo item's status is updated, THE system SHALL preserve all other properties unchanged (title, description, createdAt). 

WHILE a todo item's status is "pending", THE system SHALL consider the item as active and visible in standard lists. 

WHILE a todo item's status is "completed", THE system SHALL consider the item as archived and not included in active task counts by default. 

### Bulk Operations

WHEN a member requests to delete multiple todo items in one operation, THE system SHALL validate that each item ID exists and belongs to the authenticated user. 

WHEN a member requests to delete multiple todo items in one operation, THE system SHALL delete only those items that belong to the authenticated user and ignore any IDs belonging to other users. 

WHEN a member requests to update the status of multiple todo items to "completed" in one operation, THE system SHALL validate that each item ID exists and belongs to the authenticated user. 

WHEN a member requests to update the status of multiple todo items to "completed" in one operation, THE system SHALL update only those items that belong to the authenticated user and ignore any IDs belonging to other users. 

WHEN a member requests to update the status of multiple todo items to "completed" in one operation, THE system SHALL update the updatedAt timestamp for each successfully updated item. 

WHEN a member requests to update the status of multiple todo items to "completed" in one operation, THE system SHALL return the count of successfully updated items. 

WHEN a member requests to update the status of multiple todo items to "pending" in one operation, THE system SHALL validate that each item ID exists and belongs to the authenticated user. 

WHEN a member requests to update the status of multiple todo items to "pending" in one operation, THE system SHALL update only those items that belong to the authenticated user and ignore any IDs belonging to other users. 

WHEN a member requests to update the status of multiple todo items to "pending" in one operation, THE system SHALL update the updatedAt timestamp for each successfully updated item. 

WHEN a member requests to update the status of multiple todo items to "pending" in one operation, THE system SHALL return the count of successfully updated items. 

IF any item ID in a bulk operation does not exist or belongs to another user, THE system SHALL NOT fail the entire operation but shall process all valid items and return a success response with the count of items processed. 

### Data Persistence

WHEN a todo item is created, THE system SHALL persist it in a durable storage system with atomic write operations. 

WHEN a todo item is updated, THE system SHALL persist the changes with atomic write operations ensuring data consistency. 

WHEN a todo item is deleted, THE system SHALL permanently remove it from storage with no possibility of recovery. 

WHILE the system is running, THE system SHALL ensure that all todo items are completely and correctly persisted to storage. 

WHERE a user deletes their account, THE system SHALL also delete all todo items associated with that user's account. 

WHEN a system backup is performed, THE system SHALL include all todo items in the backup data with full fidelity. 

WHERE a system restore is performed from backup, THE system SHALL restore all todo items with their original attributes (title, description, status, createdAt, updatedAt, userId). 

WHEN a todo item is created, THE system SHALL assign a globally unique identifier (UUID v4) as the item's id. 

WHEN a todo item is retrieved, THE system SHALL return the id as a string in UUID v4 format (36 characters with hyphens). 

WHEN a todo item's createdAt or updatedAt timestamp is returned, THE system SHALL use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.SSSZ). 

WHEN a todo item's status is returned, THE system SHALL use one of two exact string values: "pending" or "completed". 

WHERE a todo item's title or description is omitted in a request, THE system SHALL retain the existing value during updates. 

IF a network interruption occurs during a todo item write operation, THEN THE system SHALL ensure no partial or corrupted data is persisted. 

IF a database failure occurs, THEN THE system SHALL return HTTP 500 with error code DB_ERROR and maintain all existing data integrity. 

IF a concurrent update is attempted on the same todo item by the same user, THEN THE system SHALL allow and process the update without conflict (no optimistic locking required). 

WHERE a user creates a todo item with the exact same title and description as another of their existing items, THE system SHALL permit the creation without duplication prevention. 

IF a user attempts to create a todo item with a null or undefined title, THEN THE system SHALL return HTTP 400 with error code TODO_TITLE_REQUIRED. 

IF a user attempts to create a todo item with a null or undefined description, THE system SHALL accept the request and store the description as null (not an empty string). 

IF a user attempts to update a todo item with a null title, THEN THE system SHALL return HTTP 400 with error code TODO_TITLE_REQUIRED. 

IF a user attempts to update a todo item with a null description, THE system SHALL accept the request and set the description to null. 

IF a user attempts to update a todo item's status to an empty string, THEN THE system SHALL return HTTP 400 with error code TODO_INVALID_STATUS. 

IF a user attempts to update a todo item's status to a non-allowed string (e.g., "in-progress"), THEN THE system SHALL return HTTP 400 with error code TODO_INVALID_STATUS. 

WHEN a member retrieves their todo items, THE system SHALL only return items with status either "pending" or "completed". 

WHEN a member retrieves their todo items, THE system SHALL not return deleted items under any circumstances. 

WHERE a todo item's id is used in a request, THE system SHALL validate that it is a valid UUID v4 format before proceeding. 

IF a todo item id in a request is not a valid UUID v4 format, THEN THE system SHALL return HTTP 400 with error code TODO_INVALID_ID_FORMAT. 

IF a todo item id in a request is not a valid string (e.g., a number or object), THEN THE system SHALL return HTTP 400 with error code TODO_INVALID_ID_FORMAT. 

IF a todo item id in a request is missing, THEN THE system SHALL return HTTP 400 with error code TODO_ID_REQUIRED. 

IF a todo item id in a bulk operation is not a valid string, THE system SHALL ignore it and continue processing valid IDs. 

IF the system is under heavy load and cannot process a request within 5 seconds, THEN THE system SHALL return HTTP 504 with error code TIMEOUT. 

WHERE a todo item is created through the API, THE system SHALL generate the UUID v4 id server-side and never accept it from the client. 

WHERE a todo item's status is changed by the user, THE system SHALL never allow the status to be updated to any value outside of "pending" or "completed". 

WHERE a todo item's status is changed by the system (e.g., via automation), THE system SHALL never allow the status to be updated to any value outside of "pending" or "completed". 

IF the user attempts to update a todo item's createdAt timestamp, THEN THE system SHALL ignore the provided value and retain the original timestamp. 

IF the user attempts to update a todo item's updatedAt timestamp, THE system SHALL ignore the provided value and set it to the current server time. 

IF the user attempts to include userId in a create or update request, THE system SHALL ignore the provided value and use only the authenticated user's id. 

IF a user attempts to set createdAt or updatedAt to a value that is not an ISO 8601 string, THEN THE system SHALL return HTTP 400 with error code INVALID_TIMESTAMP_FORMAT. 

IF a request contains malformed JSON, THEN THE system SHALL return HTTP 400 with error code INVALID_JSON. 

IF the request headers are malformed or missing required authentication tokens, THEN THE system SHALL return HTTP 401 with error code AUTH_INVALID_TOKEN. 

IF a request includes content-type other than application/json, THEN THE system SHALL return HTTP 415 with error code UNSUPPORTED_MEDIA_TYPE. 

IF a user attempts to make a POST, PUT, or DELETE request without authorization, THE system SHALL return HTTP 401 with error code AUTH_REQUIRED. 

IF a user makes a GET request without a valid session, THE system SHALL return HTTP 401 with error code AUTH_REQUIRED. 

IF a user makes any request to the API without a valid origin header (CORS), THE system SHALL return HTTP 403 with error code CORS_VIOLATION.

## Business Rules

This document defines the core business rules that govern the behavior, validation, lifecycle, and access control of todo items within the Todo List service. These rules are written in natural language and use EARS format to ensure clarity, testability, and implementation readiness for backend developers. All rules are derived from the defined user actors (guest and member) and the overall system scope. Technical implementation details such as database schemas, API endpoints, or code structures are intentionally excluded.

### Todo Item Validation Rules

Todo items must adhere to strict input constraints to ensure data integrity and prevent malformed entries.

WHEN a user submits a new todo item, THE system SHALL validate that the title property is not empty or consists only of whitespace characters.

WHEN a user submits a new todo item, THE system SHALL validate that the title property contains no more than 200 characters.

WHEN a user submits a new todo item, THE system SHALL validate that the description property, if provided, contains no more than 1000 characters.

WHEN a user submits a new todo item, THE system SHALL validate that the title property is not null.

WHEN a user submits a new todo item, THE system SHALL validate that the completed property, if provided, is a boolean value.

WHILE a todo item is being updated, THE system SHALL re-apply all validation rules defined above.

### Duplicate Item Prevention

The system must prevent identical todo items from being created multiple times by the same user to avoid clutter and confusion.

IF a user attempts to create a todo item with a title and description that exactly matches an existing todo item owned by the same user, THEN THE system SHALL reject the request and return a user-friendly message indicating that a duplicate item already exists.

WHERE a user has submitted a todo item with the same title as another item, but a different description, THE system SHALL accept the new item as a distinct entry.

WHERE a user has submitted a todo item with the same title and description as an already deleted item, THE system SHALL allow the creation of the new item, as deletion resets the uniqueness constraint.

### Access Control Rules

Access to todo items is strictly limited to the user who created them. No cross-user access or visibility is permitted.

WHEN a user attempts to retrieve a todo item, THE system SHALL only return items where the owner ID matches the authenticated user's ID.

WHEN a user attempts to update a todo item, THE system SHALL verify that the todo item's owner ID matches the authenticated user's ID; if not, THE system SHALL deny the request.

WHEN a user attempts to delete a todo item, THE system SHALL verify that the todo item's owner ID matches the authenticated user's ID; if not, THE system SHALL deny the request.

IF a user attempts to access a todo item by ID that was created by another user, THEN THE system SHALL return HTTP 404 (Not Found) as though the item does not exist.

IF a guest (unauthenticated user) attempts to create, update, or delete a todo item, THEN THE system SHALL deny the request and return HTTP 401 (Unauthorized).

### Status Transition Rules

Todo items have a lifecycle defined by their completion status. Transitions between states are strictly controlled.

WHEN a todo item is created, THE system SHALL set its completed status to false by default.

WHEN a user marks a todo item as completed, THE system SHALL update the completed property to true and record the timestamp of the change.

WHEN a user unmarks a completed todo item, THE system SHALL update the completed property to false and record the timestamp of the change.

WHILE a todo item is marked as completed, THE system SHALL allow the user to toggle its status back to incomplete at any time.

WHILE a todo item is marked as incomplete, THE system SHALL allow the user to toggle its status to completed at any time.

IF a user attempts to set the completed property to a value other than true or false, THEN THE system SHALL ignore the invalid value and retain the existing status.

### Soft Delete Logic

Deletion of todo items is implemented as a soft delete to preserve data integrity and enable potential recovery.

WHEN a user deletes a todo item, THE system SHALL set the deletedAt property to the current timestamp and mark the item as logically deleted.

WHILE a todo item has a non-null deletedAt value, THE system SHALL exclude it from all list responses and detail retrievals.

WHILE a todo item is logically deleted, THE system SHALL prevent any update or reactivation attempts except for permanent deletion.

IF a user attempts to restore a deleted todo item by setting deletedAt to null, THEN THE system SHALL reject the request and return a message indicating that restoration is not supported.

IF a user attempts to create a new todo item with the same title and description as a logically deleted item owned by the same user, THEN THE system SHALL permit the creation, as the deleted item does not count against duplicate prevention.

### Default Behavior Rules

The system defines consistent, intuitive behaviors for edge cases and unprovided inputs.

WHEN a user creates a todo item without providing a description, THE system SHALL store the description as an empty string.

WHEN a user creates a todo item without providing the completed flag, THE system SHALL treat it as false.

WHEN a user updates a todo item without including the description field, THE system SHALL retain the existing description value.

WHEN a user updates a todo item without including the completed field, THE system SHALL retain the existing completed status.

WHEN a user views their todo list and no items exist, THE system SHALL return an empty list without error.

WHERE a user has no todo items, THE system SHALL display an empty list state with a message indicating that no tasks are pending.

WHEN a user logs in for the first time, THE system SHALL display an empty todo list initialized with no items.

IF a user's session expires and they attempt to perform any action on a todo item, THEN THE system SHALL redirect them to the login page and preserve their intended destination for post-authentication redirection.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*

## User Journey

### Guest Journey: First Visit to Registration

WHEN a guest lands on the homepage of the Todo List service, THE system SHALL display a clean, minimal interface with a single prominent button labeled "Get Started".

WHEN a guest clicks "Get Started", THE system SHALL navigate to the registration page.

WHEN a guest enters an email address in the email field, THE system SHALL validate the format is an email pattern and display real-time feedback if invalid.

WHEN a guest enters a password in the password field, THE system SHALL show a password strength indicator and validate compliance with complexity rules (12+ characters, uppercase, lowercase, digit, special character) as input progresses.

WHEN a guest submits the registration form, THE system SHALL create a new account in "unverified" state, send a verification email, and display a confirmation message: "Check your email to verify your account."

WHEN a guest uses a different device and returns to the homepage, THE system SHALL display the same landing page with "Get Started" button and no memory of previous session.

### Member Journey: Logging In

WHEN a member returns to the Todo List service, THE system SHALL display the homepage with both "Register" and "Log In" buttons.

WHEN a member clicks "Log In", THE system SHALL display a form requesting email and password.

WHEN a member submits correct email and password, THE system SHALL issue a short-lived access token and a long-lived refresh token, store the refresh token in a secure HTTP-only cookie, and redirect to the todo list dashboard.

WHEN a member submits incorrect credentials, THE system SHALL return an error message: "Invalid email or password" without specifying which field was wrong.

WHEN a member has a valid refresh token cached in a cookie and clicks the app logo on the dashboard, THE system SHALL silently refresh the access token if expired and maintain session state without interruption.

WHEN a member manually logs out, THE system SHALL delete the refresh token cookie and clear all browser state for the app, forcing re-authentication on next visit.

### Member Journey: Creating a Todo Item

WHEN a member is on the todo list dashboard and sees the "Add a task" input field, THE system SHALL allow typing of up to 1000 characters.

WHEN a member types the task title and presses Enter, THE system SHALL immediately create the todo item with status "pending", assign it to the member’s account, and display it in the list.

WHEN a member submits an empty or whitespace-only task title, THE system SHALL prevent submission and show a tooltip: "Task title cannot be empty."

WHEN a member types a title exceeding 1000 characters, THE system SHALL truncate the input visually and display warning: "Maximum 1000 characters allowed."

WHEN a member adds a description field and enters text (up to 5000 characters), THE system SHALL anchor the description below the title and make it expandable.

WHEN a member adds a new todo item, THE system SHALL sort the list so the newest item appears at the top.

### Member Journey: Marking Todo as Completed

WHEN a member views a todo item in the "pending" state, THE system SHALL display a checkbox to the left of the task.

WHEN a member clicks the checkbox, THE system SHALL immediately change the task status to "completed" and strike through the text.

WHEN a task is marked completed, THE system SHALL update the updatedAt timestamp and persist the change instantly.

WHEN a task is marked completed, THE system SHALL not remove it from the list — it shall remain visible in an archived section.

WHEN a member clicks the checkbox again on a "completed" task, THE system SHALL revert it to "pending" and remove the strikethrough.

WHEN a new todo is marked completed, THE system SHALL not require a confirmation dialog.

### Member Journey: Editing an Existing Todo

WHEN a member hovers over a todo item, THE system SHALL display an edit icon (pencil) next to the task title.

WHEN a member clicks the edit icon, THE system SHALL make the task title and description editable in-place.

WHEN a member begins editing, THE system SHALL preserve the original value and allow incremental changes.

WHEN a member presses Enter or clicks away from the field, THE system SHALL validate the new title and description for length and content.

WHEN the valid update is submitted, THE system SHALL update the item and persist the change immediately.

WHEN an invalid update is submitted (e.g., empty title), THE system SHALL revert to the original value and show an error message below the field.

WHEN a member edits a todo item, THE system SHALL update the updatedAt property, but preserve createdAt.

### Member Journey: Deleting a Todo

WHEN a member hovers over a todo item, THE system SHALL display a delete icon (trash bin) next to the edit icon.

WHEN a member clicks the delete icon, THE system SHALL immediately remove the item from the UI and send a DELETE request to the API.

WHEN deletion is successful, THE system SHALL permanently erase the item from storage — no trash bin, no recovery.

WHEN deletion fails, THE system SHALL show an inline error message: "Failed to delete task. Please try again." and restore the item to the list.

WHEN a member deletes a task, THE system SHALL NOT ask for confirmation — deletion is immediate and irreversible.

### Member Journey: Logging Out

WHEN a member clicks their profile name in the top right corner, THE system SHALL display a dropdown menu with "Logout" as the only option.

WHEN a member clicks "Logout", THE system SHALL make a POST request to /auth/logout endpoint, clear the refresh token cookie, and redirect to the homepage.

WHEN logging out succeeds, THE system SHALL display a toast message: "You have been logged out."

WHEN logging out fails, THE system SHALL show a notification: "Could not log out. Please try again." and maintain the current session.

## Error Handling

### Authentication Failures

WHEN a user enters an incorrect password, THE system SHALL return HTTP 401 with error code AUTH_INVALID_CREDENTIALS.

WHEN a user attempts to log in with an unverified account, THE system SHALL return HTTP 401 with error code AUTH_ACCOUNT_NOT_VERIFIED.

WHEN a user supply an invalid JWT access token, THE system SHALL return HTTP 401 with error code AUTH_INVALID_TOKEN.

WHEN a user’s JWT access token is expired, THE system SHALL attempt to refresh using the refresh token. If refresh fails, THE system SHALL return HTTP 401 with error code AUTH_TOKEN_EXPIRED.

WHEN a user’s refresh token is revoked, THE system SHALL return HTTP 401 with error code AUTH_REFRESH_TOKEN_REVOKED.

WHEN a user’s refresh token is malformed or missing, THE system SHALL return HTTP 401 with error code AUTH_REFRESH_TOKEN_MISSING.

### Validation Errors

WHEN a todo item title is empty, THE system SHALL return HTTP 400 with error code TODO_TITLE_REQUIRED.

WHEN a todo item title exceeds 1000 characters, THE system SHALL return HTTP 400 with error code TODO_TITLE_TOO_LONG.

WHEN a todo item description exceeds 5000 characters, THE system SHALL return HTTP 400 with error code TODO_DESCRIPTION_TOO_LONG.

WHEN a todo item status is set to an invalid value, THE system SHALL return HTTP 400 with error code TODO_INVALID_STATUS.

WHEN a todo item ID is malformed or not a valid UUID, THE system SHALL return HTTP 400 with error code TODO_INVALID_ID_FORMAT.

WHEN a user attempts to update a field not permitted (e.g., userId, createdAt), THE system SHALL return HTTP 400 with error code TODO_FIELD_IMMUTABLE.

WHEN a request body cannot be parsed as JSON, THE system SHALL return HTTP 400 with error code INVALID_JSON.

WHEN a user attempts to use an unsupported Content-Type, THE system SHALL return HTTP 415 with error code UNSUPPORTED_MEDIA_TYPE.

### Resource Not Found

WHEN a todo item ID is valid but does not exist in the database, THE system SHALL return HTTP 404 with error code TODO_NOT_FOUND.

WHEN a todo item ID belongs to another user, THE system SHALL return HTTP 404 with error code TODO_NOT_FOUND (to prevent account enumeration).

WHEN a user requests a non-existent route (e.g., /api/v1/todo/12345), THE system SHALL return HTTP 404 with error code PATH_NOT_FOUND.

### Concurrency Conflicts

WHEN two requests attempt to update the same todo item simultaneously, THE system SHALL process both in order and allow the last write to succeed — no optimistic locking enforced.

WHEN a user edits a todo item and another user deletes it before the save request completes, THE system SHALL return HTTP 404 with error code TODO_NOT_FOUND on the first user’s response.

### System Failures

WHEN the database connection is lost during a request, THE system SHALL return HTTP 500 with error code DB_CONNECTION_FAILED.

WHEN the email service is down during verification or passwordReset, THE system SHALL return HTTP 500 with error code EMAIL_SERVICE_UNAVAILABLE.

WHEN the server is under heavy load and exceeds 5-second response threshold, THE system SHALL return HTTP 504 with error code TIMEOUT.

WHEN a server-side bug or unhandled exception occurs, THE system SHALL return HTTP 500 with error code SERVER_ERROR and log the exception for audit.

### Recovery Procedures

WHEN the system encounters an error, THE system SHALL:
- Return standardized error messages in JSON format with code and message
- Never expose stack traces, filenames, or internal details to the client
- Log detailed errors server-side for operational review
- Implement circuit breaker patterns for dependent services (email, auth)
- After 3 consecutive failures of the email service, auto-disable new registration until manually re-enabled

## Performance Expectations

### Login Response Time

WHEN a user logs in with correct credentials, THE system SHALL respond with authentication token in under 200ms.

WHEN a user logs in with incorrect credentials, THE system SHALL respond in under 150ms.

WHEN 100 users simultaneously attempt login during peak load, THE system SHALL maintain 95% of requests under 500ms.

### Todo Creation Latency

WHEN a member creates a new todo item, THE system SHALL persist the item and return the full object within 100ms.

WHEN the system is under 200 concurrent writes per minute, THE system SHALL maintain 99% of create operations under 200ms.

### Todo List Loading Speed

WHEN a member opens their todo list (default 100 items), THE system SHALL load and render the list within 300ms.

WHEN pagination is used (page=5, limit=50), THE system SHALL respond with data within 250ms.

WHEN a user has more than 10,000 todo items, THE system SHALL still return the first page under 500ms.

### Todo Update Response

WHEN a member updates a todo item, THE system SHALL persist and return the updated item within 150ms.

WHEN a member updates 10 items in bulk, THE system SHALL complete and respond within 400ms.

### Network Conditions

WHEN a user is on a 3G network (150ms latency), THE system SHALL still maintain acceptable perceived speed by optimizing bundle size and minimizing HTTP requests.

WHEN a user has intermittent connectivity, THE system SHALL:
- Persist local changes in browser cache
- Queue pending requests
- Sync automatically when reconnected

### System Scalability

WHEN concurrent users exceed 10,000, THE system SHALL:
- Scale horizontally using container orchestration
- Shard database read replicas for high-read-downloads
- Use Redis for token validation caching
- Handle up to 100 write requests per second without degradation

## Security and Compliance

### Data Privacy

WHEN a user registers, THE system SHALL only collect email and password (no phone, name, or profile data).

WHEN a user deletes their account, THE system SHALL permanently erase ALL associated data, including todo items, and purge any backups within 7 days.

WHEN data is transmitted, THE system SHALL use TLS 1.3 encrypted connections.

WHEN a user accesses the app, THE system SHALL NOT store or transmit any usage analytics unless explicitly opted into.

### Authentication Security

WHEN JWT access tokens are issued, THE system SHALL use HS256 algorithm with a server-side secret.

WHEN refresh tokens are issued, THE system SHALL generate them using cryptographically secure random number generation (128+ bits entropy).

WHEN JWT is validated, THE system SHALL verify signature, expiration, and issuer against explicit trusted sources.

WHEN refresh tokens are stored, THE system SHALL always use a server-side index linked to user ID — not the token value itself.

### Password Security

WHEN a password is received, THE system SHALL NEVER log it, store it in plaintext, or send it anywhere in response.

WHEN passwords are hashed, THE system SHALL use bcrypt with a work factor of 12.

WHEN password changes occur, THE system SHALL invalidate all active sessions and refresh tokens immediately.

WHEN password resets are triggered, THE system SHALL generate time-bound one-time-use links expiring in 1 hour.

### Session Security

WHEN a refresh token is issued, THE system SHALL store it in an HTTP-only, SameSite=Strict, Secure cookie.

WHEN a user logs out, THE system SHALL immediately add the refresh token to a server-side revoked token list.

WHEN a user changes device, THE system SHALL log the new device (user agent, IP region) and notify the user if new device detected.

WHEN a user orders "Revoke All Sessions", THE system SHALL invalidate ALL refresh tokens bound to their account, regardless of device.

### Data Retention Policy

WHEN a user creates a todo item, THE system SHALL store it persistently until explicitly deleted by the user.

WHEN a user deletes a todo item, THE system SHALL remove it from primary storage and purge it from all backups within 30 days.

WHEN a user deletes their account, THE system SHALL completely erase their entire data footprint within 7 days with cryptographic sanitation.

The system does not store any metadata beyond what is necessary to enforce access control and persistence.

### Regulatory Compliance

THE system SHALL comply with the Privacy by Design principles.

THE system SHALL operate as a single-purpose, personal tool — meeting GDPR Article 25 and CCPA privacy by default.

THE system SHALL NOT collect personal data beyond email and auth tokens.

THE system SHALL NOT engage in tracking, profiling, or functional advertising.

THE system SHALL provide implied consent only — no pop-ups, no banners, no cookie notices.

THE system SHALL comply with all jurisdiction-specific laws on data sovereignty — no data is stored outside the EU or US unless user explicitly chooses otherwise.

Where regional compliance (e.g., HIPAA, FERPA) is required, THE system SHALL isolate data for such users in dedicated, audit-tracked storage.

## Future Considerations

### Feature Expansion Possibilities

Potential future enhancements include:
- Archive toggle: View completed items in a separate tab
- Search bar: Filter todos by keyword
- Due date reminder: Optional future due dates (non-interruptive)
- Export as plain text: Copy entire list with formatting
- Dark mode: System-wide color scheme preference
- Keyboard shortcuts: Add = Enter, Complete = Spacebar
- Multi-language support: Interface translation based on browser locale
- Weekly summary: Email notification of completed tasks (opt-in)
- Version history: Optional timeline of edits for critical notes
- Security key: Optional 2FA using WebAuthn
- Optional embeddable widget: For use on personal homepages or digital displays

### Integration Opportunities

Future integrations may include:
- Calendar APIs (Google, Outlook): Surface recurring todo as events
- Elapsed time tracking: Integrate with time logging services (Toggl, Clockify)
- Email-to-todo: Forward emails as todos with auto-extracted body
- Web clipper: Add page as todo with link and selected text
- IFTTT/Zapier: Automate todo creation from external triggers
- Voice assistant: "Add to my todo list: Pick up groceries"
- Browser extension: Add web pages or highlights as todos

### User Experience Enhancements

UX improvements that maintain the minimalist ethos:
- Auto-focus on add field on page load
- Smart typing: Auto-capitalize first letter, auto-paragraph on Enter twice
- Visual feedback: Gentle animation on item creation, smooth transitions on toggle
- Loading state: Skeleton list during initial load
- Accessibility: Full keyboard navigation, screen reader compatibility
- Undo delete: Local, in-memory undo for 5 seconds after deletion
- Tap to complete: Mobile gesture to tap item to toggle completion
- Sticky session: Resume last used view (active, completed, all)

### Scalability Considerations

As user base scales:
- Shard database by user ID range to distribute load
- Introduce dedicated read database nodes
- Use CDN to cache static assets globally
- Offload non-critical operations (email, analytics) to message queues
- Implement auto-scaling groups triggered by CPU and request rate
- Monitor for sudden bursts in activity (likely when vacuum cleaner company advertises on TikTok)
- Log interactions, but anonymize and rotate logs weekly

### Monetization Pathways

Monetization is not desired unless revenue is ethically aligned with the service’s non-commercial mission.

Possible ethical monetization options:
- Donation button: "Support this service" — one-time, no push, no data collection
- Premium hosting: $2/month for users who want no ads, non-intrusive analytics
- Open-source core: Give away the backend as MIT license, offer managed hosting
- Partner features: Allow students to link to school platform (no data sharing)
- Curated newsletter: Weekly article on minimalism, sent to opt-in users only
- Print-on-demand: Tourist-grade notebooks of "Your Todo List, 2025" — POSTPAYMENT

The only valid revenue model is transparency, trust, and respect. Revenue without integrity is worse than none.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*