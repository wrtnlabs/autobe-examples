# Multi-User Todo Application - Requirements Specification Document

## Executive Summary

This document provides comprehensive requirements specification for a multi-user Todo application. The application enables users to create, manage, and organize personal todo lists with full privacy enforcement, where each user's data is completely isolated from others. The system features robust todo management capabilities including creation, editing with full history tracking, soft delete with trash management, comprehensive filtering, and flexible sorting options.

The core value proposition is delivering a private, reliable todo management system where users maintain complete control over their personal tasks without concerns about data sharing or unauthorized access. Every feature is designed to prioritize user privacy while providing powerful organizational tools.

### Key Service Benefits

1. **Complete Privacy**: Each user's todos are entirely isolated from others - no sharing or visibility between accounts
2. **Full Edit History**: Every change to a todo is automatically recorded for complete audit trail
3. **Trash Management**: Soft delete system allows recovery of accidentally deleted todos
4. **Advanced Organization**: Comprehensive filtering and sorting capabilities for efficient task management
5. **Reliable Data Integrity**: Database-level constraints ensure data consistency and prevent corruption

## User Requirements

### User Authentication and Account Management

#### Account Creation
- Users sign up with email address and password
- Email address serves as unique identifier and login credential
- Password must meet minimum security requirements (minimum length)
- upon registration, users are created with default display name derived from email
- Registration process includes email verification to confirm ownership
- System automatically creates user profile upon successful registration

#### User Login
- Users log in using their registered email address and password
- System authenticates credentials against stored user records
- Upon successful authentication, system generates JWT token for session management
- JWT token contains user ID and expiration time for secure stateless authentication
- System enforces rate limiting on login attempts to prevent brute force attacks

#### Account Deletion
- Users can permanently delete their accounts through settings interface
- Account deletion is irreversible and requires explicit user confirmation
- Upon account deletion, system performs comprehensive data cleanup:
  - All user's todos are permanently deleted (not soft deleted)
  - All user's todo edit history entries are permanently deleted
  - All user's trash entries are permanently deleted
  - User profile information is permanently deleted
  - JWT tokens are invalidated immediately
- System sends confirmation email upon successful account deletion

#### Password Management
- Users can change their password at any time through secure interface
- Password change requires current password verification for security
- New password must meet minimum security requirements
- Password changes immediately invalidate existing JWT tokens
- System requires re-authentication after password change for security

#### Profile Management
- Each user has a profile with display name derived from registration
- Users can edit their display name to personalize their experience
- Display name appears on todos created by the user
- Display name cannot be changed to match another user's name
- Profile changes are immediately reflected throughout the application

### Todo Management Requirements

#### Creating Todos
- Users can create new todos through intuitive interface
- Todo title is required and serves as primary identifier
- Description field is optional, allowing for additional context or details
- Start date field is optional, enabling users to plan when work begins
- Due date field is optional, allowing users to set deadlines
- Upon creation, todos are automatically marked as incomplete
- Creation process includes immediate visual feedback to user
- System validates all input fields before saving to database

#### Viewing Todo Lists
- Users can view paginated lists of their todos through main interface
- Default page size is 20 todos for optimal performance
- Each todo in list displays essential information:
  - Title for quick identification
  - Completion status with clear visual indicator (checkbox or icon)
  - Start date if set, displayed as formatted date or "Not set"
  - Due date if set, displayed as formatted date or "Not set"
  - Creation date showing when todo was originally created
- Users can navigate between pages using pagination controls
- Deleted todos (in trash) are automatically excluded from normal list view
- System optimizes database queries for efficient list retrieval

#### Viewing Single Todo
- Users can view detailed information for individual todos
- Detail view shows all fields including full description
- Date fields display formatted dates or "Not set" when empty
- Users can access edit and action buttons from detail view
- System provides smooth transitions between list and detail views
- Complete edit history is accessible from detail view

#### Completing and Uncompleting Todos
- Users can toggle completion status for any todo
- Simple click on completion indicator switches between states
- When marked complete, system automatically sets completion timestamp
- When marked incomplete, system automatically clears completion timestamp
- Status changes are immediately visible in all views
- List view updates completion status for affected todos
- System maintains accurate completion history for analytics

#### Editing Todos
- Users can modify title, description, start date, and due date
- Every edit operation creates an automatic history entry
- History records include timestamp of edit and field changes
- Original values are preserved in history for audit trail
- Users can view complete edit history for any todo
- Editing interface pre-fills current values for easy modification
- System validates all fields during edit operation
- Due date must be after start date when both are provided

