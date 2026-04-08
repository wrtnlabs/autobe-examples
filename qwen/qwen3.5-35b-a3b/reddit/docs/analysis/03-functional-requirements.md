**redditPlatform — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Users can sign up for an account by providing an email address, password, and choosing a unique username that no other user has selected. When logging in, users authenticate using their email and password credentials. Users have the ability to change their password if needed for security purposes. Users can delete their own account, which automatically removes all their posts and comments from the platform. The system must ensure usernames remain unique across all accounts. During account creation, the system validates that the email and username are not already in use. Account deletion is irreversible and permanently removes the user and all their associated content from the platform. Users cannot access the platform without an active account.

### User Account Creation

Users can create an account by providing an email address, password, and choosing a unique username. During registration, users must also provide a display name for their profile. The system validates that the email address is in a valid format and is not already registered. The system validates that the chosen username is not already in use by another account. The password must meet security requirements as defined in the account security policy. Upon successful registration, the user account is created with an initial karma score of zero and an empty profile.

### Unique Username Validation

Every username must be unique across all user accounts in the system. When a user attempts to register with a username, the system checks if that username is already taken. If the username is available, the registration proceeds. If the username is already taken, the registration request is rejected and the user is notified to choose a different username. Username uniqueness is enforced during account creation and cannot be bypassed under any circumstances. After registration, users may change their username to another unique value if needed.

### User Login

Users can log in to the system by entering their email address and password credentials. The system validates the provided email against registered accounts. The system validates the provided password against the stored password for that account. When both credentials are valid, the user is authenticated and granted access to the platform. If the email address is not found in the system, the login request is rejected. If the email is found but the password is incorrect, the login request is rejected. Logged-in users can access private features including creating posts and comments, voting on content, and viewing personalized feeds.

### Password Change

Users can change their password at any time after logging in. To change the password, users must provide their current password for verification. Users must also provide the new password they wish to set, which must meet the same security requirements as during registration. Once verified, the system updates the user's password and the new password becomes effective immediately. If the current password provided does not match the stored password, the change request is rejected. Users cannot set a new password that is the same as their current password.

### Account Deletion

Users can delete their own account at any time through the account settings. When a user initiates account deletion, the system permanently removes the user account and all associated content from the platform. This includes deleting all posts created by the user, all comments written by the user, all votes cast by the user, all subscriptions to communities, and all reports submitted by the user. The deletion is irreversible and cannot be undone. The user's profile, display name, and avatar are also permanently removed. Users must confirm account deletion before it is executed. After deletion, the user can no longer log in and all content previously attributed to the user is removed from public visibility.

## Profile Operations

Each user has a profile that includes a display name, bio text, and an avatar image that represents them on the platform. Users can edit their own profile information including changing their display name, updating their bio text, and uploading a new avatar image. Any user on the platform can view another user's public profile page. A user's profile page displays their display name, bio, avatar image, total karma score, a list of all posts they have created, and a list of all comments they have written. Profile information helps users build their identity and reputation within the community. Users must be logged in to edit their own profile. Profile information is publicly visible to all users including those who are not logged in.

### User Profile Structure

Each user has a profile that contains a display name, bio text, and an avatar image.

The profile represents the user's public identity on the platform and is associated with their account.

The profile information is publicly visible to all users, including those who are not logged in.

A user's profile page also displays their total karma score, a list of all posts they have created, and a list of all comments they have written.

### Viewing User Profiles

Any user or guest can view any other user's public profile page.

When viewing a user's profile, the following information is displayed:
- Display name
- Bio text (if provided)
- Avatar image
- Total karma score
- List of all posts authored by this user
- List of all comments written by this user

If a user does not have a bio text or avatar image, those fields are not displayed.

If the requested user profile does not exist, the request is rejected.

### Profile Ownership Requirement

Only the owner of a profile can edit that profile.

When attempting to edit another user's profile, the request is rejected.

The system verifies profile ownership before allowing any modifications.

Users must be logged in to access profile editing functionality.

### Display Name Modification

Users can modify their display name to update how they are identified on the platform.

Users must be logged in to change their display name.

The system checks for display name uniqueness across all users.

If the requested display name is already taken by another user, the request is rejected.

Users can change their display name at any time while logged in.

### Bio Text Editing

Users can update their bio text to describe themselves or provide additional information.

Users must be logged in to edit their bio text.

The bio text is optional and can be added, modified, or removed by the profile owner.

Users can set, modify, or remove their bio text at any time while logged in.

### Avatar Image Management

Users can upload and manage their avatar image to visually represent themselves on the platform.

Users must be logged in to upload an avatar image.

Users can upload a new avatar image, replace their existing avatar, or remove their avatar (showing a default representation).

Requests to upload invalid or unsupported image formats are rejected.

Users can change their avatar image at any time while logged in.

### Karma Score Display

Each user's profile displays their total karma score as a single number.

The karma score shown in the profile is the current cumulative total, reflecting all upvotes and downvotes the user has received on their posts and comments.

The karma score can be positive, negative, or zero, depending on the user's voting history.

The karma score is automatically updated when votes are added, removed, or changed.

### User Posts List Display

A user's profile page displays a list of all posts they have created across all communities.

Each post in the list shows:
- Post title
- Community name where posted
- Vote score
- Comment count
- Time since posted
- Post type indicator (text, link, or image)

The posts list includes all posts created by the user, regardless of the community settings or the user's current subscription status.

If the user has no posts, an empty list is displayed.

### User Comments List Display

A user's profile page displays a list of all comments they have written across all posts.

Each comment in the list shows:
- The post where the comment was written
- Comment content (truncated if long)
- Vote score
- Time since posted

The comments list includes all comments created by the user, regardless of the post or community settings.

If the user has no comments, an empty list is displayed.

## Community Operations

Any user can create a new community on the platform. When creating a community, the user must provide a unique name, a description text, and an icon image for the community. The user who creates a community automatically becomes its owner with highest authority. Users can browse a list of all communities available on the platform. Users can search for communities by name to find specific communities of interest. Each community displays its total number of subscribers. The community creator maintains ownership rights and administrative control over their community. Communities serve as the central organization for grouping related posts and discussions.

### Community Creation

Any user on the platform can create a new community. To create a community, the user must provide a unique name, a description text, and an icon image for the community. When the community is created, the user automatically becomes the owner of that community with the highest level of authority.

### Community Naming and Description

The community name must be unique across the entire platform. No two communities can share the same name. If a user attempts to create a community with a name that already exists, the creation request is rejected.

The community description is required and must contain meaningful text. An empty description is not allowed.

The community icon image is required and must be uploaded as part of the community creation process. If no icon image is provided, the request is rejected.

### Community Ownership

The user who creates a community automatically becomes its owner. The owner has the highest level of authority within that community. The owner maintains full administrative control over the community and can perform all community management actions.

The owner role is permanently assigned at the time of community creation and cannot be removed except when the owner transfers ownership to another user.

### Browsing Communities

Users can browse a complete list of all communities available on the platform. The list displays basic information for each community including the community name, description preview, and subscriber count.

Each community in the list shows its total number of subscribers to help users understand the community's size and activity level.

The browsing experience allows users to discover communities they may want to join based on the information displayed.

### Community Search

Users can search for communities by name to find specific communities of interest. The search function allows users to enter text that matches against community names.

The search results display communities whose names contain the search terms, showing the community name, description preview, subscriber count, and a subscribe button for each result.

### Subscriber Count Display

Each community displays its total subscriber count on its main page. This count represents all users who have subscribed to the community.

The subscriber count updates in real-time as users subscribe or unsubscribe from the community.

The subscriber count is visible to all users, including guests who have not logged into the platform.

### Ownership Rights

