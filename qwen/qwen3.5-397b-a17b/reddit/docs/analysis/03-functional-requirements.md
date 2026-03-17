**redditClone — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Users create accounts by providing an email address, password, and choosing a unique username. Users log in to the platform using their email and password credentials. After logging in, users can change their password to maintain account security. Users can delete their own accounts, which automatically removes all posts and comments they have created. Each user has a profile containing a display name, bio text, and avatar image. Users can edit their own display name, bio, and avatar at any time. Users can view any other user's profile page to see their information. A user's profile displays their total karma score prominently. The profile page shows a complete list of all posts the user has created. The profile page also shows a complete list of all comments the user has written. Other users can browse through these posts and comments to see the user's activity history.

### Account Registration

Users can create an account by providing an email address, a password, and choosing a unique username. The email address must be valid and not already associated with an existing account. The username must be unique across the platform and cannot duplicate any existing username. The password is stored securely and used for authentication. Upon successful registration, the user account is created and the user can immediately log in. If the email address is already in use, the registration is rejected. If the username is already taken, the registration is rejected.

### User Authentication

Users can log in to the platform using their email address and password. Upon successful authentication, the user gains access to their account and all member features. If the email address does not exist in the system, the login attempt is rejected. If the password does not match the stored credentials, the login attempt is rejected. Only registered users can authenticate; guests cannot access member-only features without logging in.

### Password Management

Logged-in users can change their password to maintain account security. The user must provide their current password for verification before setting a new password. If the current password is incorrect, the password change request is rejected. Upon successful password change, the new password is used for all future login attempts. The user remains logged in after changing their password.

### Account Deletion

Users can delete their own accounts permanently. When a user deletes their account, all posts created by that user are automatically deleted. All comments written by that user are also automatically deleted. The deletion is permanent and cannot be undone. The user's profile, including display name, bio, and avatar, is removed from the platform. Any karma associated with the user is removed. The user's username becomes available for registration by other users after account deletion.

### Profile Editing

Each user has a profile containing a display name, bio text, and avatar image. Users can edit their own display name at any time. Users can edit their own bio text at any time. Users can update their own avatar image at any time. Profile changes are saved immediately and visible to other users. Users can only edit their own profile; they cannot modify other users' profiles. The display name, bio, and avatar are optional and can be left blank or removed.

### Profile Viewing

Users can view any other user's profile page to see their public information. A user's profile page displays their display name, bio text, and avatar image prominently. The profile page shows the user's total karma score. The profile page displays a complete list of all posts the user has created. The profile page displays a complete list of all comments the user has written. Users can navigate to any user's profile by clicking on their username or through profile links. The posts list on a profile shows the post title, community name, vote score, and time since posted. The comments list on a profile shows the comment content, associated post, vote score, and time since posted. Users can browse through another user's activity history via their profile page.

## Karma Operations

Every user has a single karma score represented as one number. When another user upvotes a post or comment, the author's karma increases by one point. When another user downvotes a post or comment, the author's karma decreases by one point. When a user removes their vote from a post or comment, the karma adjusts accordingly to reflect the change. Karma scores can become negative if a user receives more downvotes than upvotes. The karma score updates automatically whenever votes are cast or removed on the user's content. Users can see their current karma score displayed on their profile page. The karma system applies the same rules to both posts and comments equally. Vote changes from upvote to downvote or vice versa adjust the karma score by two points. The karma score provides a measure of a user's contribution quality to the community.

### Karma Score Overview

Every user has a single karma score represented as one number. The karma score can be negative if a user receives more downvotes than upvotes. Users can view their current karma score on their profile page. The karma score is displayed alongside the user's display name, bio, and avatar on their profile. The same karma score applies to all of a user's activity across the platform.

### Karma Updates from Post Votes

When another user upvotes a post, the post author's karma increases by one point. When another user downvotes a post, the post author's karma decreases by one point. The karma score updates automatically whenever a vote is cast on the user's post. The karma update occurs immediately after the vote is recorded. Users can see their updated karma score reflected on their profile without manual refresh.

### Karma Updates from Comment Votes

When another user upvotes a comment, the comment author's karma increases by one point. When another user downvotes a comment, the comment author's karma decreases by one point. The karma score updates automatically whenever a vote is cast on the user's comment. The same karma calculation rules apply to both posts and comments equally. A user's karma increases or decreases regardless of whether the voted content is a post or a comment.

### Vote Change and Removal Karma Impact

When a user changes their vote from upvote to downvote, the content author's karma decreases by two points. When a user changes their vote from downvote to upvote, the content author's karma increases by two points. When a user removes their vote from a post or comment, the karma adjusts accordingly to reflect the change. If an upvote is removed, the author's karma decreases by one point. If a downvote is removed, the author's karma increases by one point. The karma score updates automatically whenever a vote is changed or removed.

## Community Operations

Any user can create a new community on the platform. When creating a community, the user must provide a unique name that no other community uses. The community creator also provides a description text explaining the community's purpose. The creator uploads an icon image to represent the community visually. The user who creates the community automatically becomes its owner with highest authority. Users can browse all communities in a list to discover new communities. Users can search for communities by name to find specific communities. Each community displays its subscriber count to show how many users follow it. Community pages show the community name, description, and icon prominently. The owner has special privileges to manage the community and assign moderators.

