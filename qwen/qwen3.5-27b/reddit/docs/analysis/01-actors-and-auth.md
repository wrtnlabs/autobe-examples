**redditClone — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest is any person using the platform without logging in. Guests can browse the popular feed which shows posts from all communities across the platform. Guests can also view the community feed for any specific community. Guests cannot access the home feed since it requires being logged in. Guests cannot create posts or comments on the platform. Guests cannot vote on posts or comments. Guests cannot subscribe to communities. Guests can view any user's public profile including display name, bio, avatar, karma score, and their posts and comments. Guests have read-only access to all public content but cannot participate in any community activities.

### Guest Actor Identity

A guest is any person using the platform without being logged in. Guests have no registered account and no persistent identity on the platform. Guests are not authenticated and do not have a user session. Guests can access the platform without providing any credentials.

### Guest Content Access

Guests can browse the popular feed which displays posts from all communities across the platform. Guests can view the community feed for any specific community to see posts from that community only. Guests cannot access the home feed as it requires being logged in with an authenticated account. Guests have read-only access to all public content including posts, comments, and community information. Guests can view post details including title, content, author, community, vote score, comment count, and posting time. Guests can view comment details including author, content, vote score, posting time, and nested replies.

### Guest Participation Restrictions

Guests cannot create posts in any community. Guests cannot write comments on any post. Guests cannot reply to existing comments. Guests cannot upvote posts or comments. Guests cannot downvote posts or comments. Guests cannot change or remove votes. Guests cannot subscribe to communities. Guests cannot unsubscribe from communities. Guests cannot edit any posts or comments. Guests cannot delete any posts or comments.

### Guest Profile Viewing

Guests can view any user's public profile page. Guest profile viewing includes the user's display name, bio text, and avatar image. Guest profile viewing includes the user's total karma score. Guest profile viewing includes a list of all posts created by that user. Guest profile viewing includes a list of all comments written by that user. Guests cannot edit any user's profile information.

### Guest Access Boundaries

Guests are limited to viewing public content only. Guests cannot participate in any community activities that require authentication. Guests cannot create, modify, or delete any content on the platform. Guests cannot interact with content through voting or commenting. Guests cannot manage community subscriptions. Guests cannot access any features that require a logged-in state. When guests attempt to perform restricted actions, they must be prompted to log in or register.

## member Actor

A member is a registered user who has signed up with email, password, and a unique username. Members have full participation rights across the platform. Members can access the home feed showing posts from communities they subscribe to. Members can subscribe and unsubscribe from any community. Members can create posts in communities they are subscribed to. Members can write comments on any post and reply to comments with unlimited depth. Members can upvote and downvote posts and comments. Members can edit and delete their own posts and comments. Members can report posts and comments they find problematic. Members can view any other user's profile. Members can change their password and edit their profile information including display name, bio, and avatar. Members can delete their account which also removes all their posts and comments.

### Member Identity

A member is a registered user who has signed up with email, password, and a unique username.

Each member has a unique username that no other user can claim. The email address is used for authentication and login. Members maintain a password to enable secure access to their account.

### Registered User Permissions

Members have full participation rights across the platform, including all features available to guests plus additional member-only capabilities.

Members can subscribe to communities, create posts in subscribed communities, write comments on any post, vote on posts and comments, edit their own content, delete their own content, report problematic content, and manage their account settings.

### Home Feed Access

Members can access the home feed, which displays posts from communities they have subscribed to. This feed is exclusive to logged-in members and is not available to guests. The home feed updates dynamically as members subscribe to new communities, showing only content from subscribed communities.

### Community Subscription

Members can subscribe to any community on the platform and unsubscribe from any community they are currently subscribed to. The system maintains a list of all communities each member is subscribed to. Subscription is required before a member can create posts in a community, but subscription is not required for viewing community content.

### Post Creation Rights