The owner of a community has special ownership rights that include exclusive administrative privileges. The owner can manage moderators, ban users, and make final decisions on community moderation issues.

Only the owner can remove other moderators from the community. Only the owner can demote moderators back to regular member status.

The owner's identity is displayed on the community page to make it clear who has ultimate authority over the community.

## Subscription Operations

Users can subscribe to any community they wish to follow and receive updates from. Users can unsubscribe from any community they are currently subscribed to. Users can view a complete list of all communities they have subscribed to. Subscribing to a community is a prerequisite for creating posts within that community. The subscription status determines whether a user has posting privileges in a specific community. Users manage their subscriptions through their community preferences or directly from the community page. When a user subscribes, they become eligible to participate in that community by posting and commenting. Unsubscribing removes the user from the community but does not delete their existing posts or comments.

### Subscribing to a Community

Users can subscribe to any community by selecting the subscribe option on the community page. A subscription grants the user posting and commenting privileges in that community. Upon successful subscription, the community's subscriber count increases by one. The subscription is immediately effective, allowing the user to participate in the community right away. Guests cannot subscribe to communities—subscription requires an active account. A user who is already subscribed to a community cannot subscribe again—the system prevents duplicate subscriptions.

### Unsubscribing from a Community

Users can unsubscribe from any community they are currently subscribed to by selecting the unsubscribe option on the community page. When a user unsubscribes, they lose the ability to create new posts or comments in that community. Existing posts and comments created by the user remain visible and unchanged. Upon successful unsubscription, the community's subscriber count decreases by one. A user cannot unsubscribe from a community they are not subscribed to—the system prevents this action. Users who are banned from a community are automatically removed and cannot manually unsubscribe.

### Viewing List of Subscribed Communities

Users can view a complete list of all communities they are currently subscribed to from their profile or community preferences page. The list displays each subscribed community's name, description, icon, and current subscriber count. Users can navigate to any community in their subscribed list to view its content. Users who are not subscribed to any communities see a message prompting them to subscribe. The subscription list updates automatically when the user subscribes or unsubscribes.

### Community Subscription Privileges

Subscribing to a community grants the user the ability to create posts and comments in that community. Subscribers can participate in discussions, vote on posts and comments, and report inappropriate content. Non-subscribers can view posts in the community feed but cannot create content. Moderators and owners have posting privileges regardless of subscription status. Banned users lose all posting and commenting privileges even if they were subscribed before the ban. The subscription status is checked each time a user attempts to create content in a community.

## Post Operations

Users can create a post in any community they are subscribed to. Every post must have a title that describes the content. Posts can be one of three types: text posts with text content, link posts with a URL, or image posts with an uploaded image. Users can edit their own posts to update the content. Users can delete their own posts from the community. When viewing a single post, users see the title, full content, author username, community name, vote score, comment count, and when it was posted. The post type determines what additional content is displayed alongside the title. Posts are the primary way users share information and start discussions within communities.

### Post Creation

Users can create a post in any community they are subscribed to. Every post must have a title that describes the content being shared. The title is required and cannot be empty. Users select one of three post types when creating: text post, link post, or image post.

For a text post, users must provide text content. The text content cannot be empty.

For a link post, users must provide a URL. The URL points to external content and the system displays the domain name when listing posts.

For an image post, users upload an image file. The uploaded image is displayed as a thumbnail when viewing post lists.

If the user is not subscribed to the community, the post creation request is rejected. If the post title is empty, the request is rejected. If the post type is text and the content is empty, the request is rejected. If the post type is link and no URL is provided, the request is rejected. If the post type is image and no image is uploaded, the request is rejected.

### Post Viewing

When viewing a single post, users see the post title, full content, author username, community name, vote score, comment count, and when it was posted.

The author username identifies who created the post and is always displayed.

The community name shows which community the post belongs to and is always displayed.

The vote score displays the current vote total for the post.

The comment count shows the total number of comments on the post.

The timestamp displays when the post was created, shown as time since posting (e.g., "3 hours ago").

For text posts, the full text content is displayed below the title.

For link posts, the full URL is displayed along with the domain name.

For image posts, the uploaded image is displayed in full size.

All posts are visible to users regardless of subscription status, subject to community access restrictions.

### Post Editing

Users can edit their own posts to update the title or content. Only the post author can edit a post. When editing, users can change the title, text content, or replace the image. For link posts, users can update the URL.

The title must remain required after editing and cannot be left empty.

The post type cannot be changed during editing (a text post cannot become a link post or image post).

If the user is not the author of the post, the edit request is rejected. If the post does not exist, the request is rejected. If editing results in an empty title, the request is rejected.

### Post Deletion

Users can delete their own posts. Only the post author can delete a post. When a post is deleted, it is removed from all community feeds and is no longer visible to any users. All comments on the deleted post are also deleted. The deletion is permanent and cannot be undone.

Users can also delete their own comments when they delete a post, which removes all nested replies to those comments.

If the user is not the author of the post, the delete request is rejected. If the post does not exist, the request is rejected. Moderators can also delete posts in their community, regardless of authorship.

## Comment Operations

Users can write a comment on any post to participate in the discussion. Users can reply to any existing comment to continue the conversation. Replies can have their own replies, creating nested discussions with no depth limit. Users can edit their own comments to correct mistakes or update information. Users can delete their own comments to remove them from the discussion. Each comment displays the author username, the comment content, vote score, time since posted, and any nested replies. Comments enable threaded discussions where users can respond to specific points made by others. Comment threads allow for organized and contextual conversations within posts.

### Comment Creation

Users can write a comment on any post to participate in the discussion. When creating a comment, the user provides the comment content (text only). The comment is automatically associated with the posting user and the target post. Anonymous users cannot create comments; users must be logged in. The comment content must not be empty; requests with empty content are rejected.

### Comment Replies

Users can reply to any existing comment to continue the conversation. A reply is created by specifying the parent comment. Replies can themselves have replies, creating nested discussions with no depth limit. Users must be logged in to reply to comments. Replies follow the same content requirements as top-level comments (non-empty text).

### Comment Editing

Users can edit their own comments to correct mistakes or update information. Only the original author can edit a comment; attempts to edit another user's comment are rejected. Edited comments retain their original creation timestamp; there is no separate edit timestamp displayed to readers.

### Comment Deletion

Users can delete their own comments to remove them from the discussion. Only the original author or a community moderator can delete a comment in that community. Deleted comments are no longer visible to other users. Deletion is permanent; deleted content cannot be recovered.

### Comment Display

When viewing a comment, users see the author username, the comment content, vote score, and time since posted. Comments are displayed with nested replies shown hierarchically beneath their parent comments. The vote score reflects the net number of upvotes minus downvotes. Users can view the nested comment thread structure with all levels of replies visible in a tree layout. Comment interaction options (upvote, downvote, reply, edit, delete) are available based on user permissions and ownership.

## Vote Operations

Users can upvote a post or comment which adds 1 to its vote score. Users can downvote a post or comment which subtracts 1 from its vote score. Each user can only vote once per post or comment. Users can change their vote from upvote to downvote or vice versa at any time. Users can remove their vote entirely if they no longer wish to vote. Vote score is calculated as total upvotes minus total downvotes. When someone votes on your post or comment, your karma score increases or decreases by 1 accordingly. Users can adjust their voting if they change their opinion. Vote changes are reflected in real time across the platform.

### Post Upvoting

A logged-in member may upvote any post they can view. When a user upvotes a post, the post's vote score increases by one. The user's karma score increases by one if the post is authored by another user. A user may only hold one vote per post at any time. If the user already has an upvote on the post, the action is ignored. If the user has a downvote on the post, the downvote is changed to an upvote and the vote score is adjusted accordingly. The user can remove their upvote at any time.

### Post Downvoting

