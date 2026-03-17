**todoApp — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must provide a valid email address during registration, and each email address can only be associated with one account. Passwords are required for all user accounts and must be provided during sign up. Each user must have a display name that identifies them within the system. Users can update their display name at any time after account creation. When a user deletes their account, all associated todos are permanently removed, including those in the trash folder. Users cannot access or view other users' profiles, maintaining complete privacy between accounts. The system enforces that email addresses remain unique across all registered users. Account deletion is irreversible and removes all user data from the system. Password changes are allowed for existing users to update their credentials.

### Email and Registration Rules

Each user must provide a valid email address during registration. The email address must be unique across all registered accounts in the system. Only one account can be associated with a single email address. If a user attempts to register with an email address that is already in use, the registration request is rejected. The email address is required and cannot be left empty during sign up. The system validates that the provided email address follows a valid email format before accepting the registration.

### Display Name Rules

Each user must have a display name that identifies them within the system. The display name is a required field during account creation and cannot be empty. Users can update their display name at any time after account creation. When a user modifies their display name, the change takes effect immediately. There are no restrictions on how often a user can change their display name.

### Account Deletion Rules

When a user deletes their account, all todos associated with that user are permanently removed from the system. This includes todos in the normal list and todos in the trash folder. The account deletion process also removes all edit history entries for the user's todos. Account deletion is irreversible and cannot be undone. Once an account is deleted, all user data is permanently removed and cannot be recovered. The system does not retain any information about deleted accounts.

### Privacy and Data Isolation Rules

Each user's profile is completely private and cannot be viewed by other users. Users cannot access or view other users' profiles. The system enforces complete data isolation between user accounts. A user can only see their own todos and cannot view, access, or share another user's todos. There is no functionality to browse or discover other users in the system. All user data remains isolated to the account owner.

### Password Management Rules

A password is required for all user accounts during registration. Existing users can change their password at any time to update their credentials. When a user changes their password, the new password replaces the old one immediately. The system requires the user to provide their current password when requesting a password change. If the current password provided is incorrect, the password change request is rejected.

## Todo Rules

Every todo must have a title, which is the only required field when creating a new item. The description field is optional and can be left empty without preventing todo creation. Start dates are optional and users may create todos without specifying when work begins. Due dates are optional and todos can exist without a deadline. When a todo is first created, it is automatically set to an incomplete state. Users can assign both a start date and due date to the same todo if needed. The system accepts todos with only a title and no other fields populated. Date fields can be added or modified after the todo is initially created. Todos remain in their current completion state until explicitly changed by the user. A todo cannot be created without providing a title value.

### Todo Creation Requirements

Every todo must have a title, which is the only required field when creating a new item. The title cannot be empty or missing during todo creation.

The description field is optional and can be left empty without preventing todo creation. A todo with an empty description is valid and functions normally.

Start date is optional and users may create todos without specifying when work begins. A todo without a start date is valid.

Due date is optional and todos can exist without a deadline. A todo without a due date is valid.

Users can create a todo with only a title and no other fields populated. This minimal todo creation is fully supported.

Users can assign both a start date and due date to the same todo if needed. Date fields can be specified independently of each other.

Date fields can be added or modified after the todo is initially created. A todo created without dates can have dates assigned later through editing.

### Todo Initial State

When a todo is first created, it is automatically set to an incomplete state. This is the default completion state for all new todos.

Todos remain in their current completion state until explicitly changed by the user. The system does not automatically change a todo's completion status based on dates or any other conditions.

A newly created todo is immediately available in the user's todo list with its initial incomplete state.

### Completion State Toggle

Users can mark a todo as complete. This changes the todo's completion status from incomplete to complete.

Users can mark a todo as incomplete. This changes the todo's completion status from complete back to incomplete.

The completion state is a simple toggle between two states: complete and incomplete. There are no intermediate states or additional completion statuses.

The completion state change is immediate and persists until the user changes it again.

## EditHistory Rules

Every edit made to a todo creates a new history entry automatically. Each history entry must record the timestamp of when the edit occurred. History entries capture what the title was changed to, but only if the title was actually modified. The description changes are recorded in history only when the description field is updated. Start date modifications are tracked in history when users change the start date. Due date changes are similarly recorded when the due date field is updated. History entries can contain partial information if only some fields were changed during an edit. The timestamp is required for every history entry and cannot be empty. Users can view the complete edit history showing all changes made to their todos. History entries preserve the state of fields at the time of each edit. When a todo is permanently deleted from trash, its edit history is also removed.

