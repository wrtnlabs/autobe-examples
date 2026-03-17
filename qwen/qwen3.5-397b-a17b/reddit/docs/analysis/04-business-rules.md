**redditClone — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must sign up with an email address and password, and choose a unique username that no other user has. The email address must be unique across all user accounts in the system. Users log in using their email and password credentials. Users can change their password at any time after account creation. When a user deletes their account, all posts and comments they created are also deleted automatically. The username chosen during signup cannot be changed later. Each user account is tied to exactly one email address. Password changes require the user to be authenticated. Account deletion is permanent and cannot be undone. The system enforces username uniqueness at the time of account creation.

### Account Creation Validation

Users must provide a valid email address when signing up. The email address must be unique across all user accounts in the system. If the email address is already registered, the signup request is rejected.

Users must choose a username during signup. The username must be unique and cannot match any existing username in the system. If the username is already taken, the signup request is rejected. The system checks username availability at the time of account creation.

Users must provide a password when signing up. Both email and password are required fields. If either is missing, the signup request is rejected.

### Authentication Constraints

Users log in using their email address and password. Both credentials must match an existing user account. If the email address does not exist in the system, the login request is rejected. If the password does not match the stored credentials for that email, the login request is rejected.

Each user account is tied to exactly one email address. An email address cannot be associated with multiple user accounts. If a user attempts to create a new account with an email that is already registered, the request is rejected.

Users must be authenticated to access member-only features. Guest users (not logged in) have limited access to the platform. Authentication is required for actions such as creating posts, commenting, voting, and subscribing to communities.

### Password Change Rules

Users can change their password at any time after account creation. The user must be authenticated (logged in) to change their password. If the user is not authenticated, the password change request is rejected.

When changing a password, the new password must meet the system's password requirements. If the new password does not meet the requirements, the request is rejected. The password change is applied immediately upon successful validation.

### Account Deletion Constraints

Users can delete their account at any time.

When a user deletes their account, all posts and comments they created are automatically deleted. This deletion cascade applies to all content authored by the user across all communities. The content is removed from the platform entirely.

The deletion process removes the account from the system. Users should backup any content they wish to keep before deleting their account.

## Karma Rules

Every user has a single karma score represented as one number. When someone upvotes a user's post or comment, that user's karma increases by exactly 1. When someone downvotes a user's post or comment, that user's karma decreases by exactly 1. When a user removes their vote from a post or comment, the karma adjusts accordingly by reversing the previous vote's effect. Karma scores can be negative with no lower limit. The karma score reflects the net result of all upvotes and downvotes received. Each vote change triggers an immediate karma recalculation. The system tracks vote changes to ensure accurate karma adjustments. Karma is tied to the user who created the content, not the voter. Vote removals must correctly identify the previous vote type to adjust karma properly.

### Karma Score Structure

THE system SHALL maintain a single karma score for each user.
THE system SHALL allow karma scores to be negative with no lower limit.
THE system SHALL ensure karma score integrity by preventing unauthorized modifications.
Each user has exactly one karma score that aggregates all vote impacts from their posts and comments.

### Vote Impact on Karma

WHEN a user upvotes a post or comment, THE system SHALL increase the content creator's karma by exactly 1.
WHEN a user downvotes a post or comment, THE system SHALL decrease the content creator's karma by exactly 1.
THE system SHALL attribute karma changes to the content creator, not the voter.
Each vote impacts only the karma of the user who created the voted content.

### Vote Change and Removal

WHEN a user removes their vote from a post or comment, THE system SHALL adjust the content creator's karma by reversing the previous vote's effect.
WHEN a user changes their vote from upvote to downvote, THE system SHALL decrease the content creator's karma by 2.
WHEN a user changes their vote from downvote to upvote, THE system SHALL increase the content creator's karma by 2.
THE system SHALL track vote changes to ensure accurate vote reversal.
IF a vote removal occurs, THEN THE system SHALL correctly identify the previous vote type to adjust karma properly.

### Karma Calculation and Updates

