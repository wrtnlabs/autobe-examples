**redditCommunity — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Users can create an account by providing an email address, password, and choosing a unique username that no other user has taken. Once registered, users can log in with their email and password credentials. Users have the ability to change their password if they wish to update their security credentials at any time. When users decide to leave the platform, they can delete their account entirely, which also removes all their posts and comments from the system. The system validates that usernames are unique before allowing account creation and rejects attempts to use an already-taken username. Login attempts with incorrect credentials are rejected to protect account security. Account deletion is irreversible and removes all user-generated content permanently.

### Account Creation

Users can create an account by providing an email address, password, and choosing a username.

The email address is required during account creation.

The password is required during account creation.

The username is required during account creation.

The username must be unique across all accounts in the system.

If a user attempts to create an account with a username that is already taken, the request is rejected with an error.

If a user attempts to create an account with an email address that is already registered, the request is rejected with an error.

All required fields must be provided for account creation to succeed.

If any required field is missing, the request is rejected with an error.

### Account Login

Users can log in to their account using their email address and password.

Both email address and password must be provided to log in.

The system verifies that the provided email address exists in the system.

The system verifies that the provided password matches the account.

If the email address does not exist in the system, the login request is rejected with an error.

If the password is incorrect, the login request is rejected with an error.

Successful login allows the user to access features available to logged-in users.

### Password Change

Users can change their password at any time after logging in.

When changing a password, users must provide their current password and their new password.

The current password must be correct for the password change to proceed.

If the current password is incorrect, the password change request is rejected with an error.

The new password must be provided and cannot be left empty.

After a successful password change, the user can log in with the new password.

Password changes take effect immediately upon successful completion.

### Account Deletion

Users can delete their account at any time after logging in.

When a user deletes their account, all posts created by that user are permanently deleted from the system.

When a user deletes their account, all comments written by that user are permanently deleted from the system.

Account deletion is irreversible once completed.

Users must confirm their intent to delete their account before the deletion is processed.

After account deletion, the user cannot log in with their previous credentials.

The username associated with a deleted account becomes available for use by other users.

The email address associated with a deleted account becomes available for registration by other users.

All personal data associated with the deleted account is removed from the system.

## Profile Operations

Every user has a profile containing a display name, bio text, and avatar image that represents them on the platform. Users can edit their own profile to update their display name, modify their bio text, or change their avatar image at any time. Each user can view the profiles of any other users in the system without restrictions. When viewing a profile page, users see the profile owner's display name, bio, avatar, total karma score, a list of all posts created by that user, and a list of all comments written by that user. The profile information is publicly visible to all users and logged-out visitors. Display names can be updated freely and the changes reflect immediately across the platform. The karma score shown on profiles automatically updates as votes are cast on the user's content.

### Profile Display Name Editing

Users can update their own display name at any time through the profile settings interface. When a user changes their display name, the new name replaces the old name immediately across the entire platform. The updated display name appears on all the user's existing posts, comments, and profile page without requiring any additional action. Users cannot use an existing display name that is already in use by another account. If a user attempts to set a display name that is already taken, the change is rejected and the user is notified that the name is unavailable. Display names are case-sensitive, meaning "JohnDoe" and "johndoe" are treated as different names.

### Bio Text Customization

Users can add, modify, or remove their bio text at any time through the profile settings interface. Bio text is optional, meaning users can choose to have no bio or remove their bio entirely. There is no fixed length limit on bio text, allowing users to write as much or as little as they wish. Changes to bio text are applied immediately and visible to all users who view the profile. The system preserves formatting within the bio text as entered by the user, including line breaks and basic text styling. When viewing a profile, empty or missing bio text is displayed as a placeholder indicating that the user has not added a bio.

### Avatar Image Updates

Users can upload, replace, or remove their avatar image through the profile settings interface. Supported image formats are determined by the system and include common web image types such as JPEG, PNG, and GIF. When an avatar image is updated, the new image replaces the old image immediately across the platform. The system automatically generates and caches thumbnail versions of avatar images for use in post listings and comment threads. Users can remove their avatar image entirely, which results in a default avatar being displayed instead. The avatar upload process validates that images meet size requirements before accepting them.

### Viewing Another User's Profile

Any user, whether logged in or logged out, can view the profile of any other user in the system without restrictions. No approval or special permission is required to view another user's profile. When viewing a profile, the viewer sees the profile owner's display name, bio text, avatar image, total karma score, and lists of posts and comments. The ability to view another user's profile does not depend on whether the users are friends, subscribers, or have any other relationship. Profiles of banned users remain viewable even if the user has been banned from communities.

### Karma Score Display

Each user's profile displays a single karma score that represents their total accumulated score from all votes on their posts and comments. The karma score can be a positive number, zero, or a negative number depending on the balance of upvotes and downvotes received. The karma score updates in real-time as other users cast votes on the user's content. When a user upvotes someone's content, that user's karma increases by one point. When a user downvotes someone's content, that user's karma decreases by one point. When a user removes their vote from someone's content, the karma score adjusts accordingly to reflect the change. The karma score shown on a profile is the aggregate of all votes received across all posts and comments authored by that user.

### Posts List on Profile

Each user's profile displays a complete list of all posts that the user has created on the platform. The list includes posts from all communities where the user has created content, regardless of subscription status. Each post entry in the list shows the post title, the community where it was posted, the vote score, the comment count, and when it was posted. Users can scroll through their posts list to view all their content chronologically. The list updates to reflect newly created posts immediately after creation. Posts that have been deleted by the author or by moderators do not appear in the posts list.

### Comments List on Profile

Each user's profile displays a complete list of all comments that the user has written on posts across the platform. The list includes comments on posts from all communities, regardless of whether the user is subscribed to those communities. Each comment entry in the list shows the comment content (truncated if necessary), the post title it was written on, the vote score, and when it was posted. Users can scroll through their comments list to view all their contributions. The list updates to reflect newly written comments immediately after posting. Comments that have been deleted by the author or by moderators do not appear in the comments list.

### Public Profile Visibility

All user profiles are publicly visible to any visitor of the platform, whether they are logged in or not. Profile information including display name, bio, avatar, karma score, and lists of posts and comments can be viewed without authentication. The system does not provide options for users to make their profile private or visible to selected users only. All content displayed on public profiles is accessible through direct links and search results. Users do not need to follow or subscribe to another user to view their profile. Public profile visibility applies to all users regardless of their account status, except for accounts that have been deleted.

## Community Operations

Any registered user can create a new community by providing a unique community name, description text, and an icon image. The user who creates a community automatically becomes the owner with full authority over that community. Users can browse a list of all communities available on the platform to discover new groups to join. Users can search for communities by entering a name query to find specific communities they are looking for. Each community displays its current subscriber count to show its size and activity level. Community names must be unique across the entire platform and cannot be duplicated. The owner has special privileges including the ability to add moderators and make governance decisions for the community.

### Community Creation

Any registered user can create a new community by providing a community name, description text, and an icon image. The community name must be unique across the entire platform and cannot duplicate an existing community name. The description text is required and provides information about the community's purpose. The owner of a community is the user who created it and receives special privileges including the ability to add moderators and make governance decisions. The community creation request is rejected if the community name is already in use.

### Owner Privileges

The user who creates a community becomes the owner and has the highest level of authority in that community. The owner has the exclusive ability to add moderators to the community. The owner has the exclusive ability to remove moderators from the community. The owner can make final governance decisions for the community. The owner cannot remove themselves from being the owner of the community they created.

### Browse All Communities

Users can browse a complete list of all communities available on the platform to discover new groups to join. The list shows community names, descriptions, and current subscriber counts for each community. The browsing experience is paginated to manage large lists of communities. Users can view this list whether logged in or logged out.

### Search Communities

Users can search for communities by entering a name query to find specific communities they are looking for. The search matches against community names and returns matching results. If no communities match the search query, the system shows an empty results message. Search results are paginated to handle large result sets.

### Community Information Display

Each community displays its current subscriber count to show its size and activity level. The subscriber count updates in real-time as users subscribe or unsubscribe. The community name, description, and icon image are always visible on the community page. The owner's username is displayed to identify who created the community.

### Community Discovery Flow

