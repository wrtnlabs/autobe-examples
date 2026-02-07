# Reddit-like Community Platform - Requirements Specification Document

## Executive Summary

This document defines the complete business requirements for a Reddit-like community platform backend system. The platform enables users to create and participate in communities, share content through posts, engage in discussions via comments, and interact through a comprehensive voting and reputation system. The system supports sophisticated moderation capabilities, multiple feed types with algorithmic sorting, and a robust user engagement ecosystem.

The platform's architecture is designed around four core pillars: user engagement, community management, content discovery, and moderation governance. Each pillar is supported by specialized functionality that works together to create a vibrant and sustainable online community environment.

## 1. User Account Management

### 1.1 Account Registration

Users can register for the community platform using email and password credentials. The registration process includes validation, account creation, and initial setup procedures.

**EARS Requirements:**

- **WHEN** a visitor accesses the registration page, **THE** system **SHALL** display a registration form requiring email address, password, and username.
- **WHEN** a user submits registration information, **THE** system **SHALL** validate email format, password strength, and username uniqueness.
- **WHEN** registration data is valid, **THE** system **SHALL** create a new user account with karma score of zero and default profile settings.
- **WHEN** registration fails validation, **THE** system **SHALL** display specific error messages for each invalid field.
- **WHEN** a user creates an account, **THE** system **SHALL** assign the initial karma score of zero and store authentication credentials securely.

**Business Rules:**

- Email addresses must be unique across the platform
- Passwords must meet minimum security requirements (minimum 8 characters with mixed case, numbers, and special characters)
- Usernames must be unique and follow platform naming conventions (alphanumeric with underscores, 3-20 characters)
- Account creation should be confirmed immediately after successful validation
- Registration data must be transmitted securely using TLS encryption

**Registration Workflow:**
1. User navigates to registration page
2. System displays registration form with required fields
3. User fills in email, password, and username
4. System validates all input fields
5. If valid, system creates account and redirects to login
6. If invalid, system displays specific error messages

**Error Scenarios:**
- Email already in use: Return 409 Conflict with error code "EMAIL_EXISTS"
- Username already taken: Return 409 Conflict with error code "USERNAME_EXISTS"
- Password too weak: Return 400 Bad Request with specific weakness details
- Invalid email format: Return 400 Bad Request with "INVALID_EMAIL_FORMAT" code

### 1.2 Account Authentication

Users can authenticate to the platform using their email and password credentials.

**EARS Requirements:**

- **WHEN** a user submits login credentials, **THE** system **SHALL** verify email and password match an existing account.
- **WHEN** authentication succeeds, **THE** system **SHALL** generate an authentication token and maintain an active session.
- **WHEN** authentication fails, **THE** system **SHALL** return appropriate error indicating invalid credentials.
- **WHEN** a user logs out, **THE** system **SHALL** terminate the active session and invalidate the authentication token.
- **WHEN** a session expires, **THE** system **SHALL** require re-authentication to continue accessing protected resources.

**Business Rules:**

- Sessions should remain valid for 30 days of activity
- Passwords must be securely hashed using bcrypt with cost factor of at least 12
- Login attempts should be monitored for suspicious activity patterns
- Users should be able to maintain separate sessions across multiple devices
- Failed login attempts should trigger security measures after 5 consecutive failures within 15 minutes

**Authentication Workflow:**
1. User navigates to login page
2. System displays login form with email and password fields
3. User submits credentials
4. System validates credentials against stored data
5. If valid, system generates JWT tokens and creates session
6. If invalid, system returns appropriate error message
7. System logs authentication events for security audit

**Error Scenarios:**
- Invalid credentials: Return 401 Unauthorized with error code "INVALID_CREDENTIALS"
- Account not found: Return 404 Not Found with error code "ACCOUNT_NOT_FOUND"
- Account suspended: Return 403 Forbidden with error code "ACCOUNT_SUSPENDED"
- Session expired: Return 401 Unauthorized with error code "SESSION_EXPIRED"

### 1.3 Password Management

Users can change their passwords and recover forgotten passwords through secure workflows.

**EARS Requirements:**

- **WHEN** a user requests a password change, **THE** system **SHALL** verify their current password before allowing changes.
- **WHEN** a user submits a new password, **THE** system **SHALL** validate the new password meets security requirements.
- **WHEN** password change is successful, **THE** system **SHALL** update the stored password hash.
- **WHEN** a user forgets their password, **THE** system **SHALL** provide a secure password recovery process.
- **WHEN** a user deletes their account, **THE** system **SHALL** permanently remove all account data.

**Business Rules:**

- Password changes require current password verification
- New passwords must meet same security requirements as initial registration
- Password recovery should involve email verification to prevent unauthorized access
- Account deletion must be irreversible and complete
- Deleted accounts should be anonymized in public records where possible

**Password Change Workflow:**
1. User navigates to account settings
2. System displays password change form
3. User enters current password and desired new password
4. System validates current password correctness
5. System validates new password meets requirements
6. If valid, system updates password hash and logs event
7. System invalidates all active sessions for security
8. User receives confirmation of password change

**Password Recovery Workflow:**
1. User initiates password recovery from login page
2. System displays email input form
3. User enters registered email address
4. System validates email exists in database
5. If valid, system sends password recovery link
6. Link contains time-limited token (valid for 1 hour)
7. User clicks link and sets new password
8. System validates token and updates password

**Error Scenarios:**
- Wrong current password: Return 403 Forbidden with error code "WRONG_PASSWORD"
- Password too similar to old: Return 400 Bad Request with error code "PASSWORD_SIMILAR"
- Recovery link expired: Return 403 Forbidden with error code "RECOVERY_LINK_EXPIRED"

### 1.4 Account Deletion

Users can permanently delete their accounts, which removes all associated data.

**EARS Requirements:**

- **WHEN** a user initiates account deletion, **THE** system **SHALL** require confirmation through password verification.
- **WHEN** account deletion is confirmed, **THE** system **SHALL** permanently remove all user data including posts and comments.
- **WHEN** account deletion completes, **THE** system **SHALL** terminate all active sessions for that user.
- **WHEN** account deletion fails, **THE** system **SHALL** provide clear error messages explaining why deletion could not complete.

**Business Rules:**

- Account deletion should be immediate and irreversible
- All associated content should be removed when account is deleted
- Deletion process should be logged for security and compliance purposes
- Users should understand the permanent nature of account deletion before proceeding
- User karma history should be preserved for analytics purposes

**Deletion Workflow:**
1. User navigates to account settings and selects deletion option
2. System displays deletion confirmation warning
3. User enters password for verification
4. System verifies password correctness
5. If valid, system initiates deletion process
6. System removes all user data including:
   - User account record
   - All user posts
   - All user comments
   - User profile information
   - User vote records
   - User subscription records
7. System terminates all active sessions
8. User receives deletion confirmation

**Error Scenarios:**
- Password verification failure: Return 403 Forbidden with error code "PASSWORD_MISMATCH"
- Deletion process error: Return 500 Internal Server Error with error code "DELETION_FAILED"
- Data integrity constraint violation: Return 409 Conflict with error code "DATA_CONSTRAINT_VIOLATION"

## 2. Profile Management

### 2.1 Profile Information

Each user has a profile containing customizable information that is displayed to other users.

