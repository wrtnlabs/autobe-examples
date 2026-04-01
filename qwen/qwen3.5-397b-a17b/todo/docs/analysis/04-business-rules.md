**multiUserTodo — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must provide both email and password when signing up for an account. Email and password are also required for logging into the system. Users can change their password after account creation. Each user has a display name as part of their profile. Users can edit their display name at any time. When a user deletes their account, all their todos are permanently deleted including those in the trash. Users cannot view other users' profiles as this is a private todo application. Each user's account is isolated and independent from other users. The system enforces that only the account owner can modify their profile information.

### Account Creation and Authentication

Users must provide both email and password when creating an account. If email is missing during signup, the request is rejected. If password is missing during signup, the request is rejected. Users must provide both email and password for login authentication. If the provided email and password do not match any existing account during login, the request is rejected. Each user account is uniquely identified by their email address.

### Password Management

Users can change their password after account creation. The user must be authenticated to change their password. If the user is not authenticated, the password change request is rejected. The password change applies only to the authenticated user's account.

### Profile Management

Each user has a display name as part of their profile. Users can edit their display name at any time. Only the account owner can modify their profile information. If a user attempts to modify another user's profile, the request is rejected. The display name is optional and can be updated multiple times.

### Account Deletion

Users can delete their own account. When a user deletes their account, all their todos are permanently deleted. This includes todos in the trash. The account deletion is irreversible. All edit history associated with the user's todos is also permanently deleted. If a user attempts to delete another user's account, the request is rejected.

### Privacy and Isolation

Users cannot view other users' profiles. This is a private todo application. Each user's account is isolated from other users. Users can only access their own todos. If a user attempts to access another user's todo, the request is rejected. If a user attempts to view another user's profile, the request is rejected. There is no way to share or transfer todos between users.

## Todo Rules

Every todo must have a title which is required and cannot be empty. Description is optional and can be left empty when creating or editing a todo. Start date is optional and can be omitted when creating a todo. Due date is optional and can be omitted when creating a todo. Newly created todos are incomplete by default. Users can toggle a todo between complete and incomplete states. Users can edit the title, description, start date, and due date of their own todos. Each user can only see and access their own todos. There is no way to view, access, or share another user's todos. Todos are completely private to their owner.

### Title Validation

Every todo must have a title. The title is required when creating a todo and cannot be empty or contain only whitespace. If a title is not provided during todo creation, the request is rejected. If an empty title is submitted, the request is rejected. The title can be updated when editing a todo, but the updated title must also be non-empty. If an edit attempt provides an empty title, the edit is rejected.

### Optional Field Rules

The description is optional when creating or editing a todo. Users may leave the description empty or omit it entirely. The start date is optional and may be omitted when creating or editing a todo. The due date is optional and may be omitted when creating or editing a todo. When any optional field is not provided, the system accepts the todo without that field. There is no requirement that start date or due date be set. There is no validation that prevents a due date from being earlier than a start date, as the user did not specify this constraint.

### Completion State Management

When a todo is created, it is marked as incomplete by default. Users can change the completion status of their own todos at any time. Users can mark an incomplete todo as complete. Users can mark a complete todo as incomplete. The completion status toggles between two states: complete and incomplete. There are no intermediate states or additional status values. The completion status can be changed regardless of whether the todo has a start date or due date set.

### Todo Modification Rules

Users can edit the title of their own todos. Users can edit the description of their own todos. Users can edit the start date of their own todos. Users can edit the due date of their own todos. Users can edit multiple fields in a single edit operation. Each edit to a todo is recorded in the todo's edit history, sorted from recent to oldest (matching the domain model specification). Users can only edit todos they own. If a user attempts to edit a todo they do not own, the request is rejected. If a todo does not exist, the edit request is rejected.

### Todo Access Isolation

Each todo is owned by exactly one user. Users can only view their own todos. Users cannot view todos owned by other users. There is no capability to share todos with other users. There is no capability to grant access to another user's todos. If a user attempts to access a todo they do not own, the request is rejected as if the todo does not exist. The system does not reveal whether a todo exists if the user does not own it. All todo operations (view, edit, delete, restore) are restricted to the todo owner only.

## EditHistory Rules

Every time a todo is edited, a history entry is automatically created. Each history entry records the timestamp when the edit was made. History entries capture what the title was changed to if the title was modified. History entries capture what the description was changed to if the description was modified. History entries capture what the start date was changed to if the start date was modified. History entries capture what the due date was changed to if the due date was modified. Users can view the full edit history of any of their todos. History entries are sorted from most recent to oldest. When a todo is permanently deleted from the trash, its edit history is also permanently deleted. History is tied to the todo lifecycle.

### Automatic History Entry Creation

Every time a todo is edited, a history entry is automatically created. The system creates this entry without requiring any additional action from the user. History entry creation is mandatory for every edit operation. If a todo edit is successfully completed, a corresponding history entry must exist.

### Edit Timestamp Recording

Each history entry records when the edit was made. The timestamp captures the exact moment the edit occurred. The timestamp is automatically generated by the system and cannot be modified by users. The timestamp is required for every history entry.

### Conditional Field Change Recording

