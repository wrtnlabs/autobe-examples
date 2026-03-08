**redditPlatform — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their roles and what they can do.

## guest Actor

Guests are unauthenticated visitors to the platform who can browse public content without an account. They can view the popular feed showing posts from all communities across the platform. Guests can access individual community feeds and view all posts within those communities. They can read full post content including text, links, and images. Guests can view all comments on posts and see nested reply threads. They can browse the complete list of all communities on the platform. Guests can search for communities by name to find specific ones. They can view any user's public profile including display name, bio, avatar, and karma score. Guests can see each user's posts and comments history on their profile page. However, guests cannot create posts, comments, or vote on content. They cannot subscribe to communities or access the home feed. Guests cannot report content or participate in any interactive features. To engage with the platform, guests must register for an account and become members.

### Guest Browsing Capabilities

GUEST BROWSING CAPABILITIES

WHEN a guest browses the platform, THE system SHALL:
1. Allow viewing of all public communities in a browsable list
2. Enable searching for communities by name
3. Display community names, descriptions, and subscriber counts
4. Show community icons when available

WHEN a guest searches for communities, THE system SHALL:
1. Match community names against the search query
2. Return all communities containing the search term
3. Display results in a paginated list format

THE system SHALL make all community information publicly viewable to guests without authentication.

### Feed Access Rules

FEED ACCESS RULES

WHEN a guest requests the popular feed, THE system SHALL:
1. Display posts from all communities across the platform
2. Support sorting by hot, new, top, and controversial options
3. Apply time filters for top sorting (today, this week, this month, this year, all time)
4. Paginate the feed results

WHEN a guest accesses a community feed, THE system SHALL:
1. Display all posts from the specified community
2. Support the same sorting options as the popular feed
3. Paginate the feed results

WHEN a guest attempts to access the home feed, THE system SHALL:
1. Deny access to the home feed
2. Display an error message indicating login is required

THE home feed shall only be available to authenticated members.

### Content Viewing Permissions

CONTENT VIEWING PERMISSIONS

WHEN a guest views a post, THE system SHALL:
1. Display the post title
2. Show the full content (text, link, or image)
3. Display the author username
4. Show the community name
5. Display the vote score
6. Show the comment count
7. Display when the post was created

WHEN a guest views a comment, THE system SHALL:
1. Display the comment author
2. Show the comment content
3. Display the vote score
4. Show when the comment was created
5. Display nested replies in hierarchical order

WHEN a guest views a user profile, THE system SHALL:
1. Display the user's display name
2. Show the user's bio text
3. Display the user's avatar image
4. Show the user's total karma score
5. List all posts created by the user
6. List all comments written by the user

THE system SHALL make all post content, comments, and user profiles publicly viewable.

### Guest Limitations

GUEST LIMITATIONS

WHEN a guest attempts to create a post, THE system SHALL:
1. Deny the post creation request
2. Display an error message indicating registration is required

WHEN a guest attempts to create a comment, THE system SHALL:
1. Deny the comment creation request
2. Display an error message indicating registration is required

WHEN a guest attempts to vote on a post, THE system SHALL:
1. Deny the vote request
2. Display an error message indicating registration is required

WHEN a guest attempts to vote on a comment, THE system SHALL:
1. Deny the vote request
2. Display an error message indicating registration is required

WHEN a guest attempts to subscribe to a community, THE system SHALL:
1. Deny the subscription request
2. Display an error message indicating registration is required

WHEN a guest attempts to report content, THE system SHALL:
1. Deny the report request
2. Display an error message indicating registration is required

Guests shall have no rights to create, modify, or interact with any platform content.

### Registration Requirements

REGISTRATION REQUIREMENTS

WHEN a guest wishes to interact with the platform, THE system SHALL:
1. Require the guest to register for an account
2. Provide access to the registration form
3. Allow registration with email and password
4. Require selection of a unique username

WHEN a guest completes registration, THE system SHALL:
1. Create a new member account
2. Transition the user from guest to member status
3. Grant access to all member features

THE system SHALL clearly indicate which features require registration on all restricted action buttons and links.

## member Actor

Members are registered users who have created an account and logged into the platform. They can create text posts, link posts, and image posts in communities they subscribe to. Members can write comments on any post and reply to existing comments with unlimited nesting depth. They can vote on posts and comments, with the ability to change or remove their vote. Members can subscribe to communities and unsubscribe at any time. They can create new communities and become the owner of those communities. Members can edit and delete their own posts and comments. They can access the home feed showing posts only from their subscribed communities. Members can view the list of communities they subscribe to. They can edit their profile including display name, bio, and avatar image. Members can change their password and delete their account if desired. They can report any post or comment with a reason for moderation review. Members with moderator or owner roles in a community gain additional powers including deleting any content, banning users, and managing reports. All member actions are attributed to their username for community accountability.

