# Reddit-Style Community Platform — Functional Requirements Specification

## Introduction

The communityPlatform is a Reddit-like online community platform designed to empower users to create, share, and discuss content within topic-specific communities. The platform enables organic content discovery through karma-based voting, threaded comments, and community moderation. It is built to foster engagement, promote healthy discourse, and provide intuitive tools for content curation and moderation.

This platform is not a social network in the traditional sense — it is a content-centric community system where value is generated through user contributions, reputation, and community governance. The design prioritizes user autonomy, transparency, and moderation scalability.

## Authentication & Profile

### User Registration

WHEN a user attempts to register,
THE system SHALL require an email address, a password, and a unique username.
SHALL validate that the email address conforms to standard email format.
SHALL validate that the password meets minimum complexity requirements (at least 8 characters).
SHALL validate that the username is not already in use.
SHALL create a new user account with default karma of 0.
SHALL emit an authentication token upon successful registration.
SHALL require email verification as optional, but log the unverified status.

WHEN username registration fails due to duplication,
THE system SHALL respond with an error message: "Username already exists. Please choose another."

WHEN email registration fails due to invalid format,
THE system SHALL respond with an error message: "Please enter a valid email address."

WHEN password registration fails due to insufficient complexity,
THE system SHALL respond with an error message: "Password must be at least 8 characters long."

### User Login

WHEN a user attempts to log in,
THE system SHALL accept email and password credentials.
SHALL verify that the email exists and is associated with an active account.
SHALL verify that the provided password matches the stored hash.
SHALL issue a JWT token valid for 7 days.
SHALL record the login timestamp for activity tracking.

WHEN login fails due to invalid email or password,
THE system SHALL respond with an error message: "Invalid email or password."

WHEN login fails due to account being deactivated,
THE system SHALL respond with an error message: "This account has been deactivated."

### Password Change

WHEN a user requests to change their password,
THE system SHALL require the current password and two new password inputs for confirmation.
SHALL verify the current password matches the stored hash.
SHALL validate that the new password meets complexity requirements (at least 8 characters).
SHALL update the password hash and invalidate all active sessions.
SHALL log the password change event.

WHEN the current password is incorrect,
THE system SHALL respond with an error message: "Current password is incorrect."

WHEN the two new password inputs do not match,
THE system SHALL respond with an error message: "New passwords do not match."

### Account Deletion

WHEN a user requests to delete their account,
THE system SHALL require confirmation of the password.
SHALL verify account authentication.
SHALL delete all posts created by the user (cascade-delete).
SHALL delete all comments created by the user (cascade-delete).
SHALL delete the user profile and authentication record.
SHALL invalidate all active sessions belonging to this user.
SHALL log the deletion as irreversible.

WHEN password confirmation fails,
THE system SHALL respond with an error message: "Incorrect password. Deletion cancelled."

### Profile Editing

WHEN a user edits their profile,
THE system SHALL allow updates to display name, bio, and avatar image.
SHALL validate display name length (1–100 characters).
SHALL validate bio length (0–500 characters).
SHALL validate avatar image format (JPEG, PNG, GIF; max 5MB).
SHALL update profile record with new values.
SHALL preserve previous avatar as backup if update is requested.

WHEN display name exceeds 100 characters,
THE system SHALL respond with an error message: "Display name must be 100 characters or fewer."

WHEN bio exceeds 500 characters,
THE system SHALL respond with an error message: "Bio must be 500 characters or fewer."

WHEN avatar upload exceeds 5MB or uses unsupported format,
THE system SHALL respond with an error message: "Avatar must be a JPEG, PNG, or GIF under 5MB."

### Public Profile Viewing

WHEN a user views another user’s public profile,
THE system SHALL display:
- The display name
- The bio text
- The avatar image
- Total karma score
- List of all posts created by the user
- List of all comments written by the user

SHALL NOT display any private information such as email, registration date, or IP history.
SHALL enforce that the profile belongs to an active account.

WHEN viewing a deleted user’s profile,
THE system SHALL show: "This user’s account has been deleted."

WHEN viewing a profile of a user who has no posts or comments,
THE system SHALL display: "This user has not yet created any content."

