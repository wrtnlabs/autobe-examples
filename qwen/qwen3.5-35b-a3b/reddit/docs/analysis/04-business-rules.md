**redditPlatform — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users create accounts by providing an email address, password, and choosing a unique username. The username must be unique across all users in the system. Users can log in using their email and password combination. Users have the ability to change their password at any time. When a user deletes their account, all of their posts and comments are permanently removed from the platform. Users earn a single karma score that can be positive or negative depending on their received votes. The username serves as the user's primary identifier throughout the platform.

### Username Uniqueness and Identity

Each user must choose a unique username when creating an account. The username cannot be the same as any existing username in the system. When a user attempts to register with a username that already exists, the registration request is rejected. The system validates username uniqueness at the time of account creation. Usernames remain unique for the lifetime of the platform—when an account is deleted, the username is permanently unavailable for reuse by any user. The username serves as the user's primary identifier throughout the platform.

### Account Creation Validation

When creating an account, users must provide an email address, password, and unique username. The email address must not already be registered in the system. The username must be unique and follow platform naming rules. The password must meet minimum security requirements set by the system. Users must agree to the platform terms before completing registration. When logging in, users must provide both their email address and password. The system rejects login attempts where either the email or password is missing. Login requests are rejected when the email or password does not match any existing account.

### Password Change Requirements

Users can change their password at any time from their account settings. When changing a password, users must provide their current password and a new password. The system validates that the current password is correct before allowing the password to be updated. If the current password is incorrect, the password change request is rejected. Users cannot set their new password to be the same as their current password. Password changes take effect immediately upon successful validation.

### Account Deletion with Cascade Effects

Users can delete their own account at any time from their account settings. When a user deletes their account, all content created by that user is permanently removed from the platform. This includes all posts, comments, votes, and reports submitted by the user. The username becomes permanently unavailable after account deletion and cannot be reused. Deleting an account is permanent and cannot be undone. Users must confirm account deletion before it takes effect.

### Karma Score Calculation

Each user has a single karma score that can be positive, negative, or zero. The karma score increases by one point when another user upvotes the user's post or comment. The karma score decreases by one point when another user downvotes the user's post or comment. When a user removes their vote from a post or comment, the karma score of the content author is adjusted accordingly by adding back the previously deducted points or subtracting previously added points. Karma scoring is automatic and cannot be manually modified by users or moderators.

### Profile Ownership and Management

Each user owns and controls their own profile information, including display name, bio text, and avatar image. Profile ownership is determined by the account association with the profile. Users can only edit their own profile information. Users cannot view or modify another user's profile information directly. Users can view any other user's public profile page to see their display name, bio, avatar, and karma score. Users can view their own karma score and all posts and comments they have created on their own profile page. When a user account is deleted, their profile information is also permanently removed.

## Profile Rules

Each user has a profile containing a display name, bio text, and avatar image. Users can edit their own display name, bio, and avatar at any time. Other users can view any user's profile on the platform. A user's profile page displays their display name, bio, avatar, total karma score, all posts they created, and all comments they wrote. The display name is what appears to other users when viewing their content. The bio text allows users to provide personal information about themselves. Avatar images represent users visually across the platform.

### Display Name Visibility

A user's display name is visible to all users on the platform when viewing posts and comments. The display name appears next to the author's content in feeds, on post pages, and on comment threads. The display name is also visible on the user's own profile page and on other users' profile pages when viewing their content lists.

### Bio Text Editing

Users can edit their own bio text at any time by accessing their profile settings. The bio text is displayed on the user's profile page and is visible to all other users who view that profile. The bio text can be changed by the user at any time without affecting the user's account status or visibility.

### Avatar Image Management

Users can upload, change, or remove their avatar image at any time through their profile settings. The avatar image is displayed on the user's own profile page and is visible to all other users when viewing the user's profile. The avatar image is also displayed next to the user's content in feeds, on post pages, and on comment threads. Users must provide a valid image file when uploading or changing their avatar.

### Profile Viewing Permissions

Any user on the platform can view the profile of any other user, regardless of whether they are subscribed to the same communities. Guest users (logged-out users) can also view any user's profile. Profile viewing does not require any special permissions or subscriptions to the user's communities.

### Karma Display on Profile

Each user's profile page displays their current karma score as a single number. The karma score shown on the profile is the sum of all points the user has gained from upvotes and lost from downvotes on their posts and comments. The karma score updates in real-time as other users vote on the user's content. The karma score can be negative if the user has received more downvotes than upvotes.

### Posts List on Profile

Each user's profile page displays a list of all posts they have created. The list shows all posts from any community the user is subscribed to or has created. The posts list includes posts that have been deleted by the author (marked as deleted) but excludes posts deleted by moderators. Each post in the list shows the title, community name, vote score, comment count, and when it was posted.

### Comments List on Profile

