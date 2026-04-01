**multiUserTodo — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership and Isolation

Users own all todos they create. Each user's todos are completely isolated from other users' data. There are no shared todos or public todos in the system. When a user deletes their account, all their todos including those in trash are permanently deleted. User profile data belongs to the individual user and is not shared with other users.

### Access Control and Privacy

Users can only access their own todos. There is no way to view, access, or share another user's todos. Users cannot view other users' profiles as this is a private todo application. The system enforces complete privacy boundaries between users. No mechanism exists for users to grant access to their todos to other users.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Delete Behavior

When a user deletes a todo, the todo is soft deleted and moved to the trash.
Soft deleted todos do not appear in the normal todo list.
Soft deleted todos remain accessible through the trash view.
The todo retains all its properties while in trash, including title, description, start date, due date, and completion status.
Soft deleted todos maintain their association with the user who deleted them.
Other users cannot access soft deleted todos, maintaining privacy isolation.

### Data Retention

Soft deleted todos are retained in the trash indefinitely until the user takes action.
There is no automatic deletion of trashed todos based on time.
When a user deletes their account, all their todos including those in trash are permanently deleted.
Edit history is retained for all todos that exist in the system.
When a todo is permanently deleted, its edit history is also deleted.
Account deletion removes all user data permanently with no recovery option.

### Data Recovery

Users can restore any todo from the trash.
When a todo is restored, it returns to the normal todo list.
Restored todos retain all their original properties including title, description, dates, and completion status.
The edit history of a restored todo is preserved during recovery.
Restored todos maintain their original creation date.
Only the owner of a todo can restore it from the trash.

### Permanent Deletion

Users can permanently delete a todo from the trash.
When a todo is permanently deleted, it cannot be recovered.
Permanent deletion removes the todo and all its edit history.
Permanently deleted todos are removed from the system entirely.
Account deletion triggers permanent deletion of all user todos and their edit history.
Permanent deletion is irreversible and no backup or recovery mechanism exists for permanently deleted data.