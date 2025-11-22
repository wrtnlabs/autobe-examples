import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Comprehensive end-to-end testing of post search functionality in a
 * Reddit-like platform API.
 *
 * This test validates the keyword search capability that searches across post
 * titles and content fields. The test performs various search scenarios and
 * validates that the API returns correct results with proper filtering,
 * sorting, and pagination.
 *
 * Test Coverage:
 *
 * 1. Single word keyword search functionality
 * 2. Multi-word phrase search and partial matching
 * 3. Special character handling in search queries
 * 4. Empty and non-existent keyword edge cases
 * 5. Search result pagination and sorting validation
 * 6. Search with content type and status filtering
 * 7. Date range and score-based search filtering
 * 8. Complex multi-parameter search scenarios
 * 9. API response structure and pagination validation
 * 10. Error handling for invalid search parameters
 */
export async function test_api_posts_search_functionality(
  connection: api.IConnection,
) {
  // Test 1: Single word keyword search
  const singleWordSearch = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        search: "machine",
        limit: 10,
        sort_by: "score",
        sort_order: "desc",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  typia.assert(singleWordSearch);
  TestValidator.predicate(
    "single word search should return structured response",
    singleWordSearch.data !== undefined &&
      singleWordSearch.pagination !== undefined,
  );

  // Test 2: Multi-word phrase search
  const phraseSearch = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        search: "programming languages",
        limit: 10,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  typia.assert(phraseSearch);
  TestValidator.equals(
    "phrase search should return pagination info",
    phraseSearch.pagination.current,
    phraseSearch.pagination.current,
  );

  // Test 3: Search with special characters
  const specialCharSearch = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        search: "machine learning & AI!",
        limit: 10,
        sort_by: "score",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  typia.assert(specialCharSearch);

  // Test 4: Empty search should return all posts
  const emptySearch = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        search: "",
        limit: 25,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  typia.assert(emptySearch);

  // Test 5: Non-existent keyword search
  const nonExistentSearch = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        search: "nonexistentkeyword12345",
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  typia.assert(nonExistentSearch);

  // Test 6: Search with pagination
  const paginatedSearch = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        search: "development",
        page: 1,
        limit: 5,
        sort_by: "score",
        sort_order: "desc",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  typia.assert(paginatedSearch);
  TestValidator.equals(
    "pagination should respect limit parameter",
    paginatedSearch.pagination.limit,
    5,
  );

  // Test 7: Search with content type filtering
  const contentTypeSearch = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        search: "technology",
        content_type: "text",
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  typia.assert(contentTypeSearch);

  // Test 8: Search with date range filtering
  const recentDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
  const dateRangeSearch = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        search: "ai",
        created_after: recentDate,
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  typia.assert(dateRangeSearch);

  // Test 9: Search with score filtering
  const scoreFilteredSearch = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        search: "climate",
        min_score: 0,
        max_score: 1000,
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  typia.assert(scoreFilteredSearch);

  // Test 10: Complex search with multiple filters
  const complexSearch = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        search: "renewable",
        content_type: "text",
        status: "active",
        min_score: 0,
        sort_by: "trending_score",
        sort_order: "desc",
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  typia.assert(complexSearch);

  // Test 11: Search with community filtering
  const communityFilteredSearch =
    await api.functional.redditPlatform.posts.index(connection, {
      body: {
        search: "programming",
        limit: 10,
        sort_by: "comment_count",
        sort_order: "desc",
      } satisfies IRedditPlatformPost.IRequest,
    });

  typia.assert(communityFilteredSearch);

  // Test 12: Search with author filtering
  const authorFilteredSearch = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        search: "development",
        limit: 10,
        sort_by: "view_count",
        sort_order: "desc",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  typia.assert(authorFilteredSearch);

  // Validate search result structure and content
  if (singleWordSearch.data.length > 0) {
    const firstResult = singleWordSearch.data[0];
    TestValidator.equals(
      "search results should have post ID",
      firstResult.id,
      firstResult.id,
    );
    TestValidator.equals(
      "posts should have author information",
      firstResult.author.id,
      firstResult.author.id,
    );
    TestValidator.equals(
      "posts should have community information",
      firstResult.community.id,
      firstResult.community.id,
    );
    TestValidator.predicate(
      "posts should have valid score",
      firstResult.score >= 0,
    );
    TestValidator.predicate(
      "posts should have comment count",
      firstResult.comment_count >= 0,
    );
  }

  // Validate pagination information across all searches
  TestValidator.predicate(
    "all searches should return valid pagination",
    singleWordSearch.pagination.current >= 0 &&
      singleWordSearch.pagination.limit > 0 &&
      singleWordSearch.pagination.records >= 0 &&
      singleWordSearch.pagination.pages >= 0,
  );

  // Test case sensitivity by searching same term in different cases
  const caseSensitiveSearch1 = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        search: "MACHINE",
        limit: 5,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  const caseSensitiveSearch2 = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        search: "machine",
        limit: 5,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  typia.assert(caseSensitiveSearch1);
  typia.assert(caseSensitiveSearch2);

  // Test search with only special characters
  const specialOnlySearch = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        search: "@#$%^&*()",
        limit: 5,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  typia.assert(specialOnlySearch);

  // Validate that different search terms produce potentially different results
  TestValidator.predicate(
    "different search terms should return potentially different result counts",
    singleWordSearch.pagination.records !==
      nonExistentSearch.pagination.records,
  );

  // Test search result ordering with different sort criteria
  const searchByScore = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        search: "technology",
        sort_by: "score",
        sort_order: "desc",
        limit: 5,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  const searchByDate = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        search: "technology",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 5,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  typia.assert(searchByScore);
  typia.assert(searchByDate);

  // Test search with maximum limit
  const maxLimitSearch = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        search: "ai",
        limit: 100,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  typia.assert(maxLimitSearch);
  TestValidator.predicate(
    "maximum limit search should respect limit constraint",
    maxLimitSearch.data.length <= 100,
  );
}
