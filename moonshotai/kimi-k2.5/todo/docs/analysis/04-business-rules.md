**multiUserTodo — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must provide a unique email address and a password to create an account. The email serves as the primary identifier for login and must not already be registered by another user. Passwords are required for authentication during login attempts. Users may update their password at any time after account creation. Each user maintains a display name that represents their profile identity. Users can modify their display name whenever needed. When a user chooses to delete their account, all associated todos and trash items must be permanently removed from the system. Display names are personal to each user and private to their account.

### Unique Email Requirement

THE system SHALL require that each user's email address be unique across all user accounts.

WHEN a user attempts to register with an email address, THE system SHALL verify that the email address is not already registered by another user.

IF the email address is already registered, THEN THE system SHALL reject the registration request.

### Password Authentication

THE system SHALL require a password for user account authentication during login.

WHEN a user submits login credentials, THE system SHALL validate that the provided password matches the password associated with the email address.

If the password does not match, THE system SHALL reject the authentication request.

THE system SHALL allow authenticated users to change their password at any time after account creation.

### Account Creation Rules

WHEN a guest requests to create an account, THE system SHALL require both an email address and a password.

If the email address is missing, THEN THE system SHALL reject the account creation request.

If the password is missing, THEN THE system SHALL reject the account creation request.

### Display Name Management

THE system SHALL allow each user to have a display name representing their profile identity.

THE system SHALL permit authenticated users to modify their display name at any time.

When a user updates their display name, THE system SHALL apply the change immediately.

### Profile Privacy

THE system SHALL ensure that a user's display name and profile are private to that user.

IF a user attempts to view another user's profile, THEN THE system SHALL prevent access.

THE system SHALL only permit users to view their own profile information and display name.

### Account Deletion Consequences

WHEN a user requests to delete their account, THE system SHALL permanently remove all data associated with that user.

THE system SHALL delete all todos belonging to the user, including those in the trash.

THE system SHALL delete all edit history entries belonging to the user's todos.

THE system SHALL delete all trash entries belonging to the user.

After account deletion, THE system SHALL not retain any user data, todos, or associated records.

## Todo Rules

Every todo must have a title provided by the user at creation time. The description, start date, and due date fields are optional and may remain empty. When first created, all todos begin in an incomplete state. Only the todo owner can view or manage their todos due to complete data isolation requirements. Deleted todos are moved to a trash state rather than being immediately removed from the system. Users can filter todos by completion status to view all, complete only, or incomplete only items. Sorting operations must handle optional dates by placing items without dates at the end of sorted lists. Todos can be toggled between complete and incomplete states without restriction.

### Todo Creation Rules

THE user-to-system SHALL REQUIRE a title for each todo at creation time.

WHEN a todo is being created, THE system SHALL accept an optional description from the user.

WHEN a todo is being created, THE system SHALL accept an optional start date from the user.

WHEN a todo is being created, THE system SHALL accept an optional due date from the user.

IF the due date is earlier than the start date, THEN THE system SHALL reject the todo creation request.

WHEN a todo is successfully created, THE system SHALL assign it an incomplete completion status by default.

### Todo Ownership and Access Rules

THE system SHALL enforce complete ownership isolation for todos.

IF a request is made to access a todo, THEN THE system SHALL verify the requesting user is the owner.

IF a user who is not the owner attempts to view a todo, THEN THE system SHALL reject the request.

IF a user who is not the owner attempts to edit a todo, THEN THE system SHALL reject the request.

IF a user who is not the owner attempts to delete a todo, THEN THE system SHALL reject the request.

IF the ownership verification fails, THEN THE system SHALL prevent all access to the todo.

### Todo Deletion and Trash Rules

WHEN a user deletes a todo, THE system SHALL move the todo to trash rather than permanently removing it.

IF a todo is in trash, THEN THE system SHALL exclude it from the normal todo list view.

WHEN a deleted todo is restored from trash, THE system SHALL return it to the normal todo list.

IF a user permanently deletes a todo from trash, THEN THE system SHALL remove the todo and all associated edit history.

### Todo Completion Status Rules

THE system SHALL allow users to toggle a todo between complete and incomplete states.

WHEN a user marks a todo as complete, THE system SHALL update the completion status to complete.

WHEN a user marks a todo as incomplete, THE system SHALL update the completion status to incomplete.

THE system SHALL provide filtering options by completion status.

