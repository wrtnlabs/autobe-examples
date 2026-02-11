# Reddit-like Community Platform Requirements Specification

## User Account Management

WHEN a user registers for an account, THE system SHALL require a unique email address, a password with at least 8 characters, and a unique username of 3 to 30 characters.

WHEN a user attempts to register with a duplicate email or username, THE system SHALL return error code USER_REGISTRATION_DUPLICATE.

WHEN a user registers successfully, THE system SHALL create an unverified account with status "active" and assign a unique user ID.

WHEN a user logs in, THE system SHALL require valid email and password credentials.

WHEN login credentials are invalid, THE system SHALL return error code USER_LOGIN_INVALID_CREDENTIALS after three failed attempts.

WHEN a user logs in, THE system SHALL create a secure JWT session token with a 7-day expiration.

WHEN a user changes their password, THE system SHALL require current password verification.

WHEN a user changes their password, THE system SHALL invalidate all existing sessions and issue a new JWT token.

WHEN a user deletes their account, THE system SHALL mark account status as "deleted" and initiate cascading deletion of all associated posts, comments, and profile data.

WHEN a user deletes their account, THE system SHALL retain anonymized audit logs (user ID, timestamps, actions) for legal compliance.

WHEN a user is permanently deleted, THE system SHALL set all their posts and comments to status "author_deleted" and anonymize display name to "[deleted]".

## User Profile System

WHEN a user profile is created, THE system SHALL automatically generate default values: display name equals username, bio is empty, avatar is null.

WHEN a user edits their profile, THE system SHALL allow modification of display name (max 50 characters), bio (max 500 characters), and avatar URL (valid HTTPS image URL).

WHEN a user uploads an avatar, THE system SHALL validate that the image is under 5MB and has extension .jpg, .jpeg, .png, or .webp.

WHEN a profile is viewed by any user, THE system SHALL display: display name, bio, avatar image (if exists), total karma score, list of all posts created, and list of all comments written.

WHEN a user views another user's profile, THE system SHALL not reveal the email address or authentication details.

WHEN a profile is viewed by the owner, THE system SHALL include an "Edit Profile" button and action links.

WHEN a profile is viewed by a guest, THE system SHALL restrict access to public-only fields and not show edit options.

WHEN a user's profile contains 100+ posts, THE system SHALL paginate posts in 20-item chunks.

WHEN a user's profile contains 100+ comments, THE system SHALL paginate comments in 20-item chunks.

## Karma System

WHEN a user receives an upvote on a post or comment, THE system SHALL increment their karma score by 1.

WHEN a user receives a downvote on a post or comment, THE system SHALL decrement their karma score by 1.

WHEN a user removes their upvote, THE system SHALL decrement the author's karma by 1.

WHEN a user removes their downvote, THE system SHALL increment the author's karma by 1.

WHEN a user changes their vote from upvote to downvote, THE system SHALL decrement the author's karma by 2 (net change of -2).

WHEN a user changes their vote from downvote to upvote, THE system SHALL increment the author's karma by 2 (net change of +2).

WHEN a user's karma score is calculated, THE system SHALL sum total changes from all votes on all their posts and comments.

WHEN a user's karma score is displayed, THE system SHALL show the raw number (positive or negative) without formatting.

WHEN a user's karma is negative, THE system SHALL still display the negative number with a minus sign.

WHEN a user's karma is viewed on their profile, THE system SHALL update it atomically when any vote changes on any of their content.

WHEN a user votes on their own post or comment, THE system SHALL ignore the vote and return error code USER_CANNOT_VOTE_ON_OWN_CONTENT.

## Community Management

WHEN a user creates a community, THE system SHALL require a unique name (3-30 characters alphanumeric with hyphens), a description (max 500 characters), and an optional icon image URL.

WHEN a community name is not unique, THE system SHALL return error code COMMUNITY_NAME_NOT_UNIQUE.

WHEN a community icon is provided, THE system SHALL validate that the URL is a valid HTTPS image (.jpg, .jpeg, .png, .webp) under 2MB.

WHEN a community is created, THE system SHALL assign the creator as owner, set subscriber count to 1, and set status to "active".

WHEN a user browses communities, THE system SHALL return list sorted alphabetically by name.

WHEN a user searches for communities, THE system SHALL perform case-insensitive substring matching on community name and description.

