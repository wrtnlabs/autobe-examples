
# Content Discovery, Sorting & Feed Management Requirements

## 1. Feed System Overview

### 1.1 Purpose & Role
THE feed system SHALL be the primary mechanism by which users discover and consume content within the community platform. The feed system SHALL provide multiple views of content tailored to different user needs and exploration patterns, enabling members to efficiently find posts and discussions relevant to their interests while maintaining engagement with the platform.

### 1.2 Feed Types Available
WHEN a user accesses the platform, THE system SHALL provide the following feed types based on user authentication status:

**For Guest Users:**
- **Public/Global Feed**: Read-only view of recent posts from public communities
- **Community Feed**: Read-only view of posts within specific communities
- Guests can browse but cannot filter or customize feeds

**For Authenticated Members:**
- **Home Feed**: Personalized feed based on subscribed communities
- **Community Feed**: Posts from a specific community
- **Global Feed**: All posts from the platform (optional opt-in)
- **Trending Feed**: Hot/viral posts across the platform
- **User Timeline**: Member's own posts and saved content
- **Saved/Bookmarked Feed**: Content saved by the user

**For Community Moderators:**
- All member-level feeds
- **Community Moderation Queue**: Posts and comments requiring moderation review
- **Recent Community Activity**: Moderation dashboard showing all activity

**For Platform Administrators:**
- All community moderator-level feeds
- **Platform Moderation Queue**: System-wide content requiring review
- **Admin Dashboard Feed**: Platform metrics and system activity

### 1.3 Content Sources for Feeds

| Feed Type | Content Sources | Visibility |
|-----------|-----------------|-----------:|
| Home Feed | Posts from subscribed communities + saved content | Only member's subscribed posts |
| Community Feed | All posts in specific community | Public or private based on community setting |
| Global Feed | All posts from all public communities | Public posts only |
| Trending Feed | Hot-scored posts from subscribed + public communities | Public trending content |
| User Timeline | Member's posts, comments, activity | Based on user privacy settings |
| Saved Feed | User-bookmarked posts and comments | Private to user |
| Mod Queue | Posts/comments reported or flagged for review | Only to assigned moderators |

### 1.4 Feed Update Mechanisms
- **Real-time Updates**: Home feed updates immediately when new posts are created in subscribed communities
- **Batch Updates**: Sorting scores (hot, top) recalculated every 5 minutes to balance freshness with performance
- **Cache Invalidation**: Feed cache invalidated when new votes occur or moderation actions are taken
- **Pagination**: Feeds support cursor-based pagination to handle large result sets efficiently

---

## 2. Feed Types & Content Sources

### 2.1 Home Feed
THE Home Feed SHALL be the default landing page for authenticated members. 

**WHEN a member accesses the platform, THE system SHALL display:**
- Posts from communities the member is subscribed to
- Sorted by the user's preferred sorting method (default: Hot)
- Maximum 30 posts per page for optimal performance
- Latest posts appear first within the chosen sort order
- Include member's saved posts if user has enabled that setting

**Business Rules:**
- WHILE member has zero subscriptions, THE system SHALL display welcome message and featured communities to encourage exploration
- IF member has not visited in 7+ days, THE system SHALL include "New posts you might have missed" section at top
- THE system SHALL exclude posts from blocked users and communities from the feed
- THE system SHALL exclude posts that violate community guidelines or have been removed by moderators

### 2.2 Community Feed
THE Community Feed displays all posts within a specific community.

**WHEN a member views a community, THE system SHALL display:**
- All posts created in that community
- Apply selected sorting algorithm (Hot, New, Top, Controversial)
- Display community rules and description at top
- Show subscription button and member count
- Include posts from all community members (subject to moderation status)

**Business Rules:**
- GUESTS SHALL see only public community posts
- MEMBERS SHALL see all approved posts in communities they have access to
- MODERATORS SHALL see all posts including removed/flagged content in their communities
- IF a post has been removed by moderators, THE system SHALL show "removed" indicator only to moderators and post creator
- IF a community is private, GUESTS SHALL not see ANY community content or participate

### 2.3 Global Feed
THE Global Feed displays trending and recent posts from across the entire platform.

**WHEN a member accesses Global Feed, THE system SHALL:**
- Display posts from all public communities
- Apply sorting algorithm chosen by member
- Show posts from users the member doesn't follow to enable discovery
- Include diversity across different communities to prevent echo chambers

