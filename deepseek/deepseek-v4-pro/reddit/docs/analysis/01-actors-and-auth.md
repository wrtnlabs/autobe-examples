**communityHub — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

The guest actor represents any visitor to the platform who has not logged in or created an account. Guests have no identity within the system — they are anonymous and untracked beyond basic browsing. As the lowest-privilege actor, guests are limited to read-only access across publicly available content. Guests can browse the Popular Feed, which aggregates posts from all communities across the platform without requiring authentication. They can also view any Community Feed to see posts within a specific community. Guests can browse the full list of communities, search for communities by name, and see each community's subscriber count. When viewing individual posts, guests see the title, content, author, community, vote score, comment count, and posting time. Guests can read all comments on a post with their nested replies, sorted by any available sort option. However, guests cannot create an account — registration requires deliberate action to become a member. Guests cannot create posts, write comments, vote on posts or comments, subscribe to communities, or create communities of their own. They cannot report content to moderators, as reporting requires an authenticated identity. The guest actor's access boundary is strictly limited to viewing public content — any action that modifies data or requires attribution to an individual is forbidden. When a guest attempts a member-only action, the system prompts them to log in or sign up.

### Guest Identity and Core Access Boundary

A guest is any visitor who arrives at the platform without having logged in or created an account. Guests are anonymous — the system does not associate any persistent identity, username, or profile with their activity. There is no tracking of individual guest browsing beyond what is necessary to serve the requested content. The guest actor operates under a strict read-only access model. Every action available to a guest is limited to viewing publicly available content. No data modification, content creation, or attribution to an individual is permitted at this access level. The guest actor represents the lowest-privilege tier on the platform, and all other actors inherit the guest's viewing capabilities while adding authenticated capabilities on top.

### Content Feeds Accessible to Guests

Guests can access two types of post feeds without authentication. The Popular Feed aggregates posts from all communities across the entire platform and is available to guests at any time. This feed provides a broad view of platform-wide activity. The Community Feed displays posts from a single specific community and is also fully accessible to guests. Both feeds support the same sorting options available to authenticated users: hot, new, top (with time filters for today, this week, this month, this year, and all time), and controversial. Both feeds are paginated, and guests experience the same pagination behavior as authenticated users. The Home Feed, which shows posts only from communities a user is subscribed to, is not available to guests since guests have no subscriptions.

### Community Browsing and Search

Guests can browse the complete list of all communities on the platform. For each community, the guest sees the community name, description text, icon image, and subscriber count. Guests can also search for communities by name. The search returns communities whose names match the search term provided by the guest. The subscriber count shown to guests reflects the current number of users subscribed to that community.

### Post and Comment Viewing

When a guest views an individual post, they see the post's title, full content (depending on type: text content for text posts, the linked URL for link posts, or the uploaded image for image posts), the author's username, the community the post belongs to, the current vote score, the comment count, and when the post was created. Guests can also read all comments on any post, including nested replies at any depth. Comments display the author's username, the comment content, the vote score, the time since the comment was posted, and any nested replies beneath it. Guests can view comments sorted by any of the available sort options: best, new, or controversial.

### Actions Forbidden to Guests

Guests are prohibited from performing any action that creates, modifies, or deletes data on the platform. Specifically, guests cannot create a user account without going through the registration process. Guests cannot create posts in any community. Guests cannot write comments or reply to existing comments. Guests cannot vote (upvote or downvote) on any post or comment. Guests cannot subscribe to or unsubscribe from any community. Guests cannot create a new community. Guests cannot report posts or comments to moderators, as reporting requires an authenticated identity to attribute the report to. These restrictions apply uniformly to all guest sessions.

### Authentication Prompt for Restricted Actions

When a guest attempts any action that requires authentication — such as creating a post, writing a comment, voting, subscribing, creating a community, or reporting content — the system rejects the attempt and prompts the guest to log in or sign up. The prompt makes it clear that the requested action is only available to authenticated members and directs the guest to either log into an existing account or create a new one. The guest's current browsing context is not lost; after successful authentication, they may proceed with the action they originally intended.

## member Actor

