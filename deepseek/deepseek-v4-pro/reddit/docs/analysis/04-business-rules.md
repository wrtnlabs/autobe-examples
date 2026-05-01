**communityHub — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Every user must register with a unique email address and a unique username. The email must be in a valid email format; the system rejects registrations with malformed email addresses. The username must be distinct across the entire platform — no two users may share the same username. Passwords are required and must meet minimum security criteria before the account is created. A user can change their password at any time, but must provide their current password to do so. When a user deletes their account, all posts and comments they have authored are permanently removed from the platform. Each user has a single karma score that starts at zero and can become negative. The karma score adjusts whenever someone votes on the user's posts or comments: an upvote increases karma by one, a downvote decreases it by one, and a removed vote reverses the adjustment. Display name, bio text, and avatar image are optional profile fields that users can set and update. A user's profile is publicly viewable by anyone, including logged-out visitors.

### Email Uniqueness and Format

IF a user attempts to register with an email address already associated with another account, THEN THE communityHub SHALL reject the registration.

THE communityHub SHALL reject registrations with email addresses that do not conform to a valid email format.

### Username Uniqueness

IF a user attempts to register with a username already taken by another account, THEN THE communityHub SHALL reject the registration.

THE communityHub SHALL enforce username uniqueness across the entire platform — no two users may share the same username.

### Password Security and Change

THE communityHub SHALL require passwords to meet minimum security criteria before account creation is accepted.

IF a user attempts to change their password without providing their current password, THEN THE communityHub SHALL reject the change request.

IF the provided current password does not verify successfully, THEN THE communityHub SHALL reject the change request.

### Account Deletion Cascading

WHEN a user deletes their account, THE communityHub SHALL permanently remove all posts authored by that user.

WHEN a user deletes their account, THE communityHub SHALL permanently remove all comments authored by that user.

### Karma Score Calculation

THE communityHub SHALL initialize every user's karma score to zero upon account creation.

THE communityHub SHALL allow karma scores to become negative.

WHEN a user's post or comment receives an upvote, THE communityHub SHALL increase that user's karma score by one.

WHEN a user's post or comment receives a downvote, THE communityHub SHALL decrease that user's karma score by one.

WHEN a vote on a user's post or comment is removed, THE communityHub SHALL reverse the corresponding karma adjustment.

### Profile Fields and Visibility

THE communityHub SHALL allow display name, bio text, and avatar image to remain unset — all three are optional profile fields.

THE communityHub SHALL make every user's profile publicly viewable to all visitors, including logged-out guests.

## Community Rules

A community must have a unique name across the entire platform; no two communities can share the same name. Every community has a description text that explains its purpose or topic. An icon image can be set for the community to represent it visually. The user who creates a community automatically becomes its owner and holds the highest authority over that community. Each community tracks its subscriber count, which reflects the total number of users currently subscribed. Anyone can browse the full list of communities, and users can search for communities by name. Communities are visible to all visitors, including those who are not logged in. A user must be subscribed to a community before they can create a post within it. Subscribing and unsubscribing are reversible actions with no restrictions — a user may subscribe to as many communities as they wish and unsubscribe at any time.

### Community Name Uniqueness

THE communityHub SHALL enforce platform-wide uniqueness of community names. No two communities may share the same name.

WHEN a user attempts to create a community, IF the chosen name already belongs to an existing community, THEN the system SHALL reject the request with an indication that the name is already taken.

Name comparison SHALL be case-insensitive to prevent visually identical duplicates.

### Community Description

WHEN a user creates a community, THE system SHALL require a description text.

IF the description is empty or omitted, THEN the system SHALL reject the creation request with an indication that a description is required.

The description explains the community's purpose or topic to potential subscribers.

### Community Icon

A community MAY have an icon image to represent it visually.

WHEN a community is created, the icon image is optional. If no icon is provided at creation time, the community SHALL display without an icon until one is set.

WHEN an icon is provided, THE system SHALL accept and store the image.

### Community Ownership

WHEN a user successfully creates a community, THE system SHALL automatically designate that user as the community owner.

The owner holds the highest authority within the community. Ownership privileges and moderator management rules are defined in Moderator Rules (Module 1, Unit 9).

### Subscriber Count

THE system SHALL track and display the subscriber count for each community.

WHEN a user subscribes to a community, THE system SHALL increment the subscriber count by one.

WHEN a user unsubscribes from a community, THE system SHALL decrement the subscriber count by one.

The subscriber count reflects the total number of users currently subscribed to that community at any given time.

### Subscription Requirement for Posting

THE system SHALL require a user to be subscribed to a community before creating a post within it.

IF a user who is not subscribed to a community attempts to create a post in that community, THEN the system SHALL reject the request.

Additional subscription rules — including unlimited subscriptions and unsubscribe at any time — are defined in Subscription Rules (Module 1, Unit 6).

### Community Visibility

THE system SHALL make all communities visible to all visitors, including guests who are not logged in.

Guests and members alike SHALL be able to browse the full list of communities and view any individual community's details — including its name, description, icon, and subscriber count.

### Community Search

THE system SHALL allow anyone — including guests — to search for communities by name.

WHEN a user provides a search term, THE system SHALL return communities whose names match the term. Partial matches SHALL be supported so that users can find communities without knowing the exact full name.

