## Business Rules for CommunityPlatform

This document defines all business rules and validation constraints governing content management, user interactions, and system behavior for the CommunityPlatform. These rules are expressed in natural language using EARS syntax and are intended for backend developers implementing the core logic of the platform. All rules are context-independent and must be evaluated regardless of user interface or frontend state.

### Content Creation Rules

- WHEN a member attempts to create a community, THE system SHALL validate that the community name contains only alphanumeric characters, hyphens, and underscores, and is between 3 and 50 characters long.
- WHEN a member attempts to create a community, THE system SHALL ensure the community name is not identical to any existing community name, regardless of case.
- WHEN a member attempts to create a post, THE system SHALL validate that the post title is not empty if the post type is "text" or "link".
- WHEN a member attempts to create a post with type "text", THE system SHALL enforce a minimum length of 1 character and a maximum length of 10,000 characters for the content.
- WHEN a member attempts to create a post with type "link", THE system SHALL validate that the URL is a well-formed HTTP or HTTPS URL and differs from any URL posted by the same user in the last 5 minutes.
- WHEN a member attempts to create a post with type "image", THE system SHALL validate that the file is an image in JPEG, PNG, or WebP format with a maximum size of 10MB.
- WHEN a member attempts to create a post in a community that has content moderation enabled, THE system SHALL hold the post in "pending" status until approved by a moderator.
- WHILE a community is locked by an admin, THE system SHALL prohibit any new posts from being created in that community regardless of user role.
- IF a user has been banned from a community, THEN THE system SHALL prevent them from creating any new posts or comments in that community.
- IF a user has been suspended system-wide by an admin, THEN THE system SHALL prevent them from creating any new content on the platform.

### Voting Rules

- WHEN a member attempts to upvote or downvote a post, THE system SHALL allow only one vote per user per post, and any previous vote by the same user on that post shall be overwritten.
- WHEN a member attempts to upvote or downvote a comment, THE system SHALL allow only one vote per user per comment, and any previous vote by the same user on that comment shall be overwritten.
- WHILE a post or comment is locked by a moderator, THE system SHALL prevent any voting on that item.
- IF a user attempts to vote on content they created, THEN THE system SHALL disallow the vote and return an error.
- IF a user attempts to vote with an invalid vote direction (e.g., "up" or "down" not provided), THEN THE system SHALL return HTTP 400 with error code "VOTE_INVALID_DIRECTION".
- THE system SHALL calculate the net score of a post or comment as the total number of upvotes minus the total number of downvotes.
- WHERE a post or comment has received 25 or more votes, THE system SHALL begin applying a precision algorithm to prevent vote manipulation through sybil attacks (interest voting).

### Comment Rules

- WHEN a member attempts to create a comment on a post, THE system SHALL validate that the comment content is not empty and has a maximum length of 500 characters.
- WHEN a member attempts to create a reply to a comment, THE system SHALL validate that the parent comment exists and is not deleted.
- WHEN a member attempts to create a nested comment reply, THE system SHALL allow up to 5 levels of nesting (root comment → reply → reply of reply → reply of reply of reply → reply of reply of reply of reply).
- IF a comment is marked as deleted by a moderator, THEN THE system SHALL hide the comment text from all users except the comment author and admins, replacing it with "[Removed by moderator]".
- IF a comment contains more than 3 URLs as detected by pattern matching, THEN THE system SHALL flag it for moderator review.
- WHILE a post is locked, THE system SHALL prevent any new comments from being added to that post.
- IF a user has been banned from a community, THEN THE system SHALL prevent them from commenting on any posts within that community.

### Karma Rules

- WHEN a member receives an upvote on a post, THE system SHALL grant them +1 karma point.
- WHEN a member receives a downvote on a post, THE system SHALL deduct -1 karma point.
- WHEN a member receives an upvote on a comment, THE system SHALL grant them +1 karma point.
- WHEN a member receives a downvote on a comment, THE system SHALL deduct -1 karma point.
- THE system SHALL allow karma scores to go negative.
- IF a user's total karma score is below -100, THEN THE system SHALL automatically restrict them from creating new posts but still permit commenting and voting.
- IF a user's total karma score is below -500, THEN THE system SHALL automatically suspend the user's account for 30 days.
- WHERE a user has been suspended, THE system SHALL stop accruing karma changes until their account is reactivated.
- THE system SHALL NOT award any karma if an upvote or downvote is removed by the voter.

### Sorting Algorithm Logic