### Account Registration

WHEN a new user registers for an account, THE system SHALL:
1. Require a valid email address
2. Require a password that meets security requirements
3. Require a unique username that does not already exist
4. Create a member actor with default karma score of zero
5. Associate all future content with the registered username

IF the email address is already registered, THE system SHALL reject the registration.
IF the username is already taken, THE system SHALL reject the registration.
IF the password does not meet security requirements, THE system SHALL reject the registration.

A registered member can create posts, comments, vote on content, subscribe to communities, and manage their profile. All member actions are attributed to their username for community accountability.

### Profile Management

WHEN a member manages their profile, THE system SHALL:
1. Allow editing of display name
2. Allow editing of bio text
3. Allow uploading and updating of avatar image
4. Display the member's total karma score on their profile page
5. Show all posts created by the member on their profile
6. Show all comments written by the member on their profile

ANY user can view any member's profile page, including display name, bio, avatar, karma score, posts, and comments.

THE system SHALL attribute all content to the member's username across the platform for community accountability.

### Post Management

WHEN a member creates a post, THE system SHALL:
1. Require the member to be subscribed to the target community
2. Require a post title
3. Accept one of three post types: text post with content, link post with URL, or image post with uploaded image
4. Associate the post with the member's username and target community
5. Initialize the post with zero vote score and zero comment count

IF the member is not subscribed to the community, THE system SHALL reject the post creation.
IF the title is missing, THE system SHALL reject the post creation.
IF the post type content is invalid, THE system SHALL reject the post creation.

WHEN a member edits their own post, THE system SHALL allow updating of title and content while preserving the post type.

WHEN a member deletes their own post, THE system SHALL remove the post and all associated votes and comments.

### Comment Management

WHEN a member creates a comment on a post, THE system SHALL:
1. Associate the comment with the member's username
2. Allow unlimited nesting depth for replies
3. Initialize the comment with zero vote score
4. Display the comment with author, content, vote score, and timestamp

WHEN a member replies to a comment, THE system SHALL:
1. Create a nested reply under the parent comment
2. Allow replies to have their own replies with no depth limit
3. Display the reply threading structure

WHEN a member edits their own comment, THE system SHALL allow updating of the comment content.

WHEN a member deletes their own comment, THE system SHALL remove the comment and all nested replies.

### Vote Management

WHEN a member votes on a post or comment, THE system SHALL:
1. Allow upvoting which increases the vote score by 1
2. Allow downvoting which decreases the vote score by 1
3. Allow changing vote from upvote to downvote or vice versa
4. Allow removing vote entirely which adjusts the score accordingly
5. Restrict each member to one vote per post or comment

THE system SHALL calculate vote score as total upvotes minus total downvotes.

IF a member attempts to vote on content they do not have access to, THE system SHALL reject the vote.
IF a member attempts to cast a second vote without removing the first, THE system SHALL update the existing vote instead.

### Community Management

WHEN a member subscribes to a community, THE system SHALL:
1. Add the member to the community's subscriber list
2. Increment the community's subscriber count
3. Allow the member to create posts in that community
4. Include posts from that community in the member's home feed

WHEN a member unsubscribes from a community, THE system SHALL:
1. Remove the member from the community's subscriber list
2. Decrement the community's subscriber count
3. Remove posts from that community from the member's home feed

WHEN a member creates a new community, THE system SHALL:
1. Require a unique community name
2. Allow optional description text and icon image
3. Assign the creating member as the community owner
4. Subscribe the owner to the community automatically

THE member can view a list of all communities they are subscribed to.

### Home Feed Access

WHEN a member accesses the home feed, THE system SHALL:
1. Show posts only from communities the member is subscribed to
2. Require the member to be logged in
3. Support sorting by hot, new, top, and controversial
4. Paginate the results for efficient browsing

THE home feed is available only to authenticated members and shows content from their subscribed communities.

IF the member is not logged in, THE system SHALL redirect them to the login page or show the popular feed instead.

### Account Security

WHEN a member changes their password, THE system SHALL:
1. Require the current password for verification
2. Require a new password that meets security requirements
3. Update the password hash while preserving the account
4. Invalidate existing sessions requiring re-authentication

WHEN a member deletes their account, THE system SHALL:
1. Remove all posts created by the member
2. Remove all comments created by the member
3. Remove all votes cast by the member
4. Remove all subscriptions held by the member
5. Remove the member account entirely

IF the member has active sessions, THE system SHALL terminate all sessions upon account deletion.

### Content Moderation

WHEN a member reports a post or comment, THE system SHALL:
1. Require a reason for the report as text
2. Associate the report with the reporting member's username
3. Set the report status to pending for moderator review
4. Display the report to community moderators

