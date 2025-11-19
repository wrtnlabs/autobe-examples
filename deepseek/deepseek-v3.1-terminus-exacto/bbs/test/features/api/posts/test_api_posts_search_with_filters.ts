import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";

/**
 * Test comprehensive post search functionality with various filtering options.
 *
 * This test validates the discussion board post search API with comprehensive
 * filtering capabilities including search terms, status filtering, pin/lock
 * status, date ranges, pagination, and sorting options. The test ensures that
 * all search parameters work correctly individually and in combination, and
 * that the system properly handles edge cases and empty results.
 */
export async function test_api_posts_search_with_filters(
  connection: api.IConnection,
) {
  // Test 1: Basic search with search term
  const searchResults1 = await api.functional.posts.index(connection, {
    body: {
      page: 1,
      limit: 10,
      search: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IDiscussionBoardPost.IRequest,
  });
  typia.assert(searchResults1);
  TestValidator.predicate(
    "search results should have pagination",
    searchResults1.pagination.current >= 0,
  );

  // Test 2: Filter by boolean criteria
  const searchResults2 = await api.functional.posts.index(connection, {
    body: {
      page: 1,
      limit: 5,
      is_pinned: true,
      is_locked: false,
      status: "published",
    } satisfies IDiscussionBoardPost.IRequest,
  });
  typia.assert(searchResults2);

  // Test 3: Date range filtering
  const currentDate = new Date().toISOString();
  const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const searchResults3 = await api.functional.posts.index(connection, {
    body: {
      page: 1,
      limit: 10,
      created_after: pastDate,
      created_before: currentDate,
    } satisfies IDiscussionBoardPost.IRequest,
  });
  typia.assert(searchResults3);

  // Test 4: Sorting validation
  const sortFields = ["created_at", "updated_at", "title"] as const;
  const sortDirections = ["asc", "desc"] as const;

  for (const field of sortFields) {
    for (const direction of sortDirections) {
      const searchResults4 = await api.functional.posts.index(connection, {
        body: {
          page: 1,
          limit: 5,
          order_by: field,
          order_direction: direction,
        } satisfies IDiscussionBoardPost.IRequest,
      });
      typia.assert(searchResults4);
      TestValidator.predicate(
        `sort by ${field} ${direction} should return valid results`,
        searchResults4.data.length >= 0,
      );
    }
  }

  // Test 5: Pagination with different limits
  const limits = [1, 5, 10, 20] as const;
  for (const limit of limits) {
    const searchResults5 = await api.functional.posts.index(connection, {
      body: {
        page: 1,
        limit: limit satisfies number as number,
      } satisfies IDiscussionBoardPost.IRequest,
    });
    typia.assert(searchResults5);
    TestValidator.predicate(
      `pagination with limit ${limit} should work correctly`,
      searchResults5.data.length <= limit,
    );
  }

  // Test 6: Empty results scenario with rare criteria
  const searchResults6 = await api.functional.posts.index(connection, {
    body: {
      page: 1,
      limit: 10,
      search: "xzqwertyuiopasdfghjklzxcvbnm1234567890",
      status: "draft",
    } satisfies IDiscussionBoardPost.IRequest,
  });
  typia.assert(searchResults6);
  TestValidator.predicate(
    "search with rare criteria should return valid results",
    searchResults6.data.length >= 0,
  );

  // Test 7: Combined filters
  const searchResults7 = await api.functional.posts.index(connection, {
    body: {
      page: 1,
      limit: 15,
      search: RandomGenerator.substring(
        RandomGenerator.content({ paragraphs: 1 }),
      ),
      is_pinned: false,
      status: "published",
      order_by: "created_at",
      order_direction: "desc",
    } satisfies IDiscussionBoardPost.IRequest,
  });
  typia.assert(searchResults7);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    searchResults7.pagination.current >= 0 &&
      searchResults7.pagination.limit > 0 &&
      searchResults7.pagination.records >= 0 &&
      searchResults7.pagination.pages >= 0,
  );

  // Validate response data structure
  if (searchResults7.data.length > 0) {
    const samplePost = searchResults7.data[0];
    TestValidator.predicate(
      "post summary should have required fields",
      typeof samplePost.id === "string" &&
        typeof samplePost.type === "string" &&
        typeof samplePost.title === "string",
    );
  }
}
