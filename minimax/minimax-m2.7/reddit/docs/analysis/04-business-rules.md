**redditClone — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must provide a valid email address and a secure password when signing up. The system requires a unique username for each account that users select during registration. Users authenticate using their email and password combination to access the platform. Password changes require the user to provide their current password for verification before setting a new one. Account deletion removes the user's profile and all associated content including their posts and comments. A user's profile contains a display name, bio text, and avatar image that can be updated by the account owner. Display names, bio text, and avatars are publicly visible to other users when viewing a profile. Users can view any other user's profile page which shows their display name, bio, avatar, total karma score, and lists of their posts and comments.

### User Registration Validation

Users must provide a valid email address when signing up for an account.

The system SHALL validate that the email address follows standard email format before accepting registration.

Users must create a password that meets the platform's security requirements when signing up.

The password SHALL be stored securely and SHALL NOT be stored in plain text.

If the provided email address is invalid or already registered, the registration request SHALL be rejected.

If the provided password does not meet security requirements, the registration request SHALL be rejected.

### Username Uniqueness

Users must select a unique username during registration.

The system SHALL verify that the chosen username is not already in use by another account.

If the username is already taken, the registration request SHALL be rejected and the user must choose a different username.

Usernames remain permanently associated with deleted accounts to prevent reuse and confusion.

### Login Authentication

Users authenticate to access the platform using their email address and password.

The system SHALL verify that the provided email and password combination matches a registered account.

If the email and password combination is incorrect, the login request SHALL be rejected.

Upon successful authentication, the user gains access to their account and can perform member actions.

### Password Change Requirements

Users can change their password after authenticating to their account.

Before allowing a password change, the system SHALL require the user to provide their current password for verification.

If the current password is incorrect, the password change request SHALL be rejected.

The new password must meet the same security requirements as the original password.

### Account Deletion Cascade

When a user deletes their account, all associated content SHALL be permanently removed.

The deletion cascade SHALL include all posts created by the user.

The deletion cascade SHALL include all comments written by the user.

The deletion cascade SHALL include the user's profile information including display name, bio, and avatar.

Deleted accounts cannot be recovered and their username becomes unavailable for future registration.

### Profile Display Name

Each user profile contains a display name that represents the user publicly.

The display name SHALL be editable by the account owner at any time.

The display name SHALL be visible to all users when viewing the owner's profile page.

The display name SHALL be displayed alongside posts and comments authored by the user.

If the display name is empty, the username SHALL be used as a fallback display identifier.

### Profile Bio Text

Each user profile contains an optional bio text field for self-description.

The bio text SHALL be editable by the account owner at any time.

The bio text SHALL be publicly visible on the user's profile page.

Bio text is optional and users may choose not to provide any bio information.

### Profile Avatar Image

Each user profile contains an optional avatar image that represents the user visually.

The avatar image SHALL be uploadable by the account owner at any time.

The avatar image SHALL be publicly visible on the user's profile page.

The avatar image SHALL be displayed alongside posts and comments authored by the user.

Avatar image is optional and users may rely on a default placeholder if no image is uploaded.

### Public Profile Visibility

User profiles are publicly visible to all visitors of the platform.

Users can view any other user's profile page without requiring authentication.

The profile page SHALL display the user's display name, bio, and avatar.

The profile page SHALL display the user's total karma score.

The profile page SHALL display a list of all posts created by the user.

The profile page SHALL display a list of all comments written by the user.

### Karma Score Display

Each user has a single karma score displayed on their profile.

The karma score SHALL be calculated based on votes received on the user's posts and comments.

The karma score SHALL increase by one for each upvote received on the user's posts or comments.

The karma score SHALL decrease by one for each downvote received on the user's posts or comments.

The karma score SHALL adjust accordingly when a vote is removed from the user's content.

The karma score CAN be negative.

### User Post History

A user's profile page SHALL display a list of all posts the user has created.

The post history SHALL include posts that have been deleted by the author.

Deleted posts SHALL be removed from other users' views but may remain referenced in the author's history.

The post history SHALL be sorted by creation date with most recent posts first.

Each listed post SHALL show the post title and creation timestamp.

### User Comment History

A user's profile page SHALL display a list of all comments the user has written.

The comment history SHALL include comments that have been deleted by the author.

Deleted comments SHALL be removed from other users' views but may remain referenced in the author's history.

The comment history SHALL be sorted by creation date with most recent comments first.

Each listed comment SHALL show a preview of the comment content and creation timestamp.

## Community Rules

Any registered user can create a community by providing a unique name, description text, and icon image. Community names must be unique across the entire platform to prevent confusion. The user who creates a community automatically becomes its owner with full administrative control. A community's description text explains the purpose and topic of the community to potential subscribers. Each community displays its subscriber count to help users evaluate community popularity. Communities can be discovered through browsing the full list of communities or searching by name.

### Community Creation Requirements

Any registered user can create a community on the platform.

A community must be created with the following information:
- A unique community name (required)
- A description text explaining the community's purpose (required)
- An icon image representing the community (required)

The system validates that all three pieces of information are provided before accepting the community creation request. If any of these elements are missing, the creation request is rejected.

When a community is successfully created, the creating user is automatically assigned as the owner of that community. The owner cannot be removed through standard moderator removal processes.

### Community Name Uniqueness

Each community name must be unique across the entire platform.

The system rejects any attempt to create a community with a name that already exists. This applies regardless of letter casing or special characters used.

When a user attempts to use an existing community name, the system returns an error indicating that the name is already taken and suggests the user choose a different name.

Once a community is created, its name cannot be changed to match another existing community name.

### Community Description

The community description text explains what the community is about and helps users decide whether to subscribe.

The description must be provided during community creation and can be updated by the community owner or moderators.

There is no character limit enforced on descriptions, but moderators should ensure descriptions remain appropriate and on-topic.

