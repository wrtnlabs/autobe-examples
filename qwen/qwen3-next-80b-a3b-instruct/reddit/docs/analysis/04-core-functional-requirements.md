# Reddit-like Community Platform

## User Account

### Registration

WHEN a user attempts to register, THE system SHALL require:

- A valid email address (format: local-part@domain)
- A password with minimum 8 characters
- A unique username (alphanumeric characters, underscores, 3–30 characters)

WHEN the registration data is submitted, THE system SHALL:

- Validate email format per RFC 5322
- Verify email is not already registered
- Verify username is not already taken
- Hash password using bcrypt with cost factor 12
- Create user account with karma value of 0
- Generate JWT access (15-minute) and refresh (7-day) tokens
- Send verification email with 24-hour expiration link
- Return HTTP 201 Created with user ID and tokens

IF the email is already registered, THEN THE system SHALL return HTTP 409 Conflict with error code EMAIL_EXISTS

IF the username is already taken, THEN THE system SHALL return HTTP 409 Conflict with error code USERNAME_EXISTS

IF the password is less than 8 characters, THEN THE system SHALL return HTTP 400 Bad Request with error code PASSWORD_TOO_SHORT

IF the username contains invalid characters, THEN THE system SHALL return HTTP 400 Bad Request with error code USERNAME_INVALID_CHARS

WHILE a user account is unverified, THE system SHALL prevent login and content creation

### Login

WHEN a user attempts to log in, THE system SHALL:

- Accept email and password as credentials
- Locate user record by email
- Verify password hash matches provided password
- If valid, issue JWT access and refresh tokens
- Return HTTP 200 OK with authentication tokens and user summary (ID, username, display_name, karma)

IF no user exists for the email, THEN THE system SHALL return HTTP 401 Unauthorized with error code AUTH_INVALID_CREDENTIALS

IF the password does not match, THEN THE system SHALL return HTTP 401 Unauthorized with error code AUTH_INVALID_CREDENTIALS

IF the account is unverified, THEN THE system SHALL return HTTP 403 Forbidden with error code ACCOUNT_UNVERIFIED

WHEN login is successful, THE system SHALL update the `last_login` field to the current timestamp

### Password Change

WHEN a user requests to change their password, THE system SHALL:

- Require current password for authentication
- Require new password to be at least 8 characters long
- Require new password to differ from current password
- Hash new password using bcrypt with cost factor 12
- Update the `password_hash` field
- Invalidate all existing sessions
- Send a password change confirmation email

IF the current password is incorrect, THEN THE system SHALL return HTTP 401 Unauthorized with error code AUTH_INVALID_CURRENT_PASSWORD

IF the new password matches the current password, THEN THE system SHALL return HTTP 400 Bad Request with error code PASSWORD_SAME_AS_CURRENT

IF the new password is less than 8 characters, THEN THE system SHALL return HTTP 400 Bad Request with error code PASSWORD_TOO_SHORT

### Account Deletion

WHEN a user requests account deletion, THE system SHALL:

- Require password confirmation for authentication
- Instantly delete all posts and comments created by the user
- Remove the user from all community subscriptions
- Clear profile data: display_name, bio, avatar
- Set username to `deleted_user_###` (unique)
- Set email to `deleted_###@example.com`
- Set karma to 0
- Mark account as deleted in the database
- Return HTTP 200 OK upon completion

WHILE an account is marked deleted, THE system SHALL prevent login attempts

WHEN another user attempts to register with a username from a deleted account, THE system SHALL:

- Allow registration with that username
- Reclaim the username from the deleted account namespace

## User Profile

### Profile Attributes

THE user profile SHALL contain:

- `display_name`: Free-form text (2–50 characters)
- `bio`: Free-form text (max 500 characters)
- `avatar`: Image URL (PNG, JPG, GIF; max 2MB)
- `karma`: Integer (system-calculated)
- `username`: Unique alphanumeric identifier (fixed after registration)
- `created_at`: ISO 8601 timestamp

