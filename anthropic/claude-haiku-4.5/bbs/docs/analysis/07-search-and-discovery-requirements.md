# Search and Discovery Requirements

## 1. Discovery Overview

The search and discovery system provides members and guests with efficient ways to find relevant economic and political discussions on the board. This system is intentionally simple and straightforward—designed to help users quickly locate content without complex algorithms or overwhelming options.

### Purpose of Discovery Features

The discovery system addresses these core user needs:
- **Finding Specific Topics**: Members want to read discussions about specific economic or political issues (e.g., "inflation," "trade policy")
- **Following Conversations**: Members want to find all articles and comments in a particular topic area (e.g., all "Economics" discussions)
- **Staying Updated**: Members want to see the newest discussions and recent activity
- **Browsing by Interest**: Members want to explore discussions organized by broad categories like "Economics" or "Politics"

### Why Discovery Matters for This Service

A discussion board succeeds when users can easily find conversations relevant to their interests. Without effective discovery:
- New members cannot find existing discussions on topics they care about
- Valuable discussions get lost in the archive
- Duplicate discussions are created because members didn't find the original
- The board becomes cluttered and difficult to navigate

Therefore, the discovery system is a critical component of the discussion board's usability and long-term success.

### Design Philosophy: Simple and Straightforward

This document specifies a deliberately simple discovery system that:
- Uses basic keyword matching (not machine learning or complex ranking algorithms)
- Organizes content chronologically and by category (not by complex engagement metrics)
- Provides essential filters without overwhelming options
- Focuses on practical utility rather than sophisticated analytics
- Ensures fast search performance without complex indexing overhead

---

## 2. Article Browsing & Main Feed

### Default Browsing Experience

WHEN a guest or member first visits the discussion board, THE system SHALL display the main feed containing all published articles organized chronologically.

WHEN the main feed loads, THE system SHALL include only articles with "published" status, excluding articles in draft, pending review, or rejected statuses.

### Chronological Ordering

THE system SHALL display articles in reverse chronological order, showing the most recently created or updated articles first.

THE system SHALL update the article timestamp to reflect when an article was last modified (when edits occur), affecting its position in the feed.

WHEN two articles are created at exactly the same timestamp, THE system SHALL use the article ID as a tiebreaker to ensure consistent ordering.

### Article List Presentation

Each article in the browsing feed SHALL display the following information in this order:
- **Article Title**: The full title of the discussion (clickable link to article detail page)
- **Author Name**: The display name of the member who created the article
- **Creation Date**: When the article was first published (formatted as "2 hours ago" or specific date)
- **Category**: The category the article belongs to (e.g., "Economics," "Politics") displayed as a tag or label
- **Preview Text**: The first 150-200 characters of the article body (truncated with "..." if longer)
- **Comment Count**: The number of published comments on the article (formatted as "12 comments" or similar)
- **First Image Thumbnail**: If the article has image attachments, display a small thumbnail (optional, max 100x100px)

### Article List Presentation Example

```
┌─────────────────────────────────────────────────────────┐
│ "Impact of Recent Interest Rate Changes on Consumer    │
│  Spending" [Economics tag]                               │
│ by john_smith | Published 2 hours ago                    │
├─────────────────────────────────────────────────────────┤
│ Recent Federal Reserve decisions have sparked debate    │
│ about their impact on consumer behavior. Let's discuss   │
│ the economic implications of these policy changes and... │
├─────────────────────────────────────────────────────────┤
│ 12 comments | [thumbnail image]                         │
└─────────────────────────────────────────────────────────┘
```

### Pagination

WHEN browsing the main feed or search results, THE system SHALL display articles in pages of 20 items per page.

WHEN a user navigates to page N, THE system SHALL display articles [(N-1)*20] through [N*20-1] from the sorted result set.

THE system SHALL provide "Previous" and "Next" navigation buttons to move between pages.

THE system SHALL display the current page number and total number of pages available (format: "Page 2 of 5").

