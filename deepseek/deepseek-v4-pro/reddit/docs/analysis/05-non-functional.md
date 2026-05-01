**communityHub — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership

Each user owns their own account data, including their email address, password, display name, bio, and avatar image. The user has full control over editing and deleting their own account information.

Each user owns the posts they create. Only the post author may edit or delete their own post, except where community moderators exercise their moderation authority (described in Moderator Access below).

Each user owns the comments they write. Only the comment author may edit or delete their own comment, except where community moderators exercise their moderation authority.

Each user owns their votes. A user may cast, change, or remove their vote on any post or comment at any time. No other user can modify another user's vote.

The user who creates a community is its owner. The community owner holds the highest authority within that community and may transfer ownership, add moderators, and remove moderators. Community ownership grants full moderation powers that extend to all content within that community.

A user's karma score is derived from votes cast by other users on that user's posts and comments. The karma score is not directly editable by any user, including the user to whom it belongs. It is automatically recalculated as votes are cast, changed, or removed.

### Data Access Control

**Publicly Accessible Data**

The following data is visible to all users of the platform, including guests who are not logged in:
- Any user's profile: display name, bio, avatar image, total karma score, list of posts, and list of comments
- Any post: title, full content, author, community, vote score, comment count, and posting time
- Any comment: author, content, vote score, posting time, and nested replies
- Any community: name, description, icon image, and subscriber count
- The Popular Feed and any Community Feed, including all posts within them

**Member-Only Data**

The Home Feed, which shows posts from communities the user is subscribed to, is accessible only to logged-in users.

**Private Data**

A user's email address and password are never visible to other users. These credentials are accessible only to the account owner for authentication and account management purposes.

Report details — including the reported content, the reporting user, and the reason provided — are visible only to moderators of the community to which the report belongs. Regular users cannot view reports filed by other users or against other content.

### Data Isolation Between Users

Each user's account is an independent entity. One user cannot modify another user's display name, bio, avatar, email, or password.

A user cannot edit or delete another user's posts or comments unless they hold a moderator role in the community where the content resides.

A user's voting activity is isolated: a user may vote on any post or comment, but they cannot cast a vote on behalf of another user, nor can they see a complete list of how other individual users voted. Only the aggregated vote score is visible.

Subscription data is isolated per user. One user cannot subscribe or unsubscribe on behalf of another user, and a user's subscription list is managed solely by that user.

When a user deletes their account, all posts and comments they authored are also deleted (as specified in the Account Lifecycle requirements). This cascading deletion is scoped to the deleting user's content only and does not affect content created by other users.

### Privacy Boundaries

**Personal Information**

A user's email address and password are treated as private information. They are never displayed on any profile page, post, comment, or any other publicly accessible view. They are used solely for authentication and account recovery.

**Profile Visibility**

A user's display name, bio, and avatar are intentionally public. Any user — including guests — may view this information on the user's profile page. There is no mechanism to hide or restrict access to a profile.

**Content Visibility**

All posts and comments are public by default. Any user, including guests, may view the content of any post or comment. There is no private posting or direct messaging functionality.

**Reporting Privacy**

When a user submits a report, the reporting user's identity and the reason they provided are visible to moderators of the relevant community. This information is not visible to the general user base or to the user whose content was reported.

**Voting Privacy**

Individual vote records are not publicly exposed. While the aggregate vote score of a post or comment is visible to all users, the identity of who voted and how they voted is not disclosed. This ensures users can express their opinion through voting without their individual voting history being publicly scrutinized.

**Banned User Access**

A banned user retains the ability to view all content in the community from which they are banned. The ban restricts only the ability to create new posts and comments within that community. The banned user's profile, past posts, and past comments remain visible to all users.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Delete Policy

When content is deleted by a user or moderator, it is soft-deleted rather than immediately removed. Soft-deleted content is hidden from all public views and feeds but remains stored in the system.

Soft deletion applies to the following scenarios:

- A user deletes their own post
- A user deletes their own comment
- A moderator deletes a post in their community
- A moderator deletes a comment in their community
- A moderator approves a report, resulting in content deletion
- A user deletes their entire account, which triggers soft deletion of all their posts and comments

During the soft-delete period, the content is inaccessible to all users including the original author. The content is not visible in feeds, search results, profile pages, or any other public listing. Only the system retains it for potential recovery or audit purposes.

Soft-deleted content still counts toward the community's historical data but does not appear in subscriber counts, post counts, or comment counts shown to users.

### Data Retention Periods

Soft-deleted data is retained for a defined retention period before being permanently removed. Different types of data may have different retention periods based on their nature:

**User-Initiated Deletions**

When a user deletes their own post or comment, the soft-deleted content is retained for a limited period. This allows the user time to change their mind and request recovery before the deletion becomes irreversible.

**Moderator-Initiated Deletions**

When a moderator deletes a post or comment, the soft-deleted content is retained for a period sufficient to allow review of the moderation action. This ensures there is a window for the content owner to appeal or for other moderators to review the decision.

**Account Deletion**

When a user deletes their account, all associated posts and comments enter soft-delete status and are retained for the same retention period as user-initiated content deletions. After the retention period, all user data is permanently removed.

**Report-Based Deletions**

Content deleted as a result of an approved report follows the same retention period as moderator-initiated deletions.

All retention periods begin at the moment the deletion action is taken.

### Data Recovery

Users may request recovery of their own soft-deleted content within the retention period. Recovery restores the content to its previous state, making it visible again in all feeds, profile pages, and listings.

The following recovery rules apply:

- A user can recover their own soft-deleted posts and comments, provided the retention period has not expired
- When a post is recovered, its vote score is preserved as it was at the time of deletion
- When a comment is recovered, its vote score is preserved as it was at the time of deletion
- Recovered content reappears in its original position in feeds and comment threads
- Content deleted by a moderator cannot be recovered by the original author without moderator or system administrator intervention
- Content deleted as a result of an approved report cannot be recovered by the original author
- Account deletion is irreversible: once a user confirms account deletion, the account itself cannot be recovered even if individual content is still within its retention period

Recovery is only possible while the data remains in soft-delete status. Once the retention period expires and permanent deletion occurs, recovery is no longer possible.

### Permanent Deletion

Once the retention period for soft-deleted data expires, the data is permanently deleted from the system. Permanent deletion is irreversible.

Permanent deletion includes:

- Removal of the content itself (post body, comment text, links, images)
- Removal of all associated metadata (vote records, timestamps, references)
- Removal from all system indexes and backups

**Cascading Effects of Permanent Deletion**

When a post is permanently deleted:

- All comments on that post are also permanently deleted, regardless of their individual retention status
- All votes associated with the post and its comments are permanently removed
- Karma adjustments tied to those votes are reversed: affected users' karma scores are recalculated to remove the impact of votes on permanently deleted content

When a comment is permanently deleted:

- All nested replies to that comment are also permanently deleted
- All votes on the comment and its replies are permanently removed, and related karma adjustments are reversed

When an account is permanently deleted:

- All remaining soft-deleted posts and comments belonging to that user are permanently deleted with the cascading effects described above
- The user's profile, display name, bio, and avatar are permanently removed
- The user's subscription records are permanently removed
- The user's vote history is permanently removed, and karma scores of affected users are recalculated

**Moderator Record Retention**

Records of moderator actions (deletions, bans, report resolutions) are retained even after the related content is permanently deleted. This preserves accountability and allows communities to maintain moderation history.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Stored File Types

The platform stores image files uploaded by users in the following contexts:

- **User avatar images**: Each user may upload one avatar image for their profile.
- **Community icon images**: Each community may have one icon image.
- **Image post uploads**: Users creating an image post upload one image file.
- **Post image thumbnails**: For image posts, a smaller thumbnail version is generated for display in post lists and feeds.

All stored files are associated with the user who uploaded them. When a user deletes their account, all their uploaded images are removed as part of the cascading deletion of their posts and profile data. When a community is deleted, its icon image is also removed.

There are no user-facing storage quotas or limits beyond what is implied by the platform's supported content types.

### Static Asset Delivery

Uploaded images — including avatars, community icons, image posts, and their thumbnails — must be served to users viewing profiles, community pages, post detail pages, and post feeds. Thumbnails are displayed in post lists across home, popular, and community feeds, meaning image content may be accessed frequently and by many concurrent users.

The delivery of these static image assets should be optimized to ensure reasonable load times for all users. Content delivery considerations apply to both full-size images shown on detail pages and thumbnail images shown in feed listings.

### Storage Growth and Capacity

The platform's storage needs grow as users and communities create content. The primary drivers of storage consumption are:

- **Image posts**: Each image post stores one full-size image and one thumbnail. As users create more image posts, storage usage increases proportionally.
- **User avatars**: Each user may store one avatar, so storage grows with the total number of registered users.
- **Community icons**: Each community may store one icon, so storage grows with the total number of communities.

Storage is also affected by retention policies. When accounts, posts, or communities are deleted, the associated images are removed from storage. When content is soft-deleted for recovery purposes (see Data Retention and Recovery), the associated image files remain stored until permanent deletion occurs.