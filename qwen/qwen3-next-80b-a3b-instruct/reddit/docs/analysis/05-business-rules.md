# Business Rules

This document defines the core business logic governing content visibility, user reputation, abuse detection, editing policies, notification triggers, and legal compliance within the Community BBS. These rules determine system behavior in response to user actions and environmental conditions, forming the foundation of community governance and self-regulation. Developers must implement these rules exactly as described, ensuring that automated and human-enforced moderation align with community expectations.

## Content Visibility Rules

Content visibility is dynamically managed based on user actions, moderation decisions, and system flags. The system does not delete content by default—it hides or flags it for review unless explicitly ordered to remove it.

- WHEN a post is reported by three different citizens, THE system SHALL automatically hide the post from public view and flag it for moderator review.
- WHEN a comment is reported by two different citizens, THE system SHALL automatically hide the comment from public view and notify the linked post's author.
- WHILE a post is under moderator review, THE system SHALL prevent it from appearing in search results, feeds, or category listings.
- IF a post is reported as containing illegal content by a moderator, THEN THE system SHALL permanently delete the post and notify the author via email with a reference to the violation.
- WHERE a post is flagged for potential copyright infringement, THE system SHALL hide the post and notify the author, offering an option to submit proof of ownership within 72 hours.
- WHERE a user has five or more posts hidden in the past 30 days, THE system SHALL temporarily hide all future posts from new users until verified by a moderator.
- WHILE a user account is under suspension, THE system SHALL prevent any content created by that user from being visible to non-moderators.
- IF the original author of a hidden post edits the content to remove the violating elements, AND the post has not yet been reviewed by a moderator, THEN THE system SHALL automatically restore visibility of the post.
- IF a post is marked as "sensitive" by its author, THEN THE system SHALL show a warning overlay before displaying the content to non-logged-in users and citizens without age verification.

## User Reputation Model

Every citizen builds a reputation score based on community interaction and moderation history. This score influences privileges, content visibility, and system trust levels.

- WHEN a citizen's post receives five "like" reactions from other citizens, THE system SHALL increase that user's reputation score by +1.
- WHEN a citizen's comment receives a "helpful" vote from the post author, THE system SHALL increase that user's reputation score by +2.
- WHEN a citizen's post or comment is reported by another citizen and verified as inappropriate by a moderator, THE system SHALL reduce that user's reputation score by -5.
- WHEN a moderator downvotes or removes content created by a citizen, THE system SHALL reduce that user's reputation score by -3.
- WHEN a citizen voluntarily reports abusive content that is confirmed by a moderator, THE system SHALL increase that user's reputation score by +1.
- WHILE a user’s reputation score is below 0, THE system SHALL require all their posts and comments to be manually approved by a moderator before becoming visible.
- WHILE a user’s reputation score is 100 or higher, THE system SHALL grant the user the ability to skip content review queues for their own posts.
- WHERE a user’s reputation score drops below -20, THE system SHALL automatically suspend the user's posting privileges for 7 days.
- WHERE a user’s reputation score remains below -20 for more than 30 days, THE system SHALL permanently revoke the user's ability to create new posts.
- IF a suspended user's reputation score increases to 0 or higher after 7 days, THEN THE system SHALL automatically reinstate their posting privileges.
- IF a permanently revoked user submits a formal appeal to admin and provides verifiable evidence of rehabilitation, THEN THE system SHALL lift the revocation and reset their reputation to 25.

## Spam and Abuse Detection

The system automatically detects and responds to spam patterns and abusive behaviors using heuristic and statistical analysis, without requiring manual reporting.

- WHEN a citizen posts identical or near-identical content across five or more threads within 24 hours, THE system SHALL flag the account as a spammer and auto-hide all subsequent content for review.
- WHEN a citizen posts more than 20 comments within a 30-minute window, THE system SHALL temporarily block the user from posting further content for 12 hours.
- WHEN a citizen links three or more external domains in a single post or comment, THE system SHALL classify the post as suspicious and require moderator approval before visibility.
- WHEN a citizen uses more than eight hashtags in a single post, THE system SHALL reduce the post’s visibility in feeds and append a notice: "This post contains many hashtags—consider focusing your message."
- IF a user attempts to post a comment that matches a known spam template (e.g., "Click here to win!", "Free money", "Buy now!"), THEN THE system SHALL block the submission and show: "Your message appears to be automated. Please write naturally."
- IF a user replies to the same thread 15 times within 1 hour, THEN THE system SHALL temporarily limit further replies to once every 5 minutes and notify the thread author.
- WHILE a user’s account has been flagged for spam 3 times in 30 days, THE system SHALL require email verification before any post becomes visible.