MODERATOR POWERS (granted to community moderators):
- Delete any post in their community
- Delete any comment in their community
- Ban users from their community
- Unban users from their community
- View the list of banned users
- Review and approve or dismiss reports

OWNER PRIVILEGES (granted to community owner):
- All moderator powers plus:
- Add moderators to the community
- Remove moderators from the community
- Cannot be removed by moderators

BANNED users cannot create posts or comments in that community but can still view content.

WHEN a moderator approves a report, THE system SHALL delete the reported content.
WHEN a moderator dismisses a report, THE system SHALL remove the report from the pending list.

# Authentication Flows

Registration, login, session management, and token policies.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

WHEN a new user registers for an account, THE system SHALL:
1. Require a valid email address
2. Require a password that meets security requirements
3. Require a unique username
4. Associate the account with the registering user

IF the email address is already registered, THE system SHALL reject the registration request.
IF the username is already taken, THE system SHALL reject the registration request.
IF the password does not meet security requirements, THE system SHALL reject the registration request.
IF the email address format is invalid, THE system SHALL reject the registration request.

Upon successful registration, THE system SHALL:
1. Create a new user account
2. Initialize the user's karma score to zero
3. Create an empty profile with default values
4. Automatically log the user into the session

### User Login

WHEN an existing user logs in to the system, THE system SHALL:
1. Require a valid email address
2. Require the correct password for that email
3. Create an authenticated session upon successful verification

IF the email address is not registered, THE system SHALL reject the login request.
IF the password does not match the registered account, THE system SHALL reject the login request.
IF the account has been deleted, THE system SHALL reject the login request.

Upon successful login, THE system SHALL:
1. Create a new authenticated session
2. Allow access to member-only features
3. Display personalized content based on subscriptions

### Session Management

WHEN a user is authenticated, THE system SHALL:
1. Maintain session state for the duration of the session
2. Require authentication for member-only operations
3. Allow access to public content without authentication

WHILE a user has an active session, THE system SHALL:
1. Permit access to their personal data
2. Permit creation of posts and comments
3. Permit voting on posts and comments
4. Permit subscription to communities

IF a user's session expires, THE system SHALL:
1. Require re-authentication for member operations
2. Preserve access to public content
3. Prompt the user to log in again

### Password Management

WHEN a user wants to change their password, THE system SHALL:
1. Require the user to be authenticated
2. Require the current password for verification
3. Require a new password that meets security requirements
4. Update the password upon successful verification

IF the current password is incorrect, THE system SHALL reject the password change request.
IF the new password does not meet security requirements, THE system SHALL reject the password change request.

AFTER a password is changed, THE system SHALL:
1. Invalidate all existing sessions except the current one
2. Require re-authentication on other devices
3. Allow login with the new password

### Account Deletion

WHEN a user requests account deletion, THE system SHALL:
1. Require the user to be authenticated
2. Require confirmation of the deletion request
3. Delete all user-created content
4. Remove the user account from the system

WHEN a user account is deleted, THE system SHALL:
1. Remove all posts created by the user
2. Remove all comments created by the user
3. Remove all votes cast by the user
4. Remove all subscriptions owned by the user
5. Remove the user's profile data

AFTER account deletion, THE system SHALL:
1. Prevent login with the deleted email address
2. Allow the email address to be registered again
3. Preserve content created by other users that referenced the deleted user

## Session and Token Policy

Define session duration, token refresh, and expiration policies.

### Session Management

WHEN a user successfully authenticates via login, THE system SHALL create a new session for the user.

THE system SHALL maintain session state for all authenticated users.

WHEN a session is active, THE system SHALL allow the user to access authenticated resources.

WHEN a user logs out, THE system SHALL terminate the active session immediately.

THE system SHALL support multiple concurrent sessions for the same user account.

WHEN a session is created, THE system SHALL associate it with the authenticated user's account.

THE system SHALL track session creation timestamp for each session.

WHEN a user accesses the system, THE system SHALL validate the session before granting access to protected resources.

IF the session is invalid or expired, THE system SHALL deny access and require re-authentication.

THE system SHALL provide a mechanism for users to view their active sessions.

THE system SHALL allow users to terminate specific sessions remotely.

### JWT Token Policy

THE system SHALL use JWT (JSON Web Token) tokens for session authentication.

WHEN a user authenticates successfully, THE system SHALL issue a JWT token to the client.

THE system SHALL include the user's unique identifier in the JWT token payload.

THE system SHALL sign all JWT tokens with a secure secret key.

THE system SHALL validate JWT token signature on each authenticated request.

JWT tokens SHALL contain an expiration timestamp claim.

