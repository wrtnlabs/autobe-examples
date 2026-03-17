**redditLike — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is any person visiting the platform without logging in. Guests can view the popular feed showing posts from all communities across the platform. Guests can view any community feed to see posts from a specific community. Guests cannot create posts, write comments, or cast votes on any content. Guests cannot subscribe to communities or access the personalized home feed. Guests can view user profiles including display names, bios, avatars, karma scores, posts, and comments. To participate in the platform, a guest must create an account and become a member.

### Guest Identity and Definition

A guest is any person who visits the platform without authenticating. Guests are unauthenticated visitors who have not provided login credentials and have no active session. Guests represent the public-facing, read-only access level of the platform. Anyone browsing the platform without logging in assumes the guest role automatically.

### Content Viewing Permissions

Guests can view content that has been made publicly available across the platform. Specifically, guests have the following viewing permissions:

**Feed Access**
- Guests can view the Popular Feed, which displays posts from all communities across the platform sorted by the selected sorting option.
- Guests can view any Community Feed to see posts from a specific community.

**Content Details**
- Guests can view individual posts including the title, content, author username, community name, vote score, comment count, and posting time.
- Guests can read all comments on any post, including nested reply threads.
- Guests can view the complete vote score and comment count on posts and comments.

**Community Information**
- Guests can browse the list of all communities.
- Guests can search for communities by name.
- Guests can view community details including the community name, description, icon, and subscriber count.

**User Profiles**
- Guests can view any user's public profile page.
- Profile information visible to guests includes: display name, bio text, avatar image, total karma score, list of posts created by the user, and list of comments written by the user.

### Participation Restrictions

Guests have read-only access and cannot perform any actions that modify platform state or create new content. The following actions are explicitly prohibited for guests:

**Content Creation**
- Guests cannot create posts in any community.
- Guests cannot write comments on posts.
- Guests cannot reply to existing comments.

**Voting**
- Guests cannot upvote posts or comments.
- Guests cannot downvote posts or comments.
- Guests cannot remove or change votes on any content.

**Community Engagement**
- Guests cannot subscribe to communities.
- Guests cannot unsubscribe from communities.
- Guests cannot create new communities.

**Account Actions**
- Guests cannot report posts or comments.
- Guests cannot edit any content.

### Home Feed Access Restriction

The Home Feed is not available to guests. The Home Feed displays posts exclusively from communities the user is subscribed to, and since guests cannot subscribe to communities, they have no subscriptions to populate this feed. Only authenticated members can access the Home Feed.

### Authentication Requirements for Participation

To participate in the platform beyond viewing public content, a guest must create an account and become an authenticated member. Authentication is required for all actions involving content creation, modification, or personalization. A guest can transition to member status by completing the registration process with a unique username, valid email address, and password. After registration, the user must log in to gain full member privileges.

## member Actor

A member is a registered user who has signed up with an email address, password, and unique username. Members can log in to access personalized features and maintain a persistent identity across sessions. Members can create posts in communities they have subscribed to, write comments on any post, and reply to other comments. Members can upvote and downvote posts and comments, with the ability to change or remove their votes. Members can subscribe to and unsubscribe from communities, and view a list of their subscribed communities. Members can edit and delete their own posts and comments. Members can view their own profile and other users' profiles. Members can report posts and comments with a reason. Members accumulate karma based on votes received on their content.

### Member Identity

A member is a registered user who has created an account by providing an email address, password, and unique username.

Members must authenticate with their email address and password to access member-specific features. Once authenticated, members maintain a persistent session that allows them to perform actions as an identified user.

Each member has a unique username that identifies them across the platform. This username is displayed on all content they create and cannot be changed after registration.

### Content Creation

Members can create posts within communities they have subscribed to. A member must be subscribed to a community before they can create a post in that community.

When creating a post, members must provide a title. Posts can be one of three types: text posts containing written content, link posts containing an external URL, or image posts containing an uploaded image.

Members can create comments on any post, regardless of whether they are subscribed to the community where the post exists. Members can reply to any existing comment, creating nested reply threads with no depth limitation.

### Voting

Members can upvote posts and comments created by other users. An upvote increases the vote score by one.

Members can downvote posts and comments created by other users. A downvote decreases the vote score by one.

Each member may cast only one vote per post or per comment. If a member has already voted on content, they can change their vote from upvote to downvote or vice versa. Members can also remove their vote entirely, which removes its effect on the vote score.

Members cannot vote on their own posts or comments.

### Community Engagement

Members can subscribe to any community. Once subscribed, the member will see posts from that community in their home feed.