New users discover communities through the browse all communities list which shows available groups sorted by popularity. Users can filter and sort communities to find groups relevant to their interests. The community discovery experience allows users to preview community information before subscribing. Subscribing to a community enables the user to create posts within that community.

## Subscription Operations

Users can subscribe to any community on the platform to follow its content and receive updates. Users can also unsubscribe from communities they no longer wish to follow at any time. Each user can view a list of all communities they are currently subscribed to from their account. Subscribing to a community is a requirement before users can create posts within that specific community. Users must be logged in to perform subscription actions. The subscription status of a user in a community determines whether they have posting rights in that community. Subscriptions can be toggled on and off freely without restriction or limits on the number of communities a user can join.

### Subscribe to Community

A logged-in member can subscribe to any community on the platform. When a user subscribes to a community, they become a subscriber and can view the community's content. The subscription action increments the community's subscriber count. A user can only have one active subscription to a given community at any time. If a user attempts to subscribe to a community they are already subscribed to, the request succeeds silently without changing the subscription status. The system records the date and time when the subscription was created. A guest user cannot subscribe to a community and is rejected if they attempt to do so.

### Unsubscribe from Community

A member who is subscribed to a community can unsubscribe from it at any time. When a user unsubscribes from a community, they immediately lose access to that community's content. The system decrements the community's subscriber count upon unsubscription. A user can unsubscribe from any community they are currently subscribed to, including communities they created as the owner. The unsubscription action takes effect immediately. A user who has unsubscribed can subscribe to the same community again at any later time by repeating the subscribe action. If a user attempts to unsubscribe from a community they are not subscribed to, the request is rejected.

### View Subscribed Communities List

A logged-in member can view a list of all communities they are currently subscribed to from their account. The list displays each community's name, icon, and current subscriber count. The list is paginated to handle large numbers of subscriptions. The list can be sorted by the date the user subscribed, with the most recently subscribed communities appearing first. A user can view this list regardless of whether they created any of the communities. The system shows the total count of communities the user is subscribed to at the top of the list. A guest user cannot view this list and is redirected to log in if they attempt to access it.

### Subscription Requirement for Posting

A user must be subscribed to a community before they can create a post in that community. When a user attempts to create a post in a community they are not subscribed to, the system rejects the request with an error message. A user who is subscribed to a community can create posts in that community. A user who has unsubscribed from a community can no longer create posts in that community immediately upon unsubscription. A banned user cannot create posts in a community even if they are subscribed to it. A user who created a community is automatically considered subscribed to it and can post without an explicit subscription action. The system validates subscription status before accepting any post creation request in a community.

### Posting Rights via Subscription

Subscription to a community grants the right to create posts, comments, and participate in community discussions. A subscribed user can create text posts, link posts, and image posts in the community. The subscription requirement applies only to post creation; users can view posts in a community without being subscribed. A user's subscription status is checked each time they attempt to create new content in a community. If a user's subscription is removed (either by unsubscribing or being banned), they immediately lose posting rights. A user can regain posting rights by subscribing to the community again, unless they are currently banned from that community.

### Toggle Subscription Status

A member can toggle their subscription status to a community at any time by either subscribing or unsubscribing. Toggling subscription status is immediate and does not require confirmation. A user can subscribe to an unlimited number of communities without restriction. There are no limits on how many times a user can subscribe and unsubscribe to the same community. The subscription status can be changed without any waiting period or cooldown. A user who toggles their subscription will have their subscription status reflected immediately across all parts of the system. If a user is in the middle of creating content in a community and their subscription is toggled, the operation is completed before the new status takes effect.

## Post Operations

Users can create posts in any community they are subscribed to, with each post requiring a title and having one of three types: text, link, or image. Text posts contain written content that other users can read. Link posts contain a URL that users can visit externally. Image posts contain an uploaded image file that displays directly on the platform. Users can edit their own posts to make changes to the content at any time after creation. Users can delete their own posts to remove them from the platform completely. When viewing a single post, users see the title, full content, the author's username, the community name, vote score, comment count, and when it was posted. Only the post author or moderators of the community can edit or delete a post.

### Post Creation in Community

Users can create a post in any community they are subscribed to. The system requires the user to be logged in to create a post. Users must first subscribe to a community before they can create posts within that community. If the user is not subscribed to the community, the post creation request is rejected with an error message.

Each post requires a title, which must not be empty. The title is a required field that must contain at least one character. If the title is missing or empty, the post creation is rejected.

Users can choose one of three post types when creating a post: text post, link post, or image post. The post type is selected at creation and cannot be changed after the post is created. The system stores the post type immutably once the post is created.

When a post is created, it is automatically associated with the creating user and the selected community. The post becomes visible in the community's post list immediately after creation.

If the user attempts to create a post in a community they do not belong to, the system rejects the request and displays an error indicating that subscription to the community is required. The user is informed that they must subscribe to the community before posting.

### Post Title Requirement

Every post must have a title. The title field is required and cannot be left blank.

When creating a post, if the title is empty or contains only whitespace, the system rejects the request and displays an error message indicating that a title is required.

The title is displayed prominently on all post views, including feed listings and the full post detail view. Users can search for posts by title.

The title requirement applies to all three post types: text, link, and image. Regardless of the content type, a title must always be provided.

### Text Post Creation

Users can create a text post, which contains written content that other users can read.

When creating a text post, users provide a title and text content. The text content is displayed in full when viewing the post details.

For efficiency in feed listings, only the first 200 characters of the text content are shown when viewing a post list. Users must click to view the full content on the post detail page.

The text content can be edited by the post owner after creation, subject to ownership restrictions. Moderators of the community can also edit the content, though this action is rare and logged for audit purposes.

### Link Post Creation

Users can create a link post, which contains a URL that users can visit externally.

When creating a link post, users provide a title and a URL. The URL is validated to ensure it is a properly formatted web address.

If the URL is malformed or invalid, the system rejects the post creation request and displays an error message indicating the URL format is incorrect.

In feed listings, link posts display the domain name of the URL (for example, "youtube.com") to help users identify the source of the link before clicking.

The link post type cannot be changed to text or image after creation. Users who want a different post type must delete the link post and create a new post of the desired type.

### Image Post Upload

Users can create an image post, which contains an uploaded image file that displays directly on the platform.

When creating an image post, users provide a title and select an image file from their device. The system processes the uploaded image and stores it for display.

In feed listings, image posts display a thumbnail of the uploaded image to provide a visual preview.

The image post type cannot be changed to text or link after creation. Users who want a different post type must delete the image post and create a new post of the desired type.

Users cannot upload images to posts they do not own or that belong to communities they do not moderate. The image upload interface is only available to post owners and community moderators.

### Edit Own Posts

Users can edit their own posts to make changes to the content at any time after creation.

Only the post owner can edit a post. Other users, even if they have the same username in a different community, cannot edit someone else's post.

When editing a post, users can modify the title, content, or image (for image posts) or the URL (for link posts). The system stores the post with its updated content.

The post author's username is always displayed alongside the post, even after editing, to maintain transparency about content ownership.

Community moderators can also edit posts in their community, regardless of who created the post. This is typically done to remove inappropriate content or correct formatting issues. All moderator edits are logged for audit purposes.

### Delete Own Posts

Users can delete their own posts to remove them from the platform completely.

Only the post owner can delete a post. Deletion is a permanent action that cannot be undone. Once a post is deleted, it is no longer visible to any users, including the post owner.

When deleting a post, the system may prompt for confirmation to prevent accidental deletion. If the user confirms, the post is permanently removed.

Moderators of the community can also delete posts in their community, regardless of who created the post. Moderators typically do this to remove content that violates community rules or guidelines.

Deleting a post also removes all associated comments from the platform. When a post is deleted, all comments on that post are automatically deleted as well.

### View Post Details

When viewing a single post, users see the complete post information displayed in a dedicated page.

The post detail view shows: the title, full content (or full image or clickable URL), the author's username, the community name where the post was created, the current vote score, the total comment count, and when the post was originally posted.

Guest users can view post details for posts in public communities. Logged-in users can view all posts regardless of community privacy settings.

The post detail view includes all comments on the post, which users can read, vote on, reply to, edit (if they own the comment), or delete (if they own the comment).

Users can navigate from the post detail view back to the feed list or to other related posts in the same community.

### Subscribed Communities Restriction

