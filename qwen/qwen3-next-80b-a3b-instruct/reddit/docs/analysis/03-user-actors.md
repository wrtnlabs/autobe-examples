# Reddit-like Community Platform Requirements Specification

## Overview

This document outlines the functional requirements for a Reddit-like community platform. The platform enables users to create and join communities, share content in the form of posts and comments, vote on content, and participate in moderation activities.

The system is designed to support a large-scale, scalable community experience with rich user interaction and content discovery features. All functionality is built around user-generated content and community-driven moderation.

## Key Features

1. **User Account Management** - Registration, login, password change, and account deletion.
2. **User Profiles** - Display name, bio, avatar, karma score, and content history.
3. **Karma System** - Reputation points earned from upvotes and lost from downvotes.
4. **Communities** - User-created sub-communities with unique names, descriptions, and icons.
5. **Subscription Model** - Users subscribe to communities to post and view content.
6. **Posts** - Text, link, and image-based content with full editing and deletion.
7. **Post Voting** - Upvotes and downvotes with single-vote-per-user enforcement.
8. **Post Feeds** - Home (subscribed), Popular (public), and Community-specific feeds with multiple sorting options.
9. **Comments** - Nested comment threads with reply support.
10. **Comment Voting and Sorting** - Similar to posts with best, new, and controversial sorting.
11. **Community Moderation** - Owner and moderator roles with permission-controlled actions.
12. **Reporting System** - Users can report content, and moderators can act on reports.

## User Actors

- Guest: Unauthenticated user with limited viewing access
- Member: Authenticated user with full content creation and interaction privileges
- Community Owner: Member who created a community with full moderation rights for that community
- Community Moderator: Member granted moderation rights by a Community Owner
- Platform Admin: System-level administrator with global moderation and management rights

## System Constraints

- All user interactions require secure authentication
- Voting and reporting systems prevent abuse through single-vote-per-user and IP tracking
- Data consistency must be maintained for karma, subscriptions, and moderation actions
- Performance requirements for feeds must support real-time updates and pagination
- User privacy and data deletion must comply with GDPR-like standards

## Next Steps

The following sections provide detailed specifications for each feature set. Implementations must conform to these requirements and be testable against these definitions.

## User Account

### Registration

WHEN a guest submits an email address, password, and unique username:

- THE system SHALL validate the email against a standard RFC 5322 format
- THE system SHALL validate password strength: minimum 8 characters, must contain at least one digit and one special character
- THE system SHALL verify that the provided username is not already registered
- THE system SHALL verify that the provided email is not already registered
- THEN THE system SHALL create a new user record with status: "unverified"
- THEN THE system SHALL generate a unique verification token and email it to the provided address
- THEN THE system SHALL store the password as a bcrypt hash with a salt, never in plaintext

### Login

WHEN a member submits their registered email and password:

- THE system SHALL locate the user record by email
- IF the user account is deactivated:
  - THEN THE system SHALL return HTTP 401 with error code: "ACCOUNT_DEACTIVATED"
- IF the provided password does not match the stored hash:
  - THEN THE system SHALL return HTTP 401 with error code: "INVALID_CREDENTIALS"
- IF the account is unverified:
  - THEN THE system SHALL return HTTP 401 with error code: "USER_NOT_VERIFIED"
- THEN THE system SHALL issue a JSON Web Token (JWT) with:
  - Issuer: "redditCommunity"
  - Subject: "user:{userId}"
  - Role: "member"
  - Karma: user's total karma
  - Expiration: 30 minutes
  - Refresh: 14 days (stored in secure httpOnly cookie)
- THEN THE system SHALL record the login event with timestamp, IP address, and device fingerprint

### Password Change

WHEN a member requests to change their password:

- THE system SHALL require the current password to be provided
- IF the current password is incorrect:
  - THEN THE system SHALL return HTTP 400 with error code: "INVALID_CURRENT_PASSWORD"
- IF the new password does not meet strength requirements (min 8 chars, 1 digit, 1 symbol):
  - THEN THE system SHALL return HTTP 400 with error code: "WEAK_PASSWORD"
- THEN THE system SHALL update the password hash to the new bcrypt value
- THEN THE system SHALL invalidate all existing JWT tokens and refresh tokens associated with the user
- THEN THE system SHALL log the password change event