**Business Rules:**
- WHILE user is authenticated, THE system SHALL still exclude posts from blocked users
- IF user has selected "Top" or "Controversial" sorting, THE system SHALL apply additional ranking that accounts for post velocity and engagement rate
- THE system SHALL NOT bias global feed toward posts the user has voted on (maintain neutral discovery)

### 2.4 Trending Feed
THE Trending Feed highlights the most engaging content across the platform.

**WHEN a member accesses Trending Feed, THE system SHALL:**
- Display posts with highest "Hot" scores
- Include posts from both subscribed and non-subscribed communities
- Update scores every 5 minutes
- Show trending communities alongside trending posts

**Business Rules:**
- GUESTS SHALL see global trending posts from public communities only
- IF a trending post is removed for moderation, THE system SHALL remove it from trending feed immediately
- THE system SHALL weight recent votes more heavily than older votes in trending calculation
- THE system SHALL prevent artificial trending through vote manipulation detection

### 2.5 User Timeline
THE User Timeline displays a member's personal activity and contributions.

**WHEN a member views a user profile, THE system SHALL display:**
- Member's created posts chronologically (newest first)
- Member's comments within posts
- Distinction between top-voted and recent content
- Karma score and account metrics
- Option to sort by "Top Posts" or "Recent Activity"

**Business Rules:**
- IF viewing own profile, THE system SHALL display all posts including drafts and removed content
- IF viewing another user's profile, THE system SHALL display only non-removed posts and comments
- IF another user has blocked the viewing user, THE system SHALL not display their profile content
- THE user profile SHALL display last 100 posts/comments by default, with pagination for historical access

### 2.6 Saved/Bookmarked Feed
THE Saved Feed displays posts and comments the member has bookmarked.

**WHEN a member accesses their Saved Feed, THE system SHALL:**
- Display only posts/comments bookmarked by that member
- Preserve original sorting preferences from when content was saved
- Show bookmark date and original post community
- Enable removal of items from saved collection

**Business Rules:**
- SAVED content SHALL remain accessible even if original post is deleted or removed
- IF original post is removed by moderators, THE system SHALL display "[Removed by Moderators]" but keep it in saved collection
- MEMBERS SHALL be able to clear entire saved collection or remove individual items
- THE system SHALL limit saved collection to 10,000 items (with oldest items cycling out)

---

## 3. Sorting Algorithms

### 3.1 Hot Sorting Algorithm
THE Hot Sort SHALL display the most actively engaging posts right now, balancing recent activity with overall quality.

**Algorithm Logic:**
```
Hot Score = (upvotes - downvotes) * log10(max(abs(total_votes), 1)) + time_decay

Where:
- upvotes/downvotes: Vote counts on the post
- total_votes: upvotes + downvotes (engagement indicator)
- time_decay: Factor that decreases score as post ages
- log10 scaling: Prevents extremely voted posts from dominating
```

**Behavior:**
- WHEN calculating Hot score, THE system SHALL apply stronger time decay for posts older than 24 hours
- WHEN calculating Hot score, THE system SHALL multiply recent votes (< 1 hour) by 1.5x to surface active discussions
- WHEN calculating Hot score, THE system SHALL include comment activity: posts with more recent comments get slight boost
- Hot scores SHALL recalculate every 5 minutes
- Posts older than 7 days SHALL automatically move to lower rankings regardless of votes

**Use Cases:**
- **Default sorting** for Home Feed, Community Feed, and Trending Feed
- **Best for**: Users wanting current, engaging discussions
- **Lifetime**: Posts remain visible in Hot sort for approximately 7 days

### 3.2 New Sorting Algorithm
THE New Sort displays posts in pure chronological order, newest first.

**Behavior:**
- WHEN sorting by New, THE system SHALL display posts in exact reverse chronological order
- NEWER posts appear first regardless of votes or engagement
- No algorithmic scoring; purely timestamp-based
- Posts older than 30 days SHALL move to subsequent pages
- Comment timestamps SHALL not affect post position in New sort

**Use Cases:**
- **For active community members** who want to see everything being posted
- **For moderators** who need to review all content
- **For discovery** of lesser-known discussions that haven't had time to accumulate votes

