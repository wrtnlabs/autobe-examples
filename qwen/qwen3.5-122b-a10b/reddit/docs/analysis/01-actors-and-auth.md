**redditLike — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

Guests are unauthenticated visitors who can access public content on the platform without creating an account. They can browse the popular feed to view posts from all communities across the platform. Guests can access community feeds to see posts from specific communities. They can view individual posts including titles, content, vote scores, and comment counts. Guests can read comments on any post and view nested reply threads. They can search for communities by name and browse the list of all available communities. Guests can view any user's profile page including display name, bio, avatar, karma score, and their posted content. However, guests cannot create posts or comments, cannot vote on content, cannot subscribe to communities, and cannot access the home feed. To participate in community activities, guests must register and become members.

### Guest Identity

Guests are unauthenticated visitors who access the platform without creating an account. They can browse and view public content but cannot participate in community activities. To create posts, comments, vote, or subscribe to communities, guests must register and become members.

### Public Feed and Post Viewing

Guests can browse the popular feed, which shows posts from all communities across the platform. They can view community feeds to see posts from specific communities. Guests can view individual posts including the title, full content, author username, community name, vote score, comment count, and when it was posted. For text posts, they see the first 200 characters of content in the feed. For image posts, they see a thumbnail. For link posts, they see the domain name of the URL.

### Comment Reading and Community Browsing

Guests can read comments on any post and view nested reply threads without depth limits. They can search for communities by name and browse the list of all available communities. Each community listing shows the subscriber count. Guests can view any user's profile page, which displays the user's display name, bio, avatar, total karma score, a list of all posts they created, and a list of all comments they wrote.

### Guest Participation Limitations

Guests cannot create posts or comments on the platform. They cannot vote on posts or comments (no upvoting or downvoting). Guests cannot subscribe to or unsubscribe from communities. They cannot access the home feed, which is only available to logged-in members. To perform any of these actions, guests must register with an email, password, and unique username to become a member.

## member Actor

Members are registered users who have authenticated accounts and full participation rights on the platform. Members can sign up with email and password to create an account with a unique username. They can log in and maintain authenticated sessions to access member-only features. Members can edit their own profile including display name, bio text, and avatar image. They can create communities and become the owner of those communities. Members can subscribe to any community to gain posting access, and unsubscribe from communities they no longer wish to follow. They can create posts in communities they subscribe to, with support for text, link, and image post types. Members can edit and delete their own posts and comments. They can vote on posts and comments, with the ability to change or remove their votes. Members can write comments and reply to existing comments with unlimited nesting depth. They can report posts or comments with a reason text. Members can access the home feed showing posts from their subscribed communities. They accumulate karma based on upvotes and downvotes received on their content. Members can become moderators or owners of communities they create, gaining additional moderation powers including deleting any content, banning users, and managing reports.

### Member Identity and Access

Members are registered users with authenticated accounts who have full participation rights on the platform. Unlike guests who can only view public content, members can create communities, post content, write comments, vote on posts and comments, and subscribe to communities. Members must authenticate with their email and password to access member-only features such as the home feed, posting capabilities, and profile editing. Members accumulate karma scores based on upvotes and downvotes received on their posts and comments. Members can become community owners (when they create a community) or moderators (when added by an owner or another moderator), gaining additional moderation powers within those communities.

### Profile Editing Rights

Members can edit their own profile information including display name, bio text, and avatar image. Members can view any other user's profile, including the profile owner's display name, bio, avatar, total karma score, list of posts they have created, and list of comments they have written. Profile editing applies only to the member's own profile; members cannot edit other users' profiles.

### Community Creation and Ownership

Members can create a community by providing a unique name, description text, and icon image. The member who creates a community automatically becomes its owner with the highest authority level. Members can browse all communities in a list and search for communities by name. Each community displays its subscriber count to all viewers.

### Community Subscription Management

Members can subscribe to any community to gain posting access within that community. Members can unsubscribe from any community they are subscribed to. Members can view a list of all communities they are subscribed to. Subscribing to a community is required before a member can create posts in that community.

### Post Creation and Management

Members can create posts in any community they are subscribed to. Every post requires a title. Posts must be one of three types: text posts (with text content), link posts (with a URL), or image posts (with an uploaded image). Members can edit their own posts after creation. Members can delete their own posts. Moderators and community owners can also delete any post in their community (defined in Moderation Permissions).

### Comment Writing and Management

Members can write comments on any post. Members can reply to any comment, and replies can have replies with no depth limit. Members can edit their own comments after creation. Members can delete their own comments. Moderators and community owners can also delete any comment in their community (defined in Moderation Permissions).

### Voting Rights and Vote Management