The description is displayed on the community's main page and in community search results to help users evaluate the community.

### Community Icon Image

Each community must have an icon image that visually represents the community.

The icon image is required during creation and must be a valid image file format supported by the platform.

The icon image is displayed alongside the community name in feeds, search results, and the community header.

The owner or moderators can update the icon image after the community is created.

### Automatic Owner Assignment

When a user creates a community, they are automatically assigned as the owner with the highest authority level.

The owner role is assigned at the moment of community creation and cannot be transferred through standard moderator controls.

The owner has the ability to add and remove moderators, and cannot be removed or banned by other moderators.

Ownership is the highest authority level within a community's moderation structure.

### Subscriber Count Display

Each community displays its current subscriber count to help users evaluate community popularity.

The subscriber count represents the total number of users who have subscribed to the community.

The count is updated immediately when a user subscribes or unsubscribes from the community.

The subscriber count is visible on the community's main page, in community listings, and in search results.

### Community Discovery

Users can discover communities through two primary methods: browsing the complete list of communities and searching by community name.

Browsing allows users to see all available communities in a list format, sorted by name or subscriber count.

Searching enables users to find specific communities by entering all or part of a community name.

Both discovery methods show the community name, description preview, and subscriber count to help users make decisions.

### Community Name Search

Users can search for communities by entering all or part of a community name.

The search returns communities with names that contain the search term, regardless of position in the name.

Search results are sorted by relevance, with exact matches appearing first, followed by names starting with the search term, and then names containing the search term.

Empty search queries return an error prompting the user to enter a search term.

### Browsing All Communities

The system provides a browsable list of all communities on the platform.

The community list displays each community's name, description preview, icon, and subscriber count.

The list can be sorted by name (alphabetically) or by subscriber count (most popular first).

The list is paginated to ensure performance, with a reasonable number of communities shown per page.

All community browsing is available to both logged-in users and guests.

## Subscription Rules

Users can subscribe to any community to receive updates and participate in discussions. Subscribing to a community allows users to create posts within that community. Users can unsubscribe from any community they are currently subscribed to. Users maintain a personal list of all communities they have subscribed to for easy reference. Subscription status must be verified before allowing users to create posts in a community.

### Subscription Validation Rules

### Subscription Validation Rules

When a user attempts to subscribe to a community, the following validation rules apply:

- The user must be an authenticated member of the platform
- The community must exist and be an active community
- The user must not already be subscribed to the target community
- The user must not be banned from the target community

If any validation fails, the subscription request is rejected and the user receives an error message explaining the specific reason for the rejection.

### Subscription Status Requirements

### Subscription Status Requirements

A valid subscription association between a user and a community must satisfy these requirements:

- Each user may subscribe to the same community only once
- A subscription remains active until the user explicitly unsubscribes
- A subscription remains active even if the community changes its name, description, or icon
- When a community is deleted, all associated subscriptions are automatically terminated
- When a user account is deleted, all their subscriptions are automatically terminated

### Subscription Requirement for Post Creation

### Subscription Requirement for Post Creation

**Ubiquitous**: THE system SHALL require an active subscription before a user can create a post in a community.

WHEN a user attempts to create a post in a community,
THE system SHALL verify that the user has an active subscription to that community,
AND SHALL reject the request if no active subscription exists.

IF the user is banned from the community,
THEN the system SHALL reject the post creation even if a subscription exists.

### Subscription Verification Process

### Subscription Verification Process

Before allowing any community participation action, the system performs subscription verification:

- The system checks for an active subscription record linking the user to the community
- An active subscription is defined as a subscription that has not been terminated
- Subscription verification is performed in real-time during post creation
- The verification result determines whether the requested action proceeds or is rejected

The system SHALL reject participation requests with a clear message indicating the subscription requirement when verification fails.

### Viewing Subscribed Communities

### Viewing Subscribed Communities

**Ubiquitous**: THE system SHALL allow any logged-in user to view a list of communities they have subscribed to.

The subscribed communities list must include:
- The community name
- The community description
- The subscription date for each entry

WHEN a user views their subscribed communities,
THE system SHALL display communities in reverse chronological order by subscription date (most recent first).

Guest users SHALL NOT have access to view subscribed community lists.

### Community Participation Through Subscription

### Community Participation Through Subscription

Active subscriptions grant users the following participation rights within the subscribed community:

- The ability to create new posts in the community
- The ability to view all posts in the community regardless of publication status
- The ability to vote on posts and comments within the community
- The ability to comment on posts within the community

These participation rights are contingent on the subscription remaining active and the user not being banned from the community.

### Unsubscription Rules

### Unsubscription Rules

WHEN a user unsubscribes from a community,
THE system SHALL immediately terminate the user's active subscription.

After unsubscription:
- The user can no longer create posts in that community
- The user's existing posts and comments in the community remain visible
- The user's existing votes remain recorded
- The user can resubscribe to the community at any time

The system SHALL allow users to unsubscribe from communities they have previously joined regardless of how long they have been subscribed.

### Subscription Error Conditions

### Subscription Error Conditions

The following conditions result in subscription operation failures:

| Condition | Error Outcome |
|-----------|---------------|
| User is not authenticated | Subscription request rejected |
| Community does not exist | Subscription request rejected |
| User is already subscribed | Subscription request rejected with duplicate message |
| User is banned from community | Subscription request rejected with ban notice |
| User requests own subscribed list while logged out | Access denied |

**IF** the subscription operation fails for any reason,
**THEN** the system SHALL return a descriptive error message indicating the specific cause,
**AND** SHALL NOT modify any existing subscription records.

## Post Rules

