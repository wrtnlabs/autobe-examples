# Reddit-like Community Platform Requirements Specification

## 1. User Account Management

WHEN a new user joins the platform, THE system SHALL require them to provide a valid email address, a password (minimum 8 characters), and a unique username.

WHEN a user submits account registration, THE system SHALL validate that the email is not already registered and that the username is unique across the platform.

WHEN a user attempts to register with a duplicate email or username, THE system SHALL return a specific error message indicating which field conflicted.

WHEN a user logs in, THE system SHALL authenticate them using their email address and password.

WHEN a user provides incorrect credentials, THE system SHALL reject the login attempt and SHALL NOT disclose whether the email or password was incorrect.

WHEN a user changes their password, THE system SHALL require them to enter their current password and confirm the new password twice.

WHEN a user changes their password, THE system SHALL invalidate all active sessions across all devices.

WHEN a user deletes their account, THE system SHALL permanently remove their account record and immediately begin deletion of all associated content: posts, comments, votes, and profile data.

WHEN an account deletion is initiated, THE system SHALL send a confirmation email and require a second action to complete deletion.

WHEN account deletion is completed, THE system SHALL ensure all data is irreversibly purged from all storage systems within 72 hours.

## 2. User Profile System

WHEN a user views any profile, THE system SHALL display the following information:
- Display name (editable by user)
- Bio text (editable by user)
- Avatar image (uploaded and changeable by user)
- Total karma score (calculated platform-wide)
- List of all posts created by the user
- List of all comments written by the user

WHEN a user edits their own profile, THE system SHALL allow them to update their display name (up to 50 characters), bio (up to 500 characters), and avatar image (JPG or PNG, maximum 5MB).

WHEN a user changes their avatar, THE system SHALL generate and store three versions: thumbnail (128x128), medium (256x256), and full-size (1024x1024).

WHEN a user edits their display name, THE system SHALL disallow profanity and ensure the new name meets uniqueness constraints.

WHEN a user views another user's profile, THE system SHALL not display any private information such as email address, registration date, or IP logs.

WHEN a user deletes their account, THE system SHALL replace their display name with "[Deleted User]" and blank out all profile fields.

## 3. Karma System

WHEN a user receives an upvote on a post or comment, THE system SHALL increase their karma score by 1.

WHEN a user receives a downvote on a post or comment, THE system SHALL decrease their karma score by 1.

WHEN a user removes their own upvote from a post or comment, THE system SHALL decrease the author's karma score by 1.

WHEN a user changes their vote from upvote to downvote on a post or comment, THE system SHALL first decrease the author's karma by 1 (removing the upvote) then decrease it again by 1 (applying the downvote) for a total change of -2.

WHEN a user changes their vote from downvote to upvote on a post or comment, THE system SHALL first increase the author's karma by 1 (removing the downvote) then increase it again by 1 (applying the upvote) for a total change of +2.

WHEN a user submits a report that is approved, THE system SHALL reduce the content author's karma score by 1.

THE karma score for each user SHALL be a single numeric value stored at the user level.

THE karma score SHALL be allowed to be negative.

THE karma score SHALL be displayed as a single integer with no formatting or currency symbols.

WHEN a user views any profile, THE system SHALL display the total karma score, not a score per community.

WHEN a user's karma score changes, THE system SHALL update the displayed value across all community feeds and profile pages within 1 second.

## 4. Community Management

WHEN a user creates a community, THE system SHALL require a unique name (alphanumeric and hyphens only, 3-25 characters), a description (up to 500 characters), and an optional icon image.

WHEN a community name is submitted, THE system SHALL validate that it is not already in use.

WHEN a community is created, THE creating user SHALL automatically become the owner.

WHEN a community owner is deleted or banned from the platform, THE system SHALL identify the next highest-ranking moderator as the new owner. If no moderators exist, THE system SHALL mark the community as "orphaned" and disable new content creation until an admin intervenes.

WHEN a user browses all communities, THE system SHALL display each community's name, description, icon, and subscriber count.

WHEN a user searches for communities by name, THE system SHALL return results matching the query term using case-insensitive substring matching.

WHEN a user views a community's front page, THE system SHALL display the community's name, description, icon, number of subscribers, and current moderator list.

## 5. Subscription Rules

WHEN a user subscribes to a community, THE system SHALL add their user ID to the community's subscriber list.

WHEN a user unsubscribes from a community, THE system SHALL remove their user ID from the community's subscriber list.

WHEN a user attempts to create a post in a community, THE system SHALL verify that they are a subscriber to that community.

WHEN a user attempts to subscribe to a community they already follow, THE system SHALL silently ignore the request.

WHEN a user attempts to unsubscribe from a community they are not subscribed to, THE system SHALL silently ignore the request.

WHEN a user visits a community page, THE system SHALL display a "Subscribe" button if they are not subscribed and an "Unsubscribe" button if they are subscribed.

