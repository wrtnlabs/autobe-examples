**redditLike — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Users can create an account by providing an email address, password, and choosing a unique username. Users log in to the platform using their email and password credentials. Once logged in, users can change their password to maintain account security. Users can delete their account, which permanently removes all their posts and comments from the platform. Each user has a profile containing a display name, bio text, and avatar image that others can view. Users can edit their own display name, bio, and avatar at any time. Any user can view another user's profile page to see their display name, bio, avatar, and total karma score. A user's profile page displays all posts they have created and all comments they have written. The system ensures that only the account owner can modify their profile information or delete their account.

### Account Registration

Users can create a new account by providing an email address, choosing a password, and selecting a unique username. The email address must be valid and not already associated with an existing account. The username must be unique across the platform and cannot be changed after account creation. The password must meet minimum security requirements. When all information is provided correctly, the account is created and the user is automatically logged in.

### User Login

Users can log in to the platform using their registered email address and password. The system validates the credentials and grants access to the user's account upon successful authentication. If the email or password is incorrect, access is denied. Users must be logged in to access features that require membership, such as creating posts, commenting, and viewing the home feed.

### Password Change

Logged-in users can change their account password at any time. The user must provide their current password to verify ownership before setting a new password. The new password must meet minimum security requirements. Once changed, the new password is used for all future login attempts.

### Account Deletion

Users can delete their own account. When an account is deleted, all posts created by that user are hard deleted from the platform. All comments written by that user are also hard deleted. The user's profile information is deleted. Username becomes available for reuse by other users after deletion is complete.

### Profile Management

Each user has a profile containing a display name, bio text, and avatar image. Users can edit their own display name to change how they appear to others. Users can write or update their bio text to share information about themselves. Users can upload or change their avatar image. Only the account owner can modify their own profile information.

### Profile Viewing

Any user can view another user's profile page without restriction. The profile page displays the user's display name, bio text, and avatar image. The profile page shows the user's total karma score. The profile page includes a list of all posts the user has created across all communities. The profile page includes a list of all comments the user has written on any post.

### Karma Score Tracking

Each user has a single karma score represented as a number that can be positive, negative, or zero. The karma score increases by 1 when another user upvotes the user's post. The karma score increases by 1 when another user upvotes the user's comment. The karma score decreases by 1 when another user downvotes the user's post. The karma score decreases by 1 when another user downvotes the user's comment. When a user removes their upvote, the karma score decreases by 1. When a user removes their downvote, the karma score increases by 1. When a user changes from upvote to downvote, the karma score decreases by 2. When a user changes from downvote to upvote, the karma score increases by 2.

## Community Operations

Any user can create a new community by providing a unique name, description text, and icon image. The user who creates a community automatically becomes its owner with the highest authority. Users can browse all communities through a list view to discover new communities. Users can search for communities by their name to find specific communities. Each community displays its subscriber count to show its popularity. Users can subscribe to any community to receive its posts in their home feed. Users can unsubscribe from any community they have joined. Users can view a list of all communities they are subscribed to. The system enforces that community names must be unique across the platform. Community owners have special privileges to manage moderators and community settings.

### Community Creation

Users can create a new community by providing a unique name and description text. An icon image is optional.
The system assigns the creating user as the community owner with full administrative authority.
If the community name already exists, the creation request is rejected.
If the description is missing or empty, the creation request is rejected.
The owner retains permanent control over the community unless they voluntarily transfer ownership or delete their account.

### Community Discovery and Browsing

Users can browse all communities through a paginated list view to discover new communities.
Users can search for communities by entering a name or partial name to find specific communities.
Each community in the list displays its name, description, icon, and current subscriber count.
The subscriber count updates in real-time as users subscribe or unsubscribe.
Both logged-in and logged-out users can browse and search communities.
Community discovery supports pagination to handle large numbers of communities.

### Community Subscription Management

Users can subscribe to any community to receive its posts in their home feed.
Users can unsubscribe from any community they have previously subscribed to.
Users can view a complete list of all communities they are currently subscribed to.
The system prevents duplicate subscriptions, so a user cannot subscribe to the same community twice.
Subscribing to a community is required before the user can create posts in that community.
Unsubscribing removes the community from the user's home feed but does not delete their existing posts.

### Community Ownership and Authority