**EARS Requirements:**

- **WHEN** a user creates their profile, **THE** system **SHALL** allow specification of display name, bio text, and avatar image.
- **WHEN** a user edits their profile, **THE** system **SHALL** update the stored profile information.
- **WHEN** a user views another user's profile, **THE** system **SHALL** display the profile information and activity statistics.
- **WHEN** a user profile is displayed, **THE** system **SHALL** show the current karma score.

**Business Rules:**

- Display names should be visible to all users and searchable
- Bio text should support basic markdown formatting for readability
- Avatar images should support common image formats (JPG, PNG, GIF)
- Profile information should be private unless otherwise specified
- Users can view but not edit other users' profiles
- Display names must be unique and follow platform naming conventions

**Profile Information Fields:**

- **Display Name**: User's chosen public name (required, 3-50 characters)
- **Bio Text**: Self-written biography (optional, 0-1000 characters)
- **Avatar Image**: User profile picture (optional, max 5MB)
- **Profile Creation Date**: When profile was first created
- **Profile Last Updated**: When profile was last modified

**Profile Creation Workflow:**
1. User accesses profile creation page after registration
2. System displays profile setup form
3. User enters display name (optional, defaults to username)
4. User can add bio text and upload avatar
5. System validates input and saves profile
6. User is redirected to their profile page

**Profile Editing Workflow:**
1. User navigates to their profile page
2. System displays profile information in edit mode
3. User modifies display name, bio, or avatar
4. System validates changes
5. If valid, system updates profile and shows confirmation
6. If invalid, system displays specific error messages

### 2.2 Profile View

Users can view their own and other users' profiles to see account information and activity.

**EARS Requirements:**

- **WHEN** a user visits another user's profile page, **THE** system **SHALL** show the profile information, karma score, posts list, and comments list.
- **WHEN** displaying a user's posts, **THE** system **SHALL** show title, community, post type, score, and posting date.
- **WHEN** displaying a user's comments, **THE** system **SHALL** show content preview, post title, comment score, and posting date.
- **WHEN** a user views their own profile, **THE** system **SHALL** indicate ownership clearly.

**Business Rules:**

- Profile pages should load posts and comments in chronological order by default
- Users should be able to filter their own profile views by content type
- Public profile views should show the same information regardless of viewer
- Profile statistics should update in real-time as user activity changes
- Avatar images should be cached and served through CDN for performance

**Profile View Components:**

1. **Header Section:**
   - Avatar image (with fallback to initial letters)
   - Display name
   - Username
   - Account creation date
   - Edit profile button (for owner only)

2. **Stats Section:**
   - Total karma score
   - Number of posts
   - Number of comments
   - Subscribed communities count

3. **Content Sections:**
   - Posts tab (shows posts with title, community, score, date)
   - Comments tab (shows comments with preview, post title, score, date)
   - Subscribed communities tab

4. **Action Buttons:**
   - Send message (if user is not blocked)
   - Report user (if user has been reported)
   - Block user (for personal safety)

**Error Scenarios:**
- Profile not found: Return 404 Not Found with error code "PROFILE_NOT_FOUND"
- User blocked: Return 403 Forbidden with error code "USER_BLOCKED"
- Profile viewing error: Return 500 Internal Server Error with error code "PROFILE_VIEW_ERROR"

## 3. Karma System

### 3.1 Karma Calculation

Every user has a single karma score that reflects their contributions and engagement across the platform.

**EARS Requirements:**

- **WHEN** a user receives an upvote, **THE** system **SHALL** increase their karma score by one point.
- **WHEN** a user receives a downvote, **THE** system **SHALL** decrease their karma score by one point.
- **WHEN** a user's vote is removed, **THE** system **SHALL** adjust karma accordingly (restore to previous state).
- **WHEN** a user's vote changes from upvote to downvote, **THE** system **SHALL** adjust karma by two points (reverse + new vote).
- **WHEN** karma is calculated, **THE** system **SHALL** consider all valid votes on user's content.

**Business Rules:**

- Karma can be negative - negative scores are valid and meaningful
- Each piece of content (post/comment) contributes independently to karma
- Vote recalculation should happen immediately when votes change
- Historical vote changes should be tracked for accurate karma calculation
- Karma should be stored as a single integer per user for performance
- Users cannot vote on their own content to prevent self-promotion

**Karma Calculation Examples:**

1. **Basic Accumulation:**
   - User creates post receives 15 upvotes, 2 downvotes
   - Karma increases by 15 (from upvotes) minus 2 (from downvotes) = +13

2. **Vote Change:**
   - User's comment has 5 upvotes (karma +5)
   - Another user changes their downvote to upvote
   - User's karma increases by 2 (from -1 to +1) = +2 net change

3. **Vote Removal:**
   - User's post receives 3 upvotes (karma +3)
   - One user removes their upvote
   - User's karma decreases by 1 (reversal of +1) = -1 net change

4. **Downvote Reversal:**
   - User's comment receives 4 downvotes (karma -4)
   - One user changes downvote to upvote
   - User's karma increases by 2 (from -1 to +1) = +2 net change

**Karma Adjustment Workflow:**
1. User performs vote action (upvote/downvote/remove/change)
2. System calculates karma impact based on vote type and direction
3. System updates karma score in user record
4. System logs karma change in history table
5. System updates karma display on profile and content

**Karma Score Maintenance:**
- Daily karma reconciliation process to ensure accuracy
- Weekly karma statistics for analytics and gamification
- Monthly karma ranking for top contributors

### 3.2 Karma Display

Karma scores are displayed prominently on user profiles and in relevant contexts.

**EARS Requirements:**

- **WHEN** a user's profile is viewed, **THE** system **SHALL** display the current karma score.
- **WHEN** a user views their own profile, **THE** system **SHALL** show the karma score prominently.
- **WHEN** karma changes, **THE** system **SHALL** update the display in real-time.

**Business Rules:**

- Karma should be displayed as a whole number with color coding:
  - Positive karma: Green color
  - Negative karma: Red color
  - Zero karma: Gray color
- Visual indicators could differentiate high karma scores (e.g., badges for 1000+, 10000+)
- Karma should be stored and displayed consistently across the platform
- Karma scores update immediately when votes change
- Karma display should handle negative numbers with appropriate formatting

**Karma Display Formats:**

- **Profile Page:** Large display with color coding, "Karma: +125"
- **Content Preview:** Small inline display, "+125"
- **Leaderboards:** Ranked display with position, "#5 - +12,500"
- **Notification:** Context-specific display, "You gained +5 karma"

**Error Scenarios:**
- Karma calculation error: Log error and display "Calculating..."
- Karma retrieval error: Display cached value or "N/A"
- Karma update error: Retry mechanism with fallback to cached value

## 4. Community Management

### 4.1 Community Creation

Users can create communities around specific topics or interests.

**EARS Requirements:**

- **WHEN** a user creates a community, **THE** system **SHALL** assign them as the community owner.
- **WHEN** a community is created, **THE** system **SHALL** generate a unique name and store description and icon.
- **WHEN** community creation fails validation, **THE** system **SHALL** provide specific error messages.
- **WHEN** a user creates a community, **THE** system **SHALL** set initial subscriber count to one (the creator).

**Business Rules:**

