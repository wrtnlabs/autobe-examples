**redditLike — Actor definitions, permission matrix, authentication, session, account lifecycle**

Actor definitions, permission matrix, authentication, session, account lifecycle

# Actor Definitions

Define all user actor types with their roles and what they can do.

## guest Actor

Guests can browse all public content without creating an account. They can view community listings, search for communities by name, and see posts from the popular feed or specific community feeds. Guests can view any user's profile including their display name, bio, avatar, karma score, and content history. However, guests cannot vote on posts or comments, create posts or comments, subscribe to communities, or edit their own profile. They cannot access the home feed which is reserved for logged-in users. When attempting restricted actions, guests are prompted to log in or create an account.

### Guest Public Content Access

THE system SHALL allow guests to view all public content without requiring authentication.

GUESTS CAN:
- Browse community listings
- Search communities by name
- View posts from the popular feed
- View posts from community-specific feeds
- View user profiles including display name, bio, avatar, karma score, posts, and comments

WHEN a guest attempts to access restricted functionality, THE system SHALL prompt them to log in or create an account.

GUESTS CANNOT:
- Create posts or comments
- Vote on posts or comments
- Subscribe to communities
- Access the home feed
- Edit their profile

### Community Browsing Capabilities

WHEN a guest views community listings, THE system SHALL display:
1. Community name
2. Description text
3. Icon image
4. Subscriber count

WHEN a guest searches for communities, THE system SHALL return results matching the community name.

WHEN a guest views a community's public page, THE system SHALL display the same information available in community listings.

WHERE a guest accesses a community feed, THE system SHALL show posts from that specific community sorted by available sorting options (hot, new, top, controversial).

### Profile Viewing Permissions

WHEN a guest views any user's profile, THE system SHALL display:
1. Display name
2. Bio text
3. Avatar image
4. Total karma score
5. List of all posts created by that user
6. List of all comments written by that user

WHEN a guest views their own profile, THE system SHALL display the same information but indicate they are viewing a guest version.

WHEN a guest attempts to edit profile information, THE system SHALL redirect them to the login page with a prompt to sign in.

### No Voting Privileges for Guests

WHEN a guest attempts to vote on a post, THE system SHALL reject the request and prompt for authentication.

WHEN a guest attempts to vote on a comment, THE system SHALL reject the request and prompt for authentication.

WHEN a guest views a post or comment, THE system SHALL display the vote score but disable voting controls.

THE system SHALL NOT track votes from guest sessions.

THE system SHALL NOT increment or decrement karma scores based on guest activity.

### No Post Creation for Guests

WHEN a guest attempts to create a post, THE system SHALL reject the request and prompt for authentication.

WHEN a guest visits a community feed, THE system SHALL hide the 'Create Post' button or disable the post creation interface.

THE system SHALL prevent post creation for unauthenticated users regardless of community subscription status.

WHEN a guest navigates to the post creation page, THE system SHALL redirect them to the login page.

### No Comment Creation for Guests

WHEN a guest attempts to write a comment on any post, THE system SHALL reject the request and prompt for authentication.

WHEN a guest attempts to reply to any comment, THE system SHALL reject the request and prompt for authentication.

THE system SHALL prevent comment creation for unauthenticated users regardless of post visibility.

WHEN a guest navigates to a comment reply interface, THE system SHALL disable the comment input field and prompt for authentication.

### Home Feed Access Restriction

WHEN a guest attempts to access the home feed, THE system SHALL redirect them to the login page.

THE system SHALL mark the home feed as authenticated-only content.

GUESTS CANNOT view posts from the home feed even if they are subscribed to communities.

WHEN a guest tries to access URLs directly to the home feed, THE system SHALL redirect them to the login page.

### Authentication Prompt Mechanisms

WHEN a guest attempts any restricted action, THE system SHALL display an authentication prompt.

WHEN an authentication prompt appears, THE system SHALL provide options to:
1. Log in to an existing account
2. Create a new account
3. Continue browsing as a guest (return to previous page)

THE system SHALL display authentication prompts in a non-intrusive modal or page redirect as appropriate.

### Public Content Security

WHEN a guest accesses any public content, THE system SHALL ensure it is served without requiring authentication.

WHEN a guest accesses popular feed content, THE system SHALL deliver posts without authentication.

WHEN a guest accesses community feeds, THE system SHALL deliver posts without authentication.

