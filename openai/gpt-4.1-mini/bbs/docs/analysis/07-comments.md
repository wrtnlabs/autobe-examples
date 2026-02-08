# Economic/Political Discussion Board Requirements Specification

## 1. User Account

### 1.1 Registration
WHEN a new user submits a registration request with a valid email and password, THE system SHALL create a new user account with those credentials.

### 1.2 Login
WHEN a user submits login credentials (email and password), THE system SHALL authenticate the user and initiate a user session.

### 1.3 Password Change
WHEN a logged-in user requests to change their password, THE system SHALL verify their current password and update it with the new password.

### 1.4 Account Deletion
WHEN a logged-in user requests account deletion, THE system SHALL delete the user account along with all articles and comments authored by the user.

### 1.5 Authentication and Authorization
- THE system SHALL only allow users with valid credentials who are not banned to log in.
- THE system SHALL implement secure password storage with appropriate hashing.
- THE system SHALL enforce session management with expiration policies.

## 2. User Profile

### 2.1 Profile Attributes
- EACH user profile SHALL include a display name and bio text.

### 2.2 Profile Editing
- WHEN a logged-in user requests to update their display name or bio, THE system SHALL save the changes.

### 2.3 Profile Viewing
- USERS SHALL be able to view other users' profiles.
- A profile page SHALL display the user's display name, bio, list of authored articles, and list of authored comments.

## 3. Sections

### 3.1 Section Attributes
- EACH section SHALL have a unique name and a description.

### 3.2 Section Management
- ONLY administrators SHALL be allowed to create, edit, or delete sections.

### 3.3 Section Browsing
- USERS SHALL be able to list all available sections.
- USERS SHALL be able to browse articles within a specific section.

## 4. Articles

### 4.1 Article Creation
WHEN a logged-in user submits a new article with a title, content, and selected section, THE system SHALL create the article.
- The title and content are required fields.
- The section must be an existing section.

### 4.2 Article Attachments
- USERS SHALL be able to attach multiple files and images to an article.
- THE system SHALL store attachments linked to the article.

### 4.3 Article Tags
- USERS SHALL be able to add multiple free-text tags to an article.

### 4.4 Article Editing
- USERS SHALL be able to edit their own articles, including title, content, attachments, and tags.

### 4.5 Article Deletion
- USERS SHALL be able to delete their own articles.
- Administrators SHALL be able to delete any article.

## 5. Article List

### 5.1 List Display
- USERS SHALL be able to view the list of articles within a section.
- Each article entry SHALL display the title, author, tags, comment count, and time posted.
- The full content SHALL not be displayed in the list.

### 5.2 Pagination
- THE article lists SHALL be paginated with a configurable number of articles per page.

### 5.3 Sorting
- USERS SHALL be able to sort the article list by newest first or oldest first.

## 6. Viewing an Article

- WHEN a user views an article, THE system SHALL display the full content including title, author, content, attachments, tags, and time posted.
- USERS SHALL be able to download attached files and images.

## 7. Searching Articles

- USERS SHALL be able to search articles by title or content.
- THE search results SHALL be paginated.
- USERS SHALL be able to filter search results by tags.

## 8. Comments

### 8.1 Comment Creation
WHEN a registered user submits a comment on an article, THE system SHALL validate the comment content for non-emptiness and maximum allowed length.
- THE comment SHALL be stored with the associated article, author, content, and timestamp.
- COMMENTS SHALL be single-level only; nested replies are not allowed.
- INAPPROPRIATE content SHALL be rejected.
- GUESTS SHALL not be allowed to submit comments.

### 8.2 Comment Display
- THE system SHALL display all comments of an article sorted by oldest first.
- EACH comment SHALL show the author display name, content, and time posted.
- COMMENT display SHALL support pagination.

### 8.3 Comment Editing and Deletion
- USERS SHALL be able to edit their own comments within 24 hours of creation.
- USERS SHALL be able to delete their own comments.
- ADMINISTRATORS MAY delete any comment regardless of ownership.

## 9. Administrator System

### 9.1 Administrator Roles
- THERE ARE two administrator grades: regular administrator and super administrator.
- SUPER administrators can promote and demote other administrators except themselves.
- REGULAR administrators cannot promote or demote others.

### 9.2 Administrator Requests
- ANY user may submit a request to become an administrator including a reason.
- SUPER administrators SHALL review and either approve or reject requests.
- WHEN approved, THE user becomes a regular administrator.

### 9.3 Administrator Capabilities
- ADMINISTRATORS can perform all user actions.
- ADMINISTRATORS can create, edit, and delete sections.
- ADMINISTRATORS can delete any article and comment.
- ADMINISTRATORS can ban and unban users.
- ADMINISTRATORS can view the list of banned users and ban reasons.

## 10. Banning

### 10.1 Ban Policy
- BANNED users SHALL be prevented from logging in.
- EXISTING articles and comments from banned users SHALL remain visible.
- A ban record SHALL include the reason for banning.

### 10.2 Ban Management
- ADMINISTRATORS can ban and unban users.
- BAN reasons SHALL be visible to administrators when viewing banned users.

## 11. Business Rules and Error Handling

- WHEN a user submits invalid data during registration, login, article creation, comment posting, or other actions, THE system SHALL respond with descriptive error messages.
- THE system SHALL handle errors gracefully, providing meaningful feedback within 2 seconds.
- SYSTEM performance SHALL support concurrent usage without data loss or race conditions.

---

This specification fully supports the production-ready implementation of the Economic/Political Discussion Board backend system.