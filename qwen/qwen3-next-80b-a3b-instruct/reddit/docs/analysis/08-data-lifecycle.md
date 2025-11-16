# Content Lifecycle Management for CommunityPlatform

This document defines the complete lifecycle of user-generated content within the CommunityPlatform system, from initial creation through potential archival or purging. All requirements are expressed in natural language using EARS format to ensure absolute clarity for backend developers. This document must be implemented in full alignment with the user actor permissions defined in 02-user-actors.md and the business rules in 05-business-rules.md.

## Content Creation

WHEN a member attempts to create a post, THE system SHALL validate that the user has a verified email address.

WHEN a member attempts to create a post with an image, THE system SHALL accept files in PNG, JPG, JPEG, GIF, or WebP formats with a maximum size of 5MB.

WHEN a member attempts to create a post with a link, THE system SHALL validate that the URL is well-formed and uses http:// or https:// protocol.

WHEN a member attempts to create a post with text content, THE system SHALL enforce a minimum of 1 character and a maximum of 10,000 characters.

WHEN a member attempts to create a post in a community, THE system SHALL verify that the community exists and is not in an "archived" or "banned" state.

WHEN a member attempts to create a post, THE system SHALL set the initial "created_at" timestamp to the current server time in ISO 8601 format (Asia/Seoul timezone).

WHEN a member attempts to create a post, THE system SHALL assign the post an initial "score" of 0 and an initial "comment_count" of 0.

WHEN a member attempts to create a post, THE system SHALL immediately assign the post a unique UUID v4 identifier.

WHEN a moderator attempts to create a post on behalf of a community (e.g., pinned announcement), THE system SHALL require explicit moderator authority over the target community.

WHERE a post contains a URL, THE system SHALL automatically extract and store the domain name as a separate field for content filtering purposes.

## Content Visibility Flow

WHEN a post is created by a member, THE system SHALL set its initial visibility state to "public" and make it immediately visible in the community feed.

WHEN a post is flagged for containing suspected illegal content (e.g., child exploitation material), THE system SHALL immediately set its visibility state to "hidden" and trigger an emergency review by an admin.

WHILE a post has a visibility state of "pending_moderation", THE system SHALL hide it from all community feeds and search results.

WHEN a post is reported by three or more unique members within a 24-hour window, THE system SHALL automatically change its visibility state to "pending_moderation".

WHEN a community's moderator approves a post in "pending_moderation" status, THE system SHALL change its visibility state to "public" and notify the post author.

WHEN a community's moderator rejects a post in "pending_moderation" status, THE system SHALL change its visibility state to "rejected" and notify the post author with a reason.

WHERE a post has a visibility state of "rejected", THE system SHALL prevent it from being re-submitted by the same user for 7 days.

WHERE a post has a visibility state of "hidden", THE system SHALL display a generic message "Content removed" to all users except moderators and admins.

## Moderation Process

WHEN a moderator reviews a post flagged as "pending_moderation", THE system SHALL display the original content, author information, report history, and comments.

WHEN a moderator approves a post with status "pending_moderation", THE system SHALL log the moderator's action, change the post status to "public", and notify the author with "Your post has been approved."

WHEN a moderator rejects a post with status "pending_moderation", THE system SHALL require the moderator to select a reason from a predefined list (e.g., "Spam", "Off-topic", "Hate speech", "Personal information") and store it with the rejection.

WHEN a moderator rejects a post with status "pending_moderation", THE system SHALL set the post's visibility to "rejected" and notify the author via in-app notification and email.

WHEN a moderator deletes a post, THE system SHALL preserve the original content and metadata in an audit log while rendering the post as "deleted" to all users.

WHEN an admin performs a global moderation action on a post, THE system SHALL override all community-level decisions and enforce the admin's decision regardless of community settings.

WHILE a user has an active suspension, THE system SHALL prevent them from creating any new posts regardless of community permissions.

IF a user has been suspended for violations in three or more distinct communities, THE system SHALL escalate the case to system admin for review of account-wide privileges.

## Content Editing

WHEN a member attempts to edit a post they created, THE system SHALL allow edits only within 3 hours of the original creation timestamp.

WHEN a member attempts to edit a post after 3 hours, THE system SHALL prohibit editing and display a message: "You can no longer edit this post."

WHEN a moderator edits a post by any member, THE system SHALL allow edits at any time and without time restriction.

WHEN a post is edited, THE system SHALL preserve the original version in an editable history log.

WHEN a post is edited, THE system SHALL append an "edited" timestamp and flag visible below the content: "Edited [Timestamp]"

WHEN a post is edited, THE system SHALL preserve the original "created_at" timestamp unchanged.

WHEN a post is edited, THE system SHALL update the "updated_at" field to the current server time in ISO 8601 format (Asia/Seoul timezone).

