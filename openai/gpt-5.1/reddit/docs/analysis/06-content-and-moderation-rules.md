# Content and Moderation Rules Requirements – communityPlatform

## 1. Content Policy Overview

### 1.1 Purpose and Scope

THE communityPlatform SHALL provide a structured set of content and moderation rules that protect user safety, support open discussion, and maintain legal and ethical compliance across all communities.

THE content policy rules in this document SHALL apply to all user-generated content, including but not limited to posts, comments, community descriptions, usernames, and any associated metadata that carries user-visible information.

WHERE a community defines additional local rules, THE communityPlatform SHALL treat those local rules as supplements that cannot override or weaken platform-level content policies.

### 1.2 Categories of Content

For business and moderation purposes, content is classified into the following conceptual categories:

- Fully allowed content: Content that complies with all platform policies and community rules.
- Sensitive but allowed content: Content that is allowed but may require labeling, age gating, or opt-in visibility (for example, adult topics, graphic discussions without explicit imagery).
- Restricted content: Content that is allowed only under strict conditions, such as legal obligations, geographic restrictions, or age restrictions.
- Disallowed content: Content that must not be hosted, displayed, or promoted on the platform, such as explicit illegal content, hate speech, severe harassment, or dangerous content encouraging self-harm.

THE communityPlatform SHALL maintain an internal policy taxonomy that assigns each piece of content one or more policy-relevant attributes (for example, "NSFW", "sensitive", "restricted by jurisdiction", "under review").

### 1.3 High-Level Policy Principles

THE communityPlatform SHALL prioritize user safety, legal compliance, and respectful participation over unrestricted expression when these interests conflict.

THE communityPlatform SHALL support community self-governance through communityModerator actions, while reserving platformAdmin authority for cross-community and severe policy violations.

WHEN content violates platform-level policies, THE communityPlatform SHALL ensure that platform-level decisions override any community-level decisions that would otherwise allow the content to remain visible.

WHEN multiple policies apply to a single piece of content, THE communityPlatform SHALL apply the strictest applicable policy outcome.

### 1.4 Relationship to Reporting and Safety

WHEN a user reports content as inappropriate, THE communityPlatform SHALL treat the report as an input signal into the moderation workflow defined in this document and in the reporting requirements described in the reporting and safety requirements documentation.

IF content is removed or restricted as a result of reports, THEN THE communityPlatform SHALL record the association between the reports and the moderation action for later audit and review.


## 2. Community-Level Moderation Rules

### 2.1 Actors and Responsibilities at Community Level

- guestUser: May view public communities and see which content is available or removed based on their visibility level but cannot perform moderation actions.
- memberUser: May create content and, where granted community-specific roles (for example, becoming a communityModerator), may moderate within that community.
- communityModerator: Has elevated rights within specific communities they manage, including enforcing local rules, handling reports, and managing member behavior within those communities.
- platformAdmin: May intervene in any community and override communityModerator decisions when enforcing platform-level policies.

THE communityPlatform SHALL allow different communities to have distinct sets of communityModerators.

WHERE a user holds the communityModerator role for a community, THE communityPlatform SHALL grant them the full set of community-level moderation capabilities defined in this section for that community only.

### 2.2 Scope of Community-Level Authority

WHEN a communityModerator performs moderation actions, THE communityPlatform SHALL restrict those actions to content and users within the communities for which that moderator has authority.

IF a communityModerator attempts to act on content outside their communities, THEN THE communityPlatform SHALL deny the action and record an authorization failure for audit.

WHERE a community has defined additional local rules in its description or configuration, THE communityPlatform SHALL allow communityModerators to enforce those rules provided they do not conflict with platform-wide policies.

### 2.3 Allowed Community Moderator Actions on Content

#### 2.3.1 Content Removal at Community Level

WHEN a communityModerator determines that a post or comment violates community rules but not necessarily platform-wide policies, THE communityPlatform SHALL allow the communityModerator to remove the content from visibility within that community.

WHEN a communityModerator removes content, THE communityPlatform SHALL mark the content as removed by moderator while preserving enough internal data to support audit and potential reinstatement.

WHEN a memberUser views a thread that contains removed content, THE communityPlatform SHALL display a clear indication that content was removed by community moderation, without displaying the original content body.

IF a guestUser accesses a thread containing removed content, THEN THE communityPlatform SHALL prevent exposure of the removed content body and show only a neutral placeholder.

#### 2.3.2 Content Locking at Community Level

Content locking is defined as preventing further direct user interactions (for example, new comments, edits, or votes) while preserving existing visibility.

