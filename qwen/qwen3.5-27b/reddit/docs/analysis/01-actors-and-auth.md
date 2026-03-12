**redditClone — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their roles and what they can do.

## guest Actor

Guests are users who have not logged into the platform. They can browse the popular feed which shows posts from all communities across the platform. Guests can view individual posts and their comment threads without authentication. Guests can access community feeds to see posts from specific communities. Guests cannot create posts or comments on the platform. Guests cannot vote on posts or comments. Guests cannot subscribe to communities. Guests cannot access the home feed which requires authentication. Guests can search for communities by name. Guests can view community information including subscriber counts and descriptions. Guests can view user profiles publicly available on the platform. Guest access is intentionally limited to encourage registration while allowing content discovery.

### Guest Access Overview

THE system SHALL allow guests to access the platform without requiring authentication.

THE system SHALL allow guests to browse public content without logging in.

THE system SHALL allow guests to view posts from all communities on the platform.

THE system SHALL allow guests to view individual posts including title, content, author, community, vote score, comment count, and posting time.

THE system SHALL allow guests to view comments on any post.

THE system SHALL allow guests to view nested replies within comment threads.

THE system SHALL display all public content to guests without requiring account creation.

THE system SHALL provide content discovery capabilities to guests to encourage platform engagement.

### Popular Feed Access

THE system SHALL provide a popular feed accessible to guests.

THE system SHALL display posts from all communities in the popular feed for guests.

THE system SHALL allow guests to sort the popular feed by hot posts.

THE system SHALL allow guests to sort the popular feed by new posts.

THE system SHALL allow guests to sort the popular feed by top posts.

THE system SHALL allow guests to filter top posts by today, this week, this month, this year, or all time.

THE system SHALL allow guests to sort the popular feed by controversial posts.

THE system SHALL paginate the popular feed for guests.

THE system SHALL display post previews in the popular feed including title, author username, community name, vote score, comment count, and time since posted.

THE system SHALL display the first 200 characters of content for text posts in the popular feed.

THE system SHALL display thumbnail images for image posts in the popular feed.

THE system SHALL display the domain name for link posts in the popular feed.

### Community Feed Viewing

THE system SHALL allow guests to access community-specific feeds.

THE system SHALL display posts from a single community when guests view a community feed.

THE system SHALL allow guests to sort community feeds by hot posts.

THE system SHALL allow guests to sort community feeds by new posts.

THE system SHALL allow guests to sort community feeds by top posts.

THE system SHALL allow guests to filter top posts by today, this week, this month, this year, or all time in community feeds.

THE system SHALL allow guests to sort community feeds by controversial posts.

THE system SHALL paginate community feeds for guests.

THE system SHALL display community information including name, description, icon, and subscriber count.

THE system SHALL allow guests to view posts from communities they are not subscribed to.

### Community Search

THE system SHALL allow guests to search for communities by name.

THE system SHALL display search results showing community names and descriptions.

THE system SHALL display subscriber counts for communities in search results.

THE system SHALL allow guests to navigate to community feeds from search results.

THE system SHALL provide content discovery through community search functionality.

### Public Profile Viewing

THE system SHALL allow guests to view any user's public profile.

THE system SHALL display a user's display name on their profile page.

THE system SHALL display a user's bio text on their profile page.

THE system SHALL display a user's avatar image on their profile page.

THE system SHALL display a user's total karma score on their profile page.

THE system SHALL display a list of all posts created by a user on their profile page.

THE system SHALL display a list of all comments written by a user on their profile page.

THE system SHALL allow guests to view profiles without authentication.

### Restricted Actions for Guests

THE system SHALL prevent guests from creating posts on the platform.

THE system SHALL prevent guests from creating comments on any post.

THE system SHALL prevent guests from replying to any comment.

THE system SHALL prevent guests from upvoting posts.

THE system SHALL prevent guests from downvoting posts.

THE system SHALL prevent guests from upvoting comments.

THE system SHALL prevent guests from downvoting comments.

THE system SHALL prevent guests from subscribing to communities.

THE system SHALL prevent guests from unsubscribing from communities.

THE system SHALL prevent guests from accessing the home feed.

THE system SHALL prevent guests from editing any posts.

THE system SHALL prevent guests from deleting any posts.

THE system SHALL prevent guests from editing any comments.

