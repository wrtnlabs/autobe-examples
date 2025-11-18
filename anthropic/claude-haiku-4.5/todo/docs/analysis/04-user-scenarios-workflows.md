# User Scenarios and Workflows

## Primary User Workflows Overview

The Todo list application supports a complete user lifecycle from initial registration through regular todo management activities. This document describes the step-by-step interactions users will have with the system across all major workflows. Each scenario includes the primary happy path as well as error conditions and alternative flows users may encounter.

The application supports two primary user personas: guests (unauthenticated) and registered users (authenticated members). Guests can only access registration and login functions, while authenticated users gain full access to todo management capabilities.

---

## User Registration Scenario

### Overview
A new guest user creates a personal account by providing an email address and password. This is the entry point for users who do not yet have an account in the system.

### Complete Registration Flow

#### Step 1: User Accesses Registration
- Guest user navigates to or requests access to the registration functionality
- System displays the registration interface with fields for email and password

#### Step 2: User Enters Email Address
- User provides their email address in the email field
- System validates the email format in real-time as the user types
- User sees immediate feedback if the email format is invalid

#### Step 3: User Enters Password
- User provides a password in the password field
- System enforces password requirements:
  - Minimum 8 characters in length
  - Must contain at least one uppercase letter
  - Must contain at least one lowercase letter
  - Must contain at least one number
  - Must contain at least one special character (!@#$%^&*)
- System provides real-time feedback on password strength as user types

#### Step 4: User Confirms Password
- User re-enters password in a confirmation field to prevent typos
- System compares the two password entries
- User sees indication of whether passwords match

#### Step 5: System Validates Email Uniqueness
- Before registration can complete, system checks if email already exists in the system
- If email is already registered, system displays error message: "An account with this email already exists"
- User must provide a different email address

#### Step 6: Registration Submission
- User submits the registration form
- System performs final validation on all fields
- System creates new user account with hashed password
- System sends verification email to provided email address

#### Step 7: User Receives Verification Email
- Email arrives with a verification link
- User must click the verification link within 24 hours to activate account
- If user does not verify within 24 hours, they must request a new verification email

#### Step 8: User Completes Email Verification
- User clicks verification link from email
- System confirms email ownership
- Account becomes active and user can now log in
- System displays success message: "Your email has been verified. You can now log in."

### Error Scenarios During Registration

**Invalid Email Format**
- User enters "notanemail" or "user@" 
- System displays: "Please enter a valid email address"
- User must correct before proceeding

**Password Does Not Meet Requirements**
- User enters "password" (missing uppercase, number, special character)
- System displays: "Password must contain uppercase, lowercase, number, and special character"
- User must revise password to meet all requirements

**Passwords Do Not Match**
- User enters different values in password and confirmation fields
- System displays: "Passwords do not match"
- User must re-enter matching passwords

**Email Already Registered**
- User tries to register with an email that has an existing account
- System displays: "An account with this email already exists. Please use a different email or log in if you have an account."
- User either provides different email or accesses login

**Registration Submission Fails**
- System experiences temporary error during account creation
- System displays: "Registration failed. Please try again."
- User can retry the submission without re-entering information

**Verification Email Not Received**
- User did not receive verification email after 5 minutes
- User can request resend of verification email
- System sends new verification email to the registered address
- Previous verification link expires

---

## User Login Scenario

### Overview
A registered user authenticates into the system using their email address and password. This provides access to their personal todo list.

### Complete Login Flow

#### Step 1: User Accesses Login
- User navigates to or requests access to login functionality
- System displays login interface with email and password fields

#### Step 2: User Enters Email Address
- User provides their registered email address
- System does not validate format yet; validation occurs at submission

#### Step 3: User Enters Password
- User provides their password
- System masks the password display for security (shows asterisks)

#### Step 4: User Submits Login
- User submits login form
- System validates credentials against stored user account

#### Step 5: Credentials Verified Successfully
- Email and password match a registered, verified account
- System generates a JWT token containing:
  - User ID
  - User email
  - User role ("user")
  - Token expiration time (15 minutes from issue)
  - Refresh token (valid for 7 days)
- System creates user session
- User is redirected to their todo dashboard
- System displays welcome message: "Welcome back, [user email]"

#### Step 6: User Gains System Access
- User now has full access to all authenticated user features
- All subsequent requests include the JWT token for authentication
- User can see their personalized todo list

### Error Scenarios During Login

**Email Not Found**
- User enters email that does not exist in system
- System displays: "Invalid email or password"
- System does not indicate which field was incorrect (security best practice)
- User can retry or access registration/password reset

**Incorrect Password**
- User enters correct email but wrong password
- System displays: "Invalid email or password"
- System does not reveal which field was incorrect (security best practice)
- User can retry or use password reset feature

**Account Not Verified**
- User enters credentials for account that has not verified email
- System displays: "Please verify your email before logging in. Check your inbox for verification email."
- User must complete email verification before login access

**Account Locked (After Multiple Failed Attempts)**
- User enters incorrect password 5 times in succession
- System locks account temporarily for security
- System displays: "Account temporarily locked due to multiple failed login attempts. Please try again in 15 minutes."
- User must wait or use password reset option

**Login Submission Fails**
- System experiences temporary error during authentication
- System displays: "Login failed. Please try again."
- User can retry without re-entering information

---

## Creating a Todo - Complete Flow

### Overview
An authenticated user creates a new todo item in their personal todo list. This is the primary way users add tasks to track.

### Complete Todo Creation Flow

#### Step 1: User Initiates Todo Creation
- User navigates to todo creation interface or selects "New Todo" option
- System displays todo creation form with required and optional fields
- Form includes:
  - Title field (required)
  - Description field (optional)
  - Due date field (optional)
  - Priority level selector (optional)

#### Step 2: User Enters Todo Title
- User types title describing the task
- System validates title in real-time:
  - Title must not be empty
  - Title cannot exceed 200 characters
  - System provides character count feedback
- User sees validation status as they type

#### Step 3: User Enters Optional Description
- User optionally provides more details about the task
- System validates description:
  - Description cannot exceed 1000 characters
  - System provides character count feedback
- Field is completely optional; user can skip

#### Step 4: User Sets Optional Due Date
- User optionally selects a due date using date picker
- System requirements:
  - Due date must be today or in the future
  - Cannot set due date in the past
  - Date format is consistent with system locale
- If user attempts past date, system displays: "Due date cannot be in the past"

#### Step 5: User Sets Optional Priority
- User optionally selects priority level from options: Low, Medium, High
- Default priority is Medium if not specified
- User sees clear indication of selected priority

#### Step 6: Form Validation Before Submission
- Before user can submit, system validates entire form:
  - Title is required and not empty
  - Title does not exceed character limit
  - Description does not exceed character limit (if provided)
  - Due date is valid if provided
  - All values are of correct data type
- If validation fails, system highlights problematic fields and displays specific error messages

#### Step 7: User Submits New Todo
- User submits the form
- System authenticates user's session
- System creates new todo with:
  - Unique ID generated by system
  - Assigned to authenticated user
  - Current timestamp as creation date
  - Completion status set to incomplete
  - All provided fields stored
- System confirms successful creation

#### Step 8: User Receives Confirmation
- System displays success message: "Todo created successfully"
- New todo appears in user's todo list
- Form clears or closes, returning user to todo list view
- New todo is immediately visible with all provided information

### Error Scenarios During Todo Creation

**Missing Required Title**
- User attempts to submit form without title
- System displays: "Title is required"
- Form submission is blocked until title is provided

**Title Exceeds Character Limit**
- User enters title longer than 200 characters
- System displays: "Title cannot exceed 200 characters"
- User must shorten title before submission

**Description Exceeds Character Limit**
- User enters description longer than 1000 characters
- System displays: "Description cannot exceed 1000 characters"
- User must shorten description

**Invalid Due Date Format**
- User enters date in incorrect format
- System displays: "Please enter a valid date"
- Date picker ensures correct format if used

**Past Due Date Selected**
- User attempts to set due date to a date in the past
- System displays: "Due date cannot be in the past"
- User must select current date or future date

**Authentication Session Expired**
- User's session expires while creating todo
- System displays: "Your session has expired. Please log in again."
- User must log in again; form data may be preserved

**System Error During Creation**
- System encounters error while saving todo
- System displays: "Failed to create todo. Please try again."
- User can retry submission

---

## Viewing All Todos - Complete Flow

### Overview
An authenticated user views their complete list of todos. This is the primary interface where users see all their tasks.

### Complete Todo List Viewing Flow

#### Step 1: User Accesses Todo Dashboard
- Authenticated user navigates to or requests their todo list
- System retrieves user's complete todo list
- User's authentication token is verified
- System ensures user can only see their own todos

#### Step 2: System Retrieves and Organizes Todos
- System fetches all todos belonging to authenticated user
- Default display order is by creation date (newest first)
- System displays:
  - Todo title
  - Due date (if set)
  - Priority level (if set)
  - Completion status (completed or pending)
- System shows total count of all user's todos
- System shows count of pending (incomplete) todos

#### Step 3: User Sees Organized Todo List
- Todos are displayed in clear, readable format
- Each todo shows essential information at a glance
- User can see immediately which tasks are pending
- User can see which tasks have due dates

#### Step 4: User Applies Optional Filters
- User can filter todos by status:
  - View all todos
  - View only pending/incomplete todos
  - View only completed todos
- System instantly updates display to show filtered results
- Currently applied filter is clearly indicated

#### Step 5: User Sorts Todo List
- User can optionally change sort order:
  - By creation date (newest first - default)
  - By creation date (oldest first)
  - By due date (earliest due first)
  - By due date (latest due first)
  - By priority (high to low)
- System instantly reorders todos based on selected sort
- Currently applied sort order is clearly indicated

#### Step 6: User Interacts with Individual Todos
- From list view, user can:
  - Click/select a todo to view full details
  - Mark todo as complete (single action)
  - Delete a todo (with confirmation)
  - Edit a todo
  - Create a new todo

### Error Scenarios While Viewing Todos

**No Todos Exist Yet**
- New user views empty todo list
- System displays: "No todos yet. Create your first todo to get started."
- User sees button to create new todo

**Session Expired**
- User's session expires while viewing list
- System displays: "Your session has expired. Please log in again."
- User must re-authenticate

**Cannot Retrieve Todo List**
- System encounters error fetching todos
- System displays: "Unable to load todos. Please try again."
- User can refresh page or try again

**Todos Modified by Another Session**
- User deletes todo or makes changes in another browser window
- List updates automatically to reflect changes
- User sees real-time synchronization

---

## Completing a Todo - Complete Flow

### Overview
An authenticated user marks a pending todo as complete. This tracks task progress and helps users see what they've accomplished.

### Complete Todo Completion Flow

#### Step 1: User Identifies Target Todo
- User sees pending todo in their list
- Todo shows completion status as incomplete
- User selects or indicates desire to complete this todo

#### Step 2: User Initiates Completion
- User clicks completion action/checkbox on the todo
- System may require confirmation depending on implementation
- Action is immediate and clear

#### Step 3: System Updates Todo Completion Status
- System verifies user authentication
- System verifies todo belongs to authenticated user
- System updates todo record:
  - Completion status changed from incomplete to complete
  - Current timestamp recorded as completion time
  - Todo preserved in system (not deleted)
- System confirms the update

#### Step 4: User Receives Confirmation
- System displays success message: "Todo marked as complete"
- Todo's visual appearance updates to indicate completion:
  - May show checkmark or strikethrough
  - May change color or opacity
  - May move in list if using filtered view
- If user is in filtered view (showing only pending), completed todo disappears from current view
- Completed todo appears in "completed todos" view if that filter is applied

#### Step 5: User Sees Updated Statistics
- Total pending todo count decreases by one
- Completion percentage or progress indicator updates
- User sees immediate feedback on progress

### Error Scenarios During Todo Completion

**Todo Not Found**
- System cannot find the todo being completed
- System displays: "Todo not found. It may have been deleted."
- User must refresh and try again

**Authentication Failed**
- User's session has expired
- System displays: "Your session has expired. Please log in again."
- User must re-authenticate before completing todos

**Permission Denied**
- User attempts to complete a todo that doesn't belong to them (should not occur in normal use)
- System displays: "You do not have permission to modify this todo"
- User can only see and modify their own todos

**Concurrent Modification**
- User attempts to complete a todo that another session just deleted
- System displays: "This todo has been deleted and is no longer available"
- User must refresh list

**System Error**
- System encounters error while updating completion status
- System displays: "Failed to update todo. Please try again."
- Todo remains in previous state; user can retry

---

## Editing a Todo - Complete Flow

### Overview
An authenticated user modifies an existing todo's details. Users can update title, description, due date, or priority.

### Complete Todo Editing Flow

#### Step 1: User Identifies Todo to Edit
- User navigates to or selects a specific todo from their list
- User indicates desire to edit (via edit button or action menu)

#### Step 2: System Loads Todo Edit Form
- System retrieves full todo details for authenticated user's todo
- System displays edit form pre-populated with current values:
  - Current title
  - Current description
  - Current due date
  - Current priority level
  - Current completion status (may or may not be editable)
- All fields are clearly labeled and match creation interface

#### Step 3: User Modifies Todo Fields
- User can modify any of the editable fields:
  - Title (must not be empty, max 200 characters)
  - Description (max 1000 characters)
  - Due date (must not be in past)
  - Priority level (Low, Medium, High)
  - Completion status (if editable)
- System provides real-time validation feedback as user makes changes
- User sees what has changed compared to original values

#### Step 4: Form Validation Before Submission
- Before user can submit, system validates all changes:
  - Title is not empty
  - Title does not exceed 200 characters
  - Description does not exceed 1000 characters
  - Due date is valid (not in past, if provided)
  - All values are correct data type
  - At least one field has been changed (or allows submission anyway)
- If validation fails, system highlights problematic fields

#### Step 5: User Submits Changes
- User submits the edit form
- System authenticates user session
- System verifies todo still exists and belongs to user
- System applies all changes to todo record
- System records timestamp of last modification
- System confirms successful update

#### Step 6: User Receives Confirmation
- System displays success message: "Todo updated successfully"
- If user is viewing todo detail, all fields update to show new values
- If user is viewing todo list, updated values appear in list
- User is returned to appropriate view (list or detail)

### Error Scenarios During Todo Editing

**Title Made Empty**
- User clears the title field
- System displays: "Title is required"
- User must provide a title before submission

**Title Exceeds Character Limit**
- User enters title longer than 200 characters
- System displays: "Title cannot exceed 200 characters"
- User must shorten

**Description Exceeds Character Limit**
- User enters description longer than 1000 characters
- System displays: "Description cannot exceed 1000 characters"
- User must shorten

**Invalid Due Date**
- User sets due date to a date in the past
- System displays: "Due date cannot be in the past"
- User must select current or future date

**No Changes Made**
- User opens edit form and submits without making any changes
- System may allow submission (no error) or display: "No changes made"
- Behavior depends on implementation preference

**Todo Deleted by Another Session**
- User attempts to edit todo that was deleted elsewhere
- System displays: "This todo has been deleted and is no longer available"
- User must refresh list

**Authentication Session Expired**
- User's session expires while editing
- System displays: "Your session has expired. Please log in again."
- User must re-authenticate; edit may be lost

**System Error During Save**
- System encounters error while saving changes
- System displays: "Failed to update todo. Please try again."
- Todo retains original values; user can retry

---

## Deleting a Todo - Complete Flow

### Overview
An authenticated user permanently removes a todo from their list. Once deleted, the todo cannot be recovered.

### Complete Todo Deletion Flow

#### Step 1: User Identifies Todo to Delete
- User sees todo in their list
- User selects delete action for that todo

#### Step 2: System Requests Confirmation
- System displays confirmation dialog/message
- Message states: "Are you sure you want to delete this todo? This action cannot be undone."
- User sees the todo title being deleted to prevent accidental deletion of wrong todo
- User has two options: Confirm deletion or Cancel

#### Step 3: User Confirms Deletion
- User explicitly confirms they want to delete
- System verifies user is authenticated
- System verifies todo exists and belongs to authenticated user
- System permanently deletes todo record from database
- System confirms deletion

#### Step 4: User Receives Confirmation
- System displays success message: "Todo deleted successfully"
- Deleted todo immediately disappears from user's todo list
- If user is viewing todo list:
  - Todo no longer appears in any view or filter
  - Total todo count decreases
  - Pending todo count may decrease (if todo was incomplete)
- If user was viewing specific todo details, returns to list

#### Step 5: List Updates Automatically
- All active views reflect the deletion
- Refresh is not required to see changes
- Deletion is permanent and irreversible

### Error Scenarios During Todo Deletion

**User Cancels Deletion**
- User clicks "Cancel" in confirmation dialog
- Todo is not deleted
- User remains viewing the todo or returns to list
- No error message needed

**Todo Not Found**
- System cannot find todo to delete
- System displays: "Todo not found. It may have already been deleted."
- User is returned to todo list

**Authentication Failed**
- User's session has expired
- System displays: "Your session has expired. Please log in again."
- User must re-authenticate

**Permission Denied**
- User attempts to delete todo that doesn't belong to them
- System displays: "You do not have permission to delete this todo"
- User can only delete their own todos

**Concurrent Deletion**
- User attempts to delete todo that another session just deleted
- System displays: "This todo has already been deleted"
- User is returned to list which reflects the deletion

**System Error During Deletion**
- System encounters error while deleting
- System displays: "Failed to delete todo. Please try again."
- Todo remains in system; user can retry deletion

---

## Logging Out Scenario

### Overview
An authenticated user ends their session and logs out of the system. After logout, user must re-authenticate to access their todos again.

### Complete Logout Flow

#### Step 1: User Initiates Logout
- User selects logout option from menu or interface
- User may or may not see confirmation (implementation choice)

#### Step 2: System Terminates Session
- System clears user's JWT token
- System invalidates user's session
- User's refresh token is revoked or marked as used
- System records logout timestamp
- User is no longer authenticated

#### Step 3: User Is Redirected
- User is redirected to login page or welcome page
- System displays success message: "You have been logged out successfully"
- All previous access to authenticated features is revoked

#### Step 4: System Clears User Data
- System may clear sensitive data from client storage
- User's cached todos are cleared from local storage
- Authentication token is removed
- User cannot access protected features without re-login

#### Step 5: User Can Log In Again
- User can now log in with their credentials
- Login process creates new session and new JWT token
- User is returned to their todo list with all previous data intact

### Error Scenarios During Logout

**Session Already Expired**
- User attempts to logout but session already expired
- System displays: "You have been logged out"
- User is redirected to login page
- No error condition; normal flow continues

**Logout Request Fails**
- System encounters error during logout
- System displays: "Logout failed. Please try again."
- User can retry or force logout by closing browser/clearing session

**User Navigates Away Without Logout**
- User closes browser or leaves application without explicit logout
- Session eventually expires on server after inactivity
- Next time user tries to access application, they must log in again

---

## Workflow Summary and User Journey Map

### Primary Happy Path User Journey
1. Guest navigates to application
2. Guest registers new account (email verification required)
3. Guest logs in with registered credentials
4. User creates their first todo
5. User views todo list
6. User continues adding, editing, completing, and deleting todos
7. User logs out when finished

### Extended User Journey
- User logs in again later
- User finds all previous todos intact
- User completes tasks and marks todos as complete
- User edits details as priorities change
- User deletes completed or no-longer-needed todos
- User logs out

### Decision Points in User Workflows
- Guest chooses to register or has existing account (login path)
- User chooses to filter/sort todos by preference
- User chooses to edit, complete, or delete existing todos
- User chooses to add optional fields (description, due date, priority) or keep todos simple

### Error Recovery Paths
- Users encountering validation errors can correct and resubmit
- Users with expired sessions must re-authenticate
- Users attempting invalid actions receive clear error messages and guidance
- Users can always cancel operations and return to previous state