**redditLike — Data isolation, business rules, filtering/sorting/pagination, error catalog**

Data isolation, business rules, filtering/sorting/pagination, error catalog

# Data Isolation and Ownership

Data ownership rules and tenant/user-level isolation policies.

## Ownership and Isolation Rules

Define data ownership semantics and isolation boundaries for multi-user access.

### Data Ownership Rules

### Post Ownership

WHEN a user creates a post, THE system SHALL:
1. Assign the creating user as the post owner
2. Associate the post with the community where it was created
3. Set the post type based on provided content (text, link, or image)
4. Store the creation timestamp

WHILE a post exists, THE system SHALL:
1. Allow only the post owner to edit the post
2. Allow only the post owner to delete the post
3. Prevent other users (including moderators) from editing or deleting the post
4. Preserve ownership information even when the post is moved or referenced

THE system SHALL NOT allow post ownership to be transferred to another user.

### Comment Ownership

WHEN a user creates a comment, THE system SHALL:
1. Assign the creating user as the comment owner
2. Associate the comment with the post it belongs to
3. Store the creation timestamp
4. Set the parent reference (either the post or another comment for threading)

WHILE a comment exists, THE system SHALL:
1. Allow only the comment owner to edit the comment
2. Allow only the comment owner to delete the comment
3. Preserve ownership information even when the comment is nested deeply

THE system SHALL NOT allow comment ownership to be transferred to another user.

### Community Ownership

WHEN a user creates a community, THE system SHALL:
1. Assign the creating user as the community owner
2. Assign the CreatorRole with the 'owner' role type to that user
3. Set the subscriber count to zero initially

WHILE a community exists, THE system SHALL:
1. Grant the community owner exclusive rights to add or remove moderators
2. Grant the community owner exclusive rights to delete the community
3. Preserve community ownership information regardless of moderator changes

THE system SHALL NOT allow community ownership to be transferred to another user.

### User-Level Data Isolation

### User Profile Isolation

WHEN a user views another user's profile, THE system SHALL:
1. Display only publicly available information (display name, bio, avatar, karma score)
2. Show only posts and comments that are publicly visible
3. Filter out any posts or comments from private communities the viewing user doesn't subscribe to

WHEN a user views their own profile, THE system SHALL:
1. Display all their posts and comments regardless of community visibility
2. Allow access to private community posts and comments they created

WHEN a user modifies their profile information, THE system SHALL:
1. Ensure only the profile owner can update their display name, bio, or avatar
2. Validate that email and username remain unchanged after account creation

### Vote Data Isolation

WHEN a user votes on a post or comment, THE system SHALL:
1. Create a vote record associated only with that user and content
2. Prevent other users from seeing the specific vote value of other users
3. Ensure only one vote record exists per user per content item

WHEN vote data is retrieved, THE system SHALL:
1. Return only aggregated vote scores (not individual user votes)
2. Return only the current user's vote value for a given content item
3. Never expose vote history to other users

### Subscription Isolation

WHEN a user subscribes to a community, THE system SHALL:
1. Create a subscription record associated only with that user and community
2. Ensure subscription data is private between the user and the platform

WHEN retrieving subscription information, THE system SHALL:
1. Allow users to view only their own subscriptions
2. Display community subscriber counts as aggregated statistics only
3. Prevent users from viewing other users' subscription lists

### Community-Level Isolation

### Community Content Access Control

WHEN a user accesses a community, THE system SHALL:
1. Allow view access to all public community content
2. Allow content creation only if the user is subscribed to the community
3. Enforce ban status to prevent banned users from creating posts or comments

WHEN a user searches for communities, THE system SHALL:
1. Return only communities where the user has view permissions
2. Exclude communities the user is banned from from search results

### Moderator Role-Based Isolation

WHEN a user performs moderation actions, THE system SHALL:
1. Check that the user has appropriate ModeratorRole for the target community
2. Enforce role hierarchy: owner > moderator > non-member
3. Prevent moderators from acting on content from communities they moderate
4. Prevent moderators from removing owners from their community

WHEN a moderator accesses moderation tools, THE system SHALL:
1. Allow visibility only into reports and content for their assigned communities
2. Prevent access to moderation tools for communities outside their jurisdiction
3. Ensure moderators can only ban/unban users from communities they moderate

### Multi-User Access Control

### Concurrent Access Handling

WHEN multiple users interact with the same content simultaneously, THE system SHALL:
1. Prevent conflicting edits by using optimistic concurrency control
2. Reject edits when content has been modified since the user last retrieved it
3. Provide clear error messaging when concurrent modification conflicts occur

WHEN multiple votes are cast simultaneously, THE system SHALL:
1. Ensure atomic vote updates to prevent race conditions
2. Maintain accurate vote counts by processing votes in isolation
3. Prevent users from casting multiple votes on the same content

### Access Verification

WHEN any user attempts to access or modify content, THE system SHALL:
1. Verify the user's authentication status
2. Check ownership permissions for the target resource
3. Validate user roles within the relevant community context
4. Confirm the user's subscription status for creation actions

THE system SHALL reject any request that fails any access verification step.

### Data Access Restrictions

### Report Data Access Control

WHEN a user creates a report, THE system SHALL:
1. Associate the report with the reporting user, reported content, and community
2. Store the report reason and timestamp
3. Set the initial status to 'pending'

WHEN a moderator accesses reports, THE system SHALL:
1. Show only reports for content in communities they moderate
2. Hide all report data from users who are not moderators
3. Prevent reporters from viewing the status of their own reports

### Deleted Content Access

WHEN content is deleted by its owner, THE system SHALL:
1. Permanently remove the content and all associated votes
2. Remove all nested comments and their associated votes
3. Update aggregate counts (comment counts, subscriber counts) accordingly

WHEN content is deleted by a moderator, THE system SHALL:
1. Maintain a reference to the deleted content for audit purposes
2. Hide the deleted content from all users except moderators
3. Preserve vote and report history for moderation auditing

### Karma Calculation Isolation

THE system SHALL calculate karma scores:
1. By summing all vote values for a user's posts and comments
2. In real-time when votes are added, changed, or removed
3. Including negative values when downvotes exceed upvotes

WHEN a user views their own karma, THE system SHALL:
1. Display the current aggregated karma score
2. Include votes from deleted posts and comments in historical calculations
3. Update the display immediately when vote changes occur

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must register with a unique email address that hasn't been used before by an active account. Each user chooses a unique username that cannot be changed after registration. Passwords must meet security requirements and cannot be empty. Users can update their display name, bio, and avatar at any time, but cannot impersonate others through these profile fields. Account deletion is permanent and irrevocable, removing all associated posts and comments. Users cannot have multiple active accounts, and attempted duplicate registrations are blocked. Profile visibility is public for all registered users. Users retain ownership of their content until account deletion occurs.

### Unique Email Requirement

WHEN a user registers, THE system SHALL require a unique email address that has not been used by any other active account.

IF the email address is already associated with an existing active account, THE system SHALL reject the registration.

IF the email address format is invalid, THE system SHALL reject the registration.

A user can update their email address at any time, but the new email must also be unique across the platform.

THE system SHALL treat email addresses as case-insensitive for uniqueness verification.

### Username Immutability

WHEN a user registers, THE system SHALL assign a username that cannot be changed afterward.

IF a user attempts to modify their username, THE system SHALL reject the request.

The username must be unique at registration and remain immutable for the user's account lifetime.

THE system SHALL use the username to identify the user in public contexts such as posts and comments.

### Password Security Rules

WHEN a user registers, THE system SHALL require a password that meets the following security criteria:
1. Minimum length of 8 characters
2. Contains at least one uppercase letter
3. Contains at least one lowercase letter
4. Contains at least one numeric character
5. Does not contain spaces

WHEN a user changes their password, THE system SHALL enforce the same security rules.

IF the password does not meet these requirements, THE system SHALL reject the registration or password change request.

THE system SHALL never store passwords in plaintext.

### Account Deletion Permanence

WHEN a user initiates account deletion, THE system SHALL permanently remove the account.

THE system SHALL delete all posts created by the user.

THE system SHALL delete all comments created by the user.

THE system SHALL permanently delete the account, making it impossible to restore.

IF an account deletion request is processed, THE system SHALL not retain any user data beyond what is required by law.

THE system SHALL not allow account recovery after deletion is completed.

### Profile Update Permissions

WHEN a user accesses their profile settings, THE system SHALL allow editing of display name, bio, and avatar.

A user can only update their own profile information.