#### Edit History
- Each todo maintains complete history of all edits
- History entries are automatically created on every edit
- Each history entry contains:
  - Exact timestamp when edit was made
  - Title field changes with old and new values
  - Description field changes with old and new values
  - Start date field changes with old and new values
  - Due date field changes with old and new values
- History entries are sorted from most recent to oldest
- Users can view full edit history through detail interface
- History cannot be modified or deleted by users
- System optimizes history retrieval for performance

#### Deleting Todos
- Users can delete their todos through intuitive interface
- Deletion is soft delete (not permanent removal)
- Deleted todos are moved to trash state
- Deleted todos are automatically excluded from normal list view
- All todo data is preserved in database for potential recovery
- Completion status at time of deletion is preserved in trash
- System provides clear feedback when deletion occurs
- Users can restore deleted todos from trash interface

### Trash Management Requirements

#### Viewing Trash
- Users can access trash interface to view deleted todos
- Trash view displays paginated list of deleted todos
- Each trash entry shows essential information:
  - Title of deleted todo
  - Completion status at time of deletion
  - Original start date if set
  - Original due date if set
  - Date when todo was deleted
- Users can navigate between trash pages using pagination controls
- Deleted todos remain in trash until user action
- System provides clear visual indication that todos are in trash

#### Restoring from Trash
- Users can restore deleted todos to normal list view
- Restore operation moves todo from trash state back to active
- All todo data is preserved during restoration
- Completion status is restored to previous state
- Todo reappears in normal todo list immediately
- System provides confirmation feedback upon successful restoration
- Restoration does not affect edit history
- System maintains all original todo relationships

#### Permanently Deleting from Trash
- Users can permanently delete todos from trash
- Permanent deletion is irreversible operation
- Confirming permanent deletion requires explicit user action
- Upon permanent deletion:
  - Todo record is permanently removed from database
  - All associated edit history entries are permanently deleted
  - Todo is completely removed from system
  - No data recovery is possible after deletion
- System provides clear warning before permanent deletion
- Users understand consequences before proceeding
- System provides confirmation message after deletion

#### Trash Pagination
- Trash list supports pagination for performance with large numbers of deleted todos
- Default page size matches normal todo list (20 items)
- Users can navigate between trash pages using standard pagination controls
- System optimizes queries for efficient trash retrieval
- Pagination metadata shows current page and total pages
- System handles edge cases for empty trash or single page

### Filtering and Sorting Requirements

#### Completion Status Filtering
- Users can filter todo list by completion status
- Available filter options:
  - All todos (default view showing no filter)
  - Complete only (showing only completed todos)
  - Incomplete only (showing only incomplete todos)
- Filter is persistent during user session
- Filter state is maintained when navigating between pages
- System optimizes filtered queries for performance
- Filter interface provides clear visual indication of active filter
- System updates count of filtered items for user awareness

#### Sorting Options
- Users can sort todo list by multiple criteria with direction control
- Available sort criteria:
  - Creation date (most recent or oldest first)
  - Start date (earliest or latest first)
  - Due date (earliest or latest first)
- Sort options are clearly presented in user interface
- Users can combine filtering and sorting for precise results
- System provides visual indicators for active sort direction
- Default sort is by creation date with newest first

#### Special Sorting Rules
- When sorting by start date:
  - Todos without start date appear at the end of sorted list
  - Todos with start date are sorted chronologically
  - Sort direction (ascending/descending) applies to todos with dates
  - System maintains consistent behavior across all pages
- When sorting by due date:
  - Todos without due date appear at the end of sorted list
  - Todos with due date are sorted chronologically
  - Sort direction (ascending/descending) applies to todos with dates
  - System maintains consistent behavior across all pages
- System handles edge cases for mixed date presence
- Sorting performance is optimized for large datasets

#### Filtering and Sorting Integration
- Users can apply multiple criteria simultaneously
- Filter and sort operations are applied in correct sequence
- System provides immediate visual feedback when criteria change
- Pagination works correctly with filtered and sorted results
- System maintains state during user navigation
- Performance is optimized for combined operations

## Functional Requirements

### Account Management Functions

#### User Registration Function
- Function: User Registration
- Description: Create new user account with email and password
- Input Parameters:
  - email (string, required): User's email address for login
  - password (string, required): User's password (minimum 8 characters)
- Process:
  1. Validate email format and uniqueness
  2. Hash password using secure algorithm (bcrypt)
  3. Create user record in database
  4. Create default user profile with email-based display name
  5. Send verification email if required
  6. Generate JWT token for initial session
