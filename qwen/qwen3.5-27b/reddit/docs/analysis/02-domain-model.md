**redditClone — Business concepts, relationships, and states from user perspective**

Business concepts, relationships, and states from user perspective

# Domain Concepts

Describe what each concept means in the business domain and its key attributes.

## User Concept

A User is a person who participates in the community platform by creating an account with email and password. Each user has a unique username that identifies them across the platform. Users have a profile that includes a display name, bio text, and avatar image. Every user maintains a single karma score that reflects their overall standing in the community. The karma score increases when other users upvote their posts or comments, and decreases when downvoted. Karma can become negative if a user receives more downvotes than upvotes. A user's profile displays their total karma score along with all posts they have created and all comments they have written. When a user deletes their account, all their posts and comments are also removed from the platform.

### User Account

A user account is created when a person signs up with an email address and password. Each user must choose a unique username that no other user can use. The username serves as the user's identifier across the entire platform. Users authenticate to the system using their email address and password. Users can change their password at any time after account creation.

### User Profile

Each user has a profile that contains three customizable elements: a display name, a bio text, and an avatar image. The display name is how the user presents themselves publicly and can be different from their username. The bio text allows users to describe themselves or their interests. The avatar image is a visual representation of the user. Users can edit their own display name, bio text, and avatar image at any time. Any user can view any other user's profile page.

### Karma System

Every user maintains a single karma score represented as one number. The karma score reflects the user's overall standing in the community based on how others receive their contributions. When another user upvotes a post or comment created by a user, that user's karma increases by one point. When another user downvotes a post or comment created by a user, that user's karma decreases by one point. When a user removes their vote on someone else's content, the karma adjusts accordingly to reflect the change. A user's karma can become negative if they receive more downvotes than upvotes on their content.

### User Profile Display

A user's profile page displays several pieces of information about that user. The profile shows the user's display name, bio text, and avatar image. The profile displays the user's total karma score. The profile includes a list of all posts the user has created. The profile includes a list of all comments the user has written. These lists allow other users to see the user's contribution history on the platform.

### Account Deletion

Users can delete their account at any time. When a user deletes their account, all posts created by that user are also deleted from the platform. When a user deletes their account, all comments written by that user are also deleted from the platform. This cascade deletion ensures that no content remains associated with a deleted user account.

## Community Concept

A Community is a space where users gather to share and discuss content around specific topics. Each community has a unique name that distinguishes it from other communities on the platform. Communities include a description text that explains the purpose and focus of the community. An icon image visually represents the community and helps users identify it quickly. The user who creates a community becomes its owner with highest authority. Communities display their subscriber count to show how many users have joined. Users can browse all communities in a list view across the platform. The platform supports searching for communities by name to help users find relevant communities.

### Community Definition

A community is a dedicated space where users gather to share and discuss content around specific topics. Any user can create a community. Each community has a unique name that distinguishes it from all other communities on the platform — no two communities can share the same name. Communities include description text that explains the purpose and focus to help users understand what content belongs there. An icon image visually represents the community and helps users identify it quickly. The user who creates a community becomes its owner with highest authority over that community. Communities display their subscriber count to show how many users have subscribed to them.

### Community Discovery

Users can browse all communities in a list view across the entire platform. Each community in the list displays its unique name, description text, icon image, and subscriber count. The platform supports searching for communities by name to help users find relevant communities quickly. Search results show matching communities with their name, description, and subscriber count. The subscriber count reflects the total number of users who have subscribed to that community and is updated in real time as users subscribe or unsubscribe.

## Post Concept

A Post is content shared by a user within a community they are subscribed to. Every post must have a title, which is a required attribute. Posts can be one of three types: text posts with text content, link posts with a URL, or image posts with an uploaded image. When viewing a single post, users see the full title and complete content. The post displays information about the author who created it and the community where it was posted. Posts show a vote score that reflects community reception and a comment count indicating discussion activity. The time when the post was created is displayed to show its age. In post list views, text posts show the first 200 characters of content, image posts display a thumbnail, and link posts show the domain name of the URL.

### Post Title Requirement

