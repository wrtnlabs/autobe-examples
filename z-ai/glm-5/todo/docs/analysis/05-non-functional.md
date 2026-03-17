**privateTodoApp — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Isolation

Each user's data is completely isolated from all other users.

Users cannot view, access, or interact with another user's todos under any circumstances. There is no feature or mechanism to share todos with other users.

Users cannot view other users' profiles. Profile information, including display name, is only visible to the profile owner.

The todo list and trash contain only the authenticated user's own todos. Deleted todos from other users are never visible.

Edit history is private to each user. Users can only view the edit history of their own todos.

### Data Ownership

Each user owns all todos they create, including the complete edit history for each todo.

Each user owns their profile information, including their display name.

Only the owner of a todo can view, edit, complete, or delete it. There is no shared ownership or collaborative access.

When a user deletes their account, all data they own is permanently removed. This includes all their todos (both active and in trash) and all associated edit history.

The user who created a todo remains its sole owner until the todo is permanently deleted or the user's account is deleted.

### Access Control

Only authenticated users can access the application. Guests cannot view any todos or user profiles.

Users can only access their own data. Authentication is required for all operations on todos and profiles.

A user can only perform operations on todos they own:
- View their own todo list and individual todos
- Create new todos
- Edit their own todos
- Mark their own todos as complete or incomplete
- Delete their own todos
- Restore their own todos from trash
- Permanently delete their own todos from trash
- View edit history of their own todos

A user cannot access, view, modify, or delete another user's todos or profile under any circumstances.

### Privacy Guarantees

This is a private todo application. Privacy is a core principle of the system.

All todos are completely private to the user who created them. There is no way to make a todo visible to other users.

There is no sharing functionality. Users cannot share todos with other users, export them for public viewing, or make them accessible via any means to others.

User profiles are private. A user's display name and any other profile information is only visible to that user.

The application does not provide any mechanism for users to discover or identify other users of the system. User email addresses are not visible to other users.

All data access is restricted to the authenticated user's own data scope. The system does not allow cross-user data access through any feature or interface.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Delete Behavior

When a user deletes a todo, it is not immediately removed from the system. Instead, the todo is marked as deleted and moved to the user's trash.

Deleted todos no longer appear in the normal todo list. They remain accessible only through the trash view, where the user can see a list of their deleted todos.

The soft delete applies only to the user's own todos. Users cannot delete todos belonging to other users.

When a todo is deleted, all its associated edit history entries are retained and remain available if the todo is later restored.

### Trash Retention

Deleted todos remain in the trash indefinitely until the user takes action to either restore or permanently delete them.

There is no automatic expiration or cleanup of items in the trash. The user has full control over when and whether to permanently remove their deleted todos.

The trash list is paginated, allowing users to browse through all their deleted todos regardless of quantity.

### Data Recovery

Users can restore a deleted todo from the trash at any time before it is permanently deleted.

When a todo is restored, it returns to the normal todo list and becomes fully accessible again as if it had never been deleted. All original attributes are preserved, including title, description, start date, due date, completion status, and edit history.

Restoration is a reversible action — the user can delete the todo again if needed, returning it to the trash.

### Permanent Deletion

Users can permanently delete a todo from the trash. This action cannot be undone.

When a todo is permanently deleted, the todo and all its edit history entries are removed from the system entirely.

Permanent deletion also occurs when a user deletes their account. Account deletion permanently removes all of the user's data, including all todos (whether in the normal list or in the trash) and all associated edit history entries.

Permanent deletion is the only way to fully remove data from the system. The standard delete action only moves data to the trash, preserving the option for recovery.