The user who creates a community becomes its owner with the highest authority.
Community owners can add moderators to help manage the community.
Community owners can remove moderators from the community.
Moderators can add other moderators to assist with community management.
Moderators cannot remove the owner or other moderators; only the owner has this authority.
Owners and moderators can delete any post or comment within their community. Deleted posts and comments are permanently removed and cannot be recovered.
Owners and moderators can ban users from their community.
Owners and moderators can unban previously banned users.
Moderators can view the list of banned users for their community.
Banned users cannot create posts or comments in the community, but can still view its content.

### Home Feed Community Posts

The home feed displays posts only from communities the user is subscribed to.
Logged-in users can access their home feed to see content from their joined communities.
The home feed supports the same sorting options as other feeds: hot, new, top, and controversial.
Users must be subscribed to at least one community to see content in their home feed.
If a user unsubscribes from a community, new posts from that community no longer appear in their home feed.
Existing posts from unsubscribed communities remain visible if accessed directly through the community feed.

## Post Operations

Users can create a post in any community they are subscribed to, but subscription is required before posting. Every post must have a title, which is a required field that cannot be empty. A post must be one of three types: text post with content, link post with a URL, or image post with an uploaded image. Users can edit their own posts to update the title or content after creation. Users can delete their own posts, which removes them from the platform permanently. Moderators can delete any post in their community regardless of author. When viewing a single post, users see the title, full content, author username, community name, vote score, comment count, and posting timestamp. The system enforces that only the post author can edit or delete their own posts. Posts are organized within communities and form the primary content of the platform.

### Post Creation and Type Selection

Users can create a post in any community they are subscribed to. The system SHALL verify subscription status before allowing post creation. Users who are not subscribed to a community SHALL be prevented from creating posts in that community.

Every post SHALL have a title, which is a required field. Posts without a title SHALL be rejected by the system.

A post SHALL be one of three types:
- Text post: contains written text content
- Link post: contains a URL to external content
- Image post: contains an uploaded image file

The system SHALL validate that the post type matches the provided content (text posts have text, link posts have a URL, image posts have an image).

### Post Viewing and Display Details

When viewing a single post, the system SHALL display the following information:
- Post title
- Full post content (based on post type)
- Author username
- Community name
- Vote score (calculated as upvotes minus downvotes)
- Comment count (total number of comments on the post)
- Posting timestamp (when the post was created)

For post lists in feeds, each post entry SHALL show:
- Title
- Author username
- Community name
- Vote score
- Comment count
- Time since posted (e.g., "3 hours ago")
- For text posts: first 200 characters of content
- For image posts: thumbnail of the image
- For link posts: the domain name of the URL

### Post Editing and Deletion

Users can edit their own posts after creation. Only the post author SHALL be permitted to edit their post. The system SHALL prevent users from editing posts they do not own.

Users can delete their own posts. Only the post author SHALL be permitted to delete their post. When a post is deleted, it is hard deleted from the platform.

### Post Ownership and Moderator Authority

The owner of a post (the user who created it) has full control over their post, including the ability to edit and delete it.

Moderators of a community SHALL be able to delete any post within their community, regardless of who authored it. This authority applies to all posts in the community the moderator has been assigned to moderate.

The system SHALL enforce these ownership and moderation rules to prevent unauthorized modifications or deletions.

## Comment Operations

Users can write a comment on any post to participate in discussions. Users can reply to any comment, creating nested conversations with no depth limit. Users can edit their own comments to correct or update their content after posting. Users can delete their own comments, which removes them from the platform permanently. Moderators can delete any comment in their community regardless of author. Each comment displays the author username, content, vote score, time since posted, and nested replies. The system supports unlimited nesting depth for comment replies, allowing deep conversation threads. Comments on a post can be sorted by best vote score, newest first, or most controversial. Only the comment author can edit or delete their own comments. Comments form the discussion layer on top of posts and enable community engagement.

### Comment Creation

Users can write a comment on any post to participate in discussions. The comment must contain text content. The comment is automatically associated with the posting user and the post's community. If the comment content is empty, the request is rejected. If the post does not exist, the request is rejected.

### Comment Replies and Nesting

Users can reply to any comment, creating nested conversations. Replies can have replies of their own, with no depth limit on nesting. Each reply is associated with the parent comment and the original post. Users can view the complete thread structure showing all nested replies. The system displays nested replies in a hierarchical format under their parent comment.

### Comment Editing

Users can edit their own comments to correct or update their content after posting. Only the comment author can edit their comment. Moderators cannot edit user comments. If the user attempts to edit a comment they do not own, the request is rejected. If the comment does not exist, the request is rejected.

### Comment Deletion

