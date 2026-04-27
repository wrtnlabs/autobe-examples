**communityPlatform — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users sign up by providing an email address and a password, and they must choose a unique username. The username cannot be the same as any existing username in the system, ensuring each user is distinctly identifiable. Users log in using their email and password combination, and the system verifies that the credentials match. Users can change their password after signing up. Users can delete their own account at any time, and this action removes the user along with all their posts and comments from the platform. When a user deletes their account, all their data is removed. A user cannot sign up with an email that already belongs to an existing account, since each account must have a unique email. The login process requires a matching email and password pair — if either is wrong, access is denied.

### Username Uniqueness

WHEN a user signs up with a chosen username, THE system SHALL check whether that username already exists in the system using case-insensitive comparison. IF the username is already taken, THEN THE system SHALL reject the signup request. Each username in the system MUST be unique.

### Email Uniqueness

WHEN a user signs up with an email address, THE system SHALL check whether that email address already exists in the system using case-insensitive comparison. IF the email address already belongs to an existing account, THEN THE system SHALL reject the signup request. Each email address in the system MUST be unique.

### Signup Credential Completeness

WHEN a user submits a signup request, THE system SHALL verify that all three required credentials are present: an email address, a password, and a username. IF any of these three are missing, THEN THE system SHALL reject the signup request.

### Login Credential Verification

WHEN a user attempts to log in with an email address and password, THE system SHALL first check whether an account with that email address exists. IF no account is found, THEN THE system SHALL reject the login attempt. IF the account exists but the provided password does not match the stored credentials for that account, THEN THE system SHALL reject the login attempt. THE system SHALL return a generic failure message in both cases — it SHALL NOT reveal whether the email address, the password, or both were incorrect.

### Password Change Verification

WHEN a user requests to change their password, THE system SHALL require the user to provide their current password. THE system SHALL compare the provided current password against the stored password for that account. IF the current password is incorrect, THEN THE system SHALL reject the password change request. IF the current password is correct, THEN THE system SHALL update the password to the new value provided by the user.

### Account Deletion Data Scope

WHEN a user deletes their account, THE system SHALL permanently remove the user account along with all posts authored by that user and all comments authored by that user. The deletion SHALL be irreversible — once completed, the account and all associated data cannot be recovered. Users who previously deleted their account SHALL NOT be able to regain access; they MUST sign up as a new account with a new email address and username.

## Profile Rules

Every user has a profile that includes a display name, a bio text, and an avatar image. Users can edit their own display name, bio, and avatar at any time, but they cannot edit the profile information of another user. Users can view any other user's profile on the platform. A user's profile page displays their display name, bio, and avatar publicly. The profile page also shows the user's total karma score, a list of all posts they have created, and a list of all comments they have written. All profile information is visible to all users, including logged-out visitors who browse the platform. There is no restriction on who can view a profile — any user can look up any other user's profile information.

### Profile Content Validation

THE system SHALL define every user's profile as consisting of a display name, a bio text, and an avatar image.

THE system SHALL allow a user to set or update their display name, bio text, and avatar image at any time after account creation.

THE system SHALL accept any non-blank string as a display name when a user sets or updates it.

### Self-Editing Only Restriction

THE system SHALL allow a user to edit only their own display name, bio text, and avatar image.

THE system SHALL reject any attempt by a user to modify the profile of another user.

IF a user attempts to edit another user's profile, THEN THE system SHALL reject the request.

### Public Profile Visibility

THE system SHALL make every user's profile visible to all visitors, including logged-out users.

THE system SHALL display the display name, bio text, and avatar image to any visitor viewing a profile page.

THE system SHALL NOT require authentication to view a user's profile page.

### Profile Page Content Composition

THE system SHALL display the following information on every user's profile page:
- The user's display name, bio text, and avatar image
- The user's total karma score (a single numeric value that may be positive, zero, or negative)
- A list of all posts the user has created
- A list of all comments the user has written

THE system SHALL display the total karma score as a single value reflecting the net effect of all upvotes and downvotes received on the user's posts and comments.

THE system SHALL allow any visitor to see all posts and comments authored by the profile owner when viewing that user's profile page.

## Community Rules