WHEN another user views a profile, THE system SHALL show:

- `display_name`
- `bio`
- `avatar`
- `karma`
- `username`

WHEN the user views their own profile, THE system SHALL also show:

- `created_at`
- `email` (masked: `a***@domain.com`)
- `last_login`
- `account_verified`
- `account_deleted` status

### Profile Editing

WHEN a user edits their profile, THE system SHALL authorize only if:

- The request contains a valid JWT token for the user
- The user ID in the JWT matches the target profile ID

THE system SHALL allow edits to:

- `display_name` (2–50 characters, alphanumeric, underscore, space only)
- `bio` (0–500 characters)
- `avatar` (image upload)

WHEN a new avatar is uploaded, THE system SHALL:

- Validate image format (PNG, JPG, GIF)
- Verify file size ≤ 2MB
- Generate unique filename using UUID
- Store file in S3-compatible cloud storage
- Update avatar field with generated URL

WHEN `display_name` or `bio` is updated, THE system SHALL:

- Validate character limits
- Strip HTML tags and scripts
- Escape special characters to prevent XSS
- Update corresponding fields

IF `display_name` exceeds 50 characters, THEN THE system SHALL return HTTP 400 Bad Request with error code DISPLAY_NAME_TOO_LONG

IF `display_name` contains invalid characters, THEN THE system SHALL return HTTP 400 Bad Request with error code DISPLAY_NAME_INVALID_CHARS

IF `bio` exceeds 500 characters, THEN THE system SHALL return HTTP 400 Bad Request with error code BIO_TOO_LONG

IF avatar file exceeds 2MB, THEN THE system SHALL return HTTP 400 Bad Request with error code AVATAR_TOO_LARGE

IF avatar format is unsupported, THEN THE system SHALL return HTTP 400 Bad Request with error code AVATAR_INVALID_FORMAT

### Profile Viewing

WHEN any user (authenticated or guest) requests a user profile by username, THE system SHALL:

- Return profile data if username exists
- Return HTTP 404 Not Found if username does not exist
- Serve avatar image via standard HTTP endpoint

WHEN the user requests their own profile, THE system SHALL return full profile data including metadata

WHEN the user requests another user’s profile, THE system SHALL return only:

- `display_name`
- `bio`
- `avatar`
- `karma`
- `username`
- `created_at`

## Karma System

### Karma Calculation

THE karma score is a single integer value per user.

WHEN a user receives an upvote on a post or comment, THE system SHALL increase their karma by 1

WHEN a user receives a downvote on a post or comment, THE system SHALL decrease their karma by 1

WHEN a user removes their vote from a post or comment, THE system SHALL adjust karma in the opposite direction of the former vote:

- If the vote was an upvote, decrease karma by 1
- If the vote was a downvote, increase karma by 1

Karma values MAY be negative

### Karma Display

THE karma value SHALL be displayed in:

- User profile page (total)
- Post author metadata (total)
- Comment author metadata (total)

WHEN a user views any user’s profile, THE system SHALL show the total karma value

WHEN a user views any post or comment, THE system SHALL show the author’s total karma value

## Communities

### Community Creation

WHEN a user attempts to create a community, THE system SHALL:

- Require the user to be authenticated
- Require a unique community name (case-insensitive, alphanumeric, hyphen, underscore)
- Require a description (1–1000 characters)
- Accept an optional icon image upload
- Create community record with the creator as owner
- Auto-subscribe the creator
- Set subscriber count to 1
- Return HTTP 201 Created with community details

IF the community name already exists, THEN THE system SHALL return HTTP 409 Conflict with error code COMMUNITY_EXISTS

IF the community name contains invalid characters, THEN THE system SHALL return HTTP 400 Bad Request with error code COMMUNITY_NAME_INVALID

IF the description exceeds 1000 characters, THEN THE system SHALL return HTTP 400 Bad Request with error code COMMUNITY_DESCRIPTION_TOO_LONG