Every post must have a title, which is a required attribute that cannot be omitted. The title serves as the primary identifier for the post and is displayed prominently in both list views and detailed views. Without a title, a post cannot be created or saved.

### Post Content Types

Posts support three distinct content types, and each post must be exactly one type:

**Text Post**
A text post contains text content written by the author. The full text content is displayed when viewing the post in detail.

**Link Post**
A link post contains a URL that points to external content. The URL is displayed and accessible when viewing the post.

**Image Post**
An image post contains an uploaded image. The image is displayed when viewing the post in detail.

The content type determines how the post is rendered and what information is shown in list views versus detailed views.

### Post Metadata Display

When viewing a single post in detail, the following information is displayed:

- The complete title of the post
- The full content (text, URL, or image depending on post type)
- The author who created the post, identified by their username
- The community where the post was published
- The vote score, which reflects the total upvotes minus total downvotes
- The comment count, showing how many comments have been written on the post
- The time when the post was created, displayed as a relative time (e.g., "3 hours ago")

This metadata provides context about the post's origin, reception, and activity level.

### Post List View Content

When viewing posts in a list (such as in feeds), each post displays condensed information:

- The title of the post
- The author's username
- The community name where the post was published
- The vote score
- The comment count
- The time since the post was created (e.g., "3 hours ago")

Additionally, content previews vary by post type:
- Text posts show the first 200 characters of the text content
- Image posts display a thumbnail version of the image
- Link posts show the domain name of the URL (e.g., "youtube.com")

This condensed view allows users to quickly scan and identify posts of interest.

## Comment Concept

A Comment is a message written by a user in response to a post or another comment. Comments can be written on any post regardless of the user's subscription status to that community. Users can reply to any existing comment, creating threaded discussions. The platform supports unlimited nesting depth, meaning replies can have replies with no restriction. Each comment displays the author who wrote it along with the full content text. Comments show a vote score that indicates how the community received the comment. The time since the comment was posted is displayed to show recency. Comments display their nested replies in a hierarchical structure for easy reading.

### Comment Structure

A comment consists of an author and content text. The author is the user who wrote the comment and is automatically identified when the comment is created. The content is the full text message composed by the author. Comments are written in response to either a post or another existing comment. Each comment is permanently associated with its author and cannot be transferred to another user.

### Comment Nesting

Users can reply to any existing comment, creating a threaded discussion structure. When a user replies to a comment, the new comment becomes a child of the original comment. The platform supports unlimited nesting depth, meaning there is no restriction on how many levels of replies can exist. A reply can have replies, and those replies can have their own replies, continuing indefinitely without any depth limit. Nested replies are displayed in a hierarchical structure that visually shows the relationship between parent and child comments.

### Comment Scoring and Recency

Each comment displays a vote score that reflects how the community has voted on it. The vote score increases when users upvote the comment and decreases when users downvote it. Comments also display the time since they were posted, showing how recent the comment is. This time information helps users understand the recency of the discussion and when each comment was added.

## Vote Concept

A Vote is an expression of opinion by a user on a post or comment. Users can upvote content to show approval, which adds one point to the vote score. Users can downvote content to show disapproval, which subtracts one point from the vote score. Each user can only cast one vote per post or comment at any given time. Users have the flexibility to change their vote from upvote to downvote or vice versa. Users can also remove their vote entirely, which adjusts the score accordingly. The vote score for any content equals total upvotes minus total downvotes. These voting rules apply consistently to both posts and comments across the platform.

### Vote Entity Definition

A Vote represents a user's expression of approval or disapproval on content. Each vote is associated with exactly one user and exactly one piece of content (either a post or a comment). A vote has a vote type that indicates whether it is an upvote or a downvote. A vote is created at a specific point in time when the user casts it. Each user can only have one active vote on any given piece of content at any time. If a user attempts to vote on content they have already voted on, their existing vote is updated rather than creating a new vote.

### Vote Types and Score Impact

An upvote expresses approval and adds one point to the content's vote score. A downvote expresses disapproval and subtracts one point from the content's vote score. The vote score for any post or comment is calculated as the total number of upvotes minus the total number of downvotes. When a user changes their vote from upvote to downvote, the score decreases by two points (removing the +1 and adding -1). When a user changes their vote from downvote to upvote, the score increases by two points (removing the -1 and adding +1). When a user removes their vote entirely, the score adjusts by removing their contribution (either +1 or -1).

