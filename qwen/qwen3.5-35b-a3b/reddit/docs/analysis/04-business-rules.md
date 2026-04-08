**redditCommunity — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users must sign up with an email address and password, and choose a unique username that no other user has claimed. When logging in, users provide their email and password to access their account. Users have the ability to change their password at any time through their account settings. When a user deletes their account, all their posts and comments are automatically removed from the platform as part of the deletion process. The system must validate that the email follows a valid email format and that the username is unique across all users before allowing account creation. Password changes require the user to provide their current password before setting a new one. Email addresses must follow a valid email format to ensure proper authentication.

### Email Format Validation

Users must provide an email address that follows a valid email format when creating an account or performing any authenticated action. The email must contain a properly formatted local part, the @ symbol, and a valid domain part. If the email does not match a valid email format, the system rejects the request. This validation applies to account creation, login attempts, and any operation requiring user authentication.

### Username Uniqueness and Availability

Each username must be unique across all users in the system. When users create an account, they must choose a username that no other user has claimed. The system checks username availability before allowing account creation. If the chosen username is already in use, the registration request is rejected. This uniqueness requirement ensures that each user can be uniquely identified by their username throughout the platform.

### Account Creation Requirements

To create an account, users must provide a valid email address with proper format, a password, and a unique username that is not already taken. All three requirements must be satisfied for successful account creation. If the email format is invalid, the username is unavailable, or no password is provided, the account creation request is rejected.

### Login Authentication Process

Users log in by providing their email address and password. The system validates that the email exists in the system and that the provided password matches the stored credentials. If the email is not found or the password is incorrect, the login request is rejected. Only authenticated users can perform actions that require membership, such as creating posts, commenting, voting, or subscribing to communities.

### Password Change Security

Users can change their password through their account settings. To change a password, users must provide their current password along with the new password. The system verifies the current password before accepting the change. If the current password is incorrect, the password change request is rejected. This verification ensures that only the account owner can modify the password.

### Account Deletion and Content Removal

When a user deletes their account, the system automatically removes all posts and comments authored by that user. This deletion happens as part of the account deletion process and cannot be undone. The account deletion permanently removes the user profile, including the user's username, email, and all associated content. The system does not retain any data from the deleted user account.

## Profile Rules

Each user has a profile containing a display name, bio text, and avatar image that they can edit at any time. Users can only modify their own display name, bio, and avatar—no other user can change another user's profile information. Any user on the platform can view any other user's profile to see their public information. A user's profile page displays their display name, bio, avatar, total karma score, a list of all posts they have created, and a list of all comments they have written. The system tracks and maintains a user's total karma score which reflects their engagement across the platform through posts and comments. Display names and bio text can be updated freely by the profile owner.

### Profile Editing Permissions

Users can only edit their own profile information. No user can modify another user's display name, bio text, or avatar image. The system enforces ownership by comparing the requesting user against the profile owner before allowing any updates. If a user attempts to edit a profile that does not belong to them, the request is rejected. Profile editing permissions are scoped to the authenticated user's account only.

### Display Name Updates

Display names can be updated by the profile owner at any time. Users are required to provide a new display name value when updating their profile. The system maintains the most recently submitted display name for each user. Display name changes take effect immediately upon successful submission. There is no restriction on how frequently a user may update their display name.

### Bio Text Management

Users may update their bio text at any time. Bio text is optional during initial profile creation but can be added or modified later. Users can update their bio text multiple times without restriction. The system stores the most recently submitted bio text for display on the user's profile page. Bio text content is managed independently from display name and avatar updates.

### Avatar Image Management

Users may upload an avatar image for their profile. Users can replace their existing avatar image with a new image at any time. The system maintains a single avatar image per user profile. When a new avatar is uploaded, it replaces the previous avatar image. Avatar image uploads are subject to file validation including file type and size restrictions enforced by the system.

### Profile Viewing Access

Any user on the platform can view any other user's profile. Viewing access is not restricted by subscription status, membership level, or relationship between users. Guest users can also view profiles of registered users. Profile viewing does not require any special permissions or approval from the profile owner. All public profile information is visible to any viewer.

### Karma Score Display

Each user's profile displays their total karma score as a single numeric value. The karma score is calculated automatically based on votes received on the user's posts and comments. The karma score may be positive, negative, or zero. Users can see their own karma score and the karma scores of other users on their profile pages. The karma score updates in real-time when vote actions are performed.

### User Content Aggregation

A user's profile page displays a complete list of all posts they have created on the platform. A user's profile page also displays a complete list of all comments they have written. Both lists show all content regardless of whether the content is currently visible or has been deleted. The system aggregates and presents all posts and comments authored by the user on their profile page.

### Profile Modification Constraints

Users cannot modify another user's profile information under any circumstances. Profile modification actions are validated against the authenticated user's identity before execution. If profile modification is attempted on a profile that does not belong to the authenticated user, the request is rejected with an access denial error. The system prevents all unauthorized profile modifications.

## Community Rules

Any user can create a new community by providing a unique name, description text, and an icon image. The user who creates a community automatically becomes its owner and receives the highest authority level within that community. Users can browse all communities in a list view to discover what's available on the platform. Users can search for communities by their name to find specific communities of interest. Each community displays its subscriber count so users can see how many people are following it. The system must validate that the community name is unique before allowing a new community to be created. Description text and icon images are optional when creating a community.

