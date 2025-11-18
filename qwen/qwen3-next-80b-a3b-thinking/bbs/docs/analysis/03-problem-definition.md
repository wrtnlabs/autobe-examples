# EconomicBBS Problem Definition

## Current Challenges

Current platforms for economic and political discussion face significant challenges that hinder meaningful engagement. 

The existing ecosystem is dominated by large social media platforms and general-purpose forums that are not designed for deep, focused economic and political discourse. These platforms suffer from several critical issues:

1. **Advertising Overload**: Platforms such as Reddit, Twitter (now X), and others bombard users with advertisements and sponsored content. For instance, a single page of news or discussion may contain 8-12 ad units, including intrusive video ads, interstitials, and native advertisements that mimic organic content. This constant bombardment distracts users from substantive conversations and degrades the reading experience.

2. **Noise and Misinformation**: Without dedicated moderation for economic and political topics, current platforms are flooded with low-quality content, clickbait, and deliberate misinformation. For example, on Twitter, a single trending topic can have over 50% of contributions from accounts that are not credible experts but rather bots or accounts spreading propaganda. This noise makes it difficult for users to find authoritative information.

3. **Fragmented Communities**: Economic discussions are scattered across multiple platforms without a unified space. A user might find economic analysis on a dedicated subreddit, political commentary on Twitter, and news on news websites. This fragmentation requires users to switch between platforms to get a complete picture, which is time-consuming and leads to incomplete understanding.

4. **Lack of Media Support**: Current platforms often have limitations on attaching supporting data. For instance, Twitter restricts images to 4 per tweet, and YouTube requires separate video uploads for data visualizations. This makes it hard for users to share complex economic data that requires charts and diagrams to illustrate points. As a result, discussions are often based on text alone, which is insufficient for complex topics.

5. **Poor Content Discovery**: Algorithms prioritize engagement over quality, pushing sensational content over nuanced analysis. This means that well-researched economic articles get buried under viral, divisive posts. For example, a 5,000-word analysis of fiscal policy may be overshadowed by a 280-character meme about the same topic.

6. **Moderation Challenges**: Platforms rely on automated systems that are ineffective at distinguishing between legitimate criticism and hate speech, leading to either overly restrictive moderation (shutting down valid discussion) or insufficient moderation (allowing toxic behavior). The lack of human moderators specialized in economics and politics means that false information and harassment often go unchecked.

## Market Needs

The economic and political discussion market requires a platform that directly addresses these challenges. The following business requirements must be met to fulfill the market need:

WHEN a user wishes to participate in economic and political discussions, THE system SHALL provide an ad-free environment with no banner ads, video ads, or sponsored content.  
WHEN a user creates a discussion about an economic topic, THE system SHALL prioritize content quality over virality in the algorithm, ensuring that well-researched articles with supporting data are surfaced to users.  
WHILE a user is reading an article, THE system SHALL allow for the attachment of images (PNG, JPG) with a maximum file size of 5 MB per image to support explanations with charts, graphs, and visual data.  
IF a discussion topic is trending across multiple platforms, THE system SHALL allow content to be shared from other platforms but only when verified as from a credible source, with attribution to the original creator.  
WHERE a user creates an article, THE system SHALL ensure that the article is immediately visible in a dedicated section for economic and political discourse, separate from non-relevant topics.  
WHEN a comment is made on an economic article, THE system SHALL allow up to 500 characters per comment to encourage concise, focused responses while discouraging off-topic rambling.  
THE system SHALL implement a simple volunteer moderation system where trusted members review reported content within 24 business hours (excluding holidays). If no moderator is available, the system SHALL hold the report and notify an administrator.  
WHEN a user searches for "inflation", THE system SHALL return results that are focused on economics and not politics, and vice versa, by using topic-specific tagging that aligns with user intent.  
THE system SHALL provide a clean interface with dark mode support and font resizer to improve readability for users who need to consume long articles.  
WHILE a user is contributing to a discussion, THE system SHALL require all users to agree to a community guideline that prohibits personal attacks and requires evidence-based arguments, with a one-click report feature for violations.  

