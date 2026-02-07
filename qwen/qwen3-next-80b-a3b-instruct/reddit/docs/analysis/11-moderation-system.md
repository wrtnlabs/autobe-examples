# Reddit-like Community Platform Requirements Specification

## User Account

### Authentication Flow

- WHEN a user navigates to the sign-up page, THE system SHALL present a form requiring email, password, and username
- WHEN a user submits valid email, password, and unique username, THE system SHALL create a new user account with status "active"
- WHEN a user submits an email already registered, THE system SHALL return error "Email already in use"
- WHEN a user submits a username already taken, THE system SHALL return error "Username already exists"
- WHEN a user submits an invalid email format, THE system SHALL return error "Invalid email format"
- WHEN a user submits a password under 8 characters, THE system SHALL return error "Password must be at least 8 characters"
- WHEN a user logs in with valid credentials, THE system SHALL issue a JWT token with 14-day expiration
- WHEN a user logs in with invalid credentials, THE system SHALL return error "Invalid email or password"
- WHEN a user requests password reset, THE system SHALL send a time-limited (1 hour) reset link to their registered email
- WHEN a user uses a valid reset token, THE system SHALL allow password change
- WHEN a user uses an expired or invalid reset token, THE system SHALL return error "Invalid or expired reset link"
- WHEN a user requests account deletion, THE system SHALL initiate soft-delete workflow
- WHEN account deletion is confirmed, THE system SHALL:
  - Delete all user posts and associated comments
  - Delete all user votes on posts and comments
  - Delete user profile data (display name, bio, avatar)
  - Set user account status to "deleted"
  - Clear all authentication sessions
- WHEN a user with "deleted" status attempts to log in, THE system SHALL return error "Account has been deleted"

### Account Security

- THE system SHALL encrypt all passwords using bcrypt with cost factor 12
- THE system SHALL store email addresses in encrypted form
- THE system SHALL rate-limit login attempts to 5 per minute per IP
- THE system SHALL require re-authentication for password changes
- THE system SHALL log all account deletion attempts for audit

## User Profile

### Profile Data Model

- Each user has exactly one user profile with:
  - display_name (string, max 50 characters, nullable)
  - bio (text, max 500 characters, nullable)
  - avatar_url (string, URL format, nullable)
- WHEN a user sets display_name, THE system SHALL validate against regex: /^\w[\w -]{0,48}\w$/
- WHEN a user sets bio, THE system SHALL trim whitespace and enforce 500-character limit
- WHEN a user uploads an avatar, THE system SHALL:
  - Validate file type (PNG, JPG, JPEG, GIF)
  - Validate file size (max 5MB)
  - Generate 3 sizes: original, medium (200x200), thumbnail (100x100)
  - Store URLs in avatar_url, avatar_medium, avatar_thumbnail
- WHEN a user changes their username, THE system SHALL update all references to the old username
- WHEN a user changes their avatar, THE system SHALL delete all previously generated avatar variants (if present)

### Profile Access

- WHEN a user accesses their own profile, THE system SHALL return:
  - display_name, bio, avatar_url
  - total_karma_score
  - list of post_ids they have authored, with post title and community name
  - list of comment_ids they have authored, with post title and comment content preview
- WHEN a user accesses another user's profile, THE system SHALL return:
  - display_name, bio, avatar_url
  - total_karma_score
  - list of post_ids they have authored (title and community only)
  - list of comment_ids they have authored (post title and comment content preview only)
- WHEN a user views deleted user profile, THE system SHALL return:
  - "User has deleted their account"
  - 0 karma score
  - Empty post and comment lists
- WHEN a user views profile of user who has not set display_name or avatar, THE system SHALL show:
  - "" (empty string) for display_name
  - "" (empty string) for bio
  - default avatar (system-provided image)

### Karma Display

- THE system SHALL calculate karma as the sum of:
  - +1 for each upvote received on the user's posts
  - -1 for each downvote received on the user's posts
  - +1 for each upvote received on the user's comments
  - -1 for each downvote received on the user's comments
