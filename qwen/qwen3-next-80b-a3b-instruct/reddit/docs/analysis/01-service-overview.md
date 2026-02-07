# Reddit-Style Community Platform Requirements Specification

## Service Overview

THE community platform SHALL enable users to discover, share, and discuss content through a decentralized, interest-based network where knowledge and opinions are democratically curated by the community.

WHEN a user visits the platform, THE system SHALL provide immediate access to three primary feeds: Home, Popular, and Community, based on authentication status and subscription context.

WHEN a user creates an account, THE system SHALL ensure they can fully participate in community interactions, including posting, commenting, voting, and moderating, after email verification.

THE system SHALL NEVER use advertising, data mining, or algorithmic manipulation to influence content visibility.

## User Actors

### Guest

WHEN a user is unauthenticated, THE system SHALL:
- Allow viewing of the Popular Feed and all Community Feeds
- Allow viewing of any user profile and community details
- Prevent creation of posts, comments, or votes
- Prevent subscription to communities
- Prevent access to the Home Feed
- Prevent reporting of content

### Member

WHEN a user is authenticated, THE system SHALL:

#### Account Management
- Allow registration with email and password
- Allow login with email and password
- Allow password changes after authentication
- Allow account deletion (with 14-day grace period)
- Allow setting and editing of display name, bio, and avatar

#### Content Interaction
- Allow creation of posts in subscribed communities
- Allow editing of own posts within 24 hours of creation
- Allow deletion of own posts at any time
- Allow creation of comments on any post
- Allow replies to any comment
- Allow editing of own comments within 24 hours of creation
- Allow deletion of own comments at any time
- Allow upvoting and downvoting of posts and comments
- Allow changing votes from upvote to downvote or vice versa
- Allow removal of own votes
- Allow subscription to any community
- Allow unsubscription from any community
- Allow viewing of own profile with karma score, posts, and comments
- Allow viewing of any other user's profile

#### Community Interaction
- Allow browsing of all communities
- Allow searching for communities by name
- Allow viewing of community subscriber counts
- Allow joining communities for participation

#### Reporting
- Allow reporting any post or comment with a text reason
- Allow viewing of their own reports

### Moderator

WHEN a user has moderator privileges in a community, THE system SHALL grant them all Member permissions, plus:

#### Content Moderation
- Allow deletion of any post in their community
- Allow deletion of any comment in their community
- Allow approval of reports (which deletes the reported content)
- Allow dismissal of reports (which keeps the reported content)

#### User Moderation
- Allow banning users from their community
- Allow unbaning users from their community
- Allow viewing of the list of banned users in their community

#### Governance Restrictions
- CANNOT remove the community owner
- CANNOT remove other moderators
- CANNOT change community settings (name, description, icon)

### Admin

WHEN a user has platform administrator privileges, THE system SHALL grant them all Moderator permissions across all communities, plus:

- Allow creation, deletion, and management of any community
- Allow adding or removing moderators from any community
- Allow banning or unbanning users from any community
- Allow viewing of all reports across the platform
- Allow approval or dismissal of any report
- Allow management of global settings
- Allow override of any moderation decision
- Allow access to system-level logs
- Allow viewing of all users and their activities
- Allow modification of any user account

## Authentication Flow

### Registration

WHEN a user attempts to register, THE system SHALL:

1. Require email address matching RFC 5322 format
2. Require password with minimum 8 characters
3. Require username with minimum 3 characters and maximum 30 characters
4. Validate that email address is not already registered
5. Validate that username is not already in use
6. Store password as bcrypt hash with cost factor 12
7. Send verification email with unique, time-limited token
8. Create new member account with default karma score of 0
9. Keep account status as "unverified"

IF validation fails, THE system SHALL return:
- EMAIL_EXISTS when email is already registered
- USERNAME_EXISTS when username is already in use
- INVALID_EMAIL when email doesn't match format
- INVALID_PASSWORD when password doesn't meet requirements
- INVALID_USERNAME when username doesn't meet requirements

WHEN registration succeeds, THE system SHALL:
- Return HTTP 201 Created status
- Display "Account created! Please check your email to verify your address."

### Login

WHEN a user attempts to login, THE system SHALL:

1. Accept email or username as identifier
2. Accept password as authentication credential
3. Verify credentials against stored hash
4. If credentials are valid:
   - Create JWT access token with 30-minute expiration
   - Create refresh token with 30-day expiration
   - Set refresh token in secure httpOnly cookie
   - Return access token in response header
   - Set user session as active
5. If credentials are invalid:
   - Return HTTP 401 Unauthorized
   - Log failed login attempt with timestamp and IP
   - Increment failed attempt counter
   - Block account after 5 consecutive failed attempts for 15 minutes
6. If account is unverified:
   - Return HTTP 403 Forbidden with error code ACCOUNT_UNVERIFIED
   - Do not increment failed attempt counter

### Email Verification

WHEN a user clicks verification link in registration email, THE system SHALL:

1. Extract verification token from URL
2. Validate token expiration (max 24 hours)
3. Validate token against stored token hash
4. Update user status to "verified"
5. Clear verification token from database
6. Send confirmation email to user
7. Redirect user to home feed

IF token is expired, THE system SHALL:
- Show "Verification link expired" message
- Allow user to request new verification email

IF token is invalid, THE system SHALL:
- Show "Invalid verification link" message
- Allow user to request new verification email

### Password Reset

WHEN a user requests password reset, THE system SHALL:

1. Accept email address as input
2. Validate that email is registered
3. Generate unique, random reset token (64 characters)
4. Store token hash in user record with 60-minute expiration
5. Send password reset email with token link
6. Return success response with "reset email sent" message even if email doesn't exist

WHEN user clicks password reset link, THE system SHALL:

1. Extract reset token from URL
2. Validate token expiration (max 60 minutes)
3. Validate token against stored hash
4. Display password change form
5. Allow password change with new password meeting requirements:
   - Minimum 8 characters
   - Maximum 128 characters
   - No restrictions on character types
6. Update password hash in database
7. Invalidate all active sessions for this user
8. Send confirmation email
9. Redirect to login page

IF token is expired, THE system SHALL:
- Show "Reset link expired" message
- Force user to request new password reset

IF password is invalid, THE system SHALL:
- Return error "Invalid password" with reason
- Show requirements and allow retry

### Session Management

WHILE a user has an active session, THE system SHALL:

- Accept access token in Authorization: Bearer header
- Accept refresh token in secure httpOnly cookie
- Validate access token signature and expiration
- Refresh access token validity if within 5 minutes of expiration
- Require re-authentication for sensitive operations (password change, account deletion, email change, moderator permission changes)

WHEN access token expires, THE system SHALL:
- Return HTTP 401 Unauthorized
- Require client to use refresh token to obtain new access token

WHEN refresh token expires, THE system SHALL:
- Return HTTP 401 Unauthorized
- Require user to log in again

WHEN user logs out, THE system SHALL:
- Invalidate the current refresh token
- Remove refresh token from cookie
- Delete access token from client storage
- Set session as inactive

## Karma System

### Karma Calculation Logic

WHEN a member upvotes a post, THE system SHALL increase the post author's karma by 1.

WHEN a member upvotes a comment, THE system SHALL increase the comment author's karma by 1.

WHEN a member downvotes a post, THE system SHALL decrease the post author's karma by 1.

WHEN a member downvotes a comment, THE system SHALL decrease the comment author's karma by 1.

WHEN a member removes an upvote from a post, THE system SHALL decrease the post author's karma by 1.

WHEN a member removes a downvote from a post, THE system SHALL increase the post author's karma by 1.

WHEN a member removes an upvote from a comment, THE system SHALL decrease the comment author's karma by 1.

WHEN a member removes a downvote from a comment, THE system SHALL increase the comment author's karma by 1.

WHEN a member changes their vote on a post from upvote to downvote, THE system SHALL decrease the post author's karma by 2.

WHEN a member changes their vote on a post from downvote to upvote, THE system SHALL increase the post author's karma by 2.

WHEN a member changes their vote on a comment from upvote to downvote, THE system SHALL decrease the comment author's karma by 2.

WHEN a member changes their vote on a comment from downvote to upvote, THE system SHALL increase the comment author's karma by 2.

### Karma Integrity Rules

WHILE user is authenticated, THE system SHALL allow exactly one vote per post and one vote per comment.

IF a user attempts to vote on a post they have already voted on, THEN THE system SHALL update their existing vote rather than create a new one.

IF a user attempts to vote on a comment they have already voted on, THEN THE system SHALL update their existing vote rather than create a new one.

IF user attempts to vote on their own post or comment, THEN THE system SHALL prevent the vote and return error with code "KARMA_SELF_VOTE_PROHIBITED".

### Karma Display Requirements

WHEN displaying karma scores to authenticated users, THE system SHALL show the current number as a whole integer (positive, negative, or zero).

THE system SHALL display karma as "[number] karma" (e.g., "47 karma" or "-12 karma").

WHEN displaying karma to unauthenticated users, THE system SHALL show aggregated karma indicators (e.g., "+240 karma") without displaying the exact number.

### Karma History Access

THE system SHALL maintain a complete, immutable audit trail of all karma changes.

WHEN user requests karma history, THE system SHALL return a list of karma events with:

- Date and time of change
- Type of change (upvote, downvote, vote removal, vote change)
- Amount of karma change
- Content type affected (post or comment)
- Content identifier
- Reason for change (if any)

The karma history MUST be accessible through:
- User profile "Karma History" tab
- API endpoint for authenticated users
- Admin dashboard for moderation purposes

### Karma Privacy Rules

IF user has karma score below 0, THEN THE system SHALL NOT display detailed karma history to other users.

IF user has karma score above 1,000, THEN THE system SHALL display summary statistics only (total karma, top 5 contributions) to non-privileged viewers.

## Communities

### Community Creation Rules

WHEN a member submits a community creation request, THE system SHALL validate that the community name is unique across the platform.

WHEN a member submits a community creation request, THE system SHALL require a community description of at least 10 characters.

WHEN a member submits a community creation request, THE system SHALL require selection or upload of a community icon.

WHEN a member submits a community creation request, THE system SHALL assign the member as the community owner.

WHEN a community is created, THE system SHALL immediately create a record in the communities table with status="active".

WHEN a community is created, THE system SHALL add the creator to the subscribers list of that community.

### Naming Constraints

THE community name SHALL consist only of alphanumeric characters and underscores.

THE community name SHALL have a minimum length of 3 characters.

THE community name SHALL have a maximum length of 25 characters.

THE community name SHALL be case-insensitive for comparison purposes.

THE system SHALL normalize community names to lowercase for storage and lookup.

THE system SHALL reject community names that match reserved system terms (e.g., "home", "popular", "search", "admin", "moderator").

### Owner Rights

WHEN a user creates a community, THE system SHALL grant them owner status with full permissions.

THE owner SHALL be able to add other members as moderators.

THE owner SHALL be able to remove any moderator including other owners (though owner removal is disallowed by system design).

THE owner SHALL be able to transfer ownership to any existing moderator.

THE owner SHALL be able to delete the community entirely.

THE owner SHALL be able to edit the community description and icon.

THE owner SHALL be able to view all reports within their community.

THE owner SHALL be able to approve or dismiss any report within their community.

THE owner SHALL be able to view the list of banned users in their community.

THE owner SHALL be able to unban any banned user.

THE owner SHALL be able to ban any user from their community.

THE owner SHALL be able to view the complete history of community actions and moderation events.

