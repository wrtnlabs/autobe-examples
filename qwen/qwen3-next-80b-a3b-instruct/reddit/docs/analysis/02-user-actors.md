# Reddit-like Community Platform Requirements Specification

## Overview

This document defines the business requirements for a Reddit-like community platform. It describes user behaviors, system workflows, permissions, and data interactions from a business and user perspective. This specification serves as the authoritative input for subsequent phases of backend system design and implementation.

## User Actors

The system supports four distinct user roles with hierarchical permissions:

### Guest
Guests are unauthenticated visitors who can view public content but cannot participate in community interactions. They may browse posts, comments, communities, and profiles without registering.

### Member
Members are registered, authenticated users who can fully participate in the platform. They can create posts and comments, vote on content, subscribe to communities, edit their profiles, and manage their account.

### Moderator
Moderators are Members granted additional privileges within specific communities. They can manage content and users in communities they moderate, including deleting posts and comments, banning users, and reviewing reports. Moderators inherit all Member permissions.

### Admin
Admins are system-wide administrators with complete control over the entire platform. They can manage all communities, users, and settings, override moderator decisions, and perform administrative maintenance. Admins inherit all Moderator permissions.

## Authentication Flow

### Registration
WHEN a Guest attempts to register, THE system SHALL:

1. Require email address that matches RFC 5322 format
2. Require password with minimum 8 characters
3. Require username with minimum 3 characters and maximum 30 characters
4. Validate that email address is not already registered
5. Validate that username is not already in use
6. Store password as bcrypt hash with cost factor 12
7. Send verification email with unique, time-limited token
8. Create new Member account with default karma score of 0
9. Keep account status as "unverified" until email confirmation

IF validation fails, THEN THE system SHALL return appropriate error code with specific reason:
- EMAIL_EXISTS - when email is already registered
- USERNAME_EXISTS - when username is already in use
- INVALID_EMAIL - when email doesn't match format
- INVALID_PASSWORD - when password doesn't meet requirements
- INVALID_USERNAME - when username doesn't meet requirements

### Login
WHEN a Member attempts to log in, THE system SHALL:

1. Accept email or username as identifier
2. Accept password as authentication credential
3. Verify credentials against stored hash
4. If credentials are valid:
   - Create JWT access token with 30-minute expiration
   - Create refresh token with 30-day expiration
   - Set refresh token in secure httpOnly cookie
   - Return access token in response header
   - Set user session as active
5. If credentials are invalid:
   - Return HTTP 401 Unauthorized
   - Log failed login attempt with timestamp and IP
   - Increment failed attempt counter
   - Block account after 5 consecutive failed attempts for 15 minutes
6. If account is unverified:
   - Return HTTP 403 Forbidden with error code ACCOUNT_UNVERIFIED
   - Do not increment failed attempt counter

### Email Verification
WHEN a user clicks verification link in registration email, THE system SHALL:

1. Extract verification token from URL
2. Validate token expiration (max 24 hours)
3. Validate token against stored token hash
4. Update user status to "verified"
5. Clear verification token from database
6. Send confirmation email to user
7. Redirect user to home feed

IF token is expired, THEN THE system SHALL:
- Show "Verification link expired" message
- Allow user to request new verification email

IF token is invalid, THEN THE system SHALL:
- Show "Invalid verification link" message
- Allow user to request new verification email

### Password Reset
WHEN a user requests password reset, THE system SHALL:

1. Accept email address as input
2. Validate that email is registered
3. Generate unique, random reset token (64 characters)
4. Store token hash in user record with 60-minute expiration
5. Send password reset email with token link
6. Return success response with "reset email sent" message even if email doesn't exist

WHEN user clicks password reset link, THE system SHALL:

1. Extract reset token from URL
2. Validate token expiration (max 60 minutes)
3. Validate token against stored hash
4. Display password change form
5. Allow password change with new password meeting requirements:
   - Minimum 8 characters
   - Maximum 128 characters
   - No restrictions on character types
6. Update password hash in database
7. Invalidate all active sessions for this user
8. Send confirmation email
9. Redirect to login page

IF token is expired, THEN THE system SHALL:
- Show "Reset link expired" message
- Force user to request new password reset

IF password is invalid, THEN THE system SHALL:
- Return error "Invalid password" with reason
- Show requirements and allow retry

### Login Session Management
WHILE a user has an active session, THE system SHALL:

