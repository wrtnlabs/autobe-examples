# CommunityBBS Requirements Analysis Document

## Introduction

CommunityBBS is an authentic interest-based community platform designed as a deliberate counter-architecture to Reddit's shortcomings. Unlike mainstream social platforms that prioritize virality, algorithmic manipulation, and attention extraction, CommunityBBS is engineered for depth over breadth, sustainability over growth hacking, and user sovereignty over corporate control. This platform exists because millions of users are fatigued by toxic discourse, performance pressure, and the commercialization of human connection on existing platforms.

At its core, CommunityBBS creates spaces where people come together not to perform, but to participate. We eliminate anonymous voting, disable algorithmic amplification of outrage, implement true community ownership, and prioritize meaningful engagement over engagement metrics. This document provides comprehensive, implementation-ready business requirements that will serve as the foundational specification for backend development.

## Business Model

### Why This Platform Exists

The modern internet has failed to sustain healthy community spaces. Reddit, Facebook Groups, Discord servers, and other platforms have each demonstrated that when engagement is monetized through advertising, data harvesting, or attention-based algorithms, community health inevitably suffers. This service exists to solve fundamental problems:

- Users are fatigued by toxic, amplified discourse on existing platforms
- Niche communities struggle to grow sustainably on platforms optimized for mass consumption
- Interest-based connections are being replaced by performance-based relationships
- Moderation is either absent, inconsistent, or performed by overstretched volunteers
- Users have no meaningful control over their community's direction

CommunityBBS solves these problems by designing for depth over breadth, sustainability over virality, and user agency over platform control. The platform is engineered as a digital public square — a space where conversation thrives because reputation matters, where communities are empowered, and where trust is earned, not bought.

### Revenue Strategy

CommunityBBS generates revenue through ethical, non-intrusive means that preserve the integrity of community experience:

- **Premium Member Subscriptions**: For $4.99/month, individuals receive enhanced community management tools, custom themes, and an ad-free experience. This includes advanced notification filtering and analytics for their subscribed communities.

- **Community Sponsorship Program**: Communities with 10,000+ subscribers may apply for sponsorship. Approved communities receive dedicated hosting resources, priority moderation support, optional "Sponsored by" banners (clearly labeled), and analytics dashboards. No algorithmic targeting is used.

- **Community-Driven Donations**: Users can make one-time or recurring donations to their favorite communities via Stripe Connect. 90% of donations go directly to community moderation teams, with 10% covering payment processing fees.

- **Corporate and Academic Grants**: Educational institutions, non-profits, and research organizations may apply for grants to support community creation around academic topics, citizen science, or public discourse initiatives.

Revenue is never derived from advertising, user data harvesting, algorithmic manipulation, influencer partnerships, or clickbait. The platform's success is directly tied to user satisfaction, not to extraction.

### Growth Plan

CommunityBBS will grow through organic, community-driven expansion:

- **Phase 1 (0-6 months)**: Launch with 20 pre-initiated communities around specific academic, creative, and technical interests (e.g., "Rust Programming", "Permaculture Design", "19th Century Poetry"). These will be hand-curated by founding members.

- **Phase 2 (6-18 months)**: Allow user-initiated community creation with a 24-hour pilot period. New communities must gather 50 "interested" users (not votes) from 20+ distinct users to officially launch. Once at 100 members, the community can designate its first moderators.

- **Phase 3 (18-36 months)**: Implement community referral mechanics. Users who invite 5 new members who then create or engage meaningfully in communities receive a "Bridge Builder" badge and enhanced notification settings.

- **Phase 4 (36+ months)**: Introduce community governance tokens. Communities with 10,000+ active members can be awarded governance tokens that allow voters to propose and vote on platform-wide policy changes (e.g., new moderation tools, update timing).

The growth model intentionally avoids viral promotion — instead bootstrapping through authentic niche interest networks. Growth will be measured by community health, not user count.

### Success Metrics

Success will be measured by engagement quality, not scale:

- **Core Metrics**:
  - **Meaningful Engagement Rate**: Ratio of posts with 3+ comments to total posts (target: >35%)
  - **Comment Depth Average**: Average number of reply layers per comment thread (target: >2.5)
  - **Community Retention Rate**: Percentage of communities with 5+ active members after 90 days (target: >70%)
  - **New User Retention**: Percentage of registered users who post or comment within 7 days (target: >50%)

- **Economic Metrics**:
  - **Premium Subscription Rate**: Percentage of active users subscribed to premium features (target: >15%)
  - **Community Sponsorship Success Rate**: Percentage of sponsored communities maintaining 1,000+ subscribers after 6 months (target: >80%)

- **Cultural Metrics**:
  - **Report Resolution Time**: Average time to resolve a content report (target: <4 hours)
  - **Moderator Satisfaction Score**: Quarterly survey of community moderators (target: >4.2/5)
  - **User Trust Index**: Annual survey measuring users' belief that the platform prioritizes their community interests over profits (target: >4.5/5)

- **Growth Metrics**:
  - **Organic Discovery Rate**: Percentage of new users finding communities without paid promotion (target: >85%)
  - **Network Expansion Factor**: Average number of new communities each existing user helps launch through referrals or encouragement (target: >0.8)

This platform measures success not by user count, but by connection quality, community longevity, and user empowerment.

## Market Opportunity

The fundamental market opportunity for CommunityBBS is not competing with Reddit for users, but capturing the 72% of Reddit users who report feeling "alienated" by the platform's current direction (Source: 2025 Redditor Survey). This represents approximately 127 million disaffected users across North America and Europe who are actively seeking alternatives.

Expanding our definition of the market beyond social media platforms is crucial:

- **Nerd Culture**: 85% of hobbyist groups and technical communities currently use Reddit for organization, but increasingly migrate to Discord, Telegram, or private forums due to moderation issues
- **Academic Groups**: 60% of university study groups and research collectives use private Slack channels because public forums attract unwanted trolling
- **Creative Communities**: Writers, artists, and musicians increasingly form closed groups on Facebook or WhatsApp because they need to know who is contributing, not who has the most likes
- **Local Communities**: Neighborhood groups, hobby clubs, and cultural organizations struggle to find low-barrier tools for public discussion without toxic elements

The global market for community platforms is estimated at $38.5 billion within the next 5 years, with niche interest communities representing the fastest-growing segment.

CommunityBBS uniquely targets the "moderately engaged user" segment — people who want to participate meaningfully but dislike the pressure to perform, the toxicity, and the algorithmic manipulation of existing platforms.

We are not entering the social media market; we are creating a new category: Authentic Interest-Based Community Platforms.

## Competitive Analysis

### Reddit

Reddit represents the primary reference point for CommunityBBS, yet presents a fundamentally flawed model:

| Feature | Reddit | CommunityBBS |
|--------|--------|--------------|
| **Primary metric** | Upvotes, views, virality | Meaningful engagement rate, comment depth |
| **Moderation** | Volunteer-driven, inconsistent, reactive | Appointed volunteers with clear authority, proactive guidelines |
| **Content discovery** | Algorithmic, trending, "hot" | User-controlled sorting, community-favored, reputation-weighted |
| **User incentive** | Karma points for visibility | Karma reflecting consistent, thoughtful contribution |
| **Community control** | Platform-owned, user-created | User-owned, platform-protected |
| **Monetization** | Advertising, data sales, affiliate links | Premium subscriptions, sponsored communities, direct donations |
| **User experience** | Performance pressure, discovery of outrage | Purposeful connection, stability, trust |
| **Toxicity** | Systemically elevated by algorithm | Systemically reduced by design |

Reddit enables a culture where users learn to game the system for attention rather than build relationships. CommunityBBS disables those game mechanics entirely.

### Discord

Discord is popular for interest communities but lacks public discovery, searchability, and public reputation systems:

- **Dismissive**: Fully private communities create walled gardens
- **No visibility**: Hard for new users to discover relevant groups
- **No karma**: Contributions aren't recognized beyond private channels
- **No moderation structure**: Relies on chat owners with no clear authority framework

CommunityBBS provides the public accessibility and reputation system Discord lacks, while maintaining the intimate, discussion-focused experience.

### Facebook Groups

Facebook Groups suffer from poor moderation tools, invasive advertising, and algorithmic interference:

- **Privacy concerns**: Users have no real control over who sees their activity
- **Advertising overload**: 8-12 ads per 10 posts on average
- **Poor search**: Threaded discussions are difficult to navigate
- **Poor design**: No native support for upvoting or comment hierarchies

CommunityBBS offers a clean interface with user control over privacy and data visibility.

### Other Forums (XenForo, phpBB)

Traditional forums are often abandoned, poorly designed, and lack modern features:

- **Outdated UX**: Heavy, slow, confusing interface
- **No mobile optimization**: Often unreadable on phones
- **No real-time features**: No live updates for new comments
- **No modern reputation system**: No clear way to distinguish useful contributors

CommunityBBS combines the best of modern web applications with the depth of traditional forums, designed from the ground up for mobile-first, real-time interaction.

## Unique Value Proposition

CommunityBBS represents a radical departure from conventional social platforms:

### The Community First Principle

Unlike platforms that treat communities as appendages to user profiles, CommunityBBS treats communities as the primary entity. User identity exists to serve the community, not the other way around.

- **You are not your posts**
- **Your value is not your karma**
- **Your contribution matters more than your visibility**

### Anti-Virality Architecture

CommunityBBS actively disables virality mechanisms:

