# Business Rules and Constraints

## Overview & Purpose

This document defines all business rules, validation constraints, and operational limitations that govern the discussion board system. These rules ensure consistent behavior, prevent abuse, maintain data quality, and protect system resources. All backend developers implementing the discussion board must enforce these rules within their code.

The rules are organized by category and use EARS (Easy Approach to Requirements Syntax) format for clarity and testability. Each rule specifies what the system SHALL, SHALL NOT, WHEN, WHILE, or WHERE conditions occur.

---

## Content Creation Rules

### Article Creation & Publishing

THE system SHALL require a member to provide a title and body text before an article can be created.

THE system SHALL assign a unique identifier to each article upon creation.

THE system SHALL record the creation timestamp and creator identity for every article.

WHEN a member creates an article, THE system SHALL set the article status to "pending_approval" and make it invisible to guests and other members until a moderator approves it.

WHEN a moderator approves an article, THE system SHALL change the article status to "published" and make it visible to all users.

THE system SHALL allow moderators to reject articles, in which case the article status becomes "rejected" and the article remains invisible to non-creator users.

THE system SHALL allow the article creator to view their own articles regardless of approval status.

THE system SHALL prevent guests from creating new articles.

THE system SHALL allow only members to create new articles.

### Comment Creation & Posting

THE system SHALL require a member to provide comment text before a comment can be created.

THE system SHALL assign a unique identifier to each comment upon creation.

THE system SHALL record the creation timestamp and creator identity for every comment.

WHEN a member posts a comment, THE system SHALL immediately display the comment to all users without requiring moderator approval.

THE system SHALL prevent guests from posting comments on articles.

THE system SHALL allow only members to post comments.

THE system SHALL allow members to post comments only on articles with "published" status.

### Content Ownership & Access

THE system SHALL associate each article with its creator member account.

THE system SHALL associate each comment with its creator member account.

THE system SHALL allow the content creator to edit or delete their own articles and comments.

THE system SHALL prevent members from editing or deleting articles or comments created by other members.

THE system SHALL allow moderators to delete any article or comment regardless of creator.

---

## User Behavior Rules

### Article Editing & Deletion

THE system SHALL allow a member to edit their own article at any time after creation.

THE system SHALL track the edit timestamp and mark the article as "edited" when modifications occur.

THE system SHALL allow a member to delete their own article at any time.

WHEN a member deletes an article, THE system SHALL permanently remove the article and all associated comments from the system.

THE system SHALL prevent members from editing published articles after 24 hours from publication (editing window: only within first 24 hours after approval).

WHEN a member attempts to edit a published article after 24 hours, THE system SHALL deny the edit request and display error message: "Published articles cannot be edited after 24 hours. You may delete this article and create a new one if needed."

### Comment Editing & Deletion

THE system SHALL allow a member to edit their own comment at any time after creation.

THE system SHALL track the edit timestamp and mark the comment as "edited" when modifications occur.

THE system SHALL allow a member to delete their own comment at any time.

WHEN a member deletes a comment, THE system SHALL remove the comment from the system while preserving the associated article.

THE system SHALL allow comment editing for an unlimited duration (no time limit on edit window).

### User Registration & Account Requirements

THE system SHALL require new users to provide a valid email address during registration.

THE system SHALL require new users to create a username during registration.

THE system SHALL require new users to set a password during registration.

THE system SHALL send a verification email to the provided email address during registration.

THE system SHALL prevent users from posting articles or comments until their email address is verified.

THE system SHALL allow unverified users to browse articles and comments as guest-level access until verification occurs.

---

## Text Length Constraints

### Article Content Limits

THE system SHALL enforce a minimum of 10 characters for article titles.

THE system SHALL enforce a maximum of 255 characters for article titles.

THE system SHALL enforce a minimum of 20 characters for article body text.

THE system SHALL enforce a maximum of 50,000 characters for article body text.

IF an article title is fewer than 10 characters, THEN THE system SHALL reject the submission and display error message: "Article title must be at least 10 characters long."

IF an article title exceeds 255 characters, THEN THE system SHALL reject the submission and display error message: "Article title must not exceed 255 characters. Current length: X characters."

IF an article body is fewer than 20 characters, THEN THE system SHALL reject the submission and display error message: "Article content must be at least 20 characters long."

IF an article body exceeds 50,000 characters, THEN THE system SHALL reject the submission and display error message: "Article content must not exceed 50,000 characters. Current length: X characters."

### Comment Content Limits