## Communities

### Community Creation

WHEN a user creates a community,
THE system SHALL require:
- A unique community name (alphanumeric, hyphen, underscore only)
- A description (up to 500 characters)
- An icon image (JPEG, PNG, GIF; max 2MB)

SHALL assign the creator as the community owner.
SHALL set initial subscriber count to 1 (the creator).
SHALL record the creation timestamp.

WHEN community name is not unique,
THE system SHALL respond with an error message: "Community name already taken. Please choose another."

WHEN community name contains invalid characters,
THE system SHALL respond with an error message: "Community name may only contain letters, numbers, hyphens, and underscores."

WHEN icon upload exceeds 2MB or uses unsupported format,
THE system SHALL respond with an error message: "Community icon must be a JPEG, PNG, or GIF under 2MB."

### Community Browsing

WHEN a user browses all communities,
THE system SHALL list:
- Community name
- Community description (truncated to 120 characters)
- Community icon
- Subscriber count
- Creation timestamp

SHALL sort alphabetically by community name by default.
SHALL provide pagination with 20 communities per page.

WHEN a user searches for communities by name,
THE system SHALL match partial or full names using case-insensitive substring search.
SHALL return results sorted by relevance: exact match first, then prefix match, then substring match.

### Community Subscription

WHEN a user subscribes to a community,
THE system SHALL validate that the user is not already subscribed.
SHALL increment the community’s subscriber count by 1.
SHALL record the subscription timestamp.
SHALL return confirmation status.

WHEN a user unsubscribes from a community,
THE system SHALL validate that the user is subscribed.
SHALL decrement the community’s subscriber count by 1.
SHALL remove the subscription record.
SHALL return confirmation status.

WHEN a user tries to subscribe to a non-existent community,
THE system SHALL respond with an error message: "Community not found."

WHEN a user tries to subscribe to their own community (as owner),
THE system SHALL silently accept the subscription (no error, no duplicate).

### Community Feed

WHEN a user views a community feed,
THE system SHALL display all public posts from that community.
SHALL include posts from users regardless of their subscription status.
SHALL allow sorting by: Hot, New, Top (with time filters), Controversial.
SHALL support pagination (20 posts per page).
SHALL not require authentication.

WHEN viewing a community feed for a non-existent community,
THE system SHALL respond with an error message: "Community not found."

## Posts

### Post Creation

WHEN a user creates a post,
THE system SHALL require:
- A title (1–300 characters)
- Exactly one of: text content, link URL, or image upload
- A valid community ID to which the post is addressed

SHALL validate that the user is subscribed to the target community.
SHALL validate that the title is not empty or whitespace-only.
SHALL validate that links are valid URLs (http/https).
SHALL validate that image uploads are JPEG, PNG, or GIF under 10MB.
SHALL assign the post to the user as creator.
SHALL set initial vote score to 0.
SHALL set comment count to 0.
SHALL record creation timestamp.
SHALL return the generated post object with unique ID.

WHEN a user attempts to create a text post with empty content,
THE system SHALL respond with an error message: "Text posts must include at least one character of content."

WHEN a user attempts to create a link post with invalid URL,
THE system SHALL respond with an error message: "Please enter a valid URL (starting with http:// or https://)."

WHEN a user attempts to create an image post exceeding 10MB or with unsupported format,
THE system SHALL respond with an error message: "Image post must be a JPEG, PNG, or GIF under 10MB."

WHEN a user tries to post in a community they are not subscribed to,
THE system SHALL respond with an error message: "You must subscribe to this community before posting."

WHEN a user tries to create a post with no selection (no text, link, or image),
THE system SHALL respond with an error message: "You must select one type of content: text, link, or image."

### Post Editing

WHEN a user edits their own post,
THE system SHALL allow changes to title, text content, link URL, or image.
SHALL allow edits only within 24 hours of creation.
SHALL record edit timestamp and increment edit counter.
SHALL append "[Edited]" to the post title upon edit.

WHEN edit request is made after 24 hours,
THE system SHALL respond with an error message: "You can only edit your posts within 24 hours of posting."