### Vote Scope and Application

Votes can be cast on posts. Votes can be cast on comments. The same voting rules apply to both posts and comments consistently across the platform. Each vote is independent and does not affect other content. A user's vote on one post does not influence their ability to vote on other posts. A user's vote on one comment does not influence their ability to vote on other comments. Votes are visible to all users as part of the vote score display, but individual user votes are not publicly attributed.

### Vote Modification Rules

Users can change their vote from upvote to downvote at any time. Users can change their vote from downvote to upvote at any time. Users can remove their vote entirely, returning the content to its score before their vote was cast. Vote modifications are immediate and the vote score updates in real time. Users can modify their vote multiple times without restriction. Each vote modification replaces the previous vote state for that user on that content. There is no limit to how many times a user can change or remove their vote.

## Subscription Concept

A Subscription represents a user's membership in a specific community. When a user subscribes to a community, they gain the ability to view posts from that community in their home feed. Subscribing is a prerequisite for creating posts within that community. Users can view a complete list of all communities they are currently subscribed to. The subscription relationship tracks when the user joined the community. This relationship is what enables the home feed to show posts only from subscribed communities. Unsubscribed users cannot create posts in a community but may still view community content in some contexts.

### Subscription and Community Membership

A Subscription represents a user's membership relationship with a specific community. When a user subscribes to a community, this relationship is established and recorded. The subscription enables the user to receive posts from that community in their personalized home feed. Each subscription is unique to a user-community pair, meaning a user can only have one active subscription to any given community. Through a subscription, a user becomes a member of a community. Membership grants the user the ability to view posts from that community in their home feed. Members can also create posts within the community, as subscription is a prerequisite for post creation. Membership does not grant special privileges beyond posting and feed visibility. Any user can view a community's public content regardless of membership status. A user can be a member of multiple communities simultaneously, with each membership tracked separately. The subscription relationship persists until the user explicitly unsubscribes from the community. When a user unsubscribes, they lose membership benefits but may still view community content in certain contexts.

### Subscription Requirements and Home Feed

Subscribing to a community is required before a user can create posts within that community. This requirement ensures that only members who have explicitly joined a community can contribute content to it. Users who are not subscribed to a community cannot create posts there, even if they can view the community's existing content. The system checks subscription status before allowing post creation. If a user attempts to create a post in a community they are not subscribed to, the action is rejected. The home feed displays posts exclusively from communities to which the user is subscribed. This personalized feed aggregates content from all subscribed communities into a single view. The home feed is available only to logged-in users, as subscription information is tied to user accounts. When a user subscribes to a new community, posts from that community begin appearing in their home feed. When a user unsubscribes from a community, posts from that community no longer appear in their home feed. The home feed does not show posts from communities the user is not subscribed to.

### Subscription Tracking and Visibility

Each subscription records when the user joined the community. This timestamp indicates the date and time when the subscription relationship was established. The subscription timestamp is used to track community membership history. Users can view when they joined each community they are subscribed to. The timestamp is set when the user first subscribes and is not modified if the user unsubscribes and resubscribes later. A new subscription created after unsubscribing will have its own timestamp. Users can view a complete list of all communities they are currently subscribed to. This list shows every community where the user has an active subscription relationship. The list displays community names and may include additional information such as join date or subscriber count. Users can access this list from their profile or account settings. The list is updated in real-time as users subscribe to or unsubscribe from communities. Only active subscriptions appear in the list; unsubscribed communities are not shown.

## Moderation Concept

Moderation defines the authority structure within a community for managing content and users. The community creator holds the owner role with the highest authority level. Owners can add moderators to help manage the community. Owners have the power to remove moderators from their positions. Moderators can add other moderators to expand the moderation team. However, moderators cannot remove the owner from their position. Moderators also cannot remove each other from moderator roles. Only the owner has the authority to remove moderators. This hierarchy ensures clear accountability and prevents power struggles within the moderation team.

### Owner Role

