**todoApp — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Every user is the sole owner of their account data, including their email address, password, and display name. Ownership is automatically assigned upon account creation and cannot be transferred to another user.

Every user owns all todos they create. Ownership is established automatically at the moment a todo is created and cannot be transferred. Users do not share ownership of any todo with other users.

Every user owns the edit history associated with their todos. Each history entry belongs exclusively to the user who created the parent todo.

There is no shared ownership or collective ownership model in this application. All data has a single, individual owner.

### Data Isolation

The system maintains strict boundaries between users to prevent any cross-user data access. Each user's data lives in its own isolated scope.

One user's todos are completely separate from another user's todos. There is no overlap or shared pool of todos between users.

One user's edit history entries are completely separate from another user's. History data never leaks across user boundaries.

One user's trash contents remain isolated from all other users. Even when a todo is moved to trash, it cannot be accessed by anyone except the owner.

Isolation applies across all system features including list views, search, and direct lookups. No feature provides a pathway to view another user's data.

### Access Control

Users can access only the data they own. A user can view their own profile, todos, edit history, and trash contents.

Guests have access only to authentication and registration flows. Guests cannot view any user data, not even a list of registered users or public profiles.

No user can view, edit, delete, restore, or permanently delete another user's data. All operations are restricted to the owner's own data.

The system does not provide any cross-user visibility, including viewing other users' profile details or todo lists.

### Privacy

Each user's todo data is completely private. There is no mechanism to view, access, or share another user's todos.

Each user's profile information, including their display name, is private and visible only to the owning user. Other users cannot see who else exists in the system.

Each user's edit history is private and accessible only to the todo owner. History entries never appear in any list or view accessible to other users.

When data is permanently deleted, it is removed in a manner consistent with the system's privacy commitments.

The application provides no sharing, collaboration, or visibility features that would expose any user's data to other users.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Data Retention via Soft Deletion

WHEN a user deletes a todo, THE system SHALL move the todo to the trash list and remove it from the normal active todo list.
WHILE a todo is in the trash list, THE system SHALL retain all associated data, including the title, description, start date, due date, and full edit history.
WHEN a user views their trash list, THE system SHALL display all deleted todos currently being retained.
WHEN a user views a deleted todo from the trash list, THE system SHALL display its details and full edit history.

### Data Recovery

WHEN a user restores a todo from the trash list, THE system SHALL move the todo back to the normal active todo list.
WHEN a todo is restored, THE system SHALL preserve its original details and its full edit history exactly as they existed before the initial deletion.
WHEN a todo is successfully restored, THE system SHALL make the item immediately accessible and editable again by the user.

### Permanent Deletion

WHEN a user permanently deletes a todo from the trash list, THE system SHALL completely and immediately remove the todo and its associated edit history.
WHEN a todo is permanently deleted, THE system SHALL make the data irretrievable and exclude it from all future trash list queries.
WHEN a user deletes their account, THE system SHALL permanently delete all associated data, including all active todos, all todos in the trash list, and all associated edit histories.