WHEN updating the display name, THE system SHALL prevent impersonation of other users.

WHEN updating the bio, THE system SHALL accept text content up to a reasonable length.

WHEN updating the avatar, THE system SHALL validate the image file format and size.

### Duplicate Account Prevention

THE system SHALL prevent registration of multiple accounts by the same person.

WHEN registration is attempted with an email address already in use, THE system SHALL reject the request.

WHEN duplicate account creation is detected, THE system SHALL disable the newer account.

THE system SHALL maintain a policy preventing users from managing multiple active accounts simultaneously.

### Content Ownership Retention

WHEN a user registers, THE system SHALL establish content ownership for all posts and comments created by that user.

The user retains ownership of their content until account deletion occurs.

During account deletion, all owned content is permanently removed along with the account.

Content ownership does not transfer between users, even during profile updates.

## Community Rules

Any registered user can create a community, with the creator automatically becoming its owner. Community names must be unique across the platform and cannot be changed after creation. Each community requires a description and may optionally have an icon. The community owner has exclusive authority to add and remove moderators. Community creation does not require subscription to existing communities. Users cannot create communities with names that violate platform naming policies. Communities exist independently of their owner's subscription status. Subscribers cannot create new communities with identical names to existing ones.

### Community Creation and Ownership

WHEN a user creates a community, THE system SHALL:
1. Automatically assign the creating user as the owner of the community
2. Require the community to have a unique name
3. Require the community to have a description
4. Allow an optional icon image
5. Initialize the subscriber count to zero

IF the creating user is not an active member, THE system SHALL reject the request.
IF the community name is not unique, THE system SHALL reject the request.

### Unique Name Requirement

THE system SHALL ensure every community has a unique name across the platform.

IF a user attempts to create a community with a name that already exists, THE system SHALL reject the request.

IF a user attempts to change a community's name after creation, THE system SHALL reject the request.

THE system SHALL allow communities to exist independently of their owner's subscription status.

### Owner Authority Delegation

WHEN a community owner adds a moderator, THE system SHALL:
1. Create a ModeratorRole record with role='moderator'
2. Grant the new moderator permission to delete posts in the community
3. Grant the new moderator permission to delete comments in the community
4. Grant the new moderator permission to ban users from the community

WHEN a community owner removes a moderator, THE system SHALL:
1. Delete the corresponding ModeratorRole record
2. Revoke all moderator permissions for that user in the community

IF a non-owner user attempts to add or remove a moderator, THE system SHALL reject the request.

IF a moderator attempts to remove the community owner, THE system SHALL reject the request.

### Name Immutability Policy

THE system SHALL prevent any changes to a community's name after creation.

WHEN a user attempts to update a community's name, THE system SHALL reject the request with an error indicating names cannot be changed.

THE system SHALL maintain a unique constraint on community names for the lifetime of the community.

IF a community is deleted, its name becomes available for reuse after the deletion is complete.

### Community Independence

WHEN a user creates a community, THE system SHALL NOT require the user to be subscribed to any existing community.

THE system SHALL allow communities to exist and function independently of their owner's subscription status.

WHEN a user unsubscribes from a community they own, THE system SHALL NOT affect the community's existence or properties.

WHEN a community owner's account is deleted, THE system SHALL NOT automatically delete the community.

THE system SHALL preserve community data, subscriptions, and moderation structure regardless of owner status changes.

### Naming Policy Enforcement

WHEN a user attempts to create a community with a name that violates platform naming policies, THE system SHALL reject the request.

THE system SHALL enforce consistent naming rules for all communities across the platform.

IF a community name becomes invalid due to platform policy changes, THE system SHALL not automatically update the community but shall prevent new communities with invalid names.

WHEN searching for communities, THE system SHALL include only communities with valid names.

### Subscription Independence

WHEN a user subscribes to a community, THE system SHALL NOT require the user to own or create any community.

WHEN a user unsubscribes from a community, THE system SHALL NOT affect the user's ability to create new communities.

WHEN viewing a community, THE system SHALL display subscriber counts independently of individual user subscription status.

THE system SHALL allow guests to view communities without requiring subscription.

## Post Rules

Users can only create posts in communities they are subscribed to. Each post must have a title, and must be one of three types: text post with content, link post with URL, or image post with uploaded image. Users can only edit or delete posts they authored. Link posts require a valid URL format, and image posts require a valid image file upload. Posts cannot be created in communities that no longer exist. Vote scores for posts can go negative based on downvotes. Posts show the author's username and community name publicly. Editing a post preserves its original creation timestamp while updating the last-edited timestamp.

### Post Creation Requirements

### Subscription Requirement for Posting

WHEN a user attempts to create a post in a community, THE system SHALL verify they are subscribed to that community.
IF the user is not subscribed to the community, THE system SHALL reject the post creation request.

### Community Existence Validation

WHEN a user attempts to create a post, THE system SHALL verify the target community exists.
IF the community does not exist, THE system SHALL reject the post creation request.

### Post Type Classification

A post must be one of three types:
- Text post: contains text content only
- Link post: contains a URL reference
- Image post: contains an uploaded image

### Single Content Constraint

WHEN a post is created, THE system SHALL ensure only one content type is present.
IF multiple content fields are provided (e.g., both text and URL), THE system SHALL reject the request.

### Post Content Validation

### Title Requirement

WHEN a post is created, THE system SHALL require a non-empty title.
IF the title is missing or empty, THE system SHALL reject the post creation request.

### Valid URL Format for Link Posts

WHEN creating a link post, THE system SHALL validate the URL field contains a properly formatted URL.
IF the URL format is invalid, THE system SHALL reject the post creation request.

### Image Upload Validation

WHEN creating an image post, THE system SHALL validate the image file meets format requirements.
IF the image file format is invalid, THE system SHALL reject the post creation request.

### Content Presence Validation

WHEN creating a text post, THE system SHALL require non-empty text content.
IF the text content is missing or empty, THE system SHALL reject the post creation request.

### Authorship and Editing Rules

### Authorship Attribution

WHEN a post is created, THE system SHALL record and permanently associate the author's username.
WHEN displaying a post, THE system SHALL show the author's username publicly.

### Author-Only Editing

WHEN a user attempts to edit a post, THE system SHALL verify the user is the post's author.
IF the user is not the author, THE system SHALL reject the edit request.

### Author-Only Deletion

WHEN a user attempts to delete a post, THE system SHALL verify the user is the post's author.
IF the user is not the author, THE system SHALL reject the deletion request.

### Vote Score Management

### Negative Vote Support

WHEN a post receives more downvotes than upvotes, THE system SHALL allow the vote score to become negative.
THE vote score is calculated as: upvotes minus downvotes, and can be any integer value.

### Metadata and Timestamps

### Creation Timestamp Preservation

WHEN a post is edited, THE system SHALL preserve the original creation timestamp.
THE system SHALL update a separate last-edited timestamp while keeping the creation timestamp unchanged.

## Comment Rules

Users can comment on any post regardless of subscription status. Comments can be nested with no depth limit, enabling threaded conversations. Users can only edit or delete comments they authored. Comment content must be non-empty and cannot exceed platform length limits. Each comment inherits the visibility rules of its parent post. Comment authors retain ownership of their content. Users can reply to any comment in the thread hierarchy. Comments supportvote scoring with upvotes and downvotes affecting the displayed score. Comment editing preserves the original creation timestamp.

### Universal Comment Eligibility

WHEN any user accesses a post, THE system SHALL allow them to create a comment on that post.

GUESTS can view comments but CANNOT create them.

MEMBERS can create comments on any post regardless of subscription status.

### Unlimited Comment Depth

WHEN a user creates a comment as a reply to another comment, THE system SHALL allow unlimited nesting depth.

WHILE a comment thread exists, THE system SHALL support adding replies at any level of the hierarchy.

Each reply can itself be replied to, creating a chain of arbitrary length.

### Author-Only Editing

WHEN a user attempts to edit a comment, THE system SHALL verify the user is the comment's author.

IF the user is not the comment's author, THE system SHALL reject the edit request.

WHILE a comment remains active, THE system SHALL allow the author to modify its content.

### Non-Empty Content Requirement

WHEN a user creates a comment, THE system SHALL require non-empty content.

IF the comment content consists only of whitespace, THE system SHALL reject the request.

IF the comment content is empty or null, THE system SHALL reject the request.

### Visibility Inheritance

WHILE a comment is visible on a post, THE system SHALL apply the same visibility rules as its parent post.

