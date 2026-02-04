# Economic/Political Discussion Board Requirements Specification

## User Account Management

WHEN a new user signs up, THE system SHALL require a valid email address and a password with minimum 8 characters.

WHEN a user attempts to sign up with an email already registered, THE system SHALL return HTTP 409 status code with error code: EMAIL_ALREADY_EXISTS.

WHEN a user logs in, THE system SHALL authenticate using email and password and return aJWT token with expiration of 7 days.

WHEN a user provides incorrect email or password during login, THE system SHALL return HTTP 401 status code with error code: INVALID_CREDENTIALS.

WHEN a logged-in user requests to change their password, THE system SHALL require the current password and a new password with minimum 8 characters.

WHEN a user attempts to change their password with an incorrect current password, THE system SHALL return HTTP 400 status code with error code: CURRENT_PASSWORD_INCORRECT.

WHEN a user requests to delete their account, THE system SHALL immediately delete all associated articles, comments, profile data, and ban records.

WHEN a user deletion request is processed, THE system SHALL send a confirmation email to the provided email address.

WHEN a user attempts to log in after deleting their account, THE system SHALL return HTTP 404 status code with error code: USER_NOT_FOUND.

## User Profile System

WHEN a user views their own profile, THE system SHALL display: display name, bio, number of articles written, number of comments written, and last activity timestamp.

WHEN a user views another user's profile, THE system SHALL display: display name, bio, number of articles written, number of comments written, and last activity timestamp.

WHEN a user edits their display name, THE system SHALL enforce a maximum length of 50 characters.

WHEN a user edits their bio, THE system SHALL enforce a maximum length of 500 characters.

WHEN a user attempts to set display name to empty or whitespace-only, THE system SHALL return HTTP 400 status code with error code: DISPLAY_NAME_EMPTY.

WHEN a user attempts to set bio to empty or whitespace-only, THE system SHALL return HTTP 400 status code with error code: BIO_EMPTY.

WHEN a user attempts to edit another user's profile, THE system SHALL return HTTP 403 status code with error code: PERMISSION_DENIED.

WHEN a user's profile is viewed, THE system SHALL include a "Member Since" date based on account creation timestamp.

## Section Management

WHEN an administrator requests to create a section, THE system SHALL require a unique name and description.

WHEN a section name is provided, THE system SHALL enforce a minimum length of 3 characters and maximum length of 100 characters.

WHEN a section description is provided, THE system SHALL enforce a minimum length of 10 characters and maximum length of 500 characters.

WHEN an administrator attempts to create a section with a name already in use, THE system SHALL return HTTP 409 status code with error code: SECTION_NAME_EXISTS.

WHEN an administrator requests to edit a section name, THE system SHALL validate the new name for uniqueness and length constraints.

WHEN an administrator requests to edit a section description, THE system SHALL validate the new description for length constraints.

WHEN an administrator attempts to delete a section, THE system SHALL NOT delete articles or comments within that section.

WHEN a section is deleted, THE system SHALL reassign all articles in that section to a default section ("General") if available.

WHEN a section with no articles remains, THE system SHALL allow deletion without reassignment.

WHEN a non-administrator attempts to create, edit, or delete a section, THE system SHALL return HTTP 403 status code with error code: PERMISSION_DENIED.

WHEN a user views the list of sections, THE system SHALL return a paginated list of sections sorted by creation date (newest first).

WHEN a user requests section details, THE system SHALL return: section name, description, article count, creation timestamp, and last updated timestamp.

## Article Management

WHEN a user creates an article, THE system SHALL require a title (minimum 5 characters, maximum 200 characters) and content (minimum 10 characters, maximum 10,000 characters).

WHEN a user creates an article, THE system SHALL require selection of a valid section ID.

WHEN a user creates an article with a title containing only whitespace, THE system SHALL return HTTP 400 status code with error code: TITLE_EMPTY.

WHEN a user creates an article with content containing only whitespace, THE system SHALL return HTTP 400 status code with error code: CONTENT_EMPTY.

WHEN a user creates an article with a non-existent section ID, THE system SHALL return HTTP 404 status code with error code: SECTION_NOT_FOUND.

