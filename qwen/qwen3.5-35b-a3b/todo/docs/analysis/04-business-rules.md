**multiUserTodoApp — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users sign up for the application using an email address and password combination. Each user must provide a display name as part of their profile. The email address must be valid and unique across all users. Users can change their password at any time through their account settings. When a user chooses to delete their account, all their todos are permanently removed, including any items in the trash folder. This account deletion is irreversible and affects all data owned by that user. Login requires the same email and password credentials used during signup. Users cannot view or access another user's account or data under any circumstances.

### Email Signup Requirements

Users sign up for the application using a valid email address and password combination. The email address must follow a standard email format with a local part, the @ symbol, and a domain name. Each email address can only be registered to one user account in the system. When a user attempts to register with an email that is already in use, the registration request is rejected. The system validates the email format during signup and displays an error if the format is incorrect. Users cannot reuse an email address that was previously deleted from the system.

### Password Creation Rules

Users must create a password when signing up with their email address. The password is stored securely and cannot be viewed after creation. Users cannot use their display name or email address as their password. The password is required for login and cannot be empty. Users are prompted to confirm their password during signup to ensure accuracy.

### Display Name Configuration

Each user must provide a display name as part of their profile during signup. The display name is shown to identify the user within the application. Users can edit their display name at any time through their profile settings. The display name cannot be empty and must contain at least one character. Users cannot set another user's display name as their own to avoid confusion.

### Password Change Capability

Users can change their password at any time through their account settings. To change their password, users must enter their current password and a new password. The new password must differ from the current password. If the current password is incorrect, the password change request is rejected. After a successful password change, users must use the new password for all future logins.

### Account Deletion and Privacy

Users can delete their account at any time through their account settings. When a user deletes their account, all their todos are permanently removed, including any items in the trash folder. This account deletion is irreversible and affects all data owned by that user. Users cannot view or access another user's account or data under any circumstances. Each user's todos are completely private and only accessible by the account owner. There is no way to view, access, or share another user's todos.

## Todo Rules

Every todo must have a title, which is a required field when creating a new item. The description field is optional and can be left empty during creation. Users may optionally set a start date for each todo, but this is not required. Similarly, users may optionally set a due date for each todo without affecting creation. When a todo is first created, it is marked as incomplete by default. The system does not allow a todo to be created without a title. Todos belong exclusively to their owner and cannot be accessed by other users. Users can only view, edit, or delete their own todos, never those belonging to other users.

### Title Validation Requirements

Every todo must have a title when created. The title field is required and cannot be left empty. If a user attempts to create a todo without providing a title, the request is rejected. The title can be updated later after creation, but the todo must always maintain a non-empty title value.

### Description Field Rules

The description field is optional for todos. Users may leave the description empty when creating a todo. An empty description does not prevent todo creation. If a description is provided, it is stored with the todo for viewing. Users can update the description at any time or clear it by setting it to empty.

### Start Date Field Rules

The start date field is optional for todos. Users may leave the start date empty when creating a todo. The system does not require a start date for todo creation. If a start date is set, it is displayed when viewing the todo. Users can update the start date after creation or clear it by setting it to empty. When sorting todos by start date, items without a start date appear at the end of the list.

### Due Date Field Rules

The due date field is optional for todos. Users may leave the due date empty when creating a todo. The system does not require a due date for todo creation. If a due date is set, it is displayed when viewing the todo. Users can update the due date after creation or clear it by setting it to empty. When sorting todos by due date, items without a due date appear at the end of the list.

### Title and Due Date Relationship

When both a start date and due date are provided for a todo, the due date must not be earlier than the start date. If a user sets a due date that precedes the start date, the request is rejected. This validation applies when creating a todo and when editing existing dates. Users must adjust the dates so the due date is on or after the start date before the change is accepted.

### Default Completion Status

All newly created todos are marked as incomplete by default. There is no option to create a todo in a complete state. The incomplete status is the initial state for every todo regardless of other fields provided during creation. Users can change the completion status from incomplete to complete or vice versa after creation.

### Todo Ownership and Access Control

Every todo belongs exclusively to the user who created it. Users can only view, edit, or delete their own todos. A user cannot access, modify, or delete another user's todos under any circumstances. The system enforces that todo operations are restricted to the owner only. If a non-owner attempts any operation on a todo, the request is rejected.

### Private Todo Access

