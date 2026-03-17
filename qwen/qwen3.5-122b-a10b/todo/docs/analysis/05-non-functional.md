**multiUserTodo — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Users own all data they create within the application.

Each user owns their account information, including email address, display name, and password. Users maintain full control over their account credentials and can modify or delete them at any time.

Each user owns their todos and the associated edit history. All todos created by a user are exclusively theirs, and the edit history for each todo belongs to the todo owner.

When a user deletes their account, all data owned by that user is permanently removed from the system. This includes all todos, todos in the trash, and all edit history records.

### Data Isolation Between Users

Each user's data is completely isolated from all other users in the system.

Users cannot view, access, or interact with another user's todos. The system enforces strict data boundaries so that every user only sees their own todo data.

Users cannot view other users' profiles. Profile information is private to each account holder and is not accessible to other users.

Users cannot share todos with other users. There is no mechanism within the application to grant another user access to a todo.

Users cannot search for, discover, or browse other users within the system. The application does not expose any user directory or listing feature.

### Access Control

Access to data is restricted exclusively to the data owner.

Users can only access their own todos, including viewing, creating, editing, completing, and deleting their todos.

Users can only access their own profile information and can modify their display name and password.

Users can only access their own edit history for todos they own. Edit history for another user's todos is not accessible.

Users can only access their own trash and deleted todos. Deleted todos from other users are not visible or accessible.

Guest users have no access to any user data. Authentication is required to access any protected resources.

### Privacy Boundaries

The system enforces strict privacy boundaries for all user data.

Each user's todos are completely private by default. There is no public visibility option for todos.

There is no feature to share todos with other users or make them visible to anyone other than the owner.

Users cannot view activity or data from other users. The system does not expose any cross-user visibility.

Profile information is private and only visible to the account holder. Other users cannot view another user's display name or email.

The application is designed as a private todo management tool with no social or collaborative features.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Delete Behavior

When a user deletes a todo, it is not immediately and permanently removed from the system. Instead, the todo is soft deleted, which means it is marked as deleted but remains stored in the system. Soft deleted todos no longer appear in the user's normal todo list view. Soft deleted todos are moved to the user's trash, where they can be viewed in a separate trash list. Soft deleted todos retain all their original data including title, description, start date, due date, completion status, and edit history. Soft deleted todos are owned by the user who deleted them and remain private to that user. The soft delete operation is reversible through the recovery process.

### Data Retention in Trash

Deleted todos are retained in the user's trash until the user takes action to permanently delete them. There is no automatic time-based removal of deleted todos from the trash. Users can view their deleted todos in the trash list, which is paginated like the normal todo list. Users can access the trash at any time to review their deleted todos. The retention of deleted todos in the trash continues indefinitely until the user permanently deletes them or deletes their account. When a user deletes their account, all todos in the trash are permanently deleted along with the account.

### Todo Recovery from Trash

Users can recover a deleted todo from the trash to restore it to the normal todo list. When a todo is recovered, it returns to the user's active todo list with all its original data intact. The recovered todo retains its original title, description, start date, due date, and completion status. The recovered todo retains its full edit history up to the point before deletion. The recovered todo's creation date remains unchanged from when it was originally created. The recovered todo is immediately visible in the normal todo list and can be edited, completed, or deleted again. Recovery is an immediate operation that takes effect without delay.

### Permanent Deletion of Todos

Users can permanently delete a todo from the trash, which removes it from the system irreversibly. When a todo is permanently deleted, it is removed from the trash and cannot be recovered. Permanent deletion also removes all associated edit history for that todo. Permanent deletion cannot be undone, and there is no mechanism to restore a permanently deleted todo. Users must confirm permanent deletion to prevent accidental data loss. Permanent deletion only affects the specific todo selected and does not impact other todos or data. Permanent deletion is an immediate operation that takes effect without delay.

### Account Deletion Impact on Data

Users can delete their account, which triggers permanent deletion of all user data. When a user deletes their account, all todos owned by that user are permanently deleted, including todos in the trash. When a user deletes their account, all edit history associated with the user's todos is permanently deleted. Account deletion removes all data owned by the user from the system irreversibly. Account deletion cannot be undone, and there is no mechanism to restore data after account deletion. Users must confirm account deletion to prevent accidental data loss. After account deletion, the user can no longer access the application with that account. Users may create a new account with a different email address after deleting their original account.