A logged-in member may downvote any post they can view. When a user downvotes a post, the post's vote score decreases by one. The user's karma score decreases by one if the post is authored by another user. A user may only hold one vote per post at any time. If the user already has a downvote on the post, the action is ignored. If the user has an upvote on the post, the upvote is changed to a downvote and the vote score is adjusted accordingly. The user can remove their downvote at any time.

### Comment Upvoting

A logged-in member may upvote any comment they can view. When a user upvotes a comment, the comment's vote score increases by one. The user's karma score increases by one if the comment is authored by another user. A user may only hold one vote per comment at any time. If the user already has an upvote on the comment, the action is ignored. If the user has a downvote on the comment, the downvote is changed to an upvote and the vote score is adjusted accordingly. The user can remove their upvote at any time.

### Comment Downvoting

A logged-in member may downvote any comment they can view. When a user downvotes a comment, the comment's vote score decreases by one. The user's karma score decreases by one if the comment is authored by another user. A user may only hold one vote per comment at any time. If the user already has a downvote on the comment, the action is ignored. If the user has an upvote on the comment, the upvote is changed to a downvote and the vote score is adjusted accordingly. The user can remove their downvote at any time.

### Single Vote Per Item

Each user may cast only one vote on any given post or comment at a time. A user cannot cast multiple votes on the same item. When a user attempts to vote again on an item they have already voted on, their previous vote is automatically replaced with their new vote. This applies to both posts and comments. A guest cannot vote on any post or comment.

### Changing a Vote

A user may change their vote on a post or comment from upvote to downvote or from downvote to upvote at any time. When a vote is changed, the vote score of the target is recalculated immediately. If a user changes their vote from upvote to downvote, the vote score decreases by two. If a user changes their vote from downvote to upvote, the vote score increases by two. The karma of the post or comment author is adjusted accordingly when a vote is changed. Vote changes are reflected in real time to all viewers of the post or comment.

### Removing a Vote

A user may remove their vote from any post or comment at any time. When a vote is removed, the vote score of the target is adjusted to reflect the removal. If a user removes an upvote, the vote score decreases by one. If a user removes a downvote, the vote score increases by one. The karma of the post or comment author is adjusted accordingly when a vote is removed. The user is no longer able to see their removed vote as active until they cast a new vote. Vote removals are reflected in real time to all viewers of the post or comment.

### Vote Score Display

The vote score for each post and comment is displayed to all users including logged-out guests. The vote score shows the total number of upvotes minus the total number of downvotes. The vote score is displayed in the feed list alongside the post or comment. When viewing a single post or comment, the vote score is prominently displayed. Users can see their own vote on posts and comments they have voted on, indicated by the vote direction. Vote scores are shown as positive, negative, or zero.

### Karma Adjustment from Votes

Every user has a single karma score that is displayed on their profile. When another user upvotes a post or comment authored by a user, that user's karma increases by one. When another user downvotes a post or comment authored by a user, that user's karma decreases by one. When a user changes their vote, the karma of the content author is adjusted to reflect the change. When a user removes their vote, the karma of the content author is adjusted accordingly. Karma may be negative if a user has received more downvotes than upvotes. Karma adjustments occur in real time when votes are cast, changed, or removed.

### Vote Visibility and Tracking

Users can see the vote score for all posts and comments they view. Users can see whether they have voted on a post or comment and the direction of their vote. Vote history tracks when each vote was cast, changed, or removed. Vote counts are visible in feed listings and on individual post and comment views. The vote score is always current and reflects the latest voting state.

## Report Operations

Users can report any post or comment they believe violates community guidelines. When reporting, users must provide a reason in text form explaining why they are reporting the content. Moderators can view all reports submitted for their community. Each report displays the reported content, who reported it, and the reason provided. Moderators can approve a report which deletes the reported content from the platform. Moderators can dismiss a report which keeps the content and removes it from the report list. Approved reports result in content removal while dismissed reports leave the content intact. Reports enable community members to flag inappropriate content for moderator review.

### User Reporting Content

Users can report any post or comment they believe violates community guidelines or is inappropriate.

When reporting content, users must provide a reason in text form explaining why they are reporting the item. The reason field is required and cannot be empty.

A user cannot report their own posts or comments. Users can only report content created by other users.

Once a report is submitted, the reported content remains visible to other users until a moderator reviews the report and takes action.

### Report Content and Details

Each report captures three key pieces of information:

1. The reported content: the system shows whether the report is for a post or a comment, and displays the title of the post or the text of the comment that is being reported.

2. The reporter identity: the system shows the username and profile information of the user who submitted the report.

3. The reason text: the system displays the exact reason text provided by the reporter when they submitted the report.

All three pieces of information are visible to moderators who review reports for their community.

### Moderator Report View

Moderators can view a list of all reports that have been submitted for their community.

Each report in the list shows: the reported content (post title or comment text), the username of the reporter, and the reason text provided.

Moderators can filter and sort the report list to find specific reports they need to review. The report list is organized by submission date, with the most recent reports appearing first.

Only moderators of the community where the reported content was posted can view reports for that content.

### Approving a Report

When a moderator reviews a report and determines that the reported content violates community guidelines, the moderator can approve the report.

Approving a report triggers immediate deletion of the reported content. The post or comment is permanently removed from the platform and is no longer visible to any users.

After approving a report, the system marks the report as approved and removes it from the active report review queue. The approval action is logged but not displayed to users.

The user who submitted the report is not notified when their report is approved. The content creator is not notified when their content is deleted due to report approval.

### Dismissing a Report

When a moderator reviews a report and determines that the reported content does not violate community guidelines, the moderator can dismiss the report.

Dismissing a report keeps the content visible on the platform. The post or comment remains unchanged and continues to be visible to all users who can access it.

After dismissing a report, the system marks the report as dismissed and removes it from the active report review queue.

The user who submitted the report is not notified when their report is dismissed. The content creator is not notified that their content was reported and the report was dismissed.

## Ban Operations

Moderators can ban users from their specific community. Moderators can unban users who were previously banned from the community. Moderators can view the complete list of banned users for their community. Banned users cannot create posts or comments in that specific community. Banned users can still view content in the community but cannot participate. Ban actions are specific to individual communities, not the entire platform. Moderators manage community membership through ban and unban actions. Ban status restricts user participation while maintaining their ability to read community content. Ban management helps moderators maintain community standards and quality.

### Banning a User from Community

A moderator can ban a user from their community. When banning, the moderator specifies a reason for the ban. The ban is immediately effective for the specified community. The banned user loses the ability to create posts or write comments in that community. The ban is specific to that community only and does not affect the user's activity in other communities. Banning can be performed by the community owner or by any moderator with appropriate permissions.

### Unbanning a User from Community

A moderator can unban a user from their community. When unbanning, the user's ban status is removed and they regain full participation rights in the community. Unbanning can only be performed by the community owner or by moderators who have permission to manage bans. Once unbanned, the user can immediately create posts and write comments again. The previous ban history is retained but no longer restricts participation.

### Viewing List of Banned Users

Moderators can view a complete list of all users banned from their community. The list displays each banned user's username and the reason for their ban. The list may also show the date when each user was banned. Only moderators with appropriate permissions for the community can view this list. Regular users and banned users cannot see the ban list.

### Banned User Posting Restriction

A banned user cannot create posts in the community where they are banned. When a banned user attempts to create a post, the request is rejected. The user receives a message indicating they are banned from the community. The restriction applies to all post types: text posts, link posts, and image posts. The banned user can still view posts in the community but cannot create new content.

### Banned User Commenting Restriction

A banned user cannot write comments in the community where they are banned. When a banned user attempts to write a comment, the request is rejected. The user receives a message indicating they are banned from the community. The restriction applies to both new comments and replies to existing comments. The banned user can still view comments in the community but cannot create new comment content.