- WHEN karma is zero, THE system SHALL display "0"
- WHEN karma is negative, THE system SHALL display a minus sign and absolute value
- WHEN a post or comment is deleted, THE system SHALL immediately recalculate all associated karma
- WHEN a vote is removed, THE system SHALL immediately recalculate all associated karma
- THE system SHALL not expose the detailed vote history for any individual user

## Karma System

### Karma Calculation Logic

- WHEN a user upvotes a post, THE system SHALL:
  - Insert vote record in post_votes table
  - Increment post score by 1
  - Increment author's karma by 1
- WHEN a user downvotes a post, THE system SHALL:
  - Insert vote record in post_votes table
  - Decrement post score by 1
  - Decrement author's karma by 1
- WHEN a user changes vote from upvote to downvote on a post, THE system SHALL:
  - Update existing vote record from "up" to "down"
  - Decrement post score by 2 (1 to remove upvote, 1 to add downvote)
  - Decrement author's karma by 2 (1 to remove positive, 1 to add negative)
- WHEN a user changes vote from downvote to upvote on a post, THE system SHALL:
  - Update existing vote record from "down" to "up"
  - Increment post score by 2 (1 to remove downvote, 1 to add upvote)
  - Increment author's karma by 2 (1 to remove negative, 1 to add positive)
- WHEN a user removes their vote on a post, THE system SHALL:
  - Delete the vote record from post_votes table
  - If vote was up, decrement post score by 1 and decrement author's karma by 1
  - If vote was down, increment post score by 1 and increment author's karma by 1
- WHEN a user upvotes a comment, THE system SHALL:
  - Insert vote record in comment_votes table
  - Increment comment score by 1
  - Increment author's karma by 1
- WHEN a user downvotes a comment, THE system SHALL:
  - Insert vote record in comment_votes table
  - Decrement comment score by 1
  - Decrement author's karma by 1
- WHEN a user changes vote from upvote to downvote on a comment, THE system SHALL:
  - Update existing vote record from "up" to "down"
  - Decrement comment score by 2
  - Decrement author's karma by 2
- WHEN a user changes vote from downvote to upvote on a comment, THE system SHALL:
  - Update existing vote record from "down" to "up"
  - Increment comment score by 2
  - Increment author's karma by 2
- WHEN a user removes their vote on a comment, THE system SHALL:
  - Delete the vote record from comment_votes table
  - If vote was up, decrement comment score by 1 and decrement author's karma by 1
  - If vote was down, increment comment score by 1 and increment author's karma by 1
- WHEN a post or comment is deleted, THE system SHALL:
  - Recalculate the karma of the author based on remaining votes
  - Remove all vote records associated with deleted content

### Karma Integrity Rules

- THE system SHALL ensure karma is never stored as a derived field but always recalculated from post_votes and comment_votes
- WHERE a user has no votes on any content, THE system SHALL display karma = 0
- WHERE a post has been deleted, THE system SHALL ignore all associated votes in karma calculation
- WHERE a comment has been deleted, THE system SHALL ignore all associated votes in karma calculation
- THE system SHALL update karma scores in real-time with database transaction atomicity
- THE system SHALL handle concurrent voting updates using row-level locking

## Communities

### Community Creation

- WHEN a user creates a community name, THE system SHALL validate:
  - Length: 3-25 characters
  - Allowed characters: lowercase letters, numbers, underscore
  - No leading or trailing spaces
  - Does not begin with underscore
  - Does not contain invalid Unicode
  - Is not reserved word ("admin", "mod", "global", "system")
- WHEN a community name is valid, THE system SHALL:
  - Create new community record with owner_id = current user ID
  - Set community_status = "active"
  - Initialize subscriber_count = 1
  - Initialize created_at = current timestamp
- WHEN a user tries to create community with name already in use, THE system SHALL return error "Community name already taken"
- WHEN a user creates a community, THE system SHALL automatically subscribe them

### Community Settings

- A community has exactly:
  - name (string, unique)
  - description (text, max 500 characters, nullable)
  - icon_url (string, URL format, nullable)
- WHEN a community owner changes community name, THE system SHALL:
  - Validate new name meets same criteria as creation
  - If valid, update community name
  - If invalid, return appropriate error
- WHEN a community owner changes description, THE system SHALL:
  - Trim whitespace
  - Enforce 500-character limit