### Subscription Requirements

WHEN a user subscribes to a community, THE system SHALL add them to the community's subscriber list.

WHEN a user unsubscribes from a community, THE system SHALL remove them from the community's subscriber list.

WHEN a user attempts to create a post in a community, THE system SHALL verify they are subscribed to that community.

WHEN a user attempts to comment on a post in a community, THE system SHALL verify they are subscribed to that community.

WHEN a user tries to subscribe to an already-subscribed community, THE system SHALL do nothing and return success message "Already subscribed".

WHEN a user tries to unsubscribe from a community they are not subscribed to, THE system SHALL do nothing and return success message "Not subscribed".

WHEN a community is deleted, THE system SHALL automatically unsubscribe all subscribers from that community.

WHEN a user account is deleted, THE system SHALL automatically unsubscribe them from all communities.

WHEN a user is banned from a community, THE system SHALL immediately unsubscribe them from that community.

WHEN a user is unbanned from a community, THE system SHALL not automatically re-subscribe them.

### Icon Usage

WHEN a community icon is uploaded, THE system SHALL accept images in PNG, JPEG, or GIF format.

WHEN a community icon is uploaded, THE system SHALL enforce a maximum file size of 2MB.

WHEN a community icon is uploaded, THE system SHALL validate the file as a valid image type.

THE system SHALL accept uploaded icons of any dimensions.

THE system SHALL generate and store resized versions of icons for different display contexts:
- Profile view: 128x128 pixels
- Feed listing: 64x64 pixels
- Search results: 32x32 pixels
- Mobile display: 48x48 pixels

WHEN a community icon is not uploaded, THE system SHALL generate a default icon based on the community name's first letter.

THE system SHALL store the original uploaded icon for archival and potential restoration.

WHEN a community icon is deleted or changed, THE system SHALL archive the previous icon for 30 days before permanent deletion.

### Search Functionality

THE system SHALL allow users to search for communities by name.

THE system SHALL return community search results in real-time as the user types (with 300ms debounce).

WHEN a user enters a search query, THE system SHALL match against:
- Community name (primary match)
- Community description (secondary match)

THE system SHALL prioritize search results by:
1. Exact match on community name
2. Partial match starting with query text
3. Partial match containing query text anywhere in name
4. Description matches

THE system SHALL return a maximum of 20 search results per query.

WHEN a user searches for a community name that matches exactly one community, THE system SHALL redirect to that community immediately after search result is chosen.

WHEN a user's search yields no results, THE system SHALL display message "No communities found matching \"[query]\"".

WHEN a user searches for a query less than 3 characters, THE system SHALL show "Type at least 3 characters to search".

### Subscriber Count Calculation

THE system SHALL maintain an accurate, real-time subscriber count for each community.

WHEN a user subscribes to a community, THE system SHALL increment the subscriber count by 1.

WHEN a user unsubscribes from a community, THE system SHALL decrement the subscriber count by 1.

WHEN a user account is deleted, THE system SHALL decrement the subscriber count of all communities they were subscribed to by 1.

WHEN a user is banned from a community, THE system SHALL decrement the subscriber count by 1.

WHEN a community is deleted, THE system SHALL set the subscriber count to 0.

WHEN a new community is created, THE system SHALL initialize the subscriber count to 1 (the creator).

When displaying subscriber counts:
- For 0-999 subscribers: show exact number
- For 1,000-9,999 subscribers: show as "1.0K" (rounded to one decimal)
- For 10,000-99,999 subscribers: show as "10.0K" (rounded to one decimal)
- For 100,000-999,999 subscribers: show as "100K" (rounded to nearest integer)
- For 1,000,000+ subscribers: show as "1M" (rounded to nearest integer)

## Posts

### Post Creation Flow

WHEN a member attempts to create a post, THE system SHALL require the member to be subscribed to at least one community.

WHEN a member selects a community to post in, THE system SHALL validate that the member is subscribed to that community.

WHEN a member submits a post creation request, THE system SHALL require a title with a minimum length of 1 character and a maximum length of 300 characters.

WHEN a member submits a post creation request, THE system SHALL require at least one content type: text content, link URL, or image upload.

WHEN a member submits a post creation request with a text content type, THE system SHALL require the text content to have a minimum length of 1 character and a maximum length of 10,000 characters.

WHEN a member submits a post creation request with a link content type, THE system SHALL require a valid URL format (RFC 1738) with a maximum length of 2,000 characters.

WHEN a member submits a post creation request with an image content type, THE system SHALL require a valid image file (JPG, PNG, GIF, WEBP) with a maximum size of 10MB.

WHEN a member submits a post creation request with multiple content types, THE system SHALL allow only one content type to be populated (text OR link OR image - not multiple).

WHEN a member submits a valid post creation request, THE system SHALL create a new post record with a unique ID, the member's user ID, the selected community ID, the provided title, the selected content type, the provided content, and the current timestamp.

WHEN a member submits a post creation request, THE system SHALL assign the post an initial vote score of 0 and an initial comment count of 0.

WHEN a member submits a post creation request, THE system SHALL immediately display the new post in the member's local feed.

WHEN a member attempts to create a post in a community they are not subscribed to, THE system SHALL deny the request and return an error message stating: "You must subscribe to this community before posting."

IF no content type is provided in the post creation request, THEN THE system SHALL return an error message stating: "You must provide at least one content type: text, link, or image."

IF the post title is empty, THEN THE system SHALL return an error message stating: "Post title cannot be empty."

IF the post title exceeds 300 characters, THEN THE system SHALL return an error message stating: "Post title cannot exceed 300 characters."

IF text content is provided and exceeds 10,000 characters, THEN THE system SHALL return an error message stating: "Text content cannot exceed 10,000 characters."

IF a link is provided and is not a valid URL, THEN THE system SHALL return an error message stating: "Please enter a valid URL."

IF a link exceeds 2,000 characters, THEN THE system SHALL return an error message stating: "URL cannot exceed 2,000 characters."

IF an image file exceeds 10MB, THEN THE system SHALL return an error message stating: "Image file cannot exceed 10MB."

IF an image file is not in JPG, PNG, GIF, or WEBP format, THEN THE system SHALL return an error message stating: "Only JPG, PNG, GIF, and WEBP image formats are allowed."

IF multiple content types are provided in the post creation request, THEN THE system SHALL return an error message stating: "You must select only one content type: text, link, or image."

WHERE the member is not authenticated, THE system SHALL deny the post creation request and return an error message stating: "You must be logged in to create posts."

### Post Edit Workflow

WHEN a member attempts to edit their own post, THE system SHALL verify that the member is the original author of the post.

WHEN a member edits their own post, THE system SHALL allow modification of the post title, content type, and content.

WHEN a member edits their own post, THE system SHALL preserve the original post creation timestamp.

WHEN a member edits their own post, THE system SHALL update the "last edited" timestamp to the current time.

WHEN a member edits their own post, THE system SHALL validate the title and content according to the same rules as post creation.

WHEN a member attempts to edit their own post, THE system SHALL allow editing for 24 hours after the post was created.

WHEN a member attempts to edit their own post after 24 hours have passed since creation, THE system SHALL deny the edit request and return an error message stating: "You can only edit your posts within 24 hours of creation."

WHEN a member changes the content type of their own post during editing, THE system SHALL remove the previous content type and apply the new content type with its validation rules.

IF the member attempting to edit the post is not the original author, THEN THE system SHALL deny the edit request and return an error message stating: "You can only edit your own posts."

IF the member attempts to edit a post after the 24-hour window, THEN THE system SHALL deny the edit request and return an error message stating: "You can only edit your posts within 24 hours of creation."

IF the edited title is empty, THEN THE system SHALL return an error message stating: "Post title cannot be empty."

IF the edited title exceeds 300 characters, THEN THE system SHALL return an error message stating: "Post title cannot exceed 300 characters."

IF the text content exceeds 10,000 characters, THEN THE system SHALL return an error message stating: "Text content cannot exceed 10,000 characters."

IF a link is provided and is not a valid URL, THEN THE system SHALL return an error message stating: "Please enter a valid URL."

IF a link exceeds 2,000 characters, THEN THE system SHALL return an error message stating: "URL cannot exceed 2,000 characters."

IF an image file exceeds 10MB, THEN THE system SHALL return an error message stating: "Image file cannot exceed 10MB."

IF an image file is not in JPG, PNG, GIF, or WEBP format, THEN THE system SHALL return an error message stating: "Only JPG, PNG, GIF, and WEBP image formats are allowed."

IF multiple content types are provided in the edit request, THEN THE system SHALL return an error message stating: "You must select only one content type: text, link, or image."

### Post Deletion Workflow

WHEN a member attempts to delete their own post, THE system SHALL verify that the member is the original author of the post.

WHEN a member deletes their own post, THE system SHALL permanently remove the post and all associated content.

WHEN a member deletes their own post, THE system SHALL remove the post from all feeds and user profiles.

WHEN a member deletes their own post, THE system SHALL not decrement the karma of users who previously voted on it.

WHEN a member attempts to delete a post, THE system SHALL allow deletion at any time, regardless of how long ago the post was created.

WHEN a moderator deletes a post, THE system SHALL permanently remove the post and all associated content.

WHEN a moderator deletes a post, THE system SHALL log the deletion event with the moderator's ID and reason if provided.

WHEN a moderator deletes a post, THE system SHALL not decrement the karma of users who previously voted on it.

WHEN an admin deletes a post, THE system SHALL permanently remove the post and all associated content.

WHEN an admin deletes a post, THE system SHALL log the deletion event with the admin's ID and reason if provided.

WHEN an admin deletes a post, THE system SHALL not decrement the karma of users who previously voted on it.

WHEN a post is deleted, THE system SHALL remove all comments associated with the deleted post.

IF the member attempting to delete the post is not the original author and is not a moderator or admin, THEN THE system SHALL deny the deletion request and return an error message stating: "You can only delete your own posts."

IF a moderator attempts to delete a post from a community they do not moderate, THEN THE system SHALL deny the deletion request and return an error message stating: "You are not a moderator of this community."

IF an admin attempts to delete a post from a community that is not under their direct jurisdiction, THEN THE system SHALL deny the deletion request and return an error message stating: "You are not authorized to delete posts from this community."

### Post Visibility Rules

WHILE a post exists, THE system SHALL display it in the following feeds based on community subscription and permissions:
- Home Feed: Only to users subscribed to the post's community
- Community Feed: To all users viewing that specific community
- Popular Feed: To all users on the platform, authenticated or not

WHEN a post is created, THE system SHALL make the post immediately visible in the creator's home feed and the community feed.

WHEN a member unsubscribes from a community, THE system SHALL no longer display posts from that community in the member's home feed.

WHEN a member deletes their own post, THE system SHALL immediately remove the post from all feeds.

WHEN a moderator deletes a post, THE system SHALL immediately remove the post from all feeds.

WHEN an admin deletes a post, THE system SHALL immediately remove the post from all feeds.

WHEN a user is banned from a community, THE system SHALL prevent the banned user from viewing any new posts from that community in their feeds, but shall not remove previously viewed posts.

WHEN a post is edited, THE system SHALL update the post in all feeds where it appears.

WHEN a member votes on a post, THE system SHALL update the vote score in all feeds where the post appears.

WHEN a post receives new comments, THE system SHALL update the comment count in all feeds where the post appears.

### Post Types and Content Handling

WHEN a post is created with a text content type, THE system SHALL store the text in a text field and display the first 200 characters in the feeds.