IF a post becomes unavailable to a user (unauthorized), THE system SHALL prevent that user from viewing related comments.

WHEN a post's visibility changes, THE system SHALL reflect the same visibility change for all comments on that post.

### Content Ownership Retention

WHEN a user creates a comment, THE system SHALL record the user as the comment's author.

THE system SHALL maintain comment ownership with the original author regardless of subsequent edits.

IF the original author deletes their account, THE system SHALL delete the comment content along with the account.

### Thread Hierarchy Support

WHEN a user creates a comment in response to an existing comment, THE system SHALL record the parent comment reference.

WHEN displaying a comment thread, THE system SHALL show nested replies in their hierarchical structure.

WHILE viewing a comment thread, THE system SHALL maintain parent-child relationships at all nesting levels.

### Vote Scoring Support

WHEN a user upvotes a comment, THE system SHALL increase the comment's vote score by 1.

WHEN a user downvotes a comment, THE system SHALL decrease the comment's vote score by 1.

WHEN a user removes their vote from a comment, THE system SHALL adjust the comment's vote score accordingly.

THE system SHALL allow users to change their vote from upvote to downvote or vice versa.

### Comment List Sorting

WHEN viewing comments on a post, THE system SHALL support three sorting options:
1. Best: Show comments with highest vote score first
2. New: Show most recently created comments first
3. Controversial: Show comments with many votes but score close to zero first

WHEN the sort order is 'Controversial', THE system SHALL rank comments by vote count while penalizing extreme scores.

### Comment Deletion

WHEN a user deletes their own comment, THE system SHALL remove the comment and all its replies from view.

WHEN a moderator deletes a comment, THE system SHALL remove the comment and all its replies from view.

WHEN a comment is deleted, THE system SHALL retain deletion status for historical consistency in comment counts.

### Comment Visibility Rules

WHEN a user views a comment, THE system SHALL verify they have access to the parent post.

IF a user cannot view the parent post, THE system SHALL prevent them from viewing the comment.

WHILE a user has access to a post, THE system SHALL allow them to view all comments on that post regardless of subscription status.

## Vote Rules

Each user can cast only one vote per post or comment at a time. Votes must be either upvote (+1) or downvote (-1), with no neutral option. Users can change their vote from upvote to downvote, downvote to upvote, or remove their vote entirely. Removing a vote restores the original score before the vote was cast. Vote changes are immediate and reflected in real-time. Users cannot vote on their own posts or comments. Vote creation and updates happen instantly without confirmation. Vote history is tracked to enforce the one-vote-per-user limit. Negative vote scores are supported and displayed as negative numbers.

### One Vote Per User Limit

WHEN a user attempts to cast a vote on a post or comment they have already voted on, THE system SHALL reject the request.

WHEN a user attempts to cast a vote on their own post or comment, THE system SHALL reject the request.

WHEN a user casts a vote, THE system SHALL ensure no other vote record exists for that user on that specific post or comment.

THE system SHALL maintain a unique constraint that enforces at most one active vote per user per content item.

### Vote Value Options

WHEN a user votes on a post or comment, THE system SHALL accept only two valid vote values: +1 for upvote or -1 for downvote.

IF a vote value other than +1 or -1 is provided, THE system SHALL reject the request.

THE system SHALL not allow neutral or zero-value votes.

### Vote Change Flexibility

WHEN a user changes their vote on a post or comment (e.g., from upvote to downvote), THE system SHALL apply the new vote immediately.

WHEN a user changes their vote, THE system SHALL calculate the new vote score by applying the difference between the new value and the previous vote value.

For example, if a user had upvoted (+1) and changes to downvote (-1), the score changes by -2.

### Vote Removal Support

WHEN a user removes their vote from a post or comment, THE system SHALL revert the vote score by subtracting the removed vote value.

For example, if a user had upvoted (+1) and removes the vote, the score decreases by +1.

WHEN a vote is removed, THE system SHALL mark the vote record as inactive while preserving history for audit purposes.

### Self-Vote Prohibition

IF a user attempts to vote on their own post, THE system SHALL reject the request.

IF a user attempts to vote on their own comment, THE system SHALL reject the request.

THE system SHALL prevent vote creation when the voting user is identical to the content owner.

### Immediate Vote Application

WHEN a valid vote is cast, THE system SHALL immediately update the vote score for the associated post or comment.

WHEN a vote is changed or removed, THE system SHALL immediately recalculate and update the vote score for the associated post or comment.

The vote score display SHALL reflect changes without requiring page refresh or manual update.

### Vote History Tracking

THE system SHALL maintain a complete history of all votes cast, including timestamps and previous values for changes and removals.

WHEN a user changes their vote, THE system SHALL record the previous vote value and the time of change.

WHEN a user removes their vote, THE system SHALL record the removed vote value and the time of removal.

### Negative Score Support

THE system SHALL allow vote scores to be negative values.

WHEN a post or comment receives more downvotes than upvotes, THE system SHALL display the negative score as a negative number.

THE system SHALL not apply a minimum score floor of zero.

## Subscription Rules

Users can subscribe to any community at any time, and subscriptions are created immediately upon request. Users can unsubscribe from any community, with subscriptions updating in real-time. The subscription status defaults to subscribed when a subscription record is created. Users must be subscribed to a community before they can create posts in it. Subscribing to a community does not affect existing subscriptions to other communities. Users can view their own list of subscribed communities at any time. Subscription state changes are permanent until explicitly reversed. Communities show subscriber counts that update in real-time.

### Immediate Subscription Creation

WHEN a user subscribes to a community, THE system SHALL immediately create the subscription record and make it active.

WHEN the subscription is created, THE system SHALL automatically set the status to subscribed.

IF the user is already subscribed to the community, THE system SHALL reject the subscription request.

WHEN the subscription is created, THE system SHALL update the community's subscriber count by incrementing it by 1.

THE system SHALL allow users to subscribe to any community without requiring prior approval from moderators or owners.

### Real-Time Unsubscribe

WHEN a user unsubscribes from a community, THE system SHALL immediately update the subscription status to unsubscribed.

WHEN the subscription is updated to unsubscribed, THE system SHALL update the community's subscriber count by decrementing it by 1.

WHEN a user unsubscribes, THE system SHALL immediately prevent them from creating new posts in that community.

WHEN a user unsubscribes, THE system SHALL maintain a record of the subscription with the unsubscribed status for audit purposes.

WHEN a user attempts to view a community feed after unsubscribing, THE system SHALL exclude posts from that community in their home feed.

### Default Subscribed Status

WHEN a user first subscribes to a community, THE system SHALL set the subscription status to subscribed by default.

WHEN a subscription is created, THE system SHALL NOT allow the status to be set to unsubscribed directly during creation.

WHEN a user re-subscribes to a community after previously unsubscribing, THE system SHALL set the status to subscribed (not retain the previous unsubscribed status).

WHERE a subscription record exists, THE system SHALL only allow status values of subscribed or unsubscribed.

### Post Creation Requirement

WHEN a user attempts to create a post in a community, THE system SHALL verify they are subscribed to that community.

IF the user is not subscribed to the community, THE system SHALL reject the post creation request.

WHEN the subscription requirement check passes, THE system SHALL allow the post to be created in the community.

WHEN a user unsubscribes from a community, THE system SHALL allow them to retain visibility of existing posts they created in that community, but prevent new post creation.

### Community Independence

WHEN a user subscribes to one community, THE system SHALL NOT affect their subscriptions to other communities.

WHEN a user unsubscribes from one community, THE system SHALL NOT affect their subscriptions to other communities.

THE system SHALL allow users to be subscribed to any number of communities simultaneously.

WHEN managing subscriptions, THE system SHALL treat each community subscription as an independent record with its own status.

### Subscription List Visibility

WHEN a user requests their own subscription list, THE system SHALL return all communities they are subscribed to.

WHEN displaying the subscription list, THE system SHALL include the community name, icon, and description.

WHEN displaying the subscription list, THE system SHALL include the subscriber count for each community.

THE system SHALL allow users to sort their subscription list alphabetically by community name.

WHEN a user attempts to view another user's subscription list, THE system SHALL not grant access (subscription lists are private to each user).

### Subscription State Permanence

WHEN a user changes their subscription status from subscribed to unsubscribed, THE system SHALL maintain this change until the user explicitly re-subscribes.

WHEN a user unsubscribes from a community, THE system SHALL preserve historical data about their subscription period for analytics purposes.