### Community Creation

Any user can create a new community on the platform. When creating a community, the user must provide a unique name that no other community currently uses. The user provides a description text explaining the community's purpose and what content belongs there. The user uploads an icon image to visually represent the community. The user who creates the community automatically becomes its owner with highest authority over that community. The community creation process validates that the name is unique before completing the creation. If the community name already exists, the creation request is rejected. The owner retains ownership permanently unless they delete their account.

### Community Browsing and Discovery

Users can browse all communities in a list to discover new communities to join. The community list displays each community's name, description, icon, and subscriber count. Users can search for communities by entering a community name or partial name. Search results show communities whose names match the search query. The community list can be browsed by any user, including those not logged in. Users can sort the community list by subscriber count to find popular communities. Users can sort the community list by creation date to find new communities. The browsing and search features help users discover communities relevant to their interests.

### Community Page Display

Each community has a dedicated page that displays the community name, description, and icon prominently at the top. The community page shows the current subscriber count indicating how many users follow the community. The community page displays all posts created within that community in a feed format. Users can view the community page without being subscribed to the community. The community page shows posts sorted by the user's selected sorting option. The subscriber count updates in real-time as users subscribe or unsubscribe. Any user can access any community page to view its content and posts.

### Owner Management Privileges

The community owner has special privileges to manage the community and its settings. The owner can add other users as moderators to help manage the community. The owner can remove moderators from the community when needed. The owner has highest authority over all community moderation actions. The owner can configure community settings and description. The owner can update the community icon image. The owner cannot transfer ownership to another user. Only the owner can remove moderators; moderators cannot remove other moderators or the owner.

## Subscription Operations

Users can subscribe to any community they want to follow. Users can unsubscribe from any community they no longer wish to follow. Subscribing to a community is required before a user can create posts in that community. Users can view a list of all communities they are currently subscribed to. The subscribed communities list helps users track which communities they follow. Users can subscribe to multiple communities without any limit. When a user subscribes, they gain posting privileges in that community. When a user unsubscribes, they lose the ability to create new posts in that community. Subscription status determines which posts appear in the user's home feed. Users can manage their subscriptions at any time from their account settings.

### Community Subscription

Users can subscribe to any community on the platform. There is no limit to the number of communities a user can subscribe to. Any logged-in user is eligible to subscribe to any community. When a user subscribes to a community, they gain the ability to create posts in that community. Subscription is instantaneous and the user immediately becomes a subscriber of the community. The community's subscriber count increases by one when a user subscribes.

### Community Unsubscription

Users can unsubscribe from any community they are currently subscribed to. When a user unsubscribes from a community, they lose the ability to create new posts in that community. The community's subscriber count decreases by one when a user unsubscribes. Users can unsubscribe from a community at any time without restrictions. Unsubscription is instantaneous and takes effect immediately.

### Subscribed Communities List

Users can view a list of all communities they are currently subscribed to. The subscribed communities list displays each community's name and icon. The list shows the total number of communities the user is subscribed to. Users can access their subscribed communities list from their account settings or profile page. The list is sorted alphabetically by community name by default.

### Subscription Posting Requirement

Users must be subscribed to a community before they can create posts in that community. Attempting to create a post in a community without an active subscription is rejected. The subscription requirement applies to all post types including text posts, link posts, and image posts. Users who unsubscribe from a community retain their existing posts in that community but cannot create new posts.

### Home Feed Subscription Filter

The home feed displays posts only from communities the user is subscribed to. The home feed is available only to logged-in users. Posts from unsubscribed communities do not appear in the home feed. When a user subscribes to a new community, posts from that community begin appearing in the home feed. When a user unsubscribes from a community, posts from that community no longer appear in the home feed.

### Subscription Management

Users can manage their community subscriptions at any time. Subscription management includes subscribing to new communities and unsubscribing from existing communities. Users can search for communities to subscribe to by name. Users can browse all available communities to discover new communities to subscribe to. Subscription changes are reflected immediately across all platform features including the home feed and posting privileges.

## Post Operations

Users can create a post in any community they are subscribed to. Every post must have a title, which is a required field. A post must be one of three types: text post with text content, link post with a URL, or image post with an uploaded image. Users can edit their own posts after creation to update content or fix errors. Users can delete their own posts to remove them from the platform. When viewing a single post, users see the title and full content. The post display shows the author username and community name. The post shows its current vote score and total comment count. The post displays when it was posted using a time indicator. Text posts show the first 200 characters in list views. Image posts show a thumbnail in list views. Link posts show the domain name of the URL in list views.

### Post Creation

Users can create a post in any community they are subscribed to. Creating a post in a community without an active subscription is not permitted.

Every post must have a title, which is a required field. Posts without a title cannot be created.

A post must be one of three types:

**Text Post**: Contains text content written by the user. The user provides the body text along with the title.

**Link Post**: Contains a URL that the user wants to share. The user provides the link address along with the title.

**Image Post**: Contains an uploaded image file. The user uploads an image file along with the title.

The post type is selected at creation time and determines what additional content the user must provide.

### Post Editing and Deletion

Users can edit their own posts after creation. Editing allows users to update the title, change the content, or fix errors in their posts. Only the post author can edit their own posts.

