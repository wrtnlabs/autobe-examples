# Economic/Political Discussion Board Requirements

## User Account

WHEN a guest submits registration form with valid email and password (minimum 12 characters with uppercase, lowercase, number, and special character), THE system SHALL create a new user account with default role 'user'.

WHEN the email address is already in use, THE system SHALL return HTTP 409 Conflict with error code REG_EMAIL_EXISTS and message 'Email address is already registered.'

WHEN the password does not meet complexity requirements, THE system SHALL return HTTP 400 Bad Request with error code REG_PASSWORD_WEAK and message 'Password must include 12+ characters with uppercase, lowercase, number, and special character.'

WHEN registration is successful, THE system SHALL send confirmation email with verification link.

WHEN a user submits email and password for login, THE system SHALL validate credentials against database.

WHEN credentials are valid, THE system SHALL generate JWT access token (valid for 15 minutes) and refresh token (valid for 7 days), returning both in response.

WHEN login fails due to incorrect credentials, THE system SHALL return HTTP 401 Unauthorized with error code AUTH_INVALID_CREDENTIALS and message 'Invalid email or password.'

WHEN a user changes their password, THE system SHALL invalidate all active sessions for that user.

WHEN a user requests password reset, THE system SHALL send email with time-limited token valid for 15 minutes.

## User Profile

WHEN a user views their profile, THE system SHALL display their display name, bio text, list of articles, and comments.

WHEN a user updates their display name or bio, THE system SHALL save changes and update all relevant views within 2 seconds.

WHEN a user requests to delete their account, THE system SHALL delete their account, all associated articles, and comments, and mark their profile as 'deleted' in the database.

## Sections

WHEN an administrator creates a new section, THE system SHALL validate section name and description are not empty and store the section in the database.

WHEN users view sections, THE system SHALL display the complete list of sections with their names and descriptions.

WHEN a user browses articles in a specific section, THE system SHALL show articles within that section with pagination, sorting options, and tag filters.

## Articles

WHEN a user creates an article in a section, THE system SHALL require title, content, and section selection, and allow attachments and tags.

WHEN an article has multiple attachments, THE system SHALL store file metadata and allow download for each file.

WHEN a user edits their article, THE system SHALL allow modification of title, content, attachments, and tags, and update the article timestamp.

WHEN a user deletes their article, THE system SHALL remove the article and its attachments from storage while preserving comment relationships.

## Article List

WHEN users view articles within a section, THE system SHALL paginate results (default 20 per page) and display title, author, tags, comment count, and time posted.

WHEN users sort articles, THE system SHALL provide options to sort by newest first or oldest first, with default being newest first.

WHEN users search for articles by title or content, THE system SHALL return paginated results with matching titles or content.

## Viewing an Article

WHEN a user views a single article, THE system SHALL display its complete content, author, attachments, tags, and time posted.

WHEN a user downloads an attachment, THE system SHALL serve the file with correct MIME type and prevent direct URL access.

## Search and Filtering

WHEN users apply tag filters to search results, THE system SHALL restrict results to articles containing all specified tags.

WHEN searches exceed 50 results, THE system SHALL prompt users to refine their search or adjust filters.

## Comments

WHEN a user writes a comment on an article, THE system SHALL require comment content, and associate it with the article and user.

WHEN users view article comments, THE system SHALL display comments sorted by oldest first with author, content, and time posted.

WHEN a user edits their comment, THE system SHALL update the comment content and timestamp.

WHEN a user deletes their comment, THE system SHALL remove the comment and update comment counts for the article.

## Administrator System

WHEN a user requests to become an administrator, THE system SHALL create a pending request with reason text for super administrators to review.

WHEN a super administrator approves a request, THE system SHALL update the user's role to 'admin' and notify the user.

WHEN a super administrator promotes a regular administrator, THE system SHALL update the user's role to 'super-admin' and log the action.

WHEN a super administrator demotes another super administrator, THE system SHALL update the role to 'admin' and log the action.

## Banning

WHEN an administrator bans a user, THE system SHALL record the ban reason, set user status to 'banned', and prevent login attempts.

WHEN a banned user attempts to log in, THE system SHALL return HTTP 403 Forbidden with error code BAN_USER_BANNED and message 'Your account has been banned.'

WHEN an administrator unban a user, THE system SHALL update the user status to 'active' and log the action.

WHEN administrators view banned users, THE system SHALL display a list with username, ban reason, and ban date.