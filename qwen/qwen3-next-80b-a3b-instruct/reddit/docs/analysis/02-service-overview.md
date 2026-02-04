# communityPlatform Requirements Specification

## User Account System

### Account Creation

WHEN a user initiates account creation, THE system SHALL require the following information:
- A valid email address (RFC 5322 compliant)
- A password with minimum 12 characters containing at least one uppercase letter, one lowercase letter, one number, and one special character
- A unique username containing only alphanumeric characters and underscores, between 3 and 30 characters long

WHEN a user submits account creation information, THE system SHALL:
- Validate email format and uniqueness
- Validate password strength according to requirements
- Validate username format and uniqueness
- Create an inactive user account in the database with "pending-verification" status
- Send a verification email containing a unique, time-limited verification token

WHEN a user clicks the verification link in their email, THE system SHALL:
- Validate the verification token
- Change the user account status to "active"
- Redirect to login page with success message

WHEN a user attempts account creation with previously used email or username, THE system SHALL:
- Return appropriate error message
- Not create any account
- Log the attempted registration

### User Authentication

WHEN a user attempts to log in, THE system SHALL:
- Accept email or username as identifier
- Accept password
- Verify account status is "active"
- Validate password against stored bcrypt hash
- Generate a JWT access token (valid 30 minutes) and refresh token (valid 30 days)
- Set secure cookies in response with HttpOnly, Secure, and SameSite=Strict attributes
- Return user profile data excluding sensitive information

WHEN a user uses incorrect credentials, THE system SHALL:
- Return "invalid credentials" error
- Increment failed login counter
- Implement progressive delay for repeated attempts
- Not disclose whether username/email or password was incorrect
- Log failed login attempt

WHEN a user's access token expires, THE system SHALL:
- Accept valid refresh token
- Validate refresh token against stored record
- Generate new access token
- Maintain same user session
- Return updated access token

WHEN a user's refresh token expires or is invalid, THE system SHALL:
- Return "please log in again" error
- Clear all authentication cookies
- Log the authentication failure

WHEN a user requests password reset, THE system SHALL:
- Accept email address
- Verify account exists and is active
- Generate unique, time-limited reset token
- Send password reset email with link containing token
- Limit reset attempts to 3 per hour per email

WHEN a user submits password reset link, THE system SHALL:
- Validate reset token
- Verify token has not expired (valid 1 hour)
- Allow password change with 12+ character requirements
- Immediately invalidate all existing sessions
- Delete the used reset token
- Send confirmation email

### Account Management

WHEN a user changes their password, THE system SHALL:
- Require current password for authentication
- Require new password to meet strength requirements
- Validate new password is different from current password
- Hash new password using bcrypt with cost factor 12
- Immediately invalidate all active sessions
- Log the password change event
- Send notification email to user

WHEN a user requests account deletion, THE system SHALL:
- Require password confirmation
- Require explicit confirmation of deletion intent
- Verify user is authenticated
- Trigger a background deletion process with two-phase commitment
- Schedule all user data for permanent deletion across all systems
- Send confirmation email
- Present "account will be deleted in 72 hours" message
- Provide option to cancel deletion within 72 hours

WHEN the 72-hour deletion period expires, THE system SHALL:
- Permanently delete all user posts
- Permanently delete all user comments
- Permanently delete all user karma records
- Permanently delete user profile data
- Permanently delete user subscription records
- Permanently delete user authentication data
- Remove user from all community subscriber lists
- Remove user from all community moderator lists
- Permanently delete all user-reported content associations
- Complete deletion within 72 hours of initiation

## User Profile System

### Profile Structure

EACH user profile SHALL contain the following data:
- Display name (customizable text field, 1-100 characters)
- Bio text (customizable text field, 0-500 characters)
- Avatar image URL (optimized WebP format)
- Total karma score (integer value)
- Account creation date
- Last active timestamp