WHEN editing a link post and changing the URL to invalid,
THE system SHALL respond with an error message: "Invalid URL. Must start with http:// or https://."

WHEN editing an image post and uploading an invalid image,
THE system SHALL respond with an error message: "Invalid image file. Must be JPEG, PNG, or GIF under 10MB."

### Post Deletion

WHEN a user deletes their own post,
THE system SHALL remove the post from public view.
SHALL decrement the author’s karma by the total vote score of the deleted post.
SHALL cascade-delete all comments under the post.
SHALL retain a soft-deleted record for moderation auditing.

WHEN a user attempts to delete someone else’s post,
THE system SHALL respond with an error message: "You can only delete your own posts."

### Post Visibility and Feeds

WHEN a user views the Home Feed,
THE system SHALL return only posts from communities they are subscribed to.
SHALL require authentication.
SHALL support sorting: Hot, New, Top, Controversial.
SHALL paginate results with 20 posts per page.

WHEN a user views the Popular Feed,
THE system SHALL return posts from all communities across the platform.
SHALL allow access without authentication.
SHALL sort by the "hot" formula: (log(upvotes + 1) / (time since creation in hours + 2))
SHALL paginate results with 20 posts per page.

WHEN a user views the Community Feed,
THE system SHALL return all posts from one specific community.
SHALL allow access without authentication.
SHALL support sorting: Hot, New, Top (with filters), Controversial.
SHALL paginate results with 20 posts per page.

### Post Display in Feeds

WHEN a post is displayed in any feed list,
THE system SHALL show:
- Title
- Author username
- Community name
- Vote score
- Comment count
- Time since posted (relative, e.g., "3 hours ago")

WHEN the post is a text post,
THE system SHALL display the first 200 characters of content, truncated with "..."

WHEN the post is a link post,
THE system SHALL display the domain name of the URL (e.g., "reddit.com", "youtube.com")

WHEN the post is an image post,
THE system SHALL display a 120x90 pixel thumbnail of the image.

WHEN a post has no content (empty text post),
THE system SHALL display: "[Empty text post]"

## Post Voting

### Vote Submission

WHEN a user upvotes a post,
THE system SHALL:
- Check if the user already voted on this post
- If no vote exists: add upvote, increment karma by 1
- If downvote exists: convert to upvote, change karma by +2
- If upvote exists: remove vote, change karma by -1

WHEN a user downvotes a post,
THE system SHALL:
- Check if the user already voted on this post
- If no vote exists: add downvote, decrement karma by 1
- If upvote exists: convert to downvote, change karma by -2
- If downvote exists: remove vote, change karma by +1

WHEN a user removes their vote,
THE system SHALL:
- Remove existing vote (up or down)
- Adjust karma by the inverse of the removed vote
- Do not change existing vote direction

WHEN a user attempts to vote on a non-existent post,
THE system SHALL respond with an error message: "Post not found."

WHEN a user attempts to vote after being banned from the post’s community,
THE system SHALL respond with an error message: "You are banned from this community and cannot vote."

### Vote Aggregation and Display

WHEN a post’s score is calculated,
THE system SHALL compute: total upvotes minus total downvotes.
SHALL store raw count of upvotes and downvotes separately.
SHALL not allow score to be manually set.
SHALL update score instantaneously upon every vote change.

WHEN a post’s score is displayed,
THE system SHALL show only the computed net score.

WHEN the net score is negative,
THE system SHALL show the score as a negative number (e.g., "-5").

## Comments

### Comment Creation

WHEN a user writes a comment on a post,
THE system SHALL require:
- Comment text (1–1000 characters)
- Target post ID

SHALL allow nested replies: a reply to a comment is treated as a child comment.
SHALL assign comment to the user as author.
SHALL set initial vote score to 0.
SHALL record creation timestamp.
SHALL increment the parent post’s comment count by 1.

WHEN comment text is empty or whitespace-only,
THE system SHALL respond with an error message: "Comment cannot be empty."

WHEN comment text exceeds 1000 characters,
THE system SHALL respond with an error message: "Comment must be 1000 characters or fewer."

WHEN replying to a non-existent post or comment,
THE system SHALL respond with an error message: "Target post or comment not found."