Any registered user can create a new community by providing a unique name, a description text, and an icon image. The community name must be unique across the platform, so no two communities can share the same name. The user who creates the community automatically becomes its owner. The description is optional and can be left empty by the creator. Users can browse all communities in a list to discover new ones, and they can search for communities by name to find specific ones. Each community displays its subscriber count publicly so users can see how popular it is. A user cannot create a community with a name that is already taken.

### Community Name Uniqueness Constraint

THE system SHALL enforce that each community name is unique across the entire platform.

WHEN a user attempts to create a community, THE system SHALL check whether the provided name already exists in the system.

IF a community with the same name already exists, THEN THE system SHALL reject the creation request (see Duplicate Community Name Rejection).

### Community Creation Domain Constraints

WHEN a user creates a community, THE system SHALL require a unique name.

THE system SHALL treat the description text as optional — the user may create a community without providing a description.

WHEN a community is created, THE system SHALL automatically assign the creating user as the owner of that community.

THE owner SHALL have the highest authority over the community, including the ability to add and remove moderators.

### Community Discovery Rules

THE system SHALL allow any user (including logged-out users) to browse all communities in a list view.

THE system SHALL allow any user to search for communities by matching the provided search text against community names.

THE system SHALL display the subscriber count for each community in both the browse list and the search results.

### Subscriber Count Public Visibility

THE system SHALL make each community's subscriber count visible to all users, including logged-out users.

WHILE viewing a community, THE system SHALL display the current number of subscribers alongside the community name and description.

THE subscriber count SHALL update in real time when a user subscribes to or unsubscribes from a community.

### Duplicate Community Name Rejection

WHEN a user attempts to create a community with a name that already exists in the system, THE system SHALL reject the request.

WHEN the request is rejected due to a duplicate name, THE system SHALL inform the user that the chosen community name is already taken.

IF the user provides a name that violates the uniqueness constraint, THEN the creation SHALL NOT proceed, and no community SHALL be created.

## Post Rules

Users can create a post only in communities they are subscribed to. Every post must have a title, and posts without a title are rejected. A post must be exactly one of three types: a text post with written content, a link post with a URL, or an image post with an uploaded image. Users can edit their own posts, including changing the title or content. Users can delete their own posts at any time. When viewing a single post, users see the title, full content, the author's username, the community name, the vote score, the comment count, and when it was posted. A post cannot be created without a title or without belonging to a community. Banned users cannot create posts in the community that banned them.

### Subscription Requirement for Post Creation

WHEN creating a post in a community, THE system SHALL verify that the user is currently subscribed to that community.

IF the user is not subscribed to the community, THEN the post creation SHALL be rejected.

This rule applies to all three post types: text, link, and image.

### Title Mandatory Validation

WHEN creating a post, THE system SHALL require a title.

IF the title is empty, blank, or missing, THEN the post creation SHALL be rejected.

WHILE editing a post, THE system SHALL require the title to remain non-empty. IF the edited title is empty or blank, THEN the update SHALL be rejected.

### Mutually Exclusive Post Types

WHEN creating a post, THE system SHALL enforce that exactly one post type is selected from the three available types: text post, link post, or image post.

IF more than one type is provided (e.g., both text content and an image), OR if no type is provided, THEN the post creation SHALL be rejected.

Valid combinations:
- Text post: contains text content, no URL, no uploaded image
- Link post: contains a URL, no text content, no uploaded image
- Image post: contains an uploaded image, no text content, no URL

### Post Editing Constraints

WHEN a user edits a post, THE system SHALL verify that the user is the original author of the post.

IF the user is not the author, THEN the edit request SHALL be rejected.

WHEN editing, THE system SHALL allow the author to change:
- The title (subject to the non-empty title validation)
- The content appropriate to the post type (text, URL, or image)

THE system SHALL NOT allow changing the post type after creation. A text post cannot become a link post, and vice versa.

IF an edit would change the post type, THEN the request SHALL be rejected.

### Post Deletion Constraints

WHEN a user deletes a post, THE system SHALL verify that the user is the original author of the post.

IF the user is not the author, THEN the deletion request SHALL be rejected.

WHEN a post is deleted, THE system SHALL also delete all associated comments, votes on the post, and reports targeting the post.

Once deleted, a post SHALL NOT be recoverable by any user.

### Single Post View Display

WHEN viewing a single post, THE system SHALL display the following information:
- The post title
- The full content of the post (text content, URL, or image depending on type)
- The author's username
- The community name to which the post belongs
- The current vote score (total upvotes minus total downvotes)
- The total comment count
- The time elapsed since the post was created (e.g., "3 hours ago", "2 days ago")

