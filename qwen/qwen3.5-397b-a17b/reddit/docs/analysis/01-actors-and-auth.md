**redditCommunity — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their roles and what they can do.

## guest Actor

Guests are users who access the platform without logging in. They can browse the popular feed showing posts from all communities across the platform. Guests can view any community feed and read posts within that community. They can read all comments on posts without restriction. Guests can view any user's public profile including display name, bio, avatar, and karma score. Profile pages show the user's posts and comments for guests to see. Community search functionality is available to guests. All content viewing is read-only for guest users. Guests cannot vote on posts or comments. They cannot create posts or comments in any community. Subscription to communities requires login authentication. Guests cannot report content for moderator review. They must log in to access the personalized home feed. Guests can view community information including subscriber counts and descriptions.

### Popular and Community Feed Access

WHEN a guest accesses the popular feed, THE system SHALL display posts from all communities across the platform.

WHEN a guest accesses a community feed, THE system SHALL display all posts from that specific community.

THE system SHALL make the popular feed available to guests without authentication.

THE system SHALL make community feeds available to guests without authentication.

WHEN a guest searches for communities by name, THE system SHALL return matching communities from the platform.

WHEN viewing posts in any feed, THE system SHALL display the title, author username, community name, vote score, comment count, and time since posted.

WHEN viewing a text post in a feed, THE system SHALL display the first 200 characters of the content.

WHEN viewing an image post in a feed, THE system SHALL display a thumbnail of the image.

WHEN viewing a link post in a feed, THE system SHALL display the domain name of the URL.

THE system SHALL display community information including subscriber counts and descriptions to guests.

WHILE browsing feeds, THE system SHALL support sorting by Hot, New, Top, and Controversial for guests.

WHEN sorting by Top, THE system SHALL provide time filter options: today, this week, this month, this year, and all time.

WHILE viewing feeds, THE system SHALL paginate results for guests.

### Public Profile Viewing

WHEN a guest views any user's profile, THE system SHALL display the user's display name, bio, and avatar.

WHEN a guest views a user's profile, THE system SHALL display the user's total karma score.

WHEN a guest views a user's profile, THE system SHALL display a list of all posts created by that user.

WHEN a guest views a user's profile, THE system SHALL display a list of all comments written by that user.

THE system SHALL make all user profiles viewable to guests without authentication.

WHEN viewing posts on a profile page, THE system SHALL display the same information as in feed views (title, community, vote score, comment count, time posted).

WHEN viewing comments on a profile page, THE system SHALL display the content, vote score, and time since posted.

### Read-Only Browsing Rights

WHILE accessing the platform as a guest, THE system SHALL restrict all interactions to read-only operations.

THE system SHALL allow guests to view all public content without modification capabilities.

WHEN a guest attempts to interact with content, THE system SHALL require authentication before proceeding.

THE system SHALL not persist any guest preferences or settings without authentication.

WHILE browsing as a guest, THE system SHALL not track voting preferences or subscription states.

### Authentication-Required Actions

IF a guest attempts to vote on a post, THEN THE system SHALL reject the request and require login.

IF a guest attempts to vote on a comment, THEN THE system SHALL reject the request and require login.

IF a guest attempts to create a post in any community, THEN THE system SHALL reject the request and require login.

IF a guest attempts to create a comment on any post, THEN THE system SHALL reject the request and require login.

IF a guest attempts to subscribe to a community, THEN THE system SHALL reject the request and require login.

IF a guest attempts to unsubscribe from a community, THEN THE system SHALL reject the request and require login.

IF a guest attempts to report a post, THEN THE system SHALL reject the request and require login.

IF a guest attempts to report a comment, THEN THE system SHALL reject the request and require login.

IF a guest attempts to access the home feed, THEN THE system SHALL reject the request and require login.

THE system SHALL block all post creation attempts from guest users.

THE system SHALL block all comment creation attempts from guest users.

THE system SHALL block all subscription management attempts from guest users.

THE system SHALL block all content reporting attempts from guest users.

