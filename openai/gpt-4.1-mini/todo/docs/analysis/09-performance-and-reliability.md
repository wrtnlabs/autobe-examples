# Multi-User Todo Application Requirements Specification

## User Account

Users shall be able to register an account by providing a valid email address and a password. The email address uniquely identifies each user.

- WHEN a user submits a registration request with an email and password, THE system SHALL create the user account if the email is not already in use.
- WHEN a user attempts to log in with their email and password, THE system SHALL authenticate the credentials and start a user session upon success.
- WHEN a user requests to change their password, THE system SHALL authenticate the current password and update to the new password upon validation.
- WHEN a user requests to delete their account, THE system SHALL permanently delete the user record along with all associated todos, including those in the trash.
- IF authentication fails during login or password change, THEN THE system SHALL return a clear error message.

## User Profile

Each user shall have a private profile containing at minimum a display name.

- WHEN a user views their profile, THE system SHALL display the profile information including display name.
- WHEN a user updates their display name, THE system SHALL save the changes and reflect them immediately.
- USERS SHALL NOT have access to view other users' profiles or any of their data.

## Creating Todos

Users shall be able to create todo items with a required title and optional description, start date, and due date.

- WHEN a user submits a new todo with a title, THE system SHALL save the todo as incomplete by default.
- IF the description, start date, or due date are omitted, THEN those fields shall be null or empty.
- THE system SHALL assign a creation timestamp to each new todo.

## Viewing Todos

Users shall be able to view a paginated list of their own todos.

- WHEN a user requests to view their todo list, THE system SHALL return a paginated list.
- EACH todo item in the list SHALL include title, completion status, start date (if set), due date (if set), and creation date.
- WHEN a user requests details of a single todo, THE system SHALL provide all details including full description.

## Completing Todos

Users shall be able to toggle the completion status of their todos.

- WHEN a user marks a todo as complete, THE system SHALL update the status accordingly.
- WHEN a user marks a todo as incomplete, THE system SHALL update the status accordingly.
- THE completion toggle SHALL be a simple switch between the two states.

## Editing Todos

Users shall be able to update title, description, start date, and due date.

- WHEN a user edits any of these fields, THE system SHALL record the changes.
- ALL edits SHALL be stored in the edit history with timestamps and before/after values.

## Edit History

Each todo shall maintain a complete edit history.

- WHEN a todo is edited, THE system SHALL create a history entry including:
  - Timestamp of edit
  - Changed title, if applicable
  - Changed description, if applicable
  - Changed start date, if applicable
  - Changed due date, if applicable
- USERS SHALL be able to view the complete edit history of their todos.
- History entries SHALL be sorted from most recent to oldest.

## Deleting Todos

Users shall be able to delete todos without permanent removal.

- WHEN a user deletes a todo, THE system SHALL mark the todo as deleted (soft delete).
- Deleted todos SHALL NOT appear in the normal todo list.

## Trash

The system shall provide a trash area for deleted todos.

- USERS SHALL be able to view a paginated list of deleted todos.
- WHEN a user opts to restore a deleted todo, THE system SHALL return it to the normal todo list.
- WHEN a user deletes a todo permanently from trash, THE system SHALL remove the todo and its entire edit history.
- PERMANENT deletion SHALL be irreversible.

## Filtering Todos

Users shall be able to filter their todo lists by completion status.

- FILTER options SHALL include all todos, only complete todos, and only incomplete todos.
- WHEN filters are applied, THE system SHALL return a list matching the criteria.

## Sorting Todos

Users shall be able to sort their todo lists according to creation date, start date, and due date.

- SORT options shall support ascending and descending orders for creation date.
- START and due dates sorting shall list todos without the date set at the end.

## Privacy

Each user's data shall be strictly private.

- USERS SHALL only access their own todos and profiles.
- THE system SHALL enforce access controls preventing any unauthorized data viewing.

## Authentication and Authorization

- USER authentication shall be handled using secure session or token-based methods.
- ALL user requests shall be authorized ensuring ownership of the resources.
- FAILED authentication attempts shall produce appropriate error messages.

## Performance and Reliability

- The system SHALL respond to user login attempts within 2 seconds.
- Todo creation, editing, completion, deletion, restoration, and retrieval SHALL occur within 1-2 seconds.
- Pagination, filtering, and sorting operations SHALL complete within 2 seconds.
- System availability SHALL be at 99.9% uptime with proactive maintenance notifications.
- Scalability SHALL support at least 10,000 concurrent users initially and up to 1 million user registrations over time.

## Error Handling

- The system SHALL validate all inputs and provide descriptive error messages.
- ON failure during operations, THE system SHALL maintain data integrity and rollback as needed.
- Users SHALL be notified of any invalid operations or authentication failures promptly.

---

```mermaid
flowchart TD
  A["User submits registration"] --> B["System creates account"]
  B --> C["User logs in"]
  C --> D{""Authentication successful?""}
  D --|"Yes"--> E["User session started"]
  D --|"No"--> F["Return error message"]

  subgraph Todo Lifecycle
    G["User creates todo"] --> H["Todo saved as incomplete"]
    H --> I["User views todo list"]
    I --> J["User views todo details"]
    J --> K["User toggles completion status"]
    K --> L["User edits todo"]
    L --> M["System records edit history"]
    M --> N["User deletes todo (soft delete)"]
    N --> O["Todo moves to trash"]
    O --> P["User views trash list"]
    P --> Q["User restores todo from trash"]
    P --> R["User permanently deletes todo"]
  end

  S["User filters todo list"] --> I
  T["User sorts todo list"] --> I
  U["User updates profile display name"] --> V["Profile updated"]

  style Todo Lifecycle fill:#f9f,stroke:#333,stroke-width:2px
```