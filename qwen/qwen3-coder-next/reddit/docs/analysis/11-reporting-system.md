# Functional Requirements Specification

## 1. User Account Management

### 1.1 Registration Process

WHEN a guest provides valid registration information (unique username, email address, and password), THE system SHALL create a new user account and log them in automatically.

WHEN username already exists, THE system SHALL reject registration and return an appropriate error message.

WHEN email already exists, THE system SHALL reject registration and return an appropriate error message.

### 1.2 Login Process

WHEN a guest submits valid credentials (email and password), THE system SHALL authenticate and establish a user session.

WHEN authentication fails due to invalid credentials, THE system SHALL return an appropriate error message.

WHEN authentication fails due to unverified email (if email verification is enabled), THE system SHALL return an appropriate error message.

### 1.3 Password Management

WHEN a member requests to change their password, THE system SHALL verify their current password and update to the new password.

WHEN password change fails validation (weak password, mismatched confirmation), THE system SHALL return appropriate error messages.

### 1.4 Account Deletion

WHEN a member requests to delete their account, THE system SHALL:
- Delete the user's account
- Delete all posts created by the user
- Delete all comments created by the user
- Remove all votes cast by the user
- Reset karma contributions
- Log the user out from all active sessions

IF account deletion fails due to system error, THEN THE system SHALL return an appropriate error message and maintain account integrity.

## 2. User Profile System

### 2.1 Profile Information

THE system SHALL store the following profile information for each user:
- Display name (user-chosen identifier, not necessarily unique)
- Bio text (optional user-provided biography)
- Avatar image (optional user-uploaded profile image)
- Karma score (calculated value)

### 2.2 Profile Editing

WHEN a member requests to update their display name, THE system SHALL update the display name after validation.

WHEN a member requests to update their bio text, THE system SHALL update the bio after validation.

WHEN a member requests to update their avatar image, THE system SHALL update the avatar after image validation.

IF a user attempts to edit another user's profile, THEN THE system SHALL deny the request with appropriate error message.

### 2.3 Profile Viewing

WHEN any user or guest requests to view a profile, THE system SHALL display:
- Display name
- Bio text
- Avatar image
- Total karma score
- List of all posts created by the user
- List of all comments created by the user

### 2.4 Karma Calculation

THE system SHALL calculate karma score as:
- Start at 0 for new users
- Add 1 for each upvote received on posts or comments
- Subtract 1 for each downvote received on posts or comments
- Adjust when votes are removed or changed
- Allow negative karma values

## 3. Community System

### 3.1 Community Creation

WHEN a member requests to create a community, THE system SHALL create a new community with:
- Unique name (validated for uniqueness)
- Description text
- Icon image
- Creator as owner

WHEN community name already exists, THE system SHALL reject creation and return appropriate error.

WHEN community name fails format validation, THE system SHALL reject creation with appropriate error.

### 3.2 Community Browsing

WHEN any user or guest requests to view all communities, THE system SHALL return a paginated list of communities with:
- Community name
- Description
- Icon image
- Subscriber count

### 3.3 Community Search

WHEN a search query is submitted, THE system SHALL return communities matching the query by name.

WHEN no communities match the search, THE system SHALL return an empty list.

### 3.4 Community Listing

WHEN viewing a community's detail page, THE system SHALL display:
- Community name
- Description
- Icon image
- Subscriber count
- Owner information
- Moderator list

## 4. Community Subscription System

### 4.1 Subscription Management

WHEN a member requests to subscribe to a community, THE system SHALL add the user to the community's subscriber list.

WHEN a member requests to unsubscribe from a community, THE system SHALL remove the user from the community's subscriber list.

IF a member attempts to subscribe to a community they're already subscribed to, THEN THE system SHALL return appropriate message.

IF a member attempts to unsubscribe from a community they're not subscribed to, THEN THE system SHALL return appropriate message.

### 4.2 Subscription Listing

WHEN a member requests to view their subscribed communities, THE system SHALL return a list of all communities they are subscribed to.

## 5. Post System

### 5.1 Post Creation

WHEN a member creates a post, THE system SHALL require:
- Community membership (member must be subscribed)
- Post type selection (text, link, or image)
- Title field (required)
- Content specific to post type:
  - Text post: text content
  - Link post: URL
  - Image post: uploaded image