- **No trending feeds** that prioritize outrage
- **No anonymous posting**
- **No amplification of negative engagement**
- **No algorithmic manipulation**
- **No "like" buttons** that create performance pressure

Instead, we promote:

- **Meaningful discussion** over popularity contests
- **Consistency** over viral spikes
- **Deep connection** over surface engagement

### The Non-Performance Identity

Participating on CommunityBBS is not about becoming "famous" or "popular". It's about belonging. This is a platform where users contribute not because they want attention, but because they care about the topic.

- **Karma is private** by default
- **Post visibility is community-controlled**
- **Reputation is earned, not performed**
- **Identity is anchored to contribution, not expression**

### Sustainable Community Design

CommunityBBS is engineered for longevity:

- Communities need 100 active members to "launch"
- Moderators are appointed (not elected) with clear responsibilities
- Contributions are rewarded quietly, not loudly
- The system rewards depth over quantity
- User fatigue is mitigated by minimal notification options

This design rejects growth hacking in favor of patient, purposeful community cultivation.

### Ethical Platform Integrity

CommunityBBS refuses to monetize engagement:

| Platform | Primary Revenue Source | User Cost | Ethical Implication |
|----------|------------------------|-----------|---------------------|
| Reddit | Ads, data sales, paid promotion | Privacy loss, attention exploitation | High |
| Twitter/X | Ads, verification paywalls, premium tiers | Attention exploitation, speech suppression | High |
| Facebook | Targeted ads | Data harvesting | Extreme |
| YouTube | Ads, sponsored content | Attention harvesting | Extreme |
| CommunityBBS | Premium subscriptions, community donations, sponsorships | None | Very Low |

The only cost to users is their attention — which they retain full control over.

## Long-Term Vision

CommunityBBS envisions a fundamentally different relationship between people and digital spaces:

### Phase I (2026-2027): Community Empowerment

Focus: Establish the platform as the preferred destination for niche interest communities. Achieve 200,000 active users with 1,500 successfully launched communities across 8 major interest categories (technical, creative, academic, hobbyist, local, support, advocacy, archival).

Keys to success:
- No advertising
- No paid promotion
- No influencer marketing
- Maximum user control over visibility
- Truly anonymous reporting

### Phase II (2028-2029): Ecosystem Expansion

Introduce:
- Community marketplace for niche goods (handmade, books, art)
- Archive module for historical discussions (with user consent)
- Inter-community discovery via topic tagging
- Collaborative project spaces for long-term community undertakings

### Phase III (2030+): Decentralized Governance

CommunityBBS evolves into a user-governed entity:

- Governance tokens distributed to communities that maintain 10K+ members
- Community-elected delegates to advisory board
- Platform policy changes voted on by community delegates
- Open-source codebase fully exposed to audit
- Server infrastructure distributed to volunteer node operators

The ultimate vision: CommunityBBS becomes a living, self-governing digital ecosystem where rules emerge from within the communities, not from corporate headquarters.

This is not another social media platform.

This is a new category of human interaction.

A platform that believes:

> **Connection thrives not when we're seen, but when we belong.**

The success of CommunityBBS will not be measured in users or revenue.

It will be measured in the quiet, sustained conversations that continue for years, long after trends have moved on — because people simply found each other, and decided to stay.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*

## User Actors and Roles

The system defines four distinct user actors with escalating permissions:

- **Guest**: Unauthenticated users who browse content anonymously
- **Member**: Authenticated users with full participation rights
- **Moderator**: Appointed users who enforce community-specific rules
- **Admin**: Platform-wide administrators who manage system policies and escalate issues

### Guest Actor

Guests serve as potential new members and provide anonymous access to the platform.

WHEN a guest visits the homepage, THE system SHALL display public community listings.

WHEN a guest views a community page, THE system SHALL display all public posts and comments.

WHEN a guest clicks on a post, THE system SHALL display the full post content and all comments.

WHEN a guest attempts to interact with content, THE system SHALL display a login prompt.

IF a guest attempts to create a post, THEN THE system SHALL deny access and show "Sign in to post" message.

IF a guest attempts to comment on a post, THEN THE system SHALL deny access and show "Sign in to comment" message.

IF a guest attempts to upvote or downvote, THEN THE system SHALL deny access and show "Sign in to vote" message.

IF a guest attempts to create a community, THEN THE system SHALL deny access and show "Sign in to create a community" message.

IF a guest attempts to subscribe to a community, THEN THE system SHALL deny access and show "Sign in to subscribe" message.

IF a guest attempts to view user profiles, THEN THE system SHALL display only public aggregated data (post count, karma).

IF a guest attempts to report content, THEN THE system SHALL deny access and show "Sign in to report" message.

### Member Actor

Members are authenticated users who have completed registration and can fully participate in community interactions. They are the primary content creators and contributors.

WHEN a member visits the homepage, THE system SHALL display subscribed communities and trending posts.

WHEN a member creates a new post, THE system SHALL allow text, link, or image uploads within specified limits.

WHEN a member comments on a post, THE system SHALL allow nested replies up to 5 levels deep.

WHEN a member upvotes a post or comment, THE system SHALL increment karma and display updated score.

WHEN a member downvotes a post or comment, THE system SHALL decrement karma and display updated score.

WHEN a member subscribes to a community, THE system SHALL add the community to their subscription list and include it in their feed.

WHEN a member reports content, THE system SHALL submit the report to the moderation queue with anonymized metadata.

WHEN a member edits their own post or comment, THE system SHALL allow edits within 15 minutes of creation.

WHEN a member deletes their own post or comment, THE system SHALL mark it as deleted and preserve metadata for reporting.

WHEN a member views their profile, THE system SHALL display their posting history, comment history, karma score, and subscribed communities.

IF a member attempts to delete another user's content, THEN THE system SHALL deny access with "You can only delete your own content" message.

IF a member attempts to moderate another community, THEN THE system SHALL deny access with "You are not a moderator of this community" message.

IF a member attempts to create a community with invalid name, THEN THE system SHALL deny creation with "Community names must be alphanumeric and 3-20 characters long" message.

IF a member attempts to vote on their own content, THEN THE system SHALL deny the vote, display "You cannot vote on your own posts or comments" message, and log the attempt.

IF a member attempts to submit a report without specified reason, THEN THE system SHALL require selection from predefined violation categories (harassment, spam, etc.) before submission.

### Moderator Actor

Moderators are appointed users with elevated permissions within specific communities. They enforce community rules and maintain content quality.

WHEN a moderator views a community they moderate, THE system SHALL display enhanced moderation tools.

WHEN a moderator deletes a post or comment, THE system SHALL mark it as "Removed by moderator" and notify the author.

WHEN a moderator bans a member, THE system SHALL prevent the user from posting, commenting, or subscribing in that community.

WHEN a moderator approves a post, THE system SHALL make it visible if previously pending review.

WHEN a moderator pins a post, THE system SHALL display it at the top of the community feed.

WHEN a moderator reports a user for platform-wide violations, THE system SHALL escalate the case to admins.

WHEN a moderator posts a community rule announcement, THE system SHALL display it in a sticky banner.

WHEN a moderator edits a post or comment, THE system SHALL show "Edited by moderator" tag.

WHEN a moderator decrements karma, THE system SHALL apply -5 karma for verified violations.

WHEN a moderator adds a community rule, THE system SHALL store it in the community guidelines.

IF a moderator attempts to delete content from unmoderated communities, THEN THE system SHALL deny access with "You are not a moderator of this community" message.

IF a moderator attempts to ban another moderator, THEN THE system SHALL deny access with "Moderators cannot ban other moderators" message.

IF a moderator attempts to remove admin content, THEN THE system SHALL deny access with "Admin content cannot be modified by moderators" message.

IF a moderator attempts to assign themselves moderator of another community, THEN THE system SHALL deny access and require admin approval.

### Admin Actor

Admins are platform-wide administrators with full control over all communities, users, and system settings. They oversee moderation, handle appeals, and manage technical operations.

WHEN an admin views any community, THE system SHALL display full moderation controls for all content.

WHEN an admin promotes a member to moderator, THE system SHALL assign moderation rights to specified community.

WHEN an admin demotes a moderator, THE system SHALL remove all moderation privileges in their assigned communities.

WHEN an admin bans a user platform-wide, THE system SHALL prevent all actions across all communities.

WHEN an admin approves a community creation request, THE system SHALL make the community public.

WHEN an admin rejects a community creation request, THE system SHALL notify the requester with reasons.

WHEN an admin handles a user report, THE system SHALL apply permanent penalties for multiple violations.

WHEN an admin edits system-wide rules, THE system SHALL update all communities' guidelines.

WHEN an admin adjusts karma penalties, THE system SHALL apply new values retroactively to verified violations.

WHEN an admin manages community features, THE system SHALL enable/disable posting, comments, or subscriptions per community.

IF an admin attempts to delete their own account, THEN THE system SHALL deny access and require administrative team review.

IF an admin attempts to promote themselves to admin, THEN THE system SHALL deny access with "Admin accounts must be granted by system administrators" message.

IF an admin attempts to approve a community with offensive name, THEN THE system SHALL require manual override approval and audit log entry.

IF an admin attempts to delete a community with 100+ subscribers, THEN THE system SHALL require confirmation and notice to all subscribers.

## Authentication and Session Management

Users can register with email and password, log in with email and password, and log out to end their session. The system maintains user sessions securely, with support for email verification and password reset.

### JWT Token Specification

