# Special Cases and Moderation — Requirement Analysis

## 1. Introduction & Scope
This document describes all business requirements and workflows related to content reporting, moderation, escalation, and handling edge-case scenarios for the community platform. The goal is to enable accurate, robust implementation of content safety, moderator interventions, and abuse prevention.

## 2. Reporting Inappropriate Content
### Overview
Members can report content they believe violates platform policies. Reports can be made on posts, comments, images, and community-level behavior.

### Functional Requirements (EARS Format)
- WHEN a member views any post, comment, or uploaded image, THE system SHALL display a reporting option attached to that item.
- WHEN a member submits a report for content, THE system SHALL require a report reason selected from a predefined list (e.g., spam, harassment, hate, NSFW, off-topic, self-promotion, other).
- WHEN the report reason is "other," THE system SHALL provide a free-text input for additional details (max 500 characters).
- WHEN a report is submitted, THE system SHALL timestamp the report, associate it with the reporting user and content, and mark it as "pending."
- THE system SHALL rate limit content reporting to a maximum of 10 reports per 24-hour period per user to prevent abuse.
- IF a guest attempts to report content, THEN THE system SHALL deny the action and prompt for login/registration.
- THE system SHALL notify moderators of the affected community and allow only moderators of that community (or admins) to access the report for resolution.

### Reference to Other Documents
- All reasons must comply with guidelines in [Policies and Compliance](./10-policies-and-compliance.md).

## 3. Moderator Actions & Responsibilities
Moderators are responsible for the review and action of reported content, with certain permissions and processes.

### Functional Requirements (EARS Format)
- WHEN a moderator accesses the moderation dashboard for their managed communities, THE system SHALL display a list of all unresolved reports, sorted newest first.
- WHEN a moderator selects a report, THE system SHALL display the reported content, history of prior reports/decisions, and recent actions taken.
- WHEN a moderator acts on a report, THE system SHALL offer the following outcomes:
  - Dismiss (content does not violate policy)
  - Remove content (content violates policy)
  - Temporary ban user (duration options: 1 hour, 1 day, 7 days, 30 days)
  - Permanent ban user (only available to admins)
  - Pin content (if relevant, e.g. for clarification or community warning)
- WHEN a moderator removes content or bans a user, THE system SHALL record this action, associate it with the responsible moderator/admin, and notify the affected user with the precise reason chosen.
- WHEN a member accumulates 5 or more reports in a rolling 7-day period, THE system SHALL flag this user for elevated review by moderators.
- IF a moderator attempts to take action outside their permission (e.g., ban user platform-wide), THEN THE system SHALL prohibit the action and provide an explanation.
- WHEN a report is resolved, THE system SHALL mark it as resolved and retain an immutable audit trail for compliance.

### Permission Matrix (Summary)
| Action | Member | Moderator | Admin |
|---------------------------|--------|-----------|-------|
| Report Content            | ✅     | ✅        | ✅    |
| View Reports              | ❌     | ✅ (own community) | ✅ (all) |
| Act on Reports            | ❌     | ✅ (own community) | ✅ (all) |
| Temporary Ban             | ❌     | ✅ (own community) | ✅ (all) |
| Permanent Ban             | ❌     | ❌        | ✅    |
| Remove Content            | ❌     | ✅        | ✅    |
| Escalate Report           | ❌     | ✅        | ✅    |

Refer to [User Roles and Authentication](./02-user-roles-and-authentication.md).

## 4. Escalation Flows (Report Processing)
### Event Flows
- WHEN a moderator cannot resolve a report (e.g., ambiguity, conflict of interest), THE system SHALL provide an option to escalate the report to admins for final decision.
- WHEN a report is escalated, THE system SHALL notify all relevant admins and prioritize the report in the admin queue.
- WHEN an admin resolves an escalated report, THE system SHALL log the decision and any notes provided for legal and compliance records.
- IF a moderator does not resolve a report within 48 hours, THEN THE system SHALL automatically escalate it to admin review.
- WHEN a report is submitted against a moderator or admin, THE system SHALL bypass the community-level review and send it directly to admins.

## 5. Edge & Abuse Scenarios
### Handling Abuse and Limits
- WHEN a member mass-reports content (more than 10 different items in 24h), THE system SHALL temporarily restrict reporting privileges for 24 hours and log this as a warning.
- WHEN the system detects rapid posting, voting, or reporting from a single account (suspected bot), THE system SHALL subject the account to automated verification (e.g., captcha) before allowing further action.
- IF a banned user attempts to interact (post, comment, vote, report), THEN THE system SHALL block the action and provide the ban reason, duration, and next appeal step.
- WHEN multiple members report the same content (>=5 unique reports), THE system SHALL auto-hide the content pending moderator review, without deleting it.
- WHEN a moderator or admin is the subject of repeated reports (>=3 within 7 days), THE system SHALL notify another admin for peer review and to prevent abuse of power.

## 6. Mermaid Diagrams for Core Flows

### Reporting Inappropriate Content Flow
```mermaid
graph LR
  A["User Views Content"] --> B["Clicks 'Report' Button"]
  B --> C["Selects Reason"]
  C --> D{ "Reason = Other?" }
  D -->|"Yes"| E["Enter Free-Text Detail"]
  D -->|"No"| F["Submit Report"]
  E --> G["Submit Report"]
  F --> H["Record Report, Mark Pending"]
  G --> H
  H --> I["Notify Moderators"]
```

### Moderator Handling and Escalation
```mermaid
graph LR
 subgraph "Moderator Workflow"
   A["Moderator Views Reports"] --> B["Review Content & Report"]
   B --> C{ "Rule Violation?" }
   C -->|"Yes"| D["Remove Content / Ban User"]
   C -->|"No"| E["Dismiss Report"]
   D --> F["Notify Reporter & User"]
   E --> F
   C -->|"Ambiguous or Conflict"| G["Escalate to Admin"]
 end
 subgraph "Admin Workflow"
   G --> H["Admin Review"]
   H --> I["Final Resolution"]
 end
```

## 7. Developer Implementation Notes
> *Developer Note: This document defines business requirements only. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*
