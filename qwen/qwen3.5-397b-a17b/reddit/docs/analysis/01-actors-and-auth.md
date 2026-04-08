**redditCommunity — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is a user who has not logged into the platform. Guests can browse the Popular Feed to view posts from all communities across the platform. Guests can also view Community Feeds to see posts from specific communities without subscribing. Guests can read post titles, view vote scores, and see comment counts on any publicly available content. They can access community information including the community name, description, and subscriber count. However, guests cannot create posts or comments on the platform. Guests cannot vote on posts or comments. Guests cannot subscribe to communities or access the Home Feed. Guests cannot report content or interact with any user profiles beyond viewing them. To perform any interactive actions, a guest must first register and log in to become a member.

### Guest Identity and Access

A guest is an unauthenticated user who has not logged into the platform. Guests can browse the platform without creating an account. Any visitor to the platform is automatically treated as a guest until they register and log in. Guests have read-only access to publicly available content on the platform.

### Public Content Viewing

Guests can view the Popular Feed to see posts from all communities across the platform. Guests can browse Community Feeds to view posts from specific communities without subscribing. When viewing any feed, guests can read post titles, view vote scores, and see comment counts. Guests can access community information including the community name, description, and subscriber count. Guests can view any user's profile page including their display name, bio, avatar, total karma score, and lists of their posts and comments. All content visible to guests is publicly available and does not require authentication.

### Permission Boundaries

Guests have read-only permissions and cannot perform any interactive actions on the platform. Guests cannot create posts or comments. Guests cannot vote on posts or comments. Guests cannot subscribe to communities or unsubscribe from communities. Guests cannot access the Home Feed, which is restricted to logged-in users only. Guests cannot report posts or comments. To perform any interactive actions including posting, commenting, voting, subscribing, or reporting, a guest must first register an account and log in to become a member.

## member Actor

A member is a registered user who has logged into the platform with valid credentials. Members can access the Home Feed showing posts from communities they have subscribed to. Members can create posts in any community where they hold an active subscription. Members can write comments on posts and reply to existing comments with unlimited nesting depth. Members can upvote or downvote posts and comments to influence karma scores. Members can subscribe to or unsubscribe from any community on the platform. Members can create new communities and become the owner of those communities. Members can edit their own posts and comments after creation. Members can delete their own posts and comments permanently. Members can report posts and comments that violate community guidelines. Members can view and edit their profile including display name, bio, and avatar. Members can change their password and delete their entire account if desired. Members can view lists of communities they are subscribed to. Members can view other user profiles to see their posts, comments, and karma scores.

### Member Identity and Access

A member is a registered user who has authenticated with valid credentials. Members have authenticated user access to all platform features beyond read-only browsing. Members are identified by their unique username. Members can access the Home Feed which displays posts exclusively from communities they have subscribed to. The Home Feed is available only to logged-in members and is not accessible to guests. Members can access the Popular Feed showing posts from all communities across the platform. Members can access any Community Feed to view posts from specific communities regardless of subscription status.

### Content Creation and Subscription

Members can create posts in any community where they hold an active subscription. Post creation is restricted to subscribed communities only. Members can create text posts with content, link posts with URLs, or image posts with uploaded images. Members can write comments on any post within the platform. Members can reply to any existing comment with unlimited nesting depth, allowing infinite reply chains. Members can create new communities on the platform and automatically become the owner of communities they create. Members can subscribe to any community on the platform. Members can unsubscribe from any community they are currently subscribed to. Members can view a list of all communities they are subscribed to at any time.

### Content Management and Reporting

Members can edit their own posts after creation to modify title, content, URLs, or images. Members can edit their own comments after creation to modify the comment content. Members can delete their own posts permanently, which removes the post from the community feed. Members can delete their own comments permanently, which removes the comment and all nested replies. Members can report any post or comment that violates community guidelines by providing a reason for the report.

### Voting and Karma

Members can upvote any post to add 1 to its vote score. Members can downvote any post to subtract 1 from its vote score. Members can upvote or downvote any comment using the same voting mechanism. Each member can cast only one vote per post and one vote per comment at any time. Members can change their vote from upvote to downvote or vice versa on any post or comment. Members can remove their vote entirely from any post or comment. Members participate in the karma system where their karma score increases when others upvote their posts or comments and decreases when others downvote their content. Karma can be negative.

### Profile and Account Permissions

Members can view and edit their own profile including display name, bio text, and avatar image. Members can view any other user's profile to see their display name, bio, avatar, total karma score, list of posts created, and list of comments written. Members have the right to change their password through account settings. Members have the right to delete their entire account permanently, which also deletes all posts and comments they have created across the platform.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

Users can create an account by providing an email address, a password, and choosing a unique username. The email address must be valid and not already associated with an existing account. The username must be unique across the platform. Upon successful registration, the user becomes a member actor with full access to member features. If the email is already registered, the request is rejected. If the username is already taken, the request is rejected. If the email format is invalid, the request is rejected.

### User Login

Users can log in by providing their registered email address and password. The system validates the email and password combination before granting access. Upon successful authentication, the user gains access to member features including creating posts, comments, and subscribing to communities. If the email is not registered, the request is rejected. If the password does not match the registered password, the request is rejected.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

When a user logs in successfully with email and password, the system creates a session that keeps the user logged in.
The session persists until the user explicitly logs out.
Logged-in users (members) can access their home feed showing posts from communities they are subscribed to.
Logged-in users can create posts, create comments, vote on posts and comments, subscribe to communities, and manage their profile.
If a session is no longer valid, the user is treated as a guest and must log in again to access member features.
Guests can view the popular feed and community feeds but cannot create posts, comments, or votes.

### Logout

Users can log out from their account at any time.
When a user logs out, their session ends.
After logout, the user becomes a guest and loses access to member-only features.
The home feed is no longer available after logout.
Logging out does not delete the user's account or any content they have created.
Users can log in again with their email and password after logging out.

### Account Security

Users can change their password to protect their account (see Account Management section for details).
Users can delete their account, which also removes all their posts and comments (see Account Management section for details).
Each user account is protected by their email and password credentials.
Only the account owner can access their account by providing the correct email and password.
If a user suspects their account has been compromised, they can change their password to secure their account.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Users create an account by providing an email address, a password, and choosing a unique username.
The email address is used for login and must be valid.
The username must be unique across the platform and cannot be changed after account creation.
Once registration is complete, the user account is active and the user can log in.
If the email format is invalid, registration is rejected.
If the username is already taken, registration is rejected.

### Account Deletion

Users can delete their own account at any time.
When a user deletes their account, all posts created by the user are deleted.
When a user deletes their account, all comments written by the user are deleted.
Account deletion is permanent and cannot be undone.
The user's profile information, including display name, bio, and avatar, is removed upon deletion.

### Password Change

Users can change their password at any time while logged in.
After changing the password, the user remains logged in.
If the current password provided for verification is incorrect, the password change is rejected.