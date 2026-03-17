**redditLike — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Every user must choose a unique username that cannot be changed once set. Email addresses must be unique across the platform and are required for authentication. When signing up, users provide an email address and password. Users can change their password at any time after logging in. When a user deletes their account, all posts they created and all comments they wrote are also removed from the platform. This cascading deletion ensures no orphaned content remains when a user leaves the platform. The authentication system requires a valid email and password combination for login.

### Username Requirements

### Username Requirements

Every user must choose a username during registration. The username serves as the user's unique identifier on the platform and becomes part of their public identity.

**Uniqueness Constraint**
Each username must be unique across the entire platform. No two users may share the same username. If a prospective user attempts to register with a username already assigned to another user, the registration is rejected.

**Immutability**
Once a username is assigned during registration, it cannot be changed. This permanence ensures consistent identification of users across posts, comments, and community interactions.

**Character Constraints**
Usernames may contain letters, numbers, underscores, and hyphens. Usernames cannot contain spaces or special characters outside this set. Usernames must be between 3 and 20 characters in length.

**Reserved Names**
Certain usernames are reserved and unavailable for registration. Reserved names include platform-specific terms (such as "admin", "moderator", "support", "system") and variations thereof that could be confused with official platform accounts.

### Email Requirements

### Email Requirements

A valid email address is required for every user account. The email address serves as the primary credential for authentication and account recovery.

**Uniqueness Constraint**
Each email address may be associated with only one user account. If a user attempts to register with an email address already in use by another account, the registration is rejected.

**Format Validation**
Email addresses must conform to standard email format conventions, containing exactly one at-sign (@) and a valid domain portion.

**Verification Not Required**
The system accepts the email address provided during registration without requiring verification through a confirmation link or code.

### Password Requirements

### Password Requirements

Users must provide a password during registration. The password serves as the authentication credential alongside the email address.

**Minimum Length**
Passwords must be at least 8 characters in length. Passwords shorter than 8 characters are rejected during registration and password change operations.

**Change Capability**
Users may change their password at any time after successfully logging in. To change a password, the user must be authenticated and provide their current password for verification.

**No History Requirement**
When changing passwords, users may select any new password that meets the minimum length requirement. The system does not maintain a history of previously used passwords.

### Account Deletion Cascade Rules

### Account Deletion Cascade Rules

When a user chooses to delete their account, the system removes all content associated with that user to ensure no orphaned data remains on the platform.

**Post Deletion**
All posts created by the deleted user are permanently removed from their respective communities. This includes text posts, link posts, and image posts. Any votes on these posts are also removed, and the vote scores of affected posts are recalculated accordingly.

**Comment Deletion**
All comments written by the deleted user are permanently removed from all posts. This includes top-level comments and all nested replies authored by the user. Vote scores on affected posts and parent comments are recalculated to reflect the removal.

**Vote Removal**
All votes cast by the deleted user on other users' posts and comments are removed. The karma scores of content authors affected by these vote removals are adjusted accordingly.

**Profile Removal**
The user's profile information, including display name, bio, and avatar, is permanently deleted.

**Subscription Cancellation**
All community subscriptions held by the user are terminated. The subscriber counts of affected communities are decremented.

**Moderator Role Removal**
If the user holds any moderator positions, those roles are terminated. Communities where the user was the sole owner must be addressed separately—if the deleting user is the sole owner of a community, ownership must be transferred to another moderator or the community is also deleted.

### Validation Error Scenarios

### Validation Error Scenarios

**Registration with Duplicate Username**
If a user attempts to register with a username already assigned to another account, the registration is rejected. The user must select a different username.

**Registration with Duplicate Email**
If a user attempts to register with an email address already associated with an existing account, the registration is rejected. The user must provide a different email address or recover access to the existing account.

**Registration with Invalid Username Format**
If a username contains invalid characters, spaces, or falls outside the 3-20 character length requirement, the registration is rejected. The user must provide a username meeting the format requirements.

**Registration with Short Password**
If a password is fewer than 8 characters, the registration is rejected. The user must provide a longer password.

**Login with Nonexistent Email**
If a user attempts to log in with an email address not associated with any registered account, the authentication is rejected.

**Login with Incorrect Password**
If a user provides an email address that exists but the password does not match the stored credential, the authentication is rejected.

**Password Change with Incorrect Current Password**
If a user attempts to change their password but provides an incorrect current password, the password change is rejected. The existing password remains in effect.

**Password Change with Short New Password**
If a user attempts to change their password but the new password is fewer than 8 characters, the password change is rejected. The existing password remains in effect.

