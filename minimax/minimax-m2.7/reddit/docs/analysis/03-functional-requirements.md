**redditClone — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Users can register an account by providing a unique username, valid email address, and a password. After registration, users can log in using their email and password combination to access the platform. Authenticated users have the ability to change their password to a new value of their choosing. Users can permanently delete their account, which also removes all posts and comments they have created across the platform. Every user has a profile containing a display name, bio text, and an avatar image that represents them. Users can edit their own profile information including updating the display name, modifying the bio, and changing the avatar image. Users can view any other user's public profile page. When viewing a profile, visitors see the user's display name, bio, avatar image, total karma score accumulated from votes on their content, a list of all posts they have created, and a list of all comments they have written.

### Account Registration

Users can create a new account by providing an email address, a password, and a unique username of their choosing. The email address must be a valid format. The username must be unique across the entire platform and cannot be duplicated by any other user. Upon successful registration, the system authenticates the user and grants access to the platform.

### User Login

Users can log in to the platform by entering their registered email address and their password. The system verifies the credentials against the stored account information. If the email and password match an existing account, the user is granted access and their session begins. If the credentials do not match, the login attempt is rejected.

### Password Change

Authenticated users can change their account password to a new value of their choosing. The user provides their current password for verification before setting a new password. Upon successful verification, the password is updated and the user remains logged in.

### Account Deletion

Authenticated users can permanently delete their own account. When an account is deleted, all content created by that user is also permanently removed from the platform, including all posts and all comments. After deletion, the user is logged out and can no longer access the platform with those credentials.

### User Profile

Every user has a profile containing their publicly visible information. A user profile consists of a display name, a bio text, and an avatar image. The profile is automatically created when the user registers and is associated with that user.

### Profile Editing

Users can edit their own profile information at any time. Users can update their display name to a new value. Users can modify their bio text to add or change their description. Users can upload or change their avatar image to update their profile picture. Users cannot edit other users' profiles.

### Viewing User Profiles

Any user, whether logged in or not, can view another user's public profile page. When viewing a profile, the visitor sees the user's display name, bio text, and avatar image. The profile also shows the user's total karma score accumulated from votes on their content.

### Profile Content Listings

When viewing a user's profile, visitors see two separate listings. The first listing shows all posts created by that user, displaying the post title, community name, vote score, comment count, and time since posted for each post. The second listing shows all comments written by that user, displaying the comment content, the post it was written on, vote score, and time since posted for each comment.

## Community Operations

Any authenticated user can create a new community by providing a unique name, a description explaining the community's purpose, and an icon image. The user who creates a community automatically becomes its owner with full administrative authority. All users can browse a list of all communities available on the platform to discover new groups to join. Users can search for communities by entering part or all of a community name to find specific communities quickly. Each community displays its current subscriber count so users can gauge community popularity. Communities maintain their unique name throughout their existence and cannot be renamed after creation.

### Community Creation

### Community Creation Requirements

THE system SHALL allow any authenticated user to create a new community.

WHEN a user creates a community, THE system SHALL require the user to provide a unique name, a description explaining the community's purpose, and an icon image.

THE system SHALL validate that the community name is unique across the platform.

WHEN a user creates a community, THE system SHALL automatically assign that user as the owner of the created community.

THE system SHALL grant the creating user full administrative authority over the newly created community.

### Community Name Uniqueness

THE system SHALL enforce that each community name is unique and cannot be duplicated by another community.

WHEN a user attempts to create a community with a name that already exists, THE system SHALL reject the creation request.

THE system SHALL treat community names in a case-insensitive manner for uniqueness checking.

COMMUNITY names SHALL remain immutable after creation and cannot be renamed.

### Community Description

THE system SHALL accept a description text field when creating a community.

THE description SHALL explain the community's purpose and topic.

THE system SHALL store the description and display it on the community page.

### Community Icon

THE system SHALL allow users to upload an icon image when creating a community.

THE system SHALL display the icon on the community page and in community listings.

### Community Discovery

THE system SHALL allow all users to browse a list of all communities available on the platform.

THE system SHALL display communities in a way that enables users to discover new groups to join.

EACH community listing SHALL show the community name, description, and icon.

EACH community listing SHALL display the current subscriber count to indicate community popularity.

### Browse Communities

### Community Browsing

THE system SHALL allow any user to browse a list of all communities on the platform.

WHEN a user views the community list, THE system SHALL display each community with its name, description, icon, and subscriber count.

THE system SHALL allow users to view a specific community page showing full details including name, description, icon, owner, and subscriber count.

### Subscriber Count Display

THE system SHALL calculate and display the current subscriber count for each community.

THE subscriber count SHALL update automatically when users subscribe or unsubscribe.

THE subscriber count SHALL be visible on community listings and community detail pages.

### Search Communities

### Community Search

THE system SHALL allow users to search for communities by entering part or all of a community name.

WHEN a user enters a search query, THE system SHALL return communities whose names contain the search term.

THE system SHALL treat search queries in a case-insensitive manner.

THE search results SHALL display the matching communities with their name, description, icon, and subscriber count.

IF no communities match the search query, THE system SHALL display an empty state message.

### Community Filtering

THE system SHALL support filtering the community list by name when a search term is provided.

THE filtered results SHALL be limited to communities whose names match the provided search term.

## Subscription Operations

Authenticated users can subscribe to any community to become a subscriber and receive updates from that community. Users can unsubscribe from any community they are currently subscribed to, which removes their subscription immediately. Users can view a list of all communities they are currently subscribed to in their account area. Subscription to a community is required before a user can create posts within that community; users who are not subscribed cannot submit new content there.

### Subscribe to Community

THE system SHALL allow a logged-in user to subscribe to any community by selecting the subscribe action on that community.

WHEN a user subscribes to a community, THE system SHALL record the subscription with the user identifier and the community identifier.

THE system SHALL increment the subscriber count for the community upon successful subscription.

IF a user is already subscribed to the community, THE system SHALL reject the subscription request and inform the user that they are already subscribed.

THE system SHALL grant the user immediate access to create posts in the subscribed community upon successful subscription.

WHEN a user subscribes to a community, THE system SHALL add the community to the user's list of subscribed communities.

### Unsubscribe from Community

THE system SHALL allow a logged-in user to unsubscribe from any community they are currently subscribed to.

WHEN a user unsubscribes from a community, THE system SHALL remove the subscription record linking the user to that community.

THE system SHALL decrement the subscriber count for the community upon successful unsubscription.

IF a user is not currently subscribed to the community, THE system SHALL reject the unsubscription request and inform the user that they are not subscribed.

WHEN a user unsubscribes from a community, THE system SHALL immediately revoke the user's ability to create new posts in that community.

Existing posts created by the user in the community before unsubscribing SHALL remain visible on the platform.

### View Subscribed Communities

THE system SHALL allow a logged-in user to view a list of all communities they are currently subscribed to.

THE system SHALL display each subscribed community with its name, description, icon, and subscriber count.

THE list of subscribed communities SHALL be accessible from the user's account area or profile section.

THE system SHALL order the subscribed communities list by the most recent subscription date by default.

WHEN a user has no subscriptions, THE system SHALL display an empty state message encouraging the user to explore and subscribe to communities.

THE subscribed communities list SHALL update immediately after a user subscribes or unsubscribes.

### Subscription Requirement for Posting

THE system SHALL require a user to be subscribed to a community before they can create a post in that community.

WHEN a non-subscribed user attempts to create a post in a community, THE system SHALL prevent the post creation and display an error message indicating that subscription is required.

THE system SHALL provide a direct link or button for the user to subscribe to the community from the error message.

IF a user unsubscribes from a community after creating posts, THE system SHALL retain those posts but prevent the user from creating additional posts until they resubscribe.

THE system SHALL verify the user's subscription status at the time of post submission, not at the time of draft creation.

### Subscriber Status Check

THE system SHALL determine whether a user is currently subscribed to a given community.

WHEN displaying a community page, THE system SHALL show the current user's subscription status for that community.

IF the user is subscribed, THE system SHALL display an unsubscribe option on the community page.

IF the user is not subscribed, THE system SHALL display a subscribe option on the community page.

THE system SHALL make the subscription status available to the frontend through the user interface elements associated with each community.

Guest users SHALL see a subscribe option that redirects them to the login page when clicked.

### Manage Community Subscriptions

THE system SHALL allow community owners and moderators to view the subscriber count for their community.

THE system SHALL allow community owners and moderators to view a list of all users currently subscribed to their community.

THE list of subscribers SHALL display each subscriber's username and the date they subscribed.

THE system SHALL NOT allow community owners or moderators to remove subscriptions on behalf of other users; users must unsubscribe themselves.

THE system SHALL provide owners and moderators with tools to ban users from the community, which prevents those banned users from posting while their subscription (if any) remains intact.

## Post Operations