Users must be subscribed to a community before they can create posts in that community. This restriction applies to all new post creation attempts.

If a user attempts to create a post in a community they are not subscribed to, the system displays an error message and prevents the post creation. The user is instructed to subscribe to the community first.

Users can view a list of all communities they are subscribed to, which helps them identify where they can create posts.

Once a user subscribes to a community, they immediately gain the ability to create posts in that community. The subscription takes effect instantly.

Banned users from a community cannot create posts in that community, even if they are subscribed. The ban status overrides the subscription status for posting purposes.

### Post Ownership Rights

Post ownership grants the creator exclusive rights to edit and delete the post.

Only the post owner can edit their post. Other users, including community moderators (except for the specific moderator edit functionality), cannot change the content without the owner's permission.

Only the post owner can delete their post. The owner does not need approval or justification to delete their own post.

Community moderators have elevated rights within their communities. They can delete any post in their community and edit any post in their community, regardless of who created the original post. These moderator actions are logged for audit and accountability.

When a user's account is deleted, all posts created by that user are automatically deleted along with the account. This includes posts in communities the user owned, subscribed to, or posted in as a member.

## Vote Operations

Users can upvote a post or comment to increase its vote score by one point. Users can downvote a post or comment to decrease its vote score by one point. Each user is allowed to vote only once on any single post or comment at a time. Users can change their vote from upvote to downvote or vice versa at any time. Users can also remove their vote entirely, which adjusts the score back accordingly. The vote score displayed is calculated as the total number of upvotes minus the total number of downvotes. When a user votes on content, their karma score adjusts by plus one or minus one depending on the vote type and direction. Vote scores on posts and comments directly affect the user's overall karma total.

### Upvote Post or Comment

Users can upvote a post or comment to increase its vote score by one point. When a user casts their first upvote on content, the vote score increases by one. Attempting to upvote content that already has an upvote from the same user has no effect.

### Downvote Post or Comment

Users can downvote a post or comment to decrease its vote score by one point. When a user casts their first downvote on content, the vote score decreases by one. Attempting to downvote content that already has a downvote from the same user has no effect.

### Single Vote Per Content

Each user may cast only one vote on any single post or comment at a time. A user cannot have multiple votes simultaneously on the same piece of content.

### Change Vote Direction

Users can change their vote direction at any time after casting an initial vote. When changing from upvote to downvote, the vote score decreases by two points. When changing from downvote to upvote, the vote score increases by two points. The previous vote direction is replaced by the new vote direction.

### Remove Vote

Users can remove their vote from a post or comment at any time. When removing an upvote, the vote score decreases by one. When removing a downvote, the vote score increases by one. After removing a vote, the user may cast a new vote on the same content.

### Vote Score Display

The vote score displayed for a post or comment equals the total number of upvotes minus the total number of downvotes. The score may be positive, negative, or zero. The vote score updates in real-time as users cast, change, or remove their votes. The cumulative vote score accurately reflects the net sentiment of all users who have voted on the content.

### Karma Adjustment

When a user's post or comment receives a vote, the content author's karma score adjusts accordingly. When someone upvotes the user's content, the user's karma increases by one. When someone downvotes the user's content, the user's karma decreases by one. When a user removes their vote, the original karma adjustment reverses: removing an upvote decreases karma by one, removing a downvote increases karma by one. Karma may be negative.

## Comment Operations

Users can write a comment on any post to share their thoughts or questions. Users can reply to any existing comment, creating a nested conversation thread. Reply comments can have their own replies, forming an unlimited depth hierarchy of nested conversations. Users can edit their own comments to make corrections or updates after posting. Users can delete their own comments to remove them from the post completely. Each comment displays the author's username, the comment content, vote score, time since posted, and any nested replies in a threaded format. Comments are visible to all users and contribute to discussions on posts.

### Comment Creation

Users can write a comment on any post to share their thoughts, questions, or feedback. When creating a comment, users provide text content that represents their contribution to the discussion. The comment is automatically associated with the commenting user and the target post. The comment is visible to all users viewing the post. Comments can be written by both authenticated members and guests. If the post does not exist, the request is rejected. If the user attempts to comment on a deleted post, the request is rejected.

### Comment Replies

Users can reply to any existing comment, creating a nested conversation thread. A reply is itself a comment that is associated with both the parent comment and the original post. Replies can themselves receive replies, allowing for multi-level discussions. There is no limit to the depth of reply nesting. The system maintains the hierarchical relationship between parent comments and their replies to enable threaded display. When viewing replies, the system displays the full conversation thread in its proper structure.

### Edit Comment

Users can edit their own comments to make corrections, updates, or improvements after posting. The edit operation allows users to modify the comment text content. Users can only edit comments that they created. Users cannot edit comments created by other users. When a comment is edited, the modification timestamp is updated. If the comment does not exist, the edit request is rejected. If the user does not own the comment, the edit request is rejected.

### Delete Comment

Users can delete their own comments to remove them from the post completely. Deletion permanently removes the comment and all of its associated data from the system. The comment author is the only user who can delete their own comment. Users cannot delete comments created by other users. When a comment is deleted, it is no longer visible to any user. If the comment does not exist, the delete request is rejected. If the user does not own the comment, the delete request is rejected.

### Comment Thread Display

Each comment displays the author's username, the comment content, vote score, and time since posted. Comments appear in a threaded format that shows the hierarchical relationship between parent comments and replies. The thread display shows nested replies indented or visually structured to indicate their position in the conversation. All comments are visible to any user viewing the post, regardless of authentication status. The system displays all comments and their reply chains in a single view.

### Comment Voting

Users can upvote or downvote any comment to express their opinion. Each user can vote once per comment with either an upvote or downvote. Users can change their vote from upvote to downvote or vice versa. Users can remove their vote entirely. The vote score for a comment equals the total number of upvotes minus the total number of downvotes. Vote scores can be negative. When a vote is added, removed, or changed, the comment's vote score is updated in real time.

## ModeratorRole Operations

The user who creates a community becomes the owner and holds the highest authority level in that community. The owner can add other users as moderators to help manage the community. The owner can remove moderators from their community when needed. Moderators have the ability to add other users as moderators within the community. Moderators cannot remove the owner from the community under any circumstances. Moderators also cannot remove each other from the moderator list, only the owner has that authority. This hierarchical structure ensures clear ownership and prevents moderator power struggles. The owner maintains final decision-making authority for all moderation actions.

### Community Owner Role

The user who creates a community automatically becomes the owner and holds the highest authority level in that community. The owner cannot be removed from their position by any other user or moderator under any circumstances. The owner maintains permanent control over all moderator management actions including adding and removing moderators.

### Owner Adds Moderator

The owner can add any user to the moderator role for their community. When a user is added as a moderator, they immediately gain the ability to add other moderators and perform moderation actions within the community. The owner retains the authority to remove moderators at any time, which immediately revokes their moderator privileges.

### Owner Removes Moderator

Only the owner can remove moderators from the community. When a moderator is removed, they lose all moderator privileges immediately and revert to being a regular community member with standard user permissions. The removal action is effective instantly and the former moderator cannot undo this action.

### Moderator Adds Other Moderator

A moderator can add additional users as moderators within the community. This delegated authority allows the owner to distribute moderation management responsibilities. However, users added as moderators by one moderator do not gain special status that would allow them to remove their adder or other moderators; they only gain the ability to add new moderators themselves.

### Moderator Cannot Remove Owner

No moderator, regardless of when they were added or who added them, can ever remove the community owner from their position. The owner's authority is permanent and protected from all moderator actions. This restriction ensures the original community creator always retains ultimate control and cannot be removed through any moderator workflow.

### Moderator Cannot Remove Peers

Moderators cannot remove other moderators from the community, regardless of who added them or the order of appointment. This restriction prevents power struggles between moderators and ensures all moderator removals must come from the owner. A moderator added by one user has no special privilege to remove the moderator who added them or any other moderator.

### Owner Removal Only Authority

The exclusive authority to remove moderators belongs solely to the community owner. No other user role, including moderators, has any capability to remove moderators from the community. When moderator removal is needed, only the owner can perform this action. This concentration of authority in the owner role prevents moderator power distribution and maintains clear ownership.

### Moderation Hierarchy Structure