Every post must have a title field that is filled in by the author. Posts must belong to exactly one community and reference its author. A post must be categorized as one of three types: text post with content, link post with a URL, or image post with an uploaded image. Users can only edit posts they have created themselves, and they can delete their own posts. The system tracks the vote score and comment count for each post. Posts store their creation timestamp for chronological ordering. When displaying a single post, users see the full content along with the author username, community name, vote score, comment count, and posting time.

### Post Title Requirement

Every post must have a title when created.

The title represents the headline or subject line of the post that appears in listings and at the top of the post detail view.

If a user attempts to create a post without providing a title, the system rejects the request and informs the user that a title is required.

### Post Type Classification

Each post must be categorized as exactly one of three types: text post, link post, or image post.

A text post contains textual content for readers to view.

A link post contains a URL pointing to external content.

An image post contains an uploaded image file.

A post cannot belong to multiple types simultaneously. The type must be specified at creation time and determines what additional content fields are relevant.

### Text Post Content

When a user creates a text post, they must provide text content.

The content field accepts free-form text that users write to share information, ask questions, or start discussions.

This content is displayed in full when viewing the individual post.

Only posts of type text require the content field. Link posts and image posts do not use this field.

### Link Post URL

When a user creates a link post, they must provide a valid URL.

The URL points to external web content that users can visit by clicking through from the post.

When displaying link posts in a list, the system shows the domain name extracted from the URL (for example, "youtube.com" or "github.com").

Only posts of type link require the URL field. Text posts and image posts do not use this field.

### Image Post Upload

When a user creates an image post, they must upload an image file.

The uploaded image becomes the primary content of the post.

When displaying image posts in a list, the system shows a thumbnail of the uploaded image.

Only posts of type image require an uploaded image. Text posts and link posts do not use this field.

### Edit Own Posts

Users can modify the content of posts they have created.

A user cannot edit posts created by other users.

When editing, the user can update the title, content (for text posts), URL (for link posts), or replace the image (for image posts).

The post type itself cannot be changed after creation. For example, a text post cannot be converted to a link post.

The system preserves the original author and creation timestamp when a post is edited.

### Delete Own Posts

Users can remove posts they have created from the platform.

A user cannot delete posts created by other users.

When a post is deleted, all comments on that post are also removed.

When a post is deleted, all votes on that post are also removed.

The deletion is permanent and the post cannot be recovered.

### Post Author Ownership

Every post is associated with exactly one author (the user who created it).

The author is automatically recorded at the time of post creation and cannot be changed.

The author username is displayed when viewing the post.

The system uses the author information to track which posts a user has created for display on their profile.

### Post Vote Score

The system calculates and stores a vote score for each post.

The vote score equals the total number of upvotes minus the total number of downvotes.

The vote score can be negative if downvotes exceed upvotes.

The vote score is displayed alongside the post in listings and on the post detail view.

The vote score updates immediately when users vote or remove their vote on the post.

### Post Comment Count

The system tracks and displays the total number of comments on each post.

The comment count includes all top-level comments and all nested replies at any depth.

The comment count is displayed alongside the post in listings and on the post detail view.

The comment count updates when comments are added or deleted.

### Post Creation Time

The system records the timestamp when each post is created.

The creation timestamp is stored automatically and cannot be modified by users.

The creation time is used to determine chronological ordering for feeds sorted by newest first.

When displaying posts in a list, the system shows the time elapsed since creation (for example, "3 hours ago" or "2 days ago").

When displaying a single post, the system shows the exact posting time.

### Single Post Display

When a user views an individual post, the system displays the following information:

- The post title
- The full content (text content for text posts, the linked URL for link posts, or the full image for image posts)
- The author username
- The community name where the post was published
- The vote score
- The comment count
- The posting time (as an absolute timestamp)

This information gives users a complete view of the post and its context.

## Comment Rules

Comments can be written on any post by users who are logged in. Users can reply to existing comments, creating nested comment threads with no depth limitation. Each comment must reference its author and the post or parent comment it belongs to. Users can only edit or delete comments they have personally authored. Comments display their author's username, content, vote score, and time since posting. Nested replies are displayed under their parent comment to show conversation threads.

### Comment Creation

THE system SHALL allow logged-in users to write a comment on any post.

THE system SHALL require a comment to have content text when being created.

THE system SHALL automatically associate the creating user as the comment author.

THE system SHALL automatically record the time when the comment was created.

IF the user is not logged in, THEN the system SHALL reject attempts to create a comment.

IF the comment content is empty or missing, THEN the system SHALL reject the comment creation.

### Comment Reply Structure

THE system SHALL allow users to reply to any existing comment.

THE system SHALL allow replies to replies, creating nested comment threads with no depth limitation.

THE system SHALL require a reply to reference its parent comment.

THE system SHALL allow a reply to exist even if the parent comment or parent reply has been deleted, as long as the original post still exists.

THE system SHALL display nested replies under their parent comment to show conversation threads.

### Comment Author Ownership

THE system SHALL associate each comment with exactly one author.

THE system SHALL display the author's username on every comment.

THE system SHALL identify comments by their author through the author's username.

Only the author of a comment SHALL be permitted to edit or delete that comment.

### Comment Editing

THE system SHALL allow a user to edit their own comments.

THE system SHALL reject attempts to edit comments authored by other users.

THE system SHALL preserve the original posting time of a comment when it is edited.

THE system SHALL allow the content text of a comment to be changed during editing.

IF the user attempts to edit a comment they did not author, THEN the system SHALL reject the request.

### Comment Deletion

THE system SHALL allow a user to delete their own comments.

THE system SHALL reject attempts to delete comments authored by other users.

THE system SHALL remove the content of a deleted comment while preserving the comment structure for nested replies.

Deleted comments SHALL continue to display their nested replies.

Deleted comments SHALL no longer display their original content text.

IF the user attempts to delete a comment they did not author, THEN the system SHALL reject the request.

### Comment Vote Score

THE system SHALL display the vote score on every comment.

