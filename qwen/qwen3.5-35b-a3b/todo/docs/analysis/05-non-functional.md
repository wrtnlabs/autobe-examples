**multiUserTodoApp — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Each user owns all data created through their account, including todos and edit history.
Users have exclusive rights to their own todos and can manage them according to their preferences.
No other user or guest can claim ownership of another user's data.
Ownership is established upon account creation and persists until account deletion.

### Data Isolation

All user data is completely isolated between different users.
A user can only view, access, and modify their own todos and edit history.
There is no mechanism for viewing another user's data, regardless of invitation or sharing.
Guest users have no access to any user's private todos.

### Access Control

Users can only access their own todos and profile information.
Authentication is required to access any user data.
Once logged in, users can perform operations only on their own todos.
The system enforces strict boundaries between user data at all times.

### Profile Privacy

User profiles are private and belong exclusively to their owners.
Users can view and edit only their own profile information.
Users cannot view other users' profiles or profile information.
Display names are not visible to other users.

### Account Deletion

When a user deletes their account, all their data is permanently removed.
This includes all todos in the normal list, todos in trash, and all edit history entries.
Once deleted, the user's data cannot be recovered or restored.
Account deletion is a permanent action with immediate effect.

### No Data Sharing

The system does not support sharing todos between users.
There is no functionality to export, import, or transfer todos to other accounts.
Each user's data remains private and contained within their own account boundaries.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### ### Soft Deletion Process

When a user deletes a todo, it is soft deleted and moved to the trash. The todo remains in the system but no longer appears in the normal todo list. The user can still view the deleted todo by accessing the trash view. Soft deleted todos retain all their original data including title, description, dates, and edit history.

### ### Trash Retention

Deleted todos remain in the trash indefinitely until the user chooses to restore or permanently delete them. There is no automatic expiration or retention period for items in the trash. Users retain full access to their soft deleted todos at any time.

### ### Recovery from Trash

Users can restore a deleted todo from the trash, which moves it back to the normal todo list. The restored todo retains all its original data including title, description, dates, completion status, and complete edit history. The restoration action is immediate and reversible.

### ### Permanent Deletion

Users can permanently delete a todo from the trash, which removes it from the system entirely. Permanent deletion is irreversible and cannot be undone. When a todo is permanently deleted, all associated edit history entries are also permanently deleted. The todo and its history are completely removed and cannot be recovered.