Members can create posts only in communities they have subscribed to. Every post requires a title. Members can create text posts with text content, link posts with a URL, or image posts with an uploaded image. Each post is associated with the member who created it.

### Comment Creation Rights

Members can write comments on any post regardless of community subscription. Members can reply to any existing comment with unlimited nesting depth. Each comment is associated with the member who created it and displays with its nested replies.

### Voting Permissions

Members can upvote and downvote both posts and comments. Upvoting adds 1 to the vote score, while downvoting subtracts 1 from the vote score. Each member can vote only once per post and once per comment. Members can change their vote from upvote to downvote or vice versa, or remove their vote entirely.

### Content Editing Rights

Members can edit posts and comments they created. Post editing is restricted to the original author only. Comment editing is restricted to the original author only. The original posting time is preserved when content is edited.

### Content Deletion Rights

Members can delete posts and comments they created. Post deletion is restricted to the original author only. Comment deletion is restricted to the original author only. Deleted content is removed from all views.

### Reporting Capability

Members can report any post or comment they find problematic. When reporting content, members must provide a reason. Each report is associated with the member who submitted it and is displayed to moderators of the relevant community.

### Profile Viewing Access

Members can view any other member's profile page. The profile displays the owner's display name, bio, and avatar. The profile also shows the owner's total karma score, a list of all posts they created, and a list of all comments they wrote.

### Member Access Boundaries

Members have access boundaries that distinguish them from guests and moderators. Members can access the home feed, create content, and vote, which guests cannot do. Members cannot perform moderator actions such as deleting others' content, assigning or removing moderator roles, or banning other users.

## moderator Actor

A moderator is a member who has been granted special permissions within a specific community. The community creator automatically becomes the owner with highest authority in that community. Owners can add other users as moderators to their community. Moderators can add additional moderators but cannot remove the owner. Moderators cannot remove other moderators — only the owner can remove moderators. Moderators have all the permissions of a regular member. Moderators can delete any post within their assigned community. Moderators can delete any comment within their assigned community. Moderators can ban users from posting or commenting in their community. Moderators can unban previously banned users. Moderators can view the list of banned users in their community. Moderators can view all reports submitted for their community. Moderators can approve reports which deletes the reported content. Moderators can dismiss reports which keeps the content and removes the report from the list. Moderators have no special permissions outside their assigned community.

### Moderator Identity and Role

A moderator is a member who has been granted special permissions within a specific community. The user who creates a community automatically becomes the owner with the highest authority in that community. The owner role is distinct from the moderator role and cannot be removed. Moderators have all the permissions of a regular member in addition to their moderation capabilities. Moderators have no special permissions outside their assigned community. All moderator permissions are scoped to the specific community where they hold the role.

### Moderator Assignment and Hierarchy

The community owner can add other users as moderators to their community. Moderators can add additional moderators to their community. Moderators cannot remove the owner from the community. Moderators cannot remove other moderators from the community. Only the owner can remove moderators from the community. The owner has the highest authority in the community hierarchy. When a user is assigned as a moderator, they immediately gain all moderation permissions for that community. When a moderator is removed, they lose all moderation permissions for that community but retain their member status.

### Content Moderation Permissions

Moderators can delete any post within their assigned community, regardless of who created it. Moderators can delete any comment within their assigned community, regardless of who created it. When a moderator deletes a post, all comments on that post are also deleted. When a moderator deletes a comment, all replies to that comment are also deleted. Moderators cannot delete posts or comments outside their assigned community. Post and comment deletion by moderators is immediate and permanent.

### User Ban Management

Moderators can ban users from posting or commenting in their assigned community. Moderators can unban previously banned users in their assigned community. When a user is banned from a community, they cannot create posts in that community. When a user is banned from a community, they cannot create comments in that community. Banned users can still view content in the community that banned them. Moderators can view the list of banned users in their assigned community. Moderators cannot ban or unban users in communities where they do not hold moderator status. Banned users retain access to all other communities on the platform.