- Community names must be unique and follow platform naming conventions
- Each community must have an owner who cannot be removed by moderators
- Communities should have descriptive names that reflect their purpose
- Community creation should be available to all authenticated users
- Initial community settings should be established at creation time
- Users can create up to 10 communities per day to prevent spam

**Community Creation Workflow:**
1. User accesses community creation interface
2. System displays community creation form
3. User enters community name (required, unique)
4. User enters community description (optional, 0-5000 characters)
5. User uploads community icon (optional, max 2MB)
6. System validates name uniqueness and format
7. If valid, system creates community record
8. System assigns user as community owner
9. System creates initial subscription for creator
10. System sets community status to active

**Community Name Requirements:**
- Length: 3-21 characters
- Allowed: alphanumeric characters and underscores
- Prohibited: spaces, special characters, offensive language
- Uniqueness: Case-insensitive comparison across platform

**Community Information Fields:**

- **Community ID**: Unique identifier
- **Name**: Community's display name (required)
- **Description**: Community purpose and rules (optional)
- **Icon**: Community logo or image (optional)
- **Owner ID**: Community creator user ID
- **Subscriber Count**: Total subscribers (calculated)
- **Post Count**: Total posts (calculated)
- **Creation Date**: When community was created
- **Status**: Active, suspended, archived

**Error Scenarios:**
- Duplicate community name: Return 409 Conflict with error code "COMMUNITY_NAME_EXISTS"
- Community name invalid: Return 400 Bad Request with error code "COMMUNITY_NAME_INVALID"
- Icon upload failed: Return 400 Bad Request with error code "COMMUNITY_ICON_ERROR"
- User limit exceeded: Return 429 Too Many Requests with error code "COMMUNITY_LIMIT_EXCEEDED"

### 4.2 Community Listing

Users can browse all communities in a list format.

**EARS Requirements:**

- **WHEN** users browse communities, **THE** system **SHALL** display a list of all communities with subscriber counts.
- **WHEN** a community list is displayed, **THE** system **SHALL** show name, description, icon, and subscriber count for each community.
- **WHEN** a user views their subscribed communities, **THE** system **SHALL** show only communities they actively follow.

**Business Rules:**

- Community lists should be paginated for performance (20 communities per page)
- Default sorting could be by popularity or newest
- Subscribed communities should be clearly marked in the list
- Community statistics should update in real-time
- Search functionality should support partial matches
- Lists should include communities the user owns or moderates

**Community List Display Fields:**

- Community name with link to community page
- Community description preview (first 100 characters)
- Community icon or placeholder
- Subscriber count with formatting (e.g., "1.2k", "1.5M")
- Subscription status indicator (subscribed/unsubscribed)
- User role indicator (owner/moderator/none)
- Creation date or recent activity indicator

**Community List Sorting Options:**

1. **Most Subscribers** (default)
   - Sort by subscriber count descending
   - Shows largest communities first

2. **Newest**
   - Sort by creation date descending
   - Shows most recently created communities first

3. **Most Active**
   - Sort by recent activity score
   - Based on posts/comments in last 24 hours

4. **User Subscribed**
   - Filter to show only user's subscriptions
   - Show at top of list with indicator

**Error Scenarios:**
- Community retrieval error: Return 500 Internal Server Error with error code "COMMUNITY_LIST_ERROR"
- Pagination parameter invalid: Return 400 Bad Request with error code "PAGINATION_INVALID"
- Filter parameter invalid: Return 400 Bad Request with error code "FILTER_INVALID"

### 4.3 Community Search

Users can search for communities by name or description.

**EARS Requirements:**

- **WHEN** a user searches for communities, **THE** system **SHALL** return communities matching the search query.
- **WHEN** search results are displayed, **THE** system **SHALL** show matching communities with subscriber counts.
- **WHEN** no communities match search, **THE** system **SHALL** indicate no results were found.

**Business Rules:**

- Search should support partial matches and common typos
- Search results should be ranked by relevance
- Recent search history could be stored for user convenience
- Popular communities should appear at higher ranks
- Search should handle special characters and Unicode
- Results should include search term highlighting

**Search Functionality:**

1. **Basic Search:**
   - User enters search query (minimum 2 characters)
   - System searches community names and descriptions
   - Results ranked by relevance score
   - Partial matches included

2. **Advanced Search:**
   - Filter by subscriber count range
   - Filter by category
   - Filter by activity level
   - Filter by subscription status

3. **Search Suggestions:**
   - Real-time suggestions as user types
   - Popular community recommendations
   - Recent search history

**Search Relevance Algorithm:**

- Exact name matches: Highest score
- Name prefix matches: High score
- Description matches: Medium score
- Subscriber count boost: Higher score for popular communities
- Recency boost: Higher score for recent communities

**Error Scenarios:**
- Search query too short: Return 400 Bad Request with error code "SEARCH_QUERY_TOO_SHORT"
- Search service unavailable: Return 503 Service Unavailable with error code "SEARCH_SERVICE_UNAVAILABLE"
- No results found: Return 200 OK with empty results array

### 4.4 Community Subscription

Users can subscribe to communities to receive content in their feeds.

**EARS Requirements:**

- **WHEN** a user subscribes to a community, **THE** system **SHALL** allow them to follow that community.
- **WHEN** a user unsubscribes from a community, **THE** system **SHALL** allow them to stop following that community.
- **WHEN** a user views their subscribed communities, **THE** system **SHALL** show all communities they follow.
- **SUBSCRIBING IS REQUIRED** to create posts in that community.

**Business Rules:**

- Users must be subscribed to a community before creating posts there
- Users can subscribe or unsubscribe at any time
- Subscription count is tracked for community popularity
- Subscription changes are logged for audit purposes
- Users can view community content without subscribing
- Community owners can ban users from their communities

**Subscription Workflow:**
1. User navigates to community page or content list
2. System displays subscription status (subscribed/unsubscribed)
3. User clicks subscribe/unsubscribe button
4. System processes subscription change
5. System updates subscription count
6. System updates user's subscription list
7. System shows updated subscription status

**Subscription Status Indicators:**

- **Subscribed:** "Subscribed" button with checkmark
- **Not Subscribed:** "Subscribe" button
- **Subscribing:** Loading spinner state
- **Error:** Error message with retry option

**Subscription List View:**

- List of all subscribed communities
- Filter by category or subscription date
- Unsubscribe button for each community
- Statistics for each community (subscriber count, post count)
- Community icon and description preview

**Error Scenarios:**
- Subscription already exists: Return 409 Conflict with error code "SUBSCRIPTION_EXISTS"
- Subscription not found: Return 404 Not Found with error code "SUBSCRIPTION_NOT_FOUND"
- Community banned: Return 403 Forbidden with error code "COMMUNITY_BANNED"
- Subscription limit reached: Return 429 Too Many Requests with error code "SUBSCRIPTION_LIMIT"

## 5. Post Management

### 5.1 Post Creation

Users can create posts in communities they are subscribed to.

**EARS Requirements:**

