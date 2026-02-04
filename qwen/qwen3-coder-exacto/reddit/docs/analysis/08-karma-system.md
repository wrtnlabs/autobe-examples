# Reddit-like Community Platform Requirements Specification

## Overview

This document specifies the complete requirements for a Reddit-like community platform that enables users to create accounts, participate in communities, share content, and engage through voting and commenting systems. The platform implements a karma-based reputation system, community moderation features, and multiple content feeds.

## 1. User Account System

### 1.1 User Registration

WHEN a user accesses the platform, THE system SHALL provide a registration interface requiring email address, password, and unique username.

WHEN a user submits registration information, THE system SHALL validate:
- Email format compliance with RFC 5322 standards
- Password strength (minimum 8 characters with at least one uppercase letter, one lowercase letter, one number, and one special character)
- Username uniqueness across the platform
- Username length between 3-20 characters
- Username containing only alphanumeric characters and underscores

WHEN a user attempts to register with an email that already exists, THE system SHALL reject the registration and display an appropriate error message.

WHEN a user attempts to register with a username that already exists, THE system SHALL reject the registration and suggest alternative usernames.

WHEN a user successfully completes registration, THE system SHALL:
- Create a user account with initial karma score of 0
- Send a verification email to the provided address
- Redirect the user to a profile completion page

### 1.2 User Authentication

WHEN a user accesses the login interface, THE system SHALL require email and password for authentication.

WHEN a user submits valid credentials, THE system SHALL:
- Generate a secure JWT token with 24-hour expiration
- Associate the token with the user session
- Redirect the user to their home feed

WHEN a user submits invalid credentials, THE system SHALL reject the authentication attempt and display an appropriate error message.

WHEN a user's JWT token expires, THE system SHALL redirect them to the login page.

### 1.3 Password Management

WHEN an authenticated user accesses the password change interface, THE system SHALL require:
- Current password for verification
- New password meeting strength requirements
- Confirmation of new password

WHEN a user submits a valid password change request, THE system SHALL update the user's password and invalidate all existing sessions except the current one.

WHEN a user submits an invalid current password during password change, THE system SHALL reject the request and display an appropriate error message.

### 1.4 Account Deletion

WHEN an authenticated user initiates account deletion, THE system SHALL require password confirmation for security.

WHEN a user confirms account deletion with valid credentials, THE system SHALL:
- Permanently delete the user account
- Remove all posts created by the user
- Remove all comments created by the user
- Remove all votes cast by the user
- Remove all karma contributions made by the user's votes
- Remove user from all community subscriptions
- Remove user from all moderator roles
- Remove all reports filed by the user
- Send confirmation email about account deletion

## 2. User Profile System

### 2.1 Profile Information

THE system SHALL maintain the following profile information for each user:
- Display name (optional, up to 50 characters)
- Bio text (optional, up to 500 characters)
- Avatar image (optional, up to 5MB JPEG/PNG)

WHEN a user accesses their profile editing interface, THE system SHALL allow modification of display name, bio, and avatar.

WHEN a user uploads an avatar image, THE system SHALL validate:
- File format is JPEG or PNG
- File size does not exceed 5MB
- Image dimensions are between 100x100 and 2000x2000 pixels

WHEN a user submits valid profile updates, THE system SHALL save the changes and update the profile display immediately.

### 2.2 Public Profile Display

WHEN any user accesses another user's public profile page, THE system SHALL display:
- User's display name or username if display name is not set
- User's bio text
- User's avatar image or default avatar if not set
- User's current total karma score
- Paginated list of all posts created by the user
- Paginated list of all comments written by the user

WHEN the profile page loads, THE system SHALL sort the user's posts by creation date (newest first) with 10 posts per page.

WHEN the profile page loads, THE system SHALL sort the user's comments by creation date (newest first) with 10 comments per page.

## 3. Karma System

### 3.1 Karma Calculation Rules

THE karma system SHALL track a single numerical score for each user that represents their reputation on the platform.

THE system SHALL initialize each user's karma score to zero upon account creation.

WHEN a user creates a post that receives an upvote, THE system SHALL increase the post author's karma by 1.

WHEN a user creates a comment that receives an upvote, THE system SHALL increase the comment author's karma by 1.

WHEN a user creates a post that receives a downvote, THE system SHALL decrease the post author's karma by 1.

WHEN a user creates a comment that receives a downvote, THE system SHALL decrease the comment author's karma by 1.