### Community Creation Requirements

A user can create a new community by providing a name, an optional description, and an optional icon image. The community name is required and must meet all uniqueness requirements. The description and icon image are optional fields that can be left empty during creation.

### Unique Community Name

Every community must have a unique name that no other community on the platform has used. When creating a community, the system validates that the proposed name does not already exist in the platform. If the name is already taken, the community creation request is rejected and the user receives an error message indicating that the name is unavailable. The system must check for name uniqueness before allowing any community to be created.

### Owner Role Assignment

The user who creates a community automatically becomes the owner of that community. Owner status is assigned at the moment of community creation and cannot be transferred to another user. The owner has the highest authority level within the community and receives all owner privileges immediately upon creation.

### Community Description Text

A community description is optional text that provides information about the community's purpose or topic. The description can be any length and does not have a minimum or maximum character limit. If no description is provided during creation, the community is created without a description. Users can edit the description at any time after creation.

### Icon Image Uploads

A community icon is an optional image that represents the community visually. The icon can be uploaded during community creation or added later by the owner or moderators. If no icon is provided, the community displays without an image. The system accepts standard image file formats for icon uploads.

### Community Browsing List

All users, including those not logged in, can browse a complete list of all communities in the platform. The list view displays basic information about each community including its name, subscriber count, and other key details. The browse list is paginated to manage large numbers of communities and allows users to navigate through multiple pages.

### Community Search by Name

Users can search for communities by entering part or all of a community name. The search functionality matches against community names and returns results that contain the search term. Search results can be viewed in a list format showing matching communities with their subscriber counts. The search is case-insensitive and supports partial name matching.

### Subscriber Count Display

Each community displays its subscriber count on its listing and detail pages. The subscriber count shows the total number of users who have subscribed to the community. This count updates in real-time as users subscribe or unsubscribe from the community. All users can view the subscriber count, regardless of whether they are subscribed themselves.

### Community Name Uniqueness Validation

The system must reject any attempt to create a community with a name that already exists. When a duplicate name is detected during the creation process, the request fails and the user is informed that the chosen name is not available. The system provides feedback indicating that the name must be unique and can only be used by one community.

### Account Status Validation

A user cannot create a community if their account is suspended or deleted. The system validates the account status before allowing community creation. If the account has been banned or deleted, the community creation request is rejected with an appropriate error message.

### Community Name Format

Community names must not be empty or contain only whitespace characters. The system validates that the name field contains at least one non-whitespace character. Empty or whitespace-only names are rejected during the creation validation process.

### Ban Restrictions on Creation

Users who are banned from a community cannot create new communities. The ban restriction applies to the user account level and prevents any community creation activity while the ban is active.

## Subscription Rules

Users can subscribe to any community they want to follow and receive content from. Users can unsubscribe from any community they are currently subscribed to at any time. Users can view a list of all communities they have subscribed to in their subscription management area. Subscribing to a community is a required condition before a user can create posts within that community. The system enforces that users cannot post in a community unless they have first subscribed to it. Users may subscribe and unsubscribe freely without restrictions on how many times they can switch their subscription status.

### Subscribe to Community

Users can subscribe to any community they want to follow and receive content from.

When a user subscribes to a community, the system creates a subscription record linking the user to that community with the current date and time as the subscription date.

The subscription status is set to active immediately upon successful subscription.

Users can subscribe to any number of communities without restriction.

Subscribing to a community allows the user to view that community's feed and participate in community activities.

If the requested community does not exist, the subscription request is rejected.

If the user has already subscribed to the requested community, the system confirms the existing subscription and does not create a duplicate.

### Unsubscribe from Community

Users can unsubscribe from any community they are currently subscribed to at any time.

When a user unsubscribes from a community, the subscription status is updated to inactive.

The original subscription record is retained for historical tracking purposes.

Users can re-subscribe to a community after unsubscribing without any waiting period.

Unsubscribing from a community prevents the user from receiving new posts from that community in their home feed.

If the user is not currently subscribed to the requested community, the unsubscribe request is rejected with a confirmation that the user is not subscribed.

The user's previous posts and comments in the community remain accessible after unsubscribing.

The user retains the ability to view the community content as a guest after unsubscribing.

### Subscription Management List

Users can view a list of all communities they have subscribed to in their subscription management area.

The subscription list displays the community name, community icon, and current subscription status (active or inactive).

The list includes the subscription date for each community.

The subscription list is paginated to handle large numbers of subscribed communities.

Users can filter the subscription list to show only currently active subscriptions.

Users can sort the subscription list by subscription date (newest or oldest first).

The system displays the total count of subscribed communities in the header of the subscription list.

If the user has no subscriptions, the system displays a message indicating there are no subscribed communities.

### Post Creation Prerequisite

Subscribing to a community is a required condition before a user can create posts within that community.

The system checks subscription status before allowing post creation in any community.

If the user is not subscribed to the target community, the post creation request is rejected.

The error message indicates that subscription to the community is required before posting.

Users can be redirected to the community page to subscribe before attempting to post.