- WHEN sorting posts by "new", THE system SHALL order them by creation timestamp in descending order (most recent first).
- WHEN sorting posts by "hot", THE system SHALL apply a decay algorithm based on the formula: score = (upvotes - downvotes) / ((hours_since_created + 2) ^ 1.5), then sort in descending order.
- WHEN sorting posts by "top", THE system SHALL order them by net vote score (upvotes - downvotes) in descending order.
- WHEN sorting posts by "controversial", THE system SHALL compute a controversy ratio: total_votes / ABS(net_score) where net_score ≠ 0, and sort by this ratio in descending order. If net_score = 0, the controversy ratio is defined as infinite.
- WHILE a post is flaired as "-NSFW-", THE system SHALL exclude it from "hot" and "top" sort results in the default view, but it shall remain visible in "new" and "controversial".

### Subscription Rules

- WHEN a member attempts to subscribe to a community, THE system SHALL ensure the user is not already subscribed to that community.
- WHEN a member attempts to subscribe to a community, THE system SHALL increment the community’s subscriber count by 1.
- WHEN a member attempts to unsubscribe from a community, THE system SHALL decrement the community’s subscriber count by 1.
- IF a user attempts to subscribe to a community they have been banned from, THEN THE system SHALL prevent the subscription and return an error.
- IF a community is marked as "private" by an admin, THEN THE system SHALL require moderator approval for any subscription requests.
- WHERE a user has subscribed to a community, THE system SHALL include posts from that community in their personalized feed.

### Reporting Rules

- WHEN a member reports a post or comment, THE system SHALL record the following immutable data: reporter user ID, reported content ID, report timestamp, and reason selected (e.g., "spam", "inappropriate", "harassment").
- WHEN a post or comment receives 3 or more unique reports from different members within 24 hours, THE system SHALL automatically flag it for moderator review and hide it from non-admin views.
- WHEN a moderator reviews a reported item, THE system SHALL allow them to take exactly one of the following actions: approve, remove, or ignore.
- IF a reported item is removed by a moderator, THEN THE system SHALL notify the original author with a reason code.
- IF an item receives 5 or more reports from different users and is not removed within 48 hours, THEN THE system SHALL escalate the item to an admin for action.
- IF a user has submitted 5 or more false reports (items later approved) in the last 30 days, THEN THE system SHALL suspend their reporting privileges for 7 days.

### Content Visibility Rules

- WHEN a post or comment is deleted by its creator within 24 hours of creation, THE system SHALL permanently remove all associated data (votes, comments) and replace the post with "[deleted]".
- WHEN a post or comment is deleted after 24 hours by its creator, THE system SHALL preserve the post content as "[deleted]" but retain all votes and comments.
- WHEN a moderator deletes a post or comment, THE system SHALL preserve all metadata (user ID, timestamps, vote counts) for audit purposes but hide the content from all users except admins.
- WHEN a post or comment is flagged by the system for moderation, THE system SHALL hide it from all non-admin and non-moderator views.
- IF a community is marked as "private", THEN THE system SHALL only allow subscribers and moderators to view its content.

### Rate Limiting Rules

- WHILE a user is unauthenticated, THE system SHALL limit them to 5 requests per minute for community listing and post browsing.
- WHILE a user is authenticated as a member, THE system SHALL limit them to 20 requests per minute for reading operations and 1 new post or comment every 2 minutes.
- WHEN a member attempts to post more frequently than every 2 minutes, THEN THE system SHALL block the request and return HTTP 429 with error code "RATE_LIMIT_EXCEEDED" and a retry-after header of 120 seconds.
- WHEN a member reports content more than 5 times in 1 hour, THEN THE system SHALL temporarily block their reporting capability for 1 hour.
- IF a system detects a pattern of automated behavior consistent with bots from an IP address, THEN THE system SHALL temporarily ban that IP address for 24 hours.

### Time-Based Rules

- IF a user has not logged in for 365 days, THEN THE system SHALL archive their account and mark it as inactive.
- IF a community has not received any posts or comments in 180 days, THEN THE system SHALL archive the community and lock it from new activity.
- WHERE a user registers and does not verify their email within 12 hours, THEN THE system SHALL delete their unverified account and associated temporary data.
- WHERE a post has not received any votes in 14 days, THE system SHALL apply a soft decay to its visibility in "hot" and "top" feeds.
- WHERE a comment has received no replies within 7 days, THE system SHALL timestamp it as "dormant" and reduce its priority in threaded discussions.
- WHEN a member requests password reset, THE system SHALL keep the reset token valid for exactly 30 minutes and then invalidate it.
- WHEN a moderator issues a temporary ban to a user, THE system SHALL enforce the ban for a maximum of 14 days unless extended by another moderator.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*