WHERE a post has been rejected, THE system SHALL prohibit any editing attempts by the original author.

IF a post contains changes that alter its meaning substantially after moderation, THE system SHALL automatically re-queue it for moderation review.

## Content Deletion

WHEN a member attempts to delete their own post, THE system SHALL allow deletion at any time without restriction.

WHEN a member attempts to delete a post, THE system SHALL change its visibility state to "deleted" and remove it from public feeds and search results.

WHEN a member attempts to delete a post, THE system SHALL preserve the original content and metadata in an audit log for compliance purposes.

WHEN a moderator deletes a post, THE system SHALL set the visibility state to "deleted" and record the moderator's identity and reason for deletion.

WHEN an admin deletes a post, THE system SHALL set the visibility state to "deleted" and record the admin's identity, reason, and any associated policy violation.

WHEN a post is deleted, THE system SHALL preserve all votes and comments associated with it in the audit log.

WHEN a post is deleted, THE system SHALL NOT delete the associated user karma accumulated from that post.

WHEN a post is deleted, THE system SHALL purge any embedded image files from the cloud storage after 7 days of deletion, if no subsequent legal holds exist.

## Content Archiving

WHEN a community has been inactive for 12 consecutive months (no posts, comments, or votes), THE system SHALL auto-archive the community and all its associated content.

WHEN a community is archived, THE system SHALL change the visibility state of all posts and comments within it to "archived".

WHEN a community is archived, THE system SHALL prevent any further voting, commenting, or posting within it.

WHEN a community is archived, THE system SHALL preserve all content including votes, karma history, and user attribution.

WHEN a post is archived, THE system SHALL display a banner on its page: "This community has been archived. No further interactions are possible."

WHERE a post is archived, THE system SHALL still be discoverable via direct links and search, but shall not appear in community feeds or trending lists.

WHEN an admin manually archives a community, THE system SHALL require confirmation from the admin and log the archival action with timestamp and reason.

## User Content Review

WHEN a user views their own profile, THE system SHALL display all their posts, comments, and voting history regardless of visibility state.

WHEN a user views another user's profile, THE system SHALL only show posts and comments with visibility states of "public" or "archived".

WHEN a moderator reviews a user's profile, THE system SHALL display all posts and comments with all visibility states (public, deleted, rejected, archived).

WHEN an admin reviews a user's profile, THE system SHALL display all content regardless of visibility state, including private edits and hidden reports.

WHEN a user attempts to view a post deleted by a moderator, THE system SHALL show: "This post was removed by a moderator." and display the moderator’s username and reason (if provided).

WHEN a user attempts to view a post deleted by the original author, THE system SHALL show: "This post was deleted by the author."

WHEN a user attempts to view a post set to "rejected", THE system SHALL show: "This post was rejected by a moderator for: [Reason]."

## Retention Policies

THE system SHALL retain all user-generated content indefinitely by default, unless removal is requested by the user, mandated by law, or determined by an admin.

THE system SHALL retain all moderation decisions, audit logs, and edited versions of content for at least 7 years following the last interaction with the content.

THE system SHALL retain all user attribution (author identities) for all content even after deletion or archiving.

THE system SHALL retain all karma history and vote records permanently to maintain community trust metrics.

WHERE a user deletes their account, THE system SHALL anonymize their content by replacing their username with "[deleted-user]" but retain all associated karma, votes, and content metadata intact.

## Data Purging

WHEN a user requests account deletion, THE system SHALL anonymize their username across all posts and comments, preserving all other data as required by law.

WHEN a post has been deleted for 7 years, THE system SHALL purge all associated audit logs and metadata from active storage.

WHEN a community has been archived for 7 years, THE system SHALL migrate all its content to cold storage with reduced availability.

WHEN server storage capacity reaches 95%, THE system SHALL initiate automated migration of archived content to lower-cost storage tiers.

WHEN legal authorities issue a valid request for data retention, THE system SHALL override all automated purge schedules and preserve the requested content indefinitely.

WHOEVER requests data deletion, THE system SHALL implement it only after a mandatory 30-day waiting period during which the request can be canceled by the user.

IF a pending legal hold exists on a user's content, THE system SHALL prohibit all data purging operations related to that content.

THE system SHALL permanently purge embedded media files (images) 7 days after their corresponding post has been deleted and no legal holds exist.

THE system SHALL retain all database records of deleted content for audit compliance, but non-essential field values (e.g., full image data) may be stripped after 90 days.

THE system SHALL generate a quarterly data purge report for administrators, listing all content scheduled for deletion based on retention policy.

THE system SHALL ensure that all purged data cannot be recovered through any system interface or backup mechanism after the purge window expires.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*