Subscribed users can create new posts within communities they belong to, with a title being required for all posts. Posts must be one of three types: text posts containing textual content, link posts containing an external URL, or image posts containing an uploaded image. Users can edit their own posts to update the title, content, or attached media. Users can delete their own posts, which removes the post and its associated comments from view. When viewing a single post, users see the title, full content or media, author username, community name, current vote score, comment count, and the timestamp of when it was posted.

### Post Creation in Community

Users who are subscribed to a community can create a new post within that community.

A user can only create a post in a community they have an active subscription to. If the user is not subscribed to the community, the system rejects the post creation request.

Every post requires a title. The title must be provided when creating a post. If the title is missing, the system rejects the request.

A post must be classified as one of three types: text post, link post, or image post. The post type is specified during creation and determines what additional content is associated with the post.

When a post is created, it is automatically associated with the community it was posted in and the user who created it. The creation timestamp is recorded.

### Text Post Creation

When a user selects text post as the post type, they must provide textual content for the post.

Text posts contain body text that represents the main content of the post. This content is displayed in full when viewing the individual post.

Text content for text posts is required when creating a text post type.

### Link Post Creation

When a user selects link post as the post type, they must provide a URL for the post.

Link posts contain an external web address that users can navigate to from the post. When displaying link posts in a list, the system shows the domain name extracted from the URL.

A URL is required when creating a link post type.

### Image Post Creation

When a user selects image post as the post type, they must provide an image file for the post.

Image posts contain an uploaded image that serves as the main content. When displaying image posts in a list, the system shows a thumbnail preview of the uploaded image.

An image file is required when creating an image post type.

### Editing Own Post

Users can edit posts they have created. Users cannot edit posts created by other users.

When editing a post, users can update the title. The title remains required during edits.

For text posts, users can update the textual content.

For link posts, users can update the URL.

For image posts, users can replace the uploaded image with a different one.

The system records when a post was last edited.

### Deleting Own Post

Users can delete posts they have created. Users cannot delete posts created by other users.

When a post is deleted, it is no longer visible in any post list or feed. The post is also removed from its individual view.

Deleting a post also removes all comments associated with that post from visibility.

### Viewing Post Details

When a user views a single post, the system displays the following information:

- The post title
- The full content appropriate to the post type: the complete text content for text posts, the full URL for link posts, or the full image for image posts
- The username of the post author
- The name of the community the post belongs to
- The current vote score showing the net number of upvotes minus downvotes
- The total count of comments on the post
- The timestamp indicating when the post was created

### Post List Display

When viewing posts in any feed or list, each post entry displays:

- The post title
- The username of the author
- The name of the community it belongs to
- The current vote score
- The total number of comments
- The time elapsed since posting (such as "3 hours ago")
- For text posts: the first 200 characters of the content followed by an indicator if there is more
- For image posts: a small thumbnail preview of the image
- For link posts: the domain name extracted from the URL

## Comment Operations

Authenticated users can write comments on any post to engage in discussions. Users can reply directly to any comment, and those replies can have their own replies, creating unlimited nesting depth with no maximum hierarchy level. Users can edit their own comments to modify the text content after posting. Users can delete their own comments, which removes them from view while preserving the thread structure. Each comment displays the author's username, the text content, the current vote score, the timestamp of when it was posted, and all nested replies underneath it.

### Comment Creation

### Comment Creation

Authenticated users can write a comment on any post to engage in discussions.

#### Comment Posting

THE system SHALL allow a logged-in user to write a comment on any post.

WHEN a user submits a comment on a post, THE system SHALL store the comment with the author's reference, the post reference, the content text, and the posting timestamp.

WHEN a comment is submitted with empty content, THE system SHALL reject the request.

#### Reply to Comment

THE system SHALL allow a user to reply to any existing comment.

WHEN a user replies to a comment, THE system SHALL store the reply with a reference to the parent comment.

WHEN displaying a comment that has replies, THE system SHALL display the nested replies underneath the parent comment.

### Comment Author Display

THE system SHALL display the author username on each comment.

THE system SHALL link the author username to their profile page.

### Comment Vote Score

THE system SHALL display the current vote score on each comment.

THE vote score SHALL equal the total upvotes minus total downvotes.

### Comment Timestamp

THE system SHALL display the time since posting on each comment.

THE timestamp SHALL show relative time such as "3 hours ago" or "2 days ago".

### Unlimited Comment Nesting

### Unlimited Comment Nesting

THE system SHALL support unlimited nesting depth for comment replies.

WHEN a user replies to a comment that is itself a reply, THE system SHALL create a nested reply without any depth restriction.

THE system SHALL display all nested replies in a hierarchical tree structure under the original comment.

### Nested Reply Structure

THE system SHALL store a parent comment reference on each reply to establish the nesting relationship.

WHEN a reply is created, THE system SHALL link it to its parent comment, allowing the system to retrieve all descendants.

THE system SHALL display nested replies indented or visually distinguished from their parent comment.

WHEN displaying a thread of replies, THE system SHALL show all descendant replies regardless of nesting depth.

### Nested Replies Display

WHEN a user views a comment, THE system SHALL display all direct replies underneath it.

WHEN a user expands or clicks on a reply, THE system SHALL display that reply's own replies, continuing the thread.

THE system SHALL visually indicate the nesting level of each reply through indentation or threading lines.

### Comment Editing

### Comment Editing

Authenticated users can edit their own comments to modify the text content after posting.

#### Edit Own Comment

THE system SHALL allow a user to edit a comment only if they are the author of that comment.

WHEN a user edits their comment, THE system SHALL update the content text with the new value.

WHEN a comment is edited, THE system SHALL preserve the original author, post reference, parent comment reference, and vote score.

WHEN a user who is not the author attempts to edit a comment, THE system SHALL reject the request.

#### Edit Timestamp Update

WHEN a comment is edited, THE system SHALL update the timestamp to reflect the edit time.

### Comment Deletion

### Comment Deletion

Authenticated users can delete their own comments, which removes them from view while preserving the thread structure.

#### Delete Own Comment

THE system SHALL allow a user to delete a comment only if they are the author of that comment.

WHEN a user deletes their comment, THE system SHALL remove the content from public view.

WHEN a comment is deleted, THE system SHALL preserve the comment record and its relationships to maintain the reply structure.

WHEN displaying a deleted comment, THE system SHALL indicate that the comment was deleted rather than showing the content.

WHEN a parent comment is deleted, THE system SHALL still display any replies to that comment, showing the reply content normally.

WHEN a user who is not the author attempts to delete a comment, THE system SHALL reject the request.

### Comment Deletion Cascade

THE system SHALL NOT automatically delete replies when a parent comment is deleted.

All nested replies SHALL remain visible and accessible after their parent comment is deleted.

### Comment Voting

### Comment Voting

Users can upvote or downvote comments to express their opinion on the quality or relevance of the comment.

#### Upvote Comment

THE system SHALL allow a logged-in user to upvote a comment.

WHEN a user upvotes a comment, THE system SHALL record the vote with a value of positive one.

THE system SHALL increase the comment's vote score by one when an upvote is added.

THE system SHALL increase the comment author's karma score by one.

#### Downvote Comment

THE system SHALL allow a logged-in user to downvote a comment.

WHEN a user downvotes a comment, THE system SHALL record the vote with a value of negative one.

THE system SHALL decrease the comment's vote score by one when a downvote is added.

THE system SHALL decrease the comment author's karma score by one.

#### Single Vote Per User

THE system SHALL allow only one vote per user on any given comment.

WHEN a user has already voted on a comment and attempts to vote again, THE system SHALL update the existing vote to the new value.

WHEN a user changes their vote from upvote to downvote, THE system SHALL decrease the score by two and adjust the author's karma accordingly.

WHEN a user changes their vote from downvote to upvote, THE system SHALL increase the score by two and adjust the author's karma accordingly.

#### Remove Vote

THE system SHALL allow a user to remove their vote from a comment.

WHEN a user removes an upvote, THE system SHALL decrease the score by one and decrease the author's karma by one.

WHEN a user removes a downvote, THE system SHALL increase the score by one and increase the author's karma by one.

## Vote Operations

Authenticated users can upvote any post or comment, which increases the content's score by one point. Users can downvote any post or comment, which decreases the content's score by one point. Each user can cast only one vote on any given post or comment; voting multiple times requires changing or removing the existing vote first. Users can change their vote from upvote to downvote or vice versa, with the score adjusting accordingly. Users can remove their vote entirely from any post or comment they previously voted on. The vote score displayed for any content equals the total number of upvotes minus the total number of downvotes.

### Upvoting Content

### Upvoting Posts

Authenticated users can upvote any post they have not previously voted on. When a user upvotes a post, the system shall record the upvote and immediately increase the post's vote score by one point. The post author's karma shall increase by one point when an upvote is successfully recorded.