THE comment vote score SHALL equal the total upvotes minus the total downvotes.

THE system SHALL apply the same voting rules to comments as apply to posts.

A logged-in user SHALL be able to upvote or downvote a comment.

A logged-in user SHALL only be able to vote once per comment.

A logged-in user SHALL be able to change their vote from upvote to downvote or vice versa.

A logged-in user SHALL be able to remove their vote from a comment.

When a vote is removed, the author's karma SHALL be adjusted accordingly.

### Comment Posting Time

THE system SHALL automatically record the posting time when a comment is created.

THE system SHALL display the time since posting for every comment.

Comment posting time SHALL be expressed relative to the current time (for example, "3 hours ago").

THE system SHALL update the relative time display as time passes.

### Comment Display and Threading

THE system SHALL display comments with their author username, content text, vote score, and time since posted.

THE system SHALL display nested replies indented under their parent comment.

THE system SHALL support three sorting options for comments on a post:
- Best: highest vote score first
- New: most recent first
- Controversial: many votes but score close to zero first

THE system SHALL show all nested replies by default without collapsing threads.

Deleted comments SHALL be displayed with a placeholder indicating the comment was removed, while preserving the display of their nested replies.

## Vote Rules

Users can upvote posts or comments to increase their vote score by one point. Users can downvote posts or comments to decrease their vote score by one point. Each user is limited to one vote per post and one vote per comment. Users can change their existing vote from upvote to downvote or vice versa. Users can remove their vote entirely from any post or comment they have previously voted on. Vote score for any content is calculated as the total number of upvotes minus the total number of downvotes. When a vote is removed, the karma adjustment is reversed for the content author.

### Upvote Operation

A user can upvote any post or comment in the system.

WHEN a user upvotes a post or comment, THE system SHALL increase the vote score of that content by one point.

WHEN a user upvotes a post or comment, THE system SHALL increase the karma score of the content author by one point.

WHEN a user upvotes a post or comment they have already downvoted, THE system SHALL change the vote to upvote and increase the score by two points total (one to remove the downvote effect, one to add the upvote effect).

IF the user is not authenticated, THE system SHALL reject the upvote request.

### Downvote Operation

A user can downvote any post or comment in the system.

WHEN a user downvotes a post or comment, THE system SHALL decrease the vote score of that content by one point.

WHEN a user downvotes a post or comment, THE system SHALL decrease the karma score of the content author by one point.

WHEN a user downvotes a post or comment they have already upvoted, THE system SHALL change the vote to downvote and decrease the score by two points total (one to remove the upvote effect, one to add the downvote effect).

IF the user is not authenticated, THE system SHALL reject the downvote request.

### Vote Uniqueness Constraint

Each user can only have one vote on any given post.

IF a user attempts to upvote a post they have already upvoted, THE system SHALL reject the request.

IF a user attempts to downvote a post they have already downvoted, THE system SHALL reject the request.

Each user can only have one vote on any given comment.

IF a user attempts to upvote a comment they have already upvoted, THE system SHALL reject the request.

IF a user attempts to downvote a comment they have already downvoted, THE system SHALL reject the request.

The system SHALL prevent a user from having both an upvote and a downvote on the same piece of content simultaneously.

### Vote Direction Change

A user can change their vote from upvote to downvote on any post or comment they have previously upvoted.

WHEN a user changes a vote from upvote to downvote, THE system SHALL remove the upvote effect from the vote score and apply the downvote effect, resulting in a net change of two points.

WHEN a user changes a vote from upvote to downvote, THE system SHALL remove the karma increase from the content author and apply a karma decrease instead.

A user can change their vote from downvote to upvote on any post or comment they have previously downvoted.

WHEN a user changes a vote from downvote to upvote, THE system SHALL remove the downvote effect from the vote score and apply the upvote effect, resulting in a net change of two points.

WHEN a user changes a vote from downvote to upvote, THE system SHALL remove the karma decrease from the content author and apply a karma increase instead.

### Vote Removal

A user can remove their vote from any post they have previously voted on.

WHEN a user removes an upvote from a post, THE system SHALL decrease the vote score by one point.

WHEN a user removes a downvote from a post, THE system SHALL increase the vote score by one point.

A user can remove their vote from any comment they have previously voted on.

WHEN a user removes an upvote from a comment, THE system SHALL decrease the vote score by one point.

WHEN a user removes a downvote from a comment, THE system SHALL increase the vote score by one point.

IF the user has not voted on the post or comment, THE system SHALL reject the removal request.

### Vote Score Calculation

The vote score for any post is calculated as the total number of upvotes minus the total number of downvotes.

THE vote score SHALL be displayed as a single integer value.

A post or comment with more downvotes than upvotes SHALL have a negative vote score.

A post or comment with equal upvotes and downvotes SHALL have a vote score of zero.

The vote score SHALL update immediately when any vote action occurs.

The displayed vote score SHALL reflect all votes cast by all users.

### Karma Adjustment from Votes

When a user receives an upvote on their post, their karma score SHALL increase by one point.

When a user receives a downvote on their post, their karma score SHALL decrease by one point.

When a user receives an upvote on their comment, their karma score SHALL increase by one point.

When a user receives a downvote on their comment, their karma score SHALL decrease by one point.

Karma scores can become negative if a user receives more downvotes than upvotes overall.

The karma adjustment SHALL occur at the same time as the vote is recorded.

### Karma Reversal on Vote Removal

WHEN a user removes an upvote they previously cast on content, THE system SHALL decrease the karma of the content author by one point.

WHEN a user removes a downvote they previously cast on content, THE system SHALL increase the karma of the content author by one point.

WHEN a user changes their vote from upvote to downvote, THE system SHALL decrease the karma of the content author by two points (one to reverse the upvote, one for the new downvote).