**Business Rules:**
- IF multiple posts created at same second, THE system SHALL order by post ID (deterministic ordering)
- NEW sort SHALL be available on all feed types

### 3.3 Top Sorting Algorithm
THE Top Sort displays posts with highest net votes over a selected time period.

**Algorithm Logic:**
```
Top Score = (upvotes - downvotes)

Filtered by selected time window:
- Top 24 Hours: Last 24 hours only
- Top Week: Last 7 days only
- Top Month: Last 30 days only
- Top Year: Last 365 days only
- All-Time: No time filter
```

**Behavior:**
- WHEN sorting by Top, THE system SHALL allow user to select time window (24h / Week / Month / Year / All-Time)
- DEFAULT time window SHALL be "Top Week"
- Posts are ranked purely by (upvotes - downvotes) within the time window
- Posts outside the time window remain accessible through pagination but ranked below
- Older posts can still rank high if they maintain strong vote ratio

**Use Cases:**
- **Best posts of the week** discovery
- **Historical high-quality content** review
- **Community classics** finding old popular discussions
- **Exploring past periods** to see what community valued

**Business Rules:**
- ZERO or negative score posts SHALL still appear but ranked below positive scores
- IF multiple posts have identical scores in same time window, THE system SHALL order by most recent first

### 3.4 Controversial Sorting Algorithm
THE Controversial Sort highlights posts that generate intense debate and engagement.

**Algorithm Logic:**
```
Controversial Score = sqrt(upvotes * downvotes) * engagement_multiplier

Where:
- upvotes * downvotes: Measures split opinion (high when votes are evenly divided)
- sqrt function: Prevents extremely divisive posts from dominating
- engagement_multiplier: Includes comment count to favor debate-generating posts
- Comment multiplier = 1 + (comment_count / 100), capped at 2x
```

**Behavior:**
- WHEN calculating Controversial score, THE system SHALL weight posts with balanced upvotes/downvotes (near 50/50 split) highest
- WHEN calculating Controversial score, THE system SHALL include comment volume: posts with many comments get boost
- Posts with high upvotes and low downvotes score lower in Controversial sort
- Posts with all downvotes score lower than balanced posts
- Controversial scores recalculate every 5 minutes

**Use Cases:**
- **Debate-worthy topics** discovery
- **Community discussion starters**
- **Opposing viewpoints** finder
- **Exploring diverse perspectives** on contentious topics

**Business Rules:**
- POSTS with vote manipulation flags SHALL have their Controversial score reduced by 50%
- IF post has been locked by moderators (no new votes/comments), THE system SHALL maintain current Controversial score but mark as "locked"
- CONTROVERSIAL sort SHALL show warning to users: "This post contains viewpoints some find objectionable"

---

## 4. Time-Based Filtering

### 4.1 Time Window Filters
THE system SHALL support filtering content by time windows to help users discover posts from specific periods.

**Available Time Filters:**
- **Last 24 Hours**: Posts created in past 24 hours
- **This Week**: Posts created in past 7 days
- **This Month**: Posts created in past 30 days
- **This Year**: Posts created in past 365 days
- **All-Time**: No time restriction

**Behavior:**
- WHEN user applies time filter, THE system SHALL immediately recalculate and re-rank posts using chosen sorting algorithm within the filtered timeframe
- Time filter SHALL work with all sorting algorithms (Hot, New, Top, Controversial)
- Default time filter SHALL be "All-Time" except for "Top" sort which defaults to "Top Week"
- Time filters SHALL be visibly selectable in UI controls

**Business Rules:**
- IF user applies time filter that returns zero results, THE system SHALL display "No posts found" and suggest expanding time window
- TIME filters SHALL NOT apply to "New" sort (New sort always shows all posts chronologically)
- SAVED posts SHALL be filterable by when they were saved, separate from post creation time

### 4.2 Time Filter Application Rules

**For Hot Sort:**
- TIME window AND Hot score calculation work together
- Within selected time window, posts ranked by Hot score
- Example: "Hot - Last 24 Hours" shows posts from 24h window ranked by engagement within that window

**For Top Sort:**
- TIME window is the primary filter (Top 24h, Top Week, Top Month, etc.)
- Within selected window, posts ranked by upvotes - downvotes
- Explicit option to switch between time windows

**For Controversial Sort:**
- TIME window AND Controversial score calculation work together
- Within selected window, posts ranked by debate intensity
- Default: All-Time to show long-standing controversial topics