## UserProfile Rules

Each user has a profile consisting of display name, bio text, and avatar image, all of which are optional. Users can edit their own display name, bio, and avatar at any time. Any user can view any other user's profile, including display name, bio, avatar, total karma score, list of posts they created, and list of comments they wrote. The profile information is public by default and accessible to both logged-in and logged-out users. Display name can be different from username and may be changed freely.

### Profile Field Constraints

The display name is optional and may be left blank. When provided, the display name can be any text and may be changed freely at any time.

The bio text is optional and may be left blank. When provided, the bio text contains descriptive information about the user.

The avatar image is optional. When not provided, no avatar is displayed.

Each field can be set independently—the user may provide only a display name, only a bio, only an avatar, any combination, or none at all.

### Profile Editing Rules

A user may edit their own display name, bio, and avatar at any time. All three fields are mutable and can be modified or cleared.

Users cannot edit another user's profile. Attempting to modify another user's profile information is rejected.

There is no limit on how frequently a user may update their profile information.

### Profile Viewing and Content

Any user or guest may view any user's profile page.

A profile page displays the following information:
- The user's display name, if set
- The user's bio text, if set
- The user's avatar image, if set
- The user's total karma score (as defined in Vote Rules)
- A list of all posts created by the user
- A list of all comments written by the user

If the display name is not set, the profile shows the username instead as the primary identifier. If no bio is set, the bio section is omitted or shown as empty. If no avatar is set, the avatar section is omitted or shows a default placeholder.

### Display Name vs Username

The username is a unique identifier required at account creation and used for login and identification purposes. The username cannot be changed after registration and must be unique across the platform.

The display name is a separate, user-facing name that appears on posts, comments, and profiles. Unlike the username, the display name:
- Is optional
- Can be changed at any time
- Does not need to be unique
- May contain spaces and characters not allowed in usernames
- Is used for visual identification in the interface

If a user does not set a display name, the username is used as the visible name throughout the platform.

### Profile View Error Conditions

If a requested user profile does not exist, the request is rejected.

If a user attempts to edit another user's profile, the request is rejected.

If a user attempts to edit their own profile but provides invalid input (such as an unsupported image format for the avatar), the request is rejected and the profile remains unchanged.

## Community Rules

Any user can create a community. Each community must have a unique name that identifies it across the platform. A community has a description text and an icon image. The user who creates a community automatically becomes its owner. Communities display their subscriber count publicly. Users can browse all communities in a list and search for communities by name. Community names are unique identifiers and cannot conflict with existing community names.

### Community Creation Rules

Any authenticated user may create a new community.

A community name is required for creation. The name must be unique across the entire platform—no two communities may share the same name. The name may contain alphanumeric characters, hyphens, and underscores. Spaces are not permitted in community names.

If the requested community name is already in use, the creation attempt is rejected.

If the community name contains characters outside the allowed set, the creation attempt is rejected.

The user who creates the community automatically becomes the owner of that community.

### Community Attributes

Every community has a description text that explains its purpose and topic. The description is required and should be brief but informative.

A community may have an icon image. The icon is optional at creation but may be added or changed later by the community owner or moderators. The icon image must be a valid image file format. If an icon is provided, it must meet the platform's image file requirements (defined in File Validation and Policies).

### Subscriber Count Visibility

The subscriber count for each community is publicly visible to all users, including logged-out visitors. The count updates in real-time as users subscribe or unsubscribe from the community.

The subscriber count is displayed on the community's detail page and in community list views.

### Community Discovery Rules

All communities are browsable in a public list. Any user, including guests who are not logged in, may view the list of communities.

Users may search for communities by name. The search matches community names and returns communities whose names contain the search terms.

Community search results are ordered by relevance to the search query and subscriber count.

### Validation and Error Scenarios

**Duplicate Name**: If a user attempts to create a community with a name that already exists, the system rejects the request and informs the user that the name is unavailable.

**Invalid Characters**: If a community name contains spaces or special characters outside the allowed set (alphanumeric, hyphens, underscores), the request is rejected.

**Empty Name**: If the community name is missing or empty, the creation request is rejected.

**Missing Description**: If the community description is missing or empty, the creation request is rejected.

**Invalid Icon Format**: If an icon image is provided but is not a supported image format, the upload is rejected.

## Subscription Rules