- **WHEN** a user creates a post, **THE** system **SHALL** require selection of a subscribed community.
- **WHEN** a user creates a post, **THE** system **SHALL** require a title and validate it meets length requirements.
- **WHEN** creating a text post, **THE** system **SHALL** accept and store text content.
- **WHEN** creating a link post, **THE** system **SHALL** accept a URL.
- **WHEN** creating an image post, **THE** system **SHALL** accept an uploaded image.
- **WHEN** post creation is successful, **THE** system **SHALL** create the post with initial score of zero.

**Business Rules:**

- Users must be subscribed to a community before posting there
- Titles should have reasonable length limits (minimum 5, maximum 300 characters)
- Text content should support rich text formatting if desired
- Link posts should validate URL format and potentially extract domain information
- Image posts should support common image formats with size limits
- Posts should be timestamped at creation time
- Users can create up to 50 posts per day to prevent spam

**Post Creation Workflow:**
1. User accesses post creation interface
2. System validates user authentication and community subscription
3. User selects community for post
4. User selects post type (text, link, or image)
5. User enters title (required)
6. System displays content field based on post type
7. User enters content (text, URL, or uploads image)
8. System validates all content
9. If valid, system creates post record
10. System increments community post count
11. System adds post to feed and notifications

**Post Type Requirements:**

1. **Text Post:**
   - Title (required, 5-300 characters)
   - Content (required, 1-100,000 characters)
   - No images or URLs

2. **Link Post:**
   - Title (required, 5-300 characters)
   - URL (required, valid format)
   - Domain extraction for display

3. **Image Post:**
   - Title (required, 5-300 characters)
   - Image upload (JPG, PNG, GIF, max 20MB)
   - Thumbnail generation

**Post Creation Validation:**

- Title uniqueness within community (optional, based on platform policy)
- Content appropriateness (automatic scanning)
- User authentication status
- Community subscription status
- User post rate limit

**Error Scenarios:**
- User not subscribed: Return 403 Forbidden with error code "NOT_SUBSCRIBED"
- Title too short: Return 400 Bad Request with error code "TITLE_TOO_SHORT"
- Title too long: Return 400 Bad Request with error code "TITLE_TOO_LONG"
- Content missing: Return 400 Bad Request with error code "CONTENT_MISSING"
- URL invalid: Return 400 Bad Request with error code "URL_INVALID"
- Image upload failed: Return 400 Bad Request with error code "IMAGE_UPLOAD_ERROR"
- Post limit exceeded: Return 429 Too Many Requests with error code "POST_LIMIT_EXCEEDED"

### 5.2 Post Editing

Users can edit their own posts after creation.

**EARS Requirements:**

- **WHEN** a user edits their own post, **THE** system **SHALL** allow modification of title, content, and metadata.
- **WHEN** post editing is successful, **THE** system **SHALL** update the stored post information.
- **WHEN** post editing fails validation, **THE** system **SH SHALL** provide specific error messages.
- **WHEN** a user attempts to edit another user's post, **THE** system **SHALL** deny access.

**Business Rules:**

- Post editing should be available for a reasonable time window after creation (24 hours)
- Edit history could be tracked for transparency
- Edited content should be subject to same validation as initial creation
- Posts with comments may have different editing policies
- User should be notified when their post is edited

**Post Editing Workflow:**
1. User navigates to their own post
2. System displays edit button (only visible to post author)
3. User clicks edit button
4. System displays post content in edit mode
5. User modifies title, content, or metadata
6. System validates changes
7. If valid, system updates post record
8. System updates "edited" timestamp
9. System notifies subscribers of edit (optional)

**Edit Restrictions:**

- Time limit: Edit within 24 hours of creation
- Content limit: Cannot change post type
- Frequency limit: Maximum 10 edits per post
- Comment limit: Cannot edit after 100 comments (optional)

**Error Scenarios:**
- Post not found: Return 404 Not Found with error code "POST_NOT_FOUND"
- Post too old to edit: Return 403 Forbidden with error code "POST_EDIT_EXPIRED"
- User not author: Return 403 Forbidden with error code "POST_EDIT_PERMISSION_DENIED"
- Edit limit exceeded: Return 429 Too Many Requests with error code "POST_EDIT_LIMIT_EXCEEDED"

### 5.3 Post Deletion

Users can delete their own posts.

**EARS Requirements:**

- **WHEN** a user deletes their own post, **THE** system **SHALL** permanently remove the post.
- **WHEN** a post is deleted, **THE** system **SHALL** remove all associated comments.
- **WHEN** post deletion succeeds, **THE** system **SHALL** update affected karma scores.
- **WHEN** a user attempts to delete another user's post, **THE** system **SHALL** deny access.

**Business Rules:**

- Post deletion should be immediate and irreversible
- All references to the post should be removed from feeds and lists
- Deleted content should not be recoverable through normal operations
- Admins and moderators may have different deletion capabilities
- Deletion should update karma scores and statistics

**Post Deletion Workflow:**
1. User navigates to their own post
2. System displays delete button (only visible to post author)
3. User clicks delete button
4. System displays confirmation dialog
5. User confirms deletion
6. System removes post record
7. System removes all comments on the post
8. System updates karma scores for affected users
9. System decrements community post count
10. System removes post from feeds and caches

**Moderator Deletion:**

- Moderators can delete any post in their community
- Deletion should include reason and moderator ID
- User should be notified of moderator deletion
- Deletion should be logged for audit purposes

**Error Scenarios:**
- Post not found: Return 404 Not Found with error code "POST_NOT_FOUND"
- Post too old to delete: Return 403 Forbidden with error code "POST_DELETE_EXPIRED"
- User not author: Return 403 Forbidden with error code "POST_DELETE_PERMISSION_DENIED"
- Deletion error: Return 500 Internal Server Error with error code "POST_DELETE_ERROR"

### 5.4 Post View

Users can view detailed information about individual posts.

**EARS Requirements:**

- **WHEN** a user views a single post, **THE** system **SHALL** display title, full content, author information, community, vote score, comment count, and posting time.
- **WHEN** displaying post content, **THE** system **SHALL** show different content based on post type (text, link, or image).
- **WHEN** displaying a link post, **THE** system **SHALL** show the domain name of the URL.
- **WHEN** displaying an image post, **THE** system **SHALL** show the uploaded image with appropriate sizing.

**Business Rules:**

- Post views should track anonymous views for popularity metrics
- Content display should be responsive across device types
- Author information should link to their profile page
- Community information should link to the community page
- Vote status should be displayed for authenticated users
- Deletion status should be clearly indicated

**Post View Components:**

1. **Header Section:**
   - Post title
   - Author information with profile link
   - Community information with community page link
   - Voting controls (upvote/downvote/remove)
   - Vote score display

2. **Content Section:**
   - Text post: Full text content
   - Link post: URL with domain name
   - Image post: Image display with download option

3. **Meta Section:**
   - Time since posted
   - Last edited timestamp (if applicable)
   - Post type indicator
   - Edit and delete buttons (if applicable)

4. **Interaction Section:**
   - Comment count
   - "Add Comment" button
   - Share button
   - Report button

**Error Scenarios:**
- Post not found: Return 404 Not Found with error code "POST_NOT_FOUND"
- Post deleted: Return 404 Not Found with error code "POST_DELETED"
- Community access denied: Return 403 Forbidden with error code "COMMUNITY_ACCESS_DENIED"
- Post view error: Return 500 Internal Server Error with error code "POST_VIEW_ERROR"

