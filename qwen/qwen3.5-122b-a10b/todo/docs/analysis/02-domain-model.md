**multiUserTodo — Business concepts, relationships, and states from user perspective**

Business concepts, relationships, and states from user perspective

# Domain Concepts

Describe what each concept means in the business domain and its key attributes.

## User Concept

A User represents an individual person who has registered for the Todo application. Each user maintains a private account that is completely separate from all other users in the system. The user identity is established through an email address and password combination for authentication purposes. Users have a display name that can be personalized and edited over time to reflect their preferred identity. Account deletion is a permanent action that removes all user data including todos and their edit history. Users cannot access or view any information belonging to other users, ensuring complete privacy isolation. The user concept forms the foundation for all todo ownership and access control in the application.

### User Account and Identity

A User represents an individual person who registers for the Todo application. User identity is established through an email address and password combination, which serves as the primary authentication mechanism. During account registration, the user provides their email and password to create a new account. Users can log in using these credentials to access their private account. Users have the capability to change their password at any time to maintain account security. Each user has a profile containing a display name that represents their preferred identity in the application. Users can edit their display name to update how they appear in the system. The email address and display name together form the user's complete profile information.

### User Privacy and Ownership

Each user maintains a private account that is completely isolated from all other users in the system. User privacy isolation ensures that no user can view, access, or share any information belonging to another user. This includes todos, edit history, and profile information. Private account ownership means that all data created by a user belongs exclusively to that user. Users have full ownership of their todos, and this ownership relationship is permanent and cannot be transferred. Cross-user access prevention is enforced at all levels of the application, ensuring complete privacy between users. There is no mechanism for users to browse, search, or discover other users' data. Each user's experience is entirely independent and separate from all other users.

### Account Deletion and Data Removal

Users can delete their account at any time. Account deletion is a permanent action that cannot be undone. When a user deletes their account, all account data is permanently removed from the system. This includes all todos created by the user, todos in the trash, and all edit history associated with those todos. Account data removal is complete and irreversible. Once an account is deleted, the user no longer exists in the system and cannot recover any of their data. This permanent deletion applies to all user-owned content without exception.

## Todo Concept

A Todo represents a task or item that a user wants to track and manage over time. Each todo has a title as its primary identifier and an optional description for additional context about the task. Users can set optional start dates and due dates to track when work should begin and when it is expected to be completed. Todos have a completion status that indicates whether the task is done or still in progress. Each todo belongs to exactly one user and cannot be shared with or viewed by other users. Deleted todos move to a trash area where they can be restored or permanently removed. The creation date is automatically recorded when a todo is first added to the system. Todos without start or due dates are still valid and can be created with minimal information.

### Todo Definition

A Todo represents a task or item that a user wants to track and manage over time. Each todo has a title as its required primary identifier. A todo can be created with minimal information—only a title is required, and all other fields are optional. This allows users to quickly capture tasks without being blocked by mandatory details.

### Todo Attributes

Each todo has an optional description field that provides additional context about the task. Users can set an optional start date to track when work should begin. Users can set an optional due date to indicate when the task is expected to be completed. A todo without start date or due date is still valid. The creation date is automatically recorded when a todo is first added to the system.

### Completion Status

Todos have a completion status that indicates whether the task is done or still in progress. Users can toggle between complete and incomplete states. This is a simple two-state system with no intermediate statuses.

### User Ownership and Privacy

Each todo belongs to exactly one user and cannot be shared with or viewed by other users. User ownership is private and isolated. There is no way to view, access, or share another user's todos. This privacy isolation is fundamental to the system design.

### Trash and Deletion

When a todo is deleted, it moves to a trash area rather than being permanently removed. Deleted todos no longer appear in the normal todo list but remain recoverable. Users can view their deleted todos in the trash area. From the trash, users can restore a todo to the normal list or permanently delete it. Permanently deleting a todo also removes its edit history. The trash area provides a safety net for accidental deletions.

## TodoHistory Concept

TodoHistory represents a record of changes made to a todo item over time. Each history entry captures when an edit occurred and what specific fields were modified during that edit. The history tracks changes to title, description, start date, and due date separately for each modification. History entries are organized chronologically from most recent to oldest for easy review of the todo's evolution. When a todo is permanently deleted from the trash, its entire history is also removed from the system. Users can view the complete edit history for any of their todos to understand how the task has changed. Each history entry represents a single point in time when the todo was modified by the owner.

### Edit History Record

Each todo maintains an edit history that serves as a complete audit trail of all changes made to the task. Every modification to a todo creates a single history entry that captures the state of the todo at that point in time. Users can view the full edit history for any of their todos to understand how the task has evolved over time. The history provides transparency into what changes were made and when, allowing users to track the progression of their todo from creation to completion or deletion.

### Field Modification Tracking

Each history entry records when the edit was made with a change tracking timestamp. The system tracks modifications to specific fields: the title change recording captures what the title was changed to if it was modified, the description change recording captures what the description was changed to if it was modified, and the date change recording captures what the start date and due date were changed to if they were modified. Each field is tracked independently, so an entry only includes the fields that were actually changed in that particular edit.

### History Chronological Order