### Upvoting Comments

Authenticated users can upvote any comment they have not previously voted on. When a user upvotes a comment, the system shall record the upvote and immediately increase the comment's vote score by one point. The comment author's karma shall increase by one point when an upvote is successfully recorded.

### Upvote Restrictions

The system shall prevent a user from upvoting their own content. The system shall prevent a user from upvoting content they have already upvoted. The system shall prevent guests from upvoting any content.

### Downvoting Content

### Downvoting Posts

Authenticated users can downvote any post they have not previously voted on. When a user downvotes a post, the system shall record the downvote and immediately decrease the post's vote score by one point. The post author's karma shall decrease by one point when a downvote is successfully recorded.

### Downvoting Comments

Authenticated users can downvote any comment they have not previously voted on. When a user downvotes a comment, the system shall record the downvote and immediately decrease the comment's vote score by one point. The comment author's karma shall decrease by one point when a downvote is successfully recorded.

### Downvote Restrictions

The system shall prevent a user from downvoting their own content. The system shall prevent a user from downvoting content they have already downvoted. The system shall prevent guests from downvoting any content.

### Vote Exclusivity Per Content Item

### Single Vote Rule

The system shall allow only one vote per user on any given post. The system shall allow only one vote per user on any given comment.

### Vote Type Tracking

When a user votes on a post, the system shall record whether the vote is an upvote or a downvote. When a user votes on a comment, the system shall record whether the vote is an upvote or a downvote. The system shall associate each vote with the specific user who cast it and the specific content item being voted on.

### Attempting Duplicate Votes

If a user attempts to upvote content they have already upvoted, the system shall reject the request and inform the user that they have already voted in that direction. If a user attempts to downvote content they have already downvoted, the system shall reject the request and inform the user that they have already voted in that direction.

### Changing Vote Direction

### Switching from Upvote to Downvote

When a user who has previously upvoted a post chooses to downvote that same post, the system shall update the existing vote from upvote to downvote. The post's vote score shall decrease by two points to reflect the change from plus one to minus one. The post author's karma shall decrease by two points to reflect the reversed vote.

### Switching from Downvote to Upvote

When a user who has previously downvoted a post chooses to upvote that same post, the system shall update the existing vote from downvote to upvote. The post's vote score shall increase by two points to reflect the change from minus one to plus one. The post author's karma shall increase by two points to reflect the reversed vote.

### Comment Vote Direction Changes

The system shall apply the same two-point score adjustment and two-point karma adjustment when users change their vote direction on comments.

### Removing Vote

### Removing an Upvote

When a user removes their upvote from a post, the system shall delete the vote record. The post's vote score shall decrease by one point. The post author's karma shall decrease by one point to reflect the removed upvote.

### Removing a Downvote

When a user removes their downvote from a post, the system shall delete the vote record. The post's vote score shall increase by one point. The post author's karma shall increase by one point to reflect the removed downvote.

### Removing Comment Votes

The system shall apply the same one-point adjustments when users remove their votes from comments. The comment author's karma shall adjust accordingly when a vote is removed.

### Vote Score Calculation

### Score Formula

The vote score displayed for any post shall equal the total number of upvotes minus the total number of downvotes. The vote score displayed for any comment shall equal the total number of upvotes minus the total number of downvotes.

### Negative Score Handling

The system shall allow vote scores to be negative when downvotes exceed upvotes. There shall be no floor imposed on vote scores.

### Score Display Context

When displaying a post list, the system shall show the calculated vote score for each post. When displaying a single post view, the system shall show the calculated vote score. When displaying a comment, the system shall show the calculated vote score alongside the comment content.

### Karma Adjustment Through Voting

### Karma Increase from Upvotes

When any user receives an upvote on their post, their karma shall increase by one point. When any user receives an upvote on their comment, their karma shall increase by one point. Karma increases shall be immediate and reflected on the user's profile.

### Karma Decrease from Downvotes

When any user receives a downvote on their post, their karma shall decrease by one point. When any user receives a downvote on their comment, their karma shall decrease by one point. Karma can decrease below zero.

### Cumulative Karma Impact

Each user's karma shall represent the sum of all positive and negative karma changes from votes on their content across all posts and comments. Karma shall serve as a single aggregated score reflecting the community's overall reception of the user's contributions.

## Moderator Operations

The user who creates a community automatically becomes the owner with the highest authority level within that community. The owner can add any user as a moderator to help manage the community. The owner can remove any moderator from their community, including moderators they did not personally appoint. Moderators can add other users as moderators to share moderation responsibilities. Moderators cannot remove the community owner under any circumstances. Moderators cannot remove other moderators; only the owner has the authority to demote other moderators. Both moderators and owners can delete any post within their community that violates community guidelines.

### Adding Moderators to Community

THE system SHALL allow the community owner to assign a moderator role to any user within their community.

THE system SHALL allow moderators to assign the moderator role to other users within their community.

THE system SHALL record the user being assigned as moderator, the community, and the assigning authority.

THE system SHALL require that the user being assigned as moderator exists and is not already a moderator of that community.

THE system SHALL notify the newly assigned moderator that they have received moderation privileges.

### Removing Moderators from Community

THE system SHALL allow the community owner to remove any moderator from their community.

THE system SHALL allow owners to remove moderators they did not personally appoint.

THE system SHALL prevent moderators from removing other moderators.

THE system SHALL prevent anyone from removing the community owner from their own community.

THE system SHALL record the removal of moderator status and the authority who performed the removal.

### Community Owner Authority

THE system SHALL grant the community creator automatic ownership of their community upon creation.

THE system SHALL assign the owner the highest authority level within the community.

THE owner SHALL have the ability to add and remove any moderator in their community.

THE owner SHALL retain their ownership status even when other moderators are added or removed.

THE system SHALL prevent the transfer of ownership to another user.

### Moderator Privileges

THE system SHALL grant moderators the ability to delete any post within their community.

THE system SHALL grant moderators the ability to delete any comment within their community.

THE system SHALL grant moderators the ability to ban users from their community.

THE system SHALL grant moderators the ability to unban users from their community.

THE system SHALL grant moderators the ability to view reports submitted for their community.

THE system SHALL grant moderators the ability to approve or dismiss reports for their community.

THE system SHALL prevent moderators from adding or removing other moderators.

### Deleting Posts in Community

THE system SHALL allow moderators to remove any post from their community regardless of the post author.

THE system SHALL allow the owner to remove any post from their community regardless of the post author.

THE deleted post SHALL be removed from all feeds and search results.

THE system SHALL record the deletion and the moderator who performed it.

### Owner Removal Protection

THE system SHALL prevent moderators from removing the community owner.

THE system SHALL prevent any user from removing the community creator from their own community.

THE system SHALL return an error if removal of the owner is attempted.

### Moderator Hierarchy

THE system SHALL establish a hierarchy where the owner holds the highest authority.

THE system SHALL establish a secondary tier for assigned moderators.

THE owner SHALL be the only role that can add or remove moderators.

THE owner SHALL retain authority regardless of how many moderators exist in the community.

### Sharing Moderation Duties

THE system SHALL allow multiple moderators to be assigned to a single community.

THE system SHALL allow any moderator to perform moderation actions independently.

THE system SHALL allow moderators to add other users as moderators to distribute workload.

THE moderators SHALL share equal ability to delete posts, delete comments, ban users, and manage reports.

## Ban Operations

Moderators and community owners can ban any user from their community for violating rules or guidelines. Banned users cannot create new posts or write comments within the community they are banned from. Banned users can still view all content in the community but cannot participate by posting or commenting. Moderators and owners can unban previously banned users, restoring their ability to post and comment in the community. Community moderators can view a complete list of all users currently banned from their community.

### Ban User from Community

## Ban User from Community

Moderators and community owners can ban any user from their community when that user violates community rules or guidelines. When a moderator initiates a ban, the system records the banned user, the community, and the moderator who issued the ban. Banned users are immediately restricted from creating new posts or writing comments within the affected community. The system notifies the moderator of successful ban completion.

## Unban User from Community

Moderators and community owners can unban previously banned users from their community. When an unban is processed, the system removes the ban restriction, and the user regains the ability to create posts and write comments in that community. The system confirms successful unbanning to the moderator.

## View Banned Users List

Moderators and community owners can view a complete list of all users currently banned from their community. The list displays each banned user's information along with when they were banned and which moderator issued the ban. This list helps moderators track repeat offenders and review ban history.

## Banned User Restrictions

Banned users cannot create new posts within the community they are banned from. Banned users cannot write new comments on any post within the community they are banned from. These restrictions apply immediately upon ban issuance and persist until the user is unbanned. Banned users retain full access to view all public content within the community, including posts, comments, and community information.

## Prevent Post Creation for Banned Users

