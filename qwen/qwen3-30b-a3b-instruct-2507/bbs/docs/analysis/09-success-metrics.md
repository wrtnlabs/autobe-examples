# Success Metrics and Key Performance Indicators (KPIs)

## Primary KPIs

### Daily Active Users (DAU)
THE system SHALL calculate and report the number of unique users who actively engage with the discussion board within a 24-hour period.

WHEN a user performs any interaction with the platform (viewing a thread, posting a comment, upvoting content, or changing their profile), THE system SHALL increment the daily active count for that user's account.

THE system SHALL maintain DAU records with a 24-hour window based on UTC timezone.

THE system SHALL generate daily reports showing DAU by date and compare current DAU to previous periods.

### Monthly Active Users (MAU)
THE system SHALL calculate and report the number of unique users who engage with the discussion board within a 30-day period.

THE system SHALL aggregate user activity over a rolling 30-day window to determine MAU.

THE system SHALL generate monthly reports showing MAU trends and compare year-over-year (YoY) and month-over-month (MoM) changes.

### User Retention Rate (7-Day and 30-Day)
WHEN a user registers and creates their first post, THE system SHALL record their account creation date and first activity date.

THE system SHALL calculate 7-day retention as the percentage of users who return to the platform at least once within 7 days of their first interaction.

THE system SHALL calculate 30-day retention as the percentage of users who return to the platform at least once within 30 days of their first interaction.

THE system SHALL maintain retention rate data for each month's cohort of new users.

### Thread Creation Rate
THE system SHALL count and report the number of new discussion threads created per day.

WHEN a user submits a new thread with a title and initial post content, THE system SHALL record the creation timestamp and increment the daily thread creation counter.

THE system SHALL generate daily reports showing new thread volume and compare it to the previous period.

### Average Daily Replies per Thread
THE system SHALL calculate and report the average number of replies received by threads per day.

THE system SHALL count all replies to threads during a 24-hour period and divide by the number of active threads on that day.

THE system SHALL maintain this metric and generate daily reports showing discussion engagement levels.

## User Engagement Metrics

### Average Session Duration
THE system SHALL measure and report the average time users spend on the platform during each session.

WHEN a user logs in, THE system SHALL begin tracking session start time.

WHEN a user logs out, closes their browser, or becomes inactive for 15 minutes, THE system SHALL end the session and record the duration.

THE system SHALL calculate the average session duration across all users and generate daily reports.

### Average Posts per User
THE system SHALL calculate and report the average number of posts created by each user per month.

THE system SHALL count all posts (primary threads and replies) created by users and divide by the total number of active users in each reporting period.

THE system SHALL maintain this metric and generate monthly reports showing user contribution levels.

### Upvote Rate (Positive Engagement)
THE system SHALL track and report the rate at which users engage with content through upvoting.

WHEN a user clicks the upvote button on a post or comment, THE system SHALL increment the upvote count for that item and record the interaction.

THE system SHALL calculate the average upvote rate per post as the number of upvotes divided by the number of views within 24 hours.

THE system SHALL generate daily reports showing discussion evolution patterns and identify highly engaging content.

### Content Discovery Rate
THE system SHALL measure and report how often users discover new content through the platform's search and recommendation features.

WHEN a user searches for keywords or uses the discovery feed, THE system SHALL record the search query or feed interaction.

THE system SHALL track the number of content items users view after initiating a search or browsing the discovery feed.

THE system SHALL calculate the content discovery rate as the percentage of search/search feed interactions that result in users viewing content (excluding empty search results).

### User Activation Conversion Rate
WHEN a user completes the account registration process but has not yet created any content, THE system SHALL mark them as a new user.

THE system SHALL measure the percentage of new users who create their first post within 7 days of registration.

THE system SHALL generate weekly reports showing activation conversion rates and identify bottlenecks in onboarding.

## Content Quality Indicators

### Thread Quality Score
THE system SHALL calculate and report a thread quality score for each discussion thread.

THE system SHALL assign a quality score based on the ratio of valuable contributions to the total content volume.

THE system SHALL calculate thread quality score as: (number of upvoted posts / total posts) × 100.

THE system SHALL maintain quality scores for all threads and generate reports showing changes over time.

### Reply Growth Rate
THE system SHALL measure and report the rate at which discussion threads grow over time.

THE system SHALL track the number of replies to a thread in relation to time since creation.