THE system SHALL cache public content for guests to improve performance.

WHERE content is marked as private, THE system SHALL verify authentication before serving.

### Guest Session Management

WHEN a guest visits the site, THE system SHALL create a guest session without requiring login credentials.

THE system SHALL maintain guest session state across page navigation for public content.

WHEN a guest logs in during their session, THE system SHALL convert the guest session to an authenticated member session.

WHEN a guest's session expires, THE system SHALL clear their session data but preserve public content access.

THE system SHALL NOT persist guest karma or voting preferences beyond their session.

## member Actor

Members are authenticated users who can create posts in communities they subscribe to, including text posts, link posts, and image posts. They can vote on posts and comments, with their votes affecting karma scores. Members can subscribe and unsubscribe from communities, edit their own profile information, change their password, and view their personal feed. They can write comments on posts and reply to other comments in nested threads. Members can edit or delete their own posts and comments, report inappropriate content, and view their karma score and content history on their profile.

### Authenticated Access

WHEN a member accesses the platform, THE system SHALL require authentication.

WHEN a member performs any action, THE system SHALL verify their authenticated status.

WHEN an unauthenticated guest attempts to access member-only features, THE system SHALL redirect them to the login page.

WHEN a member navigates to their home feed, THE system SHALL display posts only from communities they are subscribed to.

WHEN a member views their profile page, THE system SHALL display their display name, bio, avatar, karma score, and content history.

WHEN a member views another user's profile, THE system SHALL display that user's public information.

WHEN a member visits the popular feed, THE system SHALL show posts from all communities across the platform.

IF a member's session expires during an active session, THE system SHALL prompt them to re-authenticate.

WHERE authentication is required, THE system SHALL validate the member's session token before processing requests.

### Post Creation

WHEN a member creates a post, THE system SHALL require them to be subscribed to the selected community.

WHEN a member creates a post, THE system SHALL require a title.

WHEN a member creates a post, THE system SHALL require them to select one of: text post, link post, or image post.

WHEN a member creates a text post, THE system SHALL require text content.

WHEN a member creates a link post, THE system SHALL require a URL.

WHEN a member creates an image post, THE system SHALL require an uploaded image.

WHEN a member submits a post, THE system SHALL associate it with their user account.

WHEN a member submits a post, THE system SHALL associate it with the selected community.

WHEN a member creates a post, THE system SHALL increment the community's subscriber count.

IF a member attempts to create a post in a community they are not subscribed to, THE system SHALL reject the request.

### Comment Writing

WHEN a member writes a comment on a post, THE system SHALL require content.

WHEN a member writes a reply to a comment, THE system SHALL accept the reply at any depth.

WHEN a member writes a comment, THE system SHALL associate it with their user account.

WHEN a member writes a comment, THE system SHALL associate it with the target post.

WHEN a member replies to a comment, THE system SHALL establish a parent-child relationship with the referenced comment.

WHEN a member writes a comment on a post, THE system SHALL increment the comment count for that post.

WHEN a member writes a comment, THE system SHALL initialize the comment's vote score to zero.

IF a member attempts to comment on a post that does not exist, THE system SHALL reject the request.

### Voting System

WHEN a member upvotes a post, THE system SHALL increment the post's vote score by 1.

WHEN a member downvotes a post, THE system SHALL decrement the post's vote score by 1.

WHEN a member upvotes a comment, THE system SHALL increment the comment's vote score by 1.

WHEN a member downvotes a comment, THE system SHALL decrement the comment's vote score by 1.

WHEN a member changes their vote from upvote to downvote (or vice versa), THE system SHALL adjust the score accordingly.

WHEN a member removes their vote entirely, THE system SHALL revert the vote score to its state before the vote.

WHEN a member attempts to vote on a post or comment, THE system SHALL ensure they have not already voted.

WHEN a member casts a vote, THE system SHALL record the vote with their user ID, the content ID, and the vote value (+1 or -1).

IF a member attempts to vote on their own post or comment, THE system SHALL reject the request.

IF a member attempts to vote after having already voted on the same content, THE system SHALL update or remove their existing vote.

### Karma Accumulation

WHEN a member receives an upvote on their post or comment, THE system SHALL increase their karma score by 1.

WHEN a member receives a downvote on their post or comment, THE system SHALL decrease their karma score by 1.

WHEN a member's vote is removed from a post or comment, THE system SHALL adjust their karma score accordingly.

