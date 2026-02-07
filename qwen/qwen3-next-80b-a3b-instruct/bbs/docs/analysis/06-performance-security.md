# Economic/Political Discussion Board - Requirements Specification

## Service Overview

The Economic/Political Discussion Board is a democratic digital forum designed to foster informed, civil discourse on economic systems and political ideologies. This service exists to counter the fragmentation and polarization of modern public discourse by providing a structured, moderated environment where users can engage with complex societal issues through evidence-based discussion, rather than emotional reaction. The platform aims to elevate public understanding of economic principles and political systems by enabling users to share insights, challenge assumptions, and learn from diverse perspectives.

The service delivers five core value propositions that differentiate it from other platforms: structured discourse through clearly defined sections, accountable dialogue through verifiable identity, quality over virality by prioritizing substantive content, expert access through an administrator promotion system, and safe exploration of opposing viewpoints without fear of permanent ban.

The platform serves four primary user segments: citizens (general users) who seek to understand economic systems and political ideologies, knowledgeable participants with domain expertise, administrators who maintain platform integrity, and super administrators who govern platform policy and hierarchy.

The service operates on a freemium business model focused on sustainability rather than monetization, with core features available free to all users. Revenue will come from voluntary donations, educational partnerships, and institutional grants rather than advertising, data harvesting, or engagement manipulation. Success will be measured by quality indicators including meaningful engagement rate, user retention, administrator quality, content depth, user satisfaction, moderation efficiency, and diversity of viewpoints rather than total users or click-through rates.

## User Actors & Authentication

### Citizen Actor Specification

WHEN a new user visits the platform, THE system SHALL allow them to register an account by providing a valid email address and password.

WHEN a user submits registration credentials, THE system SHALL validate the email address format and check for uniqueness.

WHEN a user attempts to sign up with an already-used email, THE system SHALL return an error message.

WHEN a user submits registration credentials, THE system SHALL create a new citizen account with default permissions.

WHEN a user attempts to log in, THE system SHALL verify the email and password combination.

WHEN login credentials are invalid, THE system SHALL return HTTP 401 Unauthorized with error code AUTH_INVALID_CREDENTIALS.

WHEN login credentials are valid, THE system SHALL generate a JWT access token with expiration of 20 minutes and a refresh token with expiration of 14 days.

THE JWT SHALL include the following claims: userId, role (citizen/administrator/superAdministrator), and permissions array.

THE access token SHALL be stored in the client's localStorage.

THE refresh token SHALL be stored in an httpOnly, secure cookie.

WHEN an access token expires, THE system SHALL validate the refresh token and issue a new access token.

WHEN a refresh token is invalid or expired, THE system SHALL require the user to log in again.

WHEN a user logs out, THE system SHALL invalidate the current refresh token.

WHEN a user changes their password, THE system SHALL invalidate all active sessions.

WHEN a user deletes their account, THE system SHALL immediately revoke all associated tokens.

WHEN a user is banned, THE system SHALL immediately invalidate all active sessions for that user.

WHEN a citizen attempts to create an article, THE system SHALL require a title (minimum 5 characters, maximum 200) and content (minimum 10 characters).

WHEN a citizen attaches files or images to an article, THE system SHALL allow multiple attachments with file type restrictions.

WHEN a citizen adds tags to an article, THE system SHALL allow multiple free-text tags with a maximum of 10 tags per article.

WHEN a citizen edits their own article, THE system SHALL allow modification of title, content, attachments, and tags.

WHEN a citizen deletes their own article, THE system SHALL mark the article as deleted but preserve it for audit purposes.

WHEN a citizen writes a comment on an article, THE system SHALL allow submission of comment content (minimum 2 characters, maximum 1000).

WHEN a citizen edits their own comment, THE system SHALL allow modification of content within a 30-minute edit window.

WHEN a citizen deletes their own comment, THE system SHALL mark the comment as deleted and update the article's comment count.

WHEN a citizen searches for articles, THE system SHALL allow searching by title or content with tag filtering and pagination.

WHEN a citizen views the article list in a section, THE system SHALL display paginated results with title, author, tags, comment count, and post time.

WHEN a citizen views a specific article, THE system SHALL display title, author, content, attachments, tags, and post time.

