**communityPlatform — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Content Ownership

Each user owns all content they create on the platform, including their posts, comments, and votes.

A user's profile information (display name, bio, and avatar) belongs to that user. Users can modify their own profile information at any time.

When a user deletes their account, all posts and comments created by that user are permanently removed from the platform. This ensures complete data ownership and allows users to fully remove their contributed content.

Votes are owned by the user who cast them. Each user has exactly one vote per post or comment, and can modify or remove that vote at any time. The vote attribution is maintained for karma calculation purposes.

### Data Isolation Between Users

Each user's account credentials are isolated from other users. Email addresses and passwords are not visible to other users.

A user can only edit or delete their own posts and comments. Users cannot modify content created by others, except in cases where community moderators have authority to remove content.

Vote history (which posts or comments a user has voted on) is not displayed to other users. While votes affect the visible vote score, the specific voting actions of each user remain private.

Subscription lists (which communities a user has subscribed to) are not displayed on the user's public profile.

### Access Boundaries

Profile information (display name, bio, avatar, karma score, posts, and comments) is publicly viewable by any user, including logged-out guests.

Community content (posts and comments) is visible to all users, including logged-out guests. Even users who are banned from a community can still view that community's content, though they cannot create new posts or comments there.

Post creation requires community subscription. Only users who have subscribed to a community can create posts in that community.

Report information (including who submitted the report and the reason provided) is visible only to moderators of the community where the content was reported.

### Privacy Expectations

The following information is public and visible to all users:
- User profile: display name, bio, avatar, karma score
- User's post history: all posts created by the user
- User's comment history: all comments written by the user
- All posts and comments in all communities
- Community subscriber counts
- Vote scores on posts and comments (but not who voted)

The following information is private or restricted:
- Account credentials (email and password) are never shown to other users
- Which specific posts or comments a user has voted on
- A user's subscription list
- Reporter identity is shown only to community moderators

The following information is visible to community moderators:
- Reports submitted in their community, including the reporter's identity and the reason provided
- List of banned users in their community

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Permanent Deletion Behavior

When a user deletes their account, all their posts and comments are immediately and permanently deleted from the system. This deletion is irreversible and cascades to all user-created content.

When a user deletes their own post or comment, the content is immediately and permanently removed. When a moderator deletes a post or comment in their community, the content is immediately and permanently removed.

The system does not support soft-delete, data recovery, or restoration of deleted content. Once content is deleted, it cannot be retrieved by users or administrators.

Deletion privileges:
- Users can delete their own posts and comments
- Community owners can delete any post or comment in their community
- Moderators can delete any post or comment in their community
- Account deletion removes all user content automatically

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### File Storage

The platform stores user-uploaded files for the following purposes:

- User avatar images for profile display
- Community icon images for community branding
- Image post content uploaded by users

Each file is associated with its owning entity (user, community, or post) and must remain accessible for as long as the owning entity exists.

When a user deletes their account, all avatar images associated with that user are removed. When a community is deleted, its icon image is removed. When a post is deleted, any associated image content is removed.

### Content Delivery

All uploaded images must be delivered to users when viewing:

- User profiles (avatar images)
- Community pages and lists (community icons)
- Image posts in feeds and individual post views (post images)
- Thumbnails in post listings (image post thumbnails)

Images are displayed in appropriate sizes for their context: full size for individual views and reduced size for listings and thumbnails.