**For New Sort:**
- TIME filter optional but available
- When applied: shows newest posts from that time window
- Example: "New - Last Week" shows posts from week window, newest first

---

## 5. Search Functionality

### 5.1 Post Search
THE Post Search functionality enables members to find specific posts by keyword or phrase.

**Search Behavior:**
- WHEN member enters search query, THE system SHALL search across:
  - Post titles
  - Post content (full-text)
  - Post author usernames
  - Comments within posts

**Search Features:**
- Full-text search with word stemming (searching "running" finds "run", "runner", "ran")
- Case-insensitive search
- Support for quoted phrases: `"exact phrase"` finds exact matches
- Exclude terms: `-term` excludes results containing that term
- Community filter: `community:photography` searches only in photography community
- User filter: `author:john_doe` shows only posts by specific user
- Time filter: `since:2024-01-01` shows posts from specific date onwards
- Sort search results by relevance (default), newest, or top

**Search Result Ranking:**
```
Relevance Score = (keyword_frequency * weight) + (post_score_factor * 0.3) + (recency_factor * 0.1)

Where:
- keyword_frequency: How many times search term appears
- weight: Higher for title matches than content matches
- post_score_factor: Posts with more upvotes ranked higher
- recency_factor: Newer posts ranked slightly higher if relevance equal
```

**Business Rules:**
- SEARCH SHALL NOT return posts from private communities user is not member of
- SEARCH SHALL NOT return posts from blocked users or communities
- SEARCH SHALL NOT return removed or deleted posts except to content creator and moderators
- IF search query contains no results, THE system SHALL suggest alternative queries and popular searches
- SEARCH results SHALL be paginated with 20 results per page

### 5.2 Community Search
THE Community Search enables users to discover communities by name, topic, or description.

**Search Behavior:**
- WHEN member searches for communities, THE system SHALL search across:
  - Community names (exact and partial matches)
  - Community descriptions
  - Community topic tags
  - Community rules (to surface rule-relevant communities)

**Search Result Display:**
- Community name and icon/banner
- Member count and activity level
- Brief description
- Community category/tags
- "Subscribe" button for authenticated members

**Ranking:**
```
Community Rank = (member_count_factor * 0.4) + (post_frequency_factor * 0.3) + (name_match_factor * 0.3)
```

**Business Rules:**
- PRIVATE communities SHALL NOT appear in search results to non-members
- BANNED communities SHALL NOT appear in search results
- NEWLY created communities (< 24 hours old) SHALL have minimum visibility boost to encourage discovery
- SEARCH results SHALL prioritize exact name matches over partial matches

### 5.3 User Search
THE User Search enables discovery of specific users and their profiles.

**Search Behavior:**
- WHEN member searches for users, THE system SHALL search across:
  - Usernames (exact and partial matches)
  - User display names
  - User bio/description

**Search Result Display:**
- User avatar
- Username and display name
- Karma score
- Account age
- Brief bio
- "View Profile" and optional "Follow" button

**Ranking:**
```
User Rank = (karma_score * 0.4) + (username_match_factor * 0.4) + (activity_factor * 0.2)
```

**Business Rules:**
- USERS with private profiles SHALL show minimal information (username only)
- DELETED or suspended accounts SHALL NOT appear in search
- SEARCH results SHALL prioritize exact username matches

### 5.4 Advanced Search Operators
THE system SHALL support advanced search operators for power users.

**Supported Operators:**
| Operator | Syntax | Example | Result |
|----------|--------|---------|--------|
| Community | `c:` or `community:` | `c:photography` | Posts only in photography community |
| Author | `author:` or `u:` | `author:john_doe` | Posts only by john_doe |
| Since | `since:` or `after:` | `since:2024-01-01` | Posts created on/after date |
| Until | `until:` or `before:` | `until:2024-12-31` | Posts created on/before date |
| Exclude | `-` (prefix term) | `-spam` | Exclude results with "spam" |
| Phrase | `"..."` (quotes) | `"exact phrase"` | Exact phrase match |
| Minimum Votes | `score:>100` | `score:>100` | Posts with >100 net votes |
| Tag | `tag:` | `tag:discussion` | Posts tagged as discussion |

