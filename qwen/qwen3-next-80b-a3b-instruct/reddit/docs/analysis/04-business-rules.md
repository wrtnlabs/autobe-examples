## Content Validation Rules

### Post Content Requirements

WHEN a user submits a post, THE system SHALL validate that at least one content field is provided: text, link, or image.

IF no content field is provided, THEN THE system SHALL reject the submission with error message: "You must include text, a link, or an image in your post."

WHERE a link is provided, THE system SHALL validate it is a syntactically valid URL (http(s):// + domain).

IF an invalid URL is submitted, THEN THE system SHALL reject the submission with error message: "The link you provided is not valid. Please enter a complete web address starting with http:// or https://."

WHEN an image is uploaded, THE system SHALL reject submissions containing files larger than 10 MB.

IF a file exceeds 10 MB, THEN THE system SHALL reject the upload with error message: "Image files must be under 10 MB. Please compress your image or choose a smaller file."

WHEN a text field exceeds 10,000 characters, THE system SHALL truncate the content to 10,000 characters and append "... [truncated]".

AND WHERE the text field contains more than 500 characters, THE system SHALL display a "Show more" toggle on the front end (display rules are frontend; backend must preserve full content).

### Comment Text Requirements

WHEN a user submits a comment, THE system SHALL require the text field to be non-empty.

IF comment text is empty or contains only whitespace, THEN THE system SHALL reject the submission with error message: "Comments cannot be blank. Please add some text before submitting."

THE system SHALL limit comment text to 2,000 characters.

IF a comment exceeds 2,000 characters, THEN THE system SHALL truncate to 2,000 characters and append "... [truncated]".

### Community Name Validation

WHEN a user creates a new community, THE system SHALL validate the community name against these rules:

- Must be at least 3 characters long
- Must contain only alphanumeric characters and underscores (_)
- Must start and end with an alphanumeric character
- Must not be identical to any existing community name (case-insensitive)

IF a community name violates any of these rules, THEN THE system SHALL reject creation with specific error:

"Community names must be 3-20 characters, contain only letters, numbers, and underscores, and cannot match existing names."

## Karma Calculation Algorithm

THE system SHALL calculate user karma as the sum of all upvotes minus all downvotes received on all their posts and comments.

WHEN a user receives an upvote on a post, THE system SHALL add 1 to their karma score.

WHEN a user receives a downvote on a post, THE system SHALL subtract 1 from their karma score.

WHEN a user receives an upvote on a comment, THE system SHALL add 1 to their karma score.

WHEN a user receives a downvote on a comment, THE system SHALL subtract 1 from their karma score.

WHILE a user’s karma score is displayed on their profile, THE system SHALL NOT display negative values as negative numbers.

IF a user’s karma score is negative, THEN THE system SHALL display it as "0".

WHERE a user has earned more than 10,000 karma, THE system SHALL display a badge next to their username indicating "Elite Member".

## Post Ranking Algorithms

### New Posts

WHEN posts are sorted by "New", THE system SHALL order them by creation timestamp (most recent first).

WHERE post timestamps are identical, THE system SHALL break ties by post ID (ascending).

### Hot Posts

WHEN posts are sorted by "Hot", THE system SHALL calculate a "hot score" using this formula:

hot_score = log10(max(|ups - downs|, 1)) + (ups - downs) / (hours_since_posted + 2)^1.8

WHERE ups = upvotes, downs = downvotes, and hours_since_posted = (current_time - post_creation_time) / 3600 seconds.

IF a post has received zero votes, THE system SHALL assign it a hot_score of 0.0.

WHEN calculating hours_since_posted, THE system SHALL use UTC time for all comparisons, with the server clock in Asia/Seoul timezone (UTC+9).

WHERE the hot score cannot be computed due to server time sync issues, THE system SHALL default to ordering by creation time (newest first).

### Top Posts

WHEN posts are sorted by "Top", THE system SHALL order posts by the absolute vote differential (ups - downs) in descending order.

IF two posts have identical vote differentials, THE system SHALL break ties by total votes (ups + downs) descending.

IF tie persists, THE system SHALL break ties by creation time (newest first).

### Controversial Posts

WHEN posts are sorted by "Controversial", THE system SHALL calculate a controversy score using this formula:

controversy_score = min(ups, downs) * 100 / (ups + downs + 1)

IF a post has been voted on by fewer than 5 total users, THE system SHALL exclude it from the controversial ranking.

WHEN a post has 0 total votes, THE system SHALL not appear in the controversial list.

WHERE controversy_score is equal across posts, THE system SHALL sort by total votes descending.

## Comment Depth Limitation

THE system SHALL limit comment nesting to a maximum depth of 5 levels.

WHEN a user attempts to reply to a comment at level 5, THE system SHALL prevent further reply creation and display message: "This comment thread has reached its maximum depth. You cannot reply further down this chain."

WHILE displaying a comment thread, THE system SHALL track depth based on ancestry — never by display order.

## Reporting and Moderation Workflow

WHEN a user reports content (post or comment), THE system SHALL store the report with:

- Reporter’s user ID (anonymous to moderators)
- Content ID (post or comment)
- Reporting timestamp
- Reported reason (user-provided: "Spam", "Harassment", "Inappropriate", "Other")
- Additional context (optional text field)

WHEN a report is submitted, THE system SHALL assign it a "Pending" status.

AND IF the reported content already has 3 or more active reports, THEN THE system SHALL immediately trigger a moderator alert and flag the content for review.

WHEN a moderator reviews a reported post or comment, THE system SHALL allow them to take one of three actions:

1. Hide the content — removes it from public view, retains it for compliance
2. Delete the content — permanently removes it and bans the author for 7 days
3. Dismiss the report — close the report without action

IF a moderator selects "Remove", THE system SHALL delete the content and notify the original poster anonymously: "Your content was removed for violating community guidelines."

WHILE the content is hidden or deleted, THE system SHALL NOT reveal the existence of the content to any guest or unprivileged member.

## Subscription Limits

WHEN a user subscribes to a community, THE system SHALL allow a maximum of 1,000 active subscriptions per user.

IF a user attempts to subscribe to the 1,001st community, THEN THE system SHALL reject the subscription request with message: "You have reached the maximum of 1,000 community subscriptions. Unsubscribe from one to add another."

WHERE a user unsubscribes from a community, THE system SHALL immediately reduce their subscription count by one.

## Self-Posting and Self-Voting Restrictions

THE system SHALL allow users to post content to any community they are a member of.

WHEN a user attempts to upvote their own post, THE system SHALL prevent the vote and display message: "You cannot upvote your own content."

WHEN a user attempts to downvote their own post, THE system SHALL prevent the vote and display message: "You cannot downvote your own content."

WHEN a user attempts to upvote their own comment, THE system SHALL prevent the vote and display message: "You cannot upvote your own comment."

WHEN a user attempts to downvote their own comment, THE system SHALL prevent the vote and display message: "You cannot downvote your own comment."

WHERE a user changes the text of a post they previously upvoted, THE system SHALL NOT retract the vote.

## Edit and Delete Time Constraints

WHEN a user edits a post, THE system SHALL allow editing only within 15 minutes after publication.

IF more than 15 minutes have passed, THEN THE system SHALL restrict post editing and display: "You can no longer edit this post. Please contact a moderator if corrections are needed."

WHERE a comment is edited, THE system SHALL allow editing only within 10 minutes after publishing.

IF more than 10 minutes have passed, THEN THE system SHALL restrict comment editing and display: "You can no longer edit this comment."

IF a user deletes a post or comment, THE system SHALL allow deletion at any time (no time constraint).

WHEN content is deleted, THE system SHALL replace it with a placeholder: "[Deleted by user]" (posts) or silence the comment in threaded views.

## Anonymous Voter Policy

WHEN a user upvotes or downvotes content, THE system SHALL NOT reveal their identity to the content author or any other user.

THE system SHALL retain anonymous vote records for audit purposes but SHALL NOT expose them through any API or frontend.

IF an admin generates an audit report, THE system SHALL show only aggregate vote counts and timestamps — never individual voter IDs in reports visible to users.

## Content Display Truncation Rules

WHEN a post’s text content exceeds 800 characters in a feed view, THE system SHALL truncate it to 800 characters and append "... [Read more]".

WHERE a comment’s text exceeds 200 characters, THE system SHALL truncate it to 200 characters and append "... [Read more]".

WHEN a user clicks "Read more" on a truncated post or comment, THE system SHALL load and display the full content.

IF a post or comment has exactly 800 or 200 characters, THE system SHALL NOT truncate it.

IF a post is entirely a link or image with no text, THE system SHALL NOT truncate — display the link or image in full.

THE system SHALL count characters based on UTF-8 string length, preserving Unicode and emoji values as single characters.