### Report Handling Permissions

Moderators can view all reports submitted for content in their assigned community. Each report shows the reported content, the user who submitted the report, and the reason for the report. Moderators can approve a report, which deletes the reported content. Moderators can dismiss a report, which keeps the content and removes the report from the list. Moderators cannot view or handle reports for communities where they do not hold moderator status. Dismissed reports are permanently removed from the report list and cannot be viewed again. Approved reports result in immediate deletion of the reported content.

### Community-Scoped Access Boundaries

All moderator permissions are limited to the specific community where the user holds moderator status. Moderators cannot perform moderation actions in communities where they are not assigned as moderators. A user can be a moderator in multiple communities simultaneously. Each community maintains its own independent list of moderators. Moderator status in one community does not grant any permissions in other communities. The community owner has exclusive authority to remove moderators from their community. Moderators cannot transfer ownership of a community to another user.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

Users can register for an account by providing an email address, a password, and a unique username. The system validates that the email address is in a valid format and rejects registration if the email is already associated with an existing account. The system also rejects registration if the chosen username is already in use by another user. A password must meet minimum security requirements to complete registration. Upon successful registration, the system creates a new user account and automatically assigns the member role to the user.

### User Login

Users can log in by providing their email address and password. The system authenticates users by verifying these credentials against stored account information. When credentials are correct, the system authenticates the user as a member. The system only accepts email address for login, not username. If the email address does not exist in the system, the login attempt is rejected. If the password is incorrect for the provided email address, the login attempt is rejected. If the user account has been deleted, the login attempt is rejected.

### Authentication States

The system recognizes two authentication states: authenticated (logged in) and unauthenticated (guest). Authenticated users are granted member permissions, while unauthenticated users are granted guest permissions. When a user is authenticated, they have access to member-only features including the home feed, post creation, and community subscription. When a user is unauthenticated, they have access only to public content including the popular feed and community feeds. The system maintains the authenticated state for the duration of the user's session and reverts users to guest status when their session ends.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Management

After a user successfully logs in with their email and password, the system establishes an authenticated session.

The authenticated session persists across page navigations, allowing users to access features requiring authentication without re-entering credentials.

The system maintains the user's authenticated state until the user explicitly logs out.

Guests (unauthenticated users) cannot access features that require authentication, such as creating posts, writing comments, or viewing the home feed.

### Logout

Users can log out at any time to end their authenticated session.

After logging out, users become guests and cannot access features that require authentication, such as creating posts, writing comments, or viewing the home feed.

Logging out does not delete the user account, posts, comments, or any other user data.

After logging out, users must log in again with their email and password to regain access to authenticated features.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

THE system SHALL allow users to create an account by providing an email address, a password, and a unique username.

THE system SHALL validate that the chosen username is not already in use by another user.

THE system SHALL reject account creation if the email address is already registered.

THE system SHALL reject account creation if the username is not unique.

THE system SHALL associate the newly created account with all content the user creates (posts, comments, votes, subscriptions, reports).

WHEN a user successfully creates an account, THE system SHALL automatically log them in.

IF the user provides an invalid email format, THEN THE system SHALL reject the registration request.

### Account Deletion

THE system SHALL allow users to delete their own account.

WHEN a user deletes their account, THE system SHALL delete all posts created by that user.

WHEN a user deletes their account, THE system SHALL delete all comments written by that user.

THE system SHALL prevent account deletion if the user is not authenticated.

### Password Change

THE system SHALL allow authenticated users to change their password.

THE system SHALL require users to provide their current password before setting a new password.

THE system SHALL reject password change requests if the current password is incorrect.

WHEN a user successfully changes their password, THE system SHALL continue the current session without requiring re-authentication.

THE system SHALL prevent password changes for deleted accounts.

IF a user attempts to change their password while not logged in, THEN THE system SHALL reject the request.