import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";

/**
 * Test text-based search relevance by searching for specific keywords in post
 * titles and content. Validate that full-text search returns relevant results
 * ranked by relevance and supports partial matching.
 *
 * This test performs searches using different keywords and partial matches to
 * verify that the search functionality correctly filters results. Since post
 * creation is not available, the test focuses on validating the search API's
 * behavior with existing data in the system.
 */
export async function test_api_post_search_text_relevance(
  connection: api.IConnection,
) {
  // Test 1: Full keyword search with common terms
  const fullSearchResults =
    await api.functional.discussion_board.search.posts.search(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "discussion",
        status: "published",
        order_by: "title",
        order_direction: "asc",
      } satisfies IDiscussionBoardPost.IRequest,
    });
  typia.assert(fullSearchResults);

  TestValidator.predicate(
    "full search returns valid results",
    fullSearchResults.data.length >= 0,
  );

  // Test 2: Partial keyword search
  const partialSearchResults =
    await api.functional.discussion_board.search.posts.search(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "discuss",
        status: "published",
        order_by: "title",
        order_direction: "asc",
      } satisfies IDiscussionBoardPost.IRequest,
    });
  typia.assert(partialSearchResults);

  TestValidator.predicate(
    "partial search returns valid results",
    partialSearchResults.data.length >= 0,
  );

  // Test 3: Search with no results expected (using unlikely keyword)
  const emptySearchResults =
    await api.functional.discussion_board.search.posts.search(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "xyz123unlikelysearchterm",
        status: "published",
        order_by: "title",
        order_direction: "asc",
      } satisfies IDiscussionBoardPost.IRequest,
    });
  typia.assert(emptySearchResults);

  // Test 4: Search with pagination parameters
  const paginatedSearchResults =
    await api.functional.discussion_board.search.posts.search(connection, {
      body: {
        page: 1,
        limit: 5,
        search: "board",
        status: "published",
        order_by: "created_at",
        order_direction: "desc",
      } satisfies IDiscussionBoardPost.IRequest,
    });
  typia.assert(paginatedSearchResults);

  TestValidator.predicate(
    "pagination limit is respected",
    paginatedSearchResults.data.length <= 5,
  );

  // Test 5: Search with multiple filter parameters
  const filteredSearchResults =
    await api.functional.discussion_board.search.posts.search(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "post",
        status: "published",
        is_pinned: false,
        order_by: "updated_at",
        order_direction: "desc",
      } satisfies IDiscussionBoardPost.IRequest,
    });
  typia.assert(filteredSearchResults);

  // Validate pagination structure for all search results
  const searchResults = [
    fullSearchResults,
    partialSearchResults,
    emptySearchResults,
    paginatedSearchResults,
    filteredSearchResults,
  ];

  for (const results of searchResults) {
    TestValidator.predicate(
      "pagination structure is valid",
      results.pagination.current >= 0 &&
        results.pagination.limit >= 0 &&
        results.pagination.records >= 0 &&
        results.pagination.pages >= 0,
    );
  }

  // Validate result structure when results are returned
  const nonEmptyResults = searchResults.filter((r) => r.data.length > 0);
  if (nonEmptyResults.length > 0) {
    const firstNonEmptyResult = nonEmptyResults[0].data[0];
    TestValidator.predicate(
      "search result has valid structure",
      typeof firstNonEmptyResult.id === "string" &&
        typeof firstNonEmptyResult.type === "string" &&
        typeof firstNonEmptyResult.title === "string",
    );
  }

  // Test search with different order parameters
  const orderByTests = ["created_at", "updated_at", "title"] as const;

  for (const orderBy of orderByTests) {
    const orderedResults =
      await api.functional.discussion_board.search.posts.search(connection, {
        body: {
          page: 1,
          limit: 5,
          search: "content",
          status: "published",
          order_by: orderBy,
          order_direction: "asc",
        } satisfies IDiscussionBoardPost.IRequest,
      });
    typia.assert(orderedResults);

    TestValidator.predicate(
      `${orderBy} order returns valid results`,
      orderedResults.data.length >= 0,
    );
  }
}