These requirements address the core gaps in the current market: the absence of a dedicated, high-quality platform for economic and political discourse that minimizes noise, supports rich media, and promotes substantive discussion.

## User Pain Points

### For Guests (Unauthenticated Users)
- Guests cannot post articles or comments on any platform that requires registration, forcing them to share insights on social media where their thoughts get buried in noise. They want to contribute but find it cumbersome to create an account everywhere. On platforms that allow guest posting (like some forums), they often encounter CAPTCHAs that are difficult and then face long moderation delays for their one-off contribution.

### For Members (Authenticated Users)
- Members who want to share detailed economic analysis are frustrated by having to switch between apps to attach data visualizations. On Twitter, they are limited to 4 images per tweet, but for an in-depth analysis, they need to share multiple charts. On Reddit, they must upload all images to an external service and then link them, which breaks the seamless experience.
- Members report that the algorithms of current platforms actively work against their goals. When they post a well-researched article, the platform shows it to a small number of people because it's not "engaging" enough to the algorithm, while viral memes get shown to millions. This discourages serious contributors.
- Members want to have meaningful debates without encountering personal attacks. However, current platforms lack effective moderation of economic disputes, often allowing comments that attack the person rather than the argument to remain. This creates a hostile environment that drives away experts.
- Members want to read about topics like "global interest rates" but current platforms mix in unrelated political debates and non-economic news. They have no way to filter the content to be purely economic, and the search function returns results that are off-topic.
- When members try to share a data chart as an image, the platform compresses it so much that the text on the chart becomes unreadable. This is especially true when they try to attach charts with small text (e.g., axis labels). They must then explain the chart in words, which is less effective and less accurate.


### Current User Journey Pain Points

The following Mermaid diagram illustrates the typical journey of a user attempting to share economic insights on current platforms:

```mermaid
graph LR
    A["User has economic insight"] --> B["Current platforms: Twitter, Reddit, Forums"]
    B --> C["Ad overload and noise"]
    C --> D["Difficulty posting images"]
    D --> E["Off-topic content"]
    E --> F["Algorithm burying quality content"]
    F --> G["User frustration and disengagement"]
```

### System-Wide Pain Points
- Current platforms do not have a way to verify the expertise of contributors. A user can post an article claiming to be an economist but without any credential verification. This leads to misinformation spreading because there's no way to distinguish an expert from a random person. E.g., a tweet from a fake economist can go viral with false claims.
- The lack of dedicated communities for specific topics means that discussions on "monetary policy" are mixed with discussions on "fiscal policy", "trade policy", and even unrelated political topics. Users cannot focus on one narrow economic topic without being bombarded by related but different topics.


## Example Scenario: The Frustrated Economists

A group of economists trying to discuss the implications of a rising interest rate environment currently face:

1. **On Twitter**: They must condense their analysis into 280 characters per tweet, share multiple tweets, and then attach a single chart (or a few) which gets compressed. They then face replies that are off-topic or trolling, and the thread gets buried under viral content in minutes.

2. **On Reddit**: They post in the economics subreddit, but it gets buried under political topics and meme-based discussion. They need to attach multiple charts but can only share one image per post (with links to the rest), making for a poor reading experience.

3. **On specialized forums**: These often have strict posting rules that require academic credentials to join, limiting the audience to experts and excluding students or professionals who are not formally trained.

EconomicBBS is designed to eliminate these pain points by providing:

- A dedicated space for economic and political discussion without ads or distractions.
- Support for multiple high-quality image attachments directly in articles.
- A simple community-driven moderation model that focuses on topic relevance and evidence-based discussion.
- A clean interface optimized for reading and analysis, with clear topic segmentation.

This document provides the foundational problem statement and requirements that the EconomicBBS system will address. The subsequent functional requirements document will detail how these business requirements are implemented in the technical architecture.