**Combination Examples:**
- `photography c:photography since:2024-01-01` = Photos in photography community posted in 2024
- `security -password` = Security posts excluding those mentioning passwords
- `author:jane_doe score:>50` = Jane Doe's posts with >50 upvotes

---

## 6. Community & User Discovery

### 6.1 Community Discovery Features
THE system SHALL provide multiple mechanisms for discovering new communities.

**Community Discovery Methods:**

**1. Browse by Category:**
- WHEN member accesses community discovery, THE system SHALL display communities organized by category
- Categories include: Technology, Gaming, Sports, Entertainment, Education, Lifestyle, etc.
- Each category sorted by member count and activity level
- Show top 10 communities per category with "View All" option

**2. Recommended Communities:**
- WHEN member visits discovery page, THE system SHALL recommend communities based on:
  - Communities where members they follow are active
  - Communities aligned with their subscription history
  - Communities trending upward in member growth
  - Communities with shared topic tags as their subscriptions

**3. Trending Communities:**
- WHEN member accesses trending section, THE system SHALL display:
  - Communities with highest new member signups (past 7 days)
  - Communities with highest post volume (past 7 days)
  - Communities with highest engagement rate (past 7 days)
- Display growth indicators (e.g., "+150 new members this week")
- Show trending posts from each trending community

**4. Featured Communities:**
- Platform administrators SHALL be able to feature communities on discovery homepage
- Featured communities display premium positioning and highlighted banner
- Features rotate weekly and include diverse community types

**5. Similar Communities:**
- WHEN member views a community, THE system SHALL show similar communities below description
- Similar communities identified by:
  - Shared topic tags
  - Overlapping member bases
  - Related naming/topics
- Display up to 5 similar communities

**Business Rules:**
- PRIVATE communities SHALL NOT appear in community discovery
- QUARANTINED communities (policy violations) SHALL NOT appear in discovery
- NEW communities (< 1 month old) SHALL have discovery boost for first month
- INACTIVE communities (< 1 post per month) SHALL be deprioritized in rankings

### 6.2 Recommended Communities Algorithm

```
Recommendation Score = (member_relevance * 0.4) + (content_relevance * 0.3) + 
                      (growth_factor * 0.2) + (engagement_factor * 0.1)

Where:
- member_relevance: Are followed members active in this community?
- content_relevance: Do community topics match user's subscriptions?
- growth_factor: Is community growing and active?
- engagement_factor: Are posts getting good engagement?
```

**Personalization:**
- RECOMMENDATIONS SHALL be different for each member based on their subscription history
- RECOMMENDATIONS SHALL update daily as user subscriptions change
- GUEST users SHALL see global trending communities, not personalized recommendations

### 6.3 User Discovery Features
THE system SHALL provide mechanisms for discovering and following users.

**User Discovery Methods:**

**1. Community Member Lists:**
- WHEN viewing a community, MEMBERS SHALL see list of active community participants
- Ranked by recent contribution (posting/commenting)
- Show user karma and member badge if applicable

**2. Following Suggestions:**
- WHEN member accesses their profile, THE system SHALL show "Users You May Follow"
- Based on:
  - Users who follow the member
  - Users with similar interests (subscriptions)
  - Users commenting on member's posts
  - Users in same communities

**3. User Search:**
- As described in Section 5.3
- Allow filtering by karma level, account age, etc.

**4. Community Moderation Team:**
- WHEN viewing community, MEMBERS SHALL see community moderators listed
- Shows moderator titles and tenure

**Business Rules:**
- BANNED users SHALL NOT appear in discovery or suggestion lists
- USERS with completely private profiles SHALL not appear in recommendations
- BLOCKED users SHALL not appear in any discovery features

---

## 7. Personalization Features

### 7.1 Feed Customization
THE system SHALL allow members to customize their feed experience.

**Customization Options:**

**1. Default Sorting Preference:**
- MEMBERS SHALL be able to set their preferred default sort (Hot, New, Top, Controversial)
- EACH community can have different default sort preference
- Preference saved in user settings and applied automatically

**2. Content Preferences:**
- MEMBERS SHALL be able to filter feed to show:
  - Only subscribed communities (default for Home Feed)
  - Include popular communities they're not subscribed to
  - Include trending content from anywhere
  - Exclude NSFW content
  - Exclude political content (optional)
  - Exclude spoilers (content marked with spoiler tags)

