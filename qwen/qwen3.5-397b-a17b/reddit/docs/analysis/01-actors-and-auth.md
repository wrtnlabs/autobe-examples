**redditCommunity — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is an unauthenticated visitor who has not created an account or logged in. Guests can browse content across the platform without restrictions on viewing. They access the Popular Feed to see posts from all communities. Guests view Community Feeds to see posts from specific communities. They browse the list of all available communities. Guests search for communities by name. They view any user's public profile including display name, bio, avatar, karma score, and post history. Guests cannot interact with content through voting or commenting. They cannot create posts or subscribe to communities. Guests cannot report content or access personalized feeds. To gain interaction capabilities, guests must register for an account. Guest access is limited to read-only operations on public content.

### Guest Identity and Access Level

A guest is an unauthenticated visitor who has not created an account or logged in to the platform. Guests have read-only access to public content across the platform. They can view posts, comments, communities, and user profiles without any authentication. Guests cannot perform any write operations or interact with content. To gain interaction capabilities such as voting, commenting, or posting, a guest must register for an account and log in. Guest access requires no credentials or session management. All guest activities are anonymous and not associated with any user identity.

### Community Browsing Capabilities

Guests can browse all communities on the platform through a community list view. The community list displays each community's name, description, icon, and subscriber count. Guests can search for communities by name using the search functionality. Search results show matching communities with their basic information. Guests can view any community feed to see posts from that specific community. The community feed displays posts with their title, author username, community name, vote score, comment count, and time since posted. For text posts, the first 200 characters of content are shown. For image posts, a thumbnail is displayed. For link posts, the domain name of the URL is shown. Guests can navigate through paginated community feeds to browse older posts.

### Post Feed Access

Guests can view the Popular Feed which shows posts from all communities across the platform. The Popular Feed is available to everyone including logged-out users. Guests can sort the Popular Feed by Hot (recent posts with many upvotes), New (most recently created), Top (highest vote score with time filter options: today, this week, this month, this year, all time), or Controversial (posts with many votes but score close to zero). Guests can view post lists in any feed with pagination support. Each post in the list shows the title, author username, community name, vote score, comment count, and time since posted. Guests cannot access the Home Feed as it requires authentication and shows only posts from communities the user is subscribed to. Home Feed access is restricted to logged-in members only.

### User Profile Viewing

Guests can view any user's public profile without restrictions. A user's profile page displays their display name, bio text, and avatar image. The profile shows the user's total karma score as a single number. Guests can see a list of all posts the user has created, displayed with standard post list information. Guests can see a list of all comments the user has written. Profile viewing is read-only and does not require any authentication. All user profiles are publicly accessible to guests. The karma score displayed reflects the user's current total from all upvotes and downvotes received on their posts and comments.

### Guest Restrictions

Guests cannot vote on posts or comments. Voting requires an authenticated member account. Guests cannot create posts in any community. Post creation requires subscription to the community and member authentication. Guests cannot subscribe to communities. Subscription is a member-only feature that requires an account. Guests cannot comment on posts or reply to existing comments. Comment creation and replying require member authentication. Guests cannot report posts or comments. Reporting functionality is available only to logged-in members. Guests cannot create communities. Community creation requires an authenticated user account. Guests cannot edit or delete any content as they have no ownership of posts or comments. Guests cannot access personalized features such as the Home Feed or subscribed community lists. All interactive features on the platform require guest to register and become a member.

## member Actor

A member is a registered user who has created an account and logged in. Members have full access to all viewing capabilities available to guests. They access the Home Feed showing posts from subscribed communities. Members create and manage their own communities. They subscribe to and unsubscribe from communities. Members create posts in communities they follow. They vote on posts and comments to influence karma scores. Members write comments and reply to existing comments. They edit and delete their own posts and comments. Members report inappropriate content to moderators. They can become community owners by creating communities. Members may serve as moderators if appointed by community owners. They manage their profile information including display name, bio, and avatar. Members change their password and delete their account when needed.

### Member Identity and Access

A member is a registered user who has created an account and logged in.

Members inherit all viewing capabilities available to guests, including browsing all communities, searching communities by name, viewing community feeds, and viewing the popular feed.

Members access the Home Feed, which shows posts only from communities the user is subscribed to. The Home Feed is available only to logged-in members.

Members maintain a single account with a unique username chosen during registration.

### Community Participation

Members can create a community. When a member creates a community, they become its owner with the highest authority over that community.

Members can subscribe to any community. Members can unsubscribe from any community at any time.

Members can create a post in any community they are subscribed to. Members cannot create posts in communities they are not subscribed to.

Members can view a list of all communities they are subscribed to.

WHEN a member creates a community, THEN the member becomes the community owner.
WHEN a member subscribes to a community, THEN the member can create posts in that community.
WHEN a member unsubscribes from a community, THEN the member cannot create posts in that community.

### Content Interaction and Management

Members can upvote any post. Each upvote adds 1 to the post score.

Members can downvote any post. Each downvote subtracts 1 from the post score.

Members can upvote any comment. Each upvote adds 1 to the comment score.

Members can downvote any comment. Each downvote subtracts 1 from the comment score.

Each member can only vote once per post. Each member can only vote once per comment.