WHEN a user re-subscribes to a community, THE system SHALL treat this as a new subscription event and reset the subscription timestamp.

THE system SHALL NOT automatically expire active subscriptions without explicit user action or administrative intervention.

### Subscriber Count Update

WHEN a new subscription is created, THE system SHALL increment the community's subscriber count by 1.

WHEN a subscription status changes to unsubscribed, THE system SHALL decrement the community's subscriber count by 1.

WHEN a community is deleted, THE system SHALL remove all associated subscriber counts from the platform total.

THE system SHALL display the current subscriber count on the community's public page.

WHERE subscriber count is displayed, THE system SHALL show the exact count value (no approximations or ranges).

## ModeratorRole Rules

The community creator automatically becomes the owner with highest authority. Only the owner can add or remove moderators from their community. Moderators can add other moderators but cannot remove the owner or other moderators. Owner status cannot be transferred except by account deletion. A user can hold only one moderator role per community at a time. Moderators gain their permissions only after being officially added. Banned users cannot post or comment but retain viewing access. Moderator removal by the owner is immediate and does not require confirmation. The owner can view all moderator roles for their community at any time.

### Automatic Owner Assignment

WHEN a user creates a community, THE system SHALL automatically assign them the owner role in that community.

WHILE the community exists, THE system SHALL ensure the owner role is always associated with exactly one user—the original creator.

IF the community creator's account is deleted, THE system SHALL retain the owner role association with their original user record (even if removed from active users).

THE system SHALL NOT allow automatic assignment of the owner role to any user other than the original community creator.

### Owner-Only Role Management

WHEN a user attempts to add a moderator to a community, THE system SHALL verify they hold the owner role for that community.

WHEN a user attempts to remove a moderator from a community, THE system SHALL verify they hold the owner role for that community.

IF a user without the owner role attempts to add a moderator, THE system SHALL reject the request.

IF a user without the owner role attempts to remove a moderator, THE system SHALL reject the request.

WHERE a user holds the owner role, THE system SHALL allow them to view all moderator roles for their community at any time.

### Moderator Delegation Limits

WHEN a moderator attempts to add another user as a moderator, THE system SHALL reject the request.

WHEN a moderator attempts to remove another moderator, THE system SHALL reject the request.

WHEN a moderator attempts to remove the owner, THE system SHALL reject the request.

WHERE a user holds the owner role, THE system SHALL allow them to add and remove moderators at their discretion.

THE system SHALL ensure moderator role assignments are chainable only from owner to moderator, not peer-to-peer among moderators.

### Irreversible Owner Status

WHEN an owner attempts to transfer their ownership to another user, THE system SHALL reject the request.

WHILE a user holds the owner role for a community, THE system SHALL allow them to maintain that role indefinitely unless their account is deleted.

IF the owner's account is deleted, THE system SHALL retain the owner role association in an archived state.

WHEN a community is deleted, THE system SHALL remove all associated owner roles.

THE system SHALL NOT provide any mechanism for demoting an owner to moderator status.

### Single Role Per User Rule

WHEN a user already holds a moderator role in a community attempts to subscribe again, THE system SHALL maintain their existing role.

WHEN a user attempts to be added as a moderator to a community where they already hold any role, THE system SHALL reject the request.

WHERE a user holds the owner role for a community, THE system SHALL prevent them from acquiring another role (moderator) in the same community.

THE system SHALL enforce exactly one moderator role record per user-per-community combination.

### Immediate Permission Grant

WHEN a user is added as a moderator to a community, THE system SHALL immediately grant them moderation permissions for that community.

WHILE a user holds a valid moderator role, THE system SHALL allow them to perform moderation actions without additional verification.

IF a user's moderator role is revoked, THE system SHALL immediately remove their moderation permissions for that community.

THE system SHALL allow immediate application of moderation actions once role assignment is confirmed.

### Viewing Access Retention

WHEN a user is banned from a community, THE system SHALL maintain their ability to view community content (posts and comments).

WHEN a user is banned from a community, THE system SHALL prevent them from creating new posts in that community.

WHEN a user is banned from a community, THE system SHALL prevent them from creating new comments in that community.

WHERE a user holds any moderator role in a community, THE system SHALL grant them viewing access regardless of ban status.

### Moderator Visibility

WHERE a user holds the owner role for a community, THE system SHALL allow them to view all moderator roles for their community at any time.

WHERE a user is viewing a community feed, THE system SHALL display which users currently hold moderator roles.

WHEN viewing a post or comment, THE system SHALL indicate if the author holds a moderator role in that community.

THE system SHALL ensure moderator role information is always current and reflects the latest role assignments.

## Report Rules

Any user can report any post or comment, and reports require a non-empty reason field. Reports default to pending status and cannot be edited after creation. Moderators can view all pending reports for their community. When a moderator approves a report, the reported content is immediately deleted. When a moderator dismisses a report, the report is permanently removed from the report list. Reports cannot be re-opened after dismissal. Multiple users can report the same content, and each report is tracked separately. Reported content remains visible until a report is approved. Reporting does not automatically ban the content creator.

### Report Creation Requirements

### Non-Empty Reason Requirement

WHEN a user reports content, THE system SHALL:
1. Require a non-empty reason field with at least 1 character
2. Reject the request if the reason is missing or empty
3. Store the reason exactly as provided without modification

IF the reason is empty or contains only whitespace, THE system SHALL reject the request with an error.


### Report Status Management

### Immutable Report Status

WHEN a report is created, THE system SHALL:
1. Set the status to 'pending' automatically
2. Prevent the user from modifying the status after creation
3. Maintain a timestamp of when the report was created

WHEN a report status changes, THE system SHALL:
1. Update the status to either 'approved' or 'dismissed'
2. Record the timestamp of the status change
3. Prevent any further status changes after the transition

IF a user attempts to modify a report's status directly, THE system SHALL reject the request.


### Moderator Report Access

### Moderator Report Access

WHEN a moderator accesses their community report list, THE system SHALL:
1. Show all pending reports for content in that community
2. Include the reporting user's ID, reported content, and reason
3. Display reports in order of creation (oldest first by default)

WHEN a moderator views a single report, THE system SHALL:
1. Show the complete content being reported
2. Display the reporter's username (not email)
3. Show the report reason exactly as provided
4. Indicate the report status and timestamps

WHERE a user is not a moderator of the community, THE system SHALL NOT show any reports for that community.


### Report Resolution Actions

### Immediate Deletion on Approval

WHEN a moderator approves a report, THE system SHALL:
1. Immediately delete the reported content (post or comment)
2. Update the report status to 'approved'
3. Record the moderator who approved the report
4. Record the timestamp of approval

WHILE a post or comment is under review (pending report), THE system SHALL:
1. Allow the content to remain visible to all users
2. Not affect vote scores or other content metrics
3. Prevent the content owner from editing the reported content

WHEN a comment is deleted due to report approval, THE system SHALL:
1. Delete all nested replies recursively
2. Update the parent post's comment count
3. Maintain thread structure for remaining comments


### Report Dismissal Process

### Permanent Dismissal

WHEN a moderator dismisses a report, THE system SHALL:
1. Update the report status to 'dismissed'
2. Permanently remove the report from the report list
3. Record the moderator who dismissed the report
4. Record the timestamp of dismissal

IF a report has been dismissed, THE system SHALL:
1. Prevent any attempt to re-open or revert the report
2. Not include the report in future report counts
3. Not restore the content if it was already deleted by another report

WHERE a report is dismissed and the content has been deleted by another report, THE system SHALL:
1. Note in the dismissed report record that the content was previously deleted
2. Not recreate or restore the content


### Multiple Reporting and Tracking

### Separate Report Tracking

WHEN multiple users report the same content, THE system SHALL:
1. Create separate report records for each reporting user
2. Maintain independent status for each report
3. Track the number of pending reports per content item

WHERE content has multiple pending reports, THE system SHALL:
1. Display the total pending report count to moderators
2. Allow moderators to review reports individually
3. Process each report independently regardless of other pending reports

WHEN one report on content is approved and the content is deleted, THE system SHALL:
1. Update all other pending reports on that content to 'approved'
2. Record that the content was deleted due to report approval
3. No longer require further action on those reports


### Content Visibility During Review

### Content Visibility During Review

WHILE a report is pending, THE system SHALL:
1. Show the reported content as visible to all users
2. Allow normal interactions (voting, commenting) on the content
3. Update vote scores and metrics normally
4. Not restrict access to the content by non-moderators