WHEN a user uploads a file attachment, THE system SHALL validate file type: PDF, DOC, DOCX, TXT, CSV, ZIP (maximum 10MB per file).

WHEN a user uploads an image attachment, THE system SHALL validate image format: JPG, JPEG, PNG, GIF, WEBP (maximum 5MB per image).

WHEN a user uploads more than 10 attachments in one article, THE system SHALL return HTTP 400 status code with error code: ATTACHMENT_LIMIT_EXCEEDED.

WHEN a user adds tags to an article, THE system SHALL allow up to 15 tags per article.

WHEN a user adds a tag, THE system SHALL enforce a minimum length of 1 character and maximum length of 50 characters.

WHEN a user adds a tag containing only whitespace, THE system SHALL ignore it.

WHEN a user edits their own article, THE system SHALL allow modification of: title, content, attachments (add/remove), and tags (add/remove).

WHEN a user attempts to edit another user's article, THE system SHALL return HTTP 403 status code with error code: PERMISSION_DENIED.

WHEN a user deletes their own article, THE system SHALL delete all associated attachments, tags, and comments.

WHEN a user attempts to delete another user's article, THE system SHALL return HTTP 403 status code with error code: PERMISSION_DENIED.

WHEN an administrator deletes any article, THE system SHALL delete all associated attachments, tags, and comments.

WHEN a user views an article, THE system SHALL return: title, author display name and ID, content, list of attachment URLs, list of tags, creation timestamp, and last updated timestamp.

## Article List and Pagination

WHEN a user requests the article list for a section, THE system SHALL return a paginated list of articles.

WHEN a user requests article list, THE system SHALL return: article ID, title, author display name, author ID, comma-separated tags, comment count, and creation timestamp.

WHEN a user requests article list, THE system SHALL NOT include article content in responses.

WHEN a user sorts articles by "newest first", THE system SHALL order by creation timestamp descending.

WHEN a user sorts articles by "oldest first", THE system SHALL order by creation timestamp ascending.

WHEN a user requests article listings, THE system SHALL return 20 articles per page maximum.

WHEN a user requests page number beyond available pages, THE system SHALL return empty array but with total page count in metadata.

WHEN a section has no articles, THE system SHALL return empty array with metadata indicating zero total.

## Article Search Functionality

WHEN a user performs a search by title or content, THE system SHALL perform case-insensitive substring matching.

WHEN a search query is less than 3 characters, THE system SHALL return HTTP 400 status code with error code: SEARCH_QUERY_TOO_SHORT.

WHEN a search query exceeds 100 characters, THE system SHALL return HTTP 400 status code with error code: SEARCH_QUERY_TOO_LONG.

WHEN a search result is returned, THE system SHALL return the same fields as article list: article ID, title, author display name, author ID, tags, comment count, creation timestamp.

WHEN a user filters search results by tag, THE system SHALL match articles containing that exact tag.

WHEN a user searches with tag filter, THE system SHALL return results from all sections unless section is explicitly specified.

WHEN a user performs search with no results, THE system SHALL return empty array with total of zero.

WHEN a user searches with multiple tags, THE system SHALL return articles matching at least one of the provided tags.

## Comment System

WHEN a user writes a comment on an article, THE system SHALL require the comment content (minimum 1 character, maximum 1,000 characters).

WHEN a user attempts to post a comment with content only whitespace or empty, THE system SHALL return HTTP 400 status code with error code: COMMENT_EMPTY.

WHEN a user attempts to post a comment on a non-existent article, THE system SHALL return HTTP 404 status code with error code: ARTICLE_NOT_FOUND.

WHEN a user edits their own comment, THE system SHALL allow modification of content only.

WHEN a user attempts to edit another user's comment, THE system SHALL return HTTP 403 status code with error code: PERMISSION_DENIED.

WHEN a user deletes their own comment, THE system SHALL remove the comment from the database.

WHEN a user attempts to delete another user's comment, THE system SHALL return HTTP 403 status code with error code: PERMISSION_DENIED.

WHEN an administrator deletes any comment, THE system SHALL remove the comment from the database.

WHEN a comment is viewed on an article page, THE system SHALL display: comment ID, author display name, content, creation timestamp.

WHEN comments are sorted, THE system SHALL order by creation timestamp ascending (oldest first).