IF the requested post does not exist, THEN the system SHALL reject the request.

IF the requested post has been deleted, THEN the system SHALL reject the request.

### Banned User Posting Restriction

WHEN a user attempts to create a post in a community, THE system SHALL verify that the user is not currently banned from that community.

IF the user is banned from the community, THEN the post creation SHALL be rejected.

This restriction applies to all three post types (text, link, and image).

Banned users retain the ability to view posts and comments within the community but SHALL NOT be allowed to create new posts or comments.

## Comment Rules

Any user can write a comment on any post, regardless of whether they are subscribed to the post's community. Users can also reply to any existing comment, creating a threaded conversation. There is no depth limit for replies, meaning users can continue replying indefinitely within a single thread. Users can edit their own comments at any time after posting. Users can delete their own comments, which removes them from the post. When viewing a comment, users see the author's username, the comment content, the vote score, the time since it was posted, and any nested replies beneath it. A comment cannot be empty — it must contain some content to be submitted. Banned users cannot create comments in the community that banned them. Users cannot edit or delete comments belonging to other users.

### Comment Content Validation

THE system SHALL require comment content to be non-empty before submission.

WHEN a user submits a comment, THE system SHALL validate that the content contains at least one non-whitespace character.

IF the comment content is empty or contains only whitespace, THEN THE system SHALL reject the submission.

WHILE a comment exists, THE system SHALL preserve its original author — the author of a comment cannot be transferred or reassigned.

### Unlimited Reply Depth Constraint

THE system SHALL support unlimited nesting depth for comment replies.

WHEN a user replies to any comment, THE system SHALL create a child comment linked to the parent — there is no limit on how many levels deep replies can go.

WHEN a comment is viewed, THE system SHALL display its nested replies in a threaded structure, showing parent-child relationships through indentation or visual hierarchy.

IF a reply chain exceeds practical rendering limits, THEN THE system SHALL offer "load more replies" or "show thread" options rather than truncating the nesting.

### Threaded Conversation Structure

THE system SHALL maintain a threaded (tree-based) structure for comment conversations.

WHEN a user replies directly to a post, THE system SHALL create a top-level comment with no parent.

WHEN a user replies to an existing comment, THE system SHALL create a child comment with that comment as its parent.

WHILE displaying comments on a post, THE system SHALL preserve the parent-child hierarchy so users can follow conversation threads.

WHEN a parent comment is deleted, the system's behavior regarding its child comments is defined in the self-deletion rules section.

### Comment Self-Editing Rules

THE system SHALL allow users to edit their own comments.

WHEN a user requests to edit a comment, THE system SHALL verify that the requesting user is the original author of that comment.

IF the requesting user is not the original author, THEN THE system SHALL reject the edit request.

WHEN editing a comment, THE system SHALL allow the user to modify the comment content.

THE system SHALL validate that the edited content is not empty, following the same content validation rules described in Comment Content Validation.

THE system SHALL NOT allow editing to change the comment's author, parent comment, or parent post.

### Comment Self-Deletion Rules

THE system SHALL allow users to delete their own comments.

WHEN a user requests to delete a comment, THE system SHALL verify that the requesting user is the original author of that comment.

IF the requesting user is not the original author, THEN THE system SHALL reject the deletion request.

WHEN a comment is deleted by its author, THE system SHALL remove the comment content and author information from display, but may retain the comment node in the thread to preserve conversation context for child replies.

### Banned User Commenting Restriction

THE system SHALL prevent banned users from creating comments in the community that banned them.

WHEN a user attempts to submit a comment on a post in a community where they are currently banned, THE system SHALL reject the submission.

IF a user is banned from a community, THEN THE system SHALL also reject replies to any comment within that community, regardless of the reply depth.

WHILE a user is banned from a community, THE system SHALL allow the user to view comments in that community (read-only access).

THE system SHALL NOT retroactively delete comments the user created before being banned.

### Comment Modification Restrictions

THE system SHALL prevent users from editing or deleting comments belonging to other users.

WHEN a user attempts to edit another user's comment, THE system SHALL reject the request.

WHEN a user attempts to delete another user's comment, THE system SHALL reject the request.