The owner is the user who creates a community and holds the highest authority level within that community. The owner has full control over the moderation team structure. The owner can add new moderators to the community at any time. The owner can remove moderators from their positions at any time. The owner is the only role that can remove moderators from a community. The owner role cannot be removed by any other user, including moderators. The owner retains their position regardless of moderator actions.

### Moderator Role

A moderator is a user granted elevated privileges to help manage a community. Moderators can add other moderators to expand the moderation team. Moderators cannot remove the owner from their position. Moderators cannot remove other moderators from their roles. Only the owner has the authority to remove moderators. This restriction ensures that the community creator maintains ultimate control over the moderation hierarchy.

## Ban Concept

A Ban is a restriction placed on a user within a specific community by moderators. When a user is banned from a community, they cannot create new posts in that community. Banned users also cannot write comments on any posts within that community. Despite the ban, users can still view content in the community including posts and comments. Moderators maintain a list of all banned users for their community. The ban relationship tracks which moderator issued the ban and when it was applied. Moderators have the ability to unban users, restoring their full participation rights in the community.

### Ban Definition

A ban is a restriction placed on a user within a specific community. When a user is banned from a community, they lose the ability to participate in that community by creating new content. The ban is specific to the community where it was issued and does not affect the user's access to other communities or the platform as a whole. A ban is issued by a moderator of the community and remains in effect until the moderator explicitly removes it.

### Ban Restrictions

When a user is banned from a community, they cannot create new posts in that community. Banned users also cannot write comments on any posts within the banned community. These restrictions apply to all posts and comments regardless of when they were created. The ban prevents the user from contributing any new content to the community while the ban is active.

### Ban Visibility Permissions

Despite being banned from a community, users retain the ability to view content in that community. Banned users can read posts and comments created by other members. They can browse the community feed and view individual posts. The ban only restricts content creation, not content consumption.

### Ban Tracking Information

Each ban records which moderator issued the ban. The system tracks when the ban was applied. This information is available to moderators who need to review ban history. The ban relationship links the banned user to the specific community and the moderator who enforced the restriction.

### Banned Users List

Moderators can view a list of all users who are currently banned from their community. This list shows which users have been restricted from participating. Moderators use this list to monitor who cannot create content in the community. The list is visible only to moderators of that community.

### Unban Capability

Moderators have the ability to unban users from their community. When a user is unbanned, they regain full participation rights in that community. An unbanned user can create posts and comments again. The unban action removes the restriction and restores the user's ability to contribute to the community.

## Report Concept

A Report is a flag raised by a user to alert moderators about potentially problematic content. Users can report any post or comment they encounter on the platform. When creating a report, users must provide a reason explaining why they are reporting the content. Moderators can view all reports submitted for their community. Each report displays the content that was reported along with who reported it. The report includes the reason text provided by the reporting user. Moderators can approve a report, which results in deletion of the reported content. Moderators can also dismiss a report, which keeps the content and removes the report from the list.

### Report Definition and Creation

A Report is a flag raised by a user to alert moderators about potentially problematic content in their community. Users can report any post or comment they encounter on the platform. When creating a report, users must provide a reason explaining why they are reporting the content. The reason is required text that describes the issue with the reported content. Reports are created by users who have accounts on the platform and are associated with the specific community where the content exists.

### Report Display Information

Each report displays the content that was reported along with who reported it. The report shows the original post or comment that was flagged. The identity of the user who submitted the report is visible to moderators. The reason text provided by the reporting user is displayed with the report. Moderators can view all reports submitted for their community, allowing them to review flagged content and take appropriate action.

### Report Status and Outcomes

Reports have two possible outcomes when handled by moderators. When a moderator approves a report, the reported content is deleted from the community. When a moderator dismisses a report, the content is kept and remains visible. Dismissed reports are removed from the report list and are no longer visible to moderators. The approval action results in permanent deletion of the flagged post or comment. The dismissal action preserves the content and closes the report without further action required.

# Domain Relationships

Describe how concepts relate to each other from a business perspective.

## Conceptual Relationships

Describe how concepts relate to each other in business terms.

### User Ownership Relationships