When a banned user attempts to create a post in a community they are banned from, the system rejects the request and informs the user that they are banned from posting in that community. This restriction ensures banned users cannot circumvent their punishment by continuing to submit new content.

## Prevent Comment for Banned Users

When a banned user attempts to write a comment on any post within a community they are banned from, the system rejects the request and informs the user that they are banned from commenting in that community. This applies to both top-level comments and nested replies.

## Allow Viewing While Banned

Banned users can still browse and view all content within the community they are banned from. This includes viewing posts, reading comments, and exploring community information. The viewing restriction only applies to participation activities, not to consuming content.

## Moderation Ban Tools

Community moderators have access to ban management tools that allow them to ban users, unban users, and review the list of banned users. These tools are accessible only to moderators and owners of a community. The moderation tools provide a centralized interface for managing user restrictions and maintaining community safety.

### Unban User from Community

## Unban User from Community

Moderators and community owners can unban previously banned users to restore their ability to participate in the community. When an unban is processed, the system removes the active ban record and immediately restores the user's posting and commenting privileges in that community. The system confirms successful unbanning to the moderator who initiated the action.

### View Banned Users List

## View Banned Users List

Moderators and community owners can access a complete roster of all users currently banned from their community. The list presents each banned user with their account details, the date and time when the ban was issued, and the username of the moderator who imposed the ban. Moderators can use this list to monitor enforcement history and identify users who may require extended restrictions.

### Banned User Restrictions

## Banned User Restrictions

Banned users face immediate restrictions on posting and commenting activities within the affected community. These restrictions are enforced at the community level, meaning a ban in one community does not affect the user's participation in other communities. The restriction remains in effect until a moderator or owner explicitly unbans the user.

### Prevent Post Creation for Banned

## Prevent Post Creation for Banned Users

The system blocks any attempt by a banned user to create a post in a community where they have been banned. The post creation interface is disabled for banned users in that specific community. If a banned user attempts to circumvent this restriction through alternative methods, the system rejects the request with an appropriate message indicating the user's banned status.

### Prevent Comment for Banned Users

## Prevent Comment for Banned Users

The system blocks any attempt by a banned user to write comments on posts within a community where they have been banned. This restriction applies to all comment creation attempts, including direct replies to posts and nested replies to existing comments. The comment submission interface is disabled for banned users in the affected community.

### Allow Viewing While Banned

## Allow Viewing While Banned

Banned users continue to have full read access to the community content they are banned from. They can view posts, read comments, and browse community information without any restrictions. This ensures that banned users are not completely excluded from the community while still being prevented from violating community rules through posting or commenting.

### Moderation Ban Tools

## Moderation Ban Tools

Community moderators and owners have access to dedicated ban management tools within their community administration interface. These tools enable moderators to search for users, issue bans with a reason, view the current list of banned users, and remove bans when appropriate. The moderation tools maintain an audit trail of all ban and unban actions for accountability.

## Report Operations

Authenticated users can report any post or comment that violates community rules or platform guidelines. When reporting content, users must provide a text reason explaining why the content is being reported. Moderators can view all reports submitted for content within their community, seeing the reported content, the username of the reporter, and the reason provided. Moderators can approve a report, which results in the deletion of the reported content. Moderators can dismiss a report if they determine it does not warrant action, which keeps the content visible and removes the report from the active report list.

### Reporting Posts

Authenticated users can report any post in the system that violates community rules or platform guidelines.

When a user submits a report for a post, the system must require a text reason explaining why the content is being reported. The report must capture the identity of the reporting user, the post being reported, and the reason provided.

A user cannot report their own content. If a user attempts to report a post they authored, the system must reject the request.

A user cannot submit multiple reports for the same post. If a user has already reported a post, subsequent reports for that same post must be rejected.

### Reporting Comments

Authenticated users can report any comment in the system that violates community rules or platform guidelines.

When a user submits a report for a comment, the system must require a text reason explaining why the content is being reported. The report must capture the identity of the reporting user, the comment being reported, and the reason provided.

A user cannot report their own comment. If a user attempts to report a comment they authored, the system must reject the request.

A user cannot submit multiple reports for the same comment. If a user has already reported a comment, subsequent reports for that same comment must be rejected.

### Report Reason Requirement

THE system SHALL require a text reason when submitting any report.

When a user attempts to submit a report without providing a reason, the system SHALL reject the request and inform the user that a reason is required.

The reason field must contain actual text content. Empty or whitespace-only reasons must be rejected.

### Viewing Community Reports

Moderators can view all reports submitted for content within their community.

When a moderator views the report list for their community, the system SHALL display each report showing:

- The content that was reported (post title and content or comment content)
- The username of the person who submitted the report
- The reason provided by the reporter
- The type of content being reported (post or comment)

Reports must be sortable by date submitted, with most recent reports appearing first.

### Approving Reports

Moderators can approve a report by taking action on the reported content.

When a moderator approves a report on a post, THE system SHALL delete the reported post.

When a moderator approves a report on a comment, THE system SHALL delete the reported comment.

The deletion must be permanent and the content must no longer be visible to other users.

After approving a report, THE system SHALL remove the report from the active report list.

### Dismissing Reports

Moderators can dismiss a report when they determine the reported content does not warrant action.

When a moderator dismisses a report, THE system SHALL keep the reported content visible and accessible to users.

After dismissing a report, THE system SHALL remove the dismissed report from the active report list so it no longer appears in the moderator's queue.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

Sign-up fails when email is already registered to another account. Log-in fails when email or password is incorrect, and the system does not reveal which field is wrong. Password change requires the current password and fails if the provided current password does not match. Account deletion requires confirmation and permanently removes all associated posts, comments, and votes from the system. Users cannot log in after account deletion. Attempting to view a profile for a deleted account returns a not found error. Username uniqueness is enforced during sign-up, and registration fails if the chosen username is already taken. Empty or whitespace-only values for display name or bio are handled as valid inputs.

### User Registration Errors

## Sign-up Email Validation

When a user attempts to register with an email address that is already associated with an existing account, the system shall reject the registration request and display an error message indicating that the email is already in use.

The system shall not reveal whether the email exists in the system through timing differences or other side channels.

## Login Credential Validation

When a user attempts to log in with an incorrect email or password, the system shall reject the authentication attempt and display a generic error message stating that the email or password is incorrect.

The system shall not indicate whether the email does not exist or whether the password is wrong, to prevent enumeration attacks.

## Password Change Validation

When a user attempts to change their password, the system shall require the user to provide their current password as verification.

If the provided current password does not match the stored password, the system shall reject the password change request and display an error message indicating that the current password is incorrect.

The system shall not reveal whether the account exists during this validation.

## Username Uniqueness Validation

When a user attempts to register with a username that is already taken by another user, the system shall reject the registration request and display an error message indicating that the username is already in use.

Username comparison shall be case-sensitive to prevent confusion between users with similar names.

## Account Deletion Cascade

When a user confirms account deletion, the system shall permanently remove all of the user's associated data, including their posts, comments, and votes.

The system shall update vote scores on content authored by the deleted user to reflect the removal of their votes.

The system shall remove all subscriptions associated with the deleted user.

## Deleted User Profile Access

When a user attempts to view the profile of a deleted account, the system shall display a not found error message indicating that the user does not exist.

Deleted usernames shall not be reassigned to new users to prevent confusion and potential impersonation.

## Empty Profile Field Handling

When a user updates their display name with an empty string or whitespace-only value, the system shall accept the input as valid.

When a user updates their bio with an empty string or whitespace-only value, the system shall accept the input as valid and display an empty bio field.

The system shall preserve leading and trailing whitespace in bio content as entered by the user.

## Post-Deletion Authentication

After a user's account is deleted, the system shall prevent the deleted user from logging in using their previous credentials.

The system shall treat the deleted account's email as available for new registrations after a reasonable processing period.

### User Authorization Errors

## Post Content Modification Authorization

When a user attempts to modify a post that they did not author, the system shall reject the request and display an error indicating that the user is not authorized to edit this content.

The system shall allow post authors to modify the title, content, and type of their own posts.

## Comment Content Modification Authorization

When a user attempts to edit a comment that they did not write, the system shall reject the request and display an error indicating that the user is not authorized to edit this comment.

The system shall allow comment authors to modify the content of their own comments.

## Voting Authorization

When a user attempts to vote on their own content, the system shall allow the vote to be recorded.

When a user is not logged in and attempts to vote on any content, the system shall reject the request and prompt the user to log in.

## Profile Viewing After Deletion

When any user attempts to access the profile page of a deleted account through a direct link or search result, the system shall display a user not found error.

The system shall not list deleted users in user search results.

## Post Author Display After Deletion

When a post is displayed and its author has been deleted, the system shall show that the post was authored by a deleted user.

Clicking on the deleted author's name shall display the user not found error.

### Profile Update Errors

## Profile Field Input Validation

