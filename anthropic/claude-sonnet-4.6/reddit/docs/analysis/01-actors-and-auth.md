**community — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is any visitor who accesses the platform without signing in. Guests have no account and carry no persistent identity on the platform. They are permitted to browse publicly available content, including the popular feed and individual community feeds, without any authentication. Guests can view posts and their contents, see comment threads, and look at community listings and community details. However, guests cannot take any action that requires identity — they cannot vote, post, comment, subscribe to communities, or interact with any content. Guests cannot access the home feed, which is reserved for logged-in members. If a guest attempts to perform a member-only action, the platform denies the request and prompts them to sign in or register. The guest role serves as the entry point for new users who have not yet created an account.

### Guest Identity and Nature

A guest is any visitor who accesses the platform without signing in. Guests have no account, no persistent identity, and no stored state on the platform. The guest role is the default state for all visitors and serves as the entry point for new users before they create an account. Once a user registers and logs in, they transition from a guest to a member for the duration of their session.

### Public Content Access

Guests are permitted to browse and view publicly available content on the platform without any authentication. Specifically, guests can:

- Browse the Popular Feed, which shows posts from all communities across the platform
- Browse any Community Feed, which shows posts belonging to a specific community
- View the full content of any individual post, including its title, body or media, author, vote score, comment count, and the community it belongs to
- Read all comment threads on any post, including nested replies
- View community listings, community details (name, description, subscriber count, and icon), and search for communities by name
- View any user's public profile, including their display name, bio, avatar, karma score, posts, and comments

All of the above access is strictly read-only. Guests cannot perform any action that creates, modifies, or removes content or data.

### Restricted Actions and Prompt to Sign In

Guests are not permitted to take any action that requires a verified identity. The following actions are exclusively available to authenticated members and are denied to guests:

- **Voting**: Guests cannot upvote or downvote any post or comment.
- **Posting**: Guests cannot create a post in any community.
- **Commenting**: Guests cannot write a comment or reply to any comment on any post.
- **Subscribing**: Guests cannot subscribe to or unsubscribe from any community.
- **Home Feed access**: Guests cannot access the Home Feed, which is reserved for logged-in users and shows content from subscribed communities only.

Whenever a guest attempts to perform any of the above restricted actions, the platform denies the request and presents a prompt encouraging the visitor to sign in with an existing account or register a new one.

## member Actor

A member is a user who has successfully registered and is currently signed in to the platform. Members are identified by a unique username chosen at registration and authenticated via their email and password. A signed-in member gains access to all features beyond read-only browsing that are available to guests. Members can subscribe to and unsubscribe from communities, and they may create posts in communities they are subscribed to. Members can write comments on any post and reply to any comment, with no depth restriction on reply threads. They can upvote or downvote posts and comments, and they can change or remove their votes at any time. Members can report posts or comments they find objectionable by providing a reason. Each member has a karma score that reflects the cumulative votes received on their posts and comments across the platform, and this score can become negative. A member may also hold an elevated role within a specific community — either as a moderator or as the community owner — granting additional authority within that community. The home feed, which surfaces posts from subscribed communities, is exclusively available to members. Members can manage their own account and profile, including changing their password and deleting their account.

### Member Identity and Authentication

A member is a registered user who has successfully signed in to the platform. Members are distinguished from guests by their authenticated state — the system recognizes them by a unique username chosen at the time of registration and verified through their email and password combination.

Each member's identity is tied to their unique username, which is assigned once during registration and cannot be changed afterward. The username serves as the member's public-facing identifier across the entire platform — it appears on posts, comments, and profile pages.

Once authenticated, a member gains access to all interactive features of the platform that are unavailable to unauthenticated guests. The system maintains the member's authenticated session to enable these features across the platform. Authentication details and session lifecycle are defined in the Registration and Login and Session and Logout sections.

### Home Feed Access

The home feed is exclusively available to authenticated members. It surfaces posts drawn only from communities the member is currently subscribed to, providing a personalized view of content relevant to their interests.

Guests have no access to the home feed. Members who are not subscribed to any community will see an empty home feed. The home feed supports the same sorting options — Hot, New, Top, and Controversial — available in other feeds.

### Community Subscription

