# Multi-User Todo Application Requirements Specification

## User Authentication

WHEN a user attempts to register with email and password, THE system SHALL require:
- A valid email address in standard format
- A password with minimum 8 characters
- Confirmation that the email is not already registered

WHEN registration is successful, THE system SHALL:
- Create a new user account with a unique UUID identifier
- Store the password as a cryptographically hashed value
- Create an associated empty profile with default display name (email prefix)
- Issue a JWT access token with 15-minute expiration
- Issue a refresh token with 30-day expiration

WHEN a user attempts to log in with email and password, THE system SHALL:
- Validate credentials against stored hashed password
- Reject request with generic "Invalid email or password" message if credentials don't match
- Issue a new JWT access token with 15-minute expiration
- Issue a new refresh token with 30-day expiration
- Set HTTP-only cookie for refresh token

WHEN a user changes their password, THE system SHALL:
- Validate the current password authentication
- Hash and store the new password
- Immediately revoke all existing refresh tokens
- Invalidate all active sessions
- Require re-authentication for all existing devices

WHEN a user deletes their account, THE system SHALL:
- Mark the account as deleted in the database with a deletion timestamp
- Immediately invalidate all associated authentication tokens
- Begin soft deletion process for all associated todos
- Prevent any future login attempts with associated email
- Allow the email address to be reused for new account registration

IF a user attempts to log in after account deletion, THEN THE system SHALL:
- Return "User account does not exist or has been deleted" message
- Not reveal whether the email was registered in the past

WHERE a user's JWT access token expires, THEN THE system SHALL:
- Automatically use the refresh token to obtain a new access token
- Issue a new refresh token with 30-day expiration
- Invalidate the previous refresh token

WHEN a user logs out, THE system SHALL:
- Invalidate the current access token
- Expire the refresh token
- Clear authentication cookies
- Redirect to login screen with "You have been logged out" message

## User Profile Management

WHEN a user views their profile, THE system SHALL:
- Return only their own profile information
- Include display name and account creation date
- Exclude any other user information

WHEN a user updates their display name, THE system SHALL:
- Accept a non-empty string with maximum 50 characters
- Store the new display name in the user profile
- Allow display name changes at any time after account creation
- Default to email prefix (text before @) when no display name is set

IF a user attempts to set display name as empty string or whitespace-only, THEN THE system SHALL:
- Reject the update with validation message: "Display name cannot be empty"
- Retain the existing display name

IF a user attempts to set display name exceeding 50 characters, THEN THE system SHALL:
- Reject the update with validation message: "Display name cannot exceed 50 characters"
- Retain the existing display name

IF a user attempts to view another user's profile, THEN THE system SHALL:
- Return HTTP 404 Not Found
- Not reveal whether the requested user exists

WHERE a user has never set a display name, THE system SHALL:
- Default to the email address prefix (text before @ symbol)
- Display this value in all UIs and API responses
- Allow the user to change it to any valid display name at any time

## Todo Creation

WHEN a user creates a todo, THE system SHALL:
- Require a title with at least 1 character and maximum 200 characters
- Accept an optional description field up to 2,000 characters
- Accept optional start date in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
- Accept optional due date in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
- Set completion status to "incomplete" (false) by default
- Record creation timestamp as exact time of submission
- Associate the todo with the authenticated user's ID

WHEN a user submits a todo with empty or whitespace-only title, THEN THE system SHALL:
- Reject the request with error: "Title is required"
- Not create a todo record

WHEN a user submits a todo with title exceeding 200 characters, THEN THE system SHALL:
- Reject the request with error: "Title cannot exceed 200 characters"
- Not create a todo record

WHEN a user submits a todo with invalid date format for start or due date, THEN THE system SHALL:
- Reject the request with error: "Date must be in ISO 8601 format"
- Not create a todo record

WHEN a user submits a todo without a description, THEN THE system SHALL:
- Store an empty string as the description field
- No distinction between null and empty string in storage

WHEN a user submits a todo without start date, THEN THE system SHALL:
- Store null as the start date value
- Treat it as "not set" for all operations

WHEN a user submits a todo without due date, THEN THE system SHALL:
- Store null as the due date value
- Treat it as "not set" for all operations

WHEN a user submits a todo with start date after due date, THEN THE system SHALL:
- Accept and store the todo
- Record the logical inconsistency in internal logs
- Not prevent user from setting illogical dates

## Todo Viewing

WHEN a user requests their todo list, THE system SHALL:
- Return only todos belonging to the authenticated user
- Apply default pagination with 20 items per page
- Include for each todo: title, completion status, creation date, start date (if not null), due date (if not null)
- Exclude any personal information beyond the todo metadata

WHEN a user requests a specific todo by ID, THE system SHALL:
- Return all details: title, description, completion status, creation date, start date (if not null), due date (if not null), last updated date
- Include any associated edit history only upon separate request
- Validate that the requested todo belongs to the authenticated user

IF a user requests a todo by ID that belongs to another user, THEN THE system SHALL:
- Return HTTP 404 Not Found
- Not reveal whether the todo exists