Users can subscribe to any community they are not already subscribed to. Users can unsubscribe from any community they are currently subscribed to. A subscription is required to create posts in that community. Users can view a list of all communities they are subscribed to. Subscription status determines posting permissions within each community. There are no limits on the number of communities a user can subscribe to. A user maintains their subscription until they explicitly unsubscribe.

### Subscription Validation

Users can subscribe to any community they are not already subscribed to.

Users cannot subscribe to a community they are already subscribed to. The request is rejected if attempted.

Users can unsubscribe from any community they are currently subscribed to.

Users cannot unsubscribe from a community they are not subscribed to. The request is rejected if attempted.

A user maintains their subscription until they explicitly unsubscribe. Subscriptions do not expire automatically.

### Posting Permission Rules

A subscription is required to create posts in a community. Users without a subscription to a community cannot create posts in that community.

Subscription status determines posting permissions within each community on a per-community basis. Being subscribed to one community does not grant posting permission in other communities.

Users retain the ability to view content in communities they are not subscribed to. Viewing permissions are separate from subscription status.

### Subscribed Communities List

Users can view a list of all communities they are subscribed to.

The subscribed communities list contains only communities where the user has an active subscription.

Each entry in the list shows the community name, description, and icon.

### Subscription Limits

There are no limits on the number of communities a user can subscribe to. Users may subscribe to as many communities as desired.

Users may subscribe to all available communities if they choose to do so.

### Error Conditions

If a user attempts to subscribe to a community they are already subscribed to, the request is rejected.

If a user attempts to unsubscribe from a community they are not subscribed to, the request is rejected.

If a user attempts to create a post in a community they are not subscribed to, the request is rejected.

## Post Rules

Users can create posts only in communities they are subscribed to. Every post must have a title which is required and cannot be empty. A post must be exactly one of three types: text post with content, link post with a URL, or image post with an uploaded image. Users can edit their own posts after creation. Users can delete their own posts. Posts display title, full content, author, community, vote score, comment count, and posting time when viewed individually.

### Post Creation Prerequisites

WHEN a member attempts to create a post in a community, IF the member is not subscribed to that community, THEN the system SHALL reject the request.

WHEN a guest attempts to create a post, THEN the system SHALL reject the request and require authentication.

WHEN a member creates a post, THE system SHALL associate the post with the member as the author.

WHEN a member creates a post, THE system SHALL record the current date and time as the posting time.

WHEN a member creates a post in a community, THE system SHALL associate the post with that community.

### Post Title Validation

WHEN a member creates a post, IF the title is missing or empty, THEN the system SHALL reject the request.

WHEN a member creates a post, IF the title exceeds the maximum length, THEN the system SHALL reject the request.

WHEN a member edits a post, IF the edited title is empty, THEN the system SHALL reject the request.

WHEN a member edits a post, IF the edited title exceeds the maximum length, THEN the system SHALL reject the request.

IF a post title is provided, THEN THE system SHALL store and display the exact title text as provided by the author.

### Post Type Validation

WHEN a member creates a post, IF the type is text, THEN the post SHALL contain text content and SHALL NOT contain a URL or image.

WHEN a member creates a post, IF the type is link, THEN the post SHALL contain a valid URL and SHALL NOT contain text content or an image.

WHEN a member creates a post, IF the type is image, THEN the post SHALL contain an uploaded image and SHALL NOT contain text content or a URL.

WHEN a member creates a post, IF the post type is not exactly one of text, link, or image, THEN the system SHALL reject the request.

WHEN a member creates a post, IF the type is text and the content is missing or empty, THEN the system SHALL reject the request.

WHEN a member creates a post, IF the type is link and the URL is missing or invalid, THEN the system SHALL reject the request.

WHEN a member creates a post, IF the type is image and no image is uploaded, THEN the system SHALL reject the request.

### Post Editing Rules

WHEN a member attempts to edit a post, IF the post does not exist, THEN the system SHALL reject the request.

WHEN a member attempts to edit a post, IF the member is not the author of the post, THEN the system SHALL reject the request.

WHEN a member edits their own post, THE system SHALL update the post content according to the same validation rules as post creation.

WHEN a member edits their own post, THE system SHALL record the edit time.

WHEN a moderator or owner edits a post (defined in [Moderator Actions section in 03-functional-requirements.md]), IF the moderator or owner has appropriate authority in the community, THEN the system SHALL allow the edit regardless of authorship.

WHEN a post is edited, THE system SHALL preserve the original posting time while displaying that the post has been edited.

### Post Deletion Rules

WHEN a member attempts to delete a post, IF the post does not exist, THEN the system SHALL reject the request.