### Banned User View-Only Access

A banned user retains view-only access to the community where they are banned. They can read posts, view comments, and browse community content normally. They can view their own profile and other users' profiles. They can access feeds including the community feed and popular feed. The ban only restricts writing content (posts and comments) in that specific community. Banned users can still post and comment in communities where they are not banned.

### Community-Specific Ban Actions

Ban actions are specific to individual communities and do not apply platform-wide. A user banned from one community can still create posts and comments in other communities. A user can be simultaneously banned from multiple communities. Each community maintains its own separate ban list. Ban status for one community does not affect membership or ban status in other communities.

### Moderator Ban Management

Moderators have the authority to manage bans within their community. The community owner can ban and unban users. Additional moderators can also ban and unban users. Moderators can view the list of banned users. Banned users cannot perform any moderation actions in the community. Only users with moderator or owner role can perform ban and unban operations. The system enforces role-based access control for all ban management actions.

### Ban Status Enforcement

The system automatically enforces ban status for all content creation actions. When a user attempts to create a post or comment, the system checks if the user is banned in that community. If banned, the action is blocked and an appropriate error message is displayed. The ban check occurs in real-time for every posting and commenting attempt. Ban status is evaluated at the time of the action, not at the time the ban was issued.

## ModeratorRole Operations

The user who creates a community automatically becomes the owner with the highest authority. The owner can add moderators to their community. The owner can remove moderators from their community. Moderators can add other users as moderators. Moderators cannot remove the owner from the community. Moderators cannot remove other moderators from the community. Owners maintain ultimate control over moderator assignments. This hierarchy ensures community ownership cannot be taken away by moderators. Moderator roles enable community management while preserving owner authority. The role structure supports collaborative community governance.

### ### Community Owner Role Definition

The user who creates a community automatically becomes the owner of that community. The owner has the highest level of authority within the community and maintains this position permanently. The owner's position is final and cannot be challenged or transferred by moderator actions. The owner's ultimate authority includes all moderator management operations.

### ### Moderator Role Definition

A moderator is a user granted management permissions within a specific community. Moderators work collaboratively to manage community content and users while the owner maintains ultimate control. A user can be a moderator in multiple different communities simultaneously. When a moderator role is assigned, it applies to a specific community and takes effect immediately.

### ### Moderator Assignment Operations

The owner can add any user as a moderator of their community. The owner can remove any moderator from their community at any time. Any moderator can add other users as moderators of the same community. Moderators can only add moderators to communities where they already hold moderator privileges. These assignment operations establish the community's management team.

### ### Hierarchy Restrictions

Moderators cannot remove the owner from a community under any circumstances. Moderators cannot remove other moderators from a community. Only the owner has the ability to remove moderators from a community. If a moderator attempts to remove the owner or another moderator, the action is rejected. This hierarchy ensures the owner maintains final authority over the community.

### ### Moderator Collaboration

Moderators can work together to manage community content and users. Multiple moderators can be added to a community by any single moderator. Moderators collaborate on community management tasks while the owner maintains oversight. The collaborative structure allows for distributed management without compromising owner authority.

### ### Community Governance Structure

The community governance structure consists of a single owner at the top and any number of moderators below. This structure ensures that the owner maintains final control while allowing delegated management responsibilities. The hierarchy prevents any moderator from undermining the owner's authority or removing fellow moderators. Permissions establish that the owner is always at the top with the ability to remove any moderator.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

When users sign up, the system must validate that the email address is properly formatted and not already in use. If a user attempts to create an account with an email that already exists, the registration will be rejected. The username must be unique across all users — duplicate username attempts are not allowed. During login, users receive an error if their email or password combination is incorrect. Password changes require the user to enter their current password first, and this validation prevents unauthorized changes. When a user requests account deletion, all their associated posts and comments are permanently removed along with their account. Users cannot delete accounts they do not own, and the system prevents deletion attempts from other accounts.

### Duplicate Email Registration

When a user attempts to create an account, the system must validate that the email address is not already associated with an existing account. If the provided email is already in use, the registration request is rejected and the user is informed that an account with this email already exists. The user must provide a different email address to complete registration. This validation prevents duplicate accounts and ensures each email corresponds to exactly one user account.

### Duplicate Username Registration

When a user attempts to create an account, the system must validate that the chosen username is not already taken by another user. If the username is already in use, the registration request is rejected and the user is prompted to choose a different username. Users must select a unique username that does not match any existing account. This validation ensures username uniqueness across all accounts in the system.

### Invalid Email Format

When a user attempts to create an account, the system must validate that the email address follows a properly formatted structure. If the email format is invalid, the registration request is rejected and the user is informed to provide a valid email address. The email must contain both a local part and domain part separated by an at symbol. Invalid email formats are rejected before any account creation process proceeds.

### Incorrect Login Credentials

When a user attempts to log in, the system must validate the provided email address and password combination against stored credentials. If either the email is not found or the password does not match the stored value, the login attempt is rejected. The user receives a message indicating that the credentials are incorrect. The system does not reveal whether the email or password was incorrect to prevent enumeration attacks.

### Current Password Requirement

When a user attempts to change their password, the system must require the user to enter their current password for validation. If the user cannot provide the correct current password, the password change request is rejected. This validation ensures that only the account owner can modify the password, preventing unauthorized password changes by someone with access to the account but not the current password.

### Account Ownership Verification

When any account modification action is requested, the system must verify that the requesting user is the owner of that account. If the requesting user is not the account owner, the action is rejected. This applies to all actions including password changes and account deletion. Users cannot perform modifications on accounts they do not own, even if they have access to the account information.

### Account Deletion Cascade

When a user deletes their account, the system must also delete all posts and comments written by that user. The account deletion operation triggers a cascade deletion that removes all associated content. This ensures no orphaned content remains in the system after account deletion. Users should be aware that deleting their account permanently removes all their contributions to the platform.

### Unauthorized Account Deletion

When a user attempts to delete an account that they do not own, the system must reject the request. Users can only delete their own accounts, not the accounts of other users. The system verifies account ownership before allowing deletion and prevents deletion attempts from accounts with different ownership. This protection prevents malicious or accidental deletion of other users' accounts.

## Profile Error Scenarios

Users can only edit their own profile information including display name, bio, and avatar. When users attempt to modify another user's profile, the system blocks this action. If a user provides a display name that is already taken by another account, the update fails. The bio text can be any length, but extremely long bios may be truncated for display purposes. Users viewing profiles of non-existent accounts receive an appropriate error. Avatar images must meet size and format requirements, and rejected uploads are not applied. Users cannot view another user's profile before they have logged in, though this varies by platform settings.

### Profile Ownership Restriction

Users can only edit their own profile information. When users attempt to modify another user's profile, the system blocks this action and the request is rejected. Users cannot change any profile field for accounts other than their own. The system verifies that the requesting user is the owner of the profile before allowing any updates.

### Duplicate Display Name

Display names must be unique across all users. When a user attempts to update their display name to a name that is already in use by another account, the update is rejected. The system checks for name conflicts before applying the change. Users receive notification that the chosen display name is already taken and must select a different one.

### Avatar Upload Rejection

Avatar images are subject to validation checks during upload. If an image upload fails validation, the avatar is not applied and remains unchanged. Rejected uploads include images that exceed file size limits or do not meet format requirements. Users receive notification indicating that the avatar update was not successful and must provide a valid image file.

### Non-Existent User Profile

When viewing a user profile, the system verifies that the requested user account exists. If a user attempts to access a profile for an account that does not exist in the system, the request is rejected. Users viewing a non-existent profile receive an error message indicating that the account cannot be found.