Members can subscribe to any community on the platform and can unsubscribe at any time. A member may be subscribed to multiple communities simultaneously.

Members can view a list of all communities they are currently subscribed to. Subscription status is personal and visible only to the member themselves.

Subscription is a prerequisite for creating posts in a community. A member who is not subscribed to a community may browse and read its content but cannot publish posts there. Unsubscribing from a community does not delete the member's existing posts or comments in that community.

### Post and Comment Creation

Members can create posts in any community they are currently subscribed to. Each post must belong to exactly one community and have a title. Posts are attributed to the creating member as their author.

Members can write comments on any post across the platform, regardless of whether they are subscribed to the community where the post was published. Members can reply to any existing comment, and replies can themselves receive replies with no restriction on nesting depth. Each comment or reply is attributed to the writing member as its author.

Members can edit their own posts and their own comments after creation. Members can delete their own posts and their own comments at any time.

### Voting on Posts and Comments

Members can cast a single vote — either an upvote or a downvote — on any post or comment across the platform. Each member is limited to one active vote per post and one active vote per comment at any given time.

A member may change their vote at any time: switching from an upvote to a downvote, or from a downvote to an upvote. A member may also remove their vote entirely, reverting the content's vote score as if the member had never voted.

Members cannot vote on their own posts or comments. Voting rules apply uniformly to both posts and comments.

### Karma Score

Every member has a single karma score representing the net reception of their contributions across the entire platform. The karma score is an integer that starts at zero and changes based on votes received on the member's posts and comments.

When another member upvotes one of their posts or comments, the author's karma score increases by one. When another member downvotes one of their posts or comments, the author's karma score decreases by one. When a vote is removed or changed, the karma score adjusts accordingly to reflect the current state of votes.

Karma is cumulative across all posts and comments the member has ever created on the platform. Karma scores can become negative if a member's content receives more downvotes than upvotes. The karma score is publicly visible on the member's profile page.

### Reporting Content

Members can report any post or comment they find objectionable. When submitting a report, the member must provide a written reason explaining why the content is being reported. Reports without a reason are not accepted.

A member may report content in any community, regardless of their subscription status. Each report is associated with the reporting member, the reported content, and the community where the content resides. Reported content remains visible until a moderator takes action on the report.

### Elevated Community Roles

A member may hold an elevated role within one or more specific communities. The two elevated roles are owner and moderator. These roles are scoped to individual communities — a member may be an owner in one community and a regular subscriber in another.

The owner role is automatically granted to the member who creates a community. The owner has the highest level of authority within their community. Moderators are appointed by the owner or by existing moderators and have authority to manage content and users within the community.

Within a community, moderators can delete any post or comment, ban or unban users, view reports, and manage other moderators — subject to the constraints defined in the permission matrix. Moderators cannot remove the owner or remove each other; only the owner can remove moderators. Elevated roles do not grant any additional permissions outside the specific community in which the role is held.

The full moderator permission matrix and moderation actions are detailed in the functional requirements and business rules documents.

### Account and Profile Self-Management

Members can manage their own account and public profile at any time. Profile management includes updating their display name, bio text, and avatar image. These profile fields are optional and can be set, changed, or cleared by the member.

Members can change their password by providing a new password. Members can permanently delete their own account. When an account is deleted, all of the member's posts and comments are also permanently removed from the platform. Account deletion is irreversible.

Authentication mechanisms for password change and account deletion are governed by the Account Management section.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Registration

Any visitor may create a new account by providing an email address, a password, and a chosen username.

The email address must be unique across the platform — no two accounts may share the same email. The username must also be unique across the platform — no two accounts may share the same username. If either the email or the username is already taken, the registration is rejected and no account is created.

All three fields — email, password, and username — are required. If any of them is missing, the registration is rejected.

Upon successful registration, a new user account is created. A corresponding user profile is also automatically created for the new account, initially empty (no display name, no bio, no avatar). The new user's karma score starts at zero.

After registration, the user is considered authenticated and may access all member-level features immediately.

### Login

A registered user may log in by providing their email address and password.

The system checks whether the email corresponds to an existing account and whether the password matches the account's stored credentials. If either the email is not found or the password does not match, the login is rejected. No distinction is made in the error feedback between an unrecognized email and an incorrect password.

