**redditLike — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Content Ownership

### Account and Profile Ownership

Each user owns their account credentials including email address, password, and username.
Users own their profile information including display name, bio text, and avatar image.
The karma score associated with a user is derived from community activity but is considered part of their profile data.

### Content Ownership

Users retain ownership of all posts they create, including the title and any associated content, URLs, or images.
Users retain ownership of all comments they write, including replies to other comments.
Votes cast by users are owned by the voting user and reflect their individual expression.

### Community Ownership

The user who creates a community becomes its owner and retains ownership of the community's defining data including name, description, and icon image.
Community ownership can be conceptually distinguished from community moderation responsibilities.

### Report and Moderation Data Ownership

Reports submitted by users are owned by the reporting user.
Moderation actions including bans are recorded as community management data with attribution to the issuing moderator.

### Ownership Implications on Deletion

When a user deletes their account, all content they own including posts, comments, and votes are removed from public visibility.
When a user deletes a post or comment they own, that content is removed from public visibility.
Community ownership persists independently of the owner's account status.

### Access Control Boundaries

### Public Content Access

All posts and comments are publicly viewable content accessible to both logged-in users and logged-out visitors.
Community information including name, description, icon, and subscriber count is publicly visible.
User profiles including display name, bio, avatar, karma score, post history, and comment history are publicly visible to all users.

### Authentication-Required Access

Subscription lists are private to the subscribing user and not visible to other users.
The home feed containing posts from subscribed communities is only accessible to the authenticated subscriber.
Voting capabilities require authentication and are tied to the individual user's identity.

### Community-Specific Access Restrictions

Banned users retain read access to community content but lose the ability to create posts or write comments in that community.
Moderators have elevated access to view reports submitted for content within their communities.
Moderators can view the list of banned users within their community.

### Content Creation Requirements

Post creation requires subscription to the target community.
Comment and reply creation requires authentication.
Community creation requires authentication but no additional authorization.

### Private Operational Data

Vote records indicating which user cast which vote are private and not exposed to other users.
Report details including reporter identity and reasons are visible only to community moderators, not to general users.
Moderator permissions and role assignments within a community are visible to other moderators and the community owner.

### Data Isolation Between Users

### User Content Isolation

A user cannot modify or delete content owned by another user.
Posts and comments remain under the exclusive editorial control of their authoring user unless moderated by community staff.
User profile information can only be modified by the profile owner.

### Vote Privacy and Isolation

Individual voting records are isolated and not disclosed to other users.
Users cannot view how other specific users have voted on content.
Aggregate vote scores are public while per-user vote participation remains private.

### Subscription Privacy

Community subscriptions are private to each user.
Users cannot view which communities other users are subscribed to.
Subscription status affects feed personalization but is not shared data.

### Moderation Action Isolation

Moderators can only perform actions within communities where they hold moderator status.
Moderator actions in one community do not grant privileges in other communities.
Owners can only remove moderators from communities they own.

### Report Confidentiality

Reports submitted by users are confidential between the reporter and community moderators.
The reported user is not notified of who submitted a report against their content.
Report resolution decisions are internal to the moderation team.

### Privacy of User Activity

### Public Activity Visibility

Post creation activity including titles, content, and timestamps are publicly associated with the authoring user on their profile.
Comment history including content, timestamps, and parent posts are publicly visible on user profiles.
Karma score changes resulting from voting activity are reflected in the public karma total but individual vote events are not disclosed.

### Private Activity Boundaries

Voting patterns and history are not disclosed to other users or publicly displayed.
Subscription choices remain private and are not revealed on user profiles or to other community members.
Report submissions are confidential and not attributed publicly.

### Content Edit History

The fact that a post or comment has been edited may be visible, but previous versions of the content are not retained for public viewing.
Edit timestamps indicate when modifications occurred without exposing what specific changes were made.

### Account Deletion Privacy Implications

When an account is deleted, the user's username may continue to be displayed on historical posts and comments for attribution purposes, or content may be anonymized depending on implementation policy.
All personal profile data including email, bio, and avatar are removed from the deleted account.
Subscriptions, votes, and private activity records associated with the deleted account are removed.