- Output/Result:
  - User account created in system
  - JWT token provided for authentication
  - User redirected to onboarding or dashboard
- Error Handling:
  - Email already registered: Return 409 Conflict
  - Invalid email format: Return 400 Bad Request
  - Weak password: Return 400 Bad Request with security requirements
- Business Rules:
  - Email must be unique across all users
  - Password must meet minimum security requirements
  - User profile is automatically created
  - Verification may be required based on security policy

#### User Login Function
- Function: User Authentication
- Description: Authenticate user with email and password
- Input Parameters:
  - email (string, required): User's email address
  - password (string, required): User's password
- Process:
  1. Retrieve user record by email
  2. Verify password matches stored hash
  3. Generate JWT token with user ID and expiration
  4. Return authentication token to client
- Output/Result:
  - JWT token for authenticated session
  - User profile information
  - Session management data
- Error Handling:
  - User not found: Return 401 Unauthorized
  - Invalid password: Return 401 Unauthorized
  - Account disabled: Return 403 Forbidden
- Business Rules:
  - Password comparison uses constant-time algorithm
  - JWT token expires after configurable time period
  - Rate limiting applies to prevent brute force attacks
  - Failed attempts are logged for security monitoring

#### Password Change Function
- Function: Password Update
- Description: Allow authenticated user to change their password
- Input Parameters:
  - currentPassword (string, required): User's existing password
  - newPassword (string, required): New password (minimum 8 characters)
- Process:
  1. Verify user authentication via JWT token
  2. Validate current password matches stored hash
  3. Validate new password meets security requirements
  4. Hash new password using secure algorithm
  5. Update user record with new password hash
  6. Invalidate all existing JWT tokens for security
  7. Send password change confirmation email
- Output/Result:
  - Password successfully updated
  - All previous tokens invalidated
  - Confirmation message to user
- Error Handling:
  - Invalid current password: Return 401 Unauthorized
  - Weak new password: Return 400 Bad Request
  - Authentication failure: Return 401 Unauthorized
- Business Rules:
  - Current password must be verified before change
  - New password must meet minimum security requirements
  - All existing sessions are invalidated after change
  - User receives confirmation email for security audit

#### Account Deletion Function
- Function: Account Removal
- Description: Permanently delete user account and all associated data
- Input Parameters:
  - password (string, required): User's current password for verification
- Process:
  1. Verify user authentication via JWT token
  2. Validate user password for security confirmation
  3. Retrieve all user data for cleanup planning
  4. Delete all user todos (permanent removal, not soft delete)
  5. Delete all user todo edit history entries
  6. Delete all user trash entries
  7. Delete user profile and authentication records
  8. Send account deletion confirmation email
- Output/Result:
  - User account completely removed from system
  - All user data permanently deleted
  - Confirmation message to user
- Error Handling:
  - Invalid password: Return 401 Unauthorized
  - Authentication failure: Return 401 Unauthorized
  - Database error: Return 500 Internal Server Error
- Business Rules:
  - Account deletion is irreversible
  - All associated data must be completely removed
  - User receives confirmation of deletion
  - No data recovery is possible after deletion

#### Profile Update Function
- Function: User Profile Modification
- Description: Allow users to update their display name
- Input Parameters:
  - displayName (string, required): New display name (1-50 characters)
- Process:
  1. Verify user authentication via JWT token
  2. Validate display name meets requirements
  3. Check for duplicate display names (if applicable)
  4. Update user profile record
  5. Return updated profile information
- Output/Result:
  - User profile successfully updated
  - Updated display name reflected in application
- Error Handling:
  - Invalid display name format: Return 400 Bad Request
  - Display name too long: Return 400 Bad Request
  - Authentication failure: Return 401 Unauthorized
- Business Rules:
  - Display name must be unique within reasonable constraints
  - Display name cannot be empty or whitespace-only
  - Display name is applied immediately to all user's todos
  - User retains ownership of all existing todos

### Todo Management Functions

#### Todo Creation Function
- Function: Todo Creation
- Description: Create new todo item for authenticated user
- Input Parameters:
  - title (string, required): Todo title (1-255 characters)
  - description (string, optional): Todo description (0-10,000 characters)
  - startDate (string, optional): ISO date-time string for start date
  - dueDate (string, optional): ISO date-time string for due date