WHEN a member's vote is changed from upvote to downvote (or vice versa), THE system SHALL adjust their karma score by 2.

WHEN a member views their profile, THE system SHALL display their current karma score.

WHEN any user views a profile, THE system SHALL display that user's karma score.

WHERE karma can be affected, THE system SHALL maintain an accurate running total.

IF a post or comment with votes is deleted, THE system SHALL adjust karma scores for all users who received votes from that content.

### Profile Management

WHEN a member registers an account, THE system SHALL require them to choose a unique username.

WHEN a member edits their profile, THE system SHALL allow them to update their display name, bio, and avatar.

WHEN a member updates their display name, THE system SHALL save the new display name.

WHEN a member updates their bio, THE system SHALL save the new bio text.

WHEN a member updates their avatar, THE system SHALL save the new avatar URL.

WHEN a member views their own profile, THE system SHALL display all profile information including their karma score and content history.

WHEN any user views a profile, THE system SHALL display the display name, bio, avatar, total karma score, and lists of posts and comments.

WHEN a member views their own profile, THE system SHALL display their list of posts they have created.

WHEN a member views their own profile, THE system SHALL display their list of comments they have written.

### Subscription Control

WHEN a member subscribes to a community, THE system SHALL create a subscription record linking them to the community.

WHEN a member subscribes to a community, THE system SHALL increment the community's subscriber count.

WHEN a member unsubscribes from a community, THE system SHALL update their subscription status to unsubscribed.

WHEN a member unsubscribes from a community, THE system SHALL decrement the community's subscriber count.

WHEN a member views their subscriptions, THE system SHALL display all communities they are subscribed to.

WHEN a member creates a post, THE system SHALL verify they are subscribed to the selected community.

IF a member attempts to subscribe to a community they are already subscribed to, THE system SHALL ignore the request or revert to their previous subscription status.

IF a member attempts to subscribe to a community that does not exist, THE system SHALL reject the request.

### Content Editing

WHEN a member edits their own post, THE system SHALL allow them to update the title and content.

WHEN a member edits a text post, THE system SHALL allow updates to the text content.

WHEN a member edits a link post, THE system SHALL allow updates to the URL.

WHEN a member edits an image post, THE system SHALL allow updates to the image.

WHEN a member edits their own comment, THE system SHALL allow them to update the comment content.

WHEN a member deletes their own post, THE system SHALL mark the post as deleted.

WHEN a member deletes their own comment, THE system SHALL mark the comment as deleted.

WHEN a member deletes their post, THE system SHALL decrement the community's post count.

IF a member attempts to edit a post they do not own, THE system SHALL reject the request.

IF a member attempts to delete a post they do not own, THE system SHALL reject the request.

### Reporting Capability

WHEN a member reports a post, THE system SHALL require them to provide a reason.

WHEN a member reports a comment, THE system SHALL require them to provide a reason.

WHEN a member submits a report, THE system SHALL create a report record with their user ID, the reported content, and the reason.

WHEN a member submits a report, THE system SHALL associate it with the relevant community.

WHEN a moderator views reports for their community, THE system SHALL display all pending reports.

WHEN a member submits a report, THE system SHALL notify moderators of the affected community.

IF a member attempts to report content they own, THE system SHALL reject the request.

IF a member attempts to report the same content multiple times, THE system SHALL reject duplicate reports.

## moderator Actor

Moderators are members assigned to specific communities with additional administrative powers. They can delete any posts or comments within their assigned communities, ban and unban users from those communities, and view the list of banned users. Moderators can access and manage reports for content in their communities, approving reports to remove content or dismissing them to keep content. Only community owners can assign moderators, and moderators cannot remove owners or other moderators. Moderators maintain community standards while adhering to platform-wide policies.

### Community Moderation

THE system SHALL allow moderators to view all content in communities they are assigned to.

A moderator can review posts and comments for compliance with community guidelines.

THE system SHALL provide tools for moderators to manage community standards within their assigned communities.

### Content Deletion

WHEN a moderator deletes a post, THE system SHALL:
1. Remove the post from public view in the community
2. Record the deletion with the moderator's identifier
3. Update the post's status to 'deleted'

WHEN a moderator deletes a comment, THE system SHALL:
1. Remove the comment from public view in the post
2. Record the deletion with the moderator's identifier
3. Update the comment's status to 'deleted'

