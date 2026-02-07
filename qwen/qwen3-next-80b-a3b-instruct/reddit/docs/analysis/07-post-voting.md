# Reddit-like Community Platform Requirements Specification

## User Account

### Registration

WHEN a new user joins the platform, THE system SHALL require them to provide:

- A valid email address (conforming to RFC 5322)
- A password with minimum 8 characters, including at least one uppercase letter, one lowercase letter, and one digit
- A unique username (between 3 and 30 characters, alphanumeric and underscore only)

WHEN the registration form is submitted, THE system SHALL:

- Validate all fields against the above requirements
- Check that the email address is not already registered
- Check that the username is not already taken
- Generate and store a bcrypt-hashed password
- Create a new user record with default karma score of 0
- Generate a unique UUID for the user's account
- Send a welcome email to the provided address
- Set the user's account status to "active"

WHEN an email address or username already exists, THE system SHALL display a clear error message indicating the conflict and prompt the user to try again.

WHEN registration is successful, THE system SHALL automatically authenticate the user and redirect them to their profile page.

### Login

WHEN a user attempts to log in, THE system SHALL:

- Accept the user's email address or username and password
- Locate the user record by email or username
- Compare the provided password with the stored bcrypt hash
- If credentials match, create a JWT token with user ID and expiration (24 hours)
- Store the token in an HTTP-only, secure cookie with SameSite=Strict
- Set the user's last login timestamp
- Return the JWT token to the client

WHEN credentials are invalid, THE system SHALL:

- Return a generic "invalid credentials" error
- Increment login attempt counter for the user
- Lock the account after 5 consecutive failed attempts for 15 minutes

WHEN a user is locked out, THE system SHALL display a message indicating the temporary lockout and duration.

### Password Change

WHEN a logged-in user requests to change their password, THE system SHALL:

- Require the user to provide their current password for verification
- Require a new password matching the same complexity requirements as registration
- Verify the new password does not match any of the user's previous 5 passwords
- Hash the new password with bcrypt
- Update the stored password hash
- Invalidate all existing JWT tokens for this user
- Send a password change confirmation email

WHEN the current password is incorrect, THE system SHALL reject the request and return an error.

WHEN the new password violates complexity rules, THE system SHALL highlight specific violations (e.g., "Password must contain at least one digit").

### Account Deletion

WHEN a user requests to delete their account, THE system SHALL:

- Require the user to re-enter their password for confirmation
- Archive all posts by setting their status to "deleted" and preserving content for moderation review
- Archive all comments by setting their status to "deleted" and preserving content for moderation review
- Replace user profile information with placeholders: "Deleted User" for display name, empty bio, default avatar
- Set user's karma score to 0
- Remove all active sessions and invalidate all tokens
- Mark the user record as "deleted" with timestamp
- Initiate asynchronous cleanup of associated media files
- Send a final confirmation email to the registered email address

WHEN the account deletion request is processed, THE system SHALL render a success message and logout the user.

## User Profile

### Profile Structure

EVERY user SHALL have a profile with:

- **Display name**: String (1-100 characters), can be changed by user
- **Bio**: Text field (up to 500 characters), optional, can be edited by user
- **Avatar image**: Reference to a stored image file, default to generated identicon if not set

WHEN a user visits their own profile page, THE system SHALL display:

- Their display name
- Their bio text
- Their avatar image
- Their total karma score (positive or negative)
- A tabbed interface showing:
  1. **Posts**: List of all posts they've created (including deleted posts marked as such)
  2. **Comments**: List of all comments they've written (including deleted comments marked as such)
  3. **Subscriptions**: List of communities they're subscribed to

WHEN a user visits another user's profile page, THE system SHALL display:

- The target user's display name
- The target user's bio text
- The target user's avatar image
- The target user's total karma score
- A tabbed interface showing:
  1. **Posts**: List of all public posts they've created (excluding deleted posts)
  2. **Comments**: List of all public comments they've written (excluding deleted comments)
  3. **Subscriptions**: List of communities they're subscribed to

WHEN a user's profile page loads, THE system SHALL:

- Fetch the profile data with a single database query
- Fetch the count of posts and comments separately
- Fetch subscription count
- Load only the first page of posts/comments on initial load, with pagination

### Profile Editing

WHEN a user edits their display name, THE system SHALL:

- Allow changes to any text between 1 and 100 characters
- Prevent the use of any system reserved names (e.g., "admin", "moderator", "support")
- Check for uniqueness across the platform
- Validate against inappropriate content (profanity, harassment)
- Save the change and update all references to the display name
- Log the change for audit purposes