Users can delete their own comments, which removes them from the platform via hard delete. Only the comment author can delete their comment. Moderators can also delete any comment in their community regardless of the author. If the user attempts to delete a comment they do not own and are not a moderator of the community, the request is rejected. If the comment does not exist, the request is rejected.

### Comment Display

Each comment displays the author username, content, vote score, and time since posted. For nested replies, the system shows the complete thread structure with all replies under their parent comment. Text content is shown in full. The time is displayed as a relative timestamp (e.g., "3 hours ago"). Vote score shows the total upvotes minus downvotes.

### Comment Sorting

Comments on a post can be sorted by three options. Best sorting shows comments with the highest vote score first. New sorting shows the most recent comments first. Controversial sorting shows comments with many votes but a score close to zero first. All sorting options apply to the complete thread including nested replies.

### Comment Voting

Users can upvote or downvote any comment. Each user can cast only one vote per comment. Users can change their vote from upvote to downvote or vice versa. Users can remove their vote entirely. Vote score equals total upvotes minus total downvotes. When a vote is removed or changed, the comment's vote score adjusts accordingly and the author's karma score adjusts accordingly.

## Vote Operations

Users can upvote a post to add 1 to its score and increase the author's karma by 1. Users can downvote a post to subtract 1 from its score and decrease the author's karma by 1. Each user can only vote once per post, preventing multiple votes from the same user. Users can change their vote from upvote to downvote or vice versa, adjusting the score accordingly. Users can remove their vote entirely, which reverses the karma impact on the author. Vote score equals total upvotes minus total downvotes, and can be negative. The same voting rules apply to comments as they do to posts. Vote removal adjusts karma back to the state before the vote was cast. Users can upvote or downvote any comment with the same one-vote-per-user restriction.

### Post Voting Operations

Users can upvote a post to add 1 to its vote score. When a user upvotes a post, the post author's karma score increases by 1.

Users can downvote a post to subtract 1 from its vote score. When a user downvotes a post, the post author's karma score decreases by 1.

Each user can cast only one vote per post. A user cannot submit multiple votes on the same post.

Users can change their vote on a post from upvote to downvote or from downvote to upvote. When a vote is changed, the vote score adjusts by 2 points (removing the previous vote and applying the new vote), and the author's karma adjusts accordingly.

Users can remove their vote from a post entirely. When a vote is removed, the vote score reverses by 1 point, and the author's karma returns to the state before the vote was cast.

The vote score equals the total number of upvotes minus the total number of downvotes. Vote scores can be negative when downvotes exceed upvotes.

### Comment Voting Operations

Users can upvote a comment to add 1 to its vote score. When a user upvotes a comment, the comment author's karma score increases by 1.

Users can downvote a comment to subtract 1 from its vote score. When a user downvotes a comment, the comment author's karma score decreases by 1.

Each user can cast only one vote per comment. A user cannot submit multiple votes on the same comment.

Users can change their vote on a comment from upvote to downvote or from downvote to upvote. When a vote is changed, the vote score adjusts by 2 points, and the author's karma adjusts accordingly.

Users can remove their vote from a comment entirely. When a vote is removed, the vote score reverses by 1 point, and the author's karma returns to the state before the vote was cast.

Comment voting follows the same rules as post voting: one vote per user, vote score equals upvotes minus downvotes, and karma adjusts based on vote type.

### Vote Score and Karma Calculation

Vote scores are calculated as the total number of upvotes minus the total number of downvotes. This formula applies to both posts and comments.

Vote scores can be negative when a post or comment receives more downvotes than upvotes.

When a user upvotes content, the author's karma increases by 1. When a user downvotes content, the author's karma decreases by 1.

When a user removes their vote, the karma impact is reversed. If the user had upvoted, the author's karma decreases by 1. If the user had downvoted, the author's karma increases by 1.

When a user changes their vote, the karma adjusts to reflect the new vote type. Changing from upvote to downvote decreases the author's karma by 2. Changing from downvote to upvote increases the author's karma by 2.

## Report Operations

Users can report any post or comment that violates community guidelines. When reporting, users must provide a text reason explaining why the content should be reviewed. Moderators can view all reports for their community to take appropriate action. Each report shows the reported content, who reported it, and the reason provided. Moderators can approve a report, which deletes the reported content from the platform. Moderators can dismiss a report, which keeps the content and removes the report from the list. Dismissed reports are permanently removed from the moderator's report queue. Moderators can ban users from their community, preventing them from creating posts or comments. Moderators can unban users to restore their posting privileges. Moderators can view the list of banned users in their community. Banned users can still view community content but cannot participate.