THE system SHALL calculate karma as the net result of all upvotes minus all downvotes received.
WHEN any vote is cast, changed, or removed, THE system SHALL immediately recalculate the affected user's karma.
THE system SHALL maintain vote impact on karma accuracy across all vote operations.
Karma recalculation occurs synchronously with each vote action to ensure score consistency.

## Community Rules

Any user can create a community on the platform. Each community must have a unique name that no other community uses. Communities include a description text that provides information about the community. Communities have an icon image that visually represents them. The user who creates a community automatically becomes its owner with highest authority. Each community displays its subscriber count to viewers. Community names must be unique across the entire platform. The owner role cannot be transferred to another user. Community description text can be any length. The icon image is optional but recommended for community identification.

### Community Creation and Ownership

Any user can create a community on the platform. The user who creates a community automatically becomes its owner with the highest authority over that community. The owner role is permanent and cannot be transferred to another user. The owner retains their role even if they add other moderators to the community. Only the owner can remove moderators from the community. If a user attempts to transfer ownership to another user, the request is rejected. If a user attempts to remove the owner from the moderator list, the request is rejected.

### Community Name Uniqueness

Each community must have a unique name that no other community on the platform uses. Community names are checked for uniqueness across the entire platform at the time of creation. If a user attempts to create a community with a name that already exists, the request is rejected. Community names serve as the primary identifier for communities throughout the platform. The uniqueness constraint applies platform-wide, not just within a subset of communities. If a user attempts to search for a community using a name that does not exist, no results are returned.

### Community Profile Content

Every community includes a description text that provides information about the community's purpose and rules. The description text can be any length and is displayed on the community page. Each community has an icon image that visually represents the community. The icon image is optional but recommended for community identification. Communities display their subscriber count to all viewers. The subscriber count updates in real-time as users subscribe or unsubscribe. If a community has no description, the description area displays as empty. If a community has no icon, a default placeholder image is shown.

## Subscription Rules

Users can subscribe to any community on the platform. Users can unsubscribe from any community they are currently subscribed to. Users can view a list of all communities they are subscribed to. Subscribing to a community is required before a user can create posts in that community. A user can be subscribed to multiple communities simultaneously. Users cannot create posts in communities where they are not subscribed. The subscription relationship is binary, either subscribed or not subscribed. Users can subscribe and unsubscribe from the same community multiple times. Subscription status determines post creation eligibility. The system enforces the subscription requirement before allowing post creation.

### Subscription Creation Rules

Users can subscribe to any community on the platform. A user can be subscribed to multiple communities simultaneously with no upper limit. The subscription relationship is binary: a user is either subscribed to a community or not subscribed, with no intermediate states. Users can subscribe and unsubscribe from the same community multiple times. If a user attempts to subscribe to a community they are already subscribed to, the request is rejected. The system validates that the community exists before creating the subscription. If the community does not exist, the request is rejected.

### Subscription Removal Rules

Users can unsubscribe from any community they are currently subscribed to. If a user attempts to unsubscribe from a community they are not subscribed to, the request is rejected. Unsubscribing from a community does not delete the user's existing posts or comments in that community. The user's posts and comments remain visible after unsubscription. Users can resubscribe to a community after unsubscribing.

### Subscription Verification for Posting

Subscribing to a community is required before a user can create posts in that community. The system enforces the subscription requirement before allowing post creation. If a user attempts to create a post in a community where they are not subscribed, the request is rejected. The subscription status is checked at the time of post creation. Users cannot bypass the subscription requirement through any means. Banned users cannot create posts in the community regardless of subscription status.

### Subscribed Communities Browsing

Users can view a list of all communities they are subscribed to. The list displays each community's name, description, and subscriber count. The list supports pagination when the user is subscribed to many communities. If a user has no subscriptions, the list displays an empty state indicating no subscribed communities.

## Post Rules