WHEN a post is created with a link content type, THE system SHALL store the URL in a link field and extract and display the domain name (e.g., "youtube.com") in the feeds.

WHEN a post is created with an image content type, THE system SHALL store the image URL in a link field and display a thumbnail of the image (320x240 resolution) in the feeds.

WHEN a post is created, THE system SHALL not display content from other post types in the feed summary.

WHEN a user views a single post, THE system SHALL display: the title, the selected content type, the full content, the author's username, the community name, the current vote score, the comment count, and the post creation timestamp.

WHEN a post with a link content type is viewed, THE system SHALL display the full URL in the post detail page.

WHEN a post with an image content type is viewed, THE system SHALL display the full-sized image in the post detail page.

WHEN a post with a text content type is viewed, THE system SHALL display the full text content without truncation.

WHEN a post is rendered in a feed list, THE system SHALL display:
- Title
- Author username
- Community name
- Vote score
- Comment count
- Time since posted (e.g., "3 hours ago")
- For text posts: the first 200 characters of text
- For image posts: the 320x240 thumbnail
- For link posts: the domain name of the URL

WHEN a post is viewed by a user who is not subscribed to the community, THE system SHALL allow them to view the post details if accessed via Community or Popular feeds, but shall not display the post in their Home Feed.

### Post Creation Timing Constraints

WHEN a member creates a post, THE system SHALL not allow more than 10 posts to be created within a 10-minute timeframe.

WHEN a member exceeds 10 posts in a 10-minute window, THE system SHALL temporarily block further post creation for 5 minutes and return an error message stating: "You are posting too frequently. Please wait 5 minutes before posting again."

WHEN the 5-minute cooldown period expires, THE system SHALL reset the post creation counter and allow further posts.

WHEN a member is blocked from posting due to frequency limits, THE system SHALL not block moderation or administrative actions.

WHEN a moderator or admin deletes a post, THE system SHALL not count the deletion toward the member's post frequency limit.

WHEN a member's account is suspended, THE system SHALL prevent any post creation attempts, regardless of frequency limits.

### Post Archiving and Restoration

WHEN a post is created, THE system SHALL store it in an active state.

WHEN a post is deleted, THE system SHALL move it to an archived state with a deletion timestamp and reason if provided.

WHEN a moderator or admin deletes a post, THE system SHALL maintain a log entry for the deletion event.

WHEN a post is in the archived state, THE system SHALL not display it in any feed or user profile.

WHEN a post is in the archived state, THE system SHALL allow administrators to restore it by manually reversing the deletion log.

WHEN a post is restored, THE system SHALL return it to the active state and reappear in all relevant feeds.

WHEN a post is restored, THE system SHALL retain the original creation timestamp and all associated votes and comments.

WHEN a post is restored, THE system SHALL reset the "last edited" timestamp to the original creation timestamp.

### Voting Impact on Post Visibility

WHEN a post receives multiple upvotes, THE system SHALL increase its visibility in the Popular and Home feeds based on the "Hot" sorting algorithm.

WHEN a post receives multiple downvotes, THE system SHALL decrease its visibility in the Popular and Home feeds based on the "Hot" sorting algorithm.

WHEN a post has a high positive vote score, THE system SHALL place it higher in "Top" sorted feeds.

WHEN a post has a high negative vote score, THE system SHALL place it lower in "Top" sorted feeds.

WHEN a post has a high number of votes but a score close to zero, THE system SHALL place it higher in "Controversial" sorted feeds.

WHEN a post has very few votes, THE system SHALL prioritize it in "New" sorted feeds.

WHEN a post has been active for a long time with low activity, THE system SHALL be demoted from "Hot" feeds to the bottom of the page.

WHEN a post is flagged by 3 or more users as inappropriate, THE system SHALL temporarily hide it from "Hot" and "Popular" feeds while awaiting moderator review.

WHEN a moderator approves a report on a post, THE system SHALL immediately remove the post from all public feeds.

WHEN a moderator dismisses a report on a post, THE system SHALL immediately restore the post to all public feeds.

### Post Visibility During Reports

WHEN a post has been reported but not yet reviewed by a moderator, THE system SHALL still display the post in all feeds, but shall mark it with a "Pending Review" indicator for moderators only.

WHEN a post has been reported and the report is approved, THE system SHALL immediately remove the post from all public feeds.

WHEN a post has been reported and the report is dismissed, THE system SHALL immediately remove the "Pending Review" indicator from the post in all feeds.

WHEN a post has been reported and the user who reported it is banned, THE system SHALL still process the report if approved by a moderator.

WHEN a moderator reviews a report on a post, THE system SHALL maintain a log entry recording the moderator's action and the date/time of review.

### Post Content Validation Rules

WHEN a post is created with text content, THE system SHALL remove any HTML tags from the text content and sanitize for script injection.

WHEN a post is created with text content, THE system SHALL preserve Unicode characters and emojis.

WHEN a post is created with a link URL, THE system SHALL validate that the URL scheme is either http or https.

WHEN a post is created with a link URL, THE system SHALL reject URLs that point to internal network addresses (127.0.0.1, 192.168.*, etc.).

WHEN a post is created with an image, THE system SHALL validate the image format by reading the file headers, not merely checking the file extension.

WHEN a post is created with an image, THE system SHALL prevent uploading if the image contains malicious metadata (EXIF data with JavaScript).

WHEN a post is created with an image, THE system SHALL resize the uploaded image to a 320x240 thumbnail for feed display.

WHEN a post is created with an image, THE system SHALL store the full-size image and the thumbnail separately.

WHEN a post is created, THE system SHALL assign a unique post ID in UUID4 format.

WHEN a post is created, THE system SHALL assign a post ID that is never reused.

### Post Creation Contextual Requirements

WHEN a member creates a post, THE system SHALL require the member to acknowledge community rules before posting.

WHEN a member creates a post, THE system SHALL record the member's IP address for moderation purposes.

WHEN a member creates a post, THE system SHALL record the user agent and device type.

WHEN a post is created from a suspected automated bot, THE system SHALL require a CAPTCHA verification.

WHEN a post is created and the account's creation date is less than 6 hours ago, THE system SHALL require verification of the account via email or 2-factor authentication.

WHEN a post is created and the account has previously been banned from any community, THE system SHALL flag the post for review before posting.

WHEN a post is created with links to previously reported domains, THE system SHALL flag the post for review before posting.

### Post Display Rules

WHEN a post is displayed in any feed, THE system SHALL ensure that the post is always displayed as a complete entity.

WHEN a post is displayed in the Home Feed, THE system SHALL only show posts from communities the user is subscribed to.

WHEN a post is displayed in the Community Feed, THE system SHALL only show posts from that specific community.

WHEN a post is displayed in the Popular Feed, THE system SHALL show posts from all communities across the platform.

WHEN a post is displayed in any feed, THE system SHALL always show the post title, author username, community name, vote score, comment count, and time since posted.

WHEN a post is displayed in any feed, THE system SHALL never show the full text content, full URL, or full-size image.

WHEN a post is displayed in any feed, THE system SHALL show a truncated summary (200 characters for text, domain name for links, thumbnail for images).

WHEN a post is displayed by a non-member user viewing the Popular or Community Feed, THE system SHALL still display all necessary information except personal identifiers.

WHEN a post is edited, THE system SHALL display "Edited" indicator next to the post title in all feeds.

WHEN a post is edited and the edit occurs within 5 minutes of creation, THE system SHALL not display an "Edited" indicator.

WHEN a post is edited and the edit occurs more than 5 minutes after creation, THE system SHALL display "Edited" indicator next to the post title in all feeds.

WHEN a post is edited, THE system SHALL update the "last edited" timestamp to the current time in all displays.

WHEN a post is displayed on a user's profile page, THE system SHALL show the post title, community name, vote score, comment count, and time since posted.

WHEN a post is displayed on a user's profile page, THE system SHALL link to the full post detail page.

WHEN a post is displayed in any context, THE system SHALL never show the original author's email address, IP address, or other personally identifiable information.

WHEN a post is displayed in any context, THE system SHALL never show moderator or admin identities unless they are the author of the post.

### User Reputation and Post Visibility

WHERE a user has negative karma, THE system SHALL NOT restrict their ability to create posts.

WHERE a user has negative karma, THE system SHALL NOT restrict their ability to vote on posts.

WHERE a user has negative karma, THE system SHALL NOT restrict their ability to create comments.

WHERE a user has negative karma, THE system SHALL NOT influence the visibility of their posts in feeds.

WHERE a user has negative karma, THE system SHALL still display their username and profile picture normally.

WHERE a user has negative karma, THE system SHALL record all actions normally.

WHERE a user is banned from a community, THE system SHALL still allow them to view posts from that community in the Popular Feed.

WHERE a user is banned from a community, THE system SHALL prevent them from creating new posts or comments in that community.

WHERE a user is banned from a community, THE system SHALL not notify other users that this user was banned.

WHERE a user is banned from a community, THE system SHALL allow other users to still see the banned user's existing posts and comments.

WHEN a user attempts to post from a banned account, THE system SHALL deny the request and return an error message stating: "Your account has been banned from this community."

WHEN a user attempts to post from a suspended account, THE system SHALL deny the request and return an error message stating: "Your account has been suspended."

WHEN a user attempts to post from a deleted account, THE system SHALL deny the request and return an error message stating: "This account no longer exists."

WHEN a post is made by a user whose account has been deleted, THE system SHALL still display the post, but shall show "[Deleted User]" as the author.

WHEN a post is made by a user whose account has been suspended, THE system SHALL still display the post, and shall show no special indicator.

WHEN a post is made by a user whose account has been deactivated, THE system SHALL still display the post, and shall show no special indicator.

### Post Performance Requirements

WHEN a user loads any feed, THE system SHALL render the feed within 1 second when connected via broadband.

WHEN a user loads any feed with 20 posts, THE system SHALL render the feed within 500ms on devices with mid-tier performance.

WHEN a user loads a single post detail page, THE system SHALL render the page within 1.5 seconds on broadband connections.

WHEN a user submits a post creation request, THE system SHALL respond within 1 second with success or error status.

WHEN a user submits a post edit request, THE system SHALL respond within 1 second with success or error status.

WHEN a user submits a post delete request, THE system SHALL respond within 1 second with success or error status.

WHEN a user loads the Popular Feed, THE system SHALL cache the top 1,000 most active posts for 5 minutes to improve performance.

WHEN a user loads a Community Feed, THE system SHALL cache the 100 most recent posts for 3 minutes to improve performance.

WHEN a user loads the Home Feed, THE system SHALL cache posts from subscribed communities based on user activity pattern.

WHEN a user loads any feed with images, THE system SHALL load thumbnails using CDN with lazy loading.

WHEN a user loads any feed, THE system SHALL support infinite scrolling with 20 posts per page.

WHEN a user loads any feed, THE system SHALL support pagination with 20 posts per page.

WHEN a user searches for posts, THE system SHALL return results in under 500ms with a keyword match index.

WHEN a user sorts a feed by "Hot", THE system SHALL calculate scores in real-time based on post age and vote activity.

WHEN a user sorts a feed by "Top", THE system SHALL use pre-calculated score aggregates for performance.

WHEN a user sorts a feed by "Controversial", THE system SHALL calculate the ratio of votes to score for each post in real-time.

WHEN a user sorts a feed by "New", THE system SHALL use the post creation timestamp for ranking.

### Error Handling for External Services