### Report Submission

Users can report any post or comment they believe violates community guidelines. When submitting a report, the user must provide a text reason explaining why the content should be reviewed. The report is associated with the reported content and the user who submitted it. If the report reason is empty, the report cannot be submitted. If the reported content no longer exists, the report cannot be submitted.

### Report Review and Queue

Moderators can view all reports for their community in a report queue. Each report displays the reported content, the user who submitted the report, and the reason provided. Moderators can only view reports for communities where they have moderator privileges. Reports are organized in a queue for moderators to review and take action.

### Report Resolution Actions

Moderators can approve a report, which results in the deletion of the reported content from the platform. Moderators can dismiss a report, which keeps the content and removes the report from the queue. When a report is approved, the reported content is hard deleted. When a report is dismissed, the report is removed from the moderator's report queue and the content remains visible. Moderators have the authority to make final decisions on report outcomes.

### User Moderation Actions

Moderators can ban users from their community, preventing those users from creating posts or comments in that community. Moderators can unban previously banned users, restoring their ability to create posts and comments. Banned users retain the ability to view community content but cannot participate through posts or comments.

### Banned Users Management

Moderators can view a list of all users banned from their community. The banned users list shows which users are currently restricted from participating in the community. Moderators can review the banned users list to manage community membership.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

Users attempting to sign up must provide a unique username; duplicate usernames are rejected with a clear message. Email and password are required for account creation, and the system prevents registration without both. When logging in, incorrect email or password combinations are denied access. Users changing their password must provide their current password for verification. Account deletion triggers cascading removal of all user posts and comments across the platform. Users editing their profile cannot leave the display name empty. Profile image uploads may fail if the file format is unsupported. Viewing other user profiles works for all accounts, but deleted accounts show limited information. Users cannot log in after their account has been deleted. Email addresses must follow a valid format during registration. Passwords must meet minimum security requirements. Users attempting to access protected features without logging in are redirected to the login page.

### Account Registration Validation

WHEN a user attempts to create an account, THE system SHALL require both email and password to be provided.

WHEN a user registers, THE system SHALL validate that the email address follows a valid email format.

WHEN a user registers, THE system SHALL require the user to choose a unique username.

WHEN a username already exists in the system, THE system SHALL reject the registration and inform the user to choose a different username.

WHEN a user sets a password, THE system SHALL enforce minimum password security requirements.

If the email format is invalid, THE system SHALL reject the registration.

If the password does not meet security requirements, THE system SHALL reject the registration.

### Login Authentication

WHEN a user attempts to log in, THE system SHALL require both email and password credentials.

WHEN the email and password combination does not match existing credentials, THE system SHALL deny access and reject the login attempt.

WHEN an unauthenticated user attempts to access protected features, THE system SHALL redirect the user to the login page.

If the user is not logged in, THE system SHALL prevent access to protected features such as the home feed and post creation.

### Password Change Verification

WHEN a user attempts to change their password, THE system SHALL require the user to provide their current password.

WHEN the current password provided does not match the stored password, THE system SHALL reject the password change request.

WHEN the new password does not meet security requirements, THE system SHALL reject the password change request.

### Profile Editing Validation

WHEN a user edits their profile, THE system SHALL require a display name to be provided and non-empty.

WHEN a user uploads a profile image, THE system SHALL validate that the image format is supported.

If the display name is empty, THE system SHALL reject the profile update.

If the image format is unsupported, THE system SHALL reject the image upload and inform the user of supported formats.

### Account Deletion and Access

WHEN a user deletes their account, THE system SHALL permanently delete all posts created by that user.

WHEN a user deletes their account, THE system SHALL permanently delete all comments written by that user.

WHEN an account has been deleted, THE system SHALL prevent any login attempts with the former credentials.

WHEN a deleted account is referenced in content viewed by other users, THE system SHALL display limited or no information about that user.

## Community Error Scenarios

Community names must be unique across the platform; duplicate names are rejected during creation. Users attempting to create a community without a description receive an error. Community icons must be valid image files; unsupported formats are rejected. Users cannot subscribe to a community they already follow; duplicate subscriptions are prevented. Unsubscribing from a community removes access to create posts in that community. Users who are banned from a community cannot subscribe again until unbanned. Community owners cannot remove themselves from the owner role. Moderators cannot remove the community owner or other moderators. Searching for communities with no results returns an empty list. Communities with zero subscribers display correctly in browse views. Users cannot view subscriber counts for communities they have not visited. Community deletion cascades to all posts and comments within that community.