### Comment Editing

WHEN a user edits their own comment,
THE system SHALL allow changes to content.
SHALL allow edits only within 24 hours of creation.
SHALL record edit timestamp and increment edit counter.

WHEN edit request is made after 24 hours,
THE system SHALL respond with an error message: "You can only edit your comments within 24 hours of posting."

### Comment Deletion

WHEN a user deletes their own comment,
THE system SHALL remove the comment from public view.
SHALL decrement the author’s karma by the total vote score of the deleted comment.
SHALL decrement the parent post or comment’s child count by 1.
SHALL retain a soft-deleted record for moderation auditing.

WHEN a user attempts to delete someone else’s comment,
THE system SHALL respond with an error message: "You can only delete your own comments."

### Comment Display

WHEN a comment is displayed, either on a feed or post,
THE system SHALL show:
- Author username
- Comment text
- Vote score
- Time since posted (relative)
- Nested replies (recursively loaded)

WHEN a comment's parent is deleted,
THE system SHALL display: "This comment was made on a deleted post or comment."

### Comment Sorting

WHEN comments on a post are sorted by "Best",
THE system SHALL rank by vote score descending, then by creation time ascending.

WHEN comments on a post are sorted by "New",
THE system SHALL rank by creation time descending.

WHEN comments on a post are sorted by "Controversial",
THE system SHALL rank by total votes (upvotes + downvotes) descending, filtered by score between -2 and +2.

## Post and Comment Voting System (Unified)

The voting rules are identical for both posts and comments:

WHEN any voting action occurs (upvote, downvote, remove),
THE system SHALL:
- Enforce one vote per user per entity (post or comment)
- Record each vote as a separate entity with user ID, target ID, vote type, timestamp
- Update aggregated score in real time
- Adjust author karma as: +1 for upvote, -1 for downvote, neutral on removal
- Allow vote changes (up → down → remove, etc.)
- Prevent voting by banned users
- Prevent voting by non-authenticated users

WHEN an actor removes their previous vote,
THE system SHALL reduce the associated author’s karma by the previous vote value.

WHEN karma for an actor reaches negative values,
THE system SHALL display negative karma as-is without minimum cap.

## Reporting System

### Report Submission

WHEN a user reports a post or comment,
THE system SHALL require:
- Target entity ID (post or comment)
- Reason text (10–500 characters)

SHALL record reporter ID, target ID, reason, report timestamp.
SHALL increment report counter on target.

WHEN reason is less than 10 characters,
THE system SHALL respond with an error message: "Report reason must be at least 10 characters long."

WHEN reason exceeds 500 characters,
THE system SHALL respond with an error message: "Report reason cannot exceed 500 characters."

WHEN reporting a non-existent or deleted entity,
THE system SHALL respond with an error message: "Cannot report this content. It may have been removed."

### Report Moderation Dashboard

WHEN a moderator views reports,
THE system SHALL list:
- Reported entity (post or comment)
- Reporter username
- Reason text
- Report timestamp
- Status (Pending, Approved, Dismissed)

SHALL sort by report timestamp descending.
SHALL paginate results (20 reports per page).
SHALL allow filtering by entity type (post/comment) and status.

### Report Action

WHEN a moderator approves a report,
THE system SHALL:
- Delete the reported entity (post or comment)
- Record the moderator ID and approval timestamp
- Set report status to "Approved"
- Increase reporter karma by 1 (incentive)
- Notify reporter: "Your report has been approved. Content removed."

WHEN a moderator dismisses a report,
THE system SHALL:
- Leave the reported entity unchanged
- Set report status to "Dismissed"
- Remove the report from active list (soft delete)
- Notify reporter: "Your report has been dismissed. No action taken."

WHEN a moderator approves a report on a post they did not create,
THE system SHALL still allow the action if they are moderator of the community.

## Moderation System

### Moderator Management

WHEN an owner adds a moderator,
THE system SHALL:
- Verify the user is a member of the community
- Verify the user is not already a moderator
- Add the user to the community’s moderator list
- Notify the user: "You have been appointed as moderator of [Community Name]."