THE system SHALL reject JWT tokens with invalid signatures.

THE system SHALL reject JWT tokens that have been tampered with.

WHEN a JWT token is presented, THE system SHALL verify it has not expired before processing the request.

THE system SHALL support token-based authentication for API requests.

JWT tokens SHALL be transmitted securely over HTTPS only.

### Token Refresh Mechanism

WHEN a JWT token approaches expiration, THE system SHALL allow the user to refresh the token.

THE system SHALL issue a refresh token along with the initial JWT token upon authentication.

WHEN a valid refresh token is presented, THE system SHALL issue a new JWT token.

THE system SHALL invalidate the old refresh token when a new one is issued (token rotation).

IF a refresh token is invalid, THE system SHALL reject the refresh request and require re-authentication.

IF a refresh token has expired, THE system SHALL reject the refresh request and require re-authentication.

THE system SHALL support refresh token rotation to prevent token reuse attacks.

WHEN a user logs out, THE system SHALL invalidate all associated refresh tokens.

THE system SHALL allow users to revoke all active refresh tokens from their account settings.

THE system SHALL track refresh token usage for security monitoring.

### Session Expiration Policies

THE system SHALL define a maximum session duration of 24 hours for standard users.

WHEN a session reaches its maximum duration, THE system SHALL expire the session automatically.

THE system SHALL define an idle timeout of 30 minutes for inactive sessions.

WHEN a session exceeds the idle timeout, THE system SHALL terminate the session automatically.

WHEN a session expires, THE system SHALL require the user to re-authenticate to continue.

THE system SHALL clear all session data upon expiration.

IF a user's password is changed, THE system SHALL invalidate all existing sessions for that user.

IF a user's account is suspended or deleted, THE system SHALL terminate all active sessions immediately.

THE system SHALL provide users with notification options for session expiration warnings.

THE system SHALL allow session duration configuration for different user roles.

# Account Lifecycle

Account state transitions and lifecycle management.

## Account States and Transitions

Define account states (active, suspended, deleted) and valid transitions.

### Account States Definition

THE system SHALL maintain three account states for each user: active, suspended, and deleted.

WHEN a user registers, THE system SHALL create their account with the active state.

WHILE an account is in the active state, THE system SHALL allow the user to log in and perform all permitted actions.

WHILE an account is in the suspended state, THE system SHALL prevent the user from logging in.

WHILE an account is in the deleted state, THE system SHALL prevent any access to the account.

A user SHALL NOT manually transition their account to the suspended state.

A user SHALL NOT manually transition their account to the deleted state without following the deletion workflow.

### Account Deletion Process

WHEN a user requests account deletion, THE system SHALL initiate the deletion workflow.

WHEN the deletion workflow completes, THE system SHALL transition the account state to deleted.

WHEN an account transitions to deleted, THE system SHALL remove all posts created by the user.

WHEN an account transitions to deleted, THE system SHALL remove all comments created by the user.

WHEN an account transitions to deleted, THE system SHALL remove the user's profile information including display name, bio, and avatar.

WHEN an account transitions to deleted, THE system SHALL remove all subscriptions associated with the user.

WHEN an account transitions to deleted, THE system SHALL remove all votes cast by the user from posts and comments.

WHEN an account transitions to deleted, THE system SHALL remove the user from any community moderator lists.

IF a user owns a community, THE system SHALL transfer ownership or remove the community when the account is deleted.

THE system SHALL NOT allow a user to log in with a deleted account.

### Account Suspension

WHEN the system detects policy violations, THE system SHALL transition the account state to suspended.

WHILE an account is suspended, THE system SHALL prevent the user from creating new posts.

WHILE an account is suspended, THE system SHALL prevent the user from creating new comments.

WHILE an account is suspended, THE system SHALL prevent the user from voting on posts or comments.

WHILE an account is suspended, THE system SHALL prevent the user from creating new communities.

WHILE an account is suspended, THE system SHALL prevent the user from subscribing to communities.

THE system SHALL notify the user when their account is suspended.

THE system SHALL provide a reason for the suspension to the user.

THE system SHALL allow account recovery through an appeal process defined in business rules.

### Account State Transitions

WHEN a user successfully registers, THE system SHALL transition the account from non-existent to active.

WHEN a user completes the deletion workflow, THE system SHALL transition the account from active to deleted.

WHEN the system detects policy violations, THE system SHALL transition the account from active to suspended.

WHEN a suspended account is reinstated, THE system SHALL transition the account from suspended to active.

A deleted account SHALL NOT transition to any other state.

A suspended account SHALL transition to active only through the reinstatement process.

A deleted account SHALL NOT be recoverable.

WHEN transitioning to deleted, THE system SHALL ensure all associated content is removed before finalizing the state change.