WHEN content has been reported but not yet approved, THE system SHALL:
1. Not hide or blur the content from regular users
2. Not modify the content's display or functionality
3. Allow the content owner to continue viewing their content

IF content has no pending reports, THE system SHALL:
1. Treat the content as regular platform content
2. Apply standard visibility and access rules
3. Not indicate that the content was ever reported


### Reporting and User Consequences

### No Automatic Banning

WHEN a report is created, THE system SHALL:
1. Not automatically ban the content creator from the community
2. Not modify the creator's account status or permissions
3. Not notify the content creator that they have been reported

WHEN a report is approved and content is deleted, THE system SHALL:
1. Not automatically ban the creator from the community
2. Not add the creator to a ban list
3. Allow the creator to create new content in accordance with standard rules

WHEN a moderator wants to ban a user, THE system SHALL:
1. Require the moderator to explicitly use the ban action
2. Treat the ban as a separate moderation action from report approval
3. Allow the ban to be applied independently of report status


# Detailed Validation Rules

Detailed validation rules with boundary values and format requirements.

## User Validation Rules

Users must provide a unique username when registering. Usernames must be between 3 and 20 characters, containing only letters, numbers, and underscores. Display names can be between 1 and 50 characters and may include spaces and special characters. Email addresses must conform to standard RFC 5321 format and be unique across active accounts. Passwords must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one digit. Avatar image URLs must be valid HTTPS URLs pointing to supported image formats. Users cannot register with an email or username that has been previously deleted but remains in soft-delete grace period.

### Username Format Validation

WHEN a user registers or changes their username, THE system SHALL:
1. Require the username to contain only letters, numbers, and underscores
2. Reject usernames containing spaces, special characters, or Unicode characters
3. Enforce case-insensitive uniqueness across all active and soft-deleted accounts

IF the username contains disallowed characters, THE system SHALL reject the request with a clear message.

WHERE a username already exists, THE system SHALL reject registration or change requests unless the existing account is permanently deleted beyond the soft-delete recovery window.

### Username Length Constraints

WHEN a user registers or changes their username, THE system SHALL:
1. Enforce a minimum length of 3 characters
2. Enforce a maximum length of 20 characters
3. Count characters using standard Unicode code points

WHILE a username is between 1 and 2 characters, THE system SHALL reject registration and profile update requests.

WHILE a username exceeds 20 characters, THE system SHALL reject registration and profile update requests.

### Display Name Limits

WHEN a user sets or updates their display name, THE system SHALL:
1. Allow display names between 1 and 50 characters in length
2. Permit spaces, special characters, and Unicode characters
3. Store the display name exactly as provided without normalization

IF the display name is empty (0 characters), THE system SHALL reject the request and require a value.

IF the display name exceeds 50 characters, THE system SHALL reject the request and indicate the maximum length.

### Email Format Validation

WHEN a user registers or updates their email address, THE system SHALL:
1. Validate email format using standard email conventions
2. Require an '@' symbol with valid domain structure
3. Reject emails with missing local part, missing domain, or malformed syntax
4. Normalize the local part to lowercase while preserving case sensitivity in the domain

IF the email does not conform to standard email format, THE system SHALL reject the registration or update request.

IF the email domain is invalid or unreachable during domain validation checks, THE system MAY flag it for manual review but SHALL NOT reject the request outright.

### Unique Email Constraint

WHEN a user registers with an email address, THE system SHALL:
1. Verify no active account exists with the same normalized email address
2. Verify no soft-deleted account exists within the recovery window with the same normalized email address
3. Treat email addresses as case-insensitive for uniqueness checks on the local part

WHILE an email is associated with a soft-deleted account still within its recovery window, THE system SHALL reject registration attempts using that email.

WHERE an email was permanently deleted beyond the recovery window, THE system SHALL allow reuse for new registrations.

### Password Security Requirements

WHEN a user registers or changes their password, THE system SHALL:
1. Require a minimum length of 8 characters
2. Enforce at least one uppercase letter
3. Enforce at least one lowercase letter
4. Enforce at least one digit
5. Store passwords using secure methods
6. Apply rate limiting to prevent brute-force attempts on password endpoints

IF the password does not meet all required criteria, THE system SHALL reject the registration or change request with specific guidance on missing requirements.

WHILE a user attempts to reuse a previously compromised password, THE system MAY reject the request based on integrated password breach databases.

### Avatar URL Validation

WHEN a user sets or updates their avatar URL, THE system SHALL:
1. Validate the URL uses HTTPS protocol only (reject HTTP)
2. Validate the URL points to a supported image format (PNG, JPEG, GIF, WebP, AVIF)
3. Ensure the URL is well-formed according to standard URL conventions
4. Optionally verify URL accessibility (non-blocking)

IF the URL scheme is HTTP, THE system SHALL reject the request.

IF the URL extension does not match supported image formats, THE system MAY warn the user but SHOULD NOT reject the request if the format is detectable from response headers.

IF the URL is malformed or unparsable, THE system SHALL reject the request with an appropriate error message.

### Soft-Delete Recovery Window

WHEN a user deletes their account, THE system SHALL:
1. Initiate a soft-delete state instead of immediate permanent deletion
2. Preserve all user data for a 30-day recovery window
3. Mark the account as 'deleted' with a timestamp for hard-deletion scheduling
4. Prevent login or account recovery during the recovery window unless explicitly restored by the user

WHILE the account remains within its 30-day recovery window, THE system SHALL:
1. Block any new registration attempts using the same email or username
2. Allow the original user to restore their account by authenticating and confirming restoration
3. Include the account in uniqueness checks for email and username reuse

AFTER the 30-day recovery window expires, THE system SHALL:
1. Permanently delete all user data
2. Release the email and username for reuse by other users
3. Remove all subscriptions, posts, comments, and votes associated with the account

## Community Validation Rules

Community names must be unique across the platform and follow specific naming conventions. Names must be between 2 and 20 characters, containing only alphanumeric characters and underscores. Community descriptions can be up to 1000 characters in length. Community icon images must be uploaded in JPEG, PNG, or GIF format and cannot exceed 2MB in size. Community names are case-insensitive for uniqueness checks. Descriptions must not contain HTML tags or executable scripts. Users cannot create a community with a name reserved for system use or impersonating existing communities.

### Community Name Format

WHEN a user creates or updates a community, THE system SHALL:
1. Require the community name to contain only alphanumeric characters and underscores
2. Reject names containing spaces, special characters, or symbols
3. Enforce case-insensitive uniqueness by converting names to lowercase for comparison
4. Reject names that match reserved system terms

IF the name contains invalid characters, THE system SHALL reject the request with "name contains invalid characters".
IF the name duplicates an existing community (case-insensitive), THE system SHALL reject the request with "name already in use".

### Community Name Length

WHEN a user creates or updates a community, THE system SHALL:
1. Require the community name length to be between 2 and 20 characters
2. Count Unicode characters, not bytes
3. Trim whitespace before length validation

IF the name is shorter than 2 characters, THE system SHALL reject the request with "name too short".
IF the name exceeds 20 characters, THE system SHALL reject the request with "name too long".

### Community Description Length

WHEN a user creates or updates a community, THE system SHALL:
1. Allow the community description to be up to 1000 characters in length
2. Reject descriptions exceeding this limit
3. Allow empty descriptions (optional field)

IF the description exceeds 1000 characters, THE system SHALL reject the request with "description too long".

### Community Icon File Format

WHEN a user uploads a community icon, THE system SHALL:
1. Accept only JPEG, PNG, or GIF file formats
2. Reject files with other formats or extensions
3. Validate the file's actual content type, not just its extension

IF the uploaded file is not in JPEG, PNG, or GIF format, THE system SHALL reject the request with "invalid file format".

### Community Icon Size Limit

WHEN a user uploads a community icon, THE system SHALL:
1. Reject files larger than 2MB in size
2. Measure the file size before processing
3. Reject files without valid image content even if format is correct

IF the uploaded file exceeds 2MB, THE system SHALL reject the request with "file too large".

### Community Name Reservation Policy

WHEN a user attempts to create a community, THE system SHALL:
1. Reject names reserved for system use (e.g., 'home', 'api', 'admin', 'settings')
2. Reject names that closely resemble existing community names to prevent impersonation
3. Reject names containing profanity or hate speech
4. Reject names that violate platform trademark policies

IF the name matches a reserved term, THE system SHALL reject the request with "name is reserved".
IF the name resembles an existing community to cause confusion, THE system SHALL reject the request with "name may cause confusion".