THE system SHALL make the home feed available only to authenticated users.

## member Actor

Members are authenticated users with email and password credentials. They can create communities and automatically become the community owner. Members can subscribe to any community to participate in discussions. Subscription is required before creating posts in a community. They can create posts with a title and content as text, link, or image type. Members can edit and delete their own posts after creation. They can comment on any post and reply to other comments with unlimited nesting depth. Members can edit and delete their own comments. They can vote on posts and comments using upvote or downvote actions. Each member can vote once per post or comment but can change or remove their vote. Members can report posts and comments by providing a reason for moderator review. They can view their list of subscribed communities. Home feed shows posts only from communities the member has subscribed to. Members can edit their profile including display name, bio, and avatar. They can change their password for account security. Members can delete their account which removes all their posts and comments. Community owners can add other members as moderators. Moderators can delete any post or comment in their community. Moderators can ban and unban users from their community. Moderators can view and manage reports by approving or dismissing them.

### Member Authentication and Account Management

Members are authenticated users who have completed registration with email and password credentials.

WHEN a member edits their profile, THE system SHALL:
1. Allow updating the display name
2. Allow updating the bio text
3. Allow updating the avatar image

WHEN a member changes their password, THE system SHALL:
1. Require the current password for verification
2. Require a new password that meets security requirements
3. Update the password upon successful verification

WHEN a member deletes their account, THE system SHALL:
1. Remove all posts created by the member
2. Remove all comments created by the member
3. Remove the member's profile information
4. Permanently delete the account

IF a member attempts to access member-only features without authentication, THE system SHALL reject the request.

### Community Operations

WHEN a member creates a community, THE system SHALL:
1. Require a unique community name
2. Require a description text
3. Allow an optional icon image
4. Assign the creating member as the community owner

WHEN a member subscribes to a community, THE system SHALL:
1. Record the subscription with timestamp
2. Increment the community's subscriber count
3. Allow the member to create posts in that community

WHEN a member unsubscribes from a community, THE system SHALL:
1. Remove the subscription record
2. Decrement the community's subscriber count
3. Prevent the member from creating new posts in that community

WHEN a community owner adds a moderator, THE system SHALL:
1. Verify the owner's authority
2. Grant moderator privileges to the selected member
3. Allow the new moderator to perform moderation actions

WHEN a community owner removes a moderator, THE system SHALL:
1. Verify the owner's authority
2. Revoke moderator privileges from the selected member
3. Prevent the removed moderator from performing moderation actions

WHILE a member is subscribed to communities, THE system SHALL maintain a list of all subscribed communities accessible to the member.

IF a member attempts to create a post in a community without subscription, THE system SHALL reject the request.

### Post Management

WHEN a member creates a post, THE system SHALL:
1. Require a title
2. Require the post to be one of three types: text, link, or image
3. For text posts, require text content
4. For link posts, require a URL
5. For image posts, require an uploaded image
6. Associate the post with the creating member as author
7. Associate the post with the target community
8. Initialize the vote score to zero
9. Initialize the comment count to zero

WHEN a member edits their own post, THE system SHALL:
1. Allow updating the title
2. Allow updating the content based on post type
3. Preserve the original author and community association
4. Preserve the vote score and comment count

WHEN a member deletes their own post, THE system SHALL:
1. Remove the post from the community feed
2. Remove all comments associated with the post
3. Adjust karma scores of users who voted on the post

IF a member attempts to edit a post they did not create, THE system SHALL reject the request.

IF a member attempts to delete a post they did not create, THE system SHALL reject the request.

### Comment Operations

WHEN a member creates a comment, THE system SHALL:
1. Require text content
2. Associate the comment with the target post
3. Associate the comment with the creating member as author
4. Initialize the vote score to zero
5. Record the creation timestamp

WHEN a member replies to a comment, THE system SHALL:
1. Allow unlimited nesting depth for replies
2. Associate the reply with the parent comment
3. Maintain the reply hierarchy for display