### Community Name Uniqueness

Community names must be unique across the entire platform. When a user attempts to create a community with a name that already exists, the system rejects the creation request. The user is informed that the chosen name is unavailable and must select a different name. This uniqueness constraint applies to all community names regardless of case sensitivity.

### Community Description Requirement

When creating a community, the user must provide a description text. If the description is missing or empty, the system rejects the community creation request. The user is informed that a description is required and must provide one before proceeding. The community is not created until all required fields are satisfied.

### Community Icon Format Validation

Community icons are optional during community creation. When a user chooses to upload an icon, it must be a valid image file in supported formats. If an icon is uploaded in an unsupported format, the system rejects the upload. The user is informed of the supported image formats and may re-upload with a compatible file or proceed without an icon. Community creation can proceed without an icon.

### Duplicate Subscription Prevention

A user can only subscribe to a community once. When a user attempts to subscribe to a community they are already following, the system prevents the duplicate subscription. The system recognizes the existing subscription and does not create a new one. Users cannot accumulate multiple subscriptions to the same community.

### Unsubscription Access Loss

When a user unsubscribes from a community, they immediately lose the ability to create posts in that community. The system removes their posting access upon unsubscription. If the user attempts to create a post after unsubscribing, the request is rejected. The user must re-subscribe to regain posting privileges.

### Banned User Subscription Block

Users who have been banned from a community cannot subscribe to that community again. When a banned user attempts to subscribe, the system blocks the subscription request. The user remains blocked until the community owner or a moderator removes the ban. Banned users cannot circumvent the ban by creating new subscriptions.

### Owner Role Immutability

The community owner role cannot be removed or transferred. The user who creates a community retains permanent ownership. The system does not allow the owner to remove themselves from the owner role. No other user, including moderators, can change the ownership of a community.

### Moderator Removal Restrictions

Moderators cannot remove the community owner from the community. Moderators also cannot remove other moderators from their roles. Only the community owner has the authority to remove moderators. When a moderator attempts to remove the owner or another moderator, the system rejects the action.

### Empty Search Results Handling

When users search for communities and no matches are found, the system displays an empty list. The search completes successfully but returns no results. Users are informed that no communities match their search criteria. The empty result state is handled gracefully without errors.

### Zero Subscriber Display

Communities with zero subscribers are displayed correctly in browse views. The subscriber count shows as zero without any display errors. These communities remain visible to all users who browse the community list. Zero-subscriber communities can still be discovered and subscribed to.

### Subscriber Count Visibility

Users cannot view subscriber counts for communities they have not visited. When a user attempts to view a community they have not visited, the subscriber count is not displayed. Users must first visit the community page to see its subscriber count. This prevents users from seeing counts for communities they have no interest in.

### Community Deletion Cascade

When a community is deleted, all posts within that community are permanently removed. All comments on those posts are permanently removed as well. The deletion cascades through all content associated with the community. Users who attempt to view deleted community content receive an error indicating the content no longer exists.

## Post Error Scenarios

Users must be subscribed to a community before creating posts; unsubscribed users are blocked. Post titles are required; submissions without titles are rejected. Post types must be one of three options: text, link, or image; invalid types are rejected. Text posts require content; empty text submissions are denied. Link posts require valid URLs; malformed URLs are rejected. Image posts require valid image files; unsupported formats are rejected. Users cannot edit posts created by other users; unauthorized edits are blocked. Users cannot delete posts created by other users; unauthorized deletions are blocked. Moderators can delete any post in their community regardless of author. Banned users cannot create posts in banned communities; attempts are denied. Vote scores are calculated correctly even with negative totals. Posts with zero comments display correctly in feeds. Users cannot view posts from communities they have not visited.

### Subscription Requirements for Posting

WHEN a user attempts to create a post in a community, THE system SHALL verify the user has subscribed to that community. WHEN the user has not subscribed to the community, THE system SHALL reject the post creation request. Unsubscribed users are blocked from creating posts but retain the ability to view community content through public feeds.

### Post Title Validation

WHEN a post submission is received, THE system SHALL validate that a title is provided. WHEN the title is missing, empty, or contains only whitespace, THE system SHALL reject the request and notify the user of the validation error. Every post must include a non-empty title.

### Post Type Validation