WHEN a user changes their vote from downvote to upvote, THE system SHALL increase the karma of the content author by two points (one to reverse the downvote, one for the new upvote).

The karma adjustment reversal SHALL be applied immediately when the vote change or removal occurs.

## Moderator Rules

The creator of a community automatically becomes the owner with highest authority within that community. Community owners can add other users as moderators to help manage the community. Owners can remove moderators when they no longer wish them to have moderator privileges. Moderators can promote other users to moderator status but cannot remove the community owner. Moderators cannot remove other moderators from their position; only the owner has that authority. When a user is removed as moderator, they lose access to moderation tools and cannot perform moderator actions.

### Automatic Owner Assignment on Community Creation

When a user creates a community, that user is automatically assigned as the owner of the community upon creation.

THE system SHALL assign the creating user as the owner of the newly created community.

THE system SHALL store the owner reference at the time of community creation.

The owner assignment is permanent and cannot be transferred to another user through the system.

### Community Owner Authority

The owner of a community has the highest authority within that community.

THE owner MAY perform all moderation actions within their community.

THE owner SHALL have the exclusive ability to add moderators to their community.

THE owner SHALL have the exclusive ability to remove any moderator from their community.

THE owner SHALL have the exclusive ability to remove other moderators.

Only the owner can perform these highest-authority actions; no other role shares this privilege.

### Adding Moderators

THE owner of a community MAY add any registered user as a moderator of that community.

When adding a moderator, the owner specifies the user to be promoted and the system grants them moderator status.

Adding a user as moderator gives them access to moderation tools for that specific community.

A user who is already a moderator cannot be added again.

A user who is banned from the community cannot be added as a moderator while the ban is active.

### Removing Moderators

THE owner of a community MAY remove any moderator from that community.

When a moderator is removed, the system SHALL revoke their access to moderation tools for that community immediately.

THE removed user loses the ability to perform moderator actions in that community.

Removed moderators can be re-added as moderators in the future by the owner.

Removing a moderator does not affect any content or actions that moderator previously performed.

### Moderator Promotion Authority

A moderator SHALL have the ability to add other users as moderators to the same community.

This allows delegation of moderation responsibilities without requiring owner involvement.

Moderators can promote trusted community members to help manage the community.

The promotion process follows the same rules as adding moderators.

### Owner Protection from Removal

THE system SHALL prevent the removal of the community owner by any user, including other moderators.

IF a user attempts to remove the owner of a community, THEN the system SHALL reject the request.

The owner has absolute protection from being demoted or removed from their own community.

This protection exists regardless of who initiates the action.

No amount of consensus among other moderators can override this protection.

### Moderator Hierarchy

There are two distinct roles within a community: owner and moderator.

The owner holds supreme authority and cannot be removed or demoted.

Moderators hold delegated authority and can be removed by the owner.

Moderators cannot remove each other; only the owner can remove a moderator.

Moderators cannot remove the owner under any circumstances.

This creates a clear chain of authority where the owner is always at the top.

### Revoking Moderator Privileges

When a user's moderator status is revoked, the system SHALL immediately remove their access to moderation tools.

A user whose moderator privileges are revoked SHALL lose the ability to perform any moderator actions in that community.

Revoked moderator privileges do not affect the user's regular member privileges.

The user can still post, comment, vote, and subscribe in the community.

The user remains a subscriber if they were previously subscribed.

The user can be re-added as a moderator by the owner in the future.

### Loss of Moderation Capabilities After Removal

Moderators who are removed from their position lose access to the following:

THE removed moderator SHALL no longer be able to delete posts in that community.

THE removed moderator SHALL no longer be able to delete comments in that community.

THE removed moderator SHALL no longer be able to ban users from that community.

THE removed moderator SHALL no longer be able to unban users from that community.

THE removed moderator SHALL no longer be able to view reports for that community.

THE removed moderator SHALL no longer be able to approve or dismiss reports for that community.

These restrictions apply immediately upon removal.

## Ban Rules

Moderators can ban users from their community when they violate community rules. Banned users cannot create new posts or comments in that community. Banned users can still view community content and cannot read posts or comments. Moderators can lift a ban to allow a user to participate again. Moderators maintain a list of currently banned users for their community. The owner of a community cannot be banned from their own community.

### Ban Rules

## Ban Initiation

Moderators can ban users from communities they moderate when users violate community rules.

WHEN a moderator initiates a ban, THE system SHALL record the banned user, the community, and the moderator who issued the ban.

THE system SHALL prevent moderators from banning users who are themselves moderators or owners of the same community.

## Posting Restriction

Banned users cannot create new posts in the community from which they are banned.

IF a banned user attempts to create a post in a banned community, THEN the system SHALL reject the request.

Banned users cannot create new comments in the banned community.

IF a banned user attempts to comment on any post within the banned community, THEN the system SHALL reject the request.

## Viewing Access

Banned users CAN still view community content including posts and comments.

Banned users CAN browse community feeds and view post details.

Banned users CAN view the profiles of other users in the community.

## Ban Removal

Moderators can lift a ban to allow a user to participate again.

WHEN a moderator lifts a ban, THE system SHALL remove the user from the banned list for that community.

THE system SHALL immediately restore the user's ability to create posts and comments in the community after the ban is lifted.

## Banned User List

Moderators can view a list of all currently banned users for their community.

THE banned user list SHALL display each banned user's identifier and when the ban was issued.

## Owner Exemption

THE owner of a community cannot be banned from their own community by any moderator.

IF a moderator attempts to ban the community owner, THEN the system SHALL reject the request.

Moderators cannot ban other moderators from the same community.

## Report Rules

Users can report any post or comment they believe violates community rules or platform guidelines. A report must include a reason text explaining why the content is being reported. Moderators can view all reports submitted for content within their community. Each report displays the reported content, the reporting user, and the reason provided. Moderators can approve a report to remove the offending content from the platform. Moderators can dismiss a report to indicate the content does not violate rules and should remain.