History entries are organized in chronological order from most recent to oldest, allowing users to see the latest changes first. This ordering makes it easy to review the evolution of a todo by starting with the most recent modifications and working backward through the history. The chronological organization ensures that users can quickly understand the current state of a todo by looking at the most recent entry, while still having access to the complete history if needed.

### Lifecycle and Deletion

The todo edit history is tied to the todo's lifecycle. When a todo is permanently deleted from the trash, the permanent deletion cascade removes the entire edit history along with the todo itself. This ensures that no orphaned history entries remain in the system after a todo is permanently removed. Users can view the complete history at any time while the todo exists, whether it is in the active list or in the trash. The history view access is available for all todos owned by the user, providing a complete record of the todo's existence from creation to permanent deletion.

# Domain Relationships

Describe how concepts relate to each other from a business perspective.

## Conceptual Relationships

Describe how concepts relate to each other in business terms.

### User and Todo Ownership

Each user owns their todos. A todo belongs to exactly one user and cannot exist without an owner. When a user creates a todo, it is automatically associated with that user. Only the owner can view, edit, complete, or delete their todos. No user can access another user's todos.

When a user deletes their account, all todos owned by that user are permanently deleted, including todos in the trash. This deletion also removes all edit history associated with those todos.

### Todo and Edit History Association

Each todo can have multiple edit history entries. A history entry belongs to exactly one todo and records changes made to that todo. When a todo is permanently deleted from the trash, all its history entries are also permanently deleted.

Users can view the complete edit history of any todo they own. History entries are displayed in chronological order from most recent to oldest. Each history entry shows what fields were changed and what the new values were.

### Privacy and Access Boundaries

User-to-user relationships are non-existent in this system. Users cannot view, access, or share information with other users. Each user's data (todos and edit history) is completely isolated from all other users.

There is no concept of shared todos, collaborative editing, or public visibility. A todo is either owned by the viewing user or completely inaccessible. The system enforces this isolation at all times.

## Lifecycle and Retention

Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.

### Todo Lifecycle States

Todos exist in one of two states: active or deleted. Active todos appear in the normal todo list. Deleted todos are moved to the trash and no longer appear in the normal list. When a user permanently deletes a todo from the trash, it is removed completely and cannot be recovered. When a user deletes their account, all their todos including those in the trash are permanently deleted and cannot be recovered.

### Trash Retention

Deleted todos are retained in the user's trash. The trash list is paginated. Users can view all their deleted todos in the trash. Deleted todos remain in the trash until the user either restores them or permanently deletes them.

### Permanent Deletion

Users can permanently delete a todo from the trash. Permanently deleted todos are removed completely and cannot be recovered. When a user permanently deletes a todo, its edit history is also deleted. When a user deletes their account, all their todos including those in the trash are permanently deleted along with their edit histories.

### Todo Recovery

Users can restore a deleted todo from the trash. Restored todos return to the normal todo list as active todos. The edit history of a restored todo is preserved and remains accessible after restoration.

# Business Categories and State Flows

Business category classifications and state flow definitions.

## Business Category Definitions

Define all business category classifications with their allowed values and descriptions.

### Todo Completion Status

A todo has a completion status that indicates whether the task has been finished by the user.

**Allowed Values:**
- Incomplete: The todo is still in progress and needs to be completed
- Complete: The todo has been marked as finished by the user

Users can toggle the completion status at any time. A todo is incomplete by default when first created. Marking a todo as complete does not affect its other attributes or its visibility in the todo list.

### Todo Visibility Status

A todo has a visibility status that determines whether it appears in the normal todo list or in the trash.

**Allowed Values:**
- Active: The todo appears in the normal todo list and is accessible for viewing, editing, and completion
- Deleted: The todo has been moved to trash and no longer appears in the normal todo list

When a user deletes a todo, its visibility status changes from Active to Deleted. The todo remains in the system and can be restored from trash. Only when a user permanently deletes a todo from trash is the todo completely removed from the system along with its edit history.

## State Transitions

Define valid state transition paths for stateful concepts.

### Todo Completion Status Flow

Todos have a completion status that can be toggled between two states: incomplete and complete. Newly created todos start in the incomplete state. Users can mark an incomplete todo as complete, and can mark a complete todo as incomplete. This is a simple bidirectional toggle with no restrictions on when the status can change. The completion status is visible in the todo list view.

### Todo Deletion Lifecycle

Todos exist in one of two states: active or deleted. Active todos appear in the normal todo list. When a user deletes a todo, it transitions to the deleted state and no longer appears in the normal list. Deleted todos can be viewed in the trash. From the trash, users can restore a deleted todo, returning it to the active state and making it visible in the normal list again. Alternatively, users can permanently delete a todo from the trash, which removes it and its edit history from the system entirely. Permanently deleted todos cannot be recovered.

### Edit History Creation and Retention

Each todo maintains an edit history that records all changes made to it. When a user edits a todo's title, description, start date, or due date, a new history entry is created with the timestamp of the change and the new values for each modified field. Edit history entries are sorted from most recent to oldest. Users can view the full edit history of any of their todos. When a todo is permanently deleted from the trash, its edit history is also permanently deleted.