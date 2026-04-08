**redditCommunity — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest user is anyone who has not logged into the platform. Guests can browse all communities displayed in a list and search for communities by name. They can view the popular feed showing posts from all communities across the platform, as well as community feeds for any specific community. Guests can view user profiles, including their display name, bio, avatar, karma score, and lists of their posts and comments. When viewing any feed, guests can see post titles, authors, communities, vote scores, comment counts, and time since posting. For text posts, guests can read the first 200 characters of content; for image posts, they see thumbnails; for link posts, they see the domain name. However, guests cannot create posts or comments, cannot subscribe to communities, cannot vote on content, and cannot access the home feed which shows posts only from subscribed communities.

### Guest Identity and Access

A guest user is anyone who has not logged into the platform. Guest users may browse all communities displayed in a list and search for communities by name. They can view the popular feed showing posts from all communities across the platform, as well as community feeds for any specific community. Guest users can view any user's public profile, including the user's display name, bio, avatar image, and karma score.

### Viewing Posts and Comments

When viewing any feed, guest users can see post titles, authors, communities, vote scores, comment counts, and time since posting. For text posts, guests can read the first 200 characters of content. For image posts, guests can view thumbnails of the images. For link posts, guests can see the domain name of the URL (such as youtube.com). Guest users can view comments on posts, including comment author, content, vote score, and time since posting. Comments are displayed with nested replies, with no depth limit shown.

### Guest Restrictions

Guest users cannot create posts or comments on the platform. Guest users cannot subscribe to communities. Guest users cannot vote on posts or comments. Guest users cannot access the home feed, which shows posts only from communities the user is subscribed to. Guest users cannot view lists of communities they are subscribed to. Guest users cannot edit or delete any posts or comments. Guest users cannot report posts or comments. When guest users attempt to create a post, comment, subscribe to a community, or vote on content, the system requires them to log in first.

## member Actor

A member is a registered user who has signed up with an email, password, and chosen username, and is currently logged in. Members can access all guest capabilities plus the home feed showing posts only from communities they are subscribed to. Members can subscribe to any community, which allows them to create posts within that community. Once subscribed, members can create posts of three types: text posts with content, link posts with URLs, or image posts with uploaded images. Members can write comments on any post and reply to existing comments with unlimited depth. Members can vote on posts and comments by upvoting or downvoting, and can change or remove their votes. Members can edit their own posts and comments and delete their own content. Members can view and edit their own profile including display name, bio, and avatar.

### Registered User Account

A member is a registered user who has signed up with an email, password, and chosen username. The account requires a unique username that cannot be duplicated. Users authenticate by providing their email and password.

A registered user account must include a valid email address and password. The username must be unique across all users in the system. Registration is required to become a member and access member-only features.

### Home Feed Access

Members can access a home feed that displays posts only from communities they are subscribed to. The home feed is exclusively available to logged-in members and is not accessible to guests.

When viewing the home feed, members see posts from all communities they have subscribed to. The feed shows each post's title, author username, community name, vote score, comment count, and time since posted.

### Browse Subscribed Communities

Members can view a list of all communities they are subscribed to. This list shows each community's name and subscriber count.

Members can browse their subscribed communities at any time to see which communities they follow. The list includes all communities the member has actively subscribed to.

### Subscribe to Community

Members can subscribe to any community in the platform. A community's subscriber count increases when a user subscribes. Subscribing is required before a member can create posts within that community.

Members can also unsubscribe from communities they are subscribed to. When unsubscribed, the member's subscriber status is removed and the community's subscriber count decreases accordingly.

### Create Posts

Members can create posts in any community they are subscribed to. Every post requires a title. Posts must be one of three types:

**Text Post**: Contains text content that can be viewed in full when the post is opened.

**Link Post**: Contains a URL that users can access when viewing the post.

**Image Post**: Contains an uploaded image that users can view when viewing the post.

Members cannot create posts in communities to which they are not subscribed. The request is rejected if the member is not subscribed to the target community.

When creating a post, the title is required and must not be empty. The post is automatically associated with the creating member and the target community.

### Comments and Replies

Members can write comments on any post in the platform. Each comment shows the author, content, vote score, and time since posted.

Members can reply to any existing comment, creating a nested reply. Replies can have further replies, with no depth limit on the nesting. Each reply shows the same information as a regular comment: author, content, vote score, and time since posted.

When viewing comments on a post, members see the comment hierarchy with replies nested under their parent comments.

### Vote on Content

Members can upvote posts and comments by clicking the upvote button. Each upvote increases the content's vote score by 1.

Members can downvote posts and comments by clicking the downvote button. Each downvote decreases the content's vote score by 1.

Each member can only have one vote per post and one vote per comment at any time. Members can change their vote from upvote to downvote, or from downvote to upvote. When changing a vote, the score adjusts accordingly.