THE system SHALL prevent guests from deleting any comments.

THE system SHALL prevent guests from reporting posts or comments.

THE system SHALL require authentication before allowing any content creation or interaction actions.

## member Actor

Members are registered users who have authenticated with their account credentials. Members can create posts in communities they have subscribed to. Members can write comments on any post across the platform. Members can reply to existing comments with no depth restrictions. Members can upvote or downvote posts and comments to influence their visibility. Members can subscribe to communities they want to follow. Members can unsubscribe from communities at any time. Members can view their personalized home feed showing posts from subscribed communities. Members can edit their own posts and comments after creation. Members can delete their own posts and comments. Members can report inappropriate posts or comments with a reason. Members can view their own profile displaying karma score, posts, and comments. Members can view other users' profiles and their activity. Members can search for communities and browse community listings. Members cannot moderate content unless they have moderator permissions in a specific community.

### Member Registration and Authentication Access

WHEN a user completes registration, THE system SHALL create a member account with email, password, and unique username.

WHEN a member logs in with valid credentials, THE system SHALL authenticate the user and establish an authenticated session.

WHEN a member logs in with invalid credentials, THE system SHALL deny access and display an authentication error.

WHILE a member has an active session, THE system SHALL allow access to all member-only features and content.

IF a member's session expires, THE system SHALL require re-authentication before allowing access to member-only features.

THE system SHALL allow members to change their password after successful authentication.

THE system SHALL require members to authenticate before creating posts, comments, or votes.

THE system SHALL require members to authenticate before subscribing to communities.

THE system SHALL require members to authenticate before reporting content.

THE system SHALL require members to authenticate before editing or deleting their own content.

### Post Creation in Subscribed Communities

WHEN a member creates a post, THE system SHALL require the member to be subscribed to the target community.

WHEN a member creates a post, THE system SHALL require a title with at least one character.

WHEN a member creates a post, THE system SHALL allow one of three post types: text post, link post, or image post.

WHEN a member creates a text post, THE system SHALL require text content between 1 and 10000 characters.

WHEN a member creates a link post, THE system SHALL require a valid URL.

WHEN a member creates an image post, THE system SHALL require an uploaded image file.

IF a member attempts to create a post in a community they are not subscribed to, THE system SHALL reject the request.

IF a member is banned from a community, THE system SHALL prevent them from creating posts in that community.

WHEN a member creates a post, THE system SHALL associate the post with the member as the author.

WHEN a member creates a post, THE system SHALL associate the post with the target community.

WHEN a member creates a post, THE system SHALL initialize the vote score to zero.

WHEN a member creates a post, THE system SHALL record the creation timestamp.

### Comment and Reply Capabilities

WHEN a member writes a comment on a post, THE system SHALL require the comment content to be between 1 and 1000 characters.

WHEN a member writes a comment, THE system SHALL associate the comment with the member as the author.

WHEN a member writes a comment, THE system SHALL associate the comment with the target post.

WHEN a member replies to an existing comment, THE system SHALL create a nested reply with no depth restrictions.

WHEN a member replies to a comment, THE system SHALL associate the reply with the parent comment.

IF a member is banned from a community, THE system SHALL prevent them from commenting on posts in that community.

WHEN a member writes a comment, THE system SHALL initialize the vote score to zero.

WHEN a member writes a comment, THE system SHALL record the creation timestamp.

THE system SHALL allow members to view all comments and replies on any post they can access.

THE system SHALL display comments with their nested reply structure.

### Voting on Content

WHEN a member upvotes a post or comment, THE system SHALL increase the vote score by 1.

WHEN a member downvotes a post or comment, THE system SHALL decrease the vote score by 1.

WHEN a member removes their vote, THE system SHALL adjust the vote score accordingly.

WHEN a member changes their vote from upvote to downvote, THE system SHALL adjust the vote score by 2 points.

WHEN a member changes their vote from downvote to upvote, THE system SHALL adjust the vote score by 2 points.

IF a member has already voted on a post or comment, THE system SHALL allow them to change or remove their vote.

THE system SHALL limit each member to one vote per post.

THE system SHALL limit each member to one vote per comment.

THE system SHALL record the creation timestamp of each vote.

THE system SHALL associate each vote with the voting member and the target content.

WHEN a member votes on content, THE system SHALL adjust the author's karma score accordingly.