WHEN a community is queried for details, THE system SHALL display: name, description, icon image (if set), owner username, subscriber count, and creation date.

WHEN a community is archived by an admin, THE system SHALL set status to "archived" and prevent new subscriptions but allow existing ones to remain.

WHEN a community is deleted by admin, THE system SHALL set status to "deleted" and prevent all further interaction but retain data for moderation history.

## Subscription Management

WHEN a user subscribes to a community, THE system SHALL verify that the user is not already subscribed.

WHEN a user subscribes to a community, THE system SHALL increment the community's subscriber count and add an entry to the user_communities table.

WHEN a user unsubscribes from a community, THE system SHALL verify the user is currently subscribed.

WHEN a user unsubscribes from a community, THE system SHALL decrement the community's subscriber count and remove the user_community entry.

WHEN a user creates a post, THE system SHALL verify that the user has an active subscription to the target community.

WHEN a user attempts to post in a community they are not subscribed to, THE system SHALL return error code POST_COMMUNITY_SUBSCRIPTION_REQUIRED.

WHEN a user views their subscriptions, THE system SHALL return list of communities they follow, sorted by most recent subscription date.

WHEN a user views community details, THE system SHALL indicate "Subscribed" or "Not Subscribed" based on their membership status.

## Post Management

WHEN a user creates a post, THE system SHALL require title (3-200 characters) and exactly one content field: textContent, url, or imageUrl.

WHEN a post is created with textContent, THE system SHALL validate that it contains at least 1 character and does not exceed 10,000 characters.

WHEN a post is created with url, THE system SHALL validate that it conforms to RFC 3986 URL specification and is not a link to a malicious domain.

WHEN a post is created with imageUrl, THE system SHALL validate that it points to a publicly accessible image in .jpg, .jpeg, .png, .gif, or .webp format under 10MB.

WHEN a post is created, THE system SHALL set creation timestamp (createdAt), initial voteScore to 0, commentCount to 0, status to "active", and assign authorId and communityId.

WHEN a user edits a post, THE system SHALL verify that the userId matches the post's authorId.

WHEN a user attempts to edit another user's post, THE system SHALL return error code POST_EDIT_PERMISSION_DENIED.

WHEN a user edits a post, THE system SHALL allow modification of title and exactly one content field. Existing non-selected content fields SHALL be set to null.

WHEN a user edits a post, THE system SHALL update the updatedAt timestamp.

WHEN a user deletes a post, THE system SHALL verify that the userId matches the post's authorId.

WHEN a user attempts to delete another user's post, THE system SHALL return error code POST_DELETE_PERMISSION_DENIED.

WHEN a post is deleted, THE system SHALL change status from "active" to "deleted".

WHEN a post is marked as deleted, THE system SHALL prevent it from appearing in any feed, search, or public listing.

WHEN a post is deleted, THE system SHALL preserve all metadata for audit and moderation purposes.

WHEN a post is created, THE system SHALL emit PostCreated event with authorId, communityId, postId, and type.

WHEN a post is edited, THE system SHALL emit PostUpdated event with postId, authorId, and updatedAt.

WHEN a post is deleted, THE system SHALL emit PostDeleted event with postId and authorId.

WHEN a post is viewed in detail, THE system SHALL return: title, createdAt, updatedAt, authorUsername, communityName, voteScore, commentCount, status, and the appropriate content field.

WHEN a post type is text, THE system SHALL truncate textContent to first 200 characters when displayed in feeds.

WHEN a post type is link, THE system SHALL extract and display the domain name from url (e.g. "reddit.com").

WHEN a post type is image, THE system SHALL serve a 200x200 pixel thumbnail using a cached CDN resizer.

## Post Voting

WHEN a user upvotes a post, THE system SHALL check that the user has not already voted on this post.

WHEN a user upvotes a post, THE system SHALL create a new vote record with direction = "up" and increment post's voteScore by 1.

WHEN a user downvotes a post, THE system SHALL check that the user has not already voted on this post.

WHEN a user downvotes a post, THE system SHALL create a new vote record with direction = "down" and decrement post's voteScore by 1.

WHEN a user changes their vote from up to down, THE system SHALL update the vote record's direction to "down" and adjust voteScore by -2.

WHEN a user changes their vote from down to up, THE system SHALL update the vote record's direction to "up" and adjust voteScore by +2.

