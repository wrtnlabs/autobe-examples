import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentGuideline";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentGuideline";

/**
 * Test that the guidelines list endpoint correctly filters and returns only
 * active guidelines.
 *
 * This test validates that the GET /discussionBoard/guidelines endpoint:
 *
 * - Returns a paginated list of active content guidelines (is_active = true)
 * - Excludes all inactive guidelines from the results
 * - Performs server-side filtering to ensure policy enforcement
 * - Maintains data integrity with proper pagination metadata
 * - Ensures each guideline contains all required summary fields
 *
 * The test verifies that moderators and contributors only see currently
 * enforced policies, preventing confusion from obsolete or disabled
 * guidelines.
 */
export async function test_api_guidelines_list_active_guidelines_filter(
  connection: api.IConnection,
) {
  // Retrieve the paginated list of active guidelines
  const result: IPageIDiscussionBoardContentGuideline.ISummary =
    await api.functional.discussionBoard.guidelines.index(connection);

  // Validate the response structure and type
  typia.assert(result);

  // Verify pagination information exists and is valid
  TestValidator.predicate(
    "pagination object should exist",
    result.pagination !== null && result.pagination !== undefined,
  );

  TestValidator.predicate(
    "current page should be non-negative",
    result.pagination.current >= 0,
  );

  TestValidator.predicate(
    "limit should be non-negative",
    result.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "total records should be non-negative",
    result.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages should be non-negative",
    result.pagination.pages >= 0,
  );

  // Verify data array exists
  TestValidator.predicate(
    "data array should exist",
    Array.isArray(result.data),
  );

  // Validate each guideline in the results
  if (result.data.length > 0) {
    // Check that all guidelines are active
    for (const guideline of result.data) {
      TestValidator.predicate(
        `guideline with id ${guideline.id} should be active`,
        guideline.is_active === true,
      );

      // Verify all required fields are present and properly typed
      TestValidator.predicate(
        `guideline ${guideline.id} should have valid UUID id`,
        typeof guideline.id === "string" && guideline.id.length > 0,
      );

      TestValidator.predicate(
        `guideline ${guideline.id} should have valid code`,
        typeof guideline.code === "string" &&
          guideline.code.length >= 5 &&
          guideline.code.length <= 50,
      );

      TestValidator.predicate(
        `guideline ${guideline.id} should have valid title`,
        typeof guideline.title === "string" &&
          guideline.title.length >= 10 &&
          guideline.title.length <= 100,
      );

      TestValidator.predicate(
        `guideline ${guideline.id} should have valid severity level`,
        ["minor", "moderate", "severe"].includes(guideline.severity_level),
      );

      TestValidator.predicate(
        `guideline ${guideline.id} should have is_active property`,
        typeof guideline.is_active === "boolean",
      );
    }

    // Verify no inactive guidelines are present
    const inactiveCount = result.data.filter(
      (g) => g.is_active === false,
    ).length;
    TestValidator.equals(
      "no inactive guidelines should be in the response",
      inactiveCount,
      0,
    );
  }

  // Validate pagination consistency
  if (result.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      result.pagination.records / result.pagination.limit,
    );
    TestValidator.equals(
      "total pages should match calculated pages based on records and limit",
      result.pagination.pages,
      expectedPages,
    );
  }
}