IF the user is not authenticated, THEN THE system SHALL return HTTP 401 Unauthorized with error code AUTH_REQUIRED

### Community Attributes

THE community SHALL contain:

- `name`: Unique identifier (max 50 characters)
- `description`: Free-form text (1–1000 characters)
- `icon`: Optional image URL (PNG, JPG, GIF; max 500KB)
- `owner_id`: UUID of the creator
- `created_at`: ISO 8601 timestamp
- `subscriber_count`: Integer (≥ 0)

WHEN a community is displayed in public listings, THE system SHALL show:

- `name`
- `description` (truncated to 100 characters)
- `icon` (if exists)
- `subscriber_count`
- `is_subscribed` (true if authenticated user is subscribed)

### Community Search

WHEN a user searches for communities, THE system SHALL:

- Accept a search term (minimum 2 characters)
- Return communities whose name contains the search term (case-insensitive partial match)
- Sort results by `subscriber_count` DESC, then by `name` ASC
- Return max 50 results per page
- Include pagination metadata (page, per_page, total_pages, total_count)

IF the search term is less than 2 characters, THEN THE system SHALL return HTTP 400 Bad Request with error code SEARCH_TERM_TOO_SHORT

WHEN no matches are found, THE system SHALL return an empty list with HTTP 200 OK

## Subscription

### Subscription Workflow

WHEN a user subscribes to a community, THE system SHALL:

- Verify user is authenticated
- Verify community exists
- Verify user is not already subscribed
- Create subscription record with `joined_at` timestamp
- Increment community’s `subscriber_count` by 1
- Return HTTP 200 OK

WHEN a user unsubscribes from a community, THE system SHALL:

- Verify user is authenticated
- Verify community exists
- Verify user is currently subscribed
- Delete subscription record
- Decrement community’s `subscriber_count` by 1
- Return HTTP 200 OK

IF a user tries to subscribe to a non-existent community, THEN THE system SHALL return HTTP 404 Not Found with error code COMMUNITY_NOT_FOUND

IF a user tries to subscribe while already subscribed, THEN THE system SHALL return HTTP 409 Conflict with error code ALREADY_SUBSCRIBED

IF a user tries to unsubscribe without being subscribed, THEN THE system SHALL return HTTP 404 Not Found with error code NOT_SUBSCRIBED

### Subscription Requirement for Posting

WHEN a user attempts to create a post, THE system SHALL verify:

- User is authenticated
- Target community exists
- User is subscribed to the community

IF any condition fails, THE system SHALL return HTTP 403 Forbidden with error code INSUFFICIENT_PRIVILEGES

### Ban and Unban

WHEN a user is banned from a community, THE system SHALL:

- Prevent them from subscribing again to that community
- Prevent them from creating posts or comments in that community
- Prevent them from editing posts or comments they created in that community
- Allow them to view content in that community

### Subscribed Community List

WHEN an authenticated user requests their subscribed communities, THE system SHALL:

- Return a list of all communities they are subscribed to
- Include: `name`, `description`, `icon`, `subscriber_count`, `role` (owner/moderator/member)
- Sort by `joined_at` (newest first)
- Return max 25 items per page
- Include pagination metadata

IF the user is not authenticated, THE system SHALL return HTTP 401 Unauthorized

## Posts

### Post Creation

WHEN a user creates a new post, THE system SHALL:

- Require authentication
- Require the user to be subscribed to the target community
- Require exactly one of the following:
  - `text_post`: content (1–5000 characters)
  - `link_post`: URL (valid HTTP/HTTPS)
  - `image_post`: image file (PNG, JPG, GIF; ≤ 5MB)
- Reject if no type or multiple types provided
- Set default status to "visible"
- Set `created_at` to current timestamp
- Set `vote_score` to 0
- Set `comment_count` to 0
- Return HTTP 201 Created with post details

WHEN a text_post is submitted, THE system SHALL:

