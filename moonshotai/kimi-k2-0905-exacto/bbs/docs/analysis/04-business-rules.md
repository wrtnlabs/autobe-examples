# Business Rules and Validation Requirements

## Document Purpose

This document defines the complete business rules and validation requirements for the Economic/Political Discussion Board system. The rules ensure content quality, system security, and appropriate user behavior while maintaining the platform's focus on simple, meaningful discussion of economic and political topics.

THE system SHALL enforce these rules automatically without requiring manual intervention except for escalated moderation decisions. All validation SHALL complete within specified time limits to maintain responsive user experience.

## 1. Content Validation Rules

### Article Content Requirements

WHEN users create articles, THE system SHALL validate content against specific criteria to ensure quality discussions:

**WHEN** a user submits article content, **THE** system **SHALL** require:
- Title containing minimum 10 characters and maximum 200 characters with meaningful economic or political topic focus
- Article body with minimum 50 characters and maximum 10,000 characters providing substantial discussion content
- Category selection restricted to approved list: Economics, Politics, Business, International Trade, Fiscal Policy, Monetary Policy, Global Economy
- Language primarily in English for community accessibility requiring translation resources when necessary

**WHEN** article content includes non-English language, **THE** system **SHALL** accept content **IF** primary discussion topic relates to economic or political matters suitable for community interest, and **THE** system **SHALL** reject content containing spam, advertising, completely unrelated topics, or posts requiring translation for majority understanding.

**Examples of acceptable content:**
- Economic policy analysis with supporting data
- Political commentary with factual citations
- Market trend discussions with professional insights
- International trade impact assessments

**THE** system **SHALL** prevent duplicate submissions by checking whether similar content has been posted within the prior 1-hour window by the same user account.

### Comment Content Standards

**WHEN** members post comments, **THE** system **SHALL** enforce these requirements:
- Comment length: minimum 10 characters and maximum 1,000 characters 
- Content relevance to the parent article discussion topic referencing specific economic or political points
- Prohibition of personally identifiable information about other users including real names, contact details, or addresses
- Respectful discourse maintaining professional standards appropriate for public economic/political discussion forums

**THE** system **SHALL** provide immediate feedback when comments fail validation showing specific error messages explaining required corrections.

### Content Prohibitions with Enforcement

**THE** system **SHALL** automatically reject content containing:
- Personally identifiable information such as telephone numbers, email addresses, residential addresses, or identification documents
- Threats of violence, intimidation, or harm toward individuals, groups, government officials, or economic entities
- Commercial advertising, promotional content, referral links, or spam unrelated to economic/political discussions
- Content violating local laws regarding economic discussions, political speech, securities regulations, or election-related communications
- Identical duplicate submissions from the same user within a 1-hour posting window
- Content promoting illegal economic activities, market manipulation, or illicit political actions

**WHEN** prohibited content is detected, THE system SHALL immediately prevent submission and provide specific error messages explaining violations with references to relevant Community Guidelines sections.

## 2. File Attachment Business Rules

### File Format and Size Restrictions

**WHEN** members upload file attachments, THE** system **SHALL** accept only these supported formats with strict size limitations:

**Image Attachments:**
- Accepted formats: JPG, JPEG, PNG, GIF, WebP (all common web-optimized formats)
- Maximum file size: 5MB per individual image file
- Resolution limit: maximum 8000x8000 pixels to prevent system overload

**Document Attachments:**
- Accepted formats: PDF, DOC, DOCX, TXT (research papers, policy documents, analysis reports)
- Maximum file size: 2MB per individual document file
- Page limit: maximum 100 pages per PDF document for system performance

**Spreadsheet Attachments:**  
- Accepted formats: XLSX, CSV (economic data, charts, stock information, statistics)
- Maximum file size: 3MB per individual spreadsheet file
- Row limit: maximum 10,000 rows per spreadsheet to prevent processing delays

**WHEN** users attempt unsupported file types, THE system SHALL display clear error message: 
"Only images (JPG, PNG, GIF up to 5MB), documents (PDF, DOC, TXT up to 2MB), and spreadsheets (XLSX, CSV up to 3MB) are permitted. Please convert your file to an accepted format."

### Security and Malware Protection

