## Business Rules

This document defines the core business rules, validation constraints, and operational policies governing the behavior of the Todo App system. These rules are written in natural language to guide backend implementation without prescribing technical architecture, database schemas, or API endpoints. All rules are enforceable, testable, and aligned with the defined actors: **user** and **admin**.

### Todo Item Title Validation

THE system SHALL require a title for every todo item. A todo item SHALL NOT be created if the title is missing, empty, or contains only whitespace characters. THE system SHALL enforce a maximum title length of 200 characters. THE system SHALL reject a title that exceeds this limit. THE system SHALL accept titles containing letters, numbers, spaces, punctuation, and Unicode characters as long as they do not violate the length constraint. THE system SHALL preserve all whitespace within the title exactly as provided by the user, including leading and trailing spaces.

### Todo Item Completion Rules

WHEN a user marks a todo item as complete, THE system SHALL set the completion status to `true`. WHEN a user unmarks a todo item as complete, THE system SHALL set the completion status to `false`. WHERE a todo item is created, THE system SHALL set the completion status to `false` by default. THE system SHALL treat completion status as a single boolean flag with no intermediate states. THE system SHALL not accept or store any value other than `true` or `false` for completion status. WHEN a todo item is retrieved, THE system SHALL return the current completion status exactly as stored.

### Todo Item Editability Window

WHILE a todo item exists, THE system SHALL allow the user to edit its title and completion status at any time. THE system SHALL NOT impose any time limit on when edits can be made. THE system SHALL allow edits even after a todo item has been marked as complete. THE system SHALL support unlimited edits to any single todo item throughout its lifetime. THE system SHALL update the "last modified" timestamp on every edit, but this timestamp SHALL NOT be exposed to the user as a visible property.

### Duplicate Todo Prevention

WHEN a user attempts to create a todo item with a title that matches the exact text of an existing todo item belonging to the same user, THE system SHALL NOT create the duplicate item. THE system SHALL return an error indicating that a todo item with the same title already exists for this user. WHERE two todo items have identical titles but different completion status, THE system SHALL treat them as separate items and allow both to exist. THE system SHALL NOT prevent creation of todo items with similar, but not identical, titles (e.g., "Buy milk" vs "Buy Milk" or "Buy milk!" are distinct).

### Data Privacy Constraint

THE system SHALL ensure that every todo item is exclusively associated with the user who created it. THE system SHALL prevent any user from accessing, viewing, modifying, or deleting a todo item created by another user. THE system SHALL enforce data isolation at the database and application layer. THE system SHALL NOT expose any user's todo items to any other user, including the admin actor. THE system SHALL not store any data that can be used to link a user’s todo items to another user’s account. THE system SHALL treat all user data as personally identifiable information under GDPR.

### Access Control Policy

WHILE the user actor is authenticated, THE system SHALL allow read, write, update, and delete operations on their own todo items. WHILE the admin actor is authenticated, THE system SHALL allow read, write, update, and delete operations on all todo items across all users. WHERE a user attempts an operation on a todo item that does not belong to them, THE system SHALL reject the request with an unauthorized access error. WHERE an admin attempts to access todo items, THE system SHALL not restrict them based on ownership. THE system SHALL NOT permit guests, unauthenticated users, or third-party systems to access any todo item. THE system SHALL reject all operations from any actor not explicitly defined as "user" or "admin".

### Session Expiration Policy

WHILE a user is authenticated, THE system SHALL maintain their session using a JWT access token with an expiration of 30 minutes. WHEN the access token expires, THE system SHALL require the user to refresh the token using a refresh token. THE system SHALL issue a refresh token upon successful login with a validity period of 30 days. WHEN the refresh token expires, THE system SHALL require the user to log in again. THE system SHALL invalidate all active sessions when a user changes their password. THE system SHALL immediately invalidate all session tokens upon user logout.

### Record Aging Policy

THE system SHALL not automatically delete or archive any todo item based on age, inactivity, or completion status. WHERE a user explicitly deletes a todo item, THE system SHALL permanently remove it from persistent storage. THE system SHALL not move deleted items to a "soft delete" or "archive" state. THE system SHALL not retain any copies of deleted todo items. THE system SHALL not implement any retention policy for completed or outdated items. THE system SHALL allow users to keep todo items indefinitely until they choose to delete them.


> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*