- Validate content length: 1–5000 characters
- Strip HTML tags
- Escape special characters for display

WHEN a link_post is submitted, THE system SHALL:

- Validate URL format per RFC 3986
- Validate domain is external (not localhost/internal IP)
- Extract clean domain name for display

WHEN an image_post is submitted, THE system SHALL:

- Validate format (PNG, JPG, GIF)
- Validate file size ≤ 5MB
- Generate unique filename with UUID + extension
- Store file in cloud storage
- Generate public access URL
- Generate thumbnail: ≤ 400px width, 75% quality

IF the user is not authenticated, THEN THE system SHALL return HTTP 401 Unauthorized with error code AUTH_REQUIRED

IF the user is not subscribed to the community, THEN THE system SHALL return HTTP 403 Forbidden with error code NOT_SUBSCRIBED

IF the community does not exist, THEN THE system SHALL return HTTP 404 Not Found with error code COMMUNITY_NOT_FOUND

IF no content type is provided, THEN THE system SHALL return HTTP 400 Bad Request with error_code MISSING_POST_TYPE

IF multiple content types are provided, THEN THE system SHALL return HTTP 400 Bad Request with error_code MULTIPLE_POST_TYPES

IF text post exceeds 5000 characters, THEN THE system SHALL return HTTP 400 Bad Request with error_code TEXT_TOO_LONG

IF link is invalid, THEN THE system SHALL return HTTP 400 Bad Request with error_code INVALID_URL

IF image exceeds 5MB, THEN THE system SHALL return HTTP 400 Bad Request with error_code IMAGE_TOO_LARGE

IF image format is invalid, THEN THE system SHALL return HTTP 400 Bad Request with error_code IMAGE_INVALID_FORMAT

### Post Editing

WHEN a user edits a post, THE system SHALL:

- Verify user is authenticated
- Verify post exists and is "visible"
- Verify the user is the author (JWT user_id matches post.created_by)
- Allow updates to:
  - `title` (1–200 characters)
  - `text_post.content` (if exists, 1–5000 characters)
  - `link_post.url` (if exists, valid URL)
  - `image_post.image_file` (if exists, new upload)
- Reject changes to `community_id`, `created_at`, or `user_id`
- Update `last_edited` timestamp
- Return HTTP 200 OK

IF the user is not the author, THEN THE system SHALL return HTTP 403 Forbidden with error_code UNAUTHORIZED_EDIT

IF title exceeds 200 characters, THEN THE system SHALL return HTTP 400 Bad Request with error_code TITLE_TOO_LONG

IF new text content exceeds 5000 characters, THEN THE system SHALL return HTTP 400 Bad Request with error_code TEXT_TOO_LONG

IF new URL is invalid, THEN THE system SHALL return HTTP 400 Bad Request with error_code INVALID_URL

IF new image exceeds 5MB, THEN THE system SHALL return HTTP 400 Bad Request with error_code IMAGE_TOO_LARGE

IF new image format is invalid, THEN THE system SHALL return HTTP 400 Bad Request with error_code IMAGE_INVALID_FORMAT

### Post Deletion

WHEN a user attempts to delete a post, THE system SHALL:

- Verify user is authenticated
- Verify the post exists
- Verify the user is the author
- Set post status to "deleted"
- Decrement community’s `post_count` by 1
- Return HTTP 200 OK

WHEN a moderator or owner deletes a post, THE system SHALL:

- Verify they have moderator or owner rights in the community
- Set post status to "deleted"
- Decrement `post_count`
- Write audit log entry (user_id, post_id, reason)
- Return HTTP 200 OK

WHEN a platform admin deletes a post, THE system SHALL:

- Bypass community permissions
- Set post status to "deleted"
- Decrement `post_count`
- Write audit log with "system-wide moderator" label
- Return HTTP 200 OK

IF the user is not the author, moderator, or owner, THEN THE system SHALL return HTTP 403 Forbidden with error_code UNAUTHORIZED_DELETE

