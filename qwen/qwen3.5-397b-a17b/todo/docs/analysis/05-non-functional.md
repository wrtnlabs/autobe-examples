**todoApp — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### User Data Ownership and Privacy

Each user owns all todos they create. A user's todos are completely private and isolated from all other users. Users can only access, view, edit, or delete their own todos. There is no way for a user to view, access, or share another user's todos. Users cannot view other users' profiles or any information about other users. When a user deletes their account, all their todos including those in trash are permanently deleted. The system enforces strict data isolation so that users have no visibility into other users' data or activities.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Delete Behavior

When a user deletes a todo, the todo is soft deleted rather than immediately removed from the system. A soft deleted todo is moved to the user's trash and no longer appears in the normal todo list. The todo and its edit history are retained in the system until the user either restores the todo or permanently deletes it from the trash. When a user deletes their account, all their todos including those in trash are permanently deleted.

### Trash Retention Policy

Soft deleted todos are retained in the user's trash indefinitely until the user takes action. The system retains deleted todos to allow users to recover them if needed. Each deleted todo remains in the trash along with its complete edit history. The retention of deleted todos applies only to the user who owns them, consistent with the privacy policy that each user's data is completely isolated.

### Todo Recovery

Users can recover a soft deleted todo by restoring it from the trash. When a todo is restored, it returns to the normal todo list and becomes visible in the user's active todos again. The restored todo retains all its original properties including title, description, start date, due date, completion status, and creation date. The edit history of the todo is also preserved during recovery.

### Permanent Deletion

Users can permanently delete a todo from the trash, which removes the todo and all its edit history from the system permanently. Permanent deletion cannot be undone and the todo cannot be recovered after this action. When a user deletes their account, all todos owned by that user including those in trash are permanently deleted along with their edit histories. Permanent deletion is the only method to completely remove todo data from the system.