### Profile Viewing Permissions

Profile viewing access depends on platform settings and user authentication status. Some profile information may only be visible to logged-in users, while basic information can be viewed by guests. Users may be restricted from viewing certain profiles based on platform configuration. The system enforces these visibility rules when users request to view profiles.

### Bio Text Length Limits

Bio text can be entered with no upper limit on length. Users may write biographical information of any length. However, extremely long bios may be truncated for display purposes on profile listing pages. The full bio text is always displayed when viewing the complete user profile page. There are no restrictions on the minimum bio text length.

### Avatar File Size Limits

Avatar images are subject to file size restrictions. Images that exceed the maximum allowed file size cannot be uploaded as avatars. Users receive an error message when attempting to upload an image that is too large. The specific size limit is enforced at the time of upload and rejected files are not stored.

### Avatar Format Restrictions

Avatar images must be in supported file formats to be accepted by the system. Only images in approved formats can be uploaded as user avatars. Images in unsupported formats are rejected during the upload process. Users receive guidance about which file formats are accepted when attempting to upload an invalid image type.

## Community Error Scenarios

When creating a community, the name must be unique and cannot already be in use. The description text is required and must not be empty. Users cannot create communities with names that violate naming policies or contain inappropriate content. If a user tries to search for a non-existent community, the search returns no results rather than an error. Community owners cannot delete a community that has existing posts or comments without a cleanup process. Attempting to view a deleted community shows an appropriate message that the community no longer exists. Community names must follow character limits and allowed character sets.

### Duplicate Community Name Prevention

When a user attempts to create a new community, the system validates that the community name is unique. If the requested name already exists in the system, the community creation request is rejected. The user is informed that a community with that name already exists and must choose a different name. The validation occurs before the community is created, so no duplicate names can exist in the system at any time.

### Empty Community Description Validation

When creating a community, a description text is required. The system rejects community creation if the description field is empty or contains only whitespace. The user must provide meaningful description content before the community can be successfully created. An empty description results in a rejected request with an appropriate message.

### Community Deletion Restrictions

Community owners cannot delete a community that has existing posts or comments without first removing that content. If a community owner attempts to delete a community with existing content, the deletion request is rejected. The system informs the owner that all posts and comments must be removed first before the community can be deleted. This restriction prevents orphaned content and maintains data integrity.

### Non-Existent Community Search

When a user searches for a community that does not exist in the system, the search returns no results rather than displaying an error message. The search interface gracefully handles non-existent queries and presents an empty result set. Users can continue browsing other communities or refine their search terms without encountering an error state.

### Community Naming Violations

Community names must comply with naming policies defined by the platform. Names that violate character restrictions, contain prohibited characters, or match reserved keywords are rejected. The system validates the name format against character limits and allowed character sets before accepting the community creation request. Names that do not meet policy requirements result in a rejected request with guidance on acceptable formats.

### Deleted Community Viewing

When a user attempts to access a community that has been deleted, the system displays an appropriate message that the community no longer exists rather than showing an error page. The message informs the user that the community has been removed. Attempts to view the deleted community's posts, comments, or content are also rejected with the same no-longer-exists message.

### Community Character Limit Enforcement

Community names have character limits that must be enforced during creation. Names that exceed the maximum character count are rejected. The system validates the character length before creating the community and rejects any name that is too short or too long. Users receive feedback on the character limit requirements and must adjust their community name accordingly.

### Inappropriate Content Filtering

Community names and descriptions are subject to inappropriate content filtering. Content that violates platform policies regarding prohibited or harmful material is rejected during the creation process. The system scans submissions for content that does not meet community standards and blocks creation if violations are detected. Users must revise their content to comply with acceptable use policies before the community can be created.

## Subscription Error Scenarios

Users must be logged in to subscribe to communities — anonymous users cannot subscribe. Attempting to subscribe to a community that has already been subscribed to has no effect and does not create duplicates. Users cannot unsubscribe from communities they are not subscribed to. Subscribing is a required condition for creating posts in a community — users without active subscriptions are blocked from posting. When a user is banned from a community, their subscription may be automatically removed. Users can view their list of subscribed communities, but viewing other users' subscriptions is not available. Unsubscribing from a community does not delete the user's previous posts made in that community.

### Anonymous Subscription Restriction

Users must be logged in as a member to subscribe to a community. Anonymous users who are not logged in are not permitted to subscribe to any community. When an anonymous user attempts to subscribe, the request is rejected and the user is informed they must log in first.

Members can subscribe to any community in the platform. The subscription is created immediately upon successful request.

### Duplicate Subscription Prevention

The system prevents duplicate subscriptions for a user to the same community. If a member attempts to subscribe to a community they are already subscribed to, no duplicate subscription is created. The existing subscription remains unchanged and the user is informed they are already subscribed.

Each user can have only one active subscription to each community at any time.

### Unsubscribing from Unsubscribed

Users cannot unsubscribe from a community they are not subscribed to. The system validates that the user has an active subscription to the community before processing the unsubscribe request.

If a user attempts to unsubscribe from a community they are not subscribed to, the request is rejected and the user is informed they are not currently subscribed to that community.

### Subscription Posting Requirement

Subscribing to a community is a required condition for creating posts in that community. Users who are not subscribed to a community cannot create posts within it.

When a user attempts to create a post in a community without an active subscription, the request is rejected and the user is informed they must subscribe to the community first before posting.

### Banned User Auto-Unsubscribe

When a user is banned from a community, their subscription to that community is automatically removed. This occurs regardless of how long the user has been subscribed.

The banned user loses all subscription privileges for that community and cannot create posts or comments there until the ban is lifted. After unban, the user must manually resubscribe to regain posting privileges.

### Subscription List Visibility

Users can view a list of all communities they are currently subscribed to. This list is accessible only to the account owner and displays communities where the user has active subscription status.

Users cannot view other users' subscription lists. Subscription information is private and only visible to the subscriber themselves.

### Unsubscribing Post Preservation

Unsubscribing from a community does not delete the user's previous posts made in that community. Any posts the user created while subscribed remain in the community and remain visible to others.

The user's posts are preserved and can be viewed by other users even after they have unsubscribed from the community.

### Subscription Status Checking

Users can check their subscription status for any community. The system displays whether the user is currently subscribed to a community when viewing the community page.

Members can view their subscription status on any community page to confirm whether they can post in that community or need to subscribe first.

## Post Error Scenarios

Users must be subscribed to a community before creating posts in that community. Posts require a title, and attempts to create posts without a title are rejected. Posts must have content in one of three formats: text, link URL, or image — a post cannot be empty. Users can only edit or delete posts they have authored. When a user tries to edit or delete another user's post, the action is denied. Moderators can delete any post in their community regardless of authorship. Posts in deleted communities become inaccessible. Attempting to view a post that has been deleted shows an appropriate message.

### Subscription Requirement for Posting

Users must be subscribed to a community before creating a post in that community. The system checks subscription status when a user attempts to create a post. If the user is not subscribed, the post creation request is rejected.

When attempting to create a post in a community without an active subscription, the request is rejected with a message indicating that subscription is required.

Users who are banned from a community are automatically treated as unsubscribed and cannot create posts, even if they had previously subscribed.

### Missing Post Title Validation

A post title is required when creating a post. The system validates that a title is provided as part of the post creation request. If the title field is empty or contains only whitespace, the request is rejected.

The post creation process requires a non-empty title. Attempts to create a post without a title are rejected immediately with an appropriate error message.

A title is required regardless of post type (text, link, or image).

### Empty Post Content Validation

Every post must contain content in one of three formats: text, link URL, or image. The system validates that at least one content type is provided when creating a post. A post cannot be empty with no content.

For text posts, the text content must be non-empty. For link posts, a valid URL must be provided. For image posts, an image file must be uploaded.