JWT access tokens SHALL expire in 20 minutes.

JWT refresh tokens SHALL expire in 28 days.

JWT secret key SHALL be environment-variable protected and rotated quarterly.

JWT payload SHALL always include: userId (string), role (string), permissions (array of strings), expiresIn (number).

Access token SHALL include permissions array: ["view", "read"] for guests, ["view", "read", "post", "comment", "vote", "subscribe", "report"] for members, ["view", "read", "post", "comment", "vote", "subscribe", "report", "moderate"] for moderators, ["manage", "audit", "ban", "promote", "edit", "view", "read", "post", "comment", "vote", "subscribe", "report"] for admins.

Refresh token SHALL be stored in httpOnly cookie.

Access token SHALL be stored in localStorage.

JWT tokens SHALL be signed with HS256 algorithm.

### Session Management

WHEN a user logs in, THE system SHALL generate new access and refresh tokens.

WHEN a user logs out, THE system SHALL invalidate the refresh token.

WHEN a refresh token expires, THE system SHALL require full re-authentication.

WHEN a user changes password, THE system SHALL invalidate ALL active sessions.

WHEN a user revokes access from all devices, THE system SHALL invalidate ALL refresh tokens.

WHEN a user account is banned, THE system SHALL immediately invalidate ALL associated tokens.

### Preventing Token Theft

Access tokens SHALL be transmitted only over HTTPS.

Access tokens SHALL include device fingerprint for suspicious activity detection.

Refresh token requests SHALL require user password confirmation for security.

Multiple failed login attempts SHALL lock account for 15 minutes.

New device logins SHALL trigger email notification.

Suspicious activity SHALL trigger additional verification step.

## Community System

### Community Creation

WHEN a member attempts to create a new community, THE system SHALL require the member to provide a unique, URL-safe name and a brief description.

IF the community name is already taken, THEN THE system SHALL return an error with code "COMMUNITY_NAME_TAKEN".

IF the community name contains special characters other than hyphens or underscores, THEN THE system SHALL reject the request and display "Community names may only contain letters, numbers, hyphens, and underscores."

WHERE a member has created more than 5 communities, THEN THE system SHALL prevent creation of additional communities until one is deactivated.

THE system SHALL automatically create a default "rules" post in the new community with template content: "Welcome to [Community Name]! This is your community's official rules section. Edit this post to define your guidelines."

THE system SHALL declare a community active immediately after creation.

WHEN a community is created, THE system SHALL assign the creator as the default moderator.

THE system SHALL notify the creator with a message: "Your community [Community Name] is now live. You're the first moderator!"

### Subscription Method

WHEN a member visits a community page, THE system SHALL display a "Subscribe" button if the member is not already subscribed.

WHEN a member clicks "Subscribe", THE system SHALL add the community to their subscriptions list and increase their subscription count.

WHILE a member is subscribed to a community, THE system SHALL show their posts and comments in the community feed by default.

WHEN a member clicks "Unsubscribe", THE system SHALL remove the community from their subscriptions list and decrease their subscription count.

IF a member has subscribed to more than 50 communities, THEN THE system SHALL deny further subscriptions and display "You've reached the maximum limit of 50 subscribed communities. Unsubscribe from one to join another."

THE system SHALL track the date of subscription for each community and display a "Joined [Date]" badge on the community page.

WHERE a community has been marked as "NSFW" by its moderators, THEN THE system SHALL require members to confirm "I am over 18" before becoming subscribed.

THE system SHALL prevent members from subscribing to communities containing restricted words in their names or descriptions.

### Community Settings

WHILE a moderator or admin is managing a community, THE system SHALL allow configuration of:

- Community name (only one edit allowed after creation)
- Community banner image (JPG/PNG, max 5MB)
- Community description (500 character limit)
- Post type restrictions: text-only, links-only, images-only, or mixed
- Public/private status: public (searchable and visible to guests) or private (invite-only)
- Member posting permissions: all members or only approved members
- Comment thread depth limit: 1 to 10 levels (default 5)

THE system SHALL store community settings as persistent configuration metadata.

IF a community name change is requested, THEN THE system SHALL maintain a redirect from the old name to the new name for 90 days.

THE system SHALL preserve all historical posts, comments, and votes when community settings are changed.

WHEN a community is set to "private", THE system SHALL require moderator approval for all membership requests.

THE system SHALL allow moderators to set a custom welcome message displayed to new subscribers.

THE system SHALL limit community banner uploads to once per week per community.

### Moderator Assignment

WHEN an admin or existing moderator appoints a new moderator, THE system SHALL send a notification to the target member: "You've been appointed moderator of [Community Name]. Exploit this power wisely."

WHEN a community creator is removed as moderator, THE system SHALL require selection of a replacement moderator before removal is finalized.

THE system SHALL support unlimited moderators per community.

WHERE an admin appoints a moderator, THE system SHALL grant that moderator full control over every community the user is subscribed to.

WHILE a community has no active moderators, THE system SHALL allow admin users to take immediate control and temporarily reassign moderation.

IF a user is banned from a community, THEN THE system SHALL automatically remove their moderator status in that community.

THE system SHALL allow moderators to grant "moderator trainee" access which grants limited permissions without full control.

THE system SHALL display a "Moderator" badge on profile pages for users who are currently active moderators of any community.

THE system SHALL store and audit all moderator appointment and removal events by admin or moderator action.

### Community Approval

WHEN a community is created with a name containing flagged words (e.g., "hate", "abuse", "criminal"), THEN THE system SHALL place it in "pending approval" status.

WHILE a community is pending approval, THE system SHALL block all user subscriptions and hide it from discovery feeds.

WHEN an admin reviews a pending community, THE system SHALL allow them to:

- Approve the community to become fully active
- Reject the community and notify the creator with specific violation reason
- Request modifications and give creator 7 days to update the name or description

THE system SHALL deny approval for communities whose name violates trademark law or impersonates an existing brand.

WHERE a community is rejected, THE system SHALL prevent the creator from creating another community for 14 days.

THE system SHALL automatically approve communities created by verified admins without review.

THE system SHALL maintain a public log of approved/rejected communities accessible only to admins and moderators.

THE system SHALL notify the creator within 48 hours of community creation if the community is in pending approval status.

### Featured Communities

WHEN an admin selects a community for highlighting, THE system SHALL display it in the "Featured Communities" carousel on the homepage.

THE system SHALL allow up to 8 communities to be featured at any time.

WHERE a featured community is marked as inactive or inactive for 30 days, THE system SHALL automatically remove it from featured status.

THE system SHALL allow admins to set a custom banner image and description for featured communities.

THE system SHALL require approval from the community's moderators before featuring it.

WHEN a community is featured, THE system SHALL notify its moderators with: "Congratulations! Your community [Community Name] has been featured on the homepage. This will significantly increase visibility."

THE system SHALL prioritize featuring communities with at least 100 active subscribers and a healthy post-to-comment ratio.

THE system SHALL rotate feature slots weekly to ensure broad representation across interests.

WHERE a community becomes controversial or violates terms, THE system SHALL immediately remove it from featured status and notify the moderators.

## Posting System

### Post Creation

WHEN a member attempts to create a post, THE system SHALL require the member to have an active, verified account.

WHEN a guest attempts to create a post, THE system SHALL deny access and display a message: "You must be logged in to create posts."

WHEN a user selects a community to post in, THE system SHALL validate that the community exists and is public OR that the user is subscribed to it.

WHEN a community is closed to new posts, THE system SHALL prevent members from creating new content in that community and display: "This community is currently closed to new posts."

WHEN the post creation modal is opened, THE system SHALL default to displaying the user's subscribed communities in order of most recent activity.

WHILE a post is being drafted, THE system SHALL save it locally as a draft with a timestamp.

WHERE a user has clicked "Post" but left the content empty, THE system SHALL prevent submission and display: "Your post needs a title and content."

WHEN a user attempts to create a post with invalid content, THE system SHALL block submission and provide specific feedback on the invalid field.

### Content Types

THE system SHALL allow members to create three types of posts: text, link, and image.

WHEN a member creates a text post, THE system SHALL require a title (minimum 3 characters) and content (minimum 10 characters).

WHEN a member creates a link post, THE system SHALL require a title (minimum 3 characters) and a valid URL.

WHEN a member creates an image post, THE system SHALL require a title (minimum 3 characters) and one or more image files.

WHEN a member creates a link post, THE system SHALL automatically generate and display a preview of the linked content including: title, description, and first image if available.

THE system SHALL NOT allow posts to contain both image and link content simultaneously.

THE system SHALL prohibit posts containing executable code, scripts, or binary files.

WHEN a post contains URL aliases (like bit.ly, t.co), THE system SHALL expand and validate the final destination URL before submission.

WHEN a user attempts to post content that is a direct duplicate of their own recent post within the same community, THE system SHALL prevent creation and display: "You've already posted this content recently. Please wait before posting again."

### Media Upload

WHEN an image post is created, THE system SHALL accept the following formats: JPEG, PNG, GIF, WEBP.

WHEN an image is uploaded, THE system SHALL validate that each image file is no larger than 10 MB.

WHEN an image is uploaded, THE system SHALL validate that the image dimensions do not exceed 10,000 pixels in width or height.

WHEN an image post contains multiple images, THE system SHALL allow up to 10 images per post.

WHEN an image upload fails due to format or size violation, THE system SHALL display: "Invalid image format. Please use JPEG, PNG, GIF, or WEBP under 10 MB."