- Process:
  1. Verify user authentication via JWT token
  2. Extract user ID from JWT token for ownership
  3. Validate all input parameters against business rules
  4. Validate date relationships (due date after start date if both provided)
  5. Create new todo record in database with user ID ownership
  6. Set creation timestamp to current system time
  7. Set completion status to "incomplete" by default
  8. Return created todo with all fields and generated ID
- Output/Result:
  - New todo record created with unique identifier
  - All fields populated according to user input
  - System timestamps automatically set
  - Todo appears in user's list immediately
- Error Handling:
  - Missing title: Return 400 Bad Request
  - Title too long: Return 400 Bad Request
  - Description too long: Return 400 Bad Request
  - Invalid date format: Return 400 Bad Request
  - Due date before start date: Return 400 Bad Request
  - Authentication failure: Return 401 Unauthorized
- Business Rules:
  - Title field is required and cannot be empty
  - Start date and due date must be valid ISO date-time format
  - Due date must be after start date when both are provided
  - User ID from JWT token is automatically associated
  - New todos are always incomplete by default

#### Todo List Retrieval Function
- Function: Todo List Retrieval
- Description: Retrieve paginated list of user's todos
- Input Parameters:
  - page (number, optional): Page number (default 1)
  - pageSize (number, optional): Items per page (default 20)
  - statusFilter (string, optional): Filter by status (all, complete, incomplete)
  - sortBy (string, optional): Sort criteria (createdAt, startDate, dueDate)
  - sortOrder (string, optional): Sort direction (asc, desc)
- Process:
  1. Verify user authentication via JWT token
  2. Extract user ID from JWT token for data isolation
  3. Validate pagination parameters
  4. Apply status filter if specified
  5. Apply sorting criteria based on user selection
  6. Execute database query with all filters and sorting
  7. Calculate pagination metadata (total items, pages, etc.)
  8. Return paginated list with metadata
- Output/Result:
  - Paginated list of user's todos
  - Pagination metadata for navigation
  - Filter and sort state for interface persistence
- Error Handling:
  - Invalid pagination parameters: Return 400 Bad Request
  - Invalid filter parameters: Return 400 Bad Request
  - Invalid sort parameters: Return 400 Bad Request
  - Authentication failure: Return 401 Unauthorized
- Business Rules:
  - Only user's own todos are returned (user ID filtering)
  - Deleted todos are automatically excluded from list
  - Default page size is 20 items
  - Todos without sorting dates appear at end when sorting by date
  - Completion status is included for each todo in list

#### Single Todo Retrieval Function
- Function: Single Todo Retrieval
- Description: Retrieve detailed information for specific todo
- Input Parameters:
  - todoId (string, required): Unique identifier of todo to retrieve
- Process:
  1. Verify user authentication via JWT token
  2. Extract user ID from JWT token for ownership verification
  3. Query database for todo with matching ID and user ID
  4. If not found, return 404 Not Found (privacy protection)
  5. Return complete todo data including all fields
- Output/Result:
  - Complete todo information with all fields
  - Edit history accessible for review
  - Action buttons available for user operations
- Error Handling:
  - Invalid todo ID format: Return 400 Bad Request
  - Todo not found: Return 404 Not Found
  - Authentication failure: Return 401 Unauthorized
- Business Rules:
  - User can only access their own todos
  - Attempting to access another user's todo returns 404
  - Deleted todos are not accessible through this function
  - All fields including description are returned
  - Date fields show formatted values or "Not set" when empty

#### Completion Toggle Function
- Function: Completion Status Update
- Description: Toggle todo completion status
- Input Parameters:
  - todoId (string, required): Unique identifier of todo
  - isComplete (boolean, required): Desired completion status
- Process:
  1. Verify user authentication via JWT token
  2. Extract user ID from JWT token for ownership verification
  3. Query database for todo with matching ID and user ID
  4. If not found, return 404 Not Found
  5. Update todo completion status to specified value
  6. Set completion timestamp when marking complete
  7. Clear completion timestamp when marking incomplete
  8. Save updated todo to database
  9. Return updated todo data
- Output/Result:
  - Todo completion status successfully updated
  - Completion timestamp automatically managed
  - Updated todo returned for immediate UI refresh
- Error Handling:
  - Invalid todo ID format: Return 400 Bad Request
  - Todo not found: Return 404 Not Found
  - Authentication failure: Return 401 Unauthorized
- Business Rules:
  - Toggle operation works regardless of current state
  - Completion timestamp is automatically managed
  - User can only modify their own todos
  - Attempting to modify another user's todo returns 404
  - Status change is immediate and visible

