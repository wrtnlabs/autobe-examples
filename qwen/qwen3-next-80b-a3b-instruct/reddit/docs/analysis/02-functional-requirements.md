# Functional Requirements Document

## 1. User Authentication Flow

### Core Authentication Functions

THE system SHALL allow users to register with a unique email address and password.

THE system SHALL allow users to log in to their account using their registered email and password.

THE system SHALL maintain a secure session token for authenticated users using JWT.

THE system SHALL allow users to log out and terminate their session.

THE system SHALL send a verification email to a new user's email address upon registration.

THE system SHALL allow a user to request a password reset via email if they have forgotten their password.

THE system SHALL require users to verify their email address before they can create posts, comments, or vote.

THE system SHALL enforce password complexity: passwords must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one digit.

THE system SHALL lock an account temporarily after 5 consecutive failed login attempts for the same email address.

THE system SHALL allow users to change their password after successful authentication.

THE system SHALL prohibit users from reusing any of their last 3 passwords.

THE system SHALL expire user sessions after 30 days of inactivity.

THE system SHALL expire access tokens after 15 minutes.

THE system SHALL issue a refresh token valid for 7 days upon successful login.

THE system SHALL revoke all active tokens for a user when they change their password or initiate "Log out of all devices".

## 2. Community Creation and Management

WHEN a member submits a new community name, THE system SHALL validate that the name is unique and adheres to the following rules:

- Community names must be between 3 and 50 characters long.
- Community names may only contain alphanumeric characters and hyphens.
- Community names must not start or end with a hyphen.
- Community names must not be reserved keywords (e.g., "admin", "moderator", "post", "comment", "user").

WHEN a community name passes validation, THE system SHALL create the community and assign the creator as its primary moderator.

WHEN a community is created, THE system SHALL automatically create a default "Welcome" post in that community.

THE system SHALL allow member-authenticated users to view all public communities.

THE system SHALL allow a member to leave a community they have joined at any time.

THE system SHALL allow a moderator to remove another user from their community.

THE system SHALL allow an admin to suspend or delete any community.

THE system SHALL allow moderators to change a community's description, rules, and display name.

THE system SHALL allow admins to transfer moderator status to another member within the community.

WHILE a community has no active moderators, THE system SHALL notify an administrator for manual assignment.

## 3. Post Creation and Submission Requirements

WHEN a member submits a post, THE system SHALL require the following fields:

- Title (between 1 and 300 characters)
- Community (must be an existing, active community)
- Content type (text, link, or image)

WHEN content type is "text", THE system SHALL require the post body to be between 1 and 10,000 characters.

WHEN content type is "link", THE system SHALL validate the URL format and ensure it resolves to a valid domain.

WHEN content type is "image", THE system SHALL accept only JPEG, PNG, GIF, or WebP formats with a maximum file size of 10MB.

THE system SHALL require either a title or body content for a text post.

THE system SHALL require a URL for a link post.

THE system SHALL require an image file upload for an image post.

THE system SHALL assign a unique UUID to each post.

THE system SHALL set the post's timestamp to the exact moment of submission.

THE system SHALL assign the post's author based on the authenticated user’s ID.

THE system SHALL set the initial vote count for a new post to zero for upvotes and downvotes.

THE system SHALL set the initial comment count to zero.

THE system SHALL store the post in an "unreviewed" state if the community requires moderation.

THE system SHALL publish the post immediately if the community does not require moderation.

IF a user attempts to submit a post to a suspended community, THEN THE system SHALL deny submission and return error code "COMMUNITY_SUSPENDED".

IF a user attempts to submit a post while not verified, THEN THE system SHALL deny submission and return error code "EMAIL_NOT_VERIFIED".

IF a user attempts to submit a post with a title or body containing only whitespace or emojis without text, THEN THE system SHALL deny submission and return error code "INVALID_POST_CONTENT".

WHILE a user has an active post in "unreviewed" state, THE system SHALL prevent them from submitting another post in that community until approval or rejection.

## 4. Upvote/Downvote System Requirements

WHEN a member clicks the upvote button on a post or comment, THE system SHALL increase the vote count by one.