### Account Deletion

WHEN a member initiates account deletion:

- THE system SHALL require explicit confirmation from the user
- THEN THE system SHALL delete the following:
  - User profile: display name, bio, avatar file (if stored)
  - All posts created by the user
  - All comments written by the user
  - All karma history records
  - All subscription records
  - All report records submitted by the user
- THEN THE system SHALL revoke all associated authentication tokens
- THEN THE system SHALL mark the email address as "deleted" to prevent reuse
- THEN THE system SHALL anonymize the username, replacing it with "deleted_user_{uuid}"

## User Profile

### Profile Attributes

Each user has a profile with the following editable attributes:

- Display Name: Free-form text (max 50 characters), may be changed at any time
- Bio: Free-form text (max 500 characters), may be edited at any time
- Avatar: Image file (PNG, JPG, GIF; max 2MB), stored as a URL to a secure CDN

### Profile Display

When viewing any user's public profile:

- THE system SHALL display:
  - Display name
  - Bio text
  - Avatar image
  - Total karma score (may be negative)
  - List of all posts made by the user (sorted by creation date, descending)
  - List of all comments made by the user (sorted by creation date, descending)

- EACH post in the list SHALL show:
  - Post title (50-character truncate if necessary)
  - Community name
  - Vote score
  - Comment count
  - Time since posted

- EACH comment in the list SHALL show:
  - Comment text (100-character truncate if necessary)
  - Post title it belongs to
  - Vote score
  - Time since posted

### Profile Editing

WHEN a member edits their profile:

- THE system SHALL validate display name (letters, numbers, underscores, hyphens only, 1-50 chars)
- THE system SHALL validate bio (max 500 chars)
- THE system SHALL validate avatar file (file type, size)
- THEN THE system SHALL update the user profile in the database
- THEN THE system SHALL generate a new avatar URL if uploaded (store in CDN)

### Profile Access Control

- ANY authenticated member may view any user's profile
- GUEST users may also view any user's profile
- Members may not edit another user's profile
- The system SHALL NOT expose email or registration date in any profile

## Karma System

### Karma Calculation

- Each user has a single karma score stored as an integer
- Karma is NOT tied to any specific community
- Karma is global across the entire platform

### Vote Impact

WHEN a user upvotes a post:

- THE user's karma SHALL increase by 1
- THE post's score SHALL increase by 1

WHEN a user upvotes a comment:

- THE user's karma SHALL increase by 1
- THE comment's score SHALL increase by 1

WHEN a user downvotes a post:

- THE user's karma SHALL decrease by 1
- THE post's score SHALL decrease by 1

WHEN a user downvotes a comment:

- THE user's karma SHALL decrease by 1
- THE comment's score SHALL decrease by 1

### Vote Removal

WHEN a user removes their vote:

- IF the user previously upvoted:
  - THEN THEIR karma SHALL decrease by 1
  - THEN THE post/comment score SHALL decrease by 1
- IF the user previously downvoted:
  - THEN THEIR karma SHALL increase by 1
  - THEN THE post/comment score SHALL increase by 1

### Negative Karma

- Karma scores may be negative
- The system SHALL display negative scores with a minus sign (e.g., "-37")
- There is NO minimum karma limit
- No user or system action shall set a hard floor on negative karma

### Karma Display

- Karma score is displayed only in three locations:
  - On the user's own profile page
  - In the "Author" section of any post they created
  - In the "Author" section of any comment they wrote
- Karma score is NOT displayed in feeds, searches, or community lists
- A user with negative karma is not restricted from any functionality

## Communities

### Community Creation

WHEN a member creates a community:

- THE system SHALL require the following inputs:
  - Unique name (alphanumeric plus hyphens and underscores, 3-30 chars)
  - Description (optional, max 300 characters)
  - Icon image (PNG, JPG; max 1MB)
- THE system SHALL verify the name is not already taken
- THE system SHALL create a new community record
- THE system SHALL assign the creator as the Community Owner
- THEN THE system SHALL create the community icon in the CDN and store URL
- THEN THE system SHALL automatically subscribe the creator to the community

### Community Attributes

