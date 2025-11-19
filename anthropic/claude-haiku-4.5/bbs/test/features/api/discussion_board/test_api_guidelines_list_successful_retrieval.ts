import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentGuideline";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentGuideline";

/**
 * Test successful retrieval of content guidelines as a guest user.
 *
 * Validates that the public guidelines endpoint returns a paginated list of
 * active content guidelines with essential policy information. Verifies
 * pagination metadata, guideline structure, and proper sorting for policy
 * documentation display.
 *
 * Test steps:
 *
 * 1. Call the guidelines index endpoint as a guest user (no authentication)
 * 2. Verify the response contains multiple active guidelines
 * 3. Validate pagination metadata (current page, limit, total records, pages)
 * 4. Confirm each guideline has required fields: id, code, title, severity_level,
 *    is_active
 * 5. Verify all returned guidelines have is_active = true
 * 6. Ensure proper data types and format constraints are met
 */
export async function test_api_guidelines_list_successful_retrieval(
  connection: api.IConnection,
) {
  // Call the guidelines list endpoint as guest user
  const response: IPageIDiscussionBoardContentGuideline.ISummary =
    await api.functional.discussionBoard.guidelines.index(connection);
  typia.assert(response);

  // Validate that guidelines list contains items
  TestValidator.predicate(
    "guidelines list contains at least one guideline",
    response.data.length > 0,
  );

  // Validate that all returned guidelines are active
  response.data.forEach((guideline, index) => {
    TestValidator.predicate(
      `guideline ${index} is active`,
      guideline.is_active === true,
    );
  });

  // Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination total pages is non-negative",
    response.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "pagination current page is within valid range",
    response.pagination.current >= 0 &&
      response.pagination.current < response.pagination.pages,
  );

  TestValidator.predicate(
    "number of returned items does not exceed limit",
    response.data.length <= response.pagination.limit,
  );

  TestValidator.predicate(
    "pagination records count is accurate",
    response.pagination.records >= response.data.length,
  );
}
