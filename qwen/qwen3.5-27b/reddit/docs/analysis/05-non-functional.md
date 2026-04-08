**redditClone — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Users own all content they create, including posts, comments, votes, and reports. When a user deletes their account, all content they created is permanently deleted from the system. The user who creates a community becomes its owner and retains ownership of the community itself. Community ownership includes the community name, description, icon, and all content created within it. When content is deleted by its owner, it is permanently removed from the system. Moderators can delete content in their community, but this does not transfer ownership—it permanently removes the content from the system.

### Data Isolation

Each user's account data is isolated from other users. Users can only view their own subscription list, vote history, and report history. Users can only edit their own posts, comments, and profile information. Users cannot access another user's private account data such as email or password. Each community's data is logically separated—moderator actions in one community do not affect other communities. Banned users are isolated from posting or commenting in the community that banned them, but their access to other communities remains unaffected. Vote data is isolated per user per content item—one user can only have one vote on any given post or comment.

### Access Control

Guest users can view the popular feed, community feeds, individual posts, comments, user profiles, and the community list. Guest users cannot create posts, comments, or votes. Guest users cannot subscribe to communities. Member users can access the home feed in addition to all guest-accessible content. Member users can create posts only in communities they have subscribed to. Member users can create comments on any post. Member users can vote on posts and comments. Member users can subscribe and unsubscribe from communities. Moderator users can perform all member actions plus moderation actions in their assigned communities. Moderators can delete posts and comments in their community. Moderators can ban and unban users from their community. Moderators can view and handle reports for their community. Banned users can view content in the community that banned them but cannot create posts, comments, or votes in that community.

### Privacy Boundaries

User profiles are publicly viewable by all users including guests. Profile information includes display name, bio, avatar, karma score, posts created, and comments written. User email addresses and passwords are never visible to other users or moderators. User usernames are publicly visible on all their posts, comments, and profiles. Post content is publicly viewable in community feeds and the popular feed. Comment content is publicly viewable on posts. Vote scores are publicly visible on posts and comments. Individual vote data (who voted up or down on specific content) is not visible to other users. Subscription lists are private—users cannot view which communities other users have subscribed to. Report details are visible only to moderators of the relevant community. Reports show the reported content, who reported it, and the reason provided.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Immediate Deletion Behavior

When a user deletes their account, all associated posts and comments are immediately and permanently removed from the system.

When a user deletes their own post, the post is immediately and permanently removed from the system.

When a user deletes their own comment, the comment is immediately and permanently removed from the system.

When a moderator deletes a post in their community, the post is immediately and permanently removed from the system.

When a moderator deletes a comment in their community, the comment is immediately and permanently removed from the system.

Content that is deleted is not retained in any deleted state and is not recoverable.

### Data Retention Policy

Deleted content (posts and comments) is not retained in the system after deletion.

Deleted user accounts and all associated data are not retained in the system after account deletion.

There is no retention period for deleted content or deleted accounts.

All deletions are immediate and permanent.

### Recovery Options

Users cannot recover their own deleted posts once deletion is confirmed.

Users cannot recover their own deleted comments once deletion is confirmed.

Users cannot recover their deleted account once account deletion is confirmed.

Moderators cannot recover deleted posts in their community once deletion is confirmed.

Moderators cannot recover deleted comments in their community once deletion is confirmed.

All deletions are permanent and irreversible.

### Permanent Deletion

Deleted content is permanently removed from the system immediately upon deletion.

Permanently deleted posts cannot be recovered by any user or moderator.

Permanently deleted comments cannot be recovered by any user or moderator.

Permanently deleted user accounts cannot be recovered.

When a user account is deleted, all associated posts, comments, votes, subscriptions, and reports are immediately removed.

Content that has been deleted is no longer accessible through any system function.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Image Storage

The system stores user-uploaded images for user profile avatars, community icons, and image posts. All images are stored and served to users when viewing profiles, community pages, or posts. The system does not impose restrictions on image file sizes or storage quotas. Images remain accessible as long as the associated user account, community, or post exists. When a user deletes their account, all their uploaded images (avatars and image posts) are permanently deleted and cannot be recovered. When a community is deleted, its icon image is permanently deleted and cannot be recovered. When a user deletes a post, any associated image is permanently deleted and cannot be recovered.

### Content Delivery

The system serves images to users through the platform's infrastructure. Images are delivered to users when they view profiles, browse communities, or read posts. The system ensures images are accessible to all users who have permission to view the associated content. Image delivery performance is not constrained by specific latency or throughput requirements.