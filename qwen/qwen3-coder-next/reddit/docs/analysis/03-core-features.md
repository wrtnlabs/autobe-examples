# Core Features Specification Document

## Introduction to Core Features

This document defines the fundamental capabilities of the Reddit-like community platform. It describes all core entities, their relationships, and the primary user interactions that form the foundation of the community ecosystem.

The platform enables users to create and share content, participate in discussions, join communities, build reputation through karma, and interact with other members. All features are designed to support a vibrant, self-sustaining community platform where users can discover content, contribute meaningful discussions, and build their reputation over time.

### Platform Vision

The core features work together to create a complete community platform where:
- Users can express themselves through diverse content types
- Communities form around shared interests
- Reputation is earned through quality contributions
- Users can engage in meaningful discussions through threaded conversations
- Content discovery is driven by community engagement and algorithmic ranking
- Moderation empowers communities to maintain quality standards

## Post Management

### Post Creation

WHEN a member creates a post in a community they are subscribed to, THE system SHALL accept the post with the following required data:

- **Title**: Required string field (non-empty, max 300 characters)
- **Content Type**: One of three mutually exclusive types:
  - Text post: Contains text content field (max 50,000 characters)
  - Link post: Contains URL field (valid HTTP/HTTPS URL format)
  - Image post: Contains uploaded image (valid image file format)
- **Community**: Valid community identifier (must be community the user is subscribed to)

### Post Types and Requirements

#### Text Posts
WHEN a user creates a text post, THE system SHALL require and validate:
- Title field must be non-empty string
- Text content must be non-empty (minimum 1 character)
- Total content length must not exceed 50,000 characters
- Title and content must be stored separately for display purposes

#### Link Posts
WHEN a user creates a link post, THE system SHALL require and validate:
- Title field must be non-empty string
- URL field must be valid HTTP or HTTPS protocol URL
- URL must not be a data: URI scheme
- System may extract domain name for display purposes
- System may validate URL is accessible (optional)

#### Image Posts
WHEN a user creates an image post, THE system SHALL require and validate:
- Title field must be non-empty string
- Image upload must be valid image file (JPEG, PNG, GIF, WEBP)
- Maximum file size: 10 MB per image
- System SHALL store original image and generate thumbnail
- System MAY validate image dimensions for optimization

### Post Editing

WHEN a member edits their own post, THE system SHALL:
- Allow title modification (same validation rules as creation)
- Allow content type-specific field modification
- Update "last edited" timestamp
- Maintain post creation timestamp unchanged
- Log edit history for audit purposes

IF a user attempts to edit a post they do not own, THEN THE system SHALL deny the edit and return appropriate error.

### Post Deletion

WHEN a member deletes their own post, THE system SHALL:
- Soft delete the post (mark as deleted, preserve data)
- Clear all content fields to remove sensitive information
- Maintain post metadata for comment thread integrity
- Update karma scores for the author accordingly
- Update comment counts for associated comments

WHEN a moderator or admin deletes a post, THE system SHALL:
- Soft delete the post with moderator metadata
- Record who performed the deletion
- Store reason for deletion (if provided)
- Update community statistics

### Post Display Information

WHEN viewing a single post, THE system SHALL display:
- Post title
- Full content (text content for text posts, URL for link posts, image for image posts)
- Author username and profile link
- Community name and link
- Current vote score (upvotes minus downvotes)
- Total comment count
- Post creation timestamp (ISO 8601 format)
- Time elapsed since posting (e.g., "3 hours ago")
- Author's karma score
- User's current vote status (none, upvoted, downvoted)
- Edit history indicator (if post has been edited)

### Post List Display (Feed Context)

WHEN a post appears in any feed listing, THE system SHALL display:
- Post title (truncated to 100 characters if necessary)
- Author username (with link to profile)
- Community name (with link to community page)
- Current vote score
- Comment count
- Time since posting (relative time format)
- Content preview based on post type:
  - Text posts: First 200 characters of content
  - Link posts: Domain name from URL (e.g., "youtube.com")
  - Image posts: Small thumbnail image
- User's vote status indicator

## Comment Management

### Comment Creation

WHEN a member views a post, THE system SHALL display a comment input field where they can write and submit a comment.