When a user submits a display name that exceeds reasonable length limits, the system shall truncate the display name to the maximum allowed length.

When a user submits a bio that exceeds reasonable length limits, the system shall truncate the bio to the maximum allowed length.

The system shall accept special characters, numbers, and unicode characters in both display name and bio fields.

## Session Expiration Handling

When a user's session expires during an active operation, the system shall prompt the user to log in again before continuing.

The system shall preserve any input data during the re-authentication process when technically feasible.

## Concurrent Account Modification

When multiple simultaneous requests attempt to modify the same user's profile, the system shall process each request in the order received.

The system shall not lose data due to concurrent updates but may apply the changes in sequence.

## Community Error Scenarios

Community creation fails if the chosen name is already used by another community. Search returns an empty list when no communities match the entered name. Communities with zero subscribers display a subscriber count of zero. The owner of a community cannot be removed or transferred to another user. Community names are case-sensitive, so "TechNews" and "technews" could theoretically exist as separate communities, but the system should prevent confusion by treating similar names as conflicts. Description text can be empty, but the community name is required and must be unique. Icon images can be updated but are optional.

### Duplicate Community Name Rejection

When a user attempts to create a community using a name that already exists in the system, the creation request must be rejected. The user receives feedback indicating that the chosen community name is already taken. The system should not create a duplicate community under any circumstances. The user must choose a different unique name to proceed with community creation.

### Empty Search Results

When a user searches for communities using a specific name and no communities match the search criteria, the system displays an empty result list. The empty state should clearly communicate that no communities were found matching the entered name. Users can then either modify their search terms or create a new community with that name if desired.

### Zero Subscriber Display

When a community has not yet attracted any subscribers, the subscriber count displayed on the community page and in community lists shows zero. This zero count is the accurate reflection of the current subscriber state. Newly created communities start with zero subscribers until the first user subscribes.

### Community Ownership Immutability

Once a community is created and the ownership is assigned to the creating user, that ownership cannot be transferred to another user under any circumstances. The original creator remains the owner for the lifetime of the community. If the owner wishes to step down, the only option is to delete the community entirely. No administrative override exists to reassign ownership.

### Case-Sensitive Name Handling

Community names are treated as case-sensitive values, meaning the system distinguishes between "TechNews" and "technews" as two separate valid names. However, to prevent user confusion and potential name squatting through case variation, the system should reject community names that differ only by case from existing community names. A user cannot create "TechNews" if "technnews" already exists, and vice versa. The system must perform case-insensitive duplicate checking while storing the original casing.

### Missing Required Community Name

When a user attempts to create a community without providing a community name, the creation request must be rejected. The community name is a required field for community creation. The user must supply a valid name before the system will accept the creation request. No default name is assigned automatically.

### Optional Icon Image

A community icon image is optional when creating a community. Users may choose to provide an icon during creation or skip this step entirely. Communities without an icon image display a default placeholder or no icon at all. The icon can be updated or added later by the community owner. The absence of an icon does not prevent community creation or affect the community's functionality.

## Subscription Error Scenarios

Users cannot subscribe to the same community more than once; a duplicate subscription request returns an error. Unsubscribing from a community the user is not subscribed to returns an error. When a community is deleted, all associated subscriptions are automatically removed. Users can view their complete list of subscribed communities, and the list is empty for users who have never subscribed. Subscribing to a community immediately allows the user to create posts in that community. There is no limit on the number of communities a user can subscribe to.

### Duplicate Subscription Prevention

### Duplicate Subscription Prevention

When a user attempts to subscribe to a community they are already subscribed to, the system SHALL reject the request and return an error indicating the user is already subscribed.

### Unsubscribe Non-Subscriber Error

When a user attempts to unsubscribe from a community they are not subscribed to, the system SHALL reject the request and return an error indicating the user is not subscribed to that community.

### Subscription Cleanup on Community Deletion

When a community is deleted from the platform, the system SHALL automatically remove all subscriptions associated with that community. Users who were subscribed to the deleted community will no longer have that subscription in their subscribed communities list.

### Empty Subscription List

When a user who has never subscribed to any community requests their list of subscribed communities, the system SHALL return an empty list.

### Immediate Posting Rights After Subscribe

When a user successfully subscribes to a community, the system SHALL immediately grant that user the ability to create posts in the community. There SHALL be no delay or additional verification required before the user can post.

### Unlimited Subscription Count

The system SHALL allow users to subscribe to an unlimited number of communities. There SHALL be no maximum limit on how many communities a user can be subscribed to at any given time.

### Unsubscribe Non-Subscriber Error

### Unsubscribe Non-Subscriber Error

When a user attempts to unsubscribe from a community they are not currently subscribed to, the system SHALL reject the request and return an error indicating that the user is not subscribed to that community.

### Duplicate Subscription Prevention

When a user attempts to subscribe to a community they are already subscribed to, the system SHALL reject the request and return an error indicating the user is already subscribed to that community.

### Subscription Cleanup on Deletion

When a community is deleted, the system SHALL automatically remove all associated subscriptions. All users who were subscribed to the deleted community will have their subscription records permanently removed.

### Empty Subscription List

When viewing the list of subscribed communities, if the user has never subscribed to any community, the system SHALL display an empty list.

### Immediate Posting Rights After Subscribe

After a user successfully subscribes to a community, the system SHALL immediately allow that user to create posts in the community without any additional steps or waiting period.

### Unlimited Subscription Count

The system SHALL place no limit on the number of communities a user can subscribe to. A user may subscribe to as many communities as they choose.

### Subscription Cleanup on Deletion

### Subscription Cascade Deletion

When a community is deleted from the system, all associated subscription records SHALL be permanently removed as part of the deletion process.

### User Subscription State After Community Deletion

After a community is deleted, users who were previously subscribed to that community SHALL no longer have it appear in their list of subscribed communities. The subscription ceases to exist.

### Automatic Cleanup Integrity

The system SHALL ensure that no orphaned subscriptions remain after a community deletion. All subscriptions linked to the deleted community SHALL be cleaned up automatically.

### Duplicate Subscription Prevention

A user SHALL NOT be able to subscribe to the same community more than once. If a duplicate subscription attempt occurs, the system SHALL reject it with an appropriate error message.

### Unsubscribe Non-Subscriber Error

When a user who is not subscribed to a community attempts to unsubscribe, the system SHALL reject the request and inform the user that they are not subscribed to that community.

### Unlimited Subscription Count

The system SHALL impose no limit on the number of communities a user can subscribe to. Users can subscribe to all available communities without restriction.

### Empty Subscription List

### Empty List for New Users

When a user who has never subscribed to any community requests their subscribed communities, the system SHALL return an empty list with no communities displayed.

### Empty List After All Unsubscriptions

When a user has unsubscribed from all communities and requests their subscribed communities, the system SHALL return an empty list.

### List Response Format

The system SHALL return a list of subscribed communities. Each entry SHALL display the community name, description, and subscriber count. If no subscriptions exist, the list SHALL be empty.

### Duplicate Subscription Prevention

The system SHALL prevent users from subscribing to the same community twice. Attempting to subscribe to an already-subscribed community SHALL return an error.

### Unsubscribe Non-Subscriber Error

Attempting to unsubscribe from a community the user is not subscribed to SHALL return an error indicating the user is not subscribed.

### Immediate Posting Rights After Subscribe

Upon successful subscription, the user SHALL immediately be able to create posts in the newly subscribed community.

### Immediate Posting Rights After Subscribe

### Post Creation Immediately After Subscribe

When a user successfully subscribes to a community, the system SHALL immediately allow that user to create posts within that community. There SHALL be no waiting period or additional confirmation required.

### Subscription Requirement Enforcement

The system SHALL only allow users to create posts in communities they are subscribed to. Users who are not subscribed to a community SHALL NOT be able to create posts in that community.

### Subscription Verification

Before allowing a user to create a post in a community, the system SHALL verify that the user has an active subscription to that community.

### Unlimited Subscription Count

The system SHALL allow users to subscribe to any number of communities, enabling them to post in as many communities as they wish without restriction.

### Duplicate Subscription Prevention

If a user attempts to subscribe to a community they are already subscribed to, the system SHALL reject the request with an appropriate error message.

### Unsubscribe Non-Subscriber Error

If a user attempts to unsubscribe from a community they are not subscribed to, the system SHALL reject the request with an appropriate error message.

### Unlimited Subscription Count

### No Subscription Limit

The system SHALL allow users to subscribe to an unlimited number of communities. There is no maximum cap on subscriptions per user.

### Subscription Accessibility

Users can subscribe to all available communities on the platform without encountering any quantity restrictions.

### Post Creation Across Multiple Communities

Users with many subscriptions SHALL be able to create posts in any of their subscribed communities without limitation.

### Duplicate Subscription Prevention

Even with unlimited subscriptions, the system SHALL prevent duplicate subscriptions to the same community. A user SHALL NOT be able to subscribe to the same community more than once.