The member actor represents any user who has created an account and logged into the platform. Every member has a unique identity tied to their username, which is visible to other users across the platform. Members inherit all read-only capabilities that guests have, including browsing feeds, viewing communities, searching, and reading posts with comments. Beyond guest-level access, members gain the ability to perform all authenticated actions on the platform. Members can create communities, and the member who creates a community automatically becomes its owner with full moderator authority. Members can subscribe to any community and unsubscribe at any time, with subscription being a prerequisite for creating posts within that community. Members can create posts of any supported type — text, link, or image — in communities they are subscribed to, and they can edit or delete their own posts afterward. Members can write comments on any post, reply to any comment with no depth limit, and edit or delete their own comments. Members can upvote or downvote any post or comment, change their vote, or remove it entirely, with each vote affecting the target's score and the author's karma. Members can report posts or comments by providing a reason, initiating the moderation review process. Each member has a personal profile with a display name, bio, and avatar that they can edit, and a karma score that reflects the net votes across all their contributions. Members can view any other member's profile, including their posts and comments. A member who creates a community or is appointed as a moderator gains moderation privileges within that specific community. The member actor's access boundary includes all content creation, interaction, and profile management actions — the only actions a member cannot perform are those reserved for moderators within communities where they lack moderation authority.

### Authenticated User Identity

A member is a user who has created an account and logged into the platform. Every member is identified by a unique username that is visible to other users across the platform. The username distinguishes each member from all others and serves as their public identity within the community.

The member actor inherits all read-only capabilities available to guests. This means a member can browse the Popular Feed, view any community's feed, search for communities, view community details including subscriber counts, read individual posts with their full content, view comment threads, and browse any member's profile — just as a guest would.

### Community Creation and Ownership

A member can create a new community on the platform. When creating a community, the member supplies a unique name, a description, and an icon image. The community name must not duplicate any existing community name on the platform.

The member who creates a community automatically becomes its owner. The owner holds the highest authority within that community and gains full moderation privileges, including the ability to add and remove moderators, delete any post or comment, ban and unban users, and manage reports. The owner cannot be removed from their position by any other moderator.

### Community Subscription

A member can subscribe to any community on the platform. Subscribing adds the community to the member's list of subscribed communities.

A member can unsubscribe from any community they have previously subscribed to. Unsubscribing removes the community from the member's subscription list.

Subscription is a prerequisite for creating posts within a community. A member who is not subscribed to a community cannot create posts there, though they can still view all content in that community.

### Post Creation and Management

A member can create a post in any community they are subscribed to. Every post must have a title. A post must be one of three types: a text post with written content, a link post with a URL, or an image post with an uploaded image.

A member can edit their own posts after creation. Editing allows the member to modify the post's title, content (for text posts), URL (for link posts), or image (for image posts).

A member can delete their own posts. When a post is deleted, all comments on that post are also removed. Deleting a post is permanent.

### Comment Creation and Management

A member can write a comment on any post on the platform, regardless of whether they are subscribed to the post's community.

A member can reply to any existing comment. Replies can themselves receive replies, forming threaded discussions with no depth limit.

A member can edit their own comments after posting. Editing allows the member to modify the comment's content.

A member can delete their own comments. When a comment with replies is deleted, the replies remain visible and are not removed.

### Voting on Content

A member can upvote any post or comment on the platform. Upvoting adds one to the item's vote score and increases the author's karma by one.

A member can downvote any post or comment on the platform. Downvoting subtracts one from the item's vote score and decreases the author's karma by one.

Each member may cast exactly one vote per post or comment. A member cannot vote multiple times on the same item.

A member can change their vote on an item from upvote to downvote, or from downvote to upvote. When a vote is changed, the vote score and the author's karma adjust accordingly — the previous vote's effect is reversed and the new vote's effect is applied.

A member can remove their vote entirely. When a vote is removed, the vote score and the author's karma are adjusted to reverse the vote's effect.

### Reporting Content

A member can report any post or comment on the platform. When reporting, the member must provide a reason in text form explaining why the content should be reviewed.

A report initiates the moderation review process for the community where the reported content resides. The member who submitted the report remains anonymous to other members, though moderators of the community can see who reported the content.

### Profile Management

Each member has a personal profile containing a display name, a bio, and an avatar image. The member can edit all three of these profile elements at any time.

A member can view any other member's profile. Viewing another member's profile shows their display name, bio, avatar, total karma score, a list of all posts they have created, and a list of all comments they have written.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### Registration

