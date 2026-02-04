# Reddit-like Community Platform Requirements Specification

## User Account Management

### User Registration

WHEN a user attempts to register with an email address and password, THE system SHALL:
- Validate that the email address conforms to RFC 5322 email format
- Check that no existing account has the same email address
- Validate that the username is 3 to 20 characters long and contains only alphanumeric characters and underscores
- Check that no existing account has the same username
- Hash the password using bcrypt with a cost factor of 12
- Generate a unique user ID
- Create a record in the User table with:
  - Generated user ID
  - Encrypted email
  - Hashed password
  - Generated username
  - Null display name (to be set later)
  - Null bio text
  - Null avatar URL
  - Karma score of 0
  - Account status as 'ACTIVE'
  - Creation timestamp
- Return a success response with a JWT access token and refresh token
- Return HTTP 201 Created if registration is successful
- Return HTTP 409 Conflict with code AUTH_EMAIL_EXISTS if email is already registered
- Return HTTP 409 Conflict with code AUTH_USERNAME_EXISTS if username is already registered
- Return HTTP 400 Bad Request with code AUTH_INVALID_EMAIL if email format is invalid
- Return HTTP 400 Bad Request with code AUTH_INVALID_USERNAME if username format is invalid
- Return HTTP 400 Bad Request with code AUTH_INVALID_PASSWORD if password doesn't meet minimum complexity requirements (8+ characters)

### User Login

WHEN a user attempts to log in with email and password, THE system SHALL:
- Locate the user record by email address
- Validate the provided password against the stored bcrypt hash
- Generate a new JWT access token with expiration of 15 minutes containing:
  - userId
  - username
  - accountStatus
  - permissions array (derived from user role)
- Generate a JWT refresh token with expiration of 30 days
- Store the refresh token in the RefreshToken table with:
  - userId
  - token hash
  - issuedAt timestamp
  - expiresAt timestamp
  - userAgent
  - ipAddress
- Return the access token and refresh token in response body
- Return HTTP 200 OK if authentication succeeds
- Return HTTP 401 Unauthorized with code AUTH_INVALID_CREDENTIALS if email/password combination is invalid
- Return HTTP 403 Forbidden with code AUTH_ACCOUNT_SUSPENDED if account status is SUSPENDED

### Password Management

WHEN a user requests to change their password, THE system SHALL:
- Require the user to provide their current password
- Validate the current password against stored hash
- Validate the new password meets complexity requirements (8+ characters)
- Generate a new bcrypt hash for the new password
- Update the password hash in the User record
- Delete all existing refresh tokens for the user from the RefreshToken table
- Generate and return a new access token and refresh token
- Return HTTP 200 OK if password change is successful
- Return HTTP 401 Unauthorized with code AUTH_INVALID_CURRENT_PASSWORD if current password is incorrect
- Return HTTP 400 Bad Request with code AUTH_INVALID_NEW_PASSWORD if new password doesn't meet requirements

WHEN a user requests password reset via email, THE system SHALL:
- Accept a request containing the user's email address
- Validate that an account exists with that email
- Generate a one-time use password reset token with 60-minute expiration
- Store the token hash and expiry in the PasswordResetToken table
- Send an email containing the reset link with token parameter
- Return HTTP 200 OK if request is processed

WHEN a user submits a password reset link with token, THE system SHALL:
- Validate the token against stored hash
- Verify token is not expired (timestamp comparison with current time)
- Reset the user's password if validation passes
- Require new password to meet complexity requirements
- Delete the reset token after successful reset
- Return HTTP 200 OK if reset is successful
- Return HTTP 404 Not Found with code RESET_TOKEN_INVALID if token doesn't exist
- Return HTTP 400 Bad Request with code RESET_TOKEN_EXPIRED if token has expired

### Account Deletion

WHEN a user requests to delete their account, THE system SHALL:
- Validate that the user is authenticated with valid session
- Require user confirmation (yes/no) with explicit action
- Delete all posts created by the user from Post table
- Delete all comments created by the user from Comment table
- Delete all subscriptions from Subscription table
- Delete all vote records from PostVote and CommentVote tables
- Delete the user's refresh tokens from RefreshToken table
- Set user account status to DELETED and anonymize email/username
- Return HTTP 204 No Content on successful deletion
- Return HTTP 401 Unauthorized if user is not authenticated

