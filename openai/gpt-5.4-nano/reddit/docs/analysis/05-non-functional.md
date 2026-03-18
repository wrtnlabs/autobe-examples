**communityPlatform — Data ownership, privacy, retention, and recovery policies**

Data ownership, privacy, retention, and recovery policies

# Data Policies

Data ownership, privacy, retention, and recovery policies from a business perspective.

## Data Ownership and Privacy

Define who owns what data, who can access it, and privacy boundaries between users.

### Data Ownership Boundaries

Users own their account data and content they create, including their posts and comments. This ownership applies regardless of community where the content appears.

User profile information (display name, bio text, and avatar image) is owned by the user who created it. Users control edits to their own profile information.

A community is owned by the community creator. The community owner is treated as the highest authority for that community’s moderation and reporting decisions.

Community assets (community name, description text, and icon image) are owned and managed as part of the community owned by the community creator.

Subscribers do not become owners of a community by subscribing.

Karma is owned by the user as a single karma score; only votes placed on the user’s posts and comments affect that user’s karma.

When content is created, it remains associated with its original author (for example, a post continues to be attributed to its author even after votes or comments are added).

Reporting does not transfer content ownership. The reported content remains owned by its original author, and reports are only a moderation input.

Ban status is owned at the community level. A user being banned from a community does not prevent the user from viewing content in that community, but it prevents the user from creating posts or comments in that community.

If a user deletes their account, the system must treat their posts and comments as deleted as described in the account lifecycle requirements, and ownership by that user must no longer remain actionable for creating edits or new content.

### Privacy and Visibility Rules

User profile pages are viewable by any user (including users who are not connected to the profile as friends or subscribers), showing the profile owner’s display name, bio, and avatar.

A user’s profile page includes only that user’s own aggregate karma score and lists of posts and comments they have written; it does not expose other users’ private account data.

Users can view any community profile information needed to browse communities in lists and search by community name. This community information includes its subscriber count.

A post is publicly viewable through community feeds and the popular feed; the single-post view shows title, full content, author, community, vote score, comment count, and when it was posted.

A user’s home feed is limited to posts from communities the user is subscribed to. Unsubscribed communities must not appear in the home feed.

Access to popular feed and community feed is available to everyone, including logged-out users.

Comment threads shown on a single post must be visible to everyone who can view that post. Replies follow the same visibility rules as other comments on the post.

Deleted posts and deleted comments must no longer be shown as active content in views (including feeds and comment lists). Moderation deletion follows the same “not active content” principle.

Reporting information is not shown to all users; only moderators of the relevant community may view all reports for that community.

Moderators approve or dismiss reports. Dismissed reports must be removed from the report list, so they are not shown as pending items to moderators after dismissal.

### Access Control for Account and Content Operations

Only logged-in users can create posts and comments, including replies.

Only users subscribed to a community can create posts in that community.

Only the author can edit or delete their own posts.

Only the author can edit or delete their own comments.

Moderators can delete any post in their community.

Moderators can delete any comment in their community.

Moderators can ban users from their community and can unban users.

Moderators can view the list of banned users for their community.

Moderators cannot remove the owner of the community.

Moderators cannot remove each other; only the owner can remove moderators.

The community owner can add moderators and can remove moderators.

The community owner can add moderators; moderators can add other moderators.

Banned users cannot create posts or comments in that community, but they can still view content.

Only the submitting user can report a specific piece of content; the system must collect a reason text when reporting a post or comment.

Only moderators of the community that contains the reported content may review reports for that community.

If an operation is attempted that violates the ownership or access constraints above (for example, editing another user’s post), the system must reject the request and must not apply the change.

### Data Isolation Between Users and Communities

A user’s ability to create posts is isolated by community subscription: subscribing to one community does not allow creating posts in other communities.

A user’s home feed is isolated by subscription: it must show posts only from communities the user is subscribed to.

Moderation actions are isolated to the moderator’s community. Moderators can delete posts and comments only within their community.

Bans are isolated to the specific community in which they are applied. A ban from one community does not prevent creating posts or comments in other communities.

Report visibility is isolated to the relevant community. Reports for content in one community are not visible to moderators of other communities.

Profile privacy boundaries are isolated to the user being viewed: when viewing another user’s profile, the system must show only that user’s profile information and public lists of their posts and comments as specified in the profile page rules.

A removed vote affects only the vote score for the specific post or comment being voted on. It must not affect scores of other content.

Vote and karma effects are isolated at the content level: voting on a post or comment changes the vote score for that post or comment, which in turn affects the karma updates for the author of that specific content.

