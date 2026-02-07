# Reddit-like Community Platform Requirements Specification

## Overview

This document provides a complete requirements specification for a Reddit-like community platform. It defines all functional, non-functional, and business requirements needed to implement a production-grade online discussion system with user authentication, content posting, voting, commenting, community moderation, and multi-feed content discovery.

All requirements are expressed in natural business language using the EARS format (When, Then, SHALL, WHERE/IF/WHILE) to ensure unambiguous implementation guidance for the engineering team. This is not a technical design document — it describes what the system must do, not how it should be implemented.

All business rules are self-contained and do not reference database schemas, API endpoints, or specific technologies. Implementation technologies (storage engines, authentication libraries, caching strategies) are left to the discretion of the development team.

## User Actors

The platform defines four distinct user actor types, each with specific permissions and behaviors:

### Guest

- An unauthenticated user
- Can view all public content: Popular Feed, Community Feeds, User Profiles
- Cannot access Home Feed (requires authentication)
- Cannot create posts, comments, or votes
- Cannot subscribe to communities
- Cannot report content
- Cannot change account settings
- Cannot view karma scores (only aggregated indicators like "+240 karma")

### Member

- An authenticated user with a registered account
- Has all Guest permissions
- Can register with email, password, and unique username
- Can log in with email and password
- Can change their password
- Can delete their account (and all associated content)
- Can set and edit their display name, bio, and avatar
- Can create posts in communities they are subscribed to
- Can edit their own posts within 24 hours of creation
- Can delete their own posts at any time
- Can create comments on any post
- Can reply to any comment (unlimited nesting)
- Can edit their own comments within 24 hours of creation
- Can delete their own comments at any time
- Can upvote/downvote posts and comments
- Can change their vote from upvote to downvote (or vice versa)
- Can remove their vote entirely
- Can subscribe to any community
- Can unsubscribe from any community
- Can view their own profile including: display name, bio, avatar, karma, posts, comments
- Can view any other user's profile
- Can report posts or comments with a reason
- Can view all communities they are subscribed to

### Moderator

- A Member with additional permissions within one or more communities
- Has all Member permissions
- Can delete any post in communities they moderate
- Can delete any comment in communities they moderate
- Can ban users from communities they moderate
- Can unban users from communities they moderate
- Can view list of banned users in communities they moderate
- Can review and act on all reports within communities they moderate
- Can approve reports (causing content deletion)
- Can dismiss reports (leaving content intact)
- Cannot remove the community owner
- Cannot remove other moderators
- Cannot change community settings (name, description, icon)

### Admin

- A platform-level administrator with global authority
- Has all Moderator permissions across ALL communities
- Can create, delete, and manage ANY community
- Can add or remove moderators from any community
- Can ban or unban any user from any community
- Can view all reports across the platform
- Can approve or dismiss ANY report anywhere
- Can manage global platform settings
- Can override any moderation decision
- Can access system-level audit logs
- Can view all users and their activities
- Can modify any user account

## Core Functional Requirements

### User Account Management

#### Registration

WHEN a guest attempts to register for the platform, THE system SHALL require the following information:
- Email address (valid format) where `email` matches the regular expression `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`
- Password (minimum 12 characters) where `password.length ≥ 12`
- Username (3-20 alphanumeric characters, unique) where `username` matches the regular expression `^[a-zA-Z0-9]{3,20}`

WHERE registration is attempted with an email already registered, THE system SHALL respond with an error message: "This email is already in use."

WHERE registration is attempted with a username already taken, THE system SHALL respond with an error message: "This username is already taken."

WHERE password is less than 12 characters, THE system SHALL respond with an error message: "Password must be at least 12 characters long."

WHERE username contains non-alphanumeric characters, THE system SHALL respond with an error message: "Username can only contain letters and numbers."

WHERE username exceeds 20 characters, THE system SHALL respond with an error message: "Username cannot exceed 20 characters."

WHERE username is fewer than 3 characters, THE system SHALL respond with an error message: "Username must be at least 3 characters long."

WHEN a guest successfully completes registration, THE system SHALL:
- Create a new user record with status "pending_email_verification"
- Generate an email verification token with a 24-hour expiration
- Send a verification email with a unique, cryptographically signed link to the provided email address
- Log the registration event with timestamp, IP address, and user agent
- Immediately return a 201 Created status to the client
- Display a success message: "Account created! Please check your email to verify your address."

WHEN registration fails due to server error or service outage, THE system SHALL:
- Return HTTP status 500 Internal Server Error
- Log the error with details including registration attempt data
- Display a generic message to the guest: "We're sorry, but we couldn't create your account. Please try again later."

#### Login

WHEN a user attempts to login, THE system SHALL require:
- Email address used during registration
- Password used during registration

WHERE email is not registered, THE system SHALL respond with an error message: "No account found with this email address."

WHERE email is registered but account is pending email verification, THE system SHALL respond with an error message: "Please verify your email address before logging in."

WHEN password is incorrect, THE system SHALL respond with an error message: "Incorrect password. Please try again."

WHEN valid credentials are presented and account status is active, THE system SHALL:
- Verify user is not banned from the system
- Check if account has been locked due to too many failed attempts (max 5 per hour)
- Set the user's session as active in the authentication system
- Issue a signed JWT access token with expiration of 30 minutes
- Issue a signed JWT refresh token with expiration of 14 days
- Return both tokens in HTTP-only, Secure, SameSite=Strict cookies
- Include user ID, role, and permission scope in the JWT payload
- Record the successful login event with timestamp, device type, IP address, and location
- Return HTTP status 200 OK
- Redirect to the user's home feed

IF five consecutive failed login attempts occur from the same IP address within an hour, THE system SHALL:
- Temporarily lock the account for 1 hour
- Send an email notification to the user: "Your account has been temporarily locked due to multiple failed login attempts. You can try again in one hour."
- Record the lock event

IF a login attempt succeeds after an account lock, THE system SHALL:
- Clear the failed attempt counter
- Unlock the account
- Proceed with normal authentication

#### Password Reset

WHEN a user requests password reset by providing their email address, THE system SHALL:
- Search for an active user account matching the email address
- Generate a unique, cryptographically secure reset token (valid 1 hour)
- Store the token and expiry time for the account
- Send an email containing a link to reset the password with the reset token in the URL
- Log the reset request

WHERE email address is not found in the system, THE system SHALL:
- Return success message: "If this email is registered with us, you'll receive a password reset link."
- Avoid revealing whether the email exists
- Log the attempt as "password_reset_requested_unknown_email"

WHEN the user clicks the password reset link, THE system SHALL:
- Validate the reset token and verify it has not expired (1 hour)
- Validate the associated email account is active (not suspended or deleted)
- Display a form to enter and confirm new password

WHERE reset token is invalid, expired, or already used, THE system SHALL:
- Display error message: "This password reset link is invalid or has expired."
- Log the attempt
- Do not allow password change

WHERE new password is less than 12 characters, THE system SHALL:
- Display error message: "New password must be at least 12 characters long."
- Do not update password

WHERE confirmation password does not match new password, THE system SHALL:
- Display error message: "Passwords do not match. Please try again."
- Do not update password

WHERE password matches current password (prevents re-use), THE system SHALL:
- Display error message: "New password cannot be the same as your current password."
- Do not update password