A guest can create an account by providing an email address, a password, and a unique username. All three fields are required.

If any required field is missing, the registration is rejected. The rejection indicates which field was missing.

If the chosen username is already in use by another account, the registration is rejected. The rejection indicates that the username is taken.

If the provided email is already associated with an existing account, the registration is rejected. The rejection indicates that the email is already registered.

If the email format is not valid, the registration is rejected.

On successful registration, a new user account is created. The user is automatically authenticated and gains the member role for the current session.

### Login

A guest can log in by providing an email address and a password. Both fields are required.

If either the email or the password is missing, the login is rejected. The rejection indicates which field was missing.

If the email does not match any registered account, the login is rejected. The rejection indicates that no account was found for that email.

If the password does not match the password associated with the provided email, the login is rejected. The rejection indicates that the password is incorrect.

On successful login, the user is authenticated and gains the member role for the current session.

### Authentication State

The platform recognizes two authentication states: guest and member.

A guest is any visitor who has not logged in. Guests can browse publicly available content but cannot perform actions that require authentication.

A member is a user who has successfully logged in. The member role grants the full set of permissions associated with an authenticated user account.

Authentication is established through a successful login and persists for the duration of the session. Authentication ends when the user logs out (see Session and Logout) or when the account is deleted (see Account Management).

## Session and Logout

Define session behavior and logout from a user perspective.

### Session

A session represents the period during which a user is recognized by the system as an authenticated member.

A session begins when a user successfully logs in with their email and password (the login process is defined in Registration and Login). Once a session is active, the user gains the full member role as defined in member Actor — including access to the Home Feed, creating posts, voting on posts and comments, writing comments, subscribing to communities, creating communities, and performing moderation actions where authorized.

The session remains active across multiple pages and return visits. The user does not need to log in again for each action or each time they return to the platform. The system recognizes the same session continuously until it is explicitly ended.

There is no automatic session expiration based on idle time or elapsed duration. The session persists as long as the user does not actively log out and the account is not deleted.

### Logout

A logged-in member may choose to log out at any time. Logging out ends the active session immediately.

After logging out, the user reverts to the guest role as defined in guest Actor. As a guest, the user retains access to publicly available content — specifically the Popular Feed, Community Feed, viewing individual posts, viewing comments, and viewing user profiles — but loses access to all member-only features such as the Home Feed, voting, posting, commenting, subscribing, creating communities, and moderation actions.

Logging out does not affect any content the user previously created. All posts, comments, votes, subscriptions, and community memberships made before logout remain intact and continue to be visible according to normal visibility rules.

The user may log in again at any time with the same email and password to begin a new session and regain member access.

### Account Security

Certain account management actions have implications for the user's active session. The mechanics of performing these actions are defined in Account Management; this section describes only their session-related effects.

**Password Change**: When a member changes their password, the current session remains active and uninterrupted. The new password takes effect immediately for all future login attempts, but the member is not forced to log out and log back in after changing their password.

**Account Deletion**: When a member deletes their account, the active session is terminated immediately. All content belonging to the user — including posts, comments, votes, subscriptions, community ownership, moderator roles, and reports — is permanently removed from the system. The user becomes a guest and can no longer log in with the deleted account credentials.

If account deletion is requested while the user is not currently logged in, the system does not process the deletion without first authenticating the user.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

A member account is the result of a successful registration (see Registration and Login).

When an account is created:

- The account is identified by a unique username chosen during registration.
- The account is associated with the email address and password provided during registration.
- The account's karma score is initialized to zero.
- The account has no display name, bio text, or avatar image set — these are part of the user profile and can be added later.

The account becomes immediately available for login. The new member inherits all guest read-access permissions and additionally gains the ability to create communities, subscribe to communities, create posts and comments, vote, and report content.

### Account Deletion

A member can delete their own account at any time.

When an account is deleted:

- All posts created by that user are permanently deleted.
- All comments written by that user are permanently deleted.
- The deletion cannot be undone.

Account deletion requires the member to be logged in. A member cannot delete another member's account.

### Password Change

A member can change their account password.

To change the password, the member must provide their current password and the new password. If the current password is incorrect, the change is rejected.

Password change requires the member to be logged in.