If a post is submitted with no content in any format, the request is rejected with an error indicating that post content is required.

### Post Ownership Verification

Users can only edit or delete posts that they have authored. The system verifies post ownership before allowing editing or deletion operations.

When a user attempts to edit or delete a post, the system checks if they are the original author. If the user is not the author, the action is denied.

Post ownership is determined by comparing the author of the post with the user performing the edit or delete operation.

### Moderator Post Deletion

Moderators can delete any post in their community, regardless of who created it. This applies to posts by any user, including other moderators and the community owner.

When a moderator deletes a post in their community, the action is allowed without restrictions on post authorship.

Moderator post deletion is a privilege granted based on moderator role assignment to that community.

### Deleted Community Post Access

Posts in deleted communities become inaccessible to all users. When a community is deleted, all posts within that community are no longer viewable.

Attempting to access a post that belongs to a deleted community results in the request being rejected.

Posts in deleted communities cannot be viewed, edited, or interacted with in any way.

## Comment Error Scenarios

Users must be logged in to write comments on posts. Comments require content — empty comments cannot be created. Users can reply to any comment with unlimited nesting depth, but extremely deep comment threads may have display limitations. Users can only edit or delete their own comments, not comments authored by others. Moderators can delete any comment in their community regardless of authorship. When a post is deleted, all comments on that post become inaccessible. Users cannot comment on deleted posts. Attempting to reply to a deleted comment is not allowed.

### Anonymous Comment Restriction

Users must be logged in to write comments on posts. Guests and anonymous users cannot write comments on any post. Attempting to write a comment without being logged in is rejected.

### Empty Comment Rejection

Comments require content — empty comments cannot be created. When a user attempts to submit a comment with no text content, the system rejects the request.

### Comment Content Requirement

Comments must contain text content. The system validates that the comment has meaningful content before creating it. Comments containing only whitespace are rejected.

### Comment Ownership Verification

Users can only edit or delete their own comments, not comments authored by others. The system verifies that the user attempting to edit or delete is the original author before allowing the action.

### Unauthorized Comment Editing

Users cannot edit comments authored by other users. Attempting to edit another user's comment is rejected. Only the original author can edit their comment.

### Unauthorized Comment Deletion

Users cannot delete comments authored by other users. Attempting to delete another user's comment is rejected. Only the original author can delete their own comment.

### Moderator Comment Deletion

Moderators can delete any comment in their community regardless of authorship. Moderators can delete comments authored by themselves or other users within their moderated community.

### Deleted Post Comment Access

When a post is deleted, all comments on that post become inaccessible. Users cannot view comments on a deleted post. Users cannot reply to comments on a deleted post. Attempting to reply to a deleted comment is not allowed.

### Comment Replying Restrictions

Users can reply to any comment with unlimited nesting depth. However, attempting to reply to a deleted comment is not allowed. The system prevents creating replies to content that no longer exists.

## Vote Error Scenarios

Users must be logged in to cast votes on posts or comments. Each user can only have one vote per post or comment at any time. Users can change their vote from upvote to downvote or vice versa, which updates the total score accordingly. Users can remove their vote entirely, which sets their individual vote to neutral. If a user attempts to vote twice on the same post or comment, only the most recent vote is counted. Votes on deleted posts or comments are removed from the calculation. Changing a vote updates the score immediately for all viewers. Negative vote scores are allowed and displayed correctly.

### Anonymous Voting Restriction

Users must be logged in to cast votes on posts or comments. Anonymous visitors cannot upvote or downvote content. The voting interface is hidden or disabled for guests. When a guest attempts to vote, the system prompts them to log in first.

### Single Vote Per Item

Each user can have only one vote active per post or comment at any time. A user cannot cast multiple votes on the same item simultaneously. If a user attempts to vote again, the previous vote is replaced rather than stacked.

### Vote Changing Allowed

Users can change their vote from upvote to downvote or vice versa. When a vote is changed, the score adjusts accordingly: removing an upvote decreases the score by 1, and adding a downvote decreases it by another 1. The change is reflected immediately for all viewers of the content.

### Vote Removal Allowed

Users can remove their vote entirely, setting their individual vote to neutral. When a vote is removed, the score adjusts to reflect the absence of that vote: removing an upvote increases the score by 1, removing a downvote increases the score by 1. The vote removal is reflected immediately for all viewers.

### Duplicate Vote Prevention

The system prevents duplicate votes by tracking each user's vote on every post and comment. If a user attempts to submit a vote they already have, the request is accepted without changing the score. The system ensures only one vote per user per item is recorded.

### Deleted Post Comment Votes

Votes on deleted posts or comments are automatically removed from the score calculation. When content is deleted, all associated votes are discarded, and the score is recalculated based on remaining votes only. Users who had voted on deleted content cannot restore their vote on the deleted content.

### Vote Score Recalculation

The vote score is recalculated whenever a vote is added, changed, or removed. The score equals the total number of upvotes minus the total number of downvotes. Recalculation happens immediately so all viewers see the updated score. Changes are reflected in all feeds and views where the content appears.

### Negative Vote Score Display

Vote scores can be negative when downvotes exceed upvotes. The system displays negative scores correctly with a minus sign. Users can see the negative score in post lists, individual post views, and comment threads. No minimum score threshold is enforced.

## Report Error Scenarios

Users can only report posts or comments they can see and access. Every report must include a reason text — reports without reasons are rejected. Users cannot report their own content to moderators. Once a report is submitted, it enters a review queue where community moderators can see it. Moderators can approve a report to delete the reported content or dismiss it to keep the content. Dismissed reports are removed from the moderator view. Reports on deleted content cannot be submitted. Multiple users can report the same content, and all reports are visible to moderators.

### Report Content Visibility Requirement

Users may only submit reports on content that is visible and accessible to them at the time of reporting. Users cannot report posts or comments that have been deleted before they attempt to submit a report. Users cannot report content that is hidden from their view due to community restrictions or other access controls. When a user attempts to report content that is not visible to them, the report submission is rejected with an appropriate error message.

### Empty Report Reason Rejection

Every report submission must include a reason field containing text describing why the content is being reported. The reason field is required and must contain at least one character of text. If a user attempts to submit a report without providing a reason, or with only whitespace characters, the report is rejected and not created in the system. The user must provide a valid reason before the report can be successfully submitted.

### Self-Reporting Restriction

Users are prohibited from submitting reports on their own posts or comments. The system checks whether the user attempting to report owns the content being reported. If a user attempts to report their own content, the report submission is rejected with a clear message indicating that self-reporting is not allowed. This restriction applies to all content types including posts and comments regardless of who authored them.

### Report Review Queue

All submitted reports are automatically added to a review queue that is accessible to community moderators. The review queue displays each report with complete information including the reported content itself, the identity of the user who submitted the report, the reason text provided by the reporter, and the timestamp when the report was submitted. Moderators can browse the review queue to see all pending reports for their community and take appropriate action on each one.

### Report Approval Action

When moderators review a report and determine that the reported content violates community guidelines or rules, they can approve the report. Upon approving a report, the system automatically deletes the reported content from the platform. The content is permanently removed and is no longer visible to any users. The report is marked as approved in the system and is no longer visible in the active review queue.

### Report Dismissal Action

When moderators review a report and determine that the reported content does not violate community guidelines, they can dismiss the report. Upon dismissing a report, the reported content remains in the platform and is visible to all users who can normally access it. The report is removed from the moderator review queue and is no longer visible in the active report list. Dismissed reports do not result in any action against the reported content or the reporter.

### Deleted Content Reporting