### Post Visibility Rules

WHEN a post is marked "deleted", THE system SHALL:

- Hide from all feeds and community pages
- Hide from comment threads
- Hide from user profile post lists
- Retain metadata for audit logs
- Allow moderators to view soft-deleted content

WHEN a post is "visible", THE system SHALL:

- Appear in all appropriate feeds
- Be accessible to authenticated and unauthenticated users
- Be visible in profile post lists
- Be commentable by other users

WHILE a post is being moderated, THE system SHALL:

- Hide from feeds and public views
- Retain content and votes
- Allow moderators to view
- Allow author to edit

### Post Title Requirements

THE post title SHALL:

- Be 1–200 characters
- Allow alphanumeric characters, spaces, punctuation, symbols
- Contain no HTML tags or JavaScript
- Include at least one alphanumeric character

WHEN a post is created without a title, THE system SHALL automatically use the first 50 characters of `text_post.content` as the title

WHEN a post is created with an empty title and no text content, THE system SHALL return HTTP 400 Bad Request with error_code TITLE_REQUIRED

WHEN a title exceeds 200 characters, THE system SHALL return HTTP 400 Bad Request with error_code TITLE_TOO_LONG

WHEN a title contains only whitespace, THE system SHALL return HTTP 400 Bad Request with error_code TITLE_INVALID

### Post Content Length & Format

THE `text_post` content SHALL:

- Be 1–5000 characters
- Allow line breaks, emojis, and common symbols
- Escape HTML for display
- Reject scripts and iframes

THE `link_post` URL SHALL:

- Be a valid HTTP/HTTPS URI
- Be ≤ 2000 characters
- Exclude JavaScript: protocols
- Exclude localhost or internal IP addresses

THE `image_post` file SHALL:

- Be ≤ 5MB
- Be PNG, JPG, or GIF format
- Not be animated GIFs exceeding 2MB
- Have `.png`, `.jpg`, `.jpeg`, or `.gif` extension

## Post Voting

### Voting Rules

WHEN a user upvotes a post, THE system SHALL:

- Add 1 to the post’s `vote_score`
- Add 1 to the author’s `karma`
- Record vote in database (user_id, post_id, vote_type="up")
- Return HTTP 200 OK

WHEN a user downvotes a post, THE system SHALL:

- Subtract 1 from the post’s `vote_score`
- Subtract 1 from the author’s `karma`
- Record vote in database (user_id, post_id, vote_type="down")
- Return HTTP 200 OK

WHEN a user removes their vote from a post, THE system SHALL:

- Remove the vote record
- Reverse the impact on vote_score and karma:
  - If the vote was up, subtract 1 from vote_score and karma
  - If the vote was down, add 1 to vote_score and karma
- Return HTTP 200 OK

A user SHALL ONLY be able to vote once per post

IF a user changes vote from up to down (or vice versa), THE system SHALL:

- Remove the old vote record
- Create new vote record with opposite type
- Adjust vote_score by 2: e.g., up to down = -2 adjustment
- Adjust karma by 2
- Return HTTP 200 OK

VOTE SCORE = total_upvotes - total_downvotes

### Post Vote Display

WHEN a post is displayed in a feed or detail view, THE system SHALL show:

- Total vote score (integer)
- Whether the current user has voted (up/down/none)
- Number of users who voted (total upvotes + downvotes)
- Time since vote was cast

## Post Feeds

### Feed Types

#### Home Feed

- Shows posts from communities the user is subscribed to
- Visible only to authenticated users

#### Popular Feed

- Shows posts from all communities across the platform
- Available to all users, including unauthenticated

#### Community Feed

- Shows posts from a single specified community
- Available to all users

### Sorting Options

All three feeds support these sorting options:

#### Hot

- Sorts by popularity metric: score / time_elapsed
- Recent posts with high votes rank higher

#### New

- Sorts by `created_at` descending (newest first)

#### Top