THE system SHALL enforce a minimum of 5 characters for comment text.

THE system SHALL enforce a maximum of 5,000 characters for comment text.

IF a comment is empty or contains only whitespace, THEN THE system SHALL reject the submission and display error message: "Comment cannot be empty."

IF a comment is fewer than 5 characters, THEN THE system SHALL reject the submission and display error message: "Comment must be at least 5 characters long."

IF a comment exceeds 5,000 characters, THEN THE system SHALL reject the submission and display error message: "Comment exceeds maximum length of 5,000 characters. Current length: X characters."

### Additional Text Field Constraints

THE system SHALL enforce a minimum of 3 characters for usernames.

THE system SHALL enforce a maximum of 30 characters for usernames.

THE system SHALL enforce a minimum of 1 character for display names.

THE system SHALL enforce a maximum of 50 characters for display names.

THE system SHALL enforce a maximum of 500 characters for user bio/about section.

THE system SHALL enforce a maximum of 254 characters for email addresses.

IF a username is fewer than 3 characters, THEN THE system SHALL reject registration and display error message: "Username must be at least 3 characters long."

IF a username exceeds 30 characters, THEN THE system SHALL reject registration and display error message: "Username must not exceed 30 characters."

IF a display name is empty, THEN THE system SHALL reject the update and display error message: "Display name cannot be empty."

IF a display name exceeds 50 characters, THEN THE system SHALL reject the update and display error message: "Display name must not exceed 50 characters."

IF a bio exceeds 500 characters, THEN THE system SHALL reject the update and display error message: "Bio must not exceed 500 characters."

---

## Attachment & File Limits

### Attachment Quantity Limits

THE system SHALL allow up to 5 file attachments per article.

THE system SHALL allow up to 3 file attachments per comment.

IF a member attempts to upload more than 5 attachments to an article, THEN THE system SHALL reject the additional attachment and display error message: "Articles can contain maximum 5 attachments. Remove one to add another."

IF a member attempts to upload more than 3 attachments to a comment, THEN THE system SHALL reject the additional attachment and display error message: "Comments can contain maximum 3 attachments. Remove one to add another."

### Image File Type Restrictions

THE system SHALL accept image files in the following formats only: JPG, JPEG, PNG, GIF, WebP.

THE system SHALL reject all other image formats.

THE system SHALL validate image file type using magic number verification (file header inspection), not solely by file extension.

IF a user attempts to upload an unsupported image format, THEN THE system SHALL reject the upload and display error message: "Image format not supported. Allowed formats: JPG, JPEG, PNG, GIF, WebP."

IF a file's extension does not match its actual file type (e.g., .jpg extension on a .png file), THEN THE system SHALL reject the upload and display error message: "File extension does not match actual file format. Please verify your file and try again."

### Document File Type Restrictions

THE system SHALL accept document files in the following formats only: PDF, DOC, DOCX, TXT, XLS, XLSX, CSV, ODT, ODS, ODP.

THE system SHALL reject all other document formats.

THE system SHALL reject executable files, script files, and system files without exception.

THE system SHALL reject files with double extensions (e.g., .pdf.exe) or unknown extensions.

THE system SHALL validate document file type using magic number verification, not solely by file extension.

IF a user attempts to upload an unsupported document format, THEN THE system SHALL reject the upload and display error message: "File type not supported. Allowed document formats: PDF, DOCX, TXT, XLS, XLSX, CSV, ODT, ODS, ODP."

IF a user attempts to upload an executable file (.exe, .bat, .sh, .dll, .bin, .cab), THEN THE system SHALL reject the upload and display error message: "Executable files cannot be uploaded for security reasons."

IF a file has an unrecognized extension, THEN THE system SHALL reject the upload and display error message: "File type unknown. Please upload files with recognized extensions."

### Image File Size Limits

THE system SHALL accept a maximum file size of 10 MB per individual image file.

THE system SHALL accept a maximum combined size of 50 MB for all image attachments on a single article.

THE system SHALL accept a maximum combined size of 30 MB for all image attachments on a single comment.

IF an individual image exceeds 10 MB, THEN THE system SHALL reject the upload and display error message: "Image file exceeds maximum size of 10 MB. Your file is X MB. Please select a smaller image."

IF adding an image would exceed 50 MB total for the article, THEN THE system SHALL reject the upload and display error message: "Adding this image would exceed the 50 MB total limit for article attachments. You have X MB remaining."