THE system SHALL also provide direct page number links (e.g., "1 | 2 | 3 | 4 | 5") so users can jump to a specific page.

WHEN a user navigates to a page that exceeds the total number of available pages, THE system SHALL display the last available page with an appropriate message.

### Load Performance

WHEN a user loads the main feed or any browse page, THE system SHALL respond with the article list within 2 seconds.

IF the response time exceeds 3 seconds, THE system SHALL display a loading indicator to keep the user informed.

### Access Control for Browsing

THE system SHALL display only published articles to guests and members on the main feed.

THE system SHALL NOT display draft articles or articles pending moderator approval to guests or regular members on the main feed.

WHEN a member views the main feed, THE system SHALL display their own draft and pending-approval articles in a separate section (e.g., "Your Pending Articles: 1") with a link to view them.

THE system SHALL display published articles and all pending-approval articles to moderators on the main feed, with clear visual indicators distinguishing approval status (e.g., "[Pending]" label, different background color, or icon).

WHEN a moderator hovers over or clicks a pending article, THE system SHALL display a quick action menu with "Approve" and "Reject" buttons.

---

## 3. Category Organization

### Category Structure

THE discussion board SHALL support the following categories for organizing articles:
1. **Economics**: Articles discussing economic theory, policy, markets, and financial systems
2. **Politics**: Articles discussing political systems, governance, policies, and international relations  
3. **Other**: Articles on topics not fitting the primary categories

THE system SHALL use these three categories for the initial implementation.

THE category list MAY be extended in future versions, but changing categories requires administrator action.

### Article Category Assignment

WHEN a member creates a new article, THE system SHALL require the member to select exactly one category from the available category list.

THE system SHALL display categories in a dropdown menu with descriptions for each option to help users choose correctly.

THE system SHALL NOT allow articles to be created without a category assignment—if submission is attempted without category selection, THE system SHALL display error message: "Please select a category for this article."

THE system SHALL store the category assignment with the article and use it for filtering, organization, and search.

### Category Browsing

WHEN a guest or member clicks on a category name or filter option, THE system SHALL filter and display only articles belonging to that category.

THE system SHALL apply the same pagination, sorting, and chronological ordering to category-filtered views as to the main feed.

WHEN a user browses articles within a category, THE system SHALL display clear indication that filtering is active (e.g., "Showing Economics Articles" or a breadcrumb: "Home > Economics").

THE system SHALL include a "Clear Filter" or "View All" link to return to the unfiltered main feed.

### Category Navigation Display

THE system SHALL provide a clear category navigation menu prominently on the main page and article browsing pages. The menu SHALL display:
- "All Articles" (main feed, no filter)
- "Economics" (with article count)
- "Politics" (with article count)
- "Other" (with article count)

THE system SHALL update article counts for each category in real-time or at least every hour to reflect current article quantities.

### Category-Specific Empty State

WHEN a category filter returns no articles (e.g., "Other" category has no articles yet), THE system SHALL display a message: "No articles in this category yet. Browse other categories or create the first discussion!"

THE system SHALL provide links to browse other categories and to create a new article.

### Moderator Category Management

THE system SHALL allow moderators to reassign articles to different categories if needed (e.g., if an article was miscategorized by the creator).

WHEN a moderator reassigns an article to a different category, THE system SHALL log this action in the audit trail with moderator name and timestamp.

WHEN an article's category is changed, THE system SHALL immediately update the article's category in all views (feed, search results, filters).

---

## 4. Search Functionality

### Basic Keyword Search Interface

THE system SHALL provide a search box/field prominently on the main page, article browsing pages, and category pages.

THE search box SHALL include placeholder text: "Search discussions..." to guide users.

THE system SHALL allow users to enter multi-word search queries (e.g., "federal reserve policy").

### Search Submission and Results Page

WHEN a user enters a search query and submits it (by pressing Enter or clicking Search button), THE system SHALL search for matching articles and return results within 1 second for queries matching fewer than 100 articles.