Users can delete their own posts to remove them from the platform. When a post is deleted, it is permanently removed from the community feed and is no longer visible to other users. Only the post author can delete their own posts.

Deleting a post also removes all associated comments and votes from the platform.

### Single Post View

When viewing a single post in detail, users see the complete post information.

The post display shows:
- The post title
- The full content (complete text for text posts, the full URL for link posts, or the full-size image for image posts)
- The author username who created the post
- The community name where the post was published
- The current vote score (total upvotes minus total downvotes)
- The total comment count
- When the post was created, displayed as a time indicator (e.g., "3 hours ago", "2 days ago")

The vote score and comment count update in real-time as users interact with the post.

### Post List Display

When viewing posts in any feed (Home, Popular, or Community), each post in the list shows a summary view.

Each post entry displays:
- The post title
- The author username
- The community name
- The current vote score
- The total comment count
- Time since the post was created (e.g., "3 hours ago")

The content preview varies by post type:

**Text Posts**: Show the first 200 characters of the text content, truncated with an indicator if the content is longer.

**Image Posts**: Show a thumbnail preview of the uploaded image.

**Link Posts**: Show the domain name of the URL (e.g., "youtube.com", "github.com") instead of the full URL.

This list view allows users to quickly scan multiple posts and decide which ones to view in detail.

## Vote Operations

Users can upvote a post to add one point to its score. Users can downvote a post to subtract one point from its score. Each user can only vote once per post, preventing multiple votes from the same user. Users can change their vote from upvote to downvote or from downvote to upvote. Users can remove their vote entirely, which adjusts the score accordingly. The vote score equals total upvotes minus total downvotes. The same voting rules apply to comments as well as posts. Users can upvote or downvote any comment on a post. Each user can only vote once per comment. Users can change or remove their comment votes just like post votes. Vote scores update immediately when votes are cast, changed, or removed.

### Post Voting

Users can upvote a post to add one point to its vote score. Users can downvote a post to subtract one point from its vote score. Each user can only cast one vote per post, preventing multiple votes from the same user on the same post. The vote score for a post equals the total number of upvotes minus the total number of downvotes. Users can view the current vote score on any post in feeds and on the post detail page.

### Comment Voting

Users can upvote a comment to add one point to its vote score. Users can downvote a comment to subtract one point from its vote score. Each user can only cast one vote per comment, ensuring one vote per comment from any single user. The vote score for a comment equals the total number of upvotes minus the total number of downvotes. The same voting rules that apply to posts also apply to comments. Users can view the current vote score on any comment within a post's comment thread.

### Vote Management

Users can change their vote from upvote to downvote or from downvote to upvote on any post or comment. When a user changes their vote, the vote score adjusts accordingly to reflect the change. Users can remove their vote entirely from any post or comment they have previously voted on. When a user removes their vote, the vote score adjusts to remove the impact of that vote. Vote scores update immediately when votes are cast, changed, or removed, ensuring users always see the current score. Users cannot vote on posts or comments in communities where they are banned.

## Comment Operations

Users can write a comment on any post to share their thoughts. Users can reply to any comment to continue the discussion. Replies can have their own replies, with no depth limit on nesting. Users can edit their own comments to update or correct content. Users can delete their own comments to remove them from the discussion. Each comment displays the author username who wrote it. Each comment shows its content text in full. Each comment displays its current vote score. Each comment shows the time since it was posted. Comments display their nested replies in a threaded structure. Comments on a post can be sorted by best to show highest vote score first. Comments can be sorted by new to show most recent first. Comments can be sorted by controversial to show posts with many votes but score close to zero.

### Comment Creation

Users can write a comment on any post to share their thoughts. The comment requires content text. When a comment is created, it is automatically associated with the post and the user who created it. The comment appears immediately in the post's comment section.

### Comment Replies

Users can reply to any comment to continue the discussion. A reply is a comment that references another comment as its parent. Replies can have their own replies, with no depth limit on nesting. This creates a threaded conversation structure where discussions can branch infinitely. Each reply displays its relationship to the parent comment in a nested visual structure.

### Comment Editing

Users can edit their own comments to update or correct content. When a comment is edited, the updated content replaces the original content. The edit action is available only to the user who created the comment. Edited comments display the updated content immediately.

### Comment Deletion

Users can delete their own comments to remove them from the discussion. When a comment is deleted, it is removed from view along with all nested replies to that comment. The deletion action is available only to the user who created the comment. Deleting a comment permanently removes it and its entire reply thread from the post.

### Comment Display

Each comment displays the author username who wrote it. Each comment shows its content text in full. Each comment displays its current vote score. Each comment shows the time since it was posted (e.g., "3 hours ago"). Comments display their nested replies in a threaded structure where replies are visually indented under their parent comment. The threaded structure shows the hierarchical relationship between comments and their replies at all nesting levels.

### Comment Sorting

Comments on a post can be sorted by best to show highest vote score first. Comments can be sorted by new to show most recent first. Comments can be sorted by controversial to show comments with many votes but score close to zero. The sorting option applies to all comments on the post, including nested replies at each level. Users can change the sorting option at any time to view comments in a different order.

## Moderator Operations

