**todoApp — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Each user owns their account, profile, and all todos they create.

When a user creates a todo, that todo is permanently associated with their account and cannot be transferred to another user.

When a user deletes their account, all data owned by that user is permanently removed, including all todos in the normal list and trash, as well as all edit history entries.

### Privacy and Access Control

Each user's data is completely isolated from all other users.

Users can only view, edit, complete, or delete their own todos. There is no functionality to view, access, modify, or share another user's todos under any circumstance.

Users cannot view other users' profiles or display names. The application does not provide any mechanism to discover or browse other users.

All todo lists, filtering, and search operations are automatically scoped to the authenticated user's own data only. Users have no visibility into how many todos other users have or any information about other users' activity.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Delete and Trash Retention

When a user deletes a todo, the todo is soft-deleted and moved to the trash. Soft-deleted todos are retained in the trash indefinitely until the user chooses to permanently delete them or deletes their account. Soft-deleted todos do not appear in the normal todo list. The edit history of a soft-deleted todo is retained along with the todo in the trash.

### Todo Recovery

Users can restore any soft-deleted todo from the trash. When a todo is restored, it returns to the normal todo list with all its original properties intact, including title, description, start date, due date, completion status, and edit history. The creation date of the todo remains unchanged after restoration. Restored todos behave identically to todos that were never deleted.

### Permanent Deletion

Users can permanently delete a todo from the trash. When a todo is permanently deleted, the todo and all its edit history entries are permanently removed and cannot be recovered. When a user deletes their account, all todos owned by that user, including todos in the trash, are permanently deleted along with their edit history. Permanent deletion is irreversible.