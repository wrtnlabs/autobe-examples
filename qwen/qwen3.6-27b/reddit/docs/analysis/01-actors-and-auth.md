**redditLikeCommunity — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is an unauthenticated visitor who uses the platform without a registered account or login session. Guests have read-only access limited to publicly available content and community discovery features. They can view the popular feed containing posts across all communities and browse individual community feeds. Guests can read post titles, content, comments, and view user profiles including public karma information. Community browsing allows guests to see the full listing of available communities for exploration. Guests cannot write comments, create posts, or vote on any content. They cannot subscribe to communities, report content, or access the restricted home feed. Any attempt to perform a restricted action requires the guest to authenticate through login or registration.

### Guest Identity

A guest is an unauthenticated visitor who uses the platform without being logged in.

Guests have no registered account and no active login session.

The system treats any user who has not signed in as a guest.

Guests have read-only access to the platform and cannot perform write actions.

### Guest Read Permissions

Guests can view the popular feed containing posts from all communities across the platform.

Guests can access individual community feeds and view all posts within those communities.

Guests can browse the complete list of all communities available on the platform.

Guests can view any user's public profile page, which shows the display name, bio, avatar, and total karma score.

Guests can see a list of all posts a user has created on that user's profile page.

Guests can see a list of all comments a user has written on that user's profile page.

Guests can view the full content of any post, including title, text or image content, author, community, vote score, comment count, and posting time.

Guests can read all comments on any post, including nested replies.

### Guest Restrictions

Guests cannot create posts. Attempting to create a post requires the guest to authenticate through login or registration.

Guests cannot write comments. Attempting to comment requires the guest to authenticate through login or registration.

Guests cannot vote on posts or comments. Attempting to vote requires the guest to authenticate through login or registration.

Guests cannot subscribe to or unsubscribe from communities. Attempting to manage subscriptions requires the guest to authenticate through login or registration.

Guests cannot report posts or comments. Attempting to report requires the guest to authenticate through login or registration.

Guests cannot access the home feed, as it is restricted to logged-in users only.

Any attempt by a guest to perform a restricted action prompts the guest to authenticate through login or registration.

## member Actor

A member is an authenticated user with a registered account containing email, password, and a unique username. Members have full platform access to all content feeds including the exclusive home feed showing posts from subscribed communities. They can create text, link, and image posts within communities they have joined and actively comment with unlimited reply depth. Members can express opinions by upvoting, downvoting, changing, or removing votes on posts and comments. They manage their feed experience by subscribing to and unsubscribing from communities as desired. Members have ownership over their own content with the ability to edit or delete their posts and comments. They represent themselves through customizable profile settings including display name, bio, and avatar image. Members can participate in community health by reporting problematic posts and comments for moderator review. Account management features include password changes and complete account deletion.

### Authenticated Registered User and Full Platform Participation

A member is an authenticated, registered user with an email address, password, and unique username. Members have full platform participation privileges, which means they can create content, vote, comment, and manage their account and subscriptions. Guests have only read-only access to public content and cannot participate in any interactive features.

### Home Feed Access

Members can access the home feed, which shows posts exclusively from communities they are subscribed to. The home feed is available only to logged-in members and is not accessible to guests or unauthenticated visitors.

### Post Creation Capabilities

Members can create posts in any community they are subscribed to. Subscribing to a community is a prerequisite for creating posts within that community. Every post has a required title and must be one of three types: text posts with text content, link posts with a URL, or image posts with an uploaded image. Members cannot create posts in communities they are not subscribed to.

### Comment Writing and Replying

Members can write comments on any post. Members can reply to any existing comment, and replies can have further replies with no depth limit. Members can edit their own comments. Members can delete their own comments.

### Voting on Posts and Comments

Members can cast upvotes (adds 1 to score) and downvotes (subtracts 1 from score) on both posts and comments. Each member may vote only once per post and once per comment. Members can change their vote direction from upvote to downvote or vice versa, or remove their vote entirely. Vote scores on a member's own posts and comments contribute to their karma total.