### Report Creation and Validation

## Report Submission

THE system SHALL allow a user to report a post or comment.

## Report Reason Requirement

WHEN a user submits a report, THE system SHALL require the user to provide a reason text explaining why the content is being reported.

THE system SHALL reject any report submission that does not include a reason text.

## Report Reason Content

THE reason text provided by the reporting user SHALL be stored with the report and made available to moderators who review the report.

## Report Content Identification

WHEN a user reports content, THE system SHALL identify whether the reported item is a post or a comment and store the appropriate reference.

## Report Visibility to Moderators

THE system SHALL allow moderators to view all reports submitted for content within their community.

EACH report displayed to moderators SHALL show the reported content, the reporting user, and the reason provided.

## Report Approval Action

WHEN a moderator approves a report, THE system SHALL remove the reported content from the platform.

If the reported content is a post, THE system SHALL remove the post and all associated comments.

If the reported content is a comment, THE system SHALL remove the comment and all nested replies.

## Report Dismissal Action

WHEN a moderator dismisses a report, THE system SHALL keep the reported content on the platform.

THE system SHALL remove dismissed reports from the moderator's report list so they do not appear again.

## Report Content Accessibility

Moderators SHALL be able to view the full details of the reported content when reviewing a report.

## One Report Per User Per Item

THE system SHALL allow a user to submit only one report per piece of content.

If a user has already reported a specific post or comment, THE system SHALL reject additional reports on the same item from that user.

### Report Processing Rules

## Vote Score Adjustment on Content Removal

WHEN content is removed following report approval, THE system SHALL NOT adjust any karma scores for votes that were previously cast on the removed content.

## Report Immutability After Submission

ONCE a report has been submitted, THE system SHALL NOT allow the reporting user to modify the reason text.

## Reporter Identity Visibility

Moderators SHALL be able to see which user submitted each report.

## Community Scope for Report Viewing

Moderators SHALL only see reports for content within communities they moderate.

Moderators SHALL NOT see reports for content in communities they do not moderate.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Community List Filtering

WHEN a user browses the list of communities, THE system SHALL display all communities sorted by subscriber count in descending order by default.

WHEN a user enters a search term in the community search field, THE system SHALL display only communities whose names contain the search term, case-insensitive.

WHEN a user enters an empty search term, THE system SHALL display all communities.

WHERE a user has not subscribed to any community, THE system SHALL display an empty subscribed communities list without error.

WHERE a user requests the list of subscribed communities, THE system SHALL display only communities the user has actively subscribed to.

### Post Feed Sorting

WHEN a user selects Hot sorting for any post feed, THE system SHALL display posts ordered by a combination of recent activity and vote score, where posts with many upvotes within a recent timeframe appear first.

WHEN a user selects New sorting for any post feed, THE system SHALL display posts ordered by creation date in descending order, with the most recently created posts appearing first.

WHEN a user selects Top sorting for any post feed, THE system SHALL display posts ordered by vote score in descending order.

WHEN a user selects Top sorting, THE system SHALL require the user to select a time filter.

WHERE the user selects "today" as the time filter, THE system SHALL display only posts created within the current day.

WHERE the user selects "this week" as the time filter, THE system SHALL display only posts created within the past seven days.

WHERE the user selects "this month" as the time filter, THE system SHALL display only posts created within the current calendar month.

WHERE the user selects "this year" as the time filter, THE system SHALL display only posts created within the current calendar year.

WHERE the user selects "all time" as the time filter, THE system SHALL display all posts regardless of creation date.

WHEN a user selects Controversial sorting for any post feed, THE system SHALL display posts ordered by the closeness of upvotes to downvotes, where posts with many votes on both sides but a net score near zero appear first.

WHEN a user does not select a sorting option, THE system SHALL default to Hot sorting for post feeds.

### Post Feed Pagination

WHEN a user requests a post feed, THE system SHALL return a limited number of posts per page.

WHEN a user reaches the end of a feed page, THE system SHALL provide a way to load the next page of posts.

WHEN a user requests a specific page number, THE system SHALL display posts corresponding to that page position within the feed.

WHEN a user attempts to access a page beyond the available posts, THE system SHALL display an empty result without error.

WHEN the total number of posts changes while browsing paginated results, THE system SHALL preserve the current page position.

WHERE pagination parameters are missing from a request, THE system SHALL default to the first page of results.

### Comment Sorting

WHEN a user views comments on a post without selecting a sort option, THE system SHALL default to Best sorting, displaying comments ordered by vote score in descending order.

WHEN a user selects Best sorting for comments, THE system SHALL display comments ordered by vote score in descending order, with highest-scoring comments appearing first.

WHEN a user selects New sorting for comments, THE system SHALL display comments ordered by creation date in descending order, with the most recently created comments appearing first.

WHEN a user selects Controversial sorting for comments, THE system SHALL display comments ordered by the closeness of upvotes to downvotes, where comments with many votes on both sides but a net score near zero appear first.

WHERE nested replies exist, THE system SHALL display replies indented under their parent comment, maintaining the selected sort order within each nesting level.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### User Account Error Scenarios

### Authentication Errors

When a user attempts to sign up with an email address that is already registered in the system, the registration request shall be rejected with a message indicating the email is already in use.

When a user attempts to sign up with a username that is already taken by another user, the registration request shall be rejected with a message indicating the username is unavailable.

When a user attempts to log in with an email address that does not exist in the system, the login request shall be rejected with a message indicating no account exists with that email.

When a user attempts to log in with an incorrect password, the login request shall be rejected with a message indicating the password is incorrect.

### Password Change Errors

When a user attempts to change their password without providing their current password, the password change request shall be rejected.

