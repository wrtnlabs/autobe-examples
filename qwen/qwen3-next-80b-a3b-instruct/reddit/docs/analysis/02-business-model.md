# Reddit-like Community Platform - Requirements Specification

## User Account System

### Registration
WHEN a user attempts to register, THE system SHALL require the following information:
- A valid email address (format: local-part@domain)
- A password with minimum 8 characters (at least one number and one symbol)
- A unique username (alphanumeric, underscores, 3-30 characters)

WHEN a user submits registration data, THE system SHALL:
- Validate email format using standard RFC 5322 validation
- Check if email already exists in the system
- Check if username already exists in the system
- Hash password using bcrypt with cost factor 12
- Create user account with default karma value of 0
- Generate JWT access and refresh tokens
- Send verification email with 24-hour expiration link
- Return HTTP 201 Created with user ID and token

IF the email already exists, THEN THE system SHALL return HTTP 409 Conflict with error code EMAIL_EXISTS

IF the username already exists, THEN THE system SHALL return HTTP 409 Conflict with error code USERNAME_EXISTS

IF the password is less than 8 characters, THEN THE system SHALL return HTTP 400 Bad Request with error code PASSWORD_TOO_SHORT

IF the username contains invalid characters, THEN THE system SHALL return HTTP 400 Bad Request with error code USERNAME_INVALID_CHARS

WHILE a user account is unverified, THE system SHALL prevent login and content creation

### Login
WHEN a user attempts to log in, THE system SHALL:
- Accept email and password as credentials
- Find user by email address
- Verify password hash against provided password
- If successful, issue JWT access token (15-minute expiration) and refresh token (7-day expiration)
- Return HTTP 200 OK with authentication token and user profile summary (id, username, display_name, karma)

IF the email does not exist, THEN THE system SHALL return HTTP 401 Unauthorized with error code AUTH_INVALID_CREDENTIALS

IF the password does not match, THEN THE system SHALL return HTTP 401 Unauthorized with error code AUTH_INVALID_CREDENTIALS

IF the account is unverified, THEN THE system SHALL return HTTP 403 Forbidden with error code ACCOUNT_UNVERIFIED

WHEN a user successfully logs in, THE system SHALL update last_login field to current timestamp

### Password Change
WHEN a user requests to change their password, THE system SHALL:
- Require current password for authentication
- Require new password to be at least 8 characters long
- Require new password to differ from current password
- Hash new password using bcrypt with cost factor 12
- Update password_hash field in user record
- Invalidate all existing sessions
- Send password change confirmation email

IF the current password is incorrect, THEN THE system SHALL return HTTP 401 Unauthorized with error code AUTH_INVALID_CURRENT_PASSWORD

IF the new password matches the current password, THEN THE system SHALL return HTTP 400 Bad Request with error code PASSWORD_SAME_AS_CURRENT

IF the new password is less than 8 characters, THEN THE system SHALL return HTTP 400 Bad Request with error code PASSWORD_TOO_SHORT

### Account Deletion
WHEN a user requests account deletion, THE system SHALL:
- Require password confirmation for user authentication
- Immediately delete all user posts and comments
- Remove user from all community subscriptions
- Clear user profile data (display name, bio, avatar)
- Set username to 'deleted_user_###' (unique)
- Set email to 'deleted_###@example.com'
- Set karma to 0
- Mark account as deleted in database
- Return HTTP 200 OK upon successful deletion

WHILE an account is marked as deleted, THE system SHALL prevent any login attempts

WHEN another user attempts to register with an already-deleted username, THE system SHALL:
- Allow registration with the username
- Reclaim username from deleted account namespace

## User Profile System

### Profile Attributes
THE user profile SHALL contain the following attributes:
- display_name: Free-form text (2-50 characters)
- bio: Free-form text (max 500 characters)
- avatar: Image file URL (PNG, JPG, GIF; max 2MB)
- karma: Integer (calculated by system)
- username: Unique alphanumeric identifier (fixed after registration)
- created_at: ISO 8601 timestamp

WHEN a user profile is displayed to another user, THE system SHALL show only:
- display_name
- bio
- avatar
- karma
- username

WHEN a user views their own profile, THE system SHALL also show:
- created_at
- email (masked: a***@domain.com)
- last_login
- account_verified
- account_deleted status

### Profile Editing
WHEN a user edits their profile, THE system SHALL authorize the request only if:
- The request contains a valid JWT token for the user
- The user ID in the JWT matches the target profile ID

THE system SHALL accept edits to:
- display_name (2-50 characters, alphanumeric, underscore, space only)
- bio (0-500 characters)
- avatar (image file upload)

WHEN a user uploads a new avatar, THE system SHALL:
- Validate that the file is image format (PNG, JPG, GIF)
- Validate file size ≤ 2MB
- Generate unique filename with UUID
- Store file in cloud storage (S3-compatible)
- Generate URL for access
- Update avatar field in user record

WHEN a user updates display_name or bio, THE system SHALL:
- Validate character limits
- Strip HTML tags and executable scripts
- Escape special characters to prevent XSS
- Update the corresponding fields in user profile