If the requested community does not exist, the post creation request is rejected.

If the user's account is deleted, the subscription prerequisite cannot be satisfied and post creation is not possible.

If the community has been deleted or is no longer accessible, the subscription prerequisite cannot be satisfied and post creation is not possible.

### Community Subscription Requirement

The system enforces that users cannot post in a community unless they have first subscribed to it.

This requirement applies to all post types: text posts, link posts, and image posts.

The subscription requirement is validated at the time of post creation, before any content is saved.

The system verifies that the subscription status is active at the moment of post creation.

Users who are banned from a community cannot subscribe and therefore cannot post in that community.

The subscription requirement does not apply to viewing content in a community.

Guest users cannot post in any community, regardless of subscription status.

### Subscription Status Tracking

The system tracks the subscription status for each user-community pair.

Subscription status can be active or inactive.

The system records the date and time when subscription status changes occur.

The system maintains the subscription history for each user.

Subscription status is used to determine which communities appear in the user's home feed.

The system updates the subscription count displayed on the community page when subscription status changes.

Subscription status changes are logged for auditing purposes.

The system ensures that subscription status changes are atomic and consistent.

### Free Subscription Changes

Users may subscribe and unsubscribe freely without restrictions on how many times they can switch their subscription status.

There is no limit to the number of subscriptions a user can have simultaneously.

There is no cooldown period between subscribing and unsubscribing.

There is no limit to the number of times a user can switch between subscribe and unsubscribe states for a given community.

Subscription changes are applied immediately and take effect without delay.

Users can subscribe to all available communities on the platform if they choose.

Subscription changes do not affect the user's ability to view or interact with previously viewed content.

## Post Rules

Users can create a post in any community they are subscribed to, but must first subscribe before posting. Every post requires a title—this is a mandatory field that cannot be left blank. A post must be one of three types: text post with text content, link post with a URL, or image post with an uploaded image. Users can edit their own posts after creating them to make changes or corrections. Users can delete their own posts at any time, which removes the post from all views. When viewing a single post, users see the title, full content, author username, community name, vote score, comment count, and when it was posted. Text posts contain text content, link posts contain a URL, and image posts contain an uploaded image.

### Post Creation and Subscription

A user can create a post in any community. Before creating a post, the user must be subscribed to that community. If the user is not subscribed, the post creation request is rejected.

### Required Post Title

Every post must have a title. The title is a required field that cannot be left blank. If the title is missing or empty when creating a post, the request is rejected.

### Post Type Selection

A post must be one of three types: text post, link post, or image post. The user must select the post type when creating the post. The post type determines what content can be included.

### Text Post Content

A text post contains text content. The text content is required for text posts. Users can create text posts with content describing any topic.

### Link Post URL

A link post contains a URL. The URL is required for link posts. The URL must be a valid web address that can be accessed.

### Image Post Upload

An image post contains an uploaded image. An image file must be uploaded for image posts. The uploaded image is required and must be a valid image file format.

### Own Post Editing Rights

A user can edit a post that they created. Only the author of a post can edit it. Other users cannot modify a post they did not create. The author can update the title and content at any time.

### Own Post Deletion Rights

A user can delete a post that they created. Only the author of a post can delete it. When a post is deleted, it is removed from all views and cannot be recovered. Users cannot delete posts created by others.

### Post Details Display

When viewing a single post, users see the title, full content, author username, community name, vote score, comment count, and when it was posted. All this information is displayed together on the post detail page.

## Vote Rules

Users can upvote a post to add 1 to its vote score or downvote to subtract 1 from its score. Each user can only cast one vote per post at any given time—they cannot have both an upvote and downvote simultaneously. Users can change their vote from upvote to downvote or vice versa at any time. Users can remove their vote entirely, which returns the post score to its previous state before their vote. The vote score is calculated as the total number of upvotes minus the total number of downvotes received. Karma is affected when users vote on posts or comments—an upvote increases karma by 1 and a downvote decreases it by 1. When a user removes their vote from a post or comment, the karma is adjusted accordingly to reflect the change. Karma can be negative if a user receives more downvotes than upvotes across all their content. The vote rules apply equally to posts and comments.

### Post Upvote Action

A user may upvote a post to express approval. Each upvote adds 1 to the post's vote score. A user can upvote a post only if they have not previously voted on it, or if they have removed their previous vote. The upvote action is available to logged-in members; guests cannot vote on posts.

### Post Downvote Action

A user may downvote a post to express disapproval. Each downvote subtracts 1 from the post's vote score. A user can downvote a post only if they have not previously voted on it, or if they have removed their previous vote. The downvote action is available to logged-in members; guests cannot vote on posts.

### Single Vote Per User

Each user may cast only one vote per post at any given time. A user cannot have both an upvote and a downvote on the same post simultaneously. If a user has already voted on a post, they must change their existing vote or remove it before casting a new vote. The system enforces this constraint to prevent vote manipulation.

### Vote Change Capability

A user who has already voted on a post may change their vote from upvote to downvote, or from downvote to upvote. When changing a vote, the post's score is adjusted accordingly: changing from upvote to downvote subtracts 2 from the score, and changing from downvote to upvote adds 2 to the score. The change is immediate and affects the visible vote score in real time.