The community creator is the owner with the highest authority in the community. The owner can add other users as moderators to help manage the community. The owner can remove moderators from their community. Moderators can add other moderators to the community. Moderators cannot remove the owner from the moderator list. Moderators cannot remove each other, only the owner can remove moderators. Moderators can delete any post in their community to enforce rules. Moderators can delete any comment in their community to maintain quality. Moderators can view all reports submitted for their community. Moderators can approve a report, which deletes the reported content. Moderators can dismiss a report, which keeps the content but removes the report from the list.

### Community Owner Role

The user who creates a community becomes the community owner. The owner holds the highest authority in the community moderation hierarchy. The owner can perform all moderator actions and has additional privileges that other moderators do not have. The owner cannot be removed from the moderator list by any other moderator. Only the owner can remove other moderators from the community.

### Moderator Assignment

The community owner can add other users as moderators to help manage the community. Moderators can also add other users as moderators to the community. When a user is added as a moderator, they gain the ability to perform moderation actions in that community. Multiple users can serve as moderators in the same community alongside the owner.

### Moderator Removal

Only the community owner can remove moderators from the community. Moderators cannot remove the owner from the moderator list. Moderators cannot remove other moderators from the community. When a moderator is removed, they lose all moderation privileges in that community but remain a regular user who can view content and participate according to community rules.

### Content Deletion Authority

Moderators can delete any post in their community to enforce community rules. Moderators can delete any comment in their community to maintain content quality. When a moderator deletes a post or comment, the content is removed from public view. The deletion applies to all content within the moderator's community regardless of who created it.

### Report Management

Moderators can view all reports submitted for their community. Each report shows the reported content, the user who reported it, and the reason provided. Moderators can approve a report, which deletes the reported content. Moderators can dismiss a report, which keeps the content but removes the report from the list. When a report is dismissed, it is removed from the report list and no longer visible to moderators.

## Ban Operations

Moderators can ban users from their community to enforce community rules. Moderators can unban users to restore their posting privileges. Moderators can view the list of all banned users in their community. Banned users cannot create posts in the community where they are banned. Banned users cannot create comments in the community where they are banned. Banned users can still view all content in the community despite the ban. The ban applies only to the specific community, not the entire platform. Users can be banned from multiple communities independently. Moderators have full authority to manage bans within their community. The banned users list shows all users currently restricted from posting.

### Ban User Action

Moderators can ban any user from their community to enforce community rules. When a moderator bans a user, the user immediately loses all posting privileges in that community. The ban action is enforced immediately upon execution. Moderators have full authority to ban users within their community without requiring approval from the community owner. The ban removes the user's ability to participate in the community through posts and comments.

### Unban User Action

Moderators can unban any previously banned user from their community. When a moderator unbans a user, the user's posting privileges in that community are immediately restored. The unban action takes effect immediately, allowing the user to create posts and comments in the community again. Moderators can unban users at their discretion without requiring approval from the community owner.

### Banned Users List

Moderators can view a list of all users currently banned from their community. The banned users list displays all users who are currently restricted from posting in the community. Moderators can access this list at any time to review who has been banned. The list shows all active bans within the community.

### Ban Restrictions and Scope

Banned users cannot create posts in the community where they are banned. Banned users cannot create comments in the community where they are banned. Despite the ban, users can still view all content in the community including posts and comments. The ban applies only to the specific community where it was issued, not the entire platform. Users can be banned from multiple communities independently, with each ban affecting only that specific community. A user banned from one community can still participate normally in other communities where they are not banned.

## Report Operations

Users can report any post they find problematic or against community rules. Users can report any comment that violates guidelines. When reporting, users must provide a reason as text explaining why they are reporting. Moderators can view all reports submitted for their community. Each report shows the reported content so moderators can review it. Each report displays who reported the content. Each report shows the reason text provided by the reporter. Moderators can approve a report, which deletes the reported content. Moderators can dismiss a report, which keeps the content but removes the report. Dismissed reports are removed from the report list and no longer visible to moderators.

### Report Creation

Users can report any post they find problematic or against community rules. Users can report any comment that violates guidelines. When reporting, users must provide a reason as text explaining why they are reporting the content. The report is automatically associated with the user who submitted it. The report is linked to the specific post or comment being reported. The report is associated with the community where the content was posted. If the reason text is missing, the report creation is rejected.

### Moderator Report Review

Moderators can view all reports submitted for their community. Each report in the list displays the reported content so moderators can review what was reported. For post reports, moderators see the post title and content. For comment reports, moderators see the comment text. Each report displays the username of the user who reported the content. Each report shows the reason text provided by the reporter. Moderators can see reports for both posts and comments in their community. Reports remain in the list until a moderator takes action on them.

### Report Resolution

Moderators can approve a report, which results in deletion of the reported content. When a report is approved, the post or comment is removed from the community. Moderators can dismiss a report, which keeps the content visible but removes the report. When a report is dismissed, the reported post or comment remains unchanged. Dismissed reports are removed from the report list and are no longer visible to moderators. Each report can only be resolved once, either through approval or dismissal.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

Users cannot sign up with an email address that is already registered to another account. The system rejects registration attempts when the chosen username is already taken by another user. Login fails when users provide incorrect email and password combinations. Password changes are rejected if the current password provided is incorrect. When a user deletes their account, all posts and comments they created are permanently removed from the platform. Users cannot access their account after deletion, and their username becomes available for others to claim. Attempting to view a deleted user's profile shows an error indicating the account no longer exists. Users cannot perform any actions on the platform without being logged in, except viewing public content. Session expiration requires users to log in again to continue their activities. Multiple failed login attempts may temporarily restrict login functionality to protect account security.