WHEN a member attempts to delete a post, IF the member is not the author of the post, THEN the system SHALL reject the request.

WHEN a member deletes their own post, THE system SHALL remove the post and all its associated comments from display.

WHEN a post is deleted, THE system SHALL decrease the author's total post count.

WHEN a post is deleted by its author, THE system SHALL preserve the deletion state and timestamp for reference purposes.

WHEN a moderator or owner deletes a post (defined in [Moderator Actions section in 03-functional-requirements.md]), IF the moderator or owner has appropriate authority in the community, THEN the system SHALL allow the deletion regardless of authorship.

### Post Display Rules

WHEN displaying a post, THE system SHALL calculate and show the vote score as the total upvotes minus the total downvotes.

WHEN displaying a post, THE system SHALL count and display the total number of comments on that post including all nested replies.

WHEN displaying a post in a feed list, IF the post is a text post, THEN the system SHALL display the first 200 characters of the content.

WHEN displaying a post in a feed list, IF the post is an image post, THEN the system SHALL display a thumbnail of the image.

WHEN displaying a post in a feed list, IF the post is a link post, THEN the system SHALL display the domain name extracted from the URL.

WHEN displaying a single post in full view, THE system SHALL show the complete title, full content, author username, community name, vote score, comment count, and the time since the post was created.

WHEN displaying post metadata, THE system SHALL show the time elapsed since posting in human-readable format (e.g., "3 hours ago").

### Post Listing and Feed Rules

WHEN displaying the home feed for a logged-in member, THE system SHALL only include posts from communities the member is subscribed to.

WHEN displaying the popular feed, THE system SHALL include posts from all communities across the platform.

WHEN displaying a community feed, THE system SHALL only include posts from that specific community.

WHEN sorting posts by "Hot", THE system SHALL prioritize recent posts with high vote activity.

WHEN sorting posts by "New", THE system SHALL display posts in reverse chronological order by creation time.

WHEN sorting posts by "Top", THE system SHALL order posts by vote score in descending order and apply the specified time filter (today, this week, this month, this year, or all time).

WHEN sorting posts by "Controversial", THE system SHALL prioritize posts with high total vote activity but scores close to zero.

WHEN displaying any feed, THE system SHALL paginate results with a consistent page size.

## Comment Rules

Users can write comments on any post regardless of subscription status. Users can reply to any existing comment. Replies can have nested replies with no depth limit, forming a threaded discussion structure. Users can edit their own comments after posting. Users can delete their own comments. Each comment displays the author, content text, vote score, time since posted, and any nested replies. Comments persist even if the parent post or parent comment is deleted.

### Comment Content Validation

Comments must contain non-empty text content. A comment consisting only of whitespace characters is rejected. There is no maximum length restriction for comment content.

### Reply Nesting Rules

Users may reply to any existing comment that has not been deleted. Replies can themselves receive replies, creating a threaded discussion structure. There is no maximum depth limit for nested replies. Each reply maintains an association with its parent comment. The threaded structure visually represents parent-child relationships between comments.

### Comment Editing Constraints

Only the author of a comment may edit it. When a comment is edited, its vote score is preserved. The timestamp indicating when the comment was originally posted remains unchanged. Editing a comment does not affect the visibility or accessibility of any replies to that comment. There is no time limit restricting when a comment may be edited after its creation.

### Comment Deletion Behavior

Only the author of a comment may delete it. When a comment is deleted, it remains visible in the thread structure with an indication that it has been removed. The content of a deleted comment is no longer displayed. Deleting a parent comment does not remove its nested replies; those replies remain visible in the thread. Once deleted, a comment cannot receive new replies. Once deleted, a comment cannot receive votes. Once deleted, a comment cannot be edited further. Deleted comments cannot be restored by the author.

### Comment Display Requirements

Each comment displays the username of its author. Each comment displays its full text content (unless deleted). Each comment displays its current vote score. Each comment displays the elapsed time since it was posted. Each comment displays all direct replies nested beneath it in a threaded tree format. The threaded display uses indentation or other visual cues to indicate reply depth and parent-child relationships.

### Comment Error Conditions

If a user attempts to edit a comment they did not author, the request is rejected. If a user attempts to delete a comment they did not author, the request is rejected. If a user attempts to reply to a comment that has been deleted, the request is rejected. If a user attempts to vote on a comment that has been deleted, the request is rejected. If a user attempts to submit a comment without providing content text, the request is rejected.

## Vote Rules

