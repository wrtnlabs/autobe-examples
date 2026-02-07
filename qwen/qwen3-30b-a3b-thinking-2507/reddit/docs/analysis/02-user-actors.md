# Community Platform Requirements

## 1. Service Overview
This application enables users to create and manage communities similar to Reddit where members can create posts, comment, vote, and interact based on community subscriptions. The system prioritizes user experience through community-focused features and comprehensive moderation tools.

## 2. User Account Management

### Core Authentication Requirements

WHEN a user initiates registration, THE system SHALL require a unique email address, password, and username with minimum 3-character length.  
IF the email is already registered, THEN THE system SHALL reject registration and display the error message "Email already in use."  
WHEN a user provides a password with fewer than 8 characters or lacking special characters, THEN THE system SHALL reject registration and display "Password must be at least 8 characters and contain special characters."  
WHEN a user submits login credentials, THE system SHALL validate credentials against the database and return a session token if valid.  
WHEN a user enters an incorrect password, THEN THE system SHALL increment a failed login counter and deny access after 3 consecutive failures, displaying "Too many failed attempts - please try again in 15 minutes."  
WHEN a user requests a password change, THE system SHALL send a password reset email with a time-limited token.  
WHEN a user confirms password change via reset link, THE system SHALL update the password and invalidate all active sessions for that user.  
WHEN a user deletes their account, THE system SHALL permanently remove all associated data including posts, comments, karma, and profile information without any possibility of recovery.

### Session Management Requirements

WHEN a user logs in successfully, THE system SHALL create a secure session and return an access token (valid 15 minutes) and refresh token (valid 7 days) stored in HTTP-only cookies.  
WHEN a user logs out, THE system SHALL invalidate the session token and delete the cookie, forcing a complete re-authentication.  
WHEN a user's password is changed, THEN THE system SHALL revoke all active refresh tokens, requiring re-authentication on next login.  
WHEN a session is invalidated (e.g., password change), THEN THE system SHALL remove all tokens from refresh token store immediately.

## 3. User Profile Management

WHEN a user views their own profile, THE system SHALL display their display name, bio text, avatar image, and total karma score.  
WHEN a user views another user's profile, THE system SHALL display the public profile information including display name, bio, avatar, and total karma score.  
WHEN a user edits their display name, THE system SHALL accept input between 3-20 characters with no special characters.  
WHEN a user updates their bio text, THE system SHALL limit to 500 characters.  
WHEN a user uploads a new avatar, THE system SHALL accept JPG/PNG files under 5MB.  
WHEN a user views their profile page, THE system SHALL display a list of all posts they created and all comments they wrote.

## 4. Karma System Requirements

WHEN a user receives an upvote on their post or comment, THEN THE system SHALL increase their karma score by 1.  
WHEN a user receives a downvote on their post or comment, THEN THE system SHALL decrease their karma score by 1.  
WHEN a user removes their vote on a post or comment, THEN THE system SHALL adjust the karma score by the opposite value of the previous vote.  
WHEN a user has negative karma, THE system SHALL display it as a negative number (e.g., -5).  
WHEN viewing a user profile, THE system SHALL always display the current total karma score.

## 5. Community Management Requirements

### Community Creation Requirements

WHEN a user wants to create a community, THE system SHALL require a unique name, description (max 500 characters), and icon image (JPG/PNG under 5MB).  
IF the community name already exists, THEN THE system SHALL return error "Community name already taken."  
WHEN a community is created, THE system SHALL automatically make the creator the owner with full moderation privileges.  
THE owner SHALL be the only user who can delete the community.

### Community Operations Requirements

WHEN a user browses communities, THE system SHALL display a list of all public communities with name, description, and subscriber count.  
WHEN a user searches communities by name, THE system SHALL filter using partial matching on community name (case-insensitive).  
WHEN a user subscribes to a community, THE system SHALL add them to the subscriber list of that community.  
WHEN a user unsubscribes from a community, THE system SHALL remove them from the subscriber list.  
WHEN a user views their subscribed communities, THE system SHALL list all communities they are subscribed to with names and subscriber counts.

## 6. Post Management Requirements

### Post Creation Requirements