IF a post is deleted by a moderator, THE system SHALL:
1. Hide all comments on that post from public view
2. Maintain records of the original content for audit purposes
3. Update comment counts to reflect the hidden state

### User Banning

WHEN a moderator bans a user from a community, THE system SHALL:
1. Prevent the banned user from creating new posts in that community
2. Prevent the banned user from creating new comments in that community
3. Allow the banned user to still view existing content in that community
4. Record the ban with the moderator's identifier and timestamp

WHEN a moderator unbans a user from a community, THE system SHALL:
1. Restore the user's ability to create posts in that community
2. Restore the user's ability to create comments in that community
3. Update the ban status to 'unbanned'
4. Record the unban action with the moderator's identifier and timestamp

THE system SHALL provide moderators with a list of all banned users in their communities.

### Report Management

WHEN a report is created, THE system SHALL show it to moderators of the relevant community.

A report must include: the reported content, who reported it, and the reason for reporting.

WHEN a moderator views reports, THE system SHALL display:
1. The reported content (post or comment)
2. The reporting user's identifier
3. The report reason
4. The current status (pending, approved, or dismissed)

WHEN a moderator approves a report, THE system SHALL:
1. Delete the reported content
2. Update the report status to 'approved'
3. Record the moderator's approval action

WHEN a moderator dismisses a report, THE system SHALL:
1. Keep the reported content visible
2. Update the report status to 'dismissed'
3. Remove the dismissed report from the active reports list
4. Record the moderator's dismissal action

### Approval Authority

Moderators have authority to approve reports for their assigned communities.

A moderator's approval of a report results in content deletion.

A moderator's dismissal of a report results in content retention.

Only moderators assigned to a community can approve or dismiss reports for that community.

A moderator cannot approve or dismiss reports assigned to other communities.

### Ownership Hierarchy

Each community has one owner (the user who created the community).

Community owners have all moderator capabilities plus the ability to assign and remove moderators.

Moderators cannot assign other moderators—only owners can.

A user must be assigned as a moderator by an owner to gain moderator capabilities.

Moderator capabilities are limited to communities where they are explicitly assigned.

### Moderator Restrictions

Moderators cannot remove community owners.

Moderators cannot remove other moderators.

Only community owners can assign and remove moderators.

A moderator's actions are limited to the community where they have been assigned.

A moderator cannot delete posts or comments in communities where they are not assigned.

## admin Actor

Admins have the highest level of access across the entire platform. They possess all capabilities of moderators but across all communities without restriction. Admins can manage user accounts including suspending or reinstating accounts, oversee platform-wide moderation, and handle critical system issues. They can view all reports platform-wide, manage community ownership transfers, and enforce platform policies consistently. Admins are ultimately responsible for maintaining platform integrity while ensuring fair and consistent enforcement of rules.

### Admin Platform-Wide Access

Admins have unrestricted access to all communities and content across the platform.

WHEN an admin accesses any community feed, THE system SHALL show all posts regardless of subscription status.

WHEN an admin views any user's profile, THE system SHALL provide complete account details including suspended status.

WHERE a community has no moderators, THE system SHALL allow admins to perform moderation actions.


### Admin Content Visibility

WHILE viewing any post or comment on the platform, THE system SHALL indicate admin status of the viewer.

WHEN an admin sorts a feed by any criterion, THE system SHALL include all content regardless of community-specific restrictions.


### Cross-Community Administrative Tools

WHEN an admin accesses the platform-wide report management system, THE system SHALL display reports from all communities.

WHEN an admin reviews a user's activity, THE system SHALL aggregate posts, comments, votes, and subscriptions across all communities.

### User Account Management

Admins have full authority over user accounts, including viewing, managing, and controlling account status.

WHEN an admin accesses a user's account details, THE system SHALL display complete activity history including posts, comments, votes, and subscriptions.

WHEN an admin reviews a user's karma history, THE system SHALL show the complete breakdown of positive and negative adjustments.

WHEN an admin inspects a user's subscription history, THE system SHALL display all communities the user has ever subscribed to.


### Account Status Controls

WHEN an admin suspends a user account, THE system SHALL:
1. Immediately prevent the user from logging in
2. Block the user from creating or editing any content
3. Preserve all existing content for review
4. Record the suspension with timestamp and reason

WHEN an admin reinstates a suspended account, THE system SHALL:
1. Restore the user's ability to log in
2. Re-enable content creation capabilities
3. Maintain access to previously created content
4. Clear the suspension status