## 6. Comment Management

### 6.1 Comment Creation

Users can write comments on posts.

**EARS Requirements:**

- **WHEN** a user writes a comment, **THE** system **SHALL** require association with a post.
- **WHEN** a user replies to a comment, **THE** system **SHALL** establish parent-child relationship.
- **WHEN** comment creation succeeds, **THE** system **SHALL** store the comment with initial score of zero.
- **WHEN** comment creation fails validation, **THE** system **SHALL** provide specific error messages.

**Business Rules:**

- Comments should support threading with unlimited depth
- Comment length should have reasonable limits
- Comments should be timestamped at creation time
- Users can comment on their own posts or others' posts
- Comments must be relevant to the parent post
- Users can create up to 100 comments per day to prevent spam

**Comment Creation Workflow:**
1. User navigates to a post
2. System displays comment input area
3. User enters comment text
4. System validates comment length
5. If valid, system creates comment record
6. System increments post comment count
7. System creates notification for post author
8. System updates comment thread display

**Comment Information Fields:**

- Comment ID: Unique identifier
- Post ID: Parent post identifier
- Parent Comment ID: For threaded replies
- User ID: Comment author
- Content: Comment text
- Vote Score: Calculated from votes
- Creation Timestamp
- Deletion Status
- Edit Status

**Error Scenarios:**
- Comment too short: Return 400 Bad Request with error code "COMMENT_TOO_SHORT"
- Comment too long: Return 400 Bad Request with error code "COMMENT_TOO_LONG"
- Post not found: Return 404 Not Found with error code "POST_NOT_FOUND"
- Post deleted: Return 404 Not Found with error code "POST_DELETED"
- Comment limit exceeded: Return 429 Too Many Requests with error code "COMMENT_LIMIT_EXCEEDED"

### 6.2 Comment Reply

Users can reply to existing comments, creating threaded discussions.

**EARS Requirements:**

- **WHEN** a user replies to a comment, **THE** system **SHALL** establish parent-child relationship.
- **WHEN** reply creation succeeds, **THE** system **SHALL** store the reply comment.
- **WHEN** reply is created, **THE** system **SHALL** increment parent comment reply count.

**Business Rules:**

- Replies can have unlimited depth
- Reply should be associated with parent comment
- User should be notified of replies to their comments
- Comment threads should maintain hierarchy

**Reply Creation Workflow:**
1. User clicks reply button on existing comment
2. System displays reply input area
3. User enters reply text
4. System validates reply content
5. If valid, system creates reply comment with parent reference
6. System increments parent comment reply count
7. System creates notification for parent comment author
8. System displays new reply in thread

**Error Scenarios:**
- Parent comment not found: Return 404 Not Found with error code "PARENT_COMMENT_NOT_FOUND"
- Comment thread too deep: Return 400 Bad Request with error code "COMMENT_THREAD_TOO_DEEP"
- Reply validation error: Return 400 Bad Request with error code "REPLY_VALIDATION_ERROR"

### 6.3 Comment Editing

Users can edit their own comments.

**EARS Requirements:**

- **WHEN** a user edits their own comment, **THE** system **SHALL** allow modification of content.
- **WHEN** comment editing is successful, **THE** system **SHALL** update the stored comment.
- **WHEN** a user attempts to edit another user's comment, **THE** system **SHALL** deny access.

**Business Rules:**

- Comment editing should be available for a reasonable time window (24 hours)
- Edit history could be tracked for transparency
- Edited comments should indicate they were modified

**Edit Workflow:**
1. User navigates to their own comment
2. System displays edit button
3. User clicks edit button
4. System displays comment content in edit mode
5. User modifies content
6. System validates changes
7. If valid, system updates comment record
8. System updates "edited" timestamp

**Error Scenarios:**
- Comment not found: Return 404 Not Found with error code "COMMENT_NOT_FOUND"
- Comment too old to edit: Return 403 Forbidden with error code "COMMENT_EDIT_EXPIRED"
- User not author: Return 403 Forbidden with error code "COMMENT_EDIT_PERMISSION_DENIED"

### 6.4 Comment Deletion

Users can delete their own comments.

**EARS Requirements:**

- **WHEN** a user deletes their own comment, **THE** system **SHALL** permanently remove the comment.
- **WHEN** a comment is deleted, **THE** system **SHALL** remove all child comments recursively.
- **WHEN** comment deletion succeeds, **THE** system **SHALL** update affected karma scores.
- **WHEN** a user attempts to delete another user's comment, **THE** system **SHALL** deny access.

**Business Rules:**

- Comment deletion should be immediate and irreversible
- Deleted comments should not appear in comment threads
- Deletion should update parent comment counts appropriately

**Deletion Workflow:**
1. User navigates to their own comment
2. System displays delete button
3. User clicks delete button
4. System displays confirmation dialog
5. User confirms deletion
6. System removes comment record
7. System removes all child comments
8. System updates karma scores
9. System decrements parent comment reply count

**Error Scenarios:**
- Comment not found: Return 404 Not Found with error code "COMMENT_NOT_FOUND"
- User not author: Return 403 Forbidden with error code "COMMENT_DELETE_PERMISSION_DENIED"
- Deletion error: Return 500 Internal Server Error with error code "COMMENT_DELETE_ERROR"

### 6.5 Comment Sorting

Comments on a post can be sorted by different criteria.

**EARS Requirements:**

- **WHEN** comments are sorted by "best", **THE** system **SHALL** display highest vote score first.
- **WHEN** comments are sorted by "new", **THE** system **SHALL** display most recent comments first.
- **WHEN** comments are sorted by "controversial", **THE** system **SHALL** display comments with many votes but score close to zero first.

**Business Rules:**

- Default sorting could be "best" for most users
- Users can change sorting preference per post
- Sorting should maintain thread structure

**Sorting Algorithm Details:**

1. **Best:** Vote score descending
2. **New:** Creation timestamp descending
3. **Controversial:** Controversy score (total votes × (1 - |score| / (total votes + 1))) descending

**Error Scenarios:**
- Invalid sort parameter: Return 400 Bad Request with error code "INVALID_SORT_PARAMETER"
- Comment retrieval error: Return 500 Internal Server Error with error code "COMMENT_RETRIEVAL_ERROR"

## 7. Voting System

### 7.1 Vote Operations

Users can vote on posts and comments.

**EARS Requirements:**

- **WHEN** a user upvotes a post or comment, **THE** system **SHALL** increase its score by one point.
- **WHEN** a user downvotes a post or comment, **THE** system **SHALL** decrease its score by one point.
- **WHEN** a user has already voted and casts the same vote again, **THE** system **SHALL** maintain the existing vote.
- **WHEN** a user changes their vote, **THE** system **SHALL** adjust the score accordingly.
- **WHEN** a user removes their vote, **THE** system **SHALL** return the score to what it was before their vote.

**Business Rules:**

- Each user can only vote once per content item
- Vote changes should be instantaneous
- Vote removal should restore the previous state
- Vote tracking should be persistent and accurate
- Users cannot vote on their own content
- Vote records should include timestamp for tracking

**Vote Record Structure:**

- Vote ID: Unique identifier
- User ID: Voting user
- Content ID: Post or comment being voted on
- Content Type: "post" or "comment"
- Vote Type: "upvote" or "downvote"
- Timestamp: When vote was cast
- Status: "active" or "removed"

