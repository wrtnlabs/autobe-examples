**multiUserTodo — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership Scope for User-Private Content

- THE system SHALL treat each user’s profile display name as data owned by that user.
- THE system SHALL treat each todo’s title, description, start date, due date, completion status, and creation date as data owned by the user who created the todo.
- THE system SHALL treat each todo’s edit history as data owned by the user who owns the todo.
- THE system SHALL ensure that ownership determines visibility and actions for todos and todo edit history.
- WHEN a user deletes their account, THE system SHALL permanently remove their todos from accessibility, including todos that are currently in trash.
- WHEN a user deletes their account, THE system SHALL permanently remove the edit history associated with that user’s todos from accessibility.

### Access Control Boundaries Between Users

- THE system SHALL require that, when viewing a list of todos, the system shows only todos owned by the currently signed-in user.
- THE system SHALL require that, when viewing a single todo, the system shows that todo only if it is owned by the currently signed-in user.
- THE system SHALL require that, when viewing a user’s trash list, the system shows only deleted todos owned by the currently signed-in user.
- THE system SHALL require that, when restoring a deleted todo from trash, the system allows restoration only for a todo owned by the currently signed-in user.
- THE system SHALL require that, when permanently deleting a todo from trash, the system permanently deletes only a todo owned by the currently signed-in user.
- THE system SHALL require that, when viewing edit history, the system shows only edit history entries for todos owned by the currently signed-in user.
- IF a user attempts to view, restore, edit, delete, or view history for a todo that is not owned by that user, THEN THE system SHALL deny access.

### Privacy Guarantees for User Profiles and Todos

- THE system SHALL keep the application private such that users cannot view or access other users’ profiles.
- THE system SHALL keep each user’s profile display name private from other users.
- THE system SHALL keep each user’s todos completely private from other users.
- THE system SHALL keep each user’s todo details private from other users, including the full description when a single todo is viewed.
- THE system SHALL keep each user’s deleted (soft-deleted) todos private so that other users cannot view or discover them via the trash view.
- THE system SHALL keep each user’s todo edit history private so that other users cannot view it.
- THE system SHALL ensure there is no way for a user to view, access, or share another user’s todos.

### Data Isolation Consistency Across All Todo States

- THE system SHALL enforce data isolation consistently across: normal todo viewing, single-todo viewing, trash viewing, restoring from trash, permanently deleting from trash, and viewing a todo’s edit history.
- WHILE a todo is in normal list visibility, THE system SHALL show it only to its owner.
- WHILE a todo is in trash, THE system SHALL show it only to its owner.
- WHEN a deleted todo is restored from trash, THE system SHALL return it to the owner’s normal todo list visibility.
- WHEN a todo is permanently deleted from trash, THE system SHALL remove the todo content and its edit history from accessibility for its owner as well.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft-Deleted Todo Retention Window and Expiration

WHEN a user deletes a todo, THE system SHALL move the todo into the user’s trash using soft-delete.
THE system SHALL retain soft-deleted todos for a defined retention window after they enter the trash.
WHEN the retention window ends for a specific soft-deleted todo, THE system SHALL remove that todo from the user’s trash.
WHEN a soft-deleted todo is removed due to the retention window ending, THEN the todo SHALL no longer be available for recovery.
THE system SHALL ensure that a removed-from-trash todo does not return to the trash or normal todo list unless the user performs a new create action for a new todo.

### Restoring a Todo from Trash

WHEN a user restores a todo from the trash, THE system SHALL return that todo to the user’s normal todo list.
WHEN restoration succeeds, THE system SHALL preserve the todo’s completion status as it was before deletion.
WHEN restoration succeeds, THE system SHALL preserve all details required for the user to view the todo after restoration, including its description, start date (if set), and due date (if set).
WHEN restoration succeeds, THE system SHALL preserve the todo’s full edit history so the user sees the same history after restoration.
IF a user attempts to restore a todo that is not present in their trash (for example, because it was removed after the retention window ended), THEN the restoration action SHALL be rejected.

### Permanent Deletion Finality for Trash Items and Edit History

WHEN a user permanently deletes a todo from the trash, THE system SHALL permanently remove the todo so it no longer appears in either the normal todo list or the trash list.
WHEN a user permanently deletes a todo from the trash, THE system SHALL permanently remove the todo’s edit history.
IF a user attempts to permanently delete a todo that is not present in their trash, THEN the permanent-deletion action SHALL be rejected.
AFTER permanent deletion succeeds, THE system SHALL ensure the user cannot restore the deleted todo from trash.
AFTER permanent deletion succeeds, THE system SHALL ensure the user cannot view the deleted todo details or its edit history.