When a user attempts to change their password with an incorrect current password, the password change request shall be rejected with a message indicating the current password is incorrect.

### Account Deletion Errors

When a user attempts to delete their account while being the owner of one or more communities, the deletion request shall be rejected unless the user first transfers ownership or deletes all their communities.

When a user attempts an operation requiring authentication while not logged in, the system shall treat the user as a guest and apply guest permissions.

### Community Creation Error Scenarios

### Community Creation Errors

When a user attempts to create a community with a name that is already used by another community, the creation request shall be rejected with a message indicating the community name is already taken.

When a user attempts to create a community without providing a name, the creation request shall be rejected with a message indicating a community name is required.

When a user attempts to create a community without providing a description, the system shall either reject the request or use an empty description, depending on whether description is marked as required.

### Community Search Errors

When a user searches for communities using an empty search term, the system shall return no results or display all communities depending on implementation behavior.

### Subscription Error Scenarios

### Subscription Errors

When a user who is banned from a community attempts to subscribe to that community, the subscription request shall be rejected with a message indicating the user is banned from the community.

When a user who is already subscribed to a community attempts to subscribe again, the system shall either reject the duplicate request or treat it as a no-operation.

When a user attempts to create a post in a community they are not subscribed to, the post creation request shall be rejected with a message indicating the user must subscribe before posting.

### Post Error Scenarios

### Post Creation Errors

When a user attempts to create a post without providing a title, the post creation request shall be rejected with a message indicating a title is required.

When a user attempts to create a text post without providing any content, the post creation request shall be rejected with a message indicating content is required for text posts.

When a user attempts to create a link post without providing a valid URL, the post creation request shall be rejected with a message indicating a valid URL is required.

When a user attempts to create an image post without providing an image file, the post creation request shall be rejected with a message indicating an image is required.

### Post Edit and Delete Errors

When a user attempts to edit a post they do not own, the edit request shall be rejected with a message indicating the user does not have permission to edit that post.

When a user attempts to delete a post they do not own, the delete request shall be rejected with a message indicating the user does not have permission to delete that post.

When a moderator attempts to delete a post that does not belong to their community, the delete request shall be rejected.

When a user attempts to view a post that has been deleted, the system shall return an error message indicating the post is not available.

### Post Retrieval Errors

When a user attempts to view a single post that does not exist, the system shall return an error message indicating the post was not found.

When a user attempts to access a post in a community they do not have permission to view, the system shall return an error message indicating the post was not found or the user lacks permission.

### Comment Error Scenarios

### Comment Creation Errors

When a user attempts to write a comment on a post that does not exist, the comment creation request shall be rejected with a message indicating the post was not found.

When a user attempts to write a comment on a deleted post, the comment creation request shall be rejected with a message indicating comments cannot be added to deleted posts.

When a user attempts to reply to a comment that does not exist, the reply request shall be rejected with a message indicating the parent comment was not found.

### Comment Edit and Delete Errors

When a user attempts to edit a comment they do not own, the edit request shall be rejected with a message indicating the user does not have permission to edit that comment.

When a user attempts to delete a comment they do not own, the delete request shall be rejected with a message indicating the user does not have permission to delete that comment.

When a moderator attempts to delete a comment that does not belong to their community, the delete request shall be rejected.

### Comment Visibility Errors

When a user attempts to view a comment that has been deleted, the system shall either hide the comment content or display a message indicating the comment has been removed.

### Voting Error Scenarios

### Vote Restriction Errors

When a user attempts to vote on their own post, the system shall reject the vote or not count it.

When a user attempts to vote on their own comment, the system shall reject the vote or not count it.

When an unauthenticated user attempts to vote on any post or comment, the vote request shall be rejected with a message indicating login is required to vote.

### Duplicate Vote Errors

When a user who has already upvoted a post attempts to upvote again, the system shall either remove the existing vote or update it to the same direction (no net change).

When a user who has already downvoted a post attempts to downvote again, the system shall either remove the existing vote or update it to the same direction (no net change).

### Vote Adjustment Errors

When a user removes their upvote from a post, the author's karma shall decrease by 1.

When a user removes their downvote from a post, the author's karma shall increase by 1.

When a user changes their vote from upvote to downvote, the author's karma shall decrease by 2.

When a user changes their vote from downvote to upvote, the author's karma shall increase by 2.

### Moderation Error Scenarios

### Moderator Assignment Errors

When a user who is not the owner attempts to add a moderator to a community, the request shall be rejected with a message indicating only the owner can add moderators.

When a moderator who is not the owner attempts to remove another moderator, the request shall be rejected with a message indicating only the owner can remove moderators.

When a user attempts to remove the community owner from the moderator list, the request shall be rejected with a message indicating the owner cannot be removed.

When a user who is already a moderator attempts to be added as a moderator again, the system shall treat it as a no-operation.

### Moderation Action Errors

When a user who is not a moderator attempts to delete a post in a community, the delete request shall be rejected with a message indicating the user does not have permission.

When a moderator attempts to delete a post that belongs to a different community, the delete request shall be rejected.

When a moderator attempts to perform moderation actions on a community where they are not a moderator, the actions shall be rejected.

### Ban Management Error Scenarios

### Ban Action Errors

When a user attempts to ban a user who is already banned from the community, the ban request shall be rejected or treated as a no-operation.

When a user who is not a moderator attempts to ban a user from a community, the ban request shall be rejected with a message indicating the user does not have permission to ban users.

When a moderator attempts to ban the community owner, the ban request shall be rejected with a message indicating the owner cannot be banned.

When a banned user attempts to create a post in the community, the post creation request shall be rejected with a message indicating the user is banned from that community.

When a banned user attempts to write a comment in the community, the comment creation request shall be rejected with a message indicating the user is banned from that community.

### Unban Action Errors

