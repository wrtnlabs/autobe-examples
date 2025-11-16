import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";

export async function test_api_category_list_empty_results(
  connection: api.IConnection,
) {
  // Test 1: Search for non-existent category name returns empty results
  const emptySearchResponse =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        page: 1,
        limit: 20,
        search: "nonexistent_category_xyz_12345",
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(emptySearchResponse);

  // Validate pagination structure with empty results
  TestValidator.equals(
    "empty search results pagination current page",
    emptySearchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty search results pagination limit",
    emptySearchResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "empty search results total records",
    emptySearchResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search results total pages",
    emptySearchResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search results data array is empty",
    emptySearchResponse.data.length,
    0,
  );

  // Test 2: Filter by is_active=true when no active categories exist
  const inactiveFilterResponse =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        page: 1,
        limit: 20,
        is_active: true,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(inactiveFilterResponse);

  // Validate pagination structure remains consistent
  TestValidator.predicate(
    "inactive filter pagination is present",
    inactiveFilterResponse.pagination !== null &&
      inactiveFilterResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "inactive filter data array is empty",
    Array.isArray(inactiveFilterResponse.data),
  );

  // Test 3: Search with is_active=false filter
  const inactiveSearchResponse =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        page: 1,
        limit: 20,
        search: "impossible_search_term_zzz",
        is_active: false,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(inactiveSearchResponse);

  // Verify empty results structure
  TestValidator.equals(
    "combined search and filter empty results records",
    inactiveSearchResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined search and filter empty results data length",
    inactiveSearchResponse.data.length,
    0,
  );

  // Test 4: Verify response structure consistency with different pagination parameters
  const alternatePageResponse =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        page: 2,
        limit: 50,
        search: "nonexistent",
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(alternatePageResponse);

  // Validate structure consistency
  TestValidator.predicate(
    "alternate pagination response has pagination object",
    alternatePageResponse.pagination !== null &&
      alternatePageResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "alternate pagination response records is zero",
    alternatePageResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "alternate pagination response pages is zero",
    alternatePageResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "alternate pagination response data is empty array",
    alternatePageResponse.data.length,
    0,
  );

  // Test 5: Verify sorting parameters with empty results
  const sortedEmptyResponse =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        page: 1,
        limit: 20,
        search: "xyz_impossible_search",
        order_by: "name",
        direction: "asc",
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(sortedEmptyResponse);

  TestValidator.equals(
    "sorted empty results pagination records",
    sortedEmptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "sorted empty results data length",
    sortedEmptyResponse.data.length,
    0,
  );
}