The moderation structure follows a clear hierarchy:
- Owner: highest authority, can add and remove any moderator, cannot be removed
- Moderator: can add other moderators, cannot remove any moderator or the owner, can perform moderation actions
- Member: regular user with no moderation privileges

This hierarchy ensures the owner maintains ultimate control while allowing delegated moderator management for adding new moderators.

### Moderator Addition Workflow

Adding a moderator requires either the community owner or an existing moderator to initiate the action. The owner can add any user to moderator status at any time. Moderators can also add new moderators, which allows owners to delegate this management responsibility. Once added, the new moderator immediately gains the ability to add other moderators, creating a chain of addition authority without removal authority.

### Moderator Removal Workflow

Removing a moderator requires the community owner to perform the action. When the owner removes a moderator, that user immediately loses all moderator privileges and reverts to regular member status. The removal takes effect instantly and the former moderator cannot perform any moderator actions after removal. No other user has the authority to initiate or execute moderator removal.

## BanRecord Operations

Moderators can ban users from their community, preventing those users from creating posts or comments within that community. Moderators can also unban previously banned users to restore their posting and commenting abilities. Moderators can view a list of all users who are currently banned from the community. Banned users retain the ability to view content in the community but cannot participate through posts or comments. When a user is banned, the ban record includes the reason for the ban and when it occurred. Users removed from the ban list regain full participation rights in that community. The ban applies only to the specific community, not the entire platform.

### Ban User from Community

Moderators can ban any user from their community. When a ban is enacted, the user is prevented from creating new posts and comments within that community. The ban is specific to the community and does not affect the user's ability to participate in other communities. The moderator must document a reason for the ban when creating the ban record. The system records the date and time when the ban was enacted.

### Unban Banned User

Moderators can unban previously banned users from their community. When a user is unbanned, they immediately regain the ability to create posts and comments in that community. Unbanning restores full participation rights that were lost due to the ban. The unban action removes the user from the community's ban list.

### View Banned Users List

Moderators can view a list of all users who are currently banned from their community. The list shows each banned user's identity and the reason documented for their ban. Moderators can also see when each ban was enacted.

### Banned User Posting Restriction

Users who are banned from a community cannot create new posts or comments in that community. This restriction applies to both original posts and replies to existing comments. When a banned user attempts to create content, the action is rejected and the request is denied.

### Banned User Viewing Allowed

Users who are banned from a community retain the ability to view content within that community. They can still read posts and comments written by other users. The ban only restricts their ability to participate through creating new content, not to consume existing content.

### Ban Reason Documentation

When a moderator creates a ban, they must provide a reason explaining why the ban was enacted. The reason is stored as text and is visible to other moderators viewing the banned users list. The reason helps moderators understand the context of existing bans and track enforcement patterns.

### Ban Timestamp Recording

The system records the exact date and time when each ban is enacted. This timestamp is stored with the ban record and is displayed when moderators view the banned users list. The timestamp allows moderators to understand the duration of bans and when they were issued.

### Community-Specific Ban Scope

Bans are scoped to individual communities and do not extend to other communities on the platform. A user banned from one community can still participate normally in other communities where they are not banned. Each community maintains its own separate list of banned users.

### Restore Access via Unban

When a moderator unbans a user, the user's access to the community is immediately restored. The user can begin creating posts and comments without requiring any additional approval or waiting period. The unban action effectively reverses all posting restrictions that were imposed by the ban.

## Report Operations

Users can report any post or comment they believe violates community guidelines by submitting a report. When reporting, users must provide a text reason explaining why they are reporting the content. Moderators can view all reports submitted for their community through a dedicated report management interface. Each report displays the reported content, who submitted the report, and the reason provided by the reporter. Moderators can approve a report, which results in the reported content being deleted. Moderators can also dismiss a report, which keeps the content visible and removes it from the active report list. Dismissed reports are permanently removed from the report queue and no longer appear to moderators.

### Report Creation

Users can report any post or comment they believe violates community guidelines. When submitting a report, users must provide a text reason explaining why they are reporting the content. The report is associated with the community where the reported content exists.

### Report Display Information

Each report displays the reported content, the identity of the user who submitted the report, and the reason text provided by the reporter. This information is visible to moderators reviewing reports for their community.

### Moderator Report Viewing

Moderators can view all reports submitted for their community through a dedicated report management interface. Moderators can see the full list of active reports along with their details.

### Report Approval

When a moderator approves a report, the reported content is deleted. This action removes the post or comment from the platform permanently. The approval action also marks the report as resolved.

### Report Dismissal

When a moderator dismisses a report, the reported content remains visible and accessible. The report is removed from the active report queue and is no longer shown to moderators.

### Report Queue Management

Only reports that have not been approved or dismissed appear in the active report queue. Dismissed reports are permanently removed from the queue and do not reappear. Moderators can manage the report queue by processing reports in any order.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

Users attempting to sign up with an email that already exists in the system will be prevented from creating a duplicate account. The platform rejects registration when the chosen username is already taken by another user. Users cannot change their email address once the account is created, so a lost email requires account deletion and recreation. When a user attempts to delete their account, the system warns that all their posts and comments will be permanently removed. Users who try to log in with incorrect credentials receive a generic error message that does not reveal whether the email exists. Password changes require entering the current password before setting a new one. If the current password is wrong, the change request is rejected. Users who delete their account lose all access to the platform immediately.

### Duplicate Email Registration Prevention

When a user attempts to create a new account using an email address that already exists in the system, the registration request is rejected. The platform does not allow multiple accounts to be associated with the same email address. The system prevents the creation of a duplicate account and displays an error message indicating that the email address is already in use. The user must either log in with the existing account or use a different email address to create a new account.

### Username Uniqueness Validation

When a user attempts to create an account with a username that is already taken by another user, the registration request is rejected. The platform does not allow duplicate usernames. The system checks if the chosen username is available before completing the registration. If the username is already taken, the user is prompted to choose a different username. This validation occurs at account creation time.

### Email Address Immutability After Creation

Once a user account has been created, the email address associated with that account cannot be changed. The system does not provide a mechanism to update or modify the email address after account creation. If a user loses access to their email address or needs to change it for any reason, they must delete their existing account and create a new account with the desired email address. All content associated with the original account will be lost during this process.

### Account Deletion Confirmation Process

When a user initiates the account deletion process, the system requires explicit confirmation before proceeding. The user must acknowledge that deleting their account is a permanent action. The system displays a confirmation dialog that clearly states what will be removed: all posts created by the user, all comments written by the user, and the account itself. The user must affirmatively confirm this action to proceed with deletion. Without explicit confirmation, the deletion process is cancelled.

### Permanent Content Loss Warning

Before completing account deletion, the system displays a warning that explicitly states all user-generated content will be permanently removed. This includes all posts the user has created, all comments the user has written, and all associated data. The warning emphasizes that this deletion is irreversible and cannot be undone. Users must acknowledge this warning and confirm they understand the permanent loss of content before the deletion can proceed.

### Wrong Password Login Attempt Handling

When a user attempts to log in with an incorrect password, the system does not reveal whether the email address exists or is valid. The system displays a generic error message that indicates the login failed without providing specific details about which credential (email or password) was incorrect. This prevents attackers from determining if an email address is registered in the system. The same error message is displayed regardless of whether the email exists or the password is simply wrong.

### Current Password Validation for Changes

When a user attempts to change their password, the system requires them to enter their current password to verify their identity. The user must provide the correct current password before the system will accept a new password. If the entered current password does not match the one on file, the password change request is rejected. The system does not allow password changes without successful current password verification. This ensures that only the legitimate account holder can modify their account credentials.

### Account Deletion and Content Removal

When a user confirms account deletion, the system permanently removes the user's account from the platform. All posts created by the user are deleted and no longer visible. All comments written by the user are deleted and no longer visible. The user loses all access to the platform immediately after deletion. This includes the ability to log in, view content, or recover any previously created content. The deletion is immediate and irreversible.

## Profile Error Scenarios

Users editing their profile cannot save a display name that is already used by another user. The bio text field accepts any text length without a maximum limit. When users upload an avatar, the system handles unsupported image formats gracefully. Users viewing another profile can always see publicly available information even if they are not logged in. Attempting to edit another user's profile is rejected by the system. Users cannot set an empty display name or remove their avatar completely. If a user's avatar image becomes corrupted, the system displays a default placeholder image instead. Profile changes are applied immediately without requiring additional approval steps.

