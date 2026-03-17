**todoApp — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Users can create a new account by providing their email and password. They can authenticate by logging in with those same credentials. Users can update their password when needed. They can update their profile display name, which is the only piece of profile information. Users cannot read or view the profiles of other users, ensuring privacy. Users can delete their own account, which results in the permanent deletion of all their data, including todos and any associated edit history.

### Account Creation with Email and Password

### Account Creation with Email and Password

THE system SHALL allow users to create a new account.
WHEN a user provides an email address and password, THE system SHALL create a new user account with those credentials.
WHERE account creation is requested, THE system SHALL require a valid email format and a password that meets security requirements.
IF the email address is already registered to another account, THEN THE system SHALL reject the request and not create a duplicate account.
WHEN account creation succeeds, THE system SHALL establish the user's display name as a default value derived from the email address.
WHERE account creation occurs, THE system SHALL automatically associate the new user with their own private data space where todos will be stored.


### User Login Authentication

### User Login Authentication

THE system SHALL allow registered users to authenticate and access their account.
WHEN a user provides their registered email address and matching password, THE system SHALL verify the credentials and grant access to the user's account.
IF the email address does not match any registered account, THEN THE system SHALL reject the authentication request.
IF the provided password does not match the stored password for the given email address, THEN THE system SHALL reject the authentication request.
WHEN authentication succeeds, THE system SHALL establish a session that allows the user to perform authorized operations on their data.
WHERE authentication is attempted, THE system SHALL treat successful and failed authentication attempts privately, without revealing to the requester whether the email exists in the system.


### User Login Authentication
  

User Login 2026, 

### Disabled

content: 

## Todo Operations

Users can create a new todo item by specifying a required title and optional description, start date, and due date. New todos are created in an incomplete state. Users can read a paginated list of their todos, seeing title, completion status, start and due dates if set, and creation date. They can also view a single todo to see all its details including the full description. Users can toggle a todo's completion status between complete and incomplete. Users can edit the title, description, start date, and due date of their existing todos. Users can delete their own todos, which moves them to the trash rather than deleting them permanently. Users can filter their todo list by completion status: all, complete only, or incomplete only. Users can sort their todo list by creation date, start date, or due date, each with newest/oldest or earliest/latest options.

### Todo Creation

### Todo Creation

**Ubiquitous Requirements:**
- THE todoApp SHALL allow users to create a new todo item by specifying a title
- THE todoApp SHALL create todos with an incomplete completion status by default

**Event-Driven Requirements:**
- WHEN a user provides a title, THE todoApp SHALL create a new todo associated with the authenticated user
- WHEN a user creates a todo with an optional description, THE todoApp SHALL store the description value
- WHEN a user creates a todo with an optional start date, THE todoApp SHALL store the start date value
- WHEN a user creates a todo with an optional due date, THE todoApp SHALL store the due date value
- WHEN a user attempts to create a todo without a title, THE todoApp SHALL reject the request

**Business Rules for Default State:**
- WHERE a new todo is created, THE todoApp SHALL set the completion status to incomplete by default

**Note:** All todos are automatically associated with the creating user and cannot be created for other users.

### Todo List Viewing

### Todo List Viewing

**Ubiquitous Requirements:**
- THE todoApp SHALL allow users to view a paginated list of their own todos

**Event-Driven Requirements:**
- WHEN a user requests their todo list, THE todoApp SHALL return a paginated collection of todos
- WHEN displaying a todo in the list, THE todoApp SHALL show the title
- WHEN displaying a todo in the list, THE todoApp SHALL show the completion status
- WHEN displaying a todo in the list and the todo has a start date, THE todoApp SHALL show the start date
- WHEN displaying a todo in the list and the todo has a due date, THE todoApp SHALL show the due date
- WHEN displaying a todo in the list, THE todoApp SHALL show the creation date

**Pagination Requirements:**
- WHERE a user requests a page beyond available todos, THE todoApp SHALL return an appropriate response indicating no more items

**Privacy Requirement:**
- WHERE a user requests their todo list, THE todoApp SHALL return only todos belonging to that user

### Single Todo View

