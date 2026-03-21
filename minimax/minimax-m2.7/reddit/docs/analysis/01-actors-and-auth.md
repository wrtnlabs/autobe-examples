**redditClone — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

The guest actor represents any non-authenticated user accessing the platform. Guests can browse the Popular Feed containing posts from all communities across the platform without logging in. Guests can view posts in any community's feed and access individual post pages showing the title, content, author, community, vote score, comment count, and posting time. Guests can read comments on any post including nested replies and view any user's public profile displaying their display name, bio, avatar, karma score, posts, and comments. Guests cannot create communities, subscribe to communities, or perform any actions that require authentication. Guests cannot vote on posts or comments, cannot write comments, cannot edit or delete any content, and cannot report content. The guest role provides complete read-only access to all publicly visible platform content.

### Non-Authenticated User Access

The guest actor represents any non-authenticated user accessing the platform. Guests browse without creating an account or logging in. All guest access is read-only; guests cannot modify, create, or delete any content on the platform.

### Popular Feed Visibility

Guests can view the Popular Feed, which displays posts from all communities across the platform sorted by hot, new, top, or controversial criteria. The Popular Feed is the default landing page for unauthenticated users. Feeds display post titles, authors, community names, vote scores, comment counts, time since posted, and previews appropriate to each post type (text snippet, image thumbnail, or link domain).

### Community Feed Access

Guests can browse to any community's feed page and view all posts within that community. Community feeds display the same post list format as the Popular Feed. Guests can also view basic community information including the community name, description, icon, and subscriber count.

### Post Page Viewing

Guests can view any individual post page, seeing the complete title, full content (text, image, or link), author username, community name, vote score, comment count, and posting timestamp. Post pages also display all comments sorted by best, new, or controversial options.

### Comment Reading and Nested Replies

Guests can read any comment on a post, including replies nested to any depth. Each comment displays the author username, content, vote score, and time since posted. Guests can expand or collapse nested reply threads to navigate the comment hierarchy.

### Public Profile Viewing

Guests can view any user's public profile page. The profile displays the user's display name, bio text, avatar image, and total karma score. The profile also shows a list of all posts created by that user and a list of all comments written by that user.

### No Voting Capability

Guests cannot upvote or downvote any post or comment. Vote buttons are not displayed to unauthenticated users. The vote score shown to guests reflects the sum of all votes from authenticated users only.

### No Commenting Capability

Guests cannot write comments on any post or reply to any existing comment. Comment submission forms are not available to unauthenticated users. Guests cannot edit or delete any existing comments.

### No Content Creation

Guests cannot create communities, cannot subscribe to communities, and cannot create posts. All content creation features are restricted to authenticated members. The subscribe button and post creation forms are not accessible to guests.

## member Actor

The member actor represents a registered user who has completed sign-up with email, password, and a unique username. Members can log in to access their account and manage their profile including display name, bio text, and avatar image. Members can change their password or delete their account along with all associated posts and comments. Authenticated members can create new communities and automatically become the owner upon creation. Members can subscribe to any community to view its feed and unsubscribe at any time. Members can create posts in communities they are subscribed to, choosing between text, link, or image post types. Members can edit or delete their own posts and can vote on any post by upvoting, downvoting, changing their vote, or removing it entirely. Members can write comments on any post and reply to any existing comment with unlimited nesting depth. Members can edit or delete their own comments and vote on any comment using the same voting rules as posts. Members can view their own karma score and karma scores of other users on profile pages. Members can report any post or comment by providing a reason. Members can browse all communities, search communities by name, and view lists of communities they are subscribed to.

### Authenticated Session

A member is a registered user who has completed the sign-up process using an email address, a password, and a unique username. The member maintains an authenticated session after successful login. An authenticated session allows the member to access all features available to registered users. When the member logs out, the session ends and the user becomes a guest. The system tracks which user is currently authenticated through the active session.

### Profile Management