Users cannot submit reports on content that has already been deleted for any reason. The system validates that the content exists and is not deleted before allowing a report to be created. If a user attempts to report content that has been previously deleted by the author, a moderator, or the system, the report submission is rejected. This prevents reports on content that no longer exists on the platform.

### Multiple Reports Same Content

Multiple users may report the same post or comment independently. The system allows all users who can see the content to submit their own reports with their own reasons. All reports for the same content are visible to moderators in the review queue. Each report maintains its own identity with the reporter's username and individual reason text. When moderators review multiple reports for the same content, they can see all reports together and make a single decision that applies to all of them.

## Ban Error Scenarios

Only moderators can ban users from their community — regular users cannot ban others. Moderators must specify a reason when banning a user, and the reason is recorded. Banned users cannot create posts or comments in the banned community but can still view existing content. Users who are not banned cannot be unbanned. Moderators can view a list of all currently banned users in their community. Banned users can still subscribe to the community and see subscription content they already have access to. Unbanning a user restores their ability to post and comment in the community. Ban actions are logged and cannot be undone by other moderators.

### Unauthorized Ban Attempt

Only moderators with appropriate privileges can ban users from their community. When a user who is not a moderator attempts to ban another user, the request is rejected with an error message indicating insufficient permissions. Community owners can ban any user and can ban other moderators. Regular moderators can ban users but cannot ban other moderators. The system verifies the requesting user's moderator role before executing any ban action.

### Ban Reason Requirement

Moderators must provide a reason when banning a user. If a moderator attempts to ban a user without specifying a reason, the ban action is rejected. The ban reason is stored with the ban record and becomes part of the permanent ban log. This reason is visible to other moderators when viewing the list of banned users. Empty or blank reason text is not accepted.

### Banned User Content Viewing

Users who are banned from a community can still view existing posts and comments within that community. Banned users retain read-only access to all content that was created before their ban. They can view post titles, content, comments, vote scores, author information, and community details. This viewing restriction applies only to creating new content, not to consuming existing content. Banned users see the same interface as any other user when browsing the community's content.

### Banned User Posting Restriction

Users who are banned from a community cannot create new posts in that community. If a banned user attempts to create a post, the system rejects the action and displays an error message indicating the user has been banned. The restriction is enforced immediately upon ban application. Even if the user has active subscriptions to the community, the ban override takes precedence. Banned users cannot create posts even in their own communities if they are banned by the owner.

### Banned User Commenting Restriction

Users who are banned from a community cannot create new comments on posts in that community. If a banned user attempts to write a comment, reply to a comment, or post on any content, the system rejects the action and displays an error message indicating the user has been banned. The restriction applies to all types of comments including new comments and replies to existing comments. Banned users cannot comment even on their own previous posts or comments.

### Banned User List Visibility

Moderators can view a complete list of all users currently banned from their community. The list displays each banned user's username, the reason for their ban, the date and time of the ban, and who performed the ban. Moderators can filter the list by ban date range or by the moderator who issued the ban. Community owners have access to the same list with the ability to unban any user including those banned by other moderators. Regular users cannot view the list of banned users.

### Unbanned User Restoration

When a moderator unbans a user from a community, the user's posting and commenting privileges are immediately restored. The unbanned user can create new posts and comments without any additional actions required. Their previous ban history is retained in the system records but does not prevent future content creation. Unbanned users retain their subscription status to the community if they had one before being banned. If the user was not subscribed before the ban, they can subscribe after being unbanned.

### Moderator Ban Logging

All ban actions performed by moderators are logged with complete details including the moderator's identity, the banned user's identity, the ban reason, the timestamp of the ban action, and whether it was performed by an owner or a regular moderator. These logs are permanently retained and cannot be edited or deleted. The logs are visible to all moderators and owners of the community for audit purposes. Ban actions cannot be undone by other moderators once confirmed.

## ModeratorRole Error Scenarios

Only community owners can add moderators to their community — moderators cannot add other moderators. The owner cannot remove the owner role from themselves. Moderators can add other moderators but cannot remove moderators assigned by other moderators. Moderators cannot remove the community owner under any circumstances. When the owner leaves the community, ownership transfers to the highest-priority remaining moderator. Attempting to add duplicate moderator roles is not allowed. Removing a moderator revokes all their moderator privileges immediately. New moderators gain full moderator permissions including post and comment deletion and user banning.

### Moderator Adding Rules

Only the community owner can add moderators to their community.

When adding a moderator:
- The system checks that the user is not already a moderator of the same community. Attempting to add a duplicate moderator role is rejected.
- The user being added must be a member of the community.
- The community owner cannot assign the moderator role to themselves (self-assignment is rejected).

A moderator cannot add other moderators to the community unless the community owner has specifically granted them that authority.

When a user is assigned the moderator role, they immediately gain full moderator permissions including:
- Deleting any post in the community
- Deleting any comment in the community
- Banning users from the community
- Viewing all reports for the community
- Approving or dismissing reports

### Owner Role Restrictions

The community owner role has special protections:

The owner cannot remove the owner role from themselves. This action is rejected by the system.

The owner cannot be removed from the community by any moderator. Attempting to remove the owner role is rejected.

If the community owner decides to leave the community (deletes their account), ownership is automatically transferred to another moderator following this priority order:
1. The moderator who was assigned moderator role earliest (oldest moderator)
2. If multiple moderators have the same assignment date, the one with the most posts in the community
3. If still tied, the one with the most karma score

The new owner role is automatically assigned to the highest-priority remaining moderator.

When ownership transfers:
- The new owner becomes the owner immediately
- Their permissions expand to include all owner-level actions
- The previous owner's content remains in the community
- All other moderators retain their roles

### Moderator Removal Rules

Only the community owner can remove a moderator from the community.

When removing a moderator:
- The owner must verify they are removing a valid moderator of the same community.
- The system immediately revokes all moderator privileges from the removed user.
- The removed user loses the ability to:
  - Delete posts in the community
  - Delete comments in the community
  - Ban users from the community
  - View reports for the community
  - Approve or dismiss reports
- The removed user retains their ability to view posts, comments, and subscribe to the community

A moderator cannot remove other moderators. Only the owner has this authority.

If a moderator leaves the community (deletes their account or unsubscribes), their moderator role is automatically removed, but this does not trigger ownership transfer unless they are the owner.

Removing a moderator is an immediate action with no waiting period or confirmation required.

When a banned user is removed as moderator (due to ban), their moderator role is automatically revoked.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### New User Account and First Post Journey

A new user starts the journey by creating an account using an email address and password, and chooses a unique username for their profile. The system validates that the email address follows the correct format, that the email has not been used before, and that the username is not already taken by another user.

After account creation, the user is required to set up their profile by entering a display name, writing a bio text, and uploading an avatar image. The system validates that the display name is not duplicated with another user's display name. Once these profile elements are complete, the user's profile is active and visible to other users.

With an active profile, the user can browse all available communities displayed in a list, or search for communities by entering a name. The user can view details for each community including the community name, description text, icon image, and current subscriber count.

To create a post in a community, the user must first subscribe to that community. The user clicks to subscribe, which adds the community to their list of subscribed communities. After subscribing, the user gains the ability to create posts in that community.

The user creates a post by entering a title (required) and selecting one of three post types. For a text post, the user enters content text. For a link post, the user enters a URL. For an image post, the user uploads an image file. The system creates the post and associates it with the community and the user as the author. The post appears immediately in the community's posts list and in the user's own posts list.

### Community Creation and Moderator Management Journey

Any authenticated user can create a new community by providing a unique community name, writing a description text, and uploading an icon image. The system validates that the community name is unique across all communities and that the description is not empty. Upon successful creation, the user automatically becomes the owner of the community.

The community owner can add other users to become moderators of the community. When a user is added as a moderator, they gain the ability to delete any post and comment in the community, ban and unban other users, and view the complete list of banned users. The owner can remove moderators at any time, but only the owner can remove other moderators.

