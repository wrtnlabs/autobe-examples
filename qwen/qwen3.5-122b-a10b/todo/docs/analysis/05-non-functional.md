**todoApp — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Each user owns all data they create in the system. This includes:

- All todos created by the user
- All edit history associated with the user's todos
- The user's profile information (display name)

Users have full control over their owned data. They can create, view, edit, and delete their own todos and profile information. When a user deletes their account, all their data including todos and edit history are permanently removed from the system.

### Data Privacy and Isolation

User data is completely isolated between accounts. The system enforces the following privacy boundaries:

- Users can only view their own todos
- Users cannot view, access, or share another user's todos
- Users cannot view other users' profiles
- There is no functionality to share todos between users

This isolation applies to all user data including todos, edit history, and profile information. The system treats each user's data as a private workspace that is inaccessible to all other users. Access control is enforced at all times, regardless of the operation being performed.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Delete Behavior

When a user deletes a todo, it is not immediately and permanently removed from the system. Instead, the todo is soft-deleted and moved to the user's trash. Soft-deleted todos no longer appear in the user's normal todo list, but they remain stored in the system and can be accessed through the trash view.

### Retention of Deleted Todos

Deleted todos are retained in the user's trash until the user takes action. There is no automatic expiration or time-based removal of items from the trash. The user controls when deleted todos are permanently removed from the system.

### Recovery from Trash

Users can recover a soft-deleted todo by restoring it from the trash. When restored, the todo returns to the normal todo list with all its data intact, including its title, description, dates, completion status, and edit history. The restoration process is immediate and does not require approval or confirmation.

### Permanent Deletion

Users can permanently delete a todo from the trash. When a todo is permanently deleted, it is removed from the system and cannot be recovered. Permanent deletion also removes all associated edit history for that todo. This action is irreversible.

### Account Deletion and Data Removal

When a user deletes their account, all todos belonging to that user are permanently deleted. This includes todos in the normal list and todos in the trash. All edit history associated with those todos is also permanently deleted. Account deletion is irreversible and results in complete data removal for that user.