THE system SHALL allow members to vote on any post or comment they can view.

### Community Subscription Management

WHEN a member subscribes to a community, THE system SHALL add the community to the member's subscription list.

WHEN a member subscribes to a community, THE system SHALL increment the community's subscriber count.

WHEN a member unsubscribes from a community, THE system SHALL remove the community from the member's subscription list.

WHEN a member unsubscribes from a community, THE system SHALL decrement the community's subscriber count.

WHEN a member subscribes to a community, THE system SHALL record the subscription timestamp.

THE system SHALL allow members to view a list of all communities they are subscribed to.

THE system SHALL allow members to subscribe to any community on the platform.

THE system SHALL allow members to unsubscribe from any community at any time.

IF a member is not subscribed to a community, THE system SHALL prevent them from creating posts in that community.

THE system SHALL require subscription to a community before allowing post creation in that community.

### Personalized Home Feed

WHEN a member views their home feed, THE system SHALL display posts only from communities they are subscribed to.

WHEN a member views their home feed, THE system SHALL require the member to be authenticated.

WHEN a member views their home feed, THE system SHALL allow sorting by hot, new, top, or controversial.

WHEN a member selects hot sorting, THE system SHALL prioritize recent posts with many upvotes.

WHEN a member selects new sorting, THE system SHALL display the most recently created posts first.

WHEN a member selects top sorting, THE system SHALL display highest vote score posts first with time filter options.

WHEN a member selects top sorting, THE system SHALL allow time filters: today, this week, this month, this year, or all time.

WHEN a member selects controversial sorting, THE system SHALL prioritize posts with many votes but scores close to zero.

WHEN a member views their home feed, THE system SHALL paginate the results.

THE system SHALL exclude posts from communities the member has not subscribed to from the home feed.

### Content Editing and Deletion

WHEN a member edits their own post, THE system SHALL allow modification of the title and content.

WHEN a member edits their own comment, THE system SHALL allow modification of the content.

WHEN a member deletes their own post, THE system SHALL permanently remove the post and all associated comments.

WHEN a member deletes their own comment, THE system SHALL permanently remove the comment and all associated replies.

IF a member attempts to edit another member's post, THE system SHALL reject the request.

IF a member attempts to edit another member's comment, THE system SHALL reject the request.

IF a member attempts to delete another member's post, THE system SHALL reject the request.

IF a member attempts to delete another member's comment, THE system SHALL reject the request.

WHEN a member deletes their post, THE system SHALL adjust karma scores for all votes on that post.

WHEN a member deletes their comment, THE system SHALL adjust karma scores for all votes on that comment.

THE system SHALL preserve the creation timestamp when a member edits their content.

THE system SHALL allow members to edit their content at any time after creation.

### Reporting Inappropriate Content

WHEN a member reports a post, THE system SHALL require the member to provide a reason.

WHEN a member reports a comment, THE system SHALL require the member to provide a reason.

WHEN a member reports content, THE system SHALL record the reporter's identity.

WHEN a member reports content, THE system SHALL record the report reason.

WHEN a member reports content, THE system SHALL initialize the report status as pending.

WHEN a member reports content, THE system SHALL record the creation timestamp.

THE system SHALL allow members to report any post they can view.

THE system SHALL allow members to report any comment they can view.

THE system SHALL associate each report with the reported content and the reporting member.

THE system SHALL make reports visible to moderators of the relevant community.

### Profile Viewing and Karma

WHEN a member views their own profile, THE system SHALL display their display name, bio, and avatar.

WHEN a member views their own profile, THE system SHALL display their total karma score.

WHEN a member views their own profile, THE system SHALL display a list of all posts they have created.

WHEN a member views their own profile, THE system SHALL display a list of all comments they have written.

WHEN a member views another user's profile, THE system SHALL display that user's display name, bio, and avatar.

WHEN a member views another user's profile, THE system SHALL display that user's total karma score.

WHEN a member views another user's profile, THE system SHALL display a list of all posts that user has created.

WHEN a member views another user's profile, THE system SHALL display a list of all comments that user has written.

WHEN a member receives an upvote on their post or comment, THE system SHALL increase their karma by 1.

WHEN a member receives a downvote on their post or comment, THE system SHALL decrease their karma by 1.

WHEN a vote is removed from a member's content, THE system SHALL adjust their karma accordingly.

