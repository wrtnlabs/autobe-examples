# Core Functional Requirements

## Community Creation and Management

WHEN a member attempts to create a new community, THE system SHALL require the member to provide a unique name (between 3 and 21 characters, alphanumeric with underscores only) and a display name (up to 50 characters).

WHEN a community is created, THE system SHALL automatically assign the creator as the initial moderator and grant them full moderation privileges for that community.

WHEN the community name already exists, THE system SHALL reject the request and display an error message: "This community name is already taken. Please choose another."

THE system SHALL allow moderators to edit community display names, descriptions, and visibility settings (public or private).

WHEN a community is set to private, THE system SHALL restrict participation to members who have been approved by a moderator or are already subscribed.

WHEN a moderator attempts to delete a community, THE system SHALL require explicit confirmation and display a warning: "Deleting this community will permanently remove all posts, comments, and subscribers. This action cannot be undone."

THE system SHALL allow any admin to delete any community regardless of moderator status.

WHEN a community is deleted, THE system SHALL archive all content from that community and make it inaccessible to all users.

WHEN a community reaches 10,000 subscribers, THE system SHALL automatically notify the moderator and offer additional analytics tools and moderation resources.

THE system SHALL prevent users from creating more than 5 communities within a 24-hour period.

## Post Creation and Types

WHEN a member attempts to create a post, THE system SHALL provide three type options: text, link, or image.

WHEN a text post is created, THE system SHALL require a title (maximum 300 characters) and allow optional body content (maximum 10,000 characters).

WHEN a link post is created, THE system SHALL require a title (maximum 300 characters) and a valid URL (must be fully qualified with protocol).

WHEN an image post is created, THE system SHALL require a title (maximum 300 characters) and allow upload of one image file with maximum size of 20MB.

WHEN a post is created, THE system SHALL automatically assign it to the selected community and timestamp the creation with UTC-based ISO 8601 format.

WHEN a post is created, THE system SHALL assign a unique post ID in UUID version 4 format.

THE system SHALL allow members to edit their own posts within 5 minutes of creation.

WHEN a post is edited, THE system SHALL append an "Edited" timestamp and indicator at the bottom of the post.

WHEN a post is edited after 5 minutes, THE system SHALL prevent edits and display: "You can no longer edit this post. Contact a moderator if you need to make changes."

WHEN a user attempts to create a post in a private community they are not subscribed to, THE system SHALL deny access and display: "You must be subscribed to this community to post."

THE system SHALL limit each user to 10 posts per hour across all communities.

## Upvote/Downvote System

WHEN a member upvotes a post, THE system SHALL increment the post's upvote count by one and decrement the downvote count if previously downvoted.

WHEN a member downvotes a post, THE system SHALL increment the post's downvote count by one and decrement the upvote count if previously upvoted.

WHEN a member attempts to upvote a post they have already upvoted, THE system SHALL remove their upvote and decrement the upvote count by one.

WHEN a member attempts to downvote a post they have already downvoted, THE system SHALL remove their downvote and decrement the downvote count by one.

WHEN a member upvotes a comment, THE system SHALL increment the comment's upvote count by one and decrement the downvote count if previously downvoted.

WHEN a member downvotes a comment, THE system SHALL increment the comment's downvote count by one and decrement the upvote count if previously upvoted.

WHEN a member attempts to upvote a comment they have already upvoted, THE system SHALL remove their upvote and decrement the upvote count by one.

WHEN a member attempts to downvote a comment they have already downvoted, THE system SHALL remove their downvote and decrement the downvote count by one.

THE system SHALL prevent guests from upvoting or downvoting. Attempting to do so shall result in: "You must be logged in to vote."

WHEN a post has zero votes, THE system SHALL display "0 votes" as the score.

## Commenting and Nested Replies

WHEN a member comments on a post, THE system SHALL create a top-level comment with a unique comment ID and timestamp.

WHEN a member replies to a comment, THE system SHALL create a nested reply that is visually indented beneath the parent comment.

THE system SHALL allow up to 5 levels of nested replies.

WHEN a user attempts to reply beyond level 5, THE system SHALL prevent the reply and display: "Maximum reply depth reached."

THE system SHALL allow members to edit their own comments within 15 minutes of creation.

WHEN a comment is edited, THE system SHALL append an "Edited" timestamp and indicator at the bottom of the comment.

WHEN a comment is edited after 15 minutes, THE system SHALL prevent edits and display: "You can no longer edit this comment. Contact a moderator if you need to make changes."

THE system SHALL display the total number of replies to each comment.

THE system SHALL limit each user to 20 comments per hour across all posts.

## Karma System