## Post Validation Rules

Post titles must be between 1 and 300 characters and cannot be empty for any post type. Text posts require content between 1 and 50000 characters. Link posts must contain a valid URL with http or https scheme. Image posts require a valid HTTPS URL pointing to an image file. Only one of content, url, or image_url may be provided per post. Post titles are trimmed of whitespace before validation. Users cannot create posts in communities they are not subscribed to. Image URLs must point to files with supported extensions.

### Post Title Validation

WHEN a user creates or edits a post, THE system SHALL require the title to be between 1 and 300 characters inclusive.

WHEN a post title is provided, THE system SHALL trim leading and trailing whitespace before validation.

IF the title is empty after trimming, THE system SHALL reject the request.

### Text Post Content Validation

WHEN a user creates a text post, THE system SHALL require content between 1 and 50000 characters inclusive.

IF the content is empty, THE system SHALL reject the request.

### Link Post URL Validation

WHEN a user creates a link post, THE system SHALL require the URL to use http or https scheme only.

IF the URL uses an unsupported scheme, THE system SHALL reject the request.

### Image Post Format Validation

WHEN a user creates an image post, THE system SHALL require the image URL to use HTTPS scheme only.

IF the image URL uses HTTP scheme, THE system SHALL reject the request.

### Single-Content Constraint

WHEN a user creates a post, THE system SHALL ensure exactly one of content, url, or image_url is provided.

IF multiple content fields are provided, THE system SHALL reject the request.

IF no content fields are provided, THE system SHALL reject the request.

### Whitespace Trimming for Titles

WHEN a post title is submitted, THE system SHALL trim leading and trailing whitespace before validation.

WHEN a post title is displayed, THE system SHALL show the trimmed version without extra whitespace.

### Subscription Requirement for Posting

WHEN a user attempts to create a post in a community, THE system SHALL verify the user is subscribed to that community.

IF the user is not subscribed, THE system SHALL reject the request.

### Image File Extension Validation

WHEN a user creates an image post, THE system SHALL validate the image URL ends with a supported image file extension.

Supported extensions include: .jpg, .jpeg, .png, .gif, .webp.

IF the URL does not have a supported extension, THE system SHALL reject the request.

## Comment Validation Rules

Comment content must be between 1 and 10000 characters. Comments cannot be empty or contain only whitespace. Nested comment depth is unlimited but responses must reference a valid parent comment. Users can edit their comments only within 5 minutes of creation. Edited comments must retain the same content format and length constraints. Comments are automatically locked for editing after 5 minutes. HTML tags are stripped from comment content before storage. Comments cannot reference deleted posts or ancestors.

### Comment Content Length

### Comment Content Length

WHEN a user creates or edits a comment, THE system SHALL:
1. Require comment content to be between 1 and 10,000 characters
2. Count characters using standard Unicode code points
3. Reject requests where content is shorter than 1 character
4. Reject requests where content exceeds 10,000 characters

WHILE a comment content is being edited, THE system SHALL:
1. Validate the new content length against the same 1-10,000 character constraint
2. Reject edits that make the content empty (0 characters)
3. Reject edits that exceed the 10,000 character limit

THE system SHALL return an error when comment content violates length constraints.

### Whitespace Constraint

### Whitespace Constraint

WHEN a user creates or edits a comment, THE system SHALL:
1. Trim leading and trailing whitespace from comment content
2. Require at least one non-whitespace character after trimming
3. Reject requests where content contains only whitespace characters

WHILE validating comment content, THE system SHALL:
1. Treat spaces, tabs, newlines, and other Unicode whitespace as trimmable
2. Reject content that becomes empty after whitespace trimming
3. Allow content with internal whitespace including multiple consecutive spaces

THE system SHALL return an error when comment content consists only of whitespace.

### Parent Reference Requirement

### Parent Reference Requirement

WHEN a user creates a comment, THE system SHALL:
1. Require either a post ID (for top-level comments) or a parent comment ID (for replies)
2. Validate that the referenced post exists
3. Validate that the referenced parent comment exists and is on the same post
4. Reject requests where no valid reference is provided
5. Reject requests where the referenced content has been deleted

WHILE processing a comment reply, THE system SHALL:
1. Link the new comment to its parent comment for tree traversal
2. Allow unlimited nesting depth for comment threads
3. Maintain referential integrity between comments and their parents

THE system SHALL return an error when a comment is created without a valid parent reference.

### Edit Time Window

### Edit Time Window

WHEN a user attempts to edit a comment, THE system SHALL:
1. Check the time elapsed since the comment was created
2. Allow edits only if less than 5 minutes have passed
3. Reject edit requests made 5 minutes or more after creation
4. Reject edit requests when the comment has been locked (see Auto-Lock Policy)

WHERE comment editing is allowed, THE system SHALL:
1. Update the comment content while preserving the original creation timestamp
2. Update the last edited timestamp
3. Maintain all other comment attributes unchanged

THE system SHALL return an error when the 5-minute edit window has expired.

### Content Sanitization

### Content Sanitization

WHEN a user creates or edits a comment, THE system SHALL:
1. Strip all HTML tags from the comment content before storage
2. Remove any script, style, or other executable content
3. Normalize HTML entities (e.g., convert &lt; to <)
4. Reject content containing dangerous HTML/JavaScript patterns

WHERE comment content is displayed, THE system SHALL:
1. Render content as plain text (not HTML)
2. Escape any special characters to prevent XSS attacks
3. Preserve line breaks using appropriate HTML elements (e.g., <br>)

THE system SHALL sanitize all comment content regardless of source and reject content that contains malicious scripts.

### Auto-Lock Policy

### Auto-Lock Policy

WHEN 5 minutes have elapsed since a comment's creation, THE system SHALL:
1. Automatically lock the comment for editing
2. Set the comment's edit locked flag to true
3. Prevent any further edits to the comment content

WHILE a comment is locked, THE system SHALL:
1. Reject all edit requests with an appropriate error
2. Continue to allow voting and replying to the comment
3. Display an indicator that the comment can no longer be edited

WHERE a comment has been edited within the time window, THE system SHALL:
1. Set the edit locked flag after the 5-minute period expires
2. Record the last edit timestamp at lock time
3. Maintain the comment's content as it existed at lock time

THE system SHALL prevent edits after the auto-lock period expires.

### Deleted Reference Prevention

### Deleted Reference Prevention

WHEN a user attempts to create a comment, THE system SHALL:
1. Verify the target post exists before allowing comment creation
2. For replies, verify the parent comment exists before allowing comment creation
3. Reject requests where the target post has been deleted
4. Reject requests where the parent comment has been deleted

WHEN a post is deleted, THE system SHALL:
1. Log the deletion action but keep comment records for reference
2. Prevent the comment system from referencing the deleted post
3. Allow comments to remain visible with a "Post deleted" indicator

WHEN a parent comment is deleted, THE system SHALL:
1. Allow child comments to remain in the thread
2. Show child comments with the deleted parent indicator
3. Prevent further replies to the deleted parent comment

THE system SHALL return an error when attempting to reference a deleted post or comment.

## Vote Validation Rules

Votes must have a value of exactly +1 (upvote) or -1 (downvote). Each user can cast only one vote per post or comment. Vote values cannot be changed to zero or other numbers. Vote timestamps record when the vote was last modified, including creation and updates. Users cannot vote on their own content. Vote records are immutable once created but can be deleted entirely. Vote actions must reference valid, non-deleted content. Vote counts adjust immediately when votes are added, changed, or removed.

### Vote Value Constraint

WHEN a user creates or updates a vote, THE system SHALL:
1. Accept only two valid vote values: +1 (upvote) or -1 (downvote)
2. Reject any attempt to set a vote value to 0 or any other number
3. Ensure the vote value is recorded exactly as cast
4. Update the content's vote score immediately when the vote is added or changed

IF the vote value is 0, THE system SHALL reject the request.
IF the vote value is not +1 or -1, THE system SHALL reject the request.

### Single Vote Per Content

WHEN a user attempts to create a new vote on a post or comment, THE system SHALL:
1. Check if the user has already voted on that specific content
2. Reject the request if an existing vote is found
3. Only allow one active vote per user per content item
4. Require the user to change or remove their existing vote first

IF a user tries to vote on content they've already voted on, THE system SHALL reject the request.
IF a user tries to vote on their own post or comment, THE system SHALL reject the request (see Self-Vote Prohibition).

### Self-Vote Prohibition