Exception: Moderators may delete comments in their moderated community. This authority is defined in the Moderator Rules (Module 1 > Moderator Rules).

## Vote Rules

Users can upvote or downvote any post or comment to express their opinion. Each user can cast only one vote per post or per comment, so duplicate votes are not allowed. A user can change their vote from upvote to downvote or vice versa at any time, which replaces the previous vote. Users can remove their vote entirely, which reverts the score as if the vote never existed. When a user upvotes a post or comment, the content author's karma increases by one. When a user downvotes, the author's karma decreases by one. When a user removes their vote, the author's karma adjusts back accordingly. The vote score displayed on a post or comment equals the total number of upvotes minus the total number of downvotes. Users cannot vote on their own posts or comments. Users cannot vote if they are not logged in. Karma can go negative if downvotes outnumber upvotes.

### One Vote Per User Per Item

WHEN a user attempts to vote on a post or comment, THE system SHALL verify that the user has not already cast a vote on that same post or comment.

WHEN a user changes their vote from upvote to downvote or vice versa on a post or comment, THE system SHALL replace the existing vote with the new vote rather than creating a second vote.

WHEN a user removes their vote from a post or comment, THE system SHALL delete the vote and adjust the displayed score and the content author's karma as if the vote never existed.

IF a user attempts to cast a second distinct vote on a post or comment they have already voted on (not a change), THEN THE system SHALL reject the request.

### Karma Impact of Voting

WHEN a user upvotes a post or comment, THE system SHALL increase the content author's karma score by 1.

WHEN a user downvotes a post or comment, THE system SHALL decrease the content author's karma score by 1.

WHEN a user removes their upvote from a post or comment, THE system SHALL decrease the content author's karma score by 1 (reverting the earlier increase).

WHEN a user removes their downvote from a post or comment, THE system SHALL increase the content author's karma score by 1 (reverting the earlier decrease).

WHEN a user changes their vote from upvote to downvote, THE system SHALL decrease the content author's karma by 2 (removing the +1 and applying the -1).

WHEN a user changes their vote from downvote to upvote, THE system SHALL increase the content author's karma by 2 (removing the -1 and applying the +1).

A user's karma SHALL be permitted to go negative when downvotes outnumber upvotes across their posts and comments.

### Vote Score Calculation

WHEN displaying a post or comment, THE system SHALL calculate the vote score as the total number of upvotes minus the total number of downvotes.

WHEN a new upvote is cast, THE system SHALL increase the displayed score by 1.

WHEN a new downvote is cast, THE system SHALL decrease the displayed score by 1.

WHEN a vote is removed, THE system SHALL recalculate the score based on remaining votes.

### Voting Eligibility Constraints

A user SHALL NOT be permitted to vote on their own post or their own comment.

IF a user who is not logged in attempts to vote, THEN THE system SHALL reject the request.

IF a user attempts to vote on a post or comment that does not exist, THEN THE system SHALL reject the request.

IF a user attempts to vote on a post or comment in a community they cannot access, THEN THE system SHALL reject the request.

### Vote Value Validation

WHEN a user submits a vote, THE system SHALL validate that the vote value is either upvote or downvote. Any other value SHALL be rejected.

WHEN a user submits a vote, THE system SHALL validate that the target of the vote is either a post or a comment. Voting on any other entity type SHALL be rejected.

## Subscription Rules

Users can subscribe to any community on the platform to follow its content. Users can unsubscribe from any community they are currently subscribed to, removing it from their personal feed. Subscribing is a requirement for creating posts in a community — users who are not subscribed cannot create new posts there. Users can view a list of all communities they are subscribed to, making it easy to navigate to their favorite communities. A user cannot subscribe to the same community more than once. A user does not need to be subscribed to view content or comment on posts in a community. There is no limit on how many communities a user can subscribe to.

### Subscription Eligibility

Any registered member may subscribe to any community on the platform.

Guest users (not logged in) cannot subscribe to communities — subscription requires an authenticated member account.

A member may subscribe to a community regardless of whether they created that community or moderate it.

### No Duplicate Subscriptions

A member shall not subscribe to the same community more than once.

IF a member attempts to subscribe to a community they are already subscribed to, THEN the request SHALL be rejected.

IF a member has unsubscribed from a community and later wishes to subscribe again, THEN the subscription SHALL be treated as a new, valid subscription.

### Subscription Required for Posting