WHEN a member edits their own comment, THE system SHALL:
1. Allow updating the comment content
2. Preserve the original author and post association
3. Preserve the vote score
4. Preserve the reply hierarchy

WHEN a member deletes their own comment, THE system SHALL:
1. Remove the comment content
2. Preserve the comment structure to maintain reply hierarchy
3. Adjust karma scores of users who voted on the comment

IF a member attempts to edit a comment they did not create, THE system SHALL reject the request.

IF a member attempts to delete a comment they did not create, THE system SHALL reject the request.

### Voting System

WHEN a member upvotes a post, THE system SHALL:
1. Add 1 to the post's vote score
2. Increase the post author's karma by 1
3. Record the vote direction and timestamp

WHEN a member downvotes a post, THE system SHALL:
1. Subtract 1 from the post's vote score
2. Decrease the post author's karma by 1
3. Record the vote direction and timestamp

WHEN a member upvotes a comment, THE system SHALL:
1. Add 1 to the comment's vote score
2. Increase the comment author's karma by 1
3. Record the vote direction and timestamp

WHEN a member downvotes a comment, THE system SHALL:
1. Subtract 1 from the comment's vote score
2. Decrease the comment author's karma by 1
3. Record the vote direction and timestamp

WHEN a member changes their vote from upvote to downvote, THE system SHALL:
1. Subtract 2 from the vote score (removing +1 and applying -1)
2. Adjust the author's karma by -2
3. Update the vote record

WHEN a member changes their vote from downvote to upvote, THE system SHALL:
1. Add 2 to the vote score (removing -1 and applying +1)
2. Adjust the author's karma by +2
3. Update the vote record

WHEN a member removes their vote, THE system SHALL:
1. Adjust the vote score by removing the previous vote's effect
2. Adjust the author's karma accordingly
3. Remove the vote record

IF a member attempts to vote on the same post or comment multiple times without changing or removing the previous vote, THE system SHALL reject the request.

WHILE a member's karma can be negative, THE system SHALL display the accurate karma score on their profile.

### Content Moderation

WHEN a member reports a post or comment, THE system SHALL:
1. Require a reason text for the report
2. Record the report with timestamp
3. Associate the report with the reporting member
4. Associate the report with the target content
5. Associate the report with the community
6. Set the initial status to pending

WHEN a moderator views reports for their community, THE system SHALL:
1. Display all pending reports
2. Show the reported content
3. Show who reported the content
4. Show the reason provided

WHEN a moderator approves a report, THE system SHALL:
1. Delete the reported content
2. Change the report status to approved
3. Remove the report from the pending list

WHEN a moderator dismisses a report, THE system SHALL:
1. Keep the reported content
2. Change the report status to dismissed
3. Remove the report from the pending list

WHEN a moderator bans a user from their community, THE system SHALL:
1. Record the ban with timestamp
2. Allow an optional reason
3. Prevent the banned user from creating posts in that community
4. Prevent the banned user from creating comments in that community
5. Allow the banned user to view content in that community

WHEN a moderator unbans a user from their community, THE system SHALL:
1. Remove the ban record
2. Restore the user's ability to create posts and comments in that community

WHEN a community owner or moderator deletes any post in their community, THE system SHALL:
1. Remove the post from the community feed
2. Remove all comments associated with the post
3. Adjust karma scores accordingly

WHEN a community owner or moderator deletes any comment in their community, THE system SHALL:
1. Remove the comment content
2. Preserve the comment structure to maintain reply hierarchy
3. Adjust karma scores accordingly

IF a banned user attempts to create a post in the community where they are banned, THE system SHALL reject the request.

IF a banned user attempts to create a comment in the community where they are banned, THE system SHALL reject the request.

### Home Feed Access

WHEN a member accesses the home feed, THE system SHALL:
1. Display posts only from communities the member is subscribed to
2. Support sorting by Hot: recent posts with many upvotes appear first
3. Support sorting by New: most recently created posts appear first
4. Support sorting by Top: highest vote score first with time filter options
5. Support sorting by Controversial: posts with many votes but score close to zero appear first
6. Support pagination for large result sets