### Duplicate Display Name Rejection

Users cannot set a display name that is already in use by another account. When a user attempts to update their profile with a display name that matches an existing user's display name, the system rejects the change and displays an error message. The user must choose a different display name that is not currently in use to complete the profile update.

### Bio Text Length Flexibility

The bio text field accepts any length of text without imposing a maximum character or word limit. Users can write short bios with a single sentence or extended bios with multiple paragraphs. The system does not truncate or restrict the bio content regardless of how much text is entered.

### Unsupported Image Format Handling

When users upload an avatar image file, the system validates the file format. If the file format is not supported, the system rejects the upload and displays an error message. The user is prompted to select a different file with an acceptable format to complete the avatar update.

### Public Profile Visibility for Non-Authenticated Users

Users who are not logged in (guests) can view any other user's profile page. Guests can see the display name, bio text, avatar image, total karma score, list of posts created by the user, and list of comments written by the user. The profile information is publicly accessible without requiring authentication or membership.

### Foreign Profile Edit Rejection

Users cannot edit the profile information of other users. When a user attempts to update another user's display name, bio, or avatar, the system rejects the request and displays an error message. Users can only modify their own profile information. The system prevents any attempt to change another user's profile data.

### Empty Display Name Rejection

Users cannot set an empty or blank display name. If a user attempts to save a profile with an empty display name, the system rejects the change and displays an error message. The user must provide a non-empty display name to complete the profile update.

### Avatar Removal Restriction

Users cannot completely remove their avatar image. When attempting to remove or clear an avatar, the system prevents the action and displays an error message. Users can only replace their current avatar with a new image upload; they cannot delete it entirely. An avatar image must always be present on the user's profile.

### Corrupted Image Fallback Display

If a user's avatar image file becomes corrupted or cannot be displayed for any reason, the system automatically displays a default placeholder image instead of showing a broken image icon or blank space. The placeholder image is shown consistently to all users viewing the profile, ensuring a professional appearance even when the original image is unavailable.

## Community Error Scenarios

Users creating a community cannot use a name that is already taken by another community. The unique community name must follow naming conventions to avoid confusion. When searching for communities, users receive no results if the search term matches no communities. Users can browse all communities in a paginated list even if the community list is very large. Attempts to create a community with a name that violates naming rules are rejected. Community owners can remove communities they own but the system requires confirmation before deletion. A community with zero subscribers is still viewable and accessible to users. If a community is deleted, all its posts and comments are also removed.

### Community Name Uniqueness

Users cannot create a community using a name that is already taken by another community in the system. When a user attempts to create a community with a name that already exists, the creation request is rejected and the user is notified that the name is unavailable. The system checks for exact name matches only. The community name must be unique across the entire platform, not just within a user's created communities. Users may choose a different name and resubmit the community creation request.

### Community Naming Rules Validation

Community names must follow specific formatting rules to ensure consistency and avoid confusion. When a user attempts to create a community with a name that violates these naming rules, the creation request is rejected. The system provides clear feedback indicating which naming rule was violated so users can correct their input and resubmit. The community name is not saved in the system if validation fails.

### Empty Search Results Handling

When users search for communities using a search term, they receive a list of matching communities. If no communities match the search term, the system displays a message indicating that no communities were found. The search does not return error messages or fail states when no matches exist. The empty result state is a normal, expected outcome of the search operation. Users can modify their search term or browse the full community list to discover communities.

### Paginated Community Browsing

Users can browse all communities in the system through a paginated list view. When the total number of communities exceeds the display limit for a single page, the system shows additional pages with navigation controls. Each page displays a fixed number of communities. Users can navigate to the first, previous, next, and last pages as available. The pagination allows users to efficiently browse large community lists without performance degradation. All communities are accessible through the paginated browse function regardless of their subscriber count or creation date.

### Community Deletion Confirmation

Community owners can delete their own communities from the system. Before a community is deleted, the system requires explicit confirmation from the owner. The confirmation process warns the owner that deletion will permanently remove the community and all its associated content. Deletion cannot be performed through automated processes or API calls without user confirmation. Users must actively confirm deletion through the interface before the action is completed. Once confirmed, the community is removed and cannot be recovered.

### Zero Subscriber Community Access

Communities with zero subscribers are fully viewable and accessible to all users. The absence of subscribers does not restrict access to the community or its content. Users can view the community details, browse its posts, and interact with the content regardless of subscription count. New users can browse and discover communities with no subscribers just like any other community. A zero subscriber count is a valid, normal state for a community and does not indicate any system error or access restriction.

### Cascade Deletion on Community Removal

When a community owner deletes their community, all content associated with that community is also removed from the system. This includes all posts created within the community and all comments within those posts. The cascade deletion ensures no orphaned content remains after community removal. Users are warned during the deletion confirmation that this content will be permanently deleted along with the community. The cascade deletion happens as a single atomic operation—either the community and all its content are deleted, or neither is deleted. This maintains data integrity across the platform.

## Subscription Error Scenarios

Users attempting to subscribe to a community they are already subscribed to receive a notification that the subscription already exists. Users can unsubscribe from any community they are subscribed to at any time. When a user unsubscribes, their ability to create posts in that community is immediately revoked. Users trying to create a post in a community they are not subscribed to are blocked from doing so. The system displays the list of subscribed communities in an accessible interface. Users viewing a community can see the current subscriber count accurately updated. Edge cases include subscribing immediately after unsubscribing from the same community. Users cannot subscribe to a community that has been deleted.

### Duplicate Subscription Handling

Users can subscribe to any community they are not currently subscribed to.

If a user attempts to subscribe to a community they are already subscribed to, the system rejects the request and displays a notification that the user is already a subscriber.

The subscription request is not duplicated in the system. The user remains with a single active subscription record for that community.

### Unsubscription Immediate Effect

Users can unsubscribe from any community they are subscribed to at any time.

When a user unsubscribes, their ability to create new posts in that community is immediately revoked.

The user can still view existing content from that community, but cannot contribute new posts or comments.

The subscription record is updated to reflect the unsubscription status.

### Post Creation Without Subscription

Users must be subscribed to a community before they can create posts in that community.

When a user attempts to create a post in a community they are not subscribed to, the system blocks the action and displays a message requiring the user to subscribe first.

The user is provided with a link to subscribe to the community before proceeding with post creation.

### Subscribed Communities List Access

Logged-in users can view a list of all communities they are currently subscribed to.

Each entry in the list displays the community name, description, and current subscriber count.

Users can navigate from the list to view community pages or unsubscribe from individual communities.

Guest users cannot access the subscribed communities list.

### Subscriber Count Accuracy

Each community displays an accurate count of its current subscribers.

The subscriber count increases by one when a user successfully subscribes.

The subscriber count decreases by one when a user unsubscribes or when their subscription is cancelled.

The count updates in real-time to reflect the current state of subscriptions.

### Immediate Re-subscription Allowance

Users can immediately resubscribe to a community after unsubscribing from it.

There is no waiting period or cooldown between unsubscribing and re-subscribing to the same community.

The system accepts the new subscription and updates the subscription date accordingly.

This allows users to follow communities that may become relevant to them at different times.

### Deleted Community Subscription Rejection

Users cannot subscribe to a community that has been deleted.

When a user attempts to subscribe to a deleted community, the system rejects the request and displays an error message indicating the community no longer exists.

Existing subscriptions to deleted communities are automatically removed from the user's subscribed list.

Users cannot create posts in deleted communities.

### Subscription Status Visibility

When viewing any community page, users can see their subscription status.

Subscribed users see an indication that they are subscribed, with an option to unsubscribe.

Non-subscribed users see an indication that they are not subscribed, with an option to subscribe.

Deleted communities do not display subscription options.

## Post Error Scenarios

Users creating a post must provide a title or the system rejects the post creation. Posts must be one of three valid types: text, link, or image. If a link post contains an invalid URL format, the system may reject or accept it depending on validation rules. Users editing their own post cannot change the post type from one category to another after creation. Deleting a post requires explicit confirmation to prevent accidental loss. Users cannot edit or delete posts created by other users. When a user deletes their account, all their posts are automatically removed. Moderators can delete posts from any user within their community. A post with zero votes is still visible and accessible to all users.