IF the display_name exceeds 50 characters, THEN THE system SHALL return HTTP 400 Bad Request with error code DISPLAY_NAME_TOO_LONG

IF the display_name contains invalid characters (not alphanumeric, underscore, space), THEN THE system SHALL return HTTP 400 Bad Request with error code DISPLAY_NAME_INVALID_CHARS

IF the bio exceeds 500 characters, THEN THE system SHALL return HTTP 400 Bad Request with error code BIO_TOO_LONG

IF the avatar file exceeds 2MB, THEN THE system SHALL return HTTP 400 Bad Request with error code AVATAR_TOO_LARGE

IF the avatar file is not a supported image format, THEN THE system SHALL return HTTP 400 Bad Request with error code AVATAR_INVALID_FORMAT

### Profile Viewing
WHEN any user (authenticated or guest) requests a user profile, THE system SHALL:
- Return profile data for the specified username
- If username does not exist, return HTTP 404 Not Found
- Return avatar image URL as a standard HTTP endpoint

WHEN a user requests their own profile, THE system SHALL return full data including metadata

WHEN a user requests another user's profile, THE system SHALL return only:
- display_name
- bio
- avatar
- karma
- username
- created_at

## Karma System

### Karma Calculation Rules
THE system SHALL maintain a single, cumulative karma score for each user.

WHEN a user upvotes any post or comment, THE system SHALL increase the author's karma score by 1.

WHEN a user downvotes any post or comment, THE system SHALL decrease the author's karma score by 1.

WHEN a user removes their vote from a post or comment, THE system SHALL reverse the karma impact of that vote.

THE karma score SHALL be calculated as the sum of all vote impacts from all posts and comments across the entire platform.

THE karma score SHALL be a single integer value per user, not calculated separately per community.

WHILE a user account exists, THE system SHALL preserve the user's karma score.

### Vote Impact
WHEN a user submits an upvote to a post or comment, THE system SHALL increase the author's karma score by 1.

THE system SHALL not apply any additional karma adjustment beyond +1 for upvotes.

WHEN a user upvotes multiple posts or comments, EACH upvote SHALL contribute +1 to the respective authors' karma scores.

If a user upvotes 10 posts authored by 10 different users, EACH of those 10 users SHALL receive +1 karma.

WHEN a user submits a downvote to a post or comment, THE system SHALL decrease the author's karma score by 1.

THE system SHALL not apply any additional karma adjustment beyond -1 for downvotes.

WHEN a user downvotes multiple posts or comments, EACH downvote SHALL contribute -1 to the respective authors' karma scores.

If a user downvotes 7 comments authored by 7 different users, EACH of those 7 users SHALL receive -1 karma.

### Vote Removal
WHEN a user removes their upvote from a post or comment, THE system SHALL decrease the author's karma score by 1.

WHEN a user removes their downvote from a post or comment, THE system SHALL increase the author's karma score by 1.

WHEN a user changes their vote from upvote to downvote, THE system SHALL first remove the +1 karma (reversing the upvote) and then apply the -1 karma (applying the downvote), for a net change of -2.

WHEN a user changes their vote from downvote to upvote, THE system SHALL first remove the -1 karma (reversing the downvote) and then apply the +1 karma (applying the upvote), for a net change of +2.

### Negative Karma Policy
THE system SHALL permit user karma scores to be negative.

WHEN a user's total downvotes exceed their total upvotes, THE system SHALL display a negative karma score.

THE system SHALL not apply any minimum value to karma scores—scores are not clamped to zero.

WHILE a user's karma score is negative, THE system SHALL not restrict any user actions.

THE karma score SHALL have no effect on user permissions, access, or functionality.

A user with -50 karma SHALL have the same rights and privileges as a user with +50 karma.

### Karma Display
WHEN displaying a user's profile, THE system SHALL show their total karma score as a single integer.

THE karma score SHALL appear in the user profile section alongside the display name, bio, and avatar.

THE system SHALL render the karma score as plain text: "Karma: [score]" where [score] is the numerical value.

IF the karma score is negative, THE system SHALL render it with a minus sign (e.g., "Karma: -8").

WHEN displaying a post or comment, THE system SHALL NOT display the karma score of the author.

WHEN rendering the post list in any feed (Home, Popular, Community), THE system SHALL NOT display the author's karma score.

THE system SHALL display the user's karma score ONLY on their own profile page.

## Community Management

### Community Creation
WHEN a member attempts to create a community, THE system SHALL allow the action if the member has completed email verification.

WHEN a guest attempts to create a community, THE system SHALL deny the request and prompt login.

WHEN a member creates a community, THE system SHALL assign them as the community owner automatically.

WHEN creating a community, THE system SHALL require the following information:
- Unique community name (lowercase alphanumeric with dashes, max 50 characters)
- Description text (max 500 characters)
- Optional icon image (JPEG, PNG, up to 5MB)

IF the community name is not unique, THEN THE system SHALL return error code COMMUNITY_NAME_TAKEN.

IF the community name contains invalid characters, THEN THE system SHALL return error code COMMUNITY_NAME_INVALID.