Each user's profile page displays a list of all comments they have written. The list shows all comments across all posts the user has commented on. The comments list includes comments that have been deleted by the author (marked as deleted) but excludes comments deleted by moderators. Each comment in the list shows the post title, comment content preview, vote score, time since posted, and the community where it was written.

### Own Profile Editing Rights

Only the owner of a profile can edit that profile's display name, bio text, and avatar image. Users cannot edit another user's profile information under any circumstances. To edit their own profile, users must be logged in with their account credentials. Profile editing changes take effect immediately and are visible to all users who view the profile.

## Community Rules

Any user can create a community with a unique name, description text, and icon image. The user who creates a community automatically becomes its owner. Community names must be unique across the platform. Users can browse all communities in a list view. Users can search for communities by their name. Each community displays its subscriber count to all users. Owners have the highest authority within their community. Communities serve as spaces for users to share posts and comments on specific topics.

### Community Creation

Any user can create a community by providing a unique name, description text, and icon image.
The community name must be unique across the entire platform—no two communities can have the same name.
The user who creates a community automatically becomes its owner with the highest authority.
The description text is required and contains text describing the community's purpose.
The icon image is required and displays on the community's profile page.

### Owner Authority

The owner has the highest authority within their community.
The owner can add moderators to the community.
The owner can remove moderators from the community.
The owner cannot be removed as moderator by any other user.
Moderators cannot remove the owner from their community.

### Community Browsing

Users can browse all communities in a list view.
Each community in the browse list displays its name, description, icon, and subscriber count.
Users can search for communities by entering part or all of the community name in the search field.
The search returns communities whose names match the search query.

### Subscriber Count Display

Each community displays its current subscriber count to all users.
The subscriber count increases by one when a user subscribes to the community.
The subscriber count decreases by one when a user unsubscribes from the community.
The subscriber count is visible on all community listing and detail pages.

### Community Name Validation

Community names must be unique across the platform.
If a user attempts to create a community with a name that already exists, the creation is rejected.
The system checks for exact name matches when validating uniqueness.
Duplicate community names are not allowed under any circumstances.

### Community Description Requirements

The description text is required when creating a community.
The description must contain text content—empty descriptions are not permitted.
Users can edit the description text after creation.
There is no minimum or maximum character limit specified for descriptions.

### Community Icon Requirements

The icon image is required when creating a community.
The icon displays on all community listing and detail pages.
Users can update the icon image after creation.
The system accepts image files for the community icon.

### Community Search Behavior

Users can search for communities by entering text in the search field.
The search matches against community names.
Search results display community names, icons, descriptions, and subscriber counts.
Searching returns communities that contain the search text in their name.

### Community Ownership Error Handling

If a user attempts to perform an owner-only action on a community they do not own, the action is rejected.
If a user attempts to remove another moderator from a community, the action is rejected.
If a user attempts to remove themselves as owner, the action is rejected.
Only the owner can add new moderators to the community.

### Moderator Action Constraints

Moderators can add other moderators to the community.
Moderators cannot remove other moderators from the community.
Moderators cannot remove the owner from the community.
Only the owner can remove moderators from the community.
Moderators have full moderation powers except for owner-related actions.

## Subscription Rules

Users can subscribe to any community on the platform. Users can unsubscribe from any community they are subscribed to. Users can view a list of all communities they are subscribed to. Subscribing to a community is required before a user can create posts in that community. Subscription status determines posting permissions within each community. Users must subscribe to a community before they can participate by creating posts. The subscription relationship is reversible at any time.

### Subscribe to Community

Any user can subscribe to any community on the platform.
When a user subscribes to a community, they become a subscriber of that community.
The subscriber count for the community increases by one when a new subscription is created.
A user can only have one subscription relationship with each community at any time.

### Unsubscribe from Community

Users can unsubscribe from any community they are currently subscribed to.
When a user unsubscribes from a community, their subscriber count for that community decreases by one.
Unsubscribing does not delete the user's previously created posts or comments in that community.
Users may subscribe to a community again after unsubscribing.

### Subscription List Viewing

Users can view a list of all communities they are subscribed to.
The list displays each subscribed community's name and icon.
Guest users cannot view their subscription list as they cannot be subscribers.

### Required Subscription for Posting

Users must be subscribed to a community before they can create posts in that community.
If a user is not subscribed to a community, the system rejects their attempt to create a post in that community.
After unsubscribing from a community, users can no longer create new posts in that community until they resubscribe.

### Community Access Control

Subscription status determines what actions a user can perform within a community.
Subscribed users can create posts in the community.
Subscribed users can view the community's feed and browse its posts.
Unsubscribed users can view the community's public posts but cannot create new content.

### Subscription Status Management

Users can change their subscription status at any time without restriction.
Subscription status is immediately updated when a user subscribes or unsubscribes.
A user cannot have multiple subscription statuses for the same community simultaneously.
The subscription relationship persists until the user explicitly unsubscribes.

### Subscription Relationship