## User Profile Management

### Profile Structure

Each User SHALL have a profile with the following attributes:
- display_name: String (nullable, max 50 characters)
- bio: Text (nullable, max 500 characters)
- avatar_url: String (nullable, valid URL format)
- karma: Integer (default 0)
- created_at: ISO 8601 datetime
- last_active: ISO 8601 datetime

### Profile Editing

WHEN a user modifies their display name, bio, or avatar, THE system SHALL:
- Validate that display name is 1-50 characters and doesn't contain profanity or special characters
- Validate that bio text is 0-500 characters
- Validate that avatar URL is a valid HTTPS URL pointing to image format (PNG, JPEG, GIF, WEBP)
- If avatar_url is provided, validate image size ≤ 2MB
- If avatar_url is changed, the system SHALL:
  - Fetch the image from the provided URL
  - Validate mime type is image/
  - Resize image to 200x200px thumbnail and 800x800px original in cloud storage
  - Generate new secure URLs for both thumbnails
  - Update User record with new avatar_url
  - Invalidate any cached profile data
- Return HTTP 200 OK with updated profile information
- Return HTTP 400 Bad Request if validation fails

### Profile Viewing

WHEN a user requests to view any user's profile (including their own), THE system SHALL:
- Return profile data including:
  - display_name
  - bio
  - avatar_url
  - karma score
  - created_at
  - last_active
- Return a list of all posts created by the user:
  - post_id
  - title
  - post_type (text, link, image)
  - community_name
  - vote_score
  - comment_count
  - created_at
  - is_edited
  - content_preview (first 200 characters for text posts)
  - image_thumb_url (for image posts)
  - link_domain (for link posts)
- Return a list of all comments made by the user:
  - comment_id
  - post_title
  - parent_comment_id (null if top-level)
  - content_preview (first 200 characters)
  - vote_score
  - created_at
  - is_edited
- Return HTTP 200 OK
- Return HTTP 404 Not Found if user doesn't exist or is DELETED

## Karma System

### Karma Calculation

Every User SHALL have exactly one karma score represented as an integer value.

WHEN a user receives an upvote on a post or comment, THE system SHALL:
- Increase their karma by 1
- Record the karma change in the KarmaTransaction table with:
  - userId
  - changeAmount: 1
  - changeType: "upvote"
  - relatedId: postId or commentId
  - timestamp

WHEN a user receives a downvote on a post or comment, THE system SHALL:
- Decrease their karma by 1
- Record the karma change in the KarmaTransaction table with:
  - userId
  - changeAmount: -1
  - changeType: "downvote"
  - relatedId: postId or commentId
  - timestamp

WHEN a user removes their vote from a post or comment, THE system SHALL:
- Detect the previous vote state (up or down)
- Reverse the karma adjustment:
  - If previous vote was upvote (+1), decrease karma by 1
  - If previous vote was downvote (-1), increase karma by 1
- Record the reversal in the KarmaTransaction table with changeAmount of -1 or 1 accordingly
- Return HTTP 200 OK

### Karma Display

THE system SHALL display karma scores as integer values with no suffix or formatting.
Karma scores MAY be negative.
Karma scores SHALL update in real time in UI without requiring page refresh.

## Community Management

### Community Creation

WHEN a user creates a new community, THE system SHALL:
- Validate that the community name is 3-25 characters long
- Validate that the community name contains only lowercase letters, numbers, and hyphens
- Check that no existing community has the same name (case-insensitive)
- Validate that description is 0-500 characters
- Validate that icon image URL (if provided) is valid HTTPS URL for image format (PNG, JPEG, GIF, WEBP)
- If icon image URL is provided:
  - Fetch and validate image size ≤ 1MB
  - Resize to 80x80px thumbnail and 500x500px original
  - Store in cloud storage
  - Generate secure URLs
- Create community record in Community table with:
  - id
  - name (lowercase, normalized)
  - description
  - icon_url_thumbnail
  - icon_url_original (if provided)
  - owner_id
  - subscriber_count: 1
  - created_at
  - is_active: true