### Single Todo View

**Ubiquitous Requirements:**
- THE todoApp SHALL allow users to view detailed information about a single todo

**Event-Driven Requirements:**
- WHEN a user requests to view a specific todo, THE todoApp SHALL return all todo details
- WHEN displaying a single todo, THE todoApp SHALL show the title
- WHEN displaying a single todo, THE todoApp SHALL show the description (if present)
- WHEN displaying a single todo, THE todoApp SHALL show the completion status
- WHEN displaying a single todo and the todo has a start date, THE todoApp SHALL show the start date
- WHEN displaying a single todo and the todo has a due date, THE todoApp SHALL show the due date
- WHEN displaying a single todo, THE todoApp SHALL show the creation date

**Access Control Requirements:**
- WHERE a user attempts to view a todo that does not belong to them, THE todoApp SHALL reject the request
- WHERE a user attempts to view a todo that does not exist, THE todoApp SHALL reject the request

### Todo Completion Toggle

### Todo Completion Toggle

**Ubiquitous Requirements:**
- THE todoApp SHALL allow users to toggle a todo's completion status between complete and incomplete

**Event-Driven Requirements:**
- WHEN a user marks a todo as complete, THE todoApp SHALL update the completion status to complete
- WHEN a user marks a todo as incomplete, THE todoApp SHALL update the completion status to incomplete
- WHEN a todo's completion status is toggled, THE todoApp SHALL preserve all other todo properties unchanged

**Access Control Requirements:**
- WHERE a user attempts to toggle completion status of a todo that does not belong to them, THE todoApp SHALL reject the request
- WHERE a user attempts to toggle completion status of a todo that does not exist, THE todoApp SHALL reject the request

**Business Workflow:**
- This operation represents a simple toggle between two states: complete and incomplete

### Todo Editing

### Todo Editing

**Ubiquitous Requirements:**
- THE todoApp SHALL allow users to edit the properties of their existing todos

**Event-Driven Requirements:**
- WHEN a user edits a todo, THE todoApp SHALL update the todo with the new values
- WHEN a user changes the title, THE todoApp SHALL update the title value
- WHEN a user changes the description, THE todoApp SHALL update the description value
- WHEN a user changes the start date, THE todoApp SHALL update the start date value
- WHEN a user changes the due date, THE todoApp SHALL update the due date value
- WHEN a todo is edited, THE todoApp SHALL create a history entry recording the changes (refer to TodoHistory Operations in module 1)

**Access Control Requirements:**
- WHERE a user attempts to edit a todo that does not belong to them, THE todoApp SHALL reject the request
- WHERE a user attempts to edit a todo that does not exist, THE todoApp SHALL reject the request

**Validation Requirements (refer to 04-business-rules):**
- WHEN a user attempts to edit a todo with an empty title, THE todoApp SHALL reject the request
- WHEN a user attempts to set a due date that precedes the start date, THE todoApp SHALL reject the request

### Todo Soft Deletion

### Todo Soft Deletion

**Ubiquitous Requirements:**
- THE todoApp SHALL allow users to delete their own todos

**Event-Driven Requirements:**
- WHEN a user deletes a todo, THE todoApp SHALL move the todo to the trash instead of permanently removing it
- WHEN a todo is moved to the trash, THE todoApp SHALL remove it from the normal todo list
- WHEN a todo is moved to the trash, THE todoApp SHALL preserve the todo's data and edit history

**Access Control Requirements:**
- WHERE a user attempts to delete a todo that does not belong to them, THE todoApp SHALL reject the request
- WHERE a user attempts to delete a todo that does not exist, THE todoApp SHALL reject the request

**Business Workflow:**
- Deleted todos remain accessible through the trash view until permanently deleted

### Todo Filtering

### Todo Filtering

**Ubiquitous Requirements:**
- THE todoApp SHALL allow users to filter their todo list by completion status

**Event-Driven Requirements:**
- WHEN a user requests to view all todos (no filter), THE todoApp SHALL return both complete and incomplete todos
- WHEN a user filters to view only complete todos, THE todoApp SHALL return only todos with completion status set to complete
- WHEN a user filters to view only incomplete todos, THE todoApp SHALL return only todos with completion status set to incomplete