### Unsubscribe Non-Subscriber Error

Attempting to unsubscribe from a community the user is not subscribed to SHALL return an error message.

### Subscription Cleanup on Deletion

When a community is deleted, all subscriptions to that community SHALL be automatically removed, regardless of how many subscriptions exist.

## Post Error Scenarios

Post creation fails if the user is not subscribed to the target community. A post without a title is rejected. Posts must specify one of the three allowed types, and each type requires its corresponding content field (text, URL, or image). Users can only edit or delete their own posts; attempting to modify another user's post returns an error. When a post is deleted, all associated comments and votes are removed. Deleted posts are no longer visible in any feed. Posts in banned communities cannot be created by banned users. Comment counts update when comments are added or removed from a post.

### Unsubscribed Post Creation Denial

When a user attempts to create a post in a community they are not subscribed to, the system must reject the request. The user must first subscribe to the community before they can create any posts within it. The system displays an error message indicating that a subscription is required to post in that community.

### Missing Required Title Rejection

When a user submits a post without providing a title, the system must reject the request. The title is a required field for all post types. The system displays an error message indicating that the title cannot be empty.

### Invalid Post Type Validation

When a user creates a post, they must specify one of three allowed types: text, link, or image. The system validates that exactly one content type is specified. For text posts, the text content field must be provided. For link posts, the URL field must be provided and must be a valid web address. For image posts, an image must be uploaded. If any of these type-specific requirements are missing, the system rejects the post and indicates which content is required for the selected post type.

### Unauthorized Post Modification

When a user attempts to edit or delete a post that was created by another user, the system must reject the request. Only the original author of a post has permission to modify or remove it. The system displays an error message indicating that the user does not have permission to modify this post.

### Post Deletion Cascade

When a post is deleted by its author, the system must remove all associated data. This includes all comments on the post, all votes on the post, and all votes on the comments. The deletion cascades through the entire comment tree. This cascading deletion ensures no orphaned votes or comments remain after the post is removed.

### Deleted Post Visibility

After a post is deleted, it must no longer appear in any feed including the home feed, popular feed, or community feed. The post must also no longer be accessible by its direct link. Any attempt to access a deleted post returns an error indicating the content is no longer available.

### Banned User Post Restriction

When a user who has been banned from a community attempts to create a post in that community, the system must reject the request. Banned users retain the ability to view content in the community, but they cannot create new posts or comments. The system displays an error message indicating that the user is banned from this community.

### Comment Count Synchronization

The system must maintain accurate comment counts for each post. When a new comment is added to a post, the comment count increases by one. When a comment is deleted, the comment count decreases by one. The comment count always reflects the total number of non-deleted comments on the post. This count is displayed alongside the post in all feed views.

## Comment Error Scenarios

Users can only edit or delete their own comments; attempting to modify another user's comment returns an error. When a comment is deleted, its nested replies remain visible but show the parent comment as deleted. Comment creation fails for banned users in the affected community. Editing a comment updates its timestamp to show the edit time. Empty comment content is allowed but discouraged; the system accepts it. Replies to deleted comments are still possible if the parent comment is soft-deleted and still accessible. Users can view all their comments on their profile, including those on deleted posts.

### Unauthorized Comment Modification

### Unauthorized Comment Modification

WHEN a user attempts to edit a comment, THE system SHALL verify that the requesting user is the author of that comment.

WHEN a user attempts to delete a comment, THE system SHALL verify that the requesting user is the author of that comment.

IF the requesting user is not the author of the comment, THE system SHALL reject the request and return an error message indicating that the user is not authorized to modify this comment.

### Deleted Parent Comment Visibility

WHEN a comment that has replies is deleted, THE system SHALL mark the parent comment as deleted while preserving the nested replies.

THE system SHALL display deleted parent comments with a placeholder message indicating the comment was deleted.

REPLIES to a deleted parent comment SHALL remain visible and accessible to all users who can view the original post.

USERS SHALL be able to navigate and read replies even when the parent comment is deleted.

### Banned User Comment Restriction

WHEN a banned user attempts to create a comment in a community where they have been banned, THE system SHALL reject the request and return an error message indicating the ban status.

BANNED users SHALL be able to view comments in communities where they are banned.

BANNED users SHALL be able to reply to comments they can view, provided the reply is not in a community where they are banned.

WHEN a moderator removes a ban, THE user SHALL immediately regain the ability to create comments in that community.

### Comment Edit Timestamp Update

WHEN a user edits their own comment, THE system SHALL update the comment's timestamp to reflect the time of the edit.

THE system SHALL display the edited timestamp alongside the original creation timestamp to indicate when the comment was last modified.

AN edit that changes content SHALL always update the timestamp, regardless of whether the new content is identical to the previous content.

### Empty Content Comment Acceptance

WHEN a user submits a comment with no content, THE system SHALL accept the submission and store the comment.

EMPTY comments SHALL be visible to other users and appear with no text content.

THE system SHOULD display a visual indicator on empty comments to discourage their creation.

### Reply to Soft-Deleted Comment

WHEN a comment has been soft-deleted but remains accessible in the system, USERS SHALL still be able to post replies to that comment.

REPLIES posted to a soft-deleted comment SHALL appear in the nested reply structure beneath the deleted parent comment.

IF a comment has been permanently deleted rather than soft-deleted, THE system SHALL prevent users from creating new replies to that comment.

### Comments on Deleted Posts Display

WHEN a user views their profile and the list of their comments is displayed, THE system SHALL include comments that were written on posts that have since been deleted.

DELETED posts SHALL display a placeholder indicating that the original post is no longer available.

USERS viewing a deleted post's comment section SHALL see all existing comments displayed with the post information showing as deleted.

WHEN a post is deleted, all comments on that post SHALL remain associated with the deleted post in the author's comment history on their profile.

### Deleted Parent Comment Visibility and Soft-Delete Replies

### Deleted Parent Comment Visibility

WHEN a comment that has replies is deleted, THE system SHALL mark the parent comment as deleted while preserving the nested replies.

THE system SHALL display deleted parent comments with a placeholder message indicating the comment was deleted.

REPLIES to a deleted parent comment SHALL remain visible and accessible to all users who can view the original post.

USERS SHALL be able to navigate and read replies even when the parent comment is deleted.

### Reply to Soft-Deleted Comment

WHEN a comment has been soft-deleted but remains accessible in the system, USERS SHALL still be able to post replies to that comment.

REPLIES posted to a soft-deleted comment SHALL appear in the nested reply structure beneath the deleted parent comment.

IF a comment has been permanently deleted rather than soft-deleted, THE system SHALL prevent users from creating new replies to that comment.

### Banned User Comment Restriction

### Banned User Comment Restriction

WHEN a banned user attempts to create a comment in a community where they have been banned, THE system SHALL reject the request and return an error message indicating the ban status.

BANNED users SHALL be able to view comments in communities where they are banned.

BANNED users SHALL be able to reply to comments they can view, provided the reply is not in a community where they are banned.

WHEN a moderator removes a ban, THE user SHALL immediately regain the ability to create comments in that community.

### Comment Edit Timestamp Update

### Comment Edit Timestamp Update

WHEN a user edits their own comment, THE system SHALL update the comment's timestamp to reflect the time of the edit.

THE system SHALL display the edited timestamp alongside the original creation timestamp to indicate when the comment was last modified.

AN edit that changes content SHALL always update the timestamp, regardless of whether the new content is identical to the previous content.

### Empty Content Comment Acceptance

### Empty Content Comment Acceptance

WHEN a user submits a comment with no content, THE system SHALL accept the submission and store the comment.

EMPTY comments SHALL be visible to other users and appear with no text content.

THE system SHOULD display a visual indicator on empty comments to discourage their creation.

### Comments on Deleted Posts Display

### Comments on Deleted Posts Display

WHEN a user views their profile and the list of their comments is displayed, THE system SHALL include comments that were written on posts that have since been deleted.

DELETED posts SHALL display a placeholder indicating that the original post is no longer available.

USERS viewing a deleted post's comment section SHALL see all existing comments displayed with the post information showing as deleted.

WHEN a post is deleted, all comments on that post SHALL remain associated with the deleted post in the author's comment history on their profile.

## Vote Error Scenarios

Each user can only have one vote per post or comment; attempting to vote twice returns an error or updates the existing vote. Voting on your own content is allowed, affecting your own karma score. Removing a vote adjusts karma accordingly (adding back if it was a downvote, subtracting if it was an upvote). Vote scores can go negative when downvotes exceed upvotes. Anonymous users cannot vote; they must be logged in. Users can vote on both posts and comments, and these votes are tracked separately. Voting on deleted content removes the vote record.

### Duplicate Vote Prevention