WHEN a user removes their vote, THE system SHALL delete the vote record and adjust voteScore by -1 (if upvote) or +1 (if downvote).

WHEN a user votes on their own post, THE system SHALL return error code USER_CANNOT_VOTE_ON_OWN_CONTENT.

WHEN a post vote is updated, THE system SHALL update karma of the post's author immediately.

WHEN a vote record is created, changed, or deleted, THE system SHALL emit PostVoteChanged event with userId, postId, direction, and priorDirection (if changed).

WHEN a post is viewed, THE system SHALL display current vote score as an integer (e.g., "+17", "-3") and indicate user's current vote state (none, up, down).

## Post Feeds

WHEN a logged-in user accesses Home Feed, THE system SHALL retrieve all active posts from communities the user is subscribed to.

WHEN a guest user accesses Home Feed, THE system SHALL return empty list with error code FEED_ACCESS_DENIED.

WHEN any user accesses Popular Feed, THE system SHALL retrieve all active posts from all communities, sorted and paginated.

WHEN any user accesses Community Feed, THE system SHALL retrieve all active posts from the specified community, sorted and paginated.

WHEN a post is ordered by "Hot", THE system SHALL calculate score using formula: log10(upvotes + 1) - (createdAt - now) / 3600000, weighted for recency.

WHEN a post is ordered by "New", THE system SHALL sort by createdAt descending.

WHEN a post is ordered by "Top", THE system SHALL sort by voteScore descending with time filter applied:
- today: posts created in last 24 hours
- this week: posts created in last 7 days
- this month: posts created in last 30 days
- this year: posts created in last 365 days
- all time: no time restriction

WHEN a post is ordered by "Controversial", THE system SHALL calculate controversy score: upvotes * downvotes / (upvotes + downvotes + 1) and sort descending.

WHEN any feed is accessed, THE system SHALL paginate results with 20 items per page.

WHEN a user requests page 1, THE system SHALL return results from index 0 to 19.

WHEN a user requests page 2, THE system SHALL return results from index 20 to 39.

WHEN a feed requests a page beyond available data, THE system SHALL return empty list.

## Comment System

WHEN a user creates a comment, THE system SHALL require: content (1-5000 characters), postId, and optionally parentCommentId if replying.

WHEN a comment is created with parentCommentId, THE system SHALL validate that the parent comment exists and belongs to the same post.

WHEN a comment is created, THE system SHALL set createdAt timestamp, voteScore = 0, and status = "active".

WHEN a comment is edited, THE system SHALL verify that the userId matches the comment's authorId.

WHEN a user attempts to edit another user's comment, THE system SHALL return error code COMMENT_EDIT_PERMISSION_DENIED.

WHEN a comment is edited, THE system SHALL update content field and set updatedAt timestamp.

WHEN a comment is deleted, THE system SHALL verify that the userId matches the comment's authorId.

WHEN a user attempts to delete another user's comment, THE system SHALL return error code COMMENT_DELETE_PERMISSION_DENIED.

WHEN a comment is deleted, THE system SHALL change status to "deleted".

WHEN a comment is marked as deleted, THE system SHALL remove it from visibility in replies but retain metadata for moderation.

WHEN a comment is viewed, THE system SHALL display: authorUsername, content, voteScore, createdAt, updatedAt (if edited), and nested replies.

WHEN a comment is viewed by moderator, THE system SHALL include "moderatorViewable: true" flag if status is "deleted" or "banned".

WHEN a comment has replies, THE system SHALL recursively fetch all descendant comments.

WHEN a comment has more than 200 direct replies, THE system SHALL paginate replies in 20-item chunks.

WHEN a comment thread is sorted by "Best", THE system SHALL sort children by voteScore descending.

WHEN a comment thread is sorted by "New", THE system SHALL sort children by createdAt descending.

WHEN a comment thread is sorted by "Controversial", THE system SHALL sort children by controversy score: upvotes * downvotes / (upvotes + downvotes + 1) descending.

WHEN a comment is created, THE system SHALL increment post's commentCount by 1.

WHEN a comment is deleted, THE system SHALL decrement post's commentCount by 1.

WHEN a comment is voted on, THE system SHALL update karma of comment's author.

WHEN a comment is upvoted, THE system SHALL emit CommentUpvoted event.

