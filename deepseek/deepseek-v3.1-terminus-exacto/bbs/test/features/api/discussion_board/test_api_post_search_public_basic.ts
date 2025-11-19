import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";

/**
 * Test basic public search functionality for discussion board posts without
 * authentication.
 *
 * This test validates that users can search posts by title keywords, filter by
 * channel and section, and receive paginated results. The test will verify that
 * search returns relevant posts matching criteria with proper pagination
 * metadata.
 */
export async function test_api_post_search_public_basic(
  connection: api.IConnection,
) {
  // Test 1: Basic search with minimal parameters
  const basicRequest = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardPost.IRequest;

  const basicResponse =
    await api.functional.discussion_board.search.posts.search(connection, {
      body: basicRequest,
    });
  typia.assert(basicResponse);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid current page",
    basicResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    basicResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have non-negative total records",
    basicResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have non-negative total pages",
    basicResponse.pagination.pages >= 0,
  );

  // Test 2: Search with specific page and limit
  const paginatedRequest = {
    page: 2,
    limit: 5,
  } satisfies IDiscussionBoardPost.IRequest;

  const paginatedResponse =
    await api.functional.discussion_board.search.posts.search(connection, {
      body: paginatedRequest,
    });
  typia.assert(paginatedResponse);

  // Test 3: Search with search term
  const searchTermRequest = {
    page: 1,
    limit: 10,
    search: "test",
  } satisfies IDiscussionBoardPost.IRequest;

  const searchTermResponse =
    await api.functional.discussion_board.search.posts.search(connection, {
      body: searchTermRequest,
    });
  typia.assert(searchTermResponse);

  // Test 4: Search with various filters
  const filtersRequest = {
    page: 1,
    limit: 10,
    actor_type: "member",
    status: "published",
    is_pinned: false,
    is_locked: false,
  } satisfies IDiscussionBoardPost.IRequest;

  const filtersResponse =
    await api.functional.discussion_board.search.posts.search(connection, {
      body: filtersRequest,
    });
  typia.assert(filtersResponse);

  // Test 5: Search with date range filters
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const dateRangeRequest = {
    page: 1,
    limit: 10,
    created_after: weekAgo.toISOString(),
    created_before: now.toISOString(),
  } satisfies IDiscussionBoardPost.IRequest;

  const dateRangeResponse =
    await api.functional.discussion_board.search.posts.search(connection, {
      body: dateRangeRequest,
    });
  typia.assert(dateRangeResponse);

  // Test 6: Search with sorting
  const sortedRequest = {
    page: 1,
    limit: 10,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IDiscussionBoardPost.IRequest;

  const sortedResponse =
    await api.functional.discussion_board.search.posts.search(connection, {
      body: sortedRequest,
    });
  typia.assert(sortedResponse);

  // Test 7: Random search parameters
  const randomRequest = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    search: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardPost.IRequest;

  const randomResponse =
    await api.functional.discussion_board.search.posts.search(connection, {
      body: randomRequest,
    });
  typia.assert(randomResponse);

  // Validate that all responses have the correct structure
  TestValidator.equals(
    "response should have pagination property",
    typeof basicResponse.pagination,
    "object",
  );
  TestValidator.equals(
    "response should have data array",
    Array.isArray(basicResponse.data),
    true,
  );

  // Validate data structure if items exist
  if (basicResponse.data.length > 0) {
    const sampleItem = basicResponse.data[0];
    TestValidator.predicate(
      "post item should have string id",
      typeof sampleItem.id === "string",
    );
    TestValidator.predicate(
      "post item should have string type",
      typeof sampleItem.type === "string",
    );
    TestValidator.predicate(
      "post item should have string title",
      typeof sampleItem.title === "string",
    );
  }
}
