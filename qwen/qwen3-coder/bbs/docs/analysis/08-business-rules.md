# Economic/Political Discussion Board - Business Rules

This document outlines the core business logic and validation rules governing the economic/political discussion board platform. These rules define how content is validated, how users should behave, and the standards that govern both economic and political discussions.

## Content Validation Rules

### Post Content Requirements
WHEN a member creates a new discussion post, THE system SHALL require the post to contain a title between 5 and 100 characters and body content between 10 and 5000 characters.

WHEN a member submits a post, THE system SHALL validate that the post contains at least one category tag from the approved economic or political topic list.

WHEN a user attempts to create a post with inappropriate language, THE system SHALL reject the submission and return an error message indicating content policy violation.

WHEN a member uploads an attachment to a post, THE system SHALL limit file size to 5MB and only accept JPG, PNG, PDF, or DOC file types.

### Comment Validation Standards
WHEN a member submits a comment, THE system SHALL validate that the comment contains between 1 and 1000 characters.

WHEN a user attempts to post a comment with duplicate content within the same discussion thread, THE system SHALL reject the submission with a warning about duplicate posts.

WHEN a member creates a comment, THE system SHALL prevent excessive punctuation or special characters that could disrupt the user interface.

### Tag and Category Validation
THE system SHALL maintain a predefined list of approved categories for economic discussions including: "Macroeconomics", "Microeconomics", "Fiscal Policy", "Monetary Policy", "Trade Policy", "Labor Markets", "Financial Markets", "Economic Theory", and "Economic History".

THE system SHALL maintain a predefined list of approved categories for political discussions including: "Domestic Policy", "International Relations", "Legislation", "Electoral Politics", "Political Theory", "Public Administration", "Governance", "Civil Rights", and "Political History".

WHEN a user attempts to create a new category or tag, THE system SHALL reject the request and only allow administrators or moderators to manage the official category list.

### Content Moderation Validation
WHEN a member posts content, THE system SHALL automatically check for spam patterns and reject posts that match predefined spam characteristics.

WHEN a member submits a post containing external links, THE system SHALL require the links to be from approved domains or flag them for moderator review.

THE system SHALL prevent users from posting content that contains personal information of other users without explicit consent.

## User Behavior Guidelines

### Registration and Profile Requirements
WHEN a new user registers, THE system SHALL require a unique username, valid email address, and password that meets security criteria (minimum 8 characters with at least one uppercase letter, one lowercase letter, and one number).

WHEN a user updates their profile, THE system SHALL validate that biographical information does not exceed 500 characters and does not contain inappropriate content.

WHEN a user attempts to change their username, THE system SHALL allow changes only once every 30 days to prevent identity confusion.

### Posting Behavior Rules
THE system SHALL require all members to verify their email address before they can create posts or comments.

WHEN a member posts content, THE system SHALL record the timestamp and associate it with the user's account for accountability purposes.

THE system SHALL prevent members from editing posts after 24 hours have elapsed since the original posting time.

WHEN a guest views content, THE system SHALL allow browsing of public discussions but SHALL deny access to private or restricted categories.

### Reputation and Activity Guidelines
THE system SHALL track user activity including posts created, comments made, and moderation actions received.

WHEN a member accumulates more than 5 moderation strikes within 30 days, THE system SHALL automatically suspend the account for 7 days.

WHEN a user attempts to excessively quote other users' content without attribution, THE system SHALL flag the behavior for potential plagiarism review.

THE system SHALL reward constructive participation through an internal reputation system that grants privileges at specific milestone levels.

## Economic Discussion Standards

### Content Quality Requirements
WHEN a member posts in economic categories, THE system SHALL encourage inclusion of factual data, sources, or references to support arguments.

WHEN a user submits an economic analysis post, THE system SHALL validate that monetary values are expressed clearly (specifying currency) and that economic terms are used appropriately.

THE system SHALL flag posts that make definitive economic predictions without acknowledging uncertainty or providing supporting methodology.

WHEN a member creates a post about economic policy, THE system SHALL prompt the user to specify whether they are discussing theoretical, historical, or proposed policy.

### Citation and Source Standards
THE system SHALL encourage members to cite sources when discussing economic statistics, research findings, or policy impacts.

WHEN a user references economic data from government sources, THE system SHALL validate that current data is preferred over outdated information (flagging data older than 2 years).

THE system SHALL prevent users from posting economic content that misrepresents correlation as causation without appropriate caveats.

WHEN a member discusses economic models, THE system SHALL flag posts that oversimplify complex economic relationships without mentioning limitations.

### Discussion Formatting Guidelines
WHEN a member posts economic analysis content, THE system SHALL support formatting features including data tables, mathematical notation, and chart embedding.