#### Todo Update Function
- Function: Todo Modification
- Description: Update todo fields with new values
- Input Parameters:
  - todoId (string, required): Unique identifier of todo
  - title (string, optional): New title (1-255 characters)
  - description (string, optional): New description (0-10,000 characters)
  - startDate (string, optional): New start date (ISO date-time)
  - dueDate (string, optional): New due date (ISO date-time)
- Process:
  1. Verify user authentication via JWT token
  2. Extract user ID from JWT token for ownership verification
  3. Query database for todo with matching ID and user ID
  4. If not found, return 404 Not Found
  5. Validate new values against business rules
  6. Compare new values with existing values
  7. Create edit history entry with field changes
  8. Update todo record with new values
  9. Save updated todo to database
  10. Return updated todo data
- Output/Result:
  - Todo fields successfully updated
  - Edit history entry created for changes
  - Updated todo returned for immediate UI refresh
- Error Handling:
  - Invalid todo ID format: Return 400 Bad Request
  - Title too long: Return 400 Bad Request
  - Description too long: Return 400 Bad Request
  - Invalid date format: Return 400 Bad Request
  - Due date before start date: Return 400 Bad Request
  - Todo not found: Return 404 Not Found
  - Authentication failure: Return 401 Unauthorized
- Business Rules:
  - Every edit creates exactly one history entry
  - History records original and new values for changed fields
  - All validation rules apply to update operations
  - User can only edit their own todos
  - Attempting to edit another user's todo returns 404

#### Edit History Retrieval Function
- Function: Edit History Retrieval
- Description: Retrieve complete edit history for specific todo
- Input Parameters:
  - todoId (string, required): Unique identifier of todo
- Process:
  1. Verify user authentication via JWT token
  2. Extract user ID from JWT token for ownership verification
  3. Query database for todo with matching ID and user ID
  4. If not found, return 404 Not Found
  5. Query edit history entries for the todo
  6. Sort history entries by timestamp (most recent first)
  7. Return sorted history entries
- Output/Result:
  - Complete edit history for todo
  - History entries sorted chronologically (newest first)
  - Each entry shows field changes with old and new values
- Error Handling:
  - Invalid todo ID format: Return 400 Bad Request
  - Todo not found: Return 404 Not Found
  - Authentication failure: Return 401 Unauthorized
- Business Rules:
  - Only user's own todo history is accessible
  - Attempting to view another user's todo history returns 404
  - History entries are immutable and cannot be deleted
  - Every edit creates a permanent history entry
  - History is sorted from most recent to oldest

#### Todo Deletion Function
- Function: Todo Soft Deletion
- Description: Soft delete todo (move to trash)
- Input Parameters:
  - todoId (string, required): Unique identifier of todo
- Process:
  1. Verify user authentication via JWT token
  2. Extract user ID from JWT token for ownership verification
  3. Query database for todo with matching ID and user ID
  4. If not found, return 404 Not Found
  5. Mark todo as deleted (set deleted flag to true)
  6. Set deletion timestamp to current system time
  7. Preserve all todo data including completion status
  8. Return success confirmation
- Output/Result:
  - Todo moved to trash state
  - Todo removed from normal list view
  - Todo accessible through trash interface
- Error Handling:
  - Invalid todo ID format: Return 400 Bad Request
  - Todo not found: Return 404 Not Found
  - Authentication failure: Return 401 Unauthorized
- Business Rules:
  - Deletion is soft delete (not permanent removal)
  - All data is preserved for potential recovery
  - Deleted todos are excluded from normal queries
  - User can restore deleted todos from trash
  - Attempting to delete another user's todo returns 404

#### Trash List Retrieval Function
- Function: Trash List Retrieval
- Description: Retrieve paginated list of user's deleted todos
- Input Parameters:
  - page (number, optional): Page number (default 1)
  - pageSize (number, optional): Items per page (default 20)
- Process:
  1. Verify user authentication via JWT token
  2. Extract user ID from JWT token for data isolation
  3. Query database for user's deleted todos
  4. Apply pagination to results
  5. Return paginated list of trash items
- Output/Result:
  - Paginated list of deleted todos
  - Each item shows deletion date and original data
  - Pagination metadata for navigation
- Error Handling:
  - Invalid pagination parameters: Return 400 Bad Request
  - Authentication failure: Return 401 Unauthorized
- Business Rules:
  - Only user's own deleted todos are returned
  - Pagination works consistently with normal lists
  - Deleted todos show original completion status
  - System optimizes queries for trash performance