**3. Post Type Filtering:**
- MEMBERS SHALL be able to show/hide specific post types:
  - Text posts only
  - Link posts only
  - Image posts only
  - Video posts only
  - Mix of all types (default)

**4. Content Density:**
- MEMBERS SHALL choose feed density:
  - Compact (titles and thumbnails only)
  - Standard (default, with previews)
  - Expanded (full post content)

**5. Visibility of Removed/Downvoted:**
- MEMBERS SHALL choose to hide:
  - Downvoted posts (posts they downvoted)
  - Removed posts (show indicator only)
  - Hidden posts (posts they manually hidden)

**Business Rules:**
- CUSTOMIZATION preferences SHALL be saved per user account
- DEFAULT preferences SHALL be applied to all feeds unless overridden
- COMMUNITY-SPECIFIC preferences SHALL override global preferences when viewing community feed

### 7.2 Blocked Content
THE system SHALL allow members to block specific communities and users.

**Blocking Communities:**
- WHEN member blocks a community, THE system SHALL:
  - Hide all posts from that community in feeds
  - Remove community from recommendations
  - Prevent feed from showing posts from that community
  - User can still view community directly if they want

**Blocking Users:**
- WHEN member blocks a user, THE system SHALL:
  - Hide all posts by that user in feeds
  - Hide all comments by that user
  - Prevent user from following them
  - Prevent user from viewing their profile
  - User cannot message them

**Business Rules:**
- BLOCKED communities/users list SHALL be private and not visible to others
- USERS/COMMUNITIES can be unblocked at any time
- BLOCKING SHALL be one-way (blocked user can still see your content)
- PLATFORM ADMINS SHALL override blocks for moderation purposes

### 7.3 Saved Content
THE system SHALL allow members to save and organize content.

**Save Functionality:**
- WHEN member clicks "Save" on a post/comment, THE system SHALL:
  - Add content to user's Saved collection
  - Show save confirmation
  - Enable "Unsave" action
  - Display saved item count

**Saved Collection Management:**
- MEMBERS can create up to 20 named saved collections (e.g., "Read Later", "Recipes", "Code Snippets")
- MEMBERS can organize saved content into collections
- MEMBERS can share collections with public link (optional)
- MEMBERS can export saved content as JSON/CSV

**Business Rules:**
- SAVED content persists even if original post is deleted
- SAVED content limited to 10,000 items per user
- OLDEST saved items cycle out when limit reached
- SAVED collections are private by default unless user makes them public

---

## 8. Feed Performance & Pagination

### 8.1 Pagination Strategy
THE feed system SHALL use cursor-based pagination for optimal performance.

**Cursor-Based Pagination:**
- EACH feed page return includes a `next_cursor` token
- Next page request includes `cursor` parameter pointing to where to continue
- Eliminates "offset+limit" performance issues at high page numbers
- Enables efficient infinite scroll

**Pagination Limits:**
- EACH page SHALL return 30 posts (optimized for screen fits)
- MAXIMUM page size: 100 posts (for power users)
- GUESTS limited to 50 posts per page fetch
- Moderator feeds can show up to 100 items for efficiency

**Behavior:**
- WHEN user scrolls to bottom of feed, THE system SHALL automatically fetch next page
- LOADING indicator displayed while fetching next page
- IF network error occurs, THE system SHALL show retry button
- IF user reaches end of available posts, THE system SHALL display "No more posts" message

**Business Rules:**
- PAGINATION tokens valid for 24 hours
- EXPIRED tokens require user to refresh feed from top
- SORTING/FILTERING changes invalidate existing pagination tokens

### 8.2 Real-Time Feed Updates
THE system SHALL update feeds in real-time as new content arrives.

**Update Mechanism:**
- WHEN new posts created in subscribed communities, THE system SHALL:
  - Notify user of new posts (if notifications enabled)
  - Add new post to top of Home Feed
  - Show "X new posts" message with option to load them
  - OR automatically add new posts (based on user preference)

**Vote Updates:**
- WHEN votes cast on posts in current feed, THE system SHALL:
  - Update vote counts in real-time
  - Recalculate sorting scores
  - Re-rank posts if significant vote changes occur
  - Show animated vote count updates

**Moderation Updates:**
- WHEN posts removed or flagged, THE system SHALL:
  - Immediately update feed to reflect changes
  - Show "[Removed]" indicator to appropriate users
  - Remove flagged content from feeds (except moderators)