A member must be subscribed to a community in order to create a post in that community.

IF a member who is not subscribed to a community attempts to create a post there, THEN the request SHALL be rejected.

Subscribing is not required for viewing content, reading comments, or writing comments in a community. Only post creation requires an active subscription.

### Viewing Subscribed Communities List

A member may view a list of all communities they are currently subscribed to.

The list SHALL display each community's name and subscriber count.

The list SHALL be available only to the authenticated member viewing their own subscriptions — a member cannot view another member's subscription list.

WHEN a member accesses their subscribed communities list, THE system SHALL show only communities the member has an active subscription to at that moment.

### Unlimited Subscription Count

There is no limit on the number of communities a member may subscribe to.

A member may subscribe to as many or as few communities as they wish, subject only to the no-duplicate constraint (defined in [No Duplicate Subscriptions]).

### Unsubscription Rules

A member may unsubscribe from any community they are currently subscribed to at any time.

WHEN a member unsubscribes from a community, THE subscription SHALL be removed, and posts from that community SHALL no longer appear in the member's Home Feed.

Unsubscribing from a community does not delete any posts or comments the member has already created in that community — those remain visible.

IF a member attempts to unsubscribe from a community they are not currently subscribed to, THEN the request SHALL be rejected.

## Moderator Rules

When a community is created, the creator automatically becomes its owner, which is the highest moderator role. The owner can add other users as moderators to help manage the community. The owner can also remove any moderator at any time. Moderators themselves can add other moderators, but they cannot remove the owner under any circumstances. Moderators cannot remove each other — only the owner has the authority to remove moderators. Moderators have the power to delete any post or comment within their community, even if they did not create it. Moderators can ban users from the community and unban them later. Moderators can view the list of banned users to track who is currently restricted. A moderator's powers are limited to their own community and do not extend to other communities. The owner cannot be removed or demoted by anyone, including other moderators.

### Owner Authority and Appointment Rules

THE system SHALL designate the creator of a community as its owner, with the highest level of moderation authority.

WHEN a community is created, THE system SHALL automatically assign the creator as the owner of that community.

THE owner SHALL have the authority to add any registered user as a moderator of the community.

THE owner SHALL have the authority to remove any moderator from the community at any time, without requiring approval from any other user.

IF another moderator attempts to remove the owner, THEN THE system SHALL reject the request.

THE owner SHALL NOT be removable from the moderation team under any circumstances.

### Moderator Appointment and Removal Hierarchy

WHERE a user already has a moderator role in a community, THE system SHALL permit that user to add other registered users as additional moderators.

WHEN a moderator attempts to remove the owner of the community, THE system SHALL reject the request.

WHEN a moderator attempts to remove another moderator from the same community, THE system SHALL reject the request.

ONLY the owner SHALL have the authority to remove moderators from the community.

WHEN a moderator is removed by the owner, THE system SHALL immediately revoke all moderation privileges for that user in that community.

### Moderator Content Deletion Authority

WHERE a user holds a moderator role in a community, THE system SHALL permit that user to delete any post within that community, regardless of the post's author.

WHERE a user holds a moderator role in a community, THE system SHALL permit that user to delete any comment within that community, regardless of the comment's author.

WHEN a moderator deletes a post, THE system SHALL also delete all comments associated with that post.

WHEN a moderator deletes a post or comment, THE system SHALL record that the deletion was performed by a moderator action.

IF a user who is not a moderator of the community attempts to delete another user's post or comment, THEN THE system SHALL reject the request.

### Moderator Ban and Unban Authority

WHERE a user holds a moderator role in a community, THE system SHALL permit that user to ban any other user from that community.

WHERE a user holds a moderator role in a community, THE system SHALL permit that user to unban a previously banned user from that community.

WHEN a moderator bans a user, THE system SHALL require the moderator to provide a reason for the ban.

WHEN a moderator bans a user, THE system SHALL record the ban reason, the banning moderator, and the timestamp.

WHEN a banned user attempts to create a post or comment in the community from which they are banned, THE system SHALL reject the request.

WHILE a user is banned from a community, THE system SHALL still permit that user to view posts and comments in that community.

WHERE a user holds a moderator role in a community, THE system SHALL permit that user to view the full list of currently banned users for that community.

### Community-Scoped Moderation Restriction

THE moderation powers of a moderator SHALL be scoped exclusively to the community in which they hold the moderator role.