IF a user requests a non-existent todo by ID, THEN THE system SHALL:
- Return HTTP 404 Not Found
- Not differentiate between non-existent and inaccessible todos

WHEN a user requests todo list with custom pagination parameters, THE system SHALL:
- Accept page size between 1-100 items
- Adjust pagination accordingly
- Return total item count for UI pagination controls
- Ensure all results are scoped to authenticated user

## Todo Completion Toggle

WHEN a user marks a todo as complete, THE system SHALL:
- Toggle the completion status from false to true
- Update the last updated timestamp to current time
- Return the updated todo object with new status
- Maintain all other properties unchanged

WHEN a user marks a todo as incomplete, THE system SHALL:
- Toggle the completion status from true to false
- Update the last updated timestamp to current time
- Return the updated todo object with new status
- Maintain all other properties unchanged

IF a user attempts to toggle completion status of a todo that belongs to another user, THEN THE system SHALL:
- Return HTTP 404 Not Found
- Not reveal whether the todo exists

IF a user attempts to toggle completion status of a non-existent todo, THEN THE system SHALL:
- Return HTTP 404 Not Found
- Not distinguish between non-existent and inaccessible todos

WHEN a user toggles completion status of a todo they've previously created, THEN THE system SHALL:
- Record the change in the todo's last updated timestamp
- Include the change in the edit history for visibility
- Maintain the todo's creation timestamp as immutable

## Todo Editing

WHEN a user edits a todo's title, THE system SHALL:
- Validate the new title is 1-200 characters
- Create an edit history entry recording the previous title
- Store the new title value
- Update the last updated timestamp

WHEN a user edits a todo's description, THE system SHALL:
- Validate the new description is 0-2,000 characters
- Create an edit history entry recording the previous description (if changed)
- Store the new description value
- Update the last updated timestamp

WHEN a user edits a todo's start date, THE system SHALL:
- Validate new date is in ISO 8601 format
- Create an edit history entry recording the previous start date (if changed)
- Store the new start date value
- Update the last updated timestamp

WHEN a user edits a todo's due date, THE system SHALL:
- Validate new date is in ISO 8601 format
- Create an edit history entry recording the previous due date (if changed)
- Store the new due date value
- Update the last updated timestamp

WHEN a user edits a todo without changing any field, THEN THE system SHALL:
- Do nothing
- Not create an edit history entry
- Not update the last updated timestamp

WHEN a user attempts to edit a todo that belongs to another user, THEN THE system SHALL:
- Return HTTP 404 Not Found
- Not reveal whether the todo exists

WHEN a user attempts to edit a non-existent todo, THEN THE system SHALL:
- Return HTTP 404 Not Found
- Not distinguish between non-existent and inaccessible todos

WHEN a user submits an empty title during edit, THEN THE system SHALL:
- Reject the edit with error: "Title is required"
- Maintain the original title
- Not update the last updated timestamp

WHEN a user submits a title exceeding 200 characters during edit, THEN THE system SHALL:
- Reject the edit with error: "Title cannot exceed 200 characters"
- Maintain the original title
- Not update the last updated timestamp

WHEN a user submits an invalid date format during edit, THEN THE system SHALL:
- Reject the edit with error: "Date must be in ISO 8601 format"
- Maintain the original date value
- Not update the last updated timestamp

WHEN a user submits a start date after due date during edit, THEN THE system SHALL:
- Accept the change
- Record both dates in edit history
- Not prevent illogical date relationships

## Edit History

WHEN a todo is edited, THE system SHALL:
- Create exactly one edit history entry per edit operation
- Include timestamp of the edit (UTC)
- Record previous value for any changed field (title, description, start date, due date)
- Store only the previous values of changed fields
- Exclude unchanged fields from the history entry
- Maintain the original creation values in the todo record, not history

WHEN a user requests the edit history of a todo, THE system SHALL:
- Return only history entries for that specific todo
- Sort entries from most recent to oldest
- Include timestamp and changed field values
- Include only the fields that changed in each edit
- Not include unchanged field values

IF a user requests the edit history of a todo that belongs to another user, THEN THE system SHALL:
- Return HTTP 404 Not Found
- Not reveal whether the todo exists

IF a user requests the edit history of a non-existent todo, THEN THE system SHALL:
- Return HTTP 404 Not Found
- Not distinguish between non-existent and inaccessible todos

WHEN a user deletes a todo from the normal list, THE system SHALL:
- Preserve all edit history entries
- Maintain the link between edit history and deleted todo
- Allow access to edit history even after todo is moved to trash

WHEN a user permanently deletes a todo from trash, THE system SHALL:
- Remove the todo from the database entirely
- Remove all associated edit history records
- Guarantee irretrievable deletion
- Return confirmation of permanent removal

WHEN a user restores a todo from trash, THE system SHALL:
- Keep the original creation timestamp as unchanged
- Keep all edit history entries intact
- Restore all original field values (title, description, start date, due date)
- Set completion status back to its original state (as of deletion)

## Todo Deletion

WHEN a user deletes a todo, THE system SHALL:
- Mark the todo as "deleted" in database (set is_deleted = true)
- Store the deletion timestamp
- Prevent the todo from appearing in normal todo lists
- Preserve all data including edit history
- Maintain association with user ID