Each subscription relationship links a user to a community.
The subscription includes the date when the user subscribed.
A user can be subscribed to multiple communities simultaneously.
A user can be unsubscribed from all communities while still maintaining an active account.

## Post Rules

Users can create a post in any community they are subscribed to. Every post must have a title, which is a required field. A post must be one of three types: text post with text content, link post with a URL, or image post with an uploaded image. Users can edit their own posts after creation. Users can delete their own posts. When viewing a single post, users see the title, full content, author, community, vote score, comment count, and posting time. Text posts show the first 200 characters in list views. Image posts display thumbnails in list views. Link posts show the domain name of the URL in list views.

### Post Creation Subscription Requirement

A user can create a post only in a community where they have an active subscription. Users who are not subscribed to a community cannot create posts in that community. This restriction applies to all users, including new accounts and returning users.

### Post Title Requirement

Every post must have a title, which is a required field. A post cannot be created without providing a title. If the title is missing when creating a post, the request is rejected.

### Post Type Classification

Posts must be classified into one of three types: text post, link post, or image post. A post cannot exist without a type classification. Each type has specific content requirements as defined in the following sections.

### Text Post Content

Text posts must include text content in addition to the title. The text content can be of any length. When viewing text posts in a list view, the first 200 characters of the content are displayed. Users can view the full text content when viewing the post individually.

### Link Post URL

Link posts must include a valid URL. The URL represents the external link the user is sharing. When viewing link posts in a list view, only the domain name of the URL (such as youtube.com) is displayed. Users can view the full URL when viewing the post individually.

### Image Post Upload

Image posts must include an uploaded image file. The image serves as the primary content of the post. When viewing image posts in a list view, a thumbnail of the image is displayed. Users can view the full image when viewing the post individually.

### Own Post Editing Rights

Users can edit their own posts after creation. Only the user who created the post has the right to edit it. Other users, including community moderators, cannot edit a user's post. Moderators can only delete posts, not edit them.

### Own Post Deletion Rights

Users can delete their own posts after creation. When a user deletes their post, the post is removed from all views. Users cannot delete posts created by other users. Moderators can delete any post in their community, including posts created by other users.

### Post Full Content Viewing

When viewing a single post individually, users see the complete content regardless of post type. This includes the full title, full text content (for text posts), full URL (for link posts), and full image (for image posts). Users also see the author, community, vote score, comment count, and posting time.

### Post List Display Format

When viewing posts in any feed list, each post shows: title, author username, community name, vote score, comment count, and time since posted. Additionally, each post type shows specific preview content: text posts show the first 200 characters of content, image posts show a thumbnail, and link posts show the domain name. Full content is only visible when viewing the post individually.

## Comment Rules

Users can write a comment on any post. Users can reply to any comment with unlimited nesting depth. Users can edit their own comments after creation. Users can delete their own comments. Each comment displays the author, content, vote score, posting time, and nested replies. Replies can have their own replies with no depth limit, creating a threaded discussion structure. Comments exist independently and can be viewed as part of any post's discussion thread.

### Comment Creation

the system shall allow authenticated members to create a comment on any post.

When a member submits comment content, the system shall associate the comment with the member who authored it.

Where the post exists, the system shall display the comment as part of the post's discussion thread.

When the post does not exist, the system shall reject the comment creation request.

Where the member does not have access to view the post, the system shall reject the comment creation request.

When a guest member attempts to create a comment, the system shall reject the request and require authentication.

the system shall display the comment to members who have access to view the post.

### Reply to Comment

When a member creates a reply to a comment, the system shall associate the reply with the parent comment.

the system shall allow replies to any comment regardless of its position in the thread hierarchy.

When the parent comment does not exist, the system shall reject the reply creation request.

Where the member does not have access to view the parent comment, the system shall reject the reply creation request.

the system shall maintain the parent-child relationship between comments and replies.

the system shall display replies within the context of their parent comment.

### Unlimited Reply Depth

the system shall support unlimited nesting depth for comment replies.

Where a member creates a reply to a reply, the system shall allow additional levels of nesting.

the system shall maintain the complete hierarchy of parent and child comments regardless of depth.

When a member views a comment thread, the system shall show all nested levels without depth restriction.

deleting a parent comment shall not automatically delete child replies.

### Own Comment Editing

Where the member is the author of a comment, the system shall allow the member to edit the comment content.

When an authenticated member edits their own comment, the system shall update the comment content.

Where the member is not the author of the comment, the system shall reject the edit request.

When the requested comment does not exist, the system shall reject the edit request.

the system shall display the updated content after editing is complete.

### Own Comment Deletion

Where the member is the author of a comment, the system shall allow the member to delete the comment.

When a member deletes their comment, the system shall remove the comment from all discussion threads.

Where the member is not the author of the comment, the system shall reject the deletion request.

When the requested comment does not exist, the system shall reject the deletion request.

the system shall remove all content associated with the deleted comment.