Users can cast only one vote on any given post. When a user attempts to vote on a post they have already voted on, the system shall either update the existing vote to the new value or reject the duplicate vote attempt with an error message indicating that a vote already exists.

Users can cast only one vote on any given comment. When a user attempts to vote on a comment they have already voted on, the system shall apply the same behavior as for posts—either updating the existing vote or returning an error for the duplicate vote.

The system tracks votes separately for posts and comments. A vote on a post does not count toward or prevent voting on the comments within that post, and vice versa.

### Self-Voting Allowance

Users are permitted to vote on their own posts and comments. When a user upvotes or downvotes content they authored, the vote is recorded normally and the karma score adjusts accordingly.

Self-voting follows the same rules as voting on other users' content, including duplicate vote prevention and karma adjustment upon vote removal.

### Vote Removal Karma Adjustment

When a user removes an upvote they previously cast, the system shall increase the author's karma score by 1 to reverse the original upvote effect.

When a user removes a downvote they previously cast, the system shall decrease the author's karma score by 1 to reverse the original downvote effect.

Vote removal karma adjustments are applied immediately upon vote removal and reflect the net change to the author's karma score.

### Negative Vote Score Handling

Vote scores on posts and comments can be negative when downvotes exceed upvotes. The system shall display the raw score (upvotes minus downvotes) without any floor at zero.

Negative vote scores do not trigger any special display treatment or visibility restrictions. The score is shown as a negative integer when downvotes outnumber upvotes.

### Anonymous Vote Denial

Anonymous users who are not logged in cannot cast votes on any content. When an anonymous user attempts to vote, the system shall deny the request and prompt the user to log in or sign up.

All vote operations require an active authenticated session. The system verifies user identity before recording any vote.

### Separate Post and Comment Voting

Votes on posts and comments are tracked in separate vote records. A user can upvote a post and independently upvote, downvote, or not vote on each comment within that post.

Changing a vote on a post does not affect existing votes on comments, and changing a vote on a comment does not affect the vote on the parent post.

The system maintains separate vote histories for each content type, allowing users full voting flexibility on posts and comments independently.

### Vote Removal on Content Deletion

When a post is deleted by its author or a moderator, all votes associated with that post are removed. The karma adjustment for those votes is not reversed upon post deletion.

When a comment is deleted by its author or a moderator, all votes associated with that comment are removed. Like post deletion, karma is not reversed when a commented post is deleted.

Vote records are permanently deleted when their associated content is deleted, and users are free to use those vote slots on other content.

## Moderator Error Scenarios

Only the community owner can add or remove moderators. Moderators cannot remove other moderators; only the owner has that authority. Moderators cannot remove the community owner. Attempting moderator actions in a community where the user is not a moderator returns an error. The owner cannot be added as a moderator since they already have full authority. When a moderator leaves a community voluntarily, they lose their moderator status. Adding a user who is already a moderator returns an error. All moderator actions are logged for audit purposes.

### Owner-Only Moderator Management

THE system SHALL reject any request to add a moderator when the requesting user is not the community owner.

THE system SHALL reject any request to remove a moderator when the requesting user is not the community owner.

THE system SHALL verify the requesting user's ownership status before processing moderator management operations.

### Moderator Removal Restriction

THE system SHALL reject any request by a moderator to remove another moderator from the same community.

THE system SHALL prevent moderators from performing any moderator removal action regardless of their role level.

THE system SHALL return an error when a moderator attempts to remove any other moderator, stating that only the owner can perform this action.

### Owner Removal Prevention

THE system SHALL reject any request to remove the community owner from their own community.

THE system SHALL prevent any user, including other moderators, from removing the owner's moderator status.

THE system SHALL recognize that the community owner cannot lose their authority through standard moderator removal processes.

### Unauthorized Moderator Action

THE system SHALL reject any request to perform moderator actions when the requesting user is not a moderator or owner of the target community.

THE system SHALL verify moderator status before allowing deletion of posts or comments by moderators.

THE system SHALL reject ban or unban requests from users who do not have moderator privileges in the target community.

WHEN a non-moderator attempts to access moderator-only features, THE system SHALL return an error indicating insufficient permissions.

### Duplicate Moderator Assignment

THE system SHALL reject any request to add a user as a moderator when that user is already a moderator in the same community.

THE system SHALL prevent duplicate moderator assignments and return an appropriate error message.

THE system SHALL verify existing moderator status before processing a new moderator addition request.

### Voluntary Moderator Demotion

THE system SHALL allow a moderator to voluntarily remove their own moderator status from a community.

THE system SHALL remove all moderator privileges from the user immediately upon voluntary demotion.

THE system SHALL update the moderator list to reflect the removed status.

THE system SHALL prevent the demoted user from performing any moderator actions in that community after voluntary demotion.

### Moderator Action Audit Logging

THE system SHALL record all moderator actions with a timestamp indicating when the action occurred.

THE system SHALL log the identity of the moderator who performed each action.

THE system SHALL capture the specific type of action performed (add moderator, remove moderator, delete content, ban user, unban user).

THE system SHALL record the target of each moderator action (which user was affected or which content was modified).

THE system SHALL maintain an audit log that preserves these records for review purposes.

## Ban Error Scenarios

Banning a user who is already banned in a community returns an error. Unbanning a user who is not currently banned returns an error. Banned users retain read access to the community but cannot create posts or comments. Moderators can view the complete list of banned users for their community, which is empty if no users are banned. The community owner cannot be banned from their own community. Banned users can still vote on content. When a moderator is banned from their own community, they lose moderator privileges. Banned users attempting to post see an error message indicating their ban status.

### Duplicate Ban Prevention

When a moderator attempts to ban a user who is already banned in that community, the system shall reject the request and return an error indicating the user is already banned.

The error message shall clearly state that the user cannot be banned again until they are unbanned first.

### Unban Non-Banned User Error

When a moderator attempts to unban a user who is not currently banned in that community, the system shall reject the request and return an error indicating the user is not banned.

The error message shall clearly state that there is no active ban to remove for this user.

### Banned User Read Access Retention

When a banned user attempts to view content within the community they are banned from, the system shall allow the view operation to proceed.

The banned user shall see community feeds, individual posts, and comments without any restriction.

The system shall only restrict the banned user's ability to create new content, not consume existing content.

### Empty Banned User List

When a moderator views the list of banned users for their community and no users are currently banned, the system shall display an empty list.

The empty state shall be clearly communicated to the moderator with a message indicating that no users have been banned from this community.

### Owner Ban Exemption

When any user, including moderators, attempts to ban the owner of a community from that same community, the system shall reject the request.

The system shall return an error indicating that community owners cannot be banned from their own community.

This rule applies regardless of who initiated the ban attempt.

### Banned User Voting Allowance

When a banned user attempts to vote on any post or comment within the community they are banned from, the system shall allow the vote operation.

Banned users retain the ability to upvote or downvote content.

The system shall only restrict content creation for banned users, not voting privileges.

### Moderator Self-Ban Privilege Loss

When a moderator is banned from their own community, the system shall remove their moderator privileges for that community.

The banned moderator shall no longer be able to perform moderator actions such as deleting posts, deleting comments, or managing other moderators.

The system shall update the moderator's privileges immediately upon the ban taking effect.

Only the community owner can restore the moderator's privileges by unbanning them.

### Ban Status Error Message

When a banned user attempts to create a post or comment within the community they are banned from, the system shall reject the request.

The system shall return an error message that clearly indicates the user's ban status.

The error message shall specify the community from which the user is banned.

The error message shall indicate that the user must wait until they are unbanned to post in that community.

## Report Error Scenarios

Reports without a reason text are rejected; the reason field is required. Users cannot report their own content. A user can submit multiple reports for the same content as long as each has a different reason. Duplicate reports with identical reasons from the same user are prevented. Approving a report deletes the reported content immediately. Dismissing a report removes it from the report queue and keeps the content visible. Users cannot view reports for communities they do not moderate. Reports for deleted content are automatically dismissed. Each report shows the reporter, the reported content, and the reason provided.

### Report Submission Validation

## Missing Report Reason Rejection

WHEN a user submits a report without providing a reason, THE system SHALL reject the report submission and require the user to enter a reason before the report can be submitted.

## Self-Report Prevention

WHEN a user attempts to report their own content, THE system SHALL reject the report and display an error message indicating that users cannot report their own posts or comments.

## Multiple Report Submission

WHEN a user submits a report for content with a different reason than a previous report by the same user, THE system SHALL accept the new report and store it alongside existing reports for that content.

## Duplicate Report Prevention

WHEN a user attempts to submit a report for the same content with the same reason they have already submitted, THE system SHALL reject the duplicate report and inform the user that they have already submitted this report.

## Report Approval Content Deletion

WHEN a moderator approves a report, THE system SHALL immediately delete the reported content and remove the report from the pending reports list.

## Report Dismissal Content Preservation