WHEN a user edits their bio, THE system SHALL:

- Allow text up to 500 characters
- Strip HTML tags and script content for security
- Render plain text with line breaks preserved
- Enforce a minimum of no characters (it is optional)
- Save changes immediately without confirmation

WHEN a user uploads a new avatar, THE system SHALL:

- Accept JPG, PNG, or WebP format images
- Enforce a maximum file size of 2MB
- Resize and compress the image to 256x256 pixels
- Generate a unique filename for the image
- Store the image in cloud storage with public read access
- Store the image reference in the user profile
- Delete the old avatar image if it exists
- Store upload timestamp for content moderation

WHEN an avatar upload fails, THE system SHALL:

- Preserve the existing avatar
- Return a specific error message indicating the failure reason (size, format, etc.)

## Karma

### Karma Calculation

THE karma system SHALL calculate each user's karma score as the weighted sum of all their positive and negative interactions.

WHEN a user receives an upvote on any post or comment, THE system SHALL:

- Increase the user's karma score by 1
- Log the action in the karma history with timestamp, type (post/comment), and affected post/comment ID

WHEN a user receives a downvote on any post or comment, THE system SHALL:

- Decrease the user's karma score by 1
- Log the action in the karma history with timestamp, type (post/comment), and affected post/comment ID

WHEN a user's vote is removed from any post or comment, THE system SHALL:

- Reverse the karma change that resulted from the original vote
- For example: If a user upvoted a post (+1 karma), and later removes their upvote, the system SHALL subtract 1 karma
- The reversal SHALL occur regardless of whether the vote was originally up or down

WHEN a user account is deleted, THE system SHALL:

- Reverse ALL karma changes that resulted from that user's votes
- This means: For every upvote they cast, subtract 1 from the affected user's karma
- For every downvote they cast, add 1 to the affected user's karma
- SAve the final karma values with audit marker

WHEN a post or comment is deleted, THE system SHALL:

- Reverse ALL karma changes resulting from votes on that content
- For each upvote on the content, subtract 1 from the voter's karma
- For each downvote on the content, add 1 to the voter's karma

WHEN a community is archived, THE system SHALL:

- Preserve ALL karma history and scores
- Keep the karma score unchanged
- No karma changes are reversed

THE karma score SHALL be a single, persisted integer that recalculate after each vote action.

THE score SHALL be negative when more downvotes than upvotes have been received.

THE system SHALL display the karma score as a plain number (e.g., "-23", "0", "124") with no currency symbols, labels, or formatting.

Karma SHALL never be displayed as a percentage, percentile, or relative score.

### Karma Display

WHEN a user's profile is viewed, THE system SHALL display their total karma score prominently in a highlighted area.

WHEN a post or comment is displayed, THE system SHALL display the author's karma score as a small badge next to their username.

WHEN karma is displayed as a badge, THE system SHALL:

- Show the number with no plus sign for positive values
- Show the minus sign for negative values
- Use gray text for scores between -10 and 10
- Use blue text for scores between 11 and 100
- Use gold text for scores above 100
- Use red text for scores below -10

WHEN a user is banned from a community, THEIR karma score SHALL be unaffected and continue to be displayed.

Karma SHALL be calculated and displayed in real time.

THE system SHALL cache karma scores for performance, but SHALL refresh cache when any vote changes.

## Communities

### Community Creation

WHEN a user attempts to create a new community, THE system SHALL:

- Require a unique community name (between 3 and 20 characters)
- Require a description (up to 500 characters)
- Require an icon image (optional)
- Check if the name is already taken
- Validate that the name contains only alphanumeric characters and underscores
- Prevent use of system-reserved names (e.g., "new", "public", "admin")
- Check for inappropriate content (profanity, harassment)
- Create a record with the current user as owner
- Set subscriber count to 1 (the creator)
- Set creation date to now
- Set public visibility to true
- If an icon is provided, process it per avatar rules (2MB max, resize to 128x128)
- Store the community in the database
- Subscribe the creator to the new community
- Send a notification to the creator that the community is live

WHEN the community name is taken, THE system SHALL:

- Return a specific error: "This community name is already in use"
- Suggest alternative names based on the root string

WHEN community creation is successful, THE system SHALL:

- Redirect the user to the new community's page
- Highlight the "Create Post" button

### Community Browse and Search

WHEN a user visits the communities directory, THE system SHALL:

- Display all active communities in a grid or list view
- Show each community with:
  - Icon (or default icon if none is set)
  - Name (with link to community page)
  - Description (truncated to 120 characters)
  - Subscriber count
  - Creation date (relative time)
- Allow sorting by: most subscribers, newest, alphabetically
- Allow filtering by: nsfw, private (if not owned)

WHEN a user searches for communities, THE system SHALL:

- Accept search queries of 2+ characters
- Match against community name and description
- Return results ordered by relevance: exact match > partial match > description match
- Limit results to 50 per page with pagination
- Highlight matching text in results
- Show "No communities found" message when query returns no results

WHEN a user is logged out, THE system SHALL:

- Display the same community listing as logged-in users
- Exclude communities marked as private

WHEN a user is logged in, THE system SHALL:

- Display the same community listing
- Highlight communities the user is subscribed to with a "Subscribed" badge
- Allow subscription actions from the listing

### Community Subscription

WHEN a user subscribes to a community, THE system SHALL:

- Add the user to the community's subscriber list
- Increment the subscriber count by 1
- Add the community to the user's subscription list
- Update the user's home feed to include content from this community
- Store the subscription date and timestamp
- Send a notification: "You are now subscribed to [community]"

WHEN a user unsubscribes from a community, THE system SHALL:

- Remove the user from the community's subscriber list
- Decrement the subscriber count by 1
- Remove the community from the user's subscription list
- Remove future posts from that community from the user's home feed
- Send a notification: "You are no longer subscribed to [community]"

WHEN a user attempts to subscribe to a community they're already subscribed to, THE system SHALL:

- Ignore the request
- Return no error
- Maintain current subscription status

WHEN a user attempts to subscribe to a private community they're not invited to, THE system SHALL:

- Return an error: "This community is private. Contact the owner for access."
- Do not show the community in public search or listing

WHEN a user is banned from a community, THE system SHALL:

- Remove any active subscriptions to that community
- Prevent them from re-subscribing
- Keep the subscription history for audit

WHEN a community is deleted, THE system SHALL:

- Remove all subscription records related to that community
- Notify all subscribers with a message: "[Community] has been terminated"
- All posts from that community remain visible but are marked as from "Deleted Community"

## Posts

### Post Creation

WHEN a user creates a post, THE system SHALL:

- Require the user to be subscribed to the target community
- Require a title of at least 5 characters and at most 300 characters
- Require the user to select one of three post types: text, link, or image
- Enforce one and only one content-type field per post
- Accept text content (up to 10,000 characters) for text posts
- Accept a publicly accessible URL for link posts (validate format)
- Accept an image file (JPG, PNG, WebP, up to 5MB) for image posts
- Assign a unique post ID
- Set the creation timestamp
- Set initial vote score to 0
- Set comment count to 0
- Set the post status to "active"
- Link the post to the user and community
- Store the post in the database

WHEN a user selects "text" as post type, THE system SHALL:

- Require the text content field to be non-empty after trimming whitespace
- Validate character count (5-10,000)
- Escaping HTML for security
- Allow markdown formatting

WHEN a user selects "link" as post type, THE system SHALL:

- Require a valid URL format (http:// or https://)
- Strip any tracking parameters
- Extract the domain name as the display site
- Validate the URL is accessible with HTTP HEAD request (timeout 2 seconds)
- Store the shortened original URL
- Store the extracted domain

WHEN a user selects "image" as post type, THE system SHALL:

- Require a valid image file upload
- Check file type against allowed list
- Check file size (≤5MB)
- Resize image to 1200px width (maintain aspect ratio)
- Compress to 85% quality
- Generate unique filename
- Store in cloud storage
- Generate thumbnail (180x120px)
- Store image dimensions

WHEN a user cannot create a post due to not being subscribed, THE system SHALL:

- Display a modal with options:
  - "Subscribe to [community]"
  - "Browse other communities"
  - "Return to feed"

WHEN a post type selection is invalid, THE system SHALL:

- Highlight all required fields
- Show validation errors next to each invalid field
- Prevent form submission until all requirements are met

### Post Editing

WHEN a user edits their own post, THE system SHALL:

- Allow editing for 30 minutes after creation
- Allow editing of:
  - Title (same limits as creation)
  - Content (same limits as creation)
- Allow changing of post type with data migration:
  - text ↔ link: convert URL to text or text to URL
  - text ↔ image: remove image and add text, or add image from URL
- Allow editing of community if the user is subscribed to the new community
- Set "edited" flag and timestamp
- Store the original content in revision history
- Send notification: "Post edited [time ago]"

WHEN a user attempts to edit a post after the 30-minute window, THE system SHALL:

- Display a message: "You can no longer edit this post. Contact a moderator if you need to make changes."
- Show the edit button disabled

WHEN a user attempts to edit a post they do not own, THE system SHALL:

- Deny access and show "You don't have permission to edit this post."

### Post Deletion

WHEN a user deletes their own post, THE system SHALL:

- Set post status to "deleted"
- Preserve all content and metadata for moderation review
- Remove the post from all public feeds
- Display "[Deleted by user]" in place of the post
- Remove all votes associated with the post
- Calculate karma adjustments for all users who voted on the post
- Record deletion timestamp
- Send notification to all subscribers of the community

WHEN a moderator deletes a post, THE system SHALL:

- Set post status to "deleted by moderator"
- Record the moderator's ID and deletion reason
- Preserve all content
- Remove from all public feeds
- Remove all votes
- Calculate karma adjustments
- Record deletion timestamp
- Send notification to post author and subscribers
- Add a moderation log entry
- Notify the user that: "This post was removed by [moderator] for: [reason]"

WHEN a post is deleted, THE system SHALL:

- Update all feed views immediately (real-time)
- Update compute aggregate statistics (karma, comment count)
- Maintain historical data for audits

### Post Viewing

WHEN a user views a single post, THE system SHALL display:

- Title
- Author username with hyperlink to profile
- Community name with hyperlink to community page
- Vote score
- Vote controls (upvote/downvote/remove)
- Comment count
- Post creation timestamp (formatted as "X hours/days ago")
- Post content:
  - For text: full text rendered with formatting
  - For link: URL as clickable link, domain name visibly displayed, preview if available
  - For image: full-size image with controls (zoom, download)
- Date and time of last edit (if any)
- Suicide panel on posts from banned users

WHEN a user views a post from a community they're not subscribed to, THE system SHALL:

- Allow viewing the post
- Display a "Subscribe" button
- Allow commenting if not banned
- Allow voting if not banned

WHEN a user who is banned views a post, THE system SHALL:

- Allow viewing the post content
- Gray out all interaction buttons (vote, comment)
- Replace all user actions with disabled placeholders
- Show banner: "You are banned from this community. You can still view content."

## Post Voting

### Voting Logic

WHEN a user upvotes a post, THE system SHALL:

- If user has no previous vote: increment vote score by 1, create "upvote" record
- If user previously downvoted: increment vote score by 2 (remove -1, add +1), update vote to "upvote"
- If user previously upvoted: ignore request

WHEN a user downvotes a post, THE system SHALL:

- If user has no previous vote: decrement vote score by 1, create "downvote" record
- If user previously upvoted: decrement vote score by 2 (remove +1, add -1), update vote to "downvote"
- If user previously downvoted: ignore request

WHEN a user removes their vote, THE system SHALL:

- If user had upvote: decrement vote score by 1, delete vote record
- If user had downvote: increment vote score by 1, delete vote record
- If user had no vote: ignore request

WHEN a user is banned from the community where a post resides, THE system SHALL:

- Prevent any voting actions on any posts in that community
- Hide voting controls within that context
- If user was previously voted, remove all votes and adjust score appropriately

WHEN a user changes their vote from up to down or vice versa, THE system SHALL:

- Adjust vote score by ±2 as described
- Change vote type immediately
- Update user interface to reflect change

WHEN a user attempts to vote on a deleted post, THE system SHALL:

- Return error: "This post has been deleted"
- Hide voting interface

WHEN a post's vote score is calculated, THE system SHALL:

- Be the sum of +1 for each upvote and -1 for each downvote
- Be a signed integer
- Exclude any votes from banned users
- Update immediately after any vote operation
- Cache the value with auto-expiry (5 minutes)

WHEN vote score is displayed, THE system SHALL:

- Show as a plain number with no symbols
- Display positive numbers without + sign
- Show negative numbers with - sign
- Show "0" for neutral scores

### Vote State Management

WHEN a user's vote on a post is active, THE system SHALL:

- Highlight the selected vote button (e.g., red for downvote, blue for upvote)
- Show pencil icon for vote removal
- Disable the opposite vote button (already selected)
- Update button state visually in real time on vote action

WHEN a user's vote on a post is removed, THE system SHALL:

- Clear all visual indication of vote
- Reset button colors to original (default)
- Disable removal icon
- Show active counts without user-specific indicators

WHEN a user views any feed, THE system SHALL:

- Load the current vote score and user's vote state for each post
- Apply correct visual indicators per user's position
- Do not use cookies or local storage to deduce vote state
- Always fetch from server to prevent cache poisoning

WHEN a user's account is deleted, THE system SHALL:

- Remove all votes cast by that user
- Adjust all affected post vote scores accordingly
- Purge vote records permanently

WHEN a post is moved between communities, THE system SHALL:

- Preserve all existing votes
- Apply all vote logic to the new community context
- Allow interactions based on new community's permissions

## Post Feeds

### Home Feed

WHEN an authenticated user visits the Home Feed, THE system SHALL:

- Display posts only from communities the user is subscribed to
- Exclude posts from communities the user has unsubscribed from
- Exclude posts from communities the user is banned from
- Exclude posts marked as "deleted" or "low quality"
- Allow sorting by: Hot, New, Top, Controversial
- Allow time filters for Top: today, this week, this month, this year, all time
- Implement pagination: 25 posts per page
- Load posts synchronously on user scroll (infinite scroll)
- Promote videos to prominent placement
- Expose only posts that have been upvoted at least once (unless New) or are recent

WHEN a user is not logged in, THE system SHALL:

- Redirect to the Popular Feed
- Show a login prompt

WHEN a user visits the Home Feed after logout, THE system SHALL:

- Clear all feed preferences and reset to Popular Feed
- Remove any tracking cookies

### Popular Feed

WHEN any user (authenticated or guest) visits the Popular Feed, THE system SHALL:

- Display posts from all active communities
- Ignore subscription or ban status
- Exclude all deleted posts
- Allow sorting by: Hot, New, Top, Controversial
- Allow time filters for Top: today, this week, this month, this year, all time
- Implement pagination: 25 posts per page
- Load posts synchronously on user scroll
- Prioritize high-engagement content
- Include nsfw content only if user has enabled NSFW filter
- Prevent post creation

WHEN nsfw content is included, THE system SHALL:

- Preload a "Contains NSFW" overlay
- Require user to click "Show Content" to reveal
- Not display in thumbnail previews
- Can be filtered out via user settings

WHEN a user logs in while viewing Popular Feed, THE system SHALL:

- Maintain the current view
- Begin tracking user's voting behavior
- Begin storing subscription data
- Keep the Popular Feed as default until explicit switch to Home

WHEN a user logs out during Popular Feed viewing, THE system SHALL:

- Continue displaying the same feed
- Preserve location and sorting preferences in browser storage
- Keep pagination state intact

### Community Feed

WHEN a user visits any specific community's feed, THE system SHALL:

- Display all active posts from that community
- Ignore user subscription status
- Include posts from users banned from the community
- Exclude deleted posts
- Allow sorting by: Hot, New, Top, Controversial
- Allow time filters for Top: today, this week, this month, this year, all time
- Implement pagination: 25 posts per page
- Load posts synchronously on user scroll
- Show community banner, description, and subscriber count at top
- Show "Subscribe" button only if user is not subscribed and not banned
- Show "Manage Community" button only if user is owner/moderator

WHEN a user is banned from the community, THE system SHALL:

- Still display all posts
- Disable all posting and commenting
- Disable voting
- Display notice: "You are banned from [community]. You can still view content."

## Post List Display

WHEN any feed displays a list of posts, each post entry SHALL show:

- Title (truncated to 100 characters if longer, with ellipsis)
- Author username (hyperlinked to profile)
- Community name (hyperlinked to community page)
- Vote score (as integer, no prefix)
- Comment count (as integer)
- Time since posted (formatted as "X minutes/hours/days ago")
- Content preview:
  - For text posts: first 200 characters, stripped of HTML, with ellipsis
  - For link posts: domain name (e.g., "youtube.com", "wikipedia.org") in small text below title
  - For image posts: thumbnail image (150x100 pixels) with aspect ratio preserved
- A vote control panel with upvote/downvote/removal (if user is not banned)
- A comment indicator with count and click action
- A timestamp relative to user's timezone (Asia/Seoul)

WHEN a post is marked as "controversial", THE system SHALL:

- Display a "🔥" badge next to the vote score
- Apply a special styling if it qualifies as controversial by algorithm
- Increase visibility in all feeds

WHEN an image post contains accompanying text, THE system SHALL:

- Show both thumbnail and excerpt (200 characters)
- Prioritize thumbnail for display

WHEN a post has no content (e.g., empty text but image present), THE system SHALL:

- Display thumbnail without excerpt
- Show "No text" or similar placeholder

WHEN the feed loads with more than 25 posts, THE system SHALL:

- Show a "Load more" button after the 25th
- Use pagination by default for compatibility with non-JS clients
- Fetch next page on scroll / click

WHEN a user clicks on a post in the feed, THE system SHALL:

- Navigate to the post's detailed view
- Preserve scroll position on back navigation

## Comments

### Comment Creation

WHEN a user creates a comment, THE system SHALL:

- Require the user to be authenticated
- Require the user to not be banned from the post's community
- Require the comment content to be 1-1,000 characters
- Validate against profanity and harassment filtering
- Allow markdown formatting
- Prevent HTML tags
- Allow replies to any existing comment (including replies to replies)
- Establish parent-child relationship in database with hierarchical ID structure
- Assign unique comment ID
- Set creation timestamp
- Set vote score to 0
- Set status to "active"
- Link to the author and the post
- Add comment to the post's comment tree
- Update post's comment count

WHEN a user posts a comment that is a reply to another comment, THE system SHALL:

- Store the parent comment ID
- Set depth level incrementally: 1 = top-level, 2 = reply to top, 3 = reply to reply, etc.
- Display visually nested under the parent
- Allow nesting arbitrarily deep

WHEN a user tries to comment on a deleted post, THE system SHALL:

- Block comment creation
- Show message: "You cannot comment on a deleted post"

WHEN a user tries to comment in a community they're banned from, THE system SHALL:

- Block comment creation
- Show message: "You are banned from commenting in this community"

### Comment Editing

WHEN a user edits their own comment, THE system SHALL:

- Allow editing for 30 minutes after creation
- Allow changes to content only (text, markdown)
- Preserve the original content in revision history
- Set "edited" flag and timestamp
- Show "(edited)" next to timestamp
- Send notification to users mentioned in an @-mention (if implemented)
- Update all displays of the comment

WHEN a user attempts to edit a comment after the 30-minute window, THE system SHALL:

- Disable the edit button
- Show message: "You can no longer edit this comment."

WHEN a moderator edits a comment, THE system SHALL:

- Allow any edits at any time
- Set "edited by moderator" flag
- Record moderator ID and reason
- Do not store original version
- Show "[Moderator edited]" marker

### Comment Deletion

WHEN a user deletes their own comment, THE system SHALL:

- Set comment status to "deleted"
- Preserve content for moderation review
- Hide comment from public view
- Display "[Deleted by user]" in place of content
- Remove votes associated with comment
- Adjust karma for voters and author
- Update comment count on post
- Record deletion timestamp
- Allow undeletion by moderator

WHEN a moderator deletes a comment, THE system SHALL:

- Set comment status to "deleted by moderator"
- Preserve content in database
- Hide from public view
- Display "[Deleted by moderator]" with reason
- Remove votes
- Adjust karma
- Update comment count
- Log deletion with moderator ID and reason
- Notify the comment author

WHEN a comment is totally deleted, THE system SHALL:

- Remove from comment tree
- Recursively delete any replies
- Update all post comment counters
- Purge voting records permanently

WHEN a comment thread is collapsed, THE system SHALL:

- Show only top N levels (e.g., 2 levels visible)
- Show "+X more replies" link
- Expand on demand

## Comment Voting

### Voting Logic

WHEN a user upvotes a comment, THE system SHALL:

- If user has no previous vote: increment vote score by 1, create "upvote" record
- If user previously downvoted: increment vote score by 2 (remove -1, add +1), update vote to "upvote"
- If user previously upvoted: ignore request

WHEN a user downvotes a comment, THE system SHALL:

- If user has no previous vote: decrement vote score by 1, create "downvote" record
- If user previously upvoted: decrement vote score by 2 (remove +1, add -1), update vote to "downvote"
- If user previously downvoted: ignore request

WHEN a user removes their comment vote, THE system SHALL:

- If user had upvote: decrement vote score by 1, delete vote record
- If user had downvote: increment vote score by 1, delete vote record
- If user had no vote: ignore request

WHEN a user is banned from the community where a comment resides, THE system SHALL:

- Prevent any voting actions on any comments in that community
- Hide voting controls within that context
- If user was previously voted, remove all votes and adjust score appropriately

WHEN a user changes their vote from up to down or vice versa, THE system SHALL:

- Adjust vote score by ±2 as described
- Change vote type immediately
- Update user interface to reflect change

WHEN a user attempts to vote on a deleted comment, THE system SHALL:

- Return error: "This comment has been deleted"
- Hide voting interface

WHEN a comment's vote score is calculated, THE system SHALL:

- Be the sum of +1 for each upvote and -1 for each downvote
- Be a signed integer
- Exclude any votes from banned users
- Update immediately after any vote operation
- Cache the value with auto-expiry (5 minutes)

WHEN vote score is displayed, THE system SHALL:

- Show as a plain number with no symbols
- Display positive numbers without + sign
- Show negative numbers with - sign
- Show "0" for neutral scores

### Vote State Management

WHEN a user's vote on a comment is active, THE system SHALL:

- Highlight the selected vote button (e.g., red for downvote, blue for upvote)
- Show pencil icon for vote removal
- Disable the opposite vote button (already selected)
- Update button state visually in real time on vote action

WHEN a user's vote on a comment is removed, THE system SHALL:

- Clear all visual indication of vote
- Reset button colors to original (default)
- Disable removal icon
- Show active counts without user-specific indicators

WHEN a user views any comment section, THE system SHALL:

- Load the current vote score and user's vote state for each comment
- Apply correct visual indicators per user's position
- Do not use cookies or local storage to deduce vote state
- Always fetch from server to prevent cache poisoning

WHEN a user's account is deleted, THE system SHALL:

- Remove all votes cast by that user
- Adjust all affected comment vote scores accordingly
- Purge vote records permanently

WHEN a comment is moved to a different post, THE system SHALL:

- Preserve all existing votes
- Apply all vote logic to the new post's community context
- Allow interactions based on new community's permissions

## Comment Sorting

### Sorting Algorithms

WHEN comments are sorted by "Best", THE system SHALL:

- Rank comments by highest vote score first
- Break ties by recency (newest first)
- Apply time decay: comments older than 24 hours get slight penalty

WHEN comments are sorted by "New", THE system SHALL:

- Rank comments by creation timestamp descending
- Show newest comments on top
- Ignore vote score

WHEN comments are sorted by "Controversial", THE system SHALL:

- Rank comments by total votes (upvotes + downvotes) high to low
- THEN by absolute value of vote score: closest to 0 first (e.g., 10 upvotes + 10 downvotes = score 0 ranks higher than 100 upvotes + 10 downvotes = score 90)
- Ties broken by recency

WHEN sorting is applied, THE system SHALL:

- Recalculate comment order on client side
- Update display immediately
- Store user's preference in persistent settings
- Preserve sort selection across sessions

WHEN comments are paginated, THE system SHALL:

- Display 10 comments per page
- Load additional pages as user scrolls
- Include "Load more" button for compatibility
- Show total comment count at top

## Community Moderation

### Moderator Roles and Permissions

WHEN a community is created, THE system SHALL:

- Automatically designate the creator as the "Owner"
- Assign full permissions, including ability to:
  - Add/remove moderators
  - Ban/unban users
  - Delete any post or comment
  - Archive the community
  - Modify community settings

WHEN an owner adds a moderator, THE system SHALL:

- Add the user to the community's moderator list
- Grant the following permissions:
  - Delete any post in the community
  - Delete any comment in the community
  - Ban and unban users from the community
  - View all reports in the community
  - Approve or dismiss reports
  - Add other moderators
- Do NOT grant ability to:
  - Remove the owner
  - Remove other moderators
  - Archive the community
  - Change community name or icon

WHEN an owner removes a moderator, THE system SHALL:

- Remove the user from the moderator list
- Revoke all moderator permissions immediately
- Retain historical access logs
- Notify the user that they are no longer a moderator

WHEN a moderator adds another moderator, THE system SHALL:

- Add the user to the moderator list
- Grant same permissions as current moderators
- NOT grant ability to remove the owner or other moderators

WHEN a moderator tries to remove another moderator, THE system SHALL:

- Block the action
- Return error: "Only the owner can remove moderators"

WHEN a moderator tries to remove the owner, THE system SHALL:

- Block the action
- Return error: "You cannot remove the community owner"

WHEN a moderator tries to ban the owner, THE system SHALL:

- Block the action
- Return error: "You cannot ban the community owner"

WHEN an owner tries to ban another owner, THE system SHALL:

- Block the action (no such scenario possible)
- Return error: "Only one owner exists per community"

## Moderation Actions

### Posting/Commenting Restrictions

WHEN a user is banned from a community, THE system SHALL:

- Prevent posting new content in that community
- Prevent commenting on any posts in that community
- Prevent voting on any posts or comments in that community
- Allow viewing all public content
- Allow viewing their own deleted content (for appeals)
- Allow subscription to other communities

WHEN a user is unbanned from a community, THE system SHALL:

- Restore posting, commenting, and voting abilities
- Remove all previous bans from logs
- Clear their specific moderation flags
- Notify them: "You have been unbanned from [community]"

### Reporting System

WHEN a user reports a post or comment, THE system SHALL:

- Require the user to be authenticated
- Require the user to be not banned from the content's community
- Require a reason of 5-500 characters
- Allow selection of pre-defined reason categories:
  - Harassment
  - Spam
  - NSFW (without warning)
  - Impersonation
  - Illegal content
  - Other (free text)
- Associate the report with the target content, reporter, timestamp, and reason
- Create a visibility flag "pending review"
- Send notification to moderators of the community

WHEN a moderator views reports, THE system SHALL:

- See a list of all reports in their community
- See for each report:
  - The reported content (with truncated preview)
  - The reporter's username
  - The report reason
  - The timestamp of report
  - The original author's username
- Filter reports by: status (pending, approved, dismissed)
- Sort by: newest first
- Mark reports as resolved after action

WHEN a moderator approves a report, THE system SHALL:

- Delete the reported content (as described in earlier delete workflows)
- Record moderator ID and approval timestamp
- Notify the reporter: "Your report has been approved and the content removed."
- Notify the original author: "Your post/comment was removed by a moderator for: [reason]"
- Move the report to "approved" status
- Log the action in moderation audit

WHEN a moderator dismisses a report, THE system SHALL:

- Do NOT delete the content
- Record moderator ID and dismissal timestamp
- Notify the reporter: "Your report has been dismissed. The content remains visible."
- Move the report to "dismissed" status
- Log the action in moderation audit
- Optionally allow reporter to appeal

WHEN a report is dismissed, THE system SHALL:

- Remove from awaiting reports list
- Archive for audit purposes
- Convert to "closed" status
- Do NOT send further notifications to reporter

WHEN moderator tools are used, THE system SHALL:

- Log all actions with user IP, timestamp, target, and action type
- Prevent major actions without confirmation
- Require re-authentication for critical actions (delete, ban)

### Ban State Management

WHEN a user is banned, THE system SHALL:

- Add user to community-specific ban list
- Store ban reason, moderator ID, expiration (or "permanent")
- Record datetime of ban
- Immediately revoke posting and commenting permissions in that community
- Preserve all previous content belonging to the user
- Remove their active subscriptions to that community
- Notify the user: "You have been banned from [community]. Reason: [reason]"

WHEN a ban expires, THE system SHALL:

- Automatically remove the user from the ban list
- Restore posting and commenting permissions
- Notify the user: "Your ban from [community] has expired."
- Retain historical record for moderation review

WHEN a user is banned permanently, THE system SHALL:

- No expiration date set
- Ban list entry marked as permanent
- The ban is irreversible
- Requires community owner intervention to override
- Record permanent ban flag

WHEN a moderator bans a user, THE system SHALL:

- Be required to enter a reason
- Cannot force it without reason
- Can set duration: temporary (6 hours, 24 hours, 7 days) or permanent
- Can optionally send a custom message

## Reporting

### Report Integrity

THE system SHALL:

- Treat all reports with confidentiality
- Never expose reporter identity to the reported user or public
- Only permit moderator access to report details
- Use UUID-based tokens internally to reference reports
- Maintain all report logs for at least 1 year
- Guarantee reports are never falsified or backdated
- Smoothly handle concurrent reporting
- Enforce rate limits: max 5 reports per user per hour
- If a user reports the same content multiple times, only the first register

### Enforcement and Compliance

THE system SHALL:

- Provide all moderator tools in an accessible, secure area
- Require moderator re-authentication for all deletion and ban actions
- Log every moderator action with timestamp, IP address, and user agent
- Allow sorting and filtering of all historical reports
- Allow download of report audit logs in CSV
- Integrate with legal compliance requirements if applicable
- Not allow automated banning or approval

THE system SHALL NOT:

- Disclose reporter identity
- Display reporter statistics to public or community owners
- Allow ignored reports to re-appear in lists
- Allow moderators to view reports outside their communities
- Allow advisory users to create reports
- Automatically remove content on first report
- Reliance on AI decision-making for report outcomes

THE system SHALL ensure:

- All user interactions are encrypted and safe
- All moderator actions are auditable
- All content data is preserved for regulatory compliance
- All reporting activities are anonymous



---

> *Written by AutoBE - A complete, production-ready backend requirements specification for planning phases.*