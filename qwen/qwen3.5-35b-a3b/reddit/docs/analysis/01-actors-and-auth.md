**redditPlatform — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is a user who has not authenticated with the platform using email and password credentials. Guests have anonymous access to public content across all communities without requiring login. They can browse the list of all communities and search for communities by name. Guests can view the popular feed which displays posts from all communities platform-wide. They can access any community feed and read posts and comments within those communities. However, guests cannot vote on posts or comments in any community. They cannot create posts, write comments, or reply to existing comments. Guests cannot subscribe to communities or view any private member data. When attempting to perform any interactive action, guests must authenticate first.

### Guest Identity Definition

A guest is an anonymous visitor who has not authenticated with the platform using email and password credentials. The platform recognizes users as either guests or members based on their authentication status. A guest session begins when a user accesses the platform without providing valid login credentials.

### Public Content Access

Guests have read-only access to all public content across the platform. This includes the ability to browse the complete list of communities and search for communities by name. Guests can view the popular feed, which displays posts from all communities platform-wide. Guests can also access any community feed and read the content within those communities. This public access is available to anyone visiting the platform, regardless of whether they have an account.

### Reading Posts and Comments

When viewing any feed or community, guests can read posts and comments displayed to them. For each post in a feed, guests can see the title, author username, community name, vote score, comment count, time since posted, and the appropriate content preview (text snippet for text posts, thumbnail for image posts, domain name for link posts). Guests can view the full content of individual posts, including the complete text, image, or link destination. Guests can also read all comments on a post, including nested replies, with each comment showing the author, content, vote score, and time since posted.

### Restriction: No Voting

Guests cannot vote on posts or comments in any community. The upvote and downvote functions are unavailable to guests. This restriction applies to all posts and comments across all communities. When a guest attempts to vote, the system requires authentication first.

### Restriction: No Content Creation

Guests cannot create posts, write comments, or reply to existing comments. Content creation is restricted to authenticated members only. Guests attempting to create content must authenticate before the action can proceed.

### Restriction: No Subscription

Guests cannot subscribe to communities or view their subscribed communities. Subscription status is only visible and modifiable by authenticated members. Subscribing to a community is required before creating posts within that community.

### Restriction: No Profile Access

Guests cannot view any user profiles on the platform. Profile pages, which display display name, bio, avatar, karma score, posts, and comments, are only accessible to authenticated members. Guest access to profile information is entirely blocked.

### Authentication Required for Interactive Actions

All interactive actions require the user to be authenticated as a member. When a guest attempts to perform any interactive action—including voting, posting, commenting, subscribing, or viewing profiles—the system redirects to the authentication flow. After successful authentication, the user retains access to their previously viewed public content without interruption.

## member Actor

A member is an authenticated user who has registered with email and password and selected a unique username. Members have access to their profile containing display name, bio, avatar, and karma score. They can edit their own profile information and view other users' public profiles. Members can subscribe and unsubscribe from communities and view their subscribed community list. They have voting rights on posts and comments across all communities including upvote, downvote, and vote removal. Members can create posts in communities they subscribe to, including text, link, and image posts. They can write comments and unlimited reply threads on posts. Members can edit and delete their own posts and comments. Members can report posts and comments by providing reasons. Community owners and moderators have elevated permissions within their respective communities.

### Member Identity and Authentication

A member is an authenticated user who has successfully registered with an email address and password, and has selected a unique username.

**Email and Password Registration**

During registration, a user must provide a valid email address and choose a password. The email address must not already be registered in the system.

If the email address is already in use, the registration request is rejected.

**Username Selection**

The username is a unique identifier that must be chosen during registration. The username must not already be taken by another account.

If the requested username is already in use, the registration request is rejected.

Once a username is selected, it cannot be changed by the user.

**Login Access**

Members log in by providing their email address and password.

If the credentials are incorrect or the account does not exist, the login request is rejected.

### Profile Management

Each member has a profile containing a display name, bio text, and avatar image.

**Profile Viewing**

Members can view their own profile at any time.

Members can also view any other user's public profile.

A user's profile page displays:
- Display name
- Bio text
- Avatar image
- Karma score
- A list of all posts the user has created
- A list of all comments the user has written

**Profile Editing**

Members can edit their own display name, bio text, and avatar image.

If the member attempts to set a display name that is blank, the update request is rejected.

### Karma Score

Every member has a single karma score displayed on their profile.

The karma score increases by 1 for each upvote received on the member's posts or comments.

The karma score decreases by 1 for each downvote received on the member's posts or comments.

When a user removes their vote on a post or comment, the karma score adjusts accordingly by reversing the previous vote's effect.

Karma score can be negative.

The karma score is calculated and updated in real time as votes are cast or removed.

### Community Subscription and Home Feed

**Subscription Access**

Members can subscribe to any community in the system.

Members can unsubscribe from any community they are subscribed to.

Members can view a list of all communities they are subscribed to.

Subscribing to a community is required before the member can create posts in that community.

**Home Feed Access**

The home feed is available only to authenticated members.

The home feed shows posts only from communities the member is subscribed to.

Guests cannot access the home feed.

### Content Creation

**Post Creation**

Members can create a post in any community they are subscribed to.

Every post requires a title.

A post must be one of three types:
- Text post: contains text content
- Link post: contains a URL
- Image post: contains an uploaded image

If the member attempts to create a post in a community they are not subscribed to, the request is rejected.

If the title is missing, the post creation request is rejected.

**Comment Writing**

Members can write a comment on any post.

Members can reply to any comment.

Replies can have their own replies, with no depth limit.

Members can write comments even if they are not subscribed to the community where the post exists.

### Content Management

**Own Post Editing**

Members can edit their own posts after creation.