WHEN a post is created, THE system SHALL validate the post type is one of three options: text_link_image. WHEN an invalid post type is submitted, THE system SHALL reject the request. FOR text posts, THE system SHALL validate that content is provided and reject empty submissions. FOR link posts, THE system SHALL validate the URL format and reject malformed or invalid URLs. FOR image posts, THE system SHALL validate the file format and reject unsupported image formats.

### Post Authorization Controls

WHEN a user attempts to edit a post, THE system SHALL verify the user owns the post. WHEN the user does not own the post, THE system SHALL reject the edit request. WHEN a user attempts to delete a post, THE system SHALL verify the user owns the post. WHEN the user does not own the post, THE system SHALL reject the delete request. Moderators can delete any post within their community regardless of author ownership. Community owners can delete any post in their community.

### Banned User Restrictions

WHEN a banned user attempts to create a post in the community where they are banned, THE system SHALL reject the request. Banned users retain the ability to view community content but cannot create new posts until the ban is lifted. The ban restriction applies only to the specific community where the ban was issued.

### Vote Score and Display Edge Cases

THE system SHALL calculate vote scores as the total number of upvotes minus the total number of downvotes. THE system SHALL correctly display vote scores even when the result is negative. THE system SHALL display posts with zero comments normally in feeds with a comment count of zero. Users can view posts from communities they have not visited through public feeds (Popular Feed and Community Feed), but cannot create posts in those communities unless they are subscribed.

## Comment Error Scenarios

Users can reply to any comment with no depth limit; infinite nesting is supported. Users cannot edit comments created by other users; unauthorized edits are blocked. Users cannot delete comments created by other users; unauthorized deletions are blocked. Moderators can delete any comment in their community regardless of author. Banned users cannot create comments in banned communities; attempts are denied. Users cannot reply to deleted comments; deleted comment replies are blocked. Comment content cannot be empty; blank submissions are rejected. Vote scores are calculated correctly even with negative totals. Comments with zero replies display correctly in nested views. Users cannot view comments from posts in communities they have not visited. Comment sorting options work correctly for all vote configurations. Time-based display shows accurate relative timestamps.

### Comment Reply and Nesting

Users can reply to any comment on a post. Replies can themselves receive replies, with no limit on nesting depth. The system supports infinite comment nesting without restrictions on reply depth.

### Comment Modification Permissions

Users can edit only their own comments. When a user attempts to edit a comment created by another user, the request is rejected. Users can delete only their own comments. When a user attempts to delete a comment created by another user, the request is rejected. Moderators can delete any comment in their community, regardless of who created it. When a moderator deletes a comment, the content is hard deleted from the community.

### Comment Access Control

Users who are banned from a community cannot create comments in that community. When a banned user attempts to create a comment in a banned community, the request is rejected. Banned users can still view comments in communities where they are banned. Users cannot reply to deleted comments. When a user attempts to reply to a deleted comment, the request is rejected. Users can view comments on posts from any community, including communities they have not visited or subscribed to.

### Comment Content Validation

Comments must contain content. When a user submits a comment with empty or blank content, the request is rejected. Comment content cannot consist only of whitespace.

### Comment Voting Behavior

Users can upvote or downvote comments. Each user can vote only once per comment. Users can change their vote from upvote to downvote or vice versa. Users can remove their vote entirely from a comment. Vote scores can be negative when downvotes exceed upvotes. Vote scores are calculated as total upvotes minus total downvotes. Vote sorting options (best, new, controversial) work correctly regardless of vote score values, including negative scores.

### Comment Display and Browsing

Comments display with their author, content, vote score, and time since posted. Comments with no replies display correctly in nested views without errors. Relative timestamps show when comments were posted (e.g., "3 hours ago", "2 days ago"). Comment sorting options include best (highest vote score first), new (most recent first), and controversial (many votes but score close to zero first).

## Vote Error Scenarios

Each user can only vote once per post; duplicate votes are prevented. Users can change their vote from upvote to downvote or vice versa; vote updates adjust scores correctly. Users can remove their vote entirely; vote removal adjusts scores accordingly. Vote removal restores the previous vote count without the user's contribution. Users cannot vote on their own posts or comments; self-voting is blocked. Vote scores are calculated as total upvotes minus total downvotes. Karma adjustments occur when votes are added, changed, or removed. Negative karma scores are allowed and display correctly. Vote timestamps are recorded for sorting purposes. Users cannot vote on deleted posts or comments; voting on deleted content is blocked. Vote changes are reflected immediately in feed displays. Vote counts remain accurate during high-traffic periods.

### Duplicate Vote Prevention

