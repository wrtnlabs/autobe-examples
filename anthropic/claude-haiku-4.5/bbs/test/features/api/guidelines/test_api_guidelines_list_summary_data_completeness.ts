import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentGuideline";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentGuideline";

/**
 * Test that each guideline in the list response contains all required summary
 * fields.
 *
 * Validates that the guidelines list endpoint returns complete guideline
 * summaries with all essential policy reference information: id (UUID), code
 * (policy identifier), title (descriptive name), severity_level (violation
 * severity classification), and is_active (enforcement status). Verifies
 * pagination structure and ensures each guideline object contains necessary
 * information for moderators to quickly reference policies in dashboards.
 *
 * Steps:
 *
 * 1. Call the guidelines list API endpoint
 * 2. Validate the response structure and complete data integrity with
 *    typia.assert()
 * 3. Verify pagination metadata is properly structured
 * 4. Confirm guidelines are available for moderator dashboard use
 */
export async function test_api_guidelines_list_summary_data_completeness(
  connection: api.IConnection,
) {
  // Step 1: Retrieve the guidelines list
  const response: IPageIDiscussionBoardContentGuideline.ISummary =
    await api.functional.discussionBoard.guidelines.index(connection);

  // Step 2: Validate complete response structure and data integrity
  // typia.assert() performs COMPLETE AND PERFECT type validation including:
  // - Response structure matches IPageIDiscussionBoardContentGuideline.ISummary
  // - Pagination metadata with correct types (current, limit, records, pages as int32)
  // - Data array with all guidelines
  // - Each guideline has all required fields:
  //   * id: UUID format
  //   * code: 5-50 chars, lowercase alphanumeric with hyphens
  //   * title: 10-100 chars
  //   * severity_level: one of (minor, moderate, severe)
  //   * is_active: boolean
  typia.assert(response);

  // Step 3: Verify pagination structure is properly set up
  TestValidator.predicate(
    "response pagination should have non-negative current page",
    response.pagination.current >= 0,
  );

  TestValidator.predicate(
    "response pagination should have valid limit",
    response.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "response pagination should have valid total records count",
    response.pagination.records >= 0,
  );

  TestValidator.predicate(
    "response pagination should have valid total pages count",
    response.pagination.pages >= 0,
  );

  // Step 4: Confirm guidelines are available for moderator dashboard use
  TestValidator.predicate(
    "guidelines data should be an array",
    Array.isArray(response.data),
  );

  // Verify guideline details are complete for dashboard reference
  if (response.data && response.data.length > 0) {
    for (let i = 0; i < response.data.length; i++) {
      const guideline = response.data[i];

      // Verify guideline can be used to reference policies by code and title
      TestValidator.predicate(
        `guideline at index ${i} code and title should be non-empty for dashboard display`,
        guideline.code.length > 0 && guideline.title.length > 0,
      );

      // Verify severity level is properly set for moderator action guidance
      TestValidator.predicate(
        `guideline at index ${i} severity level should indicate policy enforcement weight`,
        ["minor", "moderate", "severe"].includes(guideline.severity_level),
      );
    }
  }

  // Confirm response is complete and ready for moderator dashboard use
  TestValidator.equals(
    "response structure should contain all required components for moderator reference",
    {
      pagination: response.pagination !== undefined,
      data: response.data !== undefined && Array.isArray(response.data),
    },
    {
      pagination: true,
      data: true,
    },
  );
}