WHEN a new password is successfully submitted and verified, THE system SHALL:
- Hash the new password using strong bcrypt with salt
- Update the user's password field in the database
- Invalidate all existing refresh tokens issued before this reset
- Send a confirmation email: "Your password has been successfully changed."
- Clear the reset token from the database
- Display success message: "Your password has been reset! You can now log in with your new password."
- Redirect to login page

IF a password reset request fails due to server error, THE system SHALL:
- Return HTTP status 500 Internal Server Error
- Log the system-level error
- Display generic message: "We're experiencing technical difficulties. Please try again later."

#### Logout

WHEN a user requests logout, THE system SHALL:
- Clear the JWT access token and refresh token from client cookies
- Mark the access token as revoked in the backend token blacklist
- Record the logout event in the audit trail with timestamp, user ID, IP address, and device
- Immediately return HTTP status 200 OK
- Redirect the client to the homepage

#### Account Deletion

WHEN a member requests to delete their account, THE system SHALL:
- Require password confirmation of the account to be deleted (not just email)
- Present a warning message: "This action will permanently delete your profile, posts, comments, and karma score. This cannot be undone."
- Confirm the action with checkbox: "I understand this action is permanent and irreversible."

WHERE the deletion request is confirmed, THE system SHALL:
- Mark the account as "pending_deletion" with a 14-day grace period
- Disable all login sessions, revoke all tokens, and clear existing session state
- Prevent the user from creating new content or modifying existing content
- Send confirmation email: "Your account deletion request has been received. You have 14 days to cancel this request."

WHILE account is in "pending_deletion" status for 14 days, THE system SHALL:
- Allow the user to log back in using credentials
- Restore the account to "active" status if user logs in during grace period
- Cancel the pending deletion
- Send email: "Your account deletion has been canceled. Your account is now active."

WHEN the 14-day grace period expires without user intervention, THE system SHALL:
- Permanently delete the user record from the database
- Soft-delete all associated posts and comments
- Mark all associated posts and comments as "author_deleted"
- Reset karma scores of users who received votes from the deleted account
- Delete associated profile images and avatars from storage
- Purge all security logs and device fingerprints linked to the user
- Log the deletion event with timestamp

WHEN an administrative user requests immediate deletion, THE system SHALL:
- Bypass the 14-day grace period
- Remove the user account immediately
- Retain all content with authorship flagged as "deleted_user" to preserve community history
- Send email immediately: "Your account has been permanently deleted by an administrator."

THE system SHALL retain deleted user records for 60 days in secure cold storage for legal compliance purposes

THE system SHALL only expose anonymized statistics from deleted accounts (e.g., total users, average karma)

THE system SHALL never expose the existence of deleted accounts to any user

### User Profile Management

#### Profile Elements

WHEN a user views any profile, THE system SHALL display:
- Display name
- Bio text
- Avatar image
- Total karma score

WHEN a user views any profile, THE system SHALL display:
- A list of all posts created by that user
- A list of all comments written by that user

WHEN a user edits their own profile, THE system SHALL allow modification of:
- Display name (max 50 characters)
- Bio text (max 500 characters)
- Avatar image (upload PNG, JPG, GIF max 2MB)

WHEN a user submits a profile update, THE system SHALL:
- Validate display name is 1-50 characters
- Validate bio is 0-500 characters
- Validate avatar is PNG, JPG, or GIF under 2MB
- Update profile fields in the database
- Save new avatar as multiple resized versions (128x128, 64x64, 32x32, 48x48)
- Return updated profile data

WHEN a user views another user's profile, THE system SHALL display:
- The other user's display name, bio, and avatar
- The other user's total karma score
- A list of all public posts from that user
- A list of all public comments from that user
- A list of communities the user is subscribed to

WHEN a user views their own profile, THE system SHALL display:
- An "Edit Profile" button (visible only to owner)
- A "Karma History" tab (showing all karma changes)
- A "My Posts" section with ability to edit/delete
- A "My Comments" section with ability to edit/delete

### Karma System

#### Karma Calculation Logic

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

#### Karma Display Requirements

WHEN displaying karma scores to authenticated users, THE system SHALL show the current number as a whole integer (positive, negative, or zero).

THE system SHALL display karma as "[number] karma" (e.g., "47 karma" or "-12 karma").

WHEN displaying karma to unauthenticated users, THE system SHALL show aggregated karma indicators (e.g., "+240 karma") without displaying the exact number.

WHEN viewing any user's public profile:
- THE system SHALL display the user's current karma score
- THE system SHALL display the karma score immediately below the user's display name
- THE system SHALL display karma as a distinct visual element using color

WHEN displaying posts or comments in lists (feeds, comment threads):
- THE system SHALL display author karma with the author name
- THE system SHALL show karma as a badge adjacent to username
- THE system SHALL use color to indicate karma value (green for positive, red for negative)

WHEN displaying search results for users:
- THE system SHALL show karma scores next to user profiles
- THE system SHALL include karma as a sort criterion (high karma first)

WHEN a user requests karma history, THE system SHALL return a list of karma events with:
- Date and time of change
- Type of change (upvote, downvote, vote removal, vote change)
- Amount of karma change
- Content type affected (post or comment)
- Content identifier
- Reason for change (if any)

IF user has karma score below 0, THEN THE system SHALL NOT display detailed karma history to other users.

IF user has karma score above 1,000, THEN THE system SHALL display summary statistics only (total karma, top 5 contributions) to non-privileged viewers.

WHEN viewing karma scores in any context, THE system SHALL:
- Ensure score matches total upvotes minus downvotes on all user's content
- Calculate karma in real-time with no caching delays greater than 500ms
- Maintain perfect numerical integrity between direct karma calculations and voting event histories

#### Karma Integrity Rules

WHILE a member is authenticated, THE system SHALL allow exactly one vote per post and one vote per comment.

IF member attempts to vote on their own post or comment, THEN THE system SHALL prevent the vote and return error with code "KARMA_SELF_VOTE_PROHIBITED".

WHERE post is older than 7 days, THE system SHALL limit karma changes to ±5 points total from all voters combined.

WHERE comment is older than 7 days, THE system SHALL limit karma changes to ±3 points total from all voters combined.

THE system SHALL ensure that karma score always equals: total upvotes minus total downvotes on all user's content.

THE system SHALL store and calculate karma in real-time with no caching delays greater than 500ms.

THE system SHALL maintain perfect numerical integrity between direct karma calculations and voting event histories.

#### Performance Requirements

WHEN user submits a vote, THE system SHALL update karma scores and return HTTP 200 response within 300ms.

WHEN user loads a page with multiple karma indicators, THE system SHALL render all karma scores within 500ms.

WHEN user requests karma history, THE system SHALL return complete audit trail under 1.5s for users with under 1,000 karma events.

WHILE system is operational, THE system SHALL maintain 99.99% karma calculation accuracy.

THE system SHALL never allow karma scores to drift from actual vote counts by more than 1 point.

WHEN system restarts, THE system SHALL fully reconstruct karma scores from voting history in under 2 minutes.

### Community Management

#### Community Creation Rules

WHEN a member submits a community creation request, THE system SHALL validate that:
- Community name is unique across the platform
- Community description is at least 10 characters
- Community icon is provided in PNG, JPEG, or GIF format under 2MB