IF adding an image would exceed 30 MB total for the comment, THEN THE system SHALL reject the upload and display error message: "Adding this image would exceed the 30 MB total limit for comment attachments. You have X MB remaining."

### Document File Size Limits

THE system SHALL accept a maximum file size of 25 MB per individual document file.

THE system SHALL accept a maximum combined size of 100 MB for all document attachments on a single article.

THE system SHALL accept a maximum combined size of 50 MB for all document attachments on a single comment.

IF an individual document exceeds 25 MB, THEN THE system SHALL reject the upload and display error message: "Document file exceeds maximum size of 25 MB. Your file is X MB. Please select a smaller file."

IF adding a document would exceed 100 MB total for the article, THEN THE system SHALL reject the upload and display error message: "Adding this file would exceed the 100 MB total limit for article attachments. You have X MB remaining."

IF adding a document would exceed 50 MB total for the comment, THEN THE system SHALL reject the upload and display error message: "Adding this file would exceed the 50 MB total limit for comment attachments. You have X MB remaining."

### Attachment Storage Rules

THE system SHALL store all attachments securely and associate each with its parent article or comment.

THE system SHALL allow members to view attachments that belong to their own content or public content.

THE system SHALL allow all users to view attachments on published articles and public comments.

WHEN an article or comment is deleted, THE system SHALL also delete all associated attachments within 24 hours.

THE system SHALL prevent directory traversal attacks on attachment storage.

THE system SHALL use non-predictable filenames for stored attachments to prevent unauthorized access.

---

## Rate Limiting & Spam Prevention

### Article Creation Rate Limits

THE system SHALL allow a maximum of 5 articles per member per calendar day.

THE system SHALL reset the daily article creation counter at midnight in UTC timezone.

IF a member exceeds 5 articles in a single day, THEN THE system SHALL reject the request and display error message: "You have reached the maximum of 5 articles per day. You can create your next article tomorrow after midnight UTC."

THE system SHALL enforce this limit per member account (not per IP address).

### Comment Posting Rate Limits

THE system SHALL allow a maximum of 30 comments per member per calendar day.

THE system SHALL allow a maximum of 3 comments per member per single article per 5-minute window.

THE system SHALL reset the daily comment creation counter at midnight in UTC timezone.

THE system SHALL reset the 5-minute comment window based on most recent comment posted to that article.

IF a member exceeds 30 comments in a single day, THEN THE system SHALL reject the request and display error message: "You have reached the maximum of 30 comments per day. You can post more comments tomorrow after midnight UTC."

IF a member exceeds 3 comments on the same article within 5 minutes, THEN THE system SHALL reject the request and display error message: "You are posting too quickly on this article. Please wait at least 5 minutes before posting another comment here."

THE system SHALL enforce these limits per member account.

### File Upload Rate Limits

THE system SHALL allow a maximum of 10 file uploads per member per hour.

IF a member exceeds 10 uploads in a single hour, THEN THE system SHALL reject the request and display error message: "You have uploaded too many files recently. Please wait before uploading more files."

### Spam Content Filtering

THE system SHALL scan all articles and comments for prohibited content including known spam keywords.

IF prohibited content is detected in an article, THEN THE system SHALL flag the article for moderator review instead of auto-rejecting (allowing human judgment).

IF prohibited content is detected in a comment, THEN THE system SHALL flag the comment for moderator review instead of auto-deleting.

### Duplicate Content Prevention

THE system SHALL check for duplicate article submissions within the same day.

WHILE a member has submitted an identical article within the last 60 seconds, THE system SHALL reject submission of the same content and display error message: "This article appears to be a duplicate of your recent submission."

WHILE a member has posted an identical comment to the same article within the last 60 seconds, THE system SHALL reject the submission and display error message: "This comment appears to be a duplicate of your recent post on this article."

THE system SHALL allow resubmission of identical content after the duplicate prevention window expires.

### Rate Limit Bypass for Moderators

WHILE a user is in moderator status, THE system SHALL NOT enforce article creation or comment posting rate limits.

MODERATORS SHALL be able to create articles and post comments without rate limiting restrictions.

---

## Data Validation Rules

### Email Address Validation

THE system SHALL require email addresses to follow valid RFC 5322 format standards.

THE system SHALL reject email addresses that do not contain an "@" symbol.

THE system SHALL reject email addresses that exceed 254 characters in length.

THE system SHALL reject email addresses with invalid domain extensions (no TLD).

THE system SHALL enforce one email address per user account.