WHEN a comment count is requested for an article, THE system SHALL calculate and return the total number of active comments.

WHEN a user reloads an article page, THE system SHALL ensure comment count and list are real-time accurate.

## Administrator Request Workflow

WHEN a regular user submits a request to become an administrator, THE system SHALL require a reason text (minimum 20 characters, maximum 500 characters).

WHEN a user submits an admin request with reason under 20 characters, THE system SHALL return HTTP 400 status code with error code: ADMIN_REQUEST_REASON_TOO_SHORT.

WHEN a user submits an admin request with reason over 500 characters, THE system SHALL return HTTP 400 status code with error code: ADMIN_REQUEST_REASON_TOO_LONG.

WHEN a user submits an admin request while already an administrator, THE system SHALL return HTTP 409 status code with error code: ALREADY_ADMIN.

WHEN a super administrator requests the list of pending admin requests, THE system SHALL return: request ID, requester user ID, display name, reason, submission timestamp, and request status (pending).

WHEN a super administrator approves an admin request, THE system SHALL change the requester's role from "user" to "admin" and update request status to "approved".

WHEN a super administrator rejects an admin request, THE system SHALL update the request status to "rejected" and notify the requester.

WHEN an admin request is approved, THE system SHALL send a notification email to the requester.

WHEN an admin request is rejected, THE system SHALL send a notification email to the requester with reason for rejection if provided.

WHEN a user with pending admin request attempts to post an article, THE system SHALL allow normal user actions but not administrative actions.

## Administrator Privilege Hierarchy

WHEN a regular administrator attempts to promote another regular administrator to super administrator, THE system SHALL return HTTP 403 status code with error code: PERMISSION_DENIED.

WHEN a super administrator promotes a regular administrator to super administrator, THE system SHALL update role from "admin" to "super_admin".

WHEN a super administrator demotes another super administrator to regular administrator, THE system SHALL update role from "super_admin" to "admin".

WHEN a super administrator attempts to demote themselves, THE system SHALL return HTTP 403 status code with error code: CANNOT_DEMOTE_SELF.

WHEN a super administrator is demoted, THE system SHALL preserve all their previous administrative privileges except demotion and promotion rights.

WHEN a user's role is changed to "super_admin", THE system SHALL update their permissions immediately.

WHEN a user's role is changed to "admin" or "user", THE system SHALL strip permissions accordingly.

WHEN a non-administrator attempts to access any administrator-only endpoint, THE system SHALL return HTTP 403 status code with error code: PERMISSION_DENIED.

## Banning System

WHEN an administrator initiates a ban on a user, THE system SHALL immediately prevent the banned user from logging into the platform.

WHEN a user is banned, THE system SHALL NOT terminate their existing articles or comments.

WHEN an administrator attempts to ban a user who is already banned, THE system SHALL return an error message: "User is already banned."

WHEN a user is banned, THE system SHALL record the timestamp of the ban action.

WHILE a user is banned, THE system SHALL reject any login attempt with HTTP 401 status code and error code: BAN_ACTIVE.

WHEN a user attempts to access any protected resource while banned, THE system SHALL return HTTP 401 status code with error code: BAN_ACTIVE.

WHEN an administrator bans a user, THE system SHALL require a reason text to be provided.

THE system SHALL enforce a minimum ban reason length of 10 characters.

THE system SHALL enforce a maximum ban reason length of 500 characters.

WHEN a ban reason is provided, THE system SHALL store it in the ban record with the user ID, ban timestamp, administrator ID, and reason text.

WHEN a ban reason is not provided or is less than 10 characters, THE system SHALL return HTTP 400 status code with error code: BAN_REASON_TOO_SHORT.

WHEN a ban reason exceeds 500 characters, THE system SHALL return HTTP 400 status code with error code: BAN_REASON_TOO_LONG.

WHEN a ban reason contains only whitespace characters, THE system SHALL return HTTP 400 status code with error code: BAN_REASON_EMPTY.

WHILE a user is banned, THE system SHALL display their articles and comments as visible to all users.

WHILE a user is banned, THE system SHALL display their profile as accessible to all users.

WHILE a user is banned, THE system SHALL indicate "Banned" on their profile page alongside their display name.

