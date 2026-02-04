# Multi-User Todo Application Requirements Specification

## User Account

WHEN a new user attempts to sign up, THE system SHALL require a valid email address and a password of at least 8 characters.

WHEN a user submits a sign-up request, THE system SHALL:
- Validate the email format (standard email pattern)
- Check that the email is not already registered
- Hash the password using bcrypt with a cost factor of 12
- Generate a unique user ID
- Store the email, hashed password, and user ID in the database
- Send a confirmation email containing a unique activation link

IF the email is already registered, THEN THE system SHALL display: "This email is already in use."
IF the password is less than 8 characters, THEN THE system SHALL display: "Password must be at least 8 characters long."
IF the email format is invalid, THEN THE system SHALL display: "Please enter a valid email address."

WHEN the user clicks the activation link, THE system SHALL:
- Verify the activation token from the URL
- Update the user account status from "pending" to "active"
- Redirect the user to the login page with success message: "Your account has been activated. You can now log in."

WHEN a registered user attempts to log in, THE system SHALL:
- Require both email and password
- Retrieve the user record by email
- Compare the provided password with the stored hash

IF the email is not found, THEN THE system SHALL display: "Invalid email or password."
IF the password does not match, THEN THE system SHALL display: "Invalid email or password."

WHEN credentials are valid, THE system SHALL:
- Generate a JWT access token with payload: {"userId": "string", "role": "user"}
- Set an httpOnly, Secure, SameSite=Strict refresh token cookie with 7-day expiry
- Return the access token in the Authorization header as "Bearer {token}"
- Redirect the user to /dashboard

WHEN a user is authenticated, THE system SHALL maintain their session as long as:
- The access token is valid (15-minute expiry)
- The refresh token cookie is present and valid

IF the access token expires, THE system SHALL:
- Automatically request a new access token using the refresh token
- Successfully return a new access token if the refresh token is valid

IF the refresh token is invalid or expired, THE system SHALL:
- Clear both tokens
- Redirect the user to the login page with message: "Session expired. Please log in again."

WHEN a user requests to change their password, THE system SHALL:
- Require current password, new password, and password confirmation
- Validate that new password matches confirmation
- Validate that new password is at least 8 characters
- Verify the current password matches the stored hash

IF the current password is incorrect, THEN THE system SHALL display: "Current password is incorrect."
IF the new password and confirmation do not match, THEN THE system SHALL display: "New passwords do not match."
IF the new password is less than 8 characters, THEN THE system SHALL display: "Password must be at least 8 characters long."

WHEN all validations pass, THE system SHALL:
- Hash the new password using bcrypt with cost factor 12
- Update the stored password hash in the database
- Invalidate all existing refresh tokens for this user
- Send a password change confirmation email
- Redirect to dashboard with message: "Password changed successfully."

WHEN a user requests to delete their account, THE system SHALL:
- Display a confirmation modal with text: "Are you sure you want to delete your account? This will permanently remove all your todos, edit history, and account information. This action cannot be undone."
- Require explicit user confirmation

WHEN the user confirms deletion, THE system SHALL:
- Delete all todos associated with the user
- Delete all edit history records associated with those todos
- Delete the user record from the user table
- Invalidate all access and refresh tokens
- Remove all user-specific session data
- Redirect to the registration page with message: "Your account has been permanently deleted. Thank you for using TodoApp."

## User Profile

WHEN a user is logged in, THE system SHALL display their current display name on the dashboard.

WHEN a user clicks "Edit Profile", THE system SHALL display a form with a single field: "Display Name".