WHEN any user attempts to vote on their own content (post or comment), THE system SHALL:
1. Detect that the voting user is the same as the content author
2. Reject the request immediately
3. Provide a clear error indication that self-voting is not allowed
4. Not record the vote in the system

IF the user ID matches the content author ID, THE system SHALL reject the request without processing the vote.

### Timestamp Tracking

WHEN a vote is created or modified, THE system SHALL:
1. Record the exact timestamp when the vote is first cast
2. Update the timestamp whenever the vote value changes
3. Preserve the timestamp when a vote is removed (deleted)
4. Ensure timestamps reflect the most recent change to the vote

WHERE a vote exists, THE system SHALL maintain its timestamp as immutable after deletion.

### Vote Mutability Rules

WHEN a user wants to change or remove their vote, THE system SHALL:
1. Allow changing the vote value from +1 to -1 or vice versa
2. Allow removing the vote entirely (setting value to null)
3. Update the content's vote score immediately when the vote changes
4. Reject any attempt to modify another user's vote

WHILE a vote exists, THE system SHALL:
1. Track the current vote value (+1 or -1)
2. Update the vote record when the value changes
3. Delete the vote record when removed entirely

### Content Validity Requirement

WHEN a user attempts to create a vote, THE system SHALL:
1. Verify the referenced post or comment exists and is not deleted
2. Reject the request if the content has been deleted
3. Ensure the content is of a type that supports voting (post or comment)
4. Validate that the content belongs to a visible community

IF the referenced content does not exist, THE system SHALL reject the request.
IF the referenced content has been deleted, THE system SHALL reject the request.
IF the referenced community has been deleted, THE system SHALL reject the request.

## Subscription Validation Rules

Subscription status must be either subscribed or unsubscribed, with subscribed as the default value. Users can have only one active subscription record per community at a time. Subscription timestamps record when the status changed, not initial creation. Users cannot subscribe to communities they own. Users cannot subscribe to communities they have been banned from. Unsubscription status can be changed back to subscribed. Subscription records are not deleted when users unsubscribe. Community subscriber counts update immediately on status changes.

### Subscription Status Values

WHEN a subscription is created, THE system SHALL set its status to "subscribed" by default.

WHEN a user unsubscribes from a community, THE system SHALL update the subscription status to "unsubscribed".

WHEN a user resubscribes to a community, THE system SHALL update the subscription status back to "subscribed".

WHILE a subscription exists, THE system SHALL only allow status values of "subscribed" or "unsubscribed".

### Active Record Constraint

WHEN a user subscribes to a community, THE system SHALL mark any existing subscription record for that user-community pair as "unsubscribed".

WHILE a user maintains an active subscription, THE system SHALL NOT create duplicate "subscribed" records for the same user-community pair.

THE system SHALL consider only the most recent subscription record per user-community pair when determining subscription status.

### Self-Ownership Restriction

IF a user attempts to subscribe to a community they own, THE system SHALL reject the request.

THE system SHALL return an error when a community owner tries to subscribe to their own community.

WHILE a user is the owner of a community, THE system SHALL treat any subscription request as invalid.

### Banned Subscription Policy

IF a user attempts to subscribe to a community where they are banned, THE system SHALL reject the request.

THE system SHALL return an error when a banned user tries to re-subscribe to a community that has banned them.

WHILE a user is banned from a community, THE system SHALL ignore all subscription requests from that user for that community.

### Status Toggle Capability

WHEN a user with "unsubscribed" status changes their subscription back to "subscribed", THE system SHALL update the status accordingly.

WHEN a user with "subscribed" status unsubscribes, THE system SHALL allow them to change back to "subscribed" later.

THE system SHALL maintain a history of status changes for each subscription while allowing bidirectional toggling.

### Immediate Count Update

WHEN a subscription status changes from "unsubscribed" to "subscribed", THE system SHALL immediately increment the community's subscriber count by one.

WHEN a subscription status changes from "subscribed" to "unsubscribed", THE system SHALL immediately decrement the community's subscriber count by one.

WHILE calculating subscriber counts for display, THE system SHALL only count subscriptions with status "subscribed".

## ModeratorRole Validation Rules

Moderator roles must be either owner or moderator, with owner assigned only to the community creator. A community must have exactly one owner at all times. Moderator roles are created at the time of community creation or role assignment. Roles reference valid user and community identifiers. Owner roles cannot be deleted or downgraded to moderator. Only existing moderators can be added as additional moderators. Role assignments are timestamped with creation time. Multiple owner roles per community are not permitted.

### Role Type Values

WHEN a ModeratorRole is created, THE system SHALL:
1. Require the role to be either 'owner' or 'moderator'
2. Accept only these two exact values, rejecting any other input

IF an invalid role value is provided, THE system SHALL reject the request.
WHERE 'owner' is the role type for the community creator, THE system SHALL grant full moderation authority.
WHERE 'moderator' is the role type, THE system SHALL grant standard moderation capabilities.

### Owner Exclusivity

WHEN a community is created, THE system SHALL automatically assign the creating user as 'owner'.
THE system SHALL ensure each community has exactly one owner at all times.

IF a role assignment would create multiple owners for the same community, THE system SHALL reject the request.
IF an owner role is deleted, THE system SHALL prevent the deletion to maintain owner exclusivity.
IF an owner is removed from a community, THE system SHALL maintain one owner role for that community.

### Role Hierarchy Constraint

WHEN a moderator attempts to remove another moderator, THE system SHALL reject the request.
WHEN a moderator attempts to remove the community owner, THE system SHALL reject the request.

WHERE a user holds the 'owner' role, THE system SHALL grant authority to add moderators.
WHERE a user holds the 'moderator' role, THE system SHALL restrict role management actions to owner privileges only.

THE system SHALL enforce the following hierarchy: owner > moderator for all role management operations.

### Community Ownership Linkage

WHEN a ModeratorRole is created, THE system SHALL link the role to exactly one community and one user.

IF the referenced user does not exist, THE system SHALL reject the role creation.
IF the referenced community does not exist, THE system SHALL reject the role creation.

WHERE a user has an active ModeratorRole in a community, THE system SHALL validate role permissions against that specific community.

### Owner Protection Rules

THE system SHALL prevent deletion of an owner ModeratorRole under all circumstances.

IF an attempt is made to downgrade an owner role to moderator, THE system SHALL reject the request.
IF an attempt is made to transfer owner status without proper authorization, THE system SHALL reject the request.

WHERE the community owner attempts to delete their own account, THE system SHALL cascade deletion to all their ModeratorRole assignments in other communities while preserving the owner role in their own community during the process.

### Assignment Timestamping

WHEN a ModeratorRole is created, THE system SHALL record the exact creation timestamp.

THE system SHALL store the creation time for each role assignment with no exceptions.
WHERE role assignment timestamps are queried, THE system SHALL return the precise creation datetime.

The timestamping SHALL be immutable once set, ensuring audit trail integrity for role management history.

## Report Validation Rules

Reports must include a reason between 1 and 1000 characters for reporting content. Report status must be pending, approved, or dismissed, starting as pending. Reports reference either a post or comment being reported. Users cannot report their own content. Reports are created with a timestamp and cannot be edited after creation. Moderators can only act on reports for communities they moderate. Approved reports result in immediate deletion of the reported content. Dismissed reports remove the report from active review queues.

### Reason Length Requirement

WHEN a user submits a report, THE system SHALL require a reason between 1 and 1000 characters.

IF the reason is empty, THE system SHALL reject the report.

IF the reason exceeds 1000 characters, THE system SHALL reject the report.

### Report Status Transitions

WHEN a report is created, THE system SHALL set the status to pending.

WHEN a moderator approves a report, THE system SHALL change the status to approved.

WHEN a moderator dismisses a report, THE system SHALL change the status to dismissed.

A report with status approved or dismissed cannot have its status changed further.

### Self-Report Prohibition

IF a user attempts to report their own post or comment, THE system SHALL reject the request.

THE system SHALL verify that the reporter is different from the author of the content being reported.

### Content Reference Requirement

WHEN a report is created, THE system SHALL require a reference to either a post or a comment being reported.

IF no content reference is provided, THE system SHALL reject the report.

IF a reference to both a post and comment is provided, THE system SHALL reject the report.

### Moderator Jurisdiction

WHEN a moderator attempts to act on a report, THE system SHALL verify that the moderator has moderation authority for the community where the report originated.

IF the moderator lacks authority for the community, THE system SHALL reject the action.

### Deletion Action