When a user who is not a moderator attempts to unban a user from a community, the unban request shall be rejected.

When a moderator attempts to unban a user who is not banned, the unban request shall be rejected or treated as a no-operation.

### Reporting Error Scenarios

### Report Submission Errors

When a user attempts to report a post without providing a reason, the report request shall be rejected with a message indicating a reason is required.

When a user attempts to submit an empty reason text for a report, the report request shall be rejected.

When an unauthenticated user attempts to report any content, the report request shall be rejected with a message indicating login is required to submit reports.

When a user attempts to report their own content, the system shall either reject the request or allow it depending on platform policy.

### Report Review Errors

When a user who is not a moderator attempts to view reports for a community, the request shall be rejected with a message indicating the user does not have permission to view reports.

When a moderator attempts to view reports for a community where they are not a moderator, the request shall be rejected.

When a moderator attempts to approve a report that has already been dismissed, the system shall either reject the request or treat it as a no-operation.

When a moderator attempts to dismiss a report that has already been approved, the system shall either reject the request or treat it as a no-operation.

### Feed Browsing Error Scenarios

### Feed Access Errors

When a guest user attempts to access the home feed, the system shall reject the request with a message indicating login is required to view the home feed.

When a user requests a feed page that does not exist (page number beyond available results), the system shall return an empty feed or a message indicating no posts are available.

### Sorting and Filtering Errors

When a user requests posts with an invalid time filter (for example, a future date range), the system shall either reject the request or return no results.

When a user requests posts with an unsupported sort option, the system shall default to a valid sort option.

### Search Errors

When a user searches for content using terms that yield no matches, the system shall display a message indicating no results were found.

When a user attempts to search with special characters or overly broad search terms that cannot be processed, the system shall handle the input gracefully and either return no results or suggest refining the search.

### Profile Error Scenarios

### Profile View Errors

When a user attempts to view the profile of a user who does not exist, the system shall return an error message indicating the user was not found.

### Profile Edit Errors

When a user attempts to edit another user's profile, the edit request shall be rejected with a message indicating the user does not have permission to edit that profile.

When a user attempts to set their display name to an empty string, the system shall either reject the request or retain the previous display name.

### Karma Display Errors

When a user's karma score is negative, the system shall display the negative number correctly.

When a user has no posts or comments, their karma score shall be zero.

When karma is recalculated after vote removals or account deletions, the displayed karma shall reflect the current total.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Validation Rules

### Upload Size Limits

THE system SHALL reject any uploaded file exceeding five megabytes.

THE system SHALL reject any uploaded file smaller than one kilobyte.

### File Name Validation

THE system SHALL reject files with names containing special characters other than letters, numbers, hyphens, and underscores.

THE system SHALL reject files with names exceeding two hundred and fifty-five characters.

THE system SHALL automatically rename files to remove invalid characters before processing.

### Image Dimension Requirements

THE system SHALL require uploaded images to have a minimum dimension of fifty pixels on either side.

THE system SHALL require uploaded images to have a maximum dimension of eight thousand pixels on either side.

### Thumbnail Generation

THE system SHALL generate a thumbnail for all uploaded images within five minutes of upload.

THE system SHALL reject thumbnail generation for non-image files.

### Virus Scanning Requirements

### Pre-Storage Scanning

THE system SHALL scan all uploaded files for malicious content before the upload is finalized.

THE system SHALL quarantine any file flagged as potentially malicious during scanning.

### Scan Failure Handling

IF a virus scan fails to complete due to system error, THEN THE system SHALL reject the upload and notify the user.

IF a virus scan result is inconclusive, THEN THE system SHALL quarantine the file and notify administrators.

### Scan Result Storage

THE system SHALL store scan results with timestamps for audit purposes.

THE system SHALL retain scan records for at least ninety days.

### Content Type Restrictions

### Permitted Image Formats

THE system SHALL only accept image files in the following formats: JPEG, PNG, GIF, and WebP.

THE system SHALL reject files with extensions that do not match the actual file type.

### MIME Type Validation

THE system SHALL verify that the declared content type matches the actual file content.

THE system SHALL reject files with content types not matching the expected MIME type for the declared format.

### File Extension Validation

THE system SHALL reject files with double extensions such as .jpg.php or .png.gif.

THE system SHALL reject files without any recognized extension.

### Retention Policies

### Active File Retention

THE system SHALL retain uploaded files as long as the associated content remains on the platform.

### Orphaned File Handling

IF a post containing an uploaded image is deleted, THEN THE system SHALL delete the associated image file after thirty days.

IF a user deletes their account, THEN THE system SHALL delete all their avatar image after account deletion.

IF a community is deleted, THEN THE system SHALL delete the community icon image after thirty days.

### Report-Related File Retention

THE system SHALL retain files associated with reported content until the report is resolved.

IF a report is dismissed, THEN THE system SHALL apply standard retention policies to the associated files.

IF a report is approved and content is deleted, THEN THE system SHALL delete associated files after the standard retention period.

### Error Scenarios

### Upload Rejection Scenarios

IF a user attempts to upload a file exceeding the size limit, THEN THE system SHALL reject the upload and display an error message.

IF a user attempts to upload a file with a disallowed content type, THEN THE system SHALL reject the upload and display an error message.

IF a virus scan detects malicious content, THEN THE system SHALL reject the upload and notify the user that the file could not be processed.

### Validation Failure Scenarios

IF file validation fails due to corrupted data, THEN THE system SHALL reject the upload and notify the user.

IF file validation fails due to mismatched content type and extension, THEN THE system SHALL reject the upload and notify the user.

### Processing Timeout Scenarios

IF virus scanning exceeds five minutes, THEN THE system SHALL cancel the scan and reject the upload.

IF thumbnail generation fails, THEN THE system SHALL mark the thumbnail as unavailable without blocking the original upload.