Every user has a single karma score represented as one number. Karma increases by one when someone upvotes the user's post or comment. Karma decreases by one when someone downvotes the user's post or comment. When someone removes their vote, the karma adjusts accordingly by reversing the previous change. Karma can become negative, there is no minimum bound. The vote score of a post or comment equals total upvotes minus total downvotes. Each user can only vote once per post or per comment.

### Karma Score Definition and Behavior

Every user has exactly one karma score represented as a single number. This karma score aggregates all voting activity across all posts and comments created by that user.

When another user upvotes a post or comment created by the user, the user's karma increases by exactly one. When another user downvotes a post or comment created by the user, the user's karma decreases by exactly one.

When a user removes their upvote from content created by another user, the content author's karma decreases by one to reverse the previous increase. When a user removes their downvote from content created by another user, the content author's karma increases by one to reverse the previous decrease.

A user's karma score has no minimum bound and can become negative when the user receives more downvotes than upvotes across all their content. There is no maximum limit on karma score.

The karma score is a property of the user profile (defined in UserProfile Rules) and is publicly visible on every user's profile page.

### Vote Score Calculation

The vote score of any post or comment is calculated as the total number of upvotes minus the total number of downvotes. This applies consistently across all content types.

A post or comment with only upvotes will have a positive vote score equal to the upvote count. A post or comment with only downvotes will have a negative vote score equal to the negative downvote count. A post or comment with equal numbers of upvotes and downvotes will have a vote score of zero.

The vote score is displayed alongside every post and comment to indicate community reception of the content. The vote score can change dynamically as users cast, change, or remove their votes.

### Vote Uniqueness Constraint

Each user may cast at most one vote per post and at most one vote per comment. This constraint ensures that no single user can artificially inflate or deflate the vote score of any content item through multiple votes.

When a user attempts to vote on content they have already voted on, the system must handle this as a vote change operation rather than an additional vote. The previous vote is replaced by the new vote, and the karma adjustment reflects the net change.

A user who has not yet voted on a specific post or comment may cast an initial upvote or downvote. Once a vote exists, the user may change it to the opposite type or remove it entirely, but cannot create additional parallel votes on the same content.

### Karma Adjustment Mechanics

The karma adjustment follows specific arithmetic rules based on vote actions. When a user upvotes content, the content author's karma increases by one immediately. When a user downvotes content, the content author's karma decreases by one immediately.

When a user changes their vote from upvote to downvote, the content author's karma decreases by two: one to reverse the original upvote (decreasing karma by one) and one to apply the new downvote (decreasing karma by another one). When a user changes their vote from downvote to upvote, the content author's karma increases by two: one to reverse the original downvote (increasing karma by one) and one to apply the new upvote (increasing karma by another one).

When a user removes their upvote, the content author's karma decreases by one. When a user removes their downvote, the content author's karma increases by one. These rules ensure that karma always accurately reflects the current state of all votes across the platform.

## ModeratorRole Rules

The user who creates a community becomes the owner with highest authority. The owner can add moderators to the community. The owner can remove any moderator from the community. Moderators can add other moderators to the community. Moderators cannot remove the owner from their position. Moderators cannot remove each other, only the owner can remove moderators. Moderators can delete any post in their community regardless of who created it. Moderators can delete any comment in their community regardless of who wrote it.

### Role Hierarchy and Authority

### Role Assignment

WHEN a user creates a community, THE system SHALL assign that user as the owner of the community.

### Authority Levels

THE owner SHALL have the highest authority level within the community.

IF a user is the owner of a community, THEN THE system SHALL grant that user full moderation authority over the community.

### Role Visibility

THE system SHALL indicate the owner role separately from moderator roles in community member listings.

THE system SHALL prevent the owner role from being removed through normal moderation actions.

### Moderator Addition Rules

### Owner Privilege to Add Moderators

IF a user is the owner of a community, THEN THE user SHALL be able to grant moderator role to other users.

### Moderator Privilege to Add Moderators

IF a user has a moderator role in a community, THEN THE user SHALL be able to grant moderator role to other users.

### Addition Constraints

THE system SHALL prevent duplicate moderator assignments for the same user in the same community.

IF a user is already a moderator of a community, THEN THE system SHALL reject attempts to grant moderator role again.

### Self-Assignment Prevention

THE system SHALL prevent a user from granting themselves the moderator role.

IF the target user is the same as the acting user, THEN THE system SHALL reject the moderator role assignment.

### Moderator Removal Rules

### Owner Removal Privilege

IF a user is the owner of a community, THEN THE user SHALL be able to remove any moderator from that community.

### Moderator Removal Restrictions