WHEN a moderator dismisses a report, THE system SHALL remove the report from the pending reports list and preserve the reported content without any changes.

## Unauthorized Report Access Denial

WHEN a user who is not a moderator of the community attempts to view reports for a community, THE system SHALL deny access and display an error message indicating that only moderators can view reports.

## Automatic Dismissal of Deleted Content

WHEN the system detects that a reported post or comment has already been deleted, THE system SHALL automatically dismiss the report without moderator action.

## Report Information Display

WHEN a moderator views a report, THE system SHALL display the following information: the content that was reported, the username of the person who submitted the report, the reason provided for the report, and the date when the report was submitted.

### Report Information Display Requirements

## Report Content Display Requirements

WHEN viewing any report, THE system SHALL display the full content of the reported post or comment, including the title for posts.

## Report Metadata Display

WHEN viewing any report, THE system SHALL display the username of the reporter, the reason text entered by the reporter, and a timestamp indicating when the report was submitted.

## Report Context Display

WHEN displaying a report for a post, THE system SHALL show which community the post belongs to and the original author of the content.

WHEN displaying a report for a comment, THE system SHALL show which post the comment belongs to and the original author of the comment.

### Report Processing Outcomes

## Report Approval Cascade

WHEN a report is approved and the content is deleted, THE system SHALL handle any associated votes and comments according to the standard deletion rules for that content type.

## Report List Update After Approval

WHEN a moderator approves a report, THE system SHALL remove the approved report from the moderator's view of pending reports immediately after deletion occurs.

## Report List Update After Dismissal

WHEN a moderator dismisses a report, THE system SHALL remove the dismissed report from the moderator's view of pending reports immediately.

## Batch Report Processing

WHEN multiple reports exist for the same piece of content, THE system SHALL allow moderators to approve or dismiss each report individually without affecting the others.

### Report Visibility and Status

## View Own Reports

WHEN a user wants to check their report history, THE system SHALL allow them to view a list of reports they have submitted, showing the content, community, reason, and status of each report.

## Report Status Indication

WHEN viewing submitted reports, THE system SHALL indicate whether each report is pending review, has been approved, or has been dismissed.

## No Notification for Report Disposition

WHEN a report is approved or dismissed, THE system SHALL NOT send any notification to the user who submitted the report.

# End-to-End User Scenarios

Cross-domain user scenarios that span multiple concepts, describing complete user journeys.

## Cross-Domain User Scenarios

Define end-to-end user scenarios that span multiple concepts, describing complete user journeys from start to finish.

### New User Onboarding Journey

### From New User to Active Contributor

This scenario describes how a new visitor becomes an active community contributor.

**Registration Phase**: A visitor provides their email address, chooses a password, and selects a unique username. The system validates that the email and username are not already in use. Upon successful registration, the user receives confirmation and is logged into their new account.

**Profile Setup Phase**: After registration, the user visits their profile page. They can set a display name that will be shown to other users, write a bio describing themselves, and upload an avatar image. These profile details can be updated at any time.

**Community Discovery Phase**: The user browses the list of available communities. They can search for communities by name to find topics of interest. Each community displays its name, description, icon, and subscriber count.

**Subscription Phase**: The user subscribes to communities that interest them. Once subscribed, the user can unsubscribe if they change their mind. The user can view a list of all communities they are currently subscribed to.

**First Post Phase**: The user creates a post in one of their subscribed communities. The post requires a title and must be one of three types: text, link, or image. Once created, the post appears in the community feed and home feed for subscribers.

**Karma Building Phase**: As other users upvote the post, the author's karma score increases. If users downvote, the karma decreases. The karma score reflects the author's overall reputation across all their posts and comments.

### Content Discovery and Engagement

### Content Consumption and Interaction

This scenario describes how a user discovers, views, and interacts with content.

**Feed Browsing**: A logged-in user views their personalized home feed showing posts from subscribed communities. The user can sort this feed by hot (recent posts with many upvotes), new (most recent), top (highest vote score), or controversial (many votes but score close to zero). Logged-out users can only access the popular feed showing all posts.

**Single Post Viewing**: When selecting a post from a feed, the user sees the complete title, full content, author username, community name, vote score, comment count, and posting timestamp. For text posts, the full content is displayed. For link posts, the URL is shown along with its domain. For image posts, the full image is displayed.

**Voting on Content**: The user can upvote or downvote any post or comment. If they have already voted, they can change their vote to the opposite direction or remove it entirely. Each vote immediately updates the vote score and adjusts the author's karma accordingly.

**Commenting**: The user writes a comment on a post. They can also reply to existing comments, creating nested replies with no depth limit. Comments display the author's username, content, vote score, timestamp, and nested replies.

**Profile Exploration**: The user visits another user's profile to see their display name, bio, avatar, total karma score, all their posts, and all their comments.

### Content Moderation Process

### Community Moderation Workflow

This scenario describes how community moderators handle content and user violations.

**Accessing Moderation Tools**: When a moderator visits their community, they can access moderation tools that show all pending reports for that community. Each report displays the reported content, the reporter's username, and the reason provided.

**Reviewing Reports**: The moderator reviews each reported post or comment. They examine the content in context and the reason given by the reporter.

**Taking Action on Reports**: The moderator can approve a report, which deletes the reported content. Alternatively, the moderator can dismiss a report, which keeps the content visible and removes the report from the list.

**Managing Problem Users**: When a user violates community rules, the moderator can ban that user from the community. Banned users cannot create new posts or comments but can still view content. The moderator can later unban a user if appropriate.

**Viewing Ban List**: The moderator can view a complete list of all users currently banned from their community.

### Report Submission and Resolution Flow

### End-to-End Report Submission and Resolution

This scenario follows a piece of content from discovery of a violation through to resolution.

**Violation Discovery**: A user encounters a post or comment that violates community rules or platform policies. The user decides to report this content.

**Report Submission**: The user initiates the report process and provides a text explanation of why the content is problematic. The report is submitted and the user receives confirmation that it has been filed.

**Report Queue Management**: A community moderator accesses the report queue for their community. They see the reported content, the reason provided, and the identity of the reporter.

**Decision Making**: After reviewing the content, the moderator decides whether the content violates community standards. If the content is inappropriate, the moderator approves the report, which removes the content. If the content is acceptable, the moderator dismisses the report, which preserves it.

**Resolution**: The reported content is either deleted or retained based on the moderator's decision. The report is removed from the pending queue.

### Moderator Appointment and Management

### Complete Moderator Lifecycle

This scenario covers the entire lifecycle of moderator permissions from appointment to removal.

**Moderator Appointment**: A community owner adds a trusted member as a moderator. The owner grants moderator privileges by selecting the user and assigning the moderator role.

**Moderator Powers**: Once appointed, the moderator can delete any post or comment in the community, ban and unban users, and review reports. These powers apply only within their assigned community.

**Moderator Management**: The owner can add additional moderators. Both the owner and existing moderators can add new moderators. However, only the owner can remove moderators. Moderators cannot remove each other.

**Moderator Removal**: The owner decides to remove a moderator's privileges. The owner removes the moderator designation, and that user loses all moderation powers in the community. The former moderator remains a regular subscriber.

**Owner Preservation**: The original community creator cannot be removed as an owner. Even if there are other moderators, the owner retains highest authority over the community.

# File Storage

File upload capabilities, media processing, and storage requirements.

## File Upload and Management

Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

### Avatar Image Upload

Users can upload an avatar image on their profile.

The system shall accept image files for avatars.

Avatar uploads are available only to authenticated users for their own profile.

When an avatar is uploaded, it replaces any existing avatar.

Users can remove their avatar, which reverts to a default placeholder image.

### Community Icon Upload

The community creator can upload an icon image when creating a community.

Icon uploads are available only to the community creator during creation.

When an icon is uploaded, it is associated with the community permanently unless updated.

Community owners can update their community icon at any time.

If no icon is uploaded, a default placeholder icon is displayed.

### Image Post Upload

Authenticated users can create an image post by uploading an image file.

Image posts require a title and an uploaded image file.

The system shall accept common image formats for upload.

Uploaded images are associated with the post and displayed in the post detail view.

Users can replace the image on their own image posts before submission.

After a post is created, the image cannot be changed, but the post can be deleted and recreated.

### Media Storage and Retrieval

Uploaded files are stored and retrieved when viewing profiles, communities, or posts.

Images are displayed at appropriate sizes based on context:
- Thumbnails in post lists
- Full size in post detail views
- Avatar sizes in profile views
- Icon sizes in community listings

The system shall retrieve stored images reliably for all authorized viewers.

### Upload Constraints and Access

The system shall enforce a maximum file size for all uploads.

The system shall validate uploaded files are valid image formats.

Invalid files shall be rejected with an appropriate error message.

Only authenticated users can upload files to the system.

Uploaded images are viewable by all users regardless of authentication status.