### Registration Validation Errors

The system rejects registration attempts when the provided email address is already associated with an existing user account. Users receive an error indicating the email is already in use. Registration fails when the chosen username is already taken by another user. The system notifies users that the username is unavailable and prompts them to choose a different one. Both email and username must be unique across all user accounts on the platform. If either the email or username validation fails, the registration process is halted and no account is created.

### Authentication Failures

Login attempts fail when users provide an email and password combination that does not match any existing account. The system rejects login requests with incorrect credentials without revealing whether the email exists or the password is wrong. Password change requests are rejected when the current password provided by the user is incorrect. Users must provide their correct current password to authorize a password change.

### Account Deletion Consequences

When a user deletes their account, all posts created by that user are permanently removed from the platform. All comments written by the deleted user are also permanently removed. The cascade removal ensures no orphaned content remains attributed to non-existent users. Users cannot access their account or any platform features after account deletion is completed. The deleted username becomes available for other users to claim during new registration. Attempting to view the profile of a deleted user results in an error indicating the account no longer exists. Any references to the deleted user's content are removed from community feeds and post listings.

### Session and Access Control Errors

Users cannot perform actions that require authentication without being logged in. Attempting to create posts, comments, or vote on content while logged out results in an access denied error. Viewing public content such as community feeds and post listings remains available to logged-out users. When a user's session is no longer valid, they are required to log in again to continue activities that require authentication. Any in-progress actions that require authentication are interrupted when the user is no longer authenticated. Users receive a notification prompting them to log in again to resume their activities.

## Karma Error Scenarios

Karma scores can become negative when a user receives more downvotes than upvotes on their content. When a user removes their vote from a post or comment, the karma score adjusts by reversing the previous vote's effect. If a user changes their vote from upvote to downvote, karma decreases by two points to reflect the change. Attempting to vote multiple times on the same post or comment is not allowed, only the most recent vote counts. Karma updates occur immediately when votes are cast, changed, or removed. There is no minimum or maximum limit on karma scores, allowing unlimited positive or negative values. Users cannot manually adjust their own karma scores through any direct action. Karma calculation errors should not occur as each vote has a fixed impact of one point. System must handle rapid vote changes without creating inconsistent karma totals. Edge cases include votes on content that is later deleted, where karma adjustments may need special handling.

### Negative Karma Score Display

Karma scores can become negative when a user receives more downvotes than upvotes. The system allows negative karma scores without restriction. Negative karma scores display normally on user profiles without any error state or warning. There is no minimum karma threshold that triggers special handling or restrictions. Users cannot be prevented from receiving downvotes that would make their karma negative.

### No Karma Score Limits

There is no minimum or maximum limit on karma scores. Karma can grow infinitely positive or negative without triggering any error or restriction. The system does not cap karma at any value. Users cannot receive errors related to karma reaching a limit. No special handling is required for extremely high or low karma scores. All karma calculations proceed normally regardless of the current score magnitude.

## Community Error Scenarios

Community creation fails when the chosen name already exists on the platform. Each community must have a unique name that cannot be duplicated by other users. Users can browse all communities, but the list may be empty if no communities exist yet. Searching for communities by name returns no results when no matching communities are found. Community subscriber counts update in real-time as users subscribe and unsubscribe. The community owner cannot be removed from their ownership role by any other user. Attempting to create a community without providing required information results in rejection. Community names must remain unique even after a community is deleted. Users can view community details even if they are not subscribed to that community. Empty communities with no posts or subscribers remain accessible until explicitly deleted by the owner.

### Community Name Uniqueness Enforcement

When a user attempts to create a community with a name that already exists on the platform, the request is rejected. Each community must have a unique name that cannot be duplicated by any other user. The system checks for name availability before creating the community. If the name is already taken, the user is notified that the community name is unavailable.

This uniqueness constraint applies to all community creation attempts. Users cannot create communities with names that match existing communities, regardless of who owns those communities. The system enforces this constraint to prevent naming conflicts and ensure each community can be uniquely identified.

### Community Creation Validation

When creating a community, users must provide the community name, description, and icon as specified in the domain model. The community name field accepts text input and must be unique across all communities. The description field accepts text content describing the community. The icon field accepts an image file for the community's visual representation.

If a user submits a community creation request without providing the required information, the request is rejected. The system validates that all community fields are provided before proceeding with community creation. Users are notified when their submission is incomplete.

### Community Browsing Edge Cases

When users browse all communities on the platform, the list may be empty if no communities have been created yet. An empty community list is displayed to indicate that no communities exist. Users can still create the first community when the list is empty.

When users search for communities by name and no matching communities are found, the search returns no results. The system displays an indication that no communities match the search query. Users can refine their search terms or browse all communities instead. Search functionality remains available even when no results are returned.

### Community Access Without Subscription

Users can view community details even if they are not subscribed to that community. Any user, whether subscribed or not, can access a community's page to view its name, description, icon, and subscriber count. Non-subscribers can browse posts within the community and read comments.