- Create a Subscription record linking the creator as subscriber
- Return HTTP 201 Created with community details
- Return HTTP 409 Conflict with code COMMUNITY_NAME_EXISTS if name is already taken
- Return HTTP 400 Bad Request if validation fails

### Community Browsing and Searching

WHEN a user requests to browse all communities, THE system SHALL:
- Return paginated list of communities with:
  - id
  - name
  - description
  - icon_url_thumbnail
  - subscriber_count
  - owner_username
  - created_at
- Sort results alphabetically by name
- Return HTTP 200 OK

WHEN a user searches for communities by name, THE system SHALL:
- Accept query parameter q (minimum 2 characters)
- Search community names using PostgreSQL trigram similarity
- Return communities with similarity score ≥ 0.2
- Sort results by similarity score descending
- Return paginated results
- Return HTTP 200 OK

### Community Subscription Management

WHEN a user subscribes to a community, THE system SHALL:
- Validate that the user is authenticated
- Validate that the community exists and is active
- Validate that the user is not already subscribed
- Create Subscription record with: userId, communityId, subscribed_at
- Increment community subscriber_count by 1
- Return HTTP 201 Created
- Return HTTP 401 Unauthorized if not authenticated
- Return HTTP 404 Not Found if community doesn't exist
- Return HTTP 409 Conflict if already subscribed

WHEN a user unsubscribes from a community, THE system SHALL:
- Validate that the user is authenticated
- Validate that the user is subscribed to the community
- Delete the Subscription record
- Decrement community subscriber_count by 1
- Return HTTP 200 OK
- Return HTTP 401 Unauthorized if not authenticated
- Return HTTP 404 Not Found if not subscribed to community

WHEN a user requests their subscribed communities, THE system SHALL:
- Return paginated list of communities the user is subscribed to with:
  - id
  - name
  - description
  - icon_url_thumbnail
  - subscriber_count
  - owner_username
  - created_at
- Sort results alphabetically by name
- Return HTTP 200 OK

## Post Management

### Post Creation

WHEN a user creates a new post, THE system SHALL:
- Validate that the user is authenticated
- Validate that the user is subscribed to the specified community
- Validate that post has a non-empty title (1-500 characters)
- Validate that post contains one and only one of:
  - text_content (0-10,000 characters)
  - url (valid HTTPS URL)
  - image_url (valid HTTPS URL for image format)
- Validate image_url format (if provided)
- Validate image size ≤ 5MB
- If image_url provided:
  - Fetch image from URL
  - Validate image format
  - Resize to thumbnail (300xauto) and original (1200xauto)
  - Store in cloud storage
  - Generate secure URLs
- Create Post record in Post table with:
  - id
  - title
  - content (text_content, url, or image_url based on type)
  - post_type (text, link, image)
  - community_id
  - author_id
  - vote_score: 0
  - comment_count: 0
  - created_at
  - edited_at: null
  - image_thumb_url (if applicable)
  - image_original_url (if applicable)
  - link_domain (if applicable)
- Return HTTP 201 Created with post details
- Return HTTP 401 Unauthorized if not authenticated
- Return HTTP 403 Forbidden if not subscribed to community
- Return HTTP 400 Bad Request if validation fails

### Post Editing

WHEN a user attempts to edit a post, THE system SHALL:
- Validate that the user is authenticated
- Validate that the user is the author of the post
- Validate that the edit request is made within 15 minutes of creation (timestamp comparison)
- Validate that post title remains 1-500 characters
- Validate that content type remains the same (cannot change post_type)
- If content is updated:
  - If image_url was changed:
    - Validate new image URL format and size
    - Fetch, validate, resize, and store new image
    - Update image URLs
  - If url was changed:
    - Validate new URL format
    - Extract new domain
  - Update Post record with:
    - updated content
    - edited_at timestamp
- Return HTTP 200 OK with updated post
- Return HTTP 401 Unauthorized if not authenticated
- Return HTTP 403 Forbidden if not author of post or 15-minute window expired
- Return HTTP 400 Bad Request if validation fails

