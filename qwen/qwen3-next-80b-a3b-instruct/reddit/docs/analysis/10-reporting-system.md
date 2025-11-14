# Reporting and Moderation System Requirements

## Reporting Trigger Conditions

### WHEN a user views any post, comment, or community profile, THE system SHALL display a "Report" button if the user is authenticated.

### WHERE a user is a guest, THE system SHALL hide the "Report" button and redirect to the login page with a message: "You must be logged in to report content."

### WHEN a post or comment contains potentially harmful content, THE system SHALL enable reporting for all member and moderator actors.

### WHERE a post or comment is flagged as potentially violating community standards, THE system SHALL allow reporting regardless of user karma level.

### WHILE a user is viewing their own post or comment, THE system SHALL hide the "Report" button to prevent self-reporting.

### WHEN a post or comment has already been reported and is under review, THE system SHALL display "Already reported" instead of the report button and disable further reporting until the report is resolved.

### WHERE a user has already reported the same post or comment within the last 24 hours, THE system SHALL prevent duplicate reporting and display: "You've already reported this content. Please wait 24 hours before reporting again."

## Reporting Workflow Steps

### WHEN a member clicks the "Report" button on a post, THE system SHALL open a modal with the following options:

- "Spam or irrelevant"
- "Harassment or targeted abuse"
- "Hate speech or violent content"
- "Sexually explicit content"
- "Misinformation or false claims"
- "Copyright violation"
- "Other"

### WHEN the user selects one of the options, THE system SHALL display a text input field labeled: "Additional details (optional)"

### WHEN a user submits a report, THE system SHALL validate:

- The user is authenticated
- The targeted content exists and is active
- The user has not reported the same content in the last 24 hours
- The report category is one of the predefined options

### IF the validation fails, THEN THE system SHALL display:

- "You cannot report your own content" (if user reported own content)
- "You've already reported this content. Please wait 24 hours before reporting again." (if duplicate)
- "Invalid report type" (if category is invalid)
- "Content not found" (if target has been deleted or is inactive)

### WHEN validation passes, THE system SHALL:

- Create a new report record with unique ID, timestamp, reporter ID, target ID (post or comment), category, and optional description
- Queue the report for review by the nearest available moderator or admin
- Increment the "report count" field on the target object
- Emit audit event: "REPORT_CREATED" with all metadata
- Send confirmation to user: "Thank you for reporting this content. Our moderators will review it within 24 hours."

## Report Types Classification

### THE system SHALL classify reports into the following categories, each with distinct escalation rules:

| Category | Priority | Escalation Path | Response Time Expectation |
|----------|----------|------------------|---------------------------|
| Harassment or targeted abuse | High | Direct to Admin | Within 2 hours | 
| Hate speech or violent content | High | Direct to Admin | Within 2 hours |
| Sexually explicit content | High | Direct to Admin | Within 2 hours |
| Copyright violation | Medium | Community Moderator | Within 24 hours |
| Spam or irrelevant | Low | Community Moderator | Within 48 hours |
| Misinformation or false claims | Medium | Community Moderator | Within 24 hours |
| Other | Low | Community Moderator | Within 48 hours |

### WHERE a report is classified as "High" priority, THE system SHALL immediately notify all Platform Admins via in-system alert and email.

### WHERE a report is classified as "Medium" or "Low" priority, THE system SHALL assign it to the moderator of the community where the content was posted.

### WHEN a moderator receives a report, THE system SHALL display:

- The full content of the post or comment
- The reporter's username (without contact info)
- The report category and description
- The post's karma, comment count, and creation date
- The reporter's karma and account age
- The post's previous moderation history

## Moderator Action Workflow

### WHEN a moderator or admin reviews a report, THE system SHALL allow the following actions:

- "Dismiss" - Remove the report without action; no content removal
- "Remove Content" - Delete the post or comment and notify the author
- "Warn User" - Remove content and send a warning message to the author
- "Temporary Ban" - Remove content, warn user, and suspend account for 7 days
- "Permanent Ban" - Remove content, warn user, and permanently suspend account
- "Lock Post" - Prevent further comments on post without removing it
- "Clear All Reports" - Remove all reports on this content and reset report count

### WHEN a moderator selects "Remove Content", "Warn User", or any ban option, THE system SHALL:

- Delete the post or comment and mark it as "Removed by Moderator"
- Add a public but non-identifying note: "This content was removed for violating community guidelines."
- Decrease the author's karma by: 20 for warning, 50 for temporary ban, 100 for permanent ban
- Log the action with moderator ID, timestamp, reason, and action type
- Notify the author via in-app notification and email

### WHEN a moderator selects "Dismiss" or "Clear All Reports", THE system SHALL:

- Remove the report from the queue
- Decrement the report count on the content
- Log the decision with moderator ID and reason
- Notify the reporter: "Your report on this content has been reviewed and dismissed. No action was taken."

### WHEN a moderator applies "Temporary Ban" or "Permanent Ban", THE system SHALL:

- Immediately revoke all active JWT tokens for the banned user
- Prevent new session creation from the banned account
- Block the user's IP address for 7 days after temporary ban (with configurable TTL)
- Hide all future content from the banned user from public feeds

### WHERE an admin performs any action on a report, THE system SHALL auto-revoke all moderator privileges from the community where the content was posted if the action was "Permanent Ban" or involved "Hate speech or violent content".

