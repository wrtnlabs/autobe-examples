**redditClone — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Isolation

Each user's data is isolated from other users' data.

A user can only read content created by others (posts, comments, public profile information). A user can only modify content they authored (their own posts, comments, profile, password). A user cannot read another user's private information such as their email address. A user cannot access another user's voting decisions on any content. A user's feed shows only content from communities they have subscribed to, ensuring their viewing activity remains private from other users.

### Ownership

Users own the content they create.

When a user creates a post, they own that post and can edit or delete it at any time. When a user writes a comment, they own that comment and can edit or delete it at any time. When a user creates a community, they own that community as the initial owner. Users own their profile information including display name, bio, and avatar image. When a user deletes their account, all posts and comments they authored are permanently removed from the platform. The platform does not claim ownership of user-generated content.

### Access Control

Access to content follows a clear hierarchy of permissions.

A guest (logged-out user) can view all public posts and comments across communities, browse community listings, search for communities, and view any user's public profile. A member (logged-in user) can additionally create posts and comments in subscribed communities, vote on posts and comments, subscribe or unsubscribe from communities, edit their own profile and password, and delete their own account. The owner of a community has full control over that community including assigning moderators and removing content. Moderators can delete any post or comment within their community and manage bans for that community. Moderators cannot access or modify another moderator's permissions or the owner's settings.

### Privacy Boundaries

Users have privacy over their personal information and activities.

A user's email address used for registration is never displayed publicly. A user's password is never visible to anyone, including platform administrators. A user's voting history on posts and comments is private and not disclosed to other users. The order in which a user votes on content is not exposed to content creators. When a moderator reviews reports, the identity of the reporter is visible to help evaluate report credibility, but the reporter's identity is never disclosed to the person being reported. Users can view any public profile but cannot see another user's subscription list or private activity.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Delete Behavior

When a user deletes their own content, the system marks that content as deleted rather than immediately removing it from storage.

Deleted posts remain visible in the system but are displayed with a visual indicator that the content has been removed by the author.

Deleted comments remain visible in the thread structure but show a placeholder indicating the comment was deleted by the author.

Deleted content retains its original author information and timestamp so threaded discussions remain coherent.

Vote counts on deleted content are zeroed out and no longer contribute to the author's karma score.

Deleted content no longer appears in any feeds or search results.

### Data Retention Period

Soft-deleted content is retained in the system for thirty days before permanent deletion occurs.

During this retention period, the content remains recoverable if the user chooses to restore it.

The system automatically schedules permanent deletion of content that has been soft-deleted beyond the retention period.

Account deletion triggers immediate soft-delete of all associated posts and comments, starting the thirty-day retention countdown.

### Content Recovery

Users can recover their own soft-deleted posts within the thirty-day retention period.

Users can recover their own soft-deleted comments within the thirty-day retention period.

When a post is recovered, it reappears in all relevant feeds and becomes visible again to other users.

When a comment is recovered, it displays the original content instead of the deleted placeholder.

Karma scores are recalculated for recovered content when votes are reapplied.

Recovery is not available after the thirty-day retention period has expired.

### Permanent Deletion

Content that exceeds the thirty-day retention period is permanently deleted from the system.

Permanently deleted content cannot be recovered through any means.

Permanent deletion removes the content, its associated votes, and any report records linked to that content.

Deleted comments do not trigger deletion of child replies; child replies remain accessible unless individually deleted.

When a user account is permanently deleted after the retention period, all their posts and comments are permanently deleted along with the account.

Community ownership is not transferred when an owner account is deleted; the community remains but becomes ownerless until reassignment.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### User-Generated Image Storage

## Image Storage for User Profiles

User avatar images must be stored securely and associated with the user's profile. When a user uploads an avatar, the system stores the image and associates it with their account. Users can replace their avatar by uploading a new image, which replaces the previous one.

## Image Storage for Communities

Community icon images must be stored and associated with their respective communities. The community owner can upload or replace the icon image when editing community details. The icon is displayed on community listings and the community page.

## Image Storage for Posts

Image posts contain uploaded images that must be stored and displayed to users viewing the post. The image is stored when the post is created and remains available as long as the post exists. Deleting a post removes its associated image from storage.

### Content Delivery and Caching

## Content Delivery for Images

All user-uploaded images, including avatars, community icons, and image post content, must be accessible to users viewing the platform. Images should be delivered efficiently to users regardless of their geographic location.

## Caching of Static Assets

Avatar images and community icons are viewed frequently across the platform. These images should be cached to reduce repeated downloads and improve page load times for users browsing community listings and user profiles.

### Capacity Management

## Storage Allocation for User Uploads

Each user is allocated storage space for their avatar image and any image posts they create. The storage system tracks the total space consumed by each user's uploads.

## Community Storage Allocation

Each community has storage allocated for its icon image and all image posts submitted to that community. The total storage for a community grows as users submit image posts.

## Storage Monitoring

The platform monitors overall storage consumption to ensure capacity remains available for new uploads. When storage approaches capacity limits, administrators receive notification to plan for expansion.

### Image Retention and Deletion

## Deletion of Image Content

When a user deletes their account, all avatar images they uploaded are removed from storage. When a user deletes a post containing an image, that image is removed from storage. When a community owner removes a community, the community icon and all images within that community's posts are removed.