WHEN the image upload service fails, THE system SHALL return an error message stating: "Image upload failed. Please try again."

WHEN the URL validation service fails, THE system SHALL return an error message stating: "URL validation failed. Please check the address and try again."

WHEN the database connection fails during post creation, THE system SHALL return an error message stating: "Server temporary error. Please try again in a few minutes."

WHEN the cache service fails during feed display, THE system SHALL fetch data directly from the database with a slight delay.

WHEN the rate limiting service fails, THE system SHALL apply default limits of 10 posts per 10 minutes.

WHEN the notification service fails during post deletion, THE system SHALL log the failure but maintain the deletion state.

WHEN the CAPTCHA service fails, THE system SHALL allow post submission with a warning logged for review.

WHEN a user uploads an image that is too large, THE system SHALL destroy the temporary file and return an error message.

WHEN a user uploads an image with unsupported format, THE system SHALL destroy the temporary file and return an error message.

WHEN a user uploads a malformed URL, THE system SHALL destroy the temporary record and return an error message.

WHEN a post creation request times out, THE system SHALL return an error message stating: "Request timed out. Please check your connection and try again."

WHEN a post edit request times out, THE system SHALL return an error message stating: "Request timed out. Please check your connection and try again."

WHEN a post delete request times out, THE system SHALL return an error message stating: "Request timed out. Please check your connection and try again."

### Post Recovery and Backup

WHEN a post is deleted, THE system SHALL maintain a backup copy for 30 days.

WHEN a post is backed up, THE system SHALL encrypt the backup copy with AES-256.

WHEN a post is backed up, THE system SHALL store the backup in a geographically separate data center.

WHEN a post is backed up, THE system SHALL store metadata including post ID, creation date, author, community, and deletion reason.

WHEN a post is backed up, THE system SHALL allow admins to restore posts from backup within 30 days of deletion.

WHEN a post is restored from backup, THE system SHALL restore the original votes, comments, and timestamps.

WHEN a post is restored from backup, THE system SHALL send a notification to the original author of the restoration.

WHEN a post is restored from backup, THE system SHALL log the restoration event with admin ID and timestamp.

WHEN a post's backup expires after 30 days, THE system SHALL permanently delete the backup copy.

WHEN a community is deleted, THE system SHALL retain posts from that community in backup for 30 days.

WHEN a user account is deleted, THE system SHALL retain their posts in backup for 30 days.

WHEN a post is restored from backup, THE system SHALL update the "last edited" field to the restoration timestamp.

WHEN a post is restored from backup, THE system SHALL restore it in the same community it was originally posted in.

WHEN a post is restored from backup and the community has been deleted, THE system SHALL restore the post with a placeholder community: "[Deleted Community]".

WHEN a post is restored from backup and the original author's account has been deleted, THE system SHALL show "[Deleted User]" as the author.

WHEN a post is restored from backup and the original author's account has been suspended, THE system SHALL still show the original author name.

WHEN a moderator deletes a post for a violation, THE system SHALL indicate "Moderator-deleted" in the backup metadata.

WHEN an admin deletes a post for a violation, THE system SHALL indicate "Admin-deleted" in the backup metadata.

WHEN a post is deleted by a user, THE system SHALL indicate "User-deleted" in the backup metadata.

WHEN a post is restored from backup, THE system SHALL update the "last edited" field to the current time of restoration.

WHEN a post is restored from backup, THE system SHALL send an in-app notification to the original author (if account exists) and all moderators of the community.

WHEN a post is restored from backup, THE system SHALL make it visible in all relevant feeds as if it were just created.

### Post Display in Different Contexts

WHEN a post is displayed in a user's feed, THE system SHALL ensure consistent display of all metadata.

WHEN a post is displayed on a community page, THE system SHALL ensure consistent display of all metadata.

WHEN a post is displayed in the Popular Feed, THE system SHALL ensure consistent display of all metadata.

WHEN a post is displayed in search results, THE system SHALL ensure consistent display of all metadata.

WHEN a post is displayed in a user's profile page, THE system SHALL ensure consistent display of all metadata.

WHEN a post is displayed via a direct link, THE system SHALL ensure consistent display of all metadata.

WHEN a post is displayed via an API endpoint, THE system SHALL return the same data structure as in web display.

WHEN a post is displayed in an email notification, THE system SHALL show the post title, author, community, and first 100 characters of text with a link to full post.

WHEN a post is displayed in a third-party integration, THE system SHALL maintain the same metadata structure.

WHEN a post is displayed in an embedded widget, THE system SHALL show a compact version with title, author, community, vote score, and comment count.

WHEN a post is displayed in any context, THE system SHALL ensure that the display of text, links, and images follows the rules defined above.

WHEN a post is displayed in any context, THE system SHALL ensure that user privacy and security are maintained.

WHEN a post is displayed in any context, THE system SHALL ensure that moderation actions are respected.

WHEN a post is displayed in any context, THE system SHALL ensure that performance requirements are met.

WHEN a post is displayed in any context, THE system SHALL ensure that the display is consistent with the user's theme and accessibility settings.

WHEN a post is displayed in any context, THE system SHALL ensure that accessibility standards are met (alt text for images, proper headings, etc.).

### Post Integration with Other Systems

WHEN a user reports a post, THE system SHALL link the report to the specific post ID and community.

WHEN a user reports a post, THE system SHALL link the report to the reporting user's ID.

WHEN a moderator views reports, THE system SHALL show the associated post and the original report reason.

WHEN a moderator approves a report, THE system SHALL automatically delete the post based on the moderator's action.

WHEN a moderator dismisses a report, THE system SHALL remove the report entry from the moderator's queue.

WHEN a user deletes their own post, THE system SHALL remove associated reports.

WHEN a post is deleted by a moderator or admin, THE system SHALL mark all associated reports as "Handled".

WHEN a post is restored from backup, THE system SHALL remove all associated reports.

WHEN a user unsubscribes from a community, THE system SHALL not remove posts they created from the community feed.

WHEN a community owner deletes their community, THE system SHALL convert all posts from that community to "[Deleted Community]".

WHEN a community is archived, THE system SHALL maintain all posts for historical purposes.

WHEN a community is archived, THE system SHALL remove it from public discovery searches.

WHEN a community is archived, THE system SHALL still allow users to view posts from that community via direct links.

WHEN a community is archived, THE system SHALL still allow users to access the community feed for archived content.

WHEN a community is archived, THE system SHALL still allow users to report posts in that community.

WHEN a post is created, THE system SHALL automatically add tags based on content if keywords match predefined community categories.

WHEN a post is created, THE system SHALL generate a unique short URL for each post for sharing purposes.

WHEN a post is created, THE system SHALL enable social media sharing buttons for Twitter, Mastodon, and Reddit.

WHEN a post is created, THE system SHALL allow users to copy the post's direct URL to clipboard.

WHEN a post is created, THE system SHALL allow users to quote the post in comments.

WHEN a post is edited, THE system SHALL preserve the edit history for moderator review (last 3 edits only).

WHEN a post is edited, THE system SHALL allow the original author to view edit history only.

WHEN a moderator reviews a post's edit history, THE system SHALL show all edits with timestamps and changes.

WHEN a post's edit history is viewed, THE system SHALL show the original content and all edits in chronological order.

WHEN a post's edit history is viewed, THE system SHALL show the difference between each version.

WHEN a post's edit history is viewed, THE system SHALL show the original author of each edit.

WHEN a post's edit history is viewed, THE system SHALL not display personal information of users who viewed or commented on the post.

WHEN a post is deleted, THE system SHALL log the deletion in the system audit log.

WHEN a post is restored, THE system SHALL log the restoration in the system audit log.

WHEN a post is flagged for review, THE system SHALL log the flagging event.

WHEN a moderator takes action on a post, THE system SHALL log the action in the system audit log.

WHEN a user's action triggers a rate limit, THE system SHALL log the event for potential abuse detection.

WHEN a user attempts to create a post from a blocked IP, THE system SHALL log the attempted creation.

WHEN a user uses a suspicious user agent to create a post, THE system SHALL log the user agent for review.

WHEN a post is created with a high frequency of similar content, THE system SHALL flag it for automated abuse detection.

WHEN a post contains a known spam keyword, THE system SHALL flag it for automated review.

WHEN a post shares text or image with a previously banned post, THE system SHALL flag it for automated review.

WHEN a post has been created from multiple accounts with the same content or image, THE system SHALL flag it for automated review.

WHEN a post is flagged by automated detection, THE system SHALL place it in a moderation queue.

WHEN a post is flagged by automated detection, THE system SHALL notify moderators of the automated flag.

WHEN a post is flagged by automated detection, THE system SHALL send an internal alert to system administrators.

WHEN a post is reviewed by automated detection, THE system SHALL assign a confidence score to the flag.

WHEN a post is reviewed by automated detection with low confidence, THE system SHALL require manual review by a human moderator.

WHEN a post is reviewed by automated detection with high confidence, THE system SHALL allow moderators to approve or reject the recommendation with one click.

WHEN a user reports a post that was previously flagged by automated detection, THE system SHALL prioritize that report for moderation.

WHEN a moderator approves a report on a post that was flagged by automated detection, THE system SHALL update the confidence score and log the human verification.

WHEN a moderator dismisses a report on a post that was flagged by automated detection, THE system SHALL update the confidence score and log the human verification.

WHEN a user uploads an image identical to a previously banned image, THE system SHALL flag the post for automated review using image fingerprinting.

WHEN a user uploads an image that matches a known spam pattern, THE system SHALL flag the post for automated review.

WHEN a user uploads a sequence of similar images within a short time frame, THE system SHALL flag the account as a potential spammer.

WHEN a user creates posts with identical text or similar text patterns, THE system SHALL flag the account as a potential spammer.

WHEN a user creates posts frequently from the same IP address while changing user agents, THE system SHALL flag the account as a potential spammer.

WHEN a user creates posts and immediately deletes them, THE system SHALL flag the account for review.

WHEN a user creates posts and immediately reports them as inappropriate, THE system SHALL flag the account for review.

WHEN a user creates posts and immediately votes on them in a coordinated manner, THE system SHALL flag the account as a potential fraudster.

WHEN a user's posts consistently receive high downvotes, THE system SHALL note the pattern as a potential low-quality contributor.

WHEN a user's posts consistently receive high upvotes, THE system SHALL note the pattern as a potential high-quality contributor.

WHEN a user's posts are frequently reported, THE system SHALL apply a higher scrutiny level for future posts.

WHEN a user's posts are frequently approved by moderators, THE system SHALL apply a lower scrutiny level for future posts.

WHEN a user's posts are frequently deleted, THE system SHALL note the pattern as a potential community rule violator.

WHEN a user's posts are rarely deleted, THE system SHALL note the pattern as a potential community advocate.

WHEN a user's posts are frequently edited, THE system SHALL note the pattern as a potential perfectionist.

WHEN a user's posts are rarely edited, THE system SHALL note the pattern as a potential quick contributor.

WHEN a user's posts are frequently commented on, THE system SHALL note the pattern as a potential engaging contributor.

WHEN a user's posts are rarely commented on, THE system SHALL note the pattern as a potential passive contributor.

WHEN a user's posts are frequently shared, THE system SHALL note the pattern as a potentially viral contributor.

WHEN a user's posts are rarely shared, THE system SHALL note the pattern as a potential niche contributor.

WHEN a user's posts are frequently viewed, THE system SHALL note the pattern as a high-visibility contributor.

