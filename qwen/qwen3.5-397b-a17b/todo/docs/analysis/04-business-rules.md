**todoApp — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must provide both email and password to create an account. Email and password are also required for login authentication. Each user has a display name that can be edited after account creation. Users can change their password at any time through the account settings. When a user deletes their account, all their todos are permanently removed including those in the trash. Users cannot view or access other users' profiles as this is a private todo application. Each user's todos remain completely private and inaccessible to other users. There is no functionality to share or expose todos to other users in the system.

### Account Creation and Authentication

Users must provide both email and password to create an account. If email is not provided during signup, the request is rejected. If password is not provided during signup, the request is rejected.

Users must provide both email and password to log in. If email is not provided during login, the request is rejected. If password is not provided during login, the request is rejected. If the provided email and password do not match an existing account, the login request is rejected.

### Profile Management

Each user has a display name that can be edited after account creation. When a user updates their display name, the system saves the new value.

Users can change their password at any time through account settings. When changing password, the user must provide their current password. If the current password is not provided correctly, the password change request is rejected.

### Account Deletion

When a user deletes their account, all todos owned by that user are permanently removed, including todos in the trash. All edit history associated with the user's todos is also permanently removed.

Once an account is deleted, the account and all associated data cannot be recovered. The account deletion operation is irreversible.

### Privacy and Access Control

Users cannot view other users' profiles. If a user attempts to access another user's profile, the request is rejected. There is no functionality to browse or search for other users' profiles.

Each user's todos are completely private and inaccessible to other users. If a user attempts to access another user's todo, the request is rejected. There is no functionality to share or expose todos to other users.

## Todo Rules

Every todo must have a title which is required and cannot be empty. Description is optional and can be left empty when creating or editing a todo. Start date is optional and users can create todos without specifying when they begin. Due date is optional and users can create todos without a deadline. Newly created todos are automatically set to incomplete status by default. Users can toggle a todo between complete and incomplete states at any time. Each todo belongs to exactly one user and cannot be accessed by others. Todos without a start date appear at the end when sorting by start date. Todos without a due date appear at the end when sorting by due date.

### Title Validation

### Title Validation

THE system SHALL require a title for every todo.
IF the title is empty or contains only whitespace, THEN THE system SHALL reject the todo creation request.
IF the title is empty or contains only whitespace, THEN THE system SHALL reject the todo update request.

### Optional Fields

### Optional Fields

WHERE the description field is provided or not provided, THE system SHALL accept the todo creation or update request.
WHERE the start date field is provided or not provided, THE system SHALL accept the todo creation or update request.
WHERE the due date field is provided or not provided, THE system SHALL accept the todo creation or update request.

### Completion Status Default

### Completion Status Default

WHEN a todo is created, THE system SHALL set its completion status to incomplete.
THE system SHALL NOT allow a todo to be created with a completion status of complete.

### Completion Toggle

### Completion Toggle

THE system SHALL allow users to change a todo's completion status from incomplete to complete.
THE system SHALL allow users to change a todo's completion status from complete to incomplete.
THE system SHALL enforce that completion status has only two valid states: complete and incomplete.

### Ownership and Access

### Ownership and Access

THE system SHALL assign each todo to exactly one user who created it.
THE system SHALL NOT allow a todo to be transferred to another user.
IF a user attempts to view another user's todo, THEN THE system SHALL reject the request.
IF a user attempts to edit another user's todo, THEN THE system SHALL reject the request.
IF a user attempts to delete another user's todo, THEN THE system SHALL reject the request.

### Null Date Sorting

### Null Date Sorting

WHEN sorting todos by start date, THE system SHALL place todos without a start date at the end of the list.
WHEN sorting todos by due date, THE system SHALL place todos without a due date at the end of the list.
THE system SHALL apply this behavior regardless of whether the sort order is earliest-first or latest-first.

## TodoEditHistory Rules

Every edit to a todo automatically creates a history entry without user intervention. Each history entry records the timestamp when the edit was made. History entries capture what the title was changed to if the title was modified. History entries capture what the description was changed to if the description was modified. History entries capture what the start date was changed to if the start date was modified. History entries capture what the due date was changed to if the due date was modified. History entries are always sorted from most recent to oldest when viewed. When a todo is permanently deleted from trash, its entire edit history is also permanently deleted. Users can view the full edit history of any todo they own.