**Combination with Pagination:**
- WHERE a user applies a completion filter, THE todoApp SHALL apply the filter before paginating the results

**Filter Options:**
- Users can filter by: all todos, only complete todos, only incomplete todos

### Todo Sorting

### Todo Sorting

**Ubiquitous Requirements:**
- THE todoApp SHALL allow users to sort their todo list by date fields

**Event-Driven Requirements:**
- WHEN a user sorts by creation date with newest first, THE todoApp SHALL return todos ordered by creation date descending
- WHEN a user sorts by creation date with oldest first, THE todoApp SHALL return todos ordered by creation date ascending
- WHEN a user sorts by start date with earliest first, THE todoApp SHALL return todos ordered by start date ascending
- WHEN a user sorts by start date with latest first, THE todoApp SHALL return todos ordered by start date descending
- WHEN a user sorts by due date with earliest first, THE todoApp SHALL return todos ordered by due date ascending
- WHEN a user sorts by due date with latest first, THE todoApp SHALL return todos ordered by due date descending

**Optional Date Handling:**
- WHERE a todo does not have a start date set, THE todoApp SHALL place it at the end when sorting by start date
- WHERE a todo does not have a due date set, THE todoApp SHALL place it at the end when sorting by due date

**Combination with Filtering and Pagination:**
- WHERE a user applies sorting, THE todoApp SHALL apply the sort order before paginating the results
- WHERE a user applies both filtering and sorting, THE todoApp SHALL apply the filter, then apply the sort order, then paginate the results

### Trash Operations

### Trash Operations

**Ubiquitous Requirements:**
- THE todoApp SHALL allow users to view a list of their deleted todos (trash)
- THE todoApp SHALL allow users to restore deleted todos from trash
- THE todoApp SHALL allow users to permanently delete todos from trash

**Event-Driven Requirements:**
- WHEN a user views their trash, THE todoApp SHALL return a paginated list of deleted todos
- WHEN a user restores a todo from trash, THE todoApp SHALL return the todo to the normal todo list
- WHEN a user permanently deletes a todo from trash, THE todoApp SHALL permanently remove the todo and its edit history

**Access Control Requirements:**
- WHERE a user attempts to view, restore, or permanently delete a todo from trash that does not belong to them, THE todoApp SHALL reject the request
- WHERE a user attempts to restore or permanently delete a todo that does not exist in trash, THE todoApp SHALL reject the request

**Pagination Requirements:**
- WHERE a user requests a page beyond available items in trash, THE todoApp SHALL return an appropriate response indicating no more items

**Business Workflow:**
- Restored todos return to their previous state (including completion status and dates) as they were before deletion

## TodoHistory Operations

A history entry is automatically created every time a user edits a todo's title, description, start date, or due date. The system records what specific fields were changed and what their new values became at the time of the edit. Users can read the full edit history for any of their todos. The history is presented as a list sorted from the most recent edit to the oldest. History entries are permanently deleted when a todo is permanently removed from the trash. Users cannot edit or delete individual history entries; the history is an immutable audit log. The system ensures history entries are only accessible to the owner of the associated todo.

### History Creation on Todo Edit

Whenever a user edits any of their todo's editable fields (title, description, start date, or due date), the system automatically creates a new history entry. The history entry captures which specific fields were changed and what their new values became at the time of the edit. If multiple fields are edited in a single operation, the history entry records all changed fields. The system records the exact time the edit occurred. History creation is an automatic side effect of todo editing; users cannot create history entries directly.

### Viewing Todo Edit History

Users can view the full edit history for any of their todos. When viewing a todo's history, the system presents a list of all history entries associated with that todo. The list is sorted from the most recent edit to the oldest edit. Each history entry displays the timestamp of when the edit was made and indicates which fields were changed with their new values at that time. Users can see the chronological progression of changes to their todo over time through this history view.

### History Deletion with Permanent Todo Removal

