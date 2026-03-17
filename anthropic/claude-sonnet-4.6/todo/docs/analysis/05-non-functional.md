**todoApp — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Every todo, including its title, description, completion status, dates, and full edit history, belongs exclusively to the user who created it. Every user profile belongs exclusively to the user it represents.

Ownership is established at the moment of creation and does not transfer. No mechanism exists within the system to reassign or share ownership of a todo or profile with another user.

When a user deletes their account, ownership of all their associated data — active todos, trashed todos, edit histories, and profile — is considered relinquished, and all of it is permanently removed from the system. No data belonging to a deleted account is retained after account deletion is processed.

### Data Isolation Between Users

The system maintains strict isolation between each user's data. A user's todos, profile, and edit histories are never visible to, retrievable by, or interactable with any other user.

When a user requests their todo list, only todos belonging to that user are returned — regardless of filter or sort parameters applied. It is not possible, through any combination of query options, to cause another user's todos to appear in a result set.

User profiles are private by design. A user can only view and edit their own profile. There is no profile discovery, search, or lookup feature that exposes one user's profile to another.

The trash of one user is isolated from the trash of all other users. Restoring, permanently deleting, or browsing deleted todos is only possible within the authenticated user's own trash.

Edit histories are accessible only to the user who owns the parent todo. No cross-user access to edit histories is possible.

### Access Control Boundaries

Access to all data in the system is governed by authenticated identity. Only authenticated users (members) may access any data. Unauthenticated guests have no access to any user data.

An authenticated user may only perform read and write operations on their own todos, their own profile, and their own trash. Any attempt to access or modify data belonging to another user is rejected by the system.

Completion toggling, editing, soft-deleting, restoring, and permanently deleting todos are all restricted to the owner of that todo. The system does not expose mechanisms for one user to act on another user's todo, even indirectly.

Password changes and account deletion are restricted to the authenticated user acting on their own account. No user can change another user's password or delete another user's account.

Permission definitions and actor roles are governed by the policies described in the actors and authentication document.

### Privacy Guarantees

This application is a private todo tool. There are no social, sharing, or collaboration features. No user's data is ever exposed to another user under any circumstances.

The system does not offer any functionality that reveals the existence of other users, their display names, their todos, or their activity. A user has no way to know who else uses the application.

Display names, which users choose for their own profiles, are not searchable and are not shown to other users. They exist solely for the user's own reference within their own session.

No aggregated or anonymized data derived from individual user activity is surfaced within the application to other users.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Deletion of Todos

When a user deletes a todo, the system does not immediately remove it from storage. Instead, the todo is marked as deleted and hidden from the user's normal todo list. This soft-delete mechanism preserves the todo and all of its associated edit history until the user makes an explicit decision about permanent removal.

A soft-deleted todo remains fully intact in the system, retaining its title, description, completion status, dates, and the complete edit history accumulated before deletion. The todo continues to be owned exclusively by the user who created it.

Soft-deleted todos are not accessible through the normal todo list view. They are only visible within the trash area, which is a dedicated space for managing deleted items. No other user can view or access a soft-deleted todo.

### Retention of Deleted Todos in Trash

Soft-deleted todos are retained indefinitely in the trash until the user takes an explicit action to either restore or permanently delete them. The system does not automatically expire or purge items from the trash after any fixed time period.

During the retention period in the trash, all data associated with the todo — including its title, description, dates, completion status, and full edit history — is preserved without modification. The retention applies equally to all todos regardless of how long ago they were deleted or how many edit history entries they contain.

When a user's account is deleted, all todos belonging to that user — including those currently retained in the trash — are permanently deleted as part of the account removal process. No trash data survives account deletion.

### Recovery of Soft-Deleted Todos

Users can restore any soft-deleted todo from the trash back to their active todo list. This recovery operation returns the todo to its exact state at the time of deletion, including its title, description, start date, due date, and completion status.

Upon restoration, the todo reappears in the user's normal todo list and is subject to the same filtering, sorting, and editing rules as any active todo. The todo's full edit history is also restored and accessible to the user.

Only the user who owns the todo can recover it. Recovery is self-service and does not require any administrative action. If a user attempts to restore a todo that has already been permanently deleted, the recovery cannot be completed.

### Permanent Deletion of Todos

A user can choose to permanently delete a todo that is currently in the trash. Permanent deletion is irreversible — once confirmed, the todo and all of its associated edit history are completely removed from the system and cannot be recovered.

Permanent deletion removes all data tied to the todo, including the full edit history with every recorded change. There is no partial deletion; the operation always removes the todo together with its entire history.

Permanent deletion can only be performed on soft-deleted todos that are present in the trash. Active todos must first be soft-deleted (moved to trash) before they can be permanently deleted. A user cannot permanently delete another user's todos.

When a user account is deleted, the system permanently deletes all of that user's todos — both active and those in the trash — along with their complete edit histories. This account-level permanent deletion follows the same irreversible behavior as individual permanent deletion.