Each member has a personal profile containing a display name, bio text, and an avatar image. Members can view and edit their own profile information at any time. Members can change their display name, update their bio text, or replace their avatar image. Members can view the profiles of other users, which display the other user's display name, bio, avatar, total karma score, all posts created by that user, and all comments written by that user. The profile does not reveal the member's email address or password to other users.

### Community Creation

Any member can create a new community. When creating a community, the member must provide a unique community name and a description. The member may optionally provide an icon image for the community. Upon creation, the member automatically becomes the owner of that community. The creator retains owner status permanently and cannot be removed by other moderators.

### Subscription Management

Members can subscribe to any community to become a subscriber. Subscribing allows the member to create posts within that community. Members can unsubscribe from any community they are currently subscribed to at any time. Members can view a list of all communities they are currently subscribed to. Subscription status does not affect the member's ability to view community content.

### Post Creation

Members can create a new post in any community they are subscribed to. A post must have a title, which is required. A post must specify its type as one of the following: text post containing text content, link post containing a URL, or image post containing an uploaded image. Only one type of content is allowed per post. The post is automatically associated with the creating member as the author and with the target community.

### Content Editing

Members can edit their own posts to change the title, content, URL, or image. When editing a post, the title remains required and must not be empty. Members cannot edit posts created by other users. Edited posts retain their original creation timestamp for display purposes.

### Content Deletion

Members can delete their own posts at any time. Deleting a post also deletes all comments on that post. Members cannot delete posts created by other users. When a member deletes their account, all posts and comments authored by that member are deleted automatically.

### Post Voting

Members can vote on any post in the platform. A vote can be either an upvote, which adds one to the post score, or a downvote, which subtracts one from the post score. Each member can cast only one vote per post. If a member has already voted, they can change their vote to the opposite direction. A member can remove their existing vote entirely. When a vote is removed, the score adjusts accordingly. Vote score displayed for a post equals total upvotes minus total downvotes.

### Comment Creation

Members can write a comment on any post. The comment must contain text content. Members can reply to any existing comment, creating a nested reply. Replies can have further replies with no limit on nesting depth. Each comment is associated with the creating member as the author. Comments are displayed showing the author, content, vote score, and time since posted.

### Comment Voting

Members can vote on any comment using the same rules as post voting. A vote can be an upvote or downvote. Each member can cast only one vote per comment. Members can change their vote direction or remove it entirely. Vote score adjusts automatically when votes are changed or removed.

### Karma Tracking

Each member has a single karma score displayed as one number. When someone upvotes a member's post or comment, the member's karma increases by one. When someone downvotes a member's post or comment, the member's karma decreases by one. When a vote is removed, the karma adjusts in the opposite direction. Karma can be negative. Members can view their own karma on their profile. Any user can view another member's karma on that member's public profile.

### Content Reporting

Members can report any post or comment that violates community guidelines. When reporting, the member must provide a text reason explaining why the content is being reported. The report is submitted for review by community moderators. Members cannot report their own content.

### Community Browsing and Search

Members can browse a list of all communities on the platform. The list displays each community's name, description, and subscriber count. Members can search for communities by entering a community name. Search results display communities with names matching the entered text. Members can view any community's feed to see posts from that specific community.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

Users can register for an account by providing an email address, a password, and a unique username.

The email address serves as the user's unique identifier for login purposes.

The username is the public display name used to identify the user across the platform. Each username must be unique across the system.

The password is the credential used to authenticate the user during login. Passwords must meet minimum security requirements defined by the system.

Upon successful registration, the system creates a new user account and automatically generates a user profile for the user. The new profile includes a display name (initially set to the username), an empty bio, and a default avatar.

If the provided email address is already registered to an existing account, the registration request is rejected and the user is informed.

If the requested username is already taken by another user, the registration request is rejected and the user is informed.

If any required field (email, password, or username) is missing or empty, the registration request is rejected.

The newly registered user is automatically logged in and can immediately access all member features.

### User Login

Registered users can log in to the platform using their email address and password.