### Account Lifecycle Management

WHEN an admin initiates account deletion, THE system SHALL:
1. Queue all user's posts and comments for deletion
2. Remove all subscriptions associated with the user
3. Purge all votes cast by the user
4. Delete the user profile and authentication credentials
5. Record the deletion with timestamp and reason

WHEN an admin restores a recently deleted account, THE system SHALL recover all deleted content if within retention period.

### System Oversight Capabilities

Admins have comprehensive visibility into platform operations and content integrity.

WHEN an admin accesses the platform-wide analytics dashboard, THE system SHALL provide:
1. Total active users over time periods
2. Post and comment volume trends
3. Community growth statistics
4. Vote pattern analysis


### Content Monitoring

WHEN an admin searches across all content, THE system SHALL allow filtering by:
1. Content type (post, comment)
2. Community or all communities
3. Time range
4. User account status
5. Vote score thresholds

WHEN an admin reviews flagged content, THE system SHALL prioritize:
1. Reports with pending status
2. Reports from multiple users
3. High-traffic content with recent reports
4. Reports on content from banned users


### Moderation Oversight

WHEN an admin reviews community moderation actions, THE system SHALL display:
1. All moderator assignments and removals
2. All content deletions by moderators
3. All user bans and unbans
4. Report resolution patterns by community

WHEN an admin investigates moderator conduct, THE system SHALL track:
1. Disproportionate report dismissal rates
2. Deletion patterns outside moderator's community
3. Timing patterns suggesting bias
4. Community feedback on moderation

### Policy Enforcement Authority

Admins are responsible for ensuring platform policies are applied consistently across all communities.

WHEN an admin overrides community settings, THE system SHALL allow:
1. Temporary content removal for policy violations
2. Community-wide temporary restrictions
3. Special visibility settings for specific content


### Policy Violation Response

WHEN an admin identifies a policy violation across multiple communities, THE system SHALL allow:
1. Coordinated response across affected communities
2. Platform-wide temporary restrictions
3. Notification to all affected users
4. Documentation of violation patterns


### Rule Implementation

WHEN an admin updates platform policies, THE system SHALL:
1. Apply new rules to all existing content from the effective date
2. Notify affected users of changes
3. Preserve historical policy versions for reference
4. Track compliance with new policies

WHEN an admin creates an exception to platform rules, THE system SHALL:
1. Document the reason for the exception
2. Set an expiration time for the exception
3. Notify relevant stakeholders
4. Maintain audit trail of exception usage

### Owner Privileges and Community Management

Admins possess elevated privileges for community ownership and management.

WHEN an admin transfers community ownership, THE system SHALL:
1. Verify the new owner's account status
2. Update the ModeratorRole record accordingly
3. Notify both parties of the transfer
4. Record the transfer with timestamp and reason


### Community Leadership Oversight

WHEN an admin reviews community leadership, THE system SHALL provide:
1. History of ownership transfers
2. Current moderator roster and assignment dates
3. Community growth metrics
4. User engagement statistics


### Emergency Community Management

WHEN an admin assumes temporary community management, THE system SHALL:
1. Assign moderator privileges without changing ownership
2. Allow standard owner and moderator actions
3. Preserve original leadership hierarchy
4. Automatically restore original leadership after predefined period or manual action

WHEN an admin appoints emergency moderators, THE system SHALL:
1. Grant appropriate moderation privileges
2. Track emergency appointment status
3. Allow removal by original owners or higher admin authority
4. Log all emergency actions for review

### Account Suspension Protocols

Admins enforce suspension policies with specific protocols for consistency.

WHEN an admin applies a temporary suspension, THE system SHALL:
1. Specify the suspension duration in minutes
2. Display countdown timer in admin dashboard
3. Automatically reinstate account after duration expires
4. Notify user of suspension end time


### Suspension Guidelines

WHEN an admin applies a suspension, THE system SHALL require:
1. Selection of appropriate duration from predefined options
2. Entry of specific policy violation reason
3. Link to relevant platform policy section
4. Optional additional context field


### Suspension Appeal Process

WHEN a suspended user submits an appeal, THE system SHALL:
1. Route the appeal to an admin for review
2. Pause the suspension pending review if designated
3. Allow admin to confirm, modify, or reverse suspension
4. Notify user of appeal decision with reason

