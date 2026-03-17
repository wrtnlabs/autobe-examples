**community — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Each user owns the content they create on the platform. This includes their profile information (display name, bio, and avatar image), all posts they have authored, and all comments they have written. A user retains ownership of their content for as long as their account exists.

Each community is owned by the user who created it. Community ownership includes the community's name, description, icon image, and the moderation structure associated with it. The community owner has the highest authority over community-level data.

Votes cast by a user belong to that user. When a user removes a vote, the vote record is no longer associated with any content.

Subscription records belong to the subscribing user. A user's list of subscribed communities is associated with their account.

Reports submitted by a user belong to that user. The reporter's identity is recorded with each report.

### Data Isolation

User account data is isolated per account. One user's credentials, profile, votes, subscriptions, and reports are not accessible to other users through the platform's normal operations.

Community data is isolated by community. Posts, comments, bans, and reports in one community are not visible or accessible within the context of another community. Moderator permissions granted in one community do not carry over to another community.

Vote records are isolated such that only the aggregate vote score is publicly visible. Individual users' voting choices on specific posts or comments are not exposed to other users.

Ban records are scoped to the community in which the ban was issued. A ban in one community does not affect a user's ability to participate in other communities.

Report records are isolated to community moderators. Only moderators of the community in which a report was filed can view the report details. Reporters cannot see reports filed by other users, and non-moderator members cannot access any report data.

### Access Control and Privacy Boundaries

The platform distinguishes between publicly visible information and privately restricted information.

**Publicly visible information** includes:
- Any user's profile page: display name, bio, avatar, total karma score, list of authored posts, and list of written comments
- Posts and their full content (title, body, author, community, vote score, comment count, and time posted) across all communities
- Comments and their content, author, vote score, and nested replies on any post
- The list of all communities, including each community's name, description, icon, and subscriber count
- Any community's post feed

Guests (unauthenticated users) may access all publicly visible information listed above without an account.

**Restricted information** — accessible only to the account holder or authorized parties — includes:
- A user's email address and password; these are never exposed to other users
- The home feed, which shows posts from a user's subscribed communities; this is available only to the authenticated user themselves
- A user's personal list of subscribed communities; only that user can view their own subscription list
- Vote history; a user's individual voting choices are not disclosed to any other user
- Ban records; only community moderators can view the list of banned users in their community
- Report records; only community moderators can view reports submitted in their community, including who filed each report and the stated reason

Moderators can access ban and report data only within the communities they moderate. They do not gain access to account credentials, private subscription lists, or vote histories of any user.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Deletion of Content

When a user deletes their own post or comment, or when a moderator deletes a post or comment within their community, the content is immediately hidden from all public views and feeds. The content is no longer visible to any user, including the author, but is not immediately and permanently erased from the platform's records at the moment of deletion.

This soft-deletion approach applies to all three post types (text, link, and image posts) as well as all comments regardless of their nesting depth. Once a post or comment is soft-deleted, it no longer appears in any feed, on any community page, or on the author's profile page. Vote scores associated with the deleted content are also excluded from all displays.

When a report is approved by a moderator, the reported post or comment is deleted in the same manner as a direct moderator deletion — it is immediately removed from public view and treated as soft-deleted.

Avatar images and community icon images that a user replaces with a new upload are also considered superseded and are no longer served to users after the replacement is saved.

### Account Deletion and Cascade Behavior

When a user deletes their own account, the deletion triggers a cascade that removes all content directly associated with that account. Specifically, all posts the user has created and all comments the user has written are also deleted as part of the same account deletion action. This cascade is described in the original user requirements and is the authoritative behavior for account deletion.

After account deletion, the user's profile, display name, bio, and avatar image are no longer accessible. The deleted user's username is no longer shown as an active author on any content. Subscriptions the user held and any moderator roles the user occupied within communities are also removed.

Karma scores that other users received from the deleted user's votes are not retroactively adjusted — the platform does not recalculate karma history when a voter's account is deleted.

Communities that the deleted user owned remain on the platform. The ownership and moderation responsibilities of those communities are handled according to the community moderation rules defined in the functional requirements.

### Retention Period for Deleted Data

Soft-deleted records — including deleted posts, deleted comments, and deleted user accounts — are held in the platform's internal records for a defined retention window before being scheduled for permanent removal. This retention window exists to support operational integrity and to allow the platform to verify that cascading deletions (such as those triggered by account deletion) have completed successfully.