THE system SHALL calculate reply growth rate as: (current reply count - initial reply count) / initial reply count, calculated every 24 hours.

THE system SHALL generate daily reports showing thread vitality and identify stagnating discussions.

### Report-to-Action Ratio
THE system SHALL track and report the ratio of content reports to actions taken by moderators.

WHEN a user reports inappropriate content, THE system SHALL create a report ticket and classify it.

THE system SHALL record all actions taken by moderators on reported content (approved, rejected, removed, etc.).

THE system SHALL calculate the report-to-action ratio as: (number of reports processed) / (number of reports filed).

THE system SHALL generate weekly reports showing moderation effectiveness and identify areas for improvement.

### Inappropriate Content Detection Rate
THE system SHALL measure the effectiveness of both automated and human moderation in identifying inappropriate content.

THE system SHALL compare the number of inappropriate posts detected by automated systems to those flagged by community reports.

THE system SHALL calculate the detection rate as: (number of inappropriate posts identified before publication) / (total number of inappropriate posts).

THE system SHALL generate monthly reports showing detection accuracy and identify false positive and negative patterns.

## Business Performance Measures

### Revenue per User
THE system SHALL calculate and report the average revenue generated from each user.

IF the discussion board implements monetization through subscriptions or premium features, THE system SHALL track user subscription status and billing data.

THE system SHALL calculate revenue per user as: total monthly revenue / total number of active users.

THE system SHALL generate monthly reports showing revenue performance and identify high-value user segments.

### User Lifetime Value (LTV)
THE system SHALL calculate and report user lifetime value based on long-term engagement and contribution.

THE system SHALL track user activity from first interaction through the entire lifecycle.

THE system SHALL calculate LTV as: average monthly revenue per user × average user lifespan in months.

THE system SHALL generate quarterly reports showing LTV trends and identify factors that influence user retention.

### Cost per User Acquisition (CPA)
THE system SHALL track and report the cost of acquiring new users through marketing efforts.

THE system SHALL aggregate all marketing expenses (ad spend, content promotion, referral bonuses) for each acquisition channel.

THE system SHALL calculate CPA as: total marketing spend / number of users acquired through that channel.

THE system SHALL generate monthly reports showing CPA by channel and identify most cost-effective acquisition strategies.

### User-to-Moderator Ratio
THE system SHALL calculate and report the ratio of users to moderators.

THE system SHALL count the total number of active users and the number of active moderators in each reporting period.

THE system SHALL calculate the user-to-moderator ratio as total active users / number of active moderators.

THE system SHALL generate monthly reports showing moderation workload and identify when additional resources are needed.

## Goal Setting and Targets

### Short-Term Goals (0-6 Months)

#### DAU Target
THE system SHALL achieve a minimum of 1,500 daily active users within 6 months of launch.

THE system SHALL implement a 15% week-over-week growth target for DAU during the first quarter.

#### MAU Target
THE system SHALL reach 5,000 monthly active users within 6 months of launch.

THE system SHALL maintain a 25% month-over-month growth rate for MAU.

#### User Retention Target
THE system SHALL achieve at least 40% 7-day retention rate among new users within 3 months of launch.

THE system SHALL reach at least 25% 30-day retention rate within 6 months.

#### Thread Creation Target
THE system SHALL establish a daily thread creation rate of at least 50 new discussions within the first 3 months.

THE system SHALL grow thread creation by 10% each month.

### Medium-Term Goals (6-12 Months)

#### DAU Target
THE system SHALL achieve a minimum of 5,000 daily active users within 12 months of launch.

THE system SHALL maintain consistent DAU growth of at least 20% month-over-month.

#### MAU Target
THE system SHALL reach 20,000 monthly active users within 12 months.

THE system SHALL achieve a DAU/MAU ratio of at least 25%.

#### User Retention Target
THE system SHALL achieve at least 60% 7-day retention rate among new users.

THE system SHALL reach at least 45% 30-day retention rate.

#### Community Health Target
THE system SHALL maintain a thread quality score of at least 70 across all threads.

THE system SHALL ensure at least 80% of reports result in appropriate action within 48 hours.

### Long-Term Goals (12+ Months)

#### Business Sustainability Target
THE system SHALL achieve positive contribution margin on its core activities within 18 months of launch.

THE system SHALL reach a revenue per user of at least $2.00 per month.