### Privacy-Consistent Deletion and Its Effects on Visibility

Account deletion must result in deletion of that user’s posts and comments, so that the content is no longer active for viewing.

When a post or comment is deleted (by the author or by a moderator), its visibility in feeds and on the single-post view must reflect that deletion, preventing further interaction consistent with deleted content.

After a report is dismissed, it must be removed from the report list so moderators no longer see it as an outstanding moderation item.

When a report is approved, the system must delete the targeted content (post or comment) as part of the moderation action, and subsequent views must not show it as active content.

After a user is banned from a community, the system must enforce that ban for content creation while preserving the user’s ability to view existing content in that community.

## Data Retention and Recovery

Define what happens to deleted data, how long it is retained, and how users can recover it.

### Soft-delete handling

Users’ posts and comments can be deleted by their authors; additionally, moderators can delete posts and comments within their community.

When content is deleted, the system shall not immediately remove it from all views; instead, it shall enter a soft-deleted state so the community can continue to enforce moderation outcomes consistently.

While content is soft-deleted, the system shall ensure the soft-deleted content is no longer shown in normal browsing of feeds and post views.

While content is soft-deleted, the system shall ensure replies and nested replies that belong to the soft-deleted comment are also not shown in normal comment display for that post.

Users shall not be able to edit soft-deleted posts or soft-deleted comments.

The system shall treat karma scoring derived from votes on soft-deleted content so that the displayed vote score shown to users for that content is no longer presented through standard content viewing.

If a user reports soft-deleted content, the system shall not show it as an active target in the community reporting experience; the report process shall apply only to content that is still visible as reportable.

If a community ban is applied to a user, the system shall keep the user’s past visible content behavior consistent with the community’s moderation actions, without automatically deleting historical posts or comments solely due to banning.

Deleted user accounts shall trigger deletion of that user’s posts and comments; this deletion shall follow the same soft-deletion handling until the permanent-deletion step is reached.

### Retention period policy for deleted content

The system shall retain soft-deleted posts and soft-deleted comments for a defined retention period.

The retention period shall apply uniformly to deletions performed by:
- the author of the content
- a moderator in the content’s community
- account deletion by the user

During the retention period, the system shall keep enough information to preserve moderation review outcomes for reports that relate to content that has been deleted but may still be under review.

During the retention period, the system shall keep enough information to ensure that votes and vote score derived from that content are not presented through normal browsing.

The system shall not expose soft-deleted posts, soft-deleted comments, or their nested structures to general users through feeds, post views, or community views.

Retention choices and the exact duration shall be communicated in the product’s stated policy documentation; if the platform does not publish a retention duration, the system shall document the retention window internally and ensure it remains consistent for the service’s lifetime.

### Recovery after soft-delete

Recovery shall be available for soft-deleted content when it is not yet permanently deleted.

If a soft-deleted post or comment is eligible for recovery, the system shall allow the original author to restore it, provided it has not been permanently deleted.

If a soft-deleted post or comment was deleted by a moderator, the system shall allow recovery only as permitted by the moderation workflow for that community; recovery shall not override the moderator’s intent where the policy indicates final moderation resolution.

When a soft-deleted post or comment is restored, the system shall make it visible again in the same contexts where it would normally appear:
- the community feed and any relevant home feed results
- the single post view
- the post’s comment display

If a restored post has comments that were also soft-deleted, the system shall restore the comment thread behavior in a way that preserves nesting and reply relationships as they existed before soft deletion.

If the author account has been deleted, the system shall not allow user-initiated recovery of that author’s soft-deleted posts or comments.

Recovery shall not automatically undo community bans; a banned user shall remain unable to create new posts or comments in that community even if previously deleted content is restored per policy.

### Permanent-deletion policy

After the retention period expires, soft-deleted posts and soft-deleted comments shall be permanently deleted.

Permanent deletion shall fully remove the content from all normal browsing experiences, including feeds, post views, and comment displays.

Permanent deletion shall ensure that deleted content can no longer be recovered.

For content permanently deleted due to author deletion or account deletion, the system shall ensure that any associated author-created relationships for listing on the author’s profile no longer include the permanently deleted posts or comments.

For content permanently deleted after moderator deletion, the system shall ensure the content is no longer included in any community-related reporting view.

The system shall define and apply a consistent order of operations for reports tied to content: when permanently deleting the reported content, the system shall treat the report target as no longer available for review.

The system shall permanently delete banned-user history associated with the user only if the policy documentation indicates it; otherwise, it shall retain the ban list for continued enforcement while ensuring deleted content remains permanently removed.