WHEN a user changes their vote on a post from upvote to downvote, THE system SHALL decrease the post author's karma by 2 (remove the +1 from upvote and apply -1 for downvote).

WHEN a user changes their vote on a comment from upvote to downvote, THE system SHALL decrease the comment author's karma by 2 (remove the +1 from upvote and apply -1 for downvote).

WHEN a user changes their vote on a post from downvote to upvote, THE system SHALL increase the post author's karma by 2 (remove the -1 from downvote and apply +1 for upvote).

WHEN a user changes their vote on a comment from downvote to upvote, THE system SHALL increase the comment author's karma by 2 (remove the -1 from downvote and apply +1 for upvote).

WHEN a user removes their upvote from a post, THE system SHALL decrease the post author's karma by 1.

WHEN a user removes their upvote from a comment, THE system SHALL decrease the comment author's karma by 1.

WHEN a user removes their downvote from a post, THE system SHALL increase the post author's karma by 1.

WHEN a user removes their downvote from a comment, THE system SHALL increase the comment author's karma by 1.

THE system SHALL allow a user's karma score to be negative when they receive more downvotes than upvotes.

WHEN a user deletes their account, THE system SHALL remove all karma contributions made by that user's votes on other users' content.

WHEN a user's post or comment that received votes is deleted, THE system SHALL adjust the karma scores of users who voted on that content by removing those votes from the calculation.

### 3.2 Voting Impact on Karma

THE system SHALL associate each vote with the user who cast it to track its impact on karma scores.

WHEN a user votes on a post or comment, THE system SHALL immediately update the content creator's karma score according to the calculation rules.

THE system SHALL prevent users from voting multiple times on the same post or comment.

WHEN a user attempts to vote multiple times on the same post or comment, THE system SHALL reject subsequent votes and maintain the original vote.

THE system SHALL allow users to change their existing vote on a post or comment.

WHEN a user changes an existing vote on a post or comment, THE system SHALL update the content creator's karma score with the new vote value using the change calculation rules.

THE system SHALL record the timestamp when each vote is cast for audit purposes.

### 3.3 Karma Display

THE system SHALL display each user's total karma score on their profile page.

THE profile page SHALL show the user's karma score as a single numerical value that can be positive, negative, or zero.

THE system SHALL display karma scores in the user list views alongside usernames.

WHEN displaying a post in any feed, THE system SHALL show the author's karma score alongside their username.

WHEN displaying a comment, THE system SHALL show the author's karma score alongside their username.

THE system SHALL format negative karma scores with a minus sign prefix (e.g., -42).

THE system SHALL format positive karma scores with a plus sign prefix when emphasizing score changes (e.g., +1) but may display without the plus sign in general contexts (e.g., 42).

### 3.4 Karma Effects on User Experience

THE system SHALL NOT restrict basic user functionality (posting, commenting, voting) based on karma scores.

THE system SHALL sort comments by "Best" using karma score as the primary factor in the algorithm.

THE system SHALL calculate post "Hot" ranking using karma score as one of the factors alongside time since posting.

THE system SHALL calculate post "Top" ranking using karma score as the primary factor.

THE system SHALL calculate post "Controversial" ranking using karma score along with vote distribution metrics.

THE system SHALL allow moderators to view user karma scores when reviewing content.

THE system SHALL sort users by karma score in community member lists when requested by moderators.

## 4. Community System

### 4.1 Community Creation

WHEN an authenticated user accesses the community creation interface, THE system SHALL require:
- Unique community name (3-21 characters, alphanumeric and underscores only)
- Community description text (optional, up to 1000 characters)
- Community icon image (optional, up to 5MB JPEG/PNG)

WHEN a user submits valid community creation information, THE system SHALL:
- Create the community with the user as owner
- Automatically subscribe the creator to the community
- Generate a unique community identifier
- Initialize subscriber count to 1

WHEN a user attempts to create a community with a name that already exists, THE system SHALL reject the creation and display an appropriate error message.

### 4.2 Community Discovery

THE system SHALL provide a community listing page showing all communities sorted by subscriber count (descending) by default.

WHEN a user accesses the community listing page, THE system SHALL display communities in paginated groups of 20.

THE system SHALL provide search functionality allowing users to find communities by name with partial matching.

WHEN a user searches for communities, THE system SHALL return results sorted by relevance score with exact matches first.