WHEN a citizen downloads an attached file or image, THE system SHALL provide direct access to the file.

WHEN a citizen submits a request to become an administrator, THE system SHALL create a pending request with the user ID and reason text.

WHEN a citizen attempts to create a section, THE system SHALL reject the request with appropriate error message.

WHEN a citizen attempts to delete an article or comment written by another citizen, THE system SHALL return HTTP 403 Forbidden with permission denied error.

WHEN a citizen attempts to ban or unban a user, THE system SHALL reject the action with appropriate error message.

WHEN a citizen attempts to promote or demote administrators, THE system SHALL reject the action with appropriate error message.

WHEN a citizen attempts to view pending administrator requests, THE system SHALL reject the action with appropriate error message.

### Administrator Actor Specification

WHEN an administrator attempts to create a section, THE system SHALL allow creation of a new section with name and description.

WHEN an administrator attempts to edit a section, THE system SHALL allow modification of name and description.

WHEN an administrator attempts to delete a section, THE system SHALL allow deletion with associated articles reassigned to a default section.

WHEN an administrator attempts to delete any article on the platform, THE system SHALL allow deletion, preserve content for audit, and update visibility.

WHEN an administrator attempts to delete any comment on the platform, THE system SHALL allow deletion, preserve content for audit, and update comment counts.

WHEN an administrator attempts to ban any user, THE system SHALL allow banning by providing a reason text (minimum 10 characters).

WHEN an administrator attempts to unban any user, THE system SHALL allow unbanning with proper logging.

WHEN an administrator attempts to view the list of banned users, THE system SHALL allow access to the complete list with ban reasons.

WHEN an administrator attempts to view the reason for each ban, THE system SHALL provide the stored ban reason text.

WHEN an administrator attempts to promote another user to super administrator, THE system SHALL reject the action with appropriate error message.

WHEN an administrator attempts to demote a super administrator, THE system SHALL reject the action with appropriate error message.

WHEN an administrator attempts to demote themselves, THE system SHALL reject the action with appropriate error message.

WHEN an administrator attempts to approve or reject administrator requests, THE system SHALL reject the action with appropriate error message.

WHEN an administrator attempts to view pending administrator requests, THE system SHALL reject the action with appropriate error message.

### Super Administrator Actor Specification

WHEN a super administrator attempts to promote a regular administrator to super administrator, THE system SHALL allow the promotion with logging and notification.

WHEN a super administrator attempts to demote a super administrator to regular administrator, THE system SHALL allow the demotion with logging and notification except when attempting to demote themselves.

WHEN a super administrator attempts to approve a administrator request, THE system SHALL allow approval with role change and notification.

WHEN a super administrator attempts to reject an administrator request, THE system SHALL allow rejection with notification.

WHEN a super administrator attempts to view all pending administrator requests, THE system SHALL provide complete access to the request queue.

WHEN a super administrator attempts to demote themselves, THE system SHALL reject the action with "Super administrators cannot demote themselves." error message.

WHEN a super administrator attempts to access any administrative function, THE system SHALL allow unlimited access with comprehensive logging.

### Authentication Flow

WHEN a user attempts to sign up, THE system SHALL validate the email address format and check for uniqueness.

WHEN a user attempts to sign up with an already-used email, THE system SHALL return an error message.

WHEN a user submits registration credentials, THE system SHALL create a new citizen account with default permissions.

WHEN a user attempts to log in, THE system SHALL verify the email and password combination.

WHEN login credentials are invalid, THE system SHALL return HTTP 401 Unauthorized with error code AUTH_INVALID_CREDENTIALS.

WHEN login credentials are valid, THE system SHALL generate a JWT access token with expiration of 20 minutes and a refresh token with expiration of 14 days.

THE JWT SHALL include the following claims: userId, role (citizen/administrator/superAdministrator), and permissions array.

THE access token SHALL be stored in the client's localStorage.

THE refresh token SHALL be stored in an httpOnly, secure cookie.

WHEN an access token expires, THE system SHALL validate the refresh token and issue a new access token.

WHEN a refresh token is invalid or expired, THE system SHALL require the user to log in again.

WHEN a user logs out, THE system SHALL invalidate the current refresh token.

WHEN a user changes their password, THE system SHALL invalidate all active sessions.