WHEN a member submits a community creation request, THE system SHALL:
- Normalize name to lowercase for storage and lookup
- Store name exactly as entered for display purposes
- Assign the submitter as the community owner
- Add the submitter as the first subscriber
- Create community record with status "active" and auto-generated UUID
- Immediately return the created community object with confirmation

WHEN a community creation request violates naming rules or contains prohibited content, THE system SHALL return an error message with specific reasons for rejection.

#### Naming Constraints

THE community name SHALL consist only of alphanumeric characters and underscores.

THE community name SHALL have a minimum length of 3 characters.

THE community name SHALL have a maximum length of 25 characters.

THE community name SHALL be case-insensitive for comparison purposes.

THE system SHALL reject community names that match reserved system terms:
- "home"
- "popular"
- "search"
- "admin"
- "moderator"
- "about"
- "help"
- "terms"
- "privacy"
- "signup"
- "login"
- "logout"
- "profile"
- "settings"
- "notifications"
- "reports"
- "feedback"
- "contact"
- "faq"
- "status"
- "api"
- "developer"

#### Icon Usage

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

WHEN displaying a community icon in a feed list, THE system SHALL use the 64x64 pixel version.

WHEN displaying a community icon in search results, THE system SHALL use the 32x32 pixel version.

WHEN displaying a community icon on the community's own page, THE system SHALL use the 128x128 pixel version.

WHEN displaying a community icon on a user's profile, THE system SHALL use the 48x48 pixel version.

THE system SHALL cache all community icons for 24 hours and respect cache headers from the image storage service.

THE system SHALL use appropriate alt text for community icons: "Community icon for 'community_name'"

WHEN an image fails to load, THE system SHALL display the default icon based on the first letter of the community name.

#### Subscription Requirements

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

WHEN a user views their profile, THE system SHALL display a list of all communities they are subscribed to.

WHEN a user views another user's profile, THE system SHALL display a list of the other user's subscribed communities.

WHEN a user searches for communities, THE system SHALL indicate which communities they are already subscribed to.

THE system SHALL NOT expose the complete lists of subscribers for any community to non-moderators.

#### Subscriber Count Calculation

THE system SHALL maintain an accurate, real-time subscriber count for each community.

WHEN a user subscribes to a community, THE system SHALL increment the subscriber count by 1.

WHEN a user unsubscribes from a community, THE system SHALL decrement the subscriber count by 1.

WHEN a user account is deleted, THE system SHALL decrement the subscriber count of all communities they were subscribed to by 1.

WHEN a user is banned from a community, THE system SHALL decrement the subscriber count by 1.

WHEN a community is deleted, THE system SHALL set the subscriber count to 0.

WHEN a new community is created, THE system SHALL initialize the subscriber count to 1 (the creator).

THE system SHALL perform daily integrity checks to verify subscriber counts match actual subscription records.

IF discrepancies are found between the stored subscriber count and the actual subscription records, THEN THE system SHALL log the error and automatically correct the count.

IF a community's subscriber count shows negative value, THEN THE system SHALL log a critical error and reset the count to 0.

WHEN displaying subscriber counts:
- For 0-999 subscribers: show exact number
- For 1,000-9,999 subscribers: show as "1.0K" (rounded to one decimal)
- For 10,000-99,999 subscribers: show as "10.0K" (rounded to one decimal)
- For 100,000-999,999 subscribers: show as "100K" (rounded to nearest integer)
- For 1,000,000+ subscribers: show as "1M" (rounded to nearest integer)

WHEN displaying subscriber counts in lists, THE system SHALL apply the above formatting rules consistently.

WHEN calculating top communities by subscribers, THE system SHALL sort by raw count (not formatted display values).

THE system SHALL avoid database queries for subscriber counts during high-load scenarios.

THE system SHALL cache subscriber counts in memory for 2 seconds.

THE system SHALL use incremental updates to maintain count accuracy rather than recalculation from subscription records on every view.

WHEN a user views a community page, THE system SHALL render the cached subscriber count immediately while updating the cache in background.

WHEN a user modifies their subscription status (subscribe/unsubscribe), THE system SHALL update the cache immediately and propagate the change to the database asynchronously.

THE system SHALL maintain consistency between the subscriber count and the subscription table.

THE system SHALL queue all subscriber count update operations and process them sequentially when high concurrency is detected.

WHEN multiple subscription/unsubscription events occur simultaneously for the same community, THE system SHALL use atomic operations to prevent race conditions.

WHEN a data replication failure occurs between distributed database nodes, THE system SHALL display the last known correct subscriber count and continue updating.

WHEN the community subscriber count is displayed on the popular feed, THE system SHALL use the same counting mechanism as all other community views.

#### Search Functionality

THE system SHALL allow users to search for communities by name.

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

WHEN searching for communities, THE system SHALL return results within 500ms for 95% of queries.

WHEN searching for communities with 10,000+ registered communities, THE system SHALL return results within 1000ms for 95% of queries.

THE system SHALL use full-text search indexing with proper case normalization for search performance.

THE search index SHALL update within 1 second of any community creation, update, or deletion.

WHEN 100+ concurrent users perform searches simultaneously, THE system SHALL maintain response times below 1000ms for 90% of requests.

WHEN search results are displayed, THE system SHALL show for each community:
- Community name
- Description (truncated to 80 characters)
- Subscriber count
- Icon
- "Subscribe" button (if not subscribed)

WHEN a user searches while logged in, THE system SHALL highlight communities they are already subscribed to with a visual indicator.

WHEN a user searches while logged out, THE system SHALL display the same results but without "Subscribe" buttons (or with login prompt).

### Post Management

#### Post Creation Flow

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

#### Post Edit Workflow

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

#### Post Deletion Workflow

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

#### Post Visibility Rules

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

#### Cross-Community Posting Rules

WHEN a member creates a post, THE system SHALL require the member to select one specific community as the target.

WHEN a member creates a post, THE system SHALL prevent the member from posting to multiple communities simultaneously.

WHERE a member is subscribed to multiple communities, THE system SHALL allow the member to choose any one of those communities for posting.

WHERE a member is not subscribed to any community, THE system SHALL prevent the member from creating any posts.

WHERE the original author of a post is banned from the posting community, THE system SHALL allow the post to remain visible in the community and all feeds.

WHEN a user is banned from a community, THE system SHALL prevent the banned user from creating new posts in that community, even if they were already subscribed.

WHEN a community owner removes a member from their community, THE system SHALL allow existing posts by that member to remain visible in the community and all feeds.

#### Post Types and Content Handling

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

#### Post Creation Timing Constraints

WHEN a member creates a post, THE system SHALL not allow more than 10 posts to be created within a 10-minute timeframe.

WHEN a member exceeds 10 posts in a 10-minute window, THE system SHALL temporarily block further post creation for 5 minutes and return an error message stating: "You are posting too frequently. Please wait 5 minutes before posting again."

WHEN the 5-minute cooldown period expires, THE system SHALL reset the post creation counter and allow further posts.

WHEN a member is blocked from posting due to frequency limits, THE system SHALL not block moderation or administrative actions.

WHEN a moderator or admin deletes a post, THE system SHALL not count the deletion toward the member's post frequency limit.

WHEN a member's account is suspended, THE system SHALL prevent any post creation attempts, regardless of frequency limits.

#### Post Archiving and Restoration

