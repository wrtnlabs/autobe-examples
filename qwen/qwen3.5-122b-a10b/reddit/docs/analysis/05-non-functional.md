**redditLike — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Content Ownership

Each user owns the content they create on the platform. This includes their profile information (display name, bio, avatar), posts, comments, and votes.

Users have full control over their own content:
- Users can edit their profile information at any time
- Users can edit or delete their own posts
- Users can edit or delete their own comments
- Users can change or remove their votes on posts and comments

When a user deletes their account, all content they created is also deleted. This includes all posts, comments, and votes associated with that user.

Community owners have additional ownership rights over their community, including the ability to manage moderators and moderate content within that community.

### Profile Privacy

User profile information has different levels of visibility:

Public profile data (visible to all users and guests):
- Display name
- Bio text
- Avatar image
- Total karma score
- List of posts created
- List of comments written

Private account data (visible only to the account owner):
- Email address
- Password

Users can view any other user's public profile by accessing it through the platform. Profile pages are accessible to both logged-in users and guests.

When viewing another user's profile, only public information is displayed. Private account credentials are never exposed to other users.

### Data Isolation and Access Boundaries

Data isolation ensures that users can only modify their own content and cannot affect other users' data:

- A user can only edit or delete their own posts, not posts created by others
- A user can only edit or delete their own comments, not comments created by others
- A user can only change their own votes, not votes cast by other users
- A user can only modify their own profile information

Exception for moderators:
- Moderators can delete any post in their community, regardless of who created it
- Moderators can delete any comment in their community, regardless of who created it

Exception for community owners:
- Community owners can remove moderators they added
- Community owners cannot be removed by moderators

Banned users retain viewing access:
- Users banned from a community can still view posts and comments in that community
- Banned users cannot create new posts or comments in the banned community

### Access Control Policies

Access control determines who can view and interact with different types of content:

Public content (accessible to everyone, including guests):
- Community list and community details
- Community feeds (all posts in a community)
- Popular feed (posts from all communities)
- Individual posts and their content
- Individual comments and their content
- User profiles (public information only)

Logged-in user content (requires authentication):
- Home feed (posts from subscribed communities only)
- Ability to create posts in communities
- Ability to comment on posts
- Ability to vote on posts and comments
- Ability to subscribe or unsubscribe to communities

Moderator access (community-specific):
- View all reports for their community
- Approve or dismiss reports
- Delete any post or comment in their community
- Ban or unban users from their community
- View list of banned users
- Add or remove moderators (owner only for removal)

Vote restrictions:
- Each user can cast only one vote per post or comment
- Users can change their vote or remove it entirely
- Vote scores are visible to all users

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Permanent Deletion

When a user deletes their account, all posts and comments created by that user are permanently deleted from the platform.

When a user deletes their own post, the post is permanently removed from the community feed and all views of that post.

When a user deletes their own comment, the comment is permanently removed from the post's comment thread.

When a moderator deletes a post in their community, the post is permanently removed from the community.

When a moderator deletes a comment in their community, the comment is permanently removed from the post's comment thread.

### Data Retention

Deleted content is permanently removed from the platform and is not retained for any period.

User profile information (display name, bio, avatar) is retained only while the account exists. When an account is deleted, all profile information is permanently removed.

Vote history is retained only while the associated content (post or comment) exists. When content is deleted, the associated vote history is also removed.

Report records are retained while they are pending or under review. When a report is approved or dismissed, the record is removed from the active report list.

### Recovery Policy

Deleted content cannot be recovered once deletion is confirmed.

Users cannot restore their own deleted posts or comments.

Users cannot restore their own deleted accounts or the content associated with those accounts.

Moderators cannot restore posts or comments they have deleted from their communities.

There is no soft-delete mechanism; all deletion operations are immediate and permanent.

### Soft-Delete Mechanism

The platform does not implement a soft-delete mechanism for any content type.

All deletion operations (account deletion, post deletion, comment deletion) result in immediate and permanent removal of the content.

There is no grace period or holding area for deleted content before permanent removal.

There is no 'trash' or 'recycle bin' functionality for recovering deleted content.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Image Storage

The platform stores images uploaded by users, including profile avatars, community icons, and post images.

Each user's profile avatar is stored and displayed on their profile page and next to their posts and comments.

Each community's icon is stored and displayed in community listings and on the community page.

Image posts contain uploaded images that are stored and displayed when viewing the post.

Users can replace their avatar by uploading a new image. The new image replaces the previous avatar.

Community owners can replace their community's icon by uploading a new image. The new image replaces the previous icon.

### Data Ownership and Privacy

Users own the content they create on the platform, including posts, comments, profile information, and uploaded images.

While a user's account is active, all their content is retained on the platform.

Users grant the platform a license to display, store, and distribute their content as part of providing the service.

When a user deletes their account, the platform's license to display their content is revoked, and all their content is permanently deleted.

Users can view their own content (posts, comments, profile information) at any time while their account is active.

Users can only view other users' content that is publicly accessible through feeds, profiles, and community pages.

Users cannot access private content or content from communities they are not subscribed to (for community-restricted content).

### Data Deletion and Retention

When a user deletes their account, all their content is permanently deleted. This includes posts, comments, profile information, and uploaded images.

When a user deletes a post or comment, the content is permanently removed from the platform.

When a moderator deletes a post or comment (for policy violations or approved reports), the content is permanently removed.

Content from deleted accounts or deleted posts/comments is not recoverable after permanent deletion.

The platform does not maintain backups of user content that can be restored after deletion.