Users can create a post only in communities they are subscribed to. Every post must have a title, which is required and cannot be empty. A post must be one of three types: text post with text content, link post with a URL, or image post with an uploaded image. Users can edit their own posts after creation. Users can delete their own posts at any time. When viewing a single post, users see the title, full content, author, community, vote score, comment count, and when it was posted. Post type determines what additional content is required. Text posts require text content, link posts require a URL, and image posts require an uploaded image. Only the post author can edit or delete the post. Posts belong to exactly one community.

### Post Creation Validation

Users can create a post only in communities they are subscribed to. If the user is not subscribed to the community, the post creation is rejected. Every post must have a title, which is required and cannot be empty. If the title is missing or empty, the post creation is rejected. A post must be one of three types: text post, link post, or image post. If the post type is not specified or is invalid, the post creation is rejected. Posts belong to exactly one community and cannot be moved between communities after creation.

### Post Type Content Requirements

Text posts require text content to be provided. If a text post does not include text content, the request is rejected. Link posts require a URL to be provided. If a link post does not include a URL, the request is rejected. Image posts require an uploaded image to be provided. If an image post does not include an uploaded image, the request is rejected. Each post type has specific content requirements based on its type, and the content must match the declared post type.

### Post Modification Rights

Users can edit their own posts after creation. Only the post author can edit the post. If a user attempts to edit a post they did not create, the request is rejected. Users can delete their own posts at any time. Only the post author can delete the post. If a user attempts to delete a post they did not create, the request is rejected. Post editing and deletion rights are exclusive to the author and cannot be transferred.

### Post Display Information

When viewing a single post, users see the title. When viewing a single post, users see the full content appropriate to the post type. When viewing a single post, users see the author username. When viewing a single post, users see the community name. When viewing a single post, users see the vote score. When viewing a single post, users see the comment count. When viewing a single post, users see when it was posted. All post display information is visible to all users regardless of subscription status.

## Vote Rules

Users can upvote a post or comment, which adds 1 to the vote score. Users can downvote a post or comment, which subtracts 1 from the vote score. Each user can only vote once per post or comment. Users can change their vote from upvote to downvote or vice versa. Users can remove their vote entirely from a post or comment. Vote score equals total upvotes minus total downvotes. A user cannot have both an upvote and downvote on the same item. Vote changes must update the vote score correctly. Removing a vote reduces the vote count and adjusts the score. The one vote per user rule applies to both posts and comments equally.

### Vote Score Calculation

The vote score for a post or comment equals the total number of upvotes minus the total number of downvotes. Each upvote contributes plus one to the vote score. Each downvote contributes minus one to the vote score. The vote score can be positive, negative, or zero. The vote score is automatically recalculated whenever a vote is added, changed, or removed.

### Single Vote Constraint

Each user can have only one vote on a given post or comment. A user cannot upvote and downvote the same item simultaneously. If a user attempts to vote on an item where they already have a vote, their existing vote is replaced rather than creating a new vote. The one vote per user rule applies equally to posts and comments. This constraint ensures vote score accuracy and prevents vote manipulation.

### Vote Direction and Changes

Users can change their vote from upvote to downvote or from downvote to upvote on any post or comment. When a user changes their vote direction, the vote score is updated to reflect the change. Changing from upvote to downvote reduces the vote score by two. Changing from downvote to upvote increases the vote score by two. Users retain the ability to modify their vote at any time after initially voting.

### Vote Removal

Users can remove their vote entirely from any post or comment they have previously voted on. When a vote is removed, the vote score is adjusted accordingly. Removing an upvote decreases the vote score by one. Removing a downvote increases the vote score by one. After vote removal, the user has no vote on that item and can vote again if desired.

### Posts and Comments Voting

The same voting rules apply to both posts and comments. Users can upvote or downvote any post. Users can upvote or downvote any comment. Each post and each comment maintains its own independent vote score. The single vote constraint, vote direction changes, and vote removal rules function identically for posts and comments.

## Comment Rules