WHEN a member creates a text post, THE system SHALL store the text content.

WHEN a member creates a link post, THE system SHALL validate and store the URL.

WHEN a member creates an image post, THE system SHALL validate and store the uploaded image.

IF a member attempts to create a post in a community they're not subscribed to, THEN THE system SHALL deny the request with appropriate error message.

### 5.2 Post Editing

WHEN a member requests to edit their own post, THE system SHALL allow updates to:
- Title
- Content (text content, URL, or image)

WHEN a member requests to edit a post they do not own, THE system SHALL deny the request with appropriate error message.

### 5.3 Post Deletion

WHEN a member requests to delete their own post, THE system SHALL:
- Mark the post as deleted
- Remove from feed displays
- Update comment counts and vote counts accordingly
- Preserve post data for audit trail

WHEN a member requests to delete a post they do not own, THE system SHALL deny the request with appropriate error message.

### 5.4 Post View Requirements

WHEN viewing a single post, THE system SHALL display:
- Title
- Full content (text content, link URL, or image)
- Author username
- Community name
- Vote score
- Comment count
- Time since posted

## 6. Post Voting System

### 6.1 Vote Casting

WHEN a member upvotes a post, THE system SHALL:
- Record the upvote
- Increase the post's vote score by 1
- Increase the author's karma by 1
- Prevent duplicate votes

WHEN a member downvotes a post, THE system SHALL:
- Record the downvote
- Decrease the post's vote score by 1
- Decrease the author's karma by 1
- Prevent duplicate votes

### 6.2 Vote Changes and Removal

WHEN a member changes their vote from upvote to downvote, THE system SHALL:
- Update the vote type
- Decrease post score by 2 (remove +1, add -1)
- Adjust author karma by -2

WHEN a member changes their vote from downvote to upvote, THE system SHALL:
- Update the vote type
- Increase post score by 2 (remove -1, add +1)
- Adjust author karma by +2

WHEN a member removes their vote entirely, THE system SHALL:
- Remove the vote record
- Revert the post score change
- Revert the author karma change

### 6.3 One-Vote-Per-User Rule

WHEN a member attempts to vote on a post they've already voted on, THE system SHALL:
- Update their existing vote rather than creating a new vote
- Reject duplicate vote attempts

IF a guest attempts to vote on a post, THEN THE system SHALL deny the request and require authentication.

## 7. Post Feeds

### 7.1 Home Feed

WHEN a logged-in member requests the home feed, THE system SHALL:
- Show posts only from communities the user is subscribed to
- Support all sorting options (hot, new, top, controversial)
- Implement pagination

IF a guest requests the home feed, THEN THE system SHALL require authentication.

### 7.2 Popular Feed

WHEN any user (authenticated or guest) requests the popular feed, THE system SHALL:
- Show posts from all communities across the platform
- Support all sorting options (hot, new, top, controversial)
- Implement pagination

### 7.3 Community Feed

WHEN any user (authenticated or guest) requests a community feed, THE system SHALL:
- Show posts from the specific community
- Support all sorting options (hot, new, top, controversial)
- Implement pagination

### 7.4 Sorting Options

WHEN any feed requests "Hot" sorting, THE system SHALL:
- Prioritize recent posts with many upvotes
- Apply time decay algorithm
- Show posts with strong engagement

WHEN any feed requests "New" sorting, THE system SHALL:
- Show most recently created posts first
- Ignore engagement metrics

WHEN any feed requests "Top" sorting, THE system SHALL:
- Sort by vote score (highest first)
- Apply time filter as specified (today, this week, this month, this year, all time)
- Support filtering by time period

WHEN any feed requests "Controversial" sorting, THE system SHALL:
- Prioritize posts with many votes but score close to zero
- Apply algorithm that detects divisive content
- Show posts with high engagement but mixed opinions

### 7.5 Feed Display Requirements

WHEN viewing any feed, THE system SHALL display each post with:
- Title
- Author username
- Community name
- Vote score
- Comment count
- Time since posted
- Post-type-specific information:
  - Text post: first 200 characters of content
  - Image post: thumbnail of the image
  - Link post: domain name of the URL

## 8. Comment System

### 8.1 Comment Creation

WHEN a member creates a comment on a post, THE system SHALL:
- Store the comment content
- Link to the post
- Link to the author
- Set reply parent (null for direct post comment, comment ID for reply)