WHEN an owner removes a moderator,
THE system SHALL:
- Verify the user is a moderator of the community
- Remove the user from the moderator list
- Notify the user: "You have been removed as moderator of [Community Name]."

WHEN a moderator attempts to add another moderator,
THE system SHALL:
- Allow the addition
- Add the new moderator to the list

WHEN a moderator attempts to remove a moderator,
THE system SHALL respond with an error message: "Only community owners can remove moderators."

WHEN a moderator attempts to remove the owner,
THE system SHALL respond with an error message: "You cannot remove the community owner."

### User Banning

WHEN a moderator bans a user from a community,
THE system SHALL:
- Record the ban (user ID, community ID, moderator ID, reason)
- Add the user to the community’s banned list
- Prevent the user from posting or commenting in that community
- Allow the user to view community content
- Notify the user: "You have been banned from [Community Name] by [Moderator]. Reason: [reason]."

WHEN a moderator unbans a user,
THE system SHALL:
- Remove the user from the banned list
- Restore posting and commenting privileges
- Notify the user: "You have been unbanned from [Community Name]."

WHEN a banned user attempts to post or comment in the community,
THE system SHALL respond with an error message: "You are banned from this community and cannot post or comment."

### Banned User List

WHEN a moderator views the banned users list,
THE system SHALL display:
- Username
- Ban timestamp
- Moderator who banned them
- Ban reason

SHALL allow re-unban with single click.

## Business Rules Summary

### User Identity
- Each user is uniquely identified by username
- Email is for login only — not visible to others
- Profile data is owned solely by user

### Content Ownership
- Posts and comments are owned by creator
- Owner has full edit/delete rights within 24 hours
- Moderator/owner can override ownership only for moderation

### Karma Integrity
- Karma is calculated only from votes on user’s own content
- Removal of vote reverses karma adjustment
- No karma earned from moderation actions

### Access Control Matrix

| Actor | View Posts | View Comments | Vote | Create Post | Edit Post | Delete Post | Create Comment | Edit Comment | Delete Comment | Subscribe | Ban | Add Mod | Remove Mod | Delete Community |
|-------|------------|---------------|------|-------------|-----------|-------------|----------------|--------------|----------------|-----------|-----|---------|------------|------------------|
| Guest | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Member | ✅ | ✅ | ✅ | ✅ (subscribed only) | ✅ (self, 24h) | ✅ (self) | ✅ | ✅ (self, 24h) | ✅ (self) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Moderator | ✅ | ✅ | ✅ | ✅ (subscribed) | ✅ (self, 24h) | ✅ (any) | ✅ | ✅ (self, 24h) | ✅ (any) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ (self, 24h) | ✅ (any) | ✅ | ✅ (self, 24h) | ✅ (any) | ✅ | ✅ | ✅ | ✅ | ✅ |

### Feed Types and Visibility

| Feed Type | Auth Required | Sources | Sorting Options | Pagination |
|-----------|---------------|---------|-----------------|------------|
| Home | ✅ | Subscribed communities | Hot, New, Top, Controversial | ✅ |
| Popular | ❌ | All communities | Hot (default), New, Top, Controversial | ✅ |
| Community | ❌ | One specific community | Hot, New, Top, Controversial | ✅ |

### Data Retention
- Posts: Soft-deleted for 30 days, then purged
- Comments: Soft-deleted for 30 days, then purged
- Reports: Dismissed reports purged after 30 days
- Ban records: Persisted indefinitely
- Vote records: Persisted indefinitely

### Performance Requirements
- Feed load time: < 500ms for 20 posts
- Comment thread load time: < 800ms for 100 nested replies
- Karma calculation: Real-time update
- Search: 100ms latency for community name search

### Error Handling
- All errors must return HTTP 4xx or 5xx with structured JSON message
- No stack traces or internal data exposed
- Error messages must be user-friendly and actionable

- No database schemas, API endpoints, or ORM models are defined here — these are left to backend implementation.

---

> *This document is written entirely in natural business language. All requirements follow EARS format where applicable. No technical implementation details are included. This specification is sufficient for backend development team to implement the application from scratch.*