# Reddit-like Community Platform Requirements Specification

## User Account

WHEN a user attempts to sign up, THE system SHALL require the following fields: email address, password, and unique username.
WHEN a user submits a sign-up request, THE system SHALL validate the email format, password strength (minimum 8 characters, one uppercase, one number), and username uniqueness.
WHEN a username is already taken, THE system SHALL respond with HTTP 409 Conflict and error code "USERNAME_TAKEN".
WHEN an email is already registered, THE system SHALL respond with HTTP 409 Conflict and error code "EMAIL_REGISTERED".
WHERE the sign-up request is successful, THE system SHALL create a new user account with status "active" and assign a default karma score of 0.

WHEN a user attempts to log in, THE system SHALL require email and password.
WHEN login credentials are valid, THE system SHALL issue a JWT token containing user ID, username, and role "member".
WHEN login credentials are invalid, THE system SHALL respond with HTTP 401 Unauthorized and error code "INVALID_CREDENTIALS".
WHEN a user is locked out due to excessive failed attempts, THE system SHALL respond with HTTP 423 Locked and error code "ACCOUNT_LOCKED".

WHEN a user requests to change their password, THE system SHALL require the current password and new password.
WHEN the current password is incorrect, THE system SHALL reject the request with HTTP 403 Forbidden and error code "INCORRECT_CURRENT_PASSWORD".
WHEN the new password does not meet strength requirements, THE system SHALL respond with HTTP 400 Bad Request and error code "WEAK_PASSWORD".
WHEN the password change is successful, THE system SHALL revoke all existing session tokens and require re-authentication.

WHEN a user requests to delete their account, THE system SHALL require password confirmation.
WHEN the password is confirmed, THE system SHALL mark the user's account status as "deleted" and set deletedAt to the current timestamp.
WHEN a user account is deleted, THE system SHALL CASCADE delete ALL posts, comments, and karma records associated with that user.
WHEN a user attempts to access a deleted account, THE system SHALL respond with HTTP 404 Not Found.

## User Profile

WHEN a user profile is displayed, THE system SHALL show the following attributes:
- display name (editable)
- bio text (editable)
- avatar image URL (editable)
- total karma score (calculated)
- list of all posts created by the user
- list of all comments written by the user

WHEN a user edits their profile, THE system SHALL validate that the display name is not empty and does not exceed 50 characters.
WHEN a user uploads an avatar image, THE system SHALL accept JPG, PNG, or GIF formats up to 5MB.
WHEN an avatar is successfully uploaded, THE system SHALL generate a thumbnail version (200x200) and store both originals.
WHEN a profile is viewed by another user, THE system SHALL hide the user's email address and creation date.

WHEN a user profile page is loaded, THE system SHALL load the following data in a single query:
- profile metadata (display name, bio, avatar)
- aggregated karma score
- paginated list of user posts (first page)
- paginated list of user comments (first page)

WHEN the profile's karma score is displayed, THE system SHALL calculate it as the sum of all upvotes minus downvotes on the user's posts and comments.

## Karma

WHEN a user upvotes a post, THE system SHALL increment the post's vote score by 1 and increment the post's author's karma score by 1.
WHEN a user downvotes a post, THE system SHALL decrement the post's vote score by 1 and decrement the post's author's karma score by 1.
WHEN a user removes a vote from a post, THE system SHALL reduce the vote score by 1 if a previous upvote existed, or increase it by 1 if a previous downvote existed, and adjust the author's karma accordingly.

WHEN a user upvotes a comment, THE system SHALL increment the comment's vote score by 1 and increment the comment's author's karma score by 1.
WHEN a user downvotes a comment, THE system SHALL decrement the comment's vote score by 1 and decrement the comment's author's karma score by 1.
WHEN a user removes a vote from a comment, THE system SHALL reduce the vote score by 1 if a previous upvote existed, or increase it by 1 if a previous downvote existed, and adjust the author's karma accordingly.

WHEN a user's karma score is displayed on their profile, THE system SHALL show the sum of all karma adjustments from posts and comments.

WHEN a user has a negative karma score, THE system SHALL display the negative number with a minus sign.

THE system SHALL NOT impose any minimum or maximum bound on karma scores.

## Communities

WHEN a user creates a community, THE system SHALL require: community name (unique), description (up to 500 characters), and icon image.
WHEN a community name is already taken, THE system SHALL respond with HTTP 409 Conflict and error code "COMMUNITY_NAME_TAKEN".
WHEN a community is successfully created, THE system SHALL set the creator as owner and assign default permissions.
WHEN a community icon is uploaded, THE system SHALL accept JPG, PNG, or GIF formats up to 2MB and generate a thumbnail (100x100).