Each user's todos are completely private and invisible to other users. There is no mechanism to share todos between users or make todos public. Users cannot view, access, or browse another user's todos through any interface. The privacy boundary is absolute: each user sees only their own data.

### Owner-Only Modification

Only the owner of a todo can modify its content. No other user can change a todo's title, description, dates, or completion status. Edit operations are validated against ownership, and non-owner edits are rejected. The system tracks edit history but only allows the owner to make changes.

### Creation Date Tracking

Every todo has a creation date that is automatically recorded when the todo is created. This date represents when the todo first entered the system. The creation date cannot be modified after creation. It is displayed when viewing todos in the list view and when viewing individual todo details. The creation date is used for sorting options that order by creation date.

### Todo Status Toggle Rules

Users can toggle a todo's completion status between complete and incomplete. This is a simple state change with no additional conditions. A complete todo can be marked incomplete, and an incomplete todo can be marked complete. The toggle operation requires no additional approval or validation beyond ownership.

### Todo Deletion Validation

Users can only delete todos they own. Deleted todos are soft-deleted and moved to trash rather than permanently removed. The todo no longer appears in the normal todo list after deletion. Only the owner can delete their own todos. Attempts to delete another user's todo are rejected.

### Trash Operation Rules

Users can view their deleted todos in the trash. Users can restore a deleted todo from trash, returning it to the normal todo list. Users can also permanently delete a todo from trash, which removes it and its edit history. Only the owner can perform trash operations on their own deleted todos.

## EditHistoryEntry Rules

Every time a user modifies a todo, the system creates an edit history entry to record the change. Each history entry captures the timestamp when the edit was made. The history tracks what fields were changed, including title, description, start date, and due date. Only changed fields are recorded in each history entry; unchanged fields are not duplicated. The full edit history for a todo can be viewed by the todo owner. History entries are sorted with the most recent edits appearing first, followed by older changes in reverse chronological order. When a todo is permanently deleted from the trash, its entire edit history is also deleted. This deletion of history is permanent and cannot be recovered.

### Edit History Tracking

Every time a user modifies a todo, the system creates an edit history entry to record the change. This applies to any modification of the todo's title, description, start date, or due date.

Each edit history entry captures the exact moment when the edit was made. The timestamp records when the user's edit request was completed by the system.

Only fields that were actually changed are recorded in each history entry. If only the title was modified, only the title change is documented. The description, start date, and due date are not included in that entry if they remained unchanged. This prevents unnecessary duplication of unchanged values.

A history entry is created for every successful edit operation. The system tracks each modification as a separate entry in the todo's edit history. Users can view the complete edit history of any of their todos to see all past changes.

### Timestamp Recording

Each edit history entry includes a timestamp that records when the edit occurred. The timestamp captures the date and time when the user's edit request was processed by the system.

The timestamp is recorded automatically when the edit is completed. Users do not manually set the timestamp; it is generated by the system at the time of modification.

All timestamps are recorded in a consistent format that allows chronological ordering. This enables accurate sorting and retrieval of history entries based on their edit time.

### Field Change Documentation

When a todo's title is modified, the new title value is recorded in the edit history entry. The entry documents what the title was changed to, not the previous value.

When a todo's description is modified, the new description value is recorded in the edit history entry. The entry documents what the description was changed to. If the description was previously empty and is now populated, or vice versa, this change is captured.

When a todo's start date is modified, the new start date value is recorded in the edit history entry. The entry documents the date it was changed to. If the start date was previously unset and is now set, or vice versa, this change is captured.

When a todo's due date is modified, the new due date value is recorded in the edit history entry. The entry documents the date it was changed to. If the due date was previously unset and is now set, or vice versa, this change is captured.

Each field that is changed generates a record of what that field was changed to. The history tracks all modifications to all fields across all edits.

### Complete Edit History View

Users can view the full edit history of any todo that they own. The edit history displays all history entries that have been created for that todo.

The owner of a todo has visibility into all edit history entries for that todo. No other user can view another user's edit history, as todos and their associated history are private to their owner.

The edit history view shows each history entry with its timestamp and the fields that were changed. It provides a complete record of all modifications made to the todo since its creation.

### Recent to Oldest Sorting

History entries are sorted with the most recent edits appearing first. The entry created most recently is displayed at the top of the list.

Following the most recent entry, older edits appear in descending chronological order. The oldest entry appears at the bottom of the list.