### Vote Removal Action

A user may remove their vote from a post at any time. When a vote is removed, the post's vote score is adjusted to its state before that user voted. If the user had upvoted, the score decreases by 1; if they had downvoted, the score increases by 1. The removal action is permanent unless the user casts a new vote.

### Vote Score Calculation

A post's vote score is calculated as the total number of upvotes received minus the total number of downvotes received. The score is computed dynamically based on all current votes and reflects the aggregate user sentiment. The score may be zero, positive, or negative depending on the balance of upvotes and downvotes.

### Karma Vote Adjustment

When a user's post or comment receives an upvote, the post or comment author's karma score increases by 1. When a user's post or comment receives a downvote, the author's karma score decreases by 1. Karma is affected only by votes received on content, not by votes cast on other users' content. Karma can become negative if a user receives more downvotes than upvotes across all their content.

### Karma Removal Adjustment

When a user removes their vote from a post or comment, the karma score of the content author is adjusted accordingly. If the user removes an upvote, the author's karma decreases by 1. If the user removes a downvote, the author's karma increases by 1. This adjustment ensures karma accurately reflects the current state of all votes on the user's content.

### Negative Karma

A user's karma score may be negative if they have received more downvotes than upvotes across all their posts and comments. There is no minimum floor for karma; it can decrease indefinitely based on the balance of votes received. The negative karma state does not restrict user functionality; users with negative karma retain all platform privileges.

### Comment Voting Rules

The same voting rules that apply to posts also apply to comments. Users may upvote or downvote comments, with each user limited to one vote per comment at any time. Users may change or remove their vote on a comment following the same adjustment rules as post voting. Comment karma is calculated independently from post karma, but both contribute to the user's total karma score displayed on their profile.

## Comment Rules

Users can write a comment on any post to share their thoughts or reactions. Users can reply to any existing comment, creating a nested conversation thread. Replies can have their own replies with no depth limit, allowing for unlimited conversation nesting. Users can edit their own comments after posting to make corrections or updates. Users can delete their own comments at any time, which removes them from all views. Each comment displays the author username, content, vote score, time since posted, and any nested replies beneath it. The vote score for comments follows the same rules as post voting—users can upvote or downvote comments.

### Comment on Post

Users can write a comment on any post to share their thoughts or reactions. A comment requires text content; requests with empty content are rejected. A comment is automatically associated with the commenting user and the target post. If the post does not exist, the request is rejected. If the user is banned from the post's community, the request is rejected.

### Reply to Comment

Users can reply to any existing comment, creating a nested conversation thread. A reply is a comment that links to a parent comment. The reply follows the same content requirements as a top-level comment—text content is required. If the parent comment does not exist, the request is rejected. If the parent comment's post does not exist, the request is rejected.

### Unlimited Reply Depth

Replies can have their own replies with no depth limit, allowing for unlimited conversation nesting. There are no restrictions on how many levels of nested replies can exist within a comment thread. The system does not enforce any maximum nesting depth.

### Own Comment Editing

Users can edit their own comments after posting to make corrections or updates. The original comment author is the only user who can edit the comment. When a comment is edited, the updated content replaces the previous content in all views. Requests to edit a comment that is not owned by the requesting user are rejected. Requests to edit a deleted comment are rejected.

### Own Comment Deletion

Users can delete their own comments at any time, which removes them from all views. When a comment is deleted, it is no longer visible in comment lists, threads, or posts. The deletion is permanent; deleted comments cannot be recovered. Requests to delete a comment that is not owned by the requesting user are rejected. If the comment does not exist, the request is rejected.

### Nested Reply Structure

Comments can be organized into nested threads where replies display beneath their parent comment. A comment can have multiple direct replies, and each reply can have its own nested replies. The thread structure is preserved and displayed with proper indentation or visual hierarchy. When viewing a post's comments, users see the complete nested conversation structure.

### Comment Content Display

Each comment displays the author username, content, vote score, time since posted, and any nested replies beneath it. The comment author is shown as the username of the user who wrote the comment. The content displays the full text of the comment. The vote score shows the current tally of upvotes minus downvotes. The time display shows when the comment was originally posted, not when it was last edited.

### Comment Vote Score

The vote score for comments follows the same rules as post voting—users can upvote or downvote comments. When someone upvotes a comment, the comment's vote score increases by 1. When someone downvotes a comment, the comment's vote score decreases by 1. When someone removes their vote, the vote score adjusts accordingly. Each user can only vote once per comment. Users can change their vote from upvote to downvote or vice versa. If the post that the comment belongs to does not exist, the request is rejected.

## ModeratorRole Rules

The user who creates a community automatically becomes its owner with the highest authority level. The owner can add moderators to help manage the community and delegate certain responsibilities. The owner can remove moderators from their community at any time if needed. Moderators can add other moderators to the community but cannot remove them. Moderators cannot remove the owner from their position under any circumstances. Moderators cannot remove other moderators—only the owner has the power to remove moderators. Moderators can delete any post or comment in their community. Moderators can ban users from their community and view the list of banned users. Moderators can view all reports for their community in a centralized report management area.

### Owner Role and Authority

The user who creates a community automatically becomes the owner of that community with the highest authority level.

