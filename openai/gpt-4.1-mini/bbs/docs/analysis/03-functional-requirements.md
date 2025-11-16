# Functional Requirements for econPolDiscussionBoard

## 1. Introduction
This document details the core functional requirements for the econPolDiscussionBoard, a simple but effective online discussion board focused on economic and political topics. It enables users to post articles that may include image and file attachments, and allows interaction through comments. The system supports distinct user roles with defined permissions ensuring appropriate access control.

## 2. Business Model

### Why This Service Exists
The econPolDiscussionBoard aims to fill a market gap for a minimalistic yet functional discussion platform that encourages focused economic and political debates. It provides a lightweight environment for knowledge sharing and discussion without the complexity of large-scale social networks, appealing to users seeking straightforward discussion forums.

### Core Value Proposition
- Publish and read topical articles
- Enable attachment of files and images to enrich content
- Facilitate threaded discussion via comments
- Simple role structure for ease of use and administration

### Success Metrics
- Number of active members regularly posting and commenting
- Engagement rates measured by comments per article
- Attachment upload success rates without errors
- System uptime and response time meeting performance goals

## 3. User Actors and Permissions

| Actor  | Description                                                  | Permissions                                                         |
|--------|--------------------------------------------------------------|--------------------------------------------------------------------|
| Guest  | Unauthenticated users who can browse articles and attachments| Can view articles and attachments; cannot post or comment           |
| Member | Registered users who can create content                      | Can create/edit/delete own articles; attach files/images; comment   |
| Admin  | Administrators with system oversight                         | Can manage users, moderate content (articles & comments), delete content, and maintain system integrity |

## 4. Functional Requirements

### 4.1 Article Management

- WHEN a member submits a new article, THE system SHALL store the article with associated author information and timestamp.
- THE article SHALL support plain text content.
- WHERE a member edits an article, THE system SHALL update the article only if it belongs to the editing member.
- IF a member attempts to edit an article they do not own, THEN the system SHALL deny the update with an authorization error.
- WHERE a member deletes an article, THE system SHALL remove the article only if owned by the member.
- IF a member attempts to delete an article not owned by them, THEN the system SHALL deny the deletion.
- THE system SHALL store article metadata including creation and last modification timestamp.

### 4.2 Attachment Handling

- WHEN a member uploads attachments (images or files) linked to an article, THE system SHALL associate these attachments with the article.
- THE system SHALL allow multiple attachments per article.
- THE system SHALL support common image formats: JPEG, PNG, GIF.
- THE system SHALL support document and file formats including PDF, DOCX, XLSX, and TXT.
- IF a file format is unsupported, THEN the system SHALL reject the upload with an informative error.
- THE maximum size per attachment SHALL be 10 MB.
- THE system SHALL validate attachment size and file type before accepting uploads.
- WHERE attachments are deleted (via article deletion or explicit removal), THE system SHALL delete the files permanently.
- THE system SHALL store attachment metadata including original filename, file size, MIME type, and upload timestamp.
- THE system SHALL make image attachments displayable in article views; other file attachments shall be downloadable.

### 4.3 Commenting System

- WHEN a member posts a comment on an article, THE system SHALL associate the comment with the article and commenting member.
- THE system SHALL store plain text comments with timestamps.
- THE system SHALL allow members to edit or delete their own comments.
- IF a member attempts to modify or delete a comment that is not theirs, THEN the system SHALL deny the action.
- THE system SHALL allow comments to be listed in chronological order under each article.
- THE system SHALL limit comment length to 1000 characters.

### 4.4 User Account Management

- THE system SHALL allow users to register with email and password.
- THE system SHALL allow users to log in to obtain authenticated access.
- THE system SHALL track user session securely.
- WHERE a user logs out, THE system SHALL invalidate their session.
- THE system SHALL support administrative functions for managing users, including banning or role reassignment.

## 5. Business Rules and Constraints

- Articles and comments SHALL be limited to reasonable length to maintain database efficiency.
- Attachments outside allowed formats or exceeding size limits SHALL trigger upload rejections.
- Only authenticated members SHALL be allowed to create or modify content.
- Guests SHALL be limited to read-only access.
- Admins SHALL have override permissions for content moderation.

## 6. Error Handling

- IF attachment uploads fail due to unsupported format or size, THEN the system SHALL respond with an explicit error indicating the cause.
- IF unauthorized content actions occur, THEN the system SHALL respond with HTTP 403 errors and messages explaining permissions.
- THE system SHALL provide clear error messages for authentication failures.

## 7. Performance Requirements

- THE system SHALL respond to article fetch requests within 2 seconds under typical load.
- THE system SHALL process attachment uploads and responses within 5 seconds.
- THE system SHALL paginate article and comment listings in pages of 20 items to optimize loading.

## 8. Workflows and User Scenarios

### Article Posting
- Member logs in.
- Member creates an article with optional attachments.
- Member submits article.
- System validates contents and attachments, stores all data.
- Article appears in public feed instantly.

### Commenting
- Member selects an article.
- Member writes a comment.
- Member submits comment.
- System stores comment linked to article and member.
- Comment displays immediately under article.

### Attachment Management
- Member uploads attachment during article creation or editing.
- System validates attachment type and size.
- System stores attachment metadata and files.

## 9. Glossary

| Term       | Description                                   |
|------------|-----------------------------------------------|
| Article    | A user-created post consisting of text and optional attachments.
| Attachment | Image or file uploaded and linked to an article.
| Comment    | Textual response or opinion related to an article.
| Member     | Authenticated user with posting privileges.
| Guest      | Unauthenticated user with read-only access.
| Admin      | User with elevated permissions for moderation and management.

---

This document provides only business functional requirements. Technical implementation details such as API design, database schema, and infrastructure decisions are left to the development team’s discretion.