### Comment Thread Structure

the system shall organize comments in a threaded structure where each comment belongs to a parent.

When a comment is created at the root level, the system shall associate it directly with the post.

Where a comment is a reply, the system shall record the parent comment reference.

the system shall maintain the parent-child hierarchy across all comment levels.

the system shall display comments in a threaded format showing the discussion flow.

the system shall preserve the chronological order of comments within the thread.

### Comment Author Display

When displaying a comment, the system shall show the author's username.

the system shall display the author's identity in the comment metadata.

the system shall NOT display the author's karma score as part of the comment.

guest members shall see the author's username on all comments.

member members shall see the author's username on all comments.

### Comment Content Viewing

When displaying a comment, the system shall show the full content text.

the system shall display complete comment content in the comment thread.

When a comment is deleted, the system shall NOT display the comment content.

all members with access to view the post shall be able to read the comment content.

the system shall preserve the chronological order of comments within the thread.

## Vote Rules

Users can upvote a post, which adds 1 to its score. Users can downvote a post, which subtracts 1 from its score. Each user can only vote once per post at any given time. Users can change their vote from upvote to downvote or vice versa. Users can remove their vote entirely from a post. Vote score equals the total upvotes minus total downvotes. The same voting rules apply to comments as to posts. When someone upvotes or downvotes a post or comment, the author's karma changes accordingly by plus or minus 1. When a user removes their vote, the karma adjusts accordingly.

### Post Upvote

A logged-in user may upvote a post they view. When a post is upvoted, the post's score increases by one. If the user has not yet voted on the post, the upvote is recorded and added to the score. If the user has already downvoted the post, the downvote is replaced with an upvote, and the score increases by two (removing the downvote and adding the upvote). If the user has already upvoted the post, the upvote is rejected as a duplicate action. When a post is upvoted, the author's karma score increases by one.

### Post Downvote

A logged-in user may downvote a post they view. When a post is downvoted, the post's score decreases by one. If the user has not yet voted on the post, the downvote is recorded and subtracted from the score. If the user has already upvoted the post, the upvote is replaced with a downvote, and the score decreases by two (removing the upvote and adding the downvote). If the user has already downvoted the post, the downvote is rejected as a duplicate action. When a post is downvoted, the author's karma score decreases by one.

### Single Vote Per User Per Post

Each user may cast only one vote on any given post at any time. A user cannot upvote and downvote the same post simultaneously. If a user attempts to vote on a post they have already voted on, the system must first process the vote change or removal before accepting the new vote. This rule applies equally to posts and comments throughout the platform.

### Change Vote From Up to Down

A user who has upvoted a post may change their vote to downvote that same post. When this action occurs, the downvote replaces the upvote. The post's score decreases by two (removing the upvote of plus one and adding the downvote of minus one). The author's karma score decreases by two. A user may similarly change a downvote to an upvote, which increases the post's score by two and the author's karma by two.

### Remove Vote Action

A user who has voted on a post may remove their vote entirely. When a vote is removed, the post's score is adjusted by removing the effect of that vote. If the user had upvoted, the score decreases by one. If the user had downvoted, the score increases by one. The vote record is deleted and no longer counts toward the post's score or the author's karma.

### Vote Score Calculation

The score of a post equals the total number of upvotes minus the total number of downvotes. Each user's vote counts as exactly one: upvotes contribute plus one, downvotes contribute minus one. The score may be positive, zero, or negative. The score is recalculated dynamically each time it is displayed based on current votes. The score does not depend on the age of the post or the time when votes were cast; it only reflects the current net vote count.

### Comment Upvote and Downvote

The same voting rules that apply to posts also apply to comments. A logged-in user may upvote a comment, increasing the comment's score by one. A user may downvote a comment, decreasing the comment's score by one. Each user may cast only one vote per comment. Users may change their vote from upvote to downvote or vice versa. Users may remove their vote entirely. When a comment is voted on, the author's karma adjusts accordingly by plus one for an upvote or minus one for a downvote. The comment score equals total upvotes minus total downvotes.

### Karma Adjustment on Vote

Every user has a single karma score displayed on their profile. When a user's post receives an upvote, their karma score increases by one. When a user's post receives a downvote, their karma score decreases by one. The same applies to comments: when a user's comment is upvoted, their karma increases by one; when downvoted, their karma decreases by one. Karma adjustments occur immediately when the vote is recorded. Karma may become negative if a user receives more downvotes than upvotes. The karma score is the sum of all net votes received across all of the user's posts and comments.

### Vote Removal Karma Adjustment

When a user removes their vote from another user's post or comment, the karma adjustment is reversed. If the removed vote was an upvote, the author's karma decreases by one. If the removed vote was a downvote, the author's karma increases by one. The karma adjustment reflects the removal of the vote's effect, returning the author's karma to what it was before the vote was cast. This ensures karma accurately represents the current state of all votes on the user's content.

