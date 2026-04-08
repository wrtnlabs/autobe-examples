**redditPlatform — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Each user owns the data they create and control their account credentials.

Users own all content they post: every post, comment, and profile update belongs exclusively to the creating user.

The platform stores email addresses and usernames for account identification. Users have the right to access, correct, or delete this personal information.

When a user deletes their account, all their personal data is removed from the platform, including their posts, comments, profile, and karma score. This deletion is permanent and cannot be reversed.

Community ownership is assigned to the user who creates a community. The owner has exclusive rights to add or remove moderators from their community.

### Data Privacy

User profiles are publicly visible. Anyone can view another user's display name, bio text, avatar image, karma score, and their posts and comments.

Account registration data including email addresses and passwords are kept private and are never displayed to other users or the public.

Private account credentials including passwords are never shared with other users, moderators, or support staff.

Community content (posts and comments) is viewable by all users regardless of subscription status, unless the post has been removed by a moderator.

Reports submitted by users are kept confidential. Only moderators of the relevant community can view reports for content in their community.

### Access Control

Guests (logged-out users) can view community content, browse communities, search communities, and read posts and comments. Guests cannot create posts, comments, profiles, or communities.

Members (logged-in users) can perform all guest actions plus: create posts and comments, create communities, subscribe to communities, vote on posts and comments, edit their own posts and comments, edit their own profile, and view other users' profiles.

Only users who are subscribed to a community can create posts in that community.

Moderators have elevated access within their community: they can view reports, view banned users, delete posts and comments, and ban or unban users.

Banned users cannot create posts or comments in the community they are banned from, but they retain the ability to view content.

### Data Isolation

Each user's account data is isolated from other users. Users cannot access or modify another user's posts, comments, profile, or account settings.

Each community's content is isolated to that community. Posts and comments belong exclusively to one community and are not cross-posted or shared between communities.

Moderator privileges are scoped to individual communities. A moderator's access extends only to the communities where they hold moderator roles.

Report data is isolated by community. Moderators can only view and act on reports for their own communities, not for other communities on the platform.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Delete Behavior

When a user deletes their own post or comment, the content is removed from public view and no longer displayed in feeds or comment lists.

When a moderator deletes a post or comment, the content is removed from public view within that community.

Deleted content is hidden from all users including the original author.

Guest users cannot see deleted content under any circumstances.

Deleted content does not appear in the deleted user's profile.

Soft-deleted content is retained for potential recovery or administrative review.

Moderators can view soft-deleted content within their community for moderation purposes.

### Account Deletion

When a user deletes their account, all posts and comments created by the user are permanently deleted from the system.

Account deletion includes removal of all user profile information including display name, bio, and avatar.

Account deletion is irreversible and cannot be undone.

Votes made by the deleted user are preserved on remaining content but the vote attribution is removed.

Comments written by the deleted user are removed from all posts where they appeared.

Posts created by the deleted user are removed from all communities.

Bans associated with the deleted user are removed from communities.

### Moderator Content Deletion

Moderators can delete any post in their community regardless of who created it.

Moderators can delete any comment in their community regardless of who wrote it.

Moderator deletion removes the content from public view immediately.

Moderator deletion does not affect the user's account or other content.

Moderators cannot delete content in communities where they are not a moderator.

The owner of a community has all moderator privileges and can delete any content in that community.

Banned users' content remains on the platform unless explicitly deleted by moderators or the original author.

### Report-Based Deletion

When a moderator approves a report, the reported post or comment is deleted from the platform.

When a moderator dismisses a report, the reported content remains unchanged.

Dismissed reports are removed from the report list and are not visible to moderators.

Users can report any post or comment by providing a reason for the report.

Moderators can view all reports for their community including the reported content and reason.

Each report shows the reported content, the user who reported it, and the reason provided.

Multiple reports on the same content are tracked and all are visible to moderators.

### Retention Period

Deleted posts and comments are retained in the system for a retention period after deletion.

During the retention period, content may be eligible for recovery by the original author.

The retention period begins from the date the deletion is completed.

After the retention period expires, content is permanently removed from the system.

Permanent removal includes all associated data such as votes, replies, and references.

Expired deletion is irreversible and cannot be undone.

Users cannot recover content after the retention period expires.

### Content Recovery

Users can recover their own soft-deleted posts within the retention period.

Users can recover their own soft-deleted comments within the retention period.

Recovery restores the content to its previous state including all associated votes and replies.

Moderators can recover their own soft-deleted content within their community.

Users cannot recover content that was deleted by another user or moderator.

Recovery is not available after the retention period expires.

Recovery operations are logged for audit purposes.

### Deleted Content Visibility

Soft-deleted posts are not visible in any public feeds including home feed, popular feed, and community feeds.

Soft-deleted comments are not visible in the comment list on the associated post.

Replies to soft-deleted comments are also hidden from public view.

Soft-deleted content remains searchable by moderators for administrative purposes within their community.

Guest users cannot see soft-deleted content under any circumstances.

The vote scores on soft-deleted content are not visible in public feeds.

### Banned User Content

Banned users cannot create new posts or comments in the banned community.

Banned users can still view existing content in the banned community.

Content created by banned users before the ban remains on the platform unless deleted.

Moderators can view the list of banned users in their community.

Moderators can unban users to restore their posting privileges.

Bans do not trigger automatic deletion of the user's existing content.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Uploaded Media Ownership

Users retain ownership of images they upload to the system. These images include profile avatars, community icons, and post content images.

The platform stores and displays these images as part of the service. Users may delete their accounts at any time, which results in permanent deletion of all their uploaded images along with their posts and comments.

### Image Content Privacy

Uploaded images are accessible according to the visibility rules of the content they belong to.

Profile avatars are visible to all users who can view the associated user profile.

Community icons are visible to all users who can view the community.

Post images are visible according to post visibility: users in the Home Feed see images from subscribed communities, while users in the Popular Feed and Community Feed see images based on feed permissions.

Users cannot access images that belong to content they do not have permission to view.

### Media Retention on Account Deletion

When a user deletes their account, all associated content is permanently removed from the system.

This includes profile avatar images, all posts the user created (along with their images), and all comments the user wrote (along with their images).

Account deletion is immediate and permanent. There is no recovery option for any user data, including uploaded images, when an account is deleted.