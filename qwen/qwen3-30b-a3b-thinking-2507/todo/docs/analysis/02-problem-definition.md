# Multi-User Todo Application Requirements Specification

## 1. User Account Management

**Authentication Workflow**:

WHEN a user initiates sign-up, THE system SHALL validate email format and require password meeting complexity requirements (minimum 8 characters with uppercase, lowercase, and special characters). IF email already registered OR password does not meet complexity, THEN system SHALL return 400 error with specific reason and prevent account creation. WHEN user submits valid sign-up data, THE system SHALL generate confirmation token, send verification email within 2 seconds, and set account status to 'pending' until email confirmed.

WHEN a user attempts to log in, THE system SHALL validate credentials against database. IF credentials valid, THEN system SHALL generate secure JWT token with 2-hour expiration, return it to client, and record successful login timestamp. IF credentials invalid AND failed attempts reach 3, THEN system SHALL lock account for 15 minutes with 401 error containing "Account locked" message.

WHEN a user requests password change, THE system SHALL verify current password. IF valid, THEN system SHALL require new password meeting complexity requirements and confirm password. IF both passwords valid, THEN system SHALL update password, invalidate all previous authentication tokens, and send confirmation email with login history details within 2 seconds.

WHEN a user requests account deletion, THE system SHALL confirm intention via email verification. IF confirmed, THEN system SHALL permanently delete all user data including todos, history, and settings within 1 second, invalidate all sessions, and return 200 success response. THE system SHALL not return any data after deletion to prevent privacy leakage.

## 2. User Profile Management

WHEN a user updates display name, THE system SHALL accept names between 2-50 characters with alphanumeric and space characters only. IF invalid name format detected, THEN system SHALL return 400 error with "Invalid name format - use letters, numbers, and spaces only". WHEN update successful, THEN system SHALL store new name in database immediately without affecting other account data.

WHEN user views their own profile, THE system SHALL display only display name with no other personal information. THE system SHALL prevent all profile access attempts by other users, returning 403 error with "Access denied to other users' profiles" message for any unauthorized attempts.

## 3. Todo Creation

WHEN a user creates a todo item, THE system SHALL require title field (minimum 1 character). IF title is empty, THEN system SHALL return 400 error with "Title is required" message. WHEN all required fields are valid, THEN system SHALL set initial status to "incomplete", set creation timestamp, and assign to current user.

WHEN a user creates a todo with due date, THE system SHALL validate due date is not earlier than start date. IF violation detected, THEN system SHALL return 400 error with "Due date cannot be earlier than start date" message.

## 4. Todo Viewing

WHEN a user views their todo list, THE system SHALL paginate results with 10 items per page by default. THE system SHALL include for each item: title (truncated to 30 characters), completion status (icon + full text), creation date, and presence of start/due dates in list view. FOR all lists, THE system SHALL display the current user's todos only with no visibility to other users' data.

WHEN a user views a single todo detail, THE system SHALL display full title, complete description, complete edit history, and all date fields in chronological order with full timestamps. THE system SHALL not show any other user's data regardless of request.

## 5. Todo Completeness Management

WHEN a user toggles a todo's completion status, THE system SHALL update status to opposite state (complete ↔ incomplete) within 500ms. THE system SHALL not allow completion changes when todo is in trash state.

WHEN a user attempts to complete a todo with due date set and start date not set, THEN system SHALL allow completion but display warning "This todo is being marked complete without start date" in UI.

## 6. Todo Editing

WHEN a user edits a todo's title, description, or dates, THE system SHALL validate constraints (title length, date relationships). IF validation fails, THEN system SHALL return descriptive 400 error and prevent update. WHEN validated, THEN system SHALL create an edit history entry with before/after values and timestamp, and update the todo record.

WHEN multiple edits occur within 1 minute, THE system SHALL prevent duplicate history entries by batching changes into single entry showing final state versus initial state at 1-minute interval.

## 7. Edit History Tracking

WHEN a user requests edit history for a todo, THE system SHALL return entries sorted from most recent to oldest within 200ms. EACH entry SHALL include: timestamp, specific fields changed (with label), previous value, new value, and user who made the change (always current user).

WHEN a user views edit history, THE system SHALL show all field changes in chronological order with visual differentiation for title, description, start date, and due date changes.

## 8. Todo Deletion Workflow

WHEN a user deletes a todo, THE system SHALL mark it as soft-deleted (status = deleted) and move to hidden state within 300ms. THE system SHALL not display deleted todos in normal list and shall prevent access via direct URL.

WHEN a user views trash, THE system SHALL paginate deleted todos with 10 items per page AND include all fields except description (to save space), but SHALL show title, dates, and deletion timestamp.

WHEN a user restores a todo from trash, THE system SHALL revert status to active (undeleted) within 300ms, restore to previous state, and move to active todo list.

## 9. Trash Management

WHEN a user permanently deletes a todo from trash, THE system SHALL immediately remove both the todo and its edit history records from database. THE system SHALL not provide any recovery options for permanently deleted todos.

WHEN a user views trash, THE system SHALL display all deleted todos but SHALL not include any items deleted over 30 days ago (automatic purge).

## 10. Todo Filtering and Sorting

WHEN a user applies filter for completion status, THE system SHALL return todos matching selected state (all, complete, incomplete) by adjusting SQL WHERE clause for status field. IF 'all' filter applied, THEN system SHALL return unfiltered list with no status restrictions.

WHEN sorting by date (start/due) with missing dates present, THE system SHALL position todos without dates at the end of the sorted list regardless of sort direction. FOR creation date sorting, todos SHALL be sorted from newest to oldest by default with toggle option for oldest first.

## 11. Privacy and Security Enforcement

WHEN a user attempts to access any data (todos, profile, history), THE system SHALL validate user ownership against current session. IF ownership mismatch occurs (e.g., user1 accessing user2 data), THEN system SHALL return 403 error with message "Access denied to other users' data" and prevent all related actions.

WHEN a user is logged in, THE system SHALL enforce complete data isolation across all features and API endpoints, WITH no possibility of accidental data leakage. THE system SHALL not provide any data points that could be mapped to other users.

> *Note: This document contains business requirements only. Technical implementations (database schemas, API details, etc.) are at developer's discretion per subsequent pipeline phases.*