When a user permanently deletes a todo from the trash, the system also permanently deletes all history entries associated with that todo. History entries are only removed through this permanent deletion process; they are not affected when a todo is moved to trash (soft deleted) or restored from trash. Once history entries are deleted through this process, they cannot be recovered. The deletion of history entries is an automatic side effect of permanent todo deletion.

### Immutable History Properties

Todo history entries are immutable once created. Users cannot edit, modify, or delete individual history entries. The history serves as a permanent audit log of all changes made to a todo. Even when a user edits a todo multiple times, each edit creates a separate, unchangeable history entry. This immutability ensures the integrity of the edit history as a reliable record of todo changes over time.

### History Privacy and Access Control

Users can only access the edit history of their own todos. Each user's todo history is completely private and cannot be viewed by other users. The system ensures that history entries are only accessible to the owner of the associated todo. When a user requests to view a todo's history, the system verifies that the user owns the todo before displaying any history entries. There is no mechanism for users to share or grant access to their todo history to other users.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

When users attempt to sign up with an email that already exists in the system, they receive an error message and cannot create a duplicate account. If a user provides an invalid email format during sign up or login, the system rejects the request and asks for correction. Password validation errors occur when users try to set a password that doesn't meet security requirements, such as being too short or too weak. During login, if a user provides incorrect credentials, the system does not reveal whether the email or password is wrong to prevent account enumeration attacks. When changing passwords, users must confirm their current password correctly; entering an incorrect current password results in a validation error. Account deletion requests fail if the user is not properly authenticated or if there's an issue with the authentication session. Profile editing errors occur if a user tries to set an empty display name or uses prohibited characters in their display name. Users attempting to access another user's profile receive an access denied error since profiles are private. Edge cases include handling concurrent login attempts from the same user and managing session expiration during critical operations.

### Duplicate Email Sign Up

WHEN a user attempts to sign up with an email address that already exists in the system, THE todoApp SHALL reject the request with an error message indicating that the email is already registered.

THE todoApp SHALL NOT create a duplicate user account.

THE todoApp SHALL NOT reveal whether any specific email address exists in the system during sign up.

### Invalid Email Format Validation

WHEN a user attempts to sign up or log in with an email address that does not match a valid email format, THE todoApp SHALL reject the request with an error message asking for a valid email address.

THE todoApp SHALL NOT accept email addresses that are empty or missing the @ symbol.

THE todoApp SHALL validate email format before attempting any database operations.

### Password Validation Failure

WHEN a user attempts to sign up or change their password with a password that does not meet security requirements, THE todoApp SHALL reject the request with an error message explaining the password requirements.

THE todoApp SHALL require passwords to meet minimum security standards for strength and length.

THE todoApp SHALL NOT store or process passwords that fail validation.

### Incorrect Login Credentials

WHEN a user attempts to log in with incorrect credentials (either wrong email or wrong password), THE todoApp SHALL reject the request with a generic error message that does not specify which part of the credentials was incorrect.

THE todoApp SHALL NOT reveal whether an email address exists in the system during login attempts.

THE todoApp SHALL treat all failed login attempts with the same error response to prevent account enumeration attacks.

### Current Password Confirmation Error

WHEN a user attempts to change their password but provides an incorrect current password, THE todoApp SHALL reject the request with an error message indicating that the current password is incorrect.

THE todoApp SHALL require users to correctly confirm their current password before allowing password changes.

THE todoApp SHALL NOT process password changes when the current password confirmation fails.

### Authentication Failure During Account Deletion

WHEN a user attempts to delete their account but is not properly authenticated or their authentication session has issues, THE todoApp SHALL reject the account deletion request with an error message indicating authentication failure.

THE todoApp SHALL require valid authentication for all account deletion operations.

THE todoApp SHALL NOT process account deletion for unauthenticated or improperly authenticated users.

### Empty Display Name Validation

WHEN a user attempts to set an empty display name during profile editing, THE todoApp SHALL reject the request with an error message indicating that display name cannot be empty.

THE todoApp SHALL require display names to contain at least one non-whitespace character.

THE todoApp SHALL NOT accept empty or whitespace-only display names.

### Prohibited Characters in Display Name