Users can write a comment on any post. Users can reply to any comment, creating nested comment threads. Replies can have replies with no depth limit, allowing infinite nesting. Users can edit their own comments after posting. Users can delete their own comments at any time. Each comment shows the author, content, vote score, time since posted, and nested replies. Comment content is text-based. Only the comment author can edit or delete their comment. Comments belong to a specific post or are replies to another comment. The nested reply structure allows for complex discussion threads.

### Comment Creation on Posts

Users can write a comment on any post. Each comment must be associated with exactly one post or be a reply to another comment. Comment content must be text-based. A comment cannot be created without content. If the post does not exist, the comment creation is rejected. If the user is banned from the community, the comment creation is rejected. Comments are immediately visible after creation.

### Comment Replies and Nesting

Users can reply to any comment. Replies can have replies, creating nested comment threads. There is no depth limit on reply nesting, allowing infinite reply chains. The nested reply structure forms a comment thread hierarchy. Each reply is associated with its parent comment. If the parent comment does not exist, the reply creation is rejected. If the parent comment is deleted, replies to that comment remain visible. The thread hierarchy is preserved regardless of nesting depth.

### Comment Modification Permissions

Only the comment author can edit their comment. Only the comment author can delete their comment. Users can edit their comments after posting at any time. Users can delete their comments at any time. If a user attempts to edit another user's comment, the request is rejected. If a user attempts to delete another user's comment, the request is rejected. Moderators can delete any comment in their community (defined in Moderator Rules). When a comment is edited, the edit is reflected immediately. When a comment is deleted, the comment content is removed but the comment structure may remain to preserve thread context.

### Comment Display Information

Each comment displays the author username. Each comment displays the content text. Each comment displays the vote score. Each comment displays the time since posted. Each comment displays nested replies. The vote score reflects the sum of upvotes minus downvotes. The time since posted is shown in relative format (e.g., "3 hours ago"). Nested replies are displayed in hierarchical order under their parent comment. If the comment author's account is deleted, the author display shows a deleted user indicator. Comments with deleted content show a content removed indicator.

## Moderator Rules

The community creator is the owner with the highest authority in that community. The owner can add moderators to the community. The owner can remove moderators from the community. Moderators can add other moderators to the community. Moderators cannot remove the owner from their moderator role. Moderators cannot remove each other, only the owner can remove moderators. Moderator roles are specific to each community. The owner role is permanent and cannot be removed. Multiple users can be moderators in a single community. The hierarchy ensures the owner maintains ultimate control over moderation.

### Owner Role and Authority

The user who creates a community becomes its owner. The owner holds the highest authority within that community. The owner role is permanent and cannot be removed or transferred. The owner maintains ultimate control over all moderation decisions and community management. The owner has all moderation capabilities available to moderators, plus the exclusive ability to manage moderator roles.

### Adding Moderators

The owner can add any user as a moderator to their community. Moderators can also add other users as moderators to the community. Multiple users can serve as moderators in a single community. There is no limit to the number of moderators a community can have. When a moderator is added, they gain moderation capabilities for that specific community only.

### Removing Moderators

The owner can remove any moderator from the community. Moderators cannot remove the owner from their role. Moderators cannot remove other moderators. Only the owner has the authority to remove moderators from the community. If a moderator is removed, they lose all moderation capabilities for that community immediately.

### Community-Specific Moderation

Moderator roles are specific to each community. A user can be a moderator in one community but not in another. The moderation hierarchy ensures clear authority levels within each community. Users with moderator roles in a community can perform moderation actions only within that community. The owner of each community maintains the highest level of authority in the moderation hierarchy for that community.

## Ban Rules

Moderators can ban users from their community. Moderators can unban users who were previously banned. Moderators can view the list of banned users for their community. Banned users cannot create posts in that community. Banned users cannot create comments in that community. Banned users can still view content in the community. Bans are specific to each community, not platform-wide. Only moderators have the authority to ban and unban users. The ban prevents content creation but not content consumption. Users can be banned from multiple communities independently.

### Moderator Ban Authority

Only moderators of a community can ban users from that community. Only moderators of a community can unban users from that community. The community owner, who is the user that created the community, has moderator authority and can ban and unban users. Moderators can add other moderators to the community, extending ban authority to those users. Moderators cannot remove the community owner from the moderator role. Moderators cannot remove other moderators from the community; only the owner can remove moderators. A user must be a moderator of a community to ban or unban users in that community. Ban and unban actions are restricted to moderators only; regular community members cannot ban or unban users.

### Ban Enforcement

When a user is banned from a community, that user cannot create posts in that community. When a user is banned from a community, that user cannot create comments in that community. When a user is banned from a community, that user cannot reply to existing comments in that community. A banned user attempting to create a post in the community is rejected. A banned user attempting to create a comment in the community is rejected. Despite posting restrictions, a banned user can still view all content in the community, including posts and comments. A banned user can view the community feed and individual posts. A banned user can read comments and replies within the community. The ban restricts content creation but does not restrict content viewing or consumption.

### Ban Scope

Bans are specific to each individual community and do not apply platform-wide. A user banned from one community can still participate in other communities where they are not banned. A user can be banned from multiple communities independently. Being banned from one community does not affect the user's ability to post or comment in other communities. Each community maintains its own separate list of banned users. A ban issued in one community has no effect on the user's status in any other community. The scope of a ban is limited to the single community where the ban was issued.

### Banned Users List

Moderators of a community can view the list of all users banned from their community. The banned users list shows which users are currently banned from the community. Only moderators of the community can access the banned users list. Regular community members who are not moderators cannot view the banned users list. The list includes all users who have been banned and not yet unbanned. When a moderator unbans a user, that user is removed from the banned users list. Moderators can reference the banned users list to check if a specific user is banned from the community.

## Report Rules

Users can report any post or comment on the platform. When reporting, users must provide a reason as text explaining why they are reporting the content. Moderators can view all reports for their community. Each report shows the reported content, who reported it, and the reason provided. Moderators can approve a report, which deletes the reported content. Moderators can dismiss a report, which keeps the content and removes the report from the list. Dismissed reports are removed from the report list and have no effect on the content. Reports require a text reason to be submitted. Only moderators can take action on reports. Report approval results in content deletion.

### Report Submission

Users can report any post or comment on the platform. When submitting a report, users must provide a reason as text explaining why they are reporting the content. The text reason is mandatory and cannot be empty. A report can be submitted for any post regardless of which community it belongs to. A report can be submitted for any comment regardless of its nesting depth or which community it belongs to.

### Report Visibility

Moderators can view all reports for their community. Each report displays the reported content (the post or comment that was reported). Each report displays who reported it (the reporting user). Each report displays the reason text provided by the reporter. Only moderators of a community can view reports for that community. Reports show the complete content of the reported post or comment.

### Report Resolution

Only moderators can take action on reports. Moderators can approve a report, which results in deletion of the reported content. Moderators can dismiss a report, which keeps the reported content unchanged. When a report is dismissed, the report is removed from the report list. Dismissed reports have no effect on the reported content. Report approval deletes the reported post or comment. Report dismissal closes the report without any action on the content.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Feed Filtering

The Home feed displays posts only from communities the user is subscribed to. The Home feed is available only to logged-in users. The Popular feed displays posts from all communities across the platform. The Popular feed is available to everyone, including logged-out users. The Community feed displays posts from one specific community. The Community feed is available to everyone, including logged-out users. Users can search for communities by name. The search returns communities whose names match the search query. Users can view a list of all communities they are subscribed to. The subscribed communities list shows only communities the user has subscribed to.

### List Sorting Options

All post feeds support four sorting options: Hot, New, Top, and Controversial. Hot sorting displays recent posts with many upvotes first. New sorting displays the most recently created posts first. Top sorting displays posts with the highest vote score first. Top sorting includes a time filter with options: today, this week, this month, this year, and all time. Controversial sorting displays posts with many votes but a score close to zero first. Comments on a post support three sorting options: Best, New, and Controversial. Best sorting displays comments with the highest vote score first. New sorting for comments displays the most recent comments first. Controversial sorting for comments displays comments with many votes but a score close to zero first.

### Pagination Behavior

All post feeds are paginated. Pagination applies to the Home feed, Popular feed, and Community feed. Users navigate through pages of posts rather than viewing all posts at once. Each page displays a subset of posts from the feed. Users can navigate to the next page to view more posts. Users can navigate to the previous page if available. The pagination continues until all posts in the feed have been displayed. Comment lists within a post are not paginated; all comments are displayed according to the selected sorting order.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Account Authentication Errors

If the email address is already registered, the signup request is rejected.
If the username is already taken, the signup request is rejected.
If the email or password is incorrect during login, the login request is rejected.
If the user account does not exist, the login request is rejected.
If the user attempts to change their password without proper authentication, the request is rejected.

### Content Access Errors

If the requested post does not exist, the view request is rejected.
If the requested comment does not exist, the view request is rejected.
If the requested community does not exist, the view request is rejected.
If the requested user profile does not exist, the view request is rejected.
If the user attempts to edit or delete another user's post, the request is rejected.
If the user attempts to edit or delete another user's comment, the request is rejected.

### Post Creation and Modification Errors

If the user is not subscribed to the community, the post creation request is rejected.
If the post title is missing or empty, the post creation request is rejected.
If the post type is not one of text, link, or image, the post creation request is rejected.
If the link post does not contain a valid URL, the post creation request is rejected.
If the image post does not contain a valid image file, the post creation request is rejected.
If the user attempts to edit a post they did not create, the request is rejected.
If the user attempts to delete a post they did not create, the request is rejected.

### Comment Creation and Modification Errors

If the user is banned from the community, the comment creation request is rejected.
If the user is banned from the community, the reply creation request is rejected.
If the post does not exist, the comment creation request is rejected.
If the parent comment does not exist, the reply creation request is rejected.
If the user attempts to edit a comment they did not create, the request is rejected.
If the user attempts to delete a comment they did not create, the request is rejected.

### Vote Operation Errors

If the post does not exist, the vote request is rejected.
If the comment does not exist, the vote request is rejected.
If the user attempts to vote on their own post, the request is rejected.
If the user attempts to vote on their own comment, the request is rejected.

### Community Operation Errors

If the community name is already taken, the community creation request is rejected.
If the community does not exist, the subscription request is rejected.
If the user is not the owner or a moderator, the add moderator request is rejected.
If the user is not the owner, the remove moderator request is rejected.
If the user attempts to remove the community owner, the request is rejected.
If the user attempts to remove another moderator without being the owner, the request is rejected.

### Ban and Report Errors

If the user is not a moderator of the community, the ban request is rejected.
If the user is not a moderator of the community, the unban request is rejected.
If the user is not a moderator of the community, the view banned users request is rejected.
If the user is not a moderator of the community, the view reports request is rejected.
If the report reason is missing or empty, the report submission request is rejected.
If the reported post does not exist, the report request is rejected.
If the reported comment does not exist, the report request is rejected.
If the user is not a moderator of the community, the approve report request is rejected.
If the user is not a moderator of the community, the dismiss report request is rejected.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Validation

Uploaded files must be image files. This applies to avatar images, community icons, and image post content. If a non-image file is uploaded, the request is rejected. The system validates that uploaded files are images before accepting them.

### Virus Scanning

The user requirements do not specify virus scanning requirements for uploaded files. No virus scanning behavior is defined in the original requirements.

### Content Type Restrictions

Images are used in three contexts: user avatar images, community icon images, and image post content. Each context accepts image uploads. The system distinguishes between these three image types based on the upload context (profile update, community creation or update, or post creation).

### File Retention

The user requirements do not specify file retention periods or deletion policies for uploaded images. When a user deletes their account, all their posts and comments are deleted (which would include their image posts). When a user changes their avatar or a community changes its icon, the previous image is replaced. No specific retention timeline is defined in the original requirements.