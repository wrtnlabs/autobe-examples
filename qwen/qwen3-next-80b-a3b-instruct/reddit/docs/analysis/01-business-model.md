## Business Model

### Revenue Strategy

The communityPlatform will implement a diversified revenue strategy to ensure sustainable financial growth while preserving user experience. The platform will generate revenue through three integrated channels: advertising, premium subscriptions, and optional monetization features for content creators.

#### Advertising Model

THE system SHALL offer non-intrusive, contextually relevant advertising to guests and free-tier members to generate primary revenue.

WHEN a user views a post listing (home feed, community feed, or search results), THE system SHALL insert one (1) promoted post every 10th position in the feed.

THE promoted post SHALL be clearly labeled with a "Sponsored" badge in a muted color (e.g., #757575) and shall not support voting or commenting.

THE displayed sponsored content SHALL be targeted based on community affinity, post keywords, and user subscription history, but shall NOT use personal data (email, IP, device ID) for targeting.

IF a user reports a sponsored post as inappropriate, THEN THE system SHALL immediately remove the post from rotation and initiate a review by the moderation team.

#### Premium Subscription (CommunityPlus)

WHEN a member upgrades to CommunityPlus, THE system SHALL remove all advertisements from all user interfaces and enable exclusive features.

THE subscription SHALL be offered at a monthly rate of $4.99 or an annual rate of $49.99 (16% discount).

A trial period of 14 days SHALL be offered to all new members, during which they can access all premium features at no cost.

During the trial period, users SHALL NOT be charged unless they explicitly confirm payment details.

WHEN a user cancels their CommunityPlus subscription, THE system SHALL continue premium access until the end of the current billing cycle and then downgrade the account to free tier.

WHILE a user has an active CommunityPlus subscription, THE system SHALL:

- Display all posts with no advertisements
- Allow no ads in any community feed, profile page, or notification center
- Permit viewing of full-size images without any watermarking or branding
- Enable enhanced profile customization options (custom badge, profile banner, color themes)
- Allow extended post editing window (48 hours instead of 24 hours)
- Unlock advanced post sorting filters (e.g., show only posts with 100+ votes)

#### Content Creator Monetization

WHERE a member has posted at least 50 accepted posts or comments that received at least 1,000 total upvotes combined, THE system SHALL enable them to apply for Creator Monetization.

WHEN approved as a Creator, THE system SHALL allow them to attach an optional "Support Me" tip button to their profile.

WHEN a user clicks the "Support Me" button, THE system SHALL redirect to a secure third-party payment processor (e.g., Stripe)

THE platform SHALL retain 10% service fee on all tips received by creators, with the remaining 90% paid directly to the creator.

Creators SHALL be able to view cumulative tip earnings in their profile dashboard but SHALL NOT be allocated any advertising revenue.

### User Acquisition Channels

THE platform SHALL acquire new users through organic, social, and referral-based methods.

THE system SHALL contain no paid advertising campaigns during the first 12 months of operation.

WHEN a member invites a friend to join using the built-in referral system, THE system SHALL award both users with +250 karma points.

A referral code SHALL be automatically generated for each member upon registration and shall be accessible via their profile settings.

WHEN a new user registers with a valid referral code, THE system SHALL auto-apply the referral bonus after email verification.

WHEN a community reaches 1,000 active subscribers, THE system SHALL automatically generate a "Featured Community" badge for that community and display it on the front page.

WHERE a community has been tagged as "New" for fewer than 14 days and has received at least 50 posts from 10 unique members within 7 days, THEN THE system SHALL highlight it in the "Discover" section.

### Growth Strategy

THE platform SHALL prioritize network effects and community-driven growth over paid user acquisition.

WHILE the total number of active communities exceeds 10,000, THE system SHALL gradually introduce a "Explore Trending" section on the homepage.

THE trending section SHALL be populated based on the 20 most-voted posts across all communities in the past 12 hours.

WHEN a post receives at least 500 upvotes within the first 60 minutes of being posted, THE system SHALL feature it in the "Trending»" banner on the top navigation bar.

WHILE a user remains logged in and active for more than 10 minutes, THE system SHALL recommend 3 additional communities based on their subscription history, post interactions, and search queries.

WHEN a user subscribes to a new community, THE system SHALL automatically suggest the top 3 most similar communities based on keyword overlap and membership overlap.

WHERE a member has been active for over 180 days and has participated in at least 50 unique communities, THEN THE system SHALL notify them that they qualify for a "Community Expert" title and badge.

THE system SHALL display the top 100 creators by total tip revenue on a standalone "Top Creators" page.

### Monetization Timeline

WHEN the platform reaches 50,000 monthly active users (MAU), THEN THE system SHALL launch the CommunityPlus subscription package.

WHEN the MAU reaches 150,000, THEN THE system SHALL automatically activate the Creator Monetization program for eligible users.

WHEN the platform reaches 500,000 MAU, THEN THE system SHALL analyze advertising performance and SHALL consider introducing targeted sponsored search results.

WHILE the percentage of paid subscribers exceeds 8% of total users, THE system SHALL NOT introduce any additional advertisements or sponsored content.

WHEN annual revenue per active user exceeds $35, THEN THE system SHALL allocate 10% of that surplus to community development grants.

### Cost Structure

THE platform SHALL incur fixed costs related to:

- Cloud hosting (compute, storage, and bandwidth)
- Domain registration and SSL certificates
- Email delivery services (for verification and notifications)
- Moderation tooling and support staff salaries
- Payment processor fees (Stripe, PayPal)
- Legal compliance and data privacy audits

THE system SHALL be optimized for cost efficiency by:

- Implementing image compression and caching for media assets
- Automatically archiving inactive communities after 365 days of inactivity
- Using serverless functions for non-critical background tasks (e.g., karma recalculation)
- Limiting database indexing to high-use fields only
- Deploying read replicas for high-demand endpoints (feed, search)

WHERE storage usage exceeds 100 TB, THEN THE system SHALL initiate automated data pruning of deleted posts and low-activity user accounts older than 2 years.

### Partnerships and Integrations

THE system SHALL integrate with the following external services:

- **Email delivery service**: SendGrid or Mailgun for email verification, password reset, and notifications
- **Media storage**: AWS S3 or Cloudinary for secure, scalable image hosting
- **Search engine**: Elasticsearch or Meilisearch for full-text search across posts and comments
- **Payment processing**: Stripe for subscription billing and creator tipping
- **Analytics**: Amplitude or Mixpanel for user behavior tracking (non-personalized analytics only)
- **Moderation AI**: Perspective API or similar for content risk scoring (opt-in only)

WHERE an external service becomes unavailable for more than 2 hours, THEN THE system SHALL display a maintenance banner and continue functioning in offline mode with reduced features (e.g., caching feed, disabling uploads).

THE platform SHALL NOT integrate with any identity providers (e.g., Google, Facebook, Apple) during Phase 1 to preserve user privacy and control.

WHEN any third-party service changes terms of service to require personal data sharing or behavioral tracking, THEN THE system SHALL migrate to an alternative provider within 30 days or disable the integration.

THE system SHALL never share user data with advertising partners.

THE system SHALL NOT use any third-party advertising network (e.g., Google AdSense, Taboola) for content monetization.

THE system SHALL maintain all content moderation policies internally and shall not outsource moderation to third-party companies.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*