#### Community Scale Target
THE system SHALL achieve a minimum of 15,000 daily active users.

THE system SHALL maintain a user-to-moderator ratio of no more than 200:1.

#### User Engagement Target
THE system SHALL achieve an average of 3.5 posts per active user per month.

THE system SHALL maintain an average session duration of at least 8 minutes.

## Measurement Methodology

### Data Collection Framework

#### User Identification
THE system SHALL identify users through their unique account ID, which is generated upon registration and remains constant throughout their lifecycle.

THE system SHALL maintain a central user registry that includes:
- User account ID
- Registration date
- Last activity timestamp
- Account status (active, suspended, deleted)
- Relationship to other users (if applicable)

#### Event Tracking Infrastructure
THE system SHALL implement a comprehensive event tracking system that captures all user interactions with the platform.

Each tracked event shall include:
- Event type (e.g., 'post_created', 'comment_replied', 'upvoted')
- User account ID
- Timestamp (ISO 8601 format)
- Source (e.g., mobile web, desktop web, mobile app)
- Context (which thread, which content item)

#### Time Window Definitions

##### Daily Metrics
Daily metrics shall be calculated using UTC timezone with a 24-hour window from 00:00:00 to 23:59:59.

##### Monthly Metrics
Monthly metrics shall be calculated using UTC timezone with a 30-day window from the 1st to the last day of each calendar month.

##### Cohort Analysis
Cohort analysis shall group users by their first activity date (registration date) and track their engagement metrics over time.

#### Calculation Procedures

##### Total User Counts
THE system SHALL calculate total user counts by counting unique account IDs in the user registry.

THE system SHALL update counts in real-time for active users and perform batch processing for active history data.

##### Activity Sessions
THE system SHALL calculate session duration by subtracting the session start time from the session end time.

A session shall be considered complete when:
- The user logs out
- The user closes their browser
- The user becomes inactive for more than 15 minutes

##### Quality Scoring
THE system SHALL calculate thread quality score by dividing the number of upvoted posts by the total number of posts in the thread.

Only posts with at least one upvote shall be included in the numerator.

#### Data Processing and Reporting

##### Processing Schedule

THE system SHALL perform the following processing schedule:
- Real-time: DAU, MAU, thread creation count
- Hourly: Session duration, upvote rate, report-to-action ratio
- Daily: User retention, content growth rate, user-to-moderator ratio
- Weekly: Report-to-action ratio, content discovery rate
- Monthly: Revenue per user, LTV, CPA, thread quality score

##### Report Generation
THE system SHALL generate regular reports according to the following schedule:
- Daily reports: Available by 9:00 AM UTC each day
- Weekly reports: Available by 10:00 AM UTC every Monday
- Monthly reports: Available by 12:00 PM UTC on the 2nd business day of each month

Reports shall include:
- Current period metrics
- Period-over-period comparisons
- Trend analysis
- Comparison to targets
- Key insights and recommendations

#### Verification and Accuracy

##### Data Quality Checks
THE system SHALL implement continuous data quality checks to ensure the accuracy and completeness of collected metrics.

The system shall verify:
- All events are properly timestamped
- User identifications are consistent across all systems
- Time window calculations are correct
- Mathematical calculations are accurate

##### Error Detection and Correction
THE system SHALL detect anomalies in metric data through statistical analysis.

IF the system detects a suspicious spike or drop in a metric (beyond 3 standard deviations), THE system SHALL flag the data for review.

THE system SHALL automatically correct minor data inconsistencies (e.g., timestamp formatting issues) but shall require human review for significant anomalies.

##### Auditing and Historical Tracking
THE system SHALL maintain complete audit trails for all metric calculations.

The system shall store:
- Raw event data for at least 90 days
- Calculation logs for all processed metrics
- Reporting history with version control

##### Cross-Validation
THE system SHALL implement cross-validation by comparing metrics from different data sources.

For example, the system shall compare reported user counts from the user registry against session activity data to identify potential discrepancies.

## Related Documents

For detailed user scenarios, please refer to the [User Journey Documentation](./05-user-journeys.md).
For the authentication process, please refer to the [Security and Authentication Guide](./03-user-roles.md).
For the business rules governing content and user behavior, see the [Business Rules and Constraints](./07-business-rules.md).
Database structure can be found in the [Entity Relationship Diagram](./06-erd.md).

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*