WHEN a member submits a comment on a post, THE system SHALL validate the comment content, store it with the appropriate metadata, and display it immediately.

WHERE a comment exceeds the maximum length limit, THEN THE system SHALL reject the submission and return an appropriate error message.

### Comment Requirements
- Comments must be associated with a specific post
- Comments must include the author's user ID
- Comments must have a creation timestamp
- Comments can optionally reference another comment as their parent (for replies)
- Comment content cannot be empty or contain only whitespace
- Comment content must pass platform-appropriate content filters

### Comment Content Validation
IF a comment contains prohibited content (hate speech, harassment, spam, etc.), THEN THE system SHALL reject the comment and return an appropriate error message.

WHERE a user attempts to post the same comment content multiple times in quick succession, THEN THE system SHALL rate-limit the duplicate submissions.

## Comment Threading System

### Thread Structure
WHEN a user writes a comment, THE system SHALL allow them to either reply to the original post (root-level comment) or reply to another comment (nested reply).

WHEN a comment is a reply to another comment, THE system SHALL store the parent comment ID to establish the reply relationship.

WHERE a comment has no parent comment ID, THEN IT is considered a root-level comment.

WHERE a comment has a parent comment ID, THEN IT is considered a reply (nested comment).

### Unlimited Thread Depth
THE system SHALL support unlimited comment thread depth, allowing users to reply to any comment in the chain.

WHILE a comment thread exists, THE system SHALL maintain the hierarchical relationship between parent and child comments.

### Comment Navigation
WHEN a user navigates to a post, THE system SHALL retrieve all root-level comments and their complete reply chains.

WHEN a user clicks "view more replies" on a collapsed thread, THE system SHALL fetch and expand the nested replies.

## Comment Voting Mechanics

### Comment Voting Rules
WHEN a member votes on a comment, THE system SHALL record the vote and update the comment's score.

WHERE a user has already voted on a comment, THEN THEY can change their vote (upvote to downvote or vice versa) or remove their vote entirely.

WHEN a user changes their vote on a comment, THE system SHALL adjust the comment's score accordingly.

WHEN a user removes their vote from a comment, THE system SHALL adjust the comment's score by removing the previous vote's contribution.

### Vote Scoring Logic
THE comment score SHALL equal the total number of upvotes minus the total number of downvotes.

WHERE a comment has no votes, THEN IT score SHALL be zero.

WHERE a comment has more upvotes than downvotes, THEN IT score SHALL be positive.

WHERE a comment has more downvotes than upvotes, THEN IT score SHALL be negative.

### Vote Assignment
WHEN a comment receives an upvote, THE system SHALL increase the comment score by 1.

WHEN a comment receives a downvote, THE system SHALL decrease the comment score by 1.

WHEN a user votes on a comment, THE system SHALL record the user ID, comment ID, and vote type (1 for upvote, -1 for downvote).

IF a user attempts to vote on a comment they authored, THEN THE system SHALL allow the vote (authors can vote on their own comments).

### Comment Karma Impact
WHEN a comment receives an upvote, THE system SHALL increase the comment author's karma score by 1.

WHEN a comment receives a downvote, THE system SHALL decrease the comment author's karma score by 1.

WHEN a user removes their vote from a comment, THE system SHALL adjust the comment author's karma score accordingly.

## Comment Editing and Deletion

### Comment Editing
WHEN a member clicks "edit" on their own comment, THE system SHALL display an edit form with the current comment content.

WHEN a member submits an edited comment, THE system SHALL validate the updated content and save the changes.

WHERE a user attempts to edit a comment they did not author, THEN THE system SHALL deny the request and return an appropriate error.

IF a comment has been edited, THEN THE system SHALL mark it with an "edited" indicator and timestamp.

### Edit Restrictions
WHERE a user attempts to edit a comment beyond the allowed time window (e.g., 24 hours), THEN THE system SHALL reject the edit request.

### Comment Deletion
WHEN a member clicks "delete" on their own comment, THE system SHALL confirm the deletion and remove the comment.

WHEN a comment is deleted, THE system SHALL mark it as deleted while preserving the comment ID for thread integrity.

WHERE a comment is deleted, THEN IT content SHALL no longer be visible, but IT reply chain structure SHALL be maintained.