## Post Rules

Every post must have a title, which is required and cannot be empty. A post belongs to exactly one community and is authored by exactly one user. The author must be subscribed to the community at the time of creating the post; unsubscribed users cannot post. Each post must be one of exactly three types: a text post containing written content, a link post containing a URL, or an image post containing an uploaded image. The content requirements differ by type — a text post needs body text, a link post needs a valid URL, and an image post needs an uploaded image file. Only the author of a post can edit or delete it. When a post is deleted, all comments under it are also removed. Each post has a vote score calculated as total upvotes minus total downvotes. A post also tracks its total comment count. When displayed in a feed, text posts show the first 200 characters of their content, image posts show a thumbnail, and link posts show the domain name of the URL.

### Post Title Requirements

THE system SHALL require every post to have a title.

THE system SHALL reject any post where the title is missing, empty, or consists only of whitespace characters.

The title identifies the post to readers and is displayed in all post lists and on the post detail view.

### Post Ownership and Community Association

THE system SHALL ensure every post belongs to exactly one community (defined in Community Rules).

THE system SHALL ensure every post is authored by exactly one user (defined in User Rules).

The community and author associations are established when the post is created and cannot be changed afterward. A post cannot be moved to a different community or transferred to a different author.

### Subscription Requirement for Post Creation

THE system SHALL permit a user to create a post in a community only when the user holds an active subscription to that community (defined in Subscription Rules).

IF a user attempts to create a post in a community they are not subscribed to, THEN the system SHALL reject the request.

IF a user's subscription to a community is removed after they have created posts, THEN those existing posts remain unaffected.

### Post Type Requirements

THE system SHALL require every post to be exactly one of three types: text, link, or image.

For a text post, THE system SHALL require body content and SHALL reject the post if no body text is provided or the body text is empty.

For a link post, THE system SHALL require a valid URL and SHALL reject the post if the URL is missing, empty, or does not conform to a valid URL format.

For an image post, THE system SHALL require an uploaded image file and SHALL reject the post if no image is provided. File validation rules for images are defined in File Validation and Policies.

A post cannot combine multiple types. A text post cannot also include a URL as primary content, and a link post cannot also include an image upload as primary content.

### Post Editing and Deletion Authorization

THE system SHALL permit only the author of a post to edit that post.

IF a user who is not the author attempts to edit a post, THEN the system SHALL reject the request.

THE system SHALL permit only the author of a post to delete that post.

IF a user who is not the author attempts to delete a post, THEN the system SHALL reject the request.

Community moderators may also delete posts in their community, as defined in Moderator Rules.

### Post Deletion Cascade

WHEN a post is deleted by its author or by a moderator, THE system SHALL also delete all comments that belong to that post.

All comments deleted by cascade include top-level comments and all nested replies at any depth.

User account deletion cascades to posts and comments as defined in User Rules.

### Vote Score Calculation

THE system SHALL calculate a post's vote score as the total number of upvotes minus the total number of downvotes.

A post's vote score can be negative when downvotes exceed upvotes.

WHEN a user casts, changes, or removes a vote on a post, THE system SHALL immediately update the post's vote score to reflect the new total.

WHEN a post's vote score changes, THE system SHALL adjust the post author's karma score accordingly (karma rules are defined in User Rules).

### Comment Count Tracking

THE system SHALL track the total number of comments on each post.

The comment count includes all top-level comments plus all nested replies at every depth.

WHEN a new comment or reply is added to a post, THE system SHALL increment the post's comment count by one.

WHEN a comment or reply is deleted from a post, THE system SHALL decrement the post's comment count by one.

IF a comment is deleted by a moderator or by cascade from post deletion, THEN the system SHALL also decrement the comment count accordingly.

### Feed Display Rules by Post Type

WHEN displaying a post in any feed or list view, THE system SHALL render the content preview according to the post type.

For a text post, THE system SHALL display the first 200 characters of the body content. If the body content is 200 characters or fewer, the entire content is displayed.

For an image post, THE system SHALL display a thumbnail of the uploaded image.

For a link post, THE system SHALL display the domain name extracted from the URL.

All post types SHALL also display the title, author username, community name, vote score, comment count, and time since posted in all feeds, as defined in List Browsing Expectations.

## Comment Rules

A comment must have content text and cannot be empty. Every comment is associated with exactly one post and is authored by exactly one user. Users can reply to any existing comment, and replies can themselves have replies with no depth limit — the nesting can go arbitrarily deep. Only the author of a comment can edit or delete it. When a comment is deleted, any nested replies beneath it remain visible but the deleted comment's content is no longer shown. Each comment has its own vote score, calculated as total upvotes minus total downvotes, independent of the parent post's score. Comments display the author, content, vote score, and how long ago they were posted. Comments can be sorted by best (highest vote score first), newest (most recent first), or controversial (many votes with score close to zero).

### Comment Content Requirements

THE system SHALL require every comment to have non-empty content text.

WHEN a user attempts to create or edit a comment with blank content (empty string or whitespace only), THEN the system SHALL reject the request.

THE system SHALL reject any comment submission where the content text is missing entirely.

### Comment Association Rules

THE system SHALL associate every comment with exactly one post.