THE system SHALL allow karma to be negative.

THE system SHALL calculate karma as the sum of all votes on a member's posts and comments.

THE system SHALL allow members to view any other user's profile without restrictions.

### Community Browsing and Discovery

WHEN a member browses communities, THE system SHALL display a list of all communities on the platform.

WHEN a member searches for communities, THE system SHALL allow searching by community name.

WHEN a member views a community, THE system SHALL display the community name, description, and icon.

WHEN a member views a community, THE system SHALL display the subscriber count.

WHEN a member views a community feed, THE system SHALL display posts from that specific community.

WHEN a member views a community feed, THE system SHALL allow sorting by hot, new, top, or controversial.

WHEN a member views a community feed, THE system SHALL paginate the results.

THE system SHALL allow members to browse communities without requiring subscription.

THE system SHALL allow members to view community feeds without requiring subscription.

THE system SHALL allow members to search for communities using partial name matches.

## admin Actor

Admin actors represent platform-level administrators with elevated permissions across the entire system. This role is distinct from community moderators who only have authority within their specific communities. Admin actors can oversee platform-wide operations and enforce terms of service. Admin actors can review and act on escalated reports from multiple communities. Admin actors can manage user accounts including suspension or termination for policy violations. Admin actors can view system-wide analytics and usage patterns. Admin actors can access all communities regardless of subscription status. Admin actors can moderate content in any community when necessary. Admin actors can assist with technical issues affecting the platform. Admin actors can communicate platform-wide announcements to all users. Admin actors maintain the integrity and safety of the overall platform. The admin role provides oversight beyond community-level moderation. Admin actions are logged for accountability and audit purposes.

### Platform-Level Authority

THE system SHALL recognize admin actors as having platform-wide authority across all communities and users.

THE system SHALL grant admin actors the ability to access any community without requiring subscription.

THE system SHALL allow admin actors to override community-level restrictions when enforcing platform policies.

THE system SHALL ensure admin actions take precedence over community moderator decisions when conflicts arise.

THE system SHALL log all admin actions for audit and accountability purposes.

### Cross-Community Oversight

WHEN an admin actor accesses the platform, THE system SHALL provide visibility into all communities regardless of their subscription status.

THE system SHALL enable admin actors to monitor activity patterns across multiple communities simultaneously.

THE system SHALL allow admin actors to identify communities violating platform-wide policies.

THE system SHALL provide admin actors with tools to compare metrics and activity across different communities.

THE system SHALL notify admin actors of unusual activity patterns that may indicate policy violations across communities.

### User Account Management

WHEN an admin actor reviews a user account, THE system SHALL display the user's complete activity history across all communities.

THE system SHALL allow admin actors to suspend user accounts for policy violations.

THE system SHALL enable admin actors to terminate user accounts permanently for severe violations.

WHEN a user account is suspended, THE system SHALL prevent the user from logging in or creating new content.

WHEN a user account is terminated, THE system SHALL remove all content created by that user including posts and comments.

THE system SHALL allow admin actors to restore suspended accounts when appropriate.

THE system SHALL notify users when their account status changes due to admin action.

### Policy Enforcement

THE system SHALL provide admin actors with the ability to define and update platform-wide content policies.

WHEN content violates platform policies, THE system SHALL allow admin actors to remove it regardless of community membership.

THE system SHALL enable admin actors to issue warnings to users for policy violations.

THE system SHALL allow admin actors to escalate repeat offenders for stricter enforcement actions.

THE system SHALL provide admin actors with tools to search for policy-violating content across the entire platform.

WHEN admin actors enforce policies, THE system SHALL record the specific policy violated and the action taken.

### Escalated Report Handling

THE system SHALL route escalated reports from community moderators to admin actors for review.

WHEN an admin actor reviews an escalated report, THE system SHALL display the original content, report details, and moderator actions taken.

THE system SHALL allow admin actors to approve or dismiss escalated reports.

WHEN an admin actor approves an escalated report, THE system SHALL take the appropriate enforcement action.

WHEN an admin actor dismisses an escalated report, THE system SHALL remove it from the active report queue.

THE system SHALL provide admin actors with filters to prioritize reports by severity and community impact.

THE system SHALL track the resolution time for escalated reports to ensure timely handling.

### System-Wide Access