WHEN a moderator attempts to perform a moderation action (delete content, ban a user, or view banned users) in a community where they do not hold a moderator role, THE system SHALL reject the request.

WHERE a user holds moderator roles in multiple communities, THE system SHALL enforce each role independently — moderating one community SHALL NOT grant any privileges in other communities.

## Ban Rules

Moderators can ban users from their community when needed. Once banned, the user cannot create new posts or comments in that community. Banned users can still view content in the community, so they are not completely locked out. Moderators can unban users at any time, restoring their ability to post and comment. Moderators can view the full list of banned users in their community to track who is currently restricted. A banned user's existing posts and comments remain visible in the community — banning does not remove existing content. A ban applies only to the specific community that issued it, so the user can still participate in other communities.

### Ban Issuance

#### Ban Issuance

WHEN a moderator issues a ban on a user in their community, THE system SHALL record the ban reason and the date and time it was issued.

IF a moderator attempts to ban a user who is already banned in that community, THE system SHALL reject the request.

### Posting and Commenting Restrictions for Banned Users

#### Posting and Commenting Restrictions for Banned Users

WHILE a user is banned from a community, THE system SHALL prevent the user from creating new posts in that community.

WHILE a user is banned from a community, THE system SHALL prevent the user from creating new comments on any post within that community.

IF a banned user attempts to create a post or comment in the community where they are banned, THE system SHALL reject the request.

### Content Viewing for Banned Users

#### Content Viewing for Banned Users

WHILE a user is banned from a community, THE system SHALL allow the user to view posts and comments in that community.

WHILE a user is banned from a community, THE system SHALL allow the user to browse the community feed and view individual posts, their content, and comments.

### Existing Content of Banned Users

#### Existing Content of Banned Users

WHEN a user is banned from a community, THE system SHALL retain all existing posts and comments the user previously created in that community.

WHEN a user is banned from a community, THE system SHALL keep the user's existing posts and comments visible to all other users (including non-members) who can view the community.

### Community-Scoped Ban

#### Community-Scoped Ban

THE system SHALL restrict each ban to the specific community that issued it.

WHILE a user is banned from one community, THE system SHALL allow the user to continue participating in all other communities they are subscribed to, including creating posts and comments in those communities.

### Unbanning

#### Unbanning

WHEN a moderator unbans a user in their community, THE system SHALL remove the ban record immediately.

AFTER a user is unbanned from a community, THE system SHALL restore the user's ability to create posts and comments in that community.

IF a moderator attempts to unban a user who is not currently banned in that community, THE system SHALL reject the request.

### Viewing List of Banned Users

#### Viewing List of Banned Users

WHEN a moderator requests the list of banned users for their community, THE system SHALL display all users currently banned in that community.

THE list of banned users SHALL include each banned user's username and the reason for the ban.

THE list of banned users SHALL be available only to moderators of that community.

## Report Rules

Any user can report a post or comment that they believe violates community guidelines. When reporting, the user must provide a reason in text explaining why the content is being reported. Reports are sent to the moderators of the community where the content was posted. A report includes the reported content, who submitted the report, and the reason provided. Moderators can review all pending reports for their community. The moderator can approve a report, which deletes the reported content from the community. Alternatively, the moderator can dismiss a report, which keeps the content as is and removes the report from the review list. Dismissed reports are permanently removed from the report list and cannot be reviewed again. Only moderators of the specific community can review and act on reports — moderators from other communities cannot handle them.

### Report Submission Validation

WHEN a user submits a report, THE system SHALL validate that the target content (post or comment) exists within a community.

WHEN a user submits a report, THE system SHALL validate that the reporting user is not the author of the content being reported.

WHEN a user submits a report, THE system SHALL validate that the user does not already have a pending report for the same content.

IF the target content does not exist, THEN THE system SHALL reject the report submission.

IF the reporting user is the author of the content, THEN THE system SHALL reject the report submission.

IF a pending report from the same user for the same content already exists, THEN THE system SHALL reject the duplicate report submission.

### Report Reason Requirement

WHEN a user submits a report, THE system SHALL require that a reason be provided in text.

IF the reason is empty or contains only whitespace, THEN THE system SHALL reject the report submission.

WHEN a report is submitted with a valid reason, THE system SHALL preserve the original reason text as provided by the reporting user.