WHEN an administrator views a banned user's profile, THE system SHALL display the ban reason and ban timestamp prominently.

WHEN a non-administrator user views a banned user's profile, THE system SHALL display only the "Banned" indicator without revealing the ban reason.

WHEN a banned user views their own profile, THE system SHALL display the ban reason and ban timestamp.

WHEN an administrator initiates an unban on a banned user, THE system SHALL remove the ban record from the database.

WHEN a user is unbanned, THE system SHALL restore their ability to log in to the platform.

WHEN an administrator attempts to unban a user who is not banned, THE system SHALL return an error message: "User is not currently banned."

WHEN an administrator unbans a user, THE system SHALL record the unban timestamp, administrator ID, and reason for unban.

WHEN a previously banned user attempts to log in after being unbanned, THE system SHALL authenticate them normally and issue new session tokens.

WHEN an administrator requests to view the list of banned users, THE system SHALL return a paginated list of all currently banned users.

THE system SHALL include the following fields in each banned user record: user ID, display name, ban timestamp, ban reason, and banning administrator ID.

THE system SHALL allow administrators to sort the banned users list by: ban timestamp (newest first), ban timestamp (oldest first), display name (A-Z), and display name (Z-A).

WHEN an administrator searches the banned users list, THE system SHALL return results for partial matches in display name or username.

THE system SHALL limit the banned users list to 100 results per page.

WHEN an administrator attempts to view more than 500 banned users, THE system SHALL return HTTP 400 status code with error code: BAN_LIST_EXCEEDS_LIMIT.

WHEN a non-administrator user attempts to view the banned users list, THE system SHALL return HTTP 403 status code with error code: PERMISSION_DENIED.

WHEN a banned user attempts to view the banned users list, THE system SHALL return HTTP 403 status code with error code: PERMISSION_DENIED.

## Mermaid Diagram: Banning System Workflow

```mermaid
graph LR
  A["Administrator Selects User to Ban"] --> B{"Is User Already Banned?"}
  B -->|Yes| C["Return Error: \"User is already banned.\""]
  B -->|No| D["Administrator Enters Ban Reason"]
  D --> E{"Reason Length Valid?"}
  E -->|<10 chars| F["Return Error: \"BAN_REASON_TOO_SHORT\""]
  E -->|>500 chars| G["Return Error: \"BAN_REASON_TOO_LONG\""]
  E -->|Valid| H["Record Ban: User ID, Reason, Admin ID, Timestamp"]
  H --> I["Deny Future Logins for User"]
  I --> J["User Profile Shows \"Banned\" Only"]
  J --> K["User Can Still View Articles/Comments"]
  K --> L["Administrator Views Banned Users List"]
  L --> M["Administrator Selects User to Unban"]
  M --> N["Remove Ban Record"]
  N --> O["Restore Login Access"]
  O --> P["Record Unban: Timestamp, Admin ID, Reason"]
  P --> Q["User Profile Shows Normal Status"]
```

## Authentication and Authorization System

WHEN a user logs in, THE system SHALL generate a JWT token containing: user ID, role, email, and expiration timestamp.

WHEN the JWT token expires, THE system SHALL require re-authentication.

WHEN a user has the role "user", THE system SHALL grant permission to: create articles, create comments, edit own articles/comments, delete own articles/comments, edit profile, upload attachments, search, view sections.

WHEN a user has the role "admin", THE system SHALL grant all user permissions plus: create/edit/delete sections, delete any article/comment, ban/unban users, view ban list, review admin requests.

WHEN a user has the role "super_admin", THE system SHALL grant all admin permissions plus: promote/demote administrators, view system reports, configure global settings.

WHEN an endpoint requires "admin" role, THE system SHALL validate JWT role field and deny access if role is not "admin" or "super_admin".

WHEN an endpoint requires "super_admin" role, THE system SHALL validate JWT role field and deny access if role is not "super_admin".

WHEN a token is presented without a valid signature, THE system SHALL return HTTP 401 status code with error code: INVALID_TOKEN.

WHEN a token is presented with an expired timestamp, THE system SHALL return HTTP 401 status code with error code: TOKEN_EXPIRED.

