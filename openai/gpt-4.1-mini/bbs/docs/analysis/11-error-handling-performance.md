# Economic/Political Discussion Board Requirements Specification

## User Account

- **User Registration:** When a new user attempts to sign up with an email and password, the system SHALL validate that the email is unique and properly formatted. Upon successful validation, the user SHALL be created with a securely hashed password.
- **User Login:** When a user attempts to log in with email and password, THE system SHALL authenticate the credentials. If credentials are valid and the user is not banned, the system SHALL create a session or issue an authentication token.
- **Password Change:** When a logged-in user submits a password change request with the current and new password, THE system SHALL verify the current password and update it to the new password if valid.
- **Account Deletion:** When a user requests account deletion, THE system SHALL delete the user account along with all their articles and comments permanently.
- **Authentication Failure Handling:** If authentication fails due to invalid credentials, THE system SHALL return an "Invalid email or password" error.
- **Banned User Login:** When a banned user attempts to log in, THE system SHALL deny access and provide the ban reason.

## User Profile

- Each user SHALL have a profile containing a display name and bio text.
- Users SHALL be able to edit their own display name and bio.
- Profiles SHALL be viewable by other users, showing:
  - Display name
  - Bio text
  - List of all articles authored by the user
  - List of all comments written by the user

## Sections

- The discussion board SHALL be divided into administrators-managed sections such as Politics, Economy, and Current Affairs.
- Each section SHALL have a unique name and descriptive text.
- Only administrators SHALL be able to create, edit, or delete sections.
- Users SHALL be able to view the list of all sections.
- Users SHALL be able to browse articles within a specific section.

## Articles

- Users SHALL be able to create articles within any existing section.
- An article SHALL include:
  - Title (required)
  - Content in text format (required)
  - Section assignment (required, must be one existing section)
- Users SHALL be able to attach multiple files and images to an article.
- Users SHALL be able to add multiple free-text tags to their articles.
- Article authors SHALL be permitted to edit their own articles including title, content, attachments, and tags.
- Article authors SHALL be permitted to delete their own articles.

## Article List

- Users SHALL be able to view a paginated list of articles in each section, limited to 20 articles per page.
- The list SHALL display the title, author, tags, comment count, and timestamp of each article.
- Articles SHALL be displayed without their full content.
- Users SHALL be able to sort articles by newest first or oldest first.

## Viewing an Article

- Users SHALL be able to view the full content of a single article.
- The article page SHALL show:
  - Title
  - Author
  - Full content
  - Attached files and images with downloadable links
  - Tags
  - Time posted

## Searching Articles

- Users SHALL be able to search articles by title or content keywords.
- Search results SHALL be paginated with 20 results per page.
- Users SHALL be able to filter search results by tags.

## Comments

- Users SHALL be able to write comments on articles.
- Comments SHALL be single-level only; replies or nested comments are not supported.
- Comments on an article SHALL be displayed sorted by oldest first.
- Each comment SHALL show the author, content, and time posted.
- Comment authors SHALL be permitted to edit and delete their own comments.

## Administrator System

### Becoming an Administrator

- Any user MAY submit a request to become an administrator including a text reason.
- Super administrators SHALL be able to view the list of pending requests.
- Super administrators SHALL be able to approve or reject administrator requests.
- Upon approval, THE requested user SHALL become a regular administrator.

### Administrator Grades

- Two grades of administrators SHALL exist: regular administrators and super administrators.
- Super administrators SHALL be able to promote regular administrators to super administrators.
- Super administrators SHALL be able to demote other super administrators to regular administrators but SHALL NOT demote themselves.

### Administrator Capabilities

- Administrators SHALL have all the capabilities of regular users.
- Administrators SHALL be able to create, edit, and delete sections.
- Administrators SHALL be able to delete any article or comment regardless of ownership.
- Administrators SHALL be able to ban or unban users.
- Administrators SHALL be able to view the list of banned users and ban reasons.

## Banning

- When a user is banned, THE system SHALL record the ban reason.
- Banned users SHALL be prevented from logging in.
- Existing articles and comments by banned users SHALL remain publicly visible.

## Authentication and Authorization

- The system SHALL authenticate users securely using email and password.
- User sessions SHALL be managed securely through tokens or sessions.
- All user actions SHALL check permissions according to user roles (guest, regular user, administrator, super administrator).
- Administrative functions SHALL be restricted to administrators according to grade.

## Error Handling and Performance Requirements

### Authentication and Authorization Errors

- WHEN invalid credentials are submitted, THE system SHALL respond with a clear "Invalid email or password" error.
- WHEN a banned user attempts to log in, THE system SHALL deny access and provide the ban reason.
- WHEN unauthorized actions are attempted by users, THE system SHALL return a "Permission denied" error.

### Input Validation Errors

- THE system SHALL validate all user inputs including article title, content, tags, and file types.
- WHEN invalid data is submitted, THE system SHALL return detailed validation errors.
- File uploads SHALL be validated for allowed size and type.

### Resource Availability Errors

- WHEN users request non-existent articles, comments, sections, or user profiles, THE system SHALL return a "Not found" error.
- WHEN administrators attempt deletion of non-existent resources, THE system SHALL notify accordingly.

### Attachment Handling Errors

- File upload failures due to network or server errors SHALL be reported with retry options.
- Missing or invalid attachment links SHALL result in an appropriate error.

### Administrator Actions Impact

- Deletion of articles or comments by administrators SHALL update associated counts and lists.
- Bans SHALL prevent login but preserve existing content visibility.

### Performance Targets

- THE system SHALL respond to login, posting, and profile update requests within 2 seconds under normal load.
- Article and comment listings with pagination SHALL respond within 1 second.
- File uploads SHALL support concurrent uploads with progress feedback.
- File download responses SHALL target completion within 3 seconds for typical attachments.
- Article search with filters SHALL return results within 2 seconds.

### Recovery Processes

- THE system SHALL allow retrying failed uploads without data loss.
- Users SHALL be informed if attempting to edit or delete unavailable resources.
- Administrative changes SHALL maintain data integrity and reflect immediately.

## Mermaid Diagrams

```mermaid
graph LR
  A["User Action"] --> B{"Is Input Valid?"}
  B --|"No"| C["Return Validation Error"]
  B --|"Yes"| D{"Is User Authenticated?"}
  D --|"No"| E["Return Authentication Error"]
  D --|"Yes"| F{"Is User Authorized?"}
  F --|"No"| G["Return Authorization Error"]
  F --|"Yes"| H["Perform Action"]
  H --> I{"Did Action Succeed?"}
  I --|"No"| J["Return Operation Failure"]
  I --|"Yes"| K["Return Success"]

  subgraph "Error Types"
    C
    E
    G
    J
  end
```

```mermaid
graph LR
  A["User Request"] --> B{"Request Type?"}
  B --|"Read"| C["Return Paginated Data (<= 1s)"]
  B --|"Write"| D["Process Submission (<= 2s)"]
  B --|"File Upload"| E["Handle Upload with Progress"]
  B --|"File Download"| F["Serve Attachment (<= 3s)"]
  B --|"Search"| G["Return Search Results (<= 2s)"]

  subgraph "Performance Targets"
    C
    D
    E
    F
    G
  end
```


## Summary

All user and administrative functionalities have clearly defined authorization, error handling, and business rules. The system SHALL provide clear user feedback and maintain performance standards to ensure a responsive and reliable discussion board for economic and political topics.