WHEN a post is created, THE system SHALL store it in an active state.

WHEN a post is deleted, THE system SHALL move it to an archived state with a deletion timestamp and reason if provided.

WHEN a moderator or admin deletes a post, THE system SHALL maintain a log entry for the deletion event.

WHEN a post is in the archived state, THE system SHALL not display it in any feed or user profile.

WHEN a post is in the archived state, THE system SHALL allow administrators to restore it by manually reversing the deletion log.

WHEN a post is restored, THE system SHALL return it to the active state and reappear in all relevant feeds.

WHEN a post is restored, THE system SHALL retain the original creation timestamp and all associated votes and comments.

WHEN a post is restored, THE system SHALL reset the "last edited" timestamp to the original creation timestamp.

#### Voting Impact on Post Visibility

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

#### Post Visibility During Reports

WHEN a post has been reported but not yet reviewed by a moderator, THE system SHALL still display the post in all feeds, but shall mark it with a "Pending Review" indicator for moderators only.

WHEN a post has been reported and the report is approved, THE system SHALL immediately remove the post from all public feeds.

WHEN a post has been reported and the report is dismissed, THE system SHALL immediately remove the "Pending Review" indicator from the post in all feeds.

WHEN a post has been reported and the user who reported it is banned, THE system SHALL still process the report if approved by a moderator.

WHEN a moderator reviews a report on a post, THE system SHALL maintain a log entry recording the moderator's action and the date/time of review.

#### Post Content Validation Rules

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

#### Post Creation Contextual Requirements

WHEN a member creates a post, THE system SHALL require the member to acknowledge community rules before posting.

WHEN a member creates a post, THE system SHALL record the member's IP address for moderation purposes.

WHEN a member creates a post, THE system SHALL record the user agent and device type.

WHEN a post is created from a suspected automated bot, THE system SHALL require a CAPTCHA verification.

WHEN a post is created and the account's creation date is less than 6 hours ago, THE system SHALL require verification of the account via email or 2-factor authentication.

WHEN a post is created and the account has previously been banned from any community, THE system SHALL flag the post for review before posting.

WHEN a post is created with links to previously reported domains, THE system SHALL flag the post for review before posting.

#### Post Visibility During Moderation

WHEN a post is flagged as inappropriate and under review, THE system SHALL prevent all users except moderators and the original author from viewing the post's full content.

WHEN a post is flagged as inappropriate and under review, THE system SHALL still display the post title, author, community, vote score, and comment count in feeds, but shall show "Content under review" instead of the full content.

WHEN a post is flagged as inappropriate and under review, THE system SHALL prevent voting and commenting on the post.

WHEN a post is flagged as inappropriate and under review, THE system SHALL allow users to report the post again.

WHEN a post is approved as appropriate, THE system SHALL restore full visibility and allow voting and commenting.

WHEN a post is removed as inappropriate, THE system SHALL remove all traces from public feeds.

#### Post Deletion by Non-Authors

WHEN a moderator deletes a post, THE system SHALL record the deletion reason provided by the moderator.

WHEN a moderator deletes a post, THE system SHALL allow the original author to appeal the deletion within 7 days.

WHEN a moderator deletes a post, THE system SHALL notify the original author via in-app notification of the deletion and reason.

WHEN an admin deletes a post, THE system SHALL record the deletion reason provided by the admin.

WHEN an admin deletes a post, THE system SHALL allow the original author to appeal the deletion within 7 days.

WHEN an admin deletes a post, THE system SHALL notify the original author via in-app notification of the deletion and reason.

WHEN an appeal against a deleted post is submitted, THE system SHALL create an appeal ticket assigned to a moderator.

WHEN an appeal against a deleted post is approved, THE system SHALL restore the post to its original state and notify the author.

WHEN an appeal against a deleted post is denied, THE system SHALL maintain the post's deleted state and notify the author.

WHEN a post has been deleted and appealed, THE system SHALL maintain a log of the appeal status and actions taken.

#### Post Display Rules

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

#### User Reputation and Post Visibility

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

#### Post Performance Requirements

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

#### Error Handling for External Services

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

#### Post Recovery and Backup

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

#### Post Display in Different Contexts

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

#### Post Integration with Other Systems

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

### Post Voting

#### Vote Mechanics

WHEN a user interacts with a post, THE system SHALL allow three distinct voting actions:
- Upvote: Increases the post's vote score by 1
- Downvote: Decreases the post's vote score by 1
- Vote removal: Restores the post's vote score to its state before the user's vote was cast

WHEN a user attempts to vote on a post, THE system SHALL validate that the user is authenticated and not banned from viewing the post's community.

WHILE a post is visible to a user, THE system SHALL display the current vote score and the user's current vote status (if any).

#### Vote State Management

WHEN a user has not voted on a post, THE system SHALL represent their vote state as "none".

WHEN a user submits an upvote to a post they have not previously voted on, THE system SHALL update their vote state to "upvote" and increase the post's vote score by 1.

WHEN a user submits a downvote to a post they have not previously voted on, THE system SHALL update their vote state to "downvote" and decrease the post's vote score by 1.

#### One-Vote-Per-User Rule

WHEN a user attempts to cast a new vote on a post, THE system SHALL enforce a one-vote-per-user rule.

IF a user has an existing vote on a post, THEN THE system SHALL consider the new vote request as a vote change request, NOT a new vote.

WHILE a user is actively viewing a post, THE system SHALL prevent the display of redundant voting options that would violate the one-vote-per-user rule (e.g., don't show "upvote" if they've already upvoted).

#### Vote Type Changes

WHEN a user changes their vote from upvote to downvote on a post, THE system SHALL:
- Decrement the post's vote score by 1 (removing the previous upvote)
- Then decrement the post's vote score by 1 again (applying the new downvote)
- Update the user's vote state from "upvote" to "downvote"

WHEN a user changes their vote from downvote to upvote on a post, THE system SHALL:
- Increment the post's vote score by 1 (removing the previous downvote)
- Then increment the post's vote score by 1 again (applying the new upvote)
- Update the user's vote state from "downvote" to "upvote"

WHEN a user attempts to change their vote to the same type they already have, THE system SHALL ignore the request and maintain the current vote state.

#### Vote Removal Process

WHEN a user removes their vote from a post, THE system SHALL:
- Restore the post's vote score to its value before the user's vote was cast
- Update the user's vote state to "none"
- Remove the user's vote record from the vote storage system

WHEN a vote removal occurs, THE system SHALL maintain historical data for audit purposes but shall not include it in the current vote score calculation.

#### Vote Score Calculation

THE system SHALL calculate a post's vote score as the algebraic sum of all individual user votes.

WHERE a user has cast an upvote, THE system SHALL count this as +1 in the vote score calculation.

WHERE a user has cast a downvote, THE system SHALL count this as -1 in the vote score calculation.

WHERE a user has removed their vote, THE system SHALL count this as 0 in the vote score calculation.

THE vote score SHALL be a whole number (integer) and MAY be negative.

The vote score SHALL be recalculated and persisted immediately after each successful vote action.

#### Vote Display

WHEN a post is displayed in any feed, THE system SHALL display its current vote score as a numeric value.

WHEN a user views an individual post, THE system SHALL:
- Display the post's vote score prominently
- Visually indicate the user's current vote status (if any) through color, icon, or style
- Display separate counters for upvotes and downvotes if requested by the user interface

