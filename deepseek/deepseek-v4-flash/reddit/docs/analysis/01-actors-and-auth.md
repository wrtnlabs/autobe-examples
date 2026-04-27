**communityPlatform — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their identity, permissions, and access boundaries.

## guest Actor

A guest actor represents any unauthenticated user visiting the platform. Guests can browse public content such as the list of all communities, individual community pages, and the Popular Feed which shows posts from across the platform. They can view any user's profile to see display name, bio, avatar, karma score, and lists of that user's posts and comments. Guests can open individual posts to read full content, see the vote score, comment count, author, community, and time since posting — and they can read all comments on any post. They can also search for communities by name to discover new ones. However, guests cannot create accounts on their own (registration is handled separately), subscribe to communities, create posts or comments, vote on content, or access the personalized Home Feed. Guests have read-only access to public data and cannot perform any write operations or interact with content. All guest permissions are implicit based on being unauthenticated — there is no registration or login for this actor type. The system enforces these boundaries by requiring authentication for any interactive or write operation.

### Guest Actor Definition

A **guest actor** is any unauthenticated user visiting the community platform. Guests have no identity — the system has no record of them and they have not provided credentials. All permissions granted to guests are **implicit permissions** derived from their unauthenticated status. The system does not require guests to register, log in, or accept any terms before accessing public content. A guest becomes a member actor only after successful registration and login (see [Registration and Login]).

### Authentication Boundary

The platform divides all functionality into two zones separated by an **authentication boundary**:

**Public Zone (accessible to guests):**
- Browsing the list of all communities
- Viewing a single community page and its posts
- Accessing the Popular Feed and Community Feed
- Viewing any user's profile
- Reading individual posts and their full content
- Reading all comments on any post
- Searching for communities by name

**Authenticated Zone (requires login as a member):**
- Creating posts or comments
- Voting on posts or comments
- Subscribing to communities
- Accessing the personalized Home Feed
- Editing or deleting own content
- Any write operation

When a guest attempts to access authenticated-zone functionality, the system redirects them to the login page or returns an authentication-required response.

### Public Content Browsing — Communities

Guests can browse all communities on the platform. This includes:
- Viewing the full list of communities, each showing the community name, description, icon image, and subscriber count
- Searching for communities by name using the search feature
- Opening a specific community to view its **Community Feed**, which shows all posts in that community

Guests can read community descriptions and icons but cannot subscribe to communities, create posts within them, or access any moderation features.

### Public Content Browsing — Feeds

Guests have access to two of the three available post feeds:

**Popular Feed** — Posts from all communities across the platform, sorted by the available options (Hot, New, Top, Controversial). This feed is fully accessible to guests with pagination support.

**Community Feed** — Posts from one specific community, also accessible to guests with all sorting options and pagination.

**Home Feed** — Posts from only the communities the user is subscribed to. This feed is **not accessible** to guests. The Home Feed requires an authenticated member actor with active subscriptions.

### Public Content Browsing — Posts and Comments

**Single Post Reading:** Guests can open any individual post and view its full content. The post display includes the title, full body (text, link URL, or image), author username, community name, vote score, comment count, and time since posting.

**Comment Reading:** Guests can read all comments on any post, including nested replies at any depth. Comments are displayed with author, content, vote score, time since posting, and thread structure. Guests can sort comments by Best, New, or Controversial.

Guests cannot create, edit, delete, vote on, or report any post or comment.

### Public Content Browsing — User Profiles

Guests can view any member's profile page. The profile shows:
- Display name, bio text, and avatar image
- Total karma score
- A list of all posts the member has created
- A list of all comments the member has written

Guests have read-only access to profiles and cannot interact with the profile or its owner.

### Restricted Operations for Guests

The following operations are explicitly **not allowed** for guest actors and require member authentication:

| Restricted Operation | Reason for Restriction |
|---------------------|----------------------|
| **No subscription** | Subscribing creates a persistent relationship between a user and a community, which requires an identity |
| **No post creation** | All posts must be attributed to a known author |
| **No commenting** | All comments must be attributed to a known author |
| **No voting** | Votes must be attributed to a unique user (one vote per user per item) |
| **No reporting** | Reports require a known reporter for accountability |
| **No Home Feed** | The Home Feed is personalized based on the user's subscriptions, which requires an identity |
| **No content editing or deletion** | Account ownership is required to modify or remove content |

Attempting any of these operations as a guest results in an authentication-required response.

## member Actor