WHEN a user browses communities, THE system SHALL return a paginated list ordered by subscriber count descending.
WHEN a user searches for communities, THE system SHALL support partial matching of community names (case-insensitive).
WHEN a community is displayed in a list, THE system SHALL show: name, description preview (first 100 characters), icon, and subscriber count.

WHEN a user views a specific community, THE system SHALL display: name, full description, icon, owner username, and total subscribers.

## Subscribing

WHEN a user subscribes to a community, THE system SHALL validate that the user is not already subscribed.
WHEN subscription is successful, THE system SHALL increment the community's subscriber count by 1 and add the user to the community's subscription list.

WHEN a user unsubscribes from a community, THE system SHALL validate that the user is currently subscribed.
WHEN unsubscription is successful, THE system SHALL decrement the community's subscriber count by 1 and remove the user from the community's subscription list.

WHEN a user attempts to create a post in a community, THE system SHALL validate that they are subscribed to that community.
IF unauthenticated, THE system SHALL reject post creation with HTTP 401.
IF subscribed, THE system SHALL allow post creation.
IF not subscribed, THE system SHALL reject the request with HTTP 403 Forbidden and error code "NOT_SUBSCRIBED".

WHEN a user views their subscribed communities, THE system SHALL return a list of all communities they are subscribed to, ordered by most recent interaction.

## Posts

WHEN a user creates a post, THE system SHALL require a title (maximum 300 characters) and one of three content types:
- Text post: requires plain text content (up to 10,000 characters)
- Link post: requires a valid URL (schema: http/https)
- Image post: requires an uploaded image (JPG, PNG, GIF, up to 10MB)

WHEN a post is created, THE system SHALL associate it with: author, community, creation timestamp, and content type.
WHEN a post is successfully created, THE system SHALL initialize its vote score to 0 and comment count to 0.

WHEN a user edits their own post, THE system SHALL validate:
- The user is the post's author
- The post is not deleted
- The post is not in a community where the user is banned
WHEN validation passes, THE system SHALL update the post's data and set updatedAt timestamp.

WHEN a user deletes their own post, THE system SHALL set the post's status to "deleted" and store deletedAt timestamp.
WHEN a post is deleted, THE system SHALL preserve the post's content for moderation review but hide it from feeds.

WHEN a user views a single post, THE system SHALL display:
- Title
- Full content based on type (text, link, or image)
- Author username
- Community name
- Vote score
- Comment count
- Timestamp of creation

## Post Voting

WHEN a user votes on a post, THE system SHALL validate:
- The user is authenticated
- The post exists and is not deleted
- The user has not already voted on this post

WHEN a user upvotes a post, THE system SHALL:
- Add a new upvote record with userId and postId
- Increment the post's vote score by 1
- Increment the post's author's karma score by 1

WHEN a user downvotes a post, THE system SHALL:
- Add a new downvote record with userId and postId
- Decrement the post's vote score by 1
- Decrement the post's author's karma score by 1

WHEN a user changes their vote from upvote to downvote, THE system SHALL:
- Delete the existing upvote record
- Add a new downvote record
- Decrement the post's vote score by 2 (remove +1, add -1)
- Decrement the post's author's karma score by 2 (remove +1, add -1)

WHEN a user changes their vote from downvote to upvote, THE system SHALL:
- Delete the existing downvote record
- Add a new upvote record
- Increment the post's vote score by 2 (remove -1, add +1)
- Increment the post's author's karma score by 2 (remove -1, add +1)

WHEN a user removes their vote entirely, THE system SHALL:
- Delete their existing vote record (up or down)
- Adjust the post's vote score by -1 if it was an upvote, or +1 if it was a downvote
- Adjust the post's author's karma score accordingly

WHEN a user attempts to vote on a post they are banned from, THE system SHALL respond with HTTP 403 Forbidden and error code "BANNED_FROM_COMMUNITY".

## Post Feeds

WHEN viewing the Home Feed, THE system SHALL:
- Display only posts from communities the authenticated user is subscribed to
- Require authentication (HTTP 401 if not logged in)
- Apply selected sort order and pagination

WHEN viewing the Popular Feed, THE system SHALL:
- Display posts from all communities on the platform
- Be accessible to logged-out users
- Apply selected sort order and pagination

WHEN viewing the Community Feed, THE system SHALL:
- Display posts from a single, specified community
- Be accessible to logged-out users
- Apply selected sort order and pagination

