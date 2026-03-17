**redditClone — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is an unauthenticated visitor accessing the platform without an account. Guests can browse the Popular Feed to see posts from all communities across the platform. They can view any community's feed to see posts within that specific community. Guests can view any user's profile including display name, bio, avatar, and karma score. They can browse the list of all communities and search for communities by name. Guests cannot create posts or comments on any content. They cannot vote on posts or comments. Guests cannot subscribe to communities or create their own communities. They cannot report content or access the Home Feed. All guest access is limited to viewing public content only. Guest users remain in a logged-out state throughout their session.

### Guest Identity and Access State

A guest is an unauthenticated visitor accessing the platform without a user account. Guests remain in a logged-out state throughout their browsing session. All guest access is restricted to public content only. Guests have view-only permissions and cannot perform any write operations on the platform. Guests cannot access any features that require authentication.

### Feed Viewing Permissions

Guests can browse the Popular Feed to view posts from all communities across the platform. Guests can view any community's feed to see posts within that specific community. Guests cannot access the Home Feed, as it requires authentication and shows posts only from communities the user is subscribed to. All feed content is displayed in read-only mode for guests.

### Community Discovery

Guests can browse a list of all communities on the platform. Guests can search for communities by name to find specific communities of interest. When viewing community information, guests can see the community name, description, icon, and subscriber count. Guests cannot create communities or subscribe to communities.

### User Profile Access

Guests can view any user's profile page. When viewing a profile, guests can see the user's display name, bio text, avatar image, and total karma score. Guests can view the list of all posts created by that user. Guests can view the list of all comments written by that user. All profile information is displayed in read-only mode.

### Action Restrictions

Guests cannot create posts in any community. Guests cannot write comments or replies on any post. Guests cannot upvote or downvote any post or comment. Guests cannot subscribe to or unsubscribe from any community. Guests cannot report posts or comments. Guests cannot edit or delete any content. Any attempt to perform these restricted actions requires the guest to register and log in first.

## member Actor

A member is an authenticated user with a registered account on the platform. Members can create posts in any community they are subscribed to. They can comment on any post and reply to other comments with unlimited nesting. Members can upvote or downvote posts and comments, with one vote per item. They can subscribe to or unsubscribe from any community. Members can edit or delete their own posts and comments. They can report posts or comments with a reason text. Members can create new communities and become the community owner. They can view their Home Feed showing posts from subscribed communities. Members can edit their profile including display name, bio, and avatar. They can change their password and delete their account entirely. Members can become moderators if added by a community owner. Their karma score changes based on votes received on their posts and comments. Members have full interaction capabilities beyond viewing.

### Member Identity and Authentication

A member is an authenticated user with a registered account on the platform. Members gain full interaction capabilities after successful login with their email and password. Their identity is tied to their unique username chosen during registration. Members remain authenticated through an active session and can log out to end their session. Account creation, login, session management, and logout are defined in the Registration and Login and Session and Logout sections.

### Content Creation and Community Ownership

Members can create posts in any community they are subscribed to. Every post requires a title and must be one of three types: text post with content, link post with a URL, or image post with an uploaded image. Members can write comments on any post and reply to any comment with unlimited nesting depth. Members can create new communities and automatically become the community owner. Community creation includes setting a unique name, description text, and icon image.

### Voting and Karma System

Members can upvote or downvote any post or comment. Each member can only cast one vote per item. Members can change their vote from upvote to downvote or vice versa, or remove their vote entirely. When a member upvotes a post or comment, the author's karma increases by 1. When a member downvotes a post or comment, the author's karma decreases by 1. When a member removes their vote, the author's karma adjusts accordingly. Karma is a single score per user and can be negative. The vote score of a post or comment equals total upvotes minus total downvotes.

### Content Management and Reporting

Members can edit their own posts and comments. Members can delete their own posts and comments. Members can report any post or comment by providing a reason text. When a member deletes their account, all their posts and comments are also deleted. Account deletion and password change capabilities are defined in the Account Management section.

### Community Engagement and Profile

Members can subscribe to any community and unsubscribe from any community. Members can view a list of all communities they are subscribed to. Subscribing to a community is required to create posts in that community. Members can view their Home Feed, which shows posts only from communities they are subscribed to. Members can edit their profile including display name, bio text, and avatar image. A member's profile page shows their display name, bio, avatar, total karma score, list of all posts they created, and list of all comments they wrote. Members can become moderators if added by a community owner or existing moderator. Members can view any other user's profile.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

Users can create an account by providing an email address, a password, and a unique username. The email address must be valid and unique across all accounts. The username must be unique. If the email address is already registered, the request is rejected. If the username is already taken, the request is rejected. If the email format is invalid, the request is rejected.

### User Login

Users can log in by providing their registered email address and password. Upon successful login, the user becomes authenticated and can access member-only features. An authenticated session is established for the user. Users can log out to end their session and return to guest status. If the email address is not registered, the request is rejected. If the password does not match the email address, the request is rejected.

### Authentication State

Users are either authenticated (logged in) or unauthenticated (guest). Authenticated users have full access to member features including posting, commenting, voting, and subscribing. Unauthenticated users can only view public content including the Popular Feed, Community Feeds, and user profiles. Authentication is required to create posts, comments, votes, or subscriptions.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

After successful login, the user remains authenticated until they explicitly log out.

The system maintains the user's authenticated state across all page requests during the session.

Only logged-in users can access the Home Feed, which shows posts from subscribed communities.

Only logged-in users can create posts, comments, and votes.

Only logged-in users can subscribe to or unsubscribe from communities.

Only logged-in users can edit their own profile, posts, and comments.

Guest users (not logged in) can only view public content: Popular Feed, Community Feed, and user profiles.

### Logout

Users can log out from their account at any time.

After logout, the user becomes a guest and loses access to member-only features.

After logout, the user can still view Popular Feed, Community Feed, and user profiles as a guest.

After logout, the user cannot create posts, comments, or votes until they log in again.

After logout, the user cannot access their Home Feed until they log in again.

When a user deletes their account, they are automatically logged out.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Users can create an account by providing an email address, a password, and a unique username. The email address must be unique across all accounts. The username must be unique across all accounts. Upon successful account creation, the user becomes a member actor with full access to member features. The account is immediately active and the user can log in with the provided email and password.

### Account Deletion

Users can delete their own account at any time. When an account is deleted, all posts created by the user are also deleted. All comments written by the user are also deleted. The deletion is permanent and cannot be undone. The user's profile, including display name, bio, and avatar, is removed from the platform. The email address and username become available for reuse after deletion.

### Password Change

Users can change their password while logged in. The user must provide their current password for verification. The user must provide a new password. Upon successful password change, the new password is immediately effective for all future logins. All existing sessions remain active. The user receives confirmation that the password has been changed.