A user owns all posts they create. When a user creates a post, that post is permanently associated with them as the author.

A user owns all comments they create. Each comment is permanently linked to the user who wrote it.

A user can have multiple subscriptions to different communities. Each subscription represents the user's membership in a community.

A user can cast multiple votes across different posts and comments. Each vote is associated with the user who cast it.

A user can create multiple reports about posts or comments. Each report is linked to the user who submitted it.

A user can be a moderator of multiple communities. The moderation relationship links the user to each community where they have moderator privileges.

A user can be banned from multiple communities. The ban relationship links the user to each community where they are banned.

When a user deletes their account, all posts, comments, votes, and reports they created are also deleted. This removes all ownership relationships.

### Community Membership Relationships

A community is owned by exactly one user. The user who creates a community becomes its owner.

A community can have multiple subscribers. Each subscription represents a user who has subscribed to the community.

A community can have multiple moderators. The owner and all moderators have elevated privileges within the community.

A community can have multiple banned users. Banned users are restricted from creating content in that community.

A community can contain multiple posts. Each post belongs to exactly one community.

A community can have multiple reports submitted about its posts or comments. Moderators can view all reports for their community.

### Post Relationships

A post belongs to exactly one community. A user can only create posts in communities they are subscribed to.

A post is owned by exactly one user. The user who creates the post is its author.

A post can have multiple votes from different users. Each user can vote on a post only once.

A post can have multiple comments. Comments are nested and can have unlimited depth.

A post can have multiple reports. Reports allow users to flag problematic content for moderator review.

When a post is deleted, all its comments and votes are also deleted. This removes all relationships to the post.

### Comment Relationships

A comment belongs to exactly one post. A user can comment on any post they can view.

A comment is owned by exactly one user. The user who writes the comment is its author.

A comment can have multiple replies. Replies are comments that belong to the same post but reference another comment as their parent.

A comment can have multiple votes from different users. Each user can vote on a comment only once.

A comment can have multiple reports. Reports allow users to flag problematic comments for moderator review.

When a comment is deleted, all its replies and votes are also deleted. This removes all relationships to the comment.

### Vote Relationships

A vote is cast by exactly one user. Each vote is permanently associated with the user who cast it.

A vote targets exactly one piece of content. The content can be either a post or a comment.

A vote has one of three states: upvote, downvote, or no vote. Users can change their vote or remove it entirely.

A post can receive multiple votes from different users. The post's vote score is the sum of all upvotes minus all downvotes.

A comment can receive multiple votes from different users. The comment's vote score is the sum of all upvotes minus all downvotes.

When a user removes their vote, the vote is deleted. This removes the relationship between the user and the content.

### Moderation and Ban Relationships

A user can be a moderator of multiple communities. Moderators have elevated privileges within each community.

A community has exactly one owner. The owner has the highest authority in the community.

A community can have multiple moderators. Moderators can add other moderators but cannot remove each other.

A user can be banned from multiple communities. Banned users cannot create posts or comments in those communities.

A ban is created by a moderator or owner. The ban relationship records who banned the user and when.

Banned users can still view content in the community. The ban only restricts content creation, not viewing.

### Report Relationships

A report is created by exactly one user. The user who submits the report is permanently associated with it.

A report targets exactly one piece of content. The content can be either a post or a comment.

A report includes a reason text. The reporter must provide an explanation for the report.

A report has one of three statuses: pending, approved, or dismissed. Moderators handle pending reports.

When a moderator approves a report, the reported content is deleted. This removes the post or comment.

When a moderator dismisses a report, the report is removed from the report list. The content remains visible.

## Lifecycle and Retention

Describe concept lifecycle states and transitions only. Detailed retention/recovery policies belong in 05-non-functional. Operation details belong in 03-functional-requirements.

### User Account Lifecycle

A user account is created when a person signs up with email and password and chooses a unique username. The account remains active until the user chooses to delete it. When a user deletes their account, all posts and comments they created are also deleted. Account deletion is permanent and cannot be undone. A deleted user's karma score and all their votes are removed from the system. Subscriptions to communities are also removed when an account is deleted.

### Community Lifecycle