WHEN a community is successfully created, THE system SHALL:
- Create a new community record with the provided details
- Assign the creator as the owner with full administrative rights
- Add the creator as the first subscriber
- Initialize the subscriber count to 1

### Community Attributes
THE community SHALL have the following immutable and mutable attributes:
- communityId (unique identifier)
- name (unique, immutable after creation)
- description (mutable)
- iconUrl (immutable unless explicitly updated)
- ownerId (immutable)
- createdDate (immutable)
- subscriberCount (mutable)
- isPublic (always true)

### Name Uniqueness
THE system SHALL enforce unique community names across the entire platform.

WHEN a community name is changed during editing, THE system SHALL validate uniqueness before saving.

IF a claimed community name conflicts with an existing community, THEN THE system SHALL reject the update and return COMMUNITY_NAME_TAKEN.

### Description and Icon
WHILE a community exists, THE system SHALL allow the owner to update the description and icon.

THE system SHALL store the icon as a public URL accessible to all users.

IF no icon is uploaded, THE system SHALL use a default placeholder derived from the community name.

### Subscription Rules
WHEN a member attempts to create a post in a community, THE system SHALL verify that the member is subscribed to that community.

IF the member is not subscribed to the target community, THEN THE system SHALL deny the post creation and return error code NOT_SUBSCRIBED_TO_COMMUNITY.

WHEN a member clicks "Subscribe", THE system SHALL:
- Add the member to the community's subscriber list
- Increment the community's subscriberCount by 1
- Add the community to the member's subscription list

WHEN a member clicks "Unsubscribe", THE system SHALL:
- Remove the member from the community's subscriber list
- Decrement the community's subscriberCount by 1
- Remove the community from the member's subscription list

WHILE a user is subscribed to a community, THE system SHALL grant the following permissions:
- Create posts in the community
- Comment on posts in the community
- Vote on posts and comments in the community
- View all content in the community

WHILE a user is not subscribed to a community, THE system SHALL allow:
- Viewing the community page
- Viewing community posts and comments
- Reading all public content
- Browsing the community list
BUT SHALL deny:
- Creating posts
- Creating comments
- Voting

### Discovery and Search
THE system SHALL provide a community directory that displays:
- All communities ordered alphabetically by name
- Search functionality by community name
- Filter option for "Popular" communities (top 100 by subscriber count)
- Filter option for "New" communities (created in last 7 days)

WHEN a user enters text in the search field, THE system SHALL:
- Return communities where the name contains the search term (case-insensitive)
- Rank results by matching prefix, then substring relevance
- Limit results to 100 matches
- Include the subscriber count alongside each result
- Display "No communities found" if no matches exist

WHEN viewing the community directory, THE system SHALL display for each community:
- Community name
- Description preview (first 150 characters)
- Icon image
- Subscriber count
- Creation date
- Owner username
- "Subscribe" button (if not already subscribed)
- "View" button (to open community feed)

### Subscriber Count Management
THE subscriberCount SHALL be calculated as the total number of users currently subscribed to the community.

THE subscriberCount SHALL not include guests or banned users.

WHEN a user subscribes, THE system SHALL increment the subscriberCount immediately.

WHEN a user unsubscribes, THE system SHALL decrement the subscriberCount immediately.

WHEN a user is banned from a community, THE system SHALL remove them from subscriber count.

WHEN a user is unbanned, THE system SHALL re-add them to subscriber count if their subscription state was active.

THE subscriberCount SHALL be displayed:
- On the community's main page
- In the community directory listing
- In community search results
- Inside the feed listing for each community-tagged post

THE system SHALL cache the subscriberCount for 5 seconds to improve performance.

WHEN a subscription action occurs, THE cache SHALL be invalidated and refreshed immediately.

## Post Management

### Post Types and Structure
THE system SHALL support exactly three post types: text, link, and image.

WHEN a user creates a post, THE system SHALL require exactly one of the following content fields:
- `textContent`: Maximum 10,000 characters (required for text posts)
- `url`: Valid URL format (required for link posts)
- `imageUrl`: Valid CDN-accessible image URL (required for image posts)

WHEN a post is created, THE system SHALL set either `textContent`, `url`, or `imageUrl` as non-null, and set the other two fields as null.

WHEN a post type is image, THE system SHALL validate that `imageUrl` is a publicly accessible image file (JPEG, PNG, GIF, WebP) with a size under 10MB.

THE system SHALL store all post types with the same core metadata: title, authorId, communityId, createdAt, voteScore, commentCount, status (active/banned/deleted).

### Creation Requirements
WHEN a user creates a post, THE system SHALL verify that the user is authenticated (not a guest).

WHEN a user creates a post, THE system SHALL verify that the user is subscribed to the target community.

WHEN a user attempts to create a post in a community they are not subscribed to, THE system SHALL return error code POST_INVALID_COMMUNITY_ACCESS.

WHEN a user creates a post, THE system SHALL validate that the title is not empty and contains at least 3 characters.

WHEN a user creates a post, THE system SHALL validate that the title does not exceed 200 characters.

WHEN a user creates a post, THE system SHALL assign the current timestamp to `createdAt`.

WHEN a user creates a post, THE system SHALL initialize `voteScore` to 0 and `commentCount` to 0.