WHEN applying sort order, THE system SHALL support:
- "Hot": Score = (upvotes - downvotes) / ((hours since created) + 2)^(1.8) → Sort descending
- "New": Sort by creation timestamp descending
- "Top": Sort by vote score descending, with optional time filters (today, this week, this month, this year, all time)
- "Controversial": Sort by total votes > 10 and abs(score) < (total votes)/4 → Sort by total votes descending

WHEN filtering by "Top", THE system SHALL:
- Include only posts created within the specified time window
- Apply the time filter BEFORE sorting by score

WHEN returning feeds, THE system SHALL:
- Return 20 posts per page
- Support cursor-based pagination with timestamp and postId as cursor
- Avoid duplicate posts across pages

## Post List Display

WHEN displaying a post in any feed list, THE system SHALL show:
- Title (truncated at 100 characters if longer)
- Author username (as link to profile)
- Community name (as link to community)
- Vote score (positive or negative number)
- Comment count (number)
- Time since posted (e.g., "3 hours ago")

IF the post is a text post:
- Display the first 200 characters of content followed by "..."

IF the post is an image post:
- Display a thumbnail (300x200) of the uploaded image

IF the post is a link post:
- Display the domain name of the URL (e.g., "reddit.com", "youtube.com")

WHEN a user hovers over a community or author name, THE system SHALL show a tooltip with full name.

## Comments

WHEN a user creates a comment, THE system SHALL require:
- Valid user authentication
- Content (at least 1 character)
- Parent entity (either a postId or parentCommentId)

WHEN a comment is created on a post, THE system SHALL set parentId to the postId and topParentId to the postId.
WHEN a comment is created as a reply to another comment, THE system SHALL set parentId to the parentCommentId and topParentId to the original post's postId.

WHEN a comment is edited, THE system SHALL validate:
- User is authenticated
- User is the comment author
- Comment was not deleted by moderator

WHEN a comment is deleted, THE system SHALL set status to "deleted" and store deletedAt timestamp.

WHEN a comment is viewed, THE system SHALL display:
- Author username
- Content
- Vote score (upvotes - downvotes)
- Time since posted
- Number of direct replies
- Reply button (if authenticated)

WHEN a user loads a post's comment thread, THE system SHALL support unlimited depth of replies.

## Comment Voting

WHEN a user votes on a comment, THE system SHALL follow identical logic as Post Voting:
- One vote per user per comment
- Can upvote, downvote, change vote, or remove vote
- Vote score updates = upvote - downvote
- Author karma updates with each vote change
- Vote records stored per user-comment pair
- Votes are atomic operations

WHEN a user removes their vote on a comment, THE system SHALL:
- Delete their vote record
- Adjust the comment's vote score by -1 or +1 depending on original vote
- Adjust the comment's author's karma score accordingly

## Comment Sorting

WHEN displaying comment threads, THE system SHALL support three sort options:

"Best":
- Order comments by vote score descending
- Apply recursively to all reply threads

"New":
- Order comments by creation timestamp descending
- Apply recursively to all reply threads

"Controversial":
- Order comments by total votes > 5 AND absolute score < (total votes)/3
- Among qualifying comments, sort by total votes descending
- Apply recursively to all reply threads

WHEN a comment thread is sorted, THE system SHALL load all nested replies in a single efficient database query using a depth-first traversal approach.

## Community Moderation

WHEN a community owner adds a moderator, THE system SHALL:
- Accept user ID to promote
- Validate the user is not already a moderator
- Validate the user is a member of the community
- Assign role "moderator" with permissions in that community
- Notify the new moderator

WHEN a community owner removes a moderator, THE system SHALL:
- Remove moderator role from user
- Preserve all audit history
- Notify the removed moderator

WHEN a moderator adds another moderator, THE system SHALL:
- Allow this operation if the actor is already a moderator
- Validate the target user is a community member
- Validate the target user is not already a moderator
- Assign role "moderator"
- Notify the new moderator

WHEN a moderator attempts to remove a moderator, THE system SHALL:
- Reject the request with HTTP 403 Forbidden
- Log the attempted action for audit

WHEN a moderator attempts to remove the owner, THE system SHALL:
- Reject the request with HTTP 403 Forbidden
- Log the attempted action for audit

WHEN a moderator deletes a post, THE system SHALL:
- Set the post's status to "deleted"
- Store the moderator ID and deletion reason as metadata
- Preserve the original content for audit

WHEN a moderator deletes a comment, THE system SHALL:
- Set the comment's status to "deleted"
- Store the moderator ID and deletion reason as metadata
- Preserve the original content for audit

WHEN a moderator bans a user from a community, THE system SHALL:
- Record the ban in the community's banned_users list
- Set bannedAt timestamp
- Set banReason (required)
- Block the user from creating new posts or comments in that community
- Preserve user's existing posts and comments but hide them from feed