THE system SHALL associate every comment with exactly one author (the user who created it).

WHEN a comment is created, THEN the system SHALL permanently link it to both the target post and the creating user.

A comment cannot be moved to a different post after creation. A comment's author cannot be changed after creation.

### Comment Reply Rules

THE system SHALL allow users to reply to any existing comment on a post.

THE system SHALL allow replies to themselves have replies, with no depth limit — nesting may continue arbitrarily deep.

WHEN a user replies to a comment, THEN the system SHALL create a new comment linked to the parent comment and the same post.

A top-level comment (one replying directly to the post, not to another comment) has no parent comment.

### Comment Edit and Delete Authorization

THE system SHALL allow only the author of a comment to edit that comment.

THE system SHALL allow only the author of a comment to delete that comment.

WHEN a user who is not the author attempts to edit a comment, THEN the system SHALL reject the request.

WHEN a user who is not the author attempts to delete a comment, THEN the system SHALL reject the request.

Note: Community moderators retain the ability to delete any comment within their community as defined in Moderator Rules (Module 1, Unit 8). This section applies to non-moderator, non-owner users acting on comments they did not author.

### Deleted Comment Behavior

WHEN a comment is deleted, THEN the system SHALL hide the comment's content text from display while preserving the comment structure so that any nested replies beneath it remain visible.

THE system SHALL indicate that a deleted comment formerly existed in the thread (for example, displaying a placeholder such as "[deleted]" or "comment removed") so that the reply chain remains coherent.

Replies to a deleted comment remain fully visible and interactive — users can still vote on them, reply to them, and edit or delete them if they are the author.

### Comment Vote Score Independence

THE system SHALL calculate each comment's vote score independently of its parent post's vote score.

THE comment vote score is defined as total upvotes minus total downvotes on that comment only.

A change in the post's vote score does not affect the vote score of any comment on that post. Conversely, voting on a comment does not affect the post's vote score.

Individual voting rules (one vote per user per comment, vote value of +1 or -1, ability to change or remove votes) are defined in Vote Rules (Module 1, Unit 4).

### Comment Sorting Rules

THE system SHALL support sorting comments on a post using the following options:

- **Best**: Comments with the highest vote score appear first. Comments with equal vote scores are ordered by creation time (newer first).

- **New**: Comments with the most recent creation time appear first.

- **Controversial**: Comments that have received many votes (both upvotes and downvotes) but whose net vote score is close to zero appear first. The system calculates controversiality based on the ratio of total votes cast to the net vote score — a higher ratio indicates greater controversy.

WHEN a user selects a sorting option, THEN the system SHALL display the comment thread ordered accordingly, with nested replies appearing beneath their parent comments regardless of the chosen sort order for top-level comments.

### Comment Display Rules

THE system SHALL display for each comment: the author's username, the comment content, the current vote score, and how long ago the comment was posted.

THE system SHALL display the time since posting in relative terms (for example, "just now", "5 minutes ago", "3 hours ago", "2 days ago", "1 month ago").

WHEN a comment has been edited, THEN the system SHALL indicate that the comment was edited alongside the relative post time.

Nested replies SHALL be visually indented or otherwise distinguishable from their parent comment so that the thread hierarchy is clear to the reader.

## Vote Rules

A vote can be cast on either a post or a comment, but never on both simultaneously for a single vote record. Each user may only cast one vote per target — duplicate votes on the same post or comment by the same user are not allowed. A vote is either an upvote, which adds one to the target's score, or a downvote, which subtracts one from the target's score. A user can change their existing vote at any time: switching from an upvote to a downvote adjusts the score by two (removing the original plus one and applying the new minus one), and vice versa. A user can also remove their vote entirely, which reverses the original score adjustment. Every vote change also affects the karma score of the content author: an upvote increases the author's karma by one, a downvote decreases it by one, and vote removal reverses the karma change. The system ensures that vote score equals total upvotes minus total downvotes at all times.

### Vote Targeting and One-Vote Rule

A vote is always associated with a single target, which is either a post or a comment. A vote cannot target both a post and a comment simultaneously within the same vote record.

Each member may cast only one vote per target. If a member attempts to cast a second vote on the same post or comment when a vote already exists, the request is rejected. A vote that does not yet exist on a target cannot be switched or removed — the member must first have an existing vote on that target.

If the target post or comment does not exist, the vote request is rejected. If a guest (not logged in) attempts to vote, the request is rejected.

### Vote Value Rules

An upvote adds one to the target's vote score. A downvote subtracts one from the target's vote score. At all times, the vote score of any post or comment equals the total number of upvotes minus the total number of downvotes.

### Vote Switching Rules

A member can change an existing upvote to a downvote. This switch adjusts the target's vote score by negative two: the original plus one is removed, and a new minus one is applied.

A member can change an existing downvote to an upvote. This switch adjusts the target's vote score by positive two: the original minus one is removed, and a new plus one is applied.

After switching, the member still holds exactly one vote on the target.

### Vote Removal Rules

A member can remove their existing vote from a post or comment entirely. Vote removal reverses the original score adjustment: removing an upvote subtracts one from the target's score, and removing a downvote adds one to the target's score. After removal, the member holds no vote on that target and is free to vote again in the future.

