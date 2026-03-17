**multiUserTodo — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users sign up with an email address and password to create a new account. The email must be unique across all users. Users log in with their registered email and password combination. Each user has a display name in their profile that they can edit at any time. Users cannot view other users' profiles since this is a private todo application. Users can change their password after logging in. When a user deletes their account, all their todos are permanently removed including any items in the trash. This account deletion is irreversible and removes all associated data.

### Account Creation and Registration

Users can create a new account by providing an email address and password. The email address must be unique across all registered users. If a user attempts to register with an email that already exists, the registration request is rejected. The password must be provided during signup and cannot be empty. Once registered, the user can log in using their email and password combination.

### User Authentication

Users can log in to the system using their registered email address and password. If the email does not exist in the system, the login request is rejected. If the password does not match the registered credentials, the login request is rejected. Successful authentication grants the user access to their private todo list and profile.

### Profile Management and Privacy

Each user has a profile containing a display name. Users can edit their display name at any time after logging in. The display name is the only profile information visible to the user themselves. Users cannot view other users' profiles or access any information about other registered users. This privacy restriction applies to all users regardless of their account status.

### Password Change

Users can change their account password after successfully logging in. The new password must be provided and cannot be empty. The change takes effect immediately and the user must use the new password for subsequent logins. If the user provides an incorrect current password, the password change request is rejected.

### Account Deletion and Data Removal

Users can delete their own account. When an account is deleted, all todos owned by that user are permanently removed from the system. This includes todos in the normal list and todos in the trash. All edit history associated with those todos is also permanently deleted. Account deletion is irreversible and cannot be undone. Once deleted, the user's email address becomes available for new registration.

## Todo Rules

Users create todos with a required title and optional description, start date, and due date. The title field cannot be empty when creating a new todo. Description, start date, and due date can all be left empty if not needed. Newly created todos are incomplete by default. Users can mark a todo as complete or incomplete as a simple toggle between two states. Users can edit the title, description, start date, and due date of their existing todos. Every edit to a todo is recorded in its history. Deleted todos are soft deleted and do not appear in the normal todo list. Users can filter their todo list by completion status including all, complete only, or incomplete only. Users can sort their todo list by creation date, start date, or due date in either ascending or descending order. Todos without a start date appear at the end when sorting by start date. Todos without a due date appear at the end when sorting by due date.

### Todo Creation Validation

When creating a new todo, the title field must be provided and cannot be empty. If the title is missing or empty, the creation request is rejected.

The description field is optional and may be left empty. The start date and due date fields are also optional and may be left empty if not needed.

When a todo is created without a completion status specified, it defaults to incomplete.

### Todo Completion Toggle

Users can toggle a todo's completion status between complete and incomplete. This is a simple two-state toggle with no intermediate states.

Marking a todo as complete or incomplete is recorded as an edit and creates a history entry.

### Todo Editing Rules

Users can edit the title, description, start date, and due date of their existing todos.

Every edit to any of these fields creates a new history entry that records what was changed and when.

### Todo Soft Deletion

When a user deletes a todo, it is soft deleted and moved to the trash. Soft deleted todos no longer appear in the normal todo list.

Soft deleted todos retain all their data including edit history until permanently deleted from the trash.

### Todo List Filtering by Completion Status

Users can filter their todo list by completion status with three options:
- All todos (both complete and incomplete)
- Only complete todos
- Only incomplete todos

Filtering applies only to non-deleted todos in the normal list.

### Todo List Sorting Rules

Users can sort their todo list by the following criteria:
- Creation date (newest first or oldest first)
- Start date (earliest first or latest first)
- Due date (earliest first or latest first)

When sorting by start date, todos without a start date appear at the end of the list.

When sorting by due date, todos without a due date appear at the end of the list.

## TodoHistory Rules

Each todo has an edit history that tracks all changes made to it. Every time a todo is edited, a new history entry is created automatically. Each history entry records when the edit was made. Each history entry records what values were changed including title, description, start date, and due date if they were modified. Users can view the full edit history of any of their todos. History entries are sorted from most recent to oldest. When a todo is permanently deleted from the trash, its edit history is also permanently deleted. Only the owner of a todo can view its edit history.

### Edit History Creation

THE system SHALL create a new history entry every time a todo is edited.

THE system SHALL automatically generate a history entry when any of the following fields are modified: title, description, start date, or due date.

THE system SHALL NOT create a history entry when a todo is created; history begins with the first edit after creation.

### History Entry Content

THE system SHALL record the timestamp of when each edit was made in every history entry.