**WHEN** file attachments are uploaded, THE system SHALL perform security validation:
- Automated virus and malware scanning taking maximum 30 seconds per file
- Rejection of files containing malicious code, suspicious macros, or executable content masquerading as documents
- Scanning of embedded links within documents for safe destinations
- Hash-based duplicate detection to prevent identical file uploads across different posts

**IF** malware is detected, THEN THE system **SHALL** immediately reject the upload with user notification, log the security incident with user identification and timestamp for administrative review, and escalate repeated malware upload attempts to moderators for potential account sanctioning.

### Access Control and Inheritance

**THE** system **SHALL** ensure attachment access matches parent article security settings:
- Public articles SHALL have publicly downloadable attachments accessible to all user types
- Member-only articles SHALL restrict attachment downloads to authenticated members only
- Draft or pending articles SHALL hide all attachments until approval status changes to published

**WHEN** article visibility changes, THE system SHALL automatically update attachment access permissions to maintain data security consistency without requiring manual intervention.

## 3. User Conduct and Account Management Rules

### Registration Standards and Identity Verification

**THE** system **SHALL** enforce these account creation standards:
- Username: 3-30 characters containing alphanumeric characters (a-z, A-Z, 0-9) plus underscores and hyphens
- Password: minimum 8 characters including at least one uppercase letter (A-Z), one lowercase letter (a-z), one numeric digit (0-9), and special characters encouraged for enhanced security
- Email: valid email format with standard RFC 5322 validation including verification link activation within 24 hours
- Username uniqueness checking preventing impersonation of government officials, famous economists, or trademarked entities
- Age restriction ensuring users are minimum 16 years old with parental consent verification available for younger participants

**THE** system **SHALL** prevent registration from temporary email providers known for creating disposable accounts, and SHALL require valid domain-based email addresses for business or educational institutional affiliation when available.

### User Behavior Expectations

**THE** system **SHALL** maintain these conduct standards for community quality:
- Prohibition of account impersonation including government officials, economists, public figures, or claiming false professional credentials
- Single account policy enforcement with automated detection of multiple accounts from identical IP addresses, devices, or browser fingerprints
- Username change limitations allowing modifications only once per 30-day period to maintain user recognition and accountability
- Ban on automated tools creating multiple accounts for coordinated posting or manipulation of discussions
- Requirements for respectful discourse suitable for professional economic/political forums including proper language standards and civil disagreement protocols

### Content Posting Ethics and Professional Standards

**WHEN** users create content, THE system **SHALL** enforce ethical posting practices:
- Proper citation requirements when quoting statistical data, economic research, policy documents, or expert analysis
- Disclosure obligations for potential conflicts of interest in financial discussions including investment positions, professional affiliations, or consulting relationships
- Honest representation requirements for educational credentials, work experience, or professional expertise claims
- Prohibition on sharing insider trading information, non-public economic data, or confidential government documents
- Respect for fair use copyright laws requiring appropriate attribution when sharing charts, graphics, or substantial text excerpts

## 4. Content Editing and Deletion Policies

### Time-Based Edit Restrictions

**THE** system **SHALL** apply these modification limitations:
- **WHILE** user is logged in as the original author, **THE** system **SHALL** allow content edits within 1 hour of original posting timestamp showing "Edited" indicator for transparency
- **AFTER** the 1-hour editing window expires, **THE** system **SHALL** lock article content against member modifications, providing option to contact moderators for essential corrections
- **THE** comment modification privilege **SHALL** extend 30 minutes from original posting for quick corrections and typo fixes
- **THE** system **SHALL** preserve complete edit history tracking all versions with modification timestamps and author identification for community transparency

### Moderator Editorial Authority

**WHILE** authenticated as designated moderators, **THE** system **SHALL** provide enhanced editing capabilities:
- Article content corrections for misinformation, fact-checking errors, or missing contextual information requiring community accuracy standards
- Comment revision authority for inappropriate language, off-topic discussions, or policy compliance improvements
- Temporary content suspension options for swift response to emergency policy violations requiring immediate community protection
- Author notification requirements when editorial changes occur, including edit reason summaries and appeal contact information

## 5. Moderation Triggers and Community Management

### Automated Content Screening Criteria

**THE** system **SHALL** automatically flag content for moderator review when detection criteria indicate:

**Profanity and Inappropriate Language Detection:**
- Articles or comments containing words from community standards profanity filter updated monthly
- Rapid posting behavior indicating possible spam campaigns (3+ posts within 10 minutes from new accounts)
- Content receiving multiple user reports exceeding threshold of 5 reports within 24-hour period
- Potential misinformation identification through automated keyword analysis, unreliable source citations, or statistical data verification failures

**Behavioral Pattern Analysis:**
- New user accounts posting at abnormal frequency immediately after registration
- Use of URL shorteners linking to potentially unsafe external resources
- Content formatting suggesting attempts to circumvent content filters or spam detection
- Cross-reference matching against known fraudulent content or previously banned materials

### Community Reporting and Moderation Queue

**THE** system **SHALL** provide comprehensive reporting mechanisms:
- One-click reporting button with standardized reason codes: Misinformation, Harassment, Spam, Copyright Violation, Off-topic Content
- Optional comment field allowing users to provide detailed context explaining their report reasoning
- Automated acknowledgement system confirming user reports and estimated review timeline (1-4 business hours)
- Privacy protection for reporting users with anonymity preserved in community-facing communications

**WHEN** content is reported, THE moderation queue **SHALL** prioritize based on urgency:
- High priority: safety-related reports describing threats, harassment, legal violations requiring immediate attention
- Standard priority: content quality complaints, off-topic discussions, minor rule infractions processed within 24 hours
- Low priority: improvement suggestions, formatting corrections, content organization requests handled during routine maintenance

## 6. System Performance and Volume Management

### Content Creation Limits by User Type

**THE** system **SHALL** enforce these posting restrictions to prevent spam maintaining discussion quality:

**Member Users:**
- Maximum 5 article submissions per 24-hour period across all categories
- Maximum 25 comments per article per 24-hour period to prevent comment spamming
- Maximum 10 username mentions across all comments per 24-hour period
- 30-second minimum delay required between consecutive posts to prevent rapid spam activity

**Moderator Users:**
- Unlimited article creation capacity for community management and important announcements
- Unlimited comment posting privileges for moderation guidance and policy explanation
- Enhanced attachment upload limits allowing 10 files per article for administrative communications

**Guest Users:**
- Maximum 50 article views per continuous session without registration encouragement
- Read-only access with commenting prompts directing towards community participation

### Resource Management Thresholds

**THE** system **SHALL** monitor resource usage implementing protective thresholds:

**Storage Allocation:**
- Individual member account storage: 500MB maximum for all file attachments combined
- Automatic notification when users approach 75% of storage allowance encouraging cleanup
- Graceful degradation reducing upload capabilities when storage limits exceeded
- Storage summary dashboard showing usage breakdown by file type and attachment age

**Performance Monitoring:**
- Search functionality rate limiting: 30 queries per hour for guests, 300 queries per hour for authenticated members
- Article browsing protection: maximum 100 articles per IP address per hour preventing scraping activities
- Login attempt protection: maximum 5 failed attempts per hour before temporary account lockout (30 minutes)
- Attachment download monitoring: maximum 50 file downloads per IP address per day

## 7. Success Metrics and Enforcement Effectiveness

**THE** discussion board system **SHALL** measure rule effectiveness through automated tracking:

**Content Quality Metrics:**
- Percentage of articles requiring moderator review compared to total submissions (target: <15%)
- Proportion of user reports resulting in substantive content modification (target: >60% action rate)
- User satisfaction scores regarding content quality and community discussions (target: >4.0 on 5-point scale)
- Retention rate of active contributors posting weekly for 90+ days (target: >45%)

**System Performance Indicators:**
- Content validation processing time averaging under 2 seconds for standard submissions
- File attachment scanning completing within 30-second maximum processing window
- Moderator queue clearing timeframe maintaining 24-hour resolution goal for 95% of reported items
- User account provisioning completing within 5-minute time limit from registration initiation

**THE** business rules documentation **SHALL** be reviewed quarterly by development and operations teams ensuring rule effectiveness and community appropriateness while maintaining simple, focused discussion environment for economic and political topics. All automated enforcement mechanism SHALL provide user-friendly feedback explaining rule violations with specific guidance for compliance improvement.

[This document connects to [Functional Requirements Document](./02-functional-requirements.md) for implementation details and [User Scenarios Document](./03-user-scenarios.md) for user experience context.]