### Moderator Report Handling Scope

THE system SHALL allow only moderators of the community where the reported content was posted to view and act on reports for that community.

THE system SHALL NOT allow moderators from other communities to view or act on reports that belong to a different community.

THE system SHALL NOT allow non-moderator users to view, approve, or dismiss reports.

WHEN a moderator views the report list for their community, THE system SHALL display only reports with pending status. Dismissed reports are not included in the review list.

### Report Approval Outcome

WHEN a moderator approves a report, THE system SHALL delete the reported content (post or comment) from the community.

WHEN a moderator approves a report, THE system SHALL mark the report status as approved and remove it from the pending review list.

IF the reported content was already deleted (e.g., by the author or another moderator) before the report was approved, THEN THE system SHALL still accept the approval action and mark the report as approved, as the content is already absent.

### Report Dismissal Outcome

WHEN a moderator dismisses a report, THE system SHALL keep the reported content unchanged and visible in the community.

WHEN a moderator dismisses a report, THE system SHALL remove the report permanently from the moderator review list.

### Dismissed Report Lifecycle

WHEN a report is dismissed, THE system SHALL permanently remove it from the review list.

WHEN a report is dismissed, THE system SHALL NOT allow that report to appear in any moderator's review queue again.

WHEN a report is dismissed, THE system SHALL NOT allow any moderator to re-open or re-review that specific report instance.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Feed Pagination

THE system SHALL paginate all feeds (Home Feed, Popular Feed, and Community Feed).

WHEN a user reaches the end of the currently loaded page in any feed, THE system SHALL load the next page of posts.

IF there are fewer remaining posts than the configured page size, THEN THE system SHALL return the remaining posts as the final page.

WHEN a logged-out user requests the Home Feed, THE system SHALL reject the request.

WHEN a user scrolls through a feed, THE system SHALL maintain the chosen sort order across paginated pages.

### Sorting Options for Feeds

THE system SHALL support four sorting options for all feeds (Home, Popular, Community): Hot, New, Top, and Controversial.

WHEN Hot sorting is selected, THE system SHALL order posts by a combination of recency and upvote activity, placing recent posts with many upvotes first.

WHEN New sorting is selected, THE system SHALL order posts by creation time with the most recently created posts appearing first.

WHEN Top sorting is selected, THE system SHALL order posts by vote score (upvotes minus downvotes), with the highest-scoring posts first.

WHEN Controversial sorting is selected, THE system SHALL order posts with many total votes but a score close to zero first.

THE system SHALL apply the selected sorting option consistently across all pages of the feed.

### Time-Based Filtering for Top Sort

WHEN a user selects Top sorting for any feed, THE system SHALL provide a time-based filter to narrow results.

WHERE a user selects Top sorting without specifying a time filter, THE system SHALL default to filtering by All time.

THE system SHALL support the following time filter options exclusively for Top sorting: Today, This week, This month, This year, and All time.

WHEN a time filter is applied, THE system SHALL include only posts created within the selected time window when calculating the Top sort order.

WHEN a sorting option other than Top is selected, THE system SHALL not apply any time-based filter.

### Comment Sorting Options

THE system SHALL support three sorting options for comments on a post: Best, New, and Controversial.

WHEN no sorting option is explicitly selected for comments, THE system SHALL default to Best sorting.

WHEN Best sorting is selected, THE system SHALL order top-level comments by vote score with the highest-scoring comments first.

WHEN New sorting is selected, THE system SHALL order top-level comments by creation time with the most recently created comments first.

WHEN Controversial sorting is selected, THE system SHALL order top-level comments with many total votes but a score close to zero first.

WHILE displaying nested replies, THE system SHALL apply the selected sort order within each level of the thread while maintaining the parent-child threading structure.

### Community Search Filtering

WHERE a user searches for communities by name, THE system SHALL return communities whose name partially or fully matches the search query.

THE system SHALL perform community name matching case-insensitively.

WHERE a search query is a substring of a community's name, THE system SHALL include that community in the search results.

THE system SHALL include each community's name, description, icon, and subscriber count in the search results (with subscriber count defined in the Community Rules section).

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Entity Not Found

WHEN a user requests a user account, community, post, comment, or any other entity that does not exist, THEN THE system SHALL reject the request.

WHEN a user attempts to access a community, post, or comment that has been deleted, THEN THE system SHALL reject the request.

