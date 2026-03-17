**todoApp — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Isolation Between Users

The system maintains complete isolation of data between users.

- Users can only access their own data, including todos, edit history, and account information
- Data from one user is never visible or accessible to another user
- There are no shared workspaces, collaboration features, or data sharing capabilities
- All data access is scoped to the authenticated user's identity

If a user attempts to access data that does not belong to them (via direct reference), the request is rejected.

All data operations are automatically filtered to include only the current user's data.

### Data Ownership

Users own all data they create within the system.

- Each user owns their todos, including all todo content and associated metadata
- Users own their edit history entries for their todos
- Users own their account information (email, password hash, display name)

When a user deletes their account, all data they own is permanently deleted, including:
- All their todos (including those in trash)
- All edit history associated with their todos
- Their user account record

Data ownership is exclusive and non-transferable. There is no mechanism for transferring ownership of data between users.

### Access Control Policy

Access to data is controlled based on user authentication and ownership.

**Authentication Requirements:**
- Users must be authenticated to access any data in the system
- Guest users cannot access any user data
- Session-based authentication controls all data access

**Authorization Rules:**
- Users can only perform operations on their own data
- Users can create, read, update, and delete their own todos
- Users can read the edit history of their own todos
- Users cannot access other users' data in any way

**Access Boundaries:**
- No administrative overrides exist to bypass user data isolation
- There are no shared views, public links, or export features that could expose user data
- All data retrieval operations automatically filter by user ID

### Privacy Guarantees

The system guarantees user privacy through technical and policy measures.

**Data Privacy:**
- All user data is private by default
- There is no mechanism for users to view, access, or share another user's todos
- User profiles are not visible to other users
- No public information about users or their todos exists in the system

**Privacy Boundaries:**
- Users cannot discover other users' existence in the system
- No user identifiers (email, display name) are exposed to other users
- Search and filtering operations are scoped exclusively to the user's own data

**Privacy Violation Prevention:**
- The system prevents accidental or intentional data leakage between users
- All user interfaces clearly indicate which user's data is being displayed
- No features exist that could inadvertently expose user data to others

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Delete Behavior

THE todoApp SHALL implement a soft delete mechanism for todos. When users delete a todo, it is marked as soft-deleted but not permanently removed from storage. Soft-deleted todos shall be excluded from normal todo list views. Users can view soft-deleted todos only through the trash feature.

### Data Retention in Trash

Soft-deleted todos in the trash shall be retained indefinitely until the user takes explicit action to permanently delete them or restore them. The system shall maintain edit histories for soft-deleted todos while they remain in the trash. When users delete their account, all their soft-deleted todos in trash are also permanently deleted.

### Recovery from Trash

Users can restore soft-deleted todos from trash at any time. When a todo is restored from trash, it returns to the normal todo list with all its original attributes intact. The todo's edit history is preserved when restored. The system shall track the soft delete date and restoration date for audit purposes.

### Permanent Deletion Process

Users can permanently delete todos from the trash. When a todo is permanently deleted from trash, all its data and edit history are irrevocably removed from storage. Permanent deletion overrides the soft delete mechanism and cannot be reversed. Account deletion triggers permanent deletion of all user data including todos in trash.