Members can upvote posts and comments, which adds 1 to the vote score. Members can downvote posts and comments, which subtracts 1 from the vote score. Each member can cast only one vote per post or comment. Members can change their vote from upvote to downvote or vice versa. Members can remove their vote entirely, which adjusts the vote score accordingly. The same voting rules apply to both posts and comments.

### Content Reporting and Home Feed Access

Members can report any post or comment by providing a reason text. Reports are submitted to moderators of the community where the reported content exists. Members can access the home feed, which shows posts only from communities they are subscribed to. The home feed is available only to logged-in members.

### Community Owner and Moderator Authority

Members who become community owners have the highest authority in their community. Owners can add moderators to their community. Owners can remove moderators from their community. Owners cannot be removed by moderators. Members who are moderators can add other moderators to their community. Moderators cannot remove the community owner. Moderators cannot remove each other; only the owner can remove moderators.

### Moderation and User Banning Permissions

Moderators can delete any post in their community regardless of author. Moderators can delete any comment in their community regardless of author. Moderators can ban users from their community. Banned users cannot create posts or comments in that community but can still view content. Moderators can unban previously banned users. Moderators can view the list of banned users in their community.

### Report Management Access

Moderators can view all reports submitted for their community. Each report displays the reported content, the user who reported it, and the reason provided. Moderators can approve a report, which deletes the reported content. Moderators can dismiss a report, which keeps the content and removes the report from the report list.

### Karma Score Accumulation

Members accumulate karma based on votes received on their posts and comments. When someone upvotes a member's post or comment, the member's karma increases by 1. When someone downvotes a member's post or comment, the member's karma decreases by 1. When someone removes their vote, the member's karma adjusts accordingly. Karma can be negative if a member receives more downvotes than upvotes. Each member has a single karma score displayed on their profile.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

Users can create a new account by providing an email address, a password, and choosing a unique username.

The email address must be valid and not already registered to another account. The username must be unique across the platform and not already in use. The password must meet security requirements for account protection.

Upon successful registration, the user is automatically logged in and becomes a member with full access to member features.

If the email is already registered, the registration is rejected with an appropriate message. If the username is already taken, the registration is rejected with an appropriate message. If the email format is invalid, the registration is rejected with an appropriate message.

Guest users (not logged in) cannot register; they must complete the registration process to become members.

### User Login

Members can log in to their account using their registered email address and password.

Upon successful login, the user becomes authenticated and gains access to member-only features including creating posts, commenting, voting, and managing their profile.

If the email is not registered, the login is rejected with an appropriate message. If the password is incorrect, the login is rejected with an appropriate message.

Logged-in users remain authenticated until they explicitly log out or their session expires.

### Authentication States

The system distinguishes between two authentication states: guest and member.

Guests are users who are not logged in. Guests can browse the popular feed, view community feeds, read posts and comments, and view user profiles. Guests cannot create posts, comments, or vote on content.

Members are authenticated users who have successfully logged in. Members have access to all guest features plus the ability to create and manage their own content, vote on posts and comments, subscribe to communities, and access the home feed showing content from subscribed communities.

The system tracks authentication state to enforce permission boundaries between guest and member access levels.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

When a user successfully logs in with their email and password, the system establishes an active session for that user. While the session is active, the user can access features that require authentication, such as creating posts, commenting, voting, and managing their profile.

The system tracks which user is currently logged in for the duration of the session. Session state is maintained on the server side and associated with the authenticated user account.

### Logout

Users can log out from their account at any time. When a user logs out, their active session is terminated and they are returned to a logged-out state.

After logging out, the user no longer has access to authenticated features such as creating posts, commenting, voting, or viewing their home feed. To access these features again, the user must log in with their credentials.

### Account Security

Users can change their account password at any time after logging in. The user must provide their current password to verify their identity before setting a new password.

Users can delete their account entirely. When an account is deleted, all content created by that user is also deleted, including:
- All posts created by the user
- All comments written by the user
- All votes cast by the user
- All reports submitted by the user

The user's profile information, including display name, bio, and avatar, is also removed. The username becomes available for registration by other users after account deletion.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Registration

Users can create a new account by providing an email address, choosing a password, and selecting a unique username.

The email address must not already be associated with an existing account.
The username must be unique across the platform and cannot be changed after registration.

Upon successful registration, the user becomes a member of the platform.

### Password Change

Users can change their account password at any time after logging in.

The user must provide their current password to verify their identity.
The new password must be different from the current password.

Upon successful password change, the user can continue using their account with the new password.

### Account Deletion

Users can delete their own account at any time.

When an account is deleted, all content created by that user is also deleted, including:
- All posts created by the user
- All comments written by the user

The user's profile information, including display name, bio, and avatar, is also removed.

Account deletion is irreversible and cannot be undone.