WHEN a comment is downvoted, THE system SHALL emit CommentDownvoted event.

WHEN a vote is removed or changed, THE system SHALL emit CommentVoteChanged event.

## Comment Voting

WHEN a user upvotes a comment, THE system SHALL check that the user has not already voted on this comment.

WHEN a user upvotes a comment, THE system SHALL create a new vote record with direction = "up" and increment comment's voteScore by 1.

WHEN a user downvotes a comment, THE system SHALL check that the user has not already voted on this comment.

WHEN a user downvotes a comment, THE system SHALL create a new vote record with direction = "down" and decrement comment's voteScore by 1.

WHEN a user changes their vote from up to down, THE system SHALL update the vote record's direction to "down" and adjust comment's voteScore by -2.

WHEN a user changes their vote from down to up, THE system SHALL update the vote record's direction to "up" and adjust comment's voteScore by +2.

WHEN a user removes their vote, THE system SHALL delete the vote record and adjust comment's voteScore by -1 (if upvote) or +1 (if downvote).

WHEN a user votes on their own comment, THE system SHALL return error code USER_CANNOT_VOTE_ON_OWN_CONTENT.

WHEN a comment vote is updated, THE system SHALL update karma of the comment's author immediately.

WHEN a vote record is created, changed, or deleted, THE system SHALL emit CommentVoteChanged event with userId, commentId, direction, and priorDirection (if changed).

## Community Moderation

WHEN a community owner adds a moderator, THE system SHALL verify that the target user has an active account.

WHEN a community owner adds a moderator, THE system SHALL add a record to the community_moderators table with role = "moderator".

WHEN a community owner removes a moderator, THE system SHALL delete the user's record from community_moderators table.

WHEN a moderator adds another moderator, THE system SHALL verify that the requesting user is a moderator of the same community.

WHEN a moderator attempts to remove an owner, THE system SHALL return error code MODERATOR_CANNOT_REMOVE_OWNER.

WHEN a moderator attempts to remove another moderator, THE system SHALL return error code MODERATOR_CANNOT_REMOVE_MODERATOR.

WHEN a moderator deletes a post, THE system SHALL set status to "banned" and record moderatorId and reason.

WHEN a moderator deletes a comment, THE system SHALL set status to "banned" and record moderatorId and reason.

WHEN a moderator bans a user from a community, THE system SHALL add a record to community_bans with userId, communityId, banDate, and reason.

WHEN a moderator unbans a user, THE system SHALL delete the ban record from community_bans.

WHEN a user attempts to post in a community they are banned from, THE system SHALL return error code USER_COMMUNITY_BANNED.

WHEN a user attempts to comment in a community they are banned from, THE system SHALL return error code USER_COMMUNITY_BANNED.

WHEN a moderator views a banned user list, THE system SHALL return array of userId, banDate, and reason (if provided).

WHEN a user is banned from a community, THE system SHALL maintain active posts and comments but prevent new activity.

WHEN a user is banned from a community, THE system SHALL prevent them from seeing "Create Post" or "Comment" buttons in that community.

WHEN a community owner is banned from their own community, THE system SHALL still retain full owner privileges.

WHEN a moderator is removed from a community, THE system SHALL retain their access to previously deleted/banned content for review.

## Reporting System

WHEN a user reports a post, THE system SHALL require: contentId, contentType ("post" or "comment"), reason (max 500 characters).

WHEN a user reports a comment, THE system SHALL require: contentId, contentType ("post" or "comment"), reason (max 500 characters).

WHEN a report is submitted, THE system SHALL create a report record with: reporterId, contentId, contentType, reason, createdAt, status = "pending".

WHEN a moderator views reports, THE system SHALL return all pending reports for their community with reporter username, content preview, and reason.

WHEN a moderator approves a report, THE system SHALL change report status to "approved" and initiate content deletion (set status to "banned").

WHEN a moderator dismisses a report, THE system SHALL change report status to "dismissed" and remove it from the active report list.

WHEN a report is dismissed, THE system SHALL retain the report for audit purposes only.

WHEN a reported post or comment is banned, THE system SHALL emit ModerationAction event with moderatorId, contentId, contentType, action = "banned".

WHEN a report is approved, THE system SHALL notify the reporter with "Your report was approved".