WHEN a user's vote is active on a post, THE system SHALL highlight the voting control for that vote type (e.g., make upvote button darker).

THE vote score SHALL be displayed as a single number without prefixes or suffixes (e.g., "7", "-2", "0") and SHALL NOT include unit labels.

#### Vote History Access

THE system SHALL not expose the historical record of individual votes to end users.

WHERE an administrative user is performing moderation or auditing, THE system SHALL provide access to the complete vote history for individual posts.

WHILE the system is calculating vote scores, THE system SHALL ignore votes from users who have been banned from the post's community.

#### Vote Integrity Rules

THE system SHALL ensure that vote score calculations are atomic and thread-safe to prevent race conditions during concurrent voting activity.

WHEN a user is banned from a community, THE system SHALL immediately invalidate all votes cast by that user on posts within that community, updating the vote score accordingly.

WHEN a post is deleted, THE system SHALL remove all associated votes from the voting system and update all affected feeds.

WHEN a community is archived or deleted, THE system SHALL retain all vote data for the lifetime of the system.

WHEN a user account is deleted, THE system SHALL remove all votes associated with that user's account and update all affected post vote scores.

THE system SHALL validate that vote operations always originate from authenticated users.

WHEN a vote operation cannot be completed due to system error or database failure, THE system SHALL reject the operation and return an appropriate error message to the user.

THE system SHALL maintain data consistency between the vote score displayed on all views of a post.

### Post Feeds

#### Home Feed Logic

WHEN a member is logged in, THE system SHALL display the Home Feed as their default view.

WHEN a member views the Home Feed, THE system SHALL show only posts from communities they are subscribed to.

WHEN a member unsubscribes from a community, THE system SHALL immediately stop showing posts from that community in their Home Feed.

WHEN a member subscribes to a new community, THE system SHALL include posts from that community in their Home Feed on the next feed load.

WHILE a member is logged in, THE system SHALL prioritize displaying their Home Feed over other feeds unless explicitly navigated elsewhere.

IF a member attempts to access the Home Feed while not authenticated, THEN THE system SHALL redirect them to the Popular Feed with a prompt to login.

IF a member has not subscribed to any communities, THEN THE system SHALL display a message: "You haven't subscribed to any communities yet. Explore popular communities to get started."

#### Popular Feed Logic

THE system SHALL make the Popular Feed available to all users, including guests and unauthenticated visitors.

WHEN a user accesses the Popular Feed, THE system SHALL show posts from all communities on the platform, regardless of subscription status.

THE system SHALL NOT require authentication to view the Popular Feed.

WHILE the Popular Feed is active, THE system SHALL ensure that all posts are publicly accessible, even if the user is not subscribed to their originating community.

WHEN a guest accesses the Popular Feed, THE system SHALL display all content features except voting, commenting, and creating posts.

WHEN a member accesses the Popular Feed, THE system SHALL retain their ability to vote, comment, and subscribe to communities, but these actions do not affect the feed's content composition.

#### Community Feed Logic

WHEN a user navigates to a specific community page, THE system SHALL display the Community Feed for that community.

THE system SHALL display all posts in a community's feed to both authenticated and unauthenticated users.

WHEN a user is not subscribed to a community, THE system SHALL still show all posts from that community in its Community Feed.

WHEN a user views a Community Feed, THE system SHALL display the community's name, icon, and description prominently at the top.

WHEN a user attempts to create a post in a community where they are not subscribed, THEN THE system SHALL prevent submission and show: "You must be subscribed to this community to create posts."

WHEN a user is banned from a community, THEN THE system SHALL hide all their posts from that community's feed (but not from their own profile or other feeds).

#### Sorting Algorithms

##### Hot Sorting

WHEN the Hot sort is selected, THE system SHALL rank posts using an algorithm based on recent activity and engagement.

THE system SHALL calculate a Hot score as: (log(upvotes + 1)) + (hours since posted) * 0.1 - (hours since posted) * 0.2

WHILE a post is older than 24 hours, THE system SHALL reduce its Hot score gradually.

WHILE a post receives more than 10 votes in the last hour, THE system SHALL boost its visibility to the top of the Hot feed.

WHEN a post receives no votes in the last 7 days, THE system SHALL remove it from the Hot feed.

##### New Sorting

WHEN the New sort is selected, THE system SHALL rank posts by creation time in descending order (most recent first).

THE system SHALL ignore vote scores, comment counts, or community popularity in New sorting.

WHEN two posts have identical creation times, THE system SHALL use their database ID as a tiebreaker.

WHILE new posts are being created, THE system SHALL update the New feed in real-time with a 1-second delay.

##### Top Sorting

WHEN the Top sort is selected, THE system SHALL calculate the highest vote score (upvotes - downvotes) for each post.

WHEN a time filter is applied to Top sorting (Today, This Week, This Month, This Year, All Time), THE system SHALL filter posts by creation date before sorting by score.

WHEN no time filter is selected, THE system SHALL use 'All Time' as the default.

WHEN a post's vote score is negative, THE system SHALL still include it in the Top feed if it ranks highly.

WHEN two posts have identical scores, THE system SHALL sort by creation time (newer first).

##### Controversial Sorting

WHEN the Controversial sort is selected, THE system SHALL rank posts with a high total number of votes but a score close to zero.

THE system SHALL calculate a Controversial score using: (upvotes + downvotes) * (1 - abs(score) / (upvotes + downvotes + 1))

WHEN a post has fewer than 10 total votes, THE system SHALL exclude it from the Controversial feed.

WHEN an upvote and downvote are balanced exactly (score = 0), THE system SHALL award the highest Controversial score.

WHEN a post has 100 total votes but a score of +1 or -1, THE system SHALL rank it highly in the Controversial feed.

WHEN a post has one upvote and no downvotes, THE system SHALL exclude it from the Controversial feed.

#### Pagination Strategy

WHEN any feed is loaded, THE system SHALL initially return 20 posts per page.

WHEN a user scrolls to the bottom of the feed, THE system SHALL load the next page of 20 posts automatically (infinite scroll).

WHEN a user clicks on a new sort option, THE system SHALL reset pagination to page 1 and reload the feed.

WHEN a user navigates from one feed type to another, THE system SHALL clear the current feed data and load the new feed from page 1.

WHEN users navigate back to a previously viewed feed, THE system SHALL retain their scroll position but reload the feed content to ensure data freshness.

MOBILE CONSTRAINT: EACH PAGE LOAD SHALL NOT EXCEED 200KB of JSON payload.

#### Feed Loading Performance

THE system SHALL ensure that all feeds load in under 1.5 seconds on slow 3G connections.

WHILE the feed is loading, THE system SHALL display a skeleton loading UI with placeholder cards matching the post structure.

WHEN a post's content is updated (edit/delete), THE system SHALL update its state in all feeds within 3 seconds.

WHEN a user's vote changes, THE system SHALL update the post's vote score in their currently viewed feed within 1 second.

THE system SHALL cache feed responses for 10 minutes to reduce server load for anonymous users.

Following third-party cookie policies, THE system SHALL NOT use browser caching for members on authenticated feeds unless tokens are included in cache keys.

#### Guest Access Rules

IF a user is not logged in (guest), THEN THE system SHALL allow viewing of all feeds.