WHEN a moderator unbans a user from a community, THE system SHALL:
- Remove the user from the banned_users list
- Restore user's ability to post and comment
- Preserved posts/comments remain visible

WHEN a moderator views banned users, THE system SHALL return a list with:
- Username
- Ban date
- Ban reason
- List of posts/comments hidden by ban

WHEN a banned user attempts to create a post in a community they are banned from, THE system SHALL:
- Reject the request with HTTP 403 Forbidden and error code "BANNED_FROM_COMMUNITY"

WHEN a banned user attempts to comment in a community they are banned from, THE system SHALL:
- Reject the request with HTTP 403 Forbidden and error code "BANNED_FROM_COMMUNITY"

WHEN a user views a community's mod page, THE system SHALL display:
- Owner username
- List of moderators
- List of banned users
- Moderator action logs (optional)

## Reporting

WHEN a user reports a post or comment, THE system SHALL require:
- Authentication
- A reason (text, min 5 characters, max 500)
- The target entity ID (postId or commentId)

WHEN a report is submitted, THE system SHALL:
- Create a report record in the database
- Store: reporter ID, target ID, target type (post/comment), reason, timestamp
- Set status to "pending"
- Notify moderators of the community the target belongs to

WHEN a moderator views reports for their community, THE system SHALL display:
- Reported content (preview)
- Report reason
- Reporter username (optional)
- Target type and timestamp
- Status (pending, approved, dismissed)
- Action buttons: "Approve" and "Dismiss"

WHEN a moderator approves a report, THE system SHALL:
- Set report status to "approved"
- Delete the reported content (post or comment) by setting status to "deleted"
- Record the moderator ID and time of approval
- Notify the reporter: "Your report has been acted upon."

WHEN a moderator dismisses a report, THE system SHALL:
- Set report status to "dismissed"
- Leave the content unchanged
- Record the moderator ID and time of dismissal
- Notify the reporter: "Your report has been dismissed."

WHEN a user views their own reports, THE system SHALL show:
- Status (pending, approved, dismissed)
- Target content type
- Reason provided
- Timestamp
- Moderator response message (if available)

WHEN a report is approved, THE system SHALL:
- Recalculate karma of the author of the deleted content
- Ensure related comments or posts are properly invalidated in feeds

WHEN a report is dismissed, THE system SHALL:
- Archive the report after 30 days
- Not display it in moderator dashboard by default

THE system SHALL NOT show reporter identities to anyone except system administrators.

THE system SHALL NOT display reports to users who are not moderators of the relevant community.

THE system SHALL prevent users from reporting content they have already reported within the last 24 hours.

## Data Integrity and Performance

THE system SHALL enforce referential integrity between:
- User and posts
- User and comments
- Posts and comments
- Communities and posts
- Communities and users

THE system SHALL use database transactions to ensure:
- Atomic voting and karma updates
- Consistent deletion of posts and associated comments
- Accurate subscriber count updates

THE system SHALL optimize for response times:
- Feed loads: < 1s for 20 items
- Profile loads: < 1.5s with nested content
- Comment threads: < 2s for 500 comments with 5 levels
- Vote operations: < 300ms
- Report processing: < 500ms

THE system SHALL cache frequently accessed data:
- User profiles
- Community metadata
- Feed results (15 minute TTL)

THE system SHALL use Elasticsearch for:
- Community search by name
- Post search by keywords (if extended in future)

THE system SHALL maintain audit logs for:
- Deleted content
- Moderator actions
- Account deletion
- Report actions

THE system SHALL generate audit log entries with:
- Timestamp
- Actor ID
- Action
- Target ID
- Before state
- After state
- Reason (if provided)

## Authentication and Security

THE system SHALL use JWT for authentication.

THE system SHALL include in JWT payload:
- userId (string)
- username (string)
- role ("user", "moderator" or "owner")
- communityRoles (Map<communityId, role>)
- exp (expiration time)

THE system SHALL validate all API requests:
- For profile access: verify authenticated user or public access
- For post creation: verify subscription status
- For post editing: verify authorship
- For comment editing: verify authorship
- For vote operations: verify non-banned status and single vote
- For moderator actions: verify authority level

THE system SHALL block all direct database access from client applications.

THE system SHALL encrypt all PII (email, passwords) at rest and in transit.

THE system SHALL rate-limit:
- Authentication attempts: 5 per minute
- Comment submissions: 10 per minute
- Post submissions: 5 per minute
- Report submissions: 3 per minute

THE system SHALL support OAuth2 for future third-party login integration.