### Moderator Deletion
WHERE a moderator deletes a comment in their community, THEN THE system SHALL record the moderator's action for audit purposes.

## Comment Sorting Options

### Best Sort (Default)
WHEN the best sort option is selected, THE system SHALL order comments by a combination of vote score and recency.

WHERE comments have similar scores, THEN THE system SHALL prioritize more recent comments.

WHERE comments have high scores, THEN THEY SHALL appear regardless of age.

### New Sort
WHEN the new sort option is selected, THE system SHALL order comments by creation timestamp, newest first.

WHERE multiple comments have identical timestamps, THEN THE system SHALL use comment ID as a tiebreaker.

### Controversial Sort
WHEN the controversial sort option is selected, THE system SHALL identify comments with many votes but scores close to zero.

WHERE a comment has many upvotes and many downvotes but a score near zero, THEN IT shall appear higher in controversial排序.

WHERE a comment has a very high score, THEN IT shall not appear in controversial排序.

## Nested Comment Display

### Thread Visualization
WHEN displaying a comment thread, THE system SHALL show parent comments with their replies indented below.

WHERE a comment has replies, THEN IT SHALL include a "show replies" or "view all replies" option.

WHEN a user expands a comment thread, THE system SHALL load and display all nested replies.

### Collapse Behavior
WHERE a comment thread has many nested levels, THEN THE system SHALL automatically collapse deep threads for readability.

WHEN a comment thread is collapsed, THE system SHALL show the total number of replies in the thread.

### Display Information
WHEN displaying a comment, THE system SHALL show:
- Comment author username
- Comment content
- Comment vote score
- Time since posting (e.g., "3 hours ago")
- "Reply" button for authorized users
- "Edit" button for comment authors
- "Delete" button for comment authors and moderators
- "Report" button for other users

## Moderator Comment Management

### Moderator Comment Deletion
WHERE a moderator deletes a comment in their community, THEN THE system SHALL record the deletion reason and timestamp.

WHERE a comment is deleted by a moderator, THEN IT SHALL be marked with "[deleted by moderator]" instead of the content.

### Comment Quarantine
WHERE a comment has been reported multiple times, THEN THE system SHALL temporarily hide it from public view until moderator review.

### Comment History
WHERE a moderator views a user's profile, THEN THE system SHALL include their comment history in the profile data.

## Community Management

### Community Creation