The owner has complete control over the community and can perform all moderation actions available to moderators, plus the exclusive ability to remove moderators.

### Moderator Assignment and Removal

The owner can add moderators to their community to help with management responsibilities.

The owner can remove any moderator from their community at any time.

Moderators can add other moderators to the community to assist with management.

Moderators cannot remove the owner from their position under any circumstances.

Moderators cannot remove other moderators; only the owner has the power to remove moderators from the community.

### Content Moderation

Moderators can delete any post in their community regardless of who created it.

Moderators can delete any comment in their community regardless of who wrote it.

### User Moderation

Moderators can ban users from their community. When a user is banned, they cannot create posts or comments in that community.

Moderators can unban users who were previously banned from their community.

Moderators can view the list of banned users in their community. Banned users can still view content in the community but cannot participate by posting or commenting.

### Report Management

Moderators can view all reports submitted for their community in a centralized report management area.

Each report shows the reported content, who reported it, and the reason provided by the reporter.

Moderators can approve a report, which deletes the reported content.

Moderators can dismiss a report, which keeps the content and removes the report from the report list.

## BanRecord Rules

Moderators can ban users from their community, which prevents those users from creating posts or comments in that specific community. Moderators can unban previously banned users to restore their ability to interact with the community. Moderators can view the list of all users who are currently banned from the community. Banned users retain the ability to view content in the community but cannot create posts or comments while banned. Each ban record includes the reason for the ban and when it was applied for transparency. Users who are banned from a community cannot participate in posting or commenting until the ban is removed by a moderator. Moderators can track when bans were applied using the ban timestamp.

### Moderator Ban User Action

Moderators can ban users from their community. When a moderator bans a user, the user is immediately prevented from creating new posts in that community. When a moderator bans a user, the user is immediately prevented from writing new comments in that community. A ban applies only to the specific community where the ban is issued, not to other communities. Moderators can only ban users in communities where they have moderator permissions. If the user to be banned does not exist, the ban request is rejected. If the moderator does not have permission to ban users in the community, the ban request is rejected.

### Moderator Unban User Action

Moderators can unban users who were previously banned from their community. When a moderator unbans a user, the user's ability to create posts and comments in that community is immediately restored. A ban record must exist for the user before a moderator can perform an unban action. Unban actions permanently remove the ban for that specific community. If the user is not currently banned from the community, the unban request is rejected. If the moderator does not have permission to manage bans in the community, the unban request is rejected.

### Ban List Viewing

Moderators can view a complete list of all users currently banned from their community. The ban list displays all active ban records for the community. Moderators can filter the ban list by specific users or search by username. The ban list shows the banned user, ban reason, and when the ban was applied. Only moderators and owners of the community can access the ban list. Guests and non-moderator members cannot view the ban list.

### Banned User Restrictions

Banned users cannot create new posts in the community from which they are banned. Banned users cannot write new comments in the community from which they are banned. Banned users cannot reply to existing comments in the community from which they are banned. Banned users cannot create new communities in the platform. The restrictions apply immediately upon ban activation and remain in effect until the ban is removed. A banned user attempting to create restricted content will have the action rejected with an error.

### Banned User Viewing Rights

Banned users retain full viewing access to content in the community from which they are banned. Banned users can read posts and comments in the community. Banned users can view the community's main page and browse existing content. Banned users can access other users' profiles in the community. Banned users cannot view the ban list even though they are listed in it. Viewing rights remain unchanged regardless of ban status.

### Ban Reason Tracking

Every ban record must include a reason text that explains why the ban was issued. The ban reason must be provided by the moderator at the time the ban is created. The ban reason is displayed in the ban list for transparency and accountability. The ban reason cannot be modified or deleted after the ban is issued. If no reason is provided, the ban creation is rejected.

### Ban Timestamp Tracking

Each ban record automatically includes a timestamp indicating when the ban was applied. The ban timestamp is recorded at the exact moment the ban action is completed. The timestamp cannot be modified by moderators or any other user. The ban timestamp is displayed in the ban list for audit and accountability purposes. Moderators can sort the ban list by ban timestamp to see the most recent bans first. The ban timestamp allows tracking of ban duration and history.

### Ban Removal and Access Restoration

When a ban is removed through the unban action, all access restrictions are immediately lifted. The user's ability to create posts is restored immediately upon unban. The user's ability to write comments is restored immediately upon unban. The user's ability to reply to comments is restored immediately upon unban. All previous posts and comments made by the user before the ban remain visible. The ban record is removed from the ban list upon unban action. If the user attempts to post or comment before the unban completes, the action is rejected.

## Report Rules

Users can report any post or comment on the platform when they believe it violates community standards. When reporting content, users must provide a reason in text form explaining why they are reporting it. Moderators can view all reports for their community in a centralized report management area. Each report displays the reported content, the user who reported it, and the reason provided by the reporter. Moderators can approve a report, which results in the reported content being deleted from the platform. Moderators can dismiss a report, which keeps the content in place and removes the report from the report list. Dismissed reports are no longer visible in the active reports and the content remains untouched. Reports are scoped to individual communities—moderators only see reports for their own community.

### Report Actions

Users can report any post or comment on the platform when they believe it violates community standards.