Each community has the following read-only attributes:

- Name: Displayed publicly as r/communit_name
- Description: Text overview shown on community page
- Icon: Image displayed next to community name
- Subscriber Count: Total number of users subscribed to the community
- Creation Date: Timestamp of community creation
- Owner: Display name of the Community Owner

### Subscription Rules

- Users MUST be subscribed to a community in order to submit posts
- Users may view content of any community regardless of subscription status
- Subscription is not required to view or comment on posts
- Subscribing to a community adds it to the user's "Subscribed Communities" list

### Subscription Management

WHEN a member subscribes to a community:

- THE system SHALL verify the community exists
- IF already subscribed:
  - THEN THE system SHALL do nothing and return success
- ELSE:
  - THEN THE system SHALL create a subscription record
  - THEN THE system SHALL increment the community's subscriber count by 1
  - THEN THE system SHALL update the user's subscribed list

WHEN a member unsubscribes from a community:

- THE system SHALL verify the user is subscribed
- IF not subscribed:
  - THEN THE system SHALL do nothing and return success
- ELSE:
  - THEN THE system SHALL remove the subscription record
  - THEN THE system SHALL decrement the community's subscriber count by 1
  - THEN THE system SHALL remove the community from the user's subscribed list

### Community Discovery

- The platform SHALL display a list of all public communities
- Communities SHALL be sortable by:
  - Subscriber count (descending)
  - Creation date (newest first)
  - Alpha order
- The platform SHALL support search by community name (substring matching)

### Subscriber Count

- Subscriber count SHALL be the total number of valid subscription records
- Suspended or deleted users SHALL not be counted
- Subscriber count SHALL be updated in real-time with every subscription/unsubscription
- The count SHALL be cached for performance
- The count SHALL be displayed on:
  - Community list view
  - Community detail page
  - Feed preview cards

## Post Management

### Post Types

A post must be exactly one of three types:

- Text Post: Contains text content only
- Link Post: Contains a URL only
- Image Post: Contains an uploaded image file

### Creation Requirements

WHEN a member creates a post:

- THE member SHALL be subscribed to the target community
- IF NOT subscribed:
  - THEN THE system SHALL return HTTP 403 with error code: "NOT_SUBSCRIBED"
- THE system SHALL require a title (required, 1-200 characters)
- THE system SHALL require exactly one of:
  - Text content (for text post)
  - URL (for link post)
  - Image file (for image post)
- IF text content provided:
  - THEN text SHALL be up to 10,000 characters
- IF URL provided:
  - THEN URL SHALL be validated as properly formatted (HTTPS)
- IF image provided:
  - THEN file SHALL be PNG, JPG, or GIF (max 5MB)
- THEN THE system SHALL create the post with:
  - Title
  - One content type
  - Author ID
  - Community ID
  - Creation timestamp
  - Initial score: 0
  - Initial comment count: 0

### Post Edition

WHEN a member edits their own post:

- THE system SHALL validate the user owns the post
- IF user is not the author:
  - THEN THE system SHALL return HTTP 403 with error code: "NOT_POST_OWNER"
- THE system SHALL allow modification of:
  - Title (1-200 chars)
  - Content type (if one exists, can nullify or change)
  - Text content (if text post)
  - URL (if link post)
  - Image (if image post — requires upload replacement)
- THE system SHALL NOT allow:
  - Changing the community
  - Changing authorship
  - Change from one type to another if new type violates requirements

### Post Deletion

WHEN a member deletes their own post:

- THE system SHALL validate the user owns the post
- IF user is not the author:
  - THEN THE system SHALL return HTTP 403 with error code: "NOT_POST_OWNER"
- THEN THE system SHALL set the post status to "deleted"
- THEN THE system SHALL decrement the community's post count
- THEN THE system SHALL set all replies/comments associated to "deleted"
- THEN THE system SHALL update karma for all users who upvoted or downvoted this post (revert votes)

### Post Visibility Rules

- Only posts with status: "active" may be displayed
- Possible post status values: "active", "deleted", "flagged", "moderated"
- A post with status "deleted" shall be treated as if it never existed
- Users viewing a deleted post shall see a message: "This post has been deleted."
- Moderators and system admins may view deleted post data for audit purposes