WHEN displaying communities in listings, THE system SHALL show:
- Community name
- Community description (truncated to 150 characters)
- Current subscriber count
- Community icon (or default icon if not set)

### 4.3 Community Subscription

WHEN an authenticated user views a community page, THE system SHALL display subscribe/unsubscribe button based on current subscription status.

WHEN a user clicks the subscribe button, THE system SHALL:
- Add the user to the community's subscriber list
- Increment the community's subscriber count
- Enable posting privileges in that community

WHEN a user clicks the unsubscribe button, THE system SHALL:
- Remove the user from the community's subscriber list
- Decrement the community's subscriber count
- Remove posting privileges in that community

WHEN a user accesses their subscribed communities page, THE system SHALL display a list of all communities they are subscribed to sorted by subscription date (newest first).

## 5. Posting System

### 5.1 Post Creation

WHEN an authenticated user accesses the post creation interface for a community they are subscribed to, THE system SHALL provide options for three post types:
- Text post (requires title and content)
- Link post (requires title and URL)
- Image post (requires title and image upload)

WHEN a user submits a text post, THE system SHALL validate:
- Title (1-300 characters)
- Content (1-10000 characters)

WHEN a user submits a link post, THE system SHALL validate:
- Title (1-300 characters)
- URL (valid HTTP/HTTPS format, maximum 2000 characters)

WHEN a user submits an image post, THE system SHALL validate:
- Title (1-300 characters)
- Image file (JPEG/PNG, maximum 10MB)

WHEN a user attempts to create a post in a community they are not subscribed to, THE system SHALL reject the request and redirect them to the community page to subscribe first.

### 5.2 Post Display

WHEN displaying a single post page, THE system SHALL show:
- Post title
- Post content (full text, link, or image)
- Post author username and karma score
- Community name
- Current vote score
- Comment count
- Creation timestamp in "X time ago" format
- Edit and delete buttons if the viewer is the post author
- Voting controls (upvote, downvote, remove vote)

WHEN displaying posts in feeds, THE system SHALL show:
- Title
- Author username and karma score
- Community name
- Vote score
- Comment count
- Time since posted (e.g., "3 hours ago")
- First 200 characters of text content for text posts
- Thumbnail of image for image posts
- Domain name of URL for link posts

### 5.3 Post Management

WHEN the post author accesses their post, THE system SHALL display edit and delete options.

WHEN a user edits their post, THE system SHALL validate content according to the original post type requirements and update the post with a modification timestamp.

WHEN a user deletes their post, THE system SHALL:
- Permanently remove the post
- Remove associated comments
- Remove all votes on the post
- Adjust karma scores of users who voted on the post
- Update comment counts in feeds

### 5.4 Post Voting

THE system SHALL allow authenticated users to vote on any post.

WHEN a user upvotes a post, THE system SHALL:
- Record the upvote
- Increase the post's vote score by 1
- Increase the post author's karma by 1

WHEN a user downvotes a post, THE system SHALL:
- Record the downvote
- Decrease the post's vote score by 1
- Decrease the post author's karma by 1

WHEN a user changes their vote from upvote to downvote, THE system SHALL:
- Update the vote record
- Decrease the post's vote score by 2
- Decrease the post author's karma by 2

WHEN a user changes their vote from downvote to upvote, THE system SHALL:
- Update the vote record
- Increase the post's vote score by 2
- Increase the post author's karma by 2

WHEN a user removes their vote, THE system SHALL:
- Delete the vote record
- Adjust the post's vote score accordingly
- Adjust the post author's karma accordingly

THE system SHALL prevent users from voting multiple times on the same post and shall reject subsequent vote attempts.

## 6. Post Feed System

### 6.1 Feed Types

THE system SHALL provide three distinct post feeds:

1. Home Feed: Shows posts only from communities the user is subscribed to (authenticated users only)
2. Popular Feed: Shows posts from all communities across the platform (available to all users)
3. Community Feed: Shows posts from one specific community (available to all users)

### 6.2 Feed Sorting Options

ALL three feeds SHALL support the following sorting options:

WHEN a user selects "Hot" sorting, THE system SHALL display recent posts with many upvotes first using an algorithm that factors vote score and time since posting.

WHEN a user selects "New" sorting, THE system SHALL display the most recently created posts first.