WHEN a token is presented with missing claim fields, THE system SHALL return HTTP 401 status code with error code: TOKEN_INVALID.

WHEN a user changes their email, THE system SHALL invalidate all active sessions.

WHEN a user deletes their account, THE system SHALL immediately invalidate all active sessions.

WHEN a user is banned, THE system SHALL immediately invalidate all active sessions and deny new sessions.

## File Attachment System

WHEN a file is uploaded, THE system SHALL store files in secure object storage (e.g., AWS S3 or equivalent).

WHEN a file is uploaded, THE system SHALL generate a unique, unguessable, time-limited URL for access.

WHEN a file is attached to an article, THE system SHALL link the file to the article ID in a database table.

WHEN a file is downloaded, THE system SHALL validate that: the requesting user has read access to the article AND the file is still active.

WHEN an article is deleted, THE system SHALL mark all attached files as inactive and delete them from storage after 30 days.

WHEN an image is uploaded, THE system SHALL generate thumbnail versions: 200x200, 400x400, and 800x800.

WHEN an image thumbnail is requested, THE system SHALL return the appropriate resolution based on client context.

WHEN a file link is accessed, THE system SHALL log the access event including timestamp, user ID, file ID, and IP address.

## Tagging System

WHEN a tag is added to an article, THE system SHALL normalize it to lowercase.

WHEN a tag is stored, THE system SHALL trim whitespace from beginning and end.

WHEN a tag is searched, THE system SHALL perform exact match on processed tag (lowercase, trimmed).

WHEN a tag is shown in interface, THE system SHALL display it in original casing provided by user.

WHEN an article is edited and tags are updated, THE system SHALL compare new tag set with old and add/remove as necessary.

WHEN a tag is removed from all articles, THE system SHALL keep the tag name in database for 90 days to maintain search history consistency.

WHEN a user performs tag filtering, THE system SHALL allow up to 5 tags simultaneously.

WHEN a tag is clicked in search, THE system SHALL include that tag in the URL query parameters.

## Performance and Operational Requirements

WHEN a user loads an article list, THE system SHALL respond in under 500 milliseconds under normal load.

WHEN a user performs a search, THE system SHALL respond in under 750 milliseconds for queries with up to 10,000 matching results.

WHEN a user loads an article with 50 comments, THE system SHALL load within 400 milliseconds.

WHEN a section has 10,000 articles, THE system SHALL still paginate efficiently without timeout.

WHEN 100 concurrent users request article lists simultaneously, THE system SHALL maintain 95% success rate with response under 1 second.

WHEN a user uploads a file larger than 10MB, THE system SHALL reject before full upload completes with HTTP 413 status code.

WHEN a user submits an admin request, THE system SHALL process notification to super administrators within 2 seconds.

WHEN a ban or unban is performed, THE system SHALL invalidate affected user sessions within 500 milliseconds.

WHEN a comment count updates, THE system SHALL update in real-time without requiring full page refresh.

WHEN a user deletes their own article, THE system SHALL update comment counts on parent article within 1 second.

WHEN a user changes their display name, THE system SHALL update all related displays (articles, comments, profiles) within 2 seconds.

WHEN a user is banned or unbanned, THE system SHALL update their status across all displays within 1 second.

WHEN a section is deleted, THE system SHALL reassign articles within 5 seconds.

WHEN the system performs background cleanup of deactivated files, THE system SHALL operate during low-traffic hours.

## Error Codes Specification

All error codes SHALL be consistent, machine-readable, and localized to English.

ERROR CODE FORMAT: ALL_CAPS_UNDERSCORE

ERROR CODE TABLE:

- EMAIL_ALREADY_EXISTS
- INVALID_CREDENTIALS
- DISPLAY_NAME_EMPTY
- BIO_EMPTY
- SECTION_NAME_EXISTS
- SECTION_NOT_FOUND
- TITLE_EMPTY
- CONTENT_EMPTY
- ATTACHMENT_LIMIT_EXCEEDED
- COMMENT_EMPTY
- ARTICLE_NOT_FOUND
- ADMIN_REQUEST_REASON_TOO_SHORT
- ADMIN_REQUEST_REASON_TOO_LONG
- ALREADY_ADMIN
- BAN_REASON_TOO_SHORT
- BAN_REASON_TOO_LONG
- BAN_REASON_EMPTY
- BAN_LIST_EXCEEDS_LIMIT
- PERMISSION_DENIED
- BAN_ACTIVE
- USER_NOT_FOUND
- SEARCH_QUERY_TOO_SHORT
- SEARCH_QUERY_TOO_LONG
- INVALID_TOKEN
- TOKEN_EXPIRED
- TOKEN_INVALID
- TOO_MANY_TAGS
- UNAUTHORIZED_ACCESS