- WHEN a community owner changes icon, THE system SHALL:
  - Validate image type (PNG, JPG, JPEG, GIF)
  - Validate size (max 2MB)
  - Generate 3 sizes: original, medium (100x100), thumbnail (50x50)
  - Store URLs in icon_url, icon_medium, icon_thumbnail
  - Delete previous variants
- WHEN a community owner deletes their community, THE system SHALL:
  - Delete all posts in the community
  - Delete all comments in all posts
  - Delete community record
  - Remove all community subscriptions
  - Update author karma for all deleted posts and comments

### Community Discovery

- WHEN a user loads the communities feed, THE system SHALL:
  - Return list of all active communities
  - Order by subscriber_count descending
  - Paginate with 20 communities per page
  - Include: name, description, icon_url, subscriber_count, is_subscribed (boolean)
- WHEN a user searches communities by name, THE system SHALL:
  - Search case-insensitively on community name
  - Use PostgreSQL full-text search with weighted matching
  - Return results ordered by relevance
  - Return up to 100 results
- WHEN using search with less than 2 characters, THE system SHALL return no results
- WHEN user has not authenticated, THE system SHALL still display all community data

### Subscription System

- WHEN a user subscribes to a community, THE system SHALL:
  - Create record in community_subscriptions table
  - Increment community subscriber_count by 1
- WHEN a user unsubscribes from a community, THE system SHALL:
  - Delete record from community_subscriptions table
  - Decrement community subscriber_count by 1
- WHEN a user tries to create a post in a community they are not subscribed to, THE system SHALL return error "You must subscribe to this community to post"
- WHEN a user unsubscribes from a community, THE system SHALL:
  - Preserve their existing posts and comments
  - Allow them to edit/delete their own posts/comments
  - Prevent them from creating new posts/comments
- WHEN a user creates a community, THEY SHALL automatically be subscribed (no action required)
- WHEN a user delete their account, THE system SHALL:
  - Remove them from all community subscriptions
  - No longer count them for subscriber totals
- WHEN a community is deleted, THE system SHALL:
  - Remove all associated subscriptions
  - No longer count those users as subscribers

## Posts

### Post Creation

- WHEN a user creates a post, THE system SHALL validate:
  - Title: required, 5-300 characters, non-empty after trimming
  - Community: user must be subscribed to it
  - Post type: exactly one of text, link, or image
  - Link: must be valid URL format (http/https)
  - Image: must be uploaded file with correct format (JPEG, PNG, GIF, WEBP, AVIF)
- WHEN a post is created with text content, THE system SHALL:
  - Store content in post_text table
  - Allow up to 4096 characters
  - Strip HTML tags and script blocks