WHEN a user selects "Top" sorting, THE system SHALL display highest vote score posts first with support for time filters:
- Today: Posts from the last 24 hours
- This week: Posts from the last 7 days
- This month: Posts from the last 30 days
- This year: Posts from the last 365 days
- All time: All posts regardless of creation date

WHEN a user selects "Controversial" sorting, THE system SHALL display posts with many votes but score close to zero first using an algorithm based on total vote count versus score difference.

### 6.3 Feed Display Requirements

WHEN displaying any feed, THE system SHALL use pagination with 25 posts per page.

WHEN a user navigates between feed pages, THE system SHALL maintain the selected sorting option and apply it consistently.

WHEN an unauthenticated user accesses a feed restricted to authenticated users, THE system SHALL redirect to the login page.

## 7. Comment System

### 7.1 Comment Creation and Structure

WHEN an authenticated user accesses the comment creation interface on any post, THE system SHALL provide a text input field for comment content.

WHEN a user submits a comment, THE system SHALL validate:
- Content length between 1-10000 characters
- Association with a valid post

WHEN a user creates a comment in reply to another comment, THE system SHALL establish a parent-child relationship allowing unlimited nesting depth.

THE system SHALL display nested comments with visual indentation to indicate hierarchy levels.

WHEN displaying a comment, THE system SHALL show:
- Author username and karma score
- Comment content
- Current vote score
- Creation timestamp in "X time ago" format
- Reply button for authenticated users
- Edit and delete buttons if the viewer is the comment author
- Voting controls (upvote, downvote, remove vote)

### 7.2 Comment Management

WHEN the comment author accesses their comment, THE system SHALL display edit and delete options.

WHEN a user edits their comment, THE system SHALL validate content length and update the comment with a modification timestamp.

WHEN a user deletes their comment, THE system SHALL:
- Mark the comment as deleted (retaining placeholder for reply context)
- Remove comment content
- Remove all votes on the comment
- Adjust karma scores of users who voted on the comment

### 7.3 Comment Voting

THE system SHALL allow authenticated users to vote on any comment.

WHEN a user upvotes a comment, THE system SHALL:
- Record the upvote
- Increase the comment's vote score by 1
- Increase the comment author's karma by 1

WHEN a user downvotes a comment, THE system SHALL:
- Record the downvote
- Decrease the comment's vote score by 1
- Decrease the comment author's karma by 1

WHEN a user changes their vote from upvote to downvote, THE system SHALL:
- Update the vote record
- Decrease the comment's vote score by 2
- Decrease the comment author's karma by 2

WHEN a user changes their vote from downvote to upvote, THE system SHALL:
- Update the vote record
- Increase the comment's vote score by 2
- Increase the comment author's karma by 2

WHEN a user removes their vote, THE system SHALL:
- Delete the vote record
- Adjust the comment's vote score accordingly
- Adjust the comment author's karma accordingly

THE system SHALL prevent users from voting multiple times on the same comment and shall reject subsequent vote attempts.

### 7.4 Comment Sorting

WHEN displaying comments on a post, THE system SHALL support the following sorting options:

WHEN a user selects "Best" sorting, THE system SHALL display comments with highest vote score first, factoring in recency.

WHEN a user selects "New" sorting, THE system SHALL display the most recently created comments first.

WHEN a user selects "Controversial" sorting, THE system SHALL display comments with many votes but score close to zero first.

## 8. Community Moderation System

### 8.1 Moderator Roles and Hierarchy

THE community creator SHALL automatically become the owner with highest authority in the community.

WHEN the community owner accesses the moderator management interface, THE system SHALL allow them to add existing community members as moderators.

WHEN the community owner accesses the moderator management interface, THE system SHALL allow them to remove any moderator from the community.

WHEN a moderator accesses the moderator management interface, THE system SHALL allow them to add other moderators.

WHEN a moderator accesses the moderator management interface, THE system SHALL NOT allow them to remove other moderators or the owner.

THE system SHALL maintain a clear hierarchy where the owner has ultimate authority over all moderation actions.

### 8.2 Moderator Actions

WHEN a moderator accesses the content management interface, THE system SHALL allow them to delete any post in their community regardless of author.

WHEN a moderator deletes a post, THE system SHALL:
- Permanently remove the post
- Remove associated comments
- Remove all votes on the post
- Adjust karma scores of users who voted on the post

WHEN a moderator accesses the content management interface, THE system SHALL allow them to delete any comment in their community regardless of author.