#### Todo Restore Function
- Function: Todo Restoration
- Description: Restore deleted todo from trash to active state
- Input Parameters:
  - todoId (string, required): Unique identifier of todo to restore
- Process:
  1. Verify user authentication via JWT token
  2. Extract user ID from JWT token for ownership verification
  3. Query database for todo with matching ID and user ID
  4. Verify todo exists and is in trash state
  5. Clear deleted flag on todo
  6. Remove deletion timestamp
  7. Return updated todo data
- Output/Result:
  - Todo restored to active state
  - Todo appears in normal todo list
  - All original data preserved
- Error Handling:
  - Invalid todo ID format: Return 400 Bad Request
  - Todo not found: Return 404 Not Found
  - Todo not in trash: Return 400 Bad Request
  - Authentication failure: Return 401 Unauthorized
- Business Rules:
  - Only user's own deleted todos can be restored
  - Attempting to restore another user's todo returns 404
  - All original data is preserved during restoration
  - Completion status is restored to previous state
  - Edit history is preserved during restoration

#### Todo Permanent Deletion Function
- Function: Todo Permanent Deletion
- Description: Permanently delete todo from trash
- Input Parameters:
  - todoId (string, required): Unique identifier of todo
- Process:
  1. Verify user authentication via JWT token
  2. Extract user ID from JWT token for ownership verification
  3. Query database for todo with matching ID and user ID
  4. Verify todo exists and is in trash state
  5. Retrieve all associated edit history entries
  6. Delete todo record from database
  7. Delete all associated edit history entries
  8. Return success confirmation
- Output/Result:
  - Todo permanently removed from system
  - Edit history completely deleted
  - No data recovery possible
- Error Handling:
  - Invalid todo ID format: Return 400 Bad Request
  - Todo not found: Return 404 Not Found
  - Todo not in trash: Return 400 Bad Request
  - Authentication failure: Return 401 Unauthorized
- Business Rules:
  - Permanent deletion is irreversible
  - All associated data must be completely removed
  - Edit history is deleted with the todo
  - User understands consequences before proceeding
  - Attempting to delete another user's todo returns 404

## Business Rules

### Data Validation Rules

#### Title Validation
- Title is required field for todo creation
- Title minimum length: 1 character
- Title maximum length: 255 characters
- Title cannot be empty string or whitespace-only
- Title field must be non-null for all valid todos
- System rejects title validation failures with clear error messages
- Validation occurs during both creation and update operations

#### Description Validation
- Description is optional field (can be null or empty string)
- Description maximum length: 10,000 characters
- Description can contain any valid text content
- No validation rules on description content (free text)
- System allows empty description without error

#### Date Validation
- Start date and due date are optional fields
- Date values must be valid ISO date-time format
- If both dates provided, due date must be after start date
- Date fields can be null or empty string for no date
- System validates date formats using strict parsing
- Invalid date formats are rejected with specific error messages

#### User Validation
- Email must be unique across all users
- Email must be valid format (RFC 5322 compliant)
- Password must meet minimum security requirements (minimum 8 characters)
- Display name must be between 1-50 characters
- Display name cannot be empty or whitespace-only
- User ID is automatically assigned and cannot be modified

### Privacy and Security Rules

#### User Isolation
- Users can only access their own data
- System automatically filters all queries by authenticated user ID
- Attempting to access another user's data returns 404 Not Found
- JWT tokens contain user ID for automatic authorization
- No manual user ID specification allowed in API calls
- Database queries always include user ID filter

#### Data Access Control
- User ID from JWT token is source of truth for ownership
- All database queries filter by authenticated user ID
- Direct ID access (e.g., /todos/:id) still enforces ownership
- Attempting to access another user's resource returns 404
- No information leakage through error messages

#### Authentication Requirements
- All protected endpoints require valid JWT token
- Expired tokens are rejected with 401 Unauthorized
- Invalid tokens are rejected with 401 Unauthorized
- Token validation occurs before any business logic
- Refresh mechanism available for long sessions

### Edit History Business Rules

#### History Creation
- Every todo edit creates exactly one history entry
- History entry is created before todo update is saved
- History includes timestamp of edit and field changes
- Original and new values recorded for each changed field
- History entries are immutable and cannot be deleted
- History entries cannot be modified by any operation

#### History Content
- Each history entry records:
  - Timestamp of edit (creation time)
  - Old and new values for title (if changed)
  - Old and new values for description (if changed)
  - Old and new values for start date (if changed)
  - Old and new values for due date (if changed)