### Karma Effects of Voting

Every vote action affects the karma score of the content author (the user who created the post or comment being voted on).

When a member upvotes a post or comment, the content author's karma increases by one. When a member downvotes a post or comment, the content author's karma decreases by one.

When a member switches their vote, the content author's karma is adjusted accordingly: the effect of the original vote is reversed, and the effect of the new vote is applied. For example, switching from an upvote to a downvote decreases the author's karma by two (removing the original plus one and applying the new minus one).

When a member removes their vote entirely, the content author's karma reverses the original adjustment: removing an upvote decreases karma by one, and removing a downvote increases karma by one.

A user's karma can be negative.

## Subscription Rules

A subscription represents a user's membership in a community. A user can subscribe to any community on the platform with no limit on the total number of subscriptions. Subscribing is a prerequisite for creating posts in a community; users who are not subscribed cannot create new posts there. Unsubscribing is allowed at any time and removes the user's ability to post in that community, but does not delete any posts the user previously created there. Users can view a list of all communities they are currently subscribed to. The subscriber count shown on each community reflects the total number of active subscriptions to that community. Subscribing and unsubscribing are independent of voting and commenting — a user can still vote and comment on posts in communities they are not subscribed to, as long as they are not banned from that community.

### Subscription Creation and Scope

A subscription links a user to a community. A user can hold an unlimited number of subscriptions across the platform and can subscribe to any community.

- THE system SHALL allow a user to subscribe to any community.
- THE system SHALL allow a user to hold an unlimited number of subscriptions.
- THE system SHALL allow a user to view a list of all communities they are currently subscribed to.
- IF a user attempts to subscribe to a community they are already subscribed to, THEN THE system SHALL reject the request.

### Subscription as Posting Prerequisite

A subscription is required to create a post in a community. Users who are not subscribed to a community cannot create posts there.

- IF a user is not subscribed to a community, THEN THE system SHALL reject any attempt by that user to create a post in that community.
- WHILE a user is subscribed to a community, THE system SHALL allow the user to create posts in that community.

### Effect of Unsubscribing

When a user unsubscribes from a community, the subscription is removed and the user loses the ability to create new posts in that community. Existing posts the user previously created in that community are not affected.

- WHEN a user unsubscribes from a community, THE system SHALL remove the subscription.
- WHEN a user unsubscribes from a community, THE system SHALL NOT delete posts the user previously created in that community.
- WHEN a user unsubscribes from a community, THE system SHALL prevent the user from creating new posts in that community.

### Subscriber Count Management

The subscriber count for a community reflects the number of currently active subscriptions. The count adjusts automatically when subscriptions are created or removed, and is displayed on each community.

- WHEN a user subscribes to a community, THE system SHALL increase the community's subscriber count by one.
- WHEN a user unsubscribes from a community, THE system SHALL decrease the community's subscriber count by one.
- THE system SHALL display the subscriber count for each community.
- THE system SHALL calculate the subscriber count based solely on active subscriptions.

### Subscription Independence for Voting and Commenting

Subscription status does not restrict a user's ability to vote or comment. A user who is not subscribed to a community can still vote on posts and comments and can still write comments on posts within that community.

- THE system SHALL allow a user to vote on posts and comments in a community regardless of whether the user is subscribed to that community.
- THE system SHALL allow a user to comment on posts in a community regardless of whether the user is subscribed to that community.

## Report Rules

A report can be filed against either a post or a comment. Any user can submit a report on any content they encounter. When reporting, the user must provide a reason in text form explaining why the content is problematic; reports without a reason are rejected. Each report is associated with the community where the reported content resides. Moderators of that community can view all reports filed against content in their community. Every report shows the reported content, the username of the user who filed the report, and the reason they provided. Moderators have two options for handling a report: they can approve it, which deletes the reported content, or dismiss it, which keeps the content and removes the report from the active list. Once a report is dismissed, it no longer appears in the community's report queue. A single piece of content can be reported by multiple users, and each report is handled independently.

### Report Targets and Eligibility

THE system SHALL allow a report to target either a post or a comment.

THE system SHALL allow any user to submit a report on any content they encounter on the platform.

A report MUST reference exactly one target — either a single post or a single comment. A report cannot target both simultaneously.

### Report Reason Requirement

THE system SHALL require a reason text when a user submits a report.

IF the reason text is missing, empty, or consists only of whitespace, THEN THE system SHALL reject the report submission.

The reason text describes why the user believes the content is problematic. There is no minimum or maximum length constraint on the reason beyond it being non-empty.

### Report-Community Association

THE system SHALL associate each report with the community where the reported content resides.

For a report targeting a post, the community is the community to which the post belongs.

For a report targeting a comment, the community is the community of the post under which the comment was written.

This association ensures that moderators of the correct community can access the report.

### Report Visibility for Moderators

THE system SHALL allow moderators of a community to view all reports filed against content residing in their community.

THE system SHALL display each report with the following information:
- The reported content (the post or comment that was reported)
- The username of the user who filed the report
- The reason text provided by the reporting user

Moderators cannot view reports belonging to communities where they do not hold a moderator role.

### Report Resolution — Approve

WHEN a moderator approves a report, THE system SHALL delete the reported content.