Members can remove their vote entirely, which removes the vote's effect on the score. After removing a vote, the member can cast a new vote.

Vote score equals total upvotes minus total downvotes for the content.

### Manage Own Posts

Members can edit their own posts at any time. When editing, members can update the post's title and content. The post remains associated with the original author and community.

Members can delete their own posts. When a post is deleted, it is removed from all feeds and lists. The author and community information are no longer visible.

Members can only edit or delete posts they have created. The request is rejected if the member attempts to edit or delete a post they did not create.

### Manage Own Comments

Members can edit their own comments at any time. When editing, members can update the comment content. The comment remains associated with the original author.

Members can delete their own comments. When a comment is deleted, it is removed from the comment thread and nested reply structure.

Members can only edit or delete comments they have created. The request is rejected if the member attempts to edit or delete a comment they did not create.

### Manage Own Profile

Members can view their own profile, which displays their display name, bio, avatar, and total karma score. The profile also shows a list of all posts the member has created and a list of all comments the member has written.

Members can edit their own profile to update their display name, bio text, and avatar image. Changes are applied immediately and visible to all users.

Members cannot edit other users' profiles. The request to edit another user's profile is rejected.

## admin Actor

The admin actor consists of community owners and moderators who have elevated permissions within specific communities. When any user creates a community, they automatically become the owner with the highest authority in that community. The owner can add other users as moderators and can remove moderators from their community. Moderators can add other moderators to the community but cannot remove moderators or remove the owner. Moderators can delete any post within their community and delete any comment within their community. Moderators can ban users from their community, preventing them from creating posts or comments while still allowing them to view content. Moderators can unban users who have been previously banned. Moderators can view the list of all banned users in their community. Moderators can view all reports submitted for their community content, including the reported content, who reported it, and the reason provided. Moderators can approve reports to delete content or dismiss reports to keep the content.

### Community Creator Ownership

When any user creates a community, they automatically become the owner of that community. The community creator relationship is established at the time of community creation and cannot be transferred to another user. The owner is the highest authority within their community and retains this status indefinitely.

### Owner Highest Authority

The owner has the highest level of authority in their community and cannot be removed from this position by any other user. Only the owner can add moderators to the community and remove moderators from the community. No other user, including other moderators, has the ability to remove or demote the owner.

### Adding Community Moderators

The community owner can add other users as moderators to their community. When a user is added as a moderator, they receive elevated permissions within that specific community. The moderator assignment includes a timestamp of when the role was assigned. Moderators can be added by the owner or by existing moderators.

### Removing Community Moderators

Only the community owner can remove moderators from the community. Other moderators cannot remove each other or remove the owner. When a moderator is removed, their elevated permissions in that community are immediately revoked. The owner can remove any moderator at any time without restriction.

### Moderator Authority Limitations

Moderators can add other users as moderators to the community. However, moderators cannot remove other moderators and cannot remove the owner. This restriction ensures that the owner maintains ultimate control over the community. Moderators also cannot escalate their own authority beyond the moderator role.

### Deleting Posts in Community

Moderators can delete any post within their community, regardless of who created the post. This includes posts created by other moderators or by the owner. When a post is deleted by a moderator, it is removed from all views within the community. The reason for deletion is not required to be provided.

### Deleting Comments in Community

Moderators can delete any comment within their community, regardless of who created the comment. This includes comments created by other moderators, the owner, or regular users. When a comment is deleted by a moderator, it is removed from all comment threads within the community.

### Banning Users from Community

Moderators can ban users from their community. When a user is banned, they cannot create new posts or comments in that community. Banned users can still view existing content in the community, including posts and comments. The ban record includes the reason for the ban and the date it was applied.

### Unbanning Users

Moderators can unban users who have been previously banned from the community. When a user is unbanned, they regain the ability to create posts and comments in that community. The unban action does not provide any special privileges to the previously banned user.

### Viewing Banned Users List

Moderators can view a list of all users who have been banned from their community. This list shows the banned users and information about their ban status. Moderators can use this information to determine if unbanning is appropriate for a particular user.

### Viewing Community Reports

Moderators can view all reports submitted for their community content. Each report displays the reported content, the user who submitted the report, and the reason provided for the report. Moderators can review all pending reports and take action on them. Reports are specific to each community and are not visible to moderators of other communities.

### Approving Reports Deletes Content

When a moderator approves a report, the reported content is deleted. This action removes the content permanently from the community. The moderator who approved the report is the one who performed the deletion action, but the report approval itself is separate from the deletion action.

### Dismissing Reports Keeps Content

When a moderator dismisses a report, the reported content remains in the community. The dismissed report is removed from the report list and is no longer visible to moderators. Dismissing a report indicates that the moderator has reviewed the report and determined that no action is needed.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

Users can create an account by providing an email address, a password, and a unique username.