IF a guest user attempts to access the home feed, THE system SHALL reject the request as home feed is available only to logged-in members.

WHEN viewing posts in the home feed, THE system SHALL display for each post:
1. Title
2. Author username
3. Community name
4. Vote score
5. Comment count
6. Time since posted
7. For text posts: first 200 characters of content
8. For image posts: thumbnail of the image
9. For link posts: the domain name of the URL

## admin Actor

Admins are users with platform-wide oversight capabilities beyond community-level moderation. They can view all communities across the entire platform. Admins can access all reports from all communities for review. They can intervene in community moderation decisions when necessary. Admins can remove community owners or moderators if platform rules are violated. They can view platform-wide statistics and activity metrics. Admins can manage system-wide settings and configurations. They can handle escalated disputes between users across different communities. Admins can suspend or ban users from the entire platform. They can review community creation to ensure compliance with platform guidelines. Admins have visibility into all user accounts and their activities. They can restore content that was incorrectly removed by community moderators. Admins can communicate platform-wide announcements to all users. They ensure consistent enforcement of platform policies across all communities.

### Platform Oversight and Cross-Community Access

WHILE acting as an admin, THE system SHALL provide access to all communities across the entire platform.

WHEN an admin views the platform, THE system SHALL display all communities regardless of subscription status.

THE system SHALL allow admins to view any community's details including name, description, icon, and subscriber count.

WHEN an admin accesses a community, THE system SHALL grant full visibility into all posts and comments within that community.

THE system SHALL enable admins to browse communities without subscription requirements.

IF an admin searches for communities, THE system SHALL return results from all communities on the platform.

THE system SHALL provide admins with cross-community access to view content across all communities simultaneously.

WHILE viewing any community, THE system SHALL display the community owner and moderator list to admins.

### Global Report Management

WHEN reports are filed in any community, THE system SHALL make them visible to admins.

THE system SHALL allow admins to view all reports from all communities in a centralized report dashboard.

WHEN an admin views a report, THE system SHALL display the reported content, the user who filed it, and the reason provided.

THE system SHALL enable admins to review reports that community moderators have dismissed.

WHEN an admin approves a report, THE system SHALL delete the reported content regardless of community moderator decisions.

IF an admin dismisses a report, THE system SHALL remove it from the report list.

THE system SHALL allow admins to view the status of all reports including pending, approved, and dismissed.

WHEN multiple reports exist for the same content, THE system SHALL display all reports to admins.

THE system SHALL enable admins to override community moderator report decisions.

### Moderator and Owner Management

THE system SHALL allow admins to remove community owners from their communities.

WHEN an admin removes a community owner, THE system SHALL transfer ownership or assign a new owner.

THE system SHALL enable admins to remove any moderator from any community.

WHEN an admin removes a moderator, THE system SHALL revoke their moderation privileges immediately.

IF a community owner violates platform rules, THE system SHALL allow admins to suspend their ownership rights.

THE system SHALL require admins to provide a reason when removing owners or moderators.

WHEN an admin intervenes in community moderation, THE system SHALL log the intervention for audit purposes.

THE system SHALL allow admins to view all moderator actions taken within any community.

IF a moderator abuses their powers, THE system SHALL enable admins to ban them from the community.

### Platform Administration

WHEN an admin accesses platform statistics, THE system SHALL display platform-wide activity metrics.

THE system SHALL provide admins with visibility into total users, posts, comments, and communities.

WHILE viewing statistics, THE system SHALL show growth trends and engagement metrics over time.

THE system SHALL allow admins to view system-wide settings and configurations.

WHEN an admin modifies system settings, THE system SHALL apply changes across the entire platform.

THE system SHALL enable admins to configure platform-wide policies and rules.

IF system settings are changed, THE system SHALL log the changes with admin identity and timestamp.

THE system SHALL provide admins with tools to monitor platform health and performance.