**Vote Calculation Logic:**

- Vote Score = (Active upvotes) - (Active downvotes)
- Karma Impact = Vote change magnitude
- Vote Type Change Impact = 2 × vote value (e.g., upvote to downvote = -2)

**Error Scenarios:**
- Content not found: Return 404 Not Found with error code "CONTENT_NOT_FOUND"
- Already voted: Return 409 Conflict with error code "ALREADY_VOTED"
- Self-vote attempt: Return 403 Forbidden with error code "SELF_VOTE_DENIED"
- Vote limit exceeded: Return 429 Too Many Requests with error code "VOTE_LIMIT_EXCEEDED"

### 7.2 Vote Status

Each user's vote status is displayed for all voteable content.

**EARS Requirements:**

- **WHEN** a user views content, **THE** system **SHALL** display their current vote status.
- **WHEN** a user has not voted, **THE** system **SHALL** show no vote indicator.
- **WHEN** a user has upvoted, **THE** system **SHALL** show upvote indicator.
- **WHEN** a user has downvoted, **THE** system **SHALL** show downvote indicator.

**Business Rules:**

- Vote status should update in real-time
- Indicators should be clear and visible
- Vote status should be stored per user per content item

**Vote Status Indicators:**

- **No Vote:** Neutral color, no icon
- **Upvote:** Green color, up arrow icon, score with +
- **Downvote:** Red color, down arrow icon, score with -

**Error Scenarios:**
- Vote status retrieval error: Log error and display cached value or "N/A"
- Vote status update error: Retry mechanism with fallback to previous state

## 8. Feed System

### 8.1 Feed Types

There are three types of feeds available to users.

**EARS Requirements:**

- **WHEN** a logged-in user accesses the home feed, **THE** system **SHALL** show posts only from communities they are subscribed to.
- **WHEN** any user (logged-in or not) accesses the popular feed, **THE** system **SHALL** show posts from all communities across the platform.
- **WHEN** any user accesses a community feed, **THE** system **SHALL** show posts from one specific community.

**Business Rules:**

- Home feed requires authentication
- Popular feed is publicly accessible
- Community feeds are publicly accessible
- All feeds support the same sorting options
- Feeds should be paginated for performance
- Feed accessibility should be checked at the API level

**Feed Access Control:**

| Feed Type | Authenticated | Anonymous | Community |
|-----------|---------------|-----------|-----------|
| Home Feed | ✅ Yes | ❌ No | Subscribed only |
| Popular Feed | ✅ Yes | ✅ Yes | All communities |
| Community Feed | ✅ Yes | ✅ Yes | Single community |

**Feed Data Requirements:**

- Post ID, title, author, community, vote score, comment count
- Time since posted in human-readable format
- Content preview based on post type
- User's vote status (if authenticated)
- User's subscription status for community

**Error Scenarios:**
- Feed retrieval error: Return 500 Internal Server Error with error code "FEED_RETRIEVAL_ERROR"
- Authentication required: Return 401 Unauthorized with error code "AUTH_REQUIRED"
- Community not found: Return 404 Not Found with error code "COMMUNITY_NOT_FOUND"

### 8.2 Sorting Algorithms

All feeds support four sorting options.

**Hot Algorithm:**
- **WHEN** posts are sorted by hot, **THE** system **SHALL** rank recent posts with many upvotes first.
- **WHEN** calculating hot score, **THE** system **SHALL** consider post age, vote count, and vote velocity.

**New Algorithm:**
- **WHEN** posts are sorted by new, **THE** system **SHALL** rank most recently created posts first.
- **WHEN** posts are sorted by new, **THE** system **SHALL** ignore vote scores in ranking.

**Top Algorithm:**
- **WHEN** posts are sorted by top, **THE** system **SHALL** rank highest vote score first.
- **WHEN** top sorting includes time filters, **THE** system **SHALL** apply the time filter to post creation date.
- **WHEN** time filter is "today", **THE** system **SHALL** show only posts created today.
- **WHEN** time filter is "this week", **THE** system **SHALL** show only posts created this week.
- **WHEN** time filter is "this month", **THE** system **SHALL** show only posts created this month.
- **WHEN** time filter is "this year", **THE** system **SHALL** show only posts created this year.
- **WHEN** time filter is "all time", **THE** system **SHALL** show all posts regardless of creation date.

**Controversial Algorithm:**
- **WHEN** posts are sorted by controversial, **THE** system **SHALL** rank posts with many votes but score close to zero first.
- **WHEN** calculating controversial score, **THE** system **SHALL** consider total votes and vote balance.

**Hot Algorithm Details:**

- Formula: `hot_score = log(vote_count + 1) + (timestamp - epoch) / 45000`
- Recent posts with high engagement ranked highest
- Gradual decay of older posts over time
- Balance between recency and engagement

**Top Algorithm Time Filters:**

- Today: Posts created within last 24 hours
- This Week: Posts created within last 7 days
- This Month: Posts created within last 30 days
- This Year: Posts created within last 365 days
- All Time: All posts regardless of creation date

**Controversial Score Formula:**

- Controversy Score = min(upvotes, downvotes) × abs(upvotes - downvotes)
- High total votes with score close to zero ranked highest
- Identifies divisive content with strong opinions on both sides

**Error Scenarios:**
- Invalid sort parameter: Return 400 Bad Request with error code "INVALID_SORT_PARAMETER"
- Invalid time filter: Return 400 Bad Request with error code "INVALID_TIME_FILTER"
- Sorting algorithm error: Log error and display default sort

### 8.3 Pagination

All feeds support pagination for performance.

**EARS Requirements:**

- **WHEN** a feed request includes pagination parameters, **THE** system **SHALL** return the specified page of results.
- **WHEN** pagination is not specified, **THE** system **SHALL** return a default page size.
- **WHEN** requested page exceeds available content, **THE** system **SHALL** return empty results or appropriate message.

**Business Rules:**

- Default page size should be 25 posts per page
- Maximum page size could be limited for performance
- Pagination should support cursor-based or offset-based approaches
- Feed requests should include total count information

**Pagination Parameters:**

- Page Number: Requested page (1-indexed)
- Page Size: Results per page (default: 25, max: 100)
- Cursor: For cursor-based pagination
- Sort Order: Sorting algorithm to use
- Time Filter: For top sorting (optional)

**Pagination Response Structure:**

```json
{
  "posts": [...],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "totalItems": 150,
    "totalPages": 6,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "nextCursor": "abc123",
    "previousCursor": null
  }
}
```

**Error Scenarios:**
- Invalid page number: Return 400 Bad Request with error code "INVALID_PAGE_NUMBER"
- Invalid page size: Return 400 Bad Request with error code "INVALID_PAGE_SIZE"
- Invalid cursor: Return 400 Bad Request with error code "INVALID_CURSOR"

### 8.4 Feed Content Display

When displaying posts in feeds, the system shows concise information.

**EARS Requirements:**

- **WHEN** displaying a post in a feed, **THE** system **SHALL** show title, author username, community name, vote score, comment count, time since posted, and content preview.
- **WHEN** displaying a text post in a feed, **THE** system **SHALL** show first 200 characters of content.
- **WHEN** displaying an image post in a feed, **THE** system **SHALL** show thumbnail of the image.
- **WHEN** displaying a link post in a feed, **THE** system **SHALL** show the domain name of the URL.