Users SHALL be able to filter todos to view all todos, only complete todos, or only incomplete todos.

### Todo Sorting and Null Date Handling Rules

THE system SHALL support sorting todos by creation date in newest first or oldest first order.

THE system SHALL support sorting todos by start date in earliest first or latest first order.

THE system SHALL support sorting todos by due date in earliest first or latest first order.

WHEN sorting by start date, THE system SHALL place todos without a start date at the end of the sorted list.

WHEN sorting by due date, THE system SHALL place todos without a due date at the end of the sorted list.

## TodoHistory Rules

Every edit to a todo generates a history entry that records the exact timestamp when the change occurred. Each history entry captures the previous values for any fields that were modified during the edit, including title, description, start date, and due date. Fields that remain unchanged during an edit are not recorded in that history entry. History entries are maintained in chronological order from most recent to oldest for each todo. When a todo is permanently deleted from the trash, all its associated history entries must also be removed. Users can view the complete edit history for any of their todos. The history provides an audit trail of all modifications made to a todo over its lifetime.

### Edit History Generation

WHEN a user edits a todo, THE system SHALL create a history entry recording the exact timestamp when the change occurred.

THE system SHALL capture the previous value for each field modified during the edit, including title, description, start date, and due date.

IF a field remains unchanged during an edit, THE system SHALL NOT record that field in the history entry.

A single history entry SHALL contain the timestamp and all previous values for fields changed in that specific edit operation.

### History Retrieval and Ordering

THE system SHALL maintain edit history entries in chronological order from most recent to oldest for each todo.

THE system SHALL provide users with the complete edit history for any todo they own.

WHEN a todo is permanently deleted from trash, THE system SHALL remove all associated edit history entries.

## TodoTrash Rules

Deleted todos transition to a soft-deleted state in the trash rather than being immediately removed. Soft-deleted todos are excluded from the normal todo list but remain accessible through a dedicated trash view. Users can restore a soft-deleted todo to return it to the active todo list. Users can permanently delete a todo from the trash, which removes it entirely from the system. Permanent deletion of a todo also causes the deletion of all its associated edit history entries. The trash list supports pagination for browsing deleted items. Soft-deleted todos retain their complete data including title, description, dates, and completion status but remain hidden from normal views.

### Soft Delete Transition

WHEN a member chooses to delete their own todo, THE system SHALL transition that todo to a soft-deleted state in the trash.

The todo retains all its data: title, description, completion status, start date, due date, and creation date.

IF the todo does not exist, THEN the request SHALL be rejected.
IF the todo belongs to another member, THEN the request SHALL be rejected.
IF the todo is already in the trash, THEN the request SHALL be rejected without creating a duplicate trash entry.

### Exclusion from Normal Lists

WHILE a todo is in the trash, THE todo SHALL NOT appear in the member's normal todo list.

The trash state SHALL supersede all filtering by completion status: a soft-deleted todo SHALL NOT appear when filtering for complete todos, incomplete todos, or when showing all todos in the normal list.

The trash state SHALL supersede all sorting: a soft-deleted todo SHALL NOT be considered in sort orders by creation date, start date, or due date in the normal list.

IF a member attempts to view a soft-deleted todo through the normal list view, THEN the request SHALL be rejected.

### Trash View Rules

WHEN a member browses their trash, THE system SHALL display only their own soft-deleted todos.

The trash list SHALL be paginated.
IF a member attempts to browse another member's trash, THEN the request SHALL be rejected.
IF the trash contains no soft-deleted todos, THEN the system SHALL indicate an empty trash.

Each soft-deleted todo in the trash SHALL display: title, completion status, start date (if set), due date (if set), creation date, and deletion date.

### Restoration to Active List

WHEN a member chooses to restore a todo from their trash, THE system SHALL return that todo to the active list.

IF the todo does not exist in the trash, THEN the request SHALL be rejected.
IF the todo belongs to another member, THEN the request SHALL be rejected.
IF the todo has already been permanently deleted, THEN the request SHALL be rejected.

Upon successful restoration, the todo SHALL immediately appear in the member's active todo list and be subject to the member's current filter and sort preferences.

### Permanent Deletion Consequences

WHEN a member permanently deletes a todo from their trash, THE system SHALL remove that todo entirely from the system.

