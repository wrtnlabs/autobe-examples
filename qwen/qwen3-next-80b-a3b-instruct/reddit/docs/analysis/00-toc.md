# Community Platform - System Overview

## Platform Overview

The Community Platform is a Reddit-like online forum system designed to enable users to form, join, and participate in interest-based communities. The system facilitates content sharing through posts and discussions through comments, supported by a reputation system (karma), voting mechanisms, and community moderation tools. The primary goal is to create a scalable, user-driven platform where engagement is incentivized through visibility, reputation, and participation.

## User Actors

The platform defines four distinct user roles with progressively expanding permissions:

### Guest
- Can view all public feeds (Popular, Community)
- Can view post and comment content
- Can view community and user profiles
- Cannot create, edit, delete, or vote on any content
- Cannot subscribe to communities
- Cannot access Home Feed or personal profiles

### Member
- All guest permissions
- Can register with email and password
- Can choose a unique username
- Can log in and maintain a persistent session
- Can create, edit, and delete their own posts
- Can create, edit, and delete their own comments
- Can upvote or downvote posts and comments
- Can change or remove votes
- Can subscribe to communities
- Can view their own profile, karma, and activity
- Can edit their display name, bio, and avatar
- Can delete their account (triggers deletion of all content)

### Moderator
- All member permissions
- Can delete any post or comment within communities they moderate
- Can ban users from communities they moderate
- Can unban users from communities they moderate
- Can view all reports within their communities
- Can approve or dismiss reports
- Can add other members as moderators (except owners)
- Cannot remove the community owner
- Cannot remove other moderators
- Cannot manage platform-wide settings

### Admin
- All moderator permissions
- Can manage all communities, users, and settings globally
- Can override any moderation decision
- Can ban or unban any user platform-wide
- Can view and act on all reports across all communities
- Can add or remove moderators or owners from any community
- Can access system-wide logs and analytics
- Can configure platform-level features and policies

## Core Features

### Authentication & Account Management

WHEN a user registers for the first time, THE system SHALL require an email address and password, and allow selection of a unique username.

WHEN a user logs in, THE system SHALL authenticate credentials and issue a JWT access token with expiration ≤30 minutes and a refresh token with expiration ≤30 days.

WHEN a user changes their password, THE system SHALL validate the current password and enforce a minimum length of 8 characters, then update the credential store.

WHEN a user deletes their account, THE system SHALL permanently remove:
- All user posts
- All user comments
- All user karma history
- All user profile data
- All pending vote records
- All subscription records
- All report records made by the user

IF a user account is deleted, THEN THE system SHALL nullify and anonymize any reference to the user in posts and comments (e.g., "[deleted]"), but preserve the content and votes for context.

### User Profiles

WHEN a user navigates to any profile page, THE system SHALL display:
- Display name (editable only by owner)
- Bio text (editable only by owner)
- Avatar image URL (editable only by owner)
- Total karma score
- List of all posts authored by that user (with post title, community, date, and score)
- List of all comments authored by that user (with post title, content preview, date, and score)

WHILE a user is viewing their own profile, THE system SHALL display an edit button to modify display name, bio, and avatar.

WHEN a post or comment author is deleted, THE system SHALL display "[deleted]" in place of the username on all associated content.

### Karma System

WHEN a user upvotes a post or comment, THE system SHALL increase the author's karma by 1.

WHEN a user downvotes a post or comment, THE system SHALL decrease the author's karma by 1.

WHEN a user removes their vote from a post or comment, THE system SHALL adjust the author's karma by reversing the prior vote impact:
- If the prior vote was upvote → karma decreases by 1
- If the prior vote was downvote → karma increases by 1

WHILE a user has an active vote on a post or comment, THE system SHALL NOT allow a second vote.

WHERE a user's karma is negative, THE system SHALL still display the negative score without restriction.

THE system SHALL NOT allow karma to be manipulated by third-party bots or duplicate accounts. Karma is updated in real-time on vote changes.

### Communities

WHEN a user creates a community, THE system SHALL:
- Assign the user as the owner
- Require a unique community name (alphanumeric and underscores only)
- Accept a description field (max 500 characters)
- Accept an optional icon image URL
- Initialize the subscriber count to 1

WHEN a user subscribes to a community, THE system SHALL:
- Add the user to the community subscriber list
- Increase the community’s subscriber count by 1
- Grant permission to create posts and comments in that community

WHEN a user unsubscribes from a community, THE system SHALL:
- Remove the user from the subscriber list
- Decrease the community’s subscriber count by 1
- Revoke permission to create posts or comments in that community

WHEN a user visits a community page, THE system SHALL display:
- Community name
- Description
- Avatar icon
- Subscriber count
- List of recent posts (sorted by selected criteria)
- Button to subscribe or unsubscribe

WHILE a user is browsing communities, THE system SHALL:
- Display all public communities
- Allow search by community name (case-insensitive prefix match)
- Sort results by subscriber count descending

The system SHALL NOT allow two communities to have identical names.