IF a user attempts to view a non-existent user's profile, THEN THE system SHALL reject the request.

WHEN a user requests a feed for a community that does not exist, THEN THE system SHALL reject the request.

### Authentication Failures

WHEN a user provides an incorrect email or password during login, THEN THE system SHALL reject the login attempt.

WHEN a user attempts to change their password without providing their current password correctly, THEN THE system SHALL reject the password change request.

WHEN a guest (unauthenticated user) attempts to access member-only features, including creating posts, voting, commenting, subscribing to communities, changing their password, deleting their account, or viewing the Home Feed, THEN THE system SHALL reject the request.

WHEN a user whose account has been deleted attempts to log in or perform any action, THEN THE system SHALL reject the request.

### Input Validation Failures

WHEN a user attempts to create a post without providing a title, THEN THE system SHALL reject the request.

WHEN a user attempts to submit a report without providing a reason, THEN THE system SHALL reject the request.

WHEN a user signs up with an email address that is already associated with an existing account, THEN THE system SHALL reject the registration.

WHEN a user signs up with a username that is already taken by another user, THEN THE system SHALL reject the registration.

WHEN a user creates a community with a name that already exists, THEN THE system SHALL reject the request.

WHEN a user attempts to create an image post without providing an image, THEN THE system SHALL reject the request.

WHEN a user attempts to create a link post without providing a URL, THEN THE system SHALL reject the request.

### Authorization Failures

WHEN a user who is not a moderator of a community attempts to delete a post or comment in that community, THEN THE system SHALL reject the request.

WHEN a user who is not a moderator of a community attempts to ban or unban a user in that community, THEN THE system SHALL reject the request.

WHEN a user who is not a moderator of a community attempts to view the list of reports for that community, THEN THE system SHALL reject the request.

WHEN a user who is not a moderator of a community attempts to approve or dismiss a report in that community, THEN THE system SHALL reject the request.

WHEN a user who is not subscribed to a community attempts to create a post in that community, THEN THE system SHALL reject the request.

WHEN a user who is not the owner of a post or comment attempts to edit or delete that post or comment, THEN THE system SHALL reject the request.

WHEN a moderator attempts to remove the community owner (the user who created the community), THEN THE system SHALL reject the request.

WHEN a moderator attempts to remove another moderator from a community, THEN THE system SHALL reject the request (only the owner may remove moderators).

### Banned User Restrictions

WHILE a user is banned from a community, THE system SHALL reject any attempt by that user to create a post in that community.

WHILE a user is banned from a community, THE system SHALL reject any attempt by that user to write a comment on any post in that community.

### Operation Conflicts

WHEN a user who has already subscribed to a community attempts to subscribe again, THEN THE system SHALL reject the request.

WHEN a user who is not subscribed to a community attempts to unsubscribe from it, THEN THE system SHALL reject the request.

WHEN a user who has already cast a vote on a post or comment attempts to cast a second vote, THEN THE system SHALL reject the request — the user may change their existing vote or remove it instead.

WHEN a user attempts to edit a post or comment they have previously deleted, THEN THE system SHALL reject the request.

### Data Integrity on Account Deletion

WHEN a user deletes their account, THEN THE system SHALL also delete all posts and comments associated with that user.

WHEN a user deletes their account, THEN THE system SHALL remove their subscriptions from all communities.

WHEN a user who is a moderator or owner of a community deletes their account, THEN THE system SHALL revoke their moderator or owner status in those communities.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Content Type Validation

WHEN a user uploads a file for an avatar image, community icon image, or image post, THE system SHALL validate that the file is an image file.

WHEN a user uploads a file that is not an image file, THE system SHALL reject the upload.

### File Integrity Validation

WHEN a user uploads an image file, THE system SHALL validate that the file is not corrupted and can be processed as an image.

WHEN an uploaded image file is corrupted or cannot be processed, THE system SHALL reject the upload.

### Virus Scanning

WHEN a user uploads a file, THE system SHALL scan the file for known viruses or malware before accepting it.

IF a virus or malware is detected, THEN THE system SHALL reject the upload.

### File Retention on Account Deletion

WHEN a user deletes their account, THE system SHALL delete all uploaded image files associated with that user, including their avatar image and any images uploaded as part of their posts.

WHEN a user deletes a post of type "image post", THE system SHALL delete the associated uploaded image file.