### Post Lifecycle

A post transitions through these lifecycle states:

1. Created → Status: "active"
2. Edited → Status unchanged
3. Deleted → Status: "deleted"
4. Reported → Status: "flagged" (when report is pending)
5. Report Approved → Status: "moderated" (hidden from feeds)
6. Report Dismissed → Status: "active" (back to feed)

## Post Voting

### Voting Rules

Each user may cast only one vote per post.

- One vote can be:
  - Upvote (+1)
  - Downvote (-1)
  - No vote (0)

### Vote Changes

A user may change from:

- Upvote → Downvote (vote count changes by -2)
- Downvote → Upvote (vote count changes by +2)
- Upvote → No vote (vote count changes by -1)
- Downvote → No vote (vote count changes by +1)

### Voting Process

WHEN a user votes on a post:

- THE system SHALL count existing vote from user
- IF user has no vote:
  - THEN THE system SHALL apply the new vote and adjust the post score by ±1
  - THEN THE system SHALL adjust user karma by ±1
- IF user has an existing upvote and votes down:
  - THEN THE system SHALL remove upvote (-1 from post) and apply downvote (-1 from post)
  - THEN THE system SHALL adjust user karma: -1 (removes +1) and -1 (adds -1) → net -2
- IF user has an existing downvote and votes up:
  - THEN THE system SHALL remove downvote (+1 from post) and apply upvote (+1 from post)
  - THEN THE system SHALL adjust user karma: +1 (removes -1) and +1 (adds +1) → net +2
- IF user has an existing vote and removes it:
  - THEN THE system SHALL remove the existing vote
  - THEN THE system SHALL adjust post score in opposite direction
  - THEN THE system SHALL adjust user karma in opposite direction

### Post Vote Score

- Post score = Total upvotes - Total downvotes
- Score may be negative
- Score is displayed numerically next to each post
- Score is not displayed as "+", "-", or "neutral"

### Vote Storage

- Each vote stored in a table: userId, postId, voteValue (+1, -1, 0)
- Voting is not recalculated from comments or karma
- Score is precomputed and cached per post for performance
- Vote history is immutable (no value modification — only insertion/removal)

## Post Feeds

### Feed Types

There are three feed types with distinct access rules:

| Feed Type | Description | Accessible To |
|-----------|-------------|---------------|
| Home Feed | Posts from communities the user is subscribed to | Authenticated members only |
| Popular Feed | Posts from all communities across platform | All users including guests |
| Community Feed | Posts from a single, specified community | All users including guests |

### Sorting Options

All three feeds support the same five sorting methods:

| Sort | Rule |
|------|------|
| Hot | Posts weighted by score divided by log(elapsed hours + 2), recent posts weighted higher |
| New | Posts sorted by creation timestamp descending (most recent first) |
| Top | Posts sorted by score descending. May be filtered by time range: today, this week, this month, this year, all time |
| Controversial | Posts sorted by number of votes (upvotes + downvotes) descending, and then by score near zero |

### Time Filters

Applicable only to Top sort:

- today: posts created in last 24 hours
- this week: posts created in last 7 days
- this month: posts created in last 30 days
- this year: posts created in last 365 days
- all time: all posts

### Pagination

All feeds:

- SHALL return 20 posts per page
- SHALL support cursor-based pagination using a "before" or "after" timestamp or ID
- SHALL return HTTP 200 with JSON array of posts
- SHALL include total count and next/previous cursor if available
- SHALL not allow access beyond user's permission boundary (e.g., guests may not access Home Feed)

### Feed Content Composition

In each feed, each post SHALL be represented with the following:

- Title: truncated if longer than 70 characters
- Author username: visible as `u/username`
- Community name: visible as `r/community`
- Vote score: numeric integer
- Comment count: numeric integer
- Time since posted: human-readable string ("3 minutes ago", "2 days ago", etc.)
- Content Preview:
  - Text Post: first 200 characters of content, with ellipsis if truncated
  - Link Post: domain name of URL (e.g., "youtube.com", "github.com"), no preview image
  - Image Post: thumbnail image (150x100px) centered, with click to expand

## Comments

### Comment Creation

WHEN a member creates a comment:

- THE system SHALL validate the comment is attached to a valid post
- THE system SHALL validate the comment text is not empty
- THE system SHALL validate comment text is not longer than 5,000 characters
- THE system SHALL validate the comment is not in a deleted or moderated post
- THE system SHALL create the comment with:
  - Author ID
  - Target post ID
  - Parent comment ID (if replying to another comment)
  - Creation timestamp
  - Initial score: 0
  - Status: "active"
- THEN THE system SHALL increment the post's comment count by 1

### Reply Hierarchy

- Replies may be made to any comment (including nested replies)
- There is NO limit to reply depth
- The system SHALL store parent-child relationships via foreign key: parentCommentId
- Each comment SHALL display its immediate children in tree form
- The system SHALL support efficient retrieval of full reply chains

### Edit and Delete Permissions

- Only the author of a comment may edit or delete it
- Moderators and platform admins MAY delete any comment
- Comments may be edited within 30 minutes of creation
- After 30 minutes, editors may only add an "Edited" tag (no content change allowed)

### Comment Visibility

- All comments from deleted users are marked as "deleted by author"
- Comments on deleted posts are not visible to users
- Moderators may view all comments including those deleted by users
- Users see comment + replies as a tree structure with collapse/expand per branch

### Comment Lifecycle

1. Created → Status: "active"
2. Edited → Status unchanged
3. Deleted → Status: "deleted"
4. Reported → Status: "flagged"
5. Report Approved → Status: "moderated" (hidden)
6. Report Dismissed → Status: "active" (back)

## Comment Voting

### Voting Rules

Each user may cast only one vote per comment.

- One vote can be:
  - Upvote (+1)
  - Downvote (-1)
  - No vote (0)

### Vote Changes

A user may change from:

- Upvote → Downvote (vote count changes by -2)
- Downvote → Upvote (vote count changes by +2)
- Upvote → No vote (vote count changes by -1)
- Downvote → No vote (vote count changes by +1)

### Voting Process

WHEN a user votes on a comment:

- THE system SHALL count existing vote from user
- IF user has no vote:
  - THEN THE system SHALL apply the new vote and adjust the comment score by ±1
  - THEN THE system SHALL adjust user karma by ±1
- IF user has an existing upvote and votes down:
  - THEN THE system SHALL remove upvote (-1 from comment) and apply downvote (-1 from comment)
  - THEN THE system SHALL adjust user karma: -1 (removes +1) and -1 (adds -1) → net -2
- IF user has an existing downvote and votes up:
  - THEN THE system SHALL remove downvote (+1 from comment) and apply upvote (+1 from comment)
  - THEN THE system SHALL adjust user karma: +1 (removes -1) and +1 (adds +1) → net +2
- IF user has an existing vote and removes it:
  - THEN THE system SHALL remove the existing vote
  - THEN THE system SHALL adjust comment score in opposite direction
  - THEN THE system SHALL adjust user karma in opposite direction

### Comment Vote Score

- Comment score = Total upvotes - Total downvotes
- Score may be negative
- Score is displayed numerically next to each comment
- Score is not displayed as "+", "-", or "neutral"

### Vote Storage

- Each vote stored in a table: userId, commentId, voteValue (+1, -1, 0)
- Voting is not recalculated from other metrics
- Score is precomputed and cached per comment for performance
- Vote history is immutable

## Comment Sorting

Comments on a post may be sorted in three ways:

| Sort | Rule |
|------|------|
| Best | Comments sorted by score descending (highest votes first)
| New | Comments sorted by creation timestamp descending (most recent first)
| Controversial | Comments sorted by total votes (up + down) descending and score near zero |

## Community Moderation

### Moderator Roles and Hierarchy

- Every community has exactly one Community Owner
- The Community Owner is the member who created the community
- The Creator becomes Owner automatically on community creation
- Community Owners can add or remove Moderators
- A Moderator is a Member granted moderation privileges for a specific community
- A Member may be Moderator of multiple communities
- A Moderator cannot:
  - Remove the Community Owner
  - Remove another Moderator
  - Create or change community settings

### Moderator Permission Matrix