WHEN an admin reviews a suspension appeal, THE system SHALL allow:
1. Access to original violation evidence
2. User's submission history
3. Community context of violations
4. Previous warnings issued to the user

### Critical Issue Resolution

Admins are primary responders to critical platform issues and emergencies.

WHEN an admin activates emergency mode, THE system SHALL:
1. Display platform-wide notification to all users
2. Restrict new content creation by non-admin users
3. Maintain existing content accessibility
4. Record activation timestamp and authorized admin


### Critical Incident Response

WHEN an admin identifies a critical issue, THE system SHALL:
1. Create incident ticket with priority level
2. Assign response team members as needed
3. Establish communication channels
4. Track resolution progress in real-time


### System Recovery Authority

WHEN an admin executes system recovery procedures, THE system SHALL:
1. Allow selective data restoration by time period
2. Preserve post-recovery state for audit
3. Notify relevant stakeholders of recovery scope
4. Document all recovery actions taken


### Emergency Content Controls

WHEN an admin implements emergency content controls, THE system SHALL:
1. Allow rapid content removal by user, community, or keyword
2. Enable temporary posting restrictions
3. Maintain audit log of all emergency actions
4. Automatically release controls after predefined period or manual action

# Authentication Flows

Registration, login, session management, and token policies.

## Registration and Login

Define user registration and login flows including validation and error handling.

### User Registration

WHEN a guest initiates registration, THE system SHALL:
1. Require email address
2. Require a password meeting minimum complexity requirements
3. Require a unique username
4. Require display name
5. Collect optional bio text
6. Accept optional avatar image

IF the email address is already registered, THE system SHALL reject the request.
IF the username is already taken, THE system SHALL reject the request.
IF the password does not meet complexity requirements, THE system SHALL reject the request.

WHEN registration is successful, THE system SHALL:
1. Create a new member account
2. Assign initial karma score of 0
3. Create initial subscription to the platform's default community
4. Generate an authentication token
5. Return the authentication token to the client

### User Login

WHEN a member attempts to log in, THE system SHALL:
1. Accept email address and password credentials
2. Verify the credentials against stored account information
3. Validate the account is not suspended or deleted

IF the credentials are invalid, THE system SHALL reject the request.
IF the account has been deleted, THE system SHALL reject the request.

WHEN login is successful, THE system SHALL:
1. Validate the account status is active
2. Generate a fresh authentication token
3. Update the last login timestamp
4. Return the authentication token to the client

### Authentication Token Management

WHEN a member presents a valid authentication token, THE system SHALL:
1. Validate the token has not expired
2. Verify the token's signature and integrity
3. Retrieve the associated user account

IF the token is expired, THE system SHALL reject the request.
IF the token is invalid or tampered, THE system SHALL reject the request.
IF the associated account has been deleted, THE system SHALL invalidate the token.

WHEN a member is authenticated, THE system SHALL:
1. Grant member-level permissions
2. Enable access to personalized feeds
3. Allow content creation operations
4. Enable voting functionality
5. Allow karma accumulation

### Authentication Error Handling

WHEN authentication fails due to invalid credentials, THE system SHALL:
1. Return a generic authentication failure message
2. NOT disclose whether the email exists in the system
3. Log the failed attempt for security monitoring

WHEN authentication fails due to account status, THE system SHALL:
1. Distinguish between deleted and suspended accounts
2. Provide appropriate error messaging for suspended accounts
3. Indicate deletion for permanently removed accounts

WHERE authentication is required, THE system SHALL:
1. Require a valid token for protected operations
2. Reject operations from unauthenticated sessions
3. Provide clear error indication for authentication failures

## Session and Token Policy

Define session duration, token refresh, and expiration policies.

### Session Duration and Management

WHEN a user successfully logs in, THE system SHALL create a new session.

WHEN a session is created, THE system SHALL assign:
1. A unique session identifier
2. An access token in JWT format
3. A refresh token

WHEN a user's session expires, THE system SHALL:
1. Invalidate the access token
2. Invalidate the refresh token
3. Require re-authentication to create a new session

WHERE a session is active, THE system SHALL:
1. Keep track of session creation time
2. Store session metadata (IP address, user agent)
3. Allow session termination on demand

WHEN a user logs out, THE system SHALL:
1. Immediately invalidate the current session
2. Remove the refresh token from the active token list
3. Return a success response

THE system SHALL maintain session state for 14 days from last activity.