## User Notification Rules

### WHEN a report is dismissed, THE system SHALL send a notification to the reporter:

- "Your report on [Content Type] was reviewed and dismissed. This helps us understand false reports."

### WHEN a report results in content removal, THE system SHALL notify both the author and the reporter:

- To author: "Your [post/comment] was removed for violating our rules on [selected category]."
- To reporter: "Thank you for helping keep our community safe. The content you reported has been removed."

### WHEN a user is banned, THE system SHALL notify the user:

- "Your account has been suspended for [7 days/permanently] due to violations of our community guidelines. You may appeal this decision by contacting support@communityplatform.com."

### WHEN a user receives a warning, THE system SHALL notify the user:

- "This is your first warning. Continued violations will result in a temporary suspension."

### WHERE the user has received 2 or more warnings in the past 30 days, THE system SHALL send warning on report action in bold text: "⚠️ This is your third warning. Your next violation will trigger an automatic 7-day suspension."

## Report Processing Time Limits

### WHILE a report is in "Pending Review" state, THE system SHALL:

- Display "Under review" to the reporter and author
- Show estimated resolution time based on category priority

### IF a High-priority report remains unresolved after 4 hours, THE system SHALL:

- Escalate to all Platform Admins
- Send automated reminder email to all moderators in the community
- Apply "High Priority" banner in moderator dashboard

### IF a Medium-priority report remains unresolved after 36 hours, THE system SHALL:

- Send auto-reminder to the assigned community moderator
- Add the report to a "Overdue" list visible to admins

### IF a Low-priority report remains unresolved after 72 hours, THE system SHALL:

- Automatically assign the report to another moderator in the same community
- If still unresolved after 96 hours, escalate to Platform Admin

### THE system SHALL assign reports to moderators based on:
- Community affiliation
- Moderator availability
- Historical accuracy rating (moderator performance score)

## Appeal Process for Removed Content

### WHERE a user's content has been removed, THE system SHALL allow the user to submit an appeal within 14 days.

### WHEN a user submits an appeal, THE system SHALL require:

- A confirmation checkbox: "I understand I may be permanently banned if this appeal is found false."
- A text field: "Explain why you believe this was a mistake."

### WHEN an appeal is submitted, THE system SHALL:

- Create a new "Appeal" record linked to the original report and removal log
- Notify the Platform Admin team
- Set the appeal status to "Under Review"
- Send notification to user: "Your appeal has been received. A Platform Admin will respond within 5 business days."

### WHEN a Platform Admin reviews an appeal:

- IF the appeal is approved, THE system SHALL:
  - Restore the removed content
  - Remove the moderator's action from the audit log
  - Restore lost karma to the user
  - Notify the user: "Your content has been restored. We apologize for the error."
  - Notify the original reporter: "The content you reported has been restored after review."

- IF the appeal is denied, THE system SHALL:
  - Maintain the removal action
  - Update the user’s warning count if not already applied
  - Notify the user: "Your appeal has been denied. The action stands."
  - Add "Appeal Denied" to audit trail

### WHERE a user submits 3 or more appeals within 6 months, THE system SHALL:

- Flag the user as "High Risk for Abuse"
- Require all future reports against this user to be reviewed by Admin, not Moderator
- Add a warning to their profile: "User has multiple failed appeals. Enhanced monitoring active."

## Historical Audit Trail

### THE system SHALL maintain a tamper-proof audit trail for all reporting and moderation events.

### The audit trail SHALL include for every event:

- Event type: "REPORT_CREATED", "MODERATOR_ACTION", "APPEAL_SUBMITTED", "APPEAL_APPROVED", "APPEAL_DENIED"
- Timestamp (ISO 8601)
- Actor ID (Reporter, Moderator, Admin)
- Target ID (Post ID or Comment ID)
- Action Taken (e.g., "Remove Content", "Permanent Ban", "Dismiss")
- Category Selected (e.g., "Hate speech or violent content")
- Associated Description (if provided)
- Karma Change (with delta value)
- IP Address of actor at time of action
- Device ID (if available)
- Previous report count on target
- Post karma at time of action

### THE system SHALL store audit trail entries for a minimum of 3 years.

### WHEN a Platform Admin views the audit trail, THE system SHALL:

- Allow filtering by actor, date range, action type, or user ID
- Display user’s real username and actor role
- Never expose reporter’s private information (email, IP, device) to public or moderators
- Show a read-only copy of each logged record
- Support export as CSV or JSON for legal compliance requests

### WHERE legal authorities request moderation logs, THE system SHALL provide a redacted audit trail:

- Redact reporter’s personal information
- Keep all actions, reasons, and decisions fully visible
- Only expose IP and device ID to verified legal requestors with court order

### THE system SHALL prevent any user, including Admins, from modifying or deleting audit trail entries.

### ALL audit trail records SHALL be cryptographically signed during creation and verifiable at any time.

### WHEN a user requests their personal data under privacy regulations, THE system SHALL:

- Include all reports they have filed
- Include all moderation actions taken against their content
- Exclude reports filed against them
- Exclude backend system logs
- Deliver in a machine-readable format within 14 days

### THE system SHALL maintain integrity of audit trail by:

- Writing logs to write-once storage
- Never allowing DELETE or UPDATE operations on audit records
- Using blockchain-style hash chaining for tamper detection
- Performing monthly integrity verification