- Accept access token in Authorization: Bearer header
- Accept refresh token in secure httpOnly cookie
- Validate access token signature and expiration
- Refresh access token validity if within 5 minutes of expiration
- Require re-authentication for sensitive operations (
   - password change
   - account deletion
   - email change
   - moderator permission changes )

WHEN access token expires, THE system SHALL:

- Return HTTP 401 Unauthorized
- Require client to use refresh token to obtain new access token

WHEN refresh token expires, THE system SHALL:

- Return HTTP 401 Unauthorized
- Require user to log in again

WHEN user logs out, THE system SHALL:

- Invalidate the current refresh token
- Remove refresh token from cookie
- Delete access token from client storage
- Set session as inactive

## Profile Management

### Profile Creation and Editing
WHEN a Member creates or edits their profile, THE system SHALL:

1. Allow setting display name (max 50 characters)
2. Allow setting bio text (max 500 characters)
3. Allow uploading avatar image (max 5MB, supported formats: JPG, PNG, GIF)
4. Ensure display name is not already in use by another user
5. Validate image type and size before upload
6. Store image in cloud storage with unique filename
7. Save profile metadata with timestamp

WHEN a Member updates their profile, THE system SHALL:

1. Allow partial updates (only updated fields are modified)
2. Preserve existing data for unchanged fields
3. Send notification to followers if display name changes
4. Log profile update event with timestamp and IP

### Profile Viewing
WHEN a user views any profile, THE system SHALL:

1. Display display name, bio, and avatar
2. Show total karma score
3. Display list of all posts created by the user
4. Display list of all comments written by the user
5. Show subscription count to communities
6. Show member since date
7. Show if viewer is following the profile

## Karma System

### Karma Calculation
WHEN a user receives a vote on content, THE system SHALL:

- Increase karma by 1 for each upvote on post or comment
- Decrease karma by 1 for each downvote on post or comment
- Adjust karma in real-time based on vote changes
- Recalculate karma when votes are removed or changed

WHEN a vote is removed:
- If the vote was an upvote, karma decreases by 1
- If the vote was a downvote, karma increases by 1

WHEN a post or comment is deleted:
- Remove all associated votes from karma calculation
- Adjust karma accordingly for the content author

### Karma Display
WHEN showing karma score, THE system SHALL:

- Display exact numerical value (positive, zero, or negative)
- Never round or approximate the value
- Show negative values with minus sign (e.g., -15)
- Display karma in user profiles and comment/post lists
- Show karma as integer value with no decimal places

### Karma Integrity
THE system SHALL ensure karma integrity by:

- Preventing manual karma adjustment (only system-calculated adjustments)
- Calculating karma based on actual votes, not theoretical values
- Synchronizing karma calculation across all viewing contexts
- Recalculating karma as votes change

## Communities

### Community Creation
WHEN a Member creates a community, THE system SHALL:

1. Accept community name (min 2, max 21 characters)
2. Enforce unique community name (case-insensitive, no duplicates)
3. Accept description (max 500 characters)
4. Allow uploading icon image (max 1MB, PNG/JPG/GIF)
5. Set creator as owner
6. Automatically subscribe creator to community
7. Create community with initial subscriber count of 1
8. Validate name against reserved words (e.g., "admin", "moderator", "system")

IF validation fails, THEN THE system SHALL:
- Return error code COMMUNITY_NAME_EXISTS if name is duplicated
- Return error code COMMUNITY_NAME_INVALID if format requirements not met

### Community Management
WHEN a community owner edits community settings, THE system SHALL:

1. Allow changing description
2. Allow changing icon image
3. Allow transferring ownership to another Member
4. Allow deleting community (requires explicit confirmation)
5. Only owner can transfer ownership
6. Transfer ownership only to current subscribers

WHEN a community is deleted, THE system SHALL:

1. Archive all posts and comments associated with the community
2. Keep content accessible but mark as belonging to deleted community
3. Remove subscription relationships
4. Cancel all moderator assignments
5. Send notification to all subscribers
6. Retain community name in reserved list

### Community Browsing
WHEN users browse communities, THE system SHALL:

1. Display all communities in list
2. Show community name
3. Show community description (truncated to 100 characters if longer)
4. Show community icon
5. Show subscriber count
6. Show whether user is subscribed
7. Enable search by community name
   - Search must match partial names
   - Search must be case-insensitive
   - Search results must be sorted by relevance

## Subscriber Management

### Subscription Process
WHEN a Member subscribes to a community, THE system SHALL:

1. Verify user is authenticated
2. Ensure community exists and is not deleted
3. Verify user is not already subscribed
4. Add subscription relationship
5. Increase subscriber count by 1
6. Allow immediate posting in community
7. Log subscription event

WHEN a Member unsubscribes from a community, THE system SHALL:

1. Verify user is authenticated
2. Verify user has active subscription
3. Remove subscription relationship
4. Decrease subscriber count by 1
5. Prevent immediate posting in community
6. Log unsubscription event

### Subscriptions List
WHEN a Member views their subscriptions, THE system SHALL:

1. Show all communities they are subscribed to
2. Sort by most recently subscribed first
3. Include community name, description, icon, and subscriber count
4. Show subscription date
5. Allow unsubscription directly from list

## Post Management

### Post Creation
WHEN a Member creates a post, THE system SHALL:

1. Require community subscription (user must be subscribed to target community)
2. Require title (min 3, max 300 characters)
3. Require exactly one of the following content types:
   - Text post: content field (min 1, max 10,000 characters)
   - Link post: URL field (valid HTTP/HTTPS URL)
   - Image post: image file (max 10MB, PNG/JPG/GIF/WebP)
4. Validate URL format for link posts
5. Validate image type and size for image posts
6. Set post creator and creation timestamp
7. Set initial vote score to 0
8. Set initial comment count to 0

IF validation fails, THEN THE system SHALL:
- Return error code NO_SUBSCRIPTION for unsuitable community
- Return error code NO_TITLE for missing title
- Return error code INVALID_CONTENT for missing content type
- Return error code INVALID_URL for malformed URL
- Return error code INVALID_IMAGE for incorrect file type/size

### Post Editing and Deletion
WHEN a Member edits their own post, THE system SHALL:

1. Allow changing title
2. Allow changing content type if valid
3. Allow updating text, URL, or image content
4. Preserve original creation timestamp
5. Record edit timestamp
6. Log post edit event
7. Allow editing only if original post exists and is not deleted

WHEN a Member deletes their own post, THE system SHALL:

1. Remove post from active feed
2. Archive content for moderation records
3. Set post status to "deleted"
4. Remove all associated votes
5. Decrease comment count on parent post
6. Send notification to commenters
7. Log deletion event

WHEN viewing a single post, THE system SHALL:

1. Display title
2. Display full content (text, link, or image)
3. Display author username
4. Display community name
5. Display vote score
6. Display comment count
7. Display publish timestamp
8. Show edit timestamp if edited
9. Show if user has voted on post
10. Display post creation date and time

### Post List Display
WHEN displaying posts in any feed, each post SHALL:

1. Show title
2. Show author username
3. Show community name
4. Show vote score
5. Show comment count
6. Show time since posted (e.g., "3 hours ago", "2 days ago")
7. Show content preview:
   - For text posts: first 200 characters (truncated with ellipsis)
   - For image posts: thumbnail image (200x200px)
   - For link posts: domain name (e.g., "youtube.com", "github.com")

## Post Voting

### Vote Mechanics
WHEN a user votes on a post, THE system SHALL:

1. Require user authentication
2. Validate that the post exists and is active
3. Validate that user has not already voted
4. If vote is upvote:
   - Increase vote score by 1
   - Record vote in database
   - Adjust karma of post author (increase by 1)
5. If vote is downvote:
   - Decrease vote score by 1
   - Record vote in database
   - Adjust karma of post author (decrease by 1)
6. If vote is removed:
   - Decrease vote score by 1 if previous upvote
   - Increase vote score by 1 if previous downvote
   - Adjust karma of post author accordingly
   - Delete vote record
7. Allow users to change vote type (upvote → downvote or vice versa)
   - First remove existing vote (adjust score and karma)
   - Then record new vote (adjust score and karma)

WHEN viewing a post, THE system SHALL:

1. Display vote score (total upvotes - total downvotes)
2. Show button for upvote/downvote
3. Highlight currently selected vote
4. Show total number of votes
5. Show whether user has voted
6. Disallow voting if user is banned from community
7. Allow non-authenticated users to view vote score but not vote

### Vote Integrity
THE system SHALL ensure vote integrity by:

- Preventing multiple votes from the same user
- Allowing only one vote change per user
- Recording vote type changes as modifications
- Recalculating scores in real-time
- Ensuring votes are counted only for active posts

## Post Feeds

### Feed Types

#### Home Feed
WHEN a logged-in Member views the Home Feed, THE system SHALL:

