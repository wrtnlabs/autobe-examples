# Service Overview

This is a simple, focused platform for citizens to share and discuss political ideas through written posts and public comments. It is designed to encourage thoughtful, civil discourse without clutter or distractions — no ads, no algorithms, no follower counts. Users can post articles, attach images or files for context, and comment directly on others’ posts. Moderators ensure the space remains respectful and on-topic by removing violations and locking threads when needed.

## Purpose

This service exists because people want to share and debate political ideas in a space that is neutral, distraction-free, and focused on substance over virality. Most existing platforms either monetize engagement through outrage-driven algorithms, monetize attention through ads, or lock discussions behind complex social networks. This service provides a clean, no-frills alternative where users can express their views, find others who think differently, and engage in conversation without being manipulated by design patterns that reward extremism. It answers the demand for digital public squares that prioritize reasoned dialogue over popularity contests.

## Goals

The primary objectives of this service are:

- To allow any authenticated citizen to create a political discussion post with attached images or files.
- To enable all citizens to respond to posts with comments, fostering conversational exchange.
- To empower moderators to maintain respectful discourse by removing inappropriate content and locking threads that devolve into abuse or spam.
- To ensure all user-generated content remains permanently accessible and searchable, creating a lasting archive of civic dialogue.
- To provide a frictionless experience where users can participate without signing up for multiple services, managing subscriptions, or understanding complex settings.

## Target Users

The system serves two distinct classes of users:

### Citizen

A citizen is any authenticated individual who wants to participate in political discussion. They are not experts or professionals — they are voters, students, workers, parents, retirees. Their goal is to share an opinion, find perspectives from others, and engage in respectful debate. They do not want to manage a profile, chase likes, or navigate complex settings. They want to write a post, upload a relevant image or PDF (e.g., a policy document, a chart, or a photo of a rally), and receive thoughtful responses. They can edit their post only within 24 hours of creation. They cannot delete others’ content, lock threads, or adjust moderation settings.

### Moderator

A moderator is a trusted individual appointed to uphold the community standards of the forum. They are not administrators with broad access — they do not change system settings, delete user accounts, or manage other moderators. Their only power is limited to the moderation dashboard: delete posts or comments that violate guidelines, and lock threads that are no longer productive or are being abused. They act as neutral stewards, not enforcers. When they act, it must be visible, transparent, and consistent — not arbitrary or personal.

## Success Criteria

The service will be considered successful when:

- WHEN a citizen submits a post with an image or file, THE system SHALL display it publicly within 3 seconds.
- WHEN a citizen comments on a post, THE system SHALL show their comment directly below the post without requiring page reload.
- WHILE a post is within its 24-hour edit window, THE system SHALL allow the original author to modify the text or attachments.
- IF a post contains inappropriate content, SUCH AS hate speech, threats, or spam, THEN THE system SHALL make it visible to moderators for review and removal.
- IF a thread receives more than 200 comments in a 48-hour period, THEN THE system SHALL automatically suggest the moderator review it for possible lock.
- WHERE a moderator locks a thread, THE system SHALL display a clear, persistent banner to all users indicating the thread is closed for new comments.
- WHEN a citizen tries to upload a file larger than 10MB, THEN THE system SHALL show a clear error message: "File too large. Maximum size is 10MB. Please reduce and try again."
- WHEN a citizen attempts to edit a post older than 24 hours, THEN THE system SHALL display: "Edits are only allowed within 24 hours of posting. Your post is now final."
- WHEN a moderator deletes a post, THE system SHALL replace it with the message: "This post has been removed by a moderator for violating community guidelines."
- WHERE a file attachment is uploaded, THE system SHALL preserve the original filename and file type for retrieval.
- THE system SHALL allow all users to load the homepage and browse posts in under 1.5 seconds, even during peak traffic.
- THE system SHALL maintain 99.9% uptime for posting, commenting, and viewing content.
- WHILE a post is public, THE system SHALL keep all comments and attachments accessible without expiration.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*