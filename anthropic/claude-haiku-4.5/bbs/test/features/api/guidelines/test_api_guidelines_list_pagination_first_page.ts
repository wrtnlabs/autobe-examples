import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentGuideline";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentGuideline";

export async function test_api_guidelines_list_pagination_first_page(
  connection: api.IConnection,
) {
  // Fetch the first page of guidelines
  const response =
    await api.functional.discussionBoard.guidelines.index(connection);

  // Validate the response structure and type
  typia.assert(response);

  // Verify pagination metadata exists and has correct structure
  TestValidator.predicate(
    "response has pagination",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(response.data),
  );

  // Validate that we're on the first page (current page should be 0)
  TestValidator.equals("current page is 0", response.pagination.current, 0);

  // Validate pagination limit is set to 20
  TestValidator.equals("pagination limit is 20", response.pagination.limit, 20);

  // Validate that records count is a non-negative integer
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );

  // Validate that pages count is a non-negative integer
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );

  // Validate that the data array length does not exceed the limit
  TestValidator.predicate(
    "data array length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );

  // Validate each guideline in the data array using typia.assert for complete type validation
  for (const guideline of response.data) {
    typia.assert(guideline);
  }

  // Validate pagination calculation: pages should be ceil(records / limit)
  const expectedPages = Math.ceil(
    response.pagination.records / response.pagination.limit,
  );
  TestValidator.equals(
    "pages count matches calculated value",
    response.pagination.pages,
    expectedPages,
  );

  // Validate that if there are guidelines, pages should be at least 1
  if (response.pagination.records > 0) {
    TestValidator.predicate(
      "pages is at least 1 when records exist",
      response.pagination.pages >= 1,
    );
  }

  // Validate that first page returns data up to the limit
  if (response.pagination.records > 0) {
    TestValidator.predicate(
      "first page has expected data count",
      response.data.length ===
        Math.min(response.pagination.limit, response.pagination.records),
    );
  }
}