### Guest Voting Restriction

Guests (logged-out users) may view posts, comments, vote scores, and karma scores, but may not cast votes. Voting actions require a logged-in member account. Attempting to vote without being logged in results in the action being rejected with a message to log in before voting.

## Report Rules

Users can report any post or comment on the platform. When reporting, users must provide a reason as text. Moderators can view all reports for their community. Each report shows the reported content, who reported it, and the reason provided. Moderators can approve a report, which deletes the reported content. Moderators can dismiss a report, which keeps the content and removes it from the report list. Dismissed reports are removed from the report list entirely. Reports allow the community to self-moderate content quality and appropriateness.

### Report Post Action

Any member can report a post that violates community standards.

When reporting a post, the member must provide a reason as text explaining why the post should be reviewed.

The report is submitted to the moderators of the community where the post was published.

Guests cannot report posts; only logged-in members have this capability.

### Report Comment Action

Any member can report a comment that violates community standards.

When reporting a comment, the member must provide a reason as text explaining why the comment should be reviewed.

The report is submitted to the moderators of the community where the comment's parent post was published.

Guests cannot report comments; only logged-in members have this capability.

### Report Reason Text Required

Every report must include a reason text provided by the reporting member.

The reason field is required and cannot be empty when submitting a report.

The reason should describe the specific violation or concern about the content.

If a report is submitted without a reason text, the submission is rejected.

Moderators review the reason text as part of their evaluation of whether to approve or dismiss the report.

### Moderator Report Viewing

Moderators can view all reports for posts and comments in their community.

Each moderator sees the complete list of reports affecting content in their community.

Reports are organized by the reported content and the date the report was submitted.

The owner of a community can view reports for their community, in addition to any moderator privileges they have.

Only moderators of the relevant community can access reports for that community; other users cannot see reports.

### Report Content Display

When viewing a report, moderators see the full content of the reported post or comment.

For posts, moderators see the title and all content (text, link URL, or image).

For comments, moderators see the full comment text and the post it belongs to.

The original author's username is displayed for the reported content.

The timestamp of when the content was created is shown alongside the report.

### Reporter Identity Display

When viewing a report, moderators see the username of the member who submitted the report.

The reporter's identity is displayed so moderators can understand who raised the concern.

The date and time when the report was submitted is shown alongside the reporter's username.

The reporter's identity is not shown to the user whose content was reported.

Reports from the same reporter about the same piece of content are grouped together.

### Approve Report Delete Content

When a moderator approves a report, the reported content is deleted.

For a post report, approving the report deletes the entire post and all its replies.

For a comment report, approving the report deletes the reported comment.

Once content is deleted, it is no longer visible to any users on the platform.

The deletion is permanent; deleted content cannot be restored after report approval.

The user who created the deleted content is notified that their content was removed for violating community standards.

### Dismiss Report Keep Content

When a moderator dismisses a report, the reported content remains on the platform.

Dismissing indicates the moderator has reviewed the report and determined no action is needed.

The content continues to be visible and accessible to all users who can view it.

The dismissed report is removed from the active report queue.

The original author's content is not affected by a dismissed report.

### Dismissed Report Removal

Dismissed reports are removed from the report list that moderators view.

The report no longer appears in the active reports for the community.

Dismissing a report closes it; it cannot be reopened or reviewed again.

The removal of dismissed reports keeps the report queue focused on pending items.

The content of a dismissed report is no longer accessible through the moderation interface.

Dismissed reports may be retained for historical record-keeping purposes but are not displayed to moderators.

## Ban Rules

Moderators can ban users from their community. Moderators can unban previously banned users. Moderators can view the list of banned users in their community. Banned users cannot create posts or comments in that community. Banned users can still view content in that community. Banning prevents participation but allows reading in the specific community. Ban status is per community, not platform-wide.

### Moderator Ban Action

A moderator can ban a user from their community. The ban takes effect immediately upon the moderator's action. The ban requires a reason text that describes why the user is being banned.

### Moderator Unban Action

A moderator can unban a previously banned user from their community. The unban action restores the user's ability to create posts and comments in that community.

### View Banned Users List

Moderators can view a list of all users who are banned from their community. The list includes each banned user's username and ban reason.

### Banned User Posting Restriction

A user who is banned from a community cannot create posts in that community. The system rejects any attempt by a banned user to create a post in the banned community.

### Banned User Commenting Restriction

A user who is banned from a community cannot create comments in that community. The system rejects any attempt by a banned user to write a comment on posts in the banned community.

### Banned User Viewing Allowance

A banned user can still view content in the community they are banned from. They can browse posts, view posts, read comments, and access community information. Banning prevents participation but allows reading.

### Community-Specific Ban Status

A ban applies only to the specific community where it was issued. A user banned from one community can still create posts and comments in other communities they are subscribed to. Ban status is not platform-wide.

## ModeratorRole Rules