- If field was set (changed from null to value), record "set to value"
- If field was cleared (changed from value to null), record "cleared"
- If field was unchanged, no entry created for that field

#### History Access
- Edit history is retrieved through todo detail view
- History entries sorted by timestamp (most recent first)
- Only user can view their own todo's history
- Attempting to view another user's history returns 404
- History cannot be modified or deleted by any user action
- Performance optimized for history retrieval

### Trash Management Rules

#### Soft Delete
- Deleting todo moves it to trash (soft delete)
- Deleted flag set to true, deletion timestamp recorded
- All data preserved in database (not permanently removed)
- Deleted todos excluded from normal todo list queries
- Completion status preserved at time of deletion
- User can restore deleted todos from trash

#### Trash Persistence
- Deleted todos remain in trash until user action
- No automatic cleanup of trash entries
- Trash data persists across user sessions
- System maintains trash for as long as user account exists
- Users can permanently delete items from trash

#### Restoration Rules
- Restoring todo removes trash state
- All original data preserved during restoration
- Completion status restored to previous state
- Edit history preserved during restoration
- Todo reappears in normal todo list

#### Permanent Deletion
- Permanently deleting removes todo from database
- All edit history entries deleted with todo
- No data recovery possible after permanent deletion
- Trash-specific operations only work on trash items
- User must confirm permanent deletion for security

### Filtering and Sorting Rules

#### Completion Status Filter
- Three filter states: all, complete, incomplete
- Default filter is "all" (no filtering applied)
- Filter applies to normal todo list queries
- Deleted todos excluded regardless of filter state
- Filter persists during user session
- Performance optimized for filtered queries

#### Sorting Rules
- Three sort criteria: creation date, start date, due date
- Two sort directions: ascending and descending
- Default sort: creation date, descending (newest first)
-Todos without sorting date appear at end when sorting by date
- Sort and filter can be combined for precise results
- Performance optimized for combined operations

#### Special Date Sorting
- When sorting by start date, todos without start date appear at end
- When sorting by due date, todos without due date appear at end
- Sort direction applies only to todos with dates set
- System maintains consistent behavior across all pages
- Edge cases handled for mixed date presence

### Account Management Rules

#### Account Deletion
- Deleting account permanently removes all user data
- All todos deleted (not soft deleted)
- All edit history entries deleted
- All trash entries deleted
- JWT tokens immediately invalidated
- Deletion is irreversible with no recovery option

#### Password Change
- Password change invalidates all existing JWT tokens
- Current password required for security verification
- New password must meet security requirements
- Confirmation email sent after successful change
- All sessions must re-authenticate after change

#### Profile Updates
- Display name changes immediately reflected in all user's todos
- User retains ownership of all existing todos
- Display name cannot be empty or whitespace-only
- No impact on todo data or relationships

## Workflow Specifications

### User Registration and Login Workflow

#### Registration Process
1. User navigates to registration page
2. User fills in email address and password
3. User submits registration form
4. System validates email format and uniqueness
5. System validates password meets minimum requirements
6. IF validation fails, system shows error messages and returns to step 2
7. IF validation passes, system creates user account
8. System generates initial JWT token for session
9. System creates default user profile
10. System redirects user to dashboard or welcome page
11. User sees registration confirmation message

#### Login Process
1. User navigates to login page
2. User enters email address and password
3. User submits login form
4. System retrieves user record by email
5. System validates password against stored hash
6. IF authentication fails, system shows error and returns to step 2
7. IF authentication succeeds, system generates JWT token
8. System returns success response with token
9. User redirected to dashboard
10. User sees login confirmation message

### Todo Management Workflow

#### Creating a Todo
1. User clicks "Create Todo" button
2. System opens todo creation interface
3. User fills in required title field
4. User optionally fills description, start date, due date
5. User submits todo creation form
6. System validates all input fields
7. IF validation fails, system shows error messages and returns to step 4
8. IF validation passes, system creates new todo
9. System sets creation timestamp to current time
10. System sets completion status to "incomplete"
11. System saves todo to database with user ownership
12. System returns success response with new todo data
13. User sees newly created todo in list

#### Viewing Todo List
1. User navigates to todo list page
2. System retrieves user's authentication token
3. System extracts user ID from token
4. System queries database for user's todos
5. System applies filters if specified
6. System applies sorting if specified
7. System paginates results
8. System returns list with pagination metadata
9. User sees formatted todo list

### Edit History Workflow