A community is created when a user creates it with a unique name, description, and icon image. The creator becomes the owner of the community. A community remains active indefinitely unless the owner chooses to remove it. When a community is removed, all posts and comments within that community are also deleted. The community's subscriber count and all subscriptions to it are removed. Moderator assignments for that community are also removed.

### Post Lifecycle

A post is created when a user who is subscribed to a community creates it with a required title and content (text, link URL, or uploaded image). The post remains active and visible in feeds until it is deleted. A post can be edited by its author at any time while it is active. A post can be deleted by its author at any time. A post can be deleted by a moderator of the community it belongs to. When a post is deleted, all comments on that post are also deleted. When a post is deleted, all votes on that post are removed and the author's karma is adjusted accordingly.

### Comment Lifecycle

A comment is created when a user writes it on a post. A comment can be a reply to another comment, with no limit on nesting depth. The comment remains active and visible until it is deleted. A comment can be edited by its author at any time while it is active. A comment can be deleted by its author at any time. A comment can be deleted by a moderator of the community the post belongs to. When a comment is deleted, all replies to that comment are also deleted. When a comment is deleted, all votes on that comment are removed and the author's karma is adjusted accordingly.

### Report Lifecycle

A report is created when a user reports a post or comment and provides a reason in text form. The report enters a pending state awaiting moderator review. A moderator can approve the report, which deletes the reported content and removes the report from the list. A moderator can dismiss the report, which keeps the content and removes the report from the list. A report cannot be modified once created. A report cannot be reopened once approved or dismissed.

### Ban Lifecycle

A ban is created when a moderator bans a user from a community. The banned user cannot create posts or comments in that community while the ban is active. The banned user can still view content in that community. A ban remains active until a moderator unbans the user. When a user is unbanned, they regain the ability to create posts and comments in that community. Banned users can still subscribe to or unsubscribe from the community.

### Subscription Lifecycle

A subscription is created when a user subscribes to a community. The subscription remains active until the user unsubscribes. When a user subscribes, they can create posts in that community. When a user unsubscribes, they can no longer create posts in that community but can still view its content. Subscriptions are automatically removed when a user deletes their account. Subscriptions are automatically removed when a community is deleted.

### Vote Lifecycle

A vote is cast when a user upvotes or downvotes a post or comment. A vote remains active until the user changes or removes it. A user can change their vote from upvote to downvote or vice versa. A user can remove their vote entirely. When a vote is removed, the content's score is adjusted and the voter's karma is adjusted accordingly. Votes are automatically removed when the content they were cast on is deleted. Votes are automatically removed when the voter deletes their account.

# Business Categories and State Flows

Business category classifications and state flow definitions.

## Business Category Definitions

Define all business category classifications with their allowed values and descriptions.

### Post Type Classification

The system recognizes three distinct post types that users can create:

1. **Text Post**: Contains text content written by the author
2. **Link Post**: Contains a URL linking to external content
3. **Image Post**: Contains an uploaded image file

Each post must be exactly one of these three types. When a user creates a post, they must specify which type it is and provide the corresponding content (text content, URL, or image). The post type determines how the content is displayed in feeds and on the post detail page.

When viewing a post list, different content is previewed based on post type:
- Text posts show the first 200 characters of content
- Image posts show a thumbnail of the image
- Link posts show the domain name of the URL

### Vote Type Classification

The system supports three vote states for both posts and comments:

1. **Upvote**: Adds one point to the content's vote score
2. **Downvote**: Subtracts one point from the content's vote score
3. **No Vote**: The user has not voted or has removed their vote

Each user can only have one vote state per piece of content (post or comment). Users can change their vote from upvote to downvote or vice versa. Users can also remove their vote entirely, which returns the content to the no vote state for that user.

The vote score of a post or comment is calculated as the total number of upvotes minus the total number of downvotes. When a user changes or removes their vote, the karma of the content's author adjusts accordingly.

### Moderator Role Classification

The system defines two moderator roles within each community:

1. **Owner**: The user who created the community. The owner has the highest authority and cannot be removed from this role. Owners can add moderators, remove moderators, and perform all moderation actions.