- Sorts by `vote_score` descending
- Apply time filters:
  - Today
  - This week
  - This month
  - This year
  - All time

#### Controversial

- Sorts by total votes (up + down) descending
- Then by score proximity to 0 (e.g., 5 up, 5 down ranks higher than 10 up, 1 down)

### Feed Pagination

All feeds SHALL support pagination:

- Return 25 posts per page
- Include pagination metadata: `page`, `per_page`, `total_pages`, `total_count`
- Cursor-based or offset-based pagination
- Allow requesting specific page numbers

### Feed List Item Display

When displaying any feed, each post item SHALL show:

- Title (truncated to 100 characters if longer)
- Author username
- Community name
- Vote score
- Comment count
- Time since posted (e.g., "3 hours ago")
- For text posts: first 200 characters of content (truncated with "..." if longer)
- For image posts: thumbnail URL (≤ 200px width)
- For link posts: domain name (e.g., "youtube.com")

## Comment System

### Comment Creation

WHEN a user adds a comment to a post, THE system SHALL:

- Require authentication
- Allow parent to be:
  - A post (root comment)
  - Another comment (reply)
- Allow unlimited nesting depth
- Accept text content (1–3000 characters)
- Set `created_at` to current timestamp
- Set `vote_score` to 0
- Set `reply_count` to 0
- Return HTTP 201 Created with comment details

WHEN a comment is created, THE system SHALL increment the parent comment’s `reply_count` by 1

WHEN a comment is created on a post, THE system SHALL increment that post’s total `comment_count` by 1

IF the comment content exceeds 3000 characters, THEN THE system SHALL return HTTP 400 Bad Request with error_code COMMENT_TOO_LONG

IF comment has no parent, THEN THE system SHALL return HTTP 400 Bad Request with error_code PARENT_REQUIRED

IF target post or parent comment does not exist, THEN THE system SHALL return HTTP 404 Not Found with error_code TARGET_NOT_FOUND

### Comment Editing

WHEN a user edits a comment, THE system SHALL:

- Verify user is authenticated
- Verify comment exists
- Verify user is the author of the comment
- Allow edit to text content only
- Limit content to 1–3000 characters
- Update `last_edited` timestamp
- Return HTTP 200 OK

IF the user is not the author, THEN THE system SHALL return HTTP 403 Forbidden with error_code UNAUTHORIZED_EDIT

IF content exceeds 3000 characters, THEN THE system SHALL return HTTP 400 Bad Request with error_code COMMENT_TOO_LONG

### Comment Deletion

WHEN a user deletes a comment, THE system SHALL:

- Verify user is authenticated
- Verify comment exists
- Verify user is the author
- Set status to "deleted"
- Decrement parent’s `reply_count` by 1 (if parent is a comment)
- Decrement parent post’s `comment_count` by 1 (if parent is a post)
- Return HTTP 200 OK

WHEN a moderator or owner deletes a comment, THE system SHALL:

- Verify moderator/owner rights to the target post’s community
- Set status to "deleted"
- Decrement `reply_count` or `comment_count` as appropriate
- Record audit log (user_id, comment_id, reason)
- Return HTTP 200 OK

WHEN a platform admin deletes a comment, THE system SHALL:

- Bypass community permissions
- Set status to "deleted"
- Decrement counts appropriately
- Record audit log with "system-wide moderator" label
- Return HTTP 200 OK

IF the user is not the author, moderator, or owner, THEN THE system SHALL return HTTP 403 Forbidden with error_code UNAUTHORIZED_DELETE

### Comment Visibility

WHEN a comment is "deleted", THE system SHALL:

- Hide from all views
- Retain metadata for audit logs
- Allow moderators to view soft-deleted comments

WHEN a comment is "visible", THE system SHALL:

- Appear in the comment thread
- Be included in comment count
- Be viewable by authenticated and unauthenticated users

### Comment Sorting

Comments on a post may be sorted by:

#### Best