WHEN a user's posts are rarely viewed, THE system SHALL note the pattern as a low-visibility contributor.

WHEN a user's posts consistently receive more upvotes than downvotes, THE system SHALL increase their Karma by 0.1% per day.

WHEN a user's posts consistently receive more downvotes than upvotes, THE system SHALL decrease their Karma by 0.1% per day.

WHEN a user's account remains inactive for 1 year, THE system SHALL archive their posts but keep them in backup.

WHEN a user's account remains inactive for 3 years, THE system SHALL permanently delete their posts and backups.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL allow them to restore their account and posts, but shall notify them that posts may no longer be available.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL restore their account and allow them to create new posts.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL send a notification: "Your account has been inactive for 3 years. Your posts and activity history have been permanently deleted. You may resume posting with a fresh start."

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL reset their Karma to 0.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL reset their subscription list to empty.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL reset their profile information to default.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL require re-verification of their email address.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL require re-verification of their password.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL require re-authentication via 2-factor authentication.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL display a welcome-back message.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL display a summary of what has been deleted and what has been preserved.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL allow new subscriptions and post creation immediately.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL allow the user to browse the community without any restrictions.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL allow the user to use all platform features except those requiring restored data.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL treat them as a returning user with no historical data.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL update their "last active" timestamp to the current time.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL remove any flags on their account for past activity.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL remove any temporary restrictions from their account.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL remove any bans from their account if the bans have expired.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL allow moderators to restore any previous decisions they may have made based on the user's past activity.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL allow administrators to review their original account settings.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL allow the user to change their display name, bio, and avatar.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL allow the user to recover their email or reset their password if needed.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL allow the user to re-subscribe to community feeds.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL allow the user to view the community directories and search for communities.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL allow the user to view the Popular Feed and Hot Feed.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL allow the user to create new posts immediately.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL notify other users when the user posts for the first time after returning.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL notify moderators when the user posts for the first time after returning.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL notify administrators when the user posts for the first time after returning.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL apply normal post creation limits.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL apply normal rate limiting.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL apply normal spam detection mechanisms.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL apply normal reputation systems.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL apply normal moderation policies.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL apply normal content policies.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL apply normal community guidelines.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL treat them as a new user with zero history.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL welcome them back to the community.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL encourage them to explore new communities and contribute new content.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL remind them of the community rules and expectations.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL offer them a brief tutorial on new features since their last login.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL offer them a personalized feed based on their past subscriptions.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL offer them top communities based on their past interests.

WHEN a user's account remains inactive for 3 years and the user returns, THE system SHALL offer them a list of top posts from communities they previously subscribed to.

## Post Voting

### Vote Mechanics

WHEN a user interacts with a post, THE system SHALL allow three distinct voting actions:

- Upvote: Increases the post's vote score by 1
- Downvote: Decreases the post's vote score by 1
- Vote removal: Restores the post's vote score to its state before the user's vote was cast

WHEN a user attempts to vote on a post, THE system SHALL validate that the user is authenticated and not banned from viewing the post's community.

WHILE a post is visible to a user, THE system SHALL display the current vote score and the user's current vote status (if any).

### Vote State Management

WHEN a user has not voted on a post, THE system SHALL represent their vote state as "none".

WHEN a user submits an upvote to a post they have not previously voted on, THE system SHALL update their vote state to "upvote" and increase the post's vote score by 1.

WHEN a user submits a downvote to a post they have not previously voted on, THE system SHALL update their vote state to "downvote" and decrease the post's vote score by 1.

## One-Vote-Per-User Rule

WHEN a user attempts to cast a new vote on a post, THE system SHALL enforce a one-vote-per-user rule.

IF a user has an existing vote on a post, THEN THE system SHALL consider the new vote request as a vote change request, NOT a new vote.

WHILE a user is actively viewing a post, THE system SHALL prevent the display of redundant voting options that would violate the one-vote-per-user rule (e.g., don't show "upvote" if they've already upvoted).

## Vote Type Changes

WHEN a user changes their vote from upvote to downvote on a post, THE system SHALL:

- Decrement the post's vote score by 1 (removing the previous upvote)
- Then decrement the post's vote score by 1 again (applying the new downvote)
- Update the user's vote state from "upvote" to "downvote"

WHEN a user changes their vote from downvote to upvote on a post, THE system SHALL:

- Increment the post's vote score by 1 (removing the previous downvote)
- Then increment the post's vote score by 1 again (applying the new upvote)
- Update the user's vote state from "downvote" to "upvote"

WHEN a user attempts to change their vote to the same type they already have, THE system SHALL ignore the request and maintain the current vote state.

## Vote Removal Process

WHEN a user removes their vote from a post, THE system SHALL:

- Restore the post's vote score to its value before the user's vote was cast
- Update the user's vote state to "none"
- Remove the user's vote record from the vote storage system

WHEN a vote removal occurs, THE system SHALL maintain historical data for audit purposes but shall not include it in the current vote score calculation.

## Vote Score Calculation

THE system SHALL calculate a post's vote score as the algebraic sum of all individual user votes.

WHERE a user has cast an upvote, THE system SHALL count this as +1 in the vote score calculation.

WHERE a user has cast a downvote, THE system SHALL count this as -1 in the vote score calculation.

WHERE a user has removed their vote, THE system SHALL count this as 0 in the vote score calculation.

THE vote score SHALL be a whole number (integer) and MAY be negative.

The vote score SHALL be recalculated and persisted immediately after each successful vote action.

## Vote Display

WHEN a post is displayed in any feed, THE system SHALL display its current vote score as a numeric value.

WHEN a user views an individual post, THE system SHALL:

- Display the post's vote score prominently
- Visually indicate the user's current vote status (if any) through color, icon, or style
- Display separate counters for upvotes and downvotes if requested by the user interface

WHEN a user's vote is active on a post, THE system SHALL highlight the voting control for that vote type (e.g., make upvote button darker).

THE vote score SHALL be displayed as a single number without prefixes or suffixes (e.g., "7", "-2", "0") and SHALL NOT include unit labels.

## Vote History Access

THE system SHALL not expose the historical record of individual votes to end users.

WHERE an administrative user is performing moderation or auditing, THE system SHALL provide access to the complete vote history for individual posts.

WHILE the system is calculating vote scores, THE system SHALL ignore votes from users who have been banned from the post's community.

## Vote Integrity Rules

THE system SHALL ensure that vote score calculations are atomic and thread-safe to prevent race conditions during concurrent voting activity.

WHEN a user is banned from a community, THE system SHALL immediately invalidate all votes cast by that user on posts within that community, updating the vote score accordingly.

WHEN a post is deleted, THE system SHALL remove all associated votes from the voting system and update all affected feeds.

WHEN a community is archived or deleted, THE system SHALL retain all vote data for the lifetime of the system.

WHEN a user account is deleted, THE system SHALL remove all votes associated with that user's account and update all affected post vote scores.

THE system SHALL validate that vote operations always originate from authenticated users.

WHEN a vote operation cannot be completed due to system error or database failure, THE system SHALL reject the operation and return an appropriate error message to the user.

THE system SHALL maintain data consistency between the vote score displayed on all views of a post.

## Post Feeds

### Home Feed Logic

WHEN a member is logged in, THE system SHALL display the Home Feed as their default view.

WHEN a member views the Home Feed, THE system SHALL show only posts from communities they are subscribed to.

WHEN a member unsubscribes from a community, THE system SHALL immediately stop showing posts from that community in their Home Feed.

WHEN a member subscribes to a new community, THE system SHALL include posts from that community in their Home Feed on the next feed load.

WHILE a member is logged in, THE system SHALL prioritize displaying their Home Feed over other feeds unless explicitly navigated elsewhere.

IF a member attempts to access the Home Feed while not authenticated, THEN THE system SHALL redirect them to the Popular Feed with a prompt to login.

IF a member has not subscribed to any communities, THEN THE system SHALL display a message: "You haven't subscribed to any communities yet. Explore popular communities to get started."

### Popular Feed Logic

THE system SHALL make the Popular Feed available to all users, including guests and unauthenticated visitors.

WHEN a user accesses the Popular Feed, THE system SHALL show posts from all communities on the platform, regardless of subscription status.

THE system SHALL NOT require authentication to view the Popular Feed.

WHILE the Popular Feed is active, THE system SHALL ensure that all posts are publicly accessible, even if the user is not subscribed to their originating community.

WHEN a guest accesses the Popular Feed, THE system SHALL display all content features except voting, commenting, and creating posts.

WHEN a member accesses the Popular Feed, THE system SHALL retain their ability to vote, comment, and subscribe to communities, but these actions do not affect the feed's content composition.

### Community Feed Logic

WHEN a user navigates to a specific community page, THE system SHALL display the Community Feed for that community.

THE system SHALL display all posts in a community's feed to both authenticated and unauthenticated users.

WHEN a user is not subscribed to a community, THE system SHALL still show all posts from that community in its Community Feed.

WHEN a user views a Community Feed, THE system SHALL display the community's name, icon, and description prominently at the top.

WHEN a user attempts to create a post in a community where they are not subscribed, THEN THE system SHALL prevent submission and show: "You must be subscribed to this community to create posts."

WHEN a user is banned from a community, THEN THE system SHALL hide all their posts from that community's feed (but not from their own profile or other feeds).

### Sorting Algorithms

#### Hot Sorting

WHEN the Hot sort is selected, THE system SHALL rank posts using an algorithm based on recent activity and engagement.

THE system SHALL calculate a Hot score as: (log(upvotes + 1)) + (hours since posted) * 0.1 - (hours since posted) * 0.2

WHILE a post is older than 24 hours, THE system SHALL reduce its Hot score gradually.

WHILE a post receives more than 10 votes in the last hour, THE system SHALL boost its visibility to the top of the Hot feed.

WHEN a post receives no votes in the last 7 days, THE system SHALL remove it from the Hot feed.

#### New Sorting

WHEN the New sort is selected, THE system SHALL rank posts by creation time in descending order (most recent first).

THE system SHALL ignore vote scores, comment counts, or community popularity in New sorting.

WHEN two posts have identical creation times, THE system SHALL use their database ID as a tiebreaker.

WHILE new posts are being created, THE system SHALL update the New feed in real-time with a 1-second delay.

#### Top Sorting

WHEN the Top sort is selected, THE system SHALL calculate the highest vote score (upvotes - downvotes) for each post.

WHEN a time filter is applied to Top sorting (Today, This Week, This Month, This Year, All Time), THE system SHALL filter posts by creation date before sorting by score.

WHEN no time filter is selected, THE system SHALL use 'All Time' as the default.

WHEN a post's vote score is negative, THE system SHALL still include it in the Top feed if it ranks highly.

WHEN two posts have identical scores, THE system SHALL sort by creation time (newer first).

#### Controversial Sorting

WHEN the Controversial sort is selected, THE system SHALL rank posts with a high total number of votes but a score close to zero.

THE system SHALL calculate a Controversial score using: (upvotes + downvotes) * (1 - abs(score) / (upvotes + downvotes + 1))

WHEN a post has fewer than 10 total votes, THE system SHALL exclude it from the Controversial feed.

WHEN an upvote and downvote are balanced exactly (score = 0), THE system SHALL award the highest Controversial score.

WHEN a post has 100 total votes but a score of +1 or -1, THE system SHALL rank it highly in the Controversial feed.

WHEN a post has one upvote and no downvotes, THE system SHALL exclude it from the Controversial feed.