This sorting ensures that users can immediately see the latest changes to a todo without needing to navigate to find them.

### Permanent History Deletion

When a todo is permanently deleted from the trash, its entire edit history is also deleted. All history entries associated with that todo are removed from the system.

This deletion of the edit history is permanent and cannot be recovered. Once a todo and its edit history are permanently deleted, there is no way to retrieve the deleted history entries.

The permanent deletion of a todo includes the deletion of all its edit history entries. Users should be aware that permanent deletion from the trash removes both the todo and all associated edit history.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering by Completion Status

Users can filter their todo list by completion status.
The available filter options are:
- All todos: Displays todos regardless of their completion status
- Complete todos: Displays only todos marked as complete
- Incomplete todos: Displays only todos marked as incomplete

When a filter is applied, the filtered results replace the unfiltered view.
Only the owner of a todo can view and filter their own todos.
There is no way to view or filter another user's todos.
If no filter is explicitly selected, the system displays all todos by default.

### Sorting by Date Fields

Users can sort their todo list by date fields.
The available sort options are:
- Creation date: Sort by when the todo was created (newest first or oldest first)
- Start date: Sort by the start date (earliest first or latest first)
- Due date: Sort by the due date (earliest first or latest first)

When sorting by start date or due date, todos without these dates are placed at the end of the list.
When sorting by creation date, todos without a creation date (edge case) are placed at the end of the list.
Users can toggle between ascending and descending order for each sort option.
Only one sort option can be active at a time.
If the user changes the sort option or direction, the list refreshes with the new ordering.

### Pagination Rules

Both the main todo list and the trash list are paginated.
Each page displays a fixed number of todos.
When viewing a paginated list, navigation controls allow users to move between pages.
Users can return to the first page or jump to the last page.
Pagination preserves any active filters and sort options across page changes.
When a todo is deleted or restored, the pagination may shift to maintain the list integrity.
If a filtered or sorted view returns zero results, an appropriate message is displayed.
The pagination does not affect the total count of todos available across all pages.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### User Registration Errors

The system shall reject the user registration request if the provided email address is already registered in the system. The system shall also reject registration when the email address is not in a valid format, such as lacking an "@" symbol or domain portion. If the user's display name is missing or empty during registration, the request shall be rejected.

### User Login Errors

The system shall reject the user login request when the provided email address does not exist in the system. The system shall also reject login attempts when the password does not match the stored password for the given email. When either the email or password field is left empty during login, the request shall be rejected.

### Password Change Errors

The system shall reject the password change request when the user provides an incorrect current password. If the new password is empty or missing, the request shall be rejected.

### Account Deletion Errors

The system shall reject the account deletion request when the specified user account does not exist in the system.

### Todo Creation Validation Errors

The system shall reject the todo creation request when the title field is empty or missing, as this is a required field for todos. If the provided due date is earlier than the start date, the request shall be rejected.

### Todo Not Found Errors

The system shall reject any request to view a todo when the specified todo does not exist in the system.

### Todo Ownership Errors

The system shall reject any request to access, view, or modify a todo when the requesting user does not own that todo. Users can only interact with todos they have created.

### Todo Completion Errors

The system shall reject the request to mark a todo as complete when the todo does not exist in the system. The system shall also reject marking a todo complete or incomplete when the todo belongs to a different user.

### Todo Editing Errors

The system shall reject any request to edit a todo's title, description, start date, or due date when the todo does not exist. The system shall also reject editing requests when the todo belongs to a different user.

### Todo Deletion Errors

The system shall reject the request to delete a todo when the todo does not exist in the system. The system shall also reject deletion requests when the todo belongs to a different user.

### Trash Restoration Errors

The system shall reject the request to restore a todo from trash when the specified todo does not exist in the trash. The system shall also reject restoration requests when the todo belongs to a different user.

### Trash Permanent Deletion Errors

The system shall reject the request to permanently delete a todo from trash when the specified todo is not in the trash (i.e., it is in the active todo list). The system shall also reject permanent deletion requests when the todo belongs to a different user.

### Filter Validation Errors

The system shall reject the filtering request when the specified completion status filter value is not valid. Valid filters include: all todos, only complete todos, only incomplete todos.

### Sort Validation Errors

The system shall reject the sorting request when the specified sort criterion is not valid. Valid sort criteria include: creation date, start date, due date. The system shall also reject sorting requests when the sort order is not recognized.