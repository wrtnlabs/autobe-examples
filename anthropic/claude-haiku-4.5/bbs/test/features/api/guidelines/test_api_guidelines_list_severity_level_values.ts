import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentGuideline";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentGuideline";

/**
 * Test that all returned guidelines have severity_level values that are exactly
 * one of the three valid options: 'minor', 'moderate', or 'severe'. Verify no
 * invalid severity classifications appear in results and severity levels are
 * properly typed according to enum constraints.
 */
export async function test_api_guidelines_list_severity_level_values(
  connection: api.IConnection,
) {
  // Retrieve the paginated list of content guidelines
  const response: IPageIDiscussionBoardContentGuideline.ISummary =
    await api.functional.discussionBoard.guidelines.index(connection);

  // Validate the complete response structure and all type constraints
  typia.assert(response);

  // Verify that we have guidelines in the response
  TestValidator.predicate(
    "guidelines list should contain items",
    response.data.length > 0,
  );

  // Validate each guideline's severity_level enum constraint
  for (const guideline of response.data) {
    // Verify severity_level is one of the valid enum values
    // typia.assert() already validated this is one of: 'minor', 'moderate', 'severe'
    TestValidator.predicate(
      `severity_level "${guideline.severity_level}" is valid`,
      guideline.severity_level === "minor" ||
        guideline.severity_level === "moderate" ||
        guideline.severity_level === "severe",
    );
  }

  // Verify pagination properties are valid numbers
  TestValidator.predicate(
    "current page should be non-negative",
    response.pagination.current >= 0,
  );

  TestValidator.predicate(
    "limit should be non-negative",
    response.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "total records should be non-negative",
    response.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages should be non-negative",
    response.pagination.pages >= 0,
  );
}
