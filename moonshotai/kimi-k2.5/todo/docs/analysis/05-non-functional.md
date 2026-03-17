**multiUserTodo — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Each user has sole ownership over their personal data within the system.

A user owns all todos they create. This ownership persists regardless of the todo's state—whether active, completed, or in trash. Ownership cannot be transferred to another user.

A user owns their profile information, including their display name and authentication credentials.

The system does not support shared ownership, collaborative access, or delegation of ownership rights between users.

When a user deletes their account, all data they own is permanently removed from the system. This includes all active todos, todos in trash, edit histories, and profile information.

### Data Isolation

Data in the system is strictly isolated on a per-user basis. Each user's data exists in a separate logical boundary inaccessible to other users.

A user can only view, access, or manage todos that they themselves created. Other users' todos are completely invisible and unreachable through any interface or operation.

Profile information is private to each user. Users cannot view, search for, or access other users' profiles. The display names of other users are never exposed.

There are no data leakage paths between user accounts. The system prevents cross-user data access through all browsing, filtering, and sorting operations.

### Access Control Policy

Access to data is governed by ownership-based authorization. A user has full access rights only to data they own.

Users may perform any operation on their own todos, including creating, viewing, editing, completing, deleting, filtering, and sorting.

Users may view and modify their own profile and account settings.

Users have no access rights to other users' data. Attempts to access another user's todos or profile are denied.

### Privacy Boundaries

The system maintains strict privacy boundaries between user accounts.

All user data is private by default. There is no mechanism for sharing todos, making them public, or granting access to other users.

User identity is not exposed. Users cannot see that other users exist in the system, nor can they discover other users' account information.

Edit histories are private to the todo owner. No other user can view the edit history of any todo.

Trash contents are private. Other users cannot see that a todo has been deleted, nor can they view or interact with items in another user's trash.

The system does not expose aggregate statistics or activity information that might reveal the existence of other users or their data.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Deletion

When a user deletes a todo, the todo is not immediately removed from the system. Instead, it enters a soft-deleted state and is moved to the user's trash.

The following data is preserved when a todo is soft-deleted:
- The todo's title
- The todo's description
- The todo's start date
- The todo's due date
- The todo's completion status
- The complete edit history of the todo
- The date and time the todo was originally created
- The date and time the todo was moved to trash

Soft-deleted todos no longer appear in the user's normal todo list. They are only accessible through the trash view.

Users can only soft-delete their own todos. A user cannot soft-delete a todo belonging to another user.

### Trash Retention

Soft-deleted todos remain in the user's trash indefinitely until one of the following events occurs:
- The user restores the todo from trash
- The user permanently deletes the todo from trash
- The user deletes their account (which triggers permanent deletion of all todos in trash)

While in trash, the todo remains associated with its edit history. The history entries retain their original timestamps and values. A todo in trash maintains all the same attributes it had before deletion, including completion status, dates, and description.

The trash is paginated when displayed to users. Each entry in the trash shows the todo's title, completion status, and the date it was deleted. Users can view individual trashed todos to see complete details including the full description and edit history.

### Recovery from Trash

Users can restore any of their soft-deleted todos from the trash. When a todo is restored:
- The todo returns to the user's normal todo list
- The todo retains all its data including title, description, dates, and completion status
- The todo's edit history remains intact and continues to be accessible
- The todo is no longer visible in the trash view
- The todo behaves exactly as it did before deletion, including sorting and filtering eligibility

Restoring a todo does not modify its original creation date. The todo's position in lists sorted by creation date remains unchanged from before deletion.

Users can only restore their own todos from their own trash. A user cannot restore a todo belonging to another user.

### Permanent Deletion

Users can permanently delete individual todos from their trash. When a todo is permanently deleted:
- The todo is irrecoverably removed from the system
- All edit history entries associated with the todo are permanently deleted
- The todo can no longer be viewed, restored, or accessed

When a user deletes their account, the following occurs:
- All todos owned by the user are permanently deleted, regardless of whether they are in the normal list or in trash
- All edit history entries for all of the user's todos are permanently deleted
- No trace of the user's todos remains in the system

Permanently deleted data cannot be recovered by any means. Users should understand that permanent deletion is final and that once confirmed, the data is gone forever.