WHEN a user views another user's profile, THE system SHALL display:
- Display name
- Bio text (truncated after 150 characters with "read more" link)
- Avatar image (200x200px, centered, cropped)
- Total karma score
- Number of posts created
- Number of comments written
- Subscribe button (for users not subscribed to this user's community list)

WHEN a user views their own profile, THE system SHALL additionally display:
- Edit profile button
- Change avatar button
- Change display name button
- Change bio button
- Account management section

### Profile Editing

WHEN a user edits their display name, THE system SHALL:
- Validate new display name is between 1-100 characters
- Validate display name is not already in use
- Validate user has not changed display name more than 3 times in the past year
- Update display name in user profile
- Update display name in all user-generated content (posts, comments)
- Log the display name change
- Return updated profile data

WHEN a user edits their bio, THE system SHALL:
- Validate bio length is 0-500 characters
- Filter out any HTML tags or malicious scripts
- Sanitize text content
- Update bio in user profile
- Log the bio change
- Return updated profile data

WHEN a user uploads a new avatar, THE system SHALL:
- Accept image upload in PNG, JPG, JPEG, or SVG format
- Limit file size to 5MB
- Convert image to WebP format
- Resize to 200x200px dimensions
- Crop from center
- Compress for optimal quality
- Store in CDN
- Update avatar URL in user profile
- Purge any previous avatar from storage
- Return updated profile data

WHEN a user views any user's profile page, THE system SHALL display:

### Personal Content

WHEN a user views their own profile, THE system SHALL display two sections:

#### Posts Created
- List of all posts authored by the user
- Each post displays: title (truncated to 100 characters), community name, vote score, comment count, post time
- Posts are sorted by creation date (newest first)
- Shows "No posts yet" if no posts exist
- Paginated in sets of 10

#### Comments Written
- List of all comments authored by the user
- Each comment displays: post title (truncated to 100 characters), community name, comment text preview (truncated to 150 characters), vote score, comment time
- Comments are sorted by creation date (newest first)
- Shows "No comments yet" if no comments exist
- Paginated in sets of 10

WHEN a user views another user's profile, THE system SHALL display identical personal content sections:

#### Posts Created
- List of all public posts authored by the user
- Each post displays: title (truncated to 100 characters), community name, vote score, comment count, post time
- Posts are sorted by creation date (newest first)
- Shows "No posts yet" if no public posts exist
- Paginated in sets of 10

#### Comments Written
- List of all public comments authored by the user
- Each comment displays: post title (truncated to 100 characters), community name, comment text preview (truncated to 150 characters), vote score, comment time
- Comments are sorted by creation date (newest first)
- Shows "No comments yet" if no public comments exist
- Paginated in sets of 10

## Karma System

### Karma Calculation

THE system SHALL maintain a single integer karma score for each user across their entire history.

WHEN a user receives an upvote on a post or comment, THE system SHALL increase their karma by 1.

WHEN a user receives a downvote on a post or comment, THE system SHALL decrease their karma by 1.

WHEN a user's vote is removed from a post or comment, THE system SHALL:
- If the vote was an upvote, decrease karma by 1
- If the vote was a downvote, increase karma by 1

WHEN a post or comment is deleted, THE system SHALL:
- Identify all votes associated with the post/comment
- Reverse the karma impact on the author 
- Decrement karma by number of upvotes
- Increment karma by number of downvotes
- Remove all vote records from the database

WHEN a user is banned, THEIR karma score SHALL remain unchanged.

WHEN a user's account is deleted, THEIR karma score SHALL be permanently removed from the system.

### Karma Display

WHEN an authenticated user views any profile, THE system SHALL display the karma score as a positive or negative integer.

WHEN an unauthenticated user views any profile, THE system SHALL NOT display the karma score.

WHEN a user has been inactive for over 180 days, THE system SHALL conceal their karma score from public view.

WHEN a user's karma score is negative, THE system SHALL display it with a minus sign (e.g., "-25").

WHEN a user's karma score is 0, THE system SHALL display it as "0".

WHEN a user views their own profile, THE system SHALL indicate whether their karma score is considered "excellent", "good", "average", "low", or "poor" based on percentile ranking.

### Karma Recovery

THE system SHALL implement a karma recovery mechanism for inactive users with negative karma:

WHEN a user has not been active for 180 days and has negative karma, THE system SHALL:
- Automatically assign +5 karma points each time the user logs in
- Limit recovery to maximum of 20 points per year
- Stop recovery once karma reaches 0
- Display notification message: "Welcome back! You've been awarded +5 karma for returning."

The recovery system SHALL NOT apply to users who:
- Have been banned from any community
- Have deleted their account
- Have had their karma reduced due to moderation actions

## Community System

### Community Creation

WHEN a user creates a community, THE system SHALL:
- Require community name of 3-50 characters containing only alphanumeric characters and hyphens
- Validate name uniqueness (case-insensitive)
- Require description text of at least 100 characters
- Require user to be authenticated and not banned from any community in past 30 days
- Limit community creation to 5 per day per user
- Automatically make the creator the community owner
- Set default visibility to "public"
- Generate unique community slug from name
- Create initial community record with subscriber count = 1
- Send notification to users subscribed to similar communities

WHEN a community name is already taken, THE system SHALL:
- Return error "Community name already exists"
- Not create the community
- Suggest alternative names

WHEN a user attempts to create multiple communities rapidly, THE system SHALL:
- Implement rate limit: maximum 5 communities per 24 hours per user
- Track creation attempts in database
- Return "Too many community creation attempts" error when limit exceeded
- Temporarily disable community creation for user for 24 hours

### Community Discovery

WHEN a user visits the communities directory, THE system SHALL display:
- List of all public communities
- Each community displays: name, description preview (truncated to 150 characters), icon, subscriber count
- Communities sorted by subscriber count (descending)
- Pagination with 20 items per page
- Search bar at top

WHEN a user searches for a community, THE system SHALL:
- Accept text query of 2+ characters
- Search community name and description for matching text
- Rank results by relevance: exact matches > partial matches > description matches
- Return results within 500 milliseconds
- Limit search results to 100 communities
- Show "No communities found" if no matches

WHEN a user clicks on a community in the directory, THE system SHALL:
- Navigate to the community page
- Show detailed community information
- Display subscribed status
- Show subscribe button if not subscribed
- Show unsubscribe button if subscribed

### Community Details

WHEN a user views a community page, THE system SHALL display:
- Community name and unique identifier (slug)
- Community icon (200x200px)
- Community description (full length)
- Subscriber count
- Owner username (linked to profile)
- Moderator list
- Member list (only if user is subscribed or moderator)
- Subscribe button (if not subscribed)
- Unsubscribe button (if subscribed)
- Post list with sorting controls
- Create post button (if subscribed)

WHEN a user clicks the "View Members" link, THE system SHALL:
- Display list of all subscribers
- Show each user's display name and karma score
- Show user role (owner, moderator, member)
- Limit display to 500 users without pagination
- Show "Show all subscribers" link if over 500

WHEN a user clicks the "View Moderators" link, THE system SHALL:
- Display list of all moderators
- Show each moderator's display name
- Show user role (owner, moderator)
- Display owner designation with special badge
- Show "Add Moderator" button (if user is owner)

### Community Subscription

WHEN a user subscribes to a community, THE system SHALL:
- Validate user is authenticated
- Validate user is not banned from this community
- Add user to community subscriber list
- Increment community subscriber counter
- Record subscription timestamp
- Create notification preference for the community
- Send welcome notification for the community

WHEN a user unsubscribes from a community, THE system SHALL:
- Validate user is authenticated
- Remove user from community subscriber list
- Decrement community subscriber counter
- Delete notification preferences for the community
- Remove user's subscription record
- Send goodbye notification for the community

WHEN a user attempts to subscribe to a community they are already subscribed to, THE system SHALL:
- Return "Already subscribed" message
- Do nothing to subscription status

WHEN a user attempts to subscribe to a community they have been banned from, THE system SHALL:
- Return "You are banned from this community" message
- Prevent subscription

WHEN a user attempts to create a post in a community they are not subscribed to, THE system SHALL:
- Return "You must subscribe to this community to post" error
- Prevent post creation
- Provide link to subscribe

WHEN a user is banned from a community, THE system SHALL:
- Automatically unsubscribe from the community
- Remove all subscription records
- Show "You have been banned" message
- Restrict access to posting functionality

## Post System

### Post Creation

WHEN a user creates a post, THE system SHALL:
- Require the user to be subscribed to the target community
- Require a title of 1-300 characters
- Require selection of post type: text, link, or image
- Validate that at least one content field is provided based on type
- Limit post creation to 5 per minute per user
- Generate unique post slug from title
- Record creation timestamp
- Set initial vote score to 0
- Set comment count to 0
- Assign to author and community

WHEN a user creates a text post, THE system SHALL:
- Require title (1-300 characters)
- Require content text of at least 20 characters
- Limit content text to 10,000 characters
- Strip all HTML tags from content
- Sanitize text content
- Create post with "text" type
- Store content in plain text format

WHEN a user creates a link post, THE system SHALL:
- Require title (1-300 characters)
- Require valid HTTP/HTTPS URL
- Validate URL format and accessibility
- Extract domain name from URL
- Limit URL length to 2000 characters
- Create post with "link" type
- Store URL in encoded format

WHEN a user creates an image post, THE system SHALL:
- Require title (1-300 characters)
- Require valid image file upload (PNG, JPG, JPEG, GIF)
- Limit file size to 10MB
- Convert image to WebP format
- Resize to 1200x1200px maximum
- Store original and thumbnail images in CDN
- Create post with "image" type
- Store image URL and thumbnail URL

WHEN a user attempts to create a post with an invalid title, THE system SHALL:
- Return "Title must be 1-300 characters" error
- Prevent post creation

WHEN a user attempts to create an empty text post, THE system SHALL:
- Return "Text content must be at least 20 characters" error
- Prevent post creation

WHEN a user attempts to create a link with invalid URL, THE system SHALL:
- Return "Please provide a valid URL" error
- Prevent post creation

WHEN a user attempts to upload an invalid image file, THE system SHALL:
- Return "Invalid image format" error
- Prevent post creation

WHEN a user attempts to post in a community they are not subscribed to, THE system SHALL:
- Return "You must subscribe to this community to post" error
- Prevent post creation
- Show subscribe button

### Post Display

WHEN viewing any feed (Home, Popular, Community), THE system SHALL display each post with:

- Title (truncated to 100 characters if necessary)
- Author username (linked to profile)
- Community name (linked to community feed)
- Vote score
- Comment count
- Time since posted (in relative format: "3 hours ago", "2 days ago", etc.)
- For text posts: first 200 characters of content
- For image posts: thumbnail image (200x200px, cropped from center)
- For link posts: domain name from URL (e.g., "youtube.com")

WHEN a user clicks on a post in a feed, THE system SHALL navigate to the full post view.

WHEN viewing a full post page, THE system SHALL display:

- Title
- Author (linked to profile)
- Community (linked to community)
- Creation timestamp
- Updated timestamp (if edited)
- Vote score
- Vote control buttons (upvote, downvote, remove vote)
- Comment count
- Full content based on type:
  - Text: full content with proper formatting
  - Link: URL link as button with domain name
  - Image: full-sized image with download option
- Moderation actions (if user is moderator or owner)
- Comment section

WHEN a post has been edited, THE system SHALL display an "Edited" badge immediately after the timestamp.

WHEN a post has been deleted by moderation, THE system SHALL display:
- "This post has been removed by moderators" message
- Reason if provided
- Option to view deleted version (for moderators only)

### Post Editing

WHEN a user edits their own post, THE system SHALL:
- Allow edits to title, content, and image (as applicable)
- Limit edits to 3 times within 24 hours of creation
- Preserve original content in revision history
- Record the edit timestamp
- Add "Edited" badge to displayed post
- Update the post in the database
- Invalidate cache for this post
- Send notification to subscribers if post is in subscribed community

WHEN a user attempts to edit a post more than 3 times in 24 hours, THE system SHALL:
- Return "Too many edits" error
- Prevent the edit
- Suggest creating a new post instead

WHEN a user attempts to edit another user's post, THE system SHALL:
- Return "You can only edit your own posts" error
- Prevent the edit

### Post Deletion

WHEN a user deletes their own post, THE system SHALL:
- Confirm deletion intent
- Mark post as deleted in database
- Set post status to "soft-deleted"
- Hide post from all public feeds
- Preserve post data for 48 hours
- Immediately decrement comment count on parent post
- Recalculate karma for author by subtracting all vote impacts
- Allow restoration within 48 hours
- Send confirmation notification

WHEN a system cleanup runs every 2 hours, THE system SHALL:
- Permanently delete all posts marked "soft-deleted" for over 48 hours
- Remove all associated votes
- Remove all associated comments
- Purge all images from storage
- Finalize deletion with audit log entry

WHEN a moderator deletes a post, THE system SHALL:
- Immediately remove the post from all feeds
- Delete all associated votes and comments
- Store full post data in moderation log
- Record moderator identity and timestamp
- Optionally add deletion reason
- Notify the post author with reasoning
- Never allow restoration
- Permanently delete from storage

## Post Voting System

### Vote Actions

WHEN a user upvotes a post, THE system SHALL:
- Validate user is authenticated
- Validate user hasn't voted before or has downvoted
- Validate user is not the post author
- Add upvote record to database
- Increment vote score by 1
- Increase author's karma by 1
- Record vote timestamp

WHEN a user downvotes a post, THE system SHALL:
- Validate user is authenticated
- Validate user hasn't voted before or has upvoted
- Validate user is not the post author
- Add downvote record to database
- Decrement vote score by 1
- Decrease author's karma by 1
- Record vote timestamp

WHEN a user removes their vote from a post, THE system SHALL:
- Identify existing vote (upvote or downvote)
- Remove vote record from database
- If was upvote: decrease vote score by 1
- If was downvote: increase vote score by 1
- If was upvote: decrease author's karma by 1
- If was downvote: increase author's karma by 1
- Record removal timestamp

WHEN a user attempts to upvote their own post, THE system SHALL:
- Return "You cannot vote on your own posts" error
- Prevent the action

WHEN a user attempts to downvote their own post, THE system SHALL:
- Return "You cannot vote on your own posts" error
- Prevent the action

WHEN a user attempts to vote on a post that has been deleted, THE system SHALL:
- Return "Post not found" error
- Prevent the action
- Log attempted vote on removed content

WHEN a user votes on a post in a community they have been banned from, THE system SHALL:
- Return "You are banned from this community" error
- Prevent the action

WHEN a post receives a vote, THE system SHALL immediately update the display in:
- Feed views
- Community feeds
- Profile posts section
- Post detail page

### Vote Consistency

THE system SHALL enforce a "one vote per user per post" policy.

WHEN a user attempts to vote multiple times on the same post, THE system SHALL:
- Allow changing the vote (upvote ↔ downvote)
- Allow removing the vote entirely
- Prevent duplicate votes of the same type
- Implement immediate voting state update

WHEN a user changes their vote on a post, THE system SHALL:
- Remove their previous vote record
- Add new vote record with opposite value
- Adjust vote score by ±2 (previous vote removal followed by new vote)
- Adjust author's karma by ±2 (previous karma change reversed then new change applied)
- Record the vote change timestamp

WHEN a post is deleted, THE system SHALL:
- Immediately remove all associated votes
- Recalculate the author's karma by reversing vote impacts
- Delete all vote history records
- Log the deletion event

### Vote Scoring Algorithms

THE system SHALL calculate and display vote score as: total_upvotes - total_downvotes

WHEN implementing "Hot" sorting, THE system SHALL use the formula:
score = (upvotes - downvotes) / ((hours since creation) + 2)^1.5

WHEN implementing "Top" sorting, THE system SHALL:
- Include all votes regardless of age (all time)
- Include votes within selected timeframe (today, this week, this month, this year)
- Calculate score as: total_upvotes - total_downvotes

WHEN implementing "Controversial" sorting, THE system SHALL use the formula:
score = abs(upvotes - downvotes) * (min(upvotes, downvotes) + 1)

WHEN implementing "New" sorting, THE system SHALL order posts strictly by creation timestamp.

WHEN calculating vote score for display, THE system SHALL:
- Use cached values for performance
- Recalculate when votes change
- Handle negative scores correctly
- Display absolute value for "Controversial" sorting

## Comment System

### Comment Structure

EACH comment SHALL contain:
- Comment text content (0-5,000 characters)
- Author info (display name, username)
- Creation timestamp
- Update timestamp (if edited)
- Vote score
- Parent comment ID (NULL for top-level comments)
- Depth level (for UI rendering)

WHEN a comment is created, THE system SHALL:
- Validate user is authenticated
- Validate target post exists and is not deleted
- Validate text content is 0-5,000 characters
- Strip HTML tags and sanitize content
- Set parent ID based on reply context
- Set depth level (parent depth + 1)
- Set initial vote score to 0

WHEN a comment is edited, THE system SHALL:
- Allow editing only by author
- Limit edits to 5 minutes after creation
- Preserve original content
- Add "Edited" badge to timestamp
- Update edit timestamp
- Send notification to comment author

WHEN a comment is deleted, THE system SHALL:
- Mark as deleted in database
- Hide from public view
- Replace with message "This comment has been deleted"
- Preserve data for moderation review
- Recalculate karma impact for author
- Log deletion with moderator info if applicable
- Allow restoration by moderators for 48 hours

WHEN a comment is permanently deleted, THE system SHALL:
- Remove from database after 48 hours
- Remove from parent comment's reply list
- Recalculate Karma
- Remove all associated vote records
- Log permanent deletion event

### Comment Voting

Comment voting follows exactly the same rules as post voting:

WHEN a user upvotes a comment, THE system SHALL:
- Add upvote record
- Increment vote score by 1
- Increase author's karma by 1
- Record timestamp

WHEN a user downvotes a comment, THE system SHALL:
- Add downvote record
- Decrement vote score by 1
- Decrease author's karma by 1
- Record timestamp

WHEN a user removes their vote from a comment, THE system SHALL:
- Remove vote record
- Adjust vote score accordingly (±1)
- Adjust author's karma accordingly (±1)
- Record removal timestamp

WHEN a user attempts to vote on their own comment, THE system SHALL:
- Return "You cannot vote on your own comments" error
- Prevent the action

WHEN a comment receives a vote, THE system SHALL immediately update the display:
- In the comment thread
- In feed previews
- On author's profile

### Comment Sorting

THE system SHALL provide three comment sorting options:

#### Best
- Sort by highest vote score first
- Display comments with most upvotes at top
- Break ties by creation timestamp (newer first)

#### New
- Sort by creation timestamp descending
- Most recent comments appear first
- Ignore vote score entirely

#### Controversial
- Sort by the formula: abs(upvotes - downvotes) * (min(upvotes, downvotes) + 1)
- Comments with many votes but close score appear first
- Both highly upvoted AND highly downvoted comments are surfaced
- Break ties by creation timestamp (newer first)

WHEN a user selects a sorting option, THE system SHALL:
- Apply the selected algorithm to all comments
- Store user preference in profile
- Update display immediately
- Maintain sort order across page loads

WHEN a comment thread exceeds 100 replies, THE system SHALL:
- Implement pagination on the comment thread
- Default to 25 comments per page
- Provide "Load more" button
- Preserve the selected sort order
- Maintain thread structure across pages

## Moderation System

### Moderator Roles

WHEN a community is created, THE system SHALL automatically designate the creator as the OWNER.

THE system SHALL ensure the owner has full permissions to:
- Add and remove moderators
- Delete any content in the community
- Ban and unban users
- View all reports
- Approve or dismiss reports
- View moderator action logs
- Access the community settings page

WHEN an owner adds a moderator, THE system SHALL:
- Verify the user is authenticated and subscribed to the community
- Verify the user has not been banned from the community
- Add the user to the community moderator list
- Grant moderator privileges
- Send notification to the new moderator
- Log the role assignment event

WHEN an owner removes a moderator, THE system SHALL:
- Verify the user is the owner
- Remove the user from the moderator list
- Revert the user to regular member status
- Notify the former moderator
- Log the removal event

WHEN a moderator adds another moderator, THE system SHALL:
- Verify the user performing the action has owner status
- Check if target user is subscribed and not banned
- Add to moderator list if criteria met
- Return "Only owner can add moderators" error if insufficient privileges

WHEN a moderator attempts to remove another moderator, THE system SHALL:
- Return "Only owners can remove moderators" error
- Prevent the action
- Log attempted unauthorized action

WHEN a moderator attempts to remove the owner, THE system SHALL:
- Return "Owners cannot be removed" error
- Prevent the action
- Log attempted unauthorized action

WHEN a moderator logs in, THE system SHALL display:
- Moderator badge on user profile
- Moderation tools on community page
- Access to reports
- Access to banned users list
- Access to deletion tools

### Moderator Actions

#### Content Deletion

WHEN a moderator deletes a post, THE system SHALL:
- Immediately remove post from all feeds
- Delete all associated comments
- Delete all associated votes
- Store full content in moderation log
- Notify the post author with deletion reason
- Record moderator identity and timestamp
- Permanently purge content from storage
- Log action in audit trail

WHEN a moderator deletes a comment, THE system SHALL:
- Immediately remove comment from thread
- Remove all associated votes
- Store full content in moderation log
- Notify the comment author with deletion reason
- Record moderator identity and timestamp
- Log action in audit trail
- Recalculate karma for comment author

#### User Ban

WHEN a moderator bans a user from a community, THE system SHALL:
- Select ban duration (permanent, 1 day, 7 days, 30 days)
- Verify user is not a moderator or owner of this community
- Add user to banned users list with expiration timestamp
- Immediately unsubscribe user from community
- Automatically delete user's posts and comments in the community
- Notify user of ban with reason
- Log ban event with moderator and duration

WHEN a moderator unbans a user, THE system SHALL:
- Remove user from banned users list
- Restore user's ability to subscribe
- Restore user's ability to post and comment
- Notify user of unbanning
- Log unban event
- Restore any community subscription status

WHEN a moderator views the banned users list, THE system SHALL display:
- Username
- Display name
- Ban date
- Ban duration (with expiration date)
- Reason for ban
- Moderator who imposed the ban
- Button to unban

WHEN an owner views the banned users list, THE system SHALL have identical display information.

WHEN a user is banned from a community, THE system SHALL ensure they:
- Cannot create new posts or comments
- Cannot vote on existing content on that community
- Cannot subscribe to the community again
- Can still view all public content
- Are not included in member lists
- Cannot interact with moderator features

### Reporting System

WHEN a user reports a post or comment, THE system SHALL:
- Require selection of reason from predefined categories:
  - Spam
  - Harassment
  - Misinformation
  - Nudity
  - Other (with optional text field)
- Validate user is authenticated
- Validate post/comment is not already reported by same user
- Create report record with:
  - Reported content ID
  - Reporter ID
  - Reason category
  - Additional text (if provided)
  - Timestamp
  - Status (open)
- Notify all moderators of the community
- Display "Report submitted" confirmation

WHEN a moderator views the reports list, THE system SHALL display:
- Reported content preview (text or image)
- Reported-by username and profile link
- Report reason category and additional text
- Timestamp of report
- Status (open, closed, approved, dismissed)
- Action buttons: Approve, Dismiss
- Community name
- Reported item type (post/comment)

WHEN a moderator approves a report, THE system SHALL:
- Change report status to "approved"
- Delete the reported content
- Send notification to reporter: "Your report has been approved and the content has been removed."
- Log the action with moderator ID and timestamp
- Add deletion reason to moderation log
- Update content state in database
- Recalculate karma for content author (if applicable)

WHEN a moderator dismisses a report, THE system SHALL:
- Change report status to "dismissed"
- Send notification to reporter: "Your report has been dismissed. The content has been preserved."
- Log the action with moderator ID and timestamp
- Remove report from active list
- Keep content unaffected

WHEN a report has been pending for 7 days without moderator action, THE system SHALL:
- Automatically change status to "dismissed"
- Remove from active reports list
- Log auto-dismissal event
- Send notification to reporter: "Your report has been automatically dismissed due to inactivity."

WHEN a user submits a report that is dismissed, THE system SHALL:
- Record dismissal count for user
- If user has 3 dismissed reports in 14 days:
  - Restrict user from submitting reports for 30 days
  - Send notification: "You have been temporarily restricted from submitting reports due to multiple dismissed reports."

WHEN a user has been restricted from reporting for 30 days, THE system SHALL:
- Block all report submission attempts
- Display "You are restricted from submitting reports" message
- Allow appeal request
- Automatically re-enable after 30 days
- Notify user when restriction expires

### Moderator Hierarchy

THE system SHALL implement a strict moderator hierarchy:

- ONLY the community OWNER can add or remove moderators
- MODERATORS cannot add or remove other moderators
- MODERATORS cannot remove the owner
- OWNERS cannot be removed from their position
- OWNERS automatically have all moderator privileges
- OWNERS have final authority on all moderation decisions

WHEN a user is added as a moderator, THE system SHALL:
- Assign moderator badge to their profile when viewing the community
- Enable all moderator controls
- Allow view of reports and banned users
- Allow deletion of any content
- Allow banning/unbanning users
- Display "Moderator" label next to username

WHEN a user is removed as a moderator, THE system SHALL:
- Remove moderator badge from their profile
- Disable all moderator controls
- Delete access to reports and banned users list
- Remove deletion and banning permissions
- Return to member status
- Display "Member" label next to username

WHEN a community owner is added as moderator, THE system SHALL:
- Display "Owner and Moderator" badge
- Grant all moderator powers
- Maintain ownership privileges

WHEN a community owner is removed as moderator, THE system SHALL:
- Return error "Ownership cannot be removed"
- Prevent removal
- Maintain all system privileges
- Keep owner status intact

## Authentication System

### User Registration Flow

WHEN a new user visits the platform, THE system SHALL display the registration form.

WHEN a user submits registration form:
1. Validate email format and uniqueness
2. Validate password strength (12+ characters, lowercase, uppercase, number, special character)
3. Validate username format and uniqueness
4. Create user record with "pending-verification" status
5. Send verification email with unique, time-limited token
6. Redirect to login page with success message
7. Track registration IP for security

WHEN a user clicks verification link:
1. Validate verification token
2. Validate token is not expired (48-hour window)
3. Verify account status is "pending-verification"
4. Change status to "active"
5. Send welcome email
6. Redirect to Home Feed with authenticated session

WHEN a user's verification token expires:
1. Show "Token expired" message
2. Provide link to resend verification email
3. Limit resend attempts to 3 per 24 hours

### Login Flow

WHEN an existing user visits the login page:
1. Accept email/username and password
2. Lookup account by identifier
3. Verify account status is "active"
4. Validate password against bcrypt hash
5. If successful:
   - Generate JWT access token (expires 30 minutes)
   - Generate refresh token (expires 30 days)
   - Store refresh token hashed in database
   - Set secure cookies
   - Redirect to requested page (or Home Feed)
   - Log login event
6. If unsuccessful:
   - Return "invalid credentials" error
   - Increment failed login counter
   - Implement exponential backoff delay
   - Log failed login attempt

WHEN "remember me" option is selected:
- Extend refresh token to 90 days
- Store "remember me" flag on account
- Send confirmation notification

WHEN a user logs out:
- Clear access token from client
- Revoke refresh token
- Delete secure cookies
- Redirect to login page
- Log logout event

### Session Management

WHEN a user accesses a protected endpoint:
1. Extract JWT from Authorization header or cookie
2. Verify JWT signature and expiration
3. Decode user ID and role information
4. Validate refresh token is still valid in database
5. If valid, allow access
6. If invalid, return 401 Unauthorized

WHEN an access token expires:
1. Client sends request with refresh token
2. Server validates refresh token
3. If valid:
   - Generate new access token
   - Return fresh access token
   - Return same refresh token
4. If invalid:
   - Return 401 Unauthorized
   - Remove refresh token from storage
   - Clear client's cookies
   - Require full login

WHEN two-factor authentication is enabled:
- Require second factor code after password validation
- Store verification status in session
- Require re-entry after 6 hours of inactivity
- Allow backup codes for recovery

### Security Measures

THE system SHALL:
- Implement rate limiting: 100 API requests per minute per IP
- Use HTTPS with TLS 1.3 for all data transmission
- Implement CORS headers to restrict cross-origin requests
- Use secure cookies with HttpOnly, Secure, SameSite=Strict attributes for session management
- Store passwords using bcrypt with a cost factor of 12
- Hash all refresh tokens before storage
- Implement JWT token blacklisting for logout
- Implement SQL injection prevention via parameterized queries
- Sanitize all user-generated content to prevent XSS attacks
- Implement CSRF protection with stateful tokens for state-changing operations
- Require email verification before full platform access
- Log all security-relevant events
- Conduct weekly automated security vulnerability scans
- Respond to critical security findings within 24 hours

WHEN a user changes their password, THE system SHALL:
- Invalidate all existing session tokens
- Remove all refresh tokens
- Clear all active sessions
- Notify user of change via email or in-app notification

WHEN a user reports a security issue, THE system SHALL:
- Create a dedicated security ticket
- Assign to security team
- Investigate within 12 hours
- Respond to reporter within 72 hours
- Apply fix within 7 days
- Provide credit to researcher if verified

### Privacy Compliance

WHEN a user requests account deletion, THE system SHALL:
- Initiate deletion process immediately
- Confirm deletion with user
- Schedule permanent deletion of all data within 72 hours
- Delete from all databases
- Purge from backup systems
- Complete deletion within 72 hours
- Send confirmation email
- Comply with GDPR and CCPA requirements

WHEN a user requests data export, THE system SHALL:
- Generate ZIP file containing:
  - All user posts and comments
  - Profile information
  - Subscription history
  - Voting history
  - Moderation actions
  - Account settings
- Send to user email within 7 days
- Include date and time of data export
- Confirm completion via email

WHEN a user changes their email address, THE system SHALL:
- Validate new email uniqueness
- Send confirmation to new address
- Require verification of new email before update
- Keep old email until verification complete

## Feed System

### Home Feed

THE system SHALL provide a Home Feed that:
- Is accessible only to authenticated users
- Displays posts only from communities the user is subscribed to
- Orders posts according to selected sorting method
- Supports infinite scrolling or pagination with 20 items per page
- Allows filtering by time period for "Top" sorting (Today, This week, This month, This year, All time)
- Loads immediately upon user login
- Displays "No content" message if user has no subscriptions
- Shows visual indication for new posts since last visit
- Updates in real-time when new posts are created in subscribed communities

### Popular Feed

THE system SHALL provide a Popular Feed that:
- Is accessible to all users (authenticated and unauthenticated)
- Displays posts from all communities across the platform
- Orders posts according to selected sorting method
- Supports infinite scrolling or pagination with 20 items per page
- Allows filtering by time period for "Top" sorting (Today, This week, This month, This year, All time)
- Defaults to "Hot" sorting
- Shows "Sign in to customize your feed" message to unauthenticated users
- Loads immediately upon access
- Updates in real-time as new posts gain popularity

### Community Feed

THE system SHALL provide a Community Feed that:
- Is accessible to all users (authenticated and unauthenticated)
- Displays posts from a single specified community
- Orders posts according to selected sorting method
- Supports infinite scrolling or pagination with 20 items per page
- Allows filtering by time period for "Top" sorting (Today, This week, This month, This year, All time)
- Shows community name and icon prominently
- Displays "Subscribe to this community" button to unauthenticated users
- Shows "You must subscribe to post" message if user is not subscribed
- Loads immediately upon access
- Updates in real-time as new posts appear in the community

### Sorting Algorithms

#### Hot

WHEN a user selects "Hot" sorting, THE system SHALL calculate post scores using the formula:

score = (upvotes - downvotes) / ((hours since creation) + 2)^1.5

WHEN a post is created, THE system SHALL:
- Initiate score calculation using current timestamp
- Start with initial score of 0
- Update score incrementally as votes are cast
- Cache score for performance
- Recalculate when votes change

WHEN a post's votes change, THE system SHALL:
- Recalculate score using the hot formula
- Update sorted position in feed
- Push update to all subscribers

#### New

WHEN a user selects "New" sorting, THE system SHALL:
- Sort posts strictly by creation timestamp in descending order
- Ignore vote score entirely
- Order new posts above older posts

#### Top

WHEN a user selects "Top" sorting with a time filter, THE system SHALL:
- Apply time filter to votes received
- For "All time": use all votes
- For "Today": use votes within last 24 hours
- For "This week": use votes within last 7 days
- For "This month": use votes within last 30 days
- For "This year": use votes within last 365 days
- Calculate score as: total_upvotes - total_downvotes
- Sort by calculated score descending

#### Controversial

WHEN a user selects "Controversial" sorting, THE system SHALL calculate post scores using the formula:

score = abs(upvotes - downvotes) * (min(upvotes, downvotes) + 1)

WHEN a post has equal upvotes and downvotes, THE system SHALL:
- Calculate score as 0 * (upvotes + 1) = 0
- Display as highly controversial despite zero net score
- Rank equally among other posts with same score
- Sort by creation timestamp when scores are identical

WHEN a post has mostly one type of vote, THE system SHALL:
- Calculate low controversial score
- Rank lower than posts with balanced votes

### Feed Display

WHEN viewing any feed, THE system SHALL display each post with:

- Title (truncated to 100 characters if necessary)
- Author username (linked to profile)
- Community name (linked to community feed)
- Vote score
- Comment count
- Time since posted (in relative format: "3 hours ago" or similar)
- For text posts: first 200 characters of content
- For image posts: image thumbnail (200x200px, cropped from center)
- For link posts: domain name from the URL (e.g., "youtube.com")

WHEN a user scrolls down in a feed, THE system SHALL:
- Implement lazy loading for images
- Load additional posts as needed
- Maintain scroll position
- Display loading state
- Support infinite scroll and pagination toggle

WHEN a user selects a different sorting option, THE system SHALL:
- Clear current feed content
- Load new data sorted by selected method
- Update URL hash for shareability
- Preserve user preferences between sessions

## Error Handling and User Experience

### Form Validation Errors

WHEN a user submits invalid data in any form, THE system SHALL:
- Display specific error messages next to the relevant field
- Highlight the invalid field
- Maintain form values
- Not redirect or refresh the page
- Provide clear instruction on how to correct the error
- Return appropriate HTTP status codes (400 Bad Request)

### Performance and Reliability

WHEN a user loads any feed, THE system SHALL:
- Deliver content within 1.5 seconds on standard mobile connections
- Prefer pre-cached data for faster loading
- Implement connection timeouts of 5 seconds
- Display "loading" indicator during data retrieval
- Show "unable to load" error if request fails after 5 seconds

WHEN multiple users simultaneously load the Popular Feed with over 1,000 posts, THE system SHALL:
- Maintain response times under 2.5 seconds
- Use database indexing on timestamps and vote scores
- Implement horizontal scaling for read-heavy operations
- Use Redis caching for frequently accessed feeds

WHEN a user creates a post or comment, THE system SHALL:
- Confirm successful submission within 1 second
- Provide visual feedback on success
- Store in local draft if connection is lost
- Retry failed submissions automatically

WHEN a user attempts an invalid action, THE system SHALL:
- Return a clear, friendly error message
- Avoid technical jargon
- Provide guidance on next steps
- Not expose internal system details
- Log error for debugging

### Edge Cases and Special Conditions

WHEN a user tries to subscribe to a community that has been deleted, THE system SHALL:
- Return "Community not found" error
- Prevent subscription
- Log attempted access to non-existent community

WHEN a user tries to access a post that is deleted, THE system SHALL:
- Return "Post not found" message
- Redirect to feed if accessed from feed
- Show post was deleted with timestamp
- Record attempt for security monitoring

WHEN a user tries to report content they cannot see, THE system SHALL:
- Return "Unable to access this content" error
- Prevent reporting
- Log suspicious behavior

WHEN server is under heavy load, THE system SHALL:
- Implement graceful degradation for public feeds
- Keep critical functionality (login, reporting, posting) operational
- Queue non-critical operations
- Display maintenance message with estimated recovery time

WHEN database backup is in progress, THE system SHALL:
- Continue serving read operations
- Delay write operations by no more than 10 seconds
- Log backup status
- Notify users of maintenance

WHEN a user's account is suspended for violation, THE system SHALL:
- Disable all functionality
- Prevent login
- Keep data intact for review
- Display suspension message with reason and appeal process
- Notify user via email

## Future Expansion Considerations

The following features are out of scope for initial implementation but should be designed with extensibility in mind:

- User badges/achievements for contributions
- Community polls
- Rich text editors with formatting options
- Community monetization through tipping or subscriptions
- User blocks and privacy controls
- Customizable feed filters
- API access for third-party integration
- Mobile applications (iOS and Android)
- RSS feed support
- Voice and video content capabilities

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*