WHEN a member clicks the downvote button on a post or comment, THE system SHALL decrease the vote count by one.

WHEN a member who has already upvoted a post or comment clicks the downvote button, THE system SHALL flip the vote: subtract one from the current total.

WHEN a member who has already downvoted a post or comment clicks the upvote button, THE system SHALL flip the vote: add one to the current total.

WHEN a member clicks the same vote button twice consecutively, THE system SHALL cancel the vote and return the vote count to its original state.

THE system SHALL prevent non-members (guests) from voting.

THE system SHALL prevent users from voting on their own posts or comments.

THE system SHALL record the user ID, target post/comment ID, vote type (up/down), and timestamp for each vote.

THE system SHALL allow users to change their vote only once after initially voting.

WHEN a post or comment is deleted, THE system SHALL recursively remove all associated votes.

WHEN a user account is deleted, THE system SHALL anonymize all votes made by that user (transferring them to "[deleted]" user entity) without altering totals.

## 5. Nested Commenting Requirements

WHEN a member submits a comment on a post, THE system SHALL accept a text body between 1 and 2,000 characters.

WHEN a member replies to a comment, THE system SHALL accept a text body between 1 and 2,000 characters.

WHEN a user attempts to reply to a comment, THE system SHALL allow replies to any comment level.

THE system SHALL allow comment threads to reach a maximum depth of 8 levels.

THE system SHALL assign a unique UUID to each comment.

THE system SHALL associate each comment with its author (user ID), the target post, and its parent comment (if any).

THE system SHALL automatically set comment timestamps to the creation moment.

WHILE a comment has no replies, THE system SHALL display it with a "reply" button.

WHEN a comment has one or more replies, THE system SHALL display a "view replies" button showing the total count.

WHEN a user lacks permission to reply to a comment (e.g., the post or parent comment is removed or locked), THE system SHALL disable the reply button and display a message: "Replies disabled by moderator."

THE system SHALL allow moderators and admins to delete any comment.

THE system SHALL allow users to delete their own comments within 15 minutes of submission.

THE system SHALL allow users to edit their own comments within 15 minutes of submission, with a visible "[edited]" tag.

THE system SHALL prevent editing after 15 minutes.

THE system SHALL allow users to report a comment.

WHEN a comment is deleted, THE system SHALL recursively delete all replies to that comment.

WHEN a comment is locked, THE system SHALL prevent new replies to that comment.

THE system SHALL display comment depth as indentation levels up to 7 (8th level and beyond are displayed as flat).

## 6. Karma Calculation Rules

WHILE a member has submissions or interactions, THE system SHALL calculate their karma score using the following formula:

> Total Karma = (Number of upvotes on all posts) + (Number of upvotes on all comments) - (Number of downvotes on all posts) - (Number of downvotes on all comments)

THE system SHALL not include downvotes received on their posts or comments as negative karma.

THE system SHALL not count votes on their own content.

THE system SHALL display karma as a single integer value with no decimal or fraction.

THE system SHALL cap karma at 1,000,000 to prevent system bloat.

THE system SHALL not reduce karma below zero.

WHEN a user deletes a post or comment, THE system SHALL recalculate their karma by removing all votes associated with that content.

WHEN an admin or moderator deletes a user's post or comment, THE system SHALL recalculate their karma by removing all votes associated with the deleted content.

WHEN a user account is banned, THE system SHALL preserve their karma history but hide it from public view.

## 7. Subscription Mechanism

WHEN a member clicks the "Subscribe" button on a community, THE system SHALL add that community to their subscription list.

WHEN a member clicks the "Unsubscribe" button on a community, THE system SHALL remove that community from their subscription list.

THE system SHALL limit members to a maximum of 1,000 subscribed communities.

THE system SHALL provide a "My Subscribed Communities" section in the user profile.

WHEN a community is suspended or deleted, THE system SHALL automatically unsubscribe all members.

WHEN a member subscribes to a community, THE system SHALL immediately show that community’s new posts in their home feed if they are active.

WHEN a user unsubscribes from a community, THE system SHALL stop showing the community’s posts in their home feed.

THE system SHALL allow users to filter their home feed to show only subscribed communities.

## 8. User Profile Requirements