WHEN a user attempts to delete a todo that belongs to another user, THEN THE system SHALL:
- Return HTTP 404 Not Found
- Not reveal whether the todo exists

WHEN a user attempts to delete a non-existent todo, THEN THE system SHALL:
- Return HTTP 404 Not Found
- Not distinguish between non-existent and inaccessible todos

WHEN a todo is marked as deleted, THE system SHALL:
- Exclude it from all API responses for active todo lists
- Allow it to be retrieved only through trash interface
- Preserve all original field values for potential restoration

## Trash Management

WHEN a user requests the trash list, THE system SHALL:
- Return only todos marked as deleted that belong to the authenticated user
- Apply default pagination with 20 items per page
- Include for each todo: title, creation date, deletion date, completion status at time of deletion
- Include the original due date and start date (if they existed)

WHEN a user restores a todo from trash, THE system SHALL:
- Set the todo's is_deleted flag to false
- Restore the todo to active status
- Update the last updated timestamp
- Remove the deletion timestamp
- Make it visible in the normal todo list

WHEN a user permanently deletes a todo from trash, THE system SHALL:
- Remove the todo from the database entirely
- Remove all associated edit history records
- Guarantee irreversible deletion
- Return confirmation message: "Todo and its history have been permanently deleted"

WHEN a user attempts to restore or permanently delete a todo that belongs to another user, THEN THE system SHALL:
- Return HTTP 404 Not Found
- Not reveal whether the todo exists

WHEN a user attempts to restore or permanently delete a non-existent todo, THEN THE system SHALL:
- Return HTTP 404 Not Found
- Not distinguish between non-existent and inaccessible todos

WHEN the trash list is empty, THE system SHALL:
- Return empty array with success status
- Display visual message: "Your trash is empty. All deleted todos have been restored or permanently deleted."

WHEN a user navigates to the trash while viewing the normal todo list, THE system SHALL:
- Change the context to trash view
- Disable all normal todo creation/edit operations
- Enable restore and permanent delete actions

## Filtering

WHEN a user applies filter "all todos", THE system SHALL:
- Return todos regardless of completion status
- Include both complete and incomplete todos
- Apply sorting according to current sort preference

WHEN a user applies filter "complete todos", THE system SHALL:
- Return only todos where completion status is true (completed)
- Exclude incomplete todos from results
- Apply pagination and sorting as configured

WHEN a user applies filter "incomplete todos", THE system SHALL:
- Return only todos where completion status is false (incomplete)
- Exclude complete todos from results
- Apply pagination and sorting as configured

IF a user submits an invalid filter parameter, THEN THE system SHALL:
- Default to "all todos" filter
- Display a warning message: "Invalid filter specified. Showing all todos."
- Preserve existing sort preferences

WHEN a user clears a filter selection, THE system SHALL:
- Return to "all todos" state
- Update the UI to reflect no active filter
- Maintain existing sort preferences

WHEN a user applies a filter while on a paginated view, THE system SHALL:
- Reset pagination to first page
- Recalculate total number of filtered items
- Update the UI with new total count
- Maintain sorting preferences

## Sorting

WHEN a user sorts by creation date (newest first), THE system SHALL:
- Order todos by creation timestamp descending (most recent first)
- Apply pagination per page
- Maintain filter state

WHEN a user sorts by creation date (oldest first), THE system SHALL:
- Order todos by creation timestamp ascending (oldest first)
- Apply pagination per page
- Maintain filter state

WHEN a user sorts by start date (earliest first), THE system SHALL:
- Order todos by start date ascending (earliest date first)
- Place todos with null start date at the end of the list
- Apply pagination per page
- Maintain filter state

WHEN a user sorts by start date (latest first), THE system SHALL:
- Order todos by start date descending (latest date first)
- Place todos with null start date at the end of the list
- Apply pagination per page
- Maintain filter state

WHEN a user sorts by due date (earliest first), THE system SHALL:
- Order todos by due date ascending (earliest date first)
- Place todos with null due date at the end of the list
- Apply pagination per page
- Maintain filter state

WHEN a user sorts by due date (latest first), THE system SHALL:
- Order todos by due date descending (latest date first)
- Place todos with null due date at the end of the list
- Apply pagination per page
- Maintain filter state

IF a user submits an invalid sort parameter, THEN THE system SHALL:
- Default to creation date (newest first)
- Display a warning message: "Invalid sort parameter. Defaulting to newest first."
- Maintain existing filter state

WHEN a user changes sorting order from one field to another, THE system SHALL:
- Reset pagination to first page
- Recalculate order according to new criteria
- Update the UI with new sort indicator
- Maintain current filter state

## Privacy

THE system SHALL implement complete user data isolation where:

- Every database query is automatically scoped to the authenticated user's ID
- No API endpoint returns data from another user under any circumstance
- All todos, edit histories, and trash items are completely isolated between users
- All user profiles are private and inaccessible to other users

WHEN any database query is executed for user data, THE system SHALL:
- Automatically inject WHERE user_id