IF a user is not logged in, THEN THE system SHALL disable all interactive features: voting, commenting, creating posts, and subscribing.

IF a user is not logged in and attempts to vote, THEN THE system SHALL display a modal: "You must be logged in to vote."

IF a user is not logged in and attempts to comment, THEN THE system SHALL display a modal: "You must be logged in to comment."

IF a user is not logged in and attempts to subscribe, THEN THE system SHALL display a modal: "You must be logged in to subscribe to communities."

#### Feed Personalization

THE system SHALL NOT personalize the Popular Feed based on user behavior, interests, or past activity.

THE system SHALL NOT display ads in any feed.

THE system SHALL NOT show recommended posts based on a user's subscription history unless explicitly requested.

IF a user has never interacted with the platform, THE system SHALL display the most popular posts on the Popular Feed (by total upvotes) as the default.

THE system SHALL NOT filter or suppress content based on political, social, or ideological views.

WHEN a user reports a post, THE system SHALL NOT automatically hide it from any feed until a moderator takes action.

### Comment Management

#### Comment Creation

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

#### Reply System

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

#### Comment Depth Limit

WHILE the comment system supports unlimited reply depth, THE system SHALL:
- Allow replies to any existing comment regardless of its depth in the hierarchy
- Not impose any maximum depth limit on the comment tree structure
- Maintain referential integrity by ensuring parent IDs always reference existing comment records

THE system SHALL NOT limit the number of replies to a single comment

#### Edit/Delete Permissions

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

#### Comment Deletion Rules

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

#### Comment Archiving

THE system SHALL NOT automatically archive any comments

THE system SHALL support manual archiving of comments by moderators upon request

WHEN a moderator archives a comment, THE system SHALL:
- Mark the comment with an "archived" status flag
- Remove the comment from all public feeds and post display pages
- Prevent the comment from receiving new votes or replies
- Retain all comment data, relationships, and audit trails
- Allow moderators to unarchive the comment at any time

#### Comment Visibility

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

#### Comment Integrity Rules

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

### Comment Voting

#### Comment Vote Mechanics

WHEN a member submits a vote on a comment, THE system SHALL record the vote according to the following rules:
- THE system SHALL allow only one active vote per member per comment
- THE system SHALL accept two vote types: upvote and downvote
- THE system SHALL record the time of each vote
- THE system SHALL associate each vote with the member's unique identifier
- THE system SHALL prevent voting on comments by non-authenticated users (guests)
- THE system SHALL prevent voting on comments that have been deleted
- THE system SHALL prevent voting on comments belonging to communities where the member is banned
- THE system SHALL prevent comments from being voted on if they belong to a community that has been suspended

#### One-Vote-Per-Comment Rule

WHEN a member attempts to vote on a comment they have already voted on, THE system SHALL:
- IF the new vote is identical to the existing vote, THEN THE system SHALL ignore the request and return a "vote unchanged" status
- IF the new vote is different from the existing vote, THEN THE system SHALL:
  - Remove the existing vote
  - Record the new vote
  - Adjust the comment's score by -1 (for removing previous vote) and +1 (for new vote)
  - Adjust the member's karma by -1 (removing previous impact) and +1 (adding new impact)
- THE system SHALL update the comment's score immediately after vote modification

WHILE a member has an existing vote on a comment, THE system SHALL NOT allow the member to submit a second vote without first changing or removing their existing vote

#### Vote Type Changes

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

#### Vote Removal Process

WHEN a member removes their vote on a comment, THE system SHALL:
- IF member had an upvote, THEN THE system SHALL decrease comment score by 1 and decrease member karma by 1
- IF member had a downvote, THEN THE system SHALL increase comment score by 1 and increase member karma by 1
- THE system SHALL delete the membership-vote relationship
- THE system SHALL record the removal timestamp and reason (user-initiated)
- THE system SHALL update the comment score immediately
- THE system SHALL ensure the member cannot re-vote until an explicit new vote is submitted

#### Vote Score Calculation

THE comment score SHALL be calculated as:
- comment_score = total_upvotes - total_downvotes
- THE score SHALL be displayed as an integer
- THE score SHALL not be cached
- THE score SHALL be recalculated from the database every time the comment is retrieved
- THE system SHALL update comment score atomically when votes are added, changed, or removed
- THE system SHALL prevent manual manipulation of comment score through any API or interface

#### Sorting Algorithms

Comment sorting on a post page SHALL support three modes: Best, New, Controversial. Each mode determines content presentation according to distinct business logic.

##### Best Sort Algorithm

WHEN comment sorting is set to "Best", THE system SHALL:
- Arrange comments by vote score in descending order (highest first)
- For comments with identical scores, sort chronologically by creation timestamp with newest first
- THE system SHALL apply no time decay to scores
- THE system SHALL include comments from all depths of nesting
- THE system SHALL rank replies directly under their parent comment based on their score
- THE system SHALL prioritize high-vote comments regardless of age
- THE system SHALL not apply any bias toward comments by moderators or community owners

##### New Sort Algorithm

WHEN comment sorting is set to "New", THE system SHALL:
- Arrange comments chronologically by creation timestamp in descending order (newest first)
- THE system SHALL ignore vote scores entirely when sorting
- THE system SHALL include comments from all depths of nesting
- THE system SHALL display replies in the order they were created, grouped under their parent
- THE system SHALL prioritize recency over popularity

##### Controversial Sort Algorithm

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

#### Vote Display

THE system SHALL display the comment vote score in the following manner:
- Show the integer score immediately below the comment text
- Show upvotes and downvotes only after a user hovers or taps the score
- Show "Upvote" and "Downvote" buttons to authenticated members
- Show "You upvoted" or "You downvoted" as overlay if member has voted
- Show "Vote" button for non-authenticated users (guests)
- Show a visual indicator (e.g., color or icon) for comments with negative scores
- Hide vote counts entirely for comments that have been deleted
- Display "Vote" as the default state for guests

#### Vote Integrity Rules

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

#### Relationship to Karma System

WHEN a vote on a comment changes (added, changed, removed), THE system SHALL:
- Update the karma of the comment's author by ±1 depending on vote type change
- Update the karma of the voting member if they had a previous vote to compensate for removal
- The karma change SHALL be immediate and non-delayed
- Karma change SHALL be recorded in the user's karma history log
- Karma score SHALL be visible on the user's profile
- Karma score SHALL be used as a reputation indicator, but never as a gate for voting privileges

#### Relationship to Moderation System

IF a comment has been reported, THEN THE system SHALL:
- Still allow members to vote on the comment
- Continue to display the comment's vote score
- Prevent voting on comments that have been deleted by moderators
- Allow moderators to set a "lock voting" flag on comments to prevent any changes
- Allow moderators to clear all votes on a comment during review

WHILE a comment is under moderation review, THE system SHALL continue to allow normal voting behavior unless explicitly disabled by moderator

#### User Experience Expectations

THE system SHALL ensure:
- Vote updates appear instantaneously when clicked (under 500ms response time)
- Page load of a comment thread with voting indicators shall complete in under 1.5 seconds
- Vote changes shall persist across page refreshes
- Vote buttons shall be accessible by keyboard
- Comment vote counts shall be visible without requiring scrolling or interaction

#### Edge Cases Handling

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

#### Data Validation and Constraints

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

#### Historical Consistency