WHEN a member creates a reply to a comment, THE system SHALL:
- Store the reply content
- Link to the post
- Link to the author
- Link to the parent comment
- Maintain reply hierarchy

### 8.2 Nested Reply Structure

THE system SHALL support unlimited comment depth with parent-child relationships.

WHEN displaying comments, THE system SHALL:
- Show parent comments first
- Indent or otherwise visually distinguish replies
- Maintain thread hierarchy
- Support expanding/collapsing reply threads

### 8.3 Comment Editing

WHEN a member requests to edit their own comment, THE system SHALL allow content updates.

WHEN a member requests to edit a comment they do not own, THE system SHALL deny the request with appropriate error message.

### 8.4 Comment Deletion

WHEN a member requests to delete their own comment, THE system SHALL:
- Mark the comment as deleted
- Update parent comment's reply count
- Preserve comment data for audit trail

IF a comment has replies, THEN THE system SHALL:
- Allow deletion to proceed
- Keep reply hierarchy intact
- Mark the deleted comment as removed

## 9. Comment Voting System

### 9.1 Comment Voting

WHEN a member upvotes a comment, THE system SHALL:
- Record the upvote
- Increase the comment's vote score by 1
- Increase the author's karma by 1

WHEN a member downvotes a comment, THE system SHALL:
- Record the downvote
- Decrease the comment's vote score by 1
- Decrease the author's karma by 1

### 9.2 Vote Management

WHEN a member changes their vote on a comment, THE system SHALL apply the same logic as post voting changes.

WHEN a member removes their vote on a comment, THE system SHALL revert the karma adjustment.

## 10. Comment Sorting

### 10.1 Sort Options

WHEN comments are sorted by "Best", THE system SHALL:
- Sort by highest vote score first
- Consider vote ratio and total votes
- Prioritize well-received comments

WHEN comments are sorted by "New", THE system SHALL:
- Sort by most recent first
- Ignore vote scores

WHEN comments are sorted by "Controversial", THE system SHALL:
- Prioritize comments with many votes but score close to zero
- Apply controversial content algorithm

## 11. Community Moderation System

### 11.1 Moderator Roles and Hierarchy

THE system SHALL define the following community roles:
- Owner: Community creator, highest authority
- Moderator: Appointed by owner or other moderators, elevated privileges

WHEN a community is created, THE system SHALL automatically appoint the creator as owner.

### 11.2 Owner Permissions

WHILE a user is community owner, THE system SHALL:
- Add moderators to the community
- Remove moderators from the community
- Edit community settings
- Transfer ownership to another member
- Maintain all other member permissions

### 11.3 Moderator Permissions

WHILE a user is community moderator, THE system SHALL:
- Add other moderators to the community
- Edit community settings
- Delete any post in the community
- Delete any comment in the community
- Ban users from the community
- View banned user list
- View community reports
- Approve or dismiss reports

IF a user is community moderator, THEN THE system SHALL NOT:
- Remove the community owner
- Remove other moderators (only owner can remove moderators)

### 11.4 Ban System

WHEN a moderator bans a user from a community, THE system SHALL:
- Add user to community's banned user list
- Prevent the banned user from creating posts in that community
- Prevent the banned user from creating comments in that community
- Allow the banned user to view community content

WHEN a moderator unbans a user from a community, THE system SHALL:
- Remove user from community's banned user list
- Restore user's ability to create posts and comments
- Maintain all other user privileges

WHEN a banned user attempts to create a post in a community, THEN THE system SHALL deny the request and show appropriate error message.

WHEN a banned user attempts to create a comment in a community, THEN THE system SHALL deny the request and show appropriate error message.

### 11.5 Moderator Actions Log

THE system SHALL maintain a log of:
- Moderator appointments and removals
- Post deletions by moderators
- Comment deletions by moderators
- User bans and unbans
- Report resolutions

## 12. Reporting System

### 12.1 Content Reporting

WHEN a member reports a post, THE system SHALL:
- Store the report with reason text
- Link to the reported post
- Link to the reporting user
- Link to the post author

WHEN a member reports a comment, THE system SHALL:
- Store the report with reason text
- Link to the reported comment
- Link to the reporting user
- Link to the comment author
- Link to the parent post

IF a member attempts to report content they own, THEN THE system SHALL deny the request with appropriate error message.