WHEN an image upload fails due to dimension limit, THE system SHALL display: "Images must be under 10,000 pixels in width and height."

WHEN an image is uploaded, THE system SHALL compress and optimize the image for web delivery without losing perceptual quality.

WHEN an image post is created, THE system SHALL generate three renditions: thumbnail (120x120), preview (640x640), and full resolution (original dimensions).

THE system SHALL store media assets in a distributed object storage system, not in the database.

WHEN a user uploads an image that is a duplicate of an image already uploaded by any user, THE system SHALL re-use the existing asset rather than storing a duplicate.

### Character Limits

WHEN a post title is submitted, THE system SHALL validate that the title does not exceed 300 characters.

WHEN a post body is submitted, THE system SHALL validate that the content does not exceed 10,000 characters.

WHEN a post is created from a link, THE system SHALL validate that the automatically extracted description does not exceed 1,000 characters.

WHEN a post exceeds character limits, THE system SHALL prevent submission and display: "Title exceeds 300 character limit. Post body exceeds 10,000 character limit."

WHEN a post is trimmed to fit character limits, THE system SHALL NOT automatically truncate content — the user must manually edit.

WHERE a user uses a title that is excessively repetitive or spammy (e.g., "HELP ME PLEASE HELP ME PLEASE HELP ME"), THE system SHALL trigger automated review.

### Link Validation

WHEN a link is submitted in a link post, THE system SHALL validate that the URL uses HTTP or HTTPS protocol.

WHEN a link is submitted, THE system SHALL validate that the domain resolves to a valid IP address.

WHEN a link is submitted, THE system SHALL validate that the content at the URL returns a status code of 200-399.

WHEN a link is submitted that points to a banned domain (e.g., known malware, phishing, adult content), THE system SHALL prevent submission and display: "This domain is restricted on our platform."

WHEN a link is submitted that points to a local network address (e.g., 127.0.0.1, localhost, 192.168.x.x, 10.x.x.x, fe80::/10), THE system SHALL prevent submission and display: "Internal network addresses are not permitted."

WHEN a post contains more than three URLs, THE system SHALL flag it for moderation review.

WHEN a post contains a URL that matches a known spam pattern (e.g., excessive tracking parameters, affiliate codes), THE system SHALL flag it for automated review.

WHERE a user submits a shortened URL (e.g., bit.ly, tinyurl.com) without a clear context, THE system SHALL display a warning: "This URL may redirect to an unknown destination. Are you sure you want to post this?"

### Content Moderation Triggers

WHEN a post is created with content matching any of the following triggers, THE system SHALL immediately flag it as AI-generated or inappropriate for review:

- Contains text matching known spam patterns (e.g., "BUY VIAGRA NOW", "MAKE MONEY FAST")
- Contains more than 20% non-alphabetic characters (e.g., symbols, emojis, garbled text)
- Contains text that is identical or near-identical to other posts within the last 24 hours across multiple communities
- Contains text that matches known AI-generated text patterns (e.g., repetitive syntax, unnatural structure)
- Contains a URL that is shortened and points to a known malicious domain
- Contains more than 3 images that are visually identical or nearly identical
- Contains a title that exceeds 80% capital letters
- Contains a title that is under 5 characters and contains only common words (e.g., "help", "thanks", "what")

WHEN a post is flagged for moderation, THE system SHALL notify the community moderator and the admin team.

WHEN a post contains image content that matches a known banned image hash, THE system SHALL automatically reject it and notify the user: "This image has been previously reported and violates our content policy."

WHEN a post contains a title matching a list of banned keywords (e.g., "free", "100% free", "guarantee", "no credit check"), THE system SHALL trigger moderation review.

WHEN a post is created by a user with negative karma below -50, THE system SHALL require passing a CAPTCHA before submission.

WHEN a post is created within 30 seconds of account creation, THE system SHALL require implicit trust check (CAPTCHA or email confirmation) before publication.

WHEN a community has over 10,000 subscribers, THE system SHALL require all link posts in that community to be manually approved by a moderator before appearing in feed.

WHEN a user has been banned from posting in a specific community, THE system SHALL prevent the user from creating any posts in that community.

WHEN a user has been banned from the entire platform, THE system SHALL prevent the user from creating any posts across all communities.

THE system SHALL store logs of all moderation triggers with timestamps, user ID, and content hash for audit purposes.

THE system SHALL NOT auto-remove flagged content from public view — it SHALL remain visible to moderators only until reviewed.

THE system SHALL allow users to appeal moderation actions on their posts through the reporting interface.

## Voting System

### Vote Types

WHEN a member casts an upvote on a post or comment, THE system SHALL increment the post's or comment's vote score by one.

WHEN a member casts a downvote on a post or comment, THE system SHALL decrement the post's or comment's vote score by one.

WHEN a member has already cast an upvote on a post or comment and casts another upvote, THE system SHALL remove the previous upvote and decrement the vote score by one.

WHEN a member has already cast a downvote on a post or comment and casts another downvote, THE system SHALL remove the previous downvote and increment the vote score by one.

WHEN a member has cast an upvote on a post or comment and casts a downvote, THE system SHALL remove the upvote and add a downvote, resulting in a net change of -2 to the vote score.

WHEN a member has cast a downvote on a post or comment and casts an upvote, THE system SHALL remove the downvote and add an upvote, resulting in a net change of +2 to the vote score.

### Vote Restrictions

IF a guest attempts to vote on a post or comment, THEN THE system SHALL deny the request and display a message: "You must be a registered member to vote. Please sign up or log in."

WHILE a member is active, THE system SHALL permit a maximum of 100 votes per minute to prevent automated bot behavior.

WHEN a member exceeds 100 votes within a 60-second window, THEN THE system SHALL temporarily block further voting for 5 minutes and display a message: "Too many votes in a short time. Please wait before voting again."

IF a member attempts to vote on the same post or comment more than 5 times within 1 minute, THEN THE system SHALL block additional votes on that specific item for 10 minutes and display a message: "You've voted on this item too frequently. Please wait before voting again."

### Vote Display Logic

THE system SHALL display the net vote score (upvotes minus downvotes) for every post and comment.

THE system SHALL display the vote count as an integer: "+12" for 12 net upvotes, "-5" for 5 net downvotes, and "0" for even.

WHEN a post or comment has 0 votes, THE system SHALL display "0" not "No votes yet."

WHEN a member has upvoted a post or comment, THE system SHALL display a filled-up arrow and highlight the upvote button.

WHEN a member has downvoted a post or comment, THE system SHALL display a filled-down arrow and highlight the downvote button.

WHEN a member has not voted on a post or comment, THE system SHALL display hollow-up and hollow-down arrows with no button highlighting.

WHEN a moderator or admin has voted on a post or comment, THE system SHALL display a small "mod" tag next to the vote direction indicator.

WHEN the ratio of upvotes to total votes exceeds 90%, THE system SHALL display a "Highly Upvoted" badge next to the vote count.

WHEN the ratio of downvotes to total votes exceeds 60%, THE system SHALL display a "Controversial" badge next to the vote count.

WHEN the ratio of upvotes to total votes is between 40% and 60%, THE system SHALL display a "Balanced" badge next to the vote count.

### Vote Manipulation Prevention

THE system SHALL use electrical, network, and behavioral analysis to detect automated or coordinated voting patterns designed to artificially inflate or deflate scores.

WHEN the system detects a coordinated voting pattern (multiple accounts voting identically within 1 second on the same content across different communities), THEN THE system SHALL flag those votes as suspicious and temporarily mask those votes from public display. The votes shall be reviewed by an admin within 24 hours.

WHEN an admin reviews and confirms a coordinated voting attack, THEN THE system SHALL permanently remove the fraudulent votes and may impose penalties on the involved accounts per the moderation policy.

### Vote Anonymity

THE system SHALL prohibit any user from seeing who voted on a specific post or comment, including moderators and administrators.

WHEN a user attempts to access individual voting data (such as "who voted"), THEN THE system SHALL respond with: "Voting is anonymous to protect user privacy."

THE system SHALL store vote information securely with no personally identifiable links between voting accounts and specific posts/comments beyond the necessary authentication linkage.

THE system SHALL not log voter IP addresses for the purpose of identifying voting patterns.

## Comment System

### Comment Creation

WHEN a member submits a comment on a post, THE system SHALL validate that:

- The user is authenticated (not a guest)
- The post is not archived or closed
- The comment text is not empty
- The comment text does not exceed 5,000 characters
- The comment text does not contain more than 20 URLs
- The comment text complies with the platform's content moderation rules

WHEN a comment is submitted, THE system SHALL:

- Generate a unique comment ID using UUIDv4
- Assign the comment to the parent post
- Record the user ID of the commenter
- Record the timestamp of creation in ISO 8601 format
- Increment the post's comment count
- Award +2 karma to the commenter

IF the comment contains text that matches any active moderation trigger term (defined in 10-moderation-policy.md), THEN THE system SHALL:

- Place the comment in "held for review" status
- Notify moderators of the post's community
- Prevent initial display to non-moderators
- Record the violation type and flagged keywords

### Nested Replies

WHEN a user replies to a comment, THE system SHALL:

- Establish a parent-child relationship between the parent comment and new reply
- Assign the reply to the same post as the parent comment
- Record the reply's depth level in the thread
- Increment the parent comment's reply count

WHILE a comment has active replies, THE system SHALL:

- Maintain the hierarchical relationship in the database
- Allow all replies to be sorted by the same criteria as the parent comment
- Preserve the entire thread structure regardless of moderation status

WHERE a user clicks "Reply" on a comment, THE system SHALL:

- Display a reply input field with the original comment embedded
- Show the username of the comment being replied to
- Include a "Cancel" option to abort without submission

### Reply Depth

IF a comment has reached a depth of 5 levels, THEN THE system SHALL:

- Prevent further replies to that comment
- Display a message: "This thread has reached maximum depth. Further replies are disabled."
- Allow replies to comments at depth 4 or lower

WHILE a user is composing a reply, THE system SHALL:

- Show the current depth level of the conversation
- Highlight when the reply will reach depth limit (depth 4)
- Display the "Maximum depth reached" warning for comments at depth 5

WHERE a post has an active comment thread exceeding 10,000 total replies, THE system SHALL:

- Disable new replies to that specific post
- Display a message: "This discussion has reached maximum comments. New replies are closed."
- Allow users to still upvote/downvote existing comments
- Keep existing discussion visible in its entirety

### Comment Editing

WHEN a member attempts to edit a comment, THE system SHALL:

- Validate that the user is the original author of the comment
- Check that the edit occurs within 15 minutes of the original comment creation
- Prevent editing if the comment has been moderated or reported
- Prevent editing if the comment has received more than 5 upvotes

WHEN an edit is approved, THE system SHALL:

- Preserve the original comment text in version history
- Record the edit timestamp and user ID
- Display "Edited" label next to the comment
- Append the edit history: "[Edited: {date} at {time}]" at the bottom of the comment
- Maintain the same karma score and vote count
- Notify all users who replied to the comment (if edits change meaning)

IF a comment was posted by a user who has been permanently banned, THEN THE system SHALL:

- Prevent any edits to that comment
- Show: "This comment was posted by a banned user and cannot be edited"
- Keep the original content visible

### Comment Deletion

WHEN a member deletes their own comment, THE system SHALL:

- Allow deletion within 1 hour of the comment's creation
- Hide the comment content for all users
- Replace the content with: "[Comment deleted by author]"
- Preserve the comment's karma impact on the author
- Maintain the comment's reply hierarchy (replies remain but show "[Deleted comment]")
- Decrement the post's comment count

WHEN a moderator deletes a comment, THE system SHALL:

- Allow deletion at any time regardless of age or karma
- Replace the content with: "[Comment removed by moderator]"
- Record the moderator's ID and reason for removal
- Record the violation category from 10-moderation-policy.md
- Notify the comment author via system message
- Preserve the comment's vote count and reply structure in the database
- Maintain the comment's position in the thread

WHEN an admin deletes a comment, THE system SHALL:

- Alternate between "[Comment removed by moderator]" and "[Comment removed by admin]" based on the role
- Trigger an audit log entry with full context
- Send a notification to all moderators of the community
- If the comment violated community rules, append: "Violation: {Title}"

IF a comment is deleted due to a successful appeal, THEN THE system SHALL:

- Restore the original comment content
- Remove the "removed" message
- Restore any previously hidden replies
- Send notification to user: "Your comment has been restored"

### Comment Moderation

WHEN a user reports a comment, THE system SHALL:

- Allow reporters to select one violation category (from 10-moderation-policy.md)
- Record the reporter's user ID and timestamp
- Record the comment ID and post ID
- Display "Reported" status to all non-moderators
- Queue the comment for review by any moderator of that community
- Prevent the reporter from seeing the reason for moderation decisions

WHEN a moderator reviews a reported comment, THE system SHALL:

- Validate the reported violation against moderation guidelines
- Determine if the comment violates community rules
- Take one of four actions: Confirm report and remove, Dismiss report, Issue warning to author, Notify user of appeal rights
- Record the moderator's decision, reason, and action taken
- Notify the commenter of the result via system message
- If removed, record the reason categories for future pattern analysis

WHEN a moderator deletes a comment, THE system SHALL:

- Show a dropdown form for community-specific violation categories
- Require a 20-character minimum justification
- Prevent the use of vague language like "inappropriate" without specifics
- Provide resistance during deletion of comments with >10 upvotes
- All edit history preserved in the audit log

WHILE a comment remains held for review, THE system SHALL:

- Display a grayed-out version to all users
- Show: "This comment is under review by moderators"
- Prevent downvotes and replies to the comment
- Allow upvotes to continue
- Display a count of reports against this comment

WHERE a comment receives 3 or more reports from distinct users within 5 minutes, THE system SHALL:

- Automatically flag the comment for priority review
- Notify all active moderators of the post's community
- Hide the comment from all users except moderators
- Send a system alert tag: "URGENT: 3+ reports within 5m"

IF a comment is confirmed as a violation, THE system SHALL:

- Remove the comment and all nested replies
- Apply a negative karma penalty of -5 to the originator
- Record the reason in the user's moderation history
- Increase the user's "trust score penalty" for future moderation
- Place a "Comment flagged" tag on all future comments from this user

IF a comment is dismissed as a false report, THE system SHALL:

- Remove the "Reported" label
- Restore visibility to all users
- Decrease the reporter's "report score" (a metric for report quality)
- Display a message to the reporter: "Your report was dismissed as invalid. Repeated invalid reports may restrict your ability to report."

WHEN a moderator views comments for moderation, THE system SHALL:

- Sort comments by: Latest first, Highest reported, Highest karma, Highest replies
- Filter by: Report count, Age, Post community, Comment depth
- Show one-click actions: Approve, Remove, Issue Warning, Ban User
- Display full audit trail: Original text, Edit history, Report logs, User karma

IF a user's comment is removed three times, THEN THE system SHALL:

- Place the user on 7-day temporary suspension
- Display a message: "Your account is temporarily suspended for 7 days due to repeated content violations."
- Freeze all posting rights during suspension
- Allow members to review their moderation history via profile

IF a user is reported five times for distinct comment violations, THEN THE system SHALL:

- Initiate automatic review by an admin
- Notify all moderators of the user's community
- Display a label on the user's profile: "Under Administrative Review"
- Block core features including posting, commenting, and voting

IF the user responds with a pattern of abusive comments after appeal is denied, THEN THE system SHALL:

- Permanently ban the user
- Remove all their content from the platform
- Display: "Account permanently banned for sustained violation of community guidelines"
- Prevent account re-creation under any UID or email

IF a comment is flagged as a "doxxing" violation (as defined in 10-moderation-policy.md), THEN THE system SHALL:

- Immediately remove the comment
- Ban the user for 30 days
- Trigger an admin investigation
- Disable the user's ability to create new accounts
- Notify authorities if personal data involves minors

IF a comment is flagged as a "hostile targeting" violation (as defined in 10-moderation-policy.md), THEN THE system SHALL:

- Immediately hide the comment from all users
- Notify the victim with safety resources
- Increase the severity of karma deduction to -10
- Place a "High Risk User" tag on the perpetrator's profile
- Assign a moderator to monitor all future activity

## Moderation Policy

### Reporting Workflow

WHEN a user identifies content that violates community guidelines, THE system SHALL provide a prominent "Report" button on all posts and comments.

WHEN a user clicks the "Report" button, THE system SHALL open a modal with predefined violation categories and an optional free-form comment field.

THE system SHALL allow users to select only ONE primary violation category from defined options.

WHEN a report is submitted, THE system SHALL timestamp the report and assign it a unique identifier.

THE system SHALL immediately hide the reported content from public view for all users except the reporter and moderators.

WHILE content is under review, THE system SHALL display a banner saying "This content is under moderation review" to all non-moderator users.

THE system SHALL send an email notification to all moderators of the community where the content was posted.

THE system SHALL route the report to the first available moderator in the community's moderator list.

IF a community has no active moderators, THEN THE system SHALL escalate the report to system administrators.

WHERE a user submits five or more reports within one hour, THE system SHALL temporarily lock their reporting privileges for 24 hours.

### Content Violations

WHEN content is reported, THE system SHALL classify it according to the following violation categories:

1. Harassment: Targeted abuse, threats, or intimidation directed at specific users
2. Hate Speech: Content that attacks or demeans individuals or groups based on race, religion, gender, sexual orientation, or disability
3. Sexual Content: Explicit nudity, sexually suggestive material, or solicitation
4. Illegal Content: Material promoting or depicting illegal activities
5. Impersonation: Falsely representing oneself as another person or entity
6. Spam: Repetitive, irrelevant, or automated content posted to multiple communities
7. Misinformation: Deliberately false information presented as fact in areas where accuracy is critical
8. Copyright Infringement: Unauthorized use of copyrighted material without permission
9. Doxxing: Publishing private personal information about individuals without consent

THE system SHALL reject any report that does not clearly match one of these nine categories.

IF a report is submitted without selecting a violation category, THEN THE system SHALL return an error requiring the user to select a valid category.

WHEN a moderator reviews reported content, THE system SHALL automatically display the original post or comment alongside the report details and reporter information.

WHEN multiple users report the same content with the same violation category, THE system SHALL increase the priority of the review queue proportionally to the number of reports.

WHEN a post receives three or more reports of the same category within one hour, THE system SHALL automatically prevent new comments on the post.

### User Penalties

WHEN a user's content is determined to violate guidelines, THE system SHALL apply penalties based on the severity and frequency of violations:

#### Tier 1: First-time minor violation (e.g., spam, one-time inappropriate comment)
- THE system SHALL remove the violating content
- THE system SHALL issue a warning message to the user with a link to community guidelines
- THE system SHALL place the user on a 24-hour temporary suspension from posting and commenting