To report a post, a user selects the report option and provides a text reason explaining why they are reporting the content.

To report a comment, a user selects the report option and provides a text reason explaining why they are reporting the content.

The report reason field is required. Users cannot submit a report without providing a reason.

A user can report the same post or comment only once. If they have already reported it, they cannot submit another report for the same content.

### Moderator Report View

Moderators can view all reports for their community in a centralized report management area.

Each report displayed to moderators shows: the reported content, the user who reported it, and the reason provided by the reporter.

Moderators can only view reports for communities where they hold moderator privileges. Reports from other communities are not visible.

Reports are organized by the content type (post or comment) and the community they belong to.

### Report Approval Action

Moderators can approve a report for any reported post or comment in their community.

When a report is approved, the reported content is deleted from the platform. This applies to both posts and comments.

Approved reports are marked as resolved and removed from the active reports list.

The deletion is permanent and cannot be undone by moderators or users.

### Report Dismissal Action

Moderators can dismiss a report for any reported post or comment in their community.

When a report is dismissed, the reported content remains in place and is not deleted.

Dismissed reports are removed from the active report list and are no longer visible in the reports area.

The content that was dismissed is not affected and remains visible to users according to normal visibility rules.

### Community Report Isolation

Reports are scoped to individual communities. Moderators only see reports for their own communities.

A moderator for one community cannot view, approve, or dismiss reports for a different community.

Each community maintains its own separate report queue, isolated from other communities.

The report reason and reporter information are kept confidential and are only visible to moderators of that specific community.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Post Sorting

Posts in all feeds support four primary sorting options: hot, new, top, and controversial.

The "hot" sort displays recent posts with many upvotes first, balancing recency and popularity.

The "new" sort displays most recently created posts first, regardless of vote score.

The "top" sort displays posts with the highest vote score first. When sorting by top, users may optionally filter by time period: today, this week, this month, this year, or all time.

The "controversial" sort displays posts that have received many votes but have a score close to zero, indicating polarized opinions.

The same sorting options apply to comments on a post, with three options: best, new, and controversial. The "best" sort displays comments with the highest vote score first.

### Post Filtering

Posts in feeds can be filtered by the following criteria:

For the "top" sort, posts can be filtered by time period: today, this week, this month, this year, or all time. When a time period is selected, only posts created within that period are included in the results.

For the home feed, posts are automatically filtered to include only posts from communities the user has subscribed to. Guests cannot access the home feed.

For the popular feed, all posts from all communities are included, regardless of subscription status.

For the community feed, posts are automatically filtered to include only posts from the selected community.

When searching for communities, users can filter the community list by entering a search term in the name field. Only communities whose names match the search term are returned.

### Pagination

All feeds are paginated to display posts in manageable chunks.

Each page displays a fixed number of posts. When the user requests the next page, additional posts are loaded.

If no more posts are available, the system indicates that there are no more results.

Comments on a post are also paginated when the total number of comments exceeds the display limit.

When a user is viewing a community list, the list is paginated. Each page displays a fixed number of communities. Users can navigate to subsequent pages to view additional communities.

When a user is viewing their list of subscribed communities, the list is paginated. Each page displays a fixed number of subscriptions.

When a moderator is viewing the list of banned users for a community, the list is paginated if there are more banned users than can be displayed on a single page.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### User Account Validation Errors

When a user attempts to sign up with an email address that is already registered in the system, the request is rejected and the user is notified that the email is in use. When a user attempts to sign up with a username that is already taken, the request is rejected and the user is prompted to choose a different username. When a user attempts to log in with incorrect credentials, the request is rejected and an authentication failure message is displayed. When a user attempts to log in with an email address that does not exist in the system, the request is rejected with a generic authentication failure message to prevent information disclosure.

### Account Modification Errors

When a user attempts to change their password without providing the current password, the request is rejected. When a user attempts to delete their account while having open moderation actions or pending reports, the request is rejected until all pending actions are resolved. When a user attempts to access a deleted account, access to the account is denied.

### Profile View and Edit Errors

When a user attempts to view another user's profile, the request is successful and the profile is displayed regardless of whether the viewing user has a subscription relationship with the profile owner. When a user attempts to edit their own profile, all edits are permitted as long as the new display name is not already taken by another user. When a user attempts to upload an avatar that exceeds the maximum file size limit, the upload is rejected. When a user attempts to upload an avatar with an unsupported file format, the upload is rejected.

### Community Creation Errors

When a user attempts to create a community with a name that already exists, the request is rejected. When a user attempts to create a community with an empty description, the request is rejected. When a user attempts to upload a community icon that exceeds the maximum file size limit, the upload is rejected. When a user attempts to upload a community icon with an unsupported file format, the upload is rejected.

### Community Browsing Errors

When a user attempts to view a community that has been deleted, access to the community is denied. When a user attempts to browse all communities, communities that have been deleted are not included in the results. When a user attempts to search for communities, deleted communities are not included in the search results.

### Subscription Management Errors

When a user attempts to subscribe to a community, the subscription is created successfully. When a user attempts to subscribe to a community they are already subscribed to, the request is rejected with a message indicating they are already a subscriber. When a user attempts to subscribe to a deleted community, the request is rejected. When a user attempts to unsubscribe from a community they are not subscribed to, the request is rejected.