### Post Deletion

WHEN a user attempts to delete a post, THE system SHALL:
- Validate that the user is authenticated
- Validate that the user is the author of the post
- Delete the post from Post table
- Delete all associated comments from Comment table (cascade delete)
- Delete all associated post votes from PostVote table
- Decrement comment_count in the associated community (if post had comments)
- Return HTTP 204 No Content
- Return HTTP 401 Unauthorized if not authenticated
- Return HTTP 403 Forbidden if not author of post

## Post Voting

### Post Vote Operations

WHEN a user upvotes a post, THE system SHALL:
- Validate that the user is authenticated
- Validate that the post exists and is not deleted
- Check that the user hasn't already voted on this post
- If user's previous vote was a downvote:
  - Decrement post vote_score by 2 (remove -1, add +1)
  - Update previous vote record in PostVote table from -1 to +1
- If user's previous vote was none:
  - Increment post vote_score by 1
  - Create new PostVote record with userId, postId, vote: +1
- Return HTTP 201 Created
- Return HTTP 401 Unauthorized if not authenticated
- Return HTTP 404 Not Found if post doesn't exist

WHEN a user downvotes a post, THE system SHALL:
- Validate that the user is authenticated
- Validate that the post exists and is not deleted
- Check that the user hasn't already voted on this post
- If user's previous vote was an upvote:
  - Decrement post vote_score by 2 (remove +1, add -1)
  - Update previous vote record in PostVote table from +1 to -1
- If user's previous vote was none:
  - Decrement post vote_score by 1
  - Create new PostVote record with userId, postId, vote: -1
- Return HTTP 201 Created
- Return HTTP 401 Unauthorized if not authenticated
- Return HTTP 404 Not Found if post doesn't exist

WHEN a user removes their vote on a post, THE system SHALL:
- Validate that the user is authenticated
- Validate that the post exists and is not deleted
- Check that the user has previously voted on this post
- If previous vote was +1:
  - Decrement post vote_score by 1
- If previous vote was -1:
  - Increment post vote_score by 1
- Delete the PostVote record for that user
- Return HTTP 204 No Content
- Return HTTP 401 Unauthorized if not authenticated
- Return HTTP 404 Not Found if post doesn't exist
- Return HTTP 403 Forbidden if user hasn't voted on this post

### Vote Display

THE system SHALL display post vote scores as the net score (upvotes minus downvotes).
Vote scores SHALL be displayed with no special formatting (e.g., "42" not "+42" or "42 ups").
Vote score updates shall occur in real time on UI without page refresh.

## Post Feeds

### Home Feed (Authenticated Users Only)

WHEN a logged-in user requests the home feed, THE system SHALL:
- Find all community ids the user is subscribed to
- Query for posts in those communities
- Apply requested sort criteria
- Paginate results with 20 posts per page
- Include user's personal vote status on each post (upvoted, downvoted, or none)
- Return HTTP 200 OK with feed data
- Return HTTP 401 Unauthorized if user is not authenticated

### Popular Feed (Public Access)

WHEN any user (authenticated or not) requests the popular feed, THE system SHALL:
- Query for all posts across all communities
- Apply requested sort criteria
- Paginate results with 20 posts per page
- Do NOT include personal vote status (anonymous users)
- Return HTTP 200 OK with feed data

### Community Feed (Public Access)

WHEN any user requests the feed for a specific community, THE system SHALL:
- Validate that the community exists and is active
- Query for all posts in that community
- Apply requested sort criteria
- Paginate results with 20 posts per page
- Do NOT include personal vote status if user is anonymous
- Return HTTP 200 OK with feed data
- Return HTTP 404 Not Found if community doesn't exist

### Post Sort Algorithms

## Hot Sort

WHEN posts are sorted by "hot":
- Calculate hot_score = log10(max(|vote_score|, 1)) + (created_at timestamp in hours since epoch) / 45000
- Order posts by hot_score descending
- Consider only posts from the last 48 hours

## New Sort

WHEN posts are sorted by "new":
- Order posts by created_at descending
- Include all posts regardless of age

## Top Sort

