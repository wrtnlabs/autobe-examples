**todoApp — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Each user is the sole owner of all data they create within the application, including:

- Their account profile (email address and display name)
- All todos they create
- All edit history entries associated with their todos

When a user permanently deletes their account, all owned data — including todos in the trash and their associated edit history — is permanently removed. Ownership cannot be transferred to another user.

### Data Isolation

The system enforces complete data isolation between users. No user can access, view, or be exposed to another user's data under any circumstances. This includes:

- **Todo isolation**: Users can only see their own todos. There is no mechanism to browse, search, or discover another user's todos.
- **Profile isolation**: Users cannot view other users' profiles. The display name and email address of other users are not accessible.
- **Edit history isolation**: A user's edit history is only visible to that user. No other user can access another user's edit history entries.

There is no sharing, collaboration, or public visibility feature. Each user's data exists in a completely separate and private scope.

### Access Control Boundaries

Access to data is governed by strict ownership boundaries:

- **Authentication requirement**: Only authenticated users (members) can access any application data. Unauthenticated users (guests) have no access to any user data.
- **Owner-only access**: Every data operation — creating, viewing, editing, completing, deleting, restoring, or permanently deleting todos — is restricted to the owning user. The system enforces that a user can only act on todos they own.
- **Account deletion boundary**: When a user deletes their account, only that user's data is affected. No other user's data is modified, deleted, or impacted in any way.

The above policies implement the principle that each user's data exists in its own private domain with no cross-user visibility or access.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Delete Behavior

When a user deletes a todo, the system performs a soft delete. The todo is marked as deleted and moved to the trash. Deleted todos no longer appear in the user's normal todo list or in any filtered or sorted views of active todos. The todo's data — including its title, description, start date, due date, completion status, and edit history — is preserved in the system.

### Trash Retention

Deleted todos remain in the trash until the user takes one of the following actions: restores the todo to the normal list, or permanently deletes the todo from the trash. The system does not automatically purge items from the trash after any period of time. Items in the trash are retained indefinitely until explicitly removed by the user.

### Todo Recovery (Restore from Trash)

Users can recover (restore) any deleted todo from the trash. When a todo is restored, it is returned to the user's normal todo list. The restored todo retains all of its original data, including its title, description, start date, due date, completion status, and full edit history. After restoration, the todo behaves as it did before deletion and is subject to the same operations (editing, completing, deleting again, etc.).

### Permanent Deletion of Individual Todos

Users can permanently delete a todo from the trash. Permanent deletion removes the todo and all its associated data — including its full edit history — from the system irreversibly. Once permanently deleted, a todo cannot be recovered or viewed by any user. The system confirms the permanent deletion before executing it.

### Account Deletion and Data Disposal

When a user deletes their account, all data owned by that user is permanently deleted. This includes all active todos, all todos in the trash, and all associated edit histories. The deletion is irreversible. Data ownership is defined in [Data Ownership and Privacy — Ownership](./01-actors-and-auth.md).