IF a user has a moderator role in a community, THEN THE user SHALL NOT be able to remove the owner from that community.

IF a user has a moderator role in a community, THEN THE user SHALL NOT be able to remove other moderators from that community.

### Removal Validation

IF the target user is the owner of the community, THEN THE system SHALL reject any removal attempt by moderators.

IF the target user is a moderator but the acting user is not the owner, THEN THE system SHALL reject the removal attempt.

### Role Transfer Limitations

THE system SHALL prevent the owner role from being transferred or removed.

IF an attempt is made to remove the sole owner of a community, THEN THE system SHALL reject the operation.

### Content Moderation Actions

### Post Deletion Authority

IF a user has a moderator role in a community, THEN THE user SHALL be able to delete any post within that community regardless of who created it.

### Comment Deletion Authority

IF a user has a moderator role in a community, THEN THE user SHALL be able to delete any comment within that community regardless of who wrote it.

### Cross-Community Restrictions

IF a post does not belong to the community where the moderator has authority, THEN THE system SHALL reject the deletion attempt by that moderator.

IF a comment does not belong to a post in the community where the moderator has authority, THEN THE system SHALL reject the deletion attempt by that moderator.

### Audit Trail

WHEN a moderator deletes a post, THE system SHALL record the moderator identity and the deletion timestamp.

WHEN a moderator deletes a comment, THE system SHALL record the moderator identity and the deletion timestamp.

THE system SHALL display deletion notices indicating the content was removed by a community moderator.

## Ban Rules

Moderators can ban users from their community. Moderators can unban users they previously banned. Moderators can view the list of all banned users in their community. Banned users cannot create posts in that community. Banned users cannot write comments in that community. Banned users can still view all content in the community. Banned users can still subscribe or unsubscribe from the community. A ban applies only to the specific community where it was issued.

### Ban Business Rules

Ban Creation

WHEN a moderator initiates a ban action against a user in a community, THE system SHALL require the banned user identifier and the community identifier.

THE system SHALL only permit moderators of a community to ban users from that specific community.

WHEN a ban is created, THE system SHALL record the timestamp of when the ban was issued.

THE system SHALL reject a ban attempt IF the target user already has an active ban in that community.

THE system SHALL record which moderator issued the ban for audit purposes.

Ban Removal

WHEN a moderator initiates an unban action, THE system SHALL verify the moderator’s authority over that community.

THE system SHALL allow moderators to remove active bans they previously issued.

THE system SHALL allow the owner of a community to remove any active ban within that community.

WHEN a ban is removed, THE system SHALL clear the ban record or mark it as revoked with a timestamp.

Ban List Viewing

THE system SHALL provide moderators with a complete list of all users currently banned from their community.

WHEN displaying the banned users list, THE system SHALL show: the banned user’s username, the date the ban was issued, and the moderator who issued the ban.

THE system SHALL exclude expired or revoked bans from the active banned users list.

THE system SHALL allow moderators to filter or search the banned users list by username.

Post Creation Restriction

WHILE a user has an active ban in a specific community, THE system SHALL reject any post creation attempt by that user in that community.

IF a banned user attempts to create a post, THEN THE system SHALL reject the request and inform the user of their banned status.

THE system SHALL check ban status BEFORE validating post content or type.

Comment Creation Restriction

WHILE a user has an active ban in a specific community, THE system SHALL reject any comment creation attempt by that user on posts within that community.

IF a banned user attempts to reply to a comment in a banned community, THEN THE system SHALL reject the request.

THE system SHALL prevent banned users from participating in discussions within the banned community regardless of comment depth or thread position.

Read Access Preservation

WHILE a user is banned from a community, THE system SHALL continue to allow that user to view all content in that community including posts and comments.

THE system SHALL NOT restrict viewing permissions for banned users in communities where they are banned.

Subscription Rights Preservation

WHILE a user is banned from a community, THE system SHALL allow that user to subscribe to that community.

WHILE a user is banned from a community, THE system SHALL allow that user to unsubscribe from that community.

THE system SHALL NOT prevent subscription state changes based on ban status.

Community Scope Enforcement

THE system SHALL treat bans as scoped exclusively to the community where the ban was issued.

WHEN checking if a ban applies, THE system SHALL verify the community identifier matches the ban record.

THE system SHALL permit a banned user in one community to fully participate in any other community where they are not banned.

IF a user is banned from Community A, THEN THE system SHALL NOT apply that ban to Community B, Community C, or any other community.

Ban Duration and Expiration