WHEN a user deletes their account, THE system SHALL immediately revoke all associated tokens.

WHEN a user is banned, THE system SHALL immediately invalidate all active sessions for that user.

### Session Management

THE system SHALL maintain user sessions via JWT token authentication.

THE system SHALL enforce a 20-minute expiration for access tokens.

THE system SHALL enforce a 14-day expiration for refresh tokens.

THE system SHALL store refresh tokens in an httpOnly, secure, SameSite=Strict cookie.

THE system SHALL store access tokens as a string in client-side localStorage.

THE system SHALL verify token signatures on every authenticated request.

THE system SHALL validate user role and permissions from the JWT payload on every request.

THE system SHALL invalidate all tokens for a user when their password is changed.

THE system SHALL invalidate all tokens for a user when their account is deleted.

THE system SHALL invalidate all tokens for a user when they are banned.

THE system SHALL require re-authentication after 14 days of inactivity.

### Permission Matrix

| Action | Citizen | Administrator | Super Administrator |
|--------|---------|---------------|---------------------|
| Register account | ✅ | ✅ | ✅ |
| Login | ✅ | ✅ | ✅ |
| Logout | ✅ | ✅ | ✅ |
| Change password | ✅ | ✅ | ✅ |
| Delete account | ✅ | ✅ | ✅ |
| Edit profile | ✅ | ✅ | ✅ |
| View public profile | ✅ | ✅ | ✅ |
| Create article | ✅ | ✅ | ✅ |
| Edit own article | ✅ | ✅ | ✅ |
| Delete own article | ✅ | ✅ | ✅ |
| Attach files/images | ✅ | ✅ | ✅ |
| Add tags to article | ✅ | ✅ | ✅ |
| Write comment | ✅ | ✅ | ✅ |
| Edit own comment | ✅ | ✅ | ✅ |
| Delete own comment | ✅ | ✅ | ✅ |
| Search articles | ✅ | ✅ | ✅ |
| Filter articles by tags | ✅ | ✅ | ✅ |
| Sort article list | ✅ | ✅ | ✅ |
| View article content | ✅ | ✅ | ✅ |
| Download attachments | ✅ | ✅ | ✅ |
| Create section | ❌ | ✅ | ✅ |
| Edit section | ❌ | ✅ | ✅ |
| Delete section | ❌ | ✅ | ✅ |
| Delete any article | ❌ | ✅ | ✅ |
| Delete any comment | ❌ | ✅ | ✅ |
| Ban user | ❌ | ✅ | ✅ |
| Unban user | ❌ | ✅ | ✅ |
| View banned users list | ❌ | ✅ | ✅ |
| View ban reason | ❌ | ✅ | ✅ |
| Submit admin request | ✅ | ✅ | ✅ |
| Approve admin request | ❌ | ❌ | ✅ |
| Reject admin request | ❌ | ❌ | ✅ |
| View pending requests | ❌ | ❌ | ✅ |
| Promote to super admin | ❌ | ❌ | ✅ |
| Demote super admin | ❌ | ❌ | ✅ |
| Demote self | ❌ | ❌ | ❌ |

## Section Management

### Section Creation

WHEN an administrator attempts to create a section, THE system SHALL require a name (minimum 2 characters, maximum 50) and description (maximum 500).

WHEN a section name is missing, THE system SHALL respond with error code "SECTION_NAME_REQUIRED" and display message: "Section name is required."

WHEN a section name is less than 2 characters, THE system SHALL respond with error code "SECTION_NAME_TOO_SHORT" and display message: "Section name must be at least 2 characters long."

WHEN a section name exceeds 50 characters, THE system SHALL respond with error code "SECTION_NAME_TOO_LONG" and display message: "Section name cannot exceed 50 characters."

WHEN a section name already exists, THE system SHALL respond with error code "SECTION_EXISTS" and display message: "A section with this name already exists."

WHEN a section description exceeds 500 characters, THE system SHALL respond with error code "SECTION_DESCRIPTION_TOO_LONG" and display message: "Section description cannot exceed 500 characters."

### Section Editing

WHEN an administrator updates a section, THE system SHALL allow edits to section name (minimum 2, maximum 50) and description (maximum 500).