The user submits their email address and password through the login interface.

The system validates the submitted credentials against the stored account information.

If the email address does not match any existing account, the login request is rejected and the user is informed that the credentials are incorrect.

If the password does not match the stored password for that email address, the login request is rejected and the user is informed that the credentials are incorrect.

If the email and password match an existing account, the user is successfully authenticated and granted a logged-in session. The user can then access member-only features.

The system tracks the user's login state so that subsequent actions during the session are recognized as belonging to the authenticated user.

### Authentication Session

Once a user successfully logs in, the system establishes an authenticated session for that user.

The session allows the user to perform actions that require authentication, such as creating posts, writing comments, and voting.

The session persists until the user explicitly logs out or the session expires due to inactivity.

During an authenticated session, the system recognizes the user's identity for all operations, including karma updates when their content receives votes.

All content created during the session (posts, comments, votes) is attributed to the authenticated user.

When the user logs out, the session is terminated and the user returns to a guest state where they can only perform read-only operations.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session

A session represents an authenticated connection between the user and the system.

A session is established when a user successfully completes the login process with their email and password. The session is associated with the member account that was used to log in.

While a session is active, the user can access all features available to members. The system recognizes the user as a member and applies member permissions to all actions.

A session remains valid until the user explicitly logs out or the session is terminated through some other means. The system maintains the user's authenticated state so that they do not need to re-authenticate for each action.

The session contains or references the identity of the logged-in user, allowing the system to attribute actions (such as posts, comments, or votes) to the correct account.

When viewing the platform with an active session, the user sees the home feed showing posts from subscribed communities along with other member-specific features.

### Logout

A member with an active session can log out at any time.

When a user logs out, the session is terminated and the user is no longer authenticated. The user transitions from being a member back to being a guest.

After logging out, the user can still browse the platform as a guest. They can view the popular feed and community feeds, and view public profiles. However, they cannot create posts, comments, votes, or perform other member-only actions.

Logging out does not delete the user's account. The user's posts, comments, and other content remain on the platform and can still be viewed by other users.

When a user logs out, they are returned to a state where they can log in again using their email and password.

### Account Security

The system maintains the security of member accounts during authenticated sessions.

When a member changes their password, the change takes effect immediately. The session in which the password was changed remains valid after the password update.

Member actions performed during an authenticated session are attributed to the correct account based on the active session. The system ensures that a user cannot perform actions on behalf of another user.

When a user deletes their account, all active sessions associated with that account are terminated. The deleted user is logged out and cannot log in again with the deleted credentials.

The system prevents non-authenticated users from accessing member-only features. If an unauthenticated user attempts to perform an action that requires a session, the request is rejected.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Users can create a new account by providing an email address, a password, and a unique username.

The email address must be valid and not already registered to another account.

The username must be unique across the platform and may only contain letters, numbers, and underscores.

The password must meet minimum security requirements for complexity.

Upon successful account creation, the user is automatically logged into their new account.

The system must confirm the account creation with a success notification.

### Account Deletion

Users can delete their own account at any time.

When a user deletes their account, all of their posts across all communities are permanently removed.

When a user deletes their account, all of their comments across all posts are permanently removed.

When a user deletes their account, they are unsubscribed from all communities they were subscribed to.

When a user deletes their account, they are removed from all moderator positions.

When a user deletes their account, they are unbanned from any communities they were banned from.

The deletion action is irreversible. Once an account is deleted, the email address and username may become available for new accounts to use.

Before deletion is executed, the system must request explicit confirmation from the user to prevent accidental deletion.

After deletion, the user is immediately logged out and redirected to the public homepage.

### Password Change

Users can change their password from their account settings.

To change the password, the user must provide their current password as verification.

The user must provide a new password that meets the same minimum security requirements.

The user must confirm the new password by entering it twice.

The new password must be different from the current password.

Upon successful password change, the user remains logged into their account.

The system must confirm the password change with a success notification.

If the current password is incorrect, the request to change the password is rejected.