### Automatic History Entry Creation

Every edit made to a todo automatically creates a new history entry. The system shall create a history entry when any editable field (title, description, start date, or due date) is modified. A timestamp is required on every history entry and cannot be empty. The timestamp records when the edit occurred. History entries are created on every modification to the todo, regardless of how many fields were changed. The timestamp is mandatory for each history entry and the system shall reject any history entry without a valid timestamp.

### Field Change Tracking

Title changes are tracked in the edit history when the title is modified. The history entry records what the title was changed to. Description changes are recorded in the history only when the description field is actually updated. Start date modifications are logged in the history when users change the start date. Due date changes are captured in the history when the due date field is updated. Each history entry contains only the fields that were actually changed during that edit. Partial edits where only some fields are modified create valid history entries with selective field tracking. If only the title is changed, the history entry records only the title change. If multiple fields are changed, the history entry documents all field changes made in that edit.

### History Viewing and Ordering

Users can view the complete edit history of any of their todos showing all changes made. History entries preserve the state of fields at the time of each edit, maintaining historical state preservation. The edit history shows a complete edit trail of all modifications. History entries are sorted from most recent to oldest, maintaining edit chronology. Users viewing the history see entries in reverse chronological order with the most recent edit displayed first.

### History Deletion on Permanent Remove

When a todo is permanently deleted from the trash, its edit history is also removed. The system shall delete all history entries associated with a todo when that todo is permanently deleted. Permanently deleting a todo from trash cascades the deletion to its edit history. After permanent deletion, neither the todo nor its edit history can be recovered.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering Rules

Users can filter their todo list by completion status. The system provides three filter options: all todos, only complete todos, and only incomplete todos. Filtering applies only to the user's own todos. The filter selection does not affect the trash view, which shows all deleted todos regardless of completion status.

### Sorting Rules

Users can sort their todo list by creation date, start date, or due date. For each sort field, users can choose ascending or descending order. When sorting by creation date, todos can be ordered from newest first or oldest first. When sorting by start date, todos can be ordered from earliest first or latest first. When sorting by due date, todos can be ordered from earliest first or latest first. Todos without a start date appear at the end of the list when sorting by start date. Todos without a due date appear at the end of the list when sorting by due date.

### Pagination Rules

The todo list is paginated to manage large numbers of todos. The trash list is also paginated. Pagination allows users to navigate through their todos in manageable chunks. The system maintains consistent pagination behavior across both the main todo list and the trash view.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Authentication Error Scenarios

If a user attempts to register with an email address that is already in use, the request is rejected.

If a user attempts to register without providing a password, the request is rejected.

If a user attempts to log in with an email address that does not exist, the request is rejected.

If a user attempts to log in with an incorrect password, the request is rejected.

If a user attempts to change their password without providing the current password, the request is rejected.

If a user attempts to delete their account while not logged in, the request is rejected.

### Todo Creation and Validation Errors

If a user attempts to create a todo without providing a title, the request is rejected.

If a user attempts to create a todo with a due date that is earlier than the start date, the request is rejected.

If a user attempts to create a todo while not logged in, the request is rejected.

### Access and Permission Errors

If a user attempts to view a todo that does not exist, the request is rejected.

If a user attempts to view a todo that belongs to another user, the request is rejected.

If a user attempts to edit a todo that belongs to another user, the request is rejected.

If a user attempts to delete a todo that belongs to another user, the request is rejected.

If a user attempts to mark a todo as complete or incomplete that belongs to another user, the request is rejected.

If a user attempts to view the edit history of a todo that belongs to another user, the request is rejected.

If a user attempts to view their trash while not logged in, the request is rejected.

If a user attempts to restore a deleted todo that belongs to another user, the request is rejected.

If a user attempts to permanently delete a todo that belongs to another user, the request is rejected.

### Operation Failure Cases

If a user attempts to restore a todo from trash that has already been permanently deleted, the request is rejected.

If a user attempts to permanently delete a todo that does not exist in their trash, the request is rejected.

If a user attempts to view edit history for a todo that has been permanently deleted, the request is rejected.

If a user attempts to edit a todo that has been deleted (in trash), the request is rejected.

If a user attempts to mark a deleted todo as complete or incomplete, the request is rejected.