WHEN a community's subscriber count is displayed, THE system SHALL show the total number of users in the subscriber list at that moment.

## 6. Post Management

WHEN a user creates a post, THE system SHALL require the post to have a title (1-300 characters).

WHEN a user creates a post, THE system SHALL require them to select one of three types: text, link, or image.

WHEN a user creates a text post, THE system SHALL require text content (1-10,000 characters).

WHEN a user creates a link post, THE system SHALL require a valid URL (http:// or https://, maximum 500 characters).

WHEN a user creates an image post, THE system SHALL require the upload of an image file (JPG, PNG, or WebP, maximum 10MB).

WHEN a user edits their own post, THE system SHALL allow modification of title, content, URL, or image — but only until 1 hour after creation.

WHEN a user edits their own post, THE system SHALL record the edit history (version number and timestamp) and display "[edited]" tag after the post.

WHEN a user deletes their own post, THE system SHALL mark it as deleted and immediately remove it from all feeds, while preserving the record for moderation purposes.

WHEN a post is deleted, THE system SHALL notify the user that their content was removed.

WHEN a user views a single post, THE system SHALL display:
- Title
- Full content (text, URL, or image)
- Author's username
- Community name
- Vote score (upvotes minus downvotes)
- Number of comments
- Timestamp of creation (e.g., "3 hours ago")

## 7. Post Voting

WHEN a user upvotes a post, THE system SHALL add +1 to the post's score and increment the user's karma by 1 if they are the author.

WHEN a user downvotes a post, THE system SHALL subtract -1 from the post's score and decrement the user's karma by 1 if they are the author.

WHEN a user attempts to vote on a post they already voted on, THE system SHALL allow them to change or remove their vote.

WHEN a user changes their vote from upvote to downvote, THE system SHALL adjust the post's score by -2 (remove +1, add -1).

WHEN a user changes their vote from downvote to upvote, THE system SHALL adjust the post's score by +2 (remove -1, add +1).

WHEN a user removes their vote entirely, THE system SHALL revert the post's score by the amount of their original vote (+1 or -1).

WHEN a user votes on a post, THE system SHALL ensure they cannot vote again until they change or remove their vote.

WHEN a post's score is updated, THE system SHALL propagate the new score across all feeds where the post appears within 1 second.

## 8. Post Feeds and Sorting

### Feed Types

WHEN a logged-in user accesses their home feed, THE system SHALL display only posts from communities they are subscribed to.

WHEN a logged-out user accesses the popular feed, THE system SHALL display posts from all communities.

WHEN any user accesses a community feed for a specific community, THE system SHALL display only posts from that community.

All three feed types SHALL support the same five sorting methods.

### Sorting Algorithms

#### Hot

WHEN posts are sorted by "Hot", THE system SHALL calculate a ranking score based on:
- Number of upvotes in the last 24 hours
- Time since post was created (newer posts are weighted higher)
- Total number of comments received

THE system SHALL rank by an algorithm: (upvotes * 10) / ((hours since posted + 2) ^ 1.2)

#### New

WHEN posts are sorted by "New", THE system SHALL order posts by creation timestamp, descending (most recent first).

#### Top

WHEN posts are sorted by "Top", THE system SHALL order posts by total score (upvotes minus downvotes).

WHEN "Top" is selected, THE system SHALL present time filters: Today, This Week, This Month, This Year, All Time.

WHEN a time filter is selected, THE system SHALL only include posts created within that time range.

#### Controversial

WHEN posts are sorted by "Controversial", THE system SHALL rank posts by:
- High total number of votes (upvotes + downvotes > 10)
- Low absolute score (|upvotes - downvotes| < 5)

THE system SHALL compute controversy score as: total_votes / (1 + |score|)

### Pagination & Display

WHEN a feed is loaded, THE system SHALL return exactly 20 posts per page.

WHEN a user scrolls to the bottom of a feed, THE system SHALL load the next page upon scroll detection.

WHEN a post is displayed in a feed list, THE system SHALL show:
- Title (truncated to 100 characters if necessary)
- Author username
- Community name
- Vote score
- Comment count
- Time since posted (e.g., "3 hours ago")
- For text posts: first 200 characters of content (truncated with ellipsis)
- For image posts: thumbnail image (128x128)
- For link posts: domain name of the URL (e.g., "youtube.com")

## 9. Comment System

WHEN a user writes a comment on a post, THE system SHALL require the comment to contain text (1-2,000 characters).

WHEN a user replies to a comment, THE system SHALL allow replies to any comment, regardless of nesting depth.

WHEN a comment is edited, THE system SHALL allow edits for up to 30 minutes after creation.

WHEN a comment is edited, THE system SHALL display an "[edited]" tag and preserve the edit history.

WHEN a user deletes their own comment, THE system SHALL mark it as deleted and remove it from display, but retain the record for moderation.

WHEN a comment is deleted, THE system SHALL notify the user that their comment was removed.

WHEN a user views a post and all its comments, THE system SHALL display:
- Author username
- Comment text
- Vote score
- Time since posted
- List of replies

WHEN a comment has replies, THE system SHALL indent replies at each level by 24px.

## 10. Comment Voting

WHEN a user upvotes a comment, THE system SHALL add +1 to the comment's score and increment the author's karma by 1.

WHEN a user downvotes a comment, THE system SHALL subtract -1 from the comment's score and decrement the author's karma by 1.

WHEN a user removes their upvote from a comment, THE system SHALL decrease the comment's score by 1 and decrease the author's karma by 1.

WHEN a user changes their vote from upvote to downvote, THE system SHALL decrease the comment's score by 2 and decrease the author's karma by 2.

WHEN a user changes their vote from downvote to upvote, THE system SHALL increase the comment's score by 2 and increase the author's karma by 2.

WHEN a user removes their vote entirely, THE system SHALL revert the comment's score and author karma by the amount of the removed vote.

## 11. Comment Sorting

### Best

WHEN comments are sorted by "Best", THE system SHALL order them by vote score descending.

### New

WHEN comments are sorted by "New", THE system SHALL order them by creation timestamp descending.

### Controversial

WHEN comments are sorted by "Controversial", THE system SHALL rank comments by:
- Total number of votes > 5
- Absolute score < 3

THE controversy score for a comment is: total_votes / (1 + |score|)

## 12. Community Moderation

### Moderator Roles

WHEN a community owner invites a moderator, THE system SHALL add them to the community's moderator list.

WHEN a moderator is added, THE system SHALL grant them moderator permissions immediately.

WHEN a community owner removes a moderator, THE system SHALL remove them from the moderator list immediately.

WHEN a moderator attempts to remove another moderator, THE system SHALL block the request and log the attempt.

WHEN a moderator attempts to remove the community owner, THE system SHALL block the request and log the attempt.

WHEN a community owner is removed from the platform, THE system SHALL designate the first registered moderator as the new owner.

### Moderator Actions

WHEN a moderator deletes a post, THE system SHALL remove the post from all feeds and notify the author.

WHEN a moderator deletes a comment, THE system SHALL remove the comment from its thread and notify the author.

WHEN a moderator bans a user from a community, THE system SHALL add the user to the community's ban list.

WHEN a user is banned from a community, THE system SHALL prevent them from:
- Creating new posts in the community
- Creating new comments in the community
- Voting on existing content in the community

WHEN a user is banned from a community, THE system SHALL still allow them to: view content, view the community feed, and report content.

WHEN a moderator unbans a user, THE system SHALL remove them from the ban list and restore their access.

WHEN a moderator views the banned users list, THE system SHALL display:
- Username of banned user
- Date and time of ban
- Who issued the ban
- Reason for ban (if provided)

## 13. Reporting System

WHEN a user reports a post or comment, THE system SHALL require them to provide a reason text (10-500 characters).

WHEN a report is submitted, THE system SHALL create a report record with:
- Unique ID
- Type: "post" or "comment"
- ID of the reported content
- ID of the reporting user
- Reason text
- Timestamp of submission
- Status: "pending" by default

WHEN a report is submitted, THE system SHALL notify moderators of the community where the reported content resides.

WHEN a report is approved by a moderator, THE system SHALL:
- Immediately delete the reported post or comment
- Subtract 1 karma from the content author
- Send notification to the author explaining removal and reason
- Archive the report for audit

WHEN a report is dismissed by a moderator, THE system SHALL:
- Remove the report from the active moderation list
- Archive the report
- Not notify the author

WHEN a report is approved or dismissed, THE system SHALL update the report status and timestamp.

WHEN a moderator views reports, THE system SHALL display:
- Reported content (preview)
- Reporting user's username
- Reason text
- Timestamp
- Status
- Action buttons: "Approve", "Dismiss"

WHEN a user views any feed, THE system SHALL NOT display:
- Who reported content
- Whether their content was reported
- The reason for any report

WHEN a report is approved and content is deleted, THE system SHALL generate an audit log entry with:
- Report ID
- Moderator who approved
- Timestamp of approval
- Content type and ID deleted
- Author of content
- Report reason

WHEN a user reports content they authored, THE system SHALL still process the report normally.

WHEN the same user reports multiple pieces of content within 5 minutes, THE system SHALL flag their account for potential abuse.

WHEN a report is dismissed, THE system SHALL remove it from the moderator's report queue.

WHEN a report is marked as pending, THE system SHALL make it visible only to qualified moderators.

WHEN a moderator views a report in queue, THE system SHALL allow filtering by status, content type, reporting user, or reported user.

WHEN a platform admin reviews reports, THE system SHALL allow them to view all reports across all communities with full details.