1. Show posts from communities the user is subscribed to
2. Exclude posts from communities user is not subscribed to
3. Display in all sorting categories
4. Not be accessible to Guests or unauthenticated users

#### Popular Feed
WHEN any user (authenticated or not) views the Popular Feed, THE system SHALL:

1. Show posts from all communities
2. Include posts from all users
3. Exclude posts from communities that the user is banned from
4. Be accessible to guests and non-authenticated users

#### Community Feed
WHEN a user views a specific community's feed, THE system SHALL:

1. Show only posts belonging to that community
2. Require community to exist and be active
3. Include all posts regardless of user subscription status
4. Display to all users (authenticated or not)

### Sorting Algorithms

#### Hot
WHEN using "hot" sorting, THE system SHALL:

1. Use a combination of vote score and recency
2. Recent posts with high vote scores appear first
3. Formula: score = votes / (time_hours + 2)^1.8 (where time is in hours)
4. Filter by last 7 days
5. Only consider posts with > 1 vote
6. Exclude posts that are very old (older than 7 days)

#### New
WHEN using "new" sorting, THE system SHALL:

1. Show most recently created posts first
2. Sort by creation timestamp descending
3. Include all post types
4. No weighting based on votes
5. No time filters applied

#### Top
WHEN using "top" sorting, THE system SHALL:

1. Sort by highest vote score (upvotes - downvotes)
2. Support time filters:
   - today: posts created in last 24 hours
   - this week: posts created in last 7 days
   - this month: posts created in last 30 days
   - this year: posts created in last 365 days
   - all time: all posts with no time restriction
3. Only consider posts with at least 1 vote
4. Exclude deleted posts

#### Controversial
WHEN using "controversial" sorting, THE system SHALL:

1. Calculate controversy index: total votes / (1 + abs(score))
2. Sort by controversy index descending
3. Prioritize posts with high engagement but score close to zero

### Pagination

WHEN displaying posts in feeds, THE system SHALL:

1. Limit results to 25 posts per page
2. Support cursor-based pagination
3. Return next cursor token with response
4. Allow user to load additional pages
5. Return empty array when no more posts available
6. Preserve sorting order during pagination
7. Do not show duplicate posts during page navigation

## Comment System

### Comment Creation
WHEN a user creates a comment, THE system SHALL:

1. Require authentication (no guest comments)
2. Validate target post or parent comment exists and is active
3. Require comment content (min 1, max 1,000 characters)
4. Set comment timestamp
5. Set initial vote score to 0
6. Allow comments on any active post
7. Allow replies to any comment (no depth limit)
8. Record parent-child relationships

WHEN a comment is submitted, THE system SHALL:

1. Increase comment count on parent post
2. Increase comment count on parent comment (if applicable)
3. Log creation event
4. Notify post author if comment is not a reply

### Comment Editing and Deletion
WHEN a user edits their own comment, THE system SHALL:

1. Allow content modification
2. Preserve original timestamp
3. Record edit timestamp
4. Log edit event
5. Allow editing only for own comments

WHEN a user deletes their own comment, THE system SHALL:

1. Remove comment from active list
2. Archive content for moderation records
3. Set comment status to "deleted"
4. Decrease comment count on parent post
5. Decrease reply count on parent comment
6. Remove associated votes
7. Send notification to replies
8. Log deletion event

WHEN viewing a comment, THE system SHALL:

1. Display author username
2. Display content
3. Display vote score
4. Display time since posted
5. Display nested replies
6. Show edit timestamp if edited
7. Indicate if comment was deleted

### Comment Sorting

#### Best
WHEN using "best" sorting, THE system SHALL:

1. Sort by highest vote score first
2. Show top-rated comments first
3. Include all comments regardless of reply depth
4. Prioritize comments with high score-to-vote ratio

#### New
WHEN using "new" sorting, THE system SHALL:

1. Sort by creation timestamp descending
2. Show most recent comments first
3. Include comments at all reply levels
4. No weighting based on votes

#### Controversial
WHEN using "controversial" sorting, THE system SHALL:

1. Calculate controversy index: total votes / (1 + abs(score))
2. Sort by controversy index descending
3. Prioritize comments with high engagement but score close to zero
4. Filter by comments with at least 10 total votes

## Moderation System

### Moderator Roles

### Owner
The user who creates a community is automatically assigned as owner. Owner has the following privileges:

1. Can add moderators
2. Can remove moderators
3. Can transfer ownership to another user
4. Can delete/community
5. Can ban/unban users
6. Can edit community settings
7. Can view all reports
8. Can approve/dismiss reports
9. Can set all moderation permissions

### Moderator
Moderators are granted permissions by owner or other moderators. Moderators can:

1. Delete any post in the community
2. Delete any comment in the community
3. Ban users from the community
4. Unban users from the community
5. View ban list
6. View all reports for the community
7. Approve or dismiss reports

### Role Restrictions
WHEN moderator actions are performed, THE system SHALL:

1. Prevent moderators from removing the community owner from moderator role
2. Prevent moderators from removing other moderators
3. Prevent moderators from transferring ownership
4. Prevent moderators from deleting the community
5. Prevent moderators from adding admins
6. Prevent moderators from viewing system-wide reports
7. Prevent moderators from banning the owner

### Moderator Permissions Hierarchy
The permission hierarchy follows:

- Admin > Owner > Moderator > Member > Guest

Owner has same permissions as Moderator plus additional exclusive privileges.

### Community Management and Ownership Transfer
WHEN ownership is transferred:

1. Owner may transfer to any current Member who is subscribed
2. New owner inherits all owner privileges
3. Previous owner retains Moderator privileges unless removed
4. Ownership transfer requires explicit confirmation
5. System logs transfer event
6. Owners can revoke their own ownership (becomes Member)

### User Banning
WHEN a moderator bans a user from a community, THE system SHALL:

1. Prevent user from posting or commenting in the community
2. Allow user to view content of the community
3. Prevent user from subscribing to the community
4. Preserve existing posts and comments (do not delete)
5. Show user as "banned" in moderator view
6. Send notification to banned user
7. Log ban event

WHEN a moderator unbans a user from a community, THE system SHALL:

1. Restore user's posting and commenting privileges
2. Allow user to subscribe again
3. Remove "banned" status
4. Log unban event

### Report System
WHEN a user reports content, THE system SHALL:

1. Require authentication
2. Require report reason (min 10, max 500 characters)
3. Accept reports for any post or comment
4. Record reporter identity
5. Link report to reported content
6. Log report creation
7. Notify moderators of the community

### Report Review
WHEN moderators review reports, THE system SHALL:

1. Show report details:
   - Reported content
   - Reporter username
   - Report reason
   - Timestamp
   - Content type (post/comment)
2. Allow moderator to:
   - Approve report (delete content)
   - Dismiss report (keep content)
3. Remove report from active list after action
4. Log moderator action
5. Send notification to reporter if action taken

### Report Dismissal
WHEN a report is dismissed, THE system SHALL:

1. Remove report from active list
2. Mark as dismissed in audit log
3. Store reason and moderator
4. Do not notify reporter
5. Preserve reported content

### Report Approval
WHEN a report is approved, THE system SHALL:

1. Immediately delete the reported content
2. Remove all associated votes and comments
3. Log deletion event
4. Update content status to "deleted"
5. Send notification to author
6. Notify reporter of outcome
7. Record moderator action

## Performance Expectations

### Response Times
- User authentication: < 500ms
- Content creation: < 1,000ms
- Post retrieval (feed): < 800ms
- Comment loading: < 600ms
- Moderation actions (delete, ban): < 1,200ms
- Vote updates: < 300ms
- Karma updates: < 200ms

### Scalability
- Support 10,000 concurrent active users
- Handle 100,000 posts per day
- Support 500,000 comments per day
- Manage 10,000 communities
- Serve 50,000,000 monthly active users

### Reliability
- System uptime: 99.9%
- Data durability: 99.999%
- Backup frequency: hourly
- Disaster recovery time: < 15 minutes

## Success Metrics

- 80% of users complete registration process
- 60% of registered users create at least one post
- 70% of users vote on content within first week
- 30% of users subscribe to at least one community
- 15% of users become moderators within 30 days
- 90% of reports are reviewed within 24 hours

## Related Documents

- 02-user-actors.md: User actor definitions and permissions
- 03-authentication-flow.md: Detailed authentication process
- 04-karma-system.md: Karma calculation and integrity rules
- 05-communities.md: Community creation and management
- 06-posts.md: Post creation and editing flows
- 07-post-voting.md: Voting mechanics and integrity
- 08-post-feeds.md: Feed logic and sorting algorithms
- 09-comments.md: Comment system architecture
- 10-comment-voting.md: Comment voting details
- 11-moderation-system.md: Moderation roles and actions