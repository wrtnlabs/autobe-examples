**redditCommunity — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

Guest users are visitors who access the platform without logging in. They can browse the popular feed to see trending posts from all communities across the platform. Guests can also view community feeds to read posts from specific communities. They can access and view user profiles to see another user's display name, bio, avatar, and public content. Guest users can see post details including title, content, author, community, and vote score. However, guests cannot create posts, comments, or replies. They cannot subscribe or unsubscribe from communities. Guests cannot vote on posts or comments. They also cannot report inappropriate content. All interactive features require the user to be logged in as a member.

### Guest Access Overview

Guest users are visitors who access the platform without logging in. They can browse the platform to view public content including posts and user profiles. Guest access is limited to read-only operations on content that is publicly visible to all users. All interactive features require the user to be logged in as a member. Guests cannot create, modify, or delete any content on the platform.

### Popular Feed Viewing

Guest users can access the popular feed to view trending posts from all communities across the platform. The popular feed displays posts from every community in the system, regardless of subscription status. Each post in the popular feed shows the title, author username, community name, vote score, comment count, and time since posted. Guests can sort the popular feed by different options including hot, new, top, and controversial. The top sort option includes time filters: today, this week, this month, this year, and all time. Popular feed viewing is available to all visitors without requiring authentication. The feed is paginated, and guests can navigate through multiple pages of results.

### Community Feed Viewing

Guest users can view community feeds to read posts from specific communities. To access a community feed, guests can browse the list of all communities or search for communities by name. Once a community is selected, guests see all posts created in that community. Each post in the community feed displays the same information as the popular feed: title, author username, community name, vote score, comment count, and time since posted. Community feed viewing is available to all visitors without requiring authentication. Guests can sort community feed posts by hot, new, top, and controversial options. The top sort option includes time filters for today, this week, this month, this year, and all time. The community feed is paginated to display posts in manageable chunks.

### User Profile Viewing

Guest users can view any user's profile on the platform. A user profile displays the display name, bio text, and avatar image of the user. The profile also shows the user's total karma score. The profile page lists all posts the user has created. The profile page also lists all comments the user has written. Guests can navigate from a post or comment to view the author's profile. Profile viewing is available to all visitors without requiring authentication. Guests cannot edit another user's profile. Only the profile owner can update their own display name, bio, and avatar.

### Post Detail Viewing

Guest users can view the full details of any post on the platform. When viewing a post, guests see the title, full content, author username, community name, vote score, comment count, and when the post was created. For text posts, the full text content is displayed. For link posts, the URL and domain name are shown. For image posts, the full image is displayed. The post detail page also shows all comments on the post, including nested replies. Each comment displays the author, content, vote score, and time since posted. Guests can see the sort options for comments: best, new, and controversial. Viewing post details is available to all visitors without requiring authentication. Guests cannot edit or delete posts they do not own.

### Restricted Actions for Guests

Guest users cannot create posts in any community. Creating posts requires the user to be logged in as a member. Guest users cannot create comments on any post. Creating comments requires the user to be logged in as a member. Guest users cannot create replies to any comment. Creating replies requires the user to be logged in as a member. Guest users cannot subscribe to any community. Subscribing to communities requires the user to be logged in as a member. Guest users cannot unsubscribe from any community. Unsubscribing requires the user to be logged in as a member. Guest users cannot vote on any post. Voting on posts requires the user to be logged in as a member. Guest users cannot vote on any comment. Voting on comments requires the user to be logged in as a member. Guest users cannot report any post or comment. Reporting content requires the user to be logged in as a member. All interactive operations on the platform require the user to have an active session and be authenticated as a member.

## member Actor

Member users are registered accounts who have successfully logged in with their email and password. Members can access the home feed showing posts only from communities they are subscribed to. Members can create posts in any community they have subscribed to, choosing from text, link, or image types. Members can write comments on posts and reply to comments with unlimited nesting depth. They can vote on both posts and comments, changing their vote or removing it at any time. Members can subscribe and unsubscribe from communities freely. They can edit their own posts and comments, and delete their own content. Members can create reports on inappropriate posts or comments with a reason. They can view their own profile and edit their display name, bio, and avatar. Members can browse communities they are subscribed to.

### Home Feed Access

Logged-in members can access the home feed, which displays posts from communities they have subscribed to. The home feed is only available after successful authentication with email and password.

### Post Creation in Subscribed Communities

Members can create posts in any community they have subscribed to. A post must include a title. Members can choose one of three post types: text, link, or image. The post type determines what content fields are required.

### Text Post Creation

Members can create text posts with a title and text content. The text content displays the full post body when viewing the post details.

### Link Post Creation

Members can create link posts with a title and a URL. The domain name of the URL displays in the post list view.

### Image Post Creation

Members can create image posts with a title and an uploaded image. A thumbnail of the image displays in the post list view.

### Comment Writing on Posts

Members can write comments on any post. Comments display the author, content, vote score, time posted, and nested replies.

### Comment Reply Nesting

Members can reply to any comment with unlimited nesting depth. Replies can have their own replies, creating a threaded conversation structure.

### Post Voting Actions

Members can upvote posts to add 1 to the vote score, downvote posts to subtract 1 from the vote score, change their vote from upvote to downvote or vice versa, or remove their vote entirely. Each member can vote once per post.

### Comment Voting Actions

