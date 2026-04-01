**redditCommunity — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Users own all content they create, including their profile information, posts, and comments.

The user who creates a community owns that community and has the highest authority over it.

When a user deletes their account, all content they created is also deleted, including their posts and comments.

Users retain ownership of their content even when it appears in communities they do not own.

Community owners cannot claim ownership of posts or comments created by other users in their community.

### Data Access Control

All users, including those not logged in, can view posts in the popular feed and community feeds.

Only logged-in users can view the home feed showing posts from their subscribed communities.

Banned users in a community can still view all content in that community but cannot create posts or comments.

All users can view any other user's profile page.

Moderators can view the list of banned users in their community.

Moderators can view all reports filed for their community, including the reporter identity and reason.

Users can only edit or delete their own posts and comments.

### User Privacy Boundaries

User profiles are publicly visible to all users, including guests.

A user's profile displays their display name, bio text, avatar image, total karma score, list of posts, and list of comments.

The user's chosen username is displayed on all their posts and comments.

Email addresses used for registration are not displayed publicly.

Passwords are never displayed or accessible to any user.

The system does not provide private messaging between users.

Users cannot hide their profile from public view.

Users cannot post anonymously; all posts and comments show the author's username.

### Data Isolation

Each user's content is clearly attributed to their username across the platform.

Posts and comments are isolated by community; each post belongs to exactly one community.

Users can only create posts in communities where they have an active subscription.

Banned users are isolated from participating in the specific community where they are banned but can participate in other communities.

Each user has a single karma score that aggregates votes across all their posts and comments platform-wide.

Community subscriber counts are visible to all users but the list of individual subscribers is not exposed.

Reports filed by users are only visible to moderators of the relevant community, not to other users.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Account and Content Deletion

When a user deletes their account, all posts and comments created by that user are also deleted.

When a user deletes their own post, the post is removed from public view but retained in the system for a defined retention period.

When a user deletes their own comment, the comment is removed from public view but retained in the system for a defined retention period.

When a moderator deletes a post in their community, the post is removed from public view but retained in the system for a defined retention period.

When a moderator deletes a comment in their community, the comment is removed from public view but retained in the system for a defined retention period.

When a moderator approves a report, the reported content (post or comment) is deleted and removed from public view.

Deleted posts no longer appear in any feed (home, popular, or community).

Deleted comments no longer appear in the comment thread.

Deleted content is soft-deleted, meaning it is hidden from users but retained in the system during the retention period.

### Data Retention Period

Deleted user accounts are retained in the system for a defined retention period before permanent deletion.

Deleted posts are retained in the system for a defined retention period before permanent deletion.

Deleted comments are retained in the system for a defined retention period before permanent deletion.

During the retention period, deleted content is not visible to any user, including the original author.

During the retention period, deleted content is not included in any user's karma calculation.

During the retention period, deleted content is not searchable or browsable.

After the retention period expires, data is permanently deleted and cannot be recovered.

The retention period applies uniformly to all deleted accounts, posts, and comments.

### Data Recovery

Users cannot recover their deleted posts after deletion.

Users cannot recover their deleted comments after deletion.

Users cannot recover their deleted account after deletion.

Moderators cannot recover posts they have deleted.

Moderators cannot recover comments they have deleted.

Once the retention period expires and data is permanently deleted, no recovery is possible.

Dismissed reports are removed from the report list and cannot be recovered.

There is no user-facing mechanism to restore deleted content during the retention period.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Image Storage Capacity

The system stores three types of images: user avatars, community icons, and images uploaded in image posts.

Storage capacity must accommodate avatar images for all user accounts.
Storage capacity must accommodate icon images for all communities.
Storage capacity must accommodate images uploaded in image posts.

The system generates thumbnail versions of images for display in post lists.
Storage capacity must account for both original images and their generated thumbnails.

When a user deletes their account, all their uploaded images are deleted.
When a community is deleted, all images associated with that community are deleted.
When a post is deleted, any images attached to that post are deleted.

Storage capacity planning should consider the cumulative size of all images across the platform.