WHEN posts are sorted by "top":
- Order posts by vote_score descending
- Apply time filter based on parameter:
  - today: posts from last 24 hours
  - this week: posts from last 7 days
  - this month: posts from last 30 days
  - this year: posts from last 365 days
  - all time: all posts

## Controversial Sort

WHEN posts are sorted by "controversial":
- Calculate controversy_score = total_votes * (1 - abs(vote_score) / (total_votes + 1))
- total_votes = upvotes + downvotes
- Order posts by controversy_score descending
- Consider only posts with at least 10 total votes

### Feed Pagination

All feeds SHALL:
- Support offset and limit parameters for pagination
- Default to offset=0 and limit=20 if not specified
- Return next page token or cursor when pagination is required
- Return total count of posts in the feed when requested

## Post List Display

WHEN a post is displayed in any feed list, it SHALL show:
- Title: 500 character limit with ellipsis overflow if longer
- Author username: Link to user profile
- Community name: Link to community feed
- Vote score: Integer value (e.g., "42"); no + suffix
- Comment count: Integer value (e.g., "15 comments")
- Time since posted: Relative timestamp calculation in user's timezone (Asia/Seoul)
- Content preview:
  - For text posts: First 200 characters of content, truncated with ellipsis
  - For image posts: Image thumbnail (300xauto) with alt text containing post title
  - For link posts: Domain name extracted from URL (e.g., "youtube.com", "medium.com")
- Return HTTP 200 OK with proper JSON structure

## Comment System

### Comment Creation

WHEN a user creates a comment on a post or reply to a comment, THE system SHALL:
- Validate that the user is authenticated
- Validate that the target post exists and is not deleted
- Validate that comment content is 1-2000 characters
- Create Comment record in Comment table with:
  - id
  - post_id
  - parent_id (null if top-level)
  - author_id
  - content
  - vote_score: 0
  - created_at
  - edited_at: null
- Increment comment_count in the associated post by 1
- Return HTTP 201 Created with comment details
- Return HTTP 401 Unauthorized if not authenticated
- Return HTTP 404 Not Found if target post doesn't exist
- Return HTTP 400 Bad Request if content validation fails

### Comment Editing

WHEN a user attempts to edit a comment, THE system SHALL:
- Validate that the user is authenticated
- Validate that the user is the author of the comment
- Validate that the edit request is made within 15 minutes of creation (timestamp comparison)
- Validate that content is still 1-2000 characters
- Update Comment record with:
  - updated content
  - edited_at timestamp
- Return HTTP 200 OK with updated comment
- Return HTTP 401 Unauthorized if not authenticated
- Return HTTP 403 Forbidden if not author or 15-minute window expired
- Return HTTP 400 Bad Request if validation fails

### Comment Deletion

WHEN a user attempts to delete a comment, THE system SHALL:
- Validate that the user is authenticated
- Validate that the user is the author of the comment
- Delete the comment from Comment table
- If comment has replies, mark it as "deleted" (content = "[deleted]") but keep comment record
- Decrement comment_count in the associated post by 1
- Return HTTP 204 No Content
- Return HTTP 401 Unauthorized if not authenticated
- Return HTTP 403 Forbidden if not author of comment

## Comment Voting

Comment voting SHALL follow exactly the same rules as post voting:

WHEN a user upvotes a comment: same flow as post upvote
WHEN a user downvotes a comment: same flow as post downvote
WHEN a user removes vote from a comment: same flow as post vote removal

All validation and state management logic is identical.

## Comment Sorting

### Best Sort (default)

WHEN comments are sorted by "best":
- Order comments by vote_score descending
- For comments with equal votes, order by created_at descending (newest first)
- Include nested replies with depth-first traversal

### New Sort

WHEN comments are sorted by "new":
- Order comments by created_at descending (newest first)
- Include nested replies with depth-first traversal

### Controversial Sort

WHEN comments are sorted by "controversial":
- Calculate controversy_score = total_votes * (1 - abs(vote_score) / (total_votes + 1))
- total_votes = upvotes + downvotes
- Order comments by controversy_score descending
- For comments with equal controversy_score, order by created_at descending
- Consider only comments with at least 5 total votes