WHEN search results are displayed, THE system SHALL show a results page with:
- Search query displayed at top (e.g., "Search results for: 'inflation'")
- Number of results found (e.g., "Found 23 articles")
- List of matching articles in pagination format (20 per page)
- Each article shown in the same format as the main feed

### Search Scope

THE search functionality SHALL search across the following article fields:
- **Article Title**: Full-text keyword matching of the article title
- **Article Body**: Full-text keyword matching of the article content

THE search SHALL NOT search through comments—only article content is indexed for search.

THE search SHALL NOT search user profiles, usernames, or other metadata.

### Keyword Matching Behavior

THE system SHALL use simple substring/partial matching for search queries (not exact phrase matching).

WHEN a user searches for "inflation", THE system SHALL return articles with titles or content containing "inflation," "inflationary," "deflation," "inflating," etc.

THE system SHALL perform case-insensitive keyword matching—searching for "ECONOMICS" SHALL return the same results as "economics" or "Economics".

WHEN a user enters multiple keywords (e.g., "trade policy reform"), THE system SHALL search for articles containing ALL of the keywords anywhere in the title or body.

IF a user searches for an exact phrase enclosed in quotes (e.g., "interest rates"), THE system MAY optionally implement exact phrase matching, but this is not required for initial implementation.

### Search Result Ordering

Search results SHALL be displayed in reverse chronological order (newest first), same as the main feed—NOT by relevance scores or engagement metrics.

THIS simple ordering ensures:
- Predictable, easy-to-understand result ordering
- Fast search response times
- Lower development and maintenance complexity

### Displayed Search Results

When search results are returned, THE system SHALL display articles using the same format as the main feed:
- Article title (clickable link)
- Author name
- Publication date
- Category tag
- Content preview (first 150-200 characters)
- Comment count

THE system SHALL apply the same pagination rules to search results (20 articles per page).

WHEN no articles match the search query, THE system SHALL display a helpful "No articles found" message with suggestions:
- "No articles found for 'your search term'."
- "Try:"
  - "Different keywords"
  - "Searching without some words"
  - "Browsing by category"
- Links to browse each category

### Search Result Visibility Rules

THE system SHALL only include published articles in search results.

THE system SHALL NOT return draft articles or pending-approval articles in search results to guests and regular members.

WHEN a member accesses search results, THE system SHALL include their own draft articles in a separate "Your Drafts" section at the top of results (for awareness), but SHALL NOT include them in the main search results count.

THE system SHALL include pending-approval articles in search results when accessed by moderators, with clear status indicators (e.g., "[Pending Review]" label).

### Search Performance

WHEN a user performs a search, THE system SHALL respond with results within 1 second for typical queries (matching fewer than 100 articles).

WHEN a search query returns more than 1,000 matching articles, THE system MAY extend response time to 3 seconds but SHALL still return paginated results.

THE system SHALL support concurrent searches from multiple users without significant performance degradation.

### Search Box State

WHEN a user performs a search and views results, THE search box SHALL display the search query they entered, allowing them to:
- Modify the search query and search again
- Clear the search and return to the main feed

WHEN a user clears the search query, THE system SHALL return them to the main feed (all articles, no search results).

### Real-Time Search Suggestions (Optional)

THE system MAY display search suggestions as the user types in the search box (optional for initial implementation).