WHEN a member upvotes a post, THE system SHALL increase the member's karma by 1 point.

WHEN a member downvotes a post, THE system SHALL decrease the member's karma by 0.5 points.

WHEN a member's post receives an upvote, THE system SHALL increase the member's karma by 5 points.

WHEN a member's post receives a downvote, THE system SHALL decrease the member's karma by 1 point.

WHEN a member's comment receives an upvote, THE system SHALL increase the member's karma by 2 points.

WHEN a member's comment receives a downvote, THE system SHALL decrease the member's karma by 1 point.

WHEN a member's account is created, THE system SHALL set their karma to 0.

THE system SHALL display the karma score next to each member's username in all community views.

WHEN a member is banned from the platform, THE system SHALL preserve their karma score but display it as "Account suspended".

WHEN a member deletes their account, THE system SHALL remove their karma score entirely and anonymize their content.

## Post Sorting

THE system SHALL provide four post sorting methods: hot, new, top, and controversial.

WHEN sorting by "hot", THE system SHALL calculate a score based on: (upvotes - downvotes) × 10^(log10(max(1, votes)) / 4500) / (time since creation in hours + 2)

WHEN sorting by "new", THE system SHALL display posts in reverse chronological order by creation timestamp.

WHEN sorting by "top", THE system SHALL display posts sorted by total vote count (upvotes + downvotes) in descending order.

WHEN sorting by "controversial", THE system SHALL calculate a score based on: min(upvotes, downvotes) × 100 / (upvotes + downvotes + 1) and sort by this score in descending order.

WHEN a post has 0 votes, ALL sorting algorithms SHALL treat it with minimum priority.

THE system SHALL apply default sorting based on community preference if defined, otherwise "hot" as default.

WHEN a user changes the sort preference, THE system SHALL persist their choice in their user preferences.

## Subscription System

WHEN a member subscribes to a community, THE system SHALL add the community to their "Subscribed Communities" list.

WHEN a member subscribes to a community, THE system SHALL display their subscription status as "Subscribed" on the community page.

WHEN a member unsubscribes from a community, THE system SHALL remove it from their "Subscribed Communities" list and change status to "Not subscribed".

THE system SHALL prevent members from subscribing to private communities unless they are invited or already subscribed.

WHEN a member joins their first community, THE system SHALL display a welcome notification: "Welcome to your first community! You'll now see posts from this community in your feed."

THE system SHALL allow members to create custom lists of subscribed communities for easy access.

WHEN a member views the home feed, THE system SHALL prioritize posts from subscribed communities unless the member explicitly selects "All communities".

## User Profile

WHEN a member views their own profile, THE system SHALL display: their karma score, number of posts, number of comments, subscribed communities, and their 10 most recent posts and comments.

WHEN a member views another user's profile, THE system SHALL display: their karma score, number of posts, number of comments, subscribed communities, and their 10 most recent public posts and comments (excluding private community content they cannot access).

THE system SHALL display a "Member since" date on all user profiles.

THE system SHALL allow users to update their display name (up to 30 characters) and profile bio (up to 500 characters).

WHEN a user changes their display name, THE system SHALL update it globally across all posts, comments, and community memberships.

WHEN a user has no content (posts or comments), THE system SHALL display: "This user has not posted or commented yet."

WHEN a user account is banned, THE system SHALL display: "User has been banned from the platform." instead of profile content.

## Content Reporting

WHEN a member reports a post, THE system SHALL require a reason category: "Spam", "Harassment", "Misinformation", "Illegal Content", "Other".

WHEN a member reports a comment, THE system SHALL require a reason category: "Spam", "Harassment", "Misinformation", "Illegal Content", "Other".

WHEN a report is submitted, THE system SHALL log the report with:
- Report ID
- Reported content ID
- Reporter user ID
- Reporter IP address
- Timestamp
- Reported reason category
- Post/comment content preview

THE system SHALL notify the community moderator if the report is for content in their community.

THE system SHALL notify the platform admin if:
- The report has been submitted 3+ times for the same content
- The report contains "Illegal Content"
- The report is on a private community post

WHEN a post or comment is reported, THE system SHALL display: "This content has been reported. Moderators are reviewing it." to all users except the reporter.

THE system SHALL allow admins to mark reports as "Approved", "Rejected", or "In Progress".

WHEN a report is marked as "Approved", THE system SHALL automatically delete the reported content.

WHEN a mod/admin deletes content based on a report, THE system SHALL notify the reporting user with the result.

WHEN a user submits 5 or more reports within 24 hours without any being approved, THE system SHALL temporarily suspend their ability to submit new reports for 48 hours.

THE system SHALL retain all reports for 365 days for audit purposes.