Both email and password are required to attempt login. If either field is missing, the login is rejected.

Upon successful login, the user is authenticated and gains access to all member-level features, including the home feed, post creation, voting, commenting, and account management.

### Authentication State

The platform distinguishes between two authentication states: unauthenticated (guest) and authenticated (member).

A guest is any visitor who has not logged in. Guests may browse the popular feed, view community feeds, read posts, and read comments, but cannot perform any write actions such as voting, posting, commenting, or subscribing.

A member is any user who has successfully logged in. Members have access to all guest-accessible content plus member-exclusive features: the home feed, subscribing to communities, creating posts, voting, commenting, and managing their own account and profile.

Authentication is required before the system grants access to any member-exclusive action. If an unauthenticated visitor attempts a member-exclusive action, the request is rejected.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session

Once a member successfully logs in with their email and password, the system establishes an authenticated session that allows them to access member-only features for the duration of that session.

A session grants the member access to:
- Their home feed, which shows posts from communities they are subscribed to
- The ability to create posts and comments
- Voting on posts and comments
- Subscribing and unsubscribing from communities
- Editing and deleting their own content
- Viewing and editing their own profile

A session is tied to the authenticated member's identity and cannot be shared or transferred. Only one session context is assumed per login action. The system identifies the acting user based on their active session for all protected operations.

### Logout

A logged-in member can log out of the platform at any time. Logging out ends the member's active session and revokes their access to member-only features.

After logging out:
- The member is treated as a guest and can only access public content
- The member cannot create posts, comment, vote, or access their home feed until they log in again
- Any attempt to perform a member-only action after logout is rejected

Logging out does not affect the member's account, stored data, subscriptions, posts, or comments. The account remains intact and accessible upon the next successful login.

### Account Security

Members are responsible for their own account credentials. The platform provides the following security-related capabilities to members:

- Members can change their password at any time while logged in. The process for password change is described in the Account Management section.
- Members can delete their own account, which permanently removes all their associated data. The account deletion process is described in the Account Management section.

If a member's account is deleted, any existing session associated with that account is no longer valid. Subsequent attempts to perform actions using a deleted account's session are rejected.

Banned users within a specific community retain their account and session but are restricted from creating posts or comments in the community where the ban applies. They can still view content in that community and interact freely elsewhere on the platform.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

To create an account, a user must provide a valid email address, a password, and a unique username. All three fields are required; if any are missing, the registration is rejected.

The email address must be unique across the platform. If another account already uses the same email address, the registration is rejected.

The username must be unique across the platform. If another account already uses the same username, the registration is rejected.

Once an account is successfully created, the user is assigned a karma score starting at zero. A user profile is automatically created alongside the account, initially empty (no display name, no bio, no avatar image).

The newly created account is immediately active, and the user can log in right away.

### Account Deletion

A member may permanently delete their own account. Account deletion is irreversible.

When an account is deleted, all content associated with that user is also permanently removed, including:
- All posts the user has created across all communities
- All comments the user has written across all posts
- The user's profile (display name, bio, and avatar image)
- All votes the user has cast on posts and comments
- All community subscriptions held by the user
- All reports the user has submitted

Deleting an account does not delete communities the user has created. Communities remain on the platform after their creator's account is deleted.

If the deleted user was the owner of any communities, those communities remain. Moderator records referencing the deleted user are also removed.

Ban records where the deleted user was the banned party are removed. Ban records where the deleted user was the issuing moderator remain on the community for record purposes, with the issuing moderator reference becoming unresolvable.

Vote scores on posts and comments are adjusted automatically when the deleted user's votes are removed, which in turn adjusts the karma scores of the affected content authors accordingly.

### Password Change

A logged-in member may change their password at any time.

To change their password, the user must provide their current password and a new password. If the current password provided does not match the one on record, the request is rejected and the password is not changed.

The new password must be different from the current password; if they are identical, the request is rejected.

Upon successful password change, the user's credentials are updated immediately. All existing sessions remain active; the password change does not force a logout of other sessions.

Only the account owner may change their own password. No other user, including community moderators or owners, can change another user's password.