IF the todo does not exist in the trash, THEN the request SHALL be rejected.
IF the todo belongs to another member, THEN the request SHALL be rejected.
IF the todo has already been permanently deleted, THEN the request SHALL be rejected.

THE system SHALL delete all edit history entries belonging to that todo upon permanent deletion.
After permanent deletion, the todo CANNOT be restored, viewed, or recovered by any means.

```mermaid
flowchart LR
    A[\"Active Todo\"] -->|\"Member deletes\"| B[\"Soft-Deleted in Trash\"]
    B -->|\"Member restores\"| A
    B -->|\"Member permanently deletes\"| C[\"Permanently Removed\"]
    C -->|\"History cascade deleted\"| D[\"No Recovery\"]
```

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering Todos by Completion Status

WHEN browsing their todo list, THE system SHALL allow the user to filter by completion status: All todos, Only complete todos, or Only incomplete todos.

WHEN the user does not specify a completion status filter, THE system SHALL display all todos by default.

WHEN filtering by "Only complete todos", THE system SHALL display todos where the completion status is marked as complete.

WHEN filtering by "Only incomplete todos", THE system SHALL display todos where the completion status is marked as incomplete.

WHEN a filter is applied that matches no todos, THE system SHALL display an empty list indication.

### Sorting Options and Order

WHEN browsing their todo list, THE system SHALL allow the user to sort by creation date, start date, or due date.

WHEN sorting by creation date, THE system SHALL support ordering by newest first or oldest first.

WHEN sorting by start date or due date, THE system SHALL support ordering by earliest first or latest first.

WHILE sorting by start date, THE system SHALL place todos without a start date at the end of the list.

WHILE sorting by due date, THE system SHALL place todos without a due date at the end of the list.

### List Pagination

WHEN displaying a todo list or trash list, THE system SHALL paginate the results.

WHEN paginating, THE system SHALL display a subset of items per page.

WHEN the user navigates to another page, THE system SHALL display the corresponding subset of items.

IF the user requests a page beyond the available data, THE system SHALL return an empty result.

WHEN the total number of items changes, THE system SHALL adjust the number of pages accordingly.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Account Creation Failures

IF a guest attempts to create an account with an email address that is already associated with an existing member, THEN THE system SHALL reject the request.

IF a guest provides a password that does not match the confirmation password, THEN THE system SHALL reject the account creation request.

WHEN account creation is rejected due to email already existing, THE system SHALL indicate that the email is already in use.

### Authentication Failures

IF a guest provides an email address that is not associated with any member account, THEN THE system SHALL reject the authentication request.

IF a guest provides a password that does not match the password associated with the provided email address, THEN THE system SHALL reject the authentication request.

WHEN authentication is rejected, THE system SHALL indicate that the credentials are invalid without specifying which field was incorrect.

### Todo Validation Failures

IF a member attempts to create a todo without providing a title, THEN THE system SHALL reject the request.

IF a member attempts to create or edit a todo with a due date that precedes the start date, THEN THE system SHALL reject the request.

WHEN a todo creation or modification is rejected, THE system SHALL indicate which fields failed validation.

### Access Control Violations

IF a member attempts to view, edit, complete, delete, or restore a todo that belongs to another member, THEN THE system SHALL reject the request.

IF a member attempts to view the edit history of a todo that belongs to another member, THEN THE system SHALL reject the request.

IF a guest attempts to perform any operation that is restricted to members, THEN THE system SHALL reject the request.

WHEN access is denied due to ownership violation, THE system SHALL indicate that the requested todo does not exist or is not accessible.

### Resource Not Found

IF a member attempts to view, edit, complete, delete, or restore a todo using an identifier that does not correspond to any existing todo owned by that member, THEN THE system SHALL reject the request.

IF a member attempts to permanently delete or restore an item from trash using an identifier that does not correspond to any todo currently in trash owned by that member, THEN THE system SHALL reject the request.

WHEN a requested resource is not found, THE system SHALL indicate that the requested item does not exist.

### Operation State Violations

IF a member attempts to edit, complete, or mark incomplete a todo that has been soft-deleted (is in trash), THEN THE system SHALL reject the request.

IF a member attempts to delete a todo that is already in trash, THEN THE system SHALL reject the request as a duplicate operation.

IF a member attempts to restore a todo that is not currently in trash, THEN THE system SHALL reject the request.

WHEN an operation is rejected due to state violation, THE system SHALL indicate the reason the operation cannot be performed on the current state.