### Missing Title Rejection

Users creating a new post must provide a title. The title field is required and cannot be empty. If a user attempts to create a post without entering a title, the system rejects the post creation and displays an error message indicating that a title is required. Users must enter a title before the post is submitted.

### Invalid Post Type Submission

When creating a post, users must select one of three valid post types: text, link, or image. If a user attempts to submit a post with an unrecognized or invalid type, the system rejects the post creation. The system accepts only these three defined post types and rejects any other type selection. Each post type has specific content requirements: text posts require content, link posts require a URL, and image posts require an image file.

### Post Type Immutability After Creation

Once a post is created, its type cannot be changed. Users editing their own posts cannot modify the post type from one category to another (for example, changing from a text post to a link post or from an image post to a text post). The post type is set at creation time and remains fixed for the lifetime of the post. Users can edit other content within the same post type, but cannot change the type itself.

### Post Deletion Confirmation Requirement

Before a post is permanently deleted, the system requires explicit confirmation from the user. When a user initiates post deletion, a confirmation dialog appears asking the user to verify their intention to delete the post. Deletion does not occur until the user confirms. This confirmation step is required to prevent accidental loss of content. Users must take an additional action to confirm deletion beyond simply clicking the delete button.

### Foreign Post Edit Rejection

Users cannot edit posts created by other users. The system restricts post editing to only the author of the post or a moderator of the community where the post was created. If a user attempts to edit a post they did not create and are not a moderator of, the system rejects the edit request and indicates that the user does not have permission to edit that post. Only the post author or a community moderator can modify post content.

### Foreign Post Deletion Rejection

Users cannot delete posts created by other users unless they are moderators of the community where the post was created. If a user attempts to delete a post they did not create and are not a moderator of, the system rejects the deletion request. Only the post author or a community moderator can delete a post. Moderators can delete posts from any user within their community, but regular users can only delete their own posts.

### Account Deletion Cascade to Posts

When a user deletes their account, all posts created by that user are automatically removed from the system. This deletion includes all posts regardless of their current state or vote count. The account deletion process cascades to remove all associated content created by the user, including all posts and comments. Users are informed during the account deletion process that their posts will be permanently deleted.

### Moderator Post Deletion Authority

Moderators have the authority to delete any post within their community, regardless of who created the post. Moderators can remove posts created by other community members as a moderation action. This authority applies to all posts in the community where the user has moderator privileges. Moderators can also delete comments within their community. This power is independent of post ownership and is granted by the community owner.

### Zero Vote Post Visibility

Posts with zero votes are fully visible and accessible to all users who have permission to view the community. A post's visibility is not affected by its vote score. Users can view, read, and interact with posts that have no upvotes or downvotes. The system does not hide or filter out posts based on having a zero vote count. Zero-vote posts appear in feeds alongside posts with any other vote count and are treated the same as posts with positive or negative scores.

## Vote Error Scenarios

Users can change their vote from upvote to downvote or vice versa on the same post or comment. Attempting to vote twice on the same content without changing the vote is rejected by the system. Users can remove their vote entirely, setting the vote score back to zero for that user. Vote scores update in real time and reflect the current state accurately. Negative vote scores are allowed and display correctly to all users. When a user deletes their content after receiving votes, the vote history remains but the content disappears. Moderators cannot manipulate vote scores for their community posts. The vote score equals total upvotes minus total downvotes and updates immediately upon voting.

### Duplicate Vote Rejection Without Change

Users may submit a vote action on a post or comment. When a user attempts to cast a vote that is the same as their existing vote (e.g., upvoting when already upvoted, or downvoting when already downvoted), the system rejects the request. The vote score remains unchanged, and no new vote record is created. The user receives a rejection message indicating that their vote cannot be applied because they have already submitted the same vote type on this content. This prevents duplicate vote entries and maintains data integrity.

### Vote Type Change Allowed

Users may change their existing vote from upvote to downvote, or from downvote to upvote, on the same post or comment. When a vote type change occurs, the system updates the existing vote record rather than creating a new one. The vote score recalculates immediately: if changing from upvote to downvote, the score decreases by 2 (from +1 to -1 change); if changing from downvote to upvote, the score increases by 2. The user's previous vote is replaced by the new vote type, and only one vote per user per content item exists at any time.

### Vote Removal to Zero

Users may remove their vote entirely from a post or comment at any time. When a user removes their vote, the system deletes the vote record and sets that user's contribution to the vote score to zero. If the user was the only person who voted on the content, the vote score returns to zero (neutral). If other users have voted, the vote score recalculates based on remaining votes. The action is permanent until the user casts a new vote. Vote history is preserved in audit logs but the active vote is removed from public display.

### Real-Time Vote Score Updates

Vote scores update in real time across the system whenever a vote is cast, changed, or removed. When a user votes on a post or comment, the vote score displayed to all users (including those viewing the content simultaneously) reflects the new score immediately. The score calculation is consistent and accurate for all users at all times. There is no delay between voting action and score update visibility. This ensures all users see the same vote score, maintaining system integrity and preventing confusion from stale data.

### Negative Score Acceptance

The system allows vote scores to become negative. When a post or comment receives more downvotes than upvotes, the vote score displays as a negative number (e.g., -5, -10). Negative scores are displayed the same way positive scores are, with a minus sign preceding the number. Negative scores are valid and do not trigger any error conditions or restrictions. Users with negative vote scores on their content are not notified or penalized. Negative scores are shown in all feeds and listings without modification or hiding.

### Deleted Content Vote Preservation

When a user deletes a post or comment that has received votes, the vote records are preserved in the system even though the content becomes inaccessible. The vote history remains intact for audit and reporting purposes. The vote scores for the deleted content disappear from public view since the content no longer exists. However, the votes themselves are not deleted and can still be referenced in administrative reports. This preserves the integrity of the voting system while respecting the user's deletion request for their content.

### Moderator Vote Manipulation Prevention

Moderators cannot manipulate vote scores for posts or comments in their community. Moderators have no special voting privileges that allow them to cast multiple votes, alter vote counts, or suppress votes from other users. Vote operations for moderators are identical to regular member operations: one vote per content item, with the same scoring rules. The system does not differentiate between moderator and member votes in terms of scoring weight or visibility. All votes contribute equally to the final score regardless of the voter's role or status in the community.

### Vote Score Calculation Accuracy

The vote score always equals the total number of upvotes minus the total number of downvotes. The system calculates this accurately for every post and comment. Each upvote contributes +1 to the score; each downvote contributes -1. The calculation includes all votes regardless of when they were cast or who cast them. The score updates immediately when any vote changes, is removed, or a new vote is added. The calculation is consistent across all views of the same content, ensuring all users see the same vote score at any given moment.

## Comment Error Scenarios

Users creating a comment must provide content or the system rejects the submission. Users can reply to any comment with no depth limit on nesting levels. Comment replies can themselves have replies, creating unlimited thread depth. Users editing their own comments cannot change the comment type or category. Deleting a comment requires confirmation to prevent accidental removal. Users cannot edit or delete comments created by other users. When a user deletes their account, all their comments are also deleted. Moderators can delete any comment within their community regardless of author. Comments with negative scores remain visible unless deleted by moderator or author.

### Comment Content Requirements

Users can create a comment by providing content text. The content is required and cannot be empty. If the content is missing or contains only whitespace, the system rejects the comment creation.

When creating a reply comment, the same content requirements apply. Users must provide actual text content; empty or blank content is not allowed.

### Comment Reply Hierarchy

Users can reply to any comment, and there is no limit to how deep the reply nesting can go. A reply can itself have replies, allowing for unlimited thread depth.

Each reply maintains its position in the thread hierarchy. The system preserves the full nesting structure when displaying comments and replies.

### Comment Editing Rules

Users can edit their own comments after creation. When editing, users can modify the text content but cannot change the fundamental nature of the comment.

Users cannot edit comments created by other users. Attempting to edit a foreign comment results in rejection.

Edited comments maintain their original creation timestamp. Only the content changes, not when the comment was first created.

### Comment Deletion Confirmation

Users can delete their own comments. Before deletion, users must confirm the action to prevent accidental removal.

Once deleted, the comment is removed from all views. The deletion cannot be undone. The comment count for the associated post is updated to reflect the removal.