THE system SHALL prevent a user from casting a second vote on the same post or comment.

WHEN a user attempts to vote on content they have already voted on, THE system SHALL reject the vote and display an appropriate message.

WHEN a user attempts to vote on their own post or comment, THE system SHALL block the action and prevent the vote from being recorded.

WHEN a user attempts to vote on a deleted post or comment, THE system SHALL block the action and display an error message.

### Vote Modification and Score Adjustment

WHEN a user changes their vote from upvote to downvote, THE system SHALL adjust the vote score by removing the previous upvote and applying the downvote.

WHEN a user changes their vote from downvote to upvote, THE system SHALL adjust the vote score by removing the previous downvote and applying the upvote.

WHEN a user removes their vote from a post or comment, THE system SHALL adjust the vote score by subtracting the user's previous contribution.

THE system SHALL reflect vote changes and removals immediately in feed displays and on the content page.

THE system SHALL ensure vote counts remain accurate during concurrent vote operations.

### Vote Score and Karma Calculation

THE system SHALL calculate vote score as the total number of upvotes minus the total number of downvotes.

WHEN a user upvotes a post or comment, THE system SHALL increase the author's karma by 1.

WHEN a user downvotes a post or comment, THE system SHALL decrease the author's karma by 1.

WHEN a user changes their vote, THE system SHALL adjust the author's karma accordingly.

WHEN a user removes their vote, THE system SHALL adjust the author's karma by removing the previous vote's contribution.

THE system SHALL allow karma scores to be negative and display negative values correctly on user profiles.

THE system SHALL record vote timestamps to support sorting and filtering by recency.

## Report Error Scenarios

Users must provide a reason when reporting content; empty reasons are rejected. Reports can only be created for existing posts and comments; non-existent content reports fail. Moderators can only view reports for their own communities; cross-community reports are hidden. Users cannot approve or dismiss reports without moderator privileges; unauthorized actions are blocked. Report approval deletes the reported content permanently. Report dismissal removes the report from the pending list without deleting content. Dismissed reports cannot be re-submitted for the same content. Multiple users can report the same content; duplicate reports are tracked separately. Moderators cannot approve their own reports; self-approval is blocked. Report status changes are logged for audit purposes. Users cannot report their own content; self-reporting is blocked. Report reasons are visible to moderators but not to the reported content author.

### Report Creation Validation

Users can report any post or comment they encounter on the platform. When submitting a report, users must provide a reason explaining why the content violates community standards. The reason field cannot be empty; reports submitted without a reason are rejected.

Reports can only be created for existing posts and comments. If the reported content no longer exists, the report creation fails.

Users cannot report their own content. Attempts to report a post or comment that the user created are blocked.

Multiple users can report the same piece of content. Each report is tracked separately, even if the content has already been reported by another user.

### Report Visibility and Access

When viewing reports, moderators can only see reports for content within communities they moderate. Reports from other communities are hidden from their view.

Report reasons are visible to moderators when they review reports. The reported content author cannot see who reported them or what reason was provided.

The reporter's identity is shown to moderators but remains hidden from the reported content author and other users.

### Report Moderation Actions

Only moderators can approve or dismiss reports in their communities. Users without moderator privileges cannot take action on reports; their attempts are blocked.

When a moderator approves a report, the reported content (post or comment) is deleted from the platform. This deletion is a hard_delete.

When a moderator dismisses a report, the report is removed from the pending report list. The reported content remains visible and is not deleted.

Moderators cannot approve their own reports. If a moderator submits a report, another moderator must review and act on it.

Users cannot approve or dismiss reports without moderator privileges. Non-moderator actions on reports are blocked.

### Report Lifecycle and Tracking

Once a report is dismissed, it cannot be re-submitted for the same piece of content by any user. The system prevents duplicate report submissions after dismissal.

Report status changes (pending, approved, dismissed) are logged for audit purposes. Moderators and system administrators can review the history of status changes.

Duplicate reports for the same content are tracked separately in the system. Each report maintains its own status and can be reviewed independently.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### New User Registration and First Participation

A new user can complete registration and begin participating in the platform through the following journey:

1. The user signs up with an email address, password, and chooses a unique username
2. After registration, the user can view and browse all available communities
3. The user can search for communities by name to find ones of interest
4. The user can view community details including description and subscriber count
5. The user can subscribe to communities they want to join
6. Once subscribed, the user can create their first post in that community
7. The user can choose post type: text, link, or image
8. The user can add a title (required) and appropriate content based on post type
9. After posting, the user can view their post in the community feed
10. Other users can view the new post, upvote or downvote it, and leave comments
11. The user receives karma changes based on votes received on their post and comments