The email address must be in a valid email format and will be used to identify the user during login.

The username must be unique across all users in the system. Each username must be chosen by the user at registration and cannot be changed after account creation.

The password must be provided during registration and will be used for authentication. Users can change their password later through account management.

Guest users cannot perform registration. Only unauthenticated users can initiate the registration process.

When registration is successful, the system automatically creates a new user profile associated with the account.

If the email address is already registered, the registration is rejected and the user is informed that an account with that email already exists.

If the username is already taken, the registration is rejected and the user is prompted to choose a different username.

### User Login

Registered users can log in by providing their email address and password.

The system validates the provided credentials against stored user data.

Upon successful authentication, the user gains access to member-level features including home feed, creating posts, commenting, and managing their profile.

Guest users can only access public content such as browsing communities, viewing popular feeds, and viewing community feeds.

Guest users must log in to access member-only features.

If the provided email address does not correspond to an existing account, the login attempt is rejected.

If the provided password is incorrect for the given email, the login attempt is rejected.

The system does not distinguish between incorrect email and incorrect password to prevent user enumeration.

### Authentication State

When a user successfully logs in, the system maintains an authenticated session that allows the user to access member-only features.

During an active session, the user can:
- View and interact with their home feed (posts from subscribed communities)
- Subscribe to and unsubscribe from communities
- Create posts in communities they have subscribed to
- Write comments and replies on posts
- Vote on posts and comments
- Edit and delete their own posts and comments
- View and edit their profile information
- View their profile page showing karma score, posts, and comments
- Add and remove moderators for communities they own or moderate
- Ban and unban users from communities they moderate
- Submit reports on posts or comments
- View reports for communities they moderate

The authenticated state persists until the user explicitly logs out or the session expires.

### Registration Validation

The email address must be in a valid email format (containing @ symbol and a domain).

The username must be unique across all users in the system. No two users can share the same username.

All three registration fields (email, password, username) are required. Registration cannot proceed if any field is missing.

The password field must be provided but no specific complexity requirements are enforced beyond being present.

The system validates that the username adheres to the uniqueness constraint before creating the account.

The system validates that the email has not been previously registered before creating the account.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

When a member logs in with their email and password, the system creates a session that maintains the user's authenticated state.

The session remains active while the member is using the application. During an active session, the member can access all features available to logged-in users, including viewing their home feed, creating posts and comments, and interacting with other users.

The session automatically ends when the member logs out or when the session expires due to inactivity. When a session ends, the member must log in again to access protected features.

### Logout

Members can log out of their session at any time.

When a member logs out, the system terminates their active session immediately. After logging out, the member is treated as a guest and can only access features available to unauthenticated users.

Logging out clears any session data from the current device. The member can log in again at any time by providing their email and password.

### Password Change

Members can change their password to maintain account security.

To change their password, a member must first provide their current password for verification. After successful verification, the member enters their new password.

The system updates the member's password upon successful verification. Once the password is changed, the member's existing sessions are terminated, and the member must log in again using the new password to continue using the application.

### Account Deletion

Members can permanently delete their account.

When a member deletes their account, the system permanently removes all data associated with the member, including their profile, all posts, all comments, and all votes.

Account deletion is immediate and irreversible. Once an account is deleted, the member cannot recover any of their data or restore the account.

The member's username and email become available for registration by other members after the account is deleted.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Registration

A user can create an account by providing an email address, password, and choosing a unique username.

The username must be unique across all accounts. If a username is already taken, the registration is rejected.

The email address must be valid. If the email format is invalid, the registration is rejected.

The password must meet the minimum complexity requirements. If the password does not meet requirements, the registration is rejected.

Upon successful registration, the user receives a new account with a profile that uses the chosen username as the display name.

Guest users can browse communities and view content, but cannot create posts, comments, or vote without registering.

Registered users can log in with their email and password to access their account features.

### Account Deletion

A user can delete their account from their account settings.

When an account is deleted, all associated data is removed, including:
- The user's profile
- All posts created by the user
- All comments written by the user
- All votes made by the user
- All community subscriptions
- All moderator roles
- All ban records
- All reports submitted by the user

Once an account is deleted, it cannot be recovered. The deleted username becomes available for registration by another user.

If the user is the owner of any community, those communities remain but become ownerless. The community can continue to exist but requires a new owner to be assigned.

Before deletion, the user must confirm their intention to delete the account.

### Password Change

A logged-in user can change their password from their account settings.

To change the password, the user must provide their current password and the new password.

The new password must meet the minimum complexity requirements. If the new password does not meet requirements, the password change is rejected.

If the provided current password is incorrect, the password change is rejected.

After a successful password change, the user's existing sessions are invalidated. The user must log in again with the new password on all devices.

A user who has forgotten their password can request a password reset using their email address. The reset process sends a password reset link to the registered email address.