The community creator is the owner with the highest authority. The owner can add moderators to their community. The owner can remove moderators from their community. Moderators can add other moderators to the community. Moderators cannot remove the owner under any circumstances. Moderators cannot remove each other; only the owner can remove moderators. This creates a hierarchy where the owner has ultimate control. Moderator actions include deleting posts, deleting comments, banning and unbanning users, and viewing reports.

### Owner Authority

The user who creates a community is designated as the owner and holds the highest authority within that community.
The owner has exclusive powers that moderators do not possess.
Only the owner can remove moderators from the community.
Other users cannot remove the owner from their role.
The owner's authority is permanent unless the owner voluntarily transfers ownership.

### Adding Moderators

The owner can add any user as a moderator of their community.
Moderators can also add other users as moderators to assist with community management.
When a user is added as a moderator, they immediately gain moderator privileges for that community.
The list of all moderators for a community is visible to all members.
A user can hold moderator roles in multiple different communities simultaneously.

### Removing Moderators

Only the owner can remove moderators from the community.
Moderators cannot remove other moderators under any circumstances.
When the owner removes a moderator, that user immediately loses all moderator privileges.
The owner can remove any number of moderators at their discretion.
Removed moderators cannot reapply for moderator status without the owner's approval.

### Moderator Restrictions

Moderators cannot remove the owner from their role under any circumstances.
Moderators cannot remove each other from moderator status.
These restrictions ensure the owner maintains ultimate control over the community.
If a moderator attempts these restricted actions, the request is rejected.
The only way to remove an owner or another moderator is for the owner to perform the action.

### Delete Post Action

Moderators can delete any post within their community, including posts by other users.
When a moderator deletes a post, the post is removed from all views of the community.
The deleted post is permanently removed and cannot be restored.
Post authors are not notified when their posts are deleted by moderators.
Deleting a post does not affect the poster's karma score or account status.

### Delete Comment Action

Moderators can delete any comment within their community, including comments on posts in their community.
When a moderator deletes a comment, the comment is removed from all views.
The deleted comment is permanently removed and cannot be restored.
Comment authors are not notified when their comments are deleted by moderators.
Deleting a comment does not affect the commenter's karma score.

### Ban and Unban Actions

Moderators can ban users from their community for violating community rules.
When a user is banned, they cannot create posts or comments in that community.
Banned users can still view content in the community but cannot participate.
Moderators can unban previously banned users to restore their participation rights.
A user banned from a community cannot be unbanned by other moderators; only the moderator who banned them or the owner can unban.

### View Reports

Moderators can view all reports submitted for their community.
Each report displays: the reported content (post or comment), who reported it, and the reason text provided.
Moderators can approve a report, which deletes the reported content.
Moderators can dismiss a report, which keeps the content and removes it from the report list.
Dismissed reports are no longer visible in the report list.

### Report Approval and Dismissal

When a moderator approves a report, the reported content is automatically deleted.
After approval, the report is marked as resolved and removed from the active report list.
When a moderator dismisses a report, the reported content remains unchanged.
Dismissed reports are immediately removed from the report list and cannot be restored.
Multiple moderators can review the same report; only one approval action is needed to delete the content.

### Banned Users List

Moderators can view a complete list of all users currently banned from the community.
The list shows: banned user username, ban reason, and ban expiration date if applicable.
Banned users appear in this list until they are unbanned or the ban expires.
Users cannot view the list of banned users from other communities.
Moderators can search or filter the banned users list by username or ban status.

### Owner Transfers

The owner can transfer ownership of the community to another moderator.
When ownership is transferred, the previous owner becomes a regular moderator.
The new owner immediately gains all owner privileges and authority.
Ownership transfer requires the current owner's explicit action.
A community can only have one owner at any time.

## Karma Rules

Every user has a single karma score, which is one number. When someone upvotes your post or comment, your karma increases by 1. When someone downvotes your post or comment, your karma decreases by 1. When someone removes their vote, your karma adjusts accordingly to reflect the removal. Karma can be negative if a user receives more downvotes than upvotes. Karma is calculated as a running total across all user activity. Users earn karma through community engagement and contributions.

### Karma Score Overview

Every user has a single karma score, which is one number representing their overall reputation on the platform.

The karma score is calculated as a running total from all user activity across the platform.

Users can have a negative karma score if they receive more downvotes than upvotes on their posts and comments.

The karma score is updated in real-time as votes are cast, changed, or removed on the user's content.

### Karma Changes from Votes

When someone upvotes a user's post or comment, the user's karma increases by 1.

When someone downvotes a user's post or comment, the user's karma decreases by 1.

When a user removes their vote on someone's post or comment, the karma adjusts accordingly to reflect the removal of that vote.

Users earn karma through community engagement and contributions on posts and comments they have created.

Karma changes only occur when the user's own content receives votes.

### Karma Score Display

A user's karma score is visible on their profile page.

Users can view their own karma score.

