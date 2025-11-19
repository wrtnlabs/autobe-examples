import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentGuideline";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentGuideline";

/**
 * Validate graceful handling of empty guidelines list.
 *
 * Tests that the guidelines list endpoint properly handles scenarios where no
 * active guidelines exist in the system. Verifies that the API returns a
 * properly structured response with an empty data array while maintaining
 * correct pagination metadata (records = 0, pages = 0).
 *
 * This test ensures:
 *
 * 1. Empty result set is returned as an empty array, not null or undefined
 * 2. Pagination structure is correct with zero records and zero pages
 * 3. Response maintains type compliance with
 *    IPageIDiscussionBoardContentGuideline.ISummary
 * 4. API does not crash or return error responses when no data exists
 */
export async function test_api_guidelines_list_empty_result_handling(
  connection: api.IConnection,
) {
  // Call the guidelines list endpoint
  const response: IPageIDiscussionBoardContentGuideline.ISummary =
    await api.functional.discussionBoard.guidelines.index(connection);

  // Validate response type compliance
  typia.assert(response);

  // Verify the data array exists and is empty
  TestValidator.predicate(
    "data array should be empty",
    response.data.length === 0,
  );

  // Verify pagination metadata for empty result
  TestValidator.equals(
    "records count should be zero",
    response.pagination.records,
    0,
  );

  TestValidator.equals(
    "pages count should be zero",
    response.pagination.pages,
    0,
  );

  // Verify pagination structure is valid (non-negative values)
  TestValidator.predicate(
    "current page should be non-negative",
    response.pagination.current >= 0,
  );

  TestValidator.predicate(
    "limit should be non-negative",
    response.pagination.limit >= 0,
  );

  // Verify data array is actually empty array, not null or undefined
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(response.data),
  );
}