Approving a report means the moderator agrees that the content is problematic. The reported post or comment is permanently removed from the platform as a result.

Only moderators of the community associated with the report may approve it.

### Report Resolution — Dismiss

WHEN a moderator dismisses a report, THE system SHALL keep the reported content intact.

Dismissing a report means the moderator determines that the content does not warrant removal. The reported post or comment remains on the platform unchanged.

THE system SHALL remove a dismissed report from the active report queue for the community. Once dismissed, the report no longer appears in the list of pending reports that moderators can act upon.

Only moderators of the community associated with the report may dismiss it.

### Report Independence and Multiplicity

THE system SHALL allow multiple users to report the same piece of content. A single post or comment may accumulate multiple reports from different users.

THE system SHALL handle each report independently. Approving one report against a piece of content deletes that content, but does not automatically resolve other pending reports against that same content — they must be handled separately by moderators.

If content is deleted due to an approved report, any remaining pending reports against that content become moot, as the reported content no longer exists.

## Ban Rules

A ban restricts a specific user from participating in a specific community. Only moderators of a community, including the owner, can issue a ban. A banned user cannot create new posts or write new comments in the community from which they are banned. However, banned users can still view all content in the community — the ban only affects their ability to contribute. Moderators can view the full list of users currently banned from their community. A ban can be lifted at any time by a moderator through an unban action. Once unbanned, the user regains full participation rights, including the ability to create posts and comments in that community again. A ban applies only to the specific community where it was issued; it does not affect the user's access to other communities. The ban does not retroactively delete any posts or comments the user made before being banned.

### Ban Issuance Rules

THE system SHALL allow only moderators (including the owner) of a community to ban a user from that community.

WHEN a moderator issues a ban, THE system SHALL associate the ban with the specific user and the specific community.

IF a user who is not a moderator of a community attempts to ban another user from that community, THEN THE system SHALL reject the request.

IF a user attempts to ban themselves, THEN THE system SHALL reject the request.

### Ban Effects on Participation

WHILE a user is banned from a community, THE system SHALL prevent the banned user from creating new posts in that community.

WHILE a user is banned from a community, THE system SHALL prevent the banned user from writing new comments on any post within that community.

WHILE a user is banned from a community, THE system SHALL still allow the banned user to view all content in that community, including posts, comments, and community information.

IF a banned user attempts to create a post in the community, THEN THE system SHALL reject the request.

IF a banned user attempts to write a comment on a post in the community, THEN THE system SHALL reject the request.

### Ban Scope

THE system SHALL enforce that a ban applies only to the specific community where it was issued.

THE system SHALL NOT extend the effect of a ban to any other community the banned user is a member of.

THE system SHALL NOT prevent a banned user from creating posts or writing comments in other communities where they are not banned.

THE system SHALL NOT restrict a banned user's general platform access, including viewing feeds, browsing communities, or interacting with content in communities where the ban does not apply.

### Post-Ban Content Treatment

WHEN a user is banned from a community, THE system SHALL NOT delete any posts the user previously created in that community.

WHEN a user is banned from a community, THE system SHALL NOT delete any comments the user previously wrote on posts in that community.

THE system SHALL preserve the vote scores and comment threads associated with a banned user's existing posts and comments without modification.

THE system SHALL continue to display a banned user's existing posts and comments to all users who have permission to view them, including the banned user themselves.

### Banned User List Access

THE system SHALL allow moderators (including the owner) of a community to view the list of all users currently banned from that community.

THE system SHALL display, for each banned user in the list, the reason for the ban and the date the ban was issued.

IF a user who is not a moderator of a community attempts to view the banned user list, THEN THE system SHALL reject the request.

### Unban Rules

THE system SHALL allow any moderator (including the owner) of a community to lift a ban at any time.

WHEN a ban is lifted, THE system SHALL immediately restore the user's full participation rights in that community, including the ability to create new posts and write new comments.

THE system SHALL NOT require the user to re-subscribe to the community after being unbanned if they were subscribed at the time the ban was issued.

IF a user who is not a moderator attempts to lift a ban, THEN THE system SHALL reject the request.

## Moderator Rules

The creator of a community is automatically the owner and holds the highest level of authority within that community. The owner can add other users as moderators and can remove any moderator at any time. Moderators can also add other users as moderators, extending the moderation team. However, moderators cannot remove the owner under any circumstances — only the owner position is permanent and tied to the original creator. Moderators also cannot remove other moderators; only the owner has the authority to remove a moderator from their role. A user can serve as a moderator in multiple communities simultaneously with no restrictions. Moderators have the power to delete any post within their community, regardless of who authored it. Moderators can also delete any comment within their community. Additionally, moderators can ban users from their community and unban them later. All moderator actions are scoped to the specific community where the moderator holds their role.

### Owner Authority

THE communityHub SHALL designate the user who creates a community as its owner automatically at the time of community creation.

THE owner SHALL hold the highest level of authority within that community, superseding all other moderators.

THE owner SHALL be able to add any user on the platform as a moderator of the community.

THE owner SHALL be able to remove any moderator from the community at any time, without restriction.

Only the owner SHALL have the authority to remove a moderator from their role. No other moderator may exercise this power.

IF a user who is not the owner attempts to remove a moderator, THEN the system SHALL reject the request.

