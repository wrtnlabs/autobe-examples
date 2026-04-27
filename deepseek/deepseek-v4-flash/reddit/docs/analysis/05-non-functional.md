**communityPlatform — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Every user owns all content they create on the platform, including posts, comments, and profile information. Users retain full ownership of their content and may delete it at any time. When a user deletes their account, all their posts and comments are permanently removed from the platform. Content owned by a deleted user is not transferred or reassigned to any other user. Each user's karma score is personally owned and tied exclusively to that user account — it is not shared, transferable, or mergeable with any other account.

### Data Isolation

User data is strictly isolated per account. One user cannot access, modify, or delete another user's personal data (email address, password hash, profile settings) that is not intended for public display. Each user's content (posts, comments, profile data) exists independently and is not shared or aggregated with other users' data except as necessary for platform display purposes — for example, showing a post author's username alongside the post content. When a user views another user's profile page, they see only the publicly visible information defined in the Privacy Boundaries section. Karma is independently tracked per user and is affected only by votes cast by other users; no user can directly modify another user's karma.

### Data Visibility by Actor and Content Type

Data visibility is governed by the actor type and the content type, as follows:

**Guests (logged-out users):**
- Can see all public profile information (display name, bio, avatar, karma, posts list, comments list) of any user
- Can see all posts in any community, including title, author, content, vote score, comment count
- Can see all comments on any post, including author, content, vote score, nested replies
- Can browse all communities and view each community's name, description, icon, and subscriber count

**Members (logged-in users):**
- Have the same visibility as guests for all public content
- Additionally can see their own private information: email address, password (for change purposes), and subscription list
- A member's own voting history on posts and comments is visible only to that member and is not exposed to other users

**Communities:**
- All community content (posts, comments) is publicly visible to all users, including guests. There are no private or invitation-only communities. Banned users retain read-only visibility to community content but cannot create posts or comments.

### Privacy Boundaries

User profiles are publicly viewable by all users, including guests. The following information is visible on a user's public profile:
- Display name (as set by the user)
- Bio text (as set by the user)
- Avatar image (as set by the user)
- Total karma score
- List of posts the user has created
- List of comments the user has written

The following information is never publicly visible and is accessible only to the owning user:
- Email address
- Password (changes permitted through authenticated flow)
- List of communities the user is subscribed to
- Voting history (which posts/comments the user voted on and how)

Users control their own public profile information. Each user may set or change their display name, bio, and avatar at any time by editing their profile. A user may leave their bio empty or not set an avatar if they prefer — these fields are optional.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft-Delete Behavior

When a user deletes a post or comment, the system marks the content as deleted without immediately removing it from the database. The content is hidden from all public views including feeds, post pages, and profile pages.

Deleted content remains visible only to the original author and to community moderators, who retain the ability to view and manage it for moderation purposes.

When a user deletes their account, all their posts and comments are also deleted using the same soft-delete mechanism — the content is immediately hidden from public view.

### Retention Period for Deleted Content

Soft-deleted content is retained in the system for a defined retention period. During this period, the content is not visible to general users but can still be accessed by the original author through their profile.

The retention period begins when the content is deleted. Once the retention period expires, the content is permanently deleted and cannot be recovered.

Account deletion follows the same retention policy: after a deletion request, all associated user data is retained for the retention period before being permanently deleted.

### Permanent Deletion

After the retention period expires, all soft-deleted data is permanently and irreversibly removed from the system.

When a user's account is deleted and the retention period expires, the user's data — including their posts, comments, and all associated information — is permanently removed from the system.

Permanent deletion cannot be reversed.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Image Storage

The system stores three types of user-uploaded images:

- **Avatar images**: uploaded by users for their profile (defined in [02-domain-model.md](./02-domain-model.md))
- **Community icon images**: uploaded by community creators for their community (defined in [02-domain-model.md](./02-domain-model.md))
- **Image post uploads**: images uploaded as part of creating an image-type post (defined in [02-domain-model.md](./02-domain-model.md))

All images are stored as persistent files. The storage system associates each image with its owner entity (user, community, or post) and retrieves it when the corresponding page or feed is displayed.

### Content Delivery for Images

Uploaded images — including avatars, community icons, and image post uploads — are served to users through a content delivery network (CDN). The CDN caches images at edge locations to reduce load on the origin storage and improve page load times for all feed views (Home Feed, Popular Feed, Community Feed) and profile pages.

When a user uploads or updates an image, the CDN cache for that image is invalidated so the updated version is served on subsequent requests.

### Capacity Planning

Storage capacity is planned around the three image types the system supports. Capacity growth depends on the number of users (each with an avatar), the number of communities (each with an icon), and the number of image posts created over time.

Total storage required = (number of users × average avatar size) + (number of communities × average icon size) + (number of image posts × average image post size).

CDN capacity is planned based on expected traffic patterns: each feed view and profile page loads associated images, and each image request consumes CDN bandwidth. The system monitors storage utilization and CDN bandwidth usage to inform when additional capacity is needed.