THE system SHALL support permanent bans with no expiration date.

THE system SHALL support temporary bans with an optional expiration timestamp.

WHEN the current time exceeds a temporary ban’s expiration timestamp, THE system SHALL automatically treat the ban as expired.

IF a user attempts to post in a community where their temporary ban has expired, THEN THE system SHALL permit the action.

## Report Rules

Users can report any post or comment they believe violates community rules. When submitting a report, users must provide a reason in text form. Moderators can view all reports submitted for content in their community. Each report displays the reported content, the user who reported it, and the reason provided. Moderators can approve a report which deletes the reported content. Moderators can dismiss a report which keeps the content and removes the report from the list. Dismissed reports are permanently removed from the report list.

### Report Submission

Users can submit a report on any post they believe violates community guidelines.
Users can submit a report on any comment they believe violates community guidelines.
When submitting a report, the user must provide a reason describing why the content is being reported.
A report cannot be submitted without a reason.
Each report is associated with the user who submitted it and the content being reported.
The report records the timestamp when it was submitted.
Reports are initially created with a pending status awaiting moderator review.
A user can report the same post or comment multiple times, with each report treated as a separate submission.
Reports can be submitted for content in any community, regardless of whether the reporting user is subscribed to that community.

### Report Visibility

Moderators can view all pending reports submitted for content within their community.
Each report in the list displays the reported content (post or comment) in full.
Each report shows the username of the user who submitted the report.
Each report displays the reason text provided by the reporting user.
The report list excludes reports that have already been dismissed.
Reports are organized by community, and moderators only see reports for communities where they have moderation authority.
The report view includes when the report was submitted.

### Report Resolution

Moderators can approve a report, which results in the deletion of the reported content.
When a report is approved, the reported post or comment is removed from the platform.
Moderators can dismiss a report, which keeps the reported content visible.
When a report is dismissed, it is permanently removed from the report list.
Dismissed reports are no longer accessible to moderators for review.
Approved reports may be retained for record-keeping purposes even after content deletion.
Only moderators of the community where the content resides can approve or dismiss reports for that content.
The moderator who resolves a report is recorded for accountability.
A report can only be resolved once; after approval or dismissal, no further action can be taken on that report.

### Report Error Scenarios

If a user attempts to submit a report without providing a reason, the submission is rejected.
If a user attempts to report content that does not exist, the submission is rejected.
If a non-moderator attempts to view reports for a community, the request is rejected.
If a moderator attempts to approve or dismiss a report for content in a community they do not moderate, the request is rejected.
If a moderator attempts to act on a report that has already been resolved, the request is rejected.
If a user attempts to submit a report while their account is suspended or banned, the submission is rejected.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Search and Filtering

Users can search for communities by name. The search returns communities whose names contain the search term provided by the user.

The list of communities browsed by users displays each community with its name, description, subscriber count, and icon image.

The banned users list accessible to moderators shows each banned user with their username and the reason for the ban if one was provided.

The reports list accessible to moderators displays each report with the reported content, the username of the reporter, the reason text provided by the reporter, and the current status of the report.

### Sorting Rules

Post feeds support four sorting methods:

**Hot**: Posts with recent activity and high engagement appear first. Posts with many upvotes that were created recently receive higher priority in this sorting method.

**New**: Posts are ordered by creation time, with the most recently created posts appearing first.

**Top**: Posts are ordered by vote score from highest to lowest. When sorting by Top, users must select a time filter: today, this week, this month, this year, or all time. Only posts created within the selected time period are included in the results.

**Controversial**: Posts with high total vote activity but vote scores close to zero appear first. This identifies posts that received significant voting attention but divided opinion.

Comments support three sorting methods:

**Best**: Comments are ordered by vote score from highest to lowest.

**New**: Comments are ordered by creation time, with the most recently created comments appearing first.

**Controversial**: Comments with high total vote activity but vote scores close to zero appear first.

### Pagination Rules

All post feeds are paginated to manage the display of large result sets. The system divides the total results into discrete pages, with each page containing a fixed number of posts.

Users navigate through paginated results by moving to the next page, previous page, or jumping to a specific page number. The system indicates the total number of pages or whether additional pages exist beyond the current view.

When a user requests a page that does not exist because there are no results, the system presents an empty result set rather than an error condition.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Account Registration Errors

IF the email provided during registration is already associated with an existing account, THEN THE system SHALL reject the registration request.
IF the username provided during registration is already in use by another account, THEN THE system SHALL reject the registration request.
IF the email is missing during registration, THEN THE system SHALL reject the request.
IF the password is missing during registration, THEN THE system SHALL reject the request.