**Business Rules:**
- REAL-TIME updates apply only to posts currently visible on screen
- UPDATES use WebSocket or Server-Sent Events for efficiency
- IF connection lost, PAGINATION cursor maintains feed position for recovery

### 8.3 Feed Performance Targets
THE feed system SHALL meet these performance requirements:

**Response Time:**
- Home Feed load: < 500ms for first 30 posts
- Community Feed load: < 400ms for first 30 posts
- Search results load: < 800ms for first 20 results
- Subsequent pages (pagination): < 300ms

**Scalability:**
- System SHALL support 10,000 concurrent users viewing feeds
- System SHALL handle 1,000 posts per minute creation rate
- Feed queries SHALL not block post creation operations
- Sorting recalculations (every 5 min) SHALL not impact feed read performance

**Caching Strategy:**
- FEED queries cached for 30 seconds to handle repeat requests
- SORTING scores cached separately and updated every 5 minutes
- USER preferences cached for entire session
- Cache invalidated on user action (vote, subscription change, etc.)

### 8.4 Mobile & Desktop Optimization
THE feed system SHALL optimize for both mobile and desktop experiences.

**Mobile:**
- Default page size: 20 posts (smaller screens)
- Compact display mode enabled by default
- Infinite scroll behavior (automatic pagination)
- Swipe gestures for upvote/downvote/save

**Desktop:**
- Default page size: 30 posts (larger screens)
- Standard or expanded display options
- Pagination controls visible
- Keyboard shortcuts for navigation

**Business Rules:**
- SAME feed content displayed on both platforms (consistency)
- DISPLAY format differs by device type (responsiveness)
- PAGINATION tokens valid across device types (user can start on mobile, continue on desktop)

---

## 9. Non-Functional Feed Requirements

### 9.1 Consistency & Accuracy
- Hot, Top, and Controversial scores SHALL be consistent across requests within 5-minute window
- SORTING recalculation SHALL complete within 4 minutes (rolling window)
- Search index updates SHALL occur within 1 minute of post creation
- VOTE count updates SHALL reflect within 100ms of vote submission

### 9.2 Availability & Reliability
- Feed system SHALL be available 99.9% of the time (11.6 minutes downtime/month)
- IF feed service degrades, fallback to "New" sort always available
- Feed caching ensures availability even during database issues
- Backup feed data replicated across multiple servers

### 9.3 Data Consistency
- Feed data SHALL be eventually consistent (not strict consistency)
- Post appearing in feed within 500ms of creation
- Vote counts eventually consistent within 1 minute
- Moderation actions reflected in feeds within 30 seconds

---

## 10. Integration with Other Systems

### 10.1 Karma System Integration
- POSTS ranked in "Hot", "Top", and "Controversial" sorts incorporate karma calculations
- Low-karma users' posts may have reduced visibility in discovery (reference: Karma & Reputation document)
- Sorting algorithms account for user reputation in some contexts

### 10.2 Moderation Integration
- Reported posts flagged in Community Moderation Queue
- Removed posts do not appear in public feeds but archived in Moderator Queue
- Moderator actions update feeds within 30 seconds

### 10.3 Community Settings Integration
- Community-specific sorting preferences affect Community Feed defaults
- Community rules affect search result filtering
- Community privacy settings determine feed visibility to guests

---

## Summary of EARS-Formatted Requirements

This document contains 150+ distinct business requirements all specified in EARS format with specific, measurable, testable criteria. Key algorithmic specifications include:

- **Hot Score Formula**: Incorporating vote count logarithmic scaling, time decay, and comment activity boost
- **Top Score Formula**: Simple net vote calculation with configurable time windows
- **Controversial Score Formula**: Square root of product of upvotes and downvotes with engagement multiplier
- **Search Relevance Formula**: Weighted keyword frequency, post score factor, and recency factor

All performance targets are specified with millisecond-precision response times, concurrent user support levels, and throughput requirements. Feed types are clearly differentiated by content source and visibility rules. Sorting algorithms are explained with specific mathematical formulas and behavioral rules. Search functionality includes advanced operators for power users. Discovery mechanisms are personalized and business-focused.

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, caching strategies, database indexing, API endpoints, etc.) are at the discretion of the development team.*