THE system SHALL display a user profile page containing the following:

- Display name (user-selected)
- Primary username
- User karma score
- Join date
- Total posts count
- Total comments count
- Number of subscribed communities
- Status (active, suspended, banned)

WHEN a user has been suspended or banned, THE system SHALL show a warning banner: "This account has been suspended by an administrator."

WHEN a user has been banned, THE system SHALL show a bow: "This account has been permanently banned."

THE system SHALL display a list of all the user’s approved posts.

THE system SHALL display a list of all the user’s approved comments.

THE system SHALL allow users to delete their own profile, with a 7-day grace period before permanent deletion.

WHEN a user is deleted, THE system SHALL anonymize all their previous posts and comments as "[deleted]" and preserve associated karma statistics.

THE system SHALL allow users to change their display name at any time.

THE system SHALL prevent display names from duplicating existing usernames.

THE system SHALL prevent display names from containing profanity, impersonation characters, or reserved terms.

## 9. Content Reporting Workflow

WHEN a member reports content (post or comment), THE system SHALL require a selected reason from predefined categories:

- Spam
- Harassment
- Personal information
- Hateful content
- Violence or graphic imagery
- Impersonation
- Other

WHEN a report is submitted, THE system SHALL assign a unique report ID and timestamp.

THE system SHALL notify the content’s assigned moderator (if community has one) and administrators.

THE system SHALL anonymize the reporter’s identity to the content author.

THE system SHALL allow moderators to dismiss a report with a reason.

THE system SHALL allow moderators to remove content with a public note.

THE system SHALL allow moderators to warn or temporarily suspend the reporting user with a reason.

THE system SHALL allow admins to review all reported content regardless of community.

THE system SHALL log the report status (pending, dismissed, removed, escalated) and all actions taken.

THE system SHALL allow users to cancel their own report within 2 minutes of submission.

WHEN content is removed, THE system SHALL show a placeholder message: "Content removed by moderator. Reason: [reason]."

WHEN a user receives 3 verified reports across different content items within 30 days, THE system SHALL trigger an automatic review by an admin.

WHEN a user is banned, THE system SHALL show "[banned]" instead of their username on all associated content.

## 10. Post Sorting and Ranking Algorithms

THE system SHALL provide four sorting modes for community feeds and search results:

### New
- Posts are ordered by creation timestamp, newest first.
- No algorithmic adjustments.

### Top
- Posts are sorted by total vote tally (upvotes minus downvotes).
- Higher total votes rank higher.
- Posts with identical vote counts are ordered by creation timestamp (newest first).

### Hot
- Posts are ranked by an algorithm defined as:

> Hot Score = log₁₀(max(|score|,1)) × sign(score) + (created_at - epoch_time_in_seconds) / 45000

- Age penalty: The age of the post (since creation) is divided by 45,000 seconds (12.5 hours) to normalize time decay.
- Score multiplier: Only posts with at least one vote are considered.
- The "sign" function preserves upvoted (positive) vs. downvoted (negative) posture.
- This ensures new posts with rapid upvotes rise quickly.
- After 12.5 hours, posts receive diminishing returns.

### Controversial
- Posts are ranked by a ratio of upvotes to downvotes.
- Controversy Score = (max(upvotes, downvotes) / (min(upvotes, downvotes) + 1))
- Only posts with at least 5 total votes are included.
- Post with higher controversy score appears higher.
- For equal controversy scores, sort by total vote count.

WHERE a user selects "Hot" or "Controversial", THE system SHALL cache computed scores for each post once per minute.

WHERE no posts exist for a community, THE system SHALL display: "No posts yet. Be the first to share!"

THE system SHALL limit result sets to 50 posts per page.

THE system SHALL preload the next page when the user scrolls to within 300px of the bottom of the feed.

THE system SHALL ensure page load time is under 2 seconds for the first 50 posts.

THE system SHALL ensure sorting switches complete within 0.5 seconds after user selection.

THE system SHALL ensure post load latency is under 100ms per post.

WHERE a post has been removed, THE system SHALL exclude it entirely from all sort views.

WHERE an admin impounds a post, THE system SHALL exclude it from all public feeds, including "New" and "Top".

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*