THE display name field SHALL:
- Allow up to 100 characters
- Accept alphanumeric characters, spaces, and basic punctuation (.,-,_,()")
- Be optional - may be left empty

WHEN the form is submitted, THE system SHALL validate:
- Display name does not exceed 100 characters
- The name does not contain prohibited characters (script tags, HTML markup)

IF the display name is too long, THEN THE system SHALL display: "Display name cannot exceed 100 characters."
IF the display name contains invalid characters, THEN THE system SHALL display: "Display name contains invalid characters."

WHEN validation passes, THE system SHALL:
- Update the user's display_name field in the database
- Return the updated display name in the response
- Update the UI immediately with the new name

WHEN a user attempts to view another user's profile, THE system SHALL:
- Validate that the requested user ID matches the authenticated user ID
- Return a 404 Not Found response if the IDs do not match
- Ensure no user information is exposed for any other user ID

## Creating Todos

WHEN a user clicks "New Todo", THE system SHALL display a modal form with:
- Title (required text field)
- Description (optional text area)
- Start Date (optional date picker)
- Due Date (optional date picker)

WHEN the form is submitted, THE system SHALL validate:
- Title is not empty or whitespace only
- If provided, start date is a valid ISO 8601 date (YYYY-MM-DD)
- If provided, due date is a valid ISO 8601 date (YYYY-MM-DD)
- If both start and due dates are provided, due date is not earlier than start date

IF the title is empty, THEN THE system SHALL display: "Title is required."
IF the start date is invalid, THEN THE system SHALL display: "Invalid start date format. Please use YYYY-MM-DD."
IF the due date is invalid, THEN THE system SHALL display: "Invalid due date format. Please use YYYY-MM-DD."
IF the due date is earlier than start date, THEN THE system SHALL display: "Due date cannot be earlier than start date."

WHEN all validations pass, THE system SHALL:
- Create a new todo record with:
  - unique ID
  - title as provided
  - description as provided (or null if empty)
  - start_date as provided (or null if empty)
  - due_date as provided (or null if empty)
  - status as "incomplete" (default)
  - created_at as current timestamp in UTC
  - updated_at as current timestamp in UTC
  - owner_id as the authenticated user ID
- Return the created todo object in response
- Add the todo to the top of the todo list in the UI
- Clear the form

## Viewing Todos

WHEN a user accesses the dashboard, THE system SHALL:
- Retrieve todos for the authenticated user
- Filter out any todos with status "deleted"
- Apply pagination with limit of 10 todos per page
- Sort by created_at descending (newest first)

THE response SHALL contain:
- Array of todo items, each with:
  - id: unique identifier
  - title: string
  - status: "incomplete" or "complete"
  - start_date: date string or null
  - due_date: date string or null
  - created_at: date string
- Total count of matching todos
- Pagination metadata: currentPage, totalPages, hasNextPage, hasPrevPage

WHEN a user requests a specific page, THE system SHALL:
- Accept page parameter (default: 1)
- Validate page is integer >= 1
- Return 400 Bad Request if page is invalid

WHEN a user clicks on a specific todo to view details, THE system SHALL:
- Retrieve the complete todo record including:
  - id
  - title
  - description
  - start_date
  - due_date
  - status
  - created_at
  - updated_at
  - owner_id
- Return 404 Not Found if the todo does not exist for the authenticated user
- Return 404 Not Found if the todo has status "deleted"
- Return 200 OK with todo details if valid

## Completing Todos

WHEN a user clicks "Toggle Complete" on a todo, THE system SHALL:
- Validate the todo exists and belongs to the authenticated user
- Validate the todo status is not "deleted"

WHEN validation passes, THE system SHALL:
- Toggle the status field:
  - If "incomplete" → change to "complete"
  - If "complete" → change to "incomplete"
- Set updated_at to current timestamp
- Return the updated todo object
- Update the UI immediately

WHEN a user tries to toggle a todo with status "deleted", THE system SHALL:
- Return 404 Not Found
- Not update the status

## Editing Todos

WHEN a user clicks "Edit" on a todo, THE system SHALL:
- Display the same form as in "Creating Todos", pre-filled with current values

WHEN the form is submitted after editing, THE system SHALL:
- Validate all fields with same rules as in "Creating Todos"
- Compare new values with current values

WHEN validation passes, THE system SHALL:
- Update the todo record with new values
- Set updated_at to current timestamp
- Create a new edit history entry with:
  - todo_id: reference to the updated todo
  - timestamp: current timestamp
  - changed_title: new value if title changed, null if unchanged
  - changed_description: new value if description changed, null if unchanged
  - changed_start_date: new value if start date changed, null if unchanged
  - changed_due_date: new value if due date changed, null if unchanged
- Return the updated todo object
- Update the UI immediately

## Edit History

WHEN a user requests edit history for a specific todo, THE system SHALL:
- Validate the todo exists and belongs to the authenticated user
- Validate the todo status is not "deleted"
- Retrieve all edit history entries for that todo
- Sort entries by timestamp descending (newest first)

THE response SHALL contain an array of history entries, each with:
- id: unique identifier
- todo_id
- timestamp: ISO 8601 format
- changed_title: string or null
- changed_description: string or null
- changed_start_date: date string or null
- changed_due_date: date string or null

WHEN a todo has no edit history, THE system SHALL return an empty array

WHEN a user tries to access edit history for a todo they don't own, THE system SHALL:
- Return 404 Not Found

## Deleting Todos

WHEN a user clicks "Delete" on a todo, THE system SHALL:
- Display a confirmation modal: "Are you sure you want to delete this todo? It will be moved to your trash."
- Require explicit user confirmation

WHEN confirmation is given, THE system SHALL:
- Update the todo's status from "incomplete" or "complete" to "deleted"
- Update updated_at to current timestamp
- Immediately remove the todo from the main todo list display
- Maintain all data including edit history
- Return success message: "Todo moved to trash."

WHEN a deleted todo is retrieved in normal list queries, THE system SHALL:
- Filter out todos with status = "deleted"
- Not return any data about the todo

## Trash

WHEN a user navigates to the Trash section, THE system SHALL:
- Retrieve all todos with status = "deleted" belonging to the authenticated user
- Apply pagination with limit of 10 per page
- Sort by deleted_at (implicit from updated_at) descending

THE response SHALL contain:
- Array of todo items with:
  - id
  - title
  - created_at
  - updated_at (as deletion timestamp)
  - original status ("incomplete" or "complete")
- Total count
- Pagination metadata

WHEN a user clicks "Restore" on a todo in trash, THE system SHALL:
- Validate the todo has status = "deleted" and belongs to the authenticated user
- Update the status from "deleted" to "incomplete"
- Update updated_at to current timestamp
- Remove from trash list
- Add to main todo list, sorted by created_at descending
- Return success message: "Todo restored."

WHEN a user clicks "Permanent Delete" on a todo in trash, THE system SHALL:
- Display confirmation: "Are you sure you want to permanently delete this todo and its history? This cannot be undone."
- Require explicit confirmation

WHEN confirmed, THE system SHALL:
- Delete the todo record entirely from the database
- Delete all associated edit history entries
- Return success message: "Todo and its history have been permanently deleted."

WHEN the trash is empty, THE system SHALL display: "Your trash is empty. All deleted todos have been restored or permanently deleted."

## Filtering Todos

WHEN a user selects a filter option, THE system SHALL:
- Accept filter parameter: "all", "complete", or "incomplete"
- Apply to the main todo list (excluding deleted todos)
- Default to "all" when no filter is specified

IF filter = "all", THE system SHALL return:
- All todos with status "incomplete" or "complete" and not "deleted"

IF filter = "complete", THE system SHALL return:
- Only todos with status = "complete" and not "deleted"

IF filter = "incomplete", THE system SHALL return:
- Only todos with status = "incomplete" and not "deleted"

IF filter is invalid, THE system SHALL:
- Return 400 Bad Request with message: "Invalid filter option. Use 'all', 'complete', or 'incomplete'."

## Sorting Todos

WHEN a user selects a sort option, THE system SHALL:
- Accept sort parameter: "created_newest", "created_oldest", "start_earliest", "start_latest", "due_earliest", "due_latest"
- Default to "created_newest" when no sort is specified
- Always filter out "deleted" todos

IF sort = "created_newest", THE system SHALL:
- Order by created_at DESC

IF sort = "created_oldest", THE system SHALL:
- Order by created_at ASC

IF sort = "start_earliest", THE system SHALL:
- Order by start_date ASC
- Place todos with null start_date at the end

IF sort = "start_latest", THE system SHALL:
- Order by start_date DESC
- Place todos with null start_date at the end

IF sort = "due_earliest", THE system SHALL:
- Order by due_date ASC
- Place todos with null due_date at the end

IF sort = "due_latest", THE system SHALL:
- Order by due_date DESC
- Place todos with null due_date at the end

IF sort value is invalid, THE system SHALL:
- Return 400 Bad Request with message: "Invalid sort option. Choose from: created_newest, created_oldest, start_earliest, start_latest, due_earliest, due_latest."

## Privacy

WHEN any request is made to the API, THE system SHALL automatically scope all queries to the authenticated user ID.

FOR ALL operations (create, read, update, delete):
- THE system SHALL validate that the authenticated user matches the owner_id of the resource
- THE system SHALL return 404 Not Found if the resource is not owned by the authenticated user
- THE system SHALL NOT expose any information about other users' resources
- THE system SHALL NOT return any metadata that indicates existence of other users' data

WHEN a user attempts to access any resource (todo, edit history, user profile):
- THE system SHALL validate ownership using JWT claims
- THE system SHALL never expose another user's email, ID, or any identifier
- THE system SHALL never allow cross-user queries

WHEN data is deleted:
- THE system SHALL ensure complete removal from backup systems
- THE system SHALL ensure no residual data remains accessible

WHEN authentication tokens are generated:
- THE system SHALL ensure no token can be used to access resources of another user
- THE system SHALL bind all token claims strictly to the authenticated user ID

NO FEATURE SHALL allow:
- Viewing another user's todos
- Accessing another user's edit history
- Deleting another user's items
- Editing another user's profile
- Any cross-user data interaction

THE system SHALL implement strict data isolation at every layer: database queries, business logic, and API endpoints.