THE system SHALL prevent duplicate email registrations across the system.

THE system SHALL convert email addresses to lowercase for storage and comparison (email addresses are case-insensitive for comparison purposes).

IF an email address is invalid format, THEN THE system SHALL reject and display error message: "Please enter a valid email address (example: user@example.com)."

IF an email address is already registered, THEN THE system SHALL reject and display error message: "This email address is already in use. Please log in or use a different email address."

IF an email address exceeds 254 characters, THEN THE system SHALL reject and display error message: "Email address is too long. Maximum 254 characters allowed."

### Username Validation

THE system SHALL enforce usernames to be between 3 and 30 characters in length.

THE system SHALL only allow alphanumeric characters, underscores, and hyphens in usernames.

THE system SHALL NOT allow spaces or special characters in usernames except underscore (_) and hyphen (-).

THE system SHALL enforce unique usernames across the system.

THE system SHALL prevent duplicate username registrations.

THE system SHALL apply case-insensitive uniqueness checking for usernames (usernames "John" and "john" are considered duplicates).

THE system SHALL NOT allow reserved system usernames: admin, root, system, moderator, support, help, test.

IF a username is fewer than 3 characters, THEN THE system SHALL reject and display error message: "Username must be at least 3 characters long."

IF a username exceeds 30 characters, THEN THE system SHALL reject and display error message: "Username must not exceed 30 characters."

IF a username contains invalid characters, THEN THE system SHALL reject and display error message: "Username can only contain letters, numbers, underscores, and hyphens. No spaces or special characters allowed."

IF a username is already in use, THEN THE system SHALL reject and display error message: "Username is already taken. Please choose a different username."

IF a username is reserved by the system, THEN THE system SHALL reject and display error message: "This username is reserved. Please choose a different username."

### Password Requirements

THE system SHALL require passwords to be a minimum of 8 characters in length.

THE system SHALL require passwords to contain at least one uppercase letter (A-Z).

THE system SHALL require passwords to contain at least one lowercase letter (a-z).

THE system SHALL require passwords to contain at least one numeric digit (0-9).

THE system SHALL require passwords to contain at least one special character from the set: !@#$%^&*

THE system SHALL NOT allow passwords to exceed 128 characters in length.

THE system SHALL NOT allow passwords that match the user's username.

THE system SHALL NOT allow passwords that match the user's email address.

THE system SHALL NOT allow commonly used passwords (e.g., "Password123", "Qwerty123", "Admin123").

THE system SHALL check against a list of at least 10,000 commonly used passwords and reject any matches.

IF a password does not meet length requirements (fewer than 8 characters), THEN THE system SHALL reject and display error message: "Password must be at least 8 characters long."

IF a password lacks an uppercase letter, THEN THE system SHALL reject and display error message: "Password must contain at least one uppercase letter (A-Z)."

IF a password lacks a lowercase letter, THEN THE system SHALL reject and display error message: "Password must contain at least one lowercase letter (a-z)."

IF a password lacks a numeric digit, THEN THE system SHALL reject and display error message: "Password must contain at least one number (0-9)."

IF a password lacks a special character, THEN THE system SHALL reject and display error message: "Password must contain at least one special character (!@#$%^&*)."

IF a password exceeds 128 characters, THEN THE system SHALL reject and display error message: "Password must not exceed 128 characters."

IF a password matches the username or email, THEN THE system SHALL reject and display error message: "Password cannot be the same as your username or email address."

IF a password is in the common passwords list, THEN THE system SHALL reject and display error message: "This password is too common. Please choose a stronger password."

### Display Name Validation

THE system SHALL accept display names between 1 and 50 characters in length.

