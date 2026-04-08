**todoApp — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Each user owns all todos they create. Ownership is automatically assigned when a user creates a todo and cannot be transferred to another user. When a user deletes their account, all todos owned by that user are permanently deleted, including todos in trash and their edit history. Users retain ownership of their profile information including display name and credentials.

### Data Isolation

Each user's data is completely isolated from other users. A user's todos, edit history, and profile information are stored and processed separately from other users' data. There is no mechanism for data to be shared, transferred, or accessed across user boundaries. Data isolation applies to all operations including viewing, creating, editing, and deleting todos.

### Privacy Boundaries

Users can only access their own data. Users cannot view, search for, or discover other users' profiles or todos. There is no functionality to share todos with other users or make any data public. Users cannot view a list of other users in the system. Privacy is enforced at all times, regardless of authentication status.

### Access Control Principles

Access to data is restricted to the data owner only. Guests (unauthenticated users) cannot access any user data. Members (authenticated users) can only access their own data. There is no administrative override or special access that allows viewing another user's data. All access control is based on ownership relationship between users and their todos.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Delete Behavior

When a user deletes a todo, the todo is not immediately removed from the system. Instead, it is marked as deleted and moved to the trash. The todo retains all its data including title, description, start date, due date, completion status, and edit history. Deleted todos no longer appear in the normal todo list view. Deleted todos remain in the trash until the user either restores them or permanently deletes them.

### Data Retention

Deleted todos are retained in the trash indefinitely until the user takes action. There is no automatic expiration or time-based removal of deleted todos. The system retains all data for deleted todos including the full edit history. Retention continues until one of the following occurs: the user restores the todo, the user permanently deletes the todo from trash, or the user deletes their account.

### Recovery Process

Users can recover deleted todos by restoring them from the trash. When a todo is restored, it returns to the normal todo list with all its original data intact. The restoration process preserves the todo's title, description, start date, due date, completion status, and complete edit history. Restored todos appear in the normal todo list immediately after restoration. Users can view the full edit history of restored todos just as they could before deletion.

### Permanent Deletion

Users can permanently delete todos from the trash. When a todo is permanently deleted, all its data is removed from the system and cannot be recovered. Permanent deletion removes the todo's title, description, start date, due date, completion status, and all edit history entries. Permanently deleted todos cannot be restored. When a user deletes their account, all their todos are permanently deleted including those in the trash. Account deletion also removes all edit history associated with the user's todos.