WHEN a moderator approves a report, THE system SHALL immediately delete the reported content (post or comment).

WHEN the system deletes reported content, THE system SHALL maintain the report record for audit purposes.

### Review Queue Management

WHEN a report is dismissed, THE system SHALL remove it from the active review queue.

A dismissed report remains in the system for historical reference but is no longer visible in active moderation dashboards.

# Filtering, Sorting, and Pagination

List query specifications for filtering, sorting, and pagination.

## List Query Specifications

Define filtering, sorting, and pagination rules for list operations.

### Post Feed Filtering

### Home Feed Filtering

WHEN a logged-in user requests the home feed, THE system SHALL:
1. Filter posts to only include those from communities the user is subscribed to
2. Exclude posts from communities the user has unsubscribed from
3. Include posts from banned communities if the ban has been lifted

WHERE a user is not logged in, THE system SHALL return an empty feed.

### Popular Feed Filtering

WHEN any user (including guests) requests the popular feed, THE system SHALL:
1. Include posts from all communities across the platform
2. Exclude posts from banned communities
3. Exclude posts from communities the user has blocked

### Community Feed Filtering

WHEN any user requests a community feed, THE system SHALL:
1. Filter posts to only include those from the specified community
2. Include all posts regardless of subscription status
3. Exclude posts from banned users
4. Exclude posts from banned communities

### Search Query Filtering

WHEN a user searches for communities by name, THE system SHALL:
1. Match community names case-insensitively
2. Support partial name matching (prefix matching)
3. Return communities ordered by relevance score
4. Exclude communities the user has blocked

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Authentication and Authorization Errors

THE system SHALL reject login requests when the provided email and password do not match any existing user account.

THE system SHALL reject account deletion requests when the user is not authenticated.

THE system SHALL reject password change requests when the user is not authenticated.

THE system SHALL reject profile update requests when the user is not authenticated.

THE system SHALL reject community creation requests when the user is not authenticated.

THE system SHALL reject post creation requests when the user is not authenticated.

THE system SHALL reject comment creation requests when the user is not authenticated.

THE system SHALL reject vote submissions when the user is not authenticated.

THE system SHALL reject subscription actions when the user is not authenticated.

THE system SHALL reject report creation requests when the user is not authenticated.

THE system SHALL reject moderator role management actions when the user lacks the necessary permissions.

THE system SHALL reject report approval or dismissal actions when the user is not a moderator of the reported content's community.

THE system SHALL reject community banning/unbanning actions when the user is not a moderator of that community.

### Data Validation Errors

THE system SHALL reject registration requests when the email address does not conform to standard email format.

THE system SHALL reject registration requests when the username is already in use by another account.

THE system SHALL reject registration requests when the username contains invalid characters.

THE system SHALL reject registration requests when the username exceeds the maximum length.

THE system SHALL reject registration requests when the display name is empty or contains only whitespace.

THE system SHALL reject community creation requests when the community name is already in use.

THE system SHALL reject community creation requests when the community name contains invalid characters.

THE system SHALL reject post creation requests when the title is empty or contains only whitespace.

THE system SHALL reject post creation requests when more than one post content type is provided (e.g., both text content and URL).

THE system SHALL reject post creation requests when the URL provided for a link post does not use a valid scheme (http/https).

THE system SHALL reject post creation requests when no content is provided for a text post.

THE system SHALL reject comment creation requests when the content is empty or contains only whitespace.

### Business Rule Violations

THE system SHALL reject post creation requests when the user is not subscribed to the target community.

THE system SHALL reject post editing requests when the user is not the original author of the post.

THE system SHALL reject post deletion requests when the user is not the original author of the post.

THE system SHALL reject comment editing requests when the user is not the original author of the comment.

THE system SHALL reject comment deletion requests when the user is not the original author of the comment.

THE system SHALL reject community name update requests when attempted by any user.

THE system SHALL reject self-subscription attempts when the user attempts to subscribe to a community they created.

THE system SHALL reject self-vote attempts when a user attempts to vote on their own post or comment.

THE system SHALL reject duplicate vote submissions when a user attempts to vote again on the same content before changing or removing their vote.

THE system SHALL reject moderator role removal attempts when a moderator attempts to remove another moderator.

THE system SHALL reject owner role removal attempts when any user attempts to remove the community owner.

THE system SHALL reject post or comment deletion requests when the user lacks permission to delete the content.

### Content Access Errors

THE system SHALL reject requests to view a specific post when the post no longer exists.

THE system SHALL reject requests to view a specific comment when the comment no longer exists.

THE system SHALL reject requests to view a specific community when the community no longer exists.

THE system SHALL reject requests to view a specific user profile when the user no longer exists.

THE system SHALL reject requests to view a specific report when the report no longer exists.

THE system SHALL reject requests to update content when the user is banned from the community where the content exists.

THE system SHALL reject requests to delete content that was already approved in a report.

### Moderation and Reporting Errors

THE system SHALL reject report creation requests when the reason field is empty or contains only whitespace.

THE system SHALL reject report creation requests when the user attempts to report their own content.

THE system SHALL reject moderator actions that affect content in communities where the user is not a moderator.

THE system SHALL reject requests to ban a user who is already banned from the community.

THE system SHALL reject requests to unban a user who is not currently banned from the community.

THE system SHALL reject moderator actions when the referenced user does not exist.

THE system SHALL reject report actions when the content referenced in the report no longer exists.

### System Failure Cases

WHEN a database connection fails during a critical operation, THE system SHALL return an appropriate error response and log the failure for monitoring.

WHEN a file upload operation fails due to storage system unavailability, THE system SHALL reject the request and provide a meaningful error message.

WHEN concurrent vote updates result in a conflict, THE system SHALL retry the operation and reject the request after repeated failures.

WHEN the system detects suspicious activity that violates usage policies, THE system SHALL temporarily restrict the account and notify administrators.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Validation and Upload Rules

WHEN a user uploads a file (avatar image, community icon, or post image), THE system SHALL:
1. Require a file to be provided
2. Validate the file size is within the allowed limit
3. Ensure the file format matches the allowed content types
4. Reject files that exceed size or format restrictions

IF the file is missing, THE system SHALL reject the upload request.
IF the file size exceeds the maximum allowed size (10MB), THE system SHALL reject the upload request.
IF the file format is not permitted, THE system SHALL reject the upload request with the list of accepted formats.

All file uploads MUST be associated with a valid user session or authentication context.

### Virus Scanning Requirements

WHEN a file is uploaded, THE system SHALL:
1. Immediately queue the file for virus scanning before making it accessible
2. Store the file in a quarantined state until scanning completes
3. Delete files that are identified as infected
4. Notify the uploader when their file is deleted due to infection

IF the virus scan detects malware or suspicious content, THE system SHALL:
- Permanently delete the file
- Not make the file available to any user
- Log the incident for security review

WHILE a file is in quarantine (pending virus scan), THE system SHALL:
- Not serve the file in any response
- Not associate it with any user profile or content
- Reject any attempts to reference the file in posts or profiles

### Content Type Restrictions

THE system SHALL accept only the following file content types:
- Avatar images: JPEG (image/jpeg), PNG (image/png), GIF (image/gif)
- Community icons: JPEG (image/jpeg), PNG (image/png), GIF (image/gif)
- Post images: JPEG (image/jpeg), PNG (image/png), GIF (image/gif)

THE system SHALL NOT accept executable files, documents, or non-image media.
IF a user attempts to upload a file with an unsupported content type, THE system SHALL reject the request.

For all allowed image formats, THE system SHALL:
- Validate the file header matches the declared content type
- Reject files where the declared content type doesn't match the actual content
- Automatically convert or reject files with corrupted headers

### File Retention Policies

WHEN a user deletes their account, THE system SHALL:
1. Immediately flag all uploaded files (avatar, community icons if owned) for deletion
2. Permanently delete avatar images within 30 days
3. Permanently delete community icon images within 30 days
4. Ensure files cannot be recovered after deletion

WHEN a user updates their avatar image, THE system SHALL:
1. Immediately flag the previous avatar for deletion
2. Permanently delete the previous avatar within 30 days
3. Replace the avatar reference with the new image

WHEN a community is deleted, THE system SHALL:
1. Flag all community icon files for deletion
2. Permanently delete the icons within 30 days

WHEN a post containing an image is deleted, THE system SHALL:
1. Flag the post image for deletion
2. Permanently delete the image within 30 days

THE system SHALL permanently delete all uploaded files that have not been referenced by any active content for more than 90 days.