A member actor represents any authenticated user who has successfully registered and logged into the platform. Members have all the read capabilities of guests — browsing communities, viewing profiles, reading posts and comments, and searching — plus full write and interactive permissions. Members can create posts in any community they are subscribed to, with support for text, link, and image post types. They can edit and delete their own posts at any time. Members can write comments on any post, reply to any comment with no depth limit, and edit or delete their own comments. They can upvote or downvote both posts and comments, change their vote, or remove it entirely — with only one vote allowed per piece of content per user. Members can subscribe to any community and unsubscribe from them, and they gain access to the personalized Home Feed showing posts only from their subscribed communities. Members can create new communities and automatically become the community owner with moderator privileges. Member actors can also report any post or comment with a required reason. Some members may hold additional moderator roles within specific communities — moderators can delete content in their community, ban or unban users, and manage reports. The system identifies members by their authenticated session and enforces all permission checks against their identity, subscription status, and any moderator roles they hold.

### Member Actor Definition

A **member** actor is any authenticated user who has successfully registered and logged into the platform. Members are the primary interactive users of the system. Each member is uniquely identified by their authenticated session, which is established through the registration and login flows (defined in [Registration and Login](./01-actors-and-auth.md#registration-and-login) and [Session and Logout](./01-actors-and-auth.md#session-and-logout)).

Members have read access to all public content — including communities, profiles, posts, and comments — equivalent to guest actors (defined in [guest Actor](./01-actors-and-auth.md#guest-actor)). In addition, members have write and interactive permissions that guests do not.

Membership is terminated when a user deletes their account (defined in [Account Management](./01-actors-and-auth.md#account-management)).

### Identity-Based Access Control

All member actions are governed by identity-based access control. For every operation a member performs, the system verifies:

- **User identity**: The member is who their session claims they are.
- **Ownership**: For operations on content (posts, comments), the member must be the original author to edit or delete, unless they hold a moderator role in the relevant community.
- **Subscription status**: Certain actions (creating posts in a community) require the member to be subscribed to that community.
- **Ban status**: Members who are banned from a community cannot create posts or comments in that community.
- **Moderator authority**: Members acting as moderators have elevated permissions within their moderated communities.

The system enforces these checks on every request. If a member is not authorized for an action, the request is rejected.

### Content Operations — Posts

Members have full content operations over posts:

- **Create posts**: A member can create a post in any community they are subscribed to. Posts must have a title (required) and be one of three types: text post (with text content), link post (with a URL), or image post (with an uploaded image).
- **Edit posts**: A member can edit their own posts at any time. Editing is limited to the original author only.
- **Delete posts**: A member can delete their own posts at any time. Deleting a post removes it from all feeds and community views. Post deletion also removes all associated comments and votes.
- **Moderator override**: Moderators of a community can delete any post in their community, even if they are not the original author. This is the only case where a non-author can delete a post.

A member who is banned from a community cannot create posts in that community.

### Content Operations — Comments

Members have full content operations over comments:

- **Create comments**: A member can write a comment on any post, regardless of which community it belongs to. A member can also reply to any existing comment. Replies can have nested replies with no depth limit.
- **Edit comments**: A member can edit their own comments at any time. Editing is limited to the original author only.
- **Delete comments**: A member can delete their own comments at any time. Deleting a comment removes it and all its nested replies from view.
- **Moderator override**: Moderators of a community can delete any comment in their community, even if they are not the original author.

A member who is banned from a community cannot create comments in that community.

### Voting Operations

Members can vote on both posts and comments:

- **Upvote**: Adds 1 to the target content's vote score and increases the author's karma by 1.
- **Downvote**: Subtracts 1 from the target content's vote score and decreases the author's karma by 1.
- **One vote per content**: Each member can cast only one vote per piece of content (post or comment). Voting again replaces the previous vote.
- **Change vote**: A member can change their vote from upvote to downvote or from downvote to upvote. The score and karma adjust accordingly.
- **Remove vote**: A member can remove their vote entirely. The score and karma adjust to reflect the removal.
- **Vote visibility**: A member can see their own vote on any content (which direction they voted, if any). Other users cannot see who voted on what.

Members can vote on any post or comment they can view, regardless of subscription or community membership status.

### Subscription and Community Operations

Members manage their community relationships through subscriptions and can create new communities:

- **Subscribe**: A member can subscribe to any community. Subscribing is required to create posts in that community.
- **Unsubscribe**: A member can unsubscribe from any community they are currently subscribed to.
- **View subscriptions**: A member can view a list of all communities they are subscribed to.
- **Home Feed access**: Subscribed members gain access to the personalized Home Feed, which shows posts only from communities they are subscribed to. This feed is available exclusively to logged-in members.
- **Create community**: Any member can create a new community by providing a unique name, a description, and an icon image. The member who creates the community automatically becomes its owner.
- **Community ownership**: The community owner has the highest authority in the community. Ownership includes all moderator permissions plus the exclusive ability to remove moderators (including other moderators) from the community.

### Moderator Role and Permissions

Members may hold a moderator role within specific communities. Moderator permissions are community-scoped — a moderator of one community does not have moderator authority in any other community.

- **Appointment**: The community owner can add any member as a moderator. Moderators can also add other members as moderators.
- **Removal**: Only the community owner can remove moderators. Moderators cannot remove the owner, and they cannot remove other moderators.
- **Moderator actions**: Within their moderated community, a moderator can:
  - Delete any post
  - Delete any comment
  - Ban a user from the community
  - Unban a user
  - View the list of banned users
  - View all reports submitted for content in the community
  - Approve a report (deletes the reported content)
  - Dismiss a report (removes the report from the list without action)
- **Ban effects**: A banned user cannot create posts or comments in the community but can still view public content.

Moderator status is separate from regular membership — a moderator retains all standard member permissions in addition to their moderator authority.

### Reporting Content

Members can report any post or comment they find inappropriate:

- A member can submit a report on any post or comment, regardless of the community it belongs to.
- When reporting, the member must provide a reason (free-text description of why the content is being reported).
- Each report is associated with the reporting member's identity, the content being reported, and the reason provided.
- Reports are visible only to moderators of the community where the content was posted.

# Authentication Flows

Registration, login, logout, and session management from a user perspective.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

A guest can become a member by registering an account. To register, the guest provides:
- An email address (must not already be in use)
- A password
- A unique username (must not already be taken)

When the guest submits these details, the system validates that:
- The email address is not already associated with an existing account
- The username is not already taken by another user

If both checks pass, the account is created. The password is stored securely. After successful registration, the new member is automatically signed in.

If the email or username is already in use, the registration is rejected and the guest is notified which field caused the conflict.

### User Login

A member can log in using their registered email address and password. The system checks whether:
- An account exists with the provided email address
- The provided password matches the stored password for that account

If both checks pass, the member is signed in and the system recognizes them as authenticated for subsequent actions.

If the email does not match any existing account, the login is rejected. If the password is incorrect, the login is rejected. In both error cases, the member is notified that the credentials are invalid, without revealing which specific field was incorrect.

### Authentication State

The system operates with two distinct authentication states:

- **Unauthenticated (Guest)**: Users who have not logged in. They can browse public content including the Popular Feed, Community Feed, and view user profiles, but cannot create posts, comments, votes, or perform any write operations.

- **Authenticated (Member)**: Users who have successfully registered and logged in. They are recognized by the system as a specific member account and can perform all actions permitted to members, such as creating posts, commenting, voting, and managing their profile.

The system maintains the member's authenticated state throughout their session (see Session and Logout for session management details).

## Session and Logout

Define session behavior and logout from a user perspective.

### Session Lifecycle

When a member logs in successfully, the system establishes a session. During an active session, the system recognizes the member across requests without requiring repeated login. The session persists until the member logs out or deletes their account.

### Logout

A member can log out at any time. When the member logs out, the system ends their active session. After logout, the member becomes a guest with read-only access to public content.

### Account Security

When a member changes their password (described in Account Management), the member is required to use their new password on the next login attempt. The old password no longer works.

When a member deletes their account (described in Account Management), any active session is ended as part of the deletion process. No further access to that account is possible.

# Account Lifecycle

Account creation, deletion, and password management.

## Account Management

Define how users create accounts, delete accounts, and change passwords.

### Account Creation

Users can create an account by providing an email address, a password, and a unique username. All three fields are required.

The email address must not already be associated with an existing account. The username must not already be in use by another user. If either the email or username is already taken, the registration request is rejected. If any required field is missing, the request is rejected.

Upon successful creation, the system establishes the user's account and the associated profile (defined in [02-domain-model.md]).

### Account Deletion

Users can delete their own account at any time. When an account is deleted:

- All posts created by the user are permanently deleted.
- All comments written by the user are permanently deleted.
- The user's profile information (display name, bio, avatar) is permanently removed.

Account deletion is irreversible. After deletion, the email address and username may become available for reuse by a new account.

If the account does not exist, the request is rejected. If a different user attempts to delete another user's account, the request is rejected.

### Password Change

Authenticated users can change their own password. To change a password, the user must provide their current password and a new password.

The system verifies that the current password matches the one on record. If the current password is incorrect, the request is rejected. If the new password is missing or empty, the request is rejected.

Upon successful change, the new password takes effect immediately. The user's current session remains active.