Members can unsubscribe from any community they are currently subscribed to. After unsubscribing, posts from that community no longer appear in the member's home feed.

Members can view a list of all communities they are currently subscribed to.

### Content Management

Members can edit posts they have created. When editing, members can modify the title and content of their posts.

Members can delete posts they have created. Deleted posts are removed from all feeds and are no longer visible to other users.

Members can edit comments they have written. When editing, members can modify the text content of their comments.

Members can delete comments they have written. Deleted comments are removed from the comment thread and are no longer visible to other users.

### Profile Access and Reporting

Members can view their own profile page, which displays their display name, bio, avatar, total karma score, list of posts they have created, and list of comments they have written.

Members can view the profile pages of other users, which display the same information for those users.

Members can report any post or comment to the moderators of the community where the content exists. When submitting a report, members must provide a reason describing why the content is being reported.

### Karma Accumulation

Every member has a single karma score that represents their reputation on the platform. The karma score is a single number that can be positive, zero, or negative.

When another user upvotes a member's post or comment, that member's karma score increases by one. When another user downvotes a member's post or comment, that member's karma score decreases by one.

When a user removes their upvote from a member's content, that member's karma score decreases by one. When a user removes their downvote from a member's content, that member's karma score increases by one.

If a user changes their vote from upvote to downvote on a member's content, the member's karma score decreases by two. If a user changes their vote from downvote to upvote on a member's content, the member's karma score increases by two.

When a member deletes their own post or comment, the karma changes resulting from votes on that content remain in effect.

## moderator Actor

A moderator is a member who has been granted elevated permissions within a specific community by the owner or another moderator. Moderators can delete any post or comment within their assigned community regardless of who created it. Moderators can ban users from their community, preventing those users from creating posts or comments there. Moderators can unban previously banned users and view the complete list of banned users. Moderators can add other moderators to help manage the community. Moderators cannot remove the owner from the community. Moderators cannot remove other moderators from the community. Moderators can view all reports submitted for content in their community and decide to approve or dismiss them.

### Moderator Role Assignment

A moderator is a member who has been granted elevated permissions within a specific community. The owner of a community can assign moderator status to any member. Existing moderators can also add other members as moderators. A moderator's authority is limited to the community where they were appointed; permissions do not extend to other communities.

### Content Moderation Authority

Moderators have the authority to delete any post within their assigned community, regardless of who created it. Moderators can also delete any comment within their community, regardless of the author.

Moderators can view all reports submitted for posts and comments in their community. Each report shows the reported content, who submitted the report, and the reason provided. Moderators can approve a report, which results in the deletion of the reported content. Moderators can dismiss a report, which removes it from the report list while keeping the content intact.

### User Ban Management

Moderators can ban users from their community. When a user is banned, they cannot create new posts or comments in that community, but they can still view the community's content. Moderators can unban previously banned users, restoring their ability to post and comment. Moderators can view the complete list of all users currently banned from their community.

### Moderator Team Management

Moderators can add other members as moderators to help manage the community. However, moderators cannot remove the owner from the community under any circumstances. Moderators also cannot remove other moderators from the community; only the owner has the authority to remove moderators.

## owner Actor

An owner is the member who originally created a community and holds the highest authority over it. The owner automatically receives all moderator permissions within their community. The owner can add moderators to help manage the community. The owner can remove any moderator from the community. The owner cannot be removed by moderators. The owner has full control over community settings including description and icon. The owner's authority is permanent unless they choose to transfer ownership or delete their account. The owner can perform all moderator actions including deleting posts, banning users, and managing reports.

### Owner Identity and Community Creation

An owner is a member who creates a community. The creating member automatically becomes the owner of that community upon creation. The owner holds the highest authority level within their community. Ownership is tied to the specific community where the member is the creator. A member can be the owner of multiple communities if they create more than one. The owner identity is displayed alongside community information to indicate who holds supreme governance authority.

### Owner Permissions and Authority

The owner automatically receives all moderator permissions within their community without requiring separate role assignment. The owner can perform all actions available to moderators, including deleting any post or comment within the community, banning users from the community, unbanning previously banned users, viewing the list of banned users, and managing content reports. The owner has full control over community settings including the community description and icon image. The owner can view all reports submitted for content within their community and approve or dismiss those reports.

### Moderator Management Rights

The owner can add moderators to help manage the community. When the owner adds a moderator, that moderator receives elevated permissions within the community. The owner can remove any moderator from the community regardless of who originally added that moderator. Moderators cannot remove the owner from the community. The owner is the only actor who can remove moderators that other moderators have added. The owner maintains supreme governance authority over all moderator appointments and removals.