WHEN a user creates a post, THE system SHALL set the `status` field to "active".

### Edition and Deletion
WHEN a user attempts to edit a post, THE system SHALL verify that the user is the author of the post.

IF a user attempts to edit a post they do not own, THEN THE system SHALL return error code POST_EDIT_PERMISSION_DENIED.

WHEN a user edits a post, THE system SHALL allow modification of the title, content type, and corresponding content field (textContent, url, or imageUrl).

WHEN a user edits a post, THE system SHALL not allow changing the community or author of the post.

WHEN a user edits a post, THE system SHALL timestamp the edit with `updatedAt`.

WHEN a user deletes a post, THE system SHALL verify that the user is the author of the post.

IF a user attempts to delete a post they do not own, THEN THE system SHALL return error code POST_DELETE_PERMISSION_DENIED.

WHEN a user deletes a post, THE system SHALL set the `status` field to "deleted".

WHEN a user deletes a post, THE system SHALL not physically remove the record from the database.

WHEN a post is deleted, THE system SHALL prevent the post from appearing in any feed or public view.

WHEN a post is deleted, THE system SHALL preserve author, community, and content metadata for audit and moderation purposes.

### Visibility Rules
WHEN a post is created, THE system SHALL determine its visibility based on the target community's public access rules.

WHEN a user views a feed, THE system SHALL filter posts using the following rules:
- Home Feed: Only shows active posts from communities the user is subscribed to.
- Popular Feed: Shows all active posts from all communities, regardless of subscription status.
- Community Feed: Shows all active posts from the specified community.

WHEN a post is banned by a moderator, THE system SHALL set the `status` field to "banned".

WHEN a post has status "banned", THE system SHALL hide it from all public feeds and search results.

WHEN a post has status "deleted", THE system SHALL hide it from all public feeds and search results.

WHEN a guest user attempts to view a post, THE system SHALL return the post only if its status is "active".

WHEN a member attempts to view their own deleted post, THE system SHALL still return it to them in "My Posts" view.

WHEN a moderator attempts to view a banned or deleted post, THE system SHALL return it with privilege flag "moderatorViewable".

### Post Lifecycle
WHEN a post is created, THE system SHALL emit an event: PostCreated(authorId, communityId, postId).

WHEN a post is edited, THE system SHALL emit an event: PostUpdated(authorId, postId, updatedAt).

WHEN a post is deleted, THE system SHALL emit an event: PostDeleted(authorId, postId).

WHEN a post is banned, THE system SHALL emit an event: PostBanned(moderatorId, postId, reason).

WHEN a user votes on a post, THE system SHALL update the `voteScore` and trigger karma adjustment for the author.

WHEN the `voteScore` of a post changes, THE system SHALL update the post's ranking in all active feeds.

THE system SHALL prevent any user from creating a post if their account is banned from the target community.

WHEN a community is archived or deleted, THE system SHALL retain all posts from that community with status unchanged and label them as "OrphanedCommunity".

WHEN a user is permanently deleted from the system, THE system SHALL retain the posts they created with authorId nullified and marked as "AuthorDeleted".

THE system SHALL cap the `title` field at 200 UTF-8 characters and trim any exceeding content during creation or edit.

THE system SHALL validate that `url` conforms to RFC 3986 specification.

THE system SHALL validate that `imageUrl` ends with a recognized image extension (.jpg, .jpeg, .png, .gif, .webp).

WHEN a post is accessed for display, THE system SHALL truncate `textContent` to the first 200 characters when rendered in feed lists.

WHEN a link post is displayed in a feed, THE system SHALL extract and display the domain name from the `url` field.

WHEN an image post is displayed in a feed, THE system SHALL serve a 200x200px thumbnail from the `imageUrl` using a cached CDN resizer.

THE system SHALL ensure that post creation, editing, and deletion actions are atomic and transaction-safe to prevent data inconsistency.

THE system SHALL protect against any race conditions during concurrent edits or votes by using database row-level locking.

THE system SHALL log all create, edit, delete, and ban actions in an immutable audit trail with actor ID, timestamp, and IP address.

## Comment System

### Comment Creation
WHEN a user is logged in as a member, THE system SHALL allow the user to create a comment on any post.

WHEN a comment is created, THE system SHALL associate it with the author's userId.

WHEN a comment is created on a post, THE system SHALL record the post Id as the parent entity.

WHEN a comment is created as a reply to another comment, THE system SHALL record the parent comment Id as the reply target.

WHERE a user is not authenticated, THE system SHALL reject comment creation with HTTP 401.

### Reply Hierarchy
WHILE a comment exists, THE system SHALL allow unlimited nesting depth of replies.

WHEN a user replies to a comment, THE system SHALL treat the target comment as the direct parent regardless of its nesting level.

THE system SHALL maintain a hierarchical structure where each comment knows its parent comment Id and optionally its top-level post Id.

WHEN a comment is part of a reply chain, THE system SHALL NOT impose any maximum depth limit on the reply hierarchy.

### Edit and Delete Permissions
IF a user attempts to edit a comment, THEN THE system SHALL validate that the userId in the JWT payload matches the comment’s authorId.

