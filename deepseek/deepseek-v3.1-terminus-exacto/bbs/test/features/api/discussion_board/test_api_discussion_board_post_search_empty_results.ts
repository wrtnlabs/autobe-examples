import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";

/**
 * Test search behavior when no posts match the specified criteria.
 *
 * This test validates that the discussion board post search API correctly
 * handles scenarios where no posts match the search filters. It ensures the API
 * returns an empty data array with proper pagination metadata indicating zero
 * total records.
 */
export async function test_api_discussion_board_post_search_empty_results(
  connection: api.IConnection,
) {
  // Create search criteria that won't match any posts
  const searchCriteria = {
    page: 1 satisfies number as number,
    limit: 10 satisfies number as number,
    search: "nonexistent_unique_search_term_xyz123" satisfies string as string,
    status: "draft" satisfies string as string,
    is_pinned: true satisfies boolean as boolean,
    is_locked: false satisfies boolean as boolean,
    created_after: new Date(
      Date.now() + 86400000,
    ).toISOString() satisfies string as string,
    created_before: new Date(
      Date.now() + 172800000,
    ).toISOString() satisfies string as string,
    order_by: "created_at" satisfies "created_at" as "created_at",
    order_direction: "desc" satisfies "desc" as "desc",
  } satisfies IDiscussionBoardPost.IRequest;

  // Call the search API
  const searchResult: IPageIDiscussionBoardPost.ISummary =
    await api.functional.discussionBoard.search.posts.search(connection, {
      body: searchCriteria,
    });

  // Validate the response structure
  typia.assert(searchResult);

  // Verify the data array is empty
  TestValidator.equals(
    "empty data array when no posts match criteria",
    searchResult.data,
    [],
  );

  // Validate pagination information
  TestValidator.equals(
    "current page matches request",
    searchResult.pagination.current,
    searchCriteria.page,
  );

  TestValidator.equals(
    "limit matches request",
    searchResult.pagination.limit,
    searchCriteria.limit,
  );

  TestValidator.equals(
    "total records should be zero",
    searchResult.pagination.records,
    0,
  );

  TestValidator.equals(
    "total pages should be zero",
    searchResult.pagination.pages,
    0,
  );
}