### Moderator Appointment and Removal Constraints

Moderators SHALL be able to add other users as moderators of the community, extending the moderation team.

Moderators SHALL NOT be able to remove the owner from their position under any circumstances. The owner role is permanent and tied to the original community creator.

Moderators SHALL NOT be able to remove other moderators from their positions. Only the owner holds removal authority over moderators.

IF a moderator attempts to remove the owner, THEN the system SHALL reject the request.

IF a moderator attempts to remove another moderator, THEN the system SHALL reject the request.

### Moderator Content Deletion Authority

Moderators SHALL be able to delete any post within their community, regardless of who authored the post.

Moderators SHALL be able to delete any comment within their community, regardless of who authored the comment.

IF a moderator attempts to delete a post or comment that exists in a community where they do not hold a moderator role, THEN the system SHALL reject the request.

IF the targeted post or comment does not exist, THEN the system SHALL reject the request.

### Moderator Ban and Unban Authority

Moderators SHALL be able to ban any user from their community.

Moderators SHALL be able to unban any previously banned user from their community.

IF a moderator attempts to ban a user who is already banned from that community, THEN the system SHALL reject the request as redundant.

IF a moderator attempts to unban a user who is not currently banned from that community, THEN the system SHALL reject the request.

IF a moderator attempts to ban or unban a user in a community where the moderator does not hold a moderator role, THEN the system SHALL reject the request.

IF a moderator attempts to ban the owner of the community, THEN the system SHALL reject the request.

### Moderator Scope Boundaries

A user SHALL be able to serve as a moderator in multiple communities simultaneously, with no restriction on the number of communities.

Moderator authority SHALL be scoped exclusively to the specific community where the moderator holds their role. A moderator's powers do not extend to any other community.

IF a user attempts to perform any moderation action — including adding moderators, deleting posts or comments, or managing bans — in a community where they do not hold a moderator role, THEN the system SHALL reject the request.

IF a user who is not a moderator of any community attempts to perform a moderation action, THEN the system SHALL reject the request.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Feed Filtering Rules

Three distinct feeds determine which posts are visible to the user:

**Home Feed**
- THE system SHALL display posts only from communities the currently authenticated user is subscribed to.
- IF the user is not authenticated, THEN the system SHALL reject access to the home feed.

**Popular Feed**
- THE system SHALL display posts from all communities across the platform.
- THE system SHALL make the popular feed available to all users, including guests who are not authenticated.

**Community Feed**
- THE system SHALL display posts from a single specified community.
- THE system SHALL make the community feed available to all users, including guests.
- IF the requested community does not exist, THEN the system SHALL reject the request.

**Community Search**
- THE system SHALL allow users to search for communities by name.
- IF the search term matches no community name, THEN the system SHALL return an empty result set.
- THE system SHALL return partial matches of community names against the search term (e.g., searching for "game" returns communities named "gaming", "gamers", "gameofthrones").

**Time Filter for Top Sorting**
- WHEN the user selects the "Top" sort order, THE system SHALL support the following time window filters: today, this week, this month, this year, all time.
- THE system SHALL apply the time filter to restrict results to posts created within the selected time window.
- The "all time" filter SHALL include posts regardless of creation date.

### Post Sorting Rules

All three feeds (home, popular, and community) SHALL support the same set of sort orders.

**Hot**
- THE system SHALL order posts by a combination of recency and vote activity, where recent posts with many upvotes appear first.
- WHEN the user selects the "Hot" sort order, THE system SHALL prioritize posts that are both recent and have high engagement.

**New**
- THE system SHALL order posts by creation time, with the most recently created posts appearing first.
- WHEN the user selects the "New" sort order, THE system SHALL display posts in reverse chronological order.

**Top**
- THE system SHALL order posts by vote score, with the highest vote score appearing first.
- THE system SHALL combine the "Top" sort order with a time filter (as defined in Feed Filtering Rules).
- IF a time filter other than "all time" is selected, THEN the system SHALL only include posts created within that time window when computing the top order.

**Controversial**
- THE system SHALL order posts by a combination of high total vote count and a vote score close to zero (indicating a near-even split between upvotes and downvotes).
- WHEN the user selects the "Controversial" sort order, THE system SHALL prioritize posts that have received many votes overall but whose score is near zero.

### Comment Sorting Rules

Comments on a post SHALL support the following sort orders.

**Best**
- THE system SHALL order comments by vote score, with the highest vote score appearing first.
- WHEN the user selects the "Best" sort order, THE system SHALL display the most upvoted comments at the top.

**New**
- THE system SHALL order comments by creation time, with the most recently created comments appearing first.
- WHEN the user selects the "New" sort order, THE system SHALL display comments in reverse chronological order.

**Controversial**
- THE system SHALL order comments by a combination of high total vote count and a vote score close to zero.
- WHEN the user selects the "Controversial" sort order, THE system SHALL prioritize comments that have received many votes but are nearly evenly split between upvotes and downvotes.

**Nested Replies**
- Regardless of the selected sort order, THE system SHALL display replies nested under their parent comment.
- The sort order SHALL apply to top-level comments and to each group of sibling replies independently.

### Pagination Rules

All post feeds SHALL be paginated to manage the volume of displayed content.