### Account Deletion Impact on Comments

When a user deletes their account, all comments they have created are also automatically deleted as part of the account deletion process.

This includes all direct comments and replies the user has written. The deletion cascade ensures no orphaned content remains after account removal.

### Moderator Comment Management

Moderators can delete any comment within their community, regardless of who wrote it. This authority applies to all posts and comments in communities where the user has moderator privileges.

The owner of a community has full moderator authority and can perform all moderator actions, including adding and removing other moderators.

### Comment Visibility Rules

Comments with negative vote scores remain visible in the system unless deleted by the author, moderator, or system administrator.

Negative scores do not trigger automatic hiding or removal. Only manual deletion actions remove comments from visibility.

## ModeratorRole Error Scenarios

Community owners can add moderators without limit to their community. Moderators can add other moderators but cannot remove the owner or other moderators. When a moderator is removed, their moderator privileges are immediately revoked. Users trying to perform moderator actions without the proper role are denied access. Owners cannot remove themselves from the owner role. Moderators cannot add moderators with conflicting permissions or roles. The system maintains a clear hierarchy where owners have ultimate authority. When a community owner deletes their account, new owners must be assigned or the community becomes inaccessible. Removing a moderator from a position requires confirmation to prevent accidental role changes.

### Moderator Addition Without Limit

Community owners can add moderators to their community without any numerical limit. There is no restriction on how many moderators an owner can add to a community. Each added moderator receives the same permissions as existing moderators in that community. The system does not enforce a maximum number of moderators per community.

### Moderator Removal Restrictions

Community owners can remove moderators from their community at any time. Moderators cannot remove other moderators from their community. Moderators cannot remove the community owner under any circumstances. When a moderator attempts to remove another moderator, the action is rejected. The system enforces that only the owner has moderator removal privileges.

### Moderator Privilege Revocation on Removal

When a moderator is removed by the community owner, their moderator privileges are immediately revoked. The user retains their basic member account status and can continue to use the platform normally. Removed moderators lose all moderator-specific permissions including the ability to delete posts, delete comments, ban users, unban users, and view report lists specific to moderation actions. The privilege revocation takes effect instantly upon the removal action being completed.

### Unauthorized Moderator Action Denial

Users attempting to perform moderator actions without the proper role are denied access to those actions. Moderators attempting actions outside their scope receive access denial. Only users with the owner role can remove moderators from their community. Only users with moderator roles or owner roles can delete posts and comments within their community. Only users with moderator roles or owner roles can ban or unban users from their community. The system validates the user's role before allowing any moderator action.

### Owner Self-Removal Prevention

Community owners cannot remove themselves from the owner role through normal moderator management operations. The owner role cannot be transferred or removed by any user including the owner themselves. This prevents accidental or malicious removal of the sole owner from the community. If an owner attempts to remove themselves from the owner role, the action is rejected with an appropriate error message.

### Moderator Role Hierarchy Enforcement

The system maintains a clear hierarchy where owners have ultimate authority over all moderators in their community. Owners can add moderators without restriction. Moderators can add other moderators but cannot remove owners from their role. Moderators cannot remove each other from their positions. The hierarchy ensures that owners maintain final control over community governance. When a moderator adds another moderator, the new moderator has the same privileges as the adding moderator.

### Owner Role Permanence

The owner role is permanent and cannot be voluntarily relinquished through standard operations. The owner role can only change if the community owner deletes their account, at which point new ownership must be assigned or the community becomes inaccessible. The owner role grants the highest level of authority and cannot be downgraded to a regular moderator role while retaining ownership. Users cannot downgrade their own role from owner to moderator.

### Moderator Role Change Confirmation

Adding a moderator requires explicit confirmation to prevent accidental role assignments. Removing a moderator requires explicit confirmation to prevent accidental role revocation. The system presents a confirmation dialog before completing any moderator role changes. Users must confirm the action explicitly before it is processed. This confirmation step ensures that role changes are intentional and prevents errors from occurring.

## BanRecord Error Scenarios

Users can only be banned by moderators from specific communities where they have moderator authority. Banned users can still view content in that community but cannot create posts or comments. Moderators can view a complete list of all banned users in their community. Unbanning a user restores their ability to create posts and comments in that community. Users cannot ban themselves or other users from communities where they lack authority. Multiple ban records can exist for the same user in different communities. When a community is deleted, all ban records for that community are also removed. Banned users receive a notification explaining they cannot participate in the community.

### Moderator Authority for Community Actions

Only users with moderator roles in a specific community can perform moderation actions within that community.

A user who is a moderator in one community cannot ban, unban, or delete content in a different community where they do not have moderator authority.

The system validates moderator status before allowing any moderation action. If the requesting user is not a moderator of the target community, the action is rejected.

Moderator roles are scoped to individual communities. Being an owner or moderator in Community A does not grant any moderation powers in Community B.

### Banned User Read-Only Access

When a user is banned from a community, they retain read-only access to that community.

Banned users can view posts, comments, and community information in the banned community.

Banned users cannot create new posts in the banned community.

Banned users cannot write comments on posts in the banned community.

Banned users cannot reply to existing comments in the banned community.

The system prevents any write operations from banned users with a clear rejection message explaining the ban status.

### Banned Users List Visibility

Moderators of a community can view a complete list of all users banned from that community.

The banned users list displays: username, ban reason, and date the ban was applied.

The ban list is accessible from the community moderation dashboard.

Only users with moderator roles for the specific community can access the banned users list.

Guest users cannot view the banned users list of any community.

The list can be paginated if the community has a large number of banned users.

### Unban Restoration of Privileges

Moderators can unban users from their community to restore their posting and commenting privileges.

When a user is unbanned, they immediately regain the ability to create posts and comments in that community.

Unbanning removes the ban record for that user in that specific community.

Unbanned users retain their ability to view all community content regardless of ban status.

A user can be banned and unbanned multiple times in the same community, with each ban being recorded separately.

### Self-Ban Prevention

Users cannot ban themselves from any community.

The system prevents a user from being added to the banned users list of any community where they exist.

If a moderator attempts to ban a user who is currently banned in that community, the action is rejected with a message indicating the user is already banned.

Community owners cannot ban themselves from the communities they own.

The system validates that the user being banned is not the same as the user performing the ban action.

### Cross-Community Ban Records

Ban records are scoped to individual communities. A ban from Community A does not affect a user's ability to participate in Community B.

A user can be banned from multiple different communities simultaneously.

Each ban record tracks the specific community, ban reason, and ban date independently.

Users can be banned from some communities while maintaining full access to others.

Being banned from one community does not impact a user's status or privileges in other communities.

### Community Deletion Cascade to Bans

When a community is deleted, all ban records associated with that community are automatically removed.

The deletion of a community removes all data related to that community, including posts, comments, and ban records.

Users who were banned from a deleted community are automatically unbanned from all records of that community.

The system preserves user data and ban records from other communities unaffected by the deletion.

Moderators of other communities are not impacted by the deletion of a different community.

### Ban Notification to Affected Users

When a user is banned from a community, they receive a notification informing them of the ban.

The notification includes: the community name, the reason for the ban, and the date the ban was applied.

The notification clearly states that the user can still view community content but cannot post or comment.

Banned users receive the notification via their registered email address.

The notification is sent immediately when the ban is applied.

## Report Error Scenarios

Users can report any post or comment by providing a text reason for the report. Moderators can view all reports for their community in a dedicated interface. Each report shows the reported content, who reported it, and the reported reason. Moderators can approve a report, which deletes the reported content permanently. Moderators can dismiss a report, keeping the content visible and removing the report from the list. Dismissed reports do not appear in the report management interface afterward. Users cannot view the status of their reports after submission. Multiple reports on the same content by different users are handled individually. Reports from banned users on the same community are rejected or ignored.

### Reported Content Identification

When a user reports a post or comment, the system must identify and record the specific content being reported. Each report is tied to exactly one piece of content. Moderators viewing reports can see the title of reported posts or the full text of reported comments. The reported content is displayed alongside the report to enable moderator review.

### Report Reason Text Requirement

Users must provide a text reason when submitting a report. The reason field is required and cannot be empty. Users can write any text describing why they believe the content violates community guidelines. The system rejects reports submitted without a reason text. The reason text is stored with the report for moderator review.