THE system SHALL:
- Preserve all historical votes indefinitely
- Never purge vote records when comments are archived
- Maintain vote history for compliance and moderation purposes
- Retain vote records for deleted users for audit trail
- Prevent any retroactive modification of votes from other members
- Maintain vote record integrity regardless of subsequent content edits or deletions

#### Performance Requirements

THE system SHALL:
- Return comment vote counts within 1 second for threads under 500 comments
- Update vote scores atomically under 100ms when submitted
- Support up to 5,000 concurrent vote operations per second
- Maintain 99.9% availability for vote submission endpoints
- Return correct vote counts even under high concurrent load

#### Testability Criteria

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
- The "Controversial" sort algorithm MUST not penalize new comments with low vote totals

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*

## Moderation System

### Moderator Roles and Permissions

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
- WHERE a reported post or comment has been deleted, THE system SHALL indicate "Deleted" in the report view

### Report System

#### User Reporting

WHEN a user identifies inappropriate content, THE system SHALL allow them to report any post or comment with a reason (text field, minimum 1 character).

WHEN a user submits a report, THE system SHALL:
- Record the user ID of the reporter
- Record the type of content reported (post or comment)
- Record the ID of the reported content
- Record the community where the content exists
- Record the report reason provided by the user
- Record the timestamp of the report
- Associate the report with the community where the content resides
- Notify community moderators of the new report
- Store the reporter's karma score with the report

WHERE a user reports a post or comment they created themselves, THE system SHALL:
- Allow the report to be submitted
- Log the report
- But indicate in the report metadata that "Reporter is author"

WHEN a user attempts to report content in a community they have been banned from, THE system SHALL:
- Allow the report to be submitted
- Record the report with "banned" indicator

WHEN a user reports a post or comment, THE system SHALL NOT prevent them from interacting with other content.

#### Report Review Process

WHEN a moderator views a report, THE system SHALL provide:
- The reported content (with full text or image)
- The reporter's username and karma score
- The report reason
- The time and date of the report
- The community where the content exists
- The original author's username
- Any previous moderation actions on this content

WHEN a moderator reviews a report, THE system SHALL allow them to take one of two actions:
- Approve: Delete the reported content
- Dismiss: Leave the content as-is and close the report

WHEN a moderator approves a report, THE system SHALL:
- Immediately delete the reported content
- Notify the original author that their content was removed with reason
- Remove the report from the queue
- Record the moderator's approval and action
- Update all feeds to reflect content removal

WHEN a moderator dismisses a report, THE system SHALL:
- Leave the content unchanged
- Remove the report from the queue
- Record the moderator's dismissal
- Notify the reporter that their report was dismissed with reason (as configured)

WHEN a moderator approves a report on content from a community they don't moderate, THE system SHALL:
- Deny the action
- Return error: "You are not a moderator of this community"

WHEN a moderator dismisses a report on content from a community they don't moderate, THE system SHALL:
- Deny the action
- Return error: "You are not a moderator of this community"

#### Report Outcomes

WHEN a report is approved, THE system SHALL:
- Permanently remove the reported post or comment
- Remove all associated votes
- Decrease karma of the original author by the total value of their upvotes
- Decrease karma of voters if the content had upvotes
- Remove all comments on the reported content
- Remove the content from all feeds and public views
- Mark the original author's content as "moderator-deleted"
- Record the moderator responsible for the action
- Notify the original author if their account is active
- Remove the report from the queue

WHEN a report is dismissed, THE system SHALL:
- Retain the reported content in all views
- Keep all votes and comments intact
- Keep karma values unchanged
- Remove the report from the queue
- Record the moderator responsible for dismissal
- Notify the reporter if their account is active
- Retain the report in audit logs as "dismissed"

WHEN a post or comment is reported multiple times, THE system SHALL:
- Create separate reports for each reporting event
- Allow moderators to review each report individually
- Allow each report to be approved or dismissed independently
- Maintain a history of all reports on a piece of content

WHEN a report is approved, THE system SHALL NOT allow the original author to appeal the decision.

WHEN a report is dismissed, THE system SHALL allow the reporter to re-report the same content after 7 days.

WHEN a report is dismissed, THE system SHALL allow other users to report the same content.

WHEN a report is approved, THE system SHALL allow other users to report the same content.

#### Moderation Logs

THE system SHALL maintain a complete, immutable audit log of all moderation actions, including:
- Moderator ID
- Action type (approve, dismiss, delete, ban, unban, edit)
- Target content ID and type
- Community ID
- Timestamp
- Reason provided (if any)
- IP address of moderator
- User agent of moderator
- Associated report ID (if applicable)

THE system SHALL provide an admin dashboard for viewing all moderation logs across all communities

THE system SHALL allow moderators to filter logs by date range, user, community, or action type

THE system SHALL allow administrators to export moderation logs in CSV or JSON format

THE system SHALL log at least 3 years of moderation history

THE system SHALL allow administrators to audit moderators' actions for quality and consistency

#### Ban Appeals

WHEN a user is banned from a community, THE system SHALL:
- Immediately remove them from subscribers list
- Prevent any further posting or commenting in that community
- Allow them to view content of that community
- Notify them of the ban with reason if provided by moderator

WHEN a user submits a ban appeal, THE system SHALL:
- Require the user's password confirmation
- Collect a written appeal (minimum 50 characters)
- Assign the appeal to a moderator
- Notify the moderator of the appeal

WHEN a moderator reviews a ban appeal, THE system SHALL:
- Allow them to view the original ban reason, report history, and user's activity
- Allow them to accept or reject the appeal
- Record their decision and reason for decision
- Notify the user of the decision
- If accepted, remove the ban
- If rejected, provide reasoning to the user

WHEN a user's appeal is accepted, THE system SHALL:
- Restore the user's subscription status to the community
- Restore their ability to post and comment in the community
- Send notification to user: "Your ban appeal has been accepted. You may now participate in this community."
- Remove the user from the banned users list
- Mark the appeal as "resolved" in the audit log

WHEN a user's appeal is rejected, THE system SHALL:
- Maintain the ban permanently
- Send notification to user: "Your ban appeal has been rejected. You may not re-appeal for 30 days."
- Record the rejection reason in the audit log
- Prevent further appeals for 30 days

WHEN a user is permanently banned from the entire system by an admin, THE system SHALL:
- Allow no appeals
- Prevent all access to the platform
- Display message: "Your account has been permanently banned by an administrator."

#### Moderation Transparency

THE system SHALL provide transparency in moderation actions:
- Reporters shall be notified when their report is approved or dismissed
- Original authors shall be notified when their content is deleted
- Users shall be notified when they are banned or unbanned
- The system shall maintain public audit logs of all moderation actions
- The system shall not hide moderator identities for official actions

THE system SHALL NOT disclose reporter identities to anyone except other moderators and administrators

THE system SHALL NOT disclose the reason for a dismissal to the original author without explicit moderator approval

THE system SHALL NOT allow moderators to override platform-wide bans

THE system SHALL NOT allow moderators to access user personal information (email, IP) unless for moderation purposes in accordance with privacy laws

THE system SHALL NOT allow moderators to delete or alter moderator logs

THE system SHALL NOT allow any user to see the complete list of all banned users in a community

THE system SHALL NOT require users to provide their real names or personal information to participate

THE system SHALL NOT use moderation as a tool for suppressing dissenting opinions or ideological perspectives