WHEN a communityModerator locks a post or comment, THE communityPlatform SHALL prevent new comments, replies, and edits on that item while allowing users to continue viewing existing content.

WHEN content is locked, THE communityPlatform SHALL display an indicator to authenticated users that the content is locked and cannot accept new interactions.

IF content is locked for a temporary period based on community policy, THEN THE communityPlatform SHALL allow communityModerators to later unlock the content and restore normal interaction behavior.

#### 2.3.3 Content Pinning or Highlighting at Community Level

WHERE community rules allow highlighting important posts, THE communityPlatform SHALL permit communityModerators to mark certain posts as pinned or featured within that community.

WHEN a post is pinned within a community, THE communityPlatform SHALL treat the pin as a presentation preference for that community-only context without altering the post’s global policy status.

#### 2.3.4 Editing of Community Metadata

WHEN a communityModerator edits community-level metadata (for example, description, rules, labels), THE communityPlatform SHALL validate that the new metadata does not conflict with platform-wide policies (for example, does not contain disallowed content).

IF a communityModerator attempts to save metadata that violates platform content policy, THEN THE communityPlatform SHALL reject the update and provide a reason indicating the policy conflict.

### 2.4 Community-Level User Sanctions

WHEN a communityModerator identifies a memberUser who repeatedly violates community rules, THE communityPlatform SHALL allow the communityModerator to apply community-level sanctions such as temporary or permanent bans from that community.

WHEN a community-level ban is applied to a memberUser, THE communityPlatform SHALL prevent that user from creating new posts or comments in that community while preserving their access to other communities where they are not banned.

IF a banned user attempts to interact with a community from which they are banned, THEN THE communityPlatform SHALL reject the action and indicate that the user is banned from that community.

WHERE a communityModerator lifts a community-level ban, THE communityPlatform SHALL restore the user’s ability to participate in that community as a normal memberUser.


## 3. Platform-Level Moderation Rules

### 3.1 Platform-Level Policy Enforcement

THE platformAdmin actor SHALL be responsible for enforcing global content policies that apply across all communities.

WHEN content is flagged as potentially violating global policies (for example, illegal content, hate speech, severe harassment, or explicit non-consensual imagery), THE communityPlatform SHALL allow platformAdmin to review and take action regardless of community preferences.

IF a conflict arises between a community decision and a platform-wide decision, THEN THE communityPlatform SHALL treat the platform-wide decision as authoritative.

### 3.2 Global Content Sanctions

WHEN platformAdmin determines that a post or comment violates platform-wide policy, THE communityPlatform SHALL support full removal of that content from all user-facing contexts across the platform.

WHEN platform-level removal occurs, THE communityPlatform SHALL ensure that neither guestUser nor memberUser nor communityModerator can access the original content body in any standard user workflow.

WHERE legal or compliance obligations require preservation of evidence, THE communityPlatform SHALL retain internal-only records of removed content and associated moderation actions for an appropriate retention period defined by business policy.

WHEN content is removed at platform level, THE communityPlatform SHALL notify affected communityModerators that the removal was due to platform policy, not solely community rules, to help them understand enforcement boundaries.

### 3.3 User Account Sanctions at Platform Level

WHEN platformAdmin identifies severe or repeated policy violations by a user account, THE communityPlatform SHALL allow platformAdmin to apply user-level sanctions that apply across all communities.

Possible sanctions include:
- Platform-wide warning.
- Temporary posting suspension.
- Temporary login restriction.
- Permanent account ban.
- Restrictions on creating new communities.

WHEN a platform-wide sanction is in effect for a user, THE communityPlatform SHALL enforce all applicable restrictions for that user across all communities and features.

IF a sanctioned user attempts an action that is prohibited by their current sanction state, THEN THE communityPlatform SHALL block the action and present a message indicating that their account is restricted.

### 3.4 Cross-Community Pattern Detection

WHERE a user repeatedly violates policies in multiple communities, THE communityPlatform SHALL treat this pattern as a platform-level concern and allow platformAdmin to review aggregated violations.

WHEN a cross-community pattern of abuse is confirmed, THE communityPlatform SHALL allow platformAdmin to escalate sanctions from community-level actions to platform-wide account-level actions.


## 4. Content Removal and Locking Rules

### 4.1 Definitions in Business Terms

For clarity of backend behavior, the following business terms are used consistently:

- Soft removal: Content is no longer visible to general users, but is retained internally for audit, appeal, or legal purposes.
- Hard removal: Content is permanently removed such that its body and non-essential metadata are no longer available to any actor except where business policy requires aggregated statistics or logs.
- Locking: Content remains visible but no longer accepts new interactions, such as comments, replies, or edits.
- Hiding: Content is hidden in standard feeds and listings for certain users or contexts but may still be visible to moderators and platformAdmin.

THE communityPlatform SHALL support at least soft removal and locking as distinct states for posts and comments.

WHERE hard removal is executed, THE communityPlatform SHALL ensure it happens only under platformAdmin authority or under business rules defined for sensitive legal requests.

### 4.2 Triggers for Removal or Locking

WHEN content is reported by users as inappropriate and reaches a predefined severity or volume threshold, THE communityPlatform SHALL flag the content for moderator review and optionally apply temporary hiding while under review, depending on platform policy.

WHEN communityModerator or platformAdmin manually marks content as violating policies, THE communityPlatform SHALL immediately apply the appropriate removal or locking action based on the selected enforcement type.

IF content is associated with urgent categories (for example, credible threats of violence, self-harm encouragement, or explicit illegal content), THEN THE communityPlatform SHALL prioritize immediate removal or hiding ahead of standard review queues.

WHERE automated signals (for example, high downvote ratios, spam indicators) mark content as suspicious, THE communityPlatform SHALL allow configuration of rules that automatically hide or queue content for manual review without permanently removing it.

### 4.3 Visibility Rules for Removed or Locked Content

WHEN content is soft removed at community level, THE communityPlatform SHALL prevent guestUser and regular memberUser from viewing the original content body while showing a placeholder that indicates the removal reason category in business terms (for example, "Removed by community moderators").

WHERE content is soft removed, THE communityPlatform SHALL still allow communityModerator and platformAdmin to access the content body and key metadata through moderation tools for the purposes of appeals, further sanctions, and audits.

WHEN content is hard removed, THE communityPlatform SHALL ensure that no standard user or moderator interface exposes the content body, and SHALL retain only what is required for legal or audit tracking.

WHEN content is locked, THE communityPlatform SHALL allow users to view existing content and associated votes but SHALL prevent all new comments, replies, and edits on that item.

IF content is locked due to age (for example, auto-lock after a certain time), THEN THE communityPlatform SHALL apply the lock automatically according to configured policies without requiring manual moderator action.

### 4.4 Relationship with Sorting and Feeds

WHEN content has been removed or hidden, THE communityPlatform SHALL exclude such content from normal feeds, sorting modes (hot, new, top, controversial), and search results for users who are not authorized to see moderated content.

WHERE moderators and platformAdmin require visibility into removed or hidden content, THE communityPlatform SHALL provide specialized views or filters that include moderated content without exposing it to regular users.


## 5. Appeals and Reinstatement Rules

### 5.1 User Rights to Appeal

THE communityPlatform SHALL allow memberUser and communityModerator to appeal moderation decisions that affect their own content or their own account status.

WHEN content is removed or locked, THE communityPlatform SHALL provide the content creator with a clear indication of the action taken and a path to submit an appeal, subject to limits on frequency and time windows defined by business policy.

IF a user attempts to appeal a decision after the allowed time window has expired, THEN THE communityPlatform SHALL reject the appeal and indicate that the appeal window has closed.

WHERE a community-level decision is appealed, THE communityPlatform SHALL route the appeal first to the relevant communityModerators and, optionally, to platformAdmin if escalated.

### 5.2 Community-Level Appeal Workflow

WHEN a community-level moderation decision (for example, removal of a post within a community) is appealed by the content creator, THE communityPlatform SHALL notify the communityModerators responsible for that community.

WHEN communityModerators review an appeal, THE communityPlatform SHALL present them with the original content body, removal reason, associated reports, and any historical context necessary to make a decision.

WHEN a communityModerator upholds the original decision, THE communityPlatform SHALL keep the moderation action in place and record that the appeal was denied.

WHEN a communityModerator overturns the original decision, THE communityPlatform SHALL reinstate the content’s visibility within that community or adjust the moderation action accordingly (for example, convert removal to locking or tagging).

IF communityModerators do not respond to an appeal within a reasonable timeframe defined by business policy, THEN THE communityPlatform SHALL optionally escalate the appeal to platformAdmin or notify the user about the delay based on configured rules.

### 5.3 Platform-Level Appeal Workflow

WHEN a platform-level moderation decision (for example, platform-wide removal, account suspension) is appealed, THE communityPlatform SHALL route the appeal to platformAdmin.