This end-to-end scenario covers account creation, community discovery, subscription, content creation, and initial engagement.

### Content Engagement and Voting Workflow

An established user can engage with content through voting, commenting, and content creation in the following multi-step workflow:

1. The user browses posts through one of three feeds: Home Feed (subscribed communities), Popular Feed (all communities), or Community Feed (specific community)
2. The user can sort posts by Hot, New, Top (with time filters), or Controversial
3. When viewing a post, the user can read the full content, see vote score, comment count, author, and community
4. The user can cast a vote on the post: upvote adds 1 to score, downvote subtracts 1
5. The user can change their vote from upvote to downvote or vice versa, adjusting the score accordingly
6. The user can remove their vote entirely, reverting the score change
7. The user can write a comment on the post with text content
8. The user can reply to existing comments, creating nested reply threads with unlimited depth
9. The user can edit their own comments or posts to update content
10. The user can permanently delete their own comments or posts to remove content
11. Other users can vote on the user's comments following the same voting rules
12. The user's karma score updates based on all votes received on their posts and comments

This scenario demonstrates the core engagement loop of browsing, voting, commenting, and content management.

### Community Moderation and Content Governance

A community owner can manage their community through the following moderation journey:

1. The owner creates a community with a unique name, description text, and optional icon image
2. The owner automatically becomes the community owner with highest authority
3. The owner can add moderators to help manage the community
4. The owner can remove moderators from the community
5. Moderators can add other moderators but cannot remove the owner or other moderators
6. The owner and moderators can permanently delete any post in their community
7. The owner and moderators can permanently delete any comment in their community
8. The owner and moderators can ban users from the community
9. The owner and moderators can unban previously banned users
10. The owner and moderators can view the list of banned users in their community
11. Banned users cannot create posts or comments but can still view community content
12. The owner can view all reports submitted for their community
13. Moderators can also view all reports for their community
14. Each report shows the reported content, reporter identity, and reason provided
15. Moderators can approve a report, which permanently deletes the reported content
16. Moderators can dismiss a report, which keeps the content and removes the report from the list

This scenario covers the complete moderation lifecycle from community creation to content governance.

### Content Reporting and Moderation Response

A user can report inappropriate content and moderators can respond through this cross-domain workflow:

1. Any user can view posts and comments across the platform
2. When a user encounters inappropriate content, they can submit a report
3. The user must provide a text reason explaining why the content should be reviewed
4. The report is submitted and associated with the specific post or comment
5. The report becomes visible to moderators of the community where the content exists
6. Moderators can view all pending reports for their community
7. Each report displays the reported content, who submitted the report, and the reason
8. A moderator can approve the report, resulting in permanent deletion of the reported content
9. A moderator can dismiss the report, keeping the content and removing the report from the list
10. If content is permanently deleted via report approval, the author is notified of the removal
11. The reporting user does not receive direct notification of the report outcome
12. Dismissed reports are removed from the moderator's report queue

This scenario demonstrates the cross-domain flow from content creation through reporting to moderation action.

# File Storage

File upload capabilities, media processing, and storage requirements.

## File Upload and Management

Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

### File Upload Capability

THE system SHALL allow users to upload image files for their profile avatar.

THE system SHALL allow users to optionally upload image files when creating a community.

THE system SHALL allow users to upload image files when creating an image post.

THE system SHALL store uploaded files and associate them with the corresponding entity (user profile, community, or post).

### File Display and Rendering

THE system SHALL display the user's avatar on their profile page.

THE system SHALL display the user's avatar next to their posts and comments.

THE system SHALL display the community icon on the community page when one has been uploaded.

THE system SHALL display the community icon in community lists and feeds when one has been uploaded.

THE system SHALL display the uploaded image when viewing an image post.

THE system SHALL display a thumbnail of the image in post lists and feeds.

### File Replacement

WHEN a user uploads a new avatar, THE system SHALL replace the previous avatar.

WHEN a community owner uploads a new icon, THE system SHALL replace the previous icon.

WHEN a user edits an image post, THE system SHALL allow them to replace the uploaded image.

### File Lifecycle on Deletion

WHEN a user deletes their account, THE system SHALL permanently remove all files associated with that user.

WHEN a community is deleted, THE system SHALL permanently remove all files associated with that community.

WHEN a post is deleted, THE system SHALL permanently remove the uploaded image associated with that post.