### Moderator Report Viewing Interface

Moderators can access a dedicated interface to view all reports for their community. The interface lists all pending reports that require review. Each report entry shows the reported content, the user who submitted the report, and the reason provided. Moderators can review each report individually before taking action.

### Report Approval Content Deletion

When a moderator approves a report, the reported content is deleted from the system. If the report targets a post, the post is permanently removed from the community. If the report targets a comment, the comment is permanently removed from the post thread. The deletion is permanent and cannot be undone. After approval, the report is marked as approved and no longer appears in the pending reports list.

### Report Dismissal Content Preservation

When a moderator dismisses a report, the reported content remains visible and unchanged in the system. Dismissing a report indicates the moderator believes the content does not violate community guidelines. The content stays available to all users who can view it. Dismissing a report removes it from the pending reports list for the community.

### Dismissed Report List Removal

Dismissed reports are removed from the moderator's report management interface and are no longer visible. Users who submitted the report cannot view the status of their reports in any interface. The dismissed report record is retained for audit purposes but does not appear in active report listings. Banned users who submit reports on their banned community have their reports rejected or ignored.

### Report Status Visibility Restriction

Users who submit reports cannot view the status of their reports after submission. The system does not notify users whether their report was approved or dismissed. Users cannot see whether reported content was deleted or preserved. This restriction applies to all users regardless of their role in the community.

### Duplicate Report Handling

Multiple users can report the same post or comment independently. Each report is tracked and handled individually by moderators. When multiple reports exist on the same content, moderators review each report separately. A single report approval results in the reported content being deleted regardless of how many duplicate reports exist. Users cannot submit multiple reports on the same content from the same account.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### User Registration and First Post Journey

A new user begins by creating an account with an email address, password, and unique username. The system validates that the email is not already registered and that the username is available. Once the account is created, the user logs in with their credentials.

After logging in, the user can browse communities available in the platform. The user selects a community they are interested in and subscribes to it. Subscription is required before the user can create posts in that community.

Once subscribed, the user creates their first post in the community. The user chooses a post type (text, link, or image) and provides a required title. For text posts, the user enters content. For link posts, the user provides a URL. For image posts, the user uploads an image.

After creating the post, the user can view their post in the community feed, see their post score, and begin receiving votes from other community members. The user can also write comments on other posts in the community.

If the user encounters any issues during this journey, such as duplicate email or username, the system rejects the request and prompts the user to provide different information.

### Community Creation and Moderation Journey

A user who wants to build a community creates a new community by providing a unique name, description text, and an icon image. The system validates that the community name is not already in use. Upon creation, the user becomes the owner of the community.

As the owner, the user can subscribe to their own community and begin posting content. The owner can also invite other users to become moderators by assigning them moderator roles.

A moderator can be added by the owner or by another moderator. Once assigned, the moderator gains the ability to delete posts and comments within the community, ban users from the community, and view the list of reported content.

When a user reports a post or comment, the moderator can review the report, which includes the reported content, the identity of the reporter, and the reason provided. The moderator can approve the report to delete the reported content or dismiss it to keep the content.

The owner has the ability to remove moderators, but moderators cannot remove the owner or remove other moderators. If a moderator is removed, they lose all moderator privileges immediately.

If a user is banned from a community, they cannot create posts or comments in that community but can still view existing content.

### Content Creation and Engagement Journey

A logged-in user browses the home feed, which shows posts only from communities they are subscribed to. The user can also access the popular feed (showing posts from all communities) and the community feed (showing posts from one specific community).

When viewing the post list, the user sees the title, author username, community name, vote score, comment count, time since posted, and a preview of the content (first 200 characters for text posts, thumbnail for image posts, domain name for link posts).

The user can interact with posts by voting (upvote or downvote), writing comments, and replying to existing comments. Replies can have their own replies with no depth limit, creating a nested discussion structure.

When voting on a post or comment, the user can change their vote from upvote to downvote or vice versa, or remove their vote entirely. Each user can only have one vote per post or comment at any time.

When commenting on a post, the user can write their comment and submit it. The user can edit their own comments to update the content or delete their own comments. Comments show the author, content, vote score, time since posted, and any nested replies.

Users can sort feeds and comments using different sorting options: hot, new, top, controversial for feeds, and best, new, controversial for comments.

### Profile and Karma Tracking Journey

A user views their own profile, which displays their display name, bio text, and avatar image. The user can edit these profile attributes by updating their display name, rewriting their bio, or uploading a new avatar image.

The user's profile also shows their total karma score, which is calculated from all the votes they have received on their posts and comments across the platform. Karma increases by 1 when someone upvotes their content and decreases by 1 when someone downvotes their content.

The user can view any other user's public profile to see their display name, bio, avatar, total karma score, and a list of all posts and comments they have created.

The user's profile page displays their posts in a list showing each post's title, community, vote score, comment count, and when it was posted. Similarly, the user's comments are listed showing the comment content (or preview), the post they were written on, vote score, and when they were posted.

A user can change their password at any time through their account settings. If the user decides to delete their account, all their posts and comments are also deleted, and their karma score is removed from the system.

### Multi-Step Discussion and Moderation Journey

A discussion begins when a user creates a post in a community. Other users can reply to the post with comments, and those comments can have their own replies, creating a nested conversation hierarchy with no depth limit.

Participants in the discussion can vote on both the original post and all comments. Each user can cast one vote per item and can change or remove their vote at any time. The vote score is displayed for each post and comment.

If a comment violates community standards, other users can report it by providing a reason text. Moderators of the community receive the report and can review it to determine if the content should be deleted.

A moderator can delete any comment in the discussion, regardless of who wrote it. When a moderator deletes a comment, all nested replies to that comment are also removed from the discussion.

If a user repeatedly posts inappropriate content, a moderator can ban them from the community. The banned user can no longer participate in the discussion by posting or commenting but can still view existing content.

When a discussion ends or a post is no longer relevant, the original author can delete their own post. This action also deletes all comments and replies associated with that post. Moderators can perform the same action on any post in their community.

### End-to-End Community Experience Journey

A new user joins the platform and completes account registration with email, password, and username. After logging in, the user explores available communities by browsing the community list and using search functionality.

The user finds a community of interest, views its details including subscriber count and description, and decides to subscribe. Upon subscription, the user gains the ability to create posts and comments in that community.

The user starts by posting an introductory comment, then creates their first post in the community. They actively engage by voting on other posts, writing comments, and replying to discussions.

Over time, the user builds karma from receiving votes on their content. Their profile page automatically reflects this karma score along with their activity history.

If the user creates valuable content, they may be invited to become a moderator of the community. As a moderator, they gain tools to manage community content, including deleting posts and comments, banning disruptive users, and reviewing reports.

Throughout their journey, the user can switch between different feeds (home, popular, community) to discover content, sort results by different criteria, and navigate through paginated results.

If at any point the user wants to leave the community, they can unsubscribe. If they want to leave the platform entirely, they can delete their account, which removes all their content and karma from the system.

# File Storage

File upload capabilities, media processing, and storage requirements.

## File Upload and Management

Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

### Avatar Image Upload

Users can upload an avatar image when creating their account or editing their profile. The avatar serves as the user's visual representation across the platform. Users can replace their avatar at any time by uploading a new image. When an image is uploaded, it is stored and associated with the user's profile for display purposes.

### Community Icon Upload

When creating a community, the creator can upload an icon image for the community. The icon serves as the visual representation of the community. Only the owner of the community can change the community icon. The icon is stored and displayed on community pages and in community listings.

### Image Post Upload

Users can create an image post by uploading an image file. The image becomes the primary content of the post. When viewing an image post, users can see the full image. Only the author of an image post can edit or delete the image content. The image is stored and associated with the post for display in feeds and on the post page.

### Media File Storage

All uploaded images (avatars, community icons, image posts) are stored securely on the platform's storage infrastructure. Users do not have direct access to the storage location; they only interact through the platform's interface. The system manages the storage lifecycle, ensuring images remain accessible as long as the associated content exists.

### Attachment Upload in Content

Users can attach files to their posts and comments as needed. Each attachment is uploaded through the platform's interface and stored with the associated content. When viewing posts or comments, users can access the attached files through the platform's display interface.