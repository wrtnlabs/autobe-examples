**multiUserTodo — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Each user owns their own account and all todos they create. Users have full control over their account data, including the ability to delete their account. When a user deletes their account, all their data—including todos in the normal list and todos in the trash—is permanently deleted from the system. No user data persists after account deletion.

### Data Isolation

Every user's todo data is completely isolated from other users. Users can only access and view their own todos. There is no mechanism in the system to view, access, or share another user's todos. Each user's todos remain private and are never visible to any other user, regardless of how the system is used.

### Access Control

Access to todo data is restricted to the owner of each todo. The system enforces that users can only perform operations on their own todos. Users cannot access, modify, or delete todos owned by other users. The system automatically validates that any operation on a todo is performed by its owner before executing the operation.

### Privacy Model

All user data is treated as private information. Users cannot view other users' profiles, and all todos remain private to their owners. The privacy model ensures complete separation between users at all times—there is no public sharing, no user profiles visible to others, and no mechanisms to discover or access another user's data.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Delete and Trash Storage

When a user deletes a todo, the todo is not immediately removed from the system. Instead, it is moved to the user's trash and remains stored in the system. Deleted todos are hidden from the normal todo list view but remain accessible through the trash list.

The edit history associated with a todo is preserved while the todo is in the trash. This history remains intact and can be accessed along with the restored todo.

A todo in the trash continues to belong to its owner. No other user can access a deleted todo, even while it resides in trash. Data isolation is maintained throughout the soft delete lifecycle.

### Recovery from Trash

Users may restore any todo from their trash. When a todo is restored, it returns to the normal todo list with all its original properties intact.

The restoration process also restores the todo's edit history. Users can view the complete history of edits made before the todo was deleted.

A restored todo becomes fully functional again. Users can complete, edit, or delete the restored todo as if it had never been deleted. The todo's original creation date is preserved and is not changed by the restoration.

### Permanent Deletion

Users may permanently delete a todo from the trash. This action removes the todo from the system entirely.

When a todo is permanently deleted, both the todo and its complete edit history are removed. No copy of the todo or its history remains in the system after permanent deletion.

Users may also trigger permanent deletion of all their data by deleting their account. When a user deletes their account, all todos associated with that account are permanently deleted, including todos in the trash. This includes all edit history entries associated with those todos.

### Retention Duration

Todos in trash remain in the system until the user restores them or permanently deletes them. There is no automatic expiration or time-based deletion for deleted todos.

The system does not impose time limits on how long a deleted todo may remain in trash. The duration a todo stays in trash is determined solely by user action.

Users retain the ability to recover todos from trash at any point before permanent deletion is performed.