2. **Moderator**: Users assigned moderator privileges by the owner or by existing moderators. Moderators can add other moderators, delete posts, delete comments, ban users, unban users, and view reports. However, moderators cannot remove the owner or remove other moderators—only the owner can remove moderators.

A user can be a moderator in multiple communities simultaneously. Each moderator assignment is independent and specific to one community.

### Report Status Classification

Reports submitted by users have three possible statuses:

1. **Pending**: The report has been submitted and is awaiting moderator review
2. **Approved**: A moderator has reviewed the report and approved it, resulting in deletion of the reported content
3. **Dismissed**: A moderator has reviewed the report and dismissed it, keeping the content visible

When a report is approved or dismissed by a moderator, it is removed from the active report list. Each report shows the reported content, the user who submitted the report, and the reason provided by the reporter. Moderators can view all reports for their community and take action on each one.

### Feed Type Classification

The system provides three types of post feeds for viewing content:

1. **Home Feed**: Shows posts only from communities the user is subscribed to. This feed is available only to logged-in users.

2. **Popular Feed**: Shows posts from all communities across the platform. This feed is available to everyone, including logged-out users.

3. **Community Feed**: Shows posts from one specific community. This feed is available to everyone, including logged-out users.

All three feed types support the same sorting options and are paginated. Users can navigate through pages of posts in any feed.

### Sort Option Classification

All post feeds support four sorting methods:

1. **Hot**: Recent posts with many upvotes appear first. This balances recency and popularity.

2. **New**: Most recently created posts appear first, regardless of vote score.

3. **Top**: Posts with the highest vote score appear first. This option includes time filters:
   - Today: Posts from the current day
   - This week: Posts from the current week
   - This month: Posts from the current month
   - This year: Posts from the current year
   - All time: Posts from any date

4. **Controversial**: Posts with many votes but a score close to zero appear first. This indicates posts with significant disagreement among voters.

### Comment Sort Option Classification

Comments on a post can be sorted using three methods:

1. **Best**: Comments with the highest vote score appear first

2. **New**: Most recently created comments appear first

3. **Controversial**: Comments with many votes but a score close to zero appear first

The sort option applies to the entire comment tree, including nested replies. Each comment displays its author, content, vote score, time since posted, and any nested replies in the selected sort order.

### Ban Status Classification

Users can have one of two statuses within a community:

1. **Active**: The user can create posts and comments in the community, and can vote on content

2. **Banned**: The user cannot create posts or comments in the community. Banned users can still view all content in the community, including posts and comments. They cannot vote on content while banned.

Bans are applied by community owners or moderators. Only the owner or moderators can unban a user. Each ban records when it was applied and who applied it. Users can be banned from multiple communities independently.

## State Transitions

Define valid state transition paths for stateful concepts.

### Post State Transitions

A post transitions through the following states during its lifecycle:

**Created**: When a user creates a post, it enters the active state and becomes visible in feeds.

**Edited**: When a post author updates the title or content, the post remains active but reflects the updated information. The post continues to be visible in feeds and maintains its vote score and comments.

**Deleted**: When a post is deleted by its author or by a moderator, it is removed from all feeds and becomes inaccessible. All votes and comments associated with the post are also removed.

State transition rules:
- Only the post author or community moderators can delete a post
- Only the post author can edit a post
- A deleted post cannot be restored
- Editing a post does not affect its vote score or comment count
- Deleting a post removes it from the author's profile page

### Comment State Transitions

A comment transitions through the following states during its lifecycle:

**Created**: When a user writes a comment on a post or replies to another comment, it enters the active state and becomes visible on the post page.

**Edited**: When a comment author updates the content, the comment remains active but reflects the updated text. The comment continues to be visible and maintains its vote score and nested replies.

**Deleted**: When a comment is deleted by its author or by a moderator, it is removed from the post page and all nested replies are also removed.

State transition rules:
- Only the comment author or community moderators can delete a comment
- Only the comment author can edit a comment
- A deleted comment cannot be restored
- Editing a comment does not affect its vote score or reply count
- Deleting a comment removes all of its nested replies
- Deleting a comment does not affect the parent post

### Report State Transitions

A report transitions through the following states during its lifecycle:

**Created**: When a user reports a post or comment with a reason, the report enters the pending state and becomes visible to community moderators.

**Approved**: When a moderator approves a report, the reported content (post or comment) is deleted and the report is removed from the report list.

**Dismissed**: When a moderator dismisses a report, the reported content remains active and the report is removed from the report list.

State transition rules:
- Only community moderators can approve or dismiss reports
- A report can only be acted upon once (either approved or dismissed)
- Once a report is approved or dismissed, it cannot be modified
- Approving a report permanently deletes the reported content
- Dismissing a report keeps the content active but removes the report
- Multiple users can report the same content, creating separate reports

### Ban State Transitions

A ban transitions through the following states during its lifecycle:

**Active**: When a moderator bans a user from a community, the ban becomes active. The user cannot create posts or comments in that community but can still view content.

**Removed**: When a moderator or owner unbans a user, the ban is removed. The user regains the ability to create posts and comments in that community.

State transition rules:
- Only community moderators can ban users
- Only community moderators can unban users
- A banned user can still view posts and comments in the community
- A banned user cannot create new posts in the community
- A banned user cannot create new comments in the community
- Unbanning a user does not restore any posts or comments deleted while banned
- The community owner cannot be banned from their own community

### Moderation State Transitions

A moderation role transitions through the following states during its lifecycle:

**Assigned**: When a user is added as a moderator to a community, they gain moderator privileges for that community.

**Removed**: When a moderator is removed from a community, they lose all moderator privileges for that community.

State transition rules:
- The community owner can add moderators to their community
- The community owner can remove moderators from their community
- Moderators can add other moderators to the community
- Moderators cannot remove other moderators (only the owner can)
- Moderators cannot remove the community owner
- The community creator is automatically the owner and cannot lose this role
- Removing a moderator does not affect posts or comments they created
- A user can be a moderator in multiple communities simultaneously

### Subscription State Transitions

A subscription transitions through the following states during its lifecycle:

**Active**: When a user subscribes to a community, they become a subscriber and can create posts in that community. The community appears in their subscribed communities list.

**Removed**: When a user unsubscribes from a community, they lose the ability to create new posts in that community. The community is removed from their subscribed communities list.

State transition rules:
- Any user can subscribe to any community
- Any user can unsubscribe from any community at any time
- Subscribing is required to create posts in a community
- Unsubscribing does not delete posts the user created in that community
- Unsubscribing does not affect the user's ability to view or vote on content
- Users can view their subscribed communities list at any time
- A user can subscribe to multiple communities simultaneously

### Vote State Transitions

A vote transitions through the following states during its lifecycle:

**Created**: When a user casts an upvote or downvote on a post or comment, the vote becomes active and affects the content's score.

**Changed**: When a user changes their vote direction (upvote to downvote or vice versa), the vote is updated and the content's score adjusts accordingly.

**Removed**: When a user removes their vote, the vote is deleted and the content's score adjusts accordingly.

State transition rules:
- Each user can only have one vote per post or comment
- A user can change their vote from upvote to downvote or vice versa
- A user can remove their vote entirely
- Upvoting adds one point to the content's score
- Downvoting subtracts one point from the content's score
- Changing a vote adjusts the score by two points (removes old vote, adds new vote)
- Removing a vote adjusts the score by one point (removes the vote)
- Votes are anonymous and cannot be viewed by other users

### Account State Transitions

A user account transitions through the following states during its lifecycle:

**Created**: When a user signs up with email, password, and unique username, the account is created and the user can log in.

**Active**: When a user is logged in, they can perform all actions permitted by their roles and subscriptions.

**Deleted**: When a user deletes their account, all their posts, comments, votes, subscriptions, and reports are permanently removed. The username becomes available for reuse.

State transition rules:
- Only the account owner can delete their own account
- Account deletion is permanent and cannot be undone
- Deleting an account removes all posts created by that user
- Deleting an account removes all comments created by that user
- Deleting an account removes all votes cast by that user
- Deleting an account removes all subscriptions made by that user
- Deleting an account removes all reports created by that user
- Deleting an account does not affect communities owned or moderated by that user
- After account deletion, the user can create a new account with the same email