WHEN a user attempts to set a display name containing prohibited characters during profile editing, THE todoApp SHALL reject the request with an error message indicating which characters are not allowed.

THE todoApp SHALL validate display names against a set of allowed characters.

THE todoApp SHALL NOT accept display names containing characters that could cause security or display issues.

### Access Denied for Other User Profiles

WHEN a user attempts to view another user's profile, THE todoApp SHALL reject the request with an access denied error message.

THE todoApp SHALL ensure each user can only view their own profile.

THE todoApp SHALL NOT provide any information about other users' profiles, including whether they exist in the system.

### Concurrent Login Handling

WHEN multiple login attempts occur for the same user account simultaneously, THE todoApp SHALL process them in a way that maintains data integrity and prevents race conditions.

THE todoApp SHALL handle concurrent authentication attempts without allowing duplicate sessions to create security vulnerabilities.

THE todoApp SHALL manage simultaneous login requests to prevent account locking or inconsistent session states.

### Session Expiration During Operations

WHEN a user's session expires during a critical operation (such as account deletion or password change), THE todoApp SHALL terminate the operation and require the user to re-authenticate.

THE todoApp SHALL detect expired sessions and prevent continued operation with invalid authentication.

THE todoApp SHALL provide clear error messages when operations fail due to session expiration, directing users to log in again.

## Todo Error Scenarios

Users cannot create a todo without providing a title; the system rejects empty title submissions with a clear error message. When editing todos, users must have proper access permissions; attempts to edit another user's todo result in access denied errors. Date validation errors occur if users provide invalid date formats for start or due dates, or if due dates are set before start dates. Pagination edge cases include requesting pages beyond the available todo count, which should return empty results rather than errors. Filtering errors occur when users provide invalid filter criteria that don't match the allowed completion status options. Sorting edge cases involve handling todos without start or due dates, which appear at the end of sorted lists as specified. When marking todos complete or incomplete, the system validates that the todo belongs to the current user before allowing state changes. Trash operations have specific error conditions: users cannot restore todos that have been permanently deleted, and attempting to access non-existent trash items results in not found errors. Attempts to permanently delete todos that don't exist in the trash should be handled gracefully with appropriate error messages. Concurrent editing scenarios where multiple users attempt to modify the same todo (though not possible in this private app) are prevented by user isolation.

### Todo Creation Rejection Conditions

WHEN a user attempts to create a todo with an empty title, THE system SHALL reject the request and provide a clear error message.

WHEN a user attempts to create a todo with an invalid start date format, THE system SHALL reject the request and provide a clear error message.

WHEN a user attempts to create a todo with an invalid due date format, THE system SHALL reject the request and provide a clear error message.

IF a user provides both start date and due date and the due date is before the start date, THEN THE system SHALL reject the request and provide a clear error message.

---

---

### Unauthorized Todo Operations

WHEN a user attempts to edit a todo that does not belong to them, THE system SHALL reject the request with an access denied error.

WHEN a user attempts to mark a todo as complete or incomplete that does not belong to them, THE system SHALL reject the request with an access denied error.

WHEN a user attempts to view a todo that does not belong to them, THE system SHALL reject the request with an access denied error.

WHEN a user attempts to delete a todo that does not belong to them, THE system SHALL reject the request with an access denied error.

WHEN a user attempts to view the edit history of a todo that does not belong to them, THE system SHALL reject the request with an access denied error.

---

---

### Pagination and Filtering Edge Cases

WHEN a user requests a page number beyond the available number of pages for their todo list, THE system SHALL return an empty result set.

WHEN a user requests a page number beyond the available number of pages for their trash list, THE system SHALL return an empty result set.

WHEN a user provides an invalid filter criteria for completion status (not "all", "complete", or "incomplete"), THE system SHALL reject the request and provide a clear error message.

WHEN a user provides an invalid sort option for their todo list, THE system SHALL reject the request and provide a clear error message.

---

---

### Sorting Edge Cases

WHEN users sort their todo list by start date, todos without a start date SHALL appear at the end of the sorted list.

WHEN users sort their todo list by due date, todos without a due date SHALL appear at the end of the sorted list.