WHEN a section name is changed, THE system SHALL check for name conflicts with existing sections.

WHEN a section name conflict is detected, THE system SHALL respond with error code "SECTION_EXISTS" and display message: "A section with this name already exists."

WHEN a section is edited, THE system SHALL log the administrator who made the change and timestamp.

### Section Deletion

WHEN an administrator deletes a section, THE system SHALL associate all articles in the section with "General" section (default).

WHEN a section is deleted, THE system SHALL mark the section as "deleted" with deletion timestamp and prevent new articles from being created in the section.

WHEN a deleted section is requested, THE system SHALL return error code "SECTION_NOT_FOUND" with message: "This section has been deleted."

## Article Management

### Article Creation

WHEN a user creates an article, THE system SHALL require title (minimum 5 characters, maximum 200) and content (minimum 10 characters).

WHEN a user submits an article with missing title, THE system SHALL respond with error code "ARTICLE_TITLE_REQUIRED" and display message: "Article title is required."

WHEN a user submits an article with title less than 5 characters, THE system SHALL respond with error code "ARTICLE_TITLE_TOO_SHORT" and display message: "Title must be at least 5 characters long."

WHEN a user submits an article with title exceeding 200 characters, THE system SHALL respond with error code "ARTICLE_TITLE_TOO_LONG" and display message: "Title cannot exceed 200 characters."

WHEN a user submits an article with missing content, THE system SHALL respond with error code "ARTICLE_CONTENT_REQUIRED" and display message: "Article content is required."

WHEN a user submits an article with content less than 10 characters, THE system SHALL respond with error code "ARTICLE_CONTENT_TOO_SHORT" and display message: "Content must be at least 10 characters long."

WHEN a user submits an article with invalid section, THE system SHALL respond with error code "INVALID_SECTION" and display message: "Invalid or inactive section selected."

### Article Editing

WHEN an author edits their own article, THE system SHALL allow edits to title (maximum 200 characters), content (minimum 10 characters), attachments, and tags.

WHEN an article title exceeds 200 characters after edit, THE system SHALL respond with error code "ARTICLE_TITLE_TOO_LONG" and display message: "Title cannot exceed 200 characters."

WHEN an article content exceeds 50,000 characters after edit, THE system SHALL respond with error code "ARTICLE_CONTENT_TOO_LONG" and display message: "Content cannot exceed 50,000 characters."

WHEN other users attempt to edit an article, THE system SHALL respond with error code "PERMISSION_DENIED" and display message: "You can only edit your own articles."

### Article Deletion

WHEN an author deletes their own article, THE system SHALL mark the article as "deleted" with deletion timestamp and remove it from section article lists.

WHEN an administrator deletes an article, THE system SHALL mark the article as "deleted by admin" with deletion timestamp and admin ID.

WHEN a deleted article is requested, THE system SHALL return error code "ARTICLE_NOT_FOUND" with message: "This article has been deleted."

## Article Listing & Sorting

### Section Article Listing

WHEN a user views articles in a section, THE system SHALL return article ID, title, author display name, list of tags (maximum 5), comment count, creation timestamp, and status.

THE list SHALL be paginated with 20 articles per page.

WHEN page is requested, THE system SHALL validate page number (1-100).

WHEN page number exceeds 100, THE system SHALL return last page (100).

WHEN page number is less than 1, THE system SHALL return page 1.

### Sorting

WHEN a user requests article listing with sort criteria, THE system SHALL support "Newest first" (creation timestamp: descending) and "Oldest first" (creation timestamp: ascending).

WHEN sort parameter is provided as "newest", THE system SHALL order by creation timestamp DESC.

WHEN sort parameter is provided as "oldest", THE system SHALL order by creation timestamp ASC.

WHEN sort parameter is not specified, THE system SHALL default to "newest".

## Article Viewing

### Article Display

WHEN a user views an article, THE system SHALL show title (maximum 200 characters), author display name, content, list of attached files with download URLs, list of attached images with view URLs, list of tags, creation timestamp, last edited timestamp, view count, and comment count.

WHEN an article is deleted, THE system SHALL return error code "ARTICLE_NOT_FOUND" with message: "This article has been deleted."

WHEN a user has been banned, THE system SHALL show content but replace