WHEN platformAdmin reviews a platform-level appeal, THE communityPlatform SHALL present consolidated data including original content, policy categories applied, past violations by the user, and any relevant legal notes.

WHEN platformAdmin upholds a platform-level decision, THE communityPlatform SHALL maintain the existing sanctions or removals and mark the appeal as closed.

WHEN platformAdmin overturns or modifies a platform-level decision, THE communityPlatform SHALL update content visibility and user sanctions accordingly, and record the new status as the authoritative one.

WHERE a platform-level appeal results in reinstatement of content, THE communityPlatform SHALL ensure that any community-level policies or settings that would still prevent visibility are respected, applying the strictest applicable rule.

### 5.4 Communication of Appeal Outcomes

WHEN an appeal is resolved at either community or platform level, THE communityPlatform SHALL notify the appealing user of the outcome and provide a summary reason in business terms (for example, "Content violates hate speech policy" or "Action overturned after review").

IF an appeal leads to stricter sanctions than originally applied (for example, appeal reveals a more serious violation), THEN THE communityPlatform SHALL clearly indicate that the review resulted in upgraded enforcement.


## 6. Interactions with Reporting and Safety

### 6.1 From Reports to Moderation Actions

WHEN a user reports content using defined reporting mechanisms, THE communityPlatform SHALL associate the report with the specific content item, reporter, and chosen reason categories.

WHEN a threshold of severity or quantity of reports is reached for a content item, THE communityPlatform SHALL prioritize that item in moderation queues for communityModerators and platformAdmin as appropriate.

WHERE policies specify that certain report reasons require immediate action (for example, imminent harm, illegal content), THE communityPlatform SHALL expedite the moderation process, allowing platformAdmin or designated moderators to take swift removal or restriction actions.

IF multiple reports are found to be abusive or false (for example, coordinated brigading) after review, THEN THE communityPlatform SHALL allow platformAdmin to disregard their influence on moderation queues and potentially sanction the abusive reporters in line with abuse-prevention policies.

### 6.2 Protection against Abuse of Moderation Tools

WHEN a communityModerator repeatedly misuses moderation powers (for example, removing content that clearly complies with policy to silence legitimate users), THE communityPlatform SHALL allow platformAdmin to review moderator behavior and restrict or revoke their moderator status.

WHEN platformAdmin revokes a communityModerator role due to abuse, THE communityPlatform SHALL transfer or redistribute pending moderation tasks to other appropriate moderators or platformAdmin.

WHERE a pattern of targeted removal or locking is identified against a specific user without valid policy justification, THE communityPlatform SHALL flag this behavior for platform-level review to protect users from unfair treatment.


## 7. Non-Functional and Auditability Expectations for Moderation

### 7.1 Responsiveness of Moderation Actions

WHEN a communityModerator or platformAdmin issues a moderation action such as removal, locking, or sanctioning a user, THE communityPlatform SHALL apply the action in user-facing views within a few seconds so that affected content and capabilities reflect the new state promptly.

WHEN a user submits an appeal, THE communityPlatform SHALL confirm receipt immediately in the user experience and ensure that the appeal is queued for moderator review without noticeable delay.

### 7.2 Audit and Traceability Requirements

THE communityPlatform SHALL maintain an internal history of moderation actions, including actor, action type, target content or user, timestamp, and high-level reason categories.

WHEN a dispute or legal inquiry arises, THE communityPlatform SHALL provide authorized platformAdmin with a chronological view of relevant moderation actions to support investigation.

WHERE a moderation action is modified or overturned (for example, appeal reinstates content), THE communityPlatform SHALL append a new audit record rather than overwriting the original, preserving the full action history.

### 7.3 Consistency of Policy Application

THE communityPlatform SHALL strive for consistent application of rules across similar cases by providing moderators with standardized reason categories and guidance text when performing actions.

WHEN policies are updated, THE communityPlatform SHALL ensure that new moderation actions follow the updated rules while historical actions remain recorded according to the policies in effect at the time.


## 8. Business-Level Summary

THE communityPlatform SHALL define clear, enforceable content policies and moderation workflows that empower communityModerators to manage their communities while preserving platformAdmin authority to enforce global rules.

THE communityPlatform SHALL prioritize user safety, legal compliance, and fairness in all moderation decisions, ensuring that content removal, locking, and user sanctions are transparent, auditable, and subject to appeal within defined limits.

THE communityPlatform SHALL treat the definitions and flows in this document as business requirements only and SHALL leave all technical implementation decisions, including architecture, APIs, storage, and integration mechanisms, to the development team.