WHEN a member creates a community, THE system SHALL:
- Accept unique community name (alphanumeric, underscores, hyphens only)
- Accept community description (optional text field, max 500 characters)
- Accept community icon (optional image upload, max 5 MB)
- Set creator as community owner
- Initialize subscriber count to one (creator's subscription)
- Generate community ID and unique identifier

### Community Name Requirements

THE community name SHALL:
- Be unique across the entire platform
- Contain only alphanumeric characters, underscores, and hyphens
- Be between 3 and 21 characters in length
- Start with an alphanumeric character
- Be case-insensitive ("MyCommunity" same as "mycommunity")

### Community Listing

WHEN browsing all communities, THE system SHALL:
- Display community name and description
- Show subscriber count for each community
- Display community icon (if available)
- Show subscription status for current user
- Support pagination (20 communities per page)
- Allow sorting by subscriber count (descending)

### Community Search

WHEN a user searches for communities by name, THE system SHALL:
- Support partial name matching (substring search)
- Return results ordered by subscriber count
- Include matching community name, description, icon, and subscriber count
- Limit results to 50 communities for performance
- Return empty list when no matches found

### Community Subscription

WHEN a member subscribes to a community, THE system SHALL:
- Add community to user's subscription list
- Increment community subscriber count
- Update subscription timestamp
- Allow immediate post creation in the community

IF a user attempts to subscribe to a community they are already subscribed to, THEN THE system SHALL ignore the request and return appropriate response.

### Community Unsubscription

WHEN a member unsubscribes from a community, THE system SHALL:
- Remove community from user's subscription list
- Decrement community subscriber count
- Update unsubscription timestamp
- Prevent new post creation in the community
- Maintain existing posts visibility for previously created content

### Community Profile Page

WHEN viewing a community profile, THE system SHALL display:
- Community name and description
- Community icon (if available)
- Subscriber count
- Owner username
- List of moderators
- List of banned users
- Community creation date
- Statistics (total posts, active users, etc.)
- Subscription status for current user
- Subscribe/unsubscribe action button

## User Profile Management

### User Registration and Account Creation

WHEN a user registers, THE system SHALL:
- Accept email address (valid email format)
- Accept password (minimum 8 characters, strong password policy)
- Accept username (unique, alphanumeric with underscores/hyphens, 3-21 characters)
- Accept optional display name (up to 50 characters)
- Accept optional bio text (up to 1,000 characters)
- Send verification email (optional)
- Initialize karma score to zero
- Create user account with current timestamp

### Profile Display Information

WHEN viewing any user's profile, THE system SHALL display:
- Display name (or username if display name not set)
- Bio text (if provided)
- Avatar image (if uploaded)
- Total karma score
- Number of posts created
- Number of comments written
- Account creation date
- Date of last post/comment activity

### Profile Editing

WHEN a user edits their own profile, THE system SHALL:
- Allow display name modification (max 50 characters)
- Allow bio text modification (max 1,000 characters)
- Allow avatar image upload (max 5 MB, standard image formats)
- Update modification timestamp
- Validate uniqueness of display name if changed

IF a user attempts to change username, THEN THE system SHALL require username change request and new username validation.

### Profile Viewing Permissions

WHEN viewing another user's profile, THE system SHALL:
- Display public profile information
- Show posts created by the user
- Show comments written by the user
- Display current user's subscription status to other users
- Prevent display of private account information (email, password)

## Karma System

### Karma Score Calculation

WHILE calculating karma for any user, THE system SHALL:
- Calculate karma as sum of all post karma plus sum of all comment karma
- Post karma equals: (upvotes received on posts) minus (downvotes received on posts)
- Comment karma equals: (upvotes received on comments) minus (downvotes received on comments)
- Track karma adjustments in real-time
- Allow karma to reach negative values

### Karma Display

WHEN displaying karma, THE system SHALL:
- Show total karma score on user profile
- Show karma score next to user's posts and comments
- Format large numbers (e.g., "1.2k", "1.5M")
- Display color coding (positive: green, negative: red, zero: gray)

### Karma Adjustment Scenarios

WHEN a user's post receives an upvote, THEN THE system SHALL increase the post author's karma by 1.

WHEN a user's post receives a downvote, THEN THE system SHALL decrease the post author's karma by 1.

WHEN a user removes their upvote from a post, THEN THE system SHALL decrease the post author's karma by 1.

WHEN a user removes their downvote from a post, THEN THE system SHALL increase the post author's karma by 1.

WHEN a user changes their vote from upvote to downvote on a post, THEN THE system SHALL decrease the post author's karma by 2 (negative 1 from removing upvote, negative 1 from adding downvote).

WHEN a user changes their vote from downvote to upvote on a post, THEN THE system SHALL increase the post author's karma by 2 (positive 1 from removing downvote, positive 1 from adding upvote).

THE same karma adjustment logic applies to comments.

### Karma Security

WHILE calculating karma, THE system SHALL:
- Prevent karma manipulation through vote rings
- Apply rate limiting to prevent karma farming
- Maintain karma calculation consistency across concurrent operations
- Store karma history for audit purposes

## Content Types and Relationships

### Entity Relationships

#### User to Content
- One user can create many posts
- One user can write many comments
- One user can subscribe to many communities
- One user can vote on many posts
- One user can vote on many comments

#### Community to Content
- One community can have many posts
- One community can have many users subscribed
- One community can have many banned users
- One community can have many moderators

#### Post to Content
- One post can have many comments
- One post has one author (user)
- One post belongs to one community

#### Comment to Content
- One comment can have many replies (child comments)
- One comment has one author (user)
- One comment belongs to one post
- One comment may have one parent comment (for replies)

### Data Validation Rules

WHILE creating or updating content, THE system SHALL validate:

**User Validation**
- Email: Valid email format (RFC 5322)
- Password: Minimum 8 characters, must contain letters and numbers
- Username: Unique, 3-21 characters, alphanumeric with underscores/hyphens
- Display name: Max 50 characters

**Post Validation**
- Title: Non-empty string, max 300 characters
- Content: Type-specific validation (text content, valid URL, valid image)
- Community: User must be subscribed to create post

**Comment Validation**
- Content: Non-empty string, min 1 character, max 10,000 characters
- Parent: Valid post or comment identifier

**Community Validation**
- Name: Unique, 3-21 characters, alphanumeric with underscores/hyphens
- Description: Max 500 characters
- Icon: Valid image file, max 5 MB

## Business Logic and Workflow Requirements

### Post Creation Workflow

1. User navigates to community they are subscribed to
2. User clicks "Create Post" button
3. User selects post type (text, link, image)
4. User fills in required fields
5. System validates input data
6. If valid: System creates post, updates karma, increments community post count
7. If invalid: System displays error messages for each invalid field
8. System redirects to post detail page or returns JSON response

### Comment Reply Workflow

1. User views post with comments
2. User finds a comment they want to respond to
3. User clicks "Reply" on that comment
4. User types their response and submits
5. User sees their reply nested under the original comment
6. The comment thread expands to show the reply

### Community Subscription Workflow

1. User views community profile
2. User clicks "Subscribe" button
3. System validates user is not already subscribed
4. If not subscribed: System adds user to subscribers, increments count
5. If already subscribed: System ignores request
6. System updates UI to show "Unsubscribe" button

### Karma Adjustment Workflow

1. User votes on post or comment
2. System validates user has not already voted
3. System records vote
4. System adjusts score by +1 (upvote) or -1 (downvote)
5. System adjusts voter's karma score by +1 or -1
6. System adjusts content author's karma score by +1 or -1
7. If user changes vote: Apply karma adjustment (±2)
8. If user removes vote: Reverse previous karma adjustment

### Post Deletion Workflow

1. User clicks "Delete" on own post
2. System verifies user is post author or moderator
3. If verified: System soft-deletes post, clears content
4. System updates karma for author
5. System updates community post count
6. System maintains comment thread structure
7. System updates post list displays

## User Actor-Specific Feature Access

### Guest User Capabilities

GUEST users can view but cannot interact:
- View public posts on popular and community feeds
- View community listings and search results
- View user profiles and their content
- View post details and comments
- Register for account
- Log in to existing account

GUEST users CANNOT:
- Create posts or comments
- Vote on content
- Subscribe to communities
- Edit profiles
- Access home feed (member-only feature)

### Member User Capabilities

MEMBER users have full participation rights:
- All guest capabilities
- Create posts in subscribed communities
- Create comments on any post
- Vote on posts and comments
- Subscribe and unsubscribe from communities
- Edit own posts, comments, and profile
- Delete own posts and comments
- View home feed (subscribed communities only)

MEMBER users CANNOT:
- Delete other users' content (unless they are moderators)
- Moderate communities (unless granted moderator status)
- Access admin functions

### Admin User Capabilities

ADMIN users have platform-wide oversight:
- All member capabilities
- Access to all community moderation tools
- Ability to view all reported content
- Ability to override community moderator decisions
- Platform-wide content management
- User management capabilities

ADMIN users CANNOT:
- Delete user accounts permanently (soft delete only)
- Bypass all community moderation without justification
- Access user passwords (stored securely)

## Content Visibility and Access Control

### Feed Access Control

**Home Feed**
- REQUIREMENT: User must be authenticated
- CONTENT: Posts from subscribed communities only
- ACCESS: Member and admin users

**Popular Feed**
- REQUIREMENT: No authentication required
- CONTENT: Posts from all communities across platform
- ACCESS: Guest, member, and admin users

**Community Feed**
- REQUIREMENT: No authentication required
- CONTENT: Posts from specific community
- ACCESS: Guest, member, and admin users

### Post Visibility

WHILE viewing posts, THE system SHALL apply visibility rules:

**Public Posts**
- Visible to all users (guest, member, admin)
- Display on popular feed and community feeds
- Display on author's profile page

**Deleted Posts**
- Not visible to guest users
- Visible to author (indicates deletion)
- Visible to moderators and admin
- Maintain comment thread structure

### Comment Visibility

WHILE viewing comments, THE system SHALL apply visibility rules:

**Public Comments**
- Visible to all users
- Display on post detail page
- Display on author's profile page

**Deleted Comments**
- Not visible to guest users
- Visible to author and comment reply chain
- Visible to moderators and admin
- Maintain thread structure

## Performance Requirements for Core Features

### Response Time Expectations

WHILE loading core features, THE system SHALL meet these response time targets:

**Instant (100-500ms)**
- Post listing pagination (home, popular, community feeds)
- Comment loading on post detail page
- User profile information display
- Community subscription status update

**Fast (500ms-2s)**
- Post creation submission and response
- Comment submission and response
- Vote action and score update
- Profile editing confirmation

**Moderate (2s-5s)**
- Community creation with icon upload
- Image post upload and thumbnail generation
- Complex feed sorting operations (controversial, top with time filter)
- Bulk subscription operations

**Acceptable (5s-15s)**
- Initial page load with multiple feeds
- User profile with extensive post/comment history
- Community feed with high-volume activity

### Concurrency Requirements

THE system SHALL handle concurrent operations:
- Multiple users voting on same post simultaneously
- Multiple users subscribing to same community
- Multiple comments created in rapid succession
- Karma calculation updates during high-traffic periods
- Community subscriber count updates without race conditions

## Content Management and Moderation Interface

### Moderator-Only Content Management

WHILE performing content management, MODERATORS and ADMIN users SHALL:

**Post Moderation**
- Delete any post in their community
- View reported posts for their community
- Approve or dismiss reports
- View reason for reported content
- Maintain deletion history

**Comment Moderation**
- Delete any comment in their community
- View reported comments for their community
- Approve or dismiss reports
- View reporting history
- Maintain deletion context

**User Moderation**
- Ban users from their community
- Unban users from their community
- View list of banned users
- View ban history and reasons

## Error Handling and User Feedback

### Content Creation Errors

IF post creation fails due to validation, THEN THE system SHALL:
- Return specific error messages for each invalid field
- Preserve user input for form resubmission
- Display helpful guidance for fixing each error
- Highlight invalid fields in the UI

IF comment creation fails due to validation, THEN THE system SHALL:
- Display appropriate error message
- Preserve user input for resubmission
- Show character count and limit

### Access Control Errors

IF a guest attempts to access member-only features, THEN THE system SHALL:
- Redirect to login page or show login modal
- Display clear message about required authentication
- Provide option to create account

IF a user attempts unauthorized content modification, THEN THE system SHALL:
- Return appropriate error code (403 Forbidden)
- Display user-friendly message
- Log security event for monitoring

### Content Availability Errors

IF requested content is not found, THEN THE system SHALL:
- Return 404 Not Found status
- Display appropriate user message
- Provide navigation options to related content

IF content has been deleted, THEN THE system SHALL:
- Return appropriate status based on user permissions
- Display appropriate message for deleted content
- Maintain referential integrity for related content

## Success Metrics for Core Features

### Engagement Metrics

THE system SHALL track these core success metrics:

**Content Creation Metrics**
- Daily active posters (users creating posts)
- Daily active commenters (users creating comments)
- Average posts per active user
- Average comments per active user

**Community Metrics**
- Total active communities
- Average subscribers per community
- New communities created per day
- Community churn rate

**User Growth Metrics**
- Daily registered users
- Daily active users (DAU)
- Monthly active users (MAU)
- User retention rates

### Performance Metrics

THE system SHALL maintain these performance benchmarks:
- 95th percentile page load time under 2 seconds
- 99th percentile API response time under 5 seconds
- System uptime of 99.9% (excluding maintenance)
- Error rate below 1% of total requests

## Conclusion

This document has comprehensively defined all core features of the Reddit-like community platform, including:

- Post management with three content types and full CRUD operations
- Comment threading with unlimited depth and multiple sorting options
- Community creation, subscription, and moderation capabilities
- User profile management with karma integration
- Complete entity relationships and business logic
- User actor access control for all features
- Performance requirements and error handling

All core features are designed to work together to create a vibrant, self-sustaining community platform where users can create content, participate in discussions, build reputation, and connect with others who share their interests. The system balances user freedom with appropriate moderation controls to maintain community quality and engagement.

The next sections of the requirements specification will detail the voting system, content feeds, comment system, moderation capabilities, and reporting mechanisms that build upon these core features to create a complete platform experience.

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*