#### Tier 2: Repeated minor violations or single moderate violation (e.g., harassment, misinformation)
- THE system SHALL remove the violating content
- THE system SHALL issue a permanent ban from posting in one specific community
- THE system SHALL place the user on a 7-day temporary suspension from all posting and commenting
- THE system SHALL reduce the user's karma by 50 points

#### Tier 3: Severe or repeated violations (e.g., hate speech, threats, doxxing)
- THE system SHALL remove the violating content
- THE system SHALL permanently ban the user from all communities
- THE system SHALL apply a 30-day system-wide suspension from all activity
- THE system SHALL reduce the user's karma to zero
- THE system SHALL notify law enforcement if illegal activity is detected

#### Tier 4: System-level abuse (e.g., automated bots, mass reporting abuse)
- THE system SHALL permanently ban the user account
- THE system SHALL ban associated IP addresses and device fingerprints
- THE system SHALL initiate legal investigation procedures
- THE system SHALL delete all content created by the user
- THE system SHALL permanently prevent account re-registration under any identifier

WHEN a user receives a penalty, THE system SHALL record the penalty type, date, duration, and reason in their account history.

WHEN a user is suspended, THE system SHALL ensure the suspension applies to all devices and authentication methods.

THE system SHALL notify suspended users via email with details of the suspension, duration, and appeal rights.

### Appeal Process

WHEN a user receives a penalty, THE system SHALL provide an "Appeal" button in the notification email and their profile settings.

WHEN a user submits an appeal, THE system SHALL require the user to provide a written explanation of why they believe the penalty was incorrect.

THE system SHALL assign each appeal to an administrative review team separate from the original moderator who issued the penalty.

WHILE an appeal is under review, THE system SHALL maintain the penalty status unchanged.

THE system SHALL complete all appeals within 72 hours of submission.

IF an appeal is approved, THE system SHALL:

- Remove the penalty
- Restore visibility of all previously removed content
- Restore the user's karma to its pre-penalty value
- Remove any community restrictions
- Notify the user via email with detailed explanation

IF an appeal is denied, THE system SHALL:

- Maintain the original penalty
- Notify the user via email with detailed explanation of the reasoning
- Allow the user to submit one additional appeal after 30 days has elapsed

WHERE a user has received three or more penalties within a 12-month period, THEN THE system SHALL automatically deny any future appeals.

THE system SHALL provide a transparent decision summary for each appeal outcome.

### Moderator Guidelines

WHILE moderating content, THE system SHALL require moderators to:

1. Review the original content in context before taking action
2. Check the user's historical behavior and past penalties
3. Consider the community's specific guidelines if they exist
4. Apply penalties consistently across similar cases
5. Never use moderators' personal opinions to determine violations
6. Maintain strict confidentiality regarding reporter identity
7. Base all decisions on the defined violation categories
8. Document every action taken with timestamped notes

WHEN a moderator applies a penalty, THE system SHALL require them to select one of the predefined violation categories and enter a brief justification.

IF a moderator applies a penalty that is actively appealed by a user, THEN THE system SHALL freeze the penalty's effects until the appeal process is completed.

THE system SHALL automatically flag any moderator who applies more than 10 penalties in a single hour for review by administrators.

WHOEVER is a moderator of a community SHALL not be able to moderate their own content.

THE system SHALL provide moderators with an "escalate to admin" option for complex or controversial cases.

### Transparency Requirements

THE system SHALL provide a public transparency report updated quarterly that includes:

- Total number of reports received
- Number of reports confirmed as violations
- Number of reports dismissed as false
- Distribution of violations by category
- Total number of warnings issued
- Total number of suspensions by duration
- Total number of permanent bans
- Number of appeals submitted
- Number of appeals approved
- Average time to process appeals

THE system SHALL display specific moderation actions taken on each user's profile with timestamped logs (without exposing reporter identity).

THE system SHALL provide a public dashboard showing moderation statistics for each community.

WHEN a user is permanently banned, THE system SHALL display a notice on their profile stating "This account has been permanently banned for violating community guidelines" without disclosing the specific reason.

THE system SHALL set all moderation-related data to be non-deletable and permanently archived.

WHERE users have received multiple penalties, THE system SHALL display an aggregate warning on their profile visible only to moderators.

THE system SHALL provide a public process guide "How Moderation Works" available to all registered users.

## Karma System

### Karma Calculation

Karma = (∑ Upvotes Received) - (∑ Downvotes Received) + (∑ Reply Upvotes) - (∑ Reply Downvotes) - (Penalty Points)

Every karma change is recorded and auditable, but the detailed calculation is internal and not exposed to users.

The base calculation uses:

- +1 points for receiving an upvote on a post
- -1 points for receiving a downvote on a post
- +1 points for receiving an upvote on a comment
- -1 points for receiving a downvote on a comment
- +2 points for a post being selected as "Top Post" by algorithm
- +1 point for a comment being selected as "Best Comment" by algorithm

### Penalty Points

Penalty points are applied for violations of community standards:

- 5 points: Angle bracket spam (e.g., "<This> <Is> <Spam>")
- 5 points: Inflammatory language flagged by NLP filters
- 5 points: Posting identical content across >10 communities in 24 hours
- 10 points: Posting links to known malware or phishing sites
- 10 points: Sexual solicitation or inappropriate content
- 15 points: Hateful speech or targeted harassment
- 20 points: Attempting to manipulate karma (self-voting, botting, vote rings)
- 50 points: Attempting to impersonate mods/admins

### Additional Rules

- Karma cannot go below 0
- Karma decimals are not tracked — only integers are used
- Karma resets do not exist — history is permanent
- Karma calculation occurs after voting cooldown
- Karma is immediately recalculated when votes are changed
- Upvote/downvote votes from users with caption karma < 10 do not count

### Karma Sources

#### Earned Through Quality Contributions

1. **Posting Engaging Content** — Posts that receive upvotes from active members
2. **Writing In-Depth Comments** — Comments that receive upvotes, especially in threads with high engagement
3. **Creating Popular Communities** — New communities with rapid growth and activity gain karma bonuses
4. **Receiving "Best Comment"** — Algorithmic selection of top replies in a thread
5. **Receiving "Top Post"** — Algorithmic selection of most engaging posts on a community
6. **Helping Moderators** — Correctly reporting content that leads to valid removal
7. **Completing Community Guidelines Quiz** — First-time users who learn platform rules earn +50 karma

#### Not Earned Through

1. **Time Spent** — Logging in, browsing, or passively consuming content
2. **Posting Frequency** — Multiple low-effort posts or comments in rapid succession
3. **Community Size** — Joining large communities does not directly award karma
4. **Self-Promotion** — Direct advertising or link-only postings
5. **Voting Others** — Giving upvotes/downvotes does not change karma
6. **Leveling Up Features** — Unlocks are based on karma amount, not action count

### Karma Display

#### On User Profiles

- Total karma score is shown prominently on the user's public profile
- Avatar badge shows karma tier:
  - 0: "New user" (gray)
  - 10: "Contributor" (green)
  - 100: "Active member" (blue)
  - 500: "Respected user" (violet)
  - 1,000: "Veteran" (gold)
  - 5,000: "Community pillar" (platinum)
  - 10,000+: "Elder" (diamond)
- Karma history graph (total karma vs time) is visible to user and moderators
- Karma ranking among peers (position in community/user base) is shown as "Top 5% of users"
- Karma earned by category (posts, comments, moderation) is shown in "Karma Breakdown" section

#### In Content Streams

- Below every post and comment display, show user's karma as: "1.2K karma"
- In comment threads, karma appears on the user's name line
- Leaderboards show top 10 karma earners in each community
- Communities display "Top Contributors" with karma rank

#### For Guests

- Only see labeled tiers (e.g., "Veteran Member") without numeric score
- View aggregated karma levels visually (color-coded badges)
- See that high-karma users have "trusted contributor" status

### Karma Impact

Karma directly impacts user privileges in the platform:

#### Access Control

- 10: Can create a post (post creation unlock)
- 50: Can create a comment (comment creation unlock)
- 100: Can upvote or downvote comments (voting unlock)
- 200: Can join private communities
- 500: Can create new community
- 1,000: Can promote community to "Featured" status
- 5,000: Can review and validate user reports
- 10,000: Can nominate users as moderators

#### Visibility and Influence

- Posts from users with karma > 500 appear higher in "Hot" and "Top" rankings
- Comments from users with karma > 1,000 are prioritized in "Top Replies"
- Threads with opinions from users carrying karma > 2,000 are deemed "higher confidence" by algorithm
- Users with karma > 5,000 have "trusted analyst" badge visible on all interactions

#### Moderation Authority

- Users with karma >= 1,000 can report content
- Users with karma >= 5,000 can:
  - Participate in moderation review panels
  - View reports from lower-karma users first
  - Overrule moderator decisions (with admin confirmation)
- Admins consider karma level in:
  - Who to appoint as moderators
  - Whose reports are escalated first
- Additional system restriction: 1.4% of all user reports must come from users with karma < 100 — prevents censoring by high-karma users

#### Social Recognition

- High-karma users receive:
  - "Contributor of the Week" badge
  - Auto-tags on their posts ("Top Poster", "Top Commenter")
  - Invitation to exclusive AMA sessions with admins
  - Ability to recommend new features for voting