- Sort by `vote_score` descending
- Primary sort criterion

#### New

- Sort by `created_at` descending

#### Controversial

- Sort by total votes (up + down) descending
- Then by absolute value of `vote_score` (closest to zero first)

### Comment Vote Display

WHEN a comment is displayed, THE system SHALL show:

- Author username
- Content (truncated if over 500 characters in list view)
- Vote score
- Time since posted (e.g., "2 hours ago")
- Number of replies
- Whether current user has voted (up/down/none)

## Community Moderation

### Moderator Roles

The community owner is the highest authority

WHEN an owner creates a community, THE system SHALL automatically assign `role: "owner"` to the creator

WHEN an owner adds a moderator, THE system SHALL:

- Accept user ID or username
- Verify user is a member of the community
- Add `role: "moderator"` to user
- Record audit log of assignment

WHEN an owner removes a moderator, THE system SHALL:

- Remove `moderator` role
- Record audit log

WHEN a moderator attempts to add another moderator, THE system SHALL:

- Allow the addition
- Require user to be in the community
- Record audit log

WHEN any moderator attempts to remove the owner, THE system SHALL:

- Reject the request
- Return HTTP 403 Forbidden

WHEN any moderator attempts to remove another moderator, THE system SHALL:

- Reject the request
- Return HTTP 403 Forbidden

### Moderator Actions

Moderators can:

- Delete any post in the community
- Delete any comment in the community
- Ban users from the community
- Unban users from the community
- View list of banned users

Banned users:

- Cannot create posts or comments in that community
- Can still view community content
- Cannot subscribe to the community

Moderators SHALL NOT:

- Remove other moderators or the owner
- Delete or ban users without valid reason

### Moderator Accountability

All moderator actions SHALL be logged:

- Action type (delete, ban, unban, add_mod, remove_mod)
- Target (user_id or post_id)
- Reason (provided by moderator)
- Timestamp
- Executor (moderator ID)

## Reporting

### Report Trigger

Users MAY report:

- Any post
- Any comment

WHEN a report is submitted, THE system SHALL require:

- Valid JWT authentication
- UUID of the target (post or comment)
- Description (reason) (1–200 characters)

IF the reason is missing or exceeds 200 characters, THE system SHALL return HTTP 400 Bad Request with error_code REPORT_REASON_INVALID

### Report Content

Each report SHALL contain:

- Reported content reference (post_id or comment_id)
- Reporting user ID
- Report reason (text)
- Timestamp of report
- Status (pending, approved, dismissed)
- Moderator who acted (nullable)
- Resolution timestamp (nullable)

### Report Review

Only moderators of the target content’s community may review reports

WHEN a moderator views the report list, THE system SHALL show:

- Reported content (preview)
- Reporter username
- Report reason
- Timestamp
- Action buttons: "Approve" or "Dismiss"

WHEN a moderator approves a report, THE system SHALL:

- Set report status to "approved"
- Delete the reported content (set status to "deleted")
- Assign moderator ID as resolver
- Record resolution timestamp
- Send notification to reporter: "Your report was approved. Content has been removed."

WHEN a moderator dismisses a report, THE system SHALL:

- Set report status to "dismissed"
- Leave content unchanged
- Assign moderator ID as resolver
- Record resolution timestamp
- Send notification to reporter: "Your report was dismissed. Content remains available."

### Report Visibility

Reports are visible only to:

- Moderators of the community where the content exists
- Platform admins

Regular users and other moderators in other communities SHALL NOT see reports

DISMISSED reports SHALL be removed from the active report list

Approved reports SHALL remain visible in reports history for audit trail

### Reporting Feedback

When a user submits a report, THE system SHALL:

- Return HTTP 201 Created upon confirmation
- Provide message: "Thank you for reporting this content. Our moderators will review it."

When a report is resolved, THE system SHALL:

- Send email notification to the reporter
- Include reason for decision
- Allow the reporter to appeal (optional)