THE system SHALL record the new title value in a history entry if the title was changed during that edit.

THE system SHALL record the new description value in a history entry if the description was changed during that edit.

THE system SHALL record the new start date value in a history entry if the start date was changed during that edit.

THE system SHALL record the new due date value in a history entry if the due date was changed during that edit.

THE system SHALL NOT record values that were not changed in a history entry; only modified fields are recorded.

### History Viewing

THE system SHALL allow users to view the full edit history of any todo they own.

THE system SHALL display history entries sorted from most recent to oldest when a user views a todo's history.

THE system SHALL reject any request to view a todo's edit history if the requesting user is not the owner of that todo.

### History Deletion on Permanent Delete

THE system SHALL permanently delete all history entries associated with a todo when that todo is permanently deleted from the trash.

THE system SHALL NOT retain any history entries after a todo is permanently deleted; the history is unrecoverable once the todo is permanently removed.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering Rules

Users can filter their todo list by completion status to view specific subsets of their todos.

Three filter options are available:
- All todos: Shows both complete and incomplete todos
- Only complete todos: Shows todos that have been marked as complete
- Only incomplete todos: Shows todos that have not yet been marked as complete

The filter applies to the normal todo list view. The trash view shows only deleted todos and is not affected by completion status filters.

When a filter is applied, only todos matching the selected completion status appear in the list. Todos not matching the filter are excluded from the results but remain in the system.

### Sorting Rules

Users can sort their todo list by different date criteria to organize how todos appear.

Three sort criteria are available:
- Creation date: Sorts todos by when they were created, with options for newest first or oldest first
- Start date: Sorts todos by their start date, with options for earliest first or latest first
- Due date: Sorts todos by their due date, with options for earliest first or latest first

Todos without a start date appear at the end of the list when sorting by start date.

Todos without a due date appear at the end of the list when sorting by due date.

Todos without a creation date cannot occur, as todos are always created with a timestamp.

The sort order applies to the normal todo list view. The trash view may also support sorting, but only for deleted todos.

### Pagination Rules

Users can browse their todo lists using pagination to manage large numbers of todos.

The normal todo list is paginated to display todos in manageable batches.

The trash list is also paginated to display deleted todos in manageable batches.

Pagination allows users to navigate through their complete set of todos without loading all results at once.

Users can navigate between pages to view todos that do not fit on the current page.

Pagination applies independently to filtered and sorted views, so the page size and navigation work consistently regardless of how the list is filtered or sorted.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Authentication and Account Errors

When a user attempts to sign up with an email address that is already registered, the system shall reject the registration request.

When a user attempts to log in with incorrect email or password credentials, the system shall reject the login request.

When a user attempts to log in with an email address that has not been registered, the system shall reject the login request.

When a user attempts to change their password with incorrect current password, the system shall reject the password change request.

When a user attempts to delete their account, all todos belonging to that user, including those in the trash, are permanently deleted and cannot be recovered.

### Todo Creation and Modification Errors

When a user attempts to create a todo without providing a title, the system shall reject the creation request.

When a user attempts to create a todo with a due date that is earlier than the start date, the system shall reject the creation request.

When a user attempts to edit a todo with a due date that is earlier than the start date, the system shall reject the update request.

When a user attempts to edit a todo that does not exist, the system shall reject the update request.

When a user attempts to edit a todo that belongs to another user, the system shall reject the update request.

When a user attempts to delete a todo that does not exist, the system shall reject the deletion request.

When a user attempts to delete a todo that belongs to another user, the system shall reject the deletion request.

### Todo Access Errors

When a user attempts to view a single todo that does not exist, the system shall reject the request.

When a user attempts to view a single todo that belongs to another user, the system shall reject the request.

When a user attempts to mark a todo as complete or incomplete that does not exist, the system shall reject the request.

When a user attempts to mark a todo as complete or incomplete that belongs to another user, the system shall reject the request.

When a user attempts to view the edit history of a todo that does not exist, the system shall reject the request.

When a user attempts to view the edit history of a todo that belongs to another user, the system shall reject the request.

### Trash Management Errors

When a user attempts to restore a deleted todo from the trash that does not exist, the system shall reject the restoration request.

When a user attempts to restore a deleted todo from the trash that belongs to another user, the system shall reject the restoration request.

When a user attempts to permanently delete a todo from the trash that does not exist, the system shall reject the permanent deletion request.

When a user attempts to permanently delete a todo from the trash that belongs to another user, the system shall reject the permanent deletion request.

When a user attempts to permanently delete a todo from the trash, the system shall also permanently delete all edit history associated with that todo.