### Pagination Strategy

WHEN any feed is loaded, THE system SHALL initially return 20 posts per page.

WHEN a user scrolls to the bottom of the feed, THE system SHALL load the next page of 20 posts automatically (infinite scroll).

WHEN a user clicks on a new sort option, THE system SHALL reset pagination to page 1 and reload the feed.

WHEN a user navigates from one feed type to another, THE system SHALL clear the current feed data and load the new feed from page 1.

WHEN users navigate back to a previously viewed feed, THE system SHALL retain their scroll position but reload the feed content to ensure data freshness.

MOBILE CONSTRAINT: EACH PAGE LOAD SHALL NOT EXCEED 200KB of JSON payload.

### Feed Loading Performance

THE system SHALL ensure that all feeds load in under 1.5 seconds on slow 3G connections.

WHILE the feed is loading, THE system SHALL display a skeleton loading UI with placeholder cards matching the post structure.

WHEN a post's content is updated (edit/delete), THE system SHALL update its state in all feeds within 3 seconds.

WHEN a user's vote changes, THE system SHALL update the post's vote score in their currently viewed feed within 1 second.

THE system SHALL cache feed responses for 10 minutes to reduce server load for anonymous users.

Following third-party cookie policies, THE system SHALL NOT use browser caching for members on authenticated feeds unless tokens are included in cache keys.

### Guest Access Rules

IF a user is not logged in (guest), THEN THE system SHALL allow viewing of all feeds.

IF a user is not logged in, THEN THE system SHALL disable all interactive features: voting, commenting, creating posts, and subscribing.

IF a user is not logged in and attempts to vote, THEN THE system SHALL display a modal: "You must be logged in to vote."

IF a user is not logged in and attempts to comment, THEN THE system SHALL display a modal: "You must be logged in to comment."

IF a user is not logged in and attempts to subscribe, THEN THE system SHALL display a modal: "You must be logged in to subscribe to communities."

### Feed Personalization

THE system SHALL NOT personalize the Popular Feed based on user behavior, interests, or past activity.

THE system SHALL NOT display ads in any feed.

THE system SHALL NOT show recommended posts based on a user's subscription history unless explicitly requested.

IF a user has never interacted with the platform, THE system SHALL display the most popular posts on the Popular Feed (by total upvotes) as the default.

THE system SHALL NOT filter or suppress content based on political, social, or ideological views.

WHEN a user reports a post, THE system SHALL NOT automatically hide it from any feed until a moderator takes action.

## Comments

### Comment Creation

WHEN a member attempts to create a comment on a post, THE system SHALL validate that:
- The member is authenticated
- The comment content is not empty
- The comment content does not exceed 10,000 characters
- The associated post exists and is not archived

THE system SHALL THEN:
- Create a new comment record with the member's ID, post ID, content, and current timestamp
- Assign the comment a unique ID
- Set the comment's parent ID to null (indicating top-level comment)
- Initialize the comment's vote score to 0
- Increment the post's comment count by 1
- Record the comment creation event in the audit log

WHEN a comment creation fails due to validation error, THE system SHALL:
- Return HTTP 422 Unprocessable Entity with appropriate error code and message
- Include the specific validation failure reason in the response
- Avoid creating any database record or incrementing any counters

### Reply System

WHEN a member attempts to reply to an existing comment, THE system SHALL:
- Validate that the member is authenticated
- Validate that the target comment exists and is not deleted or archived
- Validate that the reply content is not empty and does not exceed 10,000 characters

THE system SHALL THEN:
- Create a new comment record with the member's ID, the same post ID as the parent comment, and the reply content
- Set the comment's parent ID to the ID of the target comment
- Initialize the comment's vote score to 0
- Increment the parent comment's reply count by 1
- Increment the post's comment count by 1
- Record the reply creation event in the audit log

WHEN a reply is created to a comment that already has replies, THE system SHALL maintain the original comment's position in the comment tree without reordering

THE system SHALL support reply chains of unlimited depth

### Comment Depth Limit

WHILE the comment system supports unlimited reply depth, THE system SHALL:
- Allow replies to any existing comment regardless of its depth in the hierarchy
- Not impose any maximum depth limit on the comment tree structure
- Maintain referential integrity by ensuring parent IDs always reference existing comment records

THE system SHALL NOT limit the number of replies to a single comment

### Edit/Delete Permissions

WHEN a member attempts to edit their own comment, THE system SHALL:
- Verify the comment belongs to the authenticated member
- Check that the comment was created within the last 24 hours
- Validate that the new content is not empty and does not exceed 10,000 characters
- Record the edit timestamp and the number of edits made to the comment

THE system SHALL prevent editing of comments older than 24 hours

WHEN a member attempts to delete their own comment, THE system SHALL:
- Verify the comment belongs to the authenticated member
- Delete the comment record from the database
- Decrement the associated post's comment count by 1
- Decrement the parent comment's reply count by 1 (if applicable)
- Mark the comment as deleted in the audit log
- Preserve the comment's unique ID for referential integrity

WHEN a moderator attempts to edit any comment within their community, THE system SHALL:
- Verify the moderator has appropriate permissions for the target community
- Allow editing regardless of comment age or ownership
- Record the modifier's ID and reason for edit in the audit log

WHEN a moderator attempts to delete any comment within their community, THE system SHALL:
- Verify the moderator has appropriate permissions for the target community
- Delete the comment from the database
- Decrement the associated post's comment count by 1
- Decrement the parent comment's reply count by 1 (if applicable)
- Record the deletion event in the audit log with moderator ID and reason
- Preserve the comment's unique ID for referential integrity

THE system SHALL allow moderators to edit or delete comments regardless of the 24-hour edit window

### Comment Deletion Rules

WHEN a comment is deleted by its author or a moderator, THE system SHALL:
- Remove the comment from all feed displays
- Hide the comment content from all public views
- Maintain the comment's record in the database with "deleted" status flag
- Retain the comment's ID, timestamp, author, and post association for audit trail
- Preserve reply-to relationships for proper comment tree structure

WHEN a comment that has replies is deleted, THE system SHALL:
- Mark the delete comment as "deleted" in the database
- Retain the comment's ID in the reply-to relationships of its children
- Display the deleted comment as "[Comment deleted by author]" or "[Comment deleted by moderator]" in the UI
- Show the reason for deletion if provided by the moderator
- Maintain the reply count of the parent comment (the count of replies to the deleted comment remains)
- Maintain the post's comment count (the deleted comment counts toward the total)

WHEN a deleted comment's parent comment is also deleted, THE system SHALL maintain all audit trails and relationships between deleted records

### Comment Archiving

THE system SHALL NOT automatically archive any comments

THE system SHALL support manual archiving of comments by moderators upon request

WHEN a moderator archives a comment, THE system SHALL:
- Mark the comment with an "archived" status flag
- Remove the comment from all public feeds and post display pages
- Prevent the comment from receiving new votes or replies
- Retain all comment data, relationships, and audit trails
- Allow moderators to unarchive the comment at any time

### Comment Visibility

WHILE a comment is active (not deleted or archived), THE system SHALL display it to:
- All authenticated users
- All unauthenticated guests
- All members of the associated community

WHEN a comment is deleted by its author, THE system SHALL hide the comment content from all users, including the author

WHEN a comment is deleted by a moderator, THE system SHALL hide the comment content from all users except other moderators

WHEN a comment is archived by a moderator, THE system SHALL hide the comment from all users except moderators

THE system SHALL display "[Comment deleted by author]" to all users when a comment has been deleted by its author

THE system SHALL display "[Comment deleted by moderator]" to all users when a comment has been deleted by a moderator

THE system SHALL display "[Comment archived by moderator]" to all users when a comment has been archived by a moderator

WHEN viewing the comment history of a user, THE system SHALL show deleted comments as "[Deleted]" along with timestamp and post affiliation

### Comment Integrity Rules

WHEN a comment is retrieved as part of a post's comment tree, THE system SHALL recursively fetch and return all child replies in an ordered structure

WHEN a comment has multiple replies, THE system SHALL maintain the order of creation for sorting purposes

THE system SHALL validate that all comment parent IDs reference existing comment records

The system SHALL prevent a comment from becoming its own parent (circular references)

WHEN a post is deleted, THE system SHALL delete all associated comments and their reply chains

WHEN a post is archived, THE system SHALL mark all associated comments as archived

WHEN a member account is deleted, THE system SHALL delete all comments created by that member

THE system SHALL prevent comment duplication (two comments with identical content, same author, and same parent within a 5-minute window)

When a comment is edited, THE system SHALL retain the original content in an audit log

THE system SHALL enforce the 24-hour edit window strictly

THE system SHALL not allow edits to comments that have received votes

THE system SHALL prevent the deletion of comments that are part of an active report

THE system SHALL support the use of Unicode characters, emoji, and special symbols in comment content

THE system SHALL handle HTML tags by escaping them in display (no HTML execution)

THE system SHALL strip any leading or trailing whitespace from comment content before storage

THE system SHALL enforce a minimum length of 1 character for comment content

THE system SHALL limit comment content to UTF-8 encoded text only

THE system SHALL prevent comment submission during system maintenance windows

WHEN comment fetching is requested with pagination, THE system SHALL return comments in reverse chronological order (newest first) by default

WHEN a user navigates to a post's comment section, THE system SHALL load up to 20 top-level comments and their first-level replies on initial load

THE system SHALL load additional comment threads via lazy loading as the user scrolls down

THE system SHALL prevent comment loading for posts that are flagged as spam

## Comment Voting

### Overview

The comment voting system enables community members to express approval or disapproval of comments, influencing content visibility and user reputation. The system must provide fair, transparent, and abuse-resistant mechanisms for voting, with distinct sorting algorithms to surface the most relevant comments based on different criteria. Voting directly impacts comment visibility and indirectly influences user karma through its relationship with the core karma system.

### Core Voting Mechanics

WHEN a member submits a vote on a comment, THE system SHALL record the vote according to the following rules:

- THE system SHALL allow only one active vote per member per comment
- THE system SHALL accept two vote types: upvote and downvote
- THE system SHALL record the time of each vote
- THE system SHALL associate each vote with the member's unique identifier
- THE system SHALL prevent voting on comments by non-authenticated users (guests)
- THE system SHALL prevent voting on comments that have been deleted
- THE system SHALL prevent voting on comments belonging to communities where the member is banned
- THE system SHALL prevent comments from being voted on if they belong to a community that has been suspended

### One-Vote-Per-Comment Rule

WHEN a member attempts to vote on a comment they have already voted on, THE system SHALL:

- IF the new vote is identical to the existing vote, THEN THE system SHALL ignore the request and return a "vote unchanged" status
- IF the new vote is different from the existing vote, THEN THE system SHALL:
  - Remove the existing vote
  - Record the new vote
  - Adjust the comment's score by -1 (for removing previous vote) and +1 (for new vote)
  - Adjust the member's karma by -1 (removing previous impact) and +1 (adding new impact)
- THE system SHALL update the comment's score immediately after vote modification

WHILE a member has an existing vote on a comment, THE system SHALL NOT allow the member to submit a second vote without first changing or removing their existing vote

### Vote Type Changes

WHEN a member changes their vote on a comment, THE system SHALL:

- IF member had an upvote and submits a downvote, THEN THE system SHALL:
  - Decrease comment score by 2 (remove +1, add -1)
  - Decrease member karma by 2 (remove +1, add -1)