### Ownership Duration and Transfer

The owner's authority is permanent and persists for the lifetime of the community unless the owner chooses to transfer ownership to another member. The owner can transfer ownership of the community to another member, at which point the receiving member becomes the new owner and assumes all owner permissions while the transferring member loses owner status. If the owner deletes their account, the ownership status and all associated owner permissions are removed. Account deletion by the owner affects community ownership status.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Guest Actor

A guest is an unauthenticated visitor to the platform.

Guests can browse the popular feed which shows posts from all communities across the platform.

Guests can view any community feed to see posts from a specific community.

Guests can view individual posts and their comments.

Guests can view any user's profile page including their display name, bio, avatar, karma score, posts, and comments.

Guests cannot vote on posts or comments.

Guests cannot create posts or write comments.

Guests cannot subscribe to communities.

Guests must register and authenticate to become members.

### Member Actor

A member is an authenticated user who has completed registration and login.

Members can create posts in communities they are subscribed to.

Members can write comments on any post and reply to any comment.

Members can upvote and downvote posts and comments.

Members can subscribe to and unsubscribe from communities.

Members can create new communities and become the owner of those communities.

Members can edit and delete their own posts and comments.

Members can report any post or comment.

Members can edit their own profile including display name, bio, and avatar.

Members can change their password.

Members can delete their account, which also deletes all their posts and comments.

### Registration

Users can register for an account by providing an email address, a password, and a username.

The email address must be unique across all registered users.

The username must be unique across all registered users.

The password is required for account creation.

If the provided email address is already in use, the registration request is rejected.

If the provided username is already in use, the registration request is rejected.

Upon successful registration, the user becomes a member and can authenticate to access member-only features.

### Login

Users can authenticate by providing their registered email address and password.

The system verifies the credentials against the registered account information.

If the email address does not match any registered account, the authentication request is rejected.

If the password does not match the registered password for the provided email, the authentication request is rejected.

Upon successful authentication, the user is recognized as a member and gains access to member-only features including creating posts, writing comments, voting, and subscribing to communities.

### Authentication State

The system maintains knowledge of whether a user is authenticated or not.

When a user is not authenticated, they are treated as a guest with limited access rights.

When a user is successfully authenticated, they are treated as a member with full access to member features.

The home feed, which shows posts only from subscribed communities, requires authentication and is available exclusively to members.

All voting actions require authentication.

All content creation actions including posting, commenting, and replying require authentication.

Community subscription requires authentication.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Establishment

When a user successfully logs in, a session is established that associates the user with their authenticated state.

The session maintains the user's authenticated identity across subsequent interactions with the platform.

Users remain authenticated until they explicitly log out or the session is otherwise terminated.

### Logout

Authenticated users can log out to terminate their session.

Upon logout, the user's authenticated state is removed and they revert to guest status.

After logout, the user must log in again to access member-only features.

### Account Security

Users can change their password to maintain account security.

To change a password, the user must be authenticated.

Password changes take effect immediately and apply to subsequent login attempts.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

A guest can create a new account to become a member. To create an account, the guest must provide an email address, a password, and a username.

The email address must not already be associated with an existing account. If the email address is already in use, the account creation request is rejected.

The username must be unique across all accounts and must not already be taken by another user. If the username is already in use, the account creation request is rejected.

The password is required for authentication and must be provided during account creation.

Upon successful account creation:
- A new member account is established with the provided credentials
- The member is authenticated and can immediately access member-only features
- A user profile is created with empty display name, empty bio, and no avatar
- The member's karma score is initialized to zero
- The new member is automatically granted the member actor role (defined in [member Actor])

### Password Change

A member can change their account password at any time while authenticated. To change the password, the member must provide their current password and a new password.

The current password must match the password on record for the account. If the current password does not match, the password change request is rejected.

The new password replaces the existing password for all future authentication attempts. After a successful password change, the member remains authenticated and can continue using the platform.

### Account Deletion

A member can permanently delete their account. Account deletion removes all account-related data from the platform.

When an account is deleted:
- The member's user profile is removed
- All posts created by the member are deleted
- All comments written by the member are deleted
- All votes cast by the member are removed
- All subscriptions belonging to the member are canceled
- All moderator roles held by the member are relinquished
- All ban records where the member is the banned user are removed
- All reports submitted by the member are removed

Account deletion is irreversible. Once deleted, the account cannot be restored, and the username and email address become available for new account creation.

If the member is the owner of any communities, those communities remain on the platform but become ownerless until a new owner is assigned.