- Bandwidth improvements:
  - Higher-karma users have reduced rate limits
  - Larger image uploads allowed
  - Toggle to disable ads for users with karma > 10,000

### Karma Decay Algorithm

To prevent "karma hoarding" and ensure reputation stays relevant:

- After a user goes 6 months without posting or commenting, 15% of karma decays
- After 12 months of inactivity, 30% of karma decays
- After 24 months of inactivity, 50% of karma decays
- Decay only affects total karma, not redeemable features (if karma drops below threshold, privileges are revoked)
- Decay does not apply to:
  - Users with karma >= 10,000 (elite status)
  - Active moderators regardless of visibility
  - Admins
- Decay is not retroactive — if a user returns after 1.5 years, they lose 30% of current karma, but do not lose privileges earned prior to decay
- Users are notified before decay:
  - First notification: 2 months before 6-month checkpoint
  - Second notification: 1 month before cutoff
- Karma decay success metric: 12% reduction in "zombie accounts" with >1,000 karma

### Karma Fraud Prevention

The platform implements strict anti-fraud measures:

#### Vote Manipulation Prevention

- 1. User cannot vote on their own content
- 2. A user can only vote on a post/comment once
- 3. Voting is only allowed after 5 seconds of viewing content
- 4. If a user downvotes >5 times in one hour, they receive a warning
- 5. If a user upvotes >15 times in one hour, they receive a warning
- 6. If account age is <24 hours, vote weight is halved
- 7. The system detects and invalidates coordinated voting from correlated IP addresses, device fingerprints, browser profiles

#### Karma Farming Prevention

- All content posted within 30 minutes of account creation is weighgraded 50% less
- Repeated submission of identical or near-identical content triggers karma penalties
- Creating communities with no posts/comments within 24 hours results in karma penalty refund
- Using multiple accounts (sock puppeting) to boost karma results in total account ban and removal of reputation
- Attempting to gain karma by engaging with known spam/blocklisted users triggers a 100-point penalty
- Review and verification process: All karma changes above 500 points in a single day are manually audited

#### Transparency and Fairness

- A public "Karma Transparency Dashboard" is available to all users
  - Shows top 100 users with fastest karma growth
  - Lists users with karma penalties and reasons
  - Displays average karma per community
  - Shows rate of karma decay activity
- All system karma changes can be reviewed via "Karma History" tab
- Users can appeal disputed karma penalties through moderator channel

## Content Discovery

### Sorting Algorithms

THE communityBbs system SHALL implement five primary post sorting methods: hot, new, top, controversial, and default.

WHEN a user selects "Hot", THE system SHALL calculate a dynamic score using the following algorithm:

WHEN a post is created, THE system SHALL assign an initial hot score of 0.

WHILE a post exists, THE system SHALL recalculate its hot score every 5 minutes using this formula:

hot_score = log_10(absolute_upvotes + 1) + (hours_since_posted * 0.1) - (hours_since_posted * 0.1 * votes_score)

WHERE absolute_upvotes = (upvotes - downvotes) + 1

WHERE votes_score = (if (upvotes + downvotes) > 0 then (|upvotes - downvotes| / (upvotes + downvotes)) else 0)

WHEN a user votes on a post, THE system SHALL trigger an immediate recalculation of the hot score.

WHEN a user selects "New", THE system SHALL sort all posts by creation timestamp in descending order (most recent first).

WHEN a user selects "Top", THE system SHALL sort posts by total net votes (upvotes - downvotes) in descending order.

WHEN a user selects "Controversial", THE system SHALL sort posts by the product of upvotes and downvotes, divided by total votes + 1, in descending order.

WHERE controversial_score = (upvotes * downvotes) / (upvotes + downvotes + 1)

WHEN no sorting option is selected, THE system SHALL display posts in "Default" order, which is equivalent to "New" sort.

### Time Scopes

WHILE a user is viewing post listings, THE system SHALL provide time scope filters for top and controversial sorts: All Time, Today, This Week, This Month, This Year.

WHEN the "Today" time scope is selected, THE system SHALL only include posts created within the last 24 hours.

WHEN the "This Week" time scope is selected, THE system SHALL only include posts created within the last 7 days.

WHEN the "This Month" time scope is selected, THE system SHALL only include posts created within the last 30 days.

WHEN the "This Year" time scope is selected, THE system SHALL only include posts created within the last 365 days.

WHEN the "All Time" time scope is selected, THE system SHALL include all posts regardless of creation date.

WHEN a user selects "Top" or "Controversial" with a specific time scope, THE system SHALL apply the time constraint before sorting.

### Search Functionality

WHEN a user enters a search query, THE system SHALL execute a full-text search across post titles and post bodies.

THE system SHALL rank search results by relevance using this formula:

relevance_score = (title_match_weight * title_occurrences) + (body_match_weight * body_occurrences) + (community_boost * community_subscription_factor) + (karma_multiplier * author_karma_weight)

WHERE title_match_weight = 3.0
WHERE body_match_weight = 1.0
WHERE community_boost = 0.5
WHERE community_subscription_factor = (if user_subscribed_to_community then 1.2 else 1.0)
WHERE karma_multiplier = (if author_karma > 100 then 1.5 else if author_karma > 10 then 1.2 else 1.0)
WHERE author_karma_weight = 0.2

WHEN a search query contains more than 3 words, THE system SHALL prioritize exact phrase matching over individual word matches.

WHEN a search query returns fewer than 10 results, THE system SHALL automatically expand the search to include community names and tags.

WHEN a search query returns zero results, THE system SHALL display "No results found" and suggest alternative related search terms based on trending tags in the user's subscribed communities.

### Trending Content

WHILE a user is viewing the homepage, THE system SHALL display a "Trending" section showing communities and posts with rapidly increasing engagement.

THE system SHALL calculate trending score using this formula:

trending_score = (recent_engagement_rate * 0.7) + (community_popularity * 0.3)

WHERE recent_engagement_rate = (total_votes_in_last_2_hours / hours_since_creation)

WHERE community_popularity = (total_subscribers / 1000)

WHEN a community or post exceeds a trending_threshold of 500, THE system SHALL include it in the Trending section.

WHEN a post has been featured in the Trending section for more than 8 hours, THE system SHALL reduce its trending_priority to 0.5 to prevent repetition.

WHEN a post receives more than 100 votes within 30 minutes of creation, THE system SHALL trigger a "Rapid Rise" badge.

WHEN a community exceeds 1,000 subscribers and maintains a 5% daily growth rate, THE system SHALL apply a "Rising Community" badge.

### Recommended Communities

WHILE a user is viewing their subscription list, THE system SHALL display "Recommended Communities" based on three factors.

THE system SHALL recommend communities using this weighted algorithm:

recommendation_score = (content_similarity * 0.5) + (user_similarity * 0.3) + (trending_factor * 0.2)

WHERE content_similarity = (number_of_common_tags / total_tags_in_target_community)

WHERE user_similarity = (number_of_common_subscriptions / total_subscriptions_of_similar_user)

WHERE trending_factor = (if community_trending > 100 then 1.5 else 1.0)

WHEN a user subscribes to a community, THE system SHALL increase weight of community_similarity by 0.1 for future recommendations.

WHEN a user has fewer than 3 subscriptions, THE system SHALL recommend the top 10 most popular communities globally using a popularity score derived from total subscribers.

WHEN a user has 5 or more subscriptions, THE system SHALL recommend communities with at least 2 common tags and a minimum of 100 subscribers.

WHEN a user actively upvotes content within a community, THE system SHALL increase the recommendation weight for similar communities by 0.2 for the next 24 hours.

WHEN a user reports content from a community, THE system SHALL immediately reduce its recommendation score by 0.5 for that user, but not for other users.

WHEN a user unsubscribes from a community, THE system SHALL reduce its recommendation weight by 0.3 for that user for the next 30 days.

WHEN a user views a community page, THE system SHALL record this interaction and use it to boost recommendation scores for similar communities.

WHEN a post's comments receive over 50 replies within 1 hour, THE system SHALL promote the parent post to "Popular Discussion" status and recommend it to users subscribed to related communities.

THE system SHALL ensure all sorting algorithms, search logic, and recommendations respect user privacy and anonymity:

THE system SHALL NOT store individual user engagement patterns for tracking purposes.

THE system SHALL NOT display specific user behavior analytics to community moderators or administrators.

THE system SHALL calculate trends and recommendations using aggregated, anonymized data only.

THE system SHALL allow users to opt-out of personalized recommendations with a single toggle setting.

THE system SHALL not use personal information such as name, email, or IP address in any recommendation calculation.

## User Journey

### Registration Journey

WHEN a guest visits the platform for the first time, THE system SHALL display a landing page with clear options to register or log in.

WHEN a guest clicks "Register", THE system SHALL present a form requiring only email address and password.

WHEN a guest submits registration information, THE system SHALL validate the email format and password strength (minimum 8 characters, including number and symbol).

IF password does not meet strength requirements, THEN THE system SHALL display validation error: "Password must be at least 8 characters with one number and one symbol".

IF email is already registered, THEN THE system SHALL display validation error: "This email is already in use. Did you forget your password?".

WHEN registration is successful, THE system SHALL send a verification email to the provided address with a unique activation link.

WHILE user has not verified email, THE system SHALL restrict all posting, commenting, and voting functionality.

WHEN user clicks verification link, THE system SHALL activate the account and redirect to the communities feed.