**Feed Display Fields:**

1. **Core Information:**
   - Title (truncated if too long)
   - Author username with profile link
   - Community name with community page link
   - Vote score
   - Comment count
   - Time since posted

2. **Content Preview:**
   - Text posts: First 200 characters with ellipsis
   - Image posts: Thumbnail image (100x100 pixels)
   - Link posts: Domain name only

3. **User-Specific Information:**
   - User's vote status (if authenticated)
   - User's subscription status to community
   - Edit and delete buttons (if user is author)

**Content Truncation Rules:**

- Text content: Maximum 200 characters, preserve word boundaries
- Title: Maximum 100 characters, preserve readability
- Community name: Maximum 20 characters, show full name on hover
- Time since posted: Use human-readable format ("3 hours ago", "2 days ago")

**Error Scenarios:**
- Content retrieval error: Log error and display placeholder
- Image generation error: Log error and display default thumbnail
- Time calculation error: Display "just now" as fallback

## 9. Moderation System

### 9.1 Moderator Roles

The moderation system has a clear hierarchy of roles with defined permissions.

**EARS Requirements:**

- **WHEN** a community is created, **THE** system **SHALL** assign the creator as owner and highest authority.
- **WHEN** an owner adds a moderator, **THE** system **SHALL** grant moderation permissions to that user.
- **WHEN** an owner removes a moderator, **THE** system **SHALL** revoke moderation permissions.
- **WHEN** a moderator attempts to remove an owner, **THE** system **SHALL** deny the request.
- **WHEN** a moderator attempts to remove another moderator, **THE** system **SHALL** deny the request.

**Business Rules:**

- Only owners can add or remove moderators
- Moderators cannot remove other moderators (only owners can)
- Moderators cannot remove the community owner
- Moderator assignments should be logged for audit purposes
- Community must always have at least one owner

**Moderator Role Hierarchy:**

1. **Community Owner:**
   - Highest authority in the community
   - Can appoint and remove moderators
   - Can transfer ownership
   - Can delete the community
   - Can view all community data

2. **Community Moderator:**
   - Appointed by community owner
   - Can delete posts and comments
   - Can ban and unban users
   - Can view reports and take action
   - Cannot appoint or remove other moderators

**Moderator Assignment Workflow:**

1. Community owner accesses moderator management interface
2. System displays list of community members
3. Owner selects user to appoint as moderator
4. System validates user eligibility (community subscriber)
5. System creates moderator assignment record
6. System grants moderator permissions
7. System notifies appointed moderator
8. System logs assignment event

**Moderator Removal Workflow:**

1. Community owner accesses moderator management interface
2. System displays list of current moderators
3. Owner selects moderator to remove
4. System validates ownership permissions
5. System removes moderator assignment
6. System revokes moderator permissions
7. System notifies removed moderator
8. System logs removal event

**Error Scenarios:**
- User not eligible for moderator: Return 400 Bad Request with error code "MODERATOR_ELIGIBILITY_ERROR"
- Ownership transfer denied: Return 403 Forbidden with error code "OWNERSHIP_TRANSFER_DENIED"
- Moderator removal denied: Return 403 Forbidden with error code "MODERATOR_REMOVAL_DENIED"

### 9.2 Moderator Permissions

Moderators have specific permissions within their communities.

**EARS Requirements:**

- **WHEN** a moderator accesses their community, **THE** system **SHALL** allow deletion of any post in that community.
- **WHEN** a moderator accesses their community, **THE** system **SHALL** allow deletion of any comment in that community.
- **WHEN** a moderator accesses their community, **THE** system **SHALL** allow banning users from that community.
- **WHEN** a moderator accesses their community, **THE** system **SHALL** allow unbanning users.
- **WHEN** a moderator accesses their community, **THE** system **SHALL** allow viewing the list of banned users.

**Business Rules:**

- Moderators can only moderate their assigned communities
- Ban actions should be logged with reasons and timestamps
- User ban appeals should be handled through appropriate channels
- Moderation actions should be reversible in exceptional cases

**Moderator Permission Matrix:**

| Action | Community Owner | Community Moderator | User |
|--------|----------------|---------------------|------|
| Delete posts | ✅ Yes | ✅ Yes | ❌ No |
| Delete comments | ✅ Yes | ✅ Yes | ❌ No |
| Ban users | ✅ Yes | ✅ Yes | ❌ No |
| Unban users | ✅ Yes | ✅ Yes | ❌ No |
| View banned users | ✅ Yes | ✅ Yes | ❌ No |
| Appoint moderators | ✅ Yes | ❌ No | ❌ No |
| Remove moderators | ✅ Yes | ❌ No | ❌ No |
| Transfer ownership | ✅ Yes | ❌ No | ❌ No |

**Moderation Action Requirements:**

- All moderation actions require a reason (text field)
- Reasons are stored for audit purposes
- Users are notified when moderation actions affect them
- Moderators can view their own moderation history

**Error Scenarios:**
- Moderator not assigned: Return 403 Forbidden with error code "MODERATOR_NOT_ASSIGNED"
- Community access denied: Return 403 Forbidden with error code "COMMUNITY_ACCESS_DENIED"
- Moderation action error: Return 500 Internal Server Error with error code "MODERATION_ACTION_ERROR"

### 9.3 Ban System

Moderators can ban users from communities to maintain order.

**EARS Requirements:**

- **WHEN** a user is banned from a community, **THE** system **SHALL** prevent them from creating posts in that community.
- **WHEN** a user is banned from a community, **THE** system **SHALL** prevent them from creating comments in that community.
- **WHEN** a user is banned from a community, **THE** system **SHALL** allow them to still view community content.
- **WHEN** a user is unbanned from a community, **THE** system **SHALL** restore their posting and commenting privileges.

**Business Rules:**

- Bans should be specific to individual communities
- Ban duration could be temporary or permanent
- Ban reasons should be recorded for transparency
- Ban appeals should be handled by community moderators
- Banned users retain read access to community content

**Ban Implementation:**

1. **Moderator initiates ban:**
   - Moderator accesses user profile or content
   - System displays ban option (moderator only)
   - Moderator enters ban reason and duration
   - System creates ban record
   - System prevents banned user from creating content

2. **Ban enforcement:**
   - System checks ban status before content creation
   - Banned users receive appropriate error messages
   - Ban status is cached for performance
   - Ban expiration is checked automatically

3. **Unban process:**
   - Moderator accesses user profile or ban list
   - System displays unban option
   - Moderator initiates unban
   - System removes ban record
   - System restores user permissions

**Ban Information Fields:**

- Ban ID: Unique identifier
- Community ID: Affected community
- User ID: Banned user
- Moderator ID: Banning moderator
- Ban reason: Text explanation
- Ban duration: Temporary or permanent
- Ban timestamp: When ban was applied
- Expiration timestamp: When temporary ban ends
- Appeal status: Pending, reviewed, dismissed