WHEN viewing platform statistics, THE system SHALL show voting patterns and content distribution.

### User Account Management

WHEN a user violates platform policies, THE system SHALL allow admins to suspend the user from the entire platform.

THE system SHALL enable admins to ban users from accessing the platform entirely.

WHEN an admin bans a user, THE system SHALL prevent the user from logging in or accessing any content.

THE system SHALL allow admins to view all user accounts and their activities across the platform.

WHEN an admin views a user account, THE system SHALL display their profile, posts, comments, and karma score.

IF a user is suspended, THE system SHALL notify the user of the suspension reason.

THE system SHALL allow admins to lift suspensions or bans on user accounts.

WHEN resolving disputes between users, THE system SHALL provide admins with communication tools.

THE system SHALL enable admins to mediate conflicts that span multiple communities.

IF a dispute is escalated, THE system SHALL allow admins to review all related content and communications.

### Content Restoration and Management

WHEN content is incorrectly removed by community moderators, THE system SHALL allow admins to restore it.

THE system SHALL enable admins to view deleted posts and comments from any community.

WHEN an admin restores content, THE system SHALL return it to its original location with original metadata.

THE system SHALL allow admins to permanently delete content that violates platform guidelines.

IF content is restored, THE system SHALL notify the original author of the restoration.

THE system SHALL provide admins with the ability to edit or modify content that violates policies.

WHEN reviewing content, THE system SHALL show admins the full history including edits and deletions.

THE system SHALL enable admins to bulk-remove content from users who violate platform rules.

### Platform Communication and Policy Enforcement

WHEN admins need to communicate with all users, THE system SHALL enable platform-wide announcements.

THE system SHALL allow admins to send announcements that appear to all users on the platform.

WHEN an admin posts an announcement, THE system SHALL display it prominently to all users.

THE system SHALL require admins to ensure consistent enforcement of platform policies across all communities.

WHEN reviewing community compliance, THE system SHALL allow admins to check adherence to platform guidelines.

THE system SHALL enable admins to review new community creations for guideline compliance.

IF a community violates platform guidelines, THE system SHALL allow admins to take corrective action.

WHEN enforcing policies, THE system SHALL provide admins with documentation of policy violations.

THE system SHALL allow admins to communicate policy changes to all community owners and moderators.

IF policy enforcement is disputed, THE system SHALL enable admins to provide final rulings.

# Authentication Flows

Registration, login, session management, and token policies.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

WHEN a user registers for an account, THE system SHALL:
1. Require an email address
2. Require a password
3. Require a unique username
4. Create the user account with initial karma score of zero
5. Create an associated user profile with default values

IF the email address is already in use, THE system SHALL reject the registration.
IF the username is already taken, THE system SHALL reject the registration.
IF the password does not meet security requirements, THE system SHALL reject the registration.

WHEN registration is successful, THE system SHALL:
1. Create a session for the user
2. Redirect the user to the home feed

A guest user can access the registration page without authentication.
A registered user cannot create multiple accounts with the same email address.

### User Login

WHEN a user logs in, THE system SHALL:
1. Require the user's email address
2. Require the user's password
3. Validate the credentials against stored account information
4. Create an authenticated session upon successful validation

IF the email address does not exist in the system, THE system SHALL reject the login attempt.
IF the password is incorrect, THE system SHALL reject the login attempt.
IF the account is suspended or deleted, THE system SHALL reject the login attempt.

WHEN login is successful, THE system SHALL:
1. Establish an authenticated session
2. Redirect the user to the home feed

A guest user can access the login page without authentication.
An already authenticated user accessing the login page SHALL be redirected to the home feed.

WHEN a user logs out, THE system SHALL:
1. Terminate the user's session
2. Redirect the user to the popular feed as a guest

### Password Management

WHEN an authenticated user changes their password, THE system SHALL:
1. Require the current password for verification
2. Require a new password
3. Validate that the new password meets security requirements
4. Update the password upon successful validation
5. Maintain the user's existing session