Users can view other users' karma scores by viewing their profiles.

The karma score is displayed prominently on the user profile along with their display name, bio, and avatar.

The karma score updates immediately when visible after any vote is cast, changed, or removed.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Post Filtering Rules

Users can filter posts by time range when using Top sorting: today, this week, this month, this year, or all time.

Users cannot filter posts by author, community, or content type in the general feed search.

Users can filter comments by sorting method: best, new, or controversial.

Comment filtering by time range is not supported.

### Post Sorting Rules

Hot sort displays posts by recency combined with vote score, so recent posts with many upvotes appear first.

New sort displays posts by creation time, with the most recently created posts appearing first.

Top sort displays posts by vote score, highest score first. When Top is selected, users can choose a time range filter.

Controversial sort displays posts with many total votes but a score close to zero, appearing first.

The same sorting options apply to posts in Home Feed, Popular Feed, and Community Feed.

The same sorting options apply to comments within a single post view.

### Comment Sorting Rules

Best sort displays comments by vote score, with highest vote score appearing first.

New sort displays comments by creation time, with the most recently created comments appearing first.

Controversial sort displays comments with many total votes but a score close to zero, appearing first.

### Pagination Rules

All post feeds are paginated: Home Feed, Popular Feed, and Community Feed.

All comment lists are paginated when viewing comments on a post.

Users can load more content by scrolling or requesting the next page.

Pagination does not apply to individual post or comment detail views.

### Feed Visibility Rules

Home Feed is only available to logged-in members.

Guests cannot access the Home Feed.

Popular Feed is available to all users, including logged-out guests.

Community Feed is available to all users, including logged-out guests.

Posts from banned communities are excluded from all feeds for banned users.

### Post List Display Rules

Each post in a feed list displays: title, author username, community name, vote score, comment count, and time since posted.

For text posts, the first 200 characters of content are displayed in the list.

For image posts, a thumbnail of the image is displayed in the list.

For link posts, the domain name of the URL is displayed (e.g., youtube.com).

Guests see the same post list display as members, except in Home Feed which they cannot access.

### Sorting and Filtering Error Conditions

If a user requests a sorting option that does not exist, the system defaults to the default sort (Hot for posts, Best for comments).

If a user requests a time range filter that is invalid, the system ignores the filter and uses all time.

If sorting is requested but no posts or comments exist, an empty list is returned.

### Vote Score Display Rules

Vote score on posts equals total upvotes minus total downvotes.

Vote score on comments equals total upvotes minus total downvotes.

Vote score can be negative.

Vote score is displayed as a whole number, not as a count of upvotes and downvotes separately.

### Time Display Rules

Time since posted is displayed relative to the current user's timezone.

Time is shown in human-readable format (e.g., 3 hours ago, 2 days ago, 1 week ago).

Absolute timestamps are not displayed in list views.

### Comment Hierarchy Display Rules

Replies to comments are nested hierarchically in the display.

There is no limit to the depth of comment replies.

Nested replies are indented to show the relationship between parent and child comments.

### Controversial Sort Calculation Rules

A post or comment is considered controversial if it has many total votes but the score is close to zero.

The threshold for what constitutes "close to zero" is determined by the system based on overall voting patterns.

Controversial sorting requires at least a minimum number of total votes to be included in results.

### Feed Content Aggregation Rules

Home Feed aggregates posts only from communities the logged-in user is subscribed to.

Popular Feed aggregates posts from all communities across the platform.

Community Feed aggregates posts from exactly one specific community.

Posts are excluded from feeds if the author has been banned from that community.

### Subscription Status Display Rules

When viewing a community in a list of communities, the subscriber count is displayed.

The subscriber count reflects the total number of users currently subscribed to that community.

The subscriber count is updated in real time as users subscribe or unsubscribe.

### List Browsing Error Conditions

If the requested feed contains no posts, an empty list is displayed.

If sorting or filtering parameters are invalid, the system applies default values without erroring.

If a user accesses a feed while logged out, only feeds available to guests are returned.

If all communities a user is subscribed to have no posts, the Home Feed returns an empty list.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Authentication and Access Errors

When a user attempts to log in with an email address that has not been registered in the system, the login request is rejected with an authentication failure message.

If a user submits an incorrect password for their email address, the login request is rejected and the system displays a generic authentication failure message without revealing whether the email exists.

When a user attempts to sign up with a username that is already in use, the registration request is rejected and the user is notified that the username is unavailable.

If a user attempts to sign up with an email address that is already registered, the registration request is rejected with a message indicating the email is already in use.

When an unauthenticated user (guest) attempts to view the home feed, the request is rejected and the user is prompted to log in.

### Account Management Errors

When a user attempts to edit another user's profile, the request is rejected as users can only edit their own profiles.

If a user attempts to delete another user's account, the request is rejected as account deletion is restricted to the account owner.

When a user changes their password with the current password being incorrect, the password change request is rejected.