- WHEN a post is created with link content, THE system SHALL:
  - Store URL in post_links table
  - Validate URL contains scheme (http:// or https://)
  - Extract domain name for display
- WHEN a post is created with image content, THE system SHALL:
  - Store image in object storage
  - Validate MIME type and extension
  - Validate file size (max 10MB)
  - Generate 3 sizes: original, medium (800x800), thumbnail (300x300)
  - Store URLs in post_images table
- WHEN a user creates a post, THE system SHALL:
  - Set post creation timestamp
  - Initialize vote_score = 0
  - Initialize comment_count = 0
  - Set author_id, community_id, post_type
- WHEN a user tries to post in a community they are not subscribed to, THE system SHALL:
  - Return error "You must subscribe to this community to post"

### Post Editing and Deletion

- WHEN a user edits their own post, THE system SHALL:
  - Allow modification of title
  - Allow change of post type (text → link → image → text)
  - Allow content updates within limits
  - Update last_edited_at timestamp
  - Delete old storage files for changed media
- WHEN a user deletes their own post, THE system SHALL:
  - Set post_status = "deleted"
  - Delete all associated comments (cascade)
  - Remove all associated votes
  - Subtract votes from author's karma
  - Decrement community post count
- WHEN a post is deleted, THE system SHALL:
  - Hide it from all feeds and views
  - Archive content for moderation purposes
  - Keep post_id and metadata for report tracking
- WHEN a post is archived, THE system SHALL retain information for 30 days

### Post Display

- WHEN a user views a single post, THE system SHALL return:
  - title
  - full_content (from post_text or post_links or post_images)
  - author_id (with username)
  - community_id (with name)
  - vote_score
  - comment_count
  - created_at (ISO 8601 format)
  - last_edited_at (if exists)
  - post_type
- WHEN a post has been deleted, THE system SHALL return:
  - "This post has been deleted"
  - author: "[deleted]"
  - community: "[deleted]"
  - vote_score: 0
  - comment_count: 0
- WHEN a post has no title (invalid), THE system SHALL default to "[Untitled Post]"
- WHEN embedding media, THE system SHALL provide safe rendering templates

## Post Voting

### Vote Mechanics

- WHEN a user votes on a post, THE system SHALL:
  - Check if user already has a vote on this post
  - If no existing vote:
    - Insert new vote record
    - Update post score
    - Update author karma
  - If existing vote:
    - If type unchanged: do nothing
    - If type changed:
      - Update existing vote record
      - Adjust post score by ±2
      - Adjust author karma by ±2
  - If existing vote and user removes vote:
    - Delete vote record
    - Adjust post score by ±1
    - Adjust author karma by ±1

### Vote Constraints

- THE system SHALL allow exactly one vote per user per post
- THE system SHALL track vote type as enum: ["up", "down", "none"]
- WHEN a user attempts to vote on a post they are not logged in for, THE system SHALL:
  - Store vote in temporary session cookie (if anonymous)
  - Return error "You must be logged in to vote"
  - Do not modify post score or karma
- WHEN a user tries to vote on a deleted post, THE system SHALL:
  - Return error "This post has been deleted"
  - Do not create or modify votes

### Vote Display

- WHEN displaying a post, THE system SHALL show:
  - Vote score (as number)
  - Current user's vote state (none, up, down) if authenticated
  - For anonymous users: only vote score visible
- WHEN a vote count reaches 1000+, THE system SHALL display as "1.0k"
- WHEN a vote count reaches 1,000,000+, THE system SHALL display as "1M"
- WHEN vote score is negative, THE system SHALL display minus sign
- WHEN vote score is zero, THE system SHALL display "0"

## Post Feeds

### Feed Types

#### Home Feed

- WHEN a user is authenticated, THE system SHALL:
  - Generate feed from communities they are subscribed to
  - Include only posts with post_status = "active"
  - Exclude posts from communities user has unsubscribed from
- WHEN a user is not authenticated, THE system SHALL:
  - Return empty feed
  - Redirect to login page

#### Popular Feed

- THE system SHALL include all active posts from all communities
- THE system SHALL be available to both authenticated and unauthenticated users
- THE system SHALL not filter by subscription status
- THE system SHALL include posts with post_status = "active"

#### Community Feed

- WHEN a user visits /c/community_name, THE system SHALL:
  - Query for all active posts in that community
  - Return 404 if community does not exist
  - Return 404 if community is deleted
  - Include posts from all users regardless of subscription
- THE system SHALL be available to both authenticated and unauthenticated users

### Sorting Algorithms

#### Hot Algorithm

- THE system SHALL compute hot_score as:
  - hot_score = log(post_score + 1) / ((current_time - created_at) / 3600 + 2)
- WHEN a post is older than 24 hours, THE system SHALL apply decay factor:
  - factor = 1 - (hours_passed / 24) if hours_passed < 24
  - factor = 0.01 if hours_passed >= 24
- WHEN sorting, THE system SHALL order posts by hot_score descending
- DELETE EXCESSIVE RECOMMENDATIONS FOR OLD POSTS

#### New Algorithm

- THE system SHALL order posts by created_at descending (newest first)
- THE system SHALL use simple timestamp comparison
- THE system SHALL not apply any decay or algorithm

#### Top Algorithm

- THE system SHALL calculate top_score based on:
  - ALL time: post_score
  - TODAY: post_score from last 24 hours
  - THIS WEEK: post_score from last 7 days
  - THIS MONTH: post_score from last 30 days
  - THIS YEAR: post_score from last 365 days
- THE system SHALL return top 100 posts by top_score
- THE system SHALL dynamic filter by time window

#### Controversial Algorithm

- THE system SHALL compute controversy index as:
  - controversy_index = min(upvotes, downvotes) / (post_score + 1)
  - divide by 1 if score = 0 to avoid division by zero
  - post_score = upvotes - downvotes
- WHEN controversy_index is high, THE system SHALL rank higher
- WHEN score is close to zero but votes are high, THE system SHALL rank higher
- WHEN post has 0 votes, THE system SHALL not appear in this feed

### Pagination

- ALL feeds shall use offset-based pagination
- STANDARD page size: 20 posts per page
- MAXIMUM page size: 50 posts per page
- WHEN user requests page > 100, THE system SHALL return 404 "Page not found"
- WHEN no next page, THE system SHALL return "hasNext": false

## Post List Display

### Feed Item Components

- WHEN displaying any feed, each post shall display:
  - Title (truncated at 60 characters if longer)
  - Author username (link to profile)
  - Community name (link to community feed)
  - Vote score (as number)
  - Comment count (as number)
  - Time since posted (using relative time format)
  - Contextual content preview based on post type
- THE system SHALL display "1 hr ago", "3 days ago", "Same day" (if same calendar day)
- ALL time-display shall be calculated from server time (Asia/Seoul)

### Post Type Display

#### Text Posts

- WHEN a post is text type, THE system SHALL:
  - Show first 200 characters of text content
  - Show "..." after truncated text
  - Show "[Read more]" link

#### Link Posts

- WHEN a post is link type, THE system SHALL:
  - Extract domain name from URL (e.g., "youtube.com")
  - Display domain instead of full URL
  - Show external link icon after domain
  - Do not display any content preview

#### Image Posts

- WHEN a post is image type, THE system SHALL:
  - Display thumbnail (300x300) with aspect ratio preservation
  - Show alt text: "Image post - [original post title]"
  - Show image in scrollable container
  - Show "Image link" tag near thumbnail

### User Interface Enhancements

- THE system SHALL enable hover previews for avatars, community icons, and thumbnails
- THE system SHALL show collapsed comment counters with hover expand
- THE system SHALL apply fade-out to posts older than 30 days
- THE system SHALL not display preview content for users with "NSFW" preferences disabled

## Comments

### Comment Creation

- WHEN a user creates a comment, THE system SHALL:
  - Validate content length (1-1000 characters)
  - Strip HTML and script tags
  - Return error if user is banned from the post's community
  - Return error if post is deleted
- WHEN a reply is created to another comment, THE system SHALL:
  - Set parent_comment_id = the ID of the commented-on comment
  - Set depth = parent_depth + 1
  - SQLite BLOB storage is NOT permitted for tree structure
- WHEN a user creates a comment on a deleted post, THE system SHALL:
  - Return error "Cannot comment on deleted post"
  - Do not store comment

### Comment Editing and Deletion

- WHEN a user edits their own comment, THE system SHALL:
  - Allow modification of content
  - Update last_edited_at timestamp
  - Update content hash for moderation integrity
- WHEN a user deletes their own comment, THE system SHALL:
  - Set comment_status = "deleted"
  - Preserve content in archive
  - Decrement post comment_count
  - Subtract votes from author's karma
- WHEN a comment is deleted, THE system SHALL:
  - Hide all replies from public view
  - Continue to store replies internally for moderation
  - Maintain reference chain for reply-to relationships
- WHEN a user edits a comment, THE system SHALL preserve edit history for moderators

### Comment Display

- WHEN displaying any comment, THE system SHALL show:
  - Author username
  - Comment text (HTML-escaped)
  - Vote score
  - Time since posted
  - Expand button for replies
  - Reply button
  - Vote controls
- WHEN a reply exists, THE system SHALL display:
  - Indented structure with visual hierarchy
  - Tree depth limit: no limit imposed (nested to any depth)
- WHEN a comment is deleted, THE system SHALL show:
  - "[Comment deleted]"
  - No vote controls or replies
  - No author information
- WHEN a comment chain is very long, THE system SHALL initially load:
  - Top 10 comments
  - "Load more" button for additional replies
  - Pagination to client-side limit of 50 replies

## Comment Voting

### Vote Mechanics

- Comment voting follows exactly the same rules as post voting
- WHEN voting on a comment:
  - Insert/update/delete records in comment_votes table
  - Adjust comment score by ±1 or ±2
  - Adjust author's karma by ±1 or ±2
- WHEN comment score is zero, THE system SHALL display "0"
- WHEN comment score is negative, THE system SHALL display minus sign
- WHEN vote count exceeds 1000, THE system SHALL display as "1.0k"

### Vote Constraints

- THE system SHALL allow exactly one vote per user per comment
- THE system SHALL track vote type as enum: ["up", "down", "none"]
- WHEN a user attempts to vote on a deleted comment, THE system SHALL:
  - Return error "This comment has been deleted"
  - Do not modify vote records

## Comment Sorting

### Sorting Algorithms

#### Best

- THE system SHALL order comments by vote_score descending
- THE system SHALL apply time weighting: comments within 12 hours get 1.2x multiplier
- THE system SHALL show top 100 comments per post

#### New

- THE system SHALL order comments by created_at descending
- THE system SHALL show newest first
- THE system SHALL show all comments up to client limit 1000

#### Controversial

- THE system SHALL compute controversy index as:
  - controversy_index = min(upvotes, downvotes) / (comment_score + 1)
- ALTER if score = 0 and both upvotes and downvotes > 0, THE system SHALL use controversy_index
- ELSE if one side = 0, THE system SHALL NOT appear in controversial
- SHALL be ordered by controversy_index descending

## Community Moderation

### Moderator Roles

#### Community Owner

- THE system SHALL automatically designate the user who creates a community as its owner
- WHOEVER creates a community SHALL immediately become owner without manual configuration
- OWNER SHALL have absolute authority:
  - Can add or remove moderators
  - Can delete community
  - Can change community settings (name, description, icon)
  - Can ban or unban users
  - Can approve or dismiss reports
  - Can delete any post/comment
- OWNER SHALL be the only entity with authority to remove moderators
- OWNER SHALL NOT be subject to bans from their own community
- OWNER SHALL never lose ownership unless:
  - They delete their account (ownership transfers to first moderator)
  - They transfer ownership manually (not implemented)
- WHERE no moderator exists, AND owner deletes account, THE system SHALL delete community

#### Moderator

- Moderator roles SHALL be assigned by: owner OR other moderators
- WHEN an owner adds a moderator, THE system SHALL:
  - Add user to community_moderators table
  - Send notification to user
- WHEN a moderator adds a moderator, THE system SHALL:
  - Only allow if user is already moderator of community
  - Record adder_id in audit log
- WHEN a moderator is added, THE system SHALL:
  - Grant all moderation permissions (delete, ban, report review)
  - DO NOT grant owner powers
- Moderator SHALL NOT be able to:
  - Remove owner
  - Remove other moderators
  - Change community settings (name, description, icon)
  - Transfer ownership
- Moderator SHALL have same moderation actions as owner for:
  - Deleting posts/comments
  - Banning/unbanning users
  - Reviewing reports
  - Approving/dismissing reports

### Moderator Actions

#### Content Deletion

- WHEN a moderator deletes a post, THE system SHALL:
  - Set post_status = "deleted_by_moderator"
  - Log moderator_id in audit_log
  - Decrement post score from author's karma
  - Delete all associated comments
- WHEN a moderator deletes a comment, THE system SHALL:
  - Set comment_status = "deleted_by_moderator"
  - Log moderator_id in audit_log
  - Decrement comment score from author's karma
  - Delete all child replies

#### User Banning

- WHEN a moderator bans a user from community, THE system SHALL:
  - Add user to community_banned_users table
  - Add moderator_id and ban_reason to ban record
  - Remove user's subscription if they were subscribed
  - Email user notification (optional)
  - Require ban duration: permanent by default
- WHEN a moderator unban a user, THE system SHALL:
  - Delete record from community_banned_users
  - Log unban action with moderator_id
  - Restore user's ability to post/comment
  - Preserve user's existing content
- WHEN a banned user tries to post/comment in community, THE system SHALL:
  - Return error "You have been banned from this community"
  - Prevent action
  - Log attempted action
- WHEN a banned user tries to subscribe to community, THE system SHALL:
  - Return error "You have been banned from this community"

#### Report Handling

- WHEN a user reports a post/comment, THE system SHALL:
  - Create report in reports table
  - Set reporter_id, reported_content_id, reported_type, reason, created_at
  - Return success message
- WHEN a moderator views reports for their community, THE system SHALL:
  - Return all unhandled reports
  - Include: reported content (title or text preview)
  - Include: reporter username (if not anonymous)
  - Include: reason text
  - Include: timestamp
- WHEN a moderator approves a report, THE system SHALL:
  - Delete reported content (post or comment)
  - Log moderator_id and approval timestamp
  - Remove report from queue
  - Notify reporter: "Report approved. Content removed."
- WHEN a moderator dismisses a report, THE system SHALL:
  - Log moderator_id and dismissal timestamp
  - Remove report from queue
  - Notify reporter: "Report dismissed. Content remains."
- WHEN a report is dismissed, THE system SHALL NOT appear in future report lists
- WHEN a post/comment has multiple reports, THE system SHALL:
  - Show total report count on item
  - Allow moderator to approve/dismiss all reports together

### Moderation Logging

- THE system SHALL log all moderator actions in audit_log table:
  - moderator_id
  - action_type (delete_post, delete_comment, ban_user, unban_user, approve_report, dismiss_report)
  - target_id (post_id, comment_id, user_id)
  - reason (for bans/reports)
  - timestamp
  - ip_address (for forensic purposes)
- Logs shall be retained for 90 days

### Ban Appeals

- WHEN a banned user wants to appeal, THE system SHALL:
  - Allow submission of appeal form
  - Appeal content: free-form text up to 1000 characters
  - Appeal is sent to owner and all moderators of community
- WHEN an appeal is submitted, THE system SHALL:
  - Send email to community owner and moderators
  - Create appeal record in appeals table
  - Keep ban active until decision
- WHEN a moderator or owner reviews an appeal, THE system SHALL:
  - Have option to uphold ban or lift ban
  - Record decision in appeals table with reason
  - Notify user of outcome

### Moderation Transparency

- THE system SHALL show in user interface:
  - "This post was deleted by a moderator"
  - "This comment was deleted by a moderator"
  - "This user was banned by a moderator"
- Moderator identities SHALL remain anonymous unless they choose to identify
- Community admins MAY disclose moderator identities at their discretion in a "Team" section
- Users SHALL NOT see which moderator took which specific action

## Reporting

### User Reporting

- WHEN a user reports a post or comment, THE system SHALL:
  - Require a reason (free text, 5-500 characters)
  - Prevent blank or whitespace-only reasons
  - Show common reasons as quick-select: "Spam", "Harassment", "NSFW", "False information", "Off-topic", "Other"
  - Allow user to submit custom reason
- WHEN a user submits report, THE system SHALL:
  - Create report record with status="pending"
  - Associate with reporter_id (if authenticated)
  - Optionally hide reporter identity from moderators if requested
  - Send notification to community moderators
- WHEN a user reports content twice, THE system SHALL:
  - Only accept one report per content per user
  - Allow duplicate reports from other users

### Moderator Reporting

- When report is approved:
  - The system shall delete the reported content
  - The system shall mark the report as "approved"
  - The system shall notify the reporter of approval

- When report is dismissed:
  - The system shall mark the report as "dismissed"
  - The system shall notify the reporter of dismissal
  - The system shall unflag the content

- When a report is handled:
  - The system shall remove it from the active queue

### Feedback Transparency

- The system shall ensure all users can see whether their reports have been approved or dismissed
- The system shall allow users to view their report history

### Report Summary

When viewing report records in moderation panel:
- Each report shall display:
  - Reported content (title or excerpt)
  - Reporter username (if public)
  - Reason text
  - Timestamp
  - Action history (approved/dismissed + moderator and timestamp)
  - Comment status (active/deleted)
- ALL report data shall be searchable and filterable by time range and action

### Anti-Abuse Measures

- The system shall rate-limit reports per user: 5 per hour
- The system shall block reports from accounts under 24 hours old
- The system shall flag users who have multiple reports dismissed as "spam reporting"
- The system shall notify moderators of users with high dismissal ratios