## Community Moderation

### Moderator Role Architecture

A community SHALL have exactly one owner.
A community SHALL have zero or more moderators.

The owner SHALL be the user who created the community.

The owner SHALL automatically have all moderator permissions.

Moderators SHALL inherit all permissions from the community owner except:
- Cannot create new communities
- Cannot remove other moderators or the owner
- Cannot delete the community
- Cannot edit community settings (name, description, icon)

### Moderator Assignment

WHEN an owner adds a moderator, THE system SHALL:
- Validate that the user is authenticated and is the owner of the community
- Validate that the target user is a member (not already a moderator or owner)
- Verify that the target user exists and is not deleted
- Create a record in Moderator table with:
  - userId
  - communityId
  - added_by (owner user id)
  - added_at
- Assign all moderator permissions to the user
- Return HTTP 201 Created
- Return HTTP 401 Unauthorized if not owner
- Return HTTP 404 Not Found if community or user doesn't exist
- Return HTTP 409 Conflict if target user is already a moderator or owner

WHEN an owner removes a moderator, THE system SHALL:
- Validate that the user is authenticated and is the owner of the community
- Validate that the moderator exists in the community
- Delete the record from Moderator table
- Revoke all moderator permissions from the user
- Return HTTP 204 No Content
- Return HTTP 401 Unauthorized if not owner
- Return HTTP 404 Not Found if moderator record doesn't exist

### Moderator Actions

WHEN a moderator deletes a post, THE system SHALL:
- Validate that the user is authenticated and has moderator privileges in the post's community
- Delete the post and all associated comments
- Delete all associated votes
- Decrement comment_count in the community
- Record moderation action in ModerationLog table
- Return HTTP 204 No Content
- Return HTTP 403 Forbidden if moderator doesn't have permission

WHEN a moderator deletes a comment, THE system SHALL:
- Validate that the user is authenticated and has moderator privileges in the comment's post's community
- Delete the comment and all its replies
- Decrement comment_count in the associated post
- Record moderation action in ModerationLog table
- Return HTTP 204 No Content
- Return HTTP 403 Forbidden if moderator doesn't have permission

WHEN a moderator bans a user from a community, THE system SHALL:
- Validate that the user is authenticated and has moderator privileges
- Validate that the target user exists and is not already banned
- Create a Ban record in BanTable:
  - userId
  - communityId
  - banned_by (moderator id)
  - reason (optional)
  - banned_at
  - expires_at (null for permanent, date for temporary)
- Prevent the user from creating posts or comments in the community
- Return HTTP 201 Created
- Return HTTP 401 Unauthorized
- Return HTTP 403 Forbidden if no moderator permissions
- Return HTTP 404 Not Found if user or community doesn't exist
- Return HTTP 409 Conflict if already banned

WHEN a moderator unbans a user from a community, THE system SHALL:
- Validate that the user is authenticated and has moderator privileges
- Validate that the target user is currently banned from the community
- Delete the Ban record
- Restore the user's ability to create posts and comments in the community
- Return HTTP 204 No Content
- Return HTTP 401 Unauthorized
- Return HTTP 403 Forbidden if no moderator permissions
- Return HTTP 404 Not Found if user is not banned

WHEN a moderator views the banned users list for their community, THE system SHALL:
- Validate that the user is authenticated and has moderator privileges
- Query for all Ban records for the community
- Return list with: userId, username, banned_at, expires_at, banned_by, reason
- Return HTTP 200 OK
- Return HTTP 403 Forbidden if unauthorized

### User Ban Effects

WHEN a user is banned from a community, the system SHALL:
- Prevent the user from creating new posts in that community (return 403 Forbidden)
- Prevent the user from creating new comments in that community (return 403 Forbidden)
- Allow the user to view all content in the community
- Allow the user to see list of posts and comments
- Allow the user to view community information and subscribe
- Allow the user to view their own karma score
- Allow the user to read but not write

When a user is unbanned, all restrictions are immediately removed.

## Reporting System

### Report Creation