#### Recording an Edit
1. User modifies todo fields in edit interface
2. User submits edit form
3. System validates new values
4. IF validation fails, system shows errors and returns to step 2
5. IF validation passes, system retrieves current todo data
6. System compares new values with existing values
7. System creates edit history entry with timestamp
8. System records which fields changed and their values
9. System updates todo with new values
10. System saves changes to database
11. System returns success response with updated todo
12. User sees updated todo with confirmation message

#### Viewing Edit History
1. User views todo detail and clicks "Edit History"
2. System retrieves todo and user authentication
3. System queries edit history entries for todo
4. System sorts entries by timestamp (most recent first)
5. System returns sorted history entries
6. User sees chronological edit history

### Trash Management Workflow

#### Deleting a Todo
1. User clicks delete button for todo
2. System displays confirmation dialog
3. User confirms deletion
4. System retrieves user authentication
5. System marks todo as deleted
6. System sets deletion timestamp
7. System preserves all todo data
8. System returns success response
9. Todo disappears from normal list
10. User sees trash notification

#### Restoring from Trash
1. User navigates to trash page
2. System retrieves user's deleted todos
3. User clicks restore button for desired todo
4. System retrieves todo data
5. System clears deleted flag
6. System removes deletion timestamp
7. System returns success response
8. Todo reappears in normal list
9. User sees restoration confirmation

## Performance Requirements

### Response Time Targets

#### Standard Response Times
- Todo creation: < 2 seconds
- Todo list loading: < 2 seconds
- Single todo view: < 1 second
- Completion toggle: < 1 second
- Todo editing: < 2 seconds
- Edit history view: < 1 second
- Todo deletion: < 1 second
- Trash operations: < 2 seconds

#### Performance Benchmarks
- Database queries optimized for typical data sets
- Pagination prevents loading excessive records
- Indexes created on frequently queried fields
- Caching applied where appropriate for performance

### User Experience Metrics

#### Interface Responsiveness
- Immediate visual feedback for user actions
- Loading states for operations > 1 second
- Clear progress indicators for multi-step operations
- Smooth transitions between views and pages

#### Error Recovery
- Error messages appear within 1 second of occurrence
- Recovery options provided for all error scenarios
- System automatically handles retryable errors
- User can cancel long-running operations

### Scalability Requirements

#### Performance at Scale
- System handles 1,000 concurrent users
- Query performance maintained with 10,000+ todos per user
- Pagination prevents performance degradation
- Database indexes optimized for common query patterns

## Error Handling

### Validation Errors

#### Input Validation
- Title missing or empty: "Title is required"
- Title too long: "Title must be 255 characters or fewer"
- Description too long: "Description must be 10,000 characters or fewer"
- Invalid date format: "Invalid date format"
- Invalid date relationship: "Due date must be after start date"
- Invalid pagination parameters: "Invalid pagination parameters"

### Authentication Errors

#### Security Errors
- Missing or invalid token: "Authentication required"
- Expired token: "Session expired. Please log in again."
- Invalid credentials: "Invalid email or password"
- Account disabled: "Account has been disabled"

### Authorization Errors

#### Access Control Errors
- Accessing another user's resource: "Resource not found"
- Attempting to modify protected system data: "Access denied"
- Unauthorized operation on trash: "Item not in trash"

### Data Processing Errors

#### Database Errors
- Data not found: "Resource not found"
- Duplicate entry: "Record already exists"
- Database connection error: "Service temporarily unavailable"

### User-Facing Error Messages

#### Error Communication
- Clear and actionable error messages provided
- Technical details logged internally
- User guidance for resolving common errors
- Consistent error message format throughout application

## Success Criteria

### Functional Success

#### Feature Completion
- All user authentication flows working correctly
- Todo CRUD operations functional with proper validation
- Edit history recording working accurately
- Trash management functioning as designed
- Filtering and sorting operations effective

#### Quality Standards
- Zero data loss in normal operations
- Complete privacy enforcement with no data leakage
- Robust error handling for edge cases
- Consistent user experience across all features

### Performance Success

#### Response Time Targets
- All operations complete within specified time targets
- User interface remains responsive during operations
- System scales appropriately with user growth

#### User Experience
- Users can complete tasks efficiently
- Clear feedback provided for all user actions
- Minimal errors or unexpected behavior

### Business Success

#### User Satisfaction
- Users can manage todos effectively
- Privacy expectations fully met
- System reliable and trustworthy

#### Operational Success
- System maintainable and extensible
- Clear documentation for all features
- Scalable architecture for growth