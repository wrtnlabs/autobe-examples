**redditCommunity — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### User Data Ownership

Each user owns the data they create, including their posts, comments, and profile information. Users retain ownership of their account even when they delete content. The community owner owns the community they create, including the authority to add and remove moderators. Moderators have management permissions for their community's content but do not own the content they moderate.

### Content Deletion and Retention

When a user deletes their account, all posts and comments created by that user are also deleted. Deleted account data is permanently removed and cannot be recovered. When a user deletes their own post or comment, that content is permanently removed. When a moderator deletes a post or comment in their community, that content is permanently removed.

### Profile Visibility and Privacy

Each user's profile is visible to all other users on the platform. Profile information includes display name, bio text, avatar image, total karma score, and lists of posts and comments. Guest users can view public profiles but cannot view private account settings. Profile information is read by other users to understand the community member's identity and contribution history.

### Access Control Boundaries

Users can edit and delete their own posts and comments. Users cannot edit or delete posts or comments created by other users, unless they are a moderator of the community. Moderators can delete any post or comment within their community, regardless of author. Banned users cannot create new posts or comments in that community but retain read access to view existing content. Account owners can change their password to maintain account security.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Account Deletion

Users may permanently delete their user account from the platform.

When a user deletes their account, the following actions occur automatically:
- The user's profile information is removed from the platform
- All posts created by the user are deleted
- All comments written by the user are deleted
- All communities owned by the user are deleted
- All subscriptions made by the user are removed

The deletion of user data is permanent and cannot be undone once the account deletion process is completed.

### Post and Comment Deletion

Posts and comments are deleted according to the following rules:

User-Initiated Deletion:
- Users may delete any post they have created
- Users may delete any comment they have written
- Deleted posts and comments are removed from all views and feeds
- Deleting a post removes the post and all associated votes
- Deleting a comment removes the comment and all associated votes, including nested replies

Community and Account Deletion:
- Posts in a deleted community are removed from all views
- Posts in a deleted community are not accessible to any users
- Posts and comments belonging to a deleted account are removed from all views
- Posts and comments belonging to a deleted account are not accessible to any users

Deleted content cannot be recovered or restored after deletion is completed.

### Data Retention Policy

The platform retains user data only while the user's account is active.

Retention Periods:
- User profile data is retained while the account exists
- Posts and comments are retained while the associated account exists
- Communities are retained while they exist and are not deleted
- Subscription data is retained while the user remains subscribed to a community

Post-Account Deletion:
- When an account is deleted, all associated data is permanently removed
- Posts and comments are deleted immediately upon account deletion
- Vote records associated with deleted content are removed
- Community ownership data is cleared when a community is deleted

The platform does not retain deleted user data for backup or recovery purposes.

### Recovery Policy

The platform does not support data recovery after deletion.

Account Deletion:
- Once a user account is deleted, it cannot be restored
- A deleted user must register a new account to use the platform again
- A deleted user cannot recover their previous username

Content Deletion:
- Once a post is deleted by the author, it cannot be restored
- Once a comment is deleted by the author, it cannot be restored
- Once a post is deleted by account deletion, it cannot be restored
- Once a post or comment is deleted by community deletion, it cannot be restored

Vote Records:
- Vote records are deleted when the associated content is deleted
- Vote records cannot be recovered after content deletion

Users should consider data preservation carefully before initiating deletion, as recovery is not possible.

### Permanent Deletion

All deletion actions on the platform are permanent and irreversible.

Irreversible Actions:
- Account deletion permanently removes all user data
- Post deletion permanently removes the post and associated data
- Comment deletion permanently removes the comment and associated data
- Community deletion permanently removes the community and all associated posts and comments

Vote Score Updates:
- When a user deletes their post, the vote scores of all other posts remain unchanged
- When a user deletes their comment, the vote scores of all other comments remain unchanged
- When a user deletes their account, vote scores on their deleted content are removed from the system

Data Removal:
- Deleted content is immediately removed from all feeds and views
- Deleted content is no longer visible to any users, including the original author
- Deleted content cannot be accessed through any platform interface

Users should exercise caution before confirming deletion actions, as there is no mechanism to undo deletion.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Image Storage Capacity

Avatar images and post images must be stored in the system for the lifetime of the user and their posts.

When a user uploads an avatar image, the system must store the image so it can be displayed on the user's profile and associated with all their posts and comments.

When a user creates an image post, the system must store the image so it can be displayed in feeds and when viewing the post.

The system must retain images even if the user's account is deleted, until permanent deletion is performed according to the data retention policy.

Users may upload images of any size, and the system must accept and store these images without arbitrary size restrictions.

The system must provide access to stored images so they can be displayed to users viewing profiles, posts, and feeds.

Deleted images must not be immediately removed from storage to allow for recovery according to the data recovery policy.

No specific maximum file size limit is imposed by the platform; users can upload images of any size for avatars and posts.

### Content Storage Capacity

Text posts, comments, and replies must be stored in the system for the lifetime of the content and its author.

When a user creates a text post, the system must store the post content so it can be displayed in feeds and when viewing the post.

When a user writes a comment or reply, the system must store the comment content so it can be displayed in the comment thread.

The system must retain all text content even if the author's account is deleted, until permanent deletion is performed according to the data retention policy.

Users may create posts and comments of any length, and the system must accept and store this content without arbitrary length restrictions.

The system must provide access to stored text content so it can be displayed to users viewing posts, comments, and feeds.

Deleted posts and comments must not be immediately removed from storage to allow for recovery according to the data recovery policy.

No specific maximum character limit is imposed by the platform; users can write posts and comments of any length.

### Content Delivery Network

The system must use a content delivery network (CDN) to deliver avatar images and post images to users.

The CDN must be used to deliver images efficiently to users regardless of their geographic location.

Images uploaded by users must be available through the CDN so they load quickly when users view profiles, posts, and feeds.

The CDN must be configured to cache images so repeated requests for the same image are served from the cache for improved performance.

When images are deleted or replaced, the CDN must be updated to remove or replace the cached content.

The system must integrate with the CDN for all image delivery, including avatar images and post images.

Guest users and logged-in users must receive images through the same CDN infrastructure.

The CDN must be used for all image content to ensure consistent delivery performance across the platform.

### Storage Capacity Planning

The storage system must be sized to accommodate the expected volume of user-uploaded images and text content.

The system must scale storage capacity as the number of users, posts, comments, and uploaded images grows over time.

Storage capacity planning must account for the retention of content for users who have deleted accounts, according to the data recovery policy.

The system must maintain sufficient storage capacity to ensure posts, comments, and images remain accessible during normal operation.

Storage capacity must be monitored to ensure adequate space is available for new content creation.

The system must support growth in storage requirements as the platform gains more users and content.

Capacity planning must consider both image storage (avatars and post images) and text content storage (posts and comments).

No specific storage capacity number is defined; the system must dynamically accommodate the actual volume of content uploaded by users.