### Moderation Transparency

When moderators delete content, the deletion action is attributed to moderation staff.
Banned users are informed of their ban status when attempting to create content but the specific moderator who issued the ban may not be disclosed.
Moderator additions and removals are tracked within the community's moderation structure.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft Delete for Comments

When a user deletes their own comment, the system retains the comment in a deleted state rather than removing it entirely. The deleted comment continues to display in its original position within the reply thread, preserving the context of nested replies. The comment's content is no longer visible to other users, but the comment placeholder remains to maintain the conversation structure. Only the author of a comment can delete it, or a moderator can delete it for their community.

### Hard Delete for Posts and Accounts

When a user deletes their own post, the post and all associated data are permanently removed from the system. When a user deletes their account, all posts they created, all comments they wrote, and all their votes are permanently deleted. Account deletion cannot be undone, and all content associated with the deleted account is irretrievably removed. The user's profile information, including display name, bio, and avatar, is also permanently deleted upon account deletion.

### Retention of Deleted Content

Deleted comments are retained in their soft-deleted state indefinitely to preserve conversation context. Deleted posts are immediately and permanently removed with no retention period. When an account is deleted, all associated content is permanently removed with no retention period. Reports that have been dismissed by moderators are removed from the report list and permanently deleted.

### Data Recovery

The system does not provide recovery capabilities for deleted content. Users cannot recover deleted posts, comments, or accounts once deletion is confirmed. There is no grace period or undo functionality for deletion operations. Users are advised that deletion is permanent and irreversible.

### Permanent Deletion Triggers

Permanent deletion occurs in the following scenarios: when a user explicitly deletes their account, when a user deletes one of their posts, when a moderator approves a report (which deletes the reported content), and when a report is dismissed by a moderator. Soft-deleted comments remain in the deleted state until manually deleted by the system administrator or until the parent post or account is deleted.

# Storage Capacity

Storage capacity planning and CDN requirements.

## Storage Capacity Requirements

Define storage requirements and capacity planning for file storage.

### Storage Quota Allocation

Each user account is assigned a base storage quota upon registration. The system tracks storage consumption across all user-owned content including files, attachments, and generated data.

Storage quotas are allocated according to the user's subscription tier. Higher tiers receive proportionally larger allocations.

The system maintains real-time tracking of current storage utilization against the allocated quota. Users may view their current usage and remaining capacity through their account dashboard.

### Capacity Thresholds and Alerts

The system monitors storage utilization and issues notifications when users approach their allocated limit.

WHEN the user's storage utilization reaches eighty percent of their allocated quota, THE system SHALL notify the user.

WHEN the user's storage utilization reaches ninety-five percent of their allocated quota, THE system SHALL issue an urgent notification warning of imminent capacity exhaustion.

The notification includes information about current usage percentage and options to manage storage or upgrade quota.

### Storage Exhaustion Behavior

WHEN a user attempts an operation that would exceed their allocated storage quota, THE system SHALL reject the operation.

The system presents the user with options to:
- Remove existing content to free capacity
- Upgrade to a higher storage tier
- Abort the operation

WHILE the user remains over capacity, THE system SHALL permit deletion and archival operations that reduce storage consumption.

### Storage Upgrade and Downgrade

Users may upgrade their storage tier at any time to receive additional allocated capacity. The upgraded quota takes effect immediately upon payment confirmation.

WHEN a user downgrades their storage tier, THE system SHALL validate that current storage utilization does not exceed the new tier's allocation.

IF current utilization exceeds the new tier's allocation, THE downgrade request SHALL be rejected until the user reduces their storage consumption to within the new tier's limits.

### Content Exclusion from Quota

Certain content types do not count against user storage quotas. The system distinguishes between user-generated content (which consumes quota) and system-generated metadata, indexes, and temporary files (which are excluded from quota calculations).

Deleted content in recovery periods remains excluded from quota calculations. Once the recovery period expires and content is permanently purged, no storage is consumed.