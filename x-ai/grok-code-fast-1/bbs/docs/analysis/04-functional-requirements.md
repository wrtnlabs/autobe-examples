# Functional Requirements

## Introduction

This document outlines the functional capabilities of the simple economic/political discussion board service. It describes what the system should do from a business perspective, focusing on the core features that enable users to create articles, participate in discussions, and manage content. All requirements are expressed in natural language and use the EARS format where applicable to ensure clarity and testability.

The system supports a minimal structure with three actor types: guests who can view public content without authentication, members who can create and edit their own content, and administrators who can moderate and manage the system. The discussion board focuses on straightforward article-based discussions without complex features.

## Article Management

WHEN a member desires to share an economic or political opinion, THE system SHALL allow the member to create a new article with a title and content.

WHEN a member creates an article, THE system SHALL support including images and files as attachments.

WHEN a member submits an article, THE system SHALL save the article as a draft for the member to review and edit.

WHEN a member publishes an article, THE system SHALL make the article publicly visible to all users.

WHEN a member wants to update their article, THE system SHALL allow editing of the content, title, or attachments.

WHEN a member deletes an article, THE system SHALL permanently remove the article from the system and all related discussions.

WHEN a guest views the discussion board, THE system SHALL display published articles with their titles, authors, and creation dates.

WHEN a member views their own dashboard, THE system SHALL show all their articles, including drafts and published ones.

THE system SHALL limit article titles to 200 characters and content to 50,000 characters.

## Discussion Features

WHEN a user views an article, THE system SHALL display existing comments and replies underneath the article.

WHEN a member wants to participate in discussion, THE system SHALL allow them to post a comment on any published article.

WHEN a member posts a comment, THE system SHALL support limited formatting such as bold and italic text.

WHEN a member replies to a comment, THE system SHALL nest the reply under the parent comment.

WHEN a member edits their comment, THE system SHALL allow changes within 24 hours of posting.

WHEN a member deletes their comment, THE system SHALL remove the comment and its replies from the discussion.

WHEN a user views discussions, THE system SHALL show comments in chronological order with newest first.

WHEN a member reports a comment, THE system SHALL record the report for administrator review.

THE system SHALL limit comments to 2,000 characters and replies to 1,000 characters.

## User Management

WHEN a visitor wants to become a member, THE system SHALL allow registration with email, username, and password.

WHEN a new member registers, THE system SHALL send a verification email to confirm the account.

WHEN a member logs in, THE system SHALL authenticate using email and password and remember the session for 30 days.

WHEN a member forgets their password, THE system SHALL allow password reset through email verification.

WHEN a member updates their profile, THE system SHALL support changing password, email, and username.

WHEN a member deactivates their account, THE system SHALL mark the account as inactive and hide their content.

WHEN an administrator views user list, THE system SHALL display all registered members with their registration dates and activity status.

THE system SHALL enforce unique usernames and valid email format for all registrations.

## Content Moderation

WHEN an article is published, THE system SHALL automatically flag it for moderator review if it contains sensitive keywords.

WHEN an administrator reviews flagged content, THE system SHALL allow approval or rejection with optional reason.

WHEN an administrator rejects an article, THE system SHALL notify the member and provide the rejection reason.

WHEN an administrator bans a member, THE system SHALL prevent the member from creating new content and hide existing content.

WHEN an administrator views reported comments, THE system SHALL allow deletion or warning to the member.

WHEN an administrator manages the system, THE system SHALL provide dashboard showing pending articles, reports, and user statistics.

THE system SHALL maintain audit logs of all moderation actions including timestamps and administrator details.

## Search and Filtering

WHEN a user searches for content, THE system SHALL allow searching by keyword in article titles and content.

WHEN users filter discussions, THE system SHALL support filtering by date range, author, or topic category.

WHEN search results are returned, THE system SHALL display matching articles with relevance ranking.

WHEN users browse without searching, THE system SHALL show latest articles first with pagination.

WHEN a user searches, THE system SHALL highlight matching keywords in the results.

THE system SHALL support basic filtering options: category (economic, political), date (within week, month, year).

```mermaid
graph LR
  A["User Searches Content"] --> B{"Is Guest User?"}
  B -->|\"Yes\"| C["Show Public Search Results"]
  B -->|\"No\"| D{"Is Member/Admin?"}
  D -->|\"Member\"| E["Show All Search Results with Private Access"]
  D -->|\"Admin\"| F["Show All Search Results with Moderation Tools"]
  G["Article Results"] --> H["Include Comments in Search"]
  I["Filter Options"] --> J["Apply Category/Date Filters"]
```

## User Scenarios

### Guest Viewing Scenario
WHEN a guest visits the discussion board, THE system SHALL display the homepage with featured articles.

WHEN a guest reads an article, THE system SHALL show full content, attachments, and discussion section.

WHEN a guest attempts restricted action, THE system SHALL prompt login with clear benefits of membership.

### Member Creation Scenario  
WHEN a member decides to write an article, THE system SHALL provide a simple editor with attachment upload.

WHEN the article includes images, THE system SHALL accept common formats (JPG, PNG, GIF) up to 10MB each.

WHEN the article includes documents, THE system SHALL accept PDF, DOC, DOCX up to 20MB each.

WHEN the member publishes, THE system SHALL validate all attachments are virus-free before publishing.

### Admin Moderation Scenario
WHEN an administrator accesses the moderation panel, THE system SHALL show pending items requiring review.

WHEN reviewing an article, THE system SHALL allow viewing full content including all attachments.

WHEN approving content, THE system SHALL move it to public visibility and notify the author.

WHEN rejecting, THE system SHALL provide predefined reasons and allow custom notes.

### Search Usage Scenario
WHEN a user wants to find political discussions, THE system SHALL allow searching \"politics\" keyword.

WHEN filtering by date, THE system SHALL show articles from the last 7 days when \"this week\" selected.

WHEN sorting by popularity, THE system SHALL rank articles by comment count and view numbers.

## Business Rules

THE system SHALL ensure all articles are political or economic topics only, rejecting off-topic submissions.

THE system SHALL require real names or verifiable identities for members to prevent anonymous trolling.

THE system SHALL limit members to 5 articles per day to prevent spam.

THE system SHALL automatically archive articles older than 2 years.

THE system SHALL notify members when their content is approved or rejected within 1 hour.

THE system SHALL display advertisement revenue sharing options for high-quality content creators.

## Performance Expectations

WHEN a user performs a search, THE system SHALL return results within 2 seconds for most queries.

WHEN uploading attachments, THE system SHALL show progress for files over 1MB.

WHEN loading article pages, THE system SHALL display content instantly for text and within 3 seconds for large images.

WHEN member logs in, THE system SHALL authenticate and redirect within 1 second.

THE system SHALL support 1,000 concurrent users with consistent performance.

## Error Scenarios

IF an attachment exceeds size limits, THEN THE system SHALL show error message and allow retry with smaller file.

IF an article contains inappropriate content, THEN THE system SHALL flag it for review and notify administrator.

IF a member attempts to edit another's content, THEN THE system SHALL deny access and show permission error.

IF search yields no results, THEN THE system SHALL suggest alternative keywords or popular topics.

IF file upload fails due to network issues, THEN THE system SHALL allow resume or restart of upload.

## Conclusion

This document defines the complete functional requirements for the simple economic/political discussion board. The system focuses on core discussion capabilities with minimal complexity, emphasizing content creation, sharing, and moderation. All requirements are designed to be straightforward implementations that support the business goal of facilitating informed discussions on economic and political topics.