History entries only record fields that were actually changed during an edit. If the title was modified, the history entry records what the title was changed to. If the title was not modified, no title change is recorded in that history entry. If the description was modified, the history entry records what the description was changed to. If the description was not modified, no description change is recorded. If the start date was modified, the history entry records what the start date was changed to. If the start date was not modified, no start date change is recorded. If the due date was modified, the history entry records what the due date was changed to. If the due date was not modified, no due date change is recorded. A history entry must record at least one field change.

### Edit History Viewing

Users can view the full edit history of any of their todos. The edit history displays all history entries for that todo. History entries are sorted from recent to oldest. The most recently created history entry appears first in the list. Users cannot reorder the history display. The full history includes all edits made since the todo was created.

### History Lifecycle Management

Edit history is tied to the todo lifecycle. When a todo is permanently deleted from the trash, its edit history is also permanently deleted. The history cannot exist independently of its parent todo. If a todo is restored from the trash, its edit history is also restored. Soft deleting a todo does not delete its history. Only permanent deletion removes the history entries.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Todo Filtering Rules

Users can filter their todo list by completion status.

Three filter options are available:
- All todos
- Only complete todos
- Only incomplete todos

The filter applies to the user's own todos only. Other users' todos are never included in the filtered results.

If no todos match the selected filter criteria, an empty list is returned.

The filter state persists while the user remains on the todo list view. Changing the filter resets the list to show matching results.

Filtering does not affect the trash list. The trash list shows all deleted todos regardless of completion status.

### Todo Sorting Rules

Users can sort their todo list by one of the following criteria:
- Creation date
- Start date
- Due date

For creation date sorting, users can choose:
- Newest first
- Oldest first

For start date sorting, users can choose:
- Earliest first
- Latest first

For due date sorting, users can choose:
- Earliest first
- Latest first

Todos without a start date appear at the end of the list when sorting by start date, regardless of whether the sort order is earliest first or latest first.

Todos without a due date appear at the end of the list when sorting by due date, regardless of whether the sort order is earliest first or latest first.

Sorting applies to the user's own todos only. Other users' todos are never included in the sorted results.

The default sort order is creation date, newest first, when no sort preference is specified.

Changing the sort criteria refreshes the list to reflect the new order.

### Todo List Pagination

The todo list is paginated to improve performance and usability.

The trash list is also paginated using the same pagination mechanism.

Each page displays a fixed number of todos. The page size is consistent across all list views.

Users can navigate between pages using page numbers or next and previous controls.

When filters or sorting criteria change, the pagination resets to the first page.

If the user navigates to a page that no longer exists after applying a filter (for example, page 5 when the filtered results only have 3 pages), an error is shown or the user is redirected to the first page.

If there are no todos to display, an empty list is shown with no pagination controls.

Pagination information includes the current page number and the total number of pages available.

Each todo in the paginated list shows: title, completion status, start date (if set), due date (if set), and creation date.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Authentication and Account Errors

If a user attempts to sign up with an email address that is already registered, the request is rejected.

If a user attempts to sign up without providing an email address, the request is rejected.

If a user attempts to sign up without providing a password, the request is rejected.

If a user attempts to log in with an email address that is not registered, the request is rejected.

If a user attempts to log in with an incorrect password, the request is rejected.

If a user attempts to log in without providing an email address, the request is rejected.

If a user attempts to log in without providing a password, the request is rejected.

If a user attempts to change their password without providing the new password, the request is rejected.

If a user attempts to delete their account while not logged in, the request is rejected.

### Todo Validation Errors

If a user attempts to create a todo without providing a title, the request is rejected.

If a user attempts to create a todo with a due date that is earlier than the start date, the request is rejected.

If a user attempts to edit a todo's due date to a date earlier than its start date, the request is rejected.

If a user attempts to edit a todo's start date to a date later than its due date, the request is rejected.

When a todo is created without a start date, the start date remains empty.

When a todo is created without a due date, the due date remains empty.

When a todo is created without a description, the description remains empty.

### Access Control Exceptions

If a user attempts to view another user's todo, the request is rejected.

If a user attempts to edit another user's todo, the request is rejected.

If a user attempts to delete another user's todo, the request is rejected.

If a user attempts to mark another user's todo as complete, the request is rejected.

If a user attempts to mark another user's todo as incomplete, the request is rejected.

If a user attempts to view another user's edit history, the request is rejected.

If a user attempts to view another user's trash, the request is rejected.

If a guest attempts to view any todo list, the request is rejected.

If a guest attempts to create a todo, the request is rejected.

### Operation Failure Cases

If a user attempts to view a todo that does not exist, the request is rejected.

If a user attempts to edit a todo that does not exist, the request is rejected.

If a user attempts to delete a todo that does not exist, the request is rejected.

If a user attempts to mark a todo as complete that does not exist, the request is rejected.

If a user attempts to mark a todo as incomplete that does not exist, the request is rejected.

If a user attempts to view the edit history of a todo that does not exist, the request is rejected.

If a user attempts to restore a todo from trash that does not exist, the request is rejected.

If a user attempts to permanently delete a todo from trash that does not exist, the request is rejected.

If a user attempts to restore a todo that is not in their trash, the request is rejected.

If a user attempts to permanently delete a todo that is not in their trash, the request is rejected.