WHEN a user creates a post in a community, THE system SHALL require title (min 5 characters, max 100 characters) and must select post type (text, link, image).  
WHEN a post is text type, THE system SHALL require content (max 5000 characters).  
WHEN a post is link type, THE system SHALL validate URL format and extract domain name for display.  
WHEN a post is image type, THE system SHALL accept JPG/PNG files under 10MB.  
WHEN a user creates a post, THE system SHALL automatically associate it with the community the user is subscribed to and the author.

### Post Interaction Requirements

WHEN a user views a single post, THE system SHALL display title, full content, author, community, vote score, comment count, and timestamp.  
WHEN a user edits their own post, THE system SHALL allow content modification within post type constraints.  
WHEN a user deletes their own post, THE system SHALL remove the post and all associated comments without affecting other content.  
WHEN viewing a post in a feed, THE system SHALL display title, author, community, vote score, comment count, time since posted, and abbreviated content (first 200 characters for text, thumbnail for image, domain for link).

## 7. Voting System Requirements

WHEN a user upvotes a post or comment, THE system SHALL increment the vote score by 1 and record the vote.  
WHEN a user downvotes a post or comment, THE system SHALL decrement the vote score by 1 and record the vote.  
WHEN a user changes their vote from upvote to downvote, THE system SHALL adjust the score by -2.  
WHEN a user changes their vote from downvote to upvote, THE system SHALL adjust the score by +2.  
WHEN a user removes their vote, THE system SHALL revert the score by the previous vote value.  
WHEN a user votes on a post or comment they own, THE system SHALL prevent voting (no change to score).

## 8. Feed Management Requirements

### Feed Types Requirements

THE Home Feed SHALL display posts only from communities the user is subscribed to (requires login).  
THE Popular Feed SHALL display posts from all communities (accessible to all users, including guests).  
THE Community Feed SHALL display posts from one specific community (accessible to all users).

### Sorting Requirements

WHEN users sort by Hot, THE system SHALL prioritize posts with highest ratio of new votes to age (newer posts with more votes appear first).  
WHEN users sort by New, THE system SHALL order by post creation date (newest first).  
WHEN users sort by Top, THE system SHALL order by vote score (highest first), with optional time filter (today, week, month, year, all time).  
WHEN users sort by Controversial, THE system SHALL prioritize posts with high vote count but score close to zero.

## 9. Comment Management Requirements

WHEN a user writes a comment on a post, THE system SHALL require comment text (max 1000 characters) and associate it with the post, user, and current timestamp.  
WHEN a user replies to a comment, THE system SHALL create a nested comment with thread relationship.  
WHEN a user edits their own comment, THE system SHALL allow content modification within text limit.  
WHEN a user deletes their own comment, THE system SHALL remove the comment without affecting related posts.  
WHEN viewing comments, THE system SHALL display author, content, vote score, time since posted, and nested replies.

## 10. Moderation Workflow Requirements

### Moderator Role Requirements

THE community creator SHALL be the owner with highest authority.  
THE owner SHALL be able to add moderators to their community.  
THE owner SHALL be able to remove moderators from their community.  
MODERATORS SHALL be able to add other moderators to their community.  
MODERATORS SHALL NOT be able to remove the owner from their community.  
MODERATORS SHALL NOT be able to remove other moderators (only the owner can).

### Moderation Actions Requirements

WHEN a community moderator deletes a post, THE system SHALL remove the post from all feeds and delete all associated comments.  
WHEN a community moderator deletes a comment, THE system SHALL remove the specific comment without affecting other content.  
WHEN a community moderator bans a user from their community, THE system SHALL prevent that user from creating posts or comments in the community.  
WHEN a community moderator unbans a user, THE system SHALL restore their permissions to create posts and comments.  
WHEN a community moderator views banned users list, THE system SHALL display names and reason for ban.

## 11. Reporting System Requirements

WHEN a user reports a post or comment, THE system SHALL require providing a reason text (max 500 characters).  
WHEN a report is submitted, THE system SHALL queue it for review by community moderators.  
WHEN a moderator views reports for their community, THE system SHALL display the reported content, reporter user, and report reason.  
WHEN a moderator approves a report, THE system SHALL delete the reported content and notify the reporter.  
WHEN a moderator dismisses a report, THE system SHALL remove it from the report queue without action.  
WHEN a moderator reviews a report, THE system SHALL require action (approve or dismiss) before removing from queue.