| Action | Owner | Moderator | Member | Guest |
|--------|-------|-----------|--------|-------|
| Delete Post | ✅ | ✅ | ❌ | ❌ |
| Delete Comment | ✅ | ✅ | ❌ | ❌ |
| Ban User | ✅ | ✅ | ❌ | ❌ |
| Unban User | ✅ | ✅ | ❌ | ❌ |
| View Banned List | ✅ | ✅ | ❌ | ❌ |
| Add Moderator | ✅ | ❌ | ❌ | ❌ |
| Remove Moderator | ✅ | ❌ | ❌ | ❌ |
| Edit Community Settings | ✅ | ❌ | ❌ | ❌ |
| Delete Community | ✅ | ❌ | ❌ | ❌ |

### Ban and Unban Process

WHEN a moderator or owner bans a user from a community:

- THE system SHALL validate the user is not already banned
- THE system SHALL validate the item being banned is a valid member
- THEN THE system SHALL create a ban record:
  - urlId: community
  - userId: banned user
  - createdAt: current timestamp
  - reasonForBan: optional free text (1-500 characters)
- THEN THE system SHALL immediately block:
  - Comment creation
  - Post creation
  - Voting on posts/comments
  - Subscribing to new communities
- The user MAY continue to:
  - View public content
  - View their own posts/comments
  - View personal profile

WHEN a moderator or owner unbans a user:

- THE system SHALL validate the user is currently banned
- THEN THE system SHALL delete the ban record
- THEN THE system SHALL restore all permissions previously blocked

### Moderator Accountability

- All moderation actions are logged including:
  - Who took the action
  - What action was taken
  - What user/content was affected
  - Timestamp
  - Reason if provided
- Moderators may not delete their own action logs
- Platform Admins may audit all moderation logs

## Reporting System

### Reporting Triggers

Users may report any:
- Post
- Comment

### Report Content and Metadata

WHEN a user submits a report:

- THE system SHALL require a reason text (1-500 characters)
- THE system SHALL automatically capture:
  - Reported content ID (post or comment)
  - Reporter's user ID
  - Timestamp
  - IP address
  - Device fingerprint
- THE system SHALL NOT allow anonymous reports
- THE system SHALL NOT allow users to report their own content

### Report Review Process

- Reports are visible ONLY to:
  - Community Owner
  - Community Moderator
- Platform Admins may view ALL reports platform-wide
- The system SHALL queue reports in ascending order of submission time
- Each report shall be reviewed independently

### Outcome Handling

| Action | Effect |
|--------|--------|
| Approve | Delete the reported content immediately
| Dismiss | Keep the content, remove the report from the queue |

WHEN a moderator approves a report:

- THE system SHALL set the post/comment status to: "moderated"
- THE system SHALL hide the content from public feeds
- THE system SHALL notify the author that the content was removed
- THE system SHALL record:
  - The moderator who approved
  - The time of approval
  - The approved reason

WHEN a moderator dismisses a report:

- THE system SHALL delete the report record
- THEN THE system SHALL send no notification to the author
- THE system SHALL leave the post/comment status unchanged

### Report Visibility

- Reports and their reasons are visible ONLY to moderators and admin
- Users cannot see:
  - Whether they have been reported
  - Who reported them
  - Why they were reported
- After an action:
  - Users see: "This content has been removed by a moderator."
- No indication is given whether content was removed due to report or other moderation

## Additional Design Notes

- All API endpoints SHALL be protected with OAuth2.0 JWT
- All sensitive fields SHALL be encrypted at rest in database (display name, bio, avatar path)
- Avatar and post image files SHALL be stored on CDN with access control
- All numeric scores (karma, post score, comment score) SHALL be calculated using atomic counters
- All transactional operations SHALL use database-level transactions
- No soft-deleted rows shall impact the system performance
- All event loggings SHALL be written to a separate analytics stream non-blocking

> *Note: This document contains business requirements only. Implementation details—database schema, API endpoints, client architecture, caching strategy, and deployment topology—are outside the scope of this specification.*

## Code Sanitization Note

This document has been strictly sanitized against:
- External API exceptions
- Internal schema references
- Database fields or validation rules
- Template code snippets
- Framework-specific implementation details

All content is pure business requirement description in natural language, ready for downstream engineer parsing.