**Page Structure**
- THE system SHALL divide feed results into pages, each containing a fixed number of posts.
- THE system SHALL allow the user to navigate forward to the next page and backward to the previous page.

**Sort Order Consistency**
- THE system SHALL maintain the selected sort order across all pages of a feed.
- WHEN the user navigates between pages, THE system SHALL preserve the currently active sort order and any applied filters.

**Empty Pages**
- IF a requested page has no results (e.g., the user navigates beyond the last available post), THEN the system SHALL return an empty result set rather than an error.

**Feed Independence**
- Each feed (home, popular, community) SHALL maintain its own independent pagination state, including the current page, sort order, and active time filter.
- Changing the sort order or time filter within a feed SHALL reset pagination to the first page.

**Comment Pagination**
- Comment threads are NOT paginated independently; all comments and their nested replies for a post SHALL be loaded together when viewing that post.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Authentication Errors

If a user attempts to sign up with an email address that is already registered, the request is rejected with a message indicating the email is already in use.

If a user attempts to sign up with a username that is already taken, the request is rejected with a message indicating the username is unavailable.

If a user attempts to sign up with an email that is not in a valid email format, the request is rejected with a message indicating the email format is invalid.

If a user attempts to sign up without providing a password, the request is rejected with a message indicating a password is required.

If a user attempts to log in with an email address that is not associated with any account, the request is rejected with a message indicating the credentials are incorrect.

If a user attempts to log in with a correct email but an incorrect password, the request is rejected with a message indicating the credentials are incorrect.

If a user attempts to log in without providing both email and password, the request is rejected with a message indicating both fields are required.

If a user attempts to change their password but provides the wrong current password, the request is rejected with a message indicating the current password is incorrect.

If a user attempts to change their password to a value that does not meet the password security criteria, the request is rejected with a message indicating the new password does not meet requirements.

### Account Deletion Errors

If a user attempts to delete an account that has already been deleted, the request is rejected with a message indicating the account no longer exists.

If an unauthenticated user attempts to delete an account, the request is rejected with a message indicating authentication is required.

### Resource Not Found Errors

If a user requests a community that does not exist or has been deleted, the request is rejected with a message indicating the community was not found.

If a user requests a post that does not exist or has been deleted, the request is rejected with a message indicating the post was not found.

If a user requests a comment that does not exist or has been deleted, the request is rejected with a message indicating the comment was not found.

If a user requests a user profile that does not exist or belongs to a deleted account, the request is rejected with a message indicating the user was not found.

### Community Operation Errors

If a user attempts to create a community with a name that is already in use by another community, the request is rejected with a message indicating the community name is already taken.

If a user attempts to create a community without providing a description, the request is rejected with a message indicating a description is required.

If an unauthenticated user attempts to create a community, the request is rejected with a message indicating authentication is required.

If a user attempts to create a post in a community they are not subscribed to, the request is rejected with a message indicating a subscription to the community is required to post.

If a banned user attempts to create a post in the community they are banned from, the request is rejected with a message indicating the user is banned from participating in that community.

If a banned user attempts to write a comment in the community they are banned from, the request is rejected with a message indicating the user is banned from participating in that community.

### Post Operation Errors

If a user attempts to create a post without providing a title, the request is rejected with a message indicating the title is required.

If a user attempts to create a post with a title that is empty or consists only of whitespace, the request is rejected with a message indicating the title cannot be empty.

If a user attempts to create a text post without providing text content, the request is rejected with a message indicating content is required for text posts.

If a user attempts to create a link post without providing a URL, the request is rejected with a message indicating a URL is required for link posts.

If a user attempts to create an image post without uploading an image, the request is rejected with a message indicating an image is required for image posts.

If a user attempts to edit a post that they did not create, the request is rejected with a message indicating only the author can edit the post.

If a user attempts to edit a post that has been deleted, the request is rejected with a message indicating the post no longer exists.

If a user attempts to delete a post that they did not create, the request is rejected with a message indicating only the author can delete the post.

If a user attempts to delete a post that has already been deleted, the request is rejected with a message indicating the post no longer exists.

If an unauthenticated user attempts to create a post, the request is rejected with a message indicating authentication is required.

### Comment Operation Errors

If a user attempts to write a comment without providing content, the request is rejected with a message indicating comment content is required.

If a user attempts to write a comment with empty or whitespace-only content, the request is rejected with a message indicating the comment cannot be empty.

If a user attempts to reply to a comment that has been deleted, the request is rejected with a message indicating the parent comment no longer exists.

If a user attempts to comment on a post that has been deleted, the request is rejected with a message indicating the post no longer exists.

If a user attempts to edit a comment that they did not write, the request is rejected with a message indicating only the author can edit the comment.

If a user attempts to edit a comment that has been deleted, the request is rejected with a message indicating the comment no longer exists.

If a user attempts to delete a comment that they did not write, the request is rejected with a message indicating only the author can delete the comment.

If a user attempts to delete a comment that has already been deleted, the request is rejected with a message indicating the comment no longer exists.

If an unauthenticated user attempts to write a comment, the request is rejected with a message indicating authentication is required.

### Vote Operation Errors

If a user attempts to vote on a post that has been deleted, the request is rejected with a message indicating the post no longer exists.