THE system SHALL prevent economic discussion posts from using misleading visual representations of data or statistics.

WHEN a user creates an economic forecast discussion, THE system SHALL encourage use of ranges and confidence intervals rather than fixed predictions.

## Political Discourse Requirements

### Civil Discourse Standards
WHEN a member posts in political categories, THE system SHALL enforce rules against personal attacks, hate speech, and deliberately inflammatory language.

THE system SHALL encourage respectful disagreement and evidence-based political discussion while discouraging tribalism or echo chamber behavior.

WHEN a member references political figures, THE system SHALL validate that posts focus on policies and positions rather than personal characteristics.

### Fact-Checking Guidelines
THE system SHALL flag political posts that contain verifiable factual claims without supporting evidence for moderator review.

WHEN a user posts political content, THE system SHALL encourage distinction between fact, analysis, and opinion through clear labeling.

THE system SHALL prevent members from posting political misinformation that has been debunked by reputable fact-checking organizations.

WHEN a member discusses election results or poll data, THE system SHALL require citation of sources and dates for the information.

### Content Scope Requirements
WHEN a user creates political content, THE system SHALL focus discussions on policy implications, governance structures, and public administration rather than personal attacks.

THE system SHALL allow political discussions that span international perspectives while respecting cultural and legal differences.

WHEN members reference legislation, THE system SHALL validate that discussions cite actual legislative text or reliable reporting of proposed changes.

THE system SHALL prevent political discussions from devolving into purely partisan arguments without substantive policy analysis.

## Implementation Business Rules

### User Account Management
THE system SHALL automatically delete unverified accounts after 30 days of inactivity.

WHEN a user requests account deletion, THE system SHALL anonymize their content rather than removing it completely.

THE system SHALL require email verification within 24 hours of registration to activate posting privileges.

### Content Lifecycle Management
THE system SHALL archive discussion threads with no activity for 180 days to reduce homepage clutter.

WHEN content is archived, THE system SHALL maintain all comments and replies but make the thread read-only.

THE system SHALL remove posts that violate community guidelines within 24 hours of moderator review.

### Data Privacy and Retention
WHERE users request personal data deletion, THE system SHALL remove all personally identifiable information within 30 days.

THE system SHALL retain anonymized discussion content for research and platform improvement purposes indefinitely.

WHEN user accounts are permanently banned, THE system SHALL preserve content for legal compliance but disassociate it from the user's identity.

### Platform Governance
THE system SHALL display community guidelines prominently during user registration and post creation.

THE system SHALL require users to acknowledge updated community guidelines after significant policy changes.

WHEN users violate community standards, THE system SHALL implement progressive discipline including warnings, temporary suspensions, and permanent bans based on severity and repetition.

WHERE discussion threads become unproductive or heated, THE system SHALL allow moderators to lock threads to prevent further comments.

## Error Handling and Exception Rules

### System Validation Errors
WHEN users submit content that fails validation, THE system SHALL provide specific error messages identifying which requirements were not met.

THE system SHALL maintain a log of repeated validation failures for spam detection purposes.

WHEN system errors occur during content submission, THE system SHALL preserve user content in draft form and notify administrators.

### User Experience Exceptions
IF a user attempts to access non-existent content, THE system SHALL display a user-friendly error page with navigation options to active discussions.

WHERE technical issues prevent content display, THE system SHALL notify users of temporary unavailability rather than displaying blank pages.

THE system SHALL queue user actions during temporary outages and execute them when service is restored.

### Moderation Escalation Rules
WHEN moderators encounter complex policy violations, THE system SHALL provide escalation paths to administrators.

THE system SHALL require second moderator review for content flagged for permanent banning.

WHEN automated systems flag content incorrectly, THE system SHALL allow moderators to whitelist users or content as appropriate.

## Performance and Quality Assurance

### Content Quality Metrics
THE system SHALL track average post length to ensure substantive discussions.

THE system SHALL measure user engagement through reply rates and discussion depth.

WHEN discussions fall below quality thresholds, THE system SHALL recommend reviewer attention to moderators.

### User Participation Standards
THE system SHALL limit users to 10 posts per day and 50 comments per day to prevent spam flooding.

THE system SHALL reward constructive engagement through reputation score increases.

WHERE users demonstrate consistent quality contributions, THE system SHALL reduce their content moderation requirements.

### Community Health Indicators
THE system SHALL monitor political discussion sentiment to identify potential community polarization.

THE system SHALL track economic discussion accuracy through citation verification processes.

WHEN community health metrics decline, THE system SHALL alert administrators to take corrective action.

---