THE system SHALL grant admin actors read access to all posts and comments across the platform.

THE system SHALL allow admin actors to view user profiles and activity regardless of privacy settings.

THE system SHALL enable admin actors to access community settings and moderation logs for any community.

THE system SHALL provide admin actors with search capabilities across all platform content.

THE system SHALL allow admin actors to export data for analysis and reporting purposes.

WHEN admin actors access sensitive information, THE system SHALL require additional authentication verification.

### Platform Integrity

THE system SHALL enable admin actors to identify and mitigate spam, abuse, and malicious activity across the platform.

THE system SHALL allow admin actors to implement platform-wide rate limiting when abuse is detected.

THE system SHALL provide admin actors with tools to detect coordinated inauthentic behavior.

WHEN platform integrity is compromised, THE system SHALL alert admin actors immediately.

THE system SHALL allow admin actors to temporarily restrict certain platform features during security incidents.

THE system SHALL maintain backup systems to recover from data loss or corruption.

### Content Moderation Authority

THE system SHALL grant admin actors the ability to remove any post or comment regardless of community ownership.

WHEN admin actors remove content, THE system SHALL notify the content creator of the removal and reason.

THE system SHALL allow admin actors to hide content from public view without permanently deleting it.

THE system SHALL enable admin actors to reverse content removal decisions when necessary.

THE system SHALL provide admin actors with bulk action tools for managing large volumes of content.

WHEN admin actors moderate content, THE system SHALL record the action in an immutable audit log.

### Usage Analytics

THE system SHALL provide admin actors with dashboards showing platform-wide usage metrics.

THE system SHALL display real-time statistics on active users, posts, and comments.

THE system SHALL enable admin actors to analyze growth trends over time.

THE system SHALL provide breakdowns of activity by community, user type, and content type.

THE system SHALL allow admin actors to identify peak usage periods and resource demands.

THE system SHALL generate reports on user engagement and content performance metrics.

WHEN admin actors request analytics, THE system SHALL aggregate data without exposing individual user privacy.

### Technical Oversight

THE system SHALL provide admin actors with access to system health monitoring tools.

THE system SHALL alert admin actors to performance degradation or service outages.

THE system SHALL allow admin actors to view error logs and system diagnostics.

THE system SHALL enable admin actors to coordinate with technical teams during incidents.

THE system SHALL provide admin actors with status information about ongoing maintenance or updates.

WHEN technical issues are resolved, THE system SHALL notify admin actors and affected users.

### Announcements

THE system SHALL allow admin actors to create platform-wide announcements visible to all users.

WHEN admin actors publish an announcement, THE system SHALL display it prominently on the user interface.

THE system SHALL enable admin actors to target announcements to specific user groups or communities.

THE system SHALL allow admin actors to schedule announcements for future delivery.

THE system SHALL track announcement delivery and user engagement metrics.

THE system SHALL allow admin actors to retract or update announcements before their scheduled end time.

### Audit Logging

THE system SHALL record all admin actions in an immutable audit log.

WHEN an admin actor performs an action, THE system SHALL log the actor identity, timestamp, action type, and affected entities.

THE system SHALL retain audit logs for a minimum period defined by platform policy.

THE system SHALL allow admin actors to search and filter audit logs by actor, date, or action type.

THE system SHALL protect audit logs from modification or deletion by any user including admins.

WHEN audit logs indicate suspicious activity, THE system SHALL alert senior admin personnel.

THE system SHALL provide export functionality for audit logs to support external audits or investigations.

# Authentication Flows

Registration, login, session management, and token policies.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

WHEN a new user registers for an account, THE system SHALL require an email address.

WHEN a new user registers for an account, THE system SHALL require a password.

WHEN a new user registers for an account, THE system SHALL require a unique username.

WHEN a new user registers for an account, THE system SHALL validate that the email address has not been previously registered.

WHEN a new user registers for an account, THE system SHALL validate that the username is unique across all users.

IF the email address is already registered, THE system SHALL reject the registration request.

IF the username is already taken, THE system SHALL reject the registration request.

IF the password does not meet security requirements, THE system SHALL reject the registration request.

WHEN registration is successful, THE system SHALL create a new user account.

WHEN registration is successful, THE system SHALL initialize the user's karma score to zero.

WHEN registration is successful, THE system SHALL create an empty profile for the user.

### User Login