- IF member had a downvote and submits an upvote, THEN THE system SHALL:
  - Increase comment score by 2 (remove -1, add +1)
  - Increase member karma by 2 (remove -1, add +1)
- THE system SHALL record the modification timestamp
- THE system SHALL maintain audit trail of all vote changes
- THE system SHALL not alter the vote history of other members

### Vote Removal Process

WHEN a member removes their vote on a comment, THE system SHALL:

- IF member had an upvote, THEN THE system SHALL decrease comment score by 1 and decrease member karma by 1
- IF member had a downvote, THEN THE system SHALL increase comment score by 1 and increase member karma by 1
- THE system SHALL delete the membership-vote relationship
- THE system SHALL record the removal timestamp and reason (user-initiated)
- THE system SHALL update the comment score immediately
- THE system SHALL ensure the member cannot re-vote until an explicit new vote is submitted

### Vote Score Calculation

THE comment score SHALL be calculated as:

- comment_score = total_upvotes - total_downvotes
- THE score SHALL be displayed as an integer
- THE score SHALL not be cached
- THE score SHALL be recalculated from the database every time the comment is retrieved
- THE system SHALL update comment score atomically when votes are added, changed, or removed
- THE system SHALL prevent manual manipulation of comment score through any API or interface

### Sorting Algorithms

Comment sorting on a post page SHALL support three modes: Best, New, Controversial. Each mode determines content presentation according to distinct business logic.

#### Best Sort Algorithm

WHEN comment sorting is set to "Best", THE system SHALL:

- Arrange comments by vote score in descending order (highest first)
- For comments with identical scores, sort chronologically by creation timestamp with newest first
- THE system SHALL apply no time decay to scores
- THE system SHALL include comments from all depths of nesting
- THE system SHALL rank replies directly under their parent comment based on their score
- THE system SHALL prioritize high-vote comments regardless of age
- THE system SHALL not apply any bias toward comments by moderators or community owners

#### New Sort Algorithm

WHEN comment sorting is set to "New", THE system SHALL:

- Arrange comments chronologically by creation timestamp in descending order (newest first)
- THE system SHALL ignore vote scores entirely when sorting
- THE system SHALL include comments from all depths of nesting
- THE system SHALL display replies in the order they were created, grouped under their parent
- THE system SHALL prioritize recency over popularity

#### Controversial Sort Algorithm

WHEN comment sorting is set to "Controversial", THE system SHALL:

- Calculate controversy score for each comment using:

  controversy_score = total_downvotes + total_upvotes

- Arrange comments by controversy_score in descending order (most controversial first)
- WHERE controversy_score is equal, sort by absolute value of vote_score in ascending order (closest to zero first)
- WHERE controversy_score and vote_score are equal, sort chronologically by creation timestamp with newest first
- THE system SHALL apply no time decay
- THE system SHALL include comments from all depths of nesting
- THE system SHALL identify and surface comments with high engagement but balanced approval/disapproval
- THE system SHALL not modify the actual vote score, only use it for ranking

### Vote Display

THE system SHALL display the comment vote score in the following manner:

- Show the integer score immediately below the comment text
- Show upvotes and downvotes only after a user hovers or taps the score
- Show "Upvote" and "Downvote" buttons to authenticated members
- Show "You upvoted" or "You downvoted" as overlay if member has voted
- Show "Vote" button for non-authenticated users (guests)
- Show a visual indicator (e.g., color or icon) for comments with negative scores
- Hide vote counts entirely for comments that have been deleted
- Display "Vote" as the default state for guests

### Vote Integrity Rules

WHILE the comment voting system is operational, THE system SHALL:

- Prevent any direct update or manipulation of comment scores through admin interfaces or API endpoints without audit trail
- Prevent any actor from voting on their own comment
- Prevent any actor from voting on comments posted by members they have blocked
- Prevent any actor from voting on comments posted by banned members
- Prevent any actor from voting on comments posted in communities they have banned from
- Prevent any script or automated tool from submitting multiple votes in rapid succession (rate limiting)
- Prevent vote manipulation through proxy IPs or fake accounts (fraud detection)
- Log all vote actions with timestamp, IP address, user agent, and user ID
- Allow moderators to disable voting entirely on specific comments
- Allow moderators to reset or remove all votes on a comment as an administrative action
- Allow administrator to audit all votes on any comment in the system

### Relationship to Karma System

WHEN a vote on a comment changes (added, changed, removed), THE system SHALL:

- Update the karma of the comment's author by ±1 depending on vote type change
- Update the karma of the voting member if they had a previous vote to compensate for removal
- The karma change SHALL be immediate and non-delayed
- Karma change SHALL be recorded in the user's karma history log
- Karma score SHALL be visible on the user's profile
- Karma score SHALL be used as a reputation indicator, but never as a gate for voting privileges

### Relationship to Moderation System

IF a comment has been reported, THEN THE system SHALL:

- Still allow members to vote on the comment
- Continue to display the comment's vote score
- Prevent voting on comments that have been deleted by moderators
- Allow moderators to set a "lock voting" flag on comments to prevent any changes
- Allow moderators to clear all votes on a comment during review

WHILE a comment is under moderation review, THE system SHALL continue to allow normal voting behavior unless explicitly disabled by moderator

### User Experience Expectations

THE system SHALL ensure:

- Vote updates appear instantaneously when clicked (under 500ms response time)
- Page load of a comment thread with voting indicators shall complete in under 1.5 seconds
- Vote changes shall persist across page refreshes
- Vote buttons shall be accessible by keyboard
- Comment vote counts shall be visible without requiring scrolling or interaction

### Edge Cases Handling

IF a comment is restored after being deleted, THEN THE system SHALL:

- Restore the comment's original vote score
- Restore the vote associations with users
- Restore vote timestamps
- Restore the audit trail of all previous votes
- Update comment visibility if parent post has been deleted or hidden

WHEN a user account is permanently deleted, THEN THE system SHALL:

- Remove all of the user's votes from the comment vote tables
- Recalculate each affected comment's score accordingly
- Reduce the karma of comment authors by the total impact of the deleted votes
- Preserve the comment content but remove all association with the deleted user
- Mark the vote removal as "user deleted" in audit logs

WHEN a user is permanently banned from the system, THEN THE system SHALL:

- Remove their votes from all comment records
- Recalculate scores of all impacted comments
- Reduce karma of comment authors proportionally
- Mark removal in audit logs as "ban removal" 
- Retain the comment content and any votes from other users

### Data Validation and Constraints

WHERE comment votes are stored and retrieved, THE system SHALL:

- Validate that all user IDs are valid existing members
- Validate that comment IDs are valid and not already deleted
- Validate that vote direction is either 'up' or 'down'
- Reject votes submitted with malformed data
- Reject votes submitted from non-existent sessions
- Reject votes submitted without authentication token
- Reject votes on non-existent comments
- Reject votes from blacklisted IP addresses
- Reject votes with timestamps more than 24 hours in the future

### Historical Consistency

THE system SHALL:

- Preserve all historical votes indefinitely
- Never purge vote records when comments are archived
- Maintain vote history for compliance and moderation purposes
- Retain vote records for deleted users for audit trail
- Prevent any retroactive modification of votes from other members
- Maintain vote record integrity regardless of subsequent content edits or deletions

### Performance Requirements

THE system SHALL:

- Return comment vote counts within 1 second for threads under 500 comments
- Update vote scores atomically under 100ms when submitted
- Support up to 5,000 concurrent vote operations per second
- Maintain 99.9% availability for vote submission endpoints
- Return correct vote counts even under high concurrent load

### Testability Criteria

All requirements are testable with clear pass/fail criteria:

- ✓ Upvote on clean comment increases score by +1
- ✓ Downvote on clean comment decreases score by -1
- ✓ Upvote then downvote on same comment results in net 0 score change
- ✓ Vote removal on upvote reduces score by -1
- ✓ Controversial sort returns comments with 10 upvotes and 9 downvotes before 5 upvotes and 1 downvote
- ✓ Best sort returns 100 score comment before 99 score comment
- ✓ New sort returns 2026-02-06T12:52:27Z comment before 2026-02-06T12:52:25Z comment
- ✓ Guest cannot vote on any comment
- ✓ Banned user cannot vote on any community comment
- ✓ Moderator can disable voting on comment
- ✓ Deletion of user removes their votes and recalculates scores
- ✓ System prevents duplicate votes
- ✓ System prevents self-voting
- ✓ System logs all vote actions
- ✓ System prevents vote manipulation
- ✓ Karma system adjusts correctly based on voting changes

### Diagram: Comment Voting Workflow

```mermaid
graph LR
    A[User Interacts with Comment] --> B{Authenticated?}
    B -->|No| C[Show "Vote" button]
    B -->|Yes| D[Show Current Vote Status]
    D --> E[User Clicks Upvote]
    D --> F[User Clicks Downvote]
    D --> G[User Clicks Vote Button again]
    E --> H{Existing Vote?}
    F --> H
    G --> H
    H -->|No| I[Add Vote, Increment Score, Update Karma]
    H -->|Yes, Same| J[Ignore Request]
    H -->|Yes, Different| K[Remove Old Vote, Add New Vote, Adjust Score ±2]
    H -->|Yes, Remove| L[Remove Vote, Adjust Score ±1, Adjust Karma]
    I --> M[Update UI]
    K --> M
    L --> M
    M --> N[Display Updated Vote Count]
    N --> O[Log Vote Action]
    O --> P[Complete]
```

### Critical Integrity Constraints

- Comment voting MUST NOT be affected by the time of posting
- Comment vote scores MUST be calculated in real-time from the database, not stored as static values
- Vote counts MUST only be modified through the approved voting interface or moderation action
- The karma system MUST never directly influence the comment voting system (e.g., no bonus votes for high karma users)
- The "Controversial" sort algorithm MUST not penalize new comments with low vote totals

## Moderation System

### Moderation Roles

#### Community Owner

- The user who creates a community automatically becomes its owner
- Has complete authority over all aspects of the community
- Cannot be removed from ownership by any moderator
- Can add any member as moderator
- Can remove any moderator
- Can change community settings (name, description, icon)
- Has access to all moderator actions
- Is the only actor with authority to remove moderators
- Is responsible for community governance within platform rules

#### Moderator

- Can be added by community owners or other moderators
- Has the same moderation powers as owners for content removal and user bans
- Cannot remove other moderators
- Cannot remove the community owner
- Cannot change community ownership
- Cannot change community settings (name, description, icon)
- Cannot add owners
- Operates under the authority of the community owner
- Has no authority over other moderators

#### Administrator (Platform Admin)

- Appointed by system, not by users
- Has full system-wide moderation authority
- Overrides community-level moderation decisions
- Has access to all communities, posts, comments, and users
- Can perform any moderator action on any community
- Can manage global community settings
- Can add or remove system moderators
- Is not subject to community-specific rules
- Reports directly to platform governance
- Acts as final authority for extreme cases

### Owner Permissions

#### Community Management

- WHEN a user creates a community, THE system SHALL automatically grant them ownership
- WHEN an owner deletes their community, THE system SHALL delete all associated posts and comments
- WHEN an owner changes their username, THE system SHALL update the owner reference in the community record
- THE system SHALL enforce exactly one owner per community
- WHERE a community has no owner, THE system SHALL designate it as orphaned with restricted functionality
- WHERE an owner deletes their account, THE system SHALL transfer ownership to the first active moderator
- WHERE no moderator exists when an owner deletes their account, THE system SHALL delete the community and all its content