IF a user attempts to delete a comment, THEN THE system SHALL validate that the userId in the JWT payload matches the comment’s authorId.

IF a user attempts to edit or delete a comment that was authored by another user, THEN THE system SHALL reject the request with HTTP 403 Forbidden.

WHERE a moderator is reviewing comments, THE system SHALL allow moderators to delete any comment within communities they moderate, regardless of authorship.

### Comment Visibility and Display
WHEN a comment is displayed in a feed, THE system SHALL show the following properties:
- author username
- comment content
- vote score (upvotes minus downvotes)
- time since posted (e.g., "3 hours ago")
- number of direct replies

WHEN a user views a single post's comment thread, THE system SHALL display all comments and their replies in a nested hierarchy.

THE system SHALL display each reply under its immediate parent comment with visual indentation to indicate nesting level.

### Comment Lifecycle and State Management
WHEN a comment is created, THE system SHALL set its state to "active".

WHEN a comment is deleted by its author, THE system SHALL mark its state as "deleted" and set deletedAt to the current timestamp, but preserve the comment content for audit purposes.

WHEN a moderator deletes a comment, THE system SHALL mark its state as "deleted" and store the moderator's Id and deletion reason in metadata.

WHEN a comment is edited, THE system SHALL retain its original content in an audit log and store the new content under a new version field with updatedAt timestamp.

### Integration with Karma and User Profile Systems
WHEN a user upvotes a comment, THE system SHALL increment the comment’s vote score by 1 and increment the comment’s author’s karma score by 1.

WHEN a user downvotes a comment, THE system SHALL decrement the comment’s vote score by 1 and decrement the comment’s author’s karma score by 1.

WHEN a user removes a vote from a comment, THE system SHALL decrement (if it was an upvote) or increment (if it was a downvote) the comment’s vote score by 1 and adjust the comment’s author’s karma score in the same direction.

WHEN a user’s profile is viewed, THE system SHALL aggregate and display all comments written by the user, including their score and timestamp.

THE system SHALL treat the comment’s author as a user profile entity with the same display name, bio, and avatar as defined in the User Profile System.

### Comment Sorting
WHEN displaying comments, THE system SHALL support the following sorting options:
- "Best": comments with highest vote score appear first
- "New": comments with most recent createdAt timestamp appear first
- "Controversial": comments with total votes > 5 and absolute score < 3 appear first

THE system SHALL apply the selected sort order to the top-level comments and recursively to all sub-reply threads.

### Post-Comment Relationship
WHEN any comment (top-level or reply) is deleted, THE system SHALL NOT delete the parent post.

WHEN a post is deleted, THE system SHALL mark all associated comments and replies as "orphaned" and hide them from feed views, but preserve data for moderation review.

THE system SHALL ensure that comment vote scores are updated atomically with karma adjustments to prevent race conditions.

### Error Conditions
IF a user sends a comment with empty content, THEN THE system SHALL return HTTP 400 with error code "COMMENT_EMPTY_CONTENT".

IF a user attempts to reply to a comment that has been deleted, THEN THE system SHALL return HTTP 404 with error code "PARENT_COMMENT_NOT_FOUND".

IF a user attempts to reply to a comment from a banned community, THEN THE system SHALL return HTTP 403 with error code "COMMUNITY_BANNED".

### Data Integrity Requirements
THE system SHALL ensure that every comment has a valid authorId linked to an existing user.

THE system SHALL ensure that every comment has a valid postId linked to an existing post.

THE system SHALL ensure that a reply comment’s parentCommentId points to an existing comment within the same post.

THE system SHALL enforce referential integrity on comment parent-child relationships via foreign key constraints.

### Performance Expectations
WHEN loading a post’s comment thread with up to 500 comments and 10 levels of nesting, THE system SHALL render all replies in less than 1.5 seconds.

WHEN filtering comments by "Best" or "New", THE system SHALL return the first page of results in under 500 milliseconds.

WHEN a user submits a comment, THE system SHALL acknowledge the submission with a response time under 300 milliseconds.

### Audit Trails
THE system SHALL maintain an immutable audit log for every comment deletion, with fields: deletedAt, deletedBy, reason, originalContentHash.

THE system SHALL maintain an immutable audit log for every comment edit, with fields: editedAt, editedBy, originalVersionHash, newVersion.

## Moderation System

### Community Owner
THE system SHALL designate the first user who creates a community as its owner.

THE owner SHALL have full authority over all moderation actions within their community.

THE system SHALL prevent any moderator from removing or demoting the community owner.

THE system SHALL allow the owner to invite users to become moderators of their community.

THE system SHALL allow the owner to remove any moderator from their community at any time.

### Community Moderator
THE system SHALL define community moderators as users granted moderation privileges by the community owner.

THE system SHALL allow moderators to perform moderation actions but SHALL NOT permit them to remove other moderators.

THE system SHALL allow moderators to be promoted by the owner or by other moderators.

THE system SHALL NOT allow moderators to modify the ownership status of any community.

THE system SHALL ensure that the community owner retains overriding authority over all moderator actions.