If a user attempts to vote on a comment that has been deleted, the request is rejected with a message indicating the comment no longer exists.

If an unauthenticated user attempts to vote, the request is rejected with a message indicating authentication is required.

### Subscription Operation Errors

If a user attempts to subscribe to a community that does not exist or has been deleted, the request is rejected with a message indicating the community was not found.

If a user attempts to unsubscribe from a community they are not currently subscribed to, the request is rejected with a message indicating no active subscription exists.

If an unauthenticated user attempts to subscribe or unsubscribe, the request is rejected with a message indicating authentication is required.

### Moderation Error Scenarios

If a non-owner user attempts to add a moderator, the request is rejected with a message indicating only the owner or an existing moderator can add moderators.

If a user who is neither the owner nor a moderator attempts to remove a moderator, the request is rejected with a message indicating only the owner can remove moderators.

If a moderator attempts to remove the owner from the moderator role, the request is rejected with a message indicating the owner cannot be removed.

If a moderator attempts to remove another moderator, the request is rejected with a message indicating only the owner can remove moderators.

If a non-moderator user attempts to delete a post in a community, the request is rejected with a message indicating moderator privileges are required.

If a non-moderator user attempts to delete a comment in a community, the request is rejected with a message indicating moderator privileges are required.

If a non-moderator user attempts to ban a user from a community, the request is rejected with a message indicating moderator privileges are required.

If a moderator attempts to ban the owner of the community, the request is rejected with a message indicating the owner cannot be banned.

If a non-moderator user attempts to unban a user, the request is rejected with a message indicating moderator privileges are required.

If a non-moderator user attempts to view the banned users list, the request is rejected with a message indicating moderator privileges are required.

If a moderator attempts to ban a user who is already banned in that community, the request is rejected with a message indicating the user is already banned.

If a moderator attempts to unban a user who is not currently banned in that community, the request is rejected with a message indicating no active ban exists for that user.

### Report Error Scenarios

If a user attempts to report content without providing a reason, the request is rejected with a message indicating a reason is required.

If a user attempts to report content with an empty or whitespace-only reason, the request is rejected with a message indicating the reason cannot be empty.

If a user attempts to report a post that has been deleted, the request is rejected with a message indicating the post no longer exists.

If a user attempts to report a comment that has been deleted, the request is rejected with a message indicating the comment no longer exists.

If a non-moderator user attempts to view reports for a community, the request is rejected with a message indicating moderator privileges are required.

If a non-moderator user attempts to approve or dismiss a report, the request is rejected with a message indicating moderator privileges are required.

If a moderator attempts to approve or dismiss a report that has already been processed, the request is rejected with a message indicating the report has already been handled.

If an unauthenticated user attempts to report content, the request is rejected with a message indicating authentication is required.

### Feed and Browsing Error Scenarios

If an unauthenticated user attempts to access the home feed, the request is rejected with a message indicating authentication is required.

If a user requests a page number that exceeds the total number of available pages in any feed, the system returns an empty result set rather than an error.

If an invalid sort option is provided when browsing any feed, the request is rejected with a message indicating the sort option is not supported.

If an invalid time filter is provided with the top sort option, the request is rejected with a message indicating the time filter is not valid.

If a user requests a community feed for a community that does not exist, the request is rejected with a message indicating the community was not found.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Validation

THE system SHALL validate every uploaded file before storing it.

THE system SHALL verify that each uploaded file contains a readable, well-formed image.

IF the uploaded file is zero bytes in size, THEN THE system SHALL reject the upload and return an error indicating the file is empty.

IF the uploaded file is corrupted, truncated, or does not contain a valid image, THEN THE system SHALL reject the upload and return an error describing the validation failure.

IF the uploaded file exceeds the platform's maximum allowed file size, THEN THE system SHALL reject the upload and return an error indicating the file is too large.

WHEN a file fails validation, THE system SHALL not store the file and SHALL return an appropriate error message to the user.

### Virus Scanning

THE system SHALL scan every uploaded file for malicious content before accepting it for storage.

IF a virus scan identifies a file as containing malware or other malicious content, THEN THE system SHALL reject the upload and return an error indicating the file was blocked for security reasons.

THE system SHALL quarantine or discard the rejected file immediately after detection.

WHEN a file passes the virus scan with no detected threats, THE system SHALL proceed with further validation and storage.

### Content Type Restrictions

THE system SHALL only accept files whose format is a supported image type.

THE system SHALL verify that the file's actual content matches its declared format, regardless of the file extension.

IF the file's format is not a supported image type, THEN THE system SHALL reject the upload and return an error indicating the format is not accepted.

IF the file's actual content does not match its declared format, THEN THE system SHALL reject the upload and return an error indicating a content-type mismatch.

### File Retention Policies

WHEN a user deletes their account, THE system SHALL delete all files uploaded by that user, including avatars and any images associated with their posts.

WHEN an image post is deleted, THE system SHALL delete the image file associated with that post.

WHEN a community is deleted, THE system SHALL delete the community's icon image.

WHEN a user removes their avatar without uploading a replacement, THE system SHALL delete the avatar file.

WHEN a user replaces their avatar with a new image, THE system SHALL delete the previous avatar file after the new avatar is successfully stored and validated.