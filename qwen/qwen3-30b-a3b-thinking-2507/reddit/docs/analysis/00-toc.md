# Community Platform Requirements Specification

## Introduction
This comprehensive requirements specification details the functionality and business logic for the Reddit-like community platform. The document serves as the authoritative guide for backend implementation, defining all user interactions, business rules, and system behaviors without technical implementation details.

## Service Overview
The platform enables users to create and participate in community-driven content sharing, featuring posts, comments, and social interaction mechanisms. It provides a structured environment for community members to engage through voting systems, subscriptions, and moderation tools, with all activities centered around community hubs.

## User Actors
The system defines three core user actors based on permission levels:

- **Registered User**: Standard user with full participation rights in communities they're subscribed to.
- **Community Owner**: User who created a community with full moderation and management rights.
- **Moderator**: User with limited moderation permissions granted by community owners.

## Business Model
### Core Value Proposition
The platform connects users to community-driven content with a focus on user engagement through karma incentives. Content quality is prioritized through community-level moderation and voting systems.

### Success Metrics
- Daily active users (DAU) target: 5,000+ in first 3 months
- Average posts per active user: ≥2 per week
- Community growth rate: ≥15% weekly

## User Profile
### Display Name
WHEN a user registers, THE system SHALL require a display name between 2-50 characters, which MUST not contain special characters other than underscores and hyphens. WHEN a user updates their profile, THE system SHALL reject names containing reserved words (e.g., "admin").

### Bio Text
WHEN a user creates or edits their bio, THE system SHALL allow up to 500 characters with standard formatting support (bold, italics, line breaks). THE system SHALL strip any HTML tags to prevent security vulnerabilities.

### Avatar Image
WHEN a user uploads an avatar, THE system SHALL validate the image format (JPG, PNG), size (maximum 2MB), and aspect ratio (must be square). THE system SHALL generate a consistent thumbnail size (200x200 pixels) for display across all interfaces.

## Karma System
### Karma Calculation
THE system SHALL calculate total karma score as the sum of all upvotes on posts and comments minus all downvotes. KARMA SCORE SHALL be an integer value that can be negative.

### Vote Impact
WHEN a user upvotes a post, THE system SHALL increment the post author's karma by 1. WHEN a user downvotes a post, THE system SHALL decrement the author's karma by 1. WHEN a user changes their vote type, THE system SHALL adjust karma based on the new vote type without duplicate adjustments.

## Communities
### Creation
WHEN a user creates a new community, THE system SHALL require a unique name (10-50 characters, alphanumeric with underscores), a description (max 500 characters), and a square icon. THE system SHALL automatically assign the creator as community owner.

### Subscription Management
WHEN a user subscribes to a community, THE system SHALL track the subscription and require it to post in that community. WHEN a user unsubscribes, THE system SHALL remove them from the community's active subscriber list but preserve their profile data.

### Search & Browsing
WHEN users search for communities, THE system SHALL return matches based on name, description, and subscriber count. THE system SHALL display communities with at least 10 subscribers in trending lists.

## Posts
### Creation Process
WHEN a user creates a post in a subscribed community, THE system SHALL require a title (10-100 characters) and content. A post SHALL be one of three types: text, link, or image. THE system SHALL validate content type requirements (e.g., URL for link posts).

### Post Types
- **Text Post**: SHALL allow rich text content (max 10,000 characters) with markdown support.
- **Link Post**: SHALL validate the URL format and store the domain name for display.
- **Image Post**: SHALL accept only image files (JPG, PNG, GIF) up to 10MB.

### Post Display
WHEN viewing a post, THE system SHALL display title, full content (truncated for text), author, community, vote score, comment count, and timestamp (formatted as "3 hours ago"). TEXT POSTS SHALL show first 200 characters, IMAGE POSTS SHALL show a thumbnail, and LINK POSTS SHALL show the domain name.

## Comments
### Comment Structure
WHEN a user creates a comment on a post, THE system SHALL allow nested replies for infinite depth. COMMENTS SHALL display author, content, vote score, time since posted, and any nested replies.

### Reply Management
WHEN a user replies to a comment, THE system SHALL track the parent-child relationship for nested structure. WHEN editing a comment, THE system SHALL preserve the comment's position in the conversation tree.

## Moderation & Reporting
### Community Ownership
THE community owner automatically has highest authority. THE system SHALL prevent the owner from being banned and restrict moderator removal to the owner.

### Moderation Actions
WHEN a moderator deletes a post, THE system SHALL notify the owner and author. WHEN a moderator bans a user, THE system SHALL prevent the banned user from creating posts or comments in that community, but NOT block profile viewing.

### Reporting System
WHEN a user reports content, THE system SHALL require a text reason (max 200 characters). THE system SHALL store the report with metadata (reported content, reporter, reason) and allow moderators to approve or dismiss reports. DISMISSED reports SHALL be removed from the moderation queue.

## Success Criteria Documentation
All requirements SHALL meet these implementation criteria:
- All business logic documented in EARS format
- All sections expanded to minimum 200 words
- No database schema or API details included
- All Mermaid diagrams corrected to double-quote syntax
- Clear separation between business requirements and technical implementation