### Platform Administrator
THE system SHALL define platform administrators as a separate, non-community-specific role with global authority.

THE system SHALL permit platform administrators to override community moderation decisions.

THE system SHALL allow platform administrators to ban or unban users across all communities.

THE system SHALL allow platform administrators to disable or delete any community.

THE system SHALL ensure that no community owner or moderator can remove or override a platform administrator.

### Moderation Permission Matrix

| Action | Community Owner | Community Moderator | Platform Administrator |
|--------|------------------|----------------------|------------------------|
| Delete any post in community | ✅ | ✅ | ✅ |
| Delete any comment in community | ✅ | ✅ | ✅ |
| Ban a user from community | ✅ | ✅ | ✅ |
| Unban a user from community | ✅ | ✅ | ✅ |
| View list of banned users in community | ✅ | ✅ | ✅ |
| Add a moderator to community | ✅ | ✅ | ✅ |
| Remove a moderator from community | ✅ | ❌ | ✅ |
| Remove the community owner | ❌ | ❌ | ✅ |
| Disable or delete entire community | ❌ | ❌ | ✅ |
| Override moderation decisions in community | ❌ | ❌ | ✅ |

### Ban and Unban Procedures

#### Banning a User
WHEN a moderator or owner performs a ban action on a user, THE system SHALL record the following:
- The user being banned
- The moderator or owner who issued the ban
- The timestamp of the ban
- The reason provided (if any)

THE system SHALL immediately prevent the banned user from:
- Creating new posts in the community
- Writing new comments in the community
- Upvoting or downvoting content in the community

THE system SHALL NOT prevent the banned user from:
- Viewing posts and comments in the community
- Viewing their own previous content
- Accessing other communities
- Editing or deleting their previously approved content

#### Unbanning a User
WHEN a moderator or owner performs an unban action on a user, THE system SHALL:
- Remove all ban records associated with the user in that community
- Restore the user’s ability to create posts and comments in the community

THE system SHALL retain historical records of previous bans for auditing purposes.

THE system SHALL notify the user via email that they have been unbanned.

### Moderator Accountability

#### Audit Trail
THE system SHALL maintain an immutable audit log of all moderation actions performed in a community.

THE system SHALL record each action with:
- Moderator or owner identity (user ID)
- Target user or content
- Action type (ban, delete, dismiss, etc.)
- Timestamp
- Reason provided (if applicable)

#### Report Transparency
WHEN a moderator approves or dismisses a report, THE system SHALL:
- Update the report status
- Record the moderator’s decision
- Record the timestamp of the decision

THE system SHALL NOT reveal to the reporting user whether their report was approved or dismissed, but SHALL indicate the content was resolved.

THE system SHALL allow moderators to view all reports they have reviewed in their activity log.

### Owner Privileges

#### Ownership Transfer
THE system SHALL NOT allow owners to transfer ownership directly to another user.

WHEN an owner wishes to relinquish control, THE system SHALL require them to:
1. Promote a trusted user to moderator
2. Then permanently delete their own account

The community SHALL remain, and the promoted moderator SHALL automatically become the new owner.

#### Owner Override
WHEN a platform administrator removes or disables a community, THE system SHALL:
- Record the reason for the override
- Notify the community owner via email
- Prevent the owner from re-creating the same community for 30 days

#### Owner Self-Removal
WHEN a community owner deletes their own account, THE system SHALL:
- Delete all their posts and comments
- Remove their ownership status
- If no moderator exists, the community SHALL be archived and hidden from public feeds
- If moderators exist, the first one promoted SHALL become the new owner

#### Owner Notification
THE system SHALL send an email notification to the community owner when:
- A new moderator is added
- A user is banned
- A report is approved
- The community has received 100+ new subscribers
- A platform administrator overrides a decision

#### Owner Protection
THE system SHALL prevent any moderator from:
- Initiating a report against the community owner
- Viewing the owner’s direct message history
- Accessing the owner’s account settings
- Viewing the owner’s IP or device metadata

### Summary of Moderator Limitations

- Moderators cannot remove owners
- Moderators cannot remove other moderators
- Moderators cannot delete communities
- Moderators cannot ban platform administrators
- Moderators cannot override platform administrator decisions
- Moderators have no authority outside their assigned community
- Moderators cannot view private messages between users
- Moderators cannot access the platform’s internal logs or metrics

## Reporting System

### Reporting Triggers
THE system SHALL allow users to report any post and any comment.

WHEN a user encounters content they believe violates community guidelines, THE system SHALL provide a reporting interface for that specific post or comment.

WHERE a user is banned from a community, THE system SHALL still allow them to report content in that community.

WHEN a user attempts to report content they authored, THE system SHALL allow the report to be submitted.

### Report Content and Metadata
WHEN a user submits a report, THE system SHALL require the user to provide a reason in text form.

THE report SHALL contain the following metadata:
- UUID identifier for the report
- Type of reported content ("post" or "comment")
- ID of the reported content
- ID of the reporting user
- Text provided as reason for reporting
- Timestamp of when the report was created
- Status of the report ("pending", "approved", "dismissed")

THE report reason SHALL be a free-form text field with a minimum length of 10 characters and a maximum length of 500 characters.