### 12.2 Report Viewing

WHILE a user is community moderator, THE system SHALL:
- Show all reports for the community
- Display reported content
- Display reporter information
- Display report reason
- Display timestamp

### 12.3 Report Resolution

WHEN a moderator approves a report, THE system SHALL:
- Delete the reported content (post or comment)
- Remove the report from the active reports list
- Log the moderator action
- Notify the content author

WHEN a moderator dismisses a report, THE system SHALL:
- Keep the reported content
- Remove the report from the active reports list
- Log the moderator action

WHEN a report is dismissed, THEN THE system SHALL NOT:
- Show the dismissed report in active report list
- Allow re-submission of the same report

### 12.4 Report History

THE system SHALL maintain a complete history of:
- All reports (active and resolved)
- Report reasons provided by users
- Moderator actions on reports
- Timestamps for all report-related events

## Appendix A: User Actor Permissions Matrix

The following table summarizes capabilities across all user actors:

| Action | Guest | Member | Moderator | Owner |
|--------|-------|--------|-----------|-------|
| Create account | ❌ | ✅ | ✅ | ✅ |
| Log in | ❌ | ✅ | ✅ | ✅ |
| View popular feed | ✅ | ✅ | ✅ | ✅ |
| View community feeds | ✅ | ✅ | ✅ | ✅ |
| View community list | ✅ | ✅ | ✅ | ✅ |
| Search communities | ✅ | ✅ | ✅ | ✅ |
| Create posts | ❌ | ✅ | ✅ | ✅ |
| Comment on posts | ❌ | ✅ | ✅ | ✅ |
| Vote on posts | ❌ | ✅ | ✅ | ✅ |
| Vote on comments | ❌ | ✅ | ✅ | ✅ |
| Subscribe to communities | ❌ | ✅ | ✅ | ✅ |
| Edit own posts | ❌ | ✅ | ✅ | ✅ |
| Delete own posts | ❌ | ✅ | ✅ | ✅ |
| Edit own comments | ❌ | ✅ | ✅ | ✅ |
| Delete own comments | ❌ | ✅ | ✅ | ✅ |
| Report content | ❌ | ✅ | ✅ | ✅ |
| Delete any post in community | ❌ | ❌ | ✅ | ✅ |
| Delete any comment in community | ❌ | ❌ | ✅ | ✅ |
| Ban users from community | ❌ | ❌ | ✅ | ✅ |
| Unban users from community | ❌ | ❌ | ✅ | ✅ |
| View banned users list | ❌ | ❌ | ✅ | ✅ |
| View community reports | ❌ | ❌ | ✅ | ✅ |
| Approve reports | ❌ | ❌ | ✅ | ✅ |
| Dismiss reports | ❌ | ❌ | ✅ | ✅ |
| Create communities | ❌ | ❌ | ❌ | ✅ |
| Appoint moderators | ❌ | ❌ | ❌ | ✅ |
| Remove moderators | ❌ | ❌ | ❌ | ✅ |
| Edit community settings | ❌ | ❌ | ❌ | ✅ |

## Appendix B: Authentication Flow

```mermaid
graph LR
  A["Guest accesses registration page"] --> B["Enter registration details"]
  B --> C["Submit registration form"]
  C --> D["Validate input data"]
  D --> E{"Valid data?"}
  E -->|No| F["Return error messages"]
  E -->|Yes| G["Check email uniqueness"]
  G --> H{"Email available?"}
  H -->|No| I["Return email conflict error"]
  H -->|Yes| J["Check username availability"]
  J --> K{"Username available?"}
  K -->|No| L["Return username conflict error"]
  K -->|Yes| M["Create user account"]
  M --> N["Generate JWT tokens"]
  N --> O["Send verification email"]
  O --> P["Return success response"]
```

## Appendix C: Report Resolution Workflow

```mermaid
graph LR
  A["Report Submitted"] --> B["Pending"]
  B --> C["Moderator Reviews"]
  C --> D{"Action?"}
  D -->|Approve| E["Delete Content"]
  D -->|Dismiss| F["Keep Content"]
  D -->|Escalate| G["Owner Review"]
  E --> H["Approved Status"]
  F --> I["Dismissed Status"]
  G --> J{"Owner Decision?"}
  J -->|Approve| H
  J -->|Dismiss| I
```