### Automatic History Entry Creation

Every edit to a todo automatically creates a history entry without requiring any action from the user. The system records the timestamp when each edit is made. History entries are created automatically whenever a user edits the todo's title, description, start date, or due date.

### Field Change Tracking

Each history entry records what the title was changed to if the title was modified during the edit. Each history entry records what the description was changed to if the description was modified during the edit. Each history entry records what the start date was changed to if the start date was modified during the edit. Each history entry records what the due date was changed to if the due date was modified during the edit. If a field was not changed during an edit, no record of that field is stored in the history entry.

### History Display and Ordering

Users can view the full edit history of any todo they own. History entries are always displayed sorted from most recent to oldest when viewed.

### History Deletion on Permanent Delete

When a todo is permanently deleted from the trash, its entire edit history is also permanently deleted. The history cannot be recovered once the todo is permanently deleted.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Todo List Filtering

THE system SHALL provide three filter options for the todo list: all todos, only complete todos, and only incomplete todos.
WHEN a user selects a filter option, THE system SHALL display only todos matching that completion status.
THE filter SHALL apply only to the normal todo list and SHALL NOT affect the trash view.
IF an invalid filter option is requested, THEN THE system SHALL reject the request.

### Todo List Sorting

THE system SHALL allow users to sort their todo list by creation date, start date, or due date.
WHEN sorting by creation date, THE system SHALL support newest first or oldest first order.
WHEN sorting by start date, THE system SHALL support earliest first or latest first order.
WHEN sorting by due date, THE system SHALL support earliest first or latest first order.
WHILE sorting by start date, THE system SHALL place todos without a start date at the end of the list regardless of sort direction.
WHILE sorting by due date, THE system SHALL place todos without a due date at the end of the list regardless of sort direction.
IF an invalid sort field or direction is requested, THEN THE system SHALL reject the request.

### Todo List Pagination

THE system SHALL paginate the todo list to manage large numbers of items.
THE system SHALL paginate the trash list.
WHEN a user navigates through pages, THE system SHALL display the todos or deleted todos for that page.
IF a requested page number is out of range, THEN THE system SHALL return an empty page.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Access and Ownership Errors

IF a guest attempts to access any todo functionality, THEN THE system SHALL reject the request.
IF a user attempts to view a todo that they do not own, THEN THE system SHALL reject the request.
IF a user attempts to edit a todo that they do not own, THEN THE system SHALL reject the request.
IF a user attempts to mark a todo as complete that they do not own, THEN THE system SHALL reject the request.
IF a user attempts to mark a todo as incomplete that they do not own, THEN THE system SHALL reject the request.
IF a user attempts to delete a todo that they do not own, THEN THE system SHALL reject the request.
IF a user attempts to restore a todo from trash that they do not own, THEN THE system SHALL reject the request.
IF a user attempts to permanently delete a todo that they do not own, THEN THE system SHALL reject the request.
IF a user attempts to view the edit history of a todo that they do not own, THEN THE system SHALL reject the request.
IF a user attempts to edit their display name while not logged in, THEN THE system SHALL reject the request.
IF a user attempts to change their password while not logged in, THEN THE system SHALL reject the request.
IF a user attempts to delete their account while not logged in, THEN THE system SHALL reject the request.

### State-Based Errors

IF a user attempts to restore a todo that is not in the trash, THEN THE system SHALL reject the request.
IF a user attempts to permanently delete a todo that is not in the trash, THEN THE system SHALL reject the request.
IF a user attempts to view a deleted todo from the normal todo list, THEN THE system SHALL reject the request.
IF a user attempts to edit a todo that does not exist, THEN THE system SHALL reject the request.
IF a user attempts to delete a todo that does not exist, THEN THE system SHALL reject the request.
IF a user attempts to restore a todo that does not exist, THEN THE system SHALL reject the request.
IF a user attempts to permanently delete a todo that does not exist, THEN THE system SHALL reject the request.
IF a user attempts to view the edit history of a todo that does not exist, THEN THE system SHALL reject the request.