WHEN a user reports a post or comment, THE system SHALL:
- Validate that the user is authenticated
- Validate that the target content exists and is active
- Validate that the reason text is 1-200 characters
- Create a Report record in Report table with:
  - targetId (post_id or comment_id)
  - targetType ("post" or "comment")
  - reported_by_id
  - reason
  - reported_at
  - status: "pending"
- Return HTTP 201 Created
- Return HTTP 401 Unauthorized if not authenticated
- Return HTTP 404 Not Found if target doesn't exist
- Return HTTP 400 Bad Request if reason too short or too long
- Prevent duplicate reports from same user on same content

### Report Review

WHEN a moderator views report list for their community, THE system SHALL:
- Validate that the user is authenticated and has moderator privileges
- Query for all pending reports where:
  - targetId is in a post or comment belonging to the community
  - status = "pending"
- Return list with:
  - report_id
  - target_id
  - target_type
  - reporter_username
  - reason
  - target_preview (content or title)
  - reported_at
- Return HTTP 200 OK
- Return HTTP 403 Forbidden if unauthorized

WHEN a moderator approves a report, THE system SHALL:
- Validate that the user is authenticated and has moderator privileges
- Validate that the report exists and is in "pending" status
- If target is a post:
  - Delete the post and all associated comments
  - Delete all associated votes
  - Update post in database to "deleted" state (soft delete)
- If target is a comment:
  - Delete the comment and all its replies
  - Update comment in database to "deleted" state (soft delete)
- Update report status to "approved"
- Record moderation action in ModerationLog table
- Return HTTP 200 OK
- Return HTTP 403 Forbidden if unauthorized
- Return HTTP 404 Not Found if report doesn't exist

WHEN a moderator dismisses a report, THE system SHALL:
- Validate that the user is authenticated and has moderator privileges
- Validate that the report exists and is in "pending" status
- Update report status to "dismissed"
- Remove report from active report list
- Return HTTP 200 OK
- Return HTTP 403 Forbidden if unauthorized
- Return HTTP 404 Not Found if report doesn't exist

### Report Display

Reports SHALL be visible ONLY to moderators of the relevant community.
Reports SHALL be visible ONLY to users who reported them (their own reports).
Reports SHALL not be visible to other users.

Report status shall be "pending", "approved", or "dismissed".

All report records shall be retained in database indefinitely for audit purposes.

## System-wide Requirements

### Response Format

All API responses SHALL be returned in JSON format with consistent structure:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2026-01-30T16:15:46.099Z"
}
```

When there is an error:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  },
  "timestamp": "2026-01-30T16:15:46.099Z"
}
```

### Error Codes

All error codes SHALL follow format: [MODULE]_[DESCRIPTION]
Examples:
- AUTH_INVALID_CREDENTIALS
- COMMUNITY_NAME_EXISTS
- POST_NOT_AUTHOR
- COMMENT_TOO_LONG

### Time Zones

All timestamps SHALL be stored and processed in UTC.
All UI displays SHALL convert to user's local timezone (Asia/Seoul).

### Security Requirements

All endpoints SHALL require authentication except for public feed views.
All requests SHALL use HTTPS.
All API keys SHALL not be exposed in client-side code.
All sensitive data SHALL be encrypted at rest.
All passwords SHALL be hashed with bcrypt.
All authentication tokens SHALL be securely stored (refresh tokens in database)
All images SHALL be validated for format, size, and content.
All URLs SHALL be validated for protocol and domain safety.

### Performance Requirements

- Feed loading time shall be < 500ms for 20 items
- Profile loading time shall be < 300ms
- Comment threading shall render within 1s for 50 levels
- Karma calculations shall update in < 200ms
- Database queries shall be indexed on frequent search fields

### Analytics

- Track number of registered users daily
- Track number of active users daily
- Track community creation rate
- Track top 10 most popular communities
- Track report approval rate
- Track average karma per user

### Admin Dashboard Requirements

- View total users, posts, comments
- View top moderators by actions
- View top reported content
- Export anonymized user data
- View all reports across the platform
- View all bans across the platform
- View system health metrics

### Backup Policy

- Daily encrypted database backups
- Hourly transaction log backups
- 30-day retention
- Backup stored in encrypted separate storage
- Recovery tested monthly

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*