THE report SHALL not contain any personally identifiable information beyond the reporting user's ID.

### Report Review Process
WHILE a report has status "pending", THE system SHALL make it visible only to moderators of the community where the reported content resides.

WHEN a community owner submits a report, THE system SHALL treat it as having higher priority than reports from regular members.

THE owner of a community SHALL be able to review all reports in their community.

A community moderator SHALL be able to review all reports in their community.

A platform admin SHALL be able to review all reports across the entire platform.

WHEN a community has no owner or moderators, THE system SHALL route all reports to platform admin for review.

IF a user submits multiple reports within 5 minutes, THE system SHALL flag the user's account for potential abuse.

### Outcome Handling
WHEN a moderator approves a report, THE system SHALL immediately delete the reported post or comment.

WHEN a moderator approves a report, THE system SHALL notify the content author that their content was removed due to violation of community guidelines. The notification SHALL include the report reason and a reference to the community rules.

WHEN a moderator dismisses a report, THE system SHALL remove the report from the moderation queue and archive it.

WHEN a report is dismissed, THE system SHALL NOT notify the content author.

WHERE a user reports content that is later deleted, THE system SHALL still retain the report record for auditing purposes.

WHEN a post or comment is deleted due to an approved report, THE system SHALL preserve the report metadata permanently.

WHEN a post or comment is deleted due to an approved report, THE system SHALL subtract 1 karma from the content author.

### Report Visibility
WHILE a report has status "pending", THE system SHALL display it only to authorized moderators.

WHEN a report is dismissed, THE system SHALL remove it from the active report list visible to moderators.

THE reporting user SHALL NOT be able to see the status of their own report.

THE content author SHALL NOT be able to see who reported their content.

THE system SHALL NOT display the text of reports to any user other than moderators who have permission to review them.

THE platform admin SHALL be able to view all reports across all communities, including their status and metadata.

WHEN a report is approved and content is deleted, THE system SHALL record an audit log entry showing: who approved it, when, and what content was removed.

THE system SHALL allow moderators to filter reports by status, content type, reporting user, or reported user.

## Feed and Sorting Logic

### Feed Types and Access Rules

#### Home Feed
WHEN a logged-in member requests the Home Feed, THE system SHALL return posts only from communities the member is subscribed to.

WHILE the user is authenticated, THE system SHALL allow access to the Home Feed.

IF the user is not authenticated (guest), THEN THE system SHALL return HTTP 401 with error code FEED_ACCESS_DENIED and redirect to login.

THE system SHALL NOT display any posts from unsubscribed communities in the Home Feed.

THE system SHALL include all posts the user has subscribed to, even if the community is inactive.

#### Popular Feed
WHEN any user (authenticated or guest) requests the Popular Feed, THE system SHALL return posts from all communities across the platform.

THE system SHALL NOT require authentication to access the Popular Feed.

THE system SHALL include all public posts regardless of subscription status.

#### Community Feed
WHEN a user requests the Community Feed for a specific community, THE system SHALL return all posts belonging to that community.

THE system SHALL allow access to the Community Feed regardless of authentication status.

IF the community does not exist, THEN THE system SHALL return HTTP 404 with error code COMMUNITY_NOT_FOUND.

THE system SHALL validate community name case-insensitively during lookup.

### Sorting Algorithms

#### Hot Sorting
WHEN the Hot sorting option is selected, THE system SHALL calculate a score for each post using the formula: 
`HotScore = log10(Upvotes + 1) + (CreationTimeInHours / 4.5)`

THE system SHALL use UTC timestamp of post creation for time calculation.

THE system SHALL use natural logarithm base 10 for the vote component.

WHERE vote count is zero, THE system SHALL treat it as 1 to prevent log(0).

THE system SHALL sort posts in descending order by HotScore.

#### New Sorting
WHEN the New sorting option is selected, THE system SHALL sort posts by creation timestamp in descending order (most recent first).

THE system SHALL use the exact creation timestamp (ISO 8601 format) for comparison.

#### Top Sorting
WHEN the Top sorting option is selected, THE system SHALL sort posts by total vote score in descending order.

WHERE a time filter is specified, THE system SHALL restrict posts to those created within the selected period.

THE system SHALL support five time filters: "today", "this week", "this month", "this year", "all time".

IF the time filter is not specified, THEN THE system SHALL default to "all time".

THE system SHALL interpret "today" as the current UTC calendar day (00:00:00 to 23:59:59 UTC).

THE system SHALL interpret "this week" as the past seven days from current UTC date.

THE system SHALL interpret "this month" as the current UTC calendar month.

THE system SHALL interpret "this year" as the current UTC calendar year.

THE system SHALL interpret "all time" as encompassing all posts created since platform inception.

#### Controversial Sorting
WHEN the Controversial sorting option is selected, THE system SHALL calculate a controversy score using the formula:
`ControversyScore = abs(Upvotes - Downvotes) / (Upvotes + Downvotes + 1)`

THE system SHALL sort posts in descending order by ControversyScore.

WHERE total votes are zero, THE system SHALL assign a ControversyScore of 0.

THE system SHALL avoid division by zero by adding 1 to the denominator.

