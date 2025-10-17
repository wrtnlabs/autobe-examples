## 1. New User Registration Journey

### Step 1: Access Registration Page
- WHEN a guest visits the platform homepage, THE system SHALL display a prominent "Sign Up" button.
- THE system SHALL render the registration form with fields for: email address, username, and password.

### Step 2: Input Registration Data
- WHEN a guest enters their email address, THE system SHALL validate format (must be valid email syntax).
- WHEN a guest enters their username, THE system SHALL validate:
  - Minimum 3 characters
  - Maximum 20 characters
  - Only alphanumeric characters and underscores allowed
  - Must be unique across the platform
- WHEN a guest enters their password, THE system SHALL validate:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one digit
  - No spaces allowed

### Step 3: Submit Registration Form
- WHEN the guest clicks the "Create Account" button, THE system SHALL:
  - Check if the email is already registered
  - Check if the username is already taken
  - Verify all password requirements are met
- IF email or username already exists, THEN THE system SHALL display error: "This email or username is already in use. Please use another."
- IF password does not meet requirements, THEN THE system SHALL display error: "Password must be at least 8 characters long and include uppercase, lowercase, and a number."
- IF ALL validations pass, THEN THE system SHALL create a new member account with pending email verification status.

### Step 4: Email Verification
- WHEN account is created, THE system SHALL send a verification email with a unique, time-limited (24-hour) token in a clickable link.
- WHEN the guest clicks the verification link, THE system SHALL:
  - Validate the token
  - Confirm account is within 24-hour validity window
  - Change account status from "pending verification" to "active"
- IF token is invalid, expired, or already used, THEN THE system SHALL display message: "This verification link is no longer valid. Please request a new one."
- IF verification succeeds, THEN THE system SHALL redirect the user to their feed and display success message: "Welcome! Your account is now active."

### Step 5: Post-Verification Experience
- WHEN the account is verified, THE system SHALL automatically log the user in as a member.
- THE system SHALL display a welcoming banner: "Thank you for joining! Start exploring communities."
- THE system SHALL enable all member features (posting, commenting, voting).

### Failure State
- IF email server fails to send verification email, THE system SHALL display: "We couldn't send your verification email. Please check your spam folder or try again."
- IF registration is interrupted (network failure), THE system SHALL save form data locally (if possible) and allow the user to resume after reconnect.

## 2. Community Creation Journey

### Step 1: Access Community Creation
- WHEN a member clicks the "Create Community" button from navigation or dashboard, THE system SHALL display the community creation form.

### Step 2: Input Community Details
- WHEN a member enters a community name, THE system SHALL validate:
  - Minimum 3 characters
  - Maximum 21 characters
  - Only alphanumeric characters and underscores allowed
  - Must be unique across the platform (case-insensitive)
- WHEN a member enters a description, THE system SHALL allow up to 400 characters.
- WHEN a member selects community type, THE system SHALL provide options: "Public" and "Restricted".
  - "Public": anyone can view and join
  - "Restricted": requires approve to join

### Step 3: Submit Community Creation
- WHEN the member clicks "Create", THE system SHALL:
  - Check if community name already exists
  - Verify community name matches naming rules
  - Associate the community with the member as its founder
- IF name is taken, THEN THE system SHALL display: "A community with that name already exists. Try a different name."
- IF name is valid, THEN THE system SHALL create the community and assign the member as automatic moderator.
- WHEN community is created, THEN THE system SHALL redirect member to the new community page and display: "Your community has been created! Invite others to join."

### Step 4: Post-Creation Actions
- THE system SHALL automatically subscribe the creator to their own community.
- THE system SHALL display "Moderate" button on the community page for the founder.

### Failure State
- IF server fails to create community, THEN THE system SHALL display: "Failed to create community. Please try again."

## 3. Posting Content Journey

### Step 1: Initiate New Post
- WHEN a member navigates to any community page, THE system SHALL display a "Create Post" button.

### Step 2: Choose Post Type
- WHEN a member clicks "Create Post", THE system SHALL present three post type options: "Text Only", "Link", or "Image".
- WHEN member selects a type, THE system SHALL display appropriate input fields.

### Step 3: Enter Post Content
- FOR "Text Only":
  - WHEN member enters title, THE system SHALL validate:
    - Minimum 1 character
    - Maximum 300 characters
  - WHEN member enters body text, THE system SHALL validate:
    - Maximum 10,000 characters