WHEN a moderator deletes a comment, THE system SHALL:
- Mark the comment as deleted (retaining placeholder for reply context)
- Remove comment content
- Remove all votes on the comment
- Adjust karma scores of users who voted on the comment

WHEN a moderator accesses the user management interface, THE system SHALL allow them to ban any user from the community.

WHEN a moderator bans a user, THE system SHALL:
- Prevent the user from creating new posts in the community
- Prevent the user from creating new comments in the community
- Prevent the user from voting in the community
- Allow the user to continue viewing community content
- Log the ban event with timestamp and moderator information

WHEN a moderator accesses the user management interface, THE system SHALL allow them to unban previously banned users.

WHEN a user is unbanned, THE system SHALL restore their ability to post, comment, and vote in that community.

WHEN a moderator accesses the user management interface, THE system SHALL display a list of currently banned users with ban dates and banning moderators.

## 9. Reporting System

### 9.1 Report Creation

WHEN an authenticated user views a post or comment, THE system SHALL display a report option.

WHEN a user selects the report option, THE system SHALL present a form requiring:
- Selection of report reason from predefined categories
- Optional text explanation (1-1000 characters)

THE system SHALL provide the following predefined report reasons:
- Spam
- Harassment
- Hate speech
- Violence or harmful content
- Copyright violation
- Other

WHEN a user submits a valid report, THE system SHALL:
- Record the report with timestamp
- Associate the report with the content and reporting user
- Notify all community moderators of the new report
- Prevent duplicate reports from the same user on the same content

### 9.2 Report Management

WHEN a moderator accesses the report management interface, THE system SHALL display all reports for their community sorted by submission time (newest first).

WHEN displaying reports, THE system SHALL show:
- The reported content (title for posts, excerpt for comments)
- The user who reported the content
- The reason provided for the report
- Timestamp of the report submission
n- Approve button to delete the content
- Dismiss button to reject the report

### 9.3 Report Resolution

WHEN a moderator approves a report, THE system SHALL:
- Delete the reported content according to the appropriate deletion rules
- Remove the report from the active list
- Notify the content author of the deletion
- Log the resolution with moderator information

### 9.4 Report Dismissal

WHEN a moderator dismisses a report, THE system SHALL:
- Remove the report from the active list
- Retain the reported content
- Log the dismissal with moderator information

### 9.5 Report Notifications

WHEN a user's content is deleted due to an approved report, THE system SHALL send a notification to the content author explaining the action.

WHEN a report is dismissed, THE system SHALL NOT notify the reporting user of the decision.

## 10. System Performance and Access Requirements

### 10.1 Pagination Requirements

THE system SHALL implement pagination for all list views with consistent page sizes:
- User posts and comments on profile pages: 10 items per page
- Community listings: 20 items per page
- Feed displays: 25 items per page
- Comment threads: 15 top-level comments per page with unlimited nesting
- Report lists: 20 items per page
- Moderator lists: 30 items per page
- Banned user lists: 30 items per page

### 10.2 Access Control Requirements

THE system SHALL implement the following access controls:

GUEST users (unauthenticated):
- Browse communities
- View community feeds
- View popular feeds
- View individual posts and comments
- Access registration and login pages

MEMBER users (authenticated):
- All guest privileges
- Create and manage their own posts
- Create and manage their own comments
- Vote on posts and comments
- Subscribe to communities
- Report content
- Edit profile information
- Change password

MODERATOR users:
- All member privileges
- Delete any post in their community
- Delete any comment in their community
- Ban and unban users from their community
- View and manage reports in their community
- Add other moderators

OWNER users:
- All moderator privileges
- Remove any moderator from their community
- Transfer ownership (if implemented)

### 10.3 Performance Requirements

WHEN a user requests any page, THE system SHALL deliver the response within 2 seconds for 95% of requests.

WHEN displaying feeds, THE system SHALL optimize queries to retrieve paginated results efficiently, supporting up to 1 million posts.

THE system SHALL cache frequently accessed content (community information, popular posts) to reduce database load.

THE system SHALL support concurrent users with minimum impact on performance degradation.

### 10.4 Data Integrity Requirements

THE system SHALL maintain referential integrity between all related entities (users, posts, comments, communities, votes).

WHEN a user is deleted, THE system SHALL cascade delete all associated content while preserving references for statistical purposes.

THE system SHALL maintain audit logs for all moderation actions and content deletions.

THE system SHALL implement proper error handling and logging for all critical operations.