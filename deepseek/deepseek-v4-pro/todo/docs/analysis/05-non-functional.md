**todoApp — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Isolation

Each user's data is completely isolated from every other user's data. The system maintains a strict partition between users such that no data belonging to one user is ever accessible to another user.

This isolation applies to all data types:

- **Account data**: Email address, password, and display name are isolated per user.
- **Todos**: Each user's todos — including title, description, start date, due date, completion status, and creation date — exist within that user's boundary.
- **Edit history**: Every history entry for a todo is tied to the owning user and is never exposed to other users.
- **Trash**: Deleted todos in a user's trash are isolated in the same manner as active todos.

Data isolation is enforced by the system at all times. There is no mechanism — accidental or intentional — that allows one user's data to appear in another user's context.

### Data Ownership

Each user owns all data they create within the application. Ownership is established at the moment of creation and is immutable throughout the data's lifecycle.

Specifically:

- **User account**: A user owns their own account, including email address, password, and display name. No other user has any claim to this data.
- **Todos**: A user owns every todo they create. Ownership remains with the user regardless of the todo's state — active, completed, or deleted to trash.
- **Edit history**: A user owns all edit history entries generated from edits to their todos. Ownership of history entries is tied to the todo's owner.

Ownership is not transferable. A user cannot assign, share, or delegate ownership of their data to another user. When a user permanently deletes a todo or deletes their entire account, the corresponding data ceases to exist — no residual ownership persists.

### Access Control

The application enforces a strict access model: every piece of data is accessible only by its owning user. There are no shared views, collaborative features, or cross-user access paths.

Access control rules:

- **Own todos**: A user can view, create, edit, complete, and delete only their own todos.
- **Own trash**: A user can view, restore, and permanently delete only their own deleted todos.
- **Own edit history**: A user can view the edit history for only their own todos.
- **Own profile**: A user can view and edit only their own display name.
- **No cross-user access**: A user cannot view another user's profile, todos, trash, or edit history under any circumstance.

Access is verified on every request. The system rejects any attempt to access data that does not belong to the requesting user.

### Privacy

The application is designed as a fully private todo management tool. All user data is treated as private by default and at all times.

Privacy guarantees:

- **Profile privacy**: A user's display name is never visible to other users. There is no public user directory or search mechanism.
- **Todo privacy**: All todo content — titles, descriptions, dates, and completion status — is visible only to the owning user.
- **Edit history privacy**: All edit history entries are private to the todo's owner.
- **No sharing**: The application provides no feature to share, expose, or make public a user's data. There is no concept of a shared todo or public profile.

When a user deletes their account, all associated data — profile, all todos (including those in trash), and all edit history — is permanently removed from the system. No residual data is retained after account deletion. For data retention and recovery policies regarding individual todo deletion, see the Data Retention and Recovery section.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Delete

When a user deletes a todo, the system performs a soft delete. The todo is not permanently removed from the system; instead, it is flagged as deleted and moved to the trash. Once soft-deleted, the todo no longer appears in the normal todo list. The todo's edit history is preserved and remains accessible while the todo is in the trash.

A soft-deleted todo retains all of its original data: title, description, start date, due date, completion status, and creation date. The edit history associated with the todo is also fully preserved during the soft-delete process.

### Trash Retention

Soft-deleted todos remain in the trash indefinitely. The system does not automatically purge or expire items from the trash. A todo stays in the trash until the user takes one of two actions: restoring the todo back to the normal todo list, or permanently deleting the todo from the trash.

While in the trash, the todo's data and its edit history continue to be retained in full. The trash list is paginated, and users can browse their soft-deleted todos the same way they browse the normal todo list.

### Recovery

Users can restore a soft-deleted todo from the trash. When restored, the todo returns to the normal todo list with all its original data intact: title, description, start date, due date, completion status, and creation date are all preserved as they were before deletion. The todo's edit history is also preserved and remains accessible after restoration.

A restored todo behaves exactly as it did before deletion. It appears in the normal todo list, can be filtered and sorted, and can be edited, completed, or deleted again.

### Permanent Deletion

Users can permanently delete a todo from the trash. Permanent deletion is irreversible: once permanently deleted, the todo and all its associated data are removed from the system and cannot be recovered.

When a todo is permanently deleted, its entire edit history is also permanently deleted alongside it. No trace of the todo or its edit history remains in the system.

When a user deletes their account, all of their todos — including both active todos and those currently in the trash — are permanently deleted. All edit history entries associated with those todos are also permanently deleted. This ensures that no user data remains in the system after account deletion.