WHEN sorting by start date in ascending order (earliest first), todos without a start date SHALL appear after todos with valid start dates.

WHEN sorting by start date in descending order (latest first), todos without a start date SHALL appear after todos with valid start dates.

WHEN sorting by due date in ascending order (earliest first), todos without a due date SHALL appear after todos with valid due dates.

WHEN sorting by due date in descending order (latest first), todos without a due date SHALL appear after todos with valid due dates.

---

---

### Trash and Deletion Error Scenarios

WHEN a user attempts to restore a todo that has been permanently deleted from the trash, THE system SHALL reject the request with a not found error.

WHEN a user attempts to access a trash item that does not exist, THE system SHALL reject the request with a not found error.

WHEN a user attempts to permanently delete a todo that does not exist in the trash, THE system SHALL reject the request with a not found error.

WHEN a user attempts to permanently delete a todo that has already been permanently deleted, THE system SHALL reject the request with a not found error.

---

---

### System-Level Error Prevention

WHILE the system maintains complete user isolation for todo data, concurrent editing attempts by multiple users on the same todo SHALL be prevented by the user isolation design.

WHERE a user attempts to perform any operation on a todo, THE system SHALL first verify that the todo belongs to the current user before proceeding with the operation.

---

---

## TodoHistory Error Scenarios

Users can only view the edit history of their own todos; attempts to access another user's todo history result in access denied errors. When a todo has no edit history (newly created), the history view should display an appropriate message rather than showing empty content. History entries are immutable once created; any system issues during history creation should not corrupt existing history records. Edge cases include handling history for todos that have been permanently deleted from trash, where the history should also be removed. If a user tries to view history for a todo that doesn't exist or has been deleted, the system should provide a not found error. History sorting should always maintain chronological order from most recent to oldest, even when system time discrepancies occur. When todos are restored from trash, their edit history should remain intact and accessible as before deletion. System should handle scenarios where multiple rapid edits create history entries in quick succession without losing any changes. Users should receive appropriate error messages when network or system issues prevent loading todo history. The history display should gracefully handle todos with extensive edit histories by implementing pagination if needed.

### Unauthorized Todo History Access

THE SYSTEM SHALL prevent users from viewing the edit history of todos they do not own. WHEN a user attempts to view the edit history of another user's todo, THE SYSTEM SHALL reject the request and display an access denied error message.

### Empty Edit History for New Todo

THE SYSTEM SHALL handle todos with no edit history appropriately. WHEN a user views the edit history of a newly created todo that has never been edited, THE SYSTEM SHALL display a clear message indicating that no edit history exists yet, rather than showing empty content.

### Immutable History Entries

THE SYSTEM SHALL maintain the immutability of history entries. WHILE a todo history entry exists in the system, THE SYSTEM SHALL preserve its contents unchanged. IF system issues occur during history creation, THE SYSTEM SHALL NOT corrupt or modify existing history records. ANY attempt to modify a history entry after creation SHALL be prevented.

### History Removal with Permanent Todo Deletion

THE SYSTEM SHALL remove edit history when todos are permanently deleted. WHEN a user permanently deletes a todo from trash, THE SYSTEM SHALL permanently remove all edit history entries associated with that todo.

### History Not Found for Deleted Todo

THE SYSTEM SHALL handle requests for non-existent todo history appropriately. WHEN a user attempts to view the edit history of a todo that does not exist or has been deleted, THE SYSTEM SHALL reject the request and display a not found error message.

### Chronological History Sorting

THE SYSTEM SHALL maintain chronological order of history entries. WHERE a todo has edit history, THE SYSTEM SHALL sort and display entries from most recent to oldest, regardless of system time discrepancies or other technical considerations.

### History Preservation After Trash Restoration

THE SYSTEM SHALL preserve edit history when todos are restored from trash. WHEN a user restores a deleted todo from trash, THE SYSTEM SHALL maintain all edit history entries associated with that todo, making them accessible as before deletion.

### Rapid Sequential Edit Handling