THE goal is to surface posts with high engagement but near-zero net score.

### Time Filters
THE platform SHALL explicitly support the following time filters for Top sorting: "today", "this week", "this month", "this year", "all time".

Where no time filter is provided, THE system SHALL use "all time" as default.

THE system SHALL not accept any other time filter values.

IF an unsupported time filter is submitted, THEN THE system SHALL reject with HTTP 400 error code INVALID_TIME_FILTER.

### Pagination
WHEN a feed is requested, THE system SHALL return exactly 20 posts per page.

THE system SHALL support pagination using offset-based cursor: `?limit=20&offset=N`

THE system SHALL calculate offset from 0, where offset=0 returns first 20 items, offset=20 returns items 21-40, etc.

THE system SHALL not use pagination token or cursor-based pagination.

IF the requested offset exceeds total post count, THEN THE system SHALL return an empty array.

### Feed Content Composition
When viewing any feed, each post in the list SHALL display the following elements:

- Title: The exact title text of the post (truncated if exceeding 120 characters)
- Author username: The username of the post creator (never display display name)
- Community name: The unique name of the community where the post was created
- Vote score: Total upvotes minus downvotes, displayed as a number (positive or negative)
- Comment count: Total number of direct comments on the post (not nested replies)
- Time since posted: Human-readable relative time (e.g., "3 hours ago", "2 days ago") calculated from UTC creation time to current system time (Asia/Seoul timezone conversion)
- Media preview:
  - FOR TEXT POSTS: The first 200 characters of content, with trailing "..."
  - FOR IMAGE POSTS: A thumbnail URL (120x120px) of the uploaded image
  - FOR LINK POSTS: The domain name extracted from the URL (e.g., "youtube.com", "github.com"), with no protocol or path

THE system SHALL NOT display the full content of any post in the feed list.

THE system SHALL NOT display avatar images in feed list items.

THE system SHALL NOT display karma score of the author in the feed list.

THE system SHALL NOT display post type icon (text/link/image) in feed list.

### Feed Generation Rules
THE system SHALL generate feed results dynamically on every request.

THE system SHALL NOT cache feed results permanently.

Where performance requirements apply, THE system SHALL use indexed database queries for sorting and filtering.

THE system SHALL use PostgreSQL with B-tree indexes on: post.authorId, post.communityId, post.createdAt, post.voteScore.

Where pagination is requested, THE system SHALL use LIMIT and OFFSET clauses in SQL.

### Edge Cases
IF a post’s community is deleted after the post is created, THEN THE system SHALL still display the post using the community name at time of creation.

IF a user changes their username, THEN THE system SHALL continue displaying the username at time of post creation in feed items.

IF a vote is removed, THEN THE system SHALL recalculate the feed score immediately and re-sort all affected posts.

IF a post is updated after creation, THEN THE system SHALL NOT alter its position in New or Hot feeds.

IF a user is banned from a community, THEN THE system SHALL filter their posts out of the Community Feed for that community, but posts remain visible in Home and Popular feeds if the user is subscribed elsewhere.

### Integration Requirements
This document references:
- [Karma System](./11-karma-system.md) for vote impact calculation
- [Post Management](./05-post-management.md) for post types and content handling
- [User Actors](./03-user-actors.md) for authentication state determination
- [Community Management](./07-community-management.md) for subscription validation

All components MUST be synchronized to ensure consistent feed behavior across the system.

### Performance Requirements
THE system SHALL serve feed requests in under 1.5 seconds for 95% of queries with 1,000+ posts.

THE system SHALL respond to feed requests within 500ms for 90% of queries.

WHERE a user has 100+ subscriptions, THE system SHALL handle Home Feed generation without timeouts.

THE system SHALL use query optimization and indexing to prevent full-table scans.

### Error Handling
IF a community name is invalid or not found in Community Feed request, THEN THE system SHALL return HTTP 404.

IF post pagination parameters are negative or non-integer, THEN THE system SHALL return HTTP 400.

IF user attempts to access Home Feed while unauthenticated, THEN THE system SHALL return HTTP 401.

IF sorting algorithm receives malformed time filter, THEN THE system SHALL return HTTP 400 with error code INVALID_TIME_FILTER.

### User Experience Expectations
Feed loading SHALL feel "instant" for users on modern networks.

Scroll performance SHALL be smooth with 60 FPS on mobile devices.

No post shall disappear or reappear unexpectedly during scrolling due to recalculation.

Feed shall always reflect the user’s current subscription status in real time.

### Business Rules
THE system SHALL not expose vote counts of users who voted on a post.

THE system SHALL not reveal whether a user has voted on a post to other users.

THE system SHALL prevent users from seeing posts in Home Feed that belong to communities they unsubscribed from.

THE system SHALL allow users to subscribe to and unsubscribe from communities at any time, with feed updates reflected immediately.

## Final Notes
This document provides a complete, unambiguous specification for the redditCommunity platform, written in EARS format with precise business logic, user scenarios, and system behavior. All requirements are implementation-ready for backend developers. No database schemas or API specifications are included—these will be generated in subsequent pipeline phases.

> *This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*