Members can upvote comments to add 1 to the vote score, downvote comments to subtract 1 from the vote score, change their vote from upvote to downvote or vice versa, or remove their vote entirely. Each member can vote once per comment.

### Subscription Management

Members can subscribe to any community by adding it to their subscription list. Members can unsubscribe from any community they are subscribed to by removing it from their list.

### Viewing Subscriptions

Members can view a list of all communities they have subscribed to. This list displays the communities they can create posts in.

### Self Content Editing

Members can edit their own posts to update the title and content. Members can edit their own comments to update the content. Editing is limited to the post or comment creator only.

### Self Content Deletion

Members can delete their own posts, which removes them permanently from the platform. Members can delete their own comments, which removes them permanently from the platform. Deletion is limited to the post or comment creator only.

### Report Creation with Reason

Members can create reports on any post or comment by providing a reason as text. Reports are submitted to moderators of the community where the content appears.

### Member Reporting Capability

Members can report inappropriate posts or comments on the platform. The reporting capability is available to all logged-in members.

### Profile Editing

Members can edit their profile to update their display name, bio text, and avatar image. Profile editing is limited to the account owner.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

A new user can register for the platform by providing an email address, choosing a password, and selecting a unique username.

The email address must be a valid email format and will be used for login.

The username must be unique across all users in the system. If the chosen username is already taken, the registration is rejected.

The password must be provided and stored securely. The system does not enforce specific complexity requirements.

After successful registration, the user is automatically logged in and a session is created.

The user's initial karma score is zero.

If the email address is already registered, the registration request is rejected.

### User Login

A registered user can log in by providing their email address and password.

The system validates the email address and password combination.

If the credentials are correct, the user is authenticated and a new session is created.

After successful login, the user gains access to member-only features such as the home feed, post creation, and commenting.

Guest users cannot access the home feed or create content until they log in.

When a logged-in user attempts to log in again from the same or a different device, a new session is created while the previous session may remain active depending on platform policy.

After successful authentication, the user is redirected to their home feed or the page they were trying to access.

### Session Management

When a user logs in successfully, the system creates an active session that allows access to protected features.

The session remains active while the user continues to use the platform.

Users can view their profile while logged in and are identified by their username.

The system allows users to be logged in from multiple devices simultaneously, each with its own session.

When a session is active, the user can access the home feed, create posts in subscribed communities, write comments, vote on posts and comments, and subscribe to communities.

Guest users can only browse public content such as the popular feed, community feeds, and public user profiles.

### Registration Error Conditions

If the email address is already registered, the registration is rejected with an error message indicating the email is in use.

If the username is already taken, the registration is rejected with an error message indicating the username is unavailable.

If the email address is not in a valid format, the registration is rejected.

If the password is not provided, the registration request is rejected.

If any required field is missing, the registration request is rejected.

### Login Error Conditions

If the email address does not match any registered user, the login request is rejected.

If the password is incorrect, the login request is rejected.

If the provided email or password combination is invalid, the system does not specify which field is incorrect to prevent information leakage.

If the user account does not exist, the login is rejected with a generic authentication failure message.

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Behavior

When a user successfully logs in with their email and password, a session is created that allows access to member-only features.

The session enables access to the home feed, which shows posts only from communities the user is subscribed to.

The session enables creation of posts in communities the user is subscribed to.

The session enables writing comments on posts.

The session enables editing and deleting the user's own posts and comments.

The session enables viewing and managing the user's profile, including display name, bio text, and avatar image.

The session enables subscribing to and unsubscribing from communities.

The session enables viewing posts, communities, and other user profiles.

The session persists across browser sessions until explicitly logged out or expired.

### Logout Functionality

Users can log out from any page in the application.

Logging out ends the current session immediately.

After logging out, the user's session data is cleared from the active session.

After logging out, the user is redirected to a public-facing page where only guest features are available.

After logging out, the user cannot access member-only features such as the home feed, post creation, or comment writing.

After logging out, attempting to access member-only features requires logging in again.

Logging out does not delete the user's account or any of their content.

Logging out does not change the user's password or other account information.

### Session Security

Sessions are maintained securely to prevent unauthorized access.

The session is tied to the user's authentication credentials (email and password).

A user can only have one active session at a time.

If a user logs in from a new location while already logged in, the existing session remains active.

The session requires valid authentication for all member-only operations.

If the user changes their password, existing sessions may be invalidated requiring re-authentication.

The session cannot be used by anyone other than the authenticated user.

Sessions are protected to prevent session hijacking or unauthorized access.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Registration

A new user can create an account by providing an email address, a password, and choosing a unique username.

The email address must be a valid email format and is used as the primary identifier for the account.

The username must be unique across the platform and cannot be used by another account.

The password must meet platform security requirements.

After registration, the user account is created with an initial karma score of zero.

The newly created user can then log in with their email and password.

### Account Deletion

A user can delete their own account at any time.

When an account is deleted, all posts created by that user are permanently removed from the platform.

When an account is deleted, all comments written by that user are permanently removed from the platform.

All subscriptions made by the user are removed when the account is deleted.

All communities owned by the user are removed when the account is deleted.

After account deletion, the user can no longer log in with their credentials.

Deleted accounts cannot be recovered or restored.

### Password Change

A logged-in user can change their account password.

The user must provide their current password to verify identity before changing to a new password.

The new password must meet platform security requirements.

After a successful password change, the user can log in with the new password.

Existing active sessions for the account may be invalidated after a password change.