During the retention window, soft-deleted content is not accessible to any user through the platform. It is invisible in all feeds, profile pages, community pages, and search results. No user action can retrieve or restore it through normal platform features.

Image files associated with deleted posts (image posts) and replaced avatar or community icon images are retained in storage for the same retention window before being permanently removed.

Reports that have been dismissed by a moderator are removed from the moderation report list immediately upon dismissal, as stated in the user requirements. Dismissed reports are not retained in any user-visible view after dismissal, though internal records may be kept for the same retention window as other deleted data.

### Recovery of Deleted Content

The platform does not offer a self-service recovery mechanism for deleted posts or comments. Once a user deletes their own post or comment, or once a moderator deletes content within their community, the deletion is considered final from the user's perspective and cannot be undone through any platform feature.

Similarly, account deletion is irreversible from the user's perspective. A user who deletes their account cannot recover their account, their profile information, their posts, or their comments through any action available on the platform.

Approved reports result in permanent content deletion, and the deleted content cannot be restored by any moderator action after the report has been approved.

Because no user-facing recovery is provided, the platform's design should ensure that deletion actions are confirmed before execution, consistent with the error handling and validation rules described in the business rules document.

### Permanent Deletion

After the retention window has elapsed, soft-deleted records are permanently and irreversibly removed from the platform's storage. Permanently deleted content cannot be recovered by any means, including by platform operators.

Permanent deletion applies to all associated data of a deleted entity. For a permanently deleted post, this includes its title, content (text, link URL, or image file), all vote records for that post, all associated comments and their vote records, and any reports linked to that post. For a permanently deleted comment, this includes its text content, all vote records for that comment, and any reports linked to it. For a permanently deleted user account, this includes the user's profile, avatar image, subscription records, vote history, and moderator role assignments.

Once permanent deletion occurs, the username previously held by the deleted account becomes available for registration by a new user, subject to the uniqueness rules for usernames defined in the domain model.

Image files stored for image posts and profile avatars are permanently deleted from storage at the same time as their associated records, ensuring that no orphaned files remain after the retention window expires.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Types of Stored Files

The platform stores three categories of uploaded image files on behalf of users:

- **User avatar images**: Each user may upload one avatar image as part of their profile. Uploading a new avatar replaces the previously stored one.
- **Community icon images**: Each community may have one icon image uploaded by its owner or moderators. Replacing the icon supersedes the previous file.
- **Post image files**: Image-type posts each carry one uploaded image. The image is permanently associated with the post and is removed when the post is deleted.

All stored files are associated with the user or content record that owns them. When a user deletes their account, all image files they uploaded — including their avatar and all post images — are also removed from storage. When a post is deleted, its associated image file is removed from storage. Community icon images are removed when the community is deleted.

### Storage Capacity Considerations

Storage capacity must account for the cumulative volume of user-generated image content across three upload surfaces: user avatars, community icons, and image post files.

The total storage footprint grows as the number of registered users, communities, and image posts grows on the platform. Each of these three upload surfaces contributes independently to the overall storage demand:

- The number of avatar files is bounded by the total number of registered users, since each user holds at most one avatar at a time.
- The number of community icon files is bounded by the total number of communities, since each community holds at most one icon at a time.
- The number of post image files is unbounded and scales directly with the rate at which users create image-type posts.

Because post image files represent the primary source of storage growth, capacity planning must treat image post volume as the dominant factor. Storage must accommodate ongoing growth without imposing a platform-wide ceiling that would prevent users from creating image posts. When a post or user account is deleted, the associated image files are freed, partially reclaiming capacity.

### Image File Delivery

Uploaded image files — user avatars, community icons, and post images — must be retrievable for display whenever the associated content is viewed:

- A user's avatar must be accessible wherever their profile or username appears across the platform, including post lists, comment threads, and profile pages.
- A community's icon must be accessible wherever the community is displayed, including community lists, search results, and community feeds.
- A post's image must be accessible when viewing the post detail and when the post appears in any feed as a thumbnail.

Image files must remain accessible as long as the associated content exists. Once the owning content (user, community, or post) is deleted, the image file is no longer required to be accessible and may be purged from the delivery layer. The platform must ensure that deleted content's images are not reachable after deletion.