If a member attempts to edit a post they did not create, the request is rejected.

**Own Comment Editing**

Members can edit their own comments after creation.

If a member attempts to edit a comment they did not write, the request is rejected.

**Own Content Deletion**

Members can delete their own posts.

Members can delete their own comments.

When a user deletes their account, all posts and comments written by that user are also deleted.

### Voting System

**Post Voting**

Members can upvote a post, which adds 1 to the vote score.

Members can downvote a post, which subtracts 1 from the vote score.

Each member can only have one vote per post at any time.

Members can change their vote from upvote to downvote or vice versa.

Members can remove their vote entirely.

Vote score equals the total number of upvotes minus the total number of downvotes.

**Comment Voting**

Members can upvote or downvote any comment.

One vote per member per comment is allowed.

Members can change their vote or remove their vote.

The same voting rules apply to comments as to posts.

Members can vote on content from any community, including communities they are not subscribed to.

### Reporting System

Members can report any post or comment in the system.

When submitting a report, the member must provide a reason as text.

The reason field is required; a report without a reason is rejected.

Once submitted, reports are visible to moderators of the community where the content exists.

Each report shows:
- The reported content
- The member who submitted the report
- The reason for the report

Members cannot withdraw or edit a report after submission.

### Community Leadership Roles

**Community Ownership**

Any member can create a new community.

When a member creates a community, they automatically become its owner.

The community owner has the highest authority within that community.

The owner can add other members as moderators.

The owner can remove moderators from their community.

**Moderator Role**

Moderators are members appointed by the community owner or by other moderators.

Moderators can add other moderators to the community.

Moderators cannot remove the community owner.

Moderators cannot remove other moderators.

Only the owner can remove a moderator.

**Moderator Actions**

Moderators can delete any post in their community.

Moderators can delete any comment in their community.

Moderators can ban users from their community.

Moderators can unban users from their community.

Moderators can view the list of banned users in their community.

Banned users cannot create posts or comments in that community, but they can still view content.

### Moderator Banning System

When a moderator bans a user from a community, they must provide a reason for the ban.

Bans may have an expiration date, or they may be permanent.

Banned users are prevented from creating posts or comments in the banned community.

Banned users can still view content in the community.

Banned users retain access to all other communities where they are not banned.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

New users can create an account by providing an email address, choosing a password, and selecting a unique username.

The email address must not be already in use by another account.
If the email is already registered, the registration request is rejected.

The username must be unique across the platform.
If the desired username is already taken, the registration request is rejected.

The password must be provided but there is no minimum length requirement defined.

After successful registration, the user is automatically logged in and can access all member features.

### User Login

Registered users can log in by providing their email address and password.

The system validates the credentials against the registered account.
If the email address is not found, the login request is rejected.
If the password is incorrect, the login request is rejected.

After successful login, the user session is created and the user gains access to all member features including creating posts, comments, and managing their profile.

### Authentication States

Guests are users who are not logged in and have limited access.
Guests can view public content including the list of all communities, search for communities by name, and view posts in the popular feed and community feeds.

Members are users who are currently logged in and have full access.
Members can perform all guest actions plus create posts, write comments, vote on posts and comments, subscribe to communities, edit their profile, and access their personal feeds.

Each user can only have one active session at a time.
When a user logs in from a new location, any previous active session is terminated.

### Guest vs Member Permissions

Guests can view:
- The list of all communities
- Search for communities by name
- Posts in the popular feed (all communities)
- Posts in any community feed
- User profiles
- Post details and comments

Members can perform all guest actions plus:
- Create new posts in subscribed communities
- Write comments on posts
- Reply to comments
- Vote on posts and comments
- Subscribe and unsubscribe from communities
- Create new communities
- View and edit their own profile
- View their home feed (posts from subscribed communities)
- Manage community moderation (if they are moderators)

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

When a member logs in with their email and password, they obtain an active session.

The active session allows the member to access authenticated features of the platform.

While the member has an active session, they can view their profile and account settings.

When a member's session ends, they must log in again with their email and password to access authenticated features.

The system maintains the member's session state so they can continue using authenticated features without re-authentication.

### Logout

Members can log out from their session at any time.

When a member logs out, their session is terminated and they must log in again to access authenticated features.

After logging out, the member no longer has access to features that require authentication.

Members can log in again using their email and password after logging out.

The platform allows members to log out and log in multiple times as needed.

### Account Security - Password Management

Members can change their password when they have an active session.

To change their password, the member must provide their current password and enter a new password.

The system validates the new password meets security requirements before allowing the change.

After successfully changing their password, the member can log in using their new password.

If the member provides an incorrect current password, the password change is rejected.

The member must remember their new password to log in in the future.

### Account Security - Account Deletion

Members can delete their account when they have an active session.

Before deleting their account, the member must confirm their password to verify their identity.

When a member deletes their account, all of their posts are permanently deleted.

When a member deletes their account, all of their comments are permanently deleted.

The member's profile information is removed from the platform.

The member's karma score is removed from the system.

After account deletion, the member's email address and username become available for new registrations.

Account deletion is permanent and cannot be undone.

Once an account is deleted, the member must register again with a new account to use the platform.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Users can create an account by providing an email address, a password, and choosing a unique username. The username must be unique across all users in the system. The email address must be valid and not already associated with an existing account. When creating an account, the user is automatically logged in and can immediately access all member features.

### Account Deletion

Users can delete their own account at any time. When an account is deleted, all posts created by the user and all comments written by the user are also permanently deleted. The deletion is irreversible. After account deletion, the user's profile is removed from the system and cannot be viewed by other users.

### Password Change

Authenticated users can change their password. To change a password, the user must provide their current password and the new password. The new password must meet the system's password requirements. After successfully changing the password, the user remains logged in with the new password.