Communities with no posts and no subscribers remain accessible to all users. An empty community can be viewed by anyone until it is explicitly deleted by the owner. The community page displays normally even when there is no content to show. Users can choose to subscribe to an empty community or create the first post if they are subscribed.

### Community Owner Role Protection

The user who creates a community becomes its owner and holds the highest authority in that community. The community owner cannot be removed from their ownership role by any other user. No moderator or other user has the ability to strip ownership from the community creator.

The owner retains their role even if they are removed from the moderator list. Ownership is permanent and tied to the original creation of the community. Only the owner themselves can transfer ownership by deleting the entire community. Attempts by moderators or other users to remove the owner are rejected by the system.

### Subscriber Count Display

Community subscriber counts reflect the current number of users subscribed to each community. When a user subscribes to a community, the subscriber count increases. When a user unsubscribes from a community, the subscriber count decreases.

The subscriber count displayed on the community page reflects the number of subscribers at the time of viewing. Users viewing the community see the subscriber information for that community. The count changes as users subscribe and unsubscribe from the community.

## Subscription Error Scenarios

Users cannot subscribe to a community they are already subscribed to, duplicate subscriptions are not allowed. Unsubscribing from a community the user is not subscribed to has no effect and may show a notification. Users must be subscribed to a community before they can create posts in that community. Attempting to create a post without an active subscription results in an error preventing the action. Users can view their list of subscribed communities, which may be empty if they have not subscribed to any. Subscribing to a community that no longer exists results in an error indicating the community is unavailable. Unsubscribing does not delete the user's existing posts or comments in that community. Users can resubscribe to a community they previously unsubscribed from without restrictions. Subscription status changes take effect immediately for post creation permissions. Users cannot subscribe to communities while banned from those communities.

### Duplicate Subscription Prevention

Users cannot subscribe to a community they are already subscribed to. Attempting to subscribe to a community where the user already has an active subscription results in an error indicating the subscription already exists. The system prevents duplicate subscriptions from being created.

### Unsubscribe Non-Existent Subscription

Users can unsubscribe from communities they are subscribed to. Attempting to unsubscribe from a community the user is not subscribed to results in an error indicating no active subscription exists. The system validates subscription existence before processing unsubscribe requests.

### Community Existence Validation

Users cannot subscribe to a community that does not exist. Attempting to subscribe to a non-existent community results in an error indicating the community is not found. The system validates community existence before processing subscription requests.

### Empty Subscriptions List

Users can view a list of all communities they are subscribed to. When a user has no subscriptions, the list is empty. The system displays the subscribed communities list based on the user's active subscriptions.

### Ban-Based Subscription Restriction

Users cannot subscribe to communities where they are banned. Attempting to subscribe to a community while banned from that community results in an error indicating the user is restricted from the community. The system checks ban status before processing subscription requests.

### Resubscription After Unsubscribe

Users can resubscribe to a community they previously unsubscribed from. Resubscription follows the same validation process as initial subscription, including checks for community existence and ban status.

## Post Error Scenarios

Posts cannot be created without a title, as titles are required for all post types. Users cannot create posts in communities where they do not have an active subscription. Each post must be one of three types: text, link, or image, and mixed types are not allowed. Text posts require content, link posts require a valid URL, and image posts require an uploaded image. Users can only edit posts they own, attempting to edit another user's post results in an error. Users can only delete posts they own, deletion attempts on others' posts are rejected. Posts created in a community remain visible even if the author unsubscribes from that community. When a post is deleted, all associated comments and votes are also removed. Posts with no content beyond the title may be rejected depending on the post type. Editing a post preserves the original creation timestamp while updating the modification time.

### Missing Title Post Creation Rejection

Posts require a title. The system rejects post creation requests that do not include a title. This requirement applies to all post types: text posts, link posts, and image posts.

### Invalid Post Type Rejection

Posts must be one of three types: text, link, or image. The system rejects posts that do not specify a valid type or that specify an unrecognized type value.

### Text Post Missing Content Error

Text posts require content in addition to the title. The system rejects text post creation requests that have no content body.

### Link Post Missing URL Error

Link posts require a URL. The system rejects link post creation requests that do not include a URL value.

### Image Post Missing Upload Error

Image posts require an uploaded image. The system rejects image post creation requests that do not include an image upload.

### Edit Non-Owned Post Rejection

Users can only edit posts that they authored. The system rejects edit attempts on posts created by other users.

### Delete Non-Owned Post Rejection

Users can only delete posts that they authored. The system rejects delete attempts on posts created by other users.

### Post Deletion Cascades to Comments

When a post is deleted, all comments on that post are also deleted. Comments cannot exist without their parent post.

## Vote Error Scenarios

Each user can only cast one vote per post, attempting to vote again changes the existing vote rather than creating a new one. Users can change their vote from upvote to downvote or vice versa at any time. Removing a vote entirely is allowed and adjusts the post score accordingly. Users cannot vote on posts in communities where they are banned. Voting on a post that has been deleted results in an error indicating the content is unavailable. Vote scores update immediately when votes are cast, changed, or removed. Users can vote on their own posts unless specifically restricted by community rules. Changing a vote from upvote to downvote decreases the score by two points total. Removing a vote from a post with no other votes results in a score of zero. Vote counts must remain consistent even when multiple users vote simultaneously on the same post.