### Posts

WHEN a user creates a post, THE system SHALL:
- Require a title (minimum 5 characters, maximum 300 characters)
- Require one of three content types: text, link, or image
- Require the user to be subscribed to the target community
- Associate the post with the community and author
- Set initial vote score to 0
- Set comment count to 0
- Set creation timestamp

WHEN a user submits a text post, THE system SHALL:
- Accept up to 50,000 characters of text
- Render the text as plain HTML with paragraph and line-break formatting

WHEN a user submits a link post, THE system SHALL:
- Accept a valid URL (https:// or http://)
- Extract and display the domain name (e.g., "youtube.com")
- Validate the URL is not blocked by platform policy

WHEN a user submits an image post, THE system SHALL:
- Accept an image file in JPEG, PNG, or WebP format
- Resize and compress the image to a maximum size of 2048px on the longest side
- Store the image at a CDN-accessible URL
- Generate a 320x240 thumbnail for feed display

WHEN a user edits their own post, THE system SHALL:
- Allow modification of title, content type, or content
- Preserve original post ID and creation timestamp
- Log the edit history internally (not visible to users)

WHEN a user deletes their own post, THE system SHALL:
- Remove the post from all feeds
- Set the post status to "deleted"
- Update the comment count on affected posts to 0
- Preserve votes and comment content for moderation review
- Do not delete comments made by other users

IF a user attempts to create a post in a community they are not subscribed to, THEN THE system SHALL reject the request with HTTP 403.

### Post Voting

WHEN a user upvotes a post, THE system SHALL:
- Add an upvote record to the post if one doesn't exist
- If the user previously downvoted, remove the downvote and add an upvote
- Increase the post’s vote score by 1
- Increase the author's karma by 1

WHEN a user downvotes a post, THE system SHALL:
- Add a downvote record to the post if one doesn't exist
- If the user previously upvoted, remove the upvote and add a downvote
- Decrease the post’s vote score by 1
- Decrease the author's karma by 1

WHEN a user removes their vote from a post, THE system SHALL:
- Remove the voter's record
- Adjust the vote score by ±1 based on the prior vote
- Adjust the author's karma by ±1 based on the prior vote

THE system SHALL allow only one active vote per user per post.

IF a user attempts to vote on a deleted post, THEN THE system SHALL return HTTP 404.

### Post Feeds

WHEN a logged-in user accesses the Home Feed, THE system SHALL:
- Show only posts from communities the user is subscribed to
- Exclude posts from unsubscribed or banned communities

WHEN any user (logged in or guest) accesses the Popular Feed, THE system SHALL:
- Show posts from all communities
- Exclude posts from moderated or banned communities

WHEN any user accesses the Community Feed for a specific community, THE system SHALL:
- Show only posts belonging to that community
- Include posts from banned users (unless the community is locked)

WHEN sorting a feed by "Hot", THE system SHALL:
- Rank posts by a weighted score based on time decay and vote ratio
- Favor posts with high recent engagement
- Formula: score = log10(upvotes + 1) / ((hours since posted) + 2)

WHEN sorting a feed by "New", THE system SHALL:
- Rank by creation timestamp descending
- Include all posts regardless of vote count

WHEN sorting a feed by "Top", THE system SHALL:
- Rank by vote score descending
- Apply a time filter (Today, This Week, This Month, This Year, All Time)
- If no filter is selected, use "All Time"

WHEN sorting a feed by "Controversial", THE system SHALL:
- Rank by total votes (upvotes + downvotes) descending
- Then by score proximity to zero: score = 1 / (1 + ABS(vote score))
- Only include posts with total votes ≥ 10

ALL feeds SHALL be paginated with 20 items per page

WHEN displaying a post in a feed, THE system SHALL show:
- Title
- Author username
- Community name
- Vote score
- Comment count
- Time since posted (e.g., "3 hours ago")
- For text posts: the first 200 characters of content (with "..." if truncated)
- For image posts: a thumbnail (320x240)
- For link posts: the domain name of the URL (e.g., "youtube.com")

### Comments

WHEN a user creates a comment, THE system SHALL:
- Link the comment to a post or parent comment
- Allow up to 5,000 characters
- Set initial score to 0
- Set creation timestamp

WHEN a user replies to a comment, THE system SHALL:
- Create the reply as a child of the parent comment
- Allow unlimited nesting depth
- Display replies under the parent with visual indentation

WHEN a user edits their own comment, THE system SHALL:
- Allow modification of content only
- Preserve original comment ID and timestamp
- Log edit history internally

WHEN a user deletes their own comment, THE system SHALL:
- Remove the comment from display
- Set the comment status to "deleted"
- Preserve the comment record for moderation history
- Decrement the comment count on the associated post or parent comment

IF a user attempts to comment on a deleted post, THEN THE system SHALL return HTTP 404.

### Comment Voting

WHEN a user upvotes a comment, THE system SHALL:
- Add an upvote record to the comment if one doesn't exist
- If the user previously downvoted, remove the downvote and add an upvote
- Increase the comment’s score by 1
- Increase the comment author's karma by 1

WHEN a user downvotes a comment, THE system SHALL:
- Add a downvote record to the comment if one doesn't exist
- If the user previously upvoted, remove the upvote and add a downvote
- Decrease the comment’s score by 1
- Decrease the comment author's karma by 1

WHEN a user removes their vote from a comment, THE system SHALL:
- Remove the voter's record
- Adjust the comment score by ±1 based on the prior vote
- Adjust the comment author's karma by ±1 based on the prior vote

THE system SHALL allow only one active vote per user per comment.

IF a user attempts to vote on a deleted comment, THEN THE system SHALL return HTTP 404.

### Comment Sorting

WHEN sorting comments on a post by "Best", THE system SHALL:
- Rank by vote score descending
- Show top-rated comments first

WHEN sorting comments on a post by "New", THE system SHALL:
- Rank by creation timestamp descending
- Show newest replies first

WHEN sorting comments on a post by "Controversial", THE system SHALL:
- Rank by total votes (upvotes + downvotes) descending
- Then by score proximity to zero: score = 1 / (1 + ABS(vote score))
- Only include comments with total votes ≥ 5

ALL comment threads SHALL be loaded with a depth limit of 1,000 nodes to prevent performance degradation

### Moderation System

WHEN a community owner adds a moderator, THE system SHALL:
- Grant the user "moderator" role for that community
- Add the user to the community’s moderator list
- Allow the moderator to perform moderation actions in that community

WHEN a community owner removes a moderator, THE system SHALL:
- Remove the moderator from the community’s moderator list
- Revoke all moderator permissions for that community

WHEN a moderator bans a user from a community, THE system SHALL:
- Add the user to the community’s banned users list
- Prevent the user from posting or commenting in that community permanently
- Preserve existing posts and comments (they remain viewable)
- Notify the user via internal notification

WHEN a moderator unbans a user, THE system SHALL:
- Remove the user from the community’s banned users list
- Restore the user’s ability to post and comment in that community
- Do not restore deleted content

WHEN a user reports a post or comment, THE system SHALL:
- Require a reason (minimum 10 characters, maximum 500 characters)
- Store the report with timestamp, reporter ID, reported content ID, and reason
- Notify moderators of the community

WHEN a moderator views a report, THE system SHALL:
- See the reported content (post or comment)
- See the reporter's username (anonymized if reporter deleted)
- See the report reason
- See the time of reporting
- Choose to "Approve" or "Dismiss"

WHEN a moderator approves a report, THE system SHALL:
- Delete the reported content
- Apply a moderation log entry
- Notify the author (if still active) that the content was removed
- Move the report to "resolved" status

WHEN a moderator dismisses a report, THE system SHALL:
- Keep the reported content
- Mark the report as "dismissed" and remove from active report list
- No notification sent to author

THE system SHALL NOT allow moderators to delete reports they have made.

THE system SHALL NOT allow moderators to remove community owners.

THE system SHALL NOT allow moderators to remove other moderators.

## Performance Expectations

WHEN a user loads the Home Feed, THE system SHALL render all 20 initial posts within 1.5 seconds.

WHEN a user loads the Popular Feed with no filters, THE system SHALL render 20 posts within 2 seconds.

WHEN a user loads a single post with its comment thread (up to 500 comments), THE system SHALL render the page within 2.5 seconds.

WHEN a user posts an image, THE system SHALL complete upload and thumbnail generation within 10 seconds.

WHEN a user submits a vote, THE system SHALL update the vote score and karma in real-time (∆ ≤ 100ms).

WHEN a user searches for a community by name, THE system SHALL return results in ≤ 500ms.

WHEN a user edits a post or comment, THE system SHALL persist the change in ≤ 300ms.

## Success Metrics

- 80% of registered users submit at least one post within 7 days
- 60% of users are subscribed to at least two communities
- 50% of posts receive at least one vote
- 70% of comments receive at least one vote
- Average comment thread depth ≥ 3 levels
- 90% of community moderator actions are approved/dismissed within 24 hours
- 95% of reported content is actioned within 48 hours
- Less than 0.5% of all posts are flagged as abusive or inappropriate

## Related Documents

- For detailed authentication flow, see [Authentication Flow](./03-authentication-flow.md)
- For user actor definitions and permissions, see [User Actors](./02-user-actors.md)
- For karma system logic, see [Karma System](./04-karma-system.md)
- For community structure and management, see [Communities](./05-communities.md)
- For post creation and types, see [Posts](./06-posts.md)
- For post voting mechanics, see [Post Voting](./07-post-voting.md)
- For feed organization and sorting, see [Post Feeds](./08-post-feeds.md)
- For comments hierarchy and editing, see [Comments](./09-comments.md)
- For comment voting and sorting, see [Comment Voting](./10-comment-voting.md)
- For moderation roles and actions, see [Moderation System](./11-moderation-system.md)