- FOR "Link":
  - WHEN member enters post title, THE system SHALL validate:
    - Minimum 1 character
    - Maximum 300 characters
  - WHEN member enters URL, THE system SHALL validate:
    - Must be a properly formatted URL (http:// or https://)
    - Must not contain blacklisted domains
- FOR "Image":
  - WHEN member enters title, THE system SHALL validate:
    - Minimum 1 character
    - Maximum 300 characters
  - WHEN member uploads image file, THE system SHALL validate:
    - File size ≤ 10MB
    - File type: JPG, JPEG, PNG, GIF only
    - File name must not contain malicious scripts
    - Image metadata must be stripped

### Step 4: Submit Post
- WHEN member clicks "Post", THE system SHALL:
  - Validate all fields (required fields are filled)
  - Check for banned words or spam patterns
  - Timestamp the post
  - Associate post with the selected community and member
- IF title is empty, THEN THE system SHALL display: "Please enter a title for your post."
- IF URL is invalid, THEN THE system SHALL display: "Please enter a valid web address starting with http:// or https://"
- IF image upload exceeds size limit, THEN THE system SHALL display: "Image too large. Maximum size is 10MB."
- IF image type is not supported, THEN THE system SHALL display: "Supported formats: JPG, JPEG, PNG, and GIF."
- IF image upload fails, THEN THE system SHALL display: "Failed to upload image. Please try again."
- IF all validations pass, THEN THE system SHALL create the post and display success message: "Your post has been published."

### Step 5: Post Display
- WHEN post is successfully created, THE system SHALL display it immediately in the community feed.
- THE system SHALL show: post title, author username, timestamp, community name, vote count, and comment count.

## 4. Voting on a Post Journey

### Step 1: Access Voting Interface
- WHEN a member views any post, THE system SHALL display upvote and downvote buttons (▲ and ▼) next to the post.

### Step 2: Cast Vote
- WHEN a member clicks "Upvote" button, THE system SHALL:
  - Check if member has already voted on this post
  - If previously downvoted, THEN cancel downvote and register upvote
  - If previously upvoted, THEN cancel existing upvote (remove vote)
  - If never voted, THEN register new upvote
- WHEN a member clicks "Downvote" button, THE system SHALL:
  - Check if member has already voted on this post
  - If previously upvoted, THEN cancel upvote and register downvote
  - If previously downvoted, THEN cancel existing downvote (remove vote)
  - If never voted, THEN register new downvote

### Step 3: Legal Vote Verification
- IF member is not authenticated (guest), THEN THE system SHALL display: "Log in to vote on posts and comments."
- IF member attempts to vote on their own post, THEN THE system SHALL display: "You cannot vote on your own content."
- IF member is rate-limited (more than 10 votes in current session), THEN THE system SHALL display: "Too many votes too quickly. Please wait before voting again."

### Step 4: Vote Application
- WHEN vote is successfully registered or removed, THE system SHALL immediately update:
  - Vote count display (show net total: upvotes minus downvotes)
  - Vote button state (highlighted if voted, neutral if not)
- THE system SHALL update the server-side vote tally within 500ms.

### Step 5: Vote Persistence
- WHEN user reloads the page, THE system SHALL restore their previous vote state.
- THE system SHALL persist vote data indefinitely (no expiry) unless revoked by user.

## 5. Creating a Nested Comment Journey

### Step 1: Initiate Comment
- WHEN a member views a post, THE system SHALL display a "Comment" input field below.

### Step 2: Enter Comment Text
- WHEN member types in comment, THE system SHALL validate:
  - Minimum 1 character
  - Maximum 1,000 characters (including spaces)
- IF comment exceeds limit, THEN THE system SHALL show character counter warning:
  - "Characters: 800/1000"
  - Red warning after 900

### Step 3: Submit Comment
- WHEN member clicks "Post Comment", THE system SHALL:
  - Validate content length
  - Scan for prohibited content or spam
  - Associate comment with the post and member
  - Timestamp the original comment
  - Set comment level to 1 (top-level)
- IF comment is empty, THEN THE system SHALL display: "Please type something before posting."
- IF comment contains blacklisted content, THEN THE system SHALL display: "Your comment has been rejected for violating community guidelines."
- IF comment already exists (duplicate), THEN THE system SHALL display: "You've already posted this comment."
- IF comment succeeds, THEN THE system SHALL append the comment to the post and display success message: "Your comment has been posted."

### Step 4: Reply to Existing Comment
- WHEN member clicks "Reply" under any existing comment, THE system SHALL:
  - Open a reply input box below that comment
  - Pre-fill the reply with "@username " to indicate context
- WHEN member submits reply, THE system SHALL:
  - Validate content length (1-1,000 characters)
  - Set reply’s depth level = parent comment’s level + 1
- IF comment depth exceeds 5 levels, THEN THE system SHALL display: "Replies can only nest up to 5 levels deep."
- IF reply submission fails, THEN THE system SHALL display: "Failed to post reply. Try again."

### Step 5: Nested Comment Display
- THE system SHALL visually indent replies by 20px per level.
- THE system SHALL display reply hierarchy clearly with user avatars and timestamps.
- THE system SHALL limit display of nested replies to first 3 levels by default.
- WHEN member clicks "Show X more replies", THE system SHALL load next level of replies.
- THE system SHALL not block replies from being posted even if display is collapsed.

## 6. Subscribing to a Community Journey

### Step 1: Access Community Page
- WHEN member visits any community page, THE system SHALL display a "Subscribe" button.
- IF already subscribed, THE system SHALL display "Unsubscribe" button instead.

### Step 2: Initiate Subscription
- WHEN member clicks "Subscribe", THE system SHALL:
  - Associate member ID with community ID in subscription database
  - Record timestamp of subscription
- WHEN member clicks "Unsubscribe", THE system SHALL:
  - Remove member ID from community’s subscriber list
  - Remove community from member’s subscribed list

### Step 3: Subscription Confirmation
- IF subscription is successful, THE system SHALL display: "You are now subscribed to r/[community]."
- IF unsubscribe is successful, THE system SHALL display: "You are no longer subscribed to r/[community]."
- IF system fails to update subscription, THE system SHALL display: "Failed to update subscription. Please refresh and try again."

### Step 4: Personalize Feed
- WHEN member opens their feed (as member), THE system SHALL show posts from NOT-SUBSCRIBED communities only if the member searches or browses them.
- THE system SHALL prioritize posts from SUBSCRIBED communities in the default "Hot" feed.

### Step 5: Subscription List
- WHEN member clicks "My Subscriptions" in profile menu, THE system SHALL display:
  - List of all communities they are subscribed to
  - Number of posts in each in past 24 hours
  - "Unsubscribe" button next to each

## 7. Viewing User Profile Journey

### Step 1: Access Profile
- WHEN member clicks on any username (e.g., from a post or comment), THE system SHALL navigate to that user's public profile page.

### Step 2: Profile Data Display
- THE system SHALL display for any user:
  - Username
  - Joined date (formatted as "MMM YYYY")
  - Total karma score
  - Number of posts
  - Number of comments
  - Avatar image (default if none)

### Step 3: Content Tab Display
- THE system SHALL provide three tabs: "Posts", "Comments", "Overview".
- WHEN "Posts" tab is selected, THE system SHALL display:
  - All public posts by the user, sorted from newest to oldest
  - Include post title, community name, vote count, timestamp, and "View" link
  - Pagination: 10 posts per page
- WHEN "Comments" tab is selected, THE system SHALL display:
  - All public comments by the user, sorted from newest to oldest
  - Include comment preview (first 100 characters), associated post title, community, vote count, timestamp
  - Pagination: 15 comments per page

### Step 4: Profile Metadata
- THE system SHALL display the user's "Karma" as an integer value derived from total upvotes minus downvotes on their posts and comments.
- THE system SHALL not display any private information (email, IP, activity timestamps beyond displayed posts/comments).

### Step 5: Anonymous Viewing
- IF viewing by guest, THE system SHALL display identical public information as for members (no additional data).

## 8. Reporting Content Journey

### Step 1: Initiate Report
- WHEN a member (or guest) sees any post or comment, THE system SHALL display a "Report" button below it.

### Step 2: Select Reason
- WHEN member clicks "Report", THE system SHALL display a modal with:
  - "Why are you reporting this?" label
  - Predefined reason options:
    - "Spam or advertisements"
    - "Harassment or threats"
    - "Sexually explicit content"
    - "Violence or gore"
    - "Illegal activity"
    - "False information"
    - "Other"
- WHEN "Other" is selected, THE system SHALL display a free-text field (up to 200 characters).

### Step 3: Submit Report
- WHEN member clicks "Submit Report", THE system SHALL:
  - Verify the member is authenticated (guests can report but are redirected to login)
  - Record report with:
    - Reporting user ID
    - Reported content ID
    - Reported content type (post/comment)
    - Selected reason
    - Optional additional details
    - Timestamp
- IF member is not logged in, THEN THE system SHALL display: "You must be logged in to report content. Log in or create an account." And redirect to login.
- IF report is submitted successfully, THEN THE system SHALL display: "Thank you for reporting. Our moderators will review this content."

### Step 4: Report Flow to Moderators
- WHEN report is submitted, THE system SHALL queue it in the "Moderator Reports" dashboard.
- THE system SHALL NOT notify the content author.
- THE system SHALL hide the reported content from public view until investigated.
- THE system SHALL allow moderators to take one of three actions: "Remove", "Ignore", or "Warn User".

### Step 5: Report Outcome
- IF report is confirmed valid and content deleted, THE system SHALL not notify reporter.
- IF report is dismissed, THE system SHALL not notify reporter.
- IF user receives warning, THE system SHALL notify the user via email and in-app notification that they received a warning for one report.

## 9. Moderating Content Journey

### Step 1: Access Moderator Tools
- WHEN a user is assigned as a moderator, THE system SHALL display a "Moderate" banner on their community’s page.
- WHEN a moderator clicks "Moderate", THE system SHALL open the moderation panel.

### Step 2: View Reported Content
- THE system SHALL display a tab for:
  - "Unresolved Reports" (sorted by time)
  - "Recently Removed Posts"
  - "Recently Banned Users"
- EACH report entry shall show:
  - Reported content preview
  - Reporting user (anonymous)
  - Reason for report
  - Timestamp
  - "Remove" button
  - "Ignore" button
  - "Warn User" button

### Step 3: Take Moderation Action
- WHEN moderator clicks "Remove":
  - THE system SHALL delete the content
  - THE system SHALL show: "Content removed."
  - THE system SHALL notify user anonymously: "Your content was removed for violating community guidelines."
- WHEN moderator clicks "Ignore":
  - THE system SHALL mark report as resolved
  - THE system SHALL show: "Report ignored."
- WHEN moderator clicks "Warn User":
  - THE system SHALL send notification: "You received a warning for posting content that violated community guidelines. Further violations may result in a ban."
  - THE system SHALL add one strike to the user’s moderation record
  - THE system SHALL show: "User warned."

### Step 4: Ban User
- WHEN moderator clicks "Ban" button (visible on user profile page within community):
  - THE system SHALL open ban modal with 3 durations:
    - 24 hours
    - 7 days
    - Permanent
- WHEN ban duration is selected, THE system SHALL:
  - Revoke the user’s ability to post or comment in this community
  - Delete their pending posts/comments
  - Show: "User banned for [duration]."
- Banned users cannot see community content or subscribe.
- Cross-community bans require admin action.

### Step 5: Moderation Log
- THE system SHALL log all moderator actions (who, what, when, why, for which content).
- Logs are persistent and accessible only to admins for audit.

## 10. Admin Managing Platform Journey

### Step 1: Access Admin Dashboard
- WHEN an admin logs in, THE system SHALL display an "Admin" link in the header.
- WHEN admin clicks "Admin", THE system SHALL navigate to a dedicated dashboard.

### Step 2: User Management
- THE system SHALL display:
  - List of all users (searchable by username)
  - Total users count
  - Active users per day/week/month
  - Users with high karma
- WHEN admin clicks on a user, THE system SHALL show:
  - User profile
  - List of posts
  - List of comments
  - Platform-wide "Ban User" button
  - "Assign as Moderator" button
  - "Remove Moderator" button
- WHEN admin selects "Ban User":
  - THE system SHALL display warning: "This ban is permanent and applies across all communities."
  - WHEN confirmed, THE system SHALL:
    - Remove user from all communities
    - Delete all user content
    - Block future registration via email or IP
    - Show: "User banned system-wide."

### Step 3: Community Management
- THE system SHALL display:
  - List of all communities (searchable)
  - Total communities
  - Community with most members/subscribers
  - Community with most reports
- WHEN admin clicks on a community, THE system SHALL show:
  - Community details
  - List of moderators
  - "Add Moderator" button
  - "Remove Moderator" button
  - "Delete Community" button
- WHEN admin selects "Delete Community":
  - THE system SHALL display: "This will permanently delete the community and all posts/comments. Are you sure?"
  - WHEN confirmed, THE system SHALL:
    - Delete all content and subscriptions
    - Notify all subscribers via email
    - Show: "Community deleted."

### Step 4: Review Reports
- THE system SHALL display:
  - All unresolved reports across all communities
  - Filter by: report type, time range, moderator assigned
- WHEN admin clicks "Review", THE system SHALL show full context of the report and allow direct action (same as moderator).
- THE system SHALL allow admin to override moderator decisions.

### Step 5: System-Wide Settings
- THE system SHALL provide panel to configure:
  - Banned words list (dictionary of filtered terms)
  - Image moderation system: "Enable AI image moderation"
  - Max photo size (1MB to 20MB, default 10MB)
  - Karma decay rule: "Remove 1 karma point per month of inactivity"
  - Event logging level: "Basic", "Detailed", "Debug"
- WHEN any setting is changed, THE system SHALL save and apply immediately.
- THE system SHALL display: "Settings updated successfully."


### Step 6: Admin Actions Validation
- WHEN an admin attempts to assign another admin, THE system SHALL display a warning: "Only super admins can create or promote other admins."
- WHEN an admin attempts to delete their own account, THE system SHALL prevent deletion and display: "Admin accounts cannot be deleted. Please contact a super administrator."
- WHEN an admin changes a user’s display name to an illegal value, THE system SHALL prevent the change and display: "This display name violates community guidelines."
- WHEN an admin performs an action with insufficient privileges, THE system SHALL return: "Access Denied: Insufficient permissions for this operation."


> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*