THE system SHALL NOT allow community moderators to apply rules differently based on user reputation, karma, or subscription status

THE system SHALL allow users to view their own ban status and reason

THE system SHALL maintain all moderation decisions in the system's permanent audit log

THE system SHALL allow users to appeal moderation decisions via the defined appeal process

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*

## Performance and Reliability

### System Uptime

THE system SHALL maintain 99.99% availability for all user-facing services.

IF any part of the system experiences downtime, THE system SHALL:
- Display a maintenance banner to users
- Preserve user sessions and incomplete actions
- Log all service interruptions with timestamps
- Restore service as quickly as possible without data loss

### Response Times

WHEN any user performs an action (post creation, comment submission, vote, etc.), THE system SHALL respond within:
- 100ms for 90% of requests
- 300ms for 99% of requests
- 1 second for all requests

WHEN any feed is loaded (Home, Popular, Community), THE system SHALL render the initial page in:
- 500ms for 90% of requests
- 1 second for 99% of requests
- 2 seconds for all requests

WHEN a post detail page is loaded, THE system SHALL render in:
- 800ms for 90% of requests
- 1.5 seconds for 99% of requests
- 3 seconds for all requests

WHEN a comment thread is loaded, THE system SHALL render in:
- 1 second for 90% of requests
- 2 seconds for 99% of requests
- 5 seconds for all requests

WHEN a search is performed (communities, users, posts), THE system SHALL return results in:
- 300ms for 90% of requests
- 600ms for 99% of requests
- 1 second for all requests

### Scalability

THE system SHALL support:
- 10,000,000+ active user accounts
- 500,000+ active communities
- 50,000+ concurrent users
- 1,000,000+ posts per day
- 3,000,000+ comments per day
- 10,000+ votes per second
- 500+ concurrent moderator actions

THE system SHALL automatically scale compute resources based on load

THE system SHALL maintain performance under load spikes (e.g., viral post or trending community)

### Data Persistence and Backup

THE system SHALL store all user data, content, votes, and moderation logs with immediate write durability

WHEN a critical data write occurs (post creation, vote, moderator action), THE system SHALL:
- Write to primary database
- Replicate to backup database in real-time
- Log the action in audit trail immediately

THE system SHALL take daily incremental backups

THE system SHALL take weekly full backups

THE system SHALL restore from backup within 10 minutes of a system failure

THE system SHALL maintain 6 months of backup history

THE system SHALL perform regular backup integrity checks

THE system SHALL store backups in geographically distributed locations

THE system SHALL encrypt all backups with AES-256

THE system SHALL validate backup restore procedures quarterly

### Error Handling

THE system SHALL return specific, actionable error codes and messages for all failures:
- Authentication failures (401 Unauthorized)
- Authorization failures (403 Forbidden)
- Validation failures (422 Unprocessable Entity)
- Resource not found (404 Not Found)
- Server errors (500 Internal Server Error)
- Service unavailable (503 Service Unavailable)

THE system SHALL never expose internal stack traces or system information to users

THE system SHALL log all errors with sufficient context for debugging

THE system SHALL notify developers of critical errors within 1 minute

THE system SHALL maintain a public status page for system health and outages

### Security

THE system SHALL enforce the following security requirements:
- All communication shall use HTTPS with TLS 1.3+
- All passwords shall be hashed with bcrypt (12+ rounds)
- All JWT tokens shall be signed and verified
- All API endpoints shall be protected against CSRF
- All user inputs shall be sanitized to prevent XSS
- All file uploads shall be validated for type and content, not just extension
- All database queries shall use parameterized queries to prevent SQL injection
- All moderation actions shall require re-authentication
- All data in transit and at rest shall be encrypted
- All access tokens shall have expiration
- All refresh tokens shall require re-authentication for renewal
- All user sessions shall be terminated on logout
- All user account changes (password, email) shall require confirmation
- All API keys shall be rotated regularly
- All third-party dependencies shall be kept up to date
- All security vulnerabilities shall be patched within 72 hours of disclosure

### Accessibility

THE system SHALL conform to WCAG 2.1 Level AA standards:
- All text shall have sufficient color contrast
- All images shall have descriptive alt text
- All interactive elements shall be keyboard accessible
- All forms shall have proper labels
- All content shall be navigable with screen readers
- All timing requirements shall be adjustable
- All content shall be readable without color dependency

THE system SHALL provide an accessibility mode toggle

THE system SHALL support dark mode, high-contrast mode, and text-to-speech

THE system SHALL allow font size adjustment

THE system SHALL support screen reader navigation

THE system SHALL avoid flashing or blinking content

THE system SHALL avoid content that auto-advances or auto-plays

THE system SHALL have consistent navigation patterns

THE system SHALL provide clear visual feedback for all interactions

## Success Metrics

### User Engagement

- Daily Active Users (DAU): 500,000
- Monthly Active Users (MAU): 5,000,000
- DAU/MAU Ratio: > 10%
- Avg. Session Duration: > 8 minutes
- Posts per DAU: > 1.5
- Comments per Post: > 3.5
- Votes per User per Day: > 5
- Communities per User: > 3

### Community Health

- Active Communities (posts in last 30 days): 75% of total
- Community Retention Rate: > 70%
- Average Posts per Active Community: > 10
- Average Comments per Active Community: > 50
- Community Growth Rate: > 5% monthly

### System Performance

- 99.99% Uptime
- API Response Time: < 300ms (95th percentile)
- Feed Load Time: < 1.2s (95th percentile)
- Vote Processing Latency: < 100ms
- Search Response Time: < 500ms

### Moderation Effectiveness

- Report Resolution Rate: > 90% within 24 hours
- False Report Rate: < 5%
- Moderator Response Time: < 2 hours average
- User Appeal Success Rate: > 15%
- Ban Appeal Rate: < 3% of user bans

### Content Quality

- Positive Vote Ratio on Posts: > 60%
- Negative Vote Ratio on Posts: < 10%
- Content Reported: < 1% of all content
- Content Approved for Removal: < 0.5% of all reported content
- Repeat Offenders: < 0.5% of active users

### Technical Health

- No Critical Bugs: 100%
- No Known Security Vulnerabilities: 100%
- No Data Loss Incidents: 100%
- Zero Downtime: 99.99%
- Backup Restoration Success: 100%

## Related Documents

- 00-toc.md - Table of Contents
- 01-service-overview.md - Service Vision and Business Context
- 02-user-actors.md - Detailed User Actor Definitions and Permissions
- 03-authentication-flow.md - Authentication and Session Management
- 04-karma-system.md - Karma Calculation and Management
- 05-communities.md - Community Creation, Management, and Subscription
- 06-posts.md - Post Creation, Editing, Visibility, and Deletion
- 07-post-voting.md - Post Voting Mechanics and Scoring Algorithms
- 08-post-feeds.md - Feed Logic and Sorting Algorithms
- 09-comments.md - Comment System and Reply Hierarchy
- 10-comment-voting.md - Comment Voting Mechanics and Sorting
- 11-moderation-system.md - Moderator Roles, Actions, Reporting, and Banning

> This document is complete, self-contained, and ready for implementation by the engineering team. All requirements are expressed in natural business language with EARS format. Technical implementation details are left to the development team. All requirements are measurable, testable, and unambiguous.