WHILE a session is active, THE system SHALL include the user's role information in the access token payload.

### Token Refresh and Expiration

WHEN an access token is nearing expiration, THE system SHALL:
1. Allow token refresh using a valid refresh token
2. Issue a new access token with extended validity
3. Maintain the same session context

WHERE a refresh token is used, THE system SHALL:
1. Verify the refresh token's validity
2. Confirm the user's account is not suspended or deleted
3. Update the refresh token's last use timestamp

IF a refresh token has expired, THE system SHALL:
1. Reject the refresh request
2. Invalidate the expired refresh token
3. Require the user to re-authenticate

WHEN a user changes their password, THE system SHALL:
1. Invalidate all existing refresh tokens
2. Require new authentication for all active sessions
3. Create new session credentials

THE system SHALL:
1. Limit access token validity to 2 hours
2. Limit refresh token validity to 14 days
3. Use cryptographic signing for all JWT tokens

WHERE a token is invalid or expired, THE system SHALL:
1. Return an appropriate error response
2. Not expose sensitive information about the token failure
3. Log security-relevant token failures

# Account Lifecycle

Account state transitions and lifecycle management.

## Account States and Transitions

Define account states (active, suspended, deleted) and valid transitions.

### Account States

THE system SHALL support three account states: active, suspended, and deleted.

An account in the active state SHALL allow the user to log in, create content, and interact with the platform.

An account in the suspended state SHALL prevent the user from logging in and performing any actions, but preserve all content and data for potential restoration.

An account in the deleted state SHALL indicate permanent removal of the account, with all associated content and data irreversibly removed.

When an account is created, THE system SHALL set its state to active.

### Account Lifecycle Transitions

WHEN a user successfully registers, THE system SHALL transition the account from pending to active.

WHEN a user is suspended by a moderator or admin, THE system SHALL transition the account from active to suspended.

WHEN a user account is permanently deleted, THE system SHALL transition the account from active or suspended to deleted.

WHEN a suspended account is restored by an admin, THE system SHALL transition the account from suspended to active.

WHEN an account transitions to deleted, THE system SHALL permanently remove the user and all their content.

WHERE an account is suspended, THE system SHALL preserve all user content for potential restoration.

WHERE an account is deleted, THE system SHALL remove the user's data according to the business rules.

### Account Suspension

WHEN a moderator suspends a user account, THE system SHALL transition the account to suspended state.

WHEN an admin suspends a user account, THE system SHALL transition the account to suspended state.

WHILE an account is suspended, THE system SHALL reject all login attempts.

WHILE an account is suspended, THE system SHALL prevent the user from creating posts or comments.

WHILE an account is suspended, THE system SHALL prevent the user from voting on posts or comments.

WHILE an account is suspended, THE system SHALL prevent the user from subscribing to communities.

WHEN a suspension is applied, THE system SHALL record the reason for suspension and the acting moderator/admin.

WHEN a suspension is applied, THE system SHALL notify the user of the suspension and its duration (if applicable).

### Account Deletion

WHEN a user requests account deletion, THE system SHALL transition the account to deleted state.

WHEN an admin permanently deletes an account, THE system SHALL transition the account to deleted state.

WHEN an account transitions to deleted, THE system SHALL remove the user's email, password, and authentication credentials.

WHEN an account transitions to deleted, THE system SHALL remove all posts created by the user.

WHEN an account transitions to deleted, THE system SHALL remove all comments created by the user.

WHEN an account transitions to deleted, THE system SHALL remove all votes cast by the user.

WHEN an account transitions to deleted, THE system SHALL remove all subscriptions associated with the user.

WHEN an account transitions to deleted, THE system SHALL remove all moderation roles held by the user.

WHEN an account transitions to deleted, THE system SHALL remove all reports filed by the user.

### Account Deactivation

WHEN a user temporarily deactivates their account, THE system SHALL transition the account from active to suspended state.

WHEN a user reactivates their account, THE system SHALL transition the account from suspended to active state.

WHEN an account is temporarily deactivated, THE system SHALL preserve all user content, votes, and subscriptions.

WHILE an account is suspended due to temporary deactivation, THE system SHALL prevent login attempts.

WHEN a temporary deactivation expires, THE system SHALL automatically transition the account to deleted state.

WHERE an account is temporarily deactivated, THE system SHALL preserve the user's karma score, post history, and comment history for reactivation.