### Post Creation Errors

When a user attempts to create a post in a community they are not subscribed to, the request is rejected and the user is required to subscribe first. When a user attempts to create a post in a community where they are banned, the request is rejected. When a user attempts to create a post with an empty or missing title, the request is rejected. When a user attempts to create a text post without providing content, the request is rejected. When a user attempts to create a link post without providing a URL, the request is rejected. When a user attempts to create a link post with an invalid URL format, the request is rejected. When a user attempts to create an image post without providing an image, the request is rejected. When a user attempts to upload an image that exceeds the maximum file size limit, the upload is rejected. When a user attempts to upload an image with an unsupported file format, the upload is rejected.

### Post Modification and Access Errors

When a user attempts to edit a post that does not belong to them, the request is rejected. When a user attempts to edit a post in a community where they are banned, the request is rejected. When a user attempts to delete a post that does not belong to them, the request is rejected. When a user attempts to delete a post in a community where they are banned, the request is rejected. When a user attempts to view a post that has been deleted, access to the post is denied. When a user attempts to view a post in a community where they are banned, the request is rejected and the user is notified they cannot view content.

### Post Voting Errors

When a user attempts to upvote a post they have already upvoted, the request is rejected as no change is needed. When a user attempts to upvote a post they have already downvoted, the request is successful and changes the vote from downvote to upvote. When a user attempts to upvote a post they have not yet voted on, the request is successful. When a user attempts to downvote a post they have already downvoted, the request is rejected as no change is needed. When a user attempts to downvote a post they have already upvoted, the request is successful and changes the vote from upvote to downvote. When a user attempts to downvote a post they have not yet voted on, the request is successful. When a user attempts to remove their vote from a post they have not voted on, the request is rejected. When a user attempts to vote on a post they do not have access to, the request is rejected.

### Post Creation Validation

When a user attempts to create a post and the community does not exist, the request is rejected. When a user attempts to create a post in a deleted community, the request is rejected.

### Post Feed Display Errors

When a user attempts to view a post in a feed, posts from communities where the user is banned are excluded from the results. When a user attempts to view a post in a feed, posts from communities the user is not subscribed to are excluded from the Home Feed. When a user attempts to view a post that does not exist, the request is rejected. When a user attempts to view a deleted post, the request is rejected.

### Comment Creation Errors

When a user attempts to write a comment on a post, the comment is created successfully. When a user attempts to reply to a comment, the reply is created successfully with no depth limit. When a user attempts to write a comment on a post in a community where they are banned, the request is rejected. When a user attempts to write a comment on a deleted post, the request is rejected. When a user attempts to write a comment with empty content, the request is rejected.

### Comment Modification and Access Errors

When a user attempts to edit a comment that does not belong to them, the request is rejected. When a user attempts to edit a comment in a community where they are banned, the request is rejected. When a user attempts to delete a comment that does not belong to them, the request is rejected. When a user attempts to delete a comment in a community where they are banned, the request is rejected. When a user attempts to view a comment that has been deleted, access to the comment is denied. When a user attempts to view a comment on a post they do not have access to, the request is rejected.

### Comment Voting Errors

When a user attempts to upvote a comment they have already upvoted, the request is rejected as no change is needed. When a user attempts to upvote a comment they have already downvoted, the request is successful and changes the vote from downvote to upvote. When a user attempts to upvote a comment they have not yet voted on, the request is successful. When a user attempts to downvote a comment they have already downvoted, the request is rejected as no change is needed. When a user attempts to downvote a comment they have already upvoted, the request is successful and changes the vote from upvote to downvote. When a user attempts to downvote a comment they have not yet voted on, the request is successful. When a user attempts to remove their vote from a comment they have not voted on, the request is rejected. When a user attempts to vote on a comment they do not have access to, the request is rejected.

### Comment Display and Sorting Errors

When a user attempts to view comments on a post, the comments are sorted according to the selected sorting option. When a user attempts to view comments on a deleted post, access to the comments is denied. When a user attempts to view comments on a post in a community where they are banned, the request is rejected.

### Moderator Addition Errors

When the owner attempts to add a moderator, the moderator role is assigned successfully. When the owner attempts to add a moderator who is already a moderator, the request is rejected. When the owner attempts to add a moderator to a deleted community, the request is rejected. When a moderator attempts to add another moderator, the action is successful. When a moderator attempts to add the owner as a moderator, the request is rejected. When a moderator attempts to add themselves as a moderator, the request is rejected. When a moderator attempts to add a moderator who is already a moderator, the request is rejected. When a moderator attempts to add a moderator to a deleted community, the request is rejected.

### Moderator Removal Errors

When the owner attempts to remove a moderator, the moderator role is revoked successfully. When the owner attempts to remove themselves as a moderator, the request is rejected. When the owner attempts to remove a moderator from a deleted community, the request is rejected. When a moderator attempts to remove the owner as a moderator, the request is rejected. When a moderator attempts to remove another moderator as a moderator, the request is rejected. When a moderator attempts to remove themselves as a moderator, the request is rejected. When a moderator attempts to remove a moderator from a deleted community, the request is rejected.

### Moderation Content Deletion Errors