**Error Scenarios:**
- User already banned: Return 409 Conflict with error code "USER_ALREADY_BANNED"
- Ban duration invalid: Return 400 Bad Request with error code "BAN_DURATION_INVALID"
- User not banned: Return 404 Not Found with error code "USER_NOT_BANNED"
- Ban enforcement error: Return 500 Internal Server Error with error code "BAN_ENFORCEMENT_ERROR"

### 9.4 Moderation Logs

All moderation actions are logged for audit purposes.

**EARS Requirements:**

- **WHEN** a moderator takes an action, **THE** system **SHALL** record the action with moderator ID, timestamp, and reason.
- **WHEN** a report is resolved, **THE** system **SHALL** record the resolution with moderator ID and action taken.

**Business Rules:**

- Logs should be immutable once created
- Logs should be accessible to platform administrators
- Logs should have retention policies
- Users can view moderation actions affecting them

**Log Storage Structure:**

```json
{
  "logId": "uuid",
  "communityId": "uuid",
  "moderatorId": "uuid",
  "action": "DELETE_POST | BAN_USER | APPROVE_REPORT",
  "targetId": "uuid",
  "reason": "Spam content",
  "timestamp": "2024-12-01T10:30:00Z",
  "details": {
    "postId": "uuid",
    "banDuration": "permanent",
    "reportId": "uuid"
  }
}
```

**Error Scenarios:**
- Log creation error: Log error to separate error log
- Log retrieval error: Return 500 Internal Server Error with error code "LOG_RETRIEVAL_ERROR"
- Permission denied: Return 403 Forbidden with error code "LOG_ACCESS_DENIED"

## 10. Reporting System

### 10.1 Content Reporting

Users can report content that violates community guidelines.

**EARS Requirements:**

- **WHEN** a user reports a post, **THE** system **SHALL** require selection of a reporting reason.
- **WHEN** a user reports a comment, **THE** system **SHALL** require selection of a reporting reason.
- **WHEN** a report is submitted, **THE** system **SHALL** store the report with content, reporter, and reason.

**Business Rules:**

- Reporting should be available for all content types
- Report reasons should be selected from predefined options or custom text
- Users should not be able to report their own content
- Report data should be stored securely and anonymized where possible
- Duplicate reports from same user for same content are not allowed

**Report Submission Workflow:**

1. User encounters content they believe violates guidelines
2. System displays report button on content
3. User clicks report button
4. System displays report form with reason options
5. User selects reason or enters custom reason
6. System validates report requirements
7. If valid, system creates report record
8. System increments content report count
9. System notifies moderators of new report
10. User receives confirmation of report submission

**Report Information Fields:**

- Report ID: Unique identifier
- Content ID: ID of reported post or comment
- Content Type: "post" or "comment"
- Reporter ID: User who submitted report
- Report Reason: Selected reason or custom text
- Report Timestamp
- Report Status: "pending", "under_review", "resolved", "dismissed"
- Resolution Details: Moderator notes and action taken

**Error Scenarios:**
- Report reason missing: Return 400 Bad Request with error code "REPORT_REASON_MISSING"
- Report already exists: Return 409 Conflict with error code "REPORT_ALREADY_EXISTS"
- Self-report attempt: Return 403 Forbidden with error code "SELF_REPORT_DENIED"
- Report limit exceeded: Return 429 Too Many Requests with error code "REPORT_LIMIT_EXCEEDED"

### 10.2 Report Management

Moderators can review and act on reports.

**EARS Requirements:**

- **WHEN** a moderator accesses their community reports, **THE** system **SHALL** show all pending reports for that community.
- **WHEN** displaying a report, **THE** system **SHALL** show the reported content, reporter information, and reporting reason.
- **WHEN** a moderator approves a report, **THE** system **SHALL** delete the reported content.
- **WHEN** a moderator dismisses a report, **THE** system **SHALL** remove the report from the pending list.

**Business Rules:**

- Reports should be visible only to appropriate moderators
- Report approval should trigger content deletion immediately
- Report dismissal should remove the report from active review
- Report history could be stored for audit purposes
- Report analytics could help identify common issues

**Report Review Workflow:**

1. Moderator accesses moderation dashboard
2. System displays pending reports list
3. Moderator selects report to review
4. System displays report details:
   - Reported content
   - Reporter information
   - Report reason
   - Content author information
5. Moderator reviews content and decides on action
6. If approve:
   - System deletes reported content
   - System marks report as resolved
   - System notifies content author
7. If dismiss:
   - System marks report as dismissed
   - System removes from active reports
   - System logs decision for audit

**Report Resolution Actions:**

1. **Approve Report:**
   - Delete reported content
   - Update report status to "resolved"
   - Notify content author
   - Log moderation action

2. **Dismiss Report:**
   - Update report status to "dismissed"
   - Remove from active reports
   - Log decision for audit

3. **Take No Action:**
   - Leave report in pending state
   - Log decision for future review

**Report Statistics:**

- Pending reports count
- Average resolution time
- Top report reasons
- Moderator report handling metrics
- Report false positive rate

**Error Scenarios:**
- Report not found: Return 404 Not Found with error code "REPORT_NOT_FOUND"
- Report already resolved: Return 409 Conflict with error code "REPORT_ALREADY_RESOLVED"
- Report resolution error: Return 500 Internal Server Error with error code "REPORT_RESOLUTION_ERROR"

### 10.3 Report Audit Trail

All report actions are logged for transparency and accountability.

**EARS Requirements:**

- **WHEN** a report is created, **THE** system **SHALL** record the exact timestamp and user IP address.
- **WHEN** a report is resolved, **THE** system **SHALL** log the resolution timestamp and moderator information.

**Business Rules:**

- Audit logs should be immutable
- Logs should be accessible to platform administrators
- Users can view report status for their own content
- Logs should have retention policies

**Audit Log Storage:**

```json
{
  "logId": "uuid",
  "reportId": "uuid",
  "action": "CREATE | RESOLVE | DISMISS",
  "actorId": "uuid",
  "timestamp": "2024-12-01T10:30:00Z",
  "details": {
    "reportReason": "Spam content",
    "resolutionAction": "DELETE_POST",
    "moderatorNotes": "Violates community guidelines"
  }
}
```

**Error Scenarios:**
- Log creation error: Log error to separate error log
- Log retrieval error: Return 500 Internal Server Error with error code "LOG_RETRIEVAL_ERROR"
- Permission denied: Return 403 Forbidden with error code "LOG_ACCESS_DENIED"

## Conclusion

This requirements specification document provides comprehensive coverage of the Reddit-like community platform backend system. All requirements have been specified using natural language with EARS format where appropriate, focusing on what the system should do rather than how it should be implemented.

The requirements cover all major functional areas:
- User account management and authentication
- Profile management and karma tracking
- Community creation, listing, and subscription
- Post creation, editing, deletion, and display
- Comment creation, editing, deletion, and display
- Voting system for posts and comments
- Feed systems with multiple sorting algorithms
- Moderation system with role hierarchy
- Reporting system for content moderation

These requirements will guide developers in implementing the backend application using TypeScript, NestJS, and Prisma as specified in the project architecture. The requirements provide a complete foundation for building a robust, scalable community platform that supports user engagement, community management, content discovery, and effective moderation.

The system is designed to be flexible and extensible, allowing for future enhancements such as premium features, advanced analytics, mobile applications, and API integrations while maintaining the core functionality described in this specification.