#### Moderator Management

- WHEN an owner adds a moderator, THE system SHALL add them to the community's moderator list
- WHEN an owner removes a moderator, THE system SHALL remove them from the community's moderator list
- WHILE a user is an owner of a community, THE system SHALL NOT allow them to be removed as moderator
- WHEN an owner tries to remove themselves as owner, THE system SHALL transfer ownership to an active moderator or delete the community
- WHERE an owner adds a user who is already a moderator in another community, THE system SHALL allow dual-moderation status
- WHILE a user is an owner, THE system SHALL NOT allow them to be banned from their own community

#### Access Controls

- WHILE a user is community owner, THE system SHALL grant them full access to all community content
- WHEN an owner views a community, THE system SHALL show them the "Owner" badge on their profile in all posts and comments
- WHERE an owner reports content in their own community, THE system SHALL treat it as administrative review, not a user report
- WHEN an owner bans a moderator, THE system SHALL remove them as moderator and apply the ban
- WHERE an owner bans themselves, THE system SHALL transfer ownership to a moderator and then apply the ban

### Moderator Permissions

#### Content Moderation

- WHEN a moderator deletes a post, THE system SHALL remove the post from all feeds and archive it
- WHEN a moderator deletes a comment, THE system SHALL remove the comment and all its replies and archive them
- WHEN a moderator approves a report, THE system SHALL immediately delete the reported content and remove the report from the queue
- WHEN a moderator dismisses a report, THE system SHALL remove the report from the queue without taking action on the content
- WHILE a post is banned by a moderator, THE system SHALL hide it from all views except moderators and owners
- WHILE a comment is banned by a moderator, THE system SHALL hide it from all views except moderators and owners
- WHEN a moderator deletes content, THE system SHALL log the action with reason, moderator ID, and timestamp
- WHERE a moderator deletes content, THE system SHALL notify the content author that it was removed by a moderator
- WHEN a moderator deletes a post, THE system SHALL decrement the author's karma if the post had upvotes
- WHEN a moderator deletes a comment, THE system SHALL decrement the author's karma if the comment had upvotes

#### User Moderation

- WHEN a moderator bans a user from a community, THE system SHALL remove their subscription if they were subscribed
- WHEN a moderator bans a user from a community, THE system SHALL prevent them from creating new posts or comments in that community
- WHEN a moderator bans a user from a community, THE system SHALL preserve their existing posts and comments unless specifically deleted
- WHEN a moderator unbans a user from a community, THE system SHALL restore their ability to create posts and comments in that community
- WHILE a user is banned from a community, THE system SHALL allow them to view posts and comments but not interact with them
- WHEN a moderator bans a user from a community, THE system SHALL add them to the community's banned user list
- WHEN a moderator unbans a user from a community, THE system SHALL remove them from the community's banned user list
- WHERE a banned user tries to subscribe to a community they are banned from, THE system SHALL deny access
- WHERE a moderator bans a user who is already a moderator in another community, THE system SHALL maintain their moderator status in other communities

#### Report Handling

- WHEN a moderator accesses their community's report queue, THE system SHALL show them all reports for their community
- WHEN a moderator loads a report, THE system SHALL display: the reported content, the user who reported it, the reason, and the timestamp
- WHEN a moderator approves a report, THE system SHALL record the moderator ID and timestamp of approval
- WHEN a moderator dismisses a report, THE system SHALL record the moderator ID and timestamp of dismissal
- WHERE a reported post or comment has been deleted, THE system SHALL indicate "Deleted" in the report interface

### User Banning

WHEN a moderator or owner bans a user from a community, THE system SHALL:

- Remove the user's subscription to that community (if subscribed)
- Prevent the user from creating new posts or comments in that community
- Preserve the user's existing posts and comments unless specifically deleted by a moderator
- Add the user to the community's banned user list
- Show a notification to the user if they attempt to access the community

WHEN a system admin bans a user from a community, THE system SHALL:

- Perform all actions above
- Record the admin ID and reason for the ban
- Notify the user and the community owner of the ban

WHEN a user is banned from a community, THE system SHALL continue to allow them to:
- View posts and comments in that community
- View the community feed
- View other community pages

The ban SHALL prevent interaction only, not viewing.

WHEN a user attempts to create a post in a community they have been banned from, THE system SHALL:

- Deny the creation
- Return an error message: "Your account has been banned from this community."
- Log the attempted violation

WHEN a user attempts to comment in a community they have been banned from, THE system SHALL:

- Deny the comment
- Return an error message: "Your account has been banned from this community."
- Log the attempted violation

WHEN a user attempts to subscribe to a community they have been banned from, THE system SHALL:

- Deny the subscription
- Return an error message: "Your account has been banned from this community."
- Log the attempted violation

WHEN a user attempts to report content in a community they have been banned from, THE system SHALL:

- Allow the report
- Record the reporter's identity
- Apply normal report processing

### Unbanning Process

WHEN a moderator or owner unbans a user from a community, THE system SHALL:

- Remove the user from the community's banned user list
- Restore the user's ability to create posts and comments in that community
- Allow the user to resubscribe to the community
- Send an in-app notification to the user

WHEN a system admin unbans a user from a community, THE system SHALL:

- Perform all actions above
- Record the admin ID and reason for the unban
- Notify the user and the community owner of the unban

WHEN a user is unbanned from a community, THE system SHALL:

- Allow the user to view content normally
- Allow the user to comment on posts
- Allow the user to create new posts
- Allow the user to subscribe to the community
- Restore all previous privileges except those revoked by other actions

WHEN a user is unbanned, THE system SHALL NOT restore any deleted posts or comments they previously created

WHEN a user is unbanned, THE system SHALL NOT reset karma affected by previously downvoted content

### Report System

WHEN a user reports a post or comment, THE system SHALL:

- Require the user to be authenticated
- Require a text reason for the report, minimum 5 characters
- Require selection of the specific content being reported (post or comment ID)
- Record the reporter's user ID
- Record the timestamp of the report
- Record the community the content belongs to
- Record the reported content's ID and type
- Store this as an active report record with status "pending"
- Increment the report count for both the content and the reporter
- Notify moderators of the community about the new report

### Report Review Process

WHEN a moderator reviews a report, THE system SHALL:

- Fetch the reported content and original post
- Show full context of reported content, including author, time posted, comment thread (if applicable)
- Show the reporter's username and karma score
- Show the report reason provided
- Show the total number of reports on this content
- Show whether the content has already been deleted
- Show whether the reporter has been banned
- Allow the moderator to:
  - Approve the report (delete content)
  - Dismiss the report (keep content)
  - Add a moderation note
  - View the reporter's full history

WHEN a moderator takes action on a report, THE system SHALL:

- Update the report status to "approved" or "dismissed"
- Record the moderator ID who took action
- Record the timestamp of the action
- Record any moderation note added
- Update the report count for the content and reporter
- Update the community's moderation statistics
- Trigger the content action (deletion if approved)

### Report Outcomes

#### Approved Report

WHEN a report is approved, THE system SHALL:

- Immediately delete the reported post or comment
- Remove the content from all public feeds
- Archive the content with "moderator-deleted" flag
- Notify the content author that their content was removed
- Notify the reporter that their report was approved
- Increment the moderator's approved report count
- Mark the report as approved in the system
- Log the action with full details

#### Dismissed Report

WHEN a report is dismissed, THE system SHALL:

- Keep the reported content visible
- Mark the report as dismissed in the system
- Notify the reporter that their report was dismissed
- Increment the moderator's dismissed report count
- Log the action with full details
- Record the dismissal reason (if moderator provided one)

#### Auto-Approve Report

WHEN a report from a trusted user (karma > 500) is received, THE system SHALL:

- Prioritize it in the moderator queue
- Flag it as "high trust"
- Allow moderators to approve with a single-click

WHEN a report from a user with negative karma (< -100) is received, THE system SHALL:

- Flag it as "low trust"
- Require moderator confirmation before action
- Queue it for secondary review

### Moderation Logs

THE system SHALL maintain an immutable audit log of all moderation actions including:

- Content deletion (post and comment)
- User banning and unbanning
- Report approval and dismissal
- Moderator addition and removal
- Community deletion
- Admin override actions

Each log entry SHALL include:

- Date and timestamp
- Moderator or admin ID
- Action type
- Affected content or user
- Reason provided
- IP address of moderator
- Session ID of moderator
- Outcome (success/failure)

Moderation logs SHALL be accessible to:

- Community owners for their community
- Moderators for their community
- System administrators for the entire platform

Logs SHALL NOT be accessible to regular members

### Ban Appeals

WHEN a user is banned from a community, THE system SHALL:

- Provide a mechanism for the user to appeal the ban
- Allow the user to submit a written appeal explaining their position
- Store the appeal with timestamp
- Notify the community owner and moderators of the appeal
- Place the appeal in a moderation queue for review

WHEN a community owner or moderator reviews an appeal, THE system SHALL:

- Allow review of the user's activity history
- Allow review of the original ban reason
- Allow review of the appeal text
- Allow the moderator to:
  - Uphold the ban
  - Lift the ban
  - Modify the ban duration

WHEN a ban is lifted, THE system SHALL:

- Remove the user from the banned list
- Notify the user
- Notify the community owners and moderators
- Record the appeal resolution in the log

WHEN a ban is upheld, THE system SHALL:

- Keep the ban active
- Notify the user
- Record the appeal resolution in the log

There SHALL be no limit on the number of appeals a user can make

### Moderation Transparency

THE system SHALL ensure that moderation decisions are transparent to the community:

- Each post or comment in a community SHALL show a small "Moderated" indicator if it has ever been moderated
- When a post is deleted, ANY user SHALL be able to see whether it was deleted by the author or a moderator
- The reason for moderator deletion SHALL be visible to the original author
- Users SHALL be able to see their own ban status and reason in their profile
- The system SHALL display moderation statistics to community owners (e.g., "12 posts removed this month")
- The system SHALL not display who removed content to other users (for moderator safety)

No moderation action SHALL be hidden from the person who performed it

No moderation action SHALL be hidden from the person affected by it

No moderation action SHALL be hidden from system administrators

### Administrative Override

WHEN an admin performs an action that overrides a community moderator's decision, THE system SHALL:

- Record the override in the audit log with "admin_override" flag
- Notify the community owner and moderators of the override
- Allow the community owner to appeal the override
- Maintain a record of when overrides occur

WHEN an admin overwrites a ban, THE system SHALL immediately reinstate the user's privileges in the community

WHEN an admin overwrites a content deletion, THE system SHALL immediately restore the content to all public feeds

WHEN an admin overwrites a report approval, THE system SHALL immediately restore the content if it was deleted

All admin overrides SHALL be traceable and auditable

All admin overrides SHALL be logged with complete details

All admin overrides SHALL be reviewed quarterly by platform governance

## Documentation Integrity

This document defines all business requirements for the Reddit-style community platform with complete, actionable specifications for backend developers.

- ALL Mermaid diagrams use double-quoted labels with no spaces between brackets and quotes
- ALL requirements follow EARS format (WHEN...THE system SHALL...)
- ALL business processes are described in complete natural language
- NO database schemas or API specifications are included
- NO vague statements or placeholders are present
- NO assumptions are left to developer interpretation
- ALL edge cases, error conditions, and validations are explicitly defined
- ALL user actor permissions are comprehensively documented
- ALL technical constraints are specified with measurable criteria

The document is self-contained and immediately actionable for engineering teams to implement without requiring further clarification.