### Community Subscription Management

Members can subscribe to any community on the platform and unsubscribe at any time. Subscribing grants the member the ability to create posts within that community. Members can view the full list of communities they are currently subscribed to.

### Own Content Editing and Deletion

Members have full ownership over all posts and comments they create. Members can edit any post they authored. Members can edit any comment they authored. Members can delete any post they authored. Members can delete any comment they authored. Content ownership is personal and cannot be transferred.

### Content Reporting

Members can report any post or comment on the platform for moderator review. When reporting content, a reason must be provided in text form. Reports are reviewed by community moderators.

### User Profile Customization with Display Name, Bio, and Avatar

Members can customize their own user profile by editing their display name, bio text, and avatar image. Each member has one profile that is viewable by all platform users including guests.

### Account Password Management

Members can change their password to manage account security. Detailed password change operations are defined in 01-actors-and-auth, Module 3, Account Management.

### Account Deletion Rights

Members can delete their own account. Upon account deletion, all posts and comments created by the member are also deleted. Detailed account deletion flow is defined in 01-actors-and-auth, Module 3, Account Management.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Registration

Users can register for a new account by providing an email address, a password, and a unique username.

The email address must not already be associated with an existing account; if it is, the registration request is rejected.

The username must be unique and not already in use by another user; if it is already taken, the registration request is rejected.

The email address is required for account creation; if it is missing, the registration request is rejected.

The password is required for account creation; if it is missing, the registration request is rejected.

The username is required for account creation; if it is missing, the registration request is rejected.

Upon successful registration, the user becomes an authenticated member with access to all member platform features.

### Login

Users can log in to their account by providing their registered email address and password.

If the email address does not match any registered account, the login request is rejected.

If the password is incorrect for the account associated with the provided email address, the login request is rejected.

The email address is required for login; if it is missing, the login request is rejected.

The password is required for login; if it is missing, the login request is rejected.

Upon successful authentication with valid credentials, the user gains access to their account and member platform features.

### Authentication State

Unregistered visitors access the platform as guests and can view public content only.

Registered users must authenticate their identity with valid credentials to access member features.

If a user provides invalid or incorrect credentials, they remain as a guest without access to member features.

Member features require the user to be in an authenticated state; guest users cannot perform member actions.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Behavior

When a user logs in with their email and password, the system establishes an active session for them.

While a session is active, the system treats the user as a logged-in member. Active sessions persist across multiple page navigations and interactions within the platform.

Logged-in members can access member-only features, such as the Home Feed, voting on posts and comments, creating posts in subscribed communities, and writing comments.

When a user's session expires or is terminated, the system treats them as a logged-out guest.

Guests can only view public content, such as the Popular Feed, Community Feeds, community browsing, and other users' public profiles and posts.

The system maintains the session state until it is terminated through logout or other termination events.

### Logout and Account Security

Users can log out of the platform at any time to end their current session.

When a user logs out, the system immediately terminates the session and removes the user's authenticated state.

After logging out, the system treats the user as a guest, and they must log in again to regain authenticated member access.

Logging out serves as an account security measure, allowing users to securely terminate their access when using shared devices or public environments and preventing unauthorized access to their posts, comments, and personal profile settings.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Users create an account by providing an email address, a password, and a unique username.
The email address and password are required for authentication.
The username must be unique across the entire platform and cannot be identical to any existing username.
Upon successful creation, the user becomes a member and can log in using their email and password.

### Account Deletion

Users can delete their account at any time.
When a user chooses to delete their account, the system permanently removes the account and all associated data.
This process automatically deletes every post the user created and every comment the user wrote.
Once the account is deleted, it cannot be recovered, and the user loses access to their profile data.

### Password Management

Users can change their password at any time while logged in.
The system updates the user's authentication credentials when a password change is completed.
After the change, the user can log in using their email address and the new password.
If a password change fails, the user's existing password remains active.