IF the current password is incorrect, THE system SHALL reject the password change request.
IF the new password does not meet security requirements, THE system SHALL reject the password change request.
IF the new password is the same as the current password, THE system SHALL reject the password change request.

WHEN a password change is successful, THE system SHALL:
1. Update the stored password
2. Notify the user of the successful change

A guest user cannot change passwords without authentication.
An authenticated user can change their password at any time.

## Session and Token Policy

Define session duration, token refresh, and expiration policies.

### Session Duration and Management

WHEN a user logs in successfully, THE system SHALL create a session for that user.

THE system SHALL maintain active sessions for authenticated users.

WHILE a session is active, THE system SHALL allow the user to access authenticated features.

WHEN a user logs out, THE system SHALL terminate the user's session.

WHEN a user deletes their account, THE system SHALL terminate all active sessions for that user.

THE system SHALL support multiple concurrent sessions per user.

WHEN a session is terminated, THE system SHALL invalidate any associated tokens.

IF a user attempts to access authenticated features without an active session, THEN THE system SHALL deny access.

THE system SHALL track session creation time for each active session.

THE system SHALL allow users to view their active sessions.

WHEN a user changes their password, THE system SHALL terminate all existing sessions for that user.

### Token Lifecycle

THE system SHALL use JWT tokens for session management.

WHEN the system issues a JWT token, THE token SHALL include the user identifier.

WHEN the system issues a JWT token, THE token SHALL include an expiration timestamp.

THE system SHALL sign all JWT tokens with a secure secret key.

WHEN a JWT token expires, THE token SHALL no longer be valid for authentication.

IF a request includes an expired JWT token, THEN THE system SHALL reject the request.

IF a request includes an invalid JWT token, THEN THE system SHALL reject the request.

IF a request includes a malformed JWT token, THEN THE system SHALL reject the request.

THE system SHALL verify the JWT token signature on every authenticated request.

WHEN a JWT token is validated successfully, THE system SHALL allow the requested operation.

THE system SHALL include token issuance time in the JWT token payload.

### Token Refresh Policy

THE system SHALL provide a token refresh mechanism for extending session duration.

WHEN a user's access token is near expiration, THE system SHALL allow the user to request a refresh token.

WHEN a user presents a valid refresh token, THE system SHALL issue a new access token.

WHEN the system issues a new access token via refresh, THE system SHALL also issue a new refresh token.

WHEN a refresh token is used, THE system SHALL invalidate the previous refresh token.

IF a user presents an expired refresh token, THEN THE system SHALL reject the refresh request.

IF a user presents an invalid refresh token, THEN THE system SHALL reject the refresh request.

WHEN a user logs out, THE system SHALL invalidate the user's refresh tokens.

THE system SHALL limit the maximum lifetime of refresh tokens.

WHEN a refresh token reaches its maximum lifetime, THE system SHALL require the user to log in again.

IF a refresh token has been used more than once, THEN THE system SHALL reject subsequent refresh requests with that token.

### Session Security

THE system SHALL enforce secure token transmission over encrypted connections only.

WHEN storing tokens on the client side, THE system SHALL recommend secure storage mechanisms.

THE system SHALL include token expiration information in authentication responses.

WHEN detecting suspicious token usage patterns, THE system SHALL invalidate the affected tokens.

IF multiple concurrent sessions exceed the allowed limit for a user, THEN THE system SHALL terminate the oldest session.

THE system SHALL log all token refresh operations for security auditing.

THE system SHALL log all session termination events.

WHEN a token is invalidated due to security concerns, THE system SHALL notify the user on their next successful login.

IF a session has been inactive for an extended period, THEN THE system SHALL require re-authentication.

THE system SHALL prevent token reuse after logout.

WHEN issuing tokens, THE system SHALL include the token type in the token payload.

# Account Lifecycle

Account state transitions and lifecycle management.

## Account States and Transitions

Define account states (active, suspended, deleted) and valid transitions.

### Account States

THE system SHALL maintain three account states: active, suspended, and deleted.