A moderator can add additional users as moderators but cannot remove the owner from their role. Moderators also cannot remove other moderators from their roles; only the owner has the authority to remove a moderator. This prevents moderators from collectively removing the owner or from removing each other.

The owner can view the complete list of subscribers to their community from the community management page. The subscriber count is displayed publicly on the community page. Any user on the platform can view the community page, including users who are not subscribed.

### Post Viewing and Voting Interaction Journey

When a user views any post, they see the post title, the full content based on post type, the author's username, the community name, the current vote score, the comment count, and the time elapsed since the post was created. For text posts, the first 200 characters are displayed in feed lists. For image posts, a thumbnail is displayed. For link posts, the domain name of the URL is shown.

A user can cast a vote on a post by either upvoting or downvoting. Upvoting adds 1 to the vote score; downvoting subtracts 1 from the vote score. The user's karma score increases or decreases accordingly with each vote made on their content. The user can only vote once per post. If the user has already voted, they can change their vote from upvote to downvote or vice versa, or they can remove their vote entirely. When a vote is changed or removed, the vote score and karma adjust accordingly.

The user can navigate to the single post view from any feed (Home Feed, Popular Feed, or Community Feed). From the single post view, the user can return to any feed using the navigation menu.

### Comment Writing and Nesting Journey

When viewing a post, a user can write a comment by entering comment content. Each comment displays the author's username, the comment content, the comment vote score, the time since posted, and any nested replies. Users can reply to any comment, and those replies can have their own replies with no depth limit on nesting.

When a user writes a comment, the comment appears immediately in the post's comment list. The comment count displayed on the post updates to reflect the new total. Each nested reply is shown indented beneath its parent comment.

A user can edit their own comments at any time. When a comment is edited, the updated content is immediately visible to all users viewing the post. The edit is not annotated or versioned; only the current content is shown.

A user can delete their own comments. When deleted, the comment is removed from the post and no longer visible to any user. The comment count on the post updates to reflect the deletion. Other users' comments cannot be deleted by anyone except the moderator role for that community or the original author.

### Feed Navigation and Content Sorting Journey

A logged-in user can view the Home Feed, which displays posts only from communities the user has subscribed to. The Home Feed is not available to users who are not logged in. The user can also view the Popular Feed, which displays posts from all communities across the platform. The Popular Feed is available to everyone, including users who are not logged in.

The user can navigate to a specific community and view the Community Feed, which shows only posts from that community. This feed is available to everyone regardless of login status.

All three feeds support the same set of sorting options. Users can sort posts by Hot, which shows recent posts with many upvotes first. Users can sort by New, which shows most recently created posts first. Users can sort by Top, which shows highest vote scores first, with time filters available for today, this week, this month, this year, or all time. Users can sort by Controversial, which shows posts with many votes but a score close to zero.

All feeds display posts in paginated groups. Users can navigate to subsequent pages to view more posts.

### Content Reporting and Moderation Journey

When a user encounters a post or comment they believe violates community guidelines, they can report the content. The user must provide a reason for the report in text form. The system records the report along with the reported content, the identity of the reporter, and the reason text provided.

Moderators of a community can view all reports submitted for that community. Each report displays the reported content, the reporter's identity, and the reason text. Each report has a status of pending, approved, or dismissed.

When reviewing a report, a moderator can approve it or dismiss it. If approved, the reported content is deleted from the community. If dismissed, the content remains and the report is removed from the report list. Once dismissed, the report is no longer visible to moderators.

Moderators can ban users from their community by providing a ban reason. When a user is banned, they immediately lose the ability to create posts or write comments in that community. Banned users can still view all content in the community, including posts, comments, and other community pages. Moderators can view the complete list of banned users and can unban users at any time, restoring their ability to create posts and comments.

### User Profile and Reputation Tracking Journey

Every user has a public profile page that can be viewed by anyone, including users who are not logged in. The profile page displays the user's display name, bio text, avatar image, and total karma score. The profile also shows a list of all posts the user has created and a list of all comments the user has written.

A user can edit their own profile by updating their display name, bio text, or avatar image. The system validates that any new display name is not already used by another user. Users can only edit their own profiles; they cannot edit other users' profiles.

The user's karma score reflects the sum of all votes on their posts and comments. When another user upvotes the user's content, karma increases by 1. When another user downvotes, karma decreases by 1. When a vote is removed, karma adjusts accordingly. Karma can be positive or negative.

The profile updates in real-time as other users interact with the user's content. New posts and comments appear in the respective lists, and the karma score updates immediately after votes are cast or removed.

### Subscription Lifecycle and Access Control Journey

A user can subscribe to any community they find on the platform. Once subscribed, the community's posts appear in the user's Home Feed. The user can view a complete list of all communities they are subscribed to from their profile or a dedicated subscriptions page.

A user can unsubscribe from any community at any time. After unsubscribing, the community's posts no longer appear in the user's Home Feed. The user's posts and comments remain visible in that community. The user's subscriptions do not affect their karma score or any votes they have made on that community's content.

If a user is banned from a community, the system automatically unsubscribes them from that community. The banned user cannot create posts or write comments in the community, but can still view all content. The banned user can see their banned status when visiting the community page.

Users can view the subscriber count for any community. This count updates automatically when users subscribe or unsubscribe from the community.

### Account Closure and Content Removal Journey

A user can delete their account at any time through their account settings. When a user deletes their account, the system removes all content associated with that user: all posts they have created, all comments they have written, all votes they have made, all community subscriptions, and their complete profile information including avatar, bio, and display name.

When user content is removed due to account deletion, the karma scores of other users are recalculated. The votes that the deleted user made on other users' posts and comments are removed from the calculation. This ensures karma scores accurately reflect the remaining active users' interactions.

All posts and comments created by the deleted user are completely removed from the platform and are no longer viewable by any users. Other users will see a notice that the content has been removed due to account deletion. The communities where posts were deleted continue to exist with their remaining content intact.

The deleted username becomes available for registration by other users after a platform-defined retention period. During this period, the username is reserved to prevent accidental re-registration.

# File Storage

File upload capabilities, media processing, and storage requirements.

## File Upload and Management

Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

### Avatar Image Upload

Users can upload an image as their avatar when creating their profile or updating their existing profile.

The avatar image is stored as a media file associated with the user's profile.

Users can replace their avatar at any time by uploading a new image, which will replace the previous avatar.

### Community Icon Upload

When creating a community, the creator must upload an icon image.

The community icon is stored as a media file associated with the community.

The community owner can update the community icon at any time by uploading a new image.

### Image Post Upload

When creating a post, users can choose to upload an image as the post content.

The image is stored as a media file associated with the post.

Users can upload one image per post.

Text posts have text content, and link posts have a URL. Image posts have an uploaded image instead.

### Media File Storage

All uploaded media files (avatars, community icons, and images) are stored in secure storage.

Media files are indexed and retrieved by their associated entity (user, community, or post).

When a user deletes their account, all associated media files (avatar and all images in their posts) are permanently deleted.

When a community is deleted, all associated media files (community icon and all images in its posts) are permanently deleted.

When a post is deleted, its associated image (if any) is permanently deleted.

### Attachment Management

Users can only edit or delete their own uploads (avatars, community icons, and images in their posts).

System administrators can remove inappropriate or violating media files.

When a user or community deletes their associated media, the file is permanently removed from storage.

### Upload Validation

If the uploaded file fails validation (e.g., unsupported format or excessive file size), the upload is rejected and the existing avatar or icon remains unchanged.

For post creation, if the uploaded image fails validation, the post creation is rejected.

For community creation, if the uploaded icon fails validation, the community creation is rejected.