### Authentication Required for Voting

Only authenticated members can cast votes on posts or comments. When a guest user attempts to vote on any content, the system rejects the action and indicates that authentication is required. Users must be logged in to participate in voting activities.

### Single Vote Per Content Item

Each user can maintain only one vote per post or comment. When a user attempts to cast a second vote on content they have already voted on, the system replaces the existing vote with the new vote type. Users cannot have multiple votes on the same content item simultaneously.

### Valid Vote Type Required

All votes must be specified as either an upvote or a downvote. When a vote request contains an invalid or unrecognized vote type, the system rejects the action. The vote type field must contain one of the two allowed values from the vote type enumeration.

### Target Content Must Exist

Votes can only be cast on posts or comments that exist in the system. When a user attempts to vote on content that has been deleted or does not exist, the system rejects the action and indicates that the target content is unavailable. The system validates that the target post or comment exists before processing any vote.

## Comment Error Scenarios

Users cannot comment on posts that have been deleted or are no longer accessible. Replies to comments can be nested to unlimited depth without restriction. Users can only edit comments they own, editing attempts on others' comments are rejected. Users can only delete comments they own, deletion of others' comments requires moderator privileges. When a comment is deleted, all nested replies to that comment are also removed. Comments on posts in banned communities cannot be created by banned users. Editing a comment preserves the original creation timestamp while showing it was edited. Users cannot comment on posts in communities where they do not have subscription access. Comment voting follows the same rules as post voting with one vote per user. Comments with no content or empty text are rejected during creation.

### Comment Creation Validation

Comments must have content to be created. Requests to create comments without content are rejected. Comments must be associated with an existing post. Attempts to create comments on posts that do not exist are rejected. Users who are banned from a community cannot create comments on posts within that community.

### Comment Edit Restrictions

Users can only edit comments they authored. Attempts to edit comments created by other users are rejected. Edit operations require the comment to exist and be accessible.

### Comment Deletion Rules

Users can only delete comments they authored. Attempts to delete comments created by other users are rejected. Deletion operations require the comment to exist and be accessible.

### Comment Voting Behavior

Each user can cast one vote per comment. The vote type must be either upvote or downvote. Attempts to cast multiple votes of different types on the same comment by the same user are rejected. Votes can only be cast on existing comments.

### Comment Reply Structure

Comments can be posted as replies to other comments. Reply comments must reference an existing parent comment. Attempts to reply to comments that do not exist are rejected.

## Moderator Error Scenarios

Only the community owner can remove moderators from the community, moderators cannot remove each other. Moderators cannot remove the community owner under any circumstances. Moderators can add other moderators only if they have been granted that permission by the owner. Attempting to perform moderator actions without proper role results in access denied errors. Moderators can delete any post in their community regardless of who created it. Moderators can delete any comment in their community regardless of authorship. Moderator permissions are specific to each community and do not transfer between communities. Removing a moderator does not delete their existing posts or comments in the community. The community owner retains all moderator abilities plus additional administrative powers. Multiple moderators can perform actions simultaneously without conflicts in the same community.

### Non-Moderator Action Rejection

Users who are not moderators of a community cannot perform moderator actions in that community. When a non-moderator attempts to delete posts, delete comments, ban users, or view the banned users list, the system rejects the request. The system verifies the user's moderator status in the specific community before allowing any moderator action. This applies to all users including community members and guests.

### Cross-Community Moderator Action Rejection

Moderators can only perform moderator actions in communities where they have moderator status. When a moderator attempts to perform moderator actions in a community where they are not a moderator, the request is rejected. Moderator permissions do not transfer between communities. A moderator in one community has no moderator authority in other communities.

## Ban Error Scenarios

Moderators can ban users from their community, preventing them from creating posts or comments. Banned users can still view all content in the community including posts and comments. Attempting to ban a user who is already banned has no effect or shows a notification. Unbanning a user who is not currently banned has no effect on their status. Banned users cannot create new posts in the community where they are banned. Banned users cannot create new comments in the community where they are banned. Banned users retain their existing posts and comments unless moderators delete them separately. Users can be banned from multiple communities independently without affecting other community access. Moderators can view the list of banned users for their community at any time. Unbanning a user immediately restores their ability to create posts and comments in that community.

### Duplicate Ban and Invalid Unban Handling

When a moderator attempts to ban a user who is already banned from the community, the system does not create a duplicate ban entry. The action completes without creating an additional ban record. When a moderator attempts to unban a user who is not currently banned from the community, the system does not process the unban action. The action completes without affecting any ban records.

### Banned User Content Restrictions and Access

When a banned user attempts to create a new post in the community where they are banned, the system rejects the post creation request. The user receives an error message indicating they are banned from posting in this community. When a banned user attempts to create a new comment in the community where they are banned, the system rejects the comment creation request. The user receives an error message indicating they are banned from commenting in this community. Banned users retain the ability to view all posts and comments in the community where they are banned. All posts and comments created by the user before the ban remain visible in the community. The ban action does not automatically remove or hide the banned user's previous posts and comments.

### Multi-Community Ban Independence and Restoration

