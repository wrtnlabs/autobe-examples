**redditLikeCommunity — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Isolation Between Users

User data is segregated so that individual users cannot access the private data of other users. Each user's authentication credentials, including email and password, are confidential and inaccessible to all other users. Voting records are individually isolated; while users can see aggregated vote scores on posts and comments, individual voting histories are never exposed to other users. Report submissions are restricted from general visibility, with reporter identity and reason text only accessible to designated moderators of the relevant community.

Cross-user data access boundaries ensure that users can only interact with their own credentials, voting records, and report submissions. Community membership data is private; other users cannot view who is subscribed to a specific community beyond seeing the aggregate subscriber count. Moderation assignments and ban records within communities are inaccessible to non-moderator users.

### Content Ownership Policies

Users create and own all content they generate, including posts and comments. Content ownership is automatically assigned to the user who creates each item and cannot be reassigned to another user. The content creator retains authority to edit and delete their own posts and comments at any time. Comments written in reply to other comments are independently owned by the replying user.

Community ownership is assigned to the user who creates the community. The community owner holds exclusive authority over moderator assignments and community settings. Community ownership is permanent and non-transferable; if the owner deletes their account, the platform handles the community according to deletion policies.

Account deletion removes all content owned by that user. When a user deletes their account, all posts they created are deleted along with all comments they wrote. This cascading deletion affects karma scores of comment authors and vote calculations affected by the removed content.

### Access Control for Content Consumption

Access to platform content is governed by authentication status and community membership requirements. Guests without an account can view public feeds, community directories, individual community feeds, and any single post thread including all comments. Guests cannot view the home feed, create content, or perform any write operations.

Logged-in members can access all public content plus the personalized home feed showing posts from subscribed communities. Creating posts in a community requires an active subscription to that community. Commenting on posts does not require community subscription.

Banned users retain read access to all platform content, including communities where they are banned, but cannot create posts or comments in communities where banned status is active. Report visibility is restricted solely to active moderators of the relevant community; general users and non-moderating members cannot view report submissions.

### User Privacy Boundaries

User profiles are publicly visible by default and cannot be restricted. Any visitor, including guests, can view display name, bio text, avatar image, total karma score, and complete lists of all posts and comments created by the user. The platform provides no mechanism for users to hide their profile, anonymize their content attribution, or restrict visibility of their content history.

User authentication credentials, including email address and password, are never exposed in any public or semi-public context. Email is used solely for account management and login; it does not appear on profiles or content attribution.

Voting actions are confidential while aggregated scores remain public. All users see the net vote score on posts and comments, but no user can view individual voting behavior, including who upvoted or downvoted specific content.

Report confidentiality protects the reporter identity and reason from general visibility, limiting disclosure to authorized moderators of the affected community. This protects reporters from retaliation while enabling moderation action.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft-Delete Behavior

WHEN a user account is deleted, THEN THE system SHALL mark the account and all posts and comments created by that user as deleted.
WHEN a user deletes their own post or comment, THEN THE system SHALL mark the content as deleted.
WHEN a moderator deletes a post or comment in their community, THEN THE system SHALL mark the content as deleted.
WHEN content or an account is marked as deleted, THEN THE system SHALL immediately hide it from all public views.
WHILE content or an account is in a deleted state, THE system SHALL retain it in a recoverable state.

### Data Retention

THE system SHALL retain deleted accounts, posts, and comments for a defined retention period.
DURING the retention period, THE system SHALL store deleted data in a recoverable state.
THE retention period applies uniformly to deleted user accounts, posts, and comments.
AFTER the retention period expires, THE system SHALL initiate permanent deletion of the data.

### Recovery and Permanent Deletion

DURING the retention period, THE system SHALL allow recovery of deleted accounts, posts, and comments.
WHEN the retention period expires for deleted data, THEN THE system SHALL permanently delete it.
WHEN data is permanently deleted, THEN THE system SHALL remove it completely, making it unrecoverable.
Permanent deletion applies to user accounts and their associated posts and comments.
Permanent deletion applies to moderator-deleted posts and comments after the retention period expires.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Storage Capacity and Delivery

Users upload three types of images: avatar images for their profiles, icon images for communities they create, and images for image-type posts. The system stores and serves these uploaded images, making them accessible wherever they are used.

When image-type posts appear in feeds and post lists, a thumbnail version of the uploaded image is displayed instead of the full-size image.

The user did not specify requirements for content delivery networks (CDN), storage capacity limits, file size restrictions, per-user storage quotas, or capacity planning thresholds. No explicit storage constraints were defined in the original requirements — the system shall accommodate image storage as users upload content over time.