When a moderator attempts to delete a post in their community, the post is deleted successfully. When a moderator attempts to delete a post in a community where they are not a moderator, the request is rejected. When a moderator attempts to delete a post in a deleted community, the request is rejected. When a moderator attempts to delete a comment in their community, the comment is deleted successfully. When a moderator attempts to delete a comment in a community where they are not a moderator, the request is rejected. When a moderator attempts to delete a comment in a deleted community, the request is rejected.

### Ban Management Errors

When a moderator attempts to ban a user from their community, the ban record is created successfully. When a moderator attempts to ban a user who is already banned, the request is rejected. When a moderator attempts to ban the owner as a user, the request is rejected. When a moderator attempts to ban themselves, the request is rejected. When a moderator attempts to ban a user in a community where they are not a moderator, the request is rejected. When a moderator attempts to ban a user in a deleted community, the request is rejected. When a moderator attempts to unban a user who is not banned, the request is rejected. When a moderator attempts to unban a user in a community where they are not a moderator, the request is rejected. When a moderator attempts to unban a user in a deleted community, the request is rejected. When a moderator attempts to view the list of banned users in a community where they are not a moderator, the request is rejected. When a moderator attempts to view the list of banned users in a deleted community, the request is rejected.

### Deleted Entity Access

When a user attempts to view a post and the post is associated with a deleted community, access to the post is denied. When a user attempts to view a comment and the comment is associated with a deleted post, access to the comment is denied. When a user attempts to perform any action on a community that has been deleted, the request is rejected with a message indicating the community no longer exists.

### Report Creation Errors

When a user attempts to report a post, they must provide a reason for the report. When a user attempts to report a post without providing a reason, the request is rejected. When a user attempts to report a comment, they must provide a reason for the report. When a user attempts to report a comment without providing a reason, the request is rejected. When a user attempts to report a post that does not exist, the request is rejected. When a user attempts to report a comment that does not exist, the request is rejected. When a user attempts to report a post in a community where they are banned, the request is rejected.

### Moderator Report Handling Errors

When a moderator attempts to view reports for their community, the reports are displayed. When a moderator attempts to view reports for a community where they are not a moderator, the request is rejected. When a moderator attempts to view reports for a deleted community, the request is rejected. When a moderator attempts to approve a report, the report is approved and the content is deleted. When a moderator attempts to dismiss a report, the report is dismissed and removed from the report list. When a moderator attempts to approve a report for content that has already been deleted, the request is rejected. When a moderator attempts to approve a report for content they do not have access to, the request is rejected. When a moderator attempts to dismiss a report for content they do not have access to, the request is rejected.

### Authentication and Session Errors

When a user attempts to access the system without being logged in, access to member-only features is denied. When a user attempts to perform an action that requires authentication, the request is redirected to the login page. When a user's session expires, all requests are rejected and the user is redirected to re-authenticate. When a user's account is deleted, all their sessions are terminated and access is denied.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Type Validation

Users can upload avatar images for their profile, icon images for communities they create, and image posts. The system validates each uploaded file to ensure it is an image file. Files that do not meet the image format requirements are rejected and cannot be uploaded.

When a file is rejected due to format validation, the user receives a notification explaining that the file type is not supported. The user must select a valid image file and retry the upload.

Each image upload is associated with the user performing the action. Avatar images are linked to a user's profile. Community icon images are linked to a specific community. Image post content is linked to a specific post.

### Virus Scanning

All uploaded files are scanned for malicious content before being accepted by the system. The virus scanning process runs automatically on every file upload.

If a file is detected to contain malicious content, the upload is rejected. The file is not stored in the system, and the user receives a notification that the file failed security validation. The user cannot upload that specific file again.

The system maintains records of rejected files that failed virus scanning for security monitoring purposes. Moderators and administrators may review these records to identify patterns of abuse or coordinated malicious uploads.

Files that pass virus scanning are marked as safe and proceed to be stored in the system.

### Content Type Restrictions

Only image file types are permitted for avatar uploads, community icons, and image posts. The system enforces these restrictions at the time of upload to prevent non-image files from being stored.

When a user attempts to upload a non-image file, the system immediately rejects the file and displays an error message. The error message specifies that only image files are allowed and provides guidance on acceptable formats.

The system does not permit uploading files with excessive size beyond what is reasonable for image content. If an image file exceeds the acceptable size threshold, the upload is rejected with a message indicating the file is too large. The user may resize the image and retry the upload.

All uploaded images undergo content validation to ensure they contain valid image data. Corrupted or invalid image files are rejected.

### File Retention Policies

Uploaded files are retained for as long as the associated entity exists in the system. When a user deletes their account, all associated avatar images are permanently removed from the system. The deletion of a user account includes immediate removal of their avatar file.

When a community is deleted, all associated icon images are permanently removed from the system. The deletion of a community includes immediate removal of its icon file.

When a post containing an image is deleted, the associated image file is permanently removed from the system. The deletion of a post includes immediate removal of its image content.

The system maintains file storage records for audit purposes. These records indicate which files are associated with which entities and when they were uploaded. However, no backup copies of deleted files are retained after permanent deletion.

Moderators and administrators have access to file storage records for operational and compliance purposes. These records are retained according to organizational policy.