WHERE search suggestions are implemented, THE system SHALL show:
- Recent searches (user's own or global popular searches)
- Article titles containing the search terms
- Maximum of 5-10 suggestions

---

## 5. Filtering & Sorting Options

### Available Filters

Users can apply the following filters to discover content. Filters can be combined together:

#### Category Filter
- Display options: "Economics", "Politics", "Other", "All Categories" (no filter)
- Default: "All Categories"
- Effect: Shows only articles in the selected category

#### Time Range Filter
- Display options: "Last 24 Hours", "Last 7 Days", "Last 30 Days", "Last Year", "All Time" (no filter)
- Default: "All Time"
- Effect: Shows only articles created within the selected time range

#### Author Filter
- Display as: Text input field to search for username
- Effect: Shows only articles created by the specified author
- Special case: Members can select "My Articles" to view only their own articles

### Sorting Options

THE system SHALL provide the following sort options for article lists:

1. **Newest First** (Default): Articles ordered by creation/modification date, newest first
2. **Oldest First**: Articles ordered by creation date, oldest first
3. **Most Comments**: Articles with the highest comment count appear first (useful for finding active discussions)
4. **Least Comments**: Articles with the lowest comment count appear first (useful for finding new topics)

WHEN sorting by "Most Comments", THE system SHALL resolve ties by using creation date (newest first).

WHEN sorting by "Least Comments", THE system SHALL resolve ties by using creation date (newest first).

### Filter Combination Rules

THE system SHALL allow filters to be combined together. For example:
- "Show me Economics articles from the last 7 days sorted by most comments"
- "Show me articles by jane_doe sorted by oldest first"
- "Show me Politics articles from the last 24 hours"

WHEN multiple filters are applied, THE system SHALL apply all filters simultaneously and return only articles matching ALL filter criteria.

THE system SHALL display which filters are currently active in a clear visual way (e.g., "Active filters: Category: Economics, Time: Last 7 Days").

### Default Filter State

When a user first visits the discussion board, THE system SHALL apply NO filters by default, showing all published articles in newest-first order.

WHEN a user applies a filter or sort option, THE system SHALL remember it during their current browsing session.

THE system SHALL NOT persist filter selections across sessions—on next visit, user returns to default (no filters).

WHEN a user clicks a category, that becomes an active filter for the session until they clear it.

### UI Implementation for Filters

THE system SHALL present filters in a way that is usable on both desktop and mobile devices.

THE system SHALL display filters in a collapsible sidebar or panel (desktop) or expandable filter menu (mobile).

THE system SHALL allow users to toggle filters on/off or collapse the filter panel to maximize content viewing area on small screens.

THE system SHALL clearly display the number of results matching the current filter combination (e.g., "23 articles match your filters").

### Example Filter Workflow

1. User opens the discussion board (sees all articles, newest first)
2. User clicks "Economics" category filter (sees only Economics articles)
3. User also selects "Last 7 Days" time filter (sees Economics articles from the last week)
4. User changes sort to "Most Comments" (sees popular Economics discussions from the last week)
5. User removes time filter (sees all Economics articles, sorted by comments)
6. User clears all filters (returns to main feed with all articles)

---

## 6. Search Performance Requirements

### Response Time Standards

WHEN a user searches for articles or applies filters, THE system SHALL return results within 1 second for 95% of queries.

WHEN a user browses the main feed or category views, THE system SHALL load each page within 2 seconds.

WHEN a user views search results with pagination, THE system SHALL load subsequent pages within 1 second.

### Handling Large Result Sets

WHEN a search or filter returns more than 1,000 matching articles, THE system SHALL still return results within 3 seconds by using pagination to display them in batches of 20.

THE system SHALL NOT attempt to load or display all results on a single page.

WHEN returning very large result sets, THE system MAY display "Results 1-20 of 5,000+" to indicate there are many results.

### Search Indexing

THE system SHALL maintain an efficient search index of article titles and content to support fast keyword matching.

THE system SHALL update this search index within 30 seconds of when an article is published or modified.

WHEN an article is deleted by moderators or users, THE system SHALL remove it from the search index within 30 seconds.

### Caching Strategy

THE system MAY use caching to improve performance for frequently accessed data:
- Recent articles (articles created in the last 24 hours)
- Popular articles (articles with most comments)
- Category lists (article counts per category)
- Search results (cache for 5-10 minutes)

Caching implementations SHALL NOT compromise content freshness—published articles MUST appear in search/browse within 30 seconds of publication.

### Concurrent User Load

THE system SHALL support concurrent searches from at least 50 simultaneous users without exceeding response time targets.

WHEN the system reaches 100+ concurrent searches, THE system MAY gracefully degrade response times to 2 seconds (still acceptable), but SHALL NOT drop search requests.

---

## 7. User Experience Considerations

### Empty State Handling

WHEN a search returns no results, THE system SHALL display a helpful message like:
```
"No articles found matching 'your search term.' 
Try:
- Searching for different keywords
- Browsing articles by category
- Viewing recent articles on the main feed"
```

WITH clickable links to:
- Category browsing pages
- Main feed
- Popular/recent articles

WHEN a category filter returns no articles (e.g., "Other" category has no articles yet), THE system SHALL display:
```
"No articles in [Category Name] yet. 
- Browse other categories
- Create the first discussion"
```

### Search Result Highlighting

WHERE a search query returns results, THE system MAY optionally highlight matching keywords in article titles or preview text to help users quickly identify relevant content.

WHERE highlighting is implemented, THE system SHALL use a distinct visual style (bold, color highlight, etc.) to make matches stand out.

### Clarity for Filtered Views

WHEN filters are applied, THE system SHALL clearly indicate which filters are active through visual indicators, labels, or a "filter summary" display.

Example: "Showing 15 articles in Economics from the last 7 days (sorted by newest first)"

THE system SHALL provide an easy way to clear filters—either a "Clear All Filters" button or individual × buttons next to each active filter.

WHEN a user clears a filter, THE system SHALL immediately refresh the results to show articles matching the remaining filters.

### Filter Suggestions

WHERE appropriate, THE system MAY display helpful filter suggestions based on current browsing:
- "Popular this week: Economics articles with 10+ comments"
- "Recent discussions: Articles from the last 24 hours"

These suggestions SHALL be static and generic, NOT personalized based on user history.

### Search Query Feedback

WHEN a user performs a search, THE system SHALL display the search query prominently on the results page so they know what they searched for.

If the search query contains special characters or unusual formatting, THE system SHALL show what was actually searched.

### Accessibility

THE system SHALL ensure search functionality and filter options are accessible to users with disabilities, following accessibility best practices.

THE system SHALL provide keyboard navigation for search and filter controls (Tab between controls, Enter to submit).

THE system SHALL use semantic HTML (label elements, ARIA attributes) to support screen readers.

---

## 8. Business Rules for Content Discovery

### What Content is Discoverable

Only published articles SHALL appear in the main feed, category views, and search results for guests and regular members.

Articles in draft status (not yet published) SHALL NOT be discoverable by guests or members through normal discovery features.

Articles pending moderator approval SHALL NOT be discoverable by guests or members through normal discovery features until approved.

WHEN an article is hidden by moderators (archived), THE article SHALL NOT appear in main feed, category views, or search results for any user type.

### Moderator Content Visibility

Moderators SHALL be able to see all articles in all feeds and search results, including:
- Draft articles (authored by moderators or other members)
- Pending-approval articles
- Published articles
- Archived/hidden articles

Moderators SHALL see clear visual status indicators showing the publication state of each article.

Moderators SHALL be able to search across all articles regardless of status to review pending content.

### Comment Visibility vs. Searchability

While comments are visible to users who view individual articles, THE system SHALL NOT index comments in search (only article titles and bodies are searchable).

This keeps search simple and focused on article discovery rather than comment-level search.

### Deleted Content

THE system SHALL permanently remove deleted articles from all search results and browsing feeds within 5 minutes of deletion.

WHEN an article is deleted, THE search index SHALL be updated to exclude that article.

### Category Accuracy

THE system SHALL enforce that articles remain in their selected category—categories cannot be changed retroactively by members.

Only moderators can reassign articles to different categories if necessary for accuracy.

### Relevance and Ranking

THE system SHALL NOT implement complex relevance ranking algorithms.

Search results SHALL be displayed in chronological order (newest first), not by relevance scores or engagement metrics.

This simplicity ensures:
- Predictable, easy-to-understand result ordering
- Consistent results across all users
- Fast search response times
- Lower development and maintenance complexity

---

## 9. Error Handling & Edge Cases

### Server Errors During Search

IF a search request encounters a server error, THEN THE system SHALL display a user-friendly error message:
"We encountered an error while searching. Please try again in a moment."

The error SHALL NOT expose technical details (stack traces, database errors, etc.) to the user.

THE system SHALL log the technical error details internally for debugging purposes.

### Invalid Search Queries

IF a user submits an empty search query (blank search box), THEN THE system SHALL display a message asking them to enter keywords: "Please enter search keywords."

IF a search query contains only spaces or whitespace, THEN THE system SHALL treat it as empty and request keywords.

IF a search query contains only special characters (e.g., "!!!"), THEN THE system SHALL either:
- Strip the special characters and search with remaining alphanumeric characters, OR
- Display: "Search query contains no searchable content. Please try different keywords."

IF a search query is excessively long (e.g., over 1,000 characters), THEN THE system SHALL truncate it to 256 characters and perform the search on the truncated query.

### Timeout on Large Searches

IF a search query would take longer than 5 seconds to complete due to very large result set, THEN THE system SHALL return partial results (most recent articles) rather than timing out completely.

THE system SHALL indicate to the user that results are limited: "Showing first 100 of [very large number] results. Refine your search for more specific results."

### Database Connection Failures

IF the search/discovery system cannot connect to the database, THEN THE system SHALL display: "The search service is temporarily unavailable. Please try again in a few moments."

THE system SHALL NOT display the raw database error to the user.

---

## 10. Integration with Other System Components

### Connection to Article Management

The search and discovery system relies on the article data structure defined in Article Management Requirements. Articles must include:
- Article title (required for search)
- Article body (required for search)
- Creation timestamp (required for sorting)
- Category (required for filtering)
- Publication status (required for visibility control)
- Author information (required for author filtering)

### Connection to User Authentication

Discovery features respect the permission model defined in User Actors and Authentication:
- Guests have read-only access to published content
- Members can search all published content and their own drafts
- Moderators can search all content in all statuses

### Connection to Moderation

The discovery system integrates with Content Moderation Requirements:
- Only approved articles appear in discovery for guests and members
- Pending articles appear in moderator search/browse
- Deleted articles are removed from search within 5 minutes
- Archived articles do not appear in discovery

### Connection to Comments

While comments are not searchable, the comment count appears in article lists and search results.

The comment count affects sorting by "Most Comments" and "Least Comments".

---

## 11. Performance Metrics & Monitoring

### Search Performance Tracking

THE system SHALL track the following metrics for search operations:
- Average search response time (target: <1 second)
- 95th percentile search response time (target: <1.5 seconds)
- Search error rate (target: <1%)
- Number of searches per minute (to monitor load)
- Most common search queries

### Discovery Feature Usage

THE system SHALL log and track:
- Number of users browsing main feed (gauge popularity)
- Number of active searches per day
- Which categories are most browsed
- Which filters are most commonly applied
- Click-through rates from search results to articles

### Performance Alerts

THE system SHALL alert administrators if:
- Search response time exceeds 3 seconds consistently
- Search error rate exceeds 2%
- Database indexes are inefficient (search queries take >5 seconds)
- Search index is out of sync with database

---

## Summary

The search and discovery system is designed to be **simple, fast, and practical**. It enables users to:
- Quickly browse recent discussions via the chronological main feed
- Explore topics by category
- Find specific articles using basic keyword search
- Filter content by time range and author
- Sort results by recency or discussion activity
- Navigate content with clear pagination and feedback

This straightforward approach balances discoverability with system simplicity, avoiding unnecessary complexity while ensuring users can effectively find the content they're looking for in the discussion board.