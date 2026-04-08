**redditCommunity — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Users own their account, profile information, posts, and comments.

The user who creates a community becomes its owner.

The platform retains ownership of aggregate data and platform-wide analytics.

When a user deletes their account, all their posts and comments are deleted.

Users cannot claim ownership of content created by other users.

Community owners retain ownership of their community unless they transfer ownership to another user.

### User Data Privacy

User profiles are publicly visible to all users including guests.

Profile information including display name, bio, avatar, and karma score is visible to anyone.

A user's posts and comments are visible to anyone who can access the community where they were created.

Email addresses are private and never displayed publicly.

User passwords are private and never displayed or shared.

Votes are anonymous; the identity of users who voted on content is not displayed.

A user's subscription list is private and only visible to the user.

Report reasons are visible only to moderators of the community where the content was posted.

Reporters remain anonymous; their identity is not displayed to the content author or other users.

### Data Visibility Boundaries

Content in public communities is visible to all users including guests.

Banned users can view content in the community where they are banned but cannot interact.

Deleted posts and comments are no longer visible to any user.

When a user deletes their account, their username no longer appears on their past posts and comments.

Moderators can view all reports filed for their community.

Report details including the reporter identity are visible only to moderators, not to the reported user or the public.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Deletion Behavior

All content deletion on the platform is permanent deletion, not soft-delete.
When a user deletes their account, all posts and comments created by that user are removed from the platform.
When a user deletes their own post, the post and all associated comments are removed from the platform.
When a user deletes their own comment, the comment and all reply comments are removed from the platform.
When a moderator deletes content in their community, the content is removed from the platform.
Permanently deleted content is no longer visible in any feed, profile page, or community view.
Permanently deleted content is no longer included in any counts such as vote scores, comment counts, or karma scores.

### Retention and Recovery Policy

The platform does not retain deleted content for user access after deletion is completed.
The platform does not provide any data recovery service for deleted posts, comments, or accounts.
Once deletion is completed, users cannot recover their deleted content through the platform.
Moderators cannot recover content they have deleted.
Users should consider deletion as a final action with no option to restore deleted content.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Image Storage

The platform stores images uploaded by users for the following purposes:
- Avatar images for user profiles
- Icon images for communities
- Images attached to image posts

Each user can upload one avatar image for their profile.
Each community can have one icon image.
Each image post contains one uploaded image.

When a user deletes their account, all images they uploaded are permanently deleted from storage.

When a community is deleted by its owner, the community icon is removed from storage.

When a post is deleted by its author or a moderator, any image attached to the post is removed from storage.

Storage capacity supports the expected volume of user-generated image content across avatars, community icons, and image posts.