## Post Edit and Deletion Policies

Users have limited rights to modify or delete their content, subject to time windows and community impact.

- WHEN a citizen edits their own post within 24 hours of creation, THE system SHALL allow the edit without notifying other users.
- WHEN a citizen edits their own post after 24 hours, THE system SHALL show "[Edited]" tag on the post, including the timestamp of the edit.
- WHEN a citizen attempts to delete their own post that has received five or more comments, THE system SHALL replace the post with: "[Deleted by author] This post was removed by the original writer."
- WHEN a citizen attempts to delete their own post that has received 10 or more likes, THE system SHALL require confirmation from a moderator before deletion.
- IF a moderator deletes a citizen’s post, THEN THE system SHALL replace it with: "[Removed by moderator] This content was removed for violating Community Guidelines." and notify the author privately.
- IF a post is deleted because it violates legal requirements (e.g., defamation, copyright), THEN THE system SHALL retain a redacted version for 2 years for audit purposes, but never display it to users.
- WHILE a user’s account is suspended, THE system SHALL prevent them from editing or deleting any existing content.
- WHERE a user’s post has been the subject of a public dispute, AND one of the participants has flagged it as harassing, THE system SHALL lock the post to prevent further edits or deletions by the author.

## Notification Triggers

Notifications are sent to users based on actions that directly impact them or their content. Notifications must be timely, relevant, and non-overwhelming.

- WHEN a citizen receives a like or reaction on a post, THE system SHALL send a notification within 3 minutes.
- WHEN a citizen’s post receives a new comment, THE system SHALL send a notification within 2 minutes.
- WHEN a moderator reports a citizen’s content, THE system SHALL notify the citizen immediately with the reason and the moderator's ID.
- WHEN a citizen is mentioned with "@username" in a post or comment, THE system SHALL notify the mentioned user within 30 seconds.
- WHEN a citizen’s reputation score drops by 5 or more points, THE system SHALL send a summary notification listing all negative actions.
- WHEN a citizen is mentioned in 10 or more comments within a single thread, THE system SHALL send a single consolidated notification instead of 10 separate ones.
- WHEN a moderator issues a warning to a citizen, THE system SHALL send a notification with: "You have been warned for violating [policy]. Your reputation score has been reduced by -3. One more warning will result in a 3-day suspension."
- WHEN a citizen’s post is flagged as harmful by the system, THE system SHALL notify them within 1 hour with: "Your post has been hidden for review due to suspected violations. Review your content and consider editing it."
- WHILE a citizen is under suspension, THE system SHALL send a single daily summary of moderation actions taken against them, but no other notifications.

## Legal Compliance Requirements

The system must comply with international data privacy norms, user rights, and legal obligations without requiring manual intervention for basic enforcement.

- IF a citizen requests data deletion via the account settings page, THEN THE system SHALL permanently erase all their posts, comments, profile, and metadata within 5 business days, and notify the user with a confirmation number.
- IF a citizen requests a copy of their data, THEN THE system SHALL generate and email a JSON file containing all their posts, comments, reputation history, and account activity within 48 hours.
- WHERE a citizen is located in the European Union, THE system SHALL enforce GDPR compliance by default: no data retention past 30 days after account deletion and no profiling without explicit opt-in.
- WHERE a citizen reports content that appears to violate child safety laws, THE system SHALL immediately report the incident to the National Center for Missing and Exploited Children (NCMEC) and notify admin via internal ticket system.
- WHERE a court order requires the disclosure of a user’s identity, THE system SHALL notify the user of the request and retain all relevant data for 120 days, and escalate to admin.
- IF a moderator attempts to permanently delete content that has been flagged by a legal authority, THEN THE system SHALL require a second admin-level confirmation and log the action in compliance audit logs.
- WHILE a legal hold is active on a user account, THE system SHALL suspend all automated deletion processes, even if triggers are met, until the hold is removed.
- IF a user reports content that involves threats of violence, THEN THE system SHALL immediately escalate the issue to admin and notify external authorities if the post contains geolocation data or identifiable threats.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*