WHEN a user logs in, THE system SHALL require an email address.

WHEN a user logs in, THE system SHALL require a password.

WHEN a user logs in, THE system SHALL verify that the email address exists in the system.

WHEN a user logs in, THE system SHALL verify that the password matches the stored credentials.

IF the email address does not exist, THE system SHALL reject the login request.

IF the password is incorrect, THE system SHALL reject the login request.

IF the account is suspended, THE system SHALL reject the login request.

IF the account is deleted, THE system SHALL reject the login request.

WHEN login is successful, THE system SHALL establish an authenticated session for the user.

WHEN login is successful, THE system SHALL identify the user as a member actor.

### Authentication Requirements

WHEN a user attempts to authenticate, THE system SHALL verify the user's credentials.

WHEN a user's credentials are valid, THE system SHALL grant access to member-level features.

WHEN a user's credentials are invalid, THE system SHALL deny access and return an authentication error.

WHEN an unauthenticated user accesses the system, THE system SHALL identify them as a guest actor.

WHEN a guest attempts to perform a member-only action, THE system SHALL require authentication.

WHEN a user is authenticated, THE system SHALL associate all their actions with their user account.

WHEN a user is authenticated, THE system SHALL track their karma changes.

WHEN a user is authenticated, THE system SHALL enforce their community subscription requirements.

## Session and Token Policy

Define session duration, token refresh, and expiration policies.

### Session Management

WHEN a user successfully logs in, THE system SHALL create a new session.

THE system SHALL maintain session state for authenticated users.

THE system SHALL automatically expire a session after 30 days of inactivity.

WHEN a user logs out, THE system SHALL terminate the current session.

THE system SHALL allow a user to have multiple concurrent sessions across different devices.

WHEN a user logs in from a new device, THE system SHALL create a new session for that device.

THE system SHALL track the last activity time for each session.

WHILE a session is active, THE system SHALL allow the user to perform authenticated actions.

IF a session expires due to inactivity, THE system SHALL require the user to log in again.

THE system SHALL provide a mechanism for users to view their active sessions.

WHEN a user requests to terminate a specific session, THE system SHALL invalidate that session immediately.

### JWT Token Structure

THE system SHALL issue a JWT (JSON Web Token) upon successful user authentication.

THE system SHALL encode user identity information in the JWT access token.

THE system SHALL sign all JWT tokens to prevent tampering.

THE system SHALL validate JWT tokens on every authenticated request.

THE system SHALL include the user's unique identifier in the JWT payload.

THE system SHALL include the token issuance time in the JWT payload.

THE system SHALL include the token expiration time in the JWT payload.

IF a JWT token is malformed, THE system SHALL reject the request.

IF a JWT token signature is invalid, THE system SHALL reject the request.

THE system SHALL NOT include sensitive user data (such as password) in JWT tokens.

WHEN a JWT token is validated successfully, THE system SHALL grant access to protected resources.

THE system SHALL use short-lived access tokens for request authentication.

### Token Refresh Mechanism

THE system SHALL issue a refresh token alongside the access token upon successful authentication.

WHEN an access token expires, THE system SHALL allow renewal using a valid refresh token.

THE system SHALL use refresh tokens to obtain new access tokens without requiring re-authentication.

WHEN a refresh token is used to obtain a new access token, THE system SHALL issue a new refresh token.

THE system SHALL rotate refresh tokens on each use to prevent replay attacks.

WHEN a user logs out, THE system SHALL invalidate all refresh tokens for that user.

WHEN a user changes their password, THE system SHALL invalidate all existing refresh tokens.

IF a refresh token is expired, THE system SHALL require the user to log in again.

IF a refresh token is invalid or revoked, THE system SHALL reject the refresh request.

THE system SHALL store refresh tokens securely on the client side.

WHEN a refresh token is used successfully, THE system SHALL invalidate the previous refresh token.

### Token Expiration and Invalidation

THE system SHALL expire access tokens after 1 hour from issuance.

THE system SHALL expire refresh tokens after 7 days from issuance.

THE system SHALL expire all tokens when a user logs out.

WHEN a user changes their password, THE system SHALL invalidate all existing tokens for that user.

WHEN a user deletes their account, THE system SHALL invalidate all existing tokens for that user.

IF an access token has expired, THE system SHALL reject the request and return an authentication error.

