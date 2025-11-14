# Political Discussion Board - Service Overview

## Service Overview

This is a simple, text-based political discussion board designed for citizens to share opinions, exchange ideas, and engage in respectful debate about local and national political issues. The service exists to provide a public, open platform where individuals can express their views without gatekeeping, censorship, or algorithmic distortion—while maintaining basic community standards through human moderation. Unlike social media platforms that prioritize engagement over discourse, this forum rewards thoughtful contribution and enforces decorum through community-driven moderation.

## Business Model

### Why This Service Exists

There is a growing public need for spaces where political discourse can occur without algorithmic polarization, echo chambers, or corporate control. Most existing platforms either violently moderate speech (removing legitimate dissent) or neglect moderation entirely (allowing harassment and misinformation). This service fills the gap by offering a minimal, uncluttered forum where users can post, comment, and discuss—operating on the principle that rational discourse will self-regulate when backed by active, human moderation. No ads, no likes, no trending tags—just direct conversation.

### Revenue Strategy

This is a non-commercial, community-supported platform. No subscription fees, no ads, no affiliate links, no data selling. Operational costs will be covered by optional user donations, which are displayed as a simple "Support the Forum" button. Revenue is not a goal; sustainability through voluntary contribution is the model. The platform’s success is measured by engagement quality and user retention, not monetization.

### Growth Plan

Growth will be organic and local. Initial adoption will come from: 
- Political science students and campus groups
- Local civic organizations
- Independent journalists and policy analysts

Promotion will occur through word-of-mouth, university bulletin boards, and newsletters. No paid ads or social media campaigns. The platform’s integrity is its brand—the community itself becomes the marketing channel.

### Success Metrics

1. **Daily Active Users (DAU)**: 100+ users submitting posts or comments daily
2. **Mean Post Length**: 150+ words per post (indicating thoughtful engagement)
3. **Moderation Rate**: Fewer than 10 posts removed per week (indicating self-policing community)
4. **User Retention**: 40% of users return after 30 days
5. **Comment-to-Post Ratio**: Minimum 2:1 (indicating active discussion, not broadcasting)

## User Actors & Permissions Summary

The system defines two distinct user actors:

### Citizen
- Can register with email and password
- Can create new discussion posts with text and attachments (images, PDFs, documents)
- Can edit their own posts for 24 hours after creation
- Can comment on any public post
- Can upload up to 3 files per post
- Cannot delete any post or comment
- Cannot moderate, lock, or flag content
- Cannot view the moderator dashboard

### Moderator
- Must be appointed by system owner (no self-appointment)
- Can delete any post or comment
- Can lock a discussion thread to prevent further comments
- Can mark a post or comment as "Verified" (appears with a badge)
- Cannot edit or delete other moderators’ content
- Cannot change system settings or user roles
- Cannot view or modify user data (email, IP, etc.)
- Accessible only through a restricted moderation dashboard

## Key Requirements Summary

These are the three business-critical features that define the system’s core purpose:

1. **WHEN a citizen submits a post, THE system SHALL allow the attachment of up to three files (images, PDFs, DOCX, TXT), with a combined size limit of 5MB.**
2. **WHEN a citizen attempts to edit a post, THE system SHALL permit the edit only if the post was created within the last 24 hours, and SHALL disable editing after that window.**
3. **WHEN a moderator performs a deletion or lock action, THE system SHALL preserve the original content for audit purposes but hide it from public view with a redacted notice.**

## Document Navigation

For comprehensive system requirements, refer to the following documents:

- [User Requirements](./02-user-requirements.md) — Describes what citizens and moderators are trying to accomplish
- [User Journey Documentation](./03-user-journey.md) — Maps the complete interaction workflows for each actor
- [User Actors and Authentication](./04-user-actors.md) — Full authentication and role-based permission structure
- [Business Rules Document](./05-business-rules.md) — All constraints, limits, and validation logic
- [Error Handling Guide](./06-error-handling.md) — User-facing responses for all failure states
- [Performance Requirements](./07-performance-requirements.md) — Expected response times for every user action
- [Data Lifecycle](./09-data-lifecycle.md) — How content and accounts move through the system
- [External Integrations](./08-external-integrations.md) — Required third-party services for storage and notification
- [Accessibility and Concepts](./10-accessibility-and-concepts.md) — Terminology, assumptions, and foundational concepts

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*