THE SYSTEM SHALL handle multiple rapid edits reliably. WHEN a user makes multiple rapid edits to a todo in quick succession, THE SYSTEM SHALL create separate history entries for each edit without losing any changes or creating duplicate entries.

### System Issues Loading History

THE SYSTEM SHALL handle system failures during history retrieval gracefully. WHEN network or system issues prevent loading todo history, THE SYSTEM SHALL display an appropriate error message to the user without crashing or displaying partial data.

### Pagination for Extensive Edit Histories

THE SYSTEM SHALL handle todos with extensive edit histories appropriately. WHERE a todo has a large number of edit history entries, THE SYSTEM SHALL implement pagination to display the history in manageable sections rather than loading all entries at once.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### User Onboarding and First Todo Creation

A guest user signs up for the todo application and creates their first todo.

1. The user visits the application and selects the sign-up option
2. The user provides an email address and creates a password
3. The system validates the email format and password requirements
4. If validation passes, the system creates a new user account
5. The user is automatically logged into their new account
6. The user sees an empty todo list and selects the option to create a todo
7. The user provides a title for the todo
8. Optionally, the user adds a description, start date, and due date
9. The system validates the title is not empty and that the due date is not before the start date (if both provided)
10. The todo is created and appears in the user's todo list as incomplete
11. The user can now view their todo with all details including creation date

This scenario spans user account creation, authentication, and todo creation across multiple system domains.

### Todo Lifecycle Management

A member user manages a todo through its complete lifecycle.

1. The user creates a todo with a title, description, start date, and due date
2. The todo appears in the user's list with incomplete status
3. The user views the todo details to confirm all information
4. Later, the user edits the todo to update the description and due date
   - The system records this edit in the todo's history
5. The user marks the todo as complete
6. The todo's completion status changes in the list view
7. The user decides to delete the todo
   - The todo is moved to trash (soft deleted)
   - The todo no longer appears in the main todo list
8. The user views their trash list and sees the deleted todo
9. The user decides to restore the todo from trash
   - The todo returns to the main todo list
   - It retains its complete status and all details
10. Finally, the user decides to permanently delete the todo
    - The user moves the todo to trash again
    - The user selects permanent deletion from trash
    - The todo and all its edit history are permanently removed

This multi-step journey demonstrates the complete lifecycle of a todo from creation to permanent deletion.

### Advanced Todo Management with Edit History

A member user creates and edits a todo multiple times, then reviews the edit history.

1. The user creates a todo with title "Project Plan"
2. The user edits the todo to add a detailed description
   - System creates first history entry recording the description change
3. The user edits the todo to set a start date
   - System creates second history entry recording the start date change
4. The user edits the todo to update the due date
   - System creates third history entry recording the due date change
5. The user edits the todo to change the title to "Final Project Plan"
   - System creates fourth history entry recording the title change
6. The user views the todo's edit history
   - System displays all history entries sorted from most recent to oldest
   - Each entry shows when the edit was made and what fields changed
7. The user can trace the evolution of the todo through its history
8. The user marks the todo as complete
9. The user eventually deletes the todo
10. The user can still view the edit history while the todo is in trash

This scenario demonstrates how edit history provides transparency into todo evolution over time.

### Todo List Organization Workflow

A member user with multiple todos organizes their list using filtering and sorting.

1. The user has several todos with different completion statuses, start dates, and due dates
2. The user views their todo list with default sorting (creation date, newest first)
3. The user filters the list to show only incomplete todos
   - Complete todos are temporarily hidden from view
4. The user sorts the filtered list by due date (earliest first)
   - Todos with due dates appear sorted by date
   - Todos without due dates appear at the end
5. The user removes the filter to see all todos again
6. The user sorts by start date (latest first)
   - Todos with start dates appear sorted with most recent first
   - Todos without start dates appear at the end
7. The user creates a new todo, which appears at the top when sorted by creation date (newest first)
8. The user moves a completed todo to trash
   - The todo disappears from the main list
9. The user views the trash list (paginated)
10. The user restores a todo from trash
    - The todo reappears in the main list with its original properties

This user journey demonstrates how users can effectively organize and navigate their todo collection.