THE system SHALL allow letters, numbers, spaces, and common punctuation (. , ! ? - ') in display names.

THE system SHALL NOT allow HTML or script tags in display names.

THE system SHALL trim leading and trailing whitespace from display names.

THE system SHALL NOT allow display names consisting only of whitespace.

IF a display name is empty or only whitespace, THEN THE system SHALL reject and display error message: "Display name cannot be empty."

IF a display name exceeds 50 characters, THEN THE system SHALL reject and display error message: "Display name must not exceed 50 characters."

IF a display name contains HTML or script tags, THEN THE system SHALL remove them or reject and display error message: "Display name contains invalid characters."

### Bio/About Field Validation

THE system SHALL accept bio text up to 500 characters in length.

THE system SHALL allow letters, numbers, spaces, and common punctuation in bio text.

THE system SHALL NOT allow HTML or script tags in bio text.

THE system SHALL accept empty bio (optional field).

IF a bio exceeds 500 characters, THEN THE system SHALL reject and display error message: "Bio must not exceed 500 characters. Current length: X characters."

IF a bio contains HTML or script tags, THEN THE system SHALL remove them before storage.

---

## Duplicate Prevention

### Article Duplicate Rules

THE system SHALL allow multiple articles with the same title, as discussions may address the same topic from different perspectives.

THE system SHALL not prevent duplicate article content within a reasonable timeframe.

THE system SHALL allow members to resubmit rejected articles with modifications.

### Comment Duplicate Rules

THE system SHALL prevent a member from posting identical comment text to the same article within 60 seconds.

IF a member attempts to post a duplicate comment within 60 seconds, THEN THE system SHALL reject the submission and display error message: "This comment appears to be a duplicate of your recent post on this article. Please wait at least 60 seconds before posting similar content."

THE system SHALL compare comments within the same article only (same comment text on different articles is allowed).

THE system SHALL use exact text matching for duplicate detection (whitespace differences ignored).

---

## System Performance Constraints

### Database & Query Performance

THE system SHALL retrieve and display a single article with its comments within 2 seconds under normal load conditions.

THE system SHALL retrieve and display a list of articles (paginated to 20 items per page) within 1 second under normal load conditions.

THE system SHALL execute search queries and return results within 3 seconds for typical queries with fewer than 1,000 matching results.

THE system SHALL execute category filter queries and return results within 2 seconds.

THE system SHALL complete user authentication (login) within 1 second under normal load.

### Concurrent User Handling

THE system SHALL support a minimum of 100 concurrent active users simultaneously.

THE system SHALL maintain acceptable response times with 100 concurrent users (within the response time limits specified above).

THE system SHALL support up to 500 concurrent users with graceful performance degradation (response times may extend to 4-5 seconds, but system remains responsive).

THE system SHALL not reject user requests due to connection limits until exceeding 500 concurrent users.

### Pagination Rules

THE system SHALL display articles in pages of 20 items maximum per page.

THE system SHALL display comments on an article in pages of 50 items maximum per page.

THE system SHALL display articles in reverse chronological order (newest first) by default unless otherwise filtered.

THE system SHALL allow users to navigate between pages of results using next/previous buttons or page numbers.

THE system SHALL maintain pagination state when applying filters or search queries.

### Data Retention & Cleanup

THE system SHALL retain all articles, comments, and attachments indefinitely unless deleted by users or moderators.

THE system SHALL maintain audit logs of all moderation actions for a minimum of 90 days.

THE system SHALL maintain failed login attempt logs for a minimum of 30 days.

THE system SHALL maintain file upload logs for a minimum of 30 days.

THE system SHALL allow moderators to view the complete history of any user's posts and actions.

THE system SHALL permanently delete abandoned accounts (no login for 1 year) after 12 months of inactivity, with user notification 30 days before deletion.

---

## Access Control & Permission Rules

### Permission Matrix Summary

THE following permission matrix defines which actions each user type can perform:

| Action | Guest | Member | Moderator |
|--------|-------|--------|-----------|
| **Articles** | | | |
| View published articles | ✓ | ✓ | ✓ |
| Create articles | ✗ | ✓ | ✓ |
| Edit own articles | ✗ | ✓ | ✓ |
| Delete own articles | ✗ | ✓ | ✓ |
| Edit others' articles | ✗ | ✗ | ✗ |
| Delete others' articles | ✗ | ✗ | ✓ |
| Approve articles | ✗ | ✗ | ✓ |
| Reject articles | ✗ | ✗ | ✓ |
| View pending articles | ✗ | ✗ | ✓ |
| **Comments** | | | |
| View published comments | ✓ | ✓ | ✓ |
| Post comments | ✗ | ✓ | ✓ |
| Edit own comments | ✗ | ✓ | ✓ |
| Delete own comments | ✗ | ✓ | ✓ |
| Edit others' comments | ✗ | ✗ | ✗ |
| Delete others' comments | ✗ | ✗ | ✓ |
| **Attachments** | | | |
| Upload attachments | ✗ | ✓ | ✓ |
| View attachments | ✓ | ✓ | ✓ |
| Delete own attachments | ✗ | ✓ | ✓ |
| Delete others' attachments | ✗ | ✗ | ✓ |
| **Moderation** | | | |
| Access moderation dashboard | ✗ | ✗ | ✓ |
| View audit logs | ✗ | ✗ | ✓ |
| Suspend/ban users | ✗ | ✗ | ✓ |
| **Accounts** | | | |
| View own profile | ✗ | ✓ | ✓ |
| Edit own profile | ✗ | ✓ | ✓ |
| View own email/account settings | ✗ | ✓ | ✓ |
| Change own password | ✗ | ✓ | ✓ |
| View other users' public profile | ✓ | ✓ | ✓ |
| Delete own account | ✗ | ✓ | ✓ |
| Suspend own account | ✗ | ✗ | ✗ |

### Guest User Restrictions

WHILE a user is in guest status, THE system SHALL allow them to view published articles only.

WHILE a user is in guest status, THE system SHALL allow them to view comments on published articles only.

WHILE a user is in guest status, THE system SHALL prevent them from creating articles.

WHILE a user is in guest status, THE system SHALL prevent them from posting comments.

WHILE a user is in guest status, THE system SHALL prevent them from uploading attachments.

WHILE a user is in guest status, THE system SHALL prevent them from accessing user profile management features.

WHILE a user is in guest status, THE system SHALL allow them to view publicly available profile information of members (display name, join date, article count, comment count).

### Member User Permissions

WHILE a user is in member status, THE system SHALL allow them to create new articles (subject to rate limiting).

WHILE a user is in member status, THE system SHALL allow them to post comments on published articles (subject to rate limiting).

WHILE a user is in member status, THE system SHALL allow them to upload attachments to their articles and comments (subject to type and size limits).

WHILE a user is in member status, THE system SHALL allow them to edit and delete their own articles and comments.

WHILE a user is in member status, THE system SHALL allow them to manage their profile and account settings.

WHILE a user is in member status, THE system SHALL prevent them from viewing pending articles that other users created.

WHILE a user is in member status, THE system SHALL prevent them from editing or deleting other users' content.

WHILE a user is in member status, THE system SHALL prevent them from moderating content or managing users.

WHILE a user is in member status and has not verified their email, THE system SHALL prevent them from creating articles or posting comments, allowing only read-only access.

### Moderator Permissions

WHILE a user is in moderator status, THE system SHALL allow them to view all articles regardless of approval status.

WHILE a user is in moderator status, THE system SHALL allow them to approve articles in pending status.

WHILE a user is in moderator status, THE system SHALL allow them to reject articles in pending status with required reason.

WHILE a user is in moderator status, THE system SHALL allow them to delete any article.

WHILE a user is in moderator status, THE system SHALL allow them to delete any comment.

WHILE a user is in moderator status, THE system SHALL allow them to view and manage all user accounts.

WHILE a user is in moderator status, THE system SHALL allow them to suspend or disable user accounts.

WHILE a user is in moderator status, THE system SHALL allow them to view moderation logs and audit trails.

WHILE a user is in moderator status, THE system SHALL be exempt from rate limiting on article creation and comment posting.

WHILE a user is in moderator status, THE system SHALL allow them to create articles without moderator approval (articles are published immediately).

---

## Session & Security Rules

### Session Management

THE system SHALL establish a user session upon successful login.

THE system SHALL assign a unique session identifier to each authenticated user.

THE system SHALL expire user sessions after 30 days of inactivity.

THE system SHALL reset the inactivity timer on each authenticated request from the user.

IF a user session expires, THEN THE system SHALL require the user to log in again to continue using the system.

THE system SHALL allow users to manually log out and terminate their session at any time.

WHEN a user logs out, THE system SHALL invalidate all tokens and sessions for that user.

THE system SHALL allow multiple concurrent sessions per user account (e.g., login on different devices simultaneously).

WHEN a user logs out, THE system SHALL terminate only the specific session (not all sessions for that user).

WHEN a member deletes their account, THE system SHALL terminate all active sessions for that member.

WHEN a member's email is changed, THE system SHALL require email verification before creating new sessions with the new email.

WHEN a member changes their password, THE system SHALL automatically invalidate all existing sessions and require re-authentication on all devices.

### Password Security

THE system SHALL hash all passwords using industry-standard hashing algorithms (e.g., bcrypt with salt rounds of 12 or greater).

THE system SHALL never store passwords in plain text.

THE system SHALL never display passwords to users, even to administrators or moderators.

THE system SHALL require users to verify their identity before allowing password changes.

THE system SHALL allow users to reset forgotten passwords via email verification.

THE system SHALL require users to create a new password when resetting a forgotten password.

THE system SHALL enforce a minimum 1-hour interval between password resets for the same account (prevent password reset spam).

THE system SHALL not allow reuse of the last 3 passwords when changing passwords.

WHEN a user resets their password via email link, THE system SHALL invalidate all existing sessions for that user.

### Account Lockout Protection

WHEN a user enters an incorrect password 5 times consecutively within a 15-minute window, THE system SHALL lock the account temporarily for 15 minutes.

WHEN an account is locked, THE system SHALL display error message: "Your account is temporarily locked due to multiple failed login attempts. Please try again after 15 minutes or reset your password."

WHEN the 15-minute lockout period expires, THE system SHALL automatically unlock the account.

THE system SHALL record all failed login attempts for security audit purposes.

THE system SHALL retain failed login attempt logs for a minimum of 30 days.

---

## Moderation & Approval Workflow Rules

### Article Approval Workflow

WHEN a member creates an article, THE system SHALL place it in the "pending_approval" queue automatically.

THE system SHALL notify moderators when new articles are submitted for review (mechanism TBD: email, dashboard notification, etc.).

THE system SHALL require a moderator to explicitly approve articles before they become visible to other members and guests.

IF a moderator approves an article, THE system SHALL change status to "published" and send a notification to the article creator.

IF a moderator approves an article, THE system SHALL record the approval action with timestamp and moderator name in the audit log.

IF a moderator rejects an article, THE system SHALL change status to "rejected" and notify the creator with a reason if provided.

IF a moderator rejects an article, THE system SHALL require the moderator to provide a rejection reason (minimum 10 characters, maximum 500 characters).

IF a moderator rejects an article, THE system SHALL record the rejection action with reason in the audit log.

THE system SHALL allow rejected articles to be edited and resubmitted for approval by the creator.

WHEN an article is resubmitted after rejection, THE system SHALL reset the article status to "pending_approval" and re-queue for moderator review.

WHEN an article is resubmitted, THE system SHALL notify moderators that a resubmitted article requires review.

### Content Deletion Rules

WHEN a moderator deletes an article, THE system SHALL record the deletion action in the moderation audit log.

WHEN a moderator deletes an article, THE moderator SHALL provide a deletion reason (minimum 10 characters, maximum 500 characters).

WHEN a moderator deletes an article, THE system SHALL also delete all associated comments.

WHEN a moderator deletes a comment, THE system SHALL record the deletion action in the moderation audit log.

WHEN a moderator deletes a comment, THE moderator SHALL provide a deletion reason (optional, minimum 0 characters, maximum 500 characters).

THE system SHALL permanently remove deleted content from the system within 24 hours.

THE system SHALL not make deleted content recoverable by end users (moderators may retain access to deleted content for audit purposes).

THE system SHALL display a deleted comment as "[Comment removed by moderator]" in the discussion thread (for context preservation).

THE system SHALL display a deleted article as "[Article removed by moderator]" when accessed by direct link.

---

## Error Handling & Edge Cases

### Validation Error Handling

IF a user submits invalid data in any form, THEN THE system SHALL reject the submission and display specific error messages indicating what is invalid.

IF an attachment upload fails, THEN THE system SHALL preserve user-entered content and allow the user to retry the upload.

IF a network error occurs during submission, THEN THE system SHALL attempt to preserve the user's input for resubmission where technically feasible.

### Conflict Prevention

IF two users attempt to edit the same article simultaneously, THEN THE system SHALL preserve the first submission and notify the second user that the content has been modified.

IF a user attempts to access deleted content, THEN THE system SHALL display error message: "This content is no longer available."

### Server and System Errors

IF a server error occurs during request processing, THEN THE system SHALL NOT display raw database errors or stack traces to users.

IF a server error occurs during request processing, THEN THE system SHALL display user-friendly error message: "An error occurred. Please try again later or contact support if the problem persists."

IF a server error occurs during request processing, THEN THE system SHALL log detailed error information (including stack traces and context) for developer investigation.

### File Upload Errors

IF a file upload is interrupted, THEN THE system SHALL not store a partial file.

IF a file upload is interrupted, THEN THE system SHALL clean up temporary files within 1 hour.

IF a file upload is interrupted, THEN THE system SHALL allow the user to retry the upload without re-entering article text.

IF storage space is exhausted, THEN THE system SHALL reject the upload and display error message: "Server storage is full. Please try again later."

IF storage space is exhausted, THEN THE system SHALL alert administrators to address the storage issue.

IF malware is detected during file scanning, THEN THE system SHALL reject the file and display error message: "File appears to contain malware and was rejected for security. Please verify your file and try uploading a different version."

IF malware is detected during file scanning, THEN THE system SHALL log the incident for moderator investigation.

### Rate Limit Error Messages

IF a user reaches the daily article creation limit, THEN THE system SHALL display error message: "You have reached the maximum of 5 articles per day. You can create your next article tomorrow after midnight UTC."

IF a user reaches the daily comment posting limit, THEN THE system SHALL display error message: "You have reached the maximum of 30 comments per day. You can post more comments tomorrow after midnight UTC."

IF a user exceeds the per-article comment limit within 5 minutes, THEN THE system SHALL display error message: "You are posting too quickly on this article. Please wait at least 5 minutes before posting another comment here."

### Authentication Error Scenarios

WHEN a user enters incorrect login credentials, THE system SHALL display generic error message: "Invalid email/username or password" without revealing which field was incorrect.

WHEN a user attempts to login with an unverified email address, THE system SHALL display error message: "Your email address has not been verified. Please check your email for the verification link or request a new one."

WHEN a user enters an invalid email format during registration, THE system SHALL display error message: "Please enter a valid email address (example: user@example.com)."

WHEN a user exceeds login attempt limits, THE system SHALL display error message: "Too many failed login attempts. Your account is locked for 15 minutes for security. You can reset your password to unlock immediately."

---

## Summary of Key Constraints

### Text Length Constraints (by field)
- **Article title**: 10-255 characters
- **Article body**: 20-50,000 characters
- **Comments**: 5-5,000 characters
- **Usernames**: 3-30 characters
- **Display names**: 1-50 characters
- **User bio**: 0-500 characters
- **Email**: max 254 characters
- **Rejection reason**: 10-500 characters
- **Deletion reason**: 10-500 characters (optional for comments)

### Attachment Constraints (by type)
- **Allowed image formats**: JPG, JPEG, PNG, GIF, WebP
- **Allowed document formats**: PDF, DOC, DOCX, TXT, XLS, XLSX, CSV, ODT, ODS, ODP
- **Max per-image size**: 10 MB
- **Max per-document size**: 25 MB
- **Max images per article**: 5 total
- **Max documents per article**: 5 total (any combination)
- **Max attachments per article**: 5 files
- **Max total attachment size per article**: 50 MB for images + 100 MB for documents (separate limits)
- **Max attachments per comment**: 3 files
- **Max total attachment size per comment**: 30 MB for images + 50 MB for documents (separate limits)

### Rate Limiting Constraints
- **Article creation**: 5 articles per member per calendar day
- **Comment posting**: 30 comments per member per calendar day
- **Comment posting per article**: 3 comments per member per article per 5-minute window
- **File uploads**: 10 uploads per member per hour
- **Password reset**: minimum 1 hour between resets per account
- **Failed logins**: maximum 5 failures within 15 minutes triggers 15-minute lockout

### Response Time Targets (normal load)
- **Article detail view**: 2 seconds
- **Article list/feed**: 1 second (per page)
- **Search queries**: 3 seconds
- **Category filters**: 2 seconds
- **User login**: 1 second

### Concurrent User Support
- **Minimum**: 100 concurrent users with full performance
- **Recommended**: 500 concurrent users with graceful degradation
- **Maximum**: 500 concurrent users before rejection

### Session & Security
- **Session timeout**: 30 days of inactivity
- **JWT access token expiration**: 15 minutes
- **JWT refresh token expiration**: 7 days
- **Email verification link expiration**: 24 hours
- **Password reset link expiration**: 1 hour
- **Account lockout duration**: 15 minutes after 5 failed logins
- **Password history**: cannot reuse last 3 passwords
- **Minimum interval between password resets**: 1 hour

### Pagination
- **Articles per page**: 20 items
- **Comments per page**: 50 items
- **Default sort order**: Reverse chronological (newest first)

### Audit & Logging
- **Moderation action logs**: 90 days minimum retention
- **Failed login attempt logs**: 30 days minimum retention
- **File upload logs**: 30 days minimum retention
- **Deleted content recovery window**: None (permanent deletion)
- **User account inactivity threshold**: 1 year before auto-deletion

These business rules and constraints form the foundation of how the discussion board system operates. All development work must enforce these rules consistently throughout the application.

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, encryption algorithms, specific libraries, infrastructure design, etc.) are at the discretion of the development team.*