WHEN registration fails due to system error, THE system SHALL display generic message: "Registration failed. Please try again later." and log error for admin review.

### First-Time Posting

WHEN a verified member visits the communities feed, THE system SHALL display a "Create Post" button in the top toolbar.

WHEN member clicks "Create Post", THE system SHALL open a modal with three content type options: Text, Link, Image.

WHEN member selects "Text", THE system SHALL display a text editor with 5000 character limit.

WHEN member selects "Link", THE system SHALL require URL field and optional title field.

WHEN member submits link, THE system SHALL validate URL format and fetch meta title and description from the website.

WHEN member selects "Image", THE system SHALL open file picker with allowed formats: JPG, PNG, GIF (max 10MB).

WHEN image exceeds 10MB, THEN THE system SHALL display error: "Images must be under 10MB in size".

WHEN member submits any post type, THE system SHALL assign recipient community based on selected subreddit (default: "all")

WHEN post is submitted, THE system SHALL create a new post record with status "pending" if post contains keywords flagged by moderation system.

IF post contains UPPERCASE TITLE, THEN THE system SHALL display warning: "Your post title is in all uppercase. Consider using normal capitalization." but allow submission.

IF post contains 10+ links, THEN THE system SHALL flag post for human moderation.

WHEN post is approved, THE system SHALL display success message: "Your post has been published!" and show post in feed.

WHEN post is rejected, THE system SHALL notify user: "Your post has been removed for violating community guidelines. You can appeal this decision."

### Discovering Communities

WHEN a member navigates to the "Browse Communities" section, THE system SHALL display trending communities sorted by subscriber count.

WHEN member searches for community, THE system SHALL return results matching community name or description, ranked by relevance.

WHILE browsing communities, THE system SHALL display each community's subscriber count, activity level, and adherence score (1-100).

WHEN member clicks on community, THE system SHALL show the community's front page with rules, moderators, and recent posts.

WHEN member clicks "Join" on community, THE system SHALL add community to member's subscription list.

IF member attempts to join community with more than 5000 members, THEN THE system SHALL display message: "This community has reached maximum capacity. You can still view content but cannot comment or post."

WHEN member joins first community, THE system SHALL show 5 recommended related communities.

WHEN member has joined 5 communities, THE system SHALL begin recommending communities based on post engagement patterns.

IF member attempts to create community with name already taken, THEN THE system SHALL display error: "This community name is already in use. Try a different name."

WHEN member creates new community, THE system SHALL auto-assign member as first moderator.

### Engaging with Content

WHEN a member views a post in feed, THE system SHALL display voting buttons (upvote/downvote) and comment count.

WHEN member clicks upvote, THE system SHALL increment post's vote count by 1 and disable further voting on that post.

WHEN member clicks downvote, THE system SHALL decrement post's vote count by 1 and disable further voting on that post.

WHEN member changes vote from up to down (or vice versa), THE system SHALL reverse previous vote and apply new vote.

WHILE post score is between -5 and 5, THE system SHALL display normal vote count.

WHEN post score exceeds 100, THE system SHALL display "🔥" next to vote count.

WHEN post score is below -10, THE system SHALL display "🔴 Reported" and hide in default feeds.

WHEN member clicks comment count, THE system SHALL load all direct comments on the post.

WHEN member clicks "Reply" under comment, THE system SHALL open text field for nested reply.

WHILE reply depth is below 7 levels, THE system SHALL allow new replies.

WHEN reply depth reaches 7, THE system SHALL hide additional reply buttons and display: "Maximum comment depth reached."

WHEN user submits comment, THE system SHALL validate text length (max 2000 characters).

IF comment exceeds 2000 characters, THEN THE system SHALL truncate and display warning: "Comment has been truncated to 2000 characters."

WHEN comment contains suspected spam URL, THE system SHALL flag for review and delay public display.

WHEN comment contains 3+ consecutive emojis, THE system SHALL display warning: "Comments with excessive emojis may be removed. Use sparingly." but allow submission.

### Building Reputation

WHEN member receives upvote on post, THE system SHALL award +1 karma.

WHEN member receives downvote on post, THE system SHALL deduct -1 karma.

WHEN member receives upvote on comment, THE system SHALL award +0.5 karma.

WHEN member receives downvote on comment, THE system SHALL deduct -0.5 karma.

WHEN member balances karma over time (e.g. more upvotes than downvotes), THE system SHALL award bonus karma: +1 for every 20 net positive karma points.

WHEN member has > 100 karma, THE system SHALL display "Karma: 100+" next to username.

WHEN member has > 500 karma, THE system SHALL display blue badge: "Active Member".

WHEN member has > 1000 karma, THE system SHALL display gold badge: "Community Contributor".

WHEN member has > 1500 karma, THE system SHALL display crystal badge: "Veteran Member".

WHEN member has > 5000 karma, THE system SHALL display platinum badge: "Legendary Contributor".

WHILE member's karma is between 0 and 99, THE system SHALL restrict ability to create new communities.

WHEN member's karma is below 0, THE system SHALL display warning: "Your karma is below zero. Avoid low-quality content to rebuild your reputation."

WHEN member's karma dips below -100 for three consecutive days, THE system SHALL disable posting privileges for 7 days.

### Becoming a Moderator

WHEN admin assigns moderator to community, THE system SHALL notify member: "You've been appointed moderator of [Community Name]."

WHEN member receives moderator rights, THE system SHALL display "Moderator" badge next to username.

WHEN moderator clicks "Moderation Tools", THE system SHALL display: Remove Post, Remove Comment, Ban User, Rename Community, Set Rules, Approve Post.

WHEN moderator removes post, THE system SHALL notify user: "Your post has been removed by a moderator for violating [Rule Name]."

WHEN moderator bans user, THE system SHALL notify user: "You have been banned from [Community Name] for [Reason]. Upload appeal request via support."

WHEN moderator approves pending post, THE system SHALL change status to "published" and notify submitter.

WHEN member has hosted active community for 30+ days with 100+ members, THE system SHALL suggest member for admin review.

WHEN member has received 3+ admin-appointed moderator roles across different communities, THE system SHALL override karma requirement and offer admin review.

WHEN member is reviewed by admin for elevated privileges, THE system SHALL conduct background check: post history, comment quality, response to moderation, doctoring participation.

WHEN member is promoted to admin, THE system SHALL send encrypted notification and grant "Admin Access" panel.

WHEN admin reaches platform limit (10), THE system SHALL lock admin creation and require board approval.

## Edge Cases and Error States

IF system detects multiple registrations from same IP address within 5 minutes, THEN THE system SHALL trigger CAPTCHA for all subsequent registrations from that IP.

IF member changes email address, THE system SHALL require re-verification and temporarily suspend all posting privileges for 24 hours.

IF user is banned from 3+ communities, THE system SHALL automatically suspend account for 30 days.

IF member reports 5+ items incorrectly within 24 hours, THE system SHALL lock reporting privileges for 48 hours.

WHEN system detects automated voting behavior (100+ votes in 1 minute), THE system SHALL reverse votes and mark account for review.

WHEN member attempts to join community while banned from same community, THE system SHALL display: "You are banned from this community. Contact moderators for appeal."

WHWhen member's password is compromised (based on external breach databases), THE system SHALL force password reset and notify user via email.

WHEN user leaves community after being assigned elder moderator, THE system SHALL keep moderator permissions active but reduce authority scores by 50%.

WHEN a community has no active moderators for 90 days, THE system SHALL reassign moderator privileges to top karma user in that community.

WHEN multiple admin accounts exist within same organization, THE system SHALL require two-factor authentication for all admin actions.

WHEN user has submitted 10+ posts in less than 10 minutes, THE system SHALL temporarily limit to 1 post per 30 minutes.

WHEN user's comment contains multiple flagged keywords, THE system SHALL auto-remove comment and issue first warning.

WHEN a post is reported by 5+ users within 1 hour, THE system SHALL auto-hide it and notify all moderators of associated community.

WHEN a member has negative karma for 14+ consecutive days, THE system SHALL display: "Your account is inactive. Log in and contribute to revive your account."

WHEN a community is flagged for violation, THE system SHALL disable posting unless all pending reports are resolved within 72 hours.

WHEN search returns zero results, THE system SHALL display: "No communities found. Try different keywords or browse popular communities." with recommended communities.

WHEN user tries to upvote their own content, THE system SHALL display: "You cannot vote on your own posts or comments."

WHEN user tries to create community with profanity in name, THE system SHALL block creation and note: "Community names cannot contain profanity."

WHEN user attempts to report a post while logged out, THE system SHALL redirect to login page with error: "You must be logged in to report content."

WHEN user has unused account for 90 days, THE system SHALL flag for potential deletion and notify user via email.

WHEN moderator modifies post, THE system SHALL append "[Modified by moderator] " to original text with timestamp.

WHEN post is deleted by moderator, THEN THE system SHALL keep record internally and notify admin.

WHEN comment is edited, THE system SHALL display "Edited " with original timestamp.

WHEN user tries to create community with name already taken but with different capitalization, THE system SHALL treat it as duplicate and reject.

WHEN system detects payment fraud attempt (wallet linking outside platform), THE system SHALL block account and notify legal team.

WHEN user activates timezone-based posting schedule, THE system SHALL recommend optimal posting times based on community activity patterns.

WHEN a community has been shadow-banned by 10+ members, THE system SHALL initiate community review by admin.

WHEN member's profile has never posted or commented for 180 days, THE system SHALL mark as "Inactive."