When a user deletes their account, all posts and comments written by that user are simultaneously deleted and cannot be recovered.

If a user's profile is being viewed and no avatar image has been uploaded, the profile displays a default avatar image.

When a user's profile is being viewed and no display name has been set, the profile displays the username.

### Community Management Errors

When a user attempts to create a community with a name that is already in use, the community creation request is rejected and the user is notified to choose a different name.

If a user attempts to subscribe to a community they are already subscribed to, the subscription request is rejected and the system does not create a duplicate subscription.

If a user attempts to unsubscribe from a community they are not subscribed to, the unsubscription request is rejected with a message indicating they are not a subscriber.

When a user attempts to create a post in a community they have not subscribed to, the post creation request is rejected and the user is informed that subscription is required.

If a community has been deleted, any attempt to access its posts, comments, or perform any community action is rejected with a community not found message.

When a user who is banned from a community attempts to create a post or comment, the request is rejected with a ban violation message.

### Post Operation Errors

When a user attempts to create a post without providing a title, the post creation request is rejected as title is required.

If a user attempts to create a text post without providing text content, the post creation request is rejected.

When a user attempts to create a link post without providing a URL, the post creation request is rejected.

If a user attempts to create an image post without uploading an image file, the post creation request is rejected.

When a user attempts to edit another user's post, the edit request is rejected as users can only edit their own posts.

If a user attempts to delete another user's post, the deletion request is rejected.

When a user attempts to delete a post that has already been deleted, the deletion request is rejected with a content not found message.

### Comment Operation Errors

When a user attempts to reply to a post that has been deleted, the comment request is rejected with a post not found message.

If a user attempts to reply to a comment that has been deleted, the reply request is rejected.

When a user attempts to edit another user's comment, the edit request is rejected as users can only edit their own comments.

If a user attempts to delete another user's comment, the deletion request is rejected.

When a user who is banned from a community attempts to write a comment or reply, the request is rejected with a ban violation message.

### Vote Operation Errors

When a user attempts to vote on a post or comment they have already voted on with the same vote direction, the vote request is rejected as only one vote per user per item is allowed.

If a user attempts to vote on their own post or comment, the vote request is rejected as users cannot vote on their own content.

When a user attempts to vote on content that has been deleted, the vote request is rejected with a content not found message.

If a user attempts to vote on a post or comment that is not accessible, the vote request is rejected.

### Moderation Action Errors

When a moderator attempts to ban a user without providing a ban reason, the ban request is rejected as reason is required.

If a moderator attempts to ban a user who is already banned from the community, the ban request is rejected with a user already banned message.

When a moderator attempts to remove the community owner from being a moderator, the request is rejected as moderators cannot remove the owner.

If a moderator attempts to remove another moderator from the community, the removal request is rejected as only the owner can remove moderators.

When an owner attempts to remove another owner from a different community, the request is rejected as owners are independent per community.

If a moderator attempts to delete a post or comment that has already been deleted, the deletion request is rejected with a content not found message.

When a non-moderator attempts to view the list of banned users, the request is rejected.

### Report Operation Errors

When a user attempts to report a post or comment without providing a reason text, the report submission request is rejected as reason is required.

If a user attempts to report content that does not exist, the report request is rejected with a content not found message.

When a user attempts to report their own post or comment, the report request is rejected as users cannot report their own content.

If a user who is banned from a community attempts to submit a report, the report request is rejected.

When a moderator attempts to approve a report that has already been processed, the action request is rejected.

If a moderator attempts to dismiss a report that has already been dismissed, the dismissal request is rejected.

When a report is approved by a moderator, the reported content is deleted and the report status is updated to approved.

If a moderator dismisses a report, the content remains unchanged and the report status is updated to dismissed.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### Image Content Type Validation

Avatar images, community icons, and image posts must be valid image files. When users upload an avatar, community icon, or image post, the system validates that the uploaded file is a properly formatted image. Files that are not valid image files are rejected, and the user is informed that the upload failed.

If an uploaded file does not meet the image format requirements, the system rejects the file and prompts the user to select a different file.

### File Size Limits for Images

Avatar images, community icons, and image posts must not exceed the maximum allowed file size. When the file size exceeds the limit, the upload is rejected.

Users attempting to upload files larger than the allowed maximum are informed that the file is too large and must choose a smaller file.

### Account Deletion and Image Retention

When a user deletes their account, all content associated with that user is also deleted. This includes the user's avatar image, all posts created by the user (including image posts), and all comments written by the user.

When a community is deleted, the community icon associated with that community is also removed from the platform. Image posts in deleted communities are also deleted along with the community.

### Image Display and Thumbnail Generation

Image posts are displayed in post lists with a thumbnail preview showing a smaller version of the image. When users view an image post in full, the complete image is displayed.

The system generates thumbnails for image posts to display in feed views and post lists. Users can view the full-size image when accessing the individual post page.