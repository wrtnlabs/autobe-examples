**todoApp — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Users own the following data as their personal information within the application: their user account, their profile display name, their todos, and the edit history associated with their todos (defined in the domain model).

Each user’s todos and todo edit history are owned by that same user and are not owned or shared with any other user.

The application treats restored todos as belonging to the same original owner (defined in this unit), not as new content and not as content transferred to another user.

When a todo is permanently removed from trash, the edit history belonging to that todo is also permanently removed, and those records no longer exist within the application for the owning user.

If a user updates their profile display name, only that user’s profile display name is changed, and no other user’s profile display name is affected.

### Access Control Boundaries

Only authenticated users can view, create, edit, complete/incomplete, delete, restore, and permanently delete their own todos and their own todo edit history.

Users can view only their own profile display name; users cannot view other users’ profile display names.

Users can view only their own todos in both the normal todo list and the trash list.

Users can view the full details of a todo—including its full description and full edit history—only if the todo belongs to them.

Users can restore a deleted todo only if that todo belongs to them.

Users can permanently delete a todo from trash only if that todo belongs to them.

The application must reject any attempt by a user to access or modify a todo, or to view edit history, that does not belong to that user.

When an access attempt is rejected, the user must not receive information that would reveal details about the existence of a specific other user’s todo or edit history beyond the fact that access is not allowed.

### Data Isolation and Private Scope

A user’s todos and todo edit history are completely isolated from other users, meaning no user can access another user’s content through viewing, filtering, sorting, single-todo viewing, or any list views (normal list and trash).

Filtering by completion status applies only within the user’s own set of todos; it must not surface any content belonging to other users.

Sorting by creation date, start date, or due date applies only within the user’s own set of todos; it must not reorder or expose any other user’s content.

Todos without a start date or due date (as applicable) are positioned at the end for that user’s sorting behavior, and this placement rule must not depend on or reflect other users’ data.

Pagination in the todo list and trash list returns only that user’s own items for that page; it must not reveal counts or items from other users.

### Privacy Expectations for Profile and Content

Because this is a private todo app, no user can access, view, or share another user’s todos under any circumstance.

The application must ensure that a user’s profile display name is not accessible to other users via the user-facing features described for profile viewing.

The application must ensure that full todo details (including the full description) and the complete edit history are private to the owning user.

When a user deletes a todo, it must no longer appear in the normal todo list for that user, but it must remain accessible to that same user via the trash view.

The application must ensure that restoring a deleted todo returns it to the normal todo list for the owning user, and only for that owning user.

If a user permanently deletes a todo from trash, the application must ensure that the deleted todo and its edit history are no longer accessible to that user through any view.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft-delete retention scope

Deleted todos are treated as soft-deleted: after a user deletes a todo, it no longer appears in the normal todo list.

A soft-deleted todo remains eligible to appear in the user’s trash view.

The soft-delete also affects the todo’s edit history such that the history remains associated with the todo while the todo is in trash (defined in this unit’s scope), enabling later recovery.

If a user permanently deletes a todo from trash, the todo and its edit history are permanently deleted (permanent-deletion requirement described in a separate section of this unit).

### Trash recovery behavior

A user can restore a soft-deleted todo from the trash.

When a user restores a todo from trash, the restored todo returns to the normal todo list for that user.

After restoration, the todo is treated as not soft-deleted: it no longer belongs to the trash view.

If a user restores a todo, the todo’s edit history remains available as part of the restored todo’s details and full edit history view.

Trash list pagination applies to soft-deleted todos: only the user’s own soft-deleted todos are included in the trash list, and navigation between pages does not expose other users’ items.

### Permanent deletion behavior

A user can permanently delete a todo only from the trash view.

When a user permanently deletes a todo from trash, the todo is permanently removed and no longer appears in either the normal todo list or the trash view.

Permanently deleting a todo also permanently deletes its edit history, so the user cannot view the removed edit history after permanent deletion.

If a permanently deleted todo is referenced again for viewing or history access, the system rejects access because the resource no longer exists for the user.

Permanent deletion is irreversible from the user’s perspective: after permanent deletion, the user cannot restore the todo.

### Retention and time horizon

The system retains soft-deleted todos (and their edit history) long enough to allow the user to recover them from trash.

The system does not permanently delete soft-deleted todos as part of the standard “delete” action; permanent deletion occurs only when the user chooses to permanently delete from trash.

The application does not define or expose a specific automatic deletion timeframe in the stated requirements; therefore, the business policy is that the user-initiated action is what determines when permanent deletion occurs.

If additional retention limits exist, they must be applied consistently to all soft-deleted todos owned by a user, without exposing other users’ todos.