Members can change their vote from upvote to downvote or vice versa on any post or comment.

Members can remove their vote entirely from any post or comment. When a vote is removed, the score adjusts accordingly.

Members can write a comment on any post.

Members can reply to any comment. Replies can have replies, with no depth limit.

Members can edit their own posts at any time.

Members can delete their own posts at any time.

Members can edit their own comments at any time.

Members can delete their own comments at any time.

IF a member attempts to edit a post they did not create, THEN the request is rejected.
IF a member attempts to delete a post they did not create, THEN the request is rejected.
IF a member attempts to edit a comment they did not author, THEN the request is rejected.
IF a member attempts to delete a comment they did not author, THEN the request is rejected.

### Reporting and Moderation Roles

Members can report any post. When reporting a post, the member must provide a reason as text.

Members can report any comment. When reporting a comment, the member must provide a reason as text.

Members can become community owners by creating communities.

Members can serve as moderators if appointed by community owners. Moderators are appointed by the community owner or by existing moderators.

IF a member reports content without providing a reason, THEN the request is rejected.

### Profile and Account Management

Members can edit their own display name at any time.

Members can edit their own bio text at any time.

Members can edit their own avatar image at any time.

Members can change their password. Password change requirements are defined in the Account Management section.

Members can delete their own account. When a member deletes their account, all their posts and comments are also deleted. Account deletion requirements are defined in the Account Management section.

Members can view any other user's profile. A user's profile page shows their display name, bio, avatar, total karma score, a list of all posts they have created, and a list of all comments they have written.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

Users can create an account by providing an email address, a password, and a unique username.

The email address must be valid and not already associated with an existing account.
The username must be unique across the platform and not already taken.
The password must meet the platform's security requirements.

When registration is successful, the user account is created and the user is automatically logged in.
If the email address is already in use, the registration is rejected.
If the username is already taken, the registration is rejected.
If the password does not meet requirements, the registration is rejected.
If any required field is missing, the registration is rejected.

### User Login

Registered users can log in by providing their email address and password.

When login credentials are valid, the user is authenticated and granted access to their account.
When login credentials are invalid, the login attempt is rejected.

Users must provide both email and password to log in.
If the email address is not associated with any account, the login is rejected.
If the password does not match the account, the login is rejected.
If either email or password is missing, the login is rejected.

### Authentication

The system authenticates users when they provide valid credentials during login.

WHEN a user provides valid email and password, THE system SHALL authenticate the user and grant access to member features.
WHEN a user provides invalid credentials, THE system SHALL reject the authentication attempt.

Authenticated users have access to member-only features including creating communities, subscribing to communities, creating posts, and writing comments.
Unauthenticated users (guests) have limited access to browse communities, view posts, and read comments.

IF authentication fails, THEN the system SHALL not grant access to member-only features.
IF a user attempts to access member-only features without authentication, THEN the system SHALL reject the request.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

After successful login, the user remains authenticated and can access member-only features.
The session persists until the user explicitly logs out.
Guest users do not have an active session and can only access features available to unauthenticated visitors.
When a session is active, the user can access their home feed, create posts, create comments, subscribe to communities, and perform other member actions.
If the session ends, the user returns to guest status and loses access to member-only features.

### Logout

Users can log out from their account at any time.
After logout, the user's session is terminated immediately.
After logout, the user becomes a guest and can only access features available to unauthenticated visitors.
The home feed is no longer available after logout.
Actions requiring authentication (creating posts, commenting, voting, subscribing) are no longer available after logout.
The user can log in again to restore member access.

### Account Security

Users can change their password to maintain account security.
Password changes are available to logged-in users only.
After changing the password, the user remains logged in with the new password.
The new password is used for all subsequent login attempts.
Users can delete their account, which permanently removes the account and all associated content.
Account deletion is available to logged-in users only.
After account deletion, the user can no longer log in with the deleted account credentials.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

A user can create an account by providing an email address, a password, and a unique username.
The email address must be valid and not already associated with an existing account.
The username must be unique across the platform and not already in use.
The password must meet minimum security requirements as defined by the system.
Upon successful account creation, the user becomes a member actor with full access to member features.
If the email address is already registered, the account creation request is rejected.
If the username is already taken, the account creation request is rejected.
If the password does not meet security requirements, the account creation request is rejected.

### Account Deletion

A user can delete their own account at any time.
When a user deletes their account, all posts created by that user are permanently deleted.
When a user deletes their account, all comments written by that user are permanently deleted.
Account deletion is irreversible and cannot be undone.
The user's profile, including display name, bio, and avatar, is removed upon account deletion.
The user's karma score is removed along with the account.
If the user owns any communities, the community ownership must be transferred or the communities are handled according to platform policy before deletion can complete.
If the user has active subscriptions to communities, all subscriptions are automatically cancelled upon account deletion.

### Password Change

A user can change their password at any time while logged in.
The user must provide their current password to verify identity before setting a new password.
The new password must meet the same security requirements as the initial password.
Upon successful password change, all existing sessions remain valid unless the user chooses to log out from all devices.
If the current password provided is incorrect, the password change request is rejected.
If the new password does not meet security requirements, the password change request is rejected.
If the new password is identical to the current password, the password change request is rejected.