IF a refresh token has expired, THE system SHALL require the user to log in again.

THE system SHALL check token expiration on every authenticated request.

WHEN a token expires, THE system SHALL NOT automatically extend its validity.

THE system SHALL provide clear error messages when a token has expired.

WHEN a user is banned from a community, THE system SHALL NOT invalidate their authentication tokens.

WHEN a user's account is suspended, THE system SHALL invalidate all existing tokens for that user.

# Account Lifecycle

Account state transitions and lifecycle management.

## Account States and Transitions

Define account states (active, suspended, deleted) and valid transitions.

### Account State Definitions

WHEN a user account is created, THE system SHALL set the initial state to "active".  

WHEN a user account is in "active" state, THE system SHALL allow normal platform access.  

WHEN a user account is in "suspended" state, THE system SHALL block all write operations (post creation, comments, voting).  

WHEN a user account is in "deleted" state, THE system SHALL prevent any further login attempts.  

THE system SHALL track the current state of every user account.  

THE system SHALL maintain an audit log of all state transitions.  

### State Definitions

**Active State**
- User can log in and access all platform features
- User can create posts and comments
- User can vote on content
- User can subscribe to communities

**Suspended State**
- User retains account data
- User cannot log in
- User cannot create or modify content
- User cannot vote
- User's historical content remains visible

**Deleted State**
- User account data is permanently removed
- All user-created content is removed
- User cannot be restored

### Valid State Transitions

WHEN an account is in "active" state, THE system SHALL allow transition to "suspended" state only by an admin.  

WHEN an account is in "active" state, THE system SHALL allow transition to "deleted" state only by the account owner.  

WHEN an account is in "suspended" state, THE system SHALL allow transition back to "active" state only by an admin.  

WHEN an account is in "suspended" state, THE system SHALL allow transition to "deleted" state only by an admin.  

WHEN an account is in "deleted" state, THE system SHALL prevent any state transitions (terminal state).  

WHEN an account is deleted, THE system SHALL cascade delete all posts owned by the user.  

WHEN an account is deleted, THE system SHALL cascade delete all comments written by the user.  

IF an admin attempts to suspend an already suspended account, THE system SHALL reject the request.  

IF a user attempts to delete an account that is already deleted, THE system SHALL reject the request.  

IF a user attempts to delete an account that is suspended, THE system SHALL reject the request (must be activated first).

### Account Deletion Process

WHEN a user requests account deletion, THE system SHALL require re-authentication before proceeding.  

WHEN a user account is deleted, THE system SHALL also delete all posts created by that user.  

WHEN a user account is deleted, THE system SHALL also delete all comments written by that user.  

WHEN a user account is deleted, THE system SHALL remove the user from all community subscriptions.  

WHEN a user account is deleted, THE system SHALL remove the user from all moderator roles.  

IF a user has pending reports, THE system SHALL resolve them before allowing deletion.  

IF a user is a moderator of any community, THE system SHALL require removal from moderator role before deletion.  

IF a user owns any community, THE system SHALL require community transfer or deletion before account deletion.

### Account Suspension Process

WHEN an admin suspends an account, THE system SHALL prevent the user from logging in.  

WHEN an admin suspends an account, THE system SHALL preserve all historical content.  

WHEN an admin unsuspends an account, THE system SHALL restore full platform access.  

WHEN a user is suspended, THE system SHALL still display their historical posts and comments.  

IF a suspended user attempts to log in, THE system SHALL display an appropriate access-denied message.

### Deactivation Scenarios

IF a user attempts to delete an account that is already in "deleted" state, THE system SHALL reject the request.  

IF a user attempts to delete an account that is currently "suspended", THE system SHALL require reactivation first.  

IF a user has not changed their password for 6 months, THE system SHALL require password verification before deletion.  

IF a user has active sessions on other devices, THE system SHALL require logout from those sessions first.

### Cascading Deletion Rules

WHEN a user's account is deleted, THE system SHALL cascade delete all associated data.  

WHEN a user's account is deleted, THE system SHALL remove all votes cast by that user.  

WHEN a user's account is deleted, THE system SHALL remove all subscriptions held by that user.  

IF a user owns a community, THE system SHALL require the community to be reassigned or deleted.  

IF a user is the sole moderator of a community, THE system SHALL require a moderator reassignment before deletion.