A user can be banned from multiple communities independently. A ban in one community does not affect the user's ability to post or comment in other communities where they are not banned. When a moderator unbans a user from the community, the user's ability to create posts and comments in that community is immediately restored. The user can create new posts and comments in the community without restriction after being unbanned.

## Report Error Scenarios

Users must provide a reason when reporting any post or comment, reports without reasons are rejected. Users can report any post or comment regardless of who created the content. Duplicate reports on the same content by the same user are not allowed or are merged. Moderators can view all reports for their community including reporter identity and reason. Approving a report deletes the reported content and removes the report from the list. Dismissing a report keeps the content and removes the report from the active list. Reports on content that has already been deleted show an error or are automatically closed. Moderators cannot approve or dismiss reports from communities they do not moderate. Multiple reports on the same content can exist from different users simultaneously. Reports are only visible to moderators of the community where the content was posted.

### Report Reason Requirement

Users must provide a reason when submitting a report for a post or comment. The reason is provided as text content. Reports submitted without a reason cannot be created.

### Report Target Validation

Reports must target an existing post or comment within a community. If the targeted post or comment does not exist or has been removed, the report cannot be submitted. Reports are associated with the community where the reported content was posted.

### Report Access Restrictions

Reports are only accessible to moderators of the community where the reported content was posted. Users who are not moderators of a community cannot view or act on reports for that community. Only the user who submitted a report can view their own report submission status.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### New User Onboarding and First Post Journey

A new user registers with email and password, choosing a unique username. After registration, the user sets up their profile by adding a display name, bio text, and avatar image. The user then browses the list of all communities or searches for communities by name. The user subscribes to one or more communities of interest. Once subscribed, the user creates their first post in a subscribed community, choosing from text post, link post, or image post type. For a text post, the user provides a title and text content. For a link post, the user provides a title and URL. For an image post, the user provides a title and uploads an image. The post appears in the community feed and in the home feed of users subscribed to that community. Other users can view the post, upvote or downvote it, and the post author's karma score adjusts accordingly.

### Community Creation and Moderation Setup Journey

A user creates a new community by providing a unique name, description text, and icon image. The creating user automatically becomes the community owner. The owner can add other users as moderators to help manage the community. Moderators can add additional moderators but cannot remove the owner or other moderators. The owner can remove moderators when needed. Moderators can delete any post or comment in the community that violates community standards. Moderators can ban users from the community, preventing them from creating posts or comments while still allowing them to view content. Moderators can unban users when appropriate. Moderators can view the list of banned users for their community. The community appears in the browse list and search results, showing its subscriber count.

### Post Engagement and Discussion Participation Journey

A user views posts through the home feed (subscribed communities only), popular feed (all communities), or community feed (specific community). The user can sort posts by hot, new, top with time filter, or controversial. When viewing a post, the user sees the title, full content, author, community, vote score, comment count, and time since posted. The user can upvote or downvote the post, with each user limited to one vote per post. The user can change their vote from upvote to downvote or remove it entirely. The user can write a comment on the post. The user can reply to any comment, with unlimited nesting depth for replies. The user can edit or delete their own comments. Other users can vote on comments using the same voting rules as posts. The comment section can be sorted by best, new, or controversial. Each user's karma score adjusts based on votes received on their posts and comments.

### Content Reporting and Moderation Review Journey

A user encounters a post or comment that violates community guidelines. The user reports the content by providing a reason in text form. The report is associated with the community where the content was posted. Moderators of that community can view all reports submitted for their community. Each report shows the reported content, the user who reported it, and the reason provided. A moderator reviews the report and can approve it, which deletes the reported content, or dismiss it, which keeps the content and removes the report from the list. If a post or comment is deleted by a moderator, it is no longer visible in feeds. Users can continue to report content even after other reports have been submitted on the same item. Multiple reports on the same content are tracked separately for moderator review.

# File Storage

File upload capabilities, media processing, and storage requirements.

## File Upload and Management

Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

### File Upload Operations

Users can upload image files for their profile avatar.
Users can upload image files for their community icon.
Users can upload image files when creating an image post.
File uploads are only available to logged-in users.
Each upload operation associates the file with the uploading user's account.
Uploaded files are automatically linked to the target (user profile, community, or post).
If the upload fails, the user is notified and the action is not completed.
Users can replace their existing avatar with a new upload.
Users can replace their existing community icon with a new upload.
Users cannot edit an image post to replace the uploaded image.

### Media Processing and Display

Uploaded images are processed to generate display versions.
For image posts, a thumbnail version is generated for feed display.
The full-size image is displayed when viewing the individual post.
For user avatars, a standardized display size is generated.
For community icons, a standardized display size is generated.
Image processing occurs automatically after upload completes.
Users see the processed image in their profile, community page, or post.
Thumbnail images are displayed in post feeds to reduce load time.
Original uploaded images are preserved for full-size viewing.

### File Storage and Access

Uploaded files are stored on the platform's storage system.
Each file is associated with its owner (the user who uploaded it).
Avatar images are publicly viewable on user profile pages.
Community icons are publicly viewable on community pages.
Image post content is publicly viewable in feeds and post pages.
Files remain stored as long as the associated content exists.
When a user deletes their account, all their uploaded files are deleted.
When a community is deleted, its icon file is deleted.
When a post is deleted, its uploaded image is deleted.
Users cannot access other users' uploaded files directly.