WHEN a report is dismissed, THE system SHALL notify the reporter with "Your report was dismissed".

WHEN a user is reported 5 times across different posts/comments, THE system SHALL auto-flag their account for admin review.

WHEN a moderator repeatedly dismisses reports without justification, THE system SHALL log warning to admin audit trail.

WHEN a report is viewed by owner or moderator, THE system SHALL include the full content of the reported item (if deleted or banned).

WHEN a report is viewed by regular user, THE system SHALL only show "Report submitted" status.

WHEN a user attempts to report content they own, THE system SHALL return error code CANNOT_REPORT_OWN_CONTENT.

## Authentication and Authorization

WHEN a user attempts to access any protected resource, THE system SHALL verify presence of valid JWT token.

WHEN a user attempts to create, edit, or delete content, THE system SHALL verify that userId from JWT matches the post/comment authorId.

WHEN a user attempts to moderate content, THE system SHALL verify that the user is either owner or moderator of the target community.

WHEN a user attempts to subscribe or unsubscribe, THE system SHALL verify that the user is authenticated.

WHEN a user attempts to view a post in a community, THE system SHALL verify status of post and community are "active".

WHEN a user attempts to view a post from a community they are not subscribed to, THE system SHALL deny access in Home Feed but allow in Popular Feed or Community Feed.

WHEN a user attempts to view a deleted post, THE system SHALL allow access if user is author, moderator, or owner.

WHEN a user attempts to view a banned post, THE system SHALL allow access only to moderators and owners.

WHEN a user attempts to view profile of another user, THE system SHALL verify that the target user status is "active".

WHEN a user attempts to view a community, THE system SHALL verify that community status is "active".

WHEN a user is banned from a community, THE system SHALL reject all write requests from that user for that community.

WHEN a user's account is deleted, THE system SHALL invalidate all active sessions and return error code USER_ACCOUNT_DELETED.

WHEN a JWT token expires, THE system SHALL return error code AUTH_TOKEN_EXPIRED and require re-login.

## Feed and Sorting Algorithms

WHEN feed is sorted by "Hot", THE system SHALL calculate each post's hot score as:

```
hotScore = log10(upvotes + 1) - ((now - createdAt) / 3600000)
```

WHEN feed is sorted by "Top", THE system SHALL apply time filters as:

```json
"today": startTime = now - 86400000
"this week": startTime = now - 604800000
"this month": startTime = now - 2592000000
"this year": startTime = now - 31536000000
"all time": startTime = 0
```

WHEN feed is sorted by "Controversial", THE system SHALL calculate each post's controversy score as:

```
controversyScore = upvotes * downvotes / (upvotes + downvotes + 1)
```

WHEN feed is sorted by "New", THE system SHALL sort by createdAt DESC.

WHEN any feed is requested, THE system SHALL apply pagination with offset = (page - 1) * 20.

WHEN a user requests page 1, THE system SHALL return items with offset = 0.

WHEN a user requests page 2, THE system SHALL return items with offset = 20.

WHEN a user queries beyond available pages, THE system SHALL respond with empty list.

## System-wide Rules

WHEN any action modifies a post or comment's voteScore, THE system SHALL ensure the calculation is performed in a database transaction with row-level locking.

WHEN any action modifies a user's karma, THE system SHALL ensure atomic update with optimistic concurrency control.

WHEN any action modifies subscriber count or comment count, THE system SHALL ensure atomic update with row-level locking.

WHEN any content is marked deleted, banned, or archived, THE system SHALL preserve all metadata indefinitely.

WHEN any user action is performed, THE system SHALL log to audit trail: actorId, action, targetId, targetType, timestamp, ip, userAgent.

WHEN any system error occurs during voting, editing, or moderation, THE system SHALL rollback all changes and return appropriate error code.

WHEN a post or comment is edited, THE system SHALL retain previous versions in a content history table.

WHEN a user's avatar, bio, or display name is changed, THE system SHALL update all existing references to reflect new values.

WHEN a community's name or icon is changed, THE system SHALL update all existing post references to reflect new name and icon.

WHEN a post or comment is created, THE system SHALL sanitize user input for XSS and script injection.

WHEN any link is embedded in content, THE system SHALL validate URL scheme is http:// or https:// only.

WHEN a user attempts to access restricted functionality, THE system SHALL return standardized error codes with human-readable messages.