WHEN an account is in the active state, THE system SHALL allow the user to:
1. Log in to the platform
2. Create and manage communities
3. Subscribe to communities
4. Create posts and comments
5. Vote on posts and comments
6. Edit their profile
7. Report content

WHEN an account is in the suspended state, THE system SHALL:
1. Prevent the user from logging in
2. Block all content creation actions
3. Allow the user to view public content
4. Retain all existing posts and comments
5. Display the account as suspended on the user's profile

WHEN an account is in the deleted state, THE system SHALL:
1. Remove all user authentication credentials
2. Delete all posts created by the user
3. Delete all comments created by the user
4. Remove the user's profile information
5. Preserve the user's username to prevent reuse
6. Display the author as "deleted" on any remaining references

IF an account has no explicit state, THEN THE system SHALL treat it as active.

### State Transitions

WHEN a user successfully registers, THE system SHALL set the account state to active.

WHEN an admin suspends an account, THE system SHALL transition the account from active to suspended.

WHEN an admin lifts a suspension, THE system SHALL transition the account from suspended to active.

WHEN a user requests account deletion, THE system SHALL transition the account from active to deleted.

WHEN a user requests account deletion while suspended, THE system SHALL transition the account from suspended to deleted.

IF an account is in the deleted state, THEN THE system SHALL NOT allow any transition to active or suspended.

THE system SHALL record the timestamp of each state transition.

THE system SHALL record the reason for any suspension or deletion.

### Account Suspension

WHEN an admin suspends a user account, THE system SHALL require a reason for the suspension.

WHILE an account is suspended, THE system SHALL prevent the user from:
1. Creating new posts
2. Creating new comments
3. Voting on posts or comments
4. Subscribing or unsubscribing from communities
5. Creating new communities
6. Editing their profile
7. Filing new reports

WHEN a user attempts to log in with a suspended account, THE system SHALL reject the login attempt.

WHEN a user attempts to log in with a suspended account, THE system SHALL inform the user that their account is suspended.

ONLY an admin SHALL have the authority to suspend a user account.

ONLY an admin SHALL have the authority to lift a suspension.

WHEN an admin lifts a suspension, THE system SHALL restore all user capabilities associated with the active state.

THE system SHALL notify the user via email when their account is suspended.

THE system SHALL notify the user via email when their suspension is lifted.

### Account Deletion

WHEN a user requests account deletion, THE system SHALL require the user to confirm the deletion action.

WHEN a user requests account deletion, THE system SHALL inform the user that deletion is permanent and cannot be undone.

WHEN a user requests account deletion, THE system SHALL inform the user that all their posts and comments will be deleted.

WHEN an account is deleted, THE system SHALL delete all posts authored by the user from all communities.

WHEN an account is deleted, THE system SHALL delete all comments authored by the user from all posts.

WHEN an account is deleted, THE system SHALL remove the user's subscriptions to all communities.

WHEN an account is deleted, THE system SHALL update the subscriber count of all affected communities.

WHEN an account is deleted, THE system SHALL remove the user's votes from all posts and comments.

WHEN an account is deleted, THE system SHALL adjust karma scores of all affected users accordingly.

WHEN an account is deleted, THE system SHALL prevent the username from being used for new registrations.

WHEN an account is deleted, THE system SHALL retain the email address to prevent reuse for new registrations.

IF a community has only one subscriber and that user deletes their account, THEN THE system SHALL NOT delete the community.

WHEN a community owner deletes their account, THE system SHALL transfer community ownership to an admin.

### Account Deactivation

THE system SHALL treat account deactivation as equivalent to account deletion.

WHEN a user requests account deactivation, THE system SHALL execute the same process as account deletion.

WHEN a user requests account deactivation, THE system SHALL inform the user that deactivation is permanent and cannot be undone.

WHEN a user requests account deactivation, THE system SHALL inform the user that all their posts and comments will be deleted.

IF the user interface offers both "deactivate" and "delete" options, THEN THE system SHALL clarify that both actions result in permanent account removal.