All returned error responses SHALL include: error code, human-readable message, and HTTP status code.

## Business Model and Authentication

The system operates as a free-to-use public discussion forum.

There is no revenue model defined at this time.

All users are anonymous unless they voluntarily provide personal details.

User data is retained indefinitely unless deleted by the user or banned by an administrator.

User identity is bound to email address and cannot be transferred.

No third-party authentication (OAuth, social login) is supported.

All authentication is handled via JWT token with server-side session validation.

No password reset via email is implemented - users must remember their password.

## User Actor Permissions Matrix

| Feature | User | Admin | Super Admin |
|---|---|---|---|
| Register/Sign Up | ✅ | ✅ | ✅ |
| Login | ✅ | ✅ | ✅ |
| Change Password | ✅ | ✅ | ✅ |
| Delete Account | ✅ | ✅ | ✅ |
| View User Profiles | ✅ | ✅ | ✅ |
| Edit Own Profile | ✅ | ✅ | ✅ |
| Create Sections | ❌ | ✅ | ✅ |
| Edit Sections | ❌ | ✅ | ✅ |
| Delete Sections | ❌ | ✅ | ✅ |
| Create Articles | ✅ | ✅ | ✅ |
| Edit Own Articles | ✅ | ✅ | ✅ |
| Delete Own Articles | ✅ | ✅ | ✅ |
| Delete Any Article | ❌ | ✅ | ✅ |
| Write Comments | ✅ | ✅ | ✅ |
| Edit Own Comments | ✅ | ✅ | ✅ |
| Delete Own Comments | ✅ | ✅ | ✅ |
| Delete Any Comment | ❌ | ✅ | ✅ |
| Attach Files/Images | ✅ | ✅ | ✅ |
| Search Articles | ✅ | ✅ | ✅ |
| Filter by Tags | ✅ | ✅ | ✅ |
| View Section List | ✅ | ✅ | ✅ |
| Banned User List | ❌ | ✅ | ✅ |
| Ban Users | ❌ | ✅ | ✅ |
| Unban Users | ❌ | ✅ | ✅ |
| Submit Admin Request | ✅ | ✅ | ✅ |
| Approve/Reject Admin Requests | ❌ | ❌ | ✅ |
| Promote to Super Admin | ❌ | ❌ | ✅ |
| Demote Super Admin | ❌ | ❌ | ✅ |
| View System Reports | ❌ | ❌ | ✅ |
| Configure Global Settings | ❌ | ❌ | ✅ |

## Data Retention Policy

- Article data: retained until explicitly deleted by user or removed by administrator
- Comment data: retained until article is deleted or comment is removed
- Attachment files: retained for 90 days after article deletion, then purged
- Ban records: permanently retained for audit purposes
- Admin request records: permanently retained for audit purposes
- Authentication tokens: invalidated upon logout, password change, or expiration
- User sessions: terminated after logout or token expiration

## Search Indexing Strategy

- Search index SHALL be built on article title and content fields
- Tag filter SHALL use exact-match lookup on normalized tag table
- Article search SHALL support full-text search with stemming
- Search results SHALL be cached for 5 minutes for identical queries
- Search shall support partial word matching (prefix search)
- Search shall exclude banned user articles from results
- Search shall be accessible only to authenticated users

## Compliance and Privacy

- No personally identifiable information (PII) is required outside of email.
- All email addresses are encrypted at rest.
- No personal data is shared with third parties.
- No user tracking or analytics are performed.
- All data is stored in compliance with GDPR and CCPA.
- Users have the right to delete their account and all associated data.
- Banned user data is preserved solely for moderation purposes.
- Administrator actions are logged permanently for audit trails.