### Authentication Errors

IF the email provided during login does not match any existing account, THEN THE system SHALL reject the authentication request.
IF the password provided during login does not match the account's credentials, THEN THE system SHALL reject the authentication request.
WHILE the user is not authenticated, THE system SHALL reject requests requiring authentication.

### Password Change Errors

IF the current password provided during a password change does not match the account's stored credentials, THEN THE system SHALL reject the password change request.

### Username and Community Name Uniqueness Violations

WHILE a username is already in use by an active account, THE system SHALL reject any attempt to create a new account or change to that username.
WHILE a community name is already in use by an existing community, THE system SHALL reject any attempt to create a new community with that name.

### Community Membership Errors

IF a user attempts to create a post in a community they are not subscribed to, THEN THE system SHALL reject the post creation request.
IF a banned user attempts to create a post in the community they are banned from, THEN THE system SHALL reject the request.
IF a banned user attempts to write a comment in the community they are banned from, THEN THE system SHALL reject the request.

### Post Creation and Edit Errors

IF the title is missing when creating a post, THEN THE system SHALL reject the request.
IF a text post is created without content text, THEN THE system SHALL reject the request.
IF a link post is created without a URL, THEN THE system SHALL reject the request.
IF an image post is created without an uploaded image, THEN THE system SHALL reject the request.
IF a user attempts to edit a post they did not create, THEN THE system SHALL reject the edit request.
IF a user attempts to delete a post they did not create, THEN THE system SHALL reject the deletion request.
IF the requested post does not exist, THEN THE system SHALL reject the request.

### Comment Creation and Edit Errors

IF the content is missing when creating a comment, THEN THE system SHALL reject the request.
IF a user attempts to edit a comment they did not create, THEN THE system SHALL reject the edit request.
IF a user attempts to delete a comment they did not create, THEN THE system SHALL reject the deletion request.
IF the requested comment does not exist, THEN THE system SHALL reject the request.
IF the parent comment being replied to does not exist, THEN THE system SHALL reject the reply request.

### Profile Edit Permission Errors

IF a user attempts to edit another user's profile (display name, bio, or avatar), THEN THE system SHALL reject the request.

### Moderator Permission Errors

IF a moderator attempts to remove the community owner from their moderator role, THEN THE system SHALL reject the request.
IF a moderator attempts to remove another moderator (who is not the owner), THEN THE system SHALL reject the request (only the owner may remove moderators).
IF a non-moderator attempts to perform moderator actions (deleting posts, banning users, viewing reports), THEN THE system SHALL reject the request.

### Report Submission Errors

IF the reason text is missing when submitting a report, THEN THE system SHALL reject the report request.

### Vote Constraint Violations

WHILE a user has already upvoted a post or comment, THE system SHALL reject any additional upvote attempts on the same content by the same user.
WHILE a user has already downvoted a post or comment, THE system SHALL reject any additional downvote attempts on the same content by the same user.

### Non-Existent Resource Access Errors

IF the requested user profile does not exist, THEN THE system SHALL reject the request.
IF the requested community does not exist, THEN THE system SHALL reject the request.
IF the requested post does not exist, THEN THE system SHALL reject the request.
IF the requested comment does not exist, THEN THE system SHALL reject the request.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### Image Upload Validation

Uploaded image files must be validated to ensure they are legitimate image files. This applies to avatar images for user profiles, icon images for communities, and image posts.

The system shall validate that uploaded files are images and reject non-image file types. If an uploaded file fails image validation, the request is rejected.

### Content Type Requirements

The platform accepts image files for three specific purposes:

**Avatar Images**: Users may upload an avatar image to display on their profile.

**Community Icons**: Community owners may upload an icon image to represent their community.

**Post Images**: Users may upload images when creating image-type posts.

For each upload, the file must be an image file. Non-image files cannot be used as avatars, community icons, or post content.

### File Retention and Deletion

Files are retained as long as the entity they belong to exists. When an entity is deleted, its associated files are also removed.

**User Account Deletion**: WHEN a user deletes their account, THEN the system shall delete the user's avatar image and all images uploaded for their posts.

**Post Deletion**: WHEN a user deletes their own post, OR a moderator deletes a post, THEN the system shall